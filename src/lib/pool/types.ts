// What the server hands to the page (CLAUDE.md "Data Schema", `PoolApplication`).
import type { EpManager, Programme } from "@/lib/db/types";

export interface PoolApplication {
  applicationId: string;
  personId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  cvUrl: string | null;
  homeLcId: string;
  homeLc: string;
  epManagers: EpManager[];
  companyName: string | null;
  opportunityField: string | null;
  programme: Programme;
  /** `YYYY-MM-DD` */
  startDate: string | null;
  /** `YYYY-MM-DD` */
  endDate: string | null;
  /** ISO timestamp */
  appliedAt: string;
}

export interface PoolData {
  applications: PoolApplication[];
  /** `finished_at` of the newest successful sync, or null if there has never been one. */
  lastUpdated: string | null;
}
