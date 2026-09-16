"use client";

import Link from "next/link";
import { Building2, UserSquare2, Headset, CalendarClock, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

export default function AdminOverviewPage() {
  const { stats } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Organization Overview</h2>
        <p className="text-sm text-muted-foreground">
          Full visibility across every manager, caller, and interview.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Managers" value={stats?.totalManagers ?? "—"} icon={Building2} />
        <StatCard label="Callers" value={stats?.totalCallers ?? "—"} icon={Headset} accent="success" />
        <StatCard label="Candidate profiles" value={stats?.totalProfiles ?? "—"} icon={UserSquare2} />
        <StatCard label="Upcoming interviews" value={stats?.upcomingInterviews ?? "—"} icon={CalendarClock} accent="warning" />
        <StatCard label="Completed interviews" value={stats?.completedInterviews ?? "—"} icon={CheckCircle2} accent="success" />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Quick links</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/admin/managers" className="rounded-lg border border-border p-4 hover:bg-muted transition-colors">
            <Building2 className="h-5 w-5 text-primary mb-2" />
            <p className="font-medium text-sm">Managers</p>
            <p className="text-xs text-muted-foreground">Browse every manager and their team</p>
          </Link>
          <Link href="/admin/profiles" className="rounded-lg border border-border p-4 hover:bg-muted transition-colors">
            <UserSquare2 className="h-5 w-5 text-primary mb-2" />
            <p className="font-medium text-sm">Candidate profiles</p>
            <p className="text-xs text-muted-foreground">All candidate profiles across the org</p>
          </Link>
          <Link href="/admin/interviews" className="rounded-lg border border-border p-4 hover:bg-muted transition-colors">
            <CalendarClock className="h-5 w-5 text-primary mb-2" />
            <p className="font-medium text-sm">Interviews</p>
            <p className="text-xs text-muted-foreground">Every interview, filterable by manager</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
