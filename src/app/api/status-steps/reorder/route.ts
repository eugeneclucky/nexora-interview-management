import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToManagerScope } from "@/lib/socket";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only managers can manage status steps." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const steps = await prisma.statusStep.findMany({
    where: { managerId: session.user.id, kind: "ACTIVE" },
  });
  const ids = new Set(steps.map((s) => s.id));
  const { orderedIds } = parsed.data;

  if (orderedIds.length !== steps.length || !orderedIds.every((id) => ids.has(id))) {
    return NextResponse.json({ error: "Ordered list must match your active steps exactly." }, { status: 400 });
  }

  // Shift into a temporary high range first to dodge the (managerId, order) unique constraint
  // while swapping, then write final 1..N order.
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.statusStep.update({ where: { id }, data: { order: 500 + i } })
    )
  );
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.statusStep.update({ where: { id }, data: { order: i + 1 } })
    )
  );

  const updated = await prisma.statusStep.findMany({
    where: { managerId: session.user.id },
    orderBy: { order: "asc" },
  });

  broadcastToManagerScope(session.user.id, "status-step:changed", { reordered: true });

  return NextResponse.json(updated);
}
