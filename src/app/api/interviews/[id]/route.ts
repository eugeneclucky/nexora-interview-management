import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { managerScope } from "@/lib/rbac";
import { broadcastToManagerScope } from "@/lib/socket";
import { DURATION_OPTIONS } from "@/lib/durations";
import { findOverlappingBlock } from "@/lib/blocked-slots";

const managerUpdateSchema = z.object({
  profileId: z.string().optional(),
  callerId: z.string().nullable().optional(),
  eventName: z.string().trim().optional(),
  position: z.string().trim().min(1).optional(),
  jobDescription: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(1).optional(),
  companyWebsite: z.string().trim().url().optional().or(z.literal("")),
  meetingLink: z.string().trim().optional(),
  meetingPlatform: z.string().trim().optional(),
  interviewTime: z.string().optional(),
  durationMinutes: z
    .number()
    .int()
    .refine((v) => (DURATION_OPTIONS as readonly number[]).includes(v), { message: "Invalid duration" })
    .optional(),
  timezone: z.string().optional(),
  resumeUrl: z.string().optional(),
  resumeName: z.string().optional(),
  notes: z.string().optional(),
  statusStepId: z.string().optional(),
  feedback: z.string().optional(),
});

const restrictedUpdateSchema = z.object({
  statusStepId: z.string().optional(),
  feedback: z.string().optional(),
  notes: z.string().optional(),
});

const includeRelations = {
  profile: true,
  manager: { select: { id: true, name: true, email: true } },
  caller: { select: { id: true, name: true, email: true, avatarUrl: true } },
  statusStep: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const interview = await prisma.interview.findUnique({ where: { id }, include: includeRelations });
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scope = managerScope(session.user);
  if (scope.type === "none") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scope.type === "one" && interview.managerId !== scope.managerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.user.role === "CALLER" && interview.callerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(interview);
}

async function assertStatusStepBelongsToManager(statusStepId: string, managerId: string) {
  const step = await prisma.statusStep.findUnique({ where: { id: statusStepId } });
  return step && step.managerId === managerId ? step : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.interview.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);

  if (session.user.role === "MANAGER" || session.user.role === "SUPER_ADMIN") {
    if (session.user.role === "MANAGER" && existing.managerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = managerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (data.callerId) {
      const caller = await prisma.user.findUnique({ where: { id: data.callerId } });
      if (!caller || caller.role !== "CALLER" || caller.managerId !== existing.managerId) {
        return NextResponse.json({ error: "Selected caller not found" }, { status: 404 });
      }
    }

    if (data.statusStepId) {
      const step = await assertStatusStepBelongsToManager(data.statusStepId, existing.managerId);
      if (!step) return NextResponse.json({ error: "Invalid status step" }, { status: 400 });
    }

    let interviewTime: Date | undefined;
    if (data.interviewTime) {
      interviewTime = new Date(data.interviewTime);
      if (Number.isNaN(interviewTime.getTime())) {
        return NextResponse.json({ error: "Invalid interview time" }, { status: 400 });
      }
    }

    const effectiveCallerId = data.callerId !== undefined ? data.callerId : existing.callerId;
    if (effectiveCallerId) {
      const effectiveStart = interviewTime ?? existing.interviewTime;
      const effectiveDuration = data.durationMinutes ?? existing.durationMinutes;
      const effectiveEnd = new Date(effectiveStart.getTime() + effectiveDuration * 60000);
      const conflict = await findOverlappingBlock(effectiveCallerId, effectiveStart, effectiveEnd);
      if (conflict) {
        return NextResponse.json(
          {
            error: `This caller has blocked this time${conflict.reason ? ` (${conflict.reason})` : ""}. Choose a different time or caller.`,
          },
          { status: 409 }
        );
      }
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: {
        ...(data.profileId !== undefined && { profileId: data.profileId }),
        ...(data.callerId !== undefined && { callerId: data.callerId || null }),
        ...(data.eventName !== undefined && { eventName: data.eventName || null }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.jobDescription !== undefined && { jobDescription: data.jobDescription }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companyWebsite !== undefined && { companyWebsite: data.companyWebsite || null }),
        ...(data.meetingLink !== undefined && { meetingLink: data.meetingLink || null }),
        ...(data.meetingPlatform !== undefined && { meetingPlatform: data.meetingPlatform || null }),
        ...(interviewTime && { interviewTime }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.resumeUrl !== undefined && { resumeUrl: data.resumeUrl || null }),
        ...(data.resumeName !== undefined && { resumeName: data.resumeName || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.statusStepId !== undefined && { statusStepId: data.statusStepId }),
        ...(data.feedback !== undefined && { feedback: data.feedback || null }),
      },
      include: includeRelations,
    });

    await logActivity({
      data: {
        userId: session.user.id,
        action: "updated",
        entity: "interview",
        entityId: interview.id,
        meta: `${interview.companyName}`,
      },
    });

    broadcastToManagerScope(interview.managerId, "interview:updated", interview);
    return NextResponse.json(interview);
  }

  if (session.user.role === "CALLER") {
    if (existing.callerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = restrictedUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (data.statusStepId) {
      const step = await assertStatusStepBelongsToManager(data.statusStepId, existing.managerId);
      if (!step) return NextResponse.json({ error: "Invalid status step" }, { status: 400 });
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: {
        ...(data.statusStepId !== undefined && { statusStepId: data.statusStepId }),
        ...(data.feedback !== undefined && { feedback: data.feedback || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: includeRelations,
    });

    await logActivity({
      data: {
        userId: session.user.id,
        action: "updated",
        entity: "interview",
        entityId: interview.id,
        meta: `${interview.companyName}`,
      },
    });

    broadcastToManagerScope(interview.managerId, "interview:updated", interview);
    return NextResponse.json(interview);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only managers can delete interviews." }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.interview.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === "MANAGER" && existing.managerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.interview.delete({ where: { id } });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "deleted",
      entity: "interview",
      entityId: id,
      meta: existing.companyName,
    },
  });

  broadcastToManagerScope(existing.managerId, "interview:deleted", { id });

  return NextResponse.json({ ok: true });
}
