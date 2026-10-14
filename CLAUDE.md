# Project Constitution — AIESEC in India oGT CV Pool

> **This file is LAW.** If code and this file disagree, the code is wrong or this file must be
> updated first (with a Maintenance Log row). Status: **DRAFT — Blueprint not yet approved.**

## North Star

A public website, hosted on Vercel, showing **one India-wide pool** of every AIESEC in India oGT
(outgoing Global Talent) applicant, filterable by local committee (LC). For each applicant it
shows name, phone, email, LinkedIn, CV link and EP manager. Data is read live from EXPA.

- **Spec:** `spec_file.txt` lists the 10 fields each applicant shows (see Data Schema).
- **Bare minimum (MVP):** the applicant list with contact info, EP manager and CV link.
- **Done:** the MVP with a proper UI, plus filters (LC, status, date), spreadsheet export and
  statistics.
- Functional reference: https://ogtbardo.vercel.app/cv-pool (same function, different look).
- Expected load: 20–30 users per day; 100+ applicants.

## Tech Stack

_Not decided. To be proposed in the Blueprint phase after research, then approved by the user._
Fixed so far: hosting on **Vercel**; data from the **EXPA API** (believed to be GraphQL, unverified).

## Data Schema

_Draft v0.1 — fields come from `spec_file.txt` (the spec). Every EXPA source below is
UNVERIFIED until the EXPA token is tested (Link phase)._

**Open question (see findings.md, conflict 3):** is one row in the pool one *person* or one
*application*? The spec mixes person fields with job fields (company, duration, opportunity
field), and one person may apply to several jobs.

### Person fields (EP — Exchange Participant)

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| id | string | — (internal) | person id | No |
| fullName | string | applicant name | person name | No |
| email | string | email | person email | No |
| phone | string | phone | person contact info | No |
| linkedinUrl | string \| null | link to their linkedin profile | person profile / social links | No |
| cvUrl | string \| null | cv link | person CV attachment | No |
| homeRegion | string | region and lc | region the home LC belongs to | No |
| homeLc | string | region and lc | person's home local committee (LC) | No |
| epManager | string \| null | ep manager | person's assigned EP manager | No |

### Application / opportunity fields

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| companyName | string \| null | company name | opportunity's host organisation | No |
| duration | string \| null | duration | opportunity duration (weeks?) | No |
| opportunityField | string \| null | opportunity field | opportunity's work field / background | No |
| status | string | — (needed for status filter) | application status | No |
| createdAt | date | — (needed for date filter) | application or sign-up date | No |

### Computed values

_None yet. Statistics (counts per LC/status) will be defined in the Blueprint._

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
4. `.tmp/` is scratch space only. Nothing in it is a deliverable.

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
