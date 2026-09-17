"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, Send, LogOut } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { apiFetch } from "@/lib/api";
import { telegramDeepLink } from "@/lib/telegram";

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null;

type SettingsResponse = {
  user?: { role: string; telegramLinked: boolean; telegramLinkCode: string | null };
};

export default function LinkTelegramPage() {
  const router = useRouter();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const data = await apiFetch<SettingsResponse>("/api/settings");
        if (cancelled || !data.user) return;
        if (data.user.role !== "CALLER") {
          router.replace("/");
          return;
        }
        if (data.user.telegramLinked) {
          if (pollRef.current) clearInterval(pollRef.current);
          router.replace("/caller");
          return;
        }
        setLinkCode(data.user.telegramLinkCode);
      } catch {
        // transient network error; the next poll tick will retry
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    pollRef.current = setInterval(check, 3000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router]);

  const deepLink = linkCode ? telegramDeepLink(linkCode, botUsername) : null;

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <div className="flex justify-between items-center p-6 sm:p-10 pb-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo size={28} />
          Nexora Consultant
        </div>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Link your Telegram</h2>
            <p className="text-sm text-muted-foreground">
              We send interview reminders 30 and 10 minutes ahead over Telegram. Link your
              account to continue.
            </p>
          </div>

          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : deepLink ? (
            <div className="space-y-4">
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ className: "w-full" })}
              >
                <Send className="h-4 w-4" /> Open Telegram &amp; tap Start
              </a>
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for you to link in Telegram...
              </p>
            </div>
          ) : (
            <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
              Telegram isn&apos;t configured yet. Ask your admin to finish setup, then refresh
              this page.
            </p>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
