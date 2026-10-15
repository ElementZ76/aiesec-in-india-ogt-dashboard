// Sync job entry point (docs/sops/sync.md). Run by GitHub Actions every 15 minutes.
//   npm run sync                 real run
//   npm run sync -- --dry-run    fetch + check only, writes nothing, prints counts
//   npm run sync -- --force      skip the "less than half of last run" brake (after a human check)
// Locally the secrets come from .env.local; on GitHub from repository secrets.
// Prints counts only: GitHub Actions logs of a public repo are public.
import { existsSync } from "node:fs";
import { createSupabaseSyncStore } from "@/lib/db/sync-store";
import { createExpaClient, redact } from "@/lib/expa/client";
import { runSync } from "@/lib/sync/run";

// Wrapped in a function: this package is CommonJS, which has no top-level await.
async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const force = args.has("--force");
  const token = process.env.EXPA_ACCESS_TOKEN ?? "";

  const report = await runSync({
    expa: createExpaClient({ token }),
    store: createSupabaseSyncStore(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? ""),
    dryRun,
    force,
    redactText: (t) => redact(t, token),
  });

  const { filled, formats, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
  if (filled) console.log("Fields filled (of kept):", JSON.stringify(filled));
  if (formats) console.log("Raw value formats (digits shown as 9):", JSON.stringify(formats, null, 2));

  process.exitCode = report.status === "success" || (report.status === "dry-run" && report.fetched !== null) ? 0 : 1;
}

main().catch((err) => {
  // Setup errors (e.g. a missing secret). Message only; it never contains the token.
  console.error("Sync could not start:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
