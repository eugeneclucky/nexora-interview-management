"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EventCalendar } from "@/components/calendar/event-calendar";
import { BlockTimeForm } from "@/components/calendar/block-time-form";
import { InterviewRow } from "@/components/interviews/interview-row";
import { useInterviews } from "@/hooks/use-interviews";
import { useBlockedSlots } from "@/hooks/use-blocked-slots";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { Interview, BlockedSlot } from "@/lib/types";

export default function CallerCalendarPage() {
  const { data: session } = useSession();
  const { interviews, refresh } = useInterviews();
  const { slots, refresh: refreshSlots } = useBlockedSlots();
  const { timezone } = useSettings();
  const [selected, setSelected] = useState<Interview | null>(null);
  const [blockDialogRange, setBlockDialogRange] = useState<{ start: Date; end: Date } | "manual" | null>(
    null
  );
  const [selectedBlock, setSelectedBlock] = useState<BlockedSlot | null>(null);
  const pushToast = useToast();
  const isUnassigned = !session?.user?.managerId;

  async function updateStatus(id: string, statusStepId: string) {
    try {
      await apiFetch(`/api/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statusStepId }),
      });
      pushToast("success", "Interview status updated.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function createBlock(payload: { startTime: string; endTime: string; reason?: string }) {
    await apiFetch("/api/blocked-slots", { method: "POST", body: JSON.stringify(payload) });
    pushToast("success", "Time blocked. Managers won't be able to schedule interviews then.");
    setBlockDialogRange(null);
    refreshSlots();
  }

  async function deleteBlock(block: BlockedSlot) {
    if (!confirm("Remove this blocked time?")) return;
    try {
      await apiFetch(`/api/blocked-slots/${block.id}`, { method: "DELETE" });
      pushToast("success", "Blocked time removed.");
      setSelectedBlock(null);
      refreshSlots();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to remove blocked time");
    }
  }

  const blockDialogOpen = blockDialogRange !== null;
  const blockDialogInitial =
    blockDialogRange && blockDialogRange !== "manual" ? blockDialogRange : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Your assigned interviews. Drag to select a time range (or use the button) to block
            time so managers can&apos;t schedule an interview then.
          </p>
        </div>
        <Button onClick={() => setBlockDialogRange("manual")}>
          <CalendarOff className="h-4 w-4" /> Block time
        </Button>
      </div>

      {isUnassigned && (
        <Card className="p-4 text-sm text-muted-foreground">
          You haven&apos;t been added to a team yet, so no interviews will show up here — but
          you can still block off time in advance.
        </Card>
      )}

      <Card className="p-4">
        <EventCalendar
          interviews={interviews}
          blockedSlots={slots}
          timezone={timezone}
          onSelectEvent={setSelected}
          onSelectBlockedSlot={setSelectedBlock}
          selectable
          onSelectSlot={(start, end) => setBlockDialogRange({ start, end })}
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
            onStatusChange={(statusStepId) => updateStatus(selected.id, statusStepId)}
          />
        )}
      </Dialog>

      <Dialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogRange(null)}
        title="Block time"
        description="Managers won't be able to schedule an interview with you during this range."
      >
        <BlockTimeForm
          timezone={timezone}
          initialStart={blockDialogInitial?.start}
          initialEnd={blockDialogInitial?.end}
          onSubmit={createBlock}
        />
      </Dialog>

      <Dialog
        open={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        title="Blocked time"
      >
        {selectedBlock && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedBlock.reason || "No reason given."}
            </p>
            <Button variant="danger" onClick={() => deleteBlock(selectedBlock)} className="w-full">
              Remove this block
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
