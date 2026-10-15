import { describe, expect, it } from "vitest";
import type { RawApplication } from "./applications";
import { formatPhone, mapApplication, NAME_FALLBACK, safeUrl } from "./mapper";

const raw = (over: Partial<RawApplication> = {}): RawApplication => ({
  id: 101,
  status: "open",
  created_at: "2026-10-10T08:00:00Z",
  slot: { start_date: "2026-11-01", end_date: "2027-02-01" },
  person: {
    id: 7,
    full_name: " Test Person ",
    email: "test@example.com",
    linkedin_url: "https://www.linkedin.com/in/test",
    cv_url: "https://cdn.example.com/cv.pdf",
    home_lc: { id: 55, name: "Mumbai" },
    contact_detail: { phone: "9876543210", country_code: "+91" },
    managers: [{ full_name: "Manager One", email: "m1@example.com", contact_detail: { phone: "9000000000", country_code: "91" } }],
  },
  opportunity: {
    programme: { short_name_display: "GTa" },
    organisation: { name: "Example Ltd" },
    sub_product: { name: "Marketing" },
    earliest_start_date: null,
    latest_end_date: null,
  },
  ...over,
});

describe("mapApplication", () => {
  it("maps every field", () => {
    expect(mapApplication(raw())).toEqual({
      ok: true,
      row: {
        application_id: "101",
        person_id: "7",
        full_name: "Test Person",
        email: "test@example.com",
        phone: "+91 9876543210",
        linkedin_url: "https://www.linkedin.com/in/test",
        cv_url: "https://cdn.example.com/cv.pdf",
        home_lc_id: "55",
        home_lc: "Mumbai",
        ep_managers: [{ name: "Manager One", email: "m1@example.com", phone: "+91 9000000000" }],
        company_name: "Example Ltd",
        opportunity_field: "Marketing",
        programme: "GTa",
        start_date: "2026-11-01",
        end_date: "2027-02-01",
        applied_at: "2026-10-10T08:00:00.000Z",
      },
    });
  });

  it("falls back to the opportunity dates when the slot has none", () => {
    const r = raw({ slot: null, opportunity: { ...raw().opportunity!, earliest_start_date: "2026-12-01", latest_end_date: "2027-03-01" } });
    const m = mapApplication(r);
    expect(m.ok && [m.row.start_date, m.row.end_date]).toEqual(["2026-12-01", "2027-03-01"]);
  });

  it("converts timestamps to the date in India", () => {
    // 18:30 UTC on 31 Oct = 00:00 IST on 1 Nov
    const m = mapApplication(raw({ slot: { start_date: "2026-10-31T18:30:00Z", end_date: "2027-01-31T18:29:00Z" } }));
    expect(m.ok && [m.row.start_date, m.row.end_date]).toEqual(["2026-11-01", "2027-01-31"]);
  });

  it("keeps missing optional fields as null and uses a name placeholder", () => {
    const p = raw().person!;
    const m = mapApplication(raw({
      person: { ...p, full_name: "  ", email: null, linkedin_url: null, cv_url: "", contact_detail: null, managers: null },
      opportunity: { ...raw().opportunity!, organisation: null, sub_product: null },
    }));
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.row).toMatchObject({
      full_name: NAME_FALLBACK, email: null, phone: null, linkedin_url: null, cv_url: null,
      ep_managers: [], company_name: null, opportunity_field: null,
    });
  });

  it.each([
    [{ id: null }, "no id"],
    [{ status: "accepted" }, "status not open"],
    [{ person: null }, "no applicant id"],
    [{ person: { ...raw().person!, home_lc: null } }, "no home LC"],
    [{ opportunity: { ...raw().opportunity!, programme: { short_name_display: "GV" } } }, "unknown programme"],
    [{ created_at: null }, "no applied date"],
    [{ created_at: "not a date" }, "no applied date"],
  ] as const)("rejects %o as %s", (over, reason) => {
    expect(mapApplication(raw(over as Partial<RawApplication>))).toEqual({ ok: false, reason });
  });
});

describe("safeUrl", () => {
  it("keeps http and https links", () => {
    expect(safeUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(safeUrl(" http://a.com ")).toBe("http://a.com/");
  });
  it("blocks other schemes and junk", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("my name")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
  it("adds https:// to a bare LinkedIn link only when allowed", () => {
    expect(safeUrl("linkedin.com/in/abc", { allowBareLinkedIn: true })).toBe("https://linkedin.com/in/abc");
    expect(safeUrl("www.linkedin.com/in/abc", { allowBareLinkedIn: true })).toBe("https://www.linkedin.com/in/abc");
    expect(safeUrl("linkedin.com/in/abc")).toBeNull();
    expect(safeUrl("evil.com/linkedin.com/in/x", { allowBareLinkedIn: true })).toBeNull();
  });
});

describe("formatPhone", () => {
  it("joins country code and number", () => {
    expect(formatPhone("9876543210", "+91")).toBe("+91 9876543210");
    expect(formatPhone("9876543210", "91")).toBe("+91 9876543210");
  });
  it("keeps numbers that already have a +, and numbers without a code", () => {
    expect(formatPhone("+44 20 7946 0958", "+91")).toBe("+44 20 7946 0958");
    expect(formatPhone("9876543210", null)).toBe("9876543210");
  });
  it("returns null for no number, or a placeholder without digits", () => {
    expect(formatPhone(" ", "+91")).toBeNull();
    expect(formatPhone("deleted phone number", "+91")).toBeNull();
  });
});
