// Spreadsheet export (docs/sops/pool-page.md step 7).
import { formatMonthRange } from "./format";
import type { PoolApplication } from "./types";

export const CSV_COLUMNS = [
  "Applicant name", "Company name", "EP manager", "Email", "Phone", "LC", "Start date", "End date",
  "CV link", "Opportunity field", "LinkedIn", "Programme", "Applied on", "Professional experiences",
  "Languages",
] as const;

/**
 * One line per job: "Title at Organisation (Type, Mar 2026 – Present)". Descriptions are left out:
 * up to 24 jobs of up to ~2,200 characters could pass Excel's 32,767-character cell limit.
 */
export function experienceText(a: PoolApplication): string {
  return a.professionalExperiences
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

export function csvRow(a: PoolApplication): string[] {
  return [
    a.fullName,
    a.companyName ?? "",
    a.epManagers.map((m) => m.name).filter(Boolean).join("; "),
    a.email ?? "",
    a.phone ?? "",
    a.homeLc,
    a.startDate ?? "",
    a.endDate ?? "",
    a.cvUrl ?? "",
    a.opportunityField ?? "",
    a.linkedinUrl ?? "Not available",
    a.programme,
    a.appliedAt,
    experienceText(a),
    a.languages.map((l) => l.name).join(", "),
  ];
}

/** The whole file: byte-order mark (so Excel reads UTF-8), header, one line per application. */
export function toCsv(apps: PoolApplication[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(","), ...apps.map((a) => csvRow(a).map(csvCell).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
