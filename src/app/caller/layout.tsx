import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function CallerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Only enforce the link-Telegram gate once a bot is actually configured --
  // otherwise every caller would be locked out with no way to satisfy it.
  const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_USERNAME);
  if (telegramConfigured && session?.user?.role === "CALLER" && !session.user.telegramLinked) {
    redirect("/link-telegram");
  }

  return (
    <DashboardShell role="caller" roleLabel="Caller" userName={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
