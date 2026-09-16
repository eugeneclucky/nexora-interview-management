import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managerScope } from "@/lib/rbac";
import { getCompletionStepIds } from "@/lib/status-steps";

const EMPTY_STATS = {
  totalProfiles: 0,
  totalCallers: 0,
  totalManagers: 0,
  todayInterviews: 0,
  upcomingInterviews: 0,
  completedInterviews: 0,
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = managerScope(session.user);
  if (scope.type === "none") return NextResponse.json(EMPTY_STATS);

  const { searchParams } = new URL(req.url);
  const managerFilter = searchParams.get("managerId");
  const scopeManagerId = scope.type === "one" ? scope.managerId : managerFilter;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const managerWhere = scopeManagerId ? { managerId: scopeManagerId } : {};
  const callerScoped = session.user.role === "CALLER" ? { callerId: session.user.id } : {};

  const relevantManagerIds = scopeManagerId
    ? [scopeManagerId]
    : (await prisma.user.findMany({ where: { role: "MANAGER" }, select: { id: true } })).map(
        (m) => m.id
      );

  const [completionStepIds, excludedSteps] = await Promise.all([
    getCompletionStepIds(relevantManagerIds),
    prisma.statusStep.findMany({
      where: { managerId: { in: relevantManagerIds }, kind: { not: "ACTIVE" } },
      select: { id: true },
    }),
  ]);
  const excludedStepIds = excludedSteps.map((s) => s.id);

  const [totalProfiles, totalCallers, totalManagers, todayInterviews, upcomingInterviews, completedInterviews] =
    await Promise.all([
      prisma.candidateProfile.count({ where: managerWhere }),
      prisma.user.count({
        where: { role: "CALLER", ...(scopeManagerId ? { managerId: scopeManagerId } : {}) },
      }),
      session.user.role === "SUPER_ADMIN"
        ? prisma.user.count({ where: { role: "MANAGER" } })
        : Promise.resolve(1),
      prisma.interview.count({
        where: {
          ...managerWhere,
          ...callerScoped,
          interviewTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.interview.count({
        where: {
          ...managerWhere,
          ...callerScoped,
          interviewTime: { gte: new Date() },
          statusStepId: { notIn: [...excludedStepIds, ...completionStepIds] },
        },
      }),
      prisma.interview.count({
        where: { ...managerWhere, ...callerScoped, statusStepId: { in: completionStepIds } },
      }),
    ]);

  return NextResponse.json({
    totalProfiles,
    totalCallers,
    totalManagers,
    todayInterviews,
    upcomingInterviews,
    completedInterviews,
  });
}
