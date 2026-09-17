import { randomUUID } from "crypto";
import { formatInTz } from "@/lib/format-time";

const TELEGRAM_API = "https://api.telegram.org";

/** Unique per-user token embedded in the bot's deep link (t.me/<bot>?start=<code>)
 * so linking is a single tap instead of matching a typed username. */
export function generateTelegramLinkCode(): string {
  return randomUUID().replace(/-/g, "");
}

/** Builds the one-tap linking URL. Pass NEXT_PUBLIC_TELEGRAM_BOT_USERNAME when
 * calling from client components -- TELEGRAM_BOT_USERNAME isn't available there. */
export function telegramDeepLink(code: string, botUsername: string | null): string | null {
  if (!botUsername) return null;
  return `https://t.me/${botUsername}?start=${code}`;
}

/** Strips an "@" prefix or a "https://t.me/" URL down to a bare Telegram username. */
export function normalizeTelegramUsername(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "")
    .trim();
}

export function isValidTelegramUsername(username: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username);
}

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function telegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

/** Sends a plain-text message to a linked Telegram chat. No-ops (with a log) if the bot isn't configured. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = botToken();
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN is not set; skipping message send.");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
    return false;
  }
}

type ReminderInterview = {
  id: string;
  companyName: string;
  position: string | null;
  jobDescription: string;
  meetingLink: string | null;
  interviewTime: Date;
  timezone: string;
  profile: { name: string };
};

/** Base URL of the deployed app (e.g. https://nexora-management.up.railway.app),
 * used to build a link back to the interview's detail page in the portal. */
function appBaseUrl(): string | null {
  const url = process.env.NEXTAUTH_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export function buildInterviewReminderMessage(
  interview: ReminderInterview,
  minutesBefore: 30 | 10
): string {
  const when = formatInTz(interview.interviewTime, interview.timezone);
  const lines = [
    `⏰ <b>Interview in ${minutesBefore} minutes</b>`,
    "",
    `👤 Candidate: ${escapeHtml(interview.profile.name)}`,
    `🏢 Company: ${escapeHtml(interview.companyName)}`,
    `📌 Position: ${escapeHtml(interview.position || interview.jobDescription)}`,
    `🕒 Time: ${when}`,
  ];
  if (interview.meetingLink) {
    lines.push(`🔗 Meeting link: ${escapeHtml(interview.meetingLink)}`);
  }
  const baseUrl = appBaseUrl();
  if (baseUrl) {
    lines.push(`📋 <a href="${baseUrl}/caller/interviews/${interview.id}">Check details on the portal</a>`);
  }
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
