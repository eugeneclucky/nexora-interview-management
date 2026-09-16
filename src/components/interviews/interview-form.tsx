"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ResumeUploader } from "@/components/resume-uploader";
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/timezones";
import { DURATION_OPTIONS, DEFAULT_DURATION_MINUTES } from "@/lib/durations";
import { useBlockedSlots } from "@/hooks/use-blocked-slots";
import type { CandidateProfile, Caller, Interview } from "@/lib/types";

export type InterviewFormValues = {
  profileId: string;
  callerId: string;
  eventName: string;
  jobDescription: string;
  companyName: string;
  companyWebsite: string;
  meetingLink: string;
  meetingPlatform: string;
  interviewLocal: string;
  durationMinutes: number;
  timezone: string;
  resumeUrl: string;
  resumeName: string;
  notes: string;
};

function toLocalInputValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
}

export function InterviewForm({
  profiles,
  callers,
  initial,
  prefill,
  submitLabel = "Schedule interview",
  onSubmit,
}: {
  profiles: CandidateProfile[];
  callers: Caller[];
  initial?: Partial<Interview>;
  /** Prefills the date/time when creating from a calendar slot selection (no existing interview yet). */
  prefill?: { start: Date; timezone?: string };
  submitLabel?: string;
  onSubmit: (payload: {
    profileId: string;
    callerId?: string;
    eventName?: string;
    jobDescription: string;
    companyName: string;
    companyWebsite?: string;
    meetingLink?: string;
    meetingPlatform?: string;
    interviewTime: string;
    durationMinutes: number;
    timezone: string;
    resumeUrl?: string;
    resumeName?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const initialTz = initial?.timezone || prefill?.timezone || DEFAULT_TIMEZONE;
  const initialLocal = initial?.interviewTime
    ? toLocalInputValue(toZonedTime(new Date(initial.interviewTime), initialTz))
    : prefill?.start
    ? toLocalInputValue(toZonedTime(prefill.start, initialTz))
    : "";

  const [values, setValues] = useState<InterviewFormValues>({
    profileId: initial?.profileId ?? "",
    callerId: initial?.callerId ?? "",
    eventName: initial?.eventName ?? "",
    jobDescription: initial?.jobDescription ?? "",
    companyName: initial?.companyName ?? "",
    companyWebsite: initial?.companyWebsite ?? "",
    meetingLink: initial?.meetingLink ?? "",
    meetingPlatform: initial?.meetingPlatform ?? "",
    interviewLocal: initialLocal,
    durationMinutes: initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES,
    timezone: initialTz,
    resumeUrl: initial?.resumeUrl ?? "",
    resumeName: initial?.resumeName ?? "",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the current resume was explicitly uploaded/chosen for this
  // specific interview ("manual", for display text only) vs. pulled from the
  // candidate profile ("auto"). Switching candidates always re-syncs the
  // resume to the newly selected profile so it can never end up mismatched.
  const resumeSourceRef = useRef<"auto" | "manual">(initial?.resumeUrl ? "manual" : "auto");
  const lastSyncedProfileId = useRef<string | null>(initial?.profileId ?? null);

  useEffect(() => {
    if (!values.profileId) return;
    if (values.profileId === lastSyncedProfileId.current) return;
    lastSyncedProfileId.current = values.profileId;

    resumeSourceRef.current = "auto";
    const profile = profiles.find((p) => p.id === values.profileId);
    set("resumeUrl", profile?.resumeUrl ?? "");
    set("resumeName", profile?.resumeName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.profileId]);

  function set<K extends keyof InterviewFormValues>(key: K, val: InterviewFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  const { slots: callerBlocks } = useBlockedSlots({ callerId: values.callerId || undefined });

  const conflict = useMemo(() => {
    if (!values.callerId || !values.interviewLocal) return null;
    let startUtc: Date;
    try {
      startUtc = fromZonedTime(values.interviewLocal, values.timezone);
    } catch {
      return null;
    }
    const endUtc = new Date(startUtc.getTime() + values.durationMinutes * 60000);
    return (
      callerBlocks.find((b) => {
        if (b.callerId !== values.callerId) return false;
        const blockStart = new Date(b.startTime);
        const blockEnd = new Date(b.endTime);
        return startUtc < blockEnd && endUtc > blockStart;
      }) ?? null
    );
  }, [values.callerId, values.interviewLocal, values.timezone, values.durationMinutes, callerBlocks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.profileId) return setError("Select a candidate profile.");
    if (!values.interviewLocal) return setError("Select an interview date and time.");
    if (conflict) return setError("This time is blocked for the selected caller. Choose a different time or caller.");

    setSubmitting(true);
    try {
      const utcInstant = fromZonedTime(values.interviewLocal, values.timezone);
      await onSubmit({
        profileId: values.profileId,
        callerId: values.callerId || undefined,
        eventName: values.eventName || undefined,
        jobDescription: values.jobDescription,
        companyName: values.companyName,
        companyWebsite: values.companyWebsite || undefined,
        meetingLink: values.meetingLink || undefined,
        meetingPlatform: values.meetingPlatform || undefined,
        interviewTime: utcInstant.toISOString(),
        durationMinutes: values.durationMinutes,
        timezone: values.timezone,
        resumeUrl: values.resumeUrl || undefined,
        resumeName: values.resumeName || undefined,
        notes: values.notes || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProfile = profiles.find((p) => p.id === values.profileId);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="i-event-name">Calendar event name</Label>
        <Input
          id="i-event-name"
          value={values.eventName}
          onChange={(e) => set("eventName", e.target.value)}
          placeholder={
            selectedProfile
              ? `${selectedProfile.name} · ${values.companyName || "Company"}`
              : "Defaults to candidate · company"
          }
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="i-profile">Candidate profile *</Label>
          <Select
            id="i-profile"
            required
            value={values.profileId}
            onChange={(e) => set("profileId", e.target.value)}
          >
            <option value="">Select candidate...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="i-caller">Assign caller</Label>
          <Select
            id="i-caller"
            value={values.callerId}
            onChange={(e) => set("callerId", e.target.value)}
          >
            <option value="">Unassigned</option>
            {callers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="i-company">Company name *</Label>
          <Input
            id="i-company"
            required
            value={values.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
        <div>
          <Label htmlFor="i-website">Company website</Label>
          <Input
            id="i-website"
            value={values.companyWebsite}
            onChange={(e) => set("companyWebsite", e.target.value)}
            placeholder="https://acme.com"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="i-jd">Job description *</Label>
        <Textarea
          id="i-jd"
          required
          rows={5}
          value={values.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
          placeholder="Paste the job description..."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="i-link">Meeting link</Label>
          <Input
            id="i-link"
            value={values.meetingLink}
            onChange={(e) => set("meetingLink", e.target.value)}
            placeholder="https://zoom.us/j/..."
          />
        </div>
        <div>
          <Label htmlFor="i-platform">Meeting platform</Label>
          <Input
            id="i-platform"
            value={values.meetingPlatform}
            onChange={(e) => set("meetingPlatform", e.target.value)}
            placeholder="Zoom, Google Meet, Teams..."
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="i-time">Interview date & time *</Label>
          <Input
            id="i-time"
            type="datetime-local"
            required
            value={values.interviewLocal}
            onChange={(e) => set("interviewLocal", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="i-duration">Duration</Label>
          <Select
            id="i-duration"
            value={values.durationMinutes}
            onChange={(e) => set("durationMinutes", Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((mins) => (
              <option key={mins} value={mins}>
                {formatDuration(mins)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="i-tz">Timezone</Label>
          <Select
            id="i-tz"
            value={values.timezone}
            onChange={(e) => set("timezone", e.target.value)}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {conflict && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {callers.find((c) => c.id === values.callerId)?.name || "This caller"} has blocked
            this time{conflict.reason ? ` (${conflict.reason})` : ""}. Choose a different time or
            caller.
          </span>
        </div>
      )}

      <div>
        <Label>Resume</Label>
        <ResumeUploader
          resumeUrl={values.resumeUrl}
          resumeName={values.resumeName}
          onChange={(val) => {
            if (val) {
              resumeSourceRef.current = "manual";
              set("resumeUrl", val.resumeUrl);
              set("resumeName", val.resumeName);
            } else {
              resumeSourceRef.current = "auto";
              set("resumeUrl", selectedProfile?.resumeUrl ?? "");
              set("resumeName", selectedProfile?.resumeName ?? "");
            }
          }}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {values.resumeUrl
            ? resumeSourceRef.current === "manual"
              ? "Using a resume uploaded specifically for this interview."
              : "Using the candidate profile's resume. Upload a different file to override it for this interview only."
            : "No resume attached yet."}
        </p>
      </div>

      <div>
        <Label htmlFor="i-notes">Notes</Label>
        <Textarea
          id="i-notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional internal notes for the caller"
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={submitting || !!conflict}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
