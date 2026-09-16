"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";
import { navByRole, type DashboardRole } from "./nav-items";

export function Sidebar({
  role,
  roleLabel,
}: {
  role: DashboardRole;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
        <Logo size={28} />
        <span className="font-semibold">Nexora Consultant</span>
      </div>

      <div className="px-5 py-3">
        <span className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-2.5 py-1 text-xs font-medium">
          {roleLabel}
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map((item, i) => {
          const active =
            pathname === item.href ||
            (item.href !== "/manager" &&
              item.href !== "/caller" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;
          const showSectionHeader = item.section && item.section !== items[i - 1]?.section;
          return (
            <div key={item.href}>
              {showSectionHeader && (
                <p
                  className={cn(
                    "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70",
                    i > 0 && "pt-4"
                  )}
                >
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
