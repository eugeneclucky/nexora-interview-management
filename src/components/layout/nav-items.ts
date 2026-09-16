import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserSquare2,
  CalendarDays,
  Headset,
  CalendarPlus,
  Settings,
  Building2,
  ListChecks,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; section?: string };

export const managerNav: NavItem[] = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/profiles", label: "Candidate Profiles", icon: UserSquare2 },
  { href: "/manager/interviews/add", label: "Schedule Interview", icon: CalendarPlus },
  { href: "/manager/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/manager/callers", label: "Callers", icon: Headset },
  { href: "/manager/settings", label: "Settings", icon: Settings },
];

export const callerNav: NavItem[] = [
  { href: "/caller", label: "Today's Interviews", icon: ListChecks },
  { href: "/caller/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/caller/settings", label: "Settings", icon: Settings },
];

// Super admins get everything a manager gets (their own candidate profiles,
// interviews, calendar, callers, pipeline settings -- scoped to just them,
// exactly like a manager's own workspace) plus org-wide oversight tools that
// only they can see. Grouped into two sections so the two kinds of pages
// don't blur together in the sidebar.
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, section: "Organization" },
  { href: "/admin/managers", label: "Managers", icon: Building2, section: "Organization" },
  { href: "/admin/callers", label: "All Callers", icon: Headset, section: "Organization" },
  { href: "/admin/profiles", label: "All Profiles", icon: UserSquare2, section: "Organization" },
  { href: "/admin/interviews", label: "All Interviews", icon: CalendarDays, section: "Organization" },
  { href: "/manager", label: "My Dashboard", icon: LayoutDashboard, section: "My Workspace" },
  { href: "/manager/profiles", label: "My Candidate Profiles", icon: UserSquare2, section: "My Workspace" },
  { href: "/manager/interviews/add", label: "Schedule Interview", icon: CalendarPlus, section: "My Workspace" },
  { href: "/manager/calendar", label: "My Calendar", icon: CalendarDays, section: "My Workspace" },
  { href: "/manager/callers", label: "My Callers", icon: Headset, section: "My Workspace" },
  { href: "/manager/settings", label: "My Settings", icon: Settings, section: "My Workspace" },
];

export type DashboardRole = "manager" | "caller" | "admin";

// Icon components can't cross the server/client boundary as props (they're
// functions, not serializable). Layouts (Server Components) pass only the
// role key; client components look up the nav items themselves.
export const navByRole: Record<DashboardRole, NavItem[]> = {
  manager: managerNav,
  caller: callerNav,
  admin: adminNav,
};
