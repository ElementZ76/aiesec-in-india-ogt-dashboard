# Project Constitution — AIESEC in India oGT CV Pool

> **This file is LAW.** If code and this file disagree, the code is wrong or this file must be
> updated first (with a Maintenance Log row). Status: **DRAFT — Blueprint not yet approved.**

## North Star

A public website, hosted on Vercel, showing **one India-wide pool** of every AIESEC in India oGT
(outgoing Global Talent) application with status **"applied"**, filterable by local committee
(LC). Each application is one card showing the spec fields. Data is read live from EXPA.

- **Spec:** `spec_file.txt` lists the 10 fields each card shows (see Data Schema).
- **Bare minimum (MVP):** the cards with contact info, EP manager and CV link.
- **Done:** the MVP with a proper UI, plus an LC filter, spreadsheet export and statistics.
- Functional reference: https://ogtbardo.vercel.app/cv-pool (same function, different look).
- Expected load: 20–30 users per day; 100+ applicants.

## Tech Stack

_Not decided. To be proposed in the Blueprint phase after research, then approved by the user._
Fixed so far: hosting on **Vercel**; data from the **EXPA API** (believed to be GraphQL, unverified).

## Data Schema

_Draft v0.3 — fields come from `spec_file.txt` (the spec). Every EXPA source below is
UNVERIFIED until the EXPA token is tested (Link phase)._

**Unit of the pool = one application = one card.** A person who applied to 3 jobs appears as
3 cards. Only applications whose status is "applied" are in the pool, and only for oGT
programmes: **GTa and GTe**. Applicants' home MC = AIESEC in India.

### Person fields (EP — Exchange Participant)

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| personId | string | — (internal) | person id | No |
| fullName | string | applicant name | person name | No |
| email | string | email | person email | No |
| phone | string | phone | person contact info | No |
| linkedinUrl | string \| null | link to their linkedin profile | not found in any source yet; card shows "Not available" when null | No |
| cvUrl | string \| null | cv link | `person.cvs { url }` or `person.cv_url` | No |
| homeLc | string | lc | person's home local committee (LC) | No |
| epManagers | list of { name, email, phone } | ep manager | `person.managers` (can be several) | No |

### Application / opportunity fields

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| applicationId | string | — (internal; card key) | application id | No |
| companyName | string \| null | company name | `opportunity.organisation.name` | No |
| startDate | date \| null | duration (actual dates) | application `slot.start_date`, else `opportunity.earliest_start_date` (to confirm) | No |
| endDate | date \| null | duration (actual dates) | application `slot.end_date`, else `opportunity.latest_end_date` (to confirm) | No |
| opportunityField | string \| null | opportunity field = the job's work area (sub-product) | `opportunity.sub_product.name` | No |
| status | string | — (internal; query filter only, not shown) | application `status`; "applied" is probably `open` in the API | No |
| programme | string | — (internal; query filter only) | `opportunity.programme.short_name_display`; GTa or GTe | No |

### Computed values

_None yet. Statistics will be defined in the Blueprint._

### API input/output schemas

_To be written once the EXPA query shape is confirmed._

### Endpoint table

| Method | Path | Purpose | Auth | Input | Output |
|---|---|---|---|---|---|
| _TBD_ | | | | | |

## A.N.T. Architecture Mapping

_Provisional. Folder names depend on the Tech Stack decision. No folders are created until then._

| Layer | Role | Planned location |
|---|---|---|
| Architecture | SOPs in Markdown: goals, inputs, logic, edge cases | `docs/sops/` |
| Navigation | Routing and orchestration: pages, server API routes | framework route folders (TBD) |
| Tools | Deterministic, testable units: EXPA client, data mappers, filters, export | `lib/` or `services/` (TBD) |

## Architectural Invariants

1. The EXPA access token lives only on the server, loaded from environment variables (`.env`
   locally, Vercel settings in production). It is never sent to the browser, logged, or committed.
2. The site is **public, with no login** (user decision, 2026-10-14; data privacy is covered by
   AIESEC in India policy). Revisit only if the user asks.
3. **EXPA is read-only.** The app only runs read queries. It never creates, updates or deletes
   anything on EXPA (no GraphQL mutations).
4. The pool contains **only applications with status "applied"** for **GTa and GTe** opportunities,
   from applicants whose home MC is AIESEC in India, one card per application.
   When an application moves to another status in EXPA, it leaves the pool.
5. `.tmp/` is scratch space only. Nothing in it is a deliverable.

## Behavioral Rules

1. Claude may make technical decisions, but must describe every change and get the user's
   approval **before** making it.
2. Explain in plain, non-technical language. The user is new to building apps. Don't over-explain.
3. Never guess business logic or requirements. Ask.
4. Never push data to EXPA (see Invariant 3).
5. Commit to git after each approved change.
6. No application code until the Blueprint is approved.

## Maintenance Log

| Date | Change | Reason |
|---|---|---|
| 2026-10-14 | Created draft constitution | B.L.A.S.T. Protocol 0 |
| 2026-10-14 | Filled North Star, behavioral rules; added epManager/status/createdAt; invariant 2 → public site; added read-only invariant | Discovery answers |
| 2026-10-14 | Schema v0.1: added companyName, duration, opportunityField, homeRegion; split person vs application fields | `spec_file.txt` received |
| 2026-10-14 | Schema v0.2: one card per application; pool = status "applied" only (invariant 4); removed homeRegion, createdAt; status internal only; filters reduced to LC | User answers to conflicts 3–6 |
| 2026-10-14 | Schema v0.3: likely EXPA paths filled in; duration → startDate/endDate; epManager → epManagers list; added programme (GTa/GTe); LinkedIn "Not available" when missing | EXPA research + user answers |
