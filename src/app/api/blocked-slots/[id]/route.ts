import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToManagerScope } from "@/lib/socket";

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
