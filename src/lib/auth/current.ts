// Reads the login cookie of the current request. Request data: call it only inside <Suspense>.
import { cookies } from "next/headers";
import { connection } from "next/server";
import { readSessionValue, SESSION_COOKIE, type Session } from "./session";

export async function currentSession(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  await connection(); // the expiry check reads the clock, which Next.js allows only at request time
  return readSessionValue(value, process.env.SESSION_SECRET ?? "", Date.now());
}
