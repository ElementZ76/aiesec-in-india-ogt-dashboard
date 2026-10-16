// Spreadsheet export (docs/sops/pool-page.md step 7).
import type { PoolApplication } from "./types";

export const CSV_COLUMNS = [
  "Applicant name", "Company name", "EP manager", "Email", "Phone", "LC", "Start date", "End date",
  "CV link", "Opportunity field", "LinkedIn", "Programme", "Applied on",
] as const;

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
  ];
}

/** The whole file: byte-order mark (so Excel reads UTF-8), header, one line per application. */
export function toCsv(apps: PoolApplication[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(","), ...apps.map((a) => csvRow(a).map(csvCell).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
