// One card per person (CLAUDE.md "Data Schema"): the server groups the application rows by person
// before sending the page, so each person's details travel once instead of once per application.
import type { Programme } from "@/lib/db/types";
import type { PersonApplication, PoolApplication, PoolPerson } from "./types";

const time = (iso: string) => Date.parse(iso) || 0;

/** Newest application first; equal times ordered by id, so the order never flickers. */
export function newestFirst(a: PersonApplication, b: PersonApplication): number {
  return time(b.appliedAt) - time(a.appliedAt) || a.applicationId.localeCompare(b.applicationId);
}

/**
 * Groups applications by `personId`. People are ordered by their newest application, newest
 * first. The person's details come from their newest application (all rows of one person are
 * written by the same sync, so they agree).
 */
export function groupByPerson(apps: PoolApplication[]): PoolPerson[] {
  const byId = new Map<string, PoolPerson>();
  for (const a of [...apps].sort(newestFirst)) {
    const { applicationId, opportunityUrl, companyName, opportunityField, programme, startDate, endDate, appliedAt, ...person } = a;
    const job = { applicationId, opportunityUrl, companyName, opportunityField, programme, startDate, endDate, appliedAt };
    const p = byId.get(a.personId);
    if (p) p.applications.push(job);
    else byId.set(a.personId, { ...person, applications: [job] });
  }
  return [...byId.values()]; // already newest first: each person was added at their newest application
}

/** The programmes a person applied to, GTa before GTe. */
export function programmesOf(apps: PersonApplication[]): Programme[] {
  return (["GTa", "GTe"] as const).filter((p) => apps.some((a) => a.programme === p));
}
