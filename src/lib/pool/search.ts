// Search box, LC filter and work-area filter (docs/sops/pool-page.md steps 3-4a). One card = one
// person; a person matches when at least one of their applications does.
import type { PersonApplication, PoolPerson } from "./types";

/** Lower-case text a search looks in, person part: name, email, LC, EP manager names. */
export function personText(p: PoolPerson): string {
  return [p.fullName, p.email, p.homeLc, ...p.epManagers.map((m) => m.name)]
    .filter(Boolean)
    .join("\n") // separator, so a search can't match across two fields
    .toLowerCase();
}

/** Lower-case text a search looks in, application part: company and work area. */
export function applicationText(a: PersonApplication): string {
  return [a.companyName, a.opportunityField].filter(Boolean).join("\n").toLowerCase();
}

export interface Searchable {
  person: PoolPerson;
  text: string;
  /** `applicationText` of each application, same order as `person.applications`. */
  jobs: string[];
}

/** Builds the search text once per person (not on every key press). */
export function indexPool(people: PoolPerson[]): Searchable[] {
  return people.map((person) => ({ person, text: personText(person), jobs: person.applications.map(applicationText) }));
}

/** Filter key of an application without a work area (no real work area can be named this). */
export const NO_FIELD = "__none__";

export const fieldKey = (a: Pick<PersonApplication, "opportunityField">): string => a.opportunityField ?? NO_FIELD;

export interface Filters {
  query: string;
  /** "" = all LCs */
  lcId: string;
  /** "" = all work areas; NO_FIELD = applications without one */
  field: string;
}

/** A person who matches, and which of their applications match (newest first, at least one). */
export interface Match {
  person: PoolPerson;
  matches: PersonApplication[];
}

/**
 * People matching the LC and with at least one application that matches the work area and the
 * search (contains, any case). The search may hit the person (name, email, …) or the application
 * (company, work area); a hit on the person counts for all their applications. Order is kept.
 */
export function filterPool(index: Searchable[], { query, lcId, field }: Filters): Match[] {
  const q = query.trim().toLowerCase();
  const out: Match[] = [];
  for (const { person, text, jobs } of index) {
    if (lcId && person.homeLcId !== lcId) continue;
    const personHit = !q || text.includes(q);
    const matches = person.applications.filter(
      (a, i) => (!field || fieldKey(a) === field) && (personHit || jobs[i].includes(q)),
    );
    if (matches.length) out.push({ person, matches });
  }
  return out;
}

/** True when the filters leave out some of the person's applications. */
export const isNarrowed = (m: Match): boolean => m.matches.length < m.person.applications.length;

/** One dropdown option (an LC or a work area) with its number of people. */
export interface LcOption {
  id: string;
  name: string;
  count: number;
}

/** One option per LC, sorted by name, with its number of people. */
export function lcOptions(people: PoolPerson[]): LcOption[] {
  const map = new Map<string, LcOption>();
  for (const p of people) {
    const o = map.get(p.homeLcId);
    if (o) o.count++;
    else map.set(p.homeLcId, { id: p.homeLcId, name: p.homeLc, count: 1 });
  }
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "en"));
}

/**
 * Work-area options for `people` (the LC-filtered list): A–Z, each with the number of people who
 * have at least one application in it, "Not specified" last. It says "Not specified (GTe)" only
 * while every application without a work area is GTe. A `selected` work area missing from
 * `people` is kept with count 0.
 */
export function workAreaOptions(people: PoolPerson[], selected = ""): LcOption[] {
  const map = new Map<string, LcOption>();
  let noFieldAllGte = true;
  for (const p of people) {
    const seen = new Set<string>();
    for (const a of p.applications) {
      const id = fieldKey(a);
      if (id === NO_FIELD && a.programme !== "GTe") noFieldAllGte = false;
      if (seen.has(id)) continue; // a person counts once per work area
      seen.add(id);
      const o = map.get(id);
      if (o) o.count++;
      else map.set(id, { id, name: a.opportunityField ?? "", count: 1 });
    }
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
