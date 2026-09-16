import { prisma } from "@/lib/prisma";

export const DEFAULT_ACTIVE_STEP_LABELS = ["First Step", "Second Step", "Third Step", "Fourth Step"];

export function defaultStatusStepsData(managerId: string) {
  return [
    ...DEFAULT_ACTIVE_STEP_LABELS.map((label, i) => ({
      managerId,
      order: i + 1,
      label,
      kind: "ACTIVE" as const,
    })),
    { managerId, order: 1000, label: "Cancelled", kind: "CANCELLED" as const },
    { managerId, order: 1001, label: "No Show", kind: "NO_SHOW" as const },
  ];
}

/** Managers get a default pipeline seeded at signup. Super admins don't sign
 * up, so their first interview/settings visit needs to seed it lazily instead. */
export async function ensureDefaultStatusSteps(managerId: string) {
  const count = await prisma.statusStep.count({ where: { managerId } });
  if (count === 0) {
    await prisma.statusStep.createMany({ data: defaultStatusStepsData(managerId) });
  }
}

export async function getFirstActiveStepId(managerId: string) {
  let step = await prisma.statusStep.findFirst({
    where: { managerId, kind: "ACTIVE" },
    orderBy: { order: "asc" },
  });
  if (!step) {
    await ensureDefaultStatusSteps(managerId);
    step = await prisma.statusStep.findFirst({
      where: { managerId, kind: "ACTIVE" },
      orderBy: { order: "asc" },
    });
  }
  return step?.id;
}

/** For each given manager, the ACTIVE step with the highest `order` counts as "completed". */
export async function getCompletionStepIds(managerIds: string[]): Promise<string[]> {
  if (managerIds.length === 0) return [];
  const steps = await prisma.statusStep.findMany({
    where: { managerId: { in: managerIds }, kind: "ACTIVE" },
    orderBy: { order: "desc" },
    select: { id: true, managerId: true },
  });
  const seen = new Set<string>();
  const result: string[] = [];
  for (const step of steps) {
    if (!seen.has(step.managerId)) {
      seen.add(step.managerId);
      result.push(step.id);
    }
  }
  return result;
}
