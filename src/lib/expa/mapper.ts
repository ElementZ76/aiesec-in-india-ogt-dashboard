// Turns one EXPA record into one `applications` row (docs/sops/sync.md step 2).
import type { ApplicationRow, EpManager, Programme } from "@/lib/db/types";
import { toIndiaDate } from "@/lib/pool/dates";
import type { RawApplication } from "./applications";

export const NAME_FALLBACK = "(name not on EXPA)";

export type InvalidReason = "no id" | "no applicant id" | "no home LC" | "unknown programme" | "no applied date" | "status not open";

export type MapResult = { ok: true; row: ApplicationRow } | { ok: false; reason: InvalidReason };

const text = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** Keeps only http(s) links. A bare "linkedin.com/..." gets https://. Everything else → null. */
export function safeUrl(value: string | null | undefined, { allowBareLinkedIn = false } = {}): string | null {
  let v = text(value);
  if (!v) return null;
  if (allowBareLinkedIn && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /(^|\.)linkedin\.com\//i.test(v)) v = `https://${v.replace(/^\/+/, "")}`;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * "+91 9876543210" from country code + number; a number that already starts with + is kept.
 * Values without any digit (EXPA uses "deleted phone number") count as no phone.
 */
export function formatPhone(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const number = text(phone);
  if (!number || !/\d/.test(number)) return null;
  if (number.startsWith("+")) return number;
  const code = text(countryCode)?.replace(/^\+/, "");
  return code ? `+${code} ${number}` : number;
}

function managers(raw: RawApplication): EpManager[] {
  return (raw.person?.managers ?? [])
    .map((m) => ({
      name: text(m.full_name) ?? "",
      email: text(m.email),
      phone: formatPhone(m.contact_detail?.phone, m.contact_detail?.country_code),
    }))
    .filter((m) => m.name || m.email || m.phone);
}

export function mapApplication(raw: RawApplication): MapResult {
  const id = raw.id == null ? null : text(String(raw.id));
  if (!id) return { ok: false, reason: "no id" };
  if (raw.status !== "open") return { ok: false, reason: "status not open" };
  const person = raw.person;
  const personId = person?.id == null ? null : text(String(person.id));
  if (!person || !personId) return { ok: false, reason: "no applicant id" };
  const lcId = person.home_lc?.id == null ? null : text(String(person.home_lc.id));
  const lcName = text(person.home_lc?.name);
  if (!lcId || !lcName) return { ok: false, reason: "no home LC" };
  const programme = text(raw.opportunity?.programme?.short_name_display);
  if (programme !== "GTa" && programme !== "GTe") return { ok: false, reason: "unknown programme" };
  const appliedAt = text(raw.created_at);
  if (!appliedAt || Number.isNaN(new Date(appliedAt).getTime())) return { ok: false, reason: "no applied date" };

  const opp = raw.opportunity;
  return {
    ok: true,
    row: {
      application_id: id,
      person_id: personId,
      full_name: text(person.full_name) ?? NAME_FALLBACK,
      email: text(person.email),
      phone: formatPhone(person.contact_detail?.phone, person.contact_detail?.country_code),
      linkedin_url: safeUrl(person.linkedin_url, { allowBareLinkedIn: true }),
      cv_url: safeUrl(person.cv_url),
      home_lc_id: lcId,
      home_lc: lcName,
      ep_managers: managers(raw),
      company_name: text(opp?.organisation?.name),
      opportunity_field: text(opp?.sub_product?.name),
      programme: programme as Programme,
      start_date: toIndiaDate(raw.slot?.start_date) ?? toIndiaDate(opp?.earliest_start_date),
      end_date: toIndiaDate(raw.slot?.end_date) ?? toIndiaDate(opp?.latest_end_date),
      applied_at: new Date(appliedAt).toISOString(),
    },
  };
}
