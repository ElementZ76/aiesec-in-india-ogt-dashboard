// Spreadsheet export (docs/sops/pool-page.md step 7).
import { formatMonthRange } from "./format";
import type { Match } from "./search";
import type { PersonApplication, PoolPerson } from "./types";

export const CSV_COLUMNS = [
  "Applicant name", "Company name", "EP manager", "Email", "Phone", "LC", "Start date", "End date",
  "CV link", "Opportunity field", "LinkedIn", "Programme", "Applied on", "Professional experiences",
  "Languages", "Opportunity link",
] as const;

/**
 * One line per job: "Title at Organisation (Type, Mar 2026 – Present)". Descriptions are left out:
 * up to 24 jobs of up to ~2,200 characters could pass Excel's 32,767-character cell limit.
 */
export function experienceText(p: PoolPerson): string {
  return p.professionalExperiences
    .map((e) => {
      const what = [e.title, e.organisation].filter(Boolean).join(" at ");
      return `${what} (${[e.type, formatMonthRange(e.start, e.end)].filter(Boolean).join(", ")})`;
    })
    .join("\n");
}

/**
 * One quoted CSV cell. A value starting with = + - @ tab or CR could run as a formula in
 * Excel or Google Sheets ("CSV injection"), so it gets a leading ' and is shown as text.
 */
export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function csvRow(p: PoolPerson, a: PersonApplication): string[] {
  return [
    p.fullName,
    a.companyName ?? "",
    p.epManagers.map((m) => m.name).filter(Boolean).join("; "),
    p.email ?? "",
    p.phone ?? "",
    p.homeLc,
    a.startDate ?? "",
    a.endDate ?? "",
    p.cvUrl ?? "",
    a.opportunityField ?? "",
    p.linkedinUrl ?? "Not available",
    a.programme,
    a.appliedAt,
    experienceText(p),
    p.languages.map((l) => l.name).join(", "),
    a.opportunityUrl ?? "",
  ];
}

/**
 * The whole file: byte-order mark (so Excel reads UTF-8), header, then one line per matching
 * application (a person with 3 matching applications gives 3 lines, in card order).
 */
export function toCsv(rows: Match[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(",")];
  for (const { person, matches } of rows) {
    for (const a of matches) lines.push(csvRow(person, a).map(csvCell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
