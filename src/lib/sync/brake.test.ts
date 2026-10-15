import { describe, expect, it } from "vitest";
import { checkSafetyBrake } from "./brake";
import { idsToDelete } from "./diff";

const base = { totalItems: 2400, fetched: 2400, kept: 900, lastSuccessKept: 945 };

describe("checkSafetyBrake", () => {
  it("lets a normal run through", () => expect(checkSafetyBrake(base)).toEqual({ ok: true }));
  it("lets the first run ever through", () => expect(checkSafetyBrake({ ...base, lastSuccessKept: null })).toEqual({ ok: true }));
  it("blocks when EXPA sent fewer than it promised", () => {
    expect(checkSafetyBrake({ ...base, fetched: 2300 })).toMatchObject({ ok: false, reason: expect.stringMatching(/promised 2400.*2300/) });
  });
  it("blocks when nothing is left", () => expect(checkSafetyBrake({ ...base, kept: 0, lastSuccessKept: null }).ok).toBe(false));
  it("blocks a drop to under half of the last good run", () => {
    expect(checkSafetyBrake({ ...base, kept: 472 }).ok).toBe(false); // 945 / 2 = 472.5
    expect(checkSafetyBrake({ ...base, kept: 473 }).ok).toBe(true);
  });
  it("--force skips only the half check", () => {
    expect(checkSafetyBrake({ ...base, kept: 100, force: true }).ok).toBe(true);
    expect(checkSafetyBrake({ ...base, kept: 0, force: true }).ok).toBe(false);
    expect(checkSafetyBrake({ ...base, fetched: 10, force: true }).ok).toBe(false);
  });
});

describe("idsToDelete", () => {
  it("returns ids in the database but not in the pool", () => {
    expect(idsToDelete(["1", "2", "3"], ["2", "3", "4"])).toEqual(["1"]);
    expect(idsToDelete([], ["1"])).toEqual([]);
    expect(idsToDelete(["1"], [])).toEqual(["1"]);
  });
});
