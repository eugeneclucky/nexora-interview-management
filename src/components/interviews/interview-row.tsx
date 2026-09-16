"use client";

import { useState } from "react";
import {
  Building2,
  Globe,
  Video,
  FileText,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Badge, stepVariant } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatInTz } from "@/lib/format-time";
import { isCompletionStep } from "@/lib/step-helpers";
import { useStatusSteps } from "@/hooks/use-status-steps";
import type { Interview } from "@/lib/types";
import { cn } from "@/lib/cn";

export function InterviewRow({
  interview,
  timezone,
  canUpdateStatus,
  onStatusChange,
}: {
  interview: Interview;
  timezone: string;
  canUpdateStatus?: boolean;
  onStatusChange?: (statusStepId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { steps } = useStatusSteps(interview.managerId);
  const resumeUrl = interview.resumeUrl || interview.profile.resumeUrl;
  const usingInterviewSpecificResume = Boolean(interview.resumeUrl);

  const badgeVariant = stepVariant(
    interview.statusStep.kind,
    isCompletionStep(interview.statusStep, steps)
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-4 text-left cursor-pointer hover:bg-muted/50"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
            {interview.profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {interview.eventName || `${interview.profile.name} · ${interview.companyName}`}
            </p>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {interview.companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <div className="text-sm text-right sm:text-left">
            <p className="font-medium">{formatInTz(interview.interviewTime, timezone, "h:mm a")}</p>
            <p className="text-xs text-muted-foreground">
              {formatInTz(interview.interviewTime, timezone, "MMM d · zzz")}
              {" · "}
              {interview.durationMinutes}m
            </p>
          </div>
          <Badge variant={badgeVariant}>{interview.statusStep.label}</Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 pt-3 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Candidate
            </p>
            {interview.profile.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {interview.profile.email}
              </p>
            )}
            {interview.profile.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {interview.profile.phone}
              </p>
            )}
            {interview.profile.linkedinUrl && (
              <a
                href={interview.profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> LinkedIn profile
              </a>
            )}
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {interview.resumeName || "View resume"}
                <span className="text-xs text-muted-foreground">
                  ({usingInterviewSpecificResume ? "uploaded for this interview" : "profile default"})
                </span>
              </a>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Interview
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {interview.durationMinutes} minutes
            </p>
            {interview.companyWebsite && (
              <a
                href={interview.companyWebsite}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> Company website
              </a>
            )}
            {interview.meetingLink && (
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Video className="h-3.5 w-3.5" /> {interview.meetingPlatform || "Join meeting"}
              </a>
            )}
            {interview.caller && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Caller: {interview.caller.name}
              </p>
            )}
          </div>

          {interview.jobDescription && (
            <div className="sm:col-span-2">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Job description
              </p>
              <p className="whitespace-pre-wrap text-foreground/90">{interview.jobDescription}</p>
            </div>
          )}

          {canUpdateStatus && (
            <div className={cn("sm:col-span-2 flex items-center gap-2 pt-2")}>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Update status
              </span>
              <Select
                value={interview.statusStepId}
                onChange={(e) => onStatusChange?.(e.target.value)}
                className="w-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
