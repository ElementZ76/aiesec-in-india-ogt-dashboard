# SOP: The CV pool page (`/`)

Layer: Architecture. Code: `src/app/page.tsx` (server: reads the data) → `src/components/PoolApp.tsx`
(browser: search, filter, stats, cards, export) → tools in `src/lib/pool/` and `src/lib/db/read.ts`.
Rules come from `CLAUDE.md` (UI Spec, Data Schema, Invariants 2 and 3). Visual reference:
`docs/design/ui-mockup.html`. If this SOP and the code disagree, fix this SOP first.

## Goal

Show every application in the pool as a card, newest first, with search, an LC filter, statistics
and CSV export, fast on phones and laptops, using only data the sync job wrote to Supabase.

## Inputs

| Input | Where from |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Vercel environment variables / `.env.local` (server only, no `NEXT_PUBLIC_`) |
| `applications` rows | Supabase, read-only key |
| Last successful sync time | `sync_runs.finished_at` of the newest `status = 'success'` row |
| Theme choice | the visitor's browser (`localStorage` key `theme`); dark when unset |

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
2. **Cache meaning.** A visitor gets the cached page. After 5 minutes the next visit triggers a
   background refresh. After 1 hour without visits, the next visit waits for fresh data
   (about 1 s). So the cache never adds more than about 1 hour on top of the sync's own delay.
3. **Search** (`src/lib/pool/search.ts`): case-insensitive "contains" on name, email, company,
   work area, LC and EP manager names. Leading/trailing spaces ignored. Search text is built once
   per card, not on every key press. Typing is kept smooth with `useDeferredValue`.
4. **LC filter**: by `homeLcId`; options sorted by LC name, each with its count. Statistics follow
   the LC filter only; cards and CSV follow search + LC + work area.
4a. **Work-area filter** (`workAreaOptions`, `filterPool` in `search.ts`): by `opportunityField`;
   a missing work area has the key `NO_FIELD`. Options: the work areas present in the
   LC-filtered list, A–Z, each with its count there, "Not specified" last. Its label is
   "Not specified (GTe)" when every application without a work area is GTe, otherwise
   "Not specified". A selected work area that has no cards in the chosen LC stays in the list
   with (0), so the dropdown never shows a value that isn't an option.
5. **Statistics** (`src/lib/pool/stats.ts`), for the LC-filtered list:
   total, number of LCs, number of work areas, GTa vs GTe (count and GTa %), top 3 LCs, or the
   selected LC's rank among all LCs (ties: same count → ordered by name) and its share of the
   whole pool; top 3 work areas. A missing work area counts as "Not specified".
   Breakdown panel: all LCs (whole pool) and all work areas (LC-filtered list). Clicking a row
   filters by it; clicking the selected row again clears that filter.
6. **Cards** (summary) and **details popup**: the card shows name, LC, programme, company, work
   area, dates, View CV and the applied date; the whole card is one button that opens the popup
   (View CV keeps working on its own). The popup is a native `<dialog>` opened with
   `showModal()` (focus moves into it, Esc closes, focus returns to the card); only the selected
   application is rendered in it. EP managers: name, then email and phone rows that exist;
   neither → "No contact details on EXPA".
   12 first; "Load more applications" adds 12. A new search, LC or work-area choice
   goes back to 12. Dates: plain dates shown as "15 Oct 2026"; "Applied" date in India time. Weeks =
   (end − start) / 7 days, rounded. Copy buttons copy email / phone; if the browser blocks copying,
   a message says so.
7. **CSV export** (`src/lib/pool/csv.ts`): the cards matching search + LC + work area (all of them, not just
   the 12 shown). Columns: Applicant name, Company name, EP manager, Email, Phone, LC, Start date,
   End date, CV link, Opportunity field, LinkedIn, Programme, Applied on. Several EP managers are
   joined with "; ". UTF-8 with a byte-order mark (so Excel shows Indian names correctly),
   `\r\n` line ends, every cell in double quotes.
   **Formula guard:** a cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a
   leading `'`, so a spreadsheet shows it as text and never runs it as a formula. This is why
   phone numbers appear as `'+91 …` in Excel.
8. **Footer "Last updated"**: the sync time in India time, e.g. "16 Oct 2026, 12:28 PM IST".
   Checked in the browser every minute: more than 1 hour old, or no successful sync at all →
   amber, "data may be out of date".
9. **States**:
   - pool empty (0 rows): one message, "No applications in the pool right now";
   - nothing matches: "No applications match" + "Clear filters";
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

## Performance rules (CLAUDE.md UI Spec)

Blur only on the navbar. Never render the whole pool (12 + 12 per click). No
`content-visibility: auto`. Animate `transform` / `opacity`. Respect "reduce motion".
