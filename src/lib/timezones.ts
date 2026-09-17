export const DEFAULT_TIMEZONE = "America/Chicago"; // CST/CDT

// Used only if the runtime doesn't support Intl.supportedValuesOf (very old
// browsers/Node) -- keeps timezone selection working either way.
const FALLBACK_ZONES = [
  "UTC",
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Dhaka",
  "Asia/Karachi",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Current UTC offset for a timezone, in minutes (e.g. -300 for GMT-5, 330
 * for GMT+5:30) -- computed from actual wall-clock differences rather than
 * parsing the (locale-formatted, DST-name-dependent) offset string, so it
 * sorts correctly regardless of locale or half/quarter-hour offsets. */
function offsetMinutes(tz: string, at: Date): number {
  try {
    const utcMs = new Date(at.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const tzMs = new Date(at.toLocaleString("en-US", { timeZone: tz })).getTime();
    return Math.round((tzMs - utcMs) / 60000);
  } catch {
    return 0;
  }
}

function buildTimezoneOptions(): { value: string; label: string; offsetMinutes: number }[] {
  const zones: string[] =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : FALLBACK_ZONES;

  const now = new Date();

  return zones
    .map((tz) => {
      const offset = offsetLabel(tz);
      const readable = tz.replace(/_/g, " ");
      return {
        value: tz,
        label: offset ? `${readable} (${offset})` : readable,
        offsetMinutes: offsetMinutes(tz, now),
      };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value));
}

/** Every IANA timezone the current runtime knows about, sorted from GMT- to
 * GMT+ (ties broken alphabetically). */
export const COMMON_TIMEZONES: { value: string; label: string; offsetMinutes: number }[] =
  buildTimezoneOptions();
