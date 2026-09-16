"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { BlockedSlot } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

/** `mine: true` forces scope to the current user's own team, even for a
 * super admin (who's otherwise org-wide by default). */
export function useBlockedSlots(params?: {
  callerId?: string;
  from?: string;
  to?: string;
  mine?: boolean;
}) {
  const { data: session } = useSession();
  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const key = JSON.stringify(params ?? {}) + selfId;

  const load = useCallback(() => {
    if (params?.mine && !selfId) return;
    const qs = new URLSearchParams();
    if (params?.callerId) qs.set("callerId", params.callerId);
    if (params?.mine && selfId) qs.set("managerId", selfId);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    setLoading(true);
    apiFetch<BlockedSlot[]>(`/api/blocked-slots?${qs.toString()}`)
      .then(setSlots)
      .catch((err) => console.error("Failed to load blocked slots:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("blocked-slot:changed", load);

  return { slots, loading, refresh: load };
}
