import { describe, expect, it } from "vitest";
import { toPoolApplication } from "@/lib/db/read";
import type { ApplicationRow } from "@/lib/db/types";
import { CSV_COLUMNS, csvCell, experienceText, toCsv } from "./csv";
import {
  formatDate, formatIndiaDate, formatIndiaDateTime, formatMonthRange, initials, isStale, telHref, weeksBetween,
} from "./format";
import { groupByPerson, programmesOf } from "./people";
import { NO_FIELD, filterPool, indexPool, isNarrowed, lcOptions, workAreaOptions, type Match } from "./search";
import { NOT_SPECIFIED, computeStats } from "./stats";
import type { PoolApplication } from "./types";
import { EMPTY_VIEW, pageCount, pageItems, parseView, viewSearch } from "./view";

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
    professionalExperiences: [],
    languages: [],
    companyName: "Northwind Labs",
    opportunityField: "Marketing",
    programme: "GTa",
    startDate: "2026-11-01",
    endDate: "2026-12-13",
    appliedAt: "2026-10-01T10:00:00Z",
    ...over,
  };
}

// Priya (p1) has two applications: Northwind (Marketing, GTa) and a newer Fabrikam (Finance, GTe).
const APPS = [
  app({ applicationId: "1", appliedAt: "2026-10-01T10:00:00Z" }),
  app({ applicationId: "2", personId: "p2", fullName: "Rohan Mehta", homeLcId: "20", homeLc: "Delhi IIT", programme: "GTe", opportunityField: null, epManagers: [], appliedAt: "2026-09-30T10:00:00Z" }),
  app({ applicationId: "3", personId: "p3", fullName: "Ananya Iyer", homeLcId: "20", homeLc: "Delhi IIT", companyName: "Contoso", opportunityField: "Finance", appliedAt: "2026-09-29T10:00:00Z" }),
  app({ applicationId: "4", personId: "p4", fullName: "Karan Das", homeLcId: "30", homeLc: "Bengaluru", opportunityField: "Marketing", appliedAt: "2026-09-28T10:00:00Z" }),
  app({ applicationId: "5", companyName: "Fabrikam", opportunityField: "Finance", programme: "GTe", appliedAt: "2026-10-05T10:00:00Z" }),
];
const POOL = groupByPerson(APPS);

describe("format", () => {
  it("writes job dates as months", () => {
    expect(formatMonthRange("2025-03-01", "2025-06-01")).toBe("Mar 2025 – Jun 2025");
    expect(formatMonthRange("2026-01-01", null)).toBe("Jan 2026 – Present");
    expect(formatMonthRange("2026-01-01", "2026-01-20")).toBe("Jan 2026");
    expect(formatMonthRange(null, "2026-01-20")).toBe("Until Jan 2026");
    expect(formatMonthRange(null, null)).toBe("Dates not on EXPA");
  });
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

describe("people", () => {
  it("makes one entry per person, ordered by their newest application", () => {
    expect(POOL.map((p) => p.personId)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(POOL[0].applications.map((a) => a.applicationId)).toEqual(["5", "1"]); // newest first
    expect(POOL[0]).toMatchObject({ fullName: "Priya Sharma", homeLc: "Mumbai" });
    expect(POOL[0]).not.toHaveProperty("companyName"); // application fields live in `applications`
  });
  it("orders by time whatever the input order, ties by id", () => {
    expect(groupByPerson([...APPS].reverse())).toEqual(POOL);
    const tie = groupByPerson([app({ applicationId: "b" }), app({ applicationId: "a" })]);
    expect(tie[0].applications.map((a) => a.applicationId)).toEqual(["a", "b"]);
  });
  it("lists a person's programmes, GTa first", () => {
    expect(programmesOf(POOL[0].applications)).toEqual(["GTa", "GTe"]);
    expect(programmesOf(POOL[1].applications)).toEqual(["GTe"]);
    expect(groupByPerson([])).toEqual([]);
  });
});

describe("search", () => {
  const index = indexPool(POOL);
  const ids = (list: Match[]) => list.map((m) => m.person.personId);
  const jobs = (m: Match | undefined) => m?.matches.map((a) => a.applicationId);
  const f = (query: string, lcId = "", field = "") => filterPool(index, { query, lcId, field });

  it("finds by name, email, company, work area, LC and EP manager, any case", () => {
    expect(ids(f("ROHAN"))).toEqual(["p2"]);
    expect(ids(f("contoso"))).toEqual(["p3"]);
    expect(ids(f("finance"))).toEqual(["p1", "p3"]);
    expect(ids(f("delhi"))).toEqual(["p2", "p3"]);
    expect(ids(f("neha"))).toEqual(["p1", "p3", "p4"]);
    expect(ids(f("priya@"))).toEqual(["p1", "p2", "p3", "p4"]); // same email in fixture
  });
  it("says which of a person's applications match", () => {
    expect(jobs(f("fabrikam")[0])).toEqual(["5"]); // company search: just that application
    expect(jobs(f("priya")[0])).toEqual(["5", "1"]); // a hit on the person counts for all of them
    expect(jobs(f("", "", "Marketing")[0])).toEqual(["1"]);
    expect(jobs(f("priya", "", "Finance")[0])).toEqual(["5"]); // person hit, narrowed by work area
    expect(isNarrowed(f("fabrikam")[0])).toBe(true);
    expect(isNarrowed(f("")[0])).toBe(false);
  });
  it("combines search and LC, ignores surrounding spaces, keeps order", () => {
    expect(ids(f("  neha ", "20"))).toEqual(["p3"]);
    expect(ids(f("   "))).toEqual(["p1", "p2", "p3", "p4"]);
    expect(ids(f("", "30"))).toEqual(["p4"]);
    expect(f("nobody")).toEqual([]);
  });
  it("does not match across two fields, or across person and application", () => {
    expect(f("sharma priya")).toEqual([]);
    expect(f("mumbai\nnorthwind")).toEqual([]);
  });
  it("filters by work area, alone and with LC and search", () => {
    expect(ids(f("", "", "Marketing"))).toEqual(["p1", "p4"]);
    expect(ids(f("", "", NO_FIELD))).toEqual(["p2"]);
    expect(ids(f("", "20", "Finance"))).toEqual(["p3"]);
    expect(ids(f("karan", "", "Marketing"))).toEqual(["p4"]);
    expect(f("", "30", "Finance")).toEqual([]);
    expect(f("contoso", "", "Marketing")).toEqual([]); // one application must match both
  });
  it("lists work areas A-Z with the number of people, 'Not specified' last", () => {
    expect(workAreaOptions(POOL)).toEqual([
      { id: "Finance", name: "Finance", count: 2 },
      { id: "Marketing", name: "Marketing", count: 2 },
      { id: NO_FIELD, name: "Not specified (GTe)", count: 1 },
    ]);
  });
  it("counts a person once per work area", () => {
    const twice = groupByPerson([...APPS, app({ applicationId: "6", personId: "p4", fullName: "Karan Das", homeLcId: "30", homeLc: "Bengaluru" })]);
    expect(workAreaOptions(twice).find((o) => o.id === "Marketing")?.count).toBe(2);
  });
  it("says (GTe) only while every application without a work area is GTe", () => {
    const withGta = groupByPerson([...APPS, app({ applicationId: "6", personId: "p5", opportunityField: null, programme: "GTa" })]);
    expect(workAreaOptions(withGta).at(-1)).toEqual({ id: NO_FIELD, name: "Not specified", count: 2 });
  });
  it("keeps a selected work area that is missing from the list, with 0", () => {
    const bengaluru = POOL.filter((p) => p.homeLcId === "30");
    expect(workAreaOptions(bengaluru, "Finance")).toEqual([
      { id: "Finance", name: "Finance", count: 0 },
      { id: "Marketing", name: "Marketing", count: 1 },
    ]);
    expect(workAreaOptions(bengaluru, NO_FIELD).at(-1)).toEqual({ id: NO_FIELD, name: "Not specified", count: 0 });
  });
  it("lists LCs by name with the number of people", () => {
    expect(lcOptions(POOL)).toEqual([
      { id: "30", name: "Bengaluru", count: 1 },
      { id: "20", name: "Delhi IIT", count: 2 },
      { id: "10", name: "Mumbai", count: 1 },
    ]);
  });
});

describe("stats", () => {
  it("counts people for the big number and applications for the rest", () => {
    const s = computeStats(POOL, "");
    expect(s).toMatchObject({ people: 4, total: 5, lcCount: 3, fieldCount: 3, gta: 3, gte: 2, gtaPercent: 60 });
    expect(s.perLc.map((c) => [c.label, c.count])).toEqual([["Delhi IIT", 2], ["Mumbai", 2], ["Bengaluru", 1]]);
    expect(s.perField.map((c) => [c.label, c.count])).toEqual([["Finance", 2], ["Marketing", 2], [NOT_SPECIFIED, 1]]);
    expect(s.perField.find((c) => c.label === NOT_SPECIFIED)?.key).toBe(NO_FIELD); // same key as the filter
  });
  it("follows the LC filter", () => {
    const s = computeStats(POOL, "20");
    expect(s).toMatchObject({ people: 2, total: 2, lcCount: 1, gta: 1, gte: 1, gtaPercent: 50 });
    expect(s.perLc).toHaveLength(3); // breakdown of LCs stays India-wide
  });
  it("handles an empty pool and an LC that is gone", () => {
    expect(computeStats([], "")).toMatchObject({ people: 0, total: 0, gtaPercent: 0, perLc: [] });
    expect(computeStats(POOL, "99")).toMatchObject({ people: 0, total: 0, perField: [] });
    expect(computeStats(POOL, "99").perLc).toHaveLength(3);
  });
});

describe("csv", () => {
  const all = (list = POOL): Match[] => list.map((person) => ({ person, matches: person.applications }));
  const lines = (csv: string) => csv.slice(1).trimEnd().split("\r\n");

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
    const csv = toCsv(all(POOL.slice(0, 2)));
    expect(csv.startsWith("﻿")).toBe(true);
    const l = lines(csv);
    expect(l).toHaveLength(4); // Priya's 2 applications + Rohan's 1
    expect(l[0]).toBe(CSV_COLUMNS.map((c) => `"${c}"`).join(","));
    expect(l[1].startsWith('"Priya Sharma","Fabrikam",')).toBe(true);
    expect(l[2].startsWith('"Priya Sharma","Northwind Labs",')).toBe(true);
    expect(l[2]).toContain('"Neha Agarwal"');
    expect(l[2]).toContain(`"'+91 98765 43210"`);
    expect(l[2]).toContain('"Not available"'); // LinkedIn missing
    expect(l[2].endsWith(',"",""')).toBe(true); // no experiences, no languages
    expect(l[3].startsWith('"Rohan Mehta","Northwind Labs","",')).toBe(true); // no EP manager
  });
  it("writes only the applications that match", () => {
    const rows = filterPool(indexPool(POOL), { query: "", lcId: "", field: "Finance" });
    expect(lines(toCsv(rows)).slice(1).map((l) => l.split(",")[1])).toEqual(['"Fabrikam"', '"Contoso"']);
  });
  it("writes experiences one per line (no descriptions) and languages comma-separated", () => {
    const [person] = groupByPerson([app({
      professionalExperiences: [
        { title: "Analyst", organisation: "New Co", type: "Full Time", start: "2026-01-01", end: null, description: "long text" },
        { title: null, organisation: "Old Co", type: null, start: "2025-03-01", end: "2025-06-01", description: null },
      ],
      languages: [{ name: "English", level: 2 }, { name: "Hindi", level: null }],
    })]);
    expect(experienceText(person)).toBe("Analyst at New Co (Full Time, Jan 2026 – Present)\nOld Co (Mar 2025 – Jun 2025)");
    expect(toCsv(all([person]))).toContain('"Analyst at New Co (Full Time, Jan 2026 – Present)\nOld Co (Mar 2025 – Jun 2025)","English, Hindi"');
  });
});

describe("toPoolApplication", () => {
  const row: ApplicationRow = {
    application_id: "1", person_id: "p1", full_name: "Priya", email: null, phone: null,
    linkedin_url: "javascript:alert(1)", cv_url: "https://example.com/cv.pdf", home_lc_id: "10",
    home_lc: "Mumbai", ep_managers: [], professional_experiences: [], languages: [], company_name: null, opportunity_field: null, programme: "GTa",
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

describe("view (paging + address)", () => {
  const from = (search: string) => {
    const p = new URLSearchParams(search);
    return parseView((k) => p.get(k));
  };

  it("counts pages, with at least one page", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
    expect(pageCount(945)).toBe(79);
  });
  it("lists every page when there are 7 or fewer", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("keeps 7 buttons with gaps when there are more pages", () => {
    expect(pageItems(1, 79)).toEqual([1, 2, 3, 4, 5, "gap", 79]);
    expect(pageItems(4, 79)).toEqual([1, 2, 3, 4, 5, "gap", 79]);
    expect(pageItems(5, 79)).toEqual([1, "gap", 4, 5, 6, "gap", 79]);
    expect(pageItems(76, 79)).toEqual([1, "gap", 75, 76, 77, 78, 79]);
    expect(pageItems(79, 79)).toEqual([1, "gap", 75, 76, 77, 78, 79]);
    expect(pageItems(5, 8)).toEqual([1, "gap", 4, 5, 6, 7, 8]);
  });
  it("reads search, filters and page from the address", () => {
    expect(from("?q=priya+s&lc=10&area=Marketing&page=3")).toEqual({ query: "priya s", lcId: "10", field: "Marketing", page: 3 });
    expect(from("")).toEqual(EMPTY_VIEW);
  });
  it("falls back to page 1 for a bad page number", () => {
    for (const bad of ["0", "-2", "2.5", "abc", "", "1e400"]) expect(from(`?page=${bad}`).page).toBe(1);
  });
  it("writes only what is set, so the default view has a clean address", () => {
    expect(viewSearch(EMPTY_VIEW)).toBe("");
    expect(viewSearch({ ...EMPTY_VIEW, query: "   " })).toBe("");
    expect(viewSearch({ query: "ravi & co", lcId: "10", field: "__none__", page: 2 })).toBe("?q=ravi+%26+co&lc=10&area=__none__&page=2");
  });
  it("round-trips a view through the address", () => {
    const view = { query: "Nürnberg", lcId: "77", field: "Teaching", page: 12 };
    expect(from(viewSearch(view))).toEqual(view);
  });
});
