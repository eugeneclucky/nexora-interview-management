"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

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

  return {
    settings: data?.settings,
    user: data?.user,
    timezone: data?.settings.defaultTimezone ?? DEFAULT_TIMEZONE,
    loading,
    refresh: load,
  };
}
