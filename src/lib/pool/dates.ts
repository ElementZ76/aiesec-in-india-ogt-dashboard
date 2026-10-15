// Dates in India time (CLAUDE.md invariant 6: "today" means today in Asia/Kolkata).

const indiaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date in India for a moment in time, as `YYYY-MM-DD`. */
export function indiaDate(moment: Date): string {
  return indiaDay.format(moment); // en-CA formats as YYYY-MM-DD
}

/**
 * Turns an EXPA date value into `YYYY-MM-DD` (India), or null.
 * A plain date is kept as is; a timestamp is converted to its date in India.
 */
export function toIndiaDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const moment = new Date(trimmed);
  return Number.isNaN(moment.getTime()) ? null : indiaDate(moment);
}
