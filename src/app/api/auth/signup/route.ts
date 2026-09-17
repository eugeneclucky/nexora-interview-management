import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { defaultStatusStepsData } from "@/lib/status-steps";
import {
  generateTelegramLinkCode,
  isValidTelegramUsername,
  normalizeTelegramUsername,
} from "@/lib/telegram";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["MANAGER", "CALLER"]),
  telegramUsername: z.string().trim().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { name, password, role } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  let telegramUsername: string | null = null;
  if (parsed.data.telegramUsername) {
    telegramUsername = normalizeTelegramUsername(parsed.data.telegramUsername);
    if (!isValidTelegramUsername(telegramUsername)) {
      return NextResponse.json(
        { error: "Enter a valid Telegram username (5-32 characters, letters/numbers/underscore)." },
        { status: 400 }
      );
    }
  }

  // Callers sign up unassigned; a manager or super admin assigns them to a
  // team afterward (Manager/Admin -> Callers).
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      telegramUsername,
      telegramLinkCode: role === "CALLER" ? generateTelegramLinkCode() : null,
      settings: {
        create: { defaultTimezone: DEFAULT_TIMEZONE },
      },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (role === "MANAGER") {
    await prisma.statusStep.createMany({ data: defaultStatusStepsData(user.id) });
  }

  return NextResponse.json({ user }, { status: 201 });
}
