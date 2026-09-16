"use client";

import { useState } from "react";
import { fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function toLocalInputValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function BlockTimeForm({
  timezone,
  initialStart,
  initialEnd,
  onSubmit,
}: {
  timezone: string;
  initialStart?: Date;
  initialEnd?: Date;
  onSubmit: (payload: { startTime: string; endTime: string; reason?: string }) => Promise<void>;
}) {
  const now = new Date();
  const defaultStart = initialStart ?? now;
  const defaultEnd = initialEnd ?? new Date(defaultStart.getTime() + 60 * 60000);

  const [start, setStart] = useState(toLocalInputValue(defaultStart));
  const [end, setEnd] = useState(toLocalInputValue(defaultEnd));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const startUtc = fromZonedTime(start, timezone);
    const endUtc = fromZonedTime(end, timezone);
    if (endUtc.getTime() <= startUtc.getTime()) {
      setError("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        startTime: startUtc.toISOString(),
        endTime: endUtc.toISOString(),
        reason: reason.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="block-start">Start</Label>
          <Input
            id="block-start"
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="block-end">End</Label>
          <Input
            id="block-end"
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Times are in your default timezone ({timezone}).</p>

      <div>
        <Label htmlFor="block-reason">Reason (optional)</Label>
        <Input
          id="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lunch, PTO, unavailable..."
        />
      </div>

      {error && <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Block this time
      </Button>
    </form>
  );
}
