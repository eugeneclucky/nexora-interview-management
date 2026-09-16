"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InterviewRow } from "@/components/interviews/interview-row";
import { useInterviews } from "@/hooks/use-interviews";
import { useStatusSteps } from "@/hooks/use-status-steps";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { Manager } from "@/lib/types";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

export default function AdminInterviewsPage() {
  return (
    <Suspense fallback={null}>
      <AdminInterviewsInner />
    </Suspense>
  );
}

function AdminInterviewsInner() {
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState(searchParams.get("managerId") ?? "");
  const [statusStepId, setStatusStepId] = useState("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const { interviews, loading, refresh } = useInterviews({
    managerId: managerId || undefined,
    statusStepId: statusStepId || undefined,
  });
  const { steps } = useStatusSteps(managerId || null);
  const pushToast = useToast();

  useEffect(() => {
    apiFetch<Manager[]>("/api/managers").then(setManagers).catch(() => {});
  }, []);

  useEffect(() => {
    setStatusStepId("");
  }, [managerId]);

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete the interview "${label}"?`)) return;
    try {
      await apiFetch(`/api/interviews/${id}`, { method: "DELETE" });
      pushToast("success", "Interview deleted.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete interview");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Interviews</h2>
        <p className="text-sm text-muted-foreground">Every interview across the organization.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="max-w-[220px]">
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusStepId}
          onChange={(e) => setStatusStepId(e.target.value)}
          className="max-w-[180px]"
          disabled={!managerId}
        >
          <option value="">{managerId ? "All statuses" : "Select a manager first"}</option>
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading interviews...</p>}
      {!loading && interviews.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">No interviews found.</Card>
      )}

      <div className="space-y-2">
        {interviews.map((interview) => (
          <div key={interview.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <InterviewRow interview={interview} timezone={DEFAULT_TIMEZONE} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(interview.id, interview.eventName || interview.companyName)}
              aria-label="Delete interview"
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
