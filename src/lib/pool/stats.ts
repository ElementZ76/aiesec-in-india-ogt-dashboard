// Statistics v1 (CLAUDE.md "Computed values"; docs/sops/pool-page.md step 5). The big number counts
// people (one per card); everything else counts applications (user, 2026-10-28).
import { fieldKey } from "./search";
import type { PoolPerson } from "./types";

export const NOT_SPECIFIED = "Not specified";

export interface Count {
  key: string;
  label: string;
  count: number;
}

/** Counts per key, biggest first; equal counts ordered by label. */
export function countBy<T>(items: T[], pick: (item: T) => [key: string, label: string]): Count[] {
  const map = new Map<string, Count>();
  for (const item of items) {
    const [key, label] = pick(item);
    const c = map.get(key);
    if (c) c.count++;
    else map.set(key, { key, label, count: 1 });
  }
  return [...map.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "en"));
}

/** Every application with its person's LC. */
const applicationsOf = (people: PoolPerson[]) =>
  people.flatMap((p) => p.applications.map((a) => ({ ...a, homeLcId: p.homeLcId, homeLc: p.homeLc })));

export interface PoolStats {
  /** People (cards). */
  people: number;
  /** Applications. */
  total: number;
  lcCount: number;
  fieldCount: number;
  gta: number;
  gte: number;
  /** GTa share of applications, 0-100, rounded. 0 when there are none. */
  gtaPercent: number;
  /** Applications per LC, whole pool (this list is always India-wide). */
  perLc: Count[];
  /** Applications per work area, LC-filtered list. Same keys as the work-area filter, so a row can select it. */
  perField: Count[];
}

/** Statistics for `all` filtered to `lcId` ("" = all LCs). They ignore the search box. */
export function computeStats(all: PoolPerson[], lcId: string): PoolStats {
  const people = lcId ? all.filter((p) => p.homeLcId === lcId) : all;
  const list = applicationsOf(people);
  const gta = list.filter((a) => a.programme === "GTa").length;
  const perField = countBy(list, (a) => [fieldKey(a), a.opportunityField ?? NOT_SPECIFIED]);
  return {
    people: people.length,
    total: list.length,
    lcCount: new Set(people.map((p) => p.homeLcId)).size,
    fieldCount: perField.length,
    gta,
    gte: list.length - gta,
    gtaPercent: list.length ? Math.round((gta / list.length) * 100) : 0,
    perLc: countBy(applicationsOf(all), (a) => [a.homeLcId, a.homeLc]),
    perField,
  };
}
