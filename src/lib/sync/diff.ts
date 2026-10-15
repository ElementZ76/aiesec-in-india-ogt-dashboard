// Which database rows must go (docs/sops/sync.md step 5).

/** Ids that are in the database but no longer in the pool. */
export function idsToDelete(existingIds: Iterable<string>, keptIds: Iterable<string>): string[] {
  const keep = new Set(keptIds);
  return [...existingIds].filter((id) => !keep.has(id));
}
