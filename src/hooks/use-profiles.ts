"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { CandidateProfile } from "@/lib/types";
import { useSocketEvent } from "./use-socket-event";

/** `mine: true` forces scope to the current user's own id, even for a super
 * admin (who's otherwise org-wide by default). */
export function useProfiles(params?: { search?: string; managerId?: string; mine?: boolean }) {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const selfId = session?.user?.id;
  const key = JSON.stringify(params ?? {}) + selfId;

  const load = useCallback(() => {
    if (params?.mine && !selfId) return;
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.mine && selfId) qs.set("managerId", selfId);
    else if (params?.managerId) qs.set("managerId", params.managerId);
    setLoading(true);
    apiFetch<CandidateProfile[]>(`/api/profiles?${qs.toString()}`)
      .then(setProfiles)
      .catch((err) => console.error("Failed to load profiles:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("profile:created", load);
  useSocketEvent("profile:updated", load);
  useSocketEvent("profile:deleted", load);

  return { profiles, loading, refresh: load };
}
