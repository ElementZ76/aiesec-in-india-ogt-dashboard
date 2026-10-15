// Fetches every pool candidate from EXPA (read-only). Field paths verified 2026-10-14/15
// (findings.md "EXPA probe results").
import type { ExpaClient } from "./client";

export const INDIA_MC_ID = 1585;
export const OGT_PROGRAMME_IDS = [8, 9]; // GTa, GTe
export const PER_PAGE = 100;
export const PARALLEL_PAGES = 5;

/** The shape EXPA returns for one application (only the fields we ask for; any can be null). */
export interface RawApplication {
  id: string | number | null;
  status: string | null;
  created_at: string | null;
  slot: { start_date: string | null; end_date: string | null } | null;
  person: {
    id: string | number | null;
    full_name: string | null;
    email: string | null;
    linkedin_url: string | null;
    cv_url: string | null;
    home_lc: { id: string | number | null; name: string | null } | null;
    contact_detail: { phone: string | null; country_code: string | null } | null;
    managers: {
      full_name: string | null;
      email: string | null;
      contact_detail: { phone: string | null; country_code: string | null } | null;
    }[] | null;
  } | null;
  opportunity: {
    programme: { short_name_display: string | null } | null;
    organisation: { name: string | null } | null;
    sub_product: { name: string | null } | null;
    earliest_start_date: string | null;
    latest_end_date: string | null;
  } | null;
}

export const APPLICATIONS_QUERY = `query PoolApplications($filters: ApplicationFilter, $page: Int, $perPage: Int) {
  allOpportunityApplication(filters: $filters, page: $page, per_page: $perPage) {
    paging { total_items total_pages }
    data {
      id status created_at
      slot { start_date end_date }
      person {
        id full_name email linkedin_url cv_url
        home_lc { id name }
        contact_detail { phone country_code }
        managers { full_name email contact_detail { phone country_code } }
      }
      opportunity {
        programme { short_name_display }
        organisation { name }
        sub_product { name }
        earliest_start_date latest_end_date
      }
    }
  }
}`;

interface PageResult {
  allOpportunityApplication: {
    paging: { total_items: number; total_pages: number };
    data: RawApplication[];
  };
}

export interface FetchResult {
  items: RawApplication[];
  /** What EXPA said the total is (page 1). */
  totalItems: number;
  /** Records dropped because the same id came back twice (pages shifting during the fetch). */
  duplicates: number;
}

export async function fetchPoolCandidates(client: ExpaClient): Promise<FetchResult> {
  const filters = { person_home_mc: [INDIA_MC_ID], programmes: OGT_PROGRAMME_IDS, status: "open" };
  const getPage = (page: number) =>
    client.query<PageResult>(APPLICATIONS_QUERY, { filters, page, perPage: PER_PAGE }).then((r) => r.allOpportunityApplication);

  const first = await getPage(1);
  const pages = [first];
  const rest = Array.from({ length: Math.max(0, first.paging.total_pages - 1) }, (_, i) => i + 2);
  for (let i = 0; i < rest.length; i += PARALLEL_PAGES) {
    pages.push(...(await Promise.all(rest.slice(i, i + PARALLEL_PAGES).map(getPage))));
  }

  const seen = new Set<string>();
  const items: RawApplication[] = [];
  let duplicates = 0;
  for (const item of pages.flatMap((p) => p.data ?? [])) {
    const key = String(item.id);
    if (seen.has(key)) duplicates++;
    else {
      seen.add(key);
      items.push(item);
    }
  }
  return { items, totalItems: first.paging.total_items, duplicates };
}
