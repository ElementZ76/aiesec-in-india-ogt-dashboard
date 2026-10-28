// One entity's pool, e.g. /chennai (docs/sops/pool-page.md "Login"). Without a valid login cookie
// it shows the password box; with one, only that entity's applications are sent to the browser.
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GateShell } from "@/components/GateShell";
import { LoginForm } from "@/components/LoginForm";
import { PoolApp } from "@/components/PoolApp";
import { currentSession } from "@/lib/auth/current";
import { applicationsFor } from "@/lib/auth/entities";
import { sessionGrants } from "@/lib/auth/session";
import { getEntities, getPool } from "@/lib/db/read";
import { parseView, type View } from "@/lib/pool/view";

export default function EntityPage({ params, searchParams }: PageProps<"/[entity]">) {
  // The address and the cookie are request data, so they are read inside <Suspense>.
  return (
    <Suspense fallback={<main className="gate-loading" aria-busy="true">Loading…</main>}>
      {Promise.all([params, searchParams]).then(([{ entity }, search]) => (
        // ?q=…&lc=…&area=…&page=… → the search, filters and page the pool opens with
        <Gate slug={entity} view={parseView((k) => [search[k]].flat()[0])} />
      ))}
    </Suspense>
  );
}

async function Gate({ slug, view }: { slug: string; view: View }) {
  const entities = await getEntities();
  const entity = entities.find((e) => e.slug === slug);
  if (!entity) notFound();

  const session = await currentSession();
  if (!sessionGrants(session, entity)) {
    const other = entities.find((e) => sessionGrants(session, e));
    return (
      <GateShell>
        <p className="gate-back">
          <Link href="/">← All entities</Link>
        </p>
        <h1 className="gate-title">{entity.name}</h1>
        {other ? (
          <p className="gate-lead">
            You are logged in as {other.name}. <Link href={`/${other.slug}`}>Go to {other.name}</Link> or log in here instead.
          </p>
        ) : (
          <p className="gate-lead">Enter your entity&apos;s password to see its applicants.</p>
        )}
        <LoginForm slug={entity.slug} name={entity.name} />
      </GateShell>
    );
  }

  const { applications, lastUpdated } = await getPool();
  return (
    <PoolApp
      applications={applicationsFor(entity, applications)}
      lastUpdated={lastUpdated}
      entity={{ slug: entity.slug, name: entity.name, allLcs: entity.lcId === null }}
      initialView={view}
    />
  );
}
