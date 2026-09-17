import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { buildInterviewReminderMessage, sendTelegramMessage } from "@/lib/telegram";

const SWEEP_INTERVAL_MS = 30_000;

async function sendDueReminders(minutesBefore: 30 | 10) {
  const now = new Date();
  const threshold = new Date(now.getTime() + minutesBefore * 60_000);
  const sentAtField = minutesBefore === 30 ? "reminder30SentAt" : "reminder10SentAt";

  const where: Prisma.InterviewWhereInput = {
    interviewTime: { gt: now, lte: threshold },
    [sentAtField]: null,
    callerId: { not: null },
    caller: { telegramChatId: { not: null } },
  };

  const due = await prisma.interview.findMany({
    where,
    include: { profile: true, caller: true },
  });

  for (const interview of due) {
    if (!interview.caller?.telegramChatId) continue;
    const message = buildInterviewReminderMessage(interview, minutesBefore);
    const sent = await sendTelegramMessage(interview.caller.telegramChatId, message);
    if (sent) {
      const data: Prisma.InterviewUpdateInput = { [sentAtField]: now };
      await prisma.interview.update({ where: { id: interview.id }, data });
    }
  }
}

async function runReminderSweep() {
  try {
    await sendDueReminders(30);
    await sendDueReminders(10);
  } catch (err) {
    console.error("[reminder-scheduler] sweep failed:", err);
  }
}

export function startReminderScheduler() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("[reminder-scheduler] TELEGRAM_BOT_TOKEN not set; Telegram reminders disabled.");
    return;
  }
  runReminderSweep();
  setInterval(runReminderSweep, SWEEP_INTERVAL_MS);
}
