"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import { COMMON_TIMEZONES } from "@/lib/timezones";

export function AccountSettingsForm({
  timezoneDescription,
}: {
  timezoneDescription?: string;
}) {
  const { settings, user, refresh, loading } = useSettings();
  const pushToast = useToast();

  const [timezone, setTimezone] = useState("America/Chicago");
  const [emailReminders, setEmailReminders] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.defaultTimezone);
      setEmailReminders(settings.emailReminders);
    }
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
  }, [settings, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          defaultTimezone: timezone,
          emailReminders,
          name,
          phone,
        }),
      });
      pushToast("success", "Settings saved.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            {timezoneDescription ??
              "Interview times across the app are shown in this timezone by default."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <Select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-[var(--primary)]"
            />
            Email me reminders about upcoming interviews
          </label>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </Button>
    </form>
  );
}
