"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EventCalendar } from "@/components/calendar/event-calendar";
import { InterviewRow } from "@/components/interviews/interview-row";
import { InterviewForm } from "@/components/interviews/interview-form";
import { useInterviews } from "@/hooks/use-interviews";
import { useProfiles } from "@/hooks/use-profiles";
import { useCallers } from "@/hooks/use-callers";
import { useBlockedSlots } from "@/hooks/use-blocked-slots";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import { formatInTz } from "@/lib/format-time";
import type { Interview, BlockedSlot } from "@/lib/types";

export default function ManagerCalendarPage() {
  const { interviews, refresh } = useInterviews({ mine: true });
  const { profiles } = useProfiles({ mine: true });
  const { callers } = useCallers({ mine: true });
  const { slots } = useBlockedSlots({ mine: true });
  const { timezone } = useSettings();
  const [selected, setSelected] = useState<Interview | null>(null);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockedSlot | null>(null);
  const [newSlot, setNewSlot] = useState<Date | null>(null);
  const pushToast = useToast();

  async function updateStatus(id: string, statusStepId: string) {
    try {
      await apiFetch(`/api/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statusStepId }),
      });
      pushToast("success", "Interview status updated.");
      setSelected(null);
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function deleteInterview(interview: Interview) {
    if (!confirm(`Delete the interview with ${interview.profile.name}? This can't be undone.`))
      return;
    try {
      await apiFetch(`/api/interviews/${interview.id}`, { method: "DELETE" });
      pushToast("success", "Interview deleted.");
      setSelected(null);
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete interview");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          All interview events across your candidate profiles, plus any time your callers have
          blocked off. Drag to select a time slot to schedule a new interview right from the
          calendar.
        </p>
      </div>

      <Card className="p-4">
        <EventCalendar
          interviews={interviews}
          blockedSlots={slots}
          showCallerOnBlocks
          timezone={timezone}
          onSelectEvent={setSelected}
          onSelectBlockedSlot={setSelectedBlock}
          selectable
          onSelectSlot={(start) => setNewSlot(start)}
        />
      </Card>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.eventName || `${selected.profile.name} — ${selected.companyName}` : ""}
      >
        {selected && (
          <InterviewRow
            interview={selected}
            timezone={timezone}
            canUpdateStatus
            onStatusChange={(stepId) => updateStatus(selected.id, stepId)}
            onEdit={() => {
              setEditing(selected);
              setSelected(null);
            }}
            onDelete={() => deleteInterview(selected)}
          />
        )}
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit interview"
        className="max-w-2xl"
      >
        {editing && (
          <InterviewForm
            profiles={profiles}
            callers={callers}
            initial={editing}
            submitLabel="Save changes"
            onSubmit={async (payload) => {
              await apiFetch(`/api/interviews/${editing.id}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
              });
              pushToast("success", "Interview updated.");
              setEditing(null);
              refresh();
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        title="Blocked time"
      >
        {selectedBlock && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{selectedBlock.caller?.name ?? "Caller"}</p>
            <p className="text-muted-foreground">
              {formatInTz(selectedBlock.startTime, timezone, "MMM d, h:mm a")} –{" "}
              {formatInTz(selectedBlock.endTime, timezone, "h:mm a zzz")}
            </p>
            <p className="text-muted-foreground">
              {selectedBlock.reason || "No reason given."}
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              This caller marked themselves unavailable during this time. You won&apos;t be able
              to schedule an interview with them then.
            </p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!newSlot}
        onClose={() => setNewSlot(null)}
        title="Schedule interview"
        description="Prefilled with the time you selected on the calendar."
        className="max-w-2xl"
      >
        {newSlot && (
          <InterviewForm
            profiles={profiles}
            callers={callers}
            prefill={{ start: newSlot, timezone }}
            onSubmit={async (payload) => {
              await apiFetch("/api/interviews", { method: "POST", body: JSON.stringify(payload) });
              pushToast("success", "Interview scheduled.");
              setNewSlot(null);
              refresh();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
