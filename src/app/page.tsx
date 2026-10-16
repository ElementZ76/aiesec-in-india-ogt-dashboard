// The CV pool page (docs/sops/pool-page.md). Server part: reads the cached pool from Supabase.
import { PoolApp } from "@/components/PoolApp";
import { getPool } from "@/lib/db/read";

export default async function Home() {
  const { applications, lastUpdated } = await getPool();
  return <PoolApp applications={applications} lastUpdated={lastUpdated} />;
}
