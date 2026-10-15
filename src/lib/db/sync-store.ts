// Database access for the sync job ONLY. Uses the secret key, which can write and bypasses RLS
// (CLAUDE.md invariant 3). The website must never import this file; Vercel never has the key.
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type { ApplicationRow, SyncRunRow } from "./types";

export const UPSERT_CHUNK = 500;
export const DELETE_CHUNK = 200;
export const READ_PAGE = 1000;

export interface SyncStore {
  /** kept_count of the newest `success` run, or null if there has been none. */
  lastSuccessKept(): Promise<number | null>;
  existingIds(): Promise<string[]>;
  upsert(rows: ApplicationRow[], syncedAt: string): Promise<number>;
  remove(ids: string[]): Promise<number>;
  logRun(run: SyncRunRow): Promise<void>;
}

// Only the message and code: Postgres "details" can contain row values (personal data).
const fail = (what: string, error: PostgrestError): never => {
  throw new Error(`Database ${what} failed: ${error.message}${error.code ? ` (${error.code})` : ""}`);
};

export function createSupabaseSyncStore(url: string, secretKey: string): SyncStore {
  if (!url || !secretKey) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for the sync.");
  const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async lastSuccessKept() {
      const { data, error } = await db
        .from("sync_runs")
        .select("kept_count")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1);
      if (error) fail("read of the last run", error);
      return data?.[0]?.kept_count ?? null;
    },

    async existingIds() {
      const ids: string[] = [];
      for (let from = 0; ; from += READ_PAGE) {
        const { data, error } = await db
          .from("applications")
          .select("application_id")
          .order("application_id")
          .range(from, from + READ_PAGE - 1);
        if (error) fail("read of existing ids", error);
        ids.push(...(data ?? []).map((r) => r.application_id as string));
        if (!data || data.length < READ_PAGE) return ids;
      }
    },

    async upsert(rows, syncedAt) {
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK).map((r) => ({ ...r, synced_at: syncedAt }));
        const { error } = await db.from("applications").upsert(chunk, { onConflict: "application_id" });
        if (error) fail("upsert", error);
      }
      return rows.length;
    },

    async remove(ids) {
      for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
        const { error } = await db.from("applications").delete().in("application_id", ids.slice(i, i + DELETE_CHUNK));
        if (error) fail("delete", error);
      }
      return ids.length;
    },

    async logRun(run) {
      const { error } = await db.from("sync_runs").insert(run);
      if (error) fail("write of the run log", error);
    },
  };
}
