import { describe, expect, it } from "vitest";
import { toPoolApplication } from "@/lib/db/read";
import type { ApplicationRow } from "@/lib/db/types";
import { CSV_COLUMNS, csvCell, toCsv } from "./csv";
import {
  formatDate, formatIndiaDate, formatIndiaDateTime, initials, isStale, telHref, weeksBetween,
} from "./format";
import { filterPool, indexPool, lcOptions } from "./search";
import { NOT_SPECIFIED, computeStats } from "./stats";
import type { PoolApplication } from "./types";

function app(over: Partial<PoolApplication> = {}): PoolApplication {
  return {
    applicationId: "1",
    personId: "p1",
    fullName: "Priya Sharma",
    email: "priya@mail.example",
    phone: "+91 98765 43210",
    linkedinUrl: null,
    cvUrl: "https://example.com/cv.pdf",
    homeLcId: "10",
    homeLc: "Mumbai",
    epManagers: [{ name: "Neha Agarwal", email: "neha@aiesec.example", phone: null }],
    companyName: "Northwind Labs",
    opportunityField: "Marketing",
    programme: "GTa",
    startDate: "2026-11-01",
    endDate: "2026-12-13",
    appliedAt: "2026-10-01T10:00:00Z",
    ...over,
  };
}

const POOL = [
  app({ applicationId: "1" }),
  app({ applicationId: "2", fullName: "Rohan Mehta", homeLcId: "20", homeLc: "Delhi IIT", programme: "GTe", opportunityField: null, epManagers: [] }),
  app({ applicationId: "3", fullName: "Ananya Iyer", homeLcId: "20", homeLc: "Delhi IIT", companyName: "Contoso", opportunityField: "Finance" }),
  app({ applicationId: "4", fullName: "Karan Das", homeLcId: "30", homeLc: "Bengaluru", opportunityField: "Marketing" }),
];

describe("format", () => {
  it("formats plain dates without shifting them", () => {
    expect(formatDate("2026-10-05")).toBe("5 Oct 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("junk")).toBe("—");
  });
  it("shows timestamps in India time", () => {
    expect(formatIndiaDate("2026-10-15T18:29:00Z")).toBe("15 Oct 2026"); // 23:59 IST
    expect(formatIndiaDate("2026-10-15T18:30:00Z")).toBe("16 Oct 2026"); // 00:00 IST
    expect(formatIndiaDateTime("2026-10-16T06:58:00Z")).toBe("16 Oct 2026, 12:28 PM IST");
    expect(formatIndiaDateTime("2026-10-15T18:35:00Z")).toBe("16 Oct 2026, 12:05 AM IST");
  });
  it("counts weeks only when both dates are valid and in order", () => {
    expect(weeksBetween("2026-11-01", "2026-12-13")).toBe(6);
    expect(weeksBetween("2026-11-01", null)).toBeNull();
    expect(weeksBetween("2026-12-13", "2026-11-01")).toBeNull();
  });
  it("makes initials and tel links", () => {
    expect(initials("  priya   sharma rao ")).toBe("PS");
    expect(initials("Priya")).toBe("P");
    expect(telHref("+91 98765-43210")).toBe("tel:+919876543210");
  });
  it("calls data stale after 1 hour, or when there was never a sync", () => {
    const t = new Date("2026-10-16T06:00:00Z").getTime();
    expect(isStale("2026-10-16T05:30:00Z", t)).toBe(false);
    expect(isStale("2026-10-16T04:59:00Z", t)).toBe(true);
    expect(isStale(null, t)).toBe(true);
  });
});

describe("search", () => {
  const index = indexPool(POOL);
  const ids = (list: PoolApplication[]) => list.map((a) => a.applicationId);

  it("finds by name, email, company, work area, LC and EP manager, any case", () => {
    expect(ids(filterPool(index, "ROHAN", ""))).toEqual(["2"]);
    expect(ids(filterPool(index, "contoso", ""))).toEqual(["3"]);
    expect(ids(filterPool(index, "finance", ""))).toEqual(["3"]);
    expect(ids(filterPool(index, "delhi", ""))).toEqual(["2", "3"]);
    expect(ids(filterPool(index, "neha", ""))).toEqual(["1", "3", "4"]);
    expect(ids(filterPool(index, "priya@", ""))).toEqual(["1", "2", "3", "4"]); // same email in fixture
  });
  it("combines search and LC, ignores surrounding spaces, keeps order", () => {
    expect(ids(filterPool(index, "  neha ", "20"))).toEqual(["3"]);
    expect(ids(filterPool(index, "   ", ""))).toEqual(["1", "2", "3", "4"]);
    expect(ids(filterPool(index, "", "30"))).toEqual(["4"]);
    expect(filterPool(index, "nobody", "")).toEqual([]);
  });
  it("does not match across two fields", () => {
    expect(filterPool(index, "sharma priya", "")).toEqual([]);
  });
  it("lists LCs by name with counts", () => {
    expect(lcOptions(POOL)).toEqual([
      { id: "30", name: "Bengaluru", count: 1 },
      { id: "20", name: "Delhi IIT", count: 2 },
      { id: "10", name: "Mumbai", count: 1 },
    ]);
  });
});

describe("stats", () => {
  it("covers the whole pool", () => {
    const s = computeStats(POOL, "");
    expect(s).toMatchObject({ total: 4, lcCount: 3, fieldCount: 3, gta: 3, gte: 1, gtaPercent: 75, selected: null });
    expect(s.perLc.map((c) => [c.label, c.count])).toEqual([["Delhi IIT", 2], ["Bengaluru", 1], ["Mumbai", 1]]);
    expect(s.perField.map((c) => [c.label, c.count])).toEqual([["Marketing", 2], ["Finance", 1], [NOT_SPECIFIED, 1]]);
  });
  it("follows the LC filter, with the LC's rank among all LCs", () => {
    const s = computeStats(POOL, "20");
    expect(s).toMatchObject({ total: 2, lcCount: 1, gta: 1, gte: 1, gtaPercent: 50 });
    expect(s.selected).toEqual({ rank: 1, of: 3, sharePercent: 50 });
    expect(s.perLc).toHaveLength(3); // breakdown of LCs stays India-wide
    expect(computeStats(POOL, "30").selected?.rank).toBe(2); // tie with Mumbai → by name
  });
  it("handles an empty pool and an LC that is gone", () => {
    expect(computeStats([], "")).toMatchObject({ total: 0, gtaPercent: 0, perLc: [] });
    expect(computeStats(POOL, "99")).toMatchObject({ total: 0, selected: { rank: 0, of: 3, sharePercent: 0 } });
  });
});

describe("csv", () => {
  it("quotes cells and doubles inner quotes", () => {
    expect(csvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell(null)).toBe('""');
  });
  it("blocks spreadsheet formulas", () => {
    for (const bad of ["=HYPERLINK(\"x\")", "+91 98765", "-1+2", "@SUM(A1)", "\tx", "\rx"]) {
      expect(csvCell(bad).startsWith(`"'`)).toBe(true);
    }
    expect(csvCell("Priya")).toBe('"Priya"');
  });
  it("writes a BOM, the header and one line per application", () => {
    const csv = toCsv([POOL[0], POOL[1]]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_COLUMNS.map((c) => `"${c}"`).join(","));
    expect(lines[1]).toContain('"Neha Agarwal"');
    expect(lines[1]).toContain(`"'+91 98765 43210"`);
    expect(lines[1]).toContain('"Not available"'); // LinkedIn missing
    expect(lines[2].startsWith('"Rohan Mehta","Northwind Labs","",')).toBe(true); // no EP manager
  });
});

describe("toPoolApplication", () => {
  const row: ApplicationRow = {
    application_id: "1", person_id: "p1", full_name: "Priya", email: null, phone: null,
    linkedin_url: "javascript:alert(1)", cv_url: "https://example.com/cv.pdf", home_lc_id: "10",
    home_lc: "Mumbai", ep_managers: [], company_name: null, opportunity_field: null, programme: "GTa",
    start_date: null, end_date: null, applied_at: "2026-10-01T10:00:00Z",
  };
  it("re-checks links and maps to camelCase", () => {
    const a = toPoolApplication(row);
    expect(a.linkedinUrl).toBeNull();
    expect(a.cvUrl).toBe("https://example.com/cv.pdf");
    expect(a).toMatchObject({ applicationId: "1", homeLc: "Mumbai", epManagers: [], appliedAt: "2026-10-01T10:00:00Z" });
  });
  it("treats a non-list EP manager value as no managers", () => {
    expect(toPoolApplication({ ...row, ep_managers: null as unknown as [] }).epManagers).toEqual([]);
  });
});
