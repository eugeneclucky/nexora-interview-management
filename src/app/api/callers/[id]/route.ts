import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { broadcastToManagerScope } from "@/lib/socket";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  managerId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const caller = await prisma.user.findUnique({ where: { id } });
  if (!caller || caller.role !== "CALLER") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwnCaller = caller.managerId === session.user.id;
  const isUnclaimedCaller = caller.managerId === null;

  if (session.user.role === "MANAGER") {
    if (!isOwnCaller && !isUnclaimedCaller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else if (session.user.role !== "SUPER_ADMIN") {
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
  const data = parsed.data;

  if (data.managerId && data.managerId !== caller.managerId) {
    if (session.user.role === "MANAGER") {
      // A manager may only claim a currently-unassigned caller for themselves,
      // not reassign an existing caller to someone else.
      if (!isUnclaimedCaller || data.managerId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only claim unassigned callers for yourself." },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only a super admin can reassign a caller to a different manager." },
        { status: 403 }
      );
    }
    const newManager = await prisma.user.findFirst({
      where: { id: data.managerId, role: "MANAGER" },
    });
    if (!newManager) {
      return NextResponse.json({ error: "Selected manager was not found." }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      managerId: true,
      createdAt: true,
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "updated",
      entity: "caller",
      entityId: id,
      meta: updated.name,
    },
  });

  broadcastToManagerScope(caller.managerId ?? session.user.id, "caller:updated", updated);
  if (updated.managerId && updated.managerId !== caller.managerId) {
    broadcastToManagerScope(updated.managerId, "caller:updated", updated);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const caller = await prisma.user.findUnique({ where: { id } });
  if (!caller || caller.role !== "CALLER") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.user.role === "MANAGER") {
    if (caller.managerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "deleted",
      entity: "caller",
      entityId: id,
      meta: caller.name,
    },
  });

  if (caller.managerId) broadcastToManagerScope(caller.managerId, "caller:deleted", { id });

  return NextResponse.json({ ok: true });
}
