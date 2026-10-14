// Link-phase probe: checks what the EXPA API gives us with our token.
// READ-ONLY (CLAUDE.md invariant 3) and prints no personal data: only field names,
// counts, yes/no and LC names.
// Run: node --env-file=.env.local scripts/expa-probe.mjs [step]

const TOKEN = process.env.EXPA_ACCESS_TOKEN;
if (!TOKEN) throw new Error("EXPA_ACCESS_TOKEN is missing. Put it in .env.local.");

const ENDPOINTS = ["https://gis-api.aiesec.org/graphql", "https://expa.aiesec.org/graphql"];
let endpoint = ENDPOINTS[0];

async function gql(query, variables = {}, url = endpoint) {
  if (/\bmutation\b/i.test(query)) throw new Error("Refusing to send a mutation: EXPA is read-only.");
  const res = await fetch(`${url}?access_token=${encodeURIComponent(TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON reply (HTML error page etc.). Report the status only.
  }
  return { status: res.status, json };
}

const errorsOf = (r) => (r.json?.errors ?? []).map((e) => e.message).join(" | ");

async function stepEndpoints() {
  console.log("\n== 1. Which endpoint accepts the token?");
  for (const url of ENDPOINTS) {
    const r = await gql("{ currentPerson { id } }", {}, url);
    const p = r.json?.data?.currentPerson;
    console.log(`${url} -> HTTP ${r.status}; works: ${Boolean(p)}${errorsOf(r) ? `; errors: ${errorsOf(r)}` : ""}`);
    if (p) endpoint = url;
  }
}

const KEYWORDS = /cv|linkedin|social|url|organi[sz]ation|branch|company|sub_product|slot|manager|contact|phone|email|date|status|programme|duration|home_lc|home_mc|profile|link/i;

async function describeType(name, filter = true) {
  const r = await gql(`query($n: String!) { __type(name: $n) { name kind
    fields { name type { name kind ofType { name kind ofType { name kind } } } }
    inputFields { name type { name kind ofType { name kind } } } } }`, { n: name });
  const t = r.json?.data?.__type;
  if (!t) {
    console.log(`${name}: not available (${errorsOf(r) || `HTTP ${r.status}`})`);
    return null;
  }
  const typeName = (ty) => ty?.name ?? (ty?.ofType ? `${ty.kind}<${typeName(ty.ofType)}>` : ty?.kind);
  const list = (t.fields ?? t.inputFields ?? []).filter((f) => !filter || KEYWORDS.test(f.name));
  console.log(`${name}: ${list.map((f) => `${f.name}:${typeName(f.type)}`).join(", ")}`);
  return t;
}

async function stepSchema() {
  console.log("\n== 2. Field names (schema introspection, filtered to relevant ones)");
  for (const n of ["CurrentPerson", "ContactInfo", "CV", "Attachment", "Organisation", "SubProduct", "Office"]) {
    await describeType(n, false);
  }
  for (const n of ["OpportunityApplication", "Person", "Opportunity", "Slot", "PersonProfile"]) {
    await describeType(n);
  }
  console.log("\n-- allOpportunityApplication arguments");
  const r = await gql(`{ __schema { queryType { fields { name args { name type { name kind ofType { name } } } } } } }`);
  const f = r.json?.data?.__schema?.queryType?.fields?.find((x) => x.name === "allOpportunityApplication");
  console.log(f ? f.args.map((a) => `${a.name}:${a.type.name ?? a.type.ofType?.name}`).join(", ") : `not available (${errorsOf(r)})`);
  const filterType = f?.args.find((a) => a.name === "filters");
  if (filterType) await describeType(filterType.type.name ?? filterType.type.ofType?.name, false);
}

const OGT_PROGRAMMES = [8, 9]; // GTa, GTe

async function stepPool() {
  console.log("\n== 3. Which MC is the token owner in?");
  const me = await gql("{ currentPerson { home_lc { id name parent { id name } } } }");
  const lc = me.json?.data?.currentPerson?.home_lc;
  console.log(lc ? `home LC: ${lc.name} (id ${lc.id}); its parent: ${lc.parent?.name} (id ${lc.parent?.id})` : `failed: ${errorsOf(me)}`);
  const mcId = Number(lc?.parent?.id);
  if (!mcId) return;

  console.log("\n== 4. How many oGT (GTa + GTe) applications per status name?");
  for (const status of ["open", "applied", "matched", "accepted", "approved"]) {
    const r = await gql(`query($f: ApplicationFilter) { allOpportunityApplication(filters: $f, per_page: 1) { paging { total_items } } }`,
      { f: { person_home_mc: [mcId], programmes: OGT_PROGRAMMES, status } });
    console.log(`status "${status}": ${r.json?.data?.allOpportunityApplication?.paging?.total_items ?? `error: ${errorsOf(r)}`}`);
  }

  console.log('\n== 5. All "open" applications: LCs covered and how often each field is filled');
  const fields = `id status
    cv { url }
    slot { start_date end_date }
    person { id home_lc { id name } email linkedin_url cv_url cvs { url }
      contact_detail { phone linkedin } managers { full_name email contact_detail { phone } } }
    opportunity { programme { short_name_display } organisation { name } branch { name } sub_product { name }
      earliest_start_date latest_end_date }`;
  const apps = [];
  let page = 1, totalPages = 1;
  const started = Date.now();
  do {
    const r = await gql(`query($f: ApplicationFilter, $p: Int) { allOpportunityApplication(filters: $f, page: $p, per_page: 100) {
      paging { total_pages total_items } data { ${fields} } } }`,
      { f: { person_home_mc: [mcId], programmes: OGT_PROGRAMMES, status: "open" }, p: page });
    const d = r.json?.data?.allOpportunityApplication;
    if (!d) { console.log(`page ${page} failed: ${errorsOf(r) || `HTTP ${r.status}`}`); break; }
    apps.push(...d.data);
    totalPages = d.paging.total_pages;
    page++;
  } while (page <= totalPages);
  console.log(`fetched ${apps.length} applications in ${totalPages} page(s), ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const byLc = {};
  for (const a of apps) byLc[a.person?.home_lc?.name ?? "(none)"] = (byLc[a.person?.home_lc?.name ?? "(none)"] ?? 0) + 1;
  console.log(`distinct LCs: ${Object.keys(byLc).length}`);
  console.log(Object.entries(byLc).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}: ${v}`).join("; "));
  console.log(`distinct people: ${new Set(apps.map((a) => a.person?.id)).size}`);

  const filled = (fn) => {
    const n = apps.filter((a) => { try { const v = fn(a); return Array.isArray(v) ? v.length > 0 : Boolean(v); } catch { return false; } }).length;
    return `${n}/${apps.length}`;
  };
  const checks = {
    "application cv.url": (a) => a.cv?.url,
    "person.cvs[].url": (a) => a.person.cvs?.[0]?.url,
    "person.cv_url": (a) => a.person.cv_url,
    "person.email": (a) => a.person.email,
    "person.contact_detail.phone": (a) => a.person.contact_detail?.phone,
    "person.linkedin_url": (a) => a.person.linkedin_url,
    "person.contact_detail.linkedin": (a) => a.person.contact_detail?.linkedin,
    "person.managers (>=1)": (a) => a.person.managers,
    "managers with email": (a) => a.person.managers?.find((m) => m.email),
    "managers with phone": (a) => a.person.managers?.find((m) => m.contact_detail?.phone),
    "opportunity.organisation.name": (a) => a.opportunity?.organisation?.name,
    "opportunity.branch.name": (a) => a.opportunity?.branch?.name,
    "opportunity.sub_product.name": (a) => a.opportunity?.sub_product?.name,
    "slot.start_date": (a) => a.slot?.start_date,
    "slot.end_date": (a) => a.slot?.end_date,
    "opportunity.earliest_start_date": (a) => a.opportunity?.earliest_start_date,
  };
  for (const [k, fn] of Object.entries(checks)) console.log(`${k.padEnd(34)} ${filled(fn)}`);
  const prog = {};
  for (const a of apps) prog[a.opportunity?.programme?.short_name_display] = (prog[a.opportunity?.programme?.short_name_display] ?? 0) + 1;
  console.log(`programmes: ${JSON.stringify(prog)}`);
  const sameCv = apps.filter((a) => a.cv?.url && a.person.cvs?.some((c) => c.url === a.cv.url)).length;
  console.log(`application CV is one of the person's CVs: ${sameCv}/${apps.filter((a) => a.cv?.url).length}`);
}

// Light fetch: measures speed with few fields and parallel pages, and counts what is left
// after hiding closed LCs and ended slots.
async function stepSize() {
  const mcId = 1585; // India (step 3)
  const fields = "id slot { end_date } person { home_lc { id name } }";
  const today = new Date().toISOString().slice(0, 10);
  for (const [perPage, parallel] of [[100, 1], [500, 1], [100, 5]]) {
    const query = `query($f: ApplicationFilter, $p: Int) { allOpportunityApplication(filters: $f, page: $p, per_page: ${perPage}) {
      paging { total_pages } data { ${fields} } } }`;
    const f = { person_home_mc: [mcId], programmes: OGT_PROGRAMMES, status: "open" };
    const started = Date.now();
    const first = await gql(query, { f, p: 1 });
    const d = first.json?.data?.allOpportunityApplication;
    if (!d) { console.log(`per_page ${perPage}: failed: ${errorsOf(first) || `HTTP ${first.status}`}`); continue; }
    const apps = [...d.data];
    const pages = Array.from({ length: d.paging.total_pages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < pages.length; i += parallel) {
      const batch = await Promise.all(pages.slice(i, i + parallel).map((p) => gql(query, { f, p })));
      for (const r of batch) apps.push(...(r.json?.data?.allOpportunityApplication?.data ?? []));
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const kept = apps.filter((a) => !/^closed\b/i.test(a.person?.home_lc?.name ?? "") && (!a.slot?.end_date || a.slot.end_date >= today));
    const closed = apps.filter((a) => /^closed\b/i.test(a.person?.home_lc?.name ?? "")).length;
    const ended = apps.filter((a) => a.slot?.end_date && a.slot.end_date < today).length;
    console.log(`per_page ${perPage}, ${parallel} at a time: ${apps.length} fetched in ${secs} s | closed-LC: ${closed} | slot ended: ${ended} | left: ${kept.length} in ${new Set(kept.map((a) => a.person?.home_lc?.id)).size} LCs`);
  }
}

process.on("unhandledRejection", (e) => {
  console.error("Probe failed:", e?.message ?? e);
  process.exit(1);
});

const step = process.argv[2] ?? "all";
await stepEndpoints();
if (step === "all" || step === "schema") await stepSchema();
if (step === "all" || step === "pool") await stepPool();
if (step === "size") await stepSize();
