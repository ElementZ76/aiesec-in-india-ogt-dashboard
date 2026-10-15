import { describe, expect, it } from "vitest";
import type { ApplicationRow } from "@/lib/db/types";
import { indiaDate, toIndiaDate } from "./dates";
import { applyPoolRules, hasSlotEnded, isClosedLc } from "./rules";

describe("indiaDate", () => {
  it("uses India time, not UTC", () => {
    expect(indiaDate(new Date("2026-10-15T18:29:00Z"))).toBe("2026-10-15"); // 23:59 IST
    expect(indiaDate(new Date("2026-10-15T18:30:00Z"))).toBe("2026-10-16"); // 00:00 IST
  });
});

describe("toIndiaDate", () => {
  it("keeps plain dates, converts timestamps, rejects junk", () => {
    expect(toIndiaDate("2027-01-31")).toBe("2027-01-31");
    expect(toIndiaDate("2027-01-31T20:00:00Z")).toBe("2027-02-01");
    expect(toIndiaDate("nope")).toBeNull();
    expect(toIndiaDate(null)).toBeNull();
  });
});

describe("isClosedLc", () => {
  it("spots closed LCs in any case", () => {
    expect(isClosedLc("Closed [Jodhpur]")).toBe(true);
    expect(isClosedLc("closed [VIT]")).toBe(true);
    expect(isClosedLc("Mumbai")).toBe(false);
    expect(isClosedLc("India National Office")).toBe(false);
    expect(isClosedLc("Closedown Street")).toBe(false);
  });
});

describe("hasSlotEnded", () => {
  const today = "2026-10-15";
  it("a slot ending today is still active", () => expect(hasSlotEnded("2026-10-15", today)).toBe(false));
  it("a slot that ended yesterday is out", () => expect(hasSlotEnded("2026-10-14", today)).toBe(true));
  it("a future slot is active", () => expect(hasSlotEnded("2027-01-01", today)).toBe(false));
  it("no end date is kept", () => expect(hasSlotEnded(null, today)).toBe(false));
});

describe("applyPoolRules", () => {
  const row = (id: string, home_lc: string, end_date: string | null) => ({ application_id: id, home_lc, end_date }) as ApplicationRow;
  it("keeps open LCs with active slots and counts the rest", () => {
    const result = applyPoolRules(
      [row("1", "Mumbai", "2026-12-01"), row("2", "Closed [Jodhpur]", "2026-12-01"), row("3", "Pune", "2026-10-01"),
       row("4", "India National Office", "2026-10-15"), row("5", "Closed [VIT]", "2026-01-01")],
      "2026-10-15",
    );
    expect(result.kept.map((r) => r.application_id)).toEqual(["1", "4"]);
    expect(result.droppedClosedLc).toBe(2);
    expect(result.droppedSlotEnded).toBe(1);
  });
});
