import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { DashboardRole } from "./nav-items";

export function DashboardShell({
  role,
  roleLabel,
  userName,
  children,
}: {
  role: DashboardRole;
  roleLabel: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} roleLabel={roleLabel} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar role={role} userName={userName} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
