"use client";
// Shown when the pool can't be read (docs/sops/pool-page.md step 9). No error details for visitors.

export default function PoolError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="error-page">
      <div className="empty glass">
        <h3>Couldn&apos;t load the pool</h3>
        <p>The database didn&apos;t answer. Please try again in a minute.</p>
        <button className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </main>
  );
}
