// One sync run, start to finish (docs/sops/sync.md). Everything it talks to is passed in,
// so tests can use fakes instead of EXPA and the database.
import type { SyncRunRow, SyncStatus } from "@/lib/db/types";
import type { SyncStore } from "@/lib/db/sync-store";
import { fetchPoolCandidates, type RawApplication } from "@/lib/expa/applications";
import type { ExpaClient } from "@/lib/expa/client";
import { mapApplication, NAME_FALLBACK, type InvalidReason } from "@/lib/expa/mapper";
import { indiaDate } from "@/lib/pool/dates";
import { applyPoolRules } from "@/lib/pool/rules";
import { checkSafetyBrake } from "./brake";
import { idsToDelete } from "./diff";

export interface RunOptions {
  expa: ExpaClient;
  store: SyncStore;
  now?: () => Date;
  dryRun?: boolean;
  force?: boolean;
  /** Cleans any text before it is printed or stored (removes the token). */
  redactText?: (text: string) => string;
}

export interface RunReport {
  status: SyncStatus | "dry-run";
  message: string;
  totalItems: number | null;
  fetched: number | null;
  duplicates: number;
  invalid: Partial<Record<InvalidReason, number>>;
  droppedClosedLc: number;
  droppedSlotEnded: number;
  kept: number | null;
  upserted: number;
  deleted: number;
  /** Dry run only: how many kept rows have each field filled. Counts, never values. */
  filled?: Record<string, number>;
  /** Dry run only: shapes of raw values (digits → 9), to check formats without showing data. */
  formats?: Record<string, Record<string, number>>;
}

const MAX_MESSAGE = 300;

const shape = (v: string | null | undefined) => (v ? v.replace(/\d/g, "9").replace(/[a-z]/gi, "a").slice(0, 25) : "(empty)");
const tally = (values: string[]) => values.reduce<Record<string, number>>((m, v) => ((m[v] = (m[v] ?? 0) + 1), m), {});

function formatsOf(items: RawApplication[]) {
  return {
    "slot.end_date": tally(items.map((a) => shape(a.slot?.end_date))),
    "created_at": tally(items.map((a) => shape(a.created_at))),
    "contact_detail.country_code": tally(items.map((a) => shape(a.person?.contact_detail?.country_code))),
    "contact_detail.phone": tally(items.map((a) => shape(a.person?.contact_detail?.phone).replace(/9+/g, "9…"))),
  };
}

export async function runSync(options: RunOptions): Promise<RunReport> {
  const { expa, store, now = () => new Date(), dryRun = false, force = false, redactText = (t) => t } = options;
  const started = now();
  const report: RunReport = {
    status: "failed", message: "", totalItems: null, fetched: null, duplicates: 0, invalid: {},
    droppedClosedLc: 0, droppedSlotEnded: 0, kept: null, upserted: 0, deleted: 0,
  };

  const finish = async (status: SyncStatus, message: string): Promise<RunReport> => {
    report.status = status;
    report.message = redactText(message).slice(0, MAX_MESSAGE);
    const run: SyncRunRow = {
      started_at: started.toISOString(),
      finished_at: now().toISOString(),
      status,
      fetched_count: report.fetched,
      kept_count: report.kept,
      upserted_count: report.upserted,
      deleted_count: report.deleted,
      message: report.message,
    };
    await store.logRun(run);
    return report;
  };

  try {
    const { items, totalItems, duplicates } = await fetchPoolCandidates(expa);
    report.totalItems = totalItems;
    report.fetched = items.length;
    report.duplicates = duplicates;

    const rows = [];
    for (const raw of items) {
      const mapped = mapApplication(raw);
      if (mapped.ok) rows.push(mapped.row);
      else report.invalid[mapped.reason] = (report.invalid[mapped.reason] ?? 0) + 1;
    }
    const pool = applyPoolRules(rows, indiaDate(started));
    report.droppedClosedLc = pool.droppedClosedLc;
    report.droppedSlotEnded = pool.droppedSlotEnded;
    report.kept = pool.kept.length;

    const lastSuccessKept = await store.lastSuccessKept();
    const brake = checkSafetyBrake({ totalItems, fetched: items.length, kept: pool.kept.length, lastSuccessKept, force });
    const toDelete = idsToDelete(await store.existingIds(), pool.kept.map((r) => r.application_id));

    if (dryRun) {
      const k = pool.kept;
      const count = (f: (r: (typeof k)[number]) => unknown) => k.filter((r) => Boolean(f(r))).length;
      report.filled = {
        "real name": count((r) => r.full_name !== NAME_FALLBACK), email: count((r) => r.email), phone: count((r) => r.phone),
        linkedin: count((r) => r.linkedin_url), cv: count((r) => r.cv_url), "ep manager": count((r) => r.ep_managers.length),
        experience: count((r) => r.professional_experiences.length), languages: count((r) => r.languages.length),
        company: count((r) => r.company_name), "work area": count((r) => r.opportunity_field),
        "start date": count((r) => r.start_date), "end date": count((r) => r.end_date),
      };
      report.formats = formatsOf(items);
      report.upserted = k.length;
      report.deleted = toDelete.length;
      report.status = "dry-run";
      report.message = redactText(`dry run: would upsert ${k.length}, would delete ${toDelete.length}; brake: ${brake.ok ? "ok" : brake.reason}`);
      return report;
    }

    if (!brake.ok) return await finish("blocked", `Safety brake: ${brake.reason}. Nothing was written.`);

    report.upserted = await store.upsert(pool.kept, started.toISOString());
    report.deleted = await store.remove(toDelete);
    return await finish("success", `kept ${pool.kept.length} of ${items.length}; upserted ${report.upserted}; deleted ${report.deleted}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (dryRun) {
      report.message = redactText(message);
      return report;
    }
    try {
      return await finish("failed", message);
    } catch (logErr) {
      report.message = redactText(`${message} (and the run log could not be written: ${logErr instanceof Error ? logErr.message : String(logErr)})`);
      return report;
    }
  }
}
