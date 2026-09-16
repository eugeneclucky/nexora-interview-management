import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToManagerScope } from "@/lib/socket";
import { ensureDefaultStatusSteps } from "@/lib/status-steps";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let managerId: string | null = null;
  let isSelf = false;

  if (session.user.role === "MANAGER") {
    managerId = session.user.id;
    isSelf = true;
  } else if (session.user.role === "CALLER") {
    managerId = session.user.managerId ?? null;
  } else {
    managerId = searchParams.get("managerId");
    isSelf = managerId === session.user.id;
  }

  if (!managerId) return NextResponse.json([]);
  if (isSelf) await ensureDefaultStatusSteps(managerId);

  const steps = await prisma.statusStep.findMany({
    where: { managerId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(steps);
}

const createSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only managers can manage status steps." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.statusStep.aggregate({
    where: { managerId: session.user.id, kind: "ACTIVE" },
    _max: { order: true },
  });

  const step = await prisma.statusStep.create({
    data: {
      managerId: session.user.id,
      label: parsed.data.label,
      order: (maxOrder._max.order ?? 0) + 1,
      kind: "ACTIVE",
    },
  });

  broadcastToManagerScope(session.user.id, "status-step:changed", step);

  return NextResponse.json(step, { status: 201 });
}
