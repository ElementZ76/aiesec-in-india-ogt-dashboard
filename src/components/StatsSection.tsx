"use client";
// Statistics: 4 condensed cards; "Top LC" and "Top work area" open the full list
// (drop-down panel on laptops, bottom sheet on phones). They follow the LC filter only (CLAUDE.md UI Spec).
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import type { Count, PoolStats } from "@/lib/pool/stats";
import { useMediaQuery } from "./hooks";

const RING = 289; // circumference of the ring (2π × 46)
const PHONE = "(max-width: 640px)"; // same width as the details popup's bottom sheet
type ListKind = "lc" | "field";

/** A number that glides to its new value (ease-out with a tiny overshoot). */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  // React renders only the first value; later values are animated straight into the DOM.
  const [first] = useState(value);
  useEffect(() => {
    const el = ref.current;
    const from = prev.current;
    prev.current = value;
    if (!el) return;
    if (from === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }
    const t0 = performance.now();
    const ease = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      el.textContent = String(Math.max(0, Math.round(from + (value - from) * ease(p))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = String(value);
    };
  }, [value]);
  return <span ref={ref}>{first}</span>;
}

function Bars({ rows, selected, onPick }: { rows: Count[]; selected: string; onPick: (key: string) => void }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <button
          key={r.key}
          className={`bar-row${r.key === selected ? " on" : ""}`}
          aria-pressed={r.key === selected}
          onClick={() => onPick(r.key)}
        >
          <span className="name" title={r.label}>{r.label}</span>
          <span className="bar">
            <i style={{ width: `${(r.count / max) * 100}%`, animationDelay: `${i * 30}ms` }} />
          </span>
          <span className="n">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const Chevron = () => (
  <svg className="chev-rot" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface Props {
  stats: PoolStats;
  lcId: string;
  lcName: string;
  /** Selected work area ("" = all); only highlights its row in the list, the stats ignore it. */
  field: string;
  onPickLc: (lcId: string) => void;
  onPickField: (field: string) => void;
}

export const StatsSection = memo(function StatsSection({ stats, lcId, lcName, field, onPickLc, onPickField }: Props) {
  const phone = useMediaQuery(PHONE);
  const [open, setOpen] = useState<ListKind | null>(null);
  const [opened, setOpened] = useState(0); // replays the bar animation each time a list opens
  // While the panel or sheet closes, keep showing the list it had.
  const [last, setLast] = useState<ListKind>("lc");
  if (open && open !== last) setLast(open);
  const kind = open ?? last;

  const sheet = useRef<HTMLDialogElement>(null);
  const lcCard = useRef<HTMLButtonElement>(null);
  const fieldCard = useRef<HTMLButtonElement>(null);
  const share = stats.total ? stats.gta / stats.total : 0;
  const topLc = stats.perLc[0];
  const topField = stats.perField[0];

  function toggle(k: ListKind) {
    if (open !== k) setOpened((n) => n + 1);
    setOpen(open === k ? null : k);
  }
  // Closing the laptop panel puts focus back on its card, so keyboard users don't get lost.
  function closePanel() {
    (open === "field" ? fieldCard : lcCard).current?.focus();
    setOpen(null);
  }
  const pick = (onPick: (key: string) => void) => (key: string) => {
    onPick(key);
    if (phone) setOpen(null); // phones: show the filtered applications straight away
  };

  // Phones: the list is a bottom sheet (native <dialog>, like the details popup).
  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    if (phone && open && !d.open) d.showModal();
    if ((!phone || !open) && d.open) d.close();
  }, [phone, open]);

  // Laptops: Esc closes the panel (unless a popup is open; then Esc is closing that one).
  useEffect(() => {
    if (phone || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      (open === "field" ? fieldCard : lcCard).current?.focus();
      setOpen(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [phone, open]);

  const verb = phone ? "tap" : "click";
  const list: ReactNode =
    kind === "lc" ? (
      <>
        <h3 id="stat-list-title">Applications per LC <em>· {verb} one to filter</em></h3>
        <Bars key={`${opened}-lc`} rows={stats.perLc} selected={lcId} onPick={pick(onPickLc)} />
      </>
    ) : (
      <>
        <h3 id="stat-list-title">
          Applications per work area{lcId ? <em> · {lcName}</em> : null} <em>· {verb} one to filter</em>
        </h3>
        <Bars key={`${opened}-field-${lcId}`} rows={stats.perField} selected={field} onPick={pick(onPickField)} />
      </>
    );
  const cardProps = (k: ListKind, rows: Count[]) => ({
    type: "button" as const,
    className: `tile glass t-${k} tile-btn${open === k ? " on" : ""}`,
    "aria-expanded": open === k,
    "aria-controls": phone ? "stat-sheet" : "stat-list",
    "aria-haspopup": phone ? ("dialog" as const) : undefined,
    disabled: rows.length === 0,
    onClick: () => toggle(k),
  });

  return (
    <section id="stats" aria-labelledby="stats-title">
      <div className="stats-head">
        <h2 id="stats-title">Statistics</h2>
        <span className="scope pop" key={lcId}>{lcId ? lcName : "All LCs"}</span>
      </div>

      <div className="tiles">
        <div className="tile glass t-apps">
          <div className="t-head">
            <span className="chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6M8 13h8M8 17h5" />
              </svg>
            </span>
            Applications
          </div>
          <div className="big"><CountUp value={stats.total} /></div>
          <div className="t-foot">
            <span>
              <b><CountUp value={stats.lcCount} /></b> LC{stats.lcCount === 1 ? "" : "s"} ·{" "}
              <b><CountUp value={stats.fieldCount} /></b> work area{stats.fieldCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="tile glass t-prog">
          <div className="t-head">
            <span className="chip duo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9v9z" />
              </svg>
            </span>
            GTa vs GTe
          </div>
          <div className="prog">
            <div className="ring-wrap">
              <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="r-gte" cx="60" cy="60" r="46" style={stats.total ? undefined : { stroke: "var(--bar-track)" }} />
                <circle className="r-gta" cx="60" cy="60" r="46" style={{ strokeDashoffset: RING * (1 - share) }} />
              </svg>
              <div className="ring-center">
                <b><CountUp value={stats.gtaPercent} />%</b>
                <small>GTa</small>
              </div>
            </div>
            <div className="legend">
              <div className="gta"><i className="sw" style={{ background: "var(--gta)" }} />GTa<b><CountUp value={stats.gta} /></b></div>
              <div className="gte"><i className="sw" style={{ background: "var(--gte)" }} />GTe<b><CountUp value={stats.gte} /></b></div>
            </div>
          </div>
          {/* Phones: too narrow for the ring + legend side by side, so a big % and a split bar. */}
          <div className="prog-compact">
            <div className="big"><CountUp value={stats.gtaPercent} />%<small> GTa</small></div>
            <div className="split"><i style={{ width: `${share * 100}%` }} /></div>
            <div className="t-foot">
              <span><b className="n-gta">{stats.gta}</b> GTa · <b className="n-gte">{stats.gte}</b> GTe</span>
            </div>
          </div>
        </div>

        <button ref={lcCard} {...cardProps("lc", stats.perLc)}>
          <span className="t-head">
            <span className="chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            {stats.selected ? "LC rank" : "Top LC"}
          </span>
          {stats.selected ? (
            <span className="rank">
              <span className="big">{stats.selected.rank ? `#${stats.selected.rank}` : "—"}</span>
              <span>of {stats.selected.of}</span>
            </span>
          ) : (
            <span className="t-name" title={topLc?.label}>{topLc?.label ?? "—"}</span>
          )}
          <span className="t-foot">
            {stats.selected ? (
              <span><b>{stats.selected.sharePercent}%</b> of India&apos;s pool</span>
            ) : (
              <span><b>{topLc?.count ?? 0}</b> applications</span>
            )}
            <span className="t-more">All LCs <Chevron /></span>
          </span>
        </button>

        <button ref={fieldCard} {...cardProps("field", stats.perField)}>
          <span className="t-head">
            <span className="chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </span>
            Top work area
          </span>
          <span className="t-name" title={topField?.label}>{topField?.label ?? "—"}</span>
          <span className="t-foot">
            <span><b>{topField?.count ?? 0}</b> applications</span>
            <span className="t-more">All work areas <Chevron /></span>
          </span>
        </button>
      </div>

      {/* Laptops and tablets: the list drops down under the cards. */}
      <div className={`stat-drop${open && !phone ? " open" : ""}`} data-at={kind} id="stat-list" inert={!open || phone}>
        <div>
          <div className="stat-panel" role="region" aria-labelledby={phone ? undefined : "stat-list-title"}>
            {!phone ? (
              <>
                <button className="details-close" onClick={closePanel} aria-label="Close list"><CloseIcon /></button>
                {list}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Phones: the same list in a bottom sheet. */}
      <dialog
        ref={sheet}
        id="stat-sheet"
        className="details stat-sheet"
        aria-labelledby="stat-list-title"
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close(); // a tap on the backdrop
        }}
      >
        {phone ? (
          <div className="details-panel glass">
            <button className="details-close" onClick={() => sheet.current?.close()} aria-label="Close list"><CloseIcon /></button>
            {list}
          </div>
        ) : null}
      </dialog>
    </section>
  );
});
