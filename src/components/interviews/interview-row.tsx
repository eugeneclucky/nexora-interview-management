"use client";

import { useState } from "react";
import {
  Building2,
  Globe,
  Video,
  FileText,
  Mail,
  Phone,
  MapPin,
  Cake,
  ShieldCheck,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge, stepVariant } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
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
  onEdit,
  onDelete,
  defaultExpanded,
}: {
  interview: Interview;
  timezone: string;
  canUpdateStatus?: boolean;
  onStatusChange?: (statusStepId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const [jdExpanded, setJdExpanded] = useState(false);
  const JD_COLLAPSE_THRESHOLD = 320;
  const jdIsLong = interview.jobDescription.length > JD_COLLAPSE_THRESHOLD;
  const { steps } = useStatusSteps(interview.managerId);
  const resumeUrl = interview.resumeUrl || interview.profile.resumeUrl;
  const usingInterviewSpecificResume = Boolean(interview.resumeUrl);

  const badgeVariant = stepVariant(
    interview.statusStep.kind,
    isCompletionStep(interview.statusStep, steps)
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
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
              {interview.position ? `${interview.position} · ${interview.companyName}` : interview.companyName}
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
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Edit interview"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                  aria-label="Delete interview"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 pt-3 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Candidate
            </p>
            <p className="flex items-center gap-2 font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> {interview.profile.name}
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
            {(interview.profile.address || interview.profile.city || interview.profile.state) && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[
                  interview.profile.address,
                  interview.profile.city,
                  interview.profile.state,
                  interview.profile.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {interview.profile.dob && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Cake className="h-3.5 w-3.5" /> DOB:{" "}
                {formatInTz(interview.profile.dob, "UTC", "MMM d, yyyy")}
              </p>
            )}
            {interview.profile.ssnLast4 && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> SSN: •••-••-{interview.profile.ssnLast4}
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Avatar src={interview.caller.avatarUrl} name={interview.caller.name} size={18} className="text-[9px]" />
                Caller: {interview.caller.name}
              </div>
            )}
          </div>

          {interview.jobDescription && (
            <div className="sm:col-span-2">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Job description
              </p>
              <div
                className={cn(
                  "relative whitespace-pre-wrap text-foreground/90",
                  jdIsLong && !jdExpanded && "max-h-32 overflow-hidden"
                )}
              >
                {interview.jobDescription}
                {jdIsLong && !jdExpanded && (
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                )}
              </div>
              {jdIsLong && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setJdExpanded((v) => !v);
                  }}
                  className="mt-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  {jdExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {interview.notes && (
            <div className="sm:col-span-2">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-foreground/90">{interview.notes}</p>
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
