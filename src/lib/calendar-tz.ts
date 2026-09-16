import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Converts a Date read out of the calendar grid (in the "fake local = wall
 * clock in `timezone`" coordinate system every event on the calendar uses,
 * via toZonedTime) back to a real UTC instant.
 */
export function calendarDateToUtc(calendarDate: Date, timezone: string): Date {
  const wallClock = format(calendarDate, "yyyy-MM-dd'T'HH:mm:ss");
  return fromZonedTime(wallClock, timezone);
}
