"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

/** `mine: true` forces the stats to be scoped to the current user's own id,
 * even for a super admin (who's otherwise org-wide by default) -- used by
 * the shared manager dashboard so a super admin sees their own numbers
 * there instead of the whole org's. */
export function useDashboardStats(options?: { mine?: boolean }) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const mine = options?.mine;

  const load = useCallback(() => {
    if (mine && !selfId) return;
    const qs = mine && selfId ? `?managerId=${encodeURIComponent(selfId)}` : "";
    apiFetch<DashboardStats>(`/api/dashboard/stats${qs}`)
      .then(setStats)
      .catch((err) => console.error("Failed to load dashboard stats:", err))
      .finally(() => setLoading(false));
  }, [mine, selfId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("interview:created", load);
  useSocketEvent("interview:updated", load);
  useSocketEvent("interview:deleted", load);
  useSocketEvent("profile:created", load);
  useSocketEvent("caller:created", load);

  return { stats, loading, refresh: load };
}
