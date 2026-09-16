"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InterviewRow } from "@/components/interviews/interview-row";
import { UnassignedNotice } from "@/components/unassigned-notice";
import { useInterviews } from "@/hooks/use-interviews";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";

export default function CallerTodayPage() {
  const { data: session } = useSession();
  const { timezone } = useSettings();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const pushToast = useToast();
  const isUnassigned = !session?.user?.managerId;

  const { from, to, label } = useMemo(() => {
    const zonedNow = toZonedTime(selectedDate, timezone);
    const dayStr = format(zonedNow, "yyyy-MM-dd");
    const startLocal = `${dayStr}T00:00:00`;
    const endLocal = `${dayStr}T23:59:59`;
    return {
      from: fromZonedTime(startLocal, timezone).toISOString(),
      to: fromZonedTime(endLocal, timezone).toISOString(),
      label: format(zonedNow, "EEEE, MMMM d, yyyy"),
    };
  }, [selectedDate, timezone]);

  const { interviews, loading, refresh } = useInterviews({ from, to });

  async function updateStatus(id: string, statusStepId: string) {
    try {
      await apiFetch(`/api/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statusStepId }),
      });
      pushToast("success", "Interview status updated.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{isToday ? "Today's Interviews" : "Interviews"}</h2>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="pl-9 w-[170px]"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => e.target.value && setSelectedDate(new Date(`${e.target.value}T12:00:00`))}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
          )}
        </div>
      </div>

      {isUnassigned ? (
        <UnassignedNotice />
      ) : (
        <>
          {loading && <p className="text-sm text-muted-foreground">Loading interviews...</p>}
          {!loading && interviews.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              No interviews scheduled for this day.
            </Card>
          )}
        </>
      )}

      <div className="space-y-2">
        {interviews.map((interview) => (
          <InterviewRow
            key={interview.id}
            interview={interview}
            timezone={timezone}
            canUpdateStatus
            onStatusChange={(statusStepId) => updateStatus(interview.id, statusStepId)}
          />
        ))}
      </div>
    </div>
  );
}
