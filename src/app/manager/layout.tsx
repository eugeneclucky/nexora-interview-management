import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  return (
    <DashboardShell
      role={isAdmin ? "admin" : "manager"}
      roleLabel={isAdmin ? "Super Admin" : "Manager"}
      userName={session?.user?.name ?? ""}
    >
      {children}
    </DashboardShell>
  );
}
