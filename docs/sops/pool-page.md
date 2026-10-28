# SOP: The CV pool page (`/<entity>`)

Layer: Architecture. Code: `src/app/[entity]/page.tsx` (server: login check, reads the data) → `src/components/PoolApp.tsx`
(browser: search, filter, stats, cards, export) → tools in `src/lib/pool/` and `src/lib/db/read.ts`.
Rules come from `CLAUDE.md` (UI Spec, Data Schema, Invariants 2 and 3). Visual reference:
`docs/design/ui-mockup.html`. If this SOP and the code disagree, fix this SOP first.

## Goal

Show every applicant in the pool as one card (all their applications inside it), newest
application first, with search, an LC filter, statistics and CSV export, fast on phones and
laptops, using only data the sync job wrote to Supabase.

## Inputs

| Input | Where from |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Vercel environment variables / `.env.local` (server only, no `NEXT_PUBLIC_`) |
| `applications` rows | Supabase, read-only key |
| Last successful sync time | `sync_runs.finished_at` of the newest `status = 'success'` row |
| Theme choice | the visitor's browser (`localStorage` key `theme`); dark when unset |
| `entities` rows (no hashes) + `check_entity_password()` | Supabase, read-only key (`supabase/entities.sql`) |
| `SESSION_SECRET` | Vercel environment variable / `.env.local` (server only) |
| Login cookie `ogt_session` | the visitor's browser |

## Login (before step 1)

- `/` (`src/app/page.tsx`): the entity list from `entities` (cached; `/india` first, then A–Z).
  No applicant data, so it is a static page.
- `/<entity>`: unknown address → 404. The address and the cookie are read inside `<Suspense>`
  (request data; Cache Components rule). Cookie = `slug.version.expiry.signature`
  (`src/lib/auth/session.ts`), HMAC-SHA256 with `SESSION_SECRET`; valid only if the signature
  matches, it has not expired (30 days), its slug is this entity and its version equals the
  entity's current `session_version`. Otherwise: the password box (and "You are logged in as …"
  when the cookie is valid for another entity).
- Log in (server action `login`, `src/app/actions.ts`): the address must be a valid slug and the
  password 1–200 characters; the database compares it with bcrypt and returns the version or null.
  Right → cookie (HttpOnly, Secure on the live site, SameSite=Lax, path `/`, 30 days) and
  redirect to `/<entity>`. Wrong → "Wrong password. Passwords are case-sensitive." (same text for
  an unknown address, so it reveals nothing).
- Log out (server action `logout`): deletes the cookie, back to `/`.
- A password change by the admin bumps `session_version`; the entity list is cached for about a
  minute, so open sessions of that entity end within a few minutes.
- After login: steps 1–10 below, with `applicationsFor(entity, pool)`: an LC gets only rows whose
  `homeLcId` is its `lc_id`; `/india` gets all. The LC filter and the "LCs" list are hidden on an
  LC's page, the statistics label is hidden (the name is under the title), and the CSV is `ogt-cv-pool-<slug>.csv`.
- Known gap: no limit on password attempts.

## Steps

1. **Read (server, `src/lib/db/read.ts`).** Cached with `"use cache"` and
   `cacheLife({ stale: 300, revalidate: 300, expire: 3600 })`:
   - all `applications` rows, ordered `applied_at` desc then `application_id`, in pages of 1000
     (Supabase returns at most 1000 rows per request), until a page comes back short;
   - the newest `success` row of `sync_runs` (filter and sort by `status` / `finished_at` only:
     the website key may read only those two columns);
   - each row becomes a `PoolApplication` (CLAUDE.md). CV and LinkedIn links are checked
     **again** for `http(s)` (the sync already did; this is a second guard before a link is put
     in the page).
   Any Supabase error is thrown, so the page shows the error state (step 8), never half a pool.
1a. **Group by person (server, `src/lib/pool/people.ts`, user 2026-10-28).** After the entity
   filter, `groupByPerson` turns the rows into `PoolPerson`s: the person's details once (taken
   from their newest application; all rows of one person come from the same sync) and their
   applications (company, work area, programme, dates, applied time), newest first. People are
   ordered by their newest application; equal times by application id. This is also what keeps
   the page small: a person's professional experiences travel once, not once per application.
2. **Cache meaning.** A visitor gets the cached page. After 5 minutes the next visit triggers a
   background refresh. After 1 hour without visits, the next visit waits for fresh data
   (about 1 s). So the cache never adds more than about 1 hour on top of the sync's own delay.
3. **Search** (`src/lib/pool/search.ts`): case-insensitive "contains" on name, email, company,
   work area, LC and EP manager names. Leading/trailing spaces ignored. Search text is built once
   per person (person part + one part per application), not on every key press. Typing is kept
   smooth with `useDeferredValue`.
   `filterPool` returns each matching person with **which** of their applications match: an
   application matches when it fits the work-area filter and the search hits either the person
   (name, email, LC, EP manager — then it counts for all their applications) or that application
   (company, work area). A person with no matching application is left out. The matching list
   drives the card's summary (newest matching application), the popup order and the CSV rows.
4. **LC filter**: by `homeLcId`; options sorted by LC name, each with its number of people.
   Statistics follow the LC filter only; cards and CSV follow search + LC + work area.
4a. **Work-area filter** (`workAreaOptions`, `filterPool` in `search.ts`): by `opportunityField`;
   a missing work area has the key `NO_FIELD`. Options: the work areas present in the
   LC-filtered list, A–Z, each with the number of people who have at least one application in it
   (a person counts once per work area), "Not specified" last. Its label is
   "Not specified (GTe)" when every application without a work area is GTe, otherwise
   "Not specified". A selected work area that has no cards in the chosen LC stays in the list
   with (0), so the dropdown never shows a value that isn't an option.
5. **Statistics** (`src/lib/pool/stats.ts`), for the LC-filtered list: number of people (the big
   number on the "Applicants" card) and of applications (under it); everything else counts
   applications (user, 2026-10-28): number of LCs, number of work areas, GTa vs GTe (count and GTa %), applications per LC
   (whole pool; ties: same count → ordered by name) and per work area (LC-filtered list). A
   missing work area counts as "Not specified".
   Shown as 2 cards next to the page title (2026-10-23; stacked under it ≤ 960 px): Applications
   and GTa vs GTe; on `/india`, a label above them names the LC they cover ("All LCs" or the LC).
   On the Applications card, "24 LCs ▾" and "8 work areas ▾" are buttons that open the full
   list: all LCs (whole pool) or all work areas (LC-filtered list). ≥ 641 px: one drop-down panel
   under the title row (`aria-expanded` on the button; same button again, ✕ or Esc closes and
   returns focus to it; the other button switches the list). ≤ 640 px: a bottom sheet (native
   `<dialog>`, same motion as the details popup). Clicking a row filters by it; clicking the
   selected row again clears that filter; on phones the sheet closes after a pick. Empty pool:
   the two list buttons are disabled.
6. **Cards** (summary, one per person) and **details popup**: the card shows name, LC, programme
   badge(s) (both GTa and GTe when the person has both), the company box (company, work area,
   dates) of their newest **matching** application, "+N more applications" when they have more,
   View CV and the applied date ("Last applied" = their newest application, with more than one).
   The whole card is one button that opens the popup (View CV keeps working on its own).
   In the popup, **Applications** comes after the applicant's contacts, the EP managers and the
   languages (so those stay on the first screen even for someone with 15 applications): every application newest first (company + badge, work
   area, dates + weeks, "Applied …"). While the search or filters leave some of the person's
   applications out, the matching ones come first under "Matches your filter (2 of 5)", the rest
   under "Other applications"; nothing is hidden. The popup is a native `<dialog>` opened with
   `showModal()` (focus moves into it, Esc closes, focus returns to the card); only the selected
   person is rendered in it (kept on screen while the popup slides away after closing).
   Motion: the backdrop fades in; the popup glides up and eases to a stop with no bounce (phones:
   a sheet from the bottom edge); closing reverses it, faster. Done with CSS transitions and
   `@starting-style`, so a close during opening reverses smoothly; browsers without support just
   show/hide it. No blue tap highlight on cards, and cards lift on hover only with a real mouse
   (phones treat a tap as a hover that sticks). EP managers: name, then email and phone rows that exist;
   neither → "No contact details on EXPA".
   Below the EP managers: **Languages** (names only, comma-separated; EXPA's 0–4 level has no
   label yet, so it is not shown); after the Applications: **Professional experience(s)**, newest first: title,
   organisation, type · "Mar 2026 – Present" (no end date = Present), then the full description
   with its line breaks kept. Either list empty → "Not available".
   12 cards per page (see 6a). Dates: plain dates shown as "15 Oct 2026"; "Applied" date in India time. Weeks =
   (end − start) / 7 days, rounded. Copy buttons copy email / phone; if the browser blocks copying,
   a message says so.
6a. **Pages and the address** (`src/lib/pool/view.ts`, `Pagination.tsx`; user, 2026-10-28):
   12 cards per page (12 fits 3 / 2 / 1 columns with no half-empty row). Below the cards:
   "‹ Previous · 1 … 4 [5] 6 … 79 · Next ›" — first and last page, the current page and its
   neighbours, "…" for the rest; always 7 buttons once there are more than 7 pages, so the row
   keeps its width. At most 760 px wide: arrows without the words. Phones (≤ 640 px): "‹ Page 5 of
   79 ›". Only 1 page → no buttons. The count line says "Showing 13–24 of 349 applicants".
   Changing page scrolls to the top of the card list (just under the search bar) and moves keyboard
   focus to the count line. A new search, LC or work-area choice goes back to page 1.
   **Address:** search, LC, work area and page are kept in the address, e.g.
   `/india?q=priya&lc=1234&area=Marketing&page=3`; anything at its default is left out. Opening or
   refreshing such an address shows exactly that view. Page buttons are real links (Ctrl/middle
   click opens a new tab). A page, LC or work-area change adds a browser history entry, so Back
   undoes it; typing replaces the current entry once the visitor pauses for 0.4 s (browsers limit
   how often the address may change). The address is changed with `history.pushState` /
   `replaceState`, which Next.js supports without reloading: no data is downloaded again.
7. **CSV export** (`src/lib/pool/csv.ts`): **one row per application**, for the matching
   applications of the people matching search + LC + work area (all of them, not just the 12
   cards shown), in card order. The "Exported N applications" message counts rows. Columns: Applicant name, Company name, EP manager, Email, Phone, LC, Start date,
   End date, CV link, Opportunity field, LinkedIn, Programme, Applied on, Professional
   experiences, Languages. Several EP managers are joined with "; ". Experiences: one line per job
   inside the cell, "Title at Organisation (Type, Mar 2026 – Present)", **without descriptions**
   (24 jobs × ~2,200 characters could pass Excel's 32,767-character cell limit). Languages joined
   with ", ". UTF-8 with a byte-order mark (so Excel shows Indian names correctly),
   `\r\n` line ends, every cell in double quotes.
   **Formula guard:** a cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a
   leading `'`, so a spreadsheet shows it as text and never runs it as a formula. This is why
   phone numbers appear as `'+91 …` in Excel.
8. **Footer "Last updated"**: the sync time in India time, e.g. "16 Oct 2026, 12:28 PM IST".
   Checked in the browser every minute: more than 1 hour old, or no successful sync at all →
   amber, "data may be out of date".
9. **States**:
   - pool empty (0 rows): one message, "No applications in the pool right now";
   - nothing matches: "No applicants match" + "Clear filters";
   - Supabase error: `src/app/error.tsx`, "Couldn't load the pool" + "Try again" (no error
     details shown to visitors);
   - no EP manager / LinkedIn / CV / work area / company: the texts in CLAUDE.md UI Spec.
9a. **Search bar on phones** (`PoolApp.tsx`, CSS class `away`): only when the screen is at most
   760 px wide and the bar is stuck under the navbar. A scroll of at least 8 px down hides it
   (moved up behind the navbar with `transform`, faded out, not clickable); 8 px up shows it.
   Smaller movements are ignored, so a shaky thumb doesn't make it flicker. Focus inside the bar
   (typing, choosing a filter) shows it and keeps it shown. Checked at most once per frame.
10. **Theme**: a tiny script in `<head>` sets `data-theme` before the page paints (no flash);
    dark when nothing is saved. The switch saves the choice in `localStorage`.

## Edge cases

| Case | Behaviour |
|---|---|
| More than 1000 rows | paged read (step 1) |
| Link that isn't http(s) (e.g. `javascript:`) | not rendered as a link; "Not available" / "CV not available" |
| Name with one word / extra spaces | initials from the first two words; one word → one letter |
| Start or end date missing | "—" in its place; no weeks badge |
| Search with no letters (only spaces) | treated as no search |
| Selected LC disappears after a refresh | filter shows 0 matches; "Clear" resets it |
| LC changed to one without the selected work area | work-area option shows (0), 0 matches, "Clear filters" |
| A GTa application without a work area appears | label switches from "Not specified (GTe)" to "Not specified" |
| `localStorage` blocked (private mode) | theme still works for the visit; just not remembered |
| Visitor in another time zone | all dates shown in India time / as stored, never shifted |
| Address asks for a page past the end (`?page=999`, or fewer matches after a sync) | the last page is shown |
| Page number not a whole number ≥ 1 (`?page=abc`, `0`, `2.5`) | page 1 |
| `lc=` in the address of an LC's own page | ignored (that page has no LC filter) |
| Address opened while logged out | password box; after logging in, the pool opens at page 1 with no filters |

## Performance rules (CLAUDE.md UI Spec)

Blur only on the navbar. Never render the whole pool (12 cards per page). No
`content-visibility: auto`. Animate `transform` / `opacity`. Respect "reduce motion".
