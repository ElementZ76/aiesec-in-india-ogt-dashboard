// Safety brake (CLAUDE.md invariant 7): decides whether a sync may write at all.

export interface BrakeInput {
  /** What EXPA said the total is. */
  totalItems: number;
  /** Unique records actually received. */
  fetched: number;
  /** Rows left after mapping and pool rules. */
  kept: number;
  /** kept_count of the last successful run, or null if there is none. */
  lastSuccessKept: number | null;
  /** Skip the "less than half" check (a person confirmed a large real drop). */
  force?: boolean;
}

export type BrakeDecision = { ok: true } | { ok: false; reason: string };

export function checkSafetyBrake({ totalItems, fetched, kept, lastSuccessKept, force = false }: BrakeInput): BrakeDecision {
  if (fetched !== totalItems) {
    return { ok: false, reason: `EXPA promised ${totalItems} applications but ${fetched} arrived` };
  }
  if (kept === 0) return { ok: false, reason: "0 applications left after the pool rules" };
  if (!force && lastSuccessKept !== null && kept < lastSuccessKept / 2) {
    return { ok: false, reason: `only ${kept} applications kept, less than half of the last good run (${lastSuccessKept})` };
  }
  return { ok: true };
}
