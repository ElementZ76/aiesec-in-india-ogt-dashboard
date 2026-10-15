// Database connection + access-rule check (CLAUDE.md invariant 3).
// Proves: the secret key can write; the publishable key can only read; nothing is left behind.
// Prints no keys and no personal data. Touches only one test row in sync_runs, then deletes it.
// Run: node --env-file=.env.local scripts/db-check.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

const problems = [];
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  problems.push("SUPABASE_URL must look like https://<project-id>.supabase.co (nothing after .co, e.g. no /rest/v1/).");
}
if (!publishable.startsWith("sb_publishable_")) problems.push("SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_.");
if (!secret.startsWith("sb_secret_")) problems.push("SUPABASE_SECRET_KEY must start with sb_secret_.");
if (problems.length) {
  console.error("Fix .env.local first:\n- " + problems.join("\n- "));
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);       // what the sync job uses
const website = createClient(url, publishable, options); // what the website uses

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

// 1. Website key can read the pool.
const read = await website.from("applications").select("application_id", { count: "exact", head: true });
check("website key can read applications", !read.error, read.error?.message ?? `${read.count} rows`);

// 2. Website key cannot write to the pool.
const sneaky = await website.from("applications").insert({
  application_id: "db-check", person_id: "x", full_name: "x", home_lc_id: "x", home_lc: "x",
  programme: "GTa", applied_at: new Date().toISOString(),
});
check("website key is refused when writing applications", Boolean(sneaky.error), sneaky.error?.code ?? "write was ALLOWED");
if (!sneaky.error) await admin.from("applications").delete().eq("application_id", "db-check");

// 3. Secret key can write a sync log row.
const now = new Date().toISOString();
const ins = await admin.from("sync_runs")
  .insert({ started_at: now, finished_at: now, status: "failed", message: "db-check test row" })
  .select("id").single();
check("secret key can write sync_runs", !ins.error, ins.error?.message ?? "");
const id = ins.data?.id;

if (id) {
  // 4. Website key sees the "Last updated" columns, using only those columns, as the site will.
  //    (Filtering or sorting by any other column, e.g. id, counts as reading it and is refused.)
  const last = await website.from("sync_runs").select("status, finished_at")
    .eq("status", "failed").order("finished_at", { ascending: false }).limit(1);
  check("website key can read sync_runs status + finished_at", !last.error && last.data?.length === 1, last.error?.message ?? "");

  // 5. ...but not the internal message column.
  const msg = await website.from("sync_runs").select("message").eq("id", id);
  check("website key is refused the sync_runs message column", Boolean(msg.error), msg.error?.code ?? "message was READABLE");

  // 6. Website key cannot delete.
  await website.from("sync_runs").delete().eq("id", id);
  const still = await admin.from("sync_runs").select("id").eq("id", id);
  check("website key cannot delete sync_runs", still.data?.length === 1);

  // 7. Clean up.
  const del = await admin.from("sync_runs").delete().eq("id", id);
  check("test row removed", !del.error, del.error?.message ?? "");
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
