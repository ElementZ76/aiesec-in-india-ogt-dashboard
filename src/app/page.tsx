// The start page: pick your entity, then log in on its own page (docs/sops/pool-page.md "Login").
// Shows no applicant data, so it is a cached static page.
import Link from "next/link";
import { GateShell } from "@/components/GateShell";
import { getEntities } from "@/lib/db/read";

export default async function Home() {
  const entities = await getEntities();
  return (
    <GateShell>
      <h1 className="gate-title">oGT <span>CV Pool</span></h1>
      <p className="gate-lead">Choose your entity to log in.</p>
      <ul className="entity-list">
        {entities.map((e) => (
          <li key={e.slug}>
            <Link className={`entity-link glass${e.lcId === null ? " all" : ""}`} href={`/${e.slug}`}>
              {e.name}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </GateShell>
  );
}
