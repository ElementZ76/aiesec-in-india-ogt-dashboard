// Row shapes of the Supabase tables (CLAUDE.md "Data Schema", supabase/schema.sql).

export type Programme = "GTa" | "GTe";

export interface EpManager {
  name: string;
  email: string | null;
  phone: string | null;
}

/** One row of `applications` = one card in the pool. Dates are `YYYY-MM-DD` (India). */
export interface ApplicationRow {
  application_id: string;
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  home_lc_id: string;
  home_lc: string;
  ep_managers: EpManager[];
  company_name: string | null;
  opportunity_field: string | null;
  programme: Programme;
  start_date: string | null;
  end_date: string | null;
  /** ISO timestamp (EXPA `created_at`). */
  applied_at: string;
}

export type SyncStatus = "success" | "failed" | "blocked";

/** One row of `sync_runs`. `message` never contains secrets or personal data. */
export interface SyncRunRow {
  started_at: string;
  finished_at: string;
  status: SyncStatus;
  fetched_count: number | null;
  kept_count: number | null;
  upserted_count: number | null;
  deleted_count: number | null;
  message: string | null;
}
