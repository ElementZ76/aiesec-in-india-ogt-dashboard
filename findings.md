# Findings

## Discovery answers (2026-10-14)

| # | Question | Answer |
|---|---|---|
| 1 | North Star | One India-wide pool of oGT applicants with an LC filter. Public site, no login. |
| 2 | Integrations / keys | EXPA API. User believes the key is a personal EXPA access token; was told it's GraphQL. |
| 3 | Source of truth | Data lives on EXPA. A written spec will be provided later as a text file. |
| 4 | Delivery payload | Vercel. 20–30 users/day, 100+ applicants. MVP: list + contact info + EP manager + CV link. Done: proper UI + LC/status/date filters + spreadsheet export + statistics. Notes on applicants → later. |
| 5 | Behavioral rules | Claude decides technical choices but gets approval before every change. Plain language, no over-explaining. Never push data to EXPA. Commit to git after each change. |

## Conflicts and resolutions

| # | Conflict | Resolution |
|---|---|---|
| 1 | Claude recommended a shared password because the site shows personal data publicly. | User chose fully public for now; privacy covered by AIESEC policy. Recorded as Invariant 2. |
| 2 | Spec not yet provided, so answers can't be cross-checked. | Pending: cross-check when the spec file arrives. |

## Technical research

_Unverified beliefs to check in Blueprint/Link:_
- EXPA exposes a GraphQL API.
- Personal EXPA tokens may expire. If so, the site breaks until the token is replaced. Must check.
- Unknown whether the token can read all of India or only one LC.
- Unknown whether the token can read phone, CV and EP manager fields.

## Constraints
- EXPA token stays server-side (Invariant 1). Exposing it would let anyone act on EXPA as the token owner.
- Read-only access to EXPA (Invariant 3).
- Public site: anyone with the link can see applicant data (accepted by user).
