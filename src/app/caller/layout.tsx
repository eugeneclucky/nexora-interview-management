import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function CallerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardShell role="caller" roleLabel="Caller" userName={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
