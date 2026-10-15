// Pool rules (CLAUDE.md invariant 6). Pure functions: same input, same output.
import type { ApplicationRow } from "@/lib/db/types";

/** Closed LCs are named like "Closed [Jodhpur]". */
export function isClosedLc(lcName: string): boolean {
  return /^\s*closed\s*\[/i.test(lcName);
}

/** True if the slot ended before `today` (both `YYYY-MM-DD`). Ending today is still active. */
export function hasSlotEnded(endDate: string | null, today: string): boolean {
  return endDate !== null && endDate < today;
}

export interface PoolResult {
  kept: ApplicationRow[];
  droppedClosedLc: number;
  droppedSlotEnded: number;
}

export function applyPoolRules(rows: ApplicationRow[], today: string): PoolResult {
  const result: PoolResult = { kept: [], droppedClosedLc: 0, droppedSlotEnded: 0 };
  for (const row of rows) {
    if (isClosedLc(row.home_lc)) result.droppedClosedLc++;
    else if (hasSlotEnded(row.end_date, today)) result.droppedSlotEnded++;
    else result.kept.push(row);
  }
  return result;
}
