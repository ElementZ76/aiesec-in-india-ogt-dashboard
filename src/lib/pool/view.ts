// What the visitor is looking at: search, filters and page number, and how that maps to the
// address, e.g. /india?q=priya&lc=10&area=Marketing&page=3 (docs/sops/pool-page.md step 6a).

export const PAGE_SIZE = 12; // divides evenly into 3 / 2 / 1 card columns

export interface View {
  query: string;
  lcId: string;
  field: string; // work area; "" = all
  page: number; // 1-based
}

export const EMPTY_VIEW: View = { query: "", lcId: "", field: "", page: 1 };

/** Reads a view from the address. Anything missing or invalid falls back to "all" / page 1. */
export function parseView(get: (key: string) => string | null | undefined): View {
  const page = Number(get("page"));
  return {
    query: get("q") ?? "",
    lcId: get("lc") ?? "",
    field: get("area") ?? "",
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
  };
}

/** The address query for a view ("" when nothing is set), so the default view keeps a clean address. */
export function viewSearch(view: View): string {
  const p = new URLSearchParams();
  if (view.query.trim()) p.set("q", view.query);
  if (view.lcId) p.set("lc", view.lcId);
  if (view.field) p.set("area", view.field);
  if (view.page > 1) p.set("page", String(view.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Number of pages for `total` items; at least 1, so an empty list is "page 1 of 1". */
export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * Which page buttons to show: first, last, the current page and its neighbours, with "gap" for
 * skipped pages. Always 7 items once there are more than 7 pages, so the row does not change width.
 * pageItems(5, 79) → [1, "gap", 4, 5, 6, "gap", 79]
 */
export function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "gap", total];
  if (current >= total - 3) return [1, "gap", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "gap", current - 1, current, current + 1, "gap", total];
}
