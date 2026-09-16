import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { Prisma } from "@/generated/prisma/client";
import { managerScope } from "@/lib/rbac";
import { broadcastToManagerScope } from "@/lib/socket";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { DURATION_OPTIONS, DEFAULT_DURATION_MINUTES } from "@/lib/durations";
import { getFirstActiveStepId } from "@/lib/status-steps";
import { findOverlappingBlock } from "@/lib/blocked-slots";

const interviewSchema = z.object({
  profileId: z.string().min(1, "Candidate profile is required"),
  callerId: z.string().optional().or(z.literal("")),
  eventName: z.string().trim().optional(),
  jobDescription: z.string().trim().min(1, "Job description is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  companyWebsite: z.string().trim().url().optional().or(z.literal("")),
  meetingLink: z.string().trim().optional(),
  meetingPlatform: z.string().trim().optional(),
  interviewTime: z.string().min(1, "Interview time is required"),
  durationMinutes: z.number().int().refine((v) => (DURATION_OPTIONS as readonly number[]).includes(v), {
    message: "Invalid duration",
  }).default(DEFAULT_DURATION_MINUTES),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  resumeUrl: z.string().optional(),
  resumeName: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const statusStepId = searchParams.get("statusStepId");
  const callerId = searchParams.get("callerId");
  const managerFilter = searchParams.get("managerId");
  const profileId = searchParams.get("profileId");

  const scope = managerScope(session.user);
  if (scope.type === "none") return NextResponse.json([]);

  const where: Prisma.InterviewWhereInput = {};
  if (scope.type === "one") {
    where.managerId = scope.managerId;
  } else if (managerFilter) {
    where.managerId = managerFilter;
  }

  if (session.user.role === "CALLER") {
    where.callerId = session.user.id;
  } else if (callerId) {
    where.callerId = callerId;
  }

  if (profileId) where.profileId = profileId;
  if (statusStepId) where.statusStepId = statusStepId;

  if (from || to) {
    where.interviewTime = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const interviews = await prisma.interview.findMany({
    where,
    include: {
      profile: true,
      manager: { select: { id: true, name: true, email: true } },
      caller: { select: { id: true, name: true, email: true } },
      statusStep: true,
    },
    orderBy: { interviewTime: "asc" },
  });

  return NextResponse.json(interviews);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only managers can schedule interviews." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = interviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const profile = await prisma.candidateProfile.findUnique({ where: { id: data.profileId } });
  if (!profile || profile.managerId !== session.user.id) {
    return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 });
  }

  if (data.callerId) {
    const caller = await prisma.user.findUnique({ where: { id: data.callerId } });
    if (!caller || caller.role !== "CALLER" || caller.managerId !== session.user.id) {
      return NextResponse.json({ error: "Selected caller not found" }, { status: 404 });
    }
  }

  const interviewTime = new Date(data.interviewTime);
  if (Number.isNaN(interviewTime.getTime())) {
    return NextResponse.json({ error: "Invalid interview time" }, { status: 400 });
  }
  const interviewEnd = new Date(interviewTime.getTime() + data.durationMinutes * 60000);

  if (data.callerId) {
    const conflict = await findOverlappingBlock(data.callerId, interviewTime, interviewEnd);
    if (conflict) {
      return NextResponse.json(
        {
          error: `This caller has blocked this time${conflict.reason ? ` (${conflict.reason})` : ""}. Choose a different time or caller.`,
        },
        { status: 409 }
      );
    }
  }

  const firstStepId = await getFirstActiveStepId(session.user.id);
  if (!firstStepId) {
    return NextResponse.json(
      { error: "You have no active status steps configured. Add one in Settings first." },
      { status: 400 }
    );
  }

  const interview = await prisma.interview.create({
    data: {
      profileId: data.profileId,
      callerId: data.callerId || null,
      managerId: session.user.id,
      eventName: data.eventName || null,
      jobDescription: data.jobDescription,
      companyName: data.companyName,
      companyWebsite: data.companyWebsite || null,
      meetingLink: data.meetingLink || null,
      meetingPlatform: data.meetingPlatform || null,
      interviewTime,
      durationMinutes: data.durationMinutes,
      timezone: data.timezone,
      resumeUrl: data.resumeUrl || profile.resumeUrl || null,
      resumeName: data.resumeName || profile.resumeName || null,
      notes: data.notes || null,
      statusStepId: firstStepId,
    },
    include: {
      profile: true,
      manager: { select: { id: true, name: true, email: true } },
      caller: { select: { id: true, name: true, email: true } },
      statusStep: true,
    },
  });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "created",
      entity: "interview",
      entityId: interview.id,
      meta: `${profile.name} @ ${interview.companyName}`,
    },
  });

  broadcastToManagerScope(session.user.id, "interview:created", interview);

  return NextResponse.json(interview, { status: 201 });
}
