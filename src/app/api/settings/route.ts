import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { isValidTelegramUsername, normalizeTelegramUsername } from "@/lib/telegram";

const settingsSchema = z.object({
  defaultTimezone: z.string().min(1).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailReminders: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  telegramUsername: z.string().trim().optional(),
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
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      telegramUsername: true,
      telegramChatId: true,
    },
  });

  return NextResponse.json({
    settings,
    user: user && {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      telegramUsername: user.telegramUsername,
      telegramLinked: Boolean(user.telegramChatId),
    },
  });
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

  let telegramUsername: string | null | undefined;
  if (data.telegramUsername !== undefined) {
    if (data.telegramUsername === "") {
      telegramUsername = null;
    } else {
      telegramUsername = normalizeTelegramUsername(data.telegramUsername);
      if (!isValidTelegramUsername(telegramUsername)) {
        return NextResponse.json(
          { error: "Enter a valid Telegram username (5-32 characters, letters/numbers/underscore)." },
          { status: 400 }
        );
      }
    }
  }

  if (data.name !== undefined || data.phone !== undefined || telegramUsername !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(telegramUsername !== undefined && { telegramUsername }),
      },
    });
  }

  return NextResponse.json({ settings });
}
