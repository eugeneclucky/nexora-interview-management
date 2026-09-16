import type { StatusStep } from "@/lib/types";

/** The ACTIVE step with the highest `order` in a manager's pipeline counts as "completed". */
export function isCompletionStep(step: StatusStep, allSteps: StatusStep[]) {
  if (step.kind !== "ACTIVE") return false;
  const activeSteps = allSteps.filter((s) => s.kind === "ACTIVE");
  if (activeSteps.length === 0) return false;
  const maxOrder = Math.max(...activeSteps.map((s) => s.order));
  return step.order === maxOrder;
}
