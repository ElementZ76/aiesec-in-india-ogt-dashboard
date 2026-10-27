import { describe, expect, it } from "vitest";
import type { PoolApplication } from "@/lib/pool/types";
import { applicationsFor, sortEntities, type Entity } from "./entities";
import { checkSecret, createSessionValue, isSlug, readSessionValue, SESSION_MAX_AGE, sessionGrants } from "./session";

const SECRET = "x".repeat(32);
const NOW = Date.UTC(2026, 9, 27, 10, 0, 0);

describe("session cookie", () => {
  it("round-trips a login and expires after 30 days", () => {
    const value = createSessionValue("chennai", 3, SECRET, NOW);
    expect(readSessionValue(value, SECRET, NOW)).toEqual({ slug: "chennai", version: 3, expires: NOW / 1000 + SESSION_MAX_AGE });
    expect(readSessionValue(value, SECRET, NOW + (SESSION_MAX_AGE - 1) * 1000)).not.toBeNull();
    expect(readSessionValue(value, SECRET, NOW + SESSION_MAX_AGE * 1000)).toBeNull();
  });

  it("rejects edited, forged and malformed values", () => {
    const value = createSessionValue("chennai", 3, SECRET, NOW);
    expect(readSessionValue(value.replace("chennai", "india"), SECRET, NOW)).toBeNull(); // another entity
    expect(readSessionValue(value.replace(".3.", ".4."), SECRET, NOW)).toBeNull(); // another version
    expect(readSessionValue(createSessionValue("india", 1, "y".repeat(32), NOW), SECRET, NOW)).toBeNull(); // other secret
    expect(readSessionValue(value.slice(0, -2), SECRET, NOW)).toBeNull();
    for (const junk of [undefined, "", "chennai", "chennai.1.2", "Chennai.1.99999999999.abc", "a..1.2.sig"]) {
      expect(readSessionValue(junk, SECRET, NOW)).toBeNull();
    }
  });

  it("refuses a missing or short secret", () => {
    expect(() => checkSecret(undefined)).toThrow(/SESSION_SECRET/);
    expect(() => createSessionValue("chennai", 1, "short", NOW)).toThrow(/SESSION_SECRET/);
  });

  it("grants only the same entity at the current password version", () => {
    const s = { slug: "chennai", version: 2, expires: 0 };
    expect(sessionGrants(s, { slug: "chennai", sessionVersion: 2 })).toBe(true);
    expect(sessionGrants(s, { slug: "chennai", sessionVersion: 3 })).toBe(false); // password changed since
    expect(sessionGrants(s, { slug: "mumbai", sessionVersion: 2 })).toBe(false);
    expect(sessionGrants(null, { slug: "chennai", sessionVersion: 2 })).toBe(false);
  });

  it("accepts only lowercase addresses with single dashes", () => {
    expect(isSlug("delhi-iit")).toBe(true);
    for (const bad of ["Delhi-iit", "delhi--iit", "-x", "x-", "a/b", "", "a".repeat(61)]) expect(isSlug(bad)).toBe(false);
  });
});

describe("entities", () => {
  const e = (slug: string, name: string, lcId: string | null): Entity => ({ slug, name, lcId, sessionVersion: 1 });

  it("lists the all-India login first, then A-Z", () => {
    const sorted = sortEntities([e("pune", "Pune", "1"), e("india", "India (all LCs)", null), e("bhopal", "Bhopal", "2")]);
    expect(sorted.map((x) => x.slug)).toEqual(["india", "bhopal", "pune"]);
  });

  it("gives an LC only its own applications, and India all of them", () => {
    const apps = [{ homeLcId: "1" }, { homeLcId: "2" }, { homeLcId: "1" }] as PoolApplication[];
    expect(applicationsFor(e("pune", "Pune", "1"), apps)).toHaveLength(2);
    expect(applicationsFor(e("x", "X", "9"), apps)).toHaveLength(0);
    expect(applicationsFor(e("india", "India", null), apps)).toHaveLength(3);
  });
});
