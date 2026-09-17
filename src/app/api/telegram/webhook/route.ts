import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
};

const NOT_LINKED_MESSAGE =
  "This link looks invalid or expired. Open the Telegram link from your Nexora Consultant account (Settings, or the screen right after signup) to link your account.";

/** Telegram calls this webhook for every message sent to the bot. Callers reach it by
 * tapping our deep link (t.me/<bot>?start=<code>), which Telegram turns into a
 * "/start <code>" message here -- we match that code to capture the chat_id needed to
 * push reminders to them later. */
export async function POST(req: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const gotSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (gotSecret !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  if (!message?.text?.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const code = message.text.split(" ")[1]?.trim();

  if (!code) {
    await sendTelegramMessage(chatId, NOT_LINKED_MESSAGE);
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { telegramLinkCode: code } });
  if (!user) {
    await sendTelegramMessage(chatId, NOT_LINKED_MESSAGE);
    return NextResponse.json({ ok: true });
  }

  // A chat_id can only belong to one account; clear it off any stale owner first
  // (e.g. someone else's account was previously linked to this Telegram chat).
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { telegramChatId: chatId, NOT: { id: user.id } },
      data: { telegramChatId: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: chatId },
    }),
  ]);

  await sendTelegramMessage(
    chatId,
    `✅ You're linked, ${escapeHtml(user.name)}! You'll get a Telegram reminder 30 and 10 minutes before each interview you're assigned to.`
  );

  return NextResponse.json({ ok: true });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
