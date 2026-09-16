"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { StatusStep } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

/** Pass an explicit managerId to view a specific manager's pipeline (admin
 * org-wide filters), or `"mine"` to force the current user's own pipeline
 * even for a super admin (who otherwise needs an explicit managerId). */
export function useStatusSteps(managerId?: string | null | "mine") {
  const { data: session } = useSession();
  const [steps, setSteps] = useState<StatusStep[]>([]);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const resolvedManagerId = managerId === "mine" ? selfId : managerId;

  const load = useCallback(() => {
    if (managerId === null) {
      setSteps([]);
      setLoading(false);
      return;
    }
    if (managerId === "mine" && !selfId) return;
    const qs = resolvedManagerId ? `?managerId=${encodeURIComponent(resolvedManagerId)}` : "";
    setLoading(true);
    apiFetch<StatusStep[]>(`/api/status-steps${qs}`)
      .then(setSteps)
      .catch((err) => console.error("Failed to load status steps:", err))
      .finally(() => setLoading(false));
  }, [managerId, resolvedManagerId, selfId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("status-step:changed", load);

  return { steps, loading, refresh: load };
}
