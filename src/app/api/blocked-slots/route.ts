import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { broadcastToManagerScope } from "@/lib/socket";

const createSchema = z
  .object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    reason: z.string().trim().optional(),
  })
  .refine((data) => new Date(data.startTime).getTime() < new Date(data.endTime).getTime(), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const callerId = searchParams.get("callerId");
  const managerFilter = searchParams.get("managerId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.BlockedSlotWhereInput = {};

  if (session.user.role === "CALLER") {
    where.callerId = session.user.id;
  } else if (session.user.role === "MANAGER") {
    if (callerId) {
      const caller = await prisma.user.findFirst({
        where: { id: callerId, role: "CALLER", managerId: session.user.id },
      });
      if (!caller) return NextResponse.json({ error: "Caller not found" }, { status: 404 });
      where.callerId = callerId;
    } else {
      where.caller = { managerId: session.user.id };
    }
  } else if (session.user.role === "SUPER_ADMIN") {
    if (callerId) where.callerId = callerId;
    else if (managerFilter) where.caller = { managerId: managerFilter };
  }

  if (from || to) {
    where.AND = [
      ...(from ? [{ endTime: { gt: new Date(from) } }] : []),
      ...(to ? [{ startTime: { lt: new Date(to) } }] : []),
    ];
  }

  const slots = await prisma.blockedSlot.findMany({
    where,
    include: { caller: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "CALLER") {
    return NextResponse.json(
      { error: "Only callers can block time on their own calendar." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slot = await prisma.blockedSlot.create({
    data: {
      callerId: session.user.id,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      reason: data.reason || null,
    },
  });

  if (session.user.managerId) {
    broadcastToManagerScope(session.user.managerId, "blocked-slot:changed", slot);
  }

  return NextResponse.json(slot, { status: 201 });
}
