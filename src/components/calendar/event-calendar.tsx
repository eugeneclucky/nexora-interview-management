"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, type View, type SlotInfo } from "react-big-calendar";
import withDragAndDrop, { type EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, endOfWeek, getDay, isWithinInterval, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import type { Interview, BlockedSlot } from "@/lib/types";
import { calendarDateToUtc } from "@/lib/calendar-tz";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales,
});

type CalendarEvent =
  | { id: string; title: string; start: Date; end: Date; kind: "interview"; interview: Interview }
  | { id: string; title: string; start: Date; end: Date; kind: "block"; block: BlockedSlot };

// Defined once at module scope -- wrapping Calendar inside the component body
// would recreate the wrapped component (and remount the whole calendar) on
// every render.
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

export function EventCalendar({
  interviews,
  blockedSlots,
  showCallerOnBlocks,
  timezone,
  onSelectEvent,
  onSelectBlockedSlot,
  selectable,
  onSelectSlot,
  /** Dragging/resizing an interview event calls this with its new start/end
   * (UTC). Only provided where the viewer is allowed to move interviews they
   * scheduled (managers), not just view them (callers). */
  onMoveEvent,
  /** Same, for a caller dragging/resizing their own blocked-time event. */
  onMoveBlockedSlot,
  defaultView = Views.WEEK,
}: {
  interviews: Interview[];
  blockedSlots?: BlockedSlot[];
  /** Prefix each blocked-slot event with the caller's name -- useful on a
   * manager's calendar, which shows blocks from every caller on the team,
   * not just one. */
  showCallerOnBlocks?: boolean;
  timezone: string;
  onSelectEvent?: (interview: Interview) => void;
  onSelectBlockedSlot?: (block: BlockedSlot) => void;
  selectable?: boolean;
  onSelectSlot?: (start: Date, end: Date) => void;
  onMoveEvent?: (interview: Interview, start: Date, end: Date) => void;
  onMoveBlockedSlot?: (block: BlockedSlot, start: Date, end: Date) => void;
  defaultView?: View;
}) {
  const [view, setView] = useState<View>(defaultView);
  const [date, setDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Land on the current time already centered in view (Day/Week only, and
  // only when the visible range actually includes today) instead of
  // defaulting to midnight-at-the-top and making users scroll to find "now".
  // Re-runs when navigating back to today (e.g. the Today button) too, not
  // just on first mount.
  useEffect(() => {
    if (view !== Views.DAY && view !== Views.WEEK) return;

    const includesToday =
      view === Views.DAY
        ? isSameDay(date, new Date())
        : isWithinInterval(new Date(), {
            start: startOfWeek(date, { locale: enUS }),
            end: endOfWeek(date, { locale: enUS }),
          });
    if (!includesToday) return;

    const centerOnNow = () => {
      const content = containerRef.current?.querySelector<HTMLElement>(".rbc-time-content");
      if (!content) return;
      const zonedNow = toZonedTime(new Date(), timezone);
      const minutesNow = zonedNow.getHours() * 60 + zonedNow.getMinutes();
      const targetTop = (content.scrollHeight * minutesNow) / 1440 - content.clientHeight / 2;
      content.scrollTop = Math.max(0, targetTop);
    };

    // Switching views (e.g. Week -> Day) remounts react-big-calendar's
    // internal time grid, which re-measures its own layout shortly after and
    // resets scrollTop back to 0 in the process -- setting it once, right
    // away, gets silently clobbered by that. Its remeasurement timing isn't
    // something we control, so re-apply a few times over the next moment
    // rather than racing a single retry against it.
    centerOnNow();
    const raf = requestAnimationFrame(centerOnNow);
    const timeout = setTimeout(centerOnNow, 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [view, date, timezone]);

  const events = useMemo<CalendarEvent[]>(() => {
    const interviewEvents: CalendarEvent[] = interviews.map((interview) => {
      const start = toZonedTime(new Date(interview.interviewTime), timezone);
      const end = new Date(start.getTime() + interview.durationMinutes * 60000);
      return {
        id: interview.id,
        title: interview.eventName || `${interview.profile.name} · ${interview.companyName}`,
        start,
        end,
        kind: "interview",
        interview,
      };
    });
    const blockEvents: CalendarEvent[] = (blockedSlots ?? []).map((block) => {
      const busyLabel = block.reason ? `Busy · ${block.reason}` : "Busy";
      return {
        id: block.id,
        title:
          showCallerOnBlocks && block.caller ? `${block.caller.name} · ${busyLabel}` : busyLabel,
        start: toZonedTime(new Date(block.startTime), timezone),
        end: toZonedTime(new Date(block.endTime), timezone),
        kind: "block",
        block,
      };
    });
    return [...interviewEvents, ...blockEvents];
  }, [interviews, blockedSlots, timezone, showCallerOnBlocks]);

  const canDrag = (event: CalendarEvent) =>
    event.kind === "interview" ? Boolean(onMoveEvent) : Boolean(onMoveBlockedSlot);

  function handleEventChange({ event, start, end }: EventInteractionArgs<CalendarEvent>) {
    const utcStart = calendarDateToUtc(new Date(start), timezone);
    const utcEnd = calendarDateToUtc(new Date(end), timezone);
    if (event.kind === "interview") onMoveEvent?.(event.interview, utcStart, utcEnd);
    else onMoveBlockedSlot?.(event.block, utcStart, utcEnd);
  }

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-xl">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        date={date}
        onView={(v) => setView(v)}
        onNavigate={(newDate: Date) => setDate(newDate)}
        views={[Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA]}
        popup
        // react-big-calendar's internal vertical scroll (.rbc-time-content)
        // only activates once the root .rbc-calendar element has an
        // explicit height of its own to size against -- a height on an
        // ancestor div isn't enough, since .rbc-calendar renders at its
        // intrinsic content height (all 24 hours) otherwise, which then
        // just gets silently clipped by any overflow-hidden ancestor.
        style={{ height: "70vh", minHeight: 520 }}
        selectable={selectable}
        onSelectSlot={(slotInfo: SlotInfo) => {
          if (!onSelectSlot) return;
          onSelectSlot(
            calendarDateToUtc(slotInfo.start as Date, timezone),
            calendarDateToUtc(slotInfo.end as Date, timezone)
          );
        }}
        onSelectEvent={(event: CalendarEvent) => {
          if (event.kind === "interview") onSelectEvent?.(event.interview);
          else onSelectBlockedSlot?.(event.block);
        }}
        draggableAccessor={canDrag}
        resizableAccessor={canDrag}
        resizable={Boolean(onMoveEvent || onMoveBlockedSlot)}
        onEventDrop={handleEventChange}
        onEventResize={handleEventChange}
        eventPropGetter={(event: CalendarEvent) => {
          if (event.kind === "block") {
            return {
              style: {
                backgroundColor: "var(--event-busy)",
                color: "var(--event-busy-foreground)",
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--event-busy-border) 0, var(--event-busy-border) 2px, transparent 2px, transparent 8px)",
                border: "1px solid var(--event-busy-border)",
              },
            };
          }
          const kind = event.interview.statusStep.kind;
          const bg =
            kind === "CANCELLED"
              ? "var(--danger)"
              : kind === "NO_SHOW"
              ? "var(--warning)"
              : "var(--event-scheduled)";
          return { style: { backgroundColor: bg, color: "var(--event-scheduled-foreground)" } };
        }}
        components={{
          event: ({ event }: { event: CalendarEvent }) => {
            if (event.kind === "block") {
              return <div className="truncate font-medium">{event.title}</div>;
            }
            return (
              <div className="truncate">
                <span className="font-medium">{event.title}</span>
              </div>
            );
          },
        }}
      />
    </div>
  );
}
