// Row shapes of the Supabase tables (CLAUDE.md "Data Schema", supabase/schema.sql).

export type Programme = "GTa" | "GTe";

export interface EpManager {
  name: string;
  email: string | null;
  phone: string | null;
}

/** One job from the applicant's EXPA profile. Dates are `YYYY-MM-DD` (India); no `end` = still there. */
export interface ProfessionalExperience {
  title: string | null;
  organisation: string | null;
  /** EXPA's experience level: Internship, Full Time, Volunteer, Freelance, Part-time. */
  type: string | null;
  start: string | null;
  end: string | null;
  description: string | null;
}

/** `level` is EXPA's number (0-4). EXPA shows no label for it, so the site does not show it yet. */
export interface Language {
  name: string;
  level: number | null;
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
  /** Newest start first. */
  professional_experiences: ProfessionalExperience[];
  languages: Language[];
  /** EXPA opportunity id; the popup links to its public page on aiesec.org. */
  opportunity_id: string | null;
  company_name: string | null;
  opportunity_field: string | null;
  programme: Programme;
  start_date: string | null;
  end_date: string | null;
  /** ISO timestamp (EXPA `created_at`). */
  applied_at: string;
}

/** One row of `entities` as the website may read it (never the password hash). */
export interface EntityRow {
  slug: string;
  name: string;
  /** EXPA home LC id; null = all of India. */
  lc_id: string | null;
  session_version: number;
}

export type SyncStatus ="success" | "failed" | "blocked";

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
