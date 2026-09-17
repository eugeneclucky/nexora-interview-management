"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InterviewRow } from "@/components/interviews/interview-row";
import { useSettings } from "@/hooks/use-settings";
import { useSocketEvent } from "@/hooks/use-socket-event";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch, ApiError } from "@/lib/api";
import type { Interview } from "@/lib/types";

export default function CallerInterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { timezone } = useSettings();
  const pushToast = useToast();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Interview>(`/api/interviews/${id}`)
      .then((data) => {
        setInterview(data);
        setNotFound(false);
      })
      .catch((err) => {
        if (err instanceof ApiError) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("interview:updated", (updated: Interview) => {
    if (updated.id === id) setInterview(updated);
  });

  async function updateStatus(statusStepId: string) {
    try {
      const updated = await apiFetch<Interview>(`/api/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statusStepId }),
      });
      setInterview(updated);
      pushToast("success", "Interview status updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        type="button"
        onClick={() => router.push("/caller")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to interviews
      </button>

      {loading && (
        <Card className="p-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      )}

      {!loading && notFound && (
        <Card className="p-10 text-center text-muted-foreground">
          This interview doesn&apos;t exist or isn&apos;t assigned to you.
        </Card>
      )}

      {!loading && interview && (
        <InterviewRow
          interview={interview}
          timezone={timezone}
          canUpdateStatus
          onStatusChange={updateStatus}
          defaultExpanded
        />
      )}
    </div>
  );
}
