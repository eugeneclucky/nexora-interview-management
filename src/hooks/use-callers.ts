"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { Caller } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

/** `mine: true` forces scope to the current user's own id, even for a super
 * admin (who's otherwise org-wide by default). */
export function useCallers(params?: { managerId?: string; unassigned?: boolean; mine?: boolean }) {
  const { data: session } = useSession();
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const key = JSON.stringify(params ?? {}) + selfId;

  const load = useCallback(() => {
    if (params?.mine && !selfId) return;
    const qs = new URLSearchParams();
    if (params?.mine && selfId) qs.set("managerId", selfId);
    else if (params?.managerId) qs.set("managerId", params.managerId);
    if (params?.unassigned) qs.set("unassigned", "true");
    setLoading(true);
    apiFetch<Caller[]>(`/api/callers?${qs.toString()}`)
      .then(setCallers)
      .catch((err) => console.error("Failed to load callers:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("caller:created", load);
  useSocketEvent("caller:updated", load);
  useSocketEvent("caller:deleted", load);

  return { callers, loading, refresh: load };
}
