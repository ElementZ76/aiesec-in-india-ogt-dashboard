import { describe, expect, it, vi } from "vitest";
import type { ApplicationRow, SyncRunRow } from "@/lib/db/types";
import type { SyncStore } from "@/lib/db/sync-store";
import type { RawApplication } from "@/lib/expa/applications";
import type { ExpaClient } from "@/lib/expa/client";
import { runSync } from "./run";

const NOW = new Date("2026-10-15T06:00:00Z"); // 11:30 IST, so "today" = 2026-10-15

const app = (id: number, lc = "Mumbai", end = "2027-01-01"): RawApplication => ({
  id, status: "open", created_at: "2026-10-01T00:00:00Z",
  slot: { start_date: "2026-11-01", end_date: end },
  person: { id: id * 10, full_name: `P${id}`, email: null, linkedin_url: null, cv_url: null,
    home_lc: { id: 1, name: lc }, contact_detail: null, managers: [], professional_experiences: null, person_profile: null },
  opportunity: { id: id + 5000, programme: { short_name_display: "GTa" }, organisation: null, sub_product: null,
    earliest_start_date: null, latest_end_date: null },
});

/** Fake EXPA: serves the given records, 100 per page, with an optional false total. */
function fakeExpa(items: RawApplication[], totalItems = items.length): ExpaClient {
  return {
    async query<T>(_q: string, vars?: Record<string, unknown>) {
      const page = Number(vars?.page ?? 1);
      return { allOpportunityApplication: {
        paging: { total_items: totalItems, total_pages: Math.max(1, Math.ceil(items.length / 100)) },
        data: items.slice((page - 1) * 100, page * 100),
      } } as T;
    },
  };
}

function fakeStore(existing: string[] = [], lastKept: number | null = null) {
  const runs: SyncRunRow[] = [];
  const upserted: ApplicationRow[] = [];
  const removed: string[] = [];
  const store: SyncStore = {
    lastSuccessKept: async () => lastKept,
    existingIds: async () => existing,
    upsert: vi.fn(async (rows: ApplicationRow[]) => (upserted.push(...rows), rows.length)),
    remove: vi.fn(async (ids: string[]) => (removed.push(...ids), ids.length)),
    logRun: async (run) => void runs.push(run),
  };
  return { store, runs, upserted, removed };
}

describe("runSync", () => {
  it("writes the pool, deletes what left, and logs success", async () => {
    const items = [app(1), app(2), app(3, "Closed [Jodhpur]"), app(4, "Pune", "2026-10-14"), app(5, "Pune", "2026-10-15")];
    const { store, runs, upserted, removed } = fakeStore(["1", "99"]);
    const report = await runSync({ expa: fakeExpa(items), store, now: () => NOW });

    expect(report.status).toBe("success");
    expect(upserted.map((r) => r.application_id)).toEqual(["1", "2", "5"]);
    expect(removed).toEqual(["99"]);
    expect(report).toMatchObject({ fetched: 5, kept: 3, droppedClosedLc: 1, droppedSlotEnded: 1, upserted: 3, deleted: 1 });
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ status: "success", fetched_count: 5, kept_count: 3, upserted_count: 3, deleted_count: 1 });
  });

  it("fetches every page", async () => {
    const items = Array.from({ length: 250 }, (_, i) => app(i + 1));
    const { store } = fakeStore();
    const report = await runSync({ expa: fakeExpa(items), store, now: () => NOW });
    expect(report).toMatchObject({ status: "success", fetched: 250, kept: 250 });
  });

  it("blocks and writes nothing when EXPA sends fewer than promised", async () => {
    const { store, runs } = fakeStore(["1"], 2);
    const report = await runSync({ expa: fakeExpa([app(1), app(2)], 5), store, now: () => NOW });
    expect(report.status).toBe("blocked");
    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
    expect(runs[0]).toMatchObject({ status: "blocked", message: expect.stringMatching(/Nothing was written/) });
  });

  it("blocks a sudden drop, unless forced", async () => {
    const blocked = fakeStore([], 10);
    expect((await runSync({ expa: fakeExpa([app(1)]), store: blocked.store, now: () => NOW })).status).toBe("blocked");
    const forced = fakeStore([], 10);
    expect((await runSync({ expa: fakeExpa([app(1)]), store: forced.store, now: () => NOW, force: true })).status).toBe("success");
  });

  it("dry run reads but never writes or logs", async () => {
    const { store, runs } = fakeStore(["1", "77"]);
    const report = await runSync({ expa: fakeExpa([app(1), app(2)]), store, now: () => NOW, dryRun: true });
    expect(report.status).toBe("dry-run");
    expect(report).toMatchObject({ upserted: 2, deleted: 1 });
    expect(report.filled).toMatchObject({ "real name": 2, email: 0 });
    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
    expect(runs).toHaveLength(0);
  });

  it("logs a failed run with the token removed when EXPA fails", async () => {
    const expa: ExpaClient = { query: async () => { throw new Error("EXPA error for access_token=abc123"); } };
    const { store, runs } = fakeStore();
    const report = await runSync({ expa, store, now: () => NOW, redactText: (t) => t.replace("abc123", "[redacted]") });
    expect(report.status).toBe("failed");
    expect(runs[0].status).toBe("failed");
    expect(runs[0].message).toContain("[redacted]");
    expect(runs[0].message).not.toContain("abc123");
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("counts invalid records instead of crashing", async () => {
    const bad = { ...app(2), opportunity: { ...app(2).opportunity!, programme: { short_name_display: "GV" } } };
    const { store } = fakeStore();
    const report = await runSync({ expa: fakeExpa([app(1), bad]), store, now: () => NOW });
    expect(report.invalid).toEqual({ "unknown programme": 1 });
    expect(report.kept).toBe(1);
  });
});
