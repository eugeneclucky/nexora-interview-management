"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { Interview } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

export type InterviewFilters = {
  from?: string;
  to?: string;
  statusStepId?: string;
  callerId?: string;
  managerId?: string;
  profileId?: string;
  /** Force scope to the current user's own id, even for a super admin. */
  mine?: boolean;
};

export function useInterviews(filters?: InterviewFilters) {
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const key = JSON.stringify(filters ?? {}) + selfId;

  const load = useCallback(() => {
    if (filters?.mine && !selfId) return;
    const qs = new URLSearchParams();
    if (filters?.from) qs.set("from", filters.from);
    if (filters?.to) qs.set("to", filters.to);
    if (filters?.statusStepId) qs.set("statusStepId", filters.statusStepId);
    if (filters?.callerId) qs.set("callerId", filters.callerId);
    if (filters?.mine && selfId) qs.set("managerId", selfId);
    else if (filters?.managerId) qs.set("managerId", filters.managerId);
    if (filters?.profileId) qs.set("profileId", filters.profileId);
    setLoading(true);
    apiFetch<Interview[]>(`/api/interviews?${qs.toString()}`)
      .then(setInterviews)
      .catch((err) => console.error("Failed to load interviews:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("interview:created", load);
  useSocketEvent("interview:updated", load);
  useSocketEvent("interview:deleted", load);

  return { interviews, loading, refresh: load };
}
