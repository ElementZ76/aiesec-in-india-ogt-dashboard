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

/** Filter key of an application without a work area (no real work area can be named this). */
export const NO_FIELD = "__none__";

export const fieldKey = (a: PoolApplication): string => a.opportunityField ?? NO_FIELD;

export interface Filters {
  query: string;
  /** "" = all LCs */
  lcId: string;
  /** "" = all work areas; NO_FIELD = applications without one */
  field: string;
}

/** Cards matching the search (contains, any case), the LC and the work area. Order is kept. */
export function filterPool(index: Searchable[], { query, lcId, field }: Filters): PoolApplication[] {
  const q = query.trim().toLowerCase();
  const out: PoolApplication[] = [];
  for (const { app, text } of index) {
    if (lcId && app.homeLcId !== lcId) continue;
    if (field && fieldKey(app) !== field) continue;
    if (q && !text.includes(q)) continue;
    out.push(app);
  }
  return out;
}

/** One dropdown option (an LC or a work area) with its number of cards. */
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

/**
 * Work-area options for `apps` (the LC-filtered list): A–Z with counts, "Not specified" last.
 * It says "Not specified (GTe)" only while every application without a work area is GTe.
 * A `selected` work area missing from `apps` is kept with count 0.
 */
export function workAreaOptions(apps: PoolApplication[], selected = ""): LcOption[] {
  const map = new Map<string, LcOption>();
  let noFieldAllGte = true;
  for (const a of apps) {
    const id = fieldKey(a);
    if (id === NO_FIELD && a.programme !== "GTe") noFieldAllGte = false;
    const o = map.get(id);
    if (o) o.count++;
    else map.set(id, { id, name: a.opportunityField ?? "", count: 1 });
  }
  if (selected && !map.has(selected)) {
    map.set(selected, { id: selected, name: selected === NO_FIELD ? "" : selected, count: 0 });
  }
  const none = map.get(NO_FIELD);
  if (none) {
    none.name = none.count && noFieldAllGte ? "Not specified (GTe)" : "Not specified";
    map.delete(NO_FIELD);
  }
  const sorted = [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "en"));
  return none ? [...sorted, none] : sorted;
}
