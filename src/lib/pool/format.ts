// Display formatting. Hand-written (not toLocaleDateString) so the server and every browser
// produce exactly the same text, whatever their locale or time zone.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India has no daylight saving time
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parts(ymd: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "2026-10-05" → "5 Oct 2026"; missing or invalid → "—". */
export function formatDate(ymd: string | null): string {
  const p = ymd ? parts(ymd) : null;
  return p && p[1] >= 1 && p[1] <= 12 ? `${p[2]} ${MONTHS[p[1] - 1]} ${p[0]}` : "—";
}

/** A timestamp shifted to India time, as a Date whose UTC fields are the India fields. */
function inIndia(iso: string): Date | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : new Date(t + IST_OFFSET_MS);
}

/** Calendar date in India of a timestamp, e.g. "15 Oct 2026". */
export function formatIndiaDate(iso: string): string {
  const d = inIndia(iso);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "—";
}

/** "16 Oct 2026, 12:28 PM IST" */
export function formatIndiaDateTime(iso: string): string {
  const d = inIndia(iso);
  if (!d) return "—";
  const h = d.getUTCHours();
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatIndiaDate(iso)}, ${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"} IST`;
}

/** Whole weeks between two plain dates (rounded), or null if either is missing or invalid. */
export function weeksBetween(start: string | null, end: string | null): number | null {
  const a = start ? parts(start) : null;
  const b = end ? parts(end) : null;
  if (!a || !b) return null;
  const ms = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2]);
  const weeks = Math.round(ms / WEEK_MS);
  return weeks > 0 ? weeks : null;
}

/** Up to two initials: "Priya  Sharma" → "PS", "Priya" → "P". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** `tel:` link without spaces: "+91 98765 43210" → "tel:+919876543210". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export const STALE_AFTER_MS = 60 * 60 * 1000;

/** True when the last successful sync is more than 1 hour old, or there has been none. */
export function isStale(lastUpdated: string | null, now: number): boolean {
  if (!lastUpdated) return true;
  const t = new Date(lastUpdated).getTime();
  return Number.isNaN(t) || now - t > STALE_AFTER_MS;
}
