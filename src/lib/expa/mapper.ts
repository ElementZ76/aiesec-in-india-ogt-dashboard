// Turns one EXPA record into one `applications` row (docs/sops/sync.md step 2).
import type { ApplicationRow, EpManager, Language, ProfessionalExperience, Programme } from "@/lib/db/types";
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

// Invisible left-to-right / right-to-left marks that some EXPA phone values contain.
const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * "+91 9876543210" from country code + number; a number that already starts with + is kept.
 * Values without any digit (EXPA uses "deleted phone number") count as no phone.
 * EXPA's country code can be "+91", "91" or "India (+91)": the last group of digits is used.
 * The national trunk 0 is dropped after the code ("+91 09876…" → "+91 9876…"), except for Italy.
 */
export function formatPhone(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const number = text(phone?.replace(INVISIBLE, ""));
  if (!number || !/\d/.test(number)) return null;
  if (number.startsWith("+")) return number;
  const code = /(\d{1,4})\D*$/.exec(countryCode?.replace(INVISIBLE, "") ?? "")?.[1].replace(/^0+/, "");
  if (!code) return number;
  const national = code === "39" ? number : number.replace(/^(?:0[\s-]*)+(?=\d)/, "");
  return `+${code} ${national}`;
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

/** Multi-line text: line breaks kept (at most one blank line in a row), spaces at the ends removed. */
function longText(v: string | null | undefined): string | null {
  const t = v?.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  return t ? t : null;
}

/** Jobs with a title or organisation, newest start first (no start date: last). */
function experiences(raw: RawApplication): ProfessionalExperience[] {
  return (raw.person?.professional_experiences ?? [])
    .map((e) => ({
      title: text(e.title),
      organisation: text(e.organisation_name),
      type: text(e.experience_level?.name),
      start: toIndiaDate(e.start_date),
      end: toIndiaDate(e.end_date),
      description: longText(e.description),
    }))
    .filter((e) => e.title || e.organisation)
    .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
}

/** Language names in EXPA's order, each once. */
function languages(raw: RawApplication): Language[] {
  const seen = new Set<string>();
  return (raw.person?.person_profile?.languages ?? []).flatMap((l) => {
    const name = text(l.constant_name);
    if (!name || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    return [{ name, level: typeof l.level === "number" ? l.level : null }];
  });
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
      professional_experiences: experiences(raw),
      languages: languages(raw),
      company_name: text(opp?.organisation?.name),
      opportunity_field: text(opp?.sub_product?.name),
      programme: programme as Programme,
      start_date: toIndiaDate(raw.slot?.start_date) ?? toIndiaDate(opp?.earliest_start_date),
      end_date: toIndiaDate(raw.slot?.end_date) ?? toIndiaDate(opp?.latest_end_date),
      applied_at: new Date(appliedAt).toISOString(),
    },
  };
}
