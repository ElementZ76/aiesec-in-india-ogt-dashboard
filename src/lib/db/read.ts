// The website's only database access: read-only key, cached (docs/sops/pool-page.md steps 1-2).
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { safeUrl } from "@/lib/expa/mapper";
import type { PoolApplication, PoolData } from "@/lib/pool/types";
import type { ApplicationRow } from "./types";

const PAGE = 1000; // Supabase returns at most 1000 rows per request
const COLUMNS =
  "application_id,person_id,full_name,email,phone,linkedin_url,cv_url,home_lc_id,home_lc," +
  "ep_managers,company_name,opportunity_field,programme,start_date,end_date,applied_at";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function toPoolApplication(row: ApplicationRow): PoolApplication {
  return {
    applicationId: row.application_id,
    personId: row.person_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    linkedinUrl: safeUrl(row.linkedin_url), // second http(s) check; the sync already did one
    cvUrl: safeUrl(row.cv_url),
    homeLcId: row.home_lc_id,
    homeLc: row.home_lc,
    epManagers: Array.isArray(row.ep_managers) ? row.ep_managers : [],
    companyName: row.company_name,
    opportunityField: row.opportunity_field,
    programme: row.programme,
    startDate: row.start_date,
    endDate: row.end_date,
    appliedAt: row.applied_at,
  };
}

export async function getPool(): Promise<PoolData> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const db = client();
  const rows: ApplicationRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("applications")
      .select(COLUMNS)
      .order("applied_at", { ascending: false })
      .order("application_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<ApplicationRow[]>();
    if (error) throw new Error(`Reading applications failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  // The website key may read only `status` and `finished_at` of sync_runs (supabase/schema.sql).
  const { data: run, error } = await db
    .from("sync_runs")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reading sync_runs failed: ${error.message}`);

  return { applications: rows.map(toPoolApplication), lastUpdated: run?.finished_at ?? null };
}
