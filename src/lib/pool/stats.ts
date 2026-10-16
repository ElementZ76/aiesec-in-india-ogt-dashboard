// Statistics v1 (CLAUDE.md "Computed values"; docs/sops/pool-page.md step 5).
import { fieldKey } from "./search";
import type { PoolApplication } from "./types";

export const NOT_SPECIFIED = "Not specified";

export interface Count {
  key: string;
  label: string;
  count: number;
}

/** Counts per key, biggest first; equal counts ordered by label. */
export function countBy(apps: PoolApplication[], pick: (a: PoolApplication) => [key: string, label: string]): Count[] {
  const map = new Map<string, Count>();
  for (const a of apps) {
    const [key, label] = pick(a);
    const c = map.get(key);
    if (c) c.count++;
    else map.set(key, { key, label, count: 1 });
  }
  return [...map.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "en"));
}

const lcOf = (a: PoolApplication): [string, string] => [a.homeLcId, a.homeLc];
// Same keys as the work-area filter, so a Breakdown row can select it.
const fieldOf = (a: PoolApplication): [string, string] => [fieldKey(a), a.opportunityField ?? NOT_SPECIFIED];

export interface PoolStats {
  total: number;
  lcCount: number;
  fieldCount: number;
  gta: number;
  gte: number;
  /** GTa share, 0-100, rounded. 0 when there are no applications. */
  gtaPercent: number;
  /** Every LC of the whole pool (this list is always India-wide). */
  perLc: Count[];
  /** Work areas of the LC-filtered list. */
  perField: Count[];
  /** Only when an LC is selected: its rank among all LCs (1 = most cards) and share of the pool. */
  selected: { rank: number; of: number; sharePercent: number } | null;
}

/** Statistics for `all` filtered to `lcId` ("" = all LCs). They ignore the search box. */
export function computeStats(all: PoolApplication[], lcId: string): PoolStats {
  const list = lcId ? all.filter((a) => a.homeLcId === lcId) : all;
  const gta = list.filter((a) => a.programme === "GTa").length;
  const perLc = countBy(all, lcOf);
  const perField = countBy(list, fieldOf);
  return {
    total: list.length,
    lcCount: new Set(list.map((a) => a.homeLcId)).size,
    fieldCount: perField.length,
    gta,
    gte: list.length - gta,
    gtaPercent: list.length ? Math.round((gta / list.length) * 100) : 0,
    perLc,
    perField,
    selected: lcId
      ? {
          rank: perLc.findIndex((c) => c.key === lcId) + 1, // 0 if the LC has no cards any more
          of: perLc.length,
          sharePercent: all.length ? Math.round((list.length / all.length) * 100) : 0,
        }
      : null,
  };
}
