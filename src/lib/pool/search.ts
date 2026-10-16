// Search box and LC filter (docs/sops/pool-page.md steps 3-4).
import type { PoolApplication } from "./types";

/** Lower-case text a search looks in: name, email, company, work area, LC, EP manager names. */
export function searchText(a: PoolApplication): string {
  return [a.fullName, a.email, a.companyName, a.opportunityField, a.homeLc, ...a.epManagers.map((m) => m.name)]
    .filter(Boolean)
    .join("\n") // separator, so a search can't match across two fields
    .toLowerCase();
}

export interface Searchable {
  app: PoolApplication;
  text: string;
}

/** Builds the search text once per card (not on every key press). */
export function indexPool(apps: PoolApplication[]): Searchable[] {
  return apps.map((app) => ({ app, text: searchText(app) }));
}

/** Cards matching the search (contains, any case) and the LC ("" = all LCs). Order is kept. */
export function filterPool(index: Searchable[], query: string, lcId: string): PoolApplication[] {
  const q = query.trim().toLowerCase();
  const out: PoolApplication[] = [];
  for (const { app, text } of index) {
    if (lcId && app.homeLcId !== lcId) continue;
    if (q && !text.includes(q)) continue;
    out.push(app);
  }
  return out;
}

export interface LcOption {
  id: string;
  name: string;
  count: number;
}

/** One option per LC, sorted by name, with its number of cards. */
export function lcOptions(apps: PoolApplication[]): LcOption[] {
  const map = new Map<string, LcOption>();
  for (const a of apps) {
    const o = map.get(a.homeLcId);
    if (o) o.count++;
    else map.set(a.homeLcId, { id: a.homeLcId, name: a.homeLc, count: 1 });
  }
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "en"));
}
