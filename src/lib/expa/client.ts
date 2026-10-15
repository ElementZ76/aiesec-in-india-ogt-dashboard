// Read-only EXPA GraphQL client (CLAUDE.md invariants 1 and 5).
// - Refuses to send anything that is not a query (no mutations, ever).
// - Retries failed requests, with a timeout per request.
// - Never puts the token into an error message.

export const EXPA_ENDPOINT = "https://gis-api.aiesec.org/graphql";

export interface ExpaClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export interface ExpaClientOptions {
  token: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Waits between attempts; its length + 1 = number of attempts. */
  retryDelaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
}

/** Removes the token (and any access_token=... value) from text before it is shown or stored. */
export function redact(text: string, token: string): string {
  let out = text.replace(/access_token=[^&\s"']+/gi, "access_token=[redacted]");
  if (token) out = out.split(token).join("[redacted]");
  return out;
}

export function assertReadOnly(query: string): void {
  const body = query.replace(/#[^\n]*/g, "").trim();
  if (/\bmutation\b/i.test(body) || /\bsubscription\b/i.test(body)) {
    throw new Error("Refusing to send a mutation or subscription: EXPA is read-only.");
  }
  if (!body.startsWith("{") && !/^query\b/i.test(body)) {
    throw new Error("Only GraphQL queries may be sent to EXPA.");
  }
}

export function createExpaClient(options: ExpaClientOptions): ExpaClient {
  const {
    token,
    endpoint = EXPA_ENDPOINT,
    fetchImpl = fetch,
    timeoutMs = 60_000,
    retryDelaysMs = [1_000, 3_000],
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;
  if (!token) throw new Error("EXPA_ACCESS_TOKEN is missing.");

  async function once<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetchImpl(`${endpoint}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`EXPA answered HTTP ${res.status}`);
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`EXPA error: ${json.errors.map((e) => e.message).join(" | ")}`);
    if (!json.data) throw new Error("EXPA returned no data");
    return json.data;
  }

  return {
    async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
      assertReadOnly(query);
      let lastError: unknown;
      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
        if (attempt > 0) await sleep(retryDelaysMs[attempt - 1]);
        try {
          return await once<T>(query, variables);
        } catch (err) {
          lastError = err;
        }
      }
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(redact(`EXPA request failed after ${retryDelaysMs.length + 1} attempts: ${message}`, token));
    },
  };
}
