// Entities = the logins: one per LC, plus "india" for the whole pool (supabase/entities.sql).
import type { PoolApplication } from "@/lib/pool/types";

export interface Entity {
  slug: string;
  name: string;
  /** EXPA home LC id; null = sees every LC. */
  lcId: string | null;
  sessionVersion: number;
}

/** All-India logins first, then A–Z by name. */
export function sortEntities(entities: Entity[]): Entity[] {
  return [...entities].sort((a, b) => Number(a.lcId !== null) - Number(b.lcId !== null) || a.name.localeCompare(b.name));
}

/** The applications this entity may see: its own LC, or everything for an all-India login. */
export function applicationsFor(entity: Entity, applications: PoolApplication[]): PoolApplication[] {
  return entity.lcId === null ? applications : applications.filter((a) => a.homeLcId === entity.lcId);
}
