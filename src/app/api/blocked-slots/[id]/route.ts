import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToManagerScope } from "@/lib/socket";

const updateSchema = z
  .object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((data) => new Date(data.startTime).getTime() < new Date(data.endTime).getTime(), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.blockedSlot.findUnique({
    where: { id },
    include: { caller: { select: { id: true, managerId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session.user.role === "CALLER" && existing.callerId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const slot = await prisma.blockedSlot.update({
    where: { id },
    data: {
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
    },
  });

  if (existing.caller.managerId) {
    broadcastToManagerScope(existing.caller.managerId, "blocked-slot:changed", slot);
  }

  return NextResponse.json(slot);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const slot = await prisma.blockedSlot.findUnique({
    where: { id },
    include: { caller: { select: { id: true, managerId: true } } },
  });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session.user.role === "CALLER" && slot.callerId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.blockedSlot.delete({ where: { id } });

  if (slot.caller.managerId) {
    broadcastToManagerScope(slot.caller.managerId, "blocked-slot:changed", { id, deleted: true });
  }

  return NextResponse.json({ ok: true });
}
