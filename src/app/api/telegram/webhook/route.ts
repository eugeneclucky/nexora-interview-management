import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
};

/** Telegram calls this webhook for every message sent to the bot. We only care about
 * matching the sender's @username against a signed-up user so we can capture the
 * chat_id needed to push reminders to them later. */
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
  const username = message.from?.username;

  if (!username) {
    await sendTelegramMessage(
      chatId,
      "You don't have a Telegram username set. Add one in Telegram settings, then enter it in your Nexora Consultant account and send /start again."
    );
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findFirst({
    where: { telegramUsername: { equals: username, mode: "insensitive" } },
  });

  if (!user) {
    await sendTelegramMessage(
      chatId,
      `We couldn't find a Nexora Consultant account with the Telegram username @${username}. Double-check it matches what you entered in your account settings, then send /start again.`
    );
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
