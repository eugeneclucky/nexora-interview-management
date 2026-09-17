"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import { COMMON_TIMEZONES } from "@/lib/timezones";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

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
  const [telegramUsername, setTelegramUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.defaultTimezone);
      setEmailReminders(settings.emailReminders);
    }
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
      setTelegramUsername(user.telegramUsername ?? "");
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
          telegramUsername,
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
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-[var(--primary)]"
            />
            Email me reminders about upcoming interviews
          </label>

          {user?.role === "CALLER" && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="telegram" className="mb-0">
                  Telegram username
                </Label>
                {user.telegramLinked ? (
                  <Badge variant="success">Linked</Badge>
                ) : (
                  <Badge variant="warning">Not linked</Badge>
                )}
              </div>
              <Input
                id="telegram"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="https://t.me/nexcessillion or @nexcessillion"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll message you on Telegram 30 and 10 minutes before each interview.{" "}
                {!user.telegramLinked &&
                  (telegramBotUsername ? (
                    <>
                      Open{" "}
                      <a
                        href={`https://t.me/${telegramBotUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{telegramBotUsername}
                      </a>{" "}
                      and tap Start to link your account.
                    </>
                  ) : (
                    "Save your username here, then open our Telegram bot and tap Start to link your account."
                  ))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </Button>
    </form>
  );
}
