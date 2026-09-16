import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

const settingsSchema = z.object({
  defaultTimezone: z.string().min(1).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailReminders: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id, defaultTimezone: DEFAULT_TIMEZONE },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  return NextResponse.json({ settings, user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {
      ...(data.defaultTimezone !== undefined && { defaultTimezone: data.defaultTimezone }),
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.emailReminders !== undefined && { emailReminders: data.emailReminders }),
    },
    create: {
      userId: session.user.id,
      defaultTimezone: data.defaultTimezone || DEFAULT_TIMEZONE,
      theme: data.theme || "system",
      emailReminders: data.emailReminders ?? true,
    },
  });

  if (data.name !== undefined || data.phone !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
      },
    });
  }

  return NextResponse.json({ settings });
}
