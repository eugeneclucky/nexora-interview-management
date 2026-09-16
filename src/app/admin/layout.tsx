import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardShell role="admin" roleLabel="Super Admin" userName={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
