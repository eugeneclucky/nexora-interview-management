import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { broadcastToManagerScope } from "@/lib/socket";

const createCallerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
  managerId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "CALLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const managerFilter = searchParams.get("managerId");
  const unassignedOnly = searchParams.get("unassigned") === "true";

  const where: Prisma.UserWhereInput = { role: "CALLER" };
  if (unassignedOnly) {
    where.managerId = null;
  } else if (session.user.role === "MANAGER") {
    where.managerId = session.user.id;
  } else if (managerFilter) {
    where.managerId = managerFilter;
  }

  const callers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { interviewsAssigned: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(callers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only managers can add callers." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createCallerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  let managerId = session.user.id;
  if (session.user.role === "SUPER_ADMIN" && parsed.data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: parsed.data.managerId, role: "MANAGER" },
    });
    if (!manager) {
      return NextResponse.json({ error: "Selected manager was not found." }, { status: 400 });
    }
    managerId = manager.id;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const caller = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || null,
      passwordHash,
      role: "CALLER",
      managerId,
      settings: { create: { defaultTimezone: DEFAULT_TIMEZONE } },
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "created",
      entity: "caller",
      entityId: caller.id,
      meta: caller.name,
    },
  });

  broadcastToManagerScope(managerId, "caller:created", caller);

  return NextResponse.json(caller, { status: 201 });
}
