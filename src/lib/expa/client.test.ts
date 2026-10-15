import { describe, expect, it, vi } from "vitest";
import { assertReadOnly, createExpaClient, redact } from "./client";

const TOKEN = "secret-token-123";
const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
const noSleep = () => Promise.resolve();

describe("assertReadOnly", () => {
  it("allows queries", () => {
    expect(() => assertReadOnly("{ currentPerson { id } }")).not.toThrow();
    expect(() => assertReadOnly("query X($a: Int) { x }")).not.toThrow();
  });
  it("refuses mutations, even hidden after a comment", () => {
    expect(() => assertReadOnly("mutation { deleteThing(id: 1) }")).toThrow(/read-only/);
    expect(() => assertReadOnly("# just a query\nmutation { x }")).toThrow(/read-only/);
    expect(() => assertReadOnly("query A { a } mutation B { b }")).toThrow(/read-only/);
  });
  it("refuses anything that is not a query", () => {
    expect(() => assertReadOnly("subscription { x }")).toThrow();
    expect(() => assertReadOnly("fragment F on X { id }")).toThrow(/Only GraphQL queries/);
  });
});

describe("redact", () => {
  it("removes the token and access_token values", () => {
    expect(redact(`failed https://x/graphql?access_token=${TOKEN}&a=1`, TOKEN)).toBe("failed https://x/graphql?access_token=[redacted]&a=1");
    expect(redact(`token ${TOKEN} leaked`, TOKEN)).toBe("token [redacted] leaked");
  });
});

describe("createExpaClient", () => {
  it("sends the query and returns data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ a: 1 }));
    const client = createExpaClient({ token: TOKEN, fetchImpl, sleep: noSleep });
    await expect(client.query("{ a }")).resolves.toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ query: "{ a }", variables: {} });
  });

  it("never sends a mutation", async () => {
    const fetchImpl = vi.fn();
    const client = createExpaClient({ token: TOKEN, fetchImpl, sleep: noSleep });
    await expect(client.query("mutation { x }")).rejects.toThrow(/read-only/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retries, then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(ok({ a: 2 }));
    const client = createExpaClient({ token: TOKEN, fetchImpl, sleep: noSleep });
    await expect(client.query("{ a }")).resolves.toEqual({ a: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("gives up after 3 attempts with a message that hides the token", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error(`request to ...?access_token=${TOKEN} failed`));
    const client = createExpaClient({ token: TOKEN, fetchImpl, sleep: noSleep });
    const error = await client.query("{ a }").catch((e: Error) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(error)).toMatch(/after 3 attempts/);
    expect(String(error)).not.toContain(TOKEN);
  });

  it("treats GraphQL errors as failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "bad token" }] })));
    const client = createExpaClient({ token: TOKEN, fetchImpl, sleep: noSleep, retryDelaysMs: [] });
    await expect(client.query("{ a }")).rejects.toThrow(/bad token/);
  });

  it("requires a token", () => {
    expect(() => createExpaClient({ token: "" })).toThrow(/missing/);
  });
});
