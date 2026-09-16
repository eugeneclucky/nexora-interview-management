import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { Prisma } from "@/generated/prisma/client";
import { managerScope } from "@/lib/rbac";
import { broadcastToManagerScope } from "@/lib/socket";
import { createProfileSchema, parseDob } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const managerFilter = searchParams.get("managerId");
  const search = searchParams.get("search")?.trim();

  const scope = managerScope(session.user);
  if (scope.type === "none") return NextResponse.json([]);

  const where: Prisma.CandidateProfileWhereInput = {};
  if (scope.type === "one") {
    where.managerId = scope.managerId;
  } else if (managerFilter) {
    where.managerId = managerFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const profiles = await prisma.candidateProfile.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { interviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(profiles);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only managers can add candidate profiles." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const profile = await prisma.candidateProfile.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      dob: parseDob(data.dob),
      ssnLast4: data.ssnLast4 || null,
      linkedinUrl: data.linkedinUrl || null,
      resumeUrl: data.resumeUrl || null,
      resumeName: data.resumeName || null,
      notes: data.notes || null,
      managerId: session.user.id,
    },
  });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "created",
      entity: "profile",
      entityId: profile.id,
      meta: profile.name,
    },
  });

  broadcastToManagerScope(session.user.id, "profile:created", profile);

  return NextResponse.json(profile, { status: 201 });
}
