"use client";
// The pool page in the browser: search, LC filter, stats, cards, pages, CSV export (docs/sops/pool-page.md).
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toCsv } from "@/lib/pool/csv";
import { formatIndiaDateTime, isStale } from "@/lib/pool/format";
import { filterPool, indexPool, lcOptions, workAreaOptions } from "@/lib/pool/search";
import { computeStats } from "@/lib/pool/stats";
import type { PoolApplication } from "@/lib/pool/types";
import { PAGE_SIZE, pageCount, parseView, viewSearch, type View } from "@/lib/pool/view";
import { AppCard, type Notify } from "./AppCard";
import { DetailsDialog } from "./DetailsDialog";
import { useMediaQuery, useMinuteClock } from "./hooks";
import { Icon, IconSprite } from "./icons";
import { NavBar } from "./NavBar";
import { Pagination } from "./Pagination";
import { StatsSection } from "./StatsSection";

const plural = (n: number) => `application${n === 1 ? "" : "s"}`;

function LastUpdated({ at }: { at: string | null }) {
  const now = useMinuteClock(); // null on the server, so the first render matches
  const stale = now !== null && isStale(at, now);
  const when = at ? formatIndiaDateTime(at) : "unknown";
  return (
    <span className={stale ? "stale" : undefined}>
      {stale ? `⚠ Last updated ${when} · data may be out of date` : `Last updated ${when}`}
    </span>
  );
}

// The toast lives in the browser's "top layer" (popover), so it also shows above the details popup.
// Re-opening it on each message puts it above a popup opened after it.
function Toast({ toast }: { toast: { id: number; text: string; ok: boolean; show: boolean } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== "function") return; // older browsers: a normal fixed element
    if (el.matches(":popover-open")) el.hidePopover();
    el.showPopover();
  }, [toast.id]);
  return (
    <div ref={ref} popover="manual" className={`toast glass${toast.show ? " show" : ""}`} role="status">
      {toast.ok && toast.text ? <Icon name="check" size={15} /> : null}
      {toast.text}
    </div>
  );
}

/** The logged-in entity. `allLcs` = the all-India login; otherwise the page covers one LC. */
export interface PageEntity {
  slug: string;
  name: string;
  allLcs: boolean;
}

export function PoolApp({ applications, lastUpdated, entity, initialView }: {
  applications: PoolApplication[];
  lastUpdated: string | null;
  entity: PageEntity;
  initialView: View; // from the address, e.g. ?q=priya&page=3
}) {
  // Search, filters and page start from the address and are written back to it (SOP step 6a).
  // An LC's own page has no LC filter, so an "lc" in its address is ignored.
  const [query, setQuery] = useState(initialView.query);
  const [lcId, setLcId] = useState(entity.allLcs ? initialView.lcId : "");
  const [field, setField] = useState(initialView.field); // work area; "" = all
  const [page, setPage] = useState(initialView.page);
  const addressMode = useRef<"push" | "replace" | null>(null); // how the next change is written to the address
  const [animate, setAnimate] = useState(true);
  const [toast, setToast] = useState({ id: 0, text: "", ok: true, show: false });
  const [selected, setSelected] = useState<PoolApplication | null>(null); // card shown in the popup
  const closeDetails = useCallback(() => setSelected(null), []);
  const controls = useRef<HTMLDivElement>(null);
  const listTop = useRef<HTMLElement>(null);
  const countLine = useRef<HTMLDivElement>(null);
  const narrow = useMediaQuery("(max-width: 760px)");

  // Typing stays smooth: the input updates at once, the card list a moment later if needed.
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => indexPool(applications), [applications]);
  const options = useMemo(() => lcOptions(applications), [applications]);
  const lcList = useMemo(() => (lcId ? applications.filter((a) => a.homeLcId === lcId) : applications), [applications, lcId]);
  const fieldOpts = useMemo(() => workAreaOptions(lcList, field), [lcList, field]);
  const matches = useMemo(
    () => filterPool(index, { query: deferredQuery, lcId, field }),
    [index, deferredQuery, lcId, field],
  );
  const stats = useMemo(() => computeStats(applications, lcId), [applications, lcId]);
  const lcName = options.find((o) => o.id === lcId)?.name ?? "";
  const pages = pageCount(matches.length);
  const current = Math.min(page, pages); // the address may ask for a page that no longer exists
  const first = (current - 1) * PAGE_SIZE;
  const visible = matches.slice(first, first + PAGE_SIZE);
  const active = query.trim() !== "" || lcId !== "" || field !== "";

  const notify: Notify = useCallback((text, ok = true) => {
    setToast((t) => ({ id: t.id + 1, text, ok, show: true }));
  }, []);
  useEffect(() => {
    if (!toast.show) return;
    const h = setTimeout(() => setToast((t) => (t.id === toast.id ? { ...t, show: false } : t)), 1600);
    return () => clearTimeout(h);
  }, [toast.id, toast.show]);

  // A new LC or work area starts again at page 1 and gets its own history entry (Back undoes it).
  const chooseLc = useCallback((id: string) => {
    addressMode.current = "push";
    setLcId(id);
    setPage(1);
    setAnimate(true);
  }, []);
  const pickLcFromBreakdown = useCallback((id: string) => {
    addressMode.current = "push";
    setLcId((cur) => (cur === id ? "" : id));
    setPage(1);
    setAnimate(true);
  }, []);
  const chooseField = useCallback((id: string) => {
    addressMode.current = "push";
    setField(id);
    setPage(1);
    setAnimate(true);
  }, []);
  const pickFieldFromBreakdown = useCallback((id: string) => {
    addressMode.current = "push";
    setField((cur) => (cur === id ? "" : id));
    setPage(1);
    setAnimate(true);
  }, []);
  function clearAll() {
    setQuery("");
    setField("");
    chooseLc("");
  }

  function goToPage(n: number) {
    addressMode.current = "push";
    setPage(n);
    setAnimate(true);
    // The new page starts at its first card, just under the search bar. Keyboard focus moves to the
    // "Showing 13–24 of …" line, so it is not left on a button far below.
    listTop.current?.scrollIntoView({ block: "start" });
    countLine.current?.focus({ preventScroll: true });
  }
  const hrefFor = (n: number) => `/${entity.slug}${viewSearch({ query, lcId, field, page: n })}`;

  // Keep the address in step with the search, filters and page. Typing replaces the current history
  // entry once the visitor pauses (browsers limit how often the address may change); everything
  // else adds an entry, so Back returns to the previous page or filter.
  useEffect(() => {
    const mode = addressMode.current;
    if (!mode) return; // first load or Back/Forward: the address is already right
    addressMode.current = null;
    const url = `/${entity.slug}${viewSearch({ query, lcId, field, page })}`;
    const write = () => {
      if (url === location.pathname + location.search) return;
      try {
        if (mode === "push") history.pushState(null, "", url);
        else history.replaceState(null, "", url);
      } catch {
        // over the browser's limit: the address catches up on the next change
      }
    };
    if (mode === "push") return write();
    const h = setTimeout(write, 400);
    return () => clearTimeout(h);
  }, [entity.slug, query, lcId, field, page]);

  // Back / Forward: show what that address describes.
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(location.search);
      const v = parseView((k) => params.get(k));
      addressMode.current = null;
      setQuery(v.query);
      setLcId(entity.allLcs ? v.lcId : "");
      setField(v.field);
      setPage(v.page);
      setAnimate(true);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [entity.allLcs]);

  function exportCsv() {
    const rows = filterPool(index, { query, lcId, field }); // exactly what the filters say right now
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `ogt-cv-pool-${entity.slug}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${rows.length} ${plural(rows.length)}`);
  }

  // The search bar turns into solid glass once it sticks under the navbar.
  useEffect(() => {
    const el = controls.current;
    if (!el) return;
    const css = getComputedStyle(document.documentElement);
    const px = (name: string, fallback: number) => parseFloat(css.getPropertyValue(name)) || fallback;
    const top = Math.round(px("--nav-h", 68) + px("--nav-top", 14) + 11);
    const obs = new IntersectionObserver(([e]) => el.classList.toggle("stuck", e.intersectionRatio < 1), {
      rootMargin: `-${top}px 0px 0px 0px`,
      threshold: 1,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Phones: the stuck search bar slides away while scrolling down, back on scrolling up
  // (docs/sops/pool-page.md step 9a).
  useEffect(() => {
    const el = controls.current;
    if (!el) return;
    const phone = matchMedia("(max-width: 760px)");
    const STEP = 8; // px; smaller movements are ignored so the bar doesn't flicker
    let lastY = scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = scrollY;
      if (!phone.matches || !el.classList.contains("stuck") || el.contains(document.activeElement)) {
        el.classList.remove("away");
        lastY = y;
        return;
      }
      if (Math.abs(y - lastY) < STEP) return; // keep lastY, so slow scrolling still adds up
      el.classList.toggle("away", y > lastY);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const show = () => el.classList.remove("away");
    addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("focusin", show);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      el.removeEventListener("focusin", show);
    };
  }, []);

  return (
    <>
      <IconSprite />
      <NavBar onExport={exportCsv} entityName={entity.name} />

      <main className="wrap">
        {/* Title on the left, the 2 statistics cards on the right (stacked on narrow screens). */}
        <div className="hero" id="top">
          <div className="hero-title">
            <h1>oGT <span>CV Pool</span></h1>
            <p className="hero-entity">{entity.name}</p>
          </div>
          <StatsSection
            stats={stats}
            lcId={lcId}
            lcName={lcName}
            field={field}
            onPickLc={pickLcFromBreakdown}
            onPickField={pickFieldFromBreakdown}
            singleLc={entity.allLcs ? undefined : entity.name}
          />
        </div>

        <section id="applications" aria-label="Applications" ref={listTop}>
          <div className="controls" ref={controls}>
            <div className="controls-inner">
              <label className="field search">
                <span className="sr">Search</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    addressMode.current = "replace";
                    setQuery(e.target.value);
                    setPage(1);
                    setAnimate(false);
                  }}
                  placeholder={narrow ? "Search" : "Search name, email, company, work area, EP manager…"}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {/* An LC's own page covers one LC, so it has no LC filter. */}
              {entity.allLcs ? (
                <label className="field lc">
                  <span className="sr">Filter by LC</span>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <select value={lcId} onChange={(e) => chooseLc(e.target.value)}>
                    <option value="">All LCs ({applications.length})</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.count})
                      </option>
                    ))}
                    {lcId && !lcName ? <option value={lcId}>LC no longer in the pool (0)</option> : null}
                  </select>
                  <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </label>
              ) : null}
              <label className="field area">
                <span className="sr">Filter by work area</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
                <select value={field} onChange={(e) => chooseField(e.target.value)}>
                  <option value="">All work areas ({lcList.length})</option>
                  {fieldOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.count})
                    </option>
                  ))}
                </select>
                <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </label>
              {active ? (
                <button className="btn btn-glass clear" onClick={clearAll} aria-label="Clear search and LC filter">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                  <span className="clear-label">Clear</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="count" aria-live="polite" ref={countLine} tabIndex={-1}>
            Showing <b>{visible.length > 1 ? `${first + 1}–${first + visible.length}` : visible.length ? first + 1 : 0}</b> of{" "}
            <b>{matches.length}</b> {plural(matches.length)} · newest first
          </div>

          <div className="grid" key={`${lcId}|${field}`}>
            {visible.length ? (
              visible.map((a, i) => <AppCard key={a.applicationId} app={a} index={i} animate={animate} onOpen={setSelected} />)
            ) : applications.length ? (
              <div className="empty glass">
                <h3>No applications match</h3>
                <p>Try a different search or LC.</p>
                <button className="btn btn-primary" onClick={clearAll}>Clear filters</button>
              </div>
            ) : (
              <div className="empty glass">
                <h3>No applications in the pool right now</h3>
                <p>New applications appear here after the next update.</p>
              </div>
            )}
          </div>

          <Pagination page={current} pages={pages} hrefFor={hrefFor} onPage={goToPage} />
        </section>
      </main>

      <footer>
        <div className="wrap">
          <LastUpdated at={lastUpdated} />
          <span>
            Built by{" "}
            <a href="https://www.linkedin.com/in/praveen-pr190705/" target="_blank" rel="noopener noreferrer">
              Praveen
            </a>
          </span>
        </div>
      </footer>
      <DetailsDialog app={selected} onClose={closeDetails} notify={notify} />
      <Toast toast={toast} />
    </>
  );
}
