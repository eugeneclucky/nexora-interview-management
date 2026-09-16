import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToManagerScope } from "@/lib/socket";

const updateSchema = z.object({
  label: z.string().trim().min(1).max(60),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only managers can manage status steps." }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.statusStep.findUnique({ where: { id } });
  if (!existing || existing.managerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const step = await prisma.statusStep.update({
    where: { id },
    data: { label: parsed.data.label },
  });

  broadcastToManagerScope(session.user.id, "status-step:changed", step);

  return NextResponse.json(step);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only managers can manage status steps." }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.statusStep.findUnique({ where: { id } });
  if (!existing || existing.managerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.kind !== "ACTIVE") {
    return NextResponse.json(
      { error: "The Cancelled and No Show steps can't be deleted." },
      { status: 400 }
    );
  }

  const activeCount = await prisma.statusStep.count({
    where: { managerId: session.user.id, kind: "ACTIVE" },
  });
  if (activeCount <= 1) {
    return NextResponse.json(
      { error: "You need at least one active step in your pipeline." },
      { status: 400 }
    );
  }

  const inUse = await prisma.interview.count({ where: { statusStepId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${inUse} interview(s) are using this step. Move them to another step first.` },
      { status: 400 }
    );
  }

  await prisma.statusStep.delete({ where: { id } });
  broadcastToManagerScope(session.user.id, "status-step:changed", { id, deleted: true });
  return NextResponse.json({ ok: true });
}
