// The login cookie (docs/sops/pool-page.md "Login"). Pure functions: no Next.js, so they are testable.
// Value: "<slug>.<session version>.<expiry, unix seconds>.<HMAC-SHA256 signature>". The signature
// (made with SESSION_SECRET, which only the server has) means a browser cannot edit or forge it.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ogt_session";
export const SESSION_DAYS = 30;
/** Cookie lifetime in seconds. */
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export interface Session {
  slug: string;
  version: number;
  /** Unix seconds. */
  expires: number;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** A secret shorter than 32 characters is refused, so a weak or missing one fails loudly. */
export function checkSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters)");
  return secret;
}

export function createSessionValue(slug: string, version: number, secret: string, nowMs: number): string {
  const payload = `${slug}.${version}.${Math.floor(nowMs / 1000) + SESSION_MAX_AGE}`;
  return `${payload}.${sign(payload, checkSecret(secret))}`;
}

/** The session in a cookie value, or null if it is missing, malformed, forged or expired. */
export function readSessionValue(value: string | undefined, secret: string, nowMs: number): Session | null {
  const m = value ? /^([a-z0-9-]+)\.(\d{1,9})\.(\d{1,12})\.([A-Za-z0-9_-]+)$/.exec(value) : null;
  if (!m || !SLUG.test(m[1])) return null;
  const expected = Buffer.from(sign(`${m[1]}.${m[2]}.${m[3]}`, checkSecret(secret)));
  const given = Buffer.from(m[4]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const session = { slug: m[1], version: Number(m[2]), expires: Number(m[3]) };
  return session.expires * 1000 > nowMs ? session : null;
}

/** True when the session belongs to this entity and its password has not changed since login. */
export function sessionGrants(session: Session | null, entity: { slug: string; sessionVersion: number }): boolean {
  return session !== null && session.slug === entity.slug && session.version === entity.sessionVersion;
}

export function isSlug(value: string): boolean {
  return value.length <= 60 && SLUG.test(value);
}
