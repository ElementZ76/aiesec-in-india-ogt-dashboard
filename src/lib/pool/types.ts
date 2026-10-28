// What the server hands to the page (CLAUDE.md "Data Schema", `PoolApplication`).
import type { EpManager, Language, ProfessionalExperience, Programme } from "@/lib/db/types";

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
  /** Newest start first. */
  professionalExperiences: ProfessionalExperience[];
  languages: Language[];
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

/** One of a person's applications: only the fields that differ between their applications. */
export type PersonApplication = Pick<
  PoolApplication,
  "applicationId" | "companyName" | "opportunityField" | "programme" | "startDate" | "endDate" | "appliedAt"
>;

/**
 * One person = one card (user, 2026-10-28). What the server hands to the page: the person's
 * details once, plus all their applications, newest first (at least one).
 */
export interface PoolPerson
  extends Omit<PoolApplication, keyof PersonApplication> {
  applications: PersonApplication[];
}

export interface PoolData {
  applications: PoolApplication[];
  /** `finished_at` of the newest successful sync, or null if there has never been one. */
  lastUpdated: string | null;
}
