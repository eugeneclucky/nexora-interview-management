"use client";

import { useState } from "react";
import Link from "next/link";
import { UserSquare2, Headset, CalendarClock, CheckCircle2, CalendarPlus, Users2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { InterviewRow } from "@/components/interviews/interview-row";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useInterviews } from "@/hooks/use-interviews";
import { useSettings } from "@/hooks/use-settings";

export default function ManagerDashboardPage() {
  const { stats } = useDashboardStats({ mine: true });
  const { timezone } = useSettings();
  // Fixed once per page load rather than recomputed every render -- a fresh
  // Date().toISOString() on every render was creating a new `filters` value
  // each time, which retriggered the fetch effect in an infinite loop.
  const [from] = useState(() => new Date().toISOString());
  const { interviews } = useInterviews({ from, mine: true });

  const upcoming = interviews.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Your candidate pipeline and interview schedule at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/manager/profiles" className={buttonClasses({ variant: "outline" })}>
            <UserSquare2 className="h-4 w-4" /> Add profile
          </Link>
          <Link href="/manager/interviews/add" className={buttonClasses()}>
            <CalendarPlus className="h-4 w-4" /> Schedule interview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Candidate profiles" value={stats?.totalProfiles ?? "—"} icon={UserSquare2} />
        <StatCard label="Callers" value={stats?.totalCallers ?? "—"} icon={Headset} accent="success" />
        <StatCard label="Upcoming interviews" value={stats?.upcomingInterviews ?? "—"} icon={CalendarClock} accent="warning" />
        <StatCard label="Completed" value={stats?.completedInterviews ?? "—"} icon={CheckCircle2} accent="success" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users2 className="h-4 w-4" /> Upcoming interviews
          </h3>
          <Link href="/manager/calendar" className="text-sm text-primary hover:underline">
            View calendar
          </Link>
        </div>
        <div className="space-y-2">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming interviews scheduled yet.
            </p>
          )}
          {upcoming.map((interview) => (
            <InterviewRow
              key={interview.id}
              interview={interview}
              timezone={timezone}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
