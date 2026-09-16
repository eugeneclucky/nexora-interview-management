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

function buildTimezoneOptions(): { value: string; label: string }[] {
  const zones: string[] =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : FALLBACK_ZONES;

  return zones
    .map((tz) => {
      const offset = offsetLabel(tz);
      const readable = tz.replace(/_/g, " ");
      return { value: tz, label: offset ? `${readable} (${offset})` : readable };
    })
    .sort((a, b) => a.value.localeCompare(b.value));
}

/** Every IANA timezone the current runtime knows about, sorted alphabetically with UTC offset. */
export const COMMON_TIMEZONES: { value: string; label: string }[] = buildTimezoneOptions();
