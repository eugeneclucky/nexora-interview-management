import { formatInTimeZone } from "date-fns-tz";

export function formatInTz(dateInput: string | Date, timeZone: string, pattern = "MMM d, yyyy h:mm a zzz") {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return formatInTimeZone(date, timeZone, pattern);
}

export function timeOnlyInTz(dateInput: string | Date, timeZone: string) {
  return formatInTz(dateInput, timeZone, "h:mm a zzz");
}
