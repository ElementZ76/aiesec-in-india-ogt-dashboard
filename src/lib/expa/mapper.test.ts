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
    professional_experiences: [
      { title: " Intern ", organisation_name: "Old Co", experience_level: { name: "Internship" }, start_date: "2025-03-01T00:00:00Z", end_date: "2025-06-01T00:00:00Z", description: "Did things" },
      { title: "Analyst", organisation_name: "New Co", experience_level: { name: "Full Time" }, start_date: "2026-01-01T00:00:00Z", end_date: null, description: null },
    ],
    person_profile: { languages: [{ constant_name: "English", level: 2 }, { constant_name: "Hindi", level: null }] },
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
        professional_experiences: [
          { title: "Analyst", organisation: "New Co", type: "Full Time", start: "2026-01-01", end: null, description: null },
          { title: "Intern", organisation: "Old Co", type: "Internship", start: "2025-03-01", end: "2025-06-01", description: "Did things" },
        ],
        languages: [{ name: "English", level: 2 }, { name: "Hindi", level: null }],
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

  it("cleans experiences: drops empty ones, keeps line breaks, puts undated ones last", () => {
    const p = raw().person!;
    const job = { title: null, organisation_name: null, experience_level: null, start_date: null, end_date: null, description: null };
    const m = mapApplication(raw({
      person: {
        ...p,
        professional_experiences: [
          { ...job, organisation_name: "No Dates Ltd" },
          { ...job, title: "  ", description: "only a description" },
          { ...job, title: "Volunteer", start_date: "2024-05-01", description: " Line 1  \r\n\r\n\r\n\r\nLine 2 " },
        ],
      },
    }));
    expect(m.ok && m.row.professional_experiences).toEqual([
      { title: "Volunteer", organisation: null, type: null, start: "2024-05-01", end: null, description: "Line 1\n\nLine 2" },
      { title: null, organisation: "No Dates Ltd", type: null, start: null, end: null, description: null },
    ]);
  });

  it("lists each language once and skips blank names", () => {
    const p = raw().person!;
    const m = mapApplication(raw({
      person: { ...p, person_profile: { languages: [{ constant_name: "English", level: 4 }, { constant_name: " english ", level: 1 }, { constant_name: "", level: 2 }] } },
    }));
    expect(m.ok && m.row.languages).toEqual([{ name: "English", level: 4 }]);
  });

  it("treats missing experience and language lists as empty", () => {
    const m = mapApplication(raw({ person: { ...raw().person!, professional_experiences: null, person_profile: null } }));
    expect(m.ok && [m.row.professional_experiences, m.row.languages]).toEqual([[], []]);
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
  it("drops the trunk 0 after a country code, except for Italy", () => {
    expect(formatPhone("09876543210", "+91")).toBe("+91 9876543210");
    expect(formatPhone("0 98765 43210", "91")).toBe("+91 98765 43210");
    expect(formatPhone("015112345678", "+49")).toBe("+49 15112345678");
    expect(formatPhone("0612345678", "+39")).toBe("+39 0612345678");
    expect(formatPhone("09876543210", null)).toBe("09876543210"); // no code: keep as typed
  });
  it("reads codes like 'India (+91)' and removes invisible characters", () => {
    expect(formatPhone("9876543210", "India (+91)")).toBe("+91 9876543210");
    expect(formatPhone("\u202a9876543210\u202c", "India (+91)")).toBe("+91 9876543210");
    expect(formatPhone("9876543210", "0")).toBe("9876543210"); // code of zeros = no code
    expect(formatPhone("9876543210", "India")).toBe("9876543210");
  });
  it("returns null for no number, or a placeholder without digits", () => {
    expect(formatPhone(" ", "+91")).toBeNull();
    expect(formatPhone("deleted phone number", "+91")).toBeNull();
  });
});
