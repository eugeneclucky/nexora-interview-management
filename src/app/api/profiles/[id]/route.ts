import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { managerScope } from "@/lib/rbac";
import { broadcastToManagerScope } from "@/lib/socket";
import { updateProfileSchema, parseDob } from "@/lib/validation";
import type { ManagerScope } from "@/lib/rbac";

async function loadScopedProfile(id: string, scope: ManagerScope) {
  if (scope.type === "none") return null;
  const profile = await prisma.candidateProfile.findUnique({ where: { id } });
  if (!profile) return null;
  if (scope.type === "one" && profile.managerId !== scope.managerId) return null;
  return profile;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const profile = await loadScopedProfile(id, managerScope(session.user));
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(profile);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (session.user.role === "CALLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.candidateProfile.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === "MANAGER" && existing.managerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const profile = await prisma.candidateProfile.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.zip !== undefined && { zip: data.zip || null }),
      ...(data.dob !== undefined && { dob: parseDob(data.dob) }),
      ...(data.ssnLast4 !== undefined && { ssnLast4: data.ssnLast4 || null }),
      ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
      ...(data.resumeUrl !== undefined && { resumeUrl: data.resumeUrl || null }),
      ...(data.resumeName !== undefined && { resumeName: data.resumeName || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "updated",
      entity: "profile",
      entityId: profile.id,
      meta: profile.name,
    },
  });

  broadcastToManagerScope(profile.managerId, "profile:updated", profile);

  return NextResponse.json(profile);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (session.user.role === "CALLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.candidateProfile.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === "MANAGER" && existing.managerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.candidateProfile.delete({ where: { id } });

  await logActivity({
    data: {
      userId: session.user.id,
      action: "deleted",
      entity: "profile",
      entityId: id,
      meta: existing.name,
    },
  });

  broadcastToManagerScope(existing.managerId, "profile:deleted", { id });

  return NextResponse.json({ ok: true });
}
