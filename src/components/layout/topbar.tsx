"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveIndicator } from "@/components/layout/live-indicator";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";
import { navByRole, type DashboardRole } from "./nav-items";

export function Topbar({
  role,
  userName,
}: {
  role: DashboardRole;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navByRole[role];

  useEffect(() => setOpen(false), [pathname]);

  const title =
    [...items]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
      <button
        className="lg:hidden rounded-md p-2 hover:bg-muted cursor-pointer"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <LiveIndicator />
        <span className="hidden sm:inline text-sm text-muted-foreground">{userName}</span>
        <ThemeToggle />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground border-r border-border flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Logo size={28} />
                <span className="font-semibold">Nexora Consultant</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {items.map((item, i) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
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
          </div>
        </div>
      )}
    </header>
  );
}
