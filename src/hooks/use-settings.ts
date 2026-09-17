"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { useSocketEvent } from "./use-socket-event";

type Settings = {
  id: string;
  userId: string;
  defaultTimezone: string;
  theme: string;
  emailReminders: boolean;
};

type SettingsResponse = {
  settings: Settings;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    telegramUsername: string | null;
    telegramLinked: boolean;
    telegramLinkCode: string | null;
  };
};

export function useSettings() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch<SettingsResponse>("/api/settings")
      .then(setData)
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Settings are per-user, not team-scoped, so this only reaches the same
  // user's other open tabs/devices -- lets a timezone (or other settings)
  // change made in one tab reach an already-open calendar in another,
  // without needing a manual refresh.
  useSocketEvent("settings:updated", load);

  return {
    settings: data?.settings,
    user: data?.user,
    timezone: data?.settings.defaultTimezone ?? DEFAULT_TIMEZONE,
    loading,
    refresh: load,
  };
}
