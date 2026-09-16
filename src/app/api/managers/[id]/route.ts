import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const manager = await prisma.user.findUnique({ where: { id } });
  if (!manager || manager.role !== "MANAGER") {
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
  const data = parsed.data;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const manager = await prisma.user.findUnique({ where: { id } });
  if (!manager || manager.role !== "MANAGER") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascades: deletes this manager's callers, candidate profiles,
  // interviews, and status steps (see schema onDelete: Cascade).
  await prisma.user.delete({ where: { id } });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "deleted",
      entity: "manager",
      entityId: id,
      meta: manager.name,
    },
  });

  return NextResponse.json({ ok: true });
}
