"use client";
// Statistics: 4 tiles + Breakdown panel. They follow the LC filter only (CLAUDE.md UI Spec).
import { memo, useEffect, useRef, useState } from "react";
import type { Count, PoolStats } from "@/lib/pool/stats";

const RING = 289; // circumference of the ring (2π × 46)

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

function Mini({ rows }: { rows: Count[] }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div className="mini">
      {rows.slice(0, 3).map((r, i) => (
        <div className="mini-row" key={r.key}>
          <span className="name" title={r.label}>{r.label}</span>
          <span className="n">{r.count}</span>
          <span className="bar">
            <i style={{ width: `${(r.count / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Bars({ rows, selected, onPick }: { rows: Count[]; selected?: string; onPick?: (key: string) => void }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div className="bars">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span className="name" title={r.label}>{r.label}</span>
            <span className="bar">
              <i style={{ width: `${(r.count / max) * 100}%`, animationDelay: `${i * 30}ms` }} />
            </span>
            <span className="n">{r.count}</span>
          </>
        );
        return onPick ? (
          <button
            key={r.key}
            className={`bar-row${r.key === selected ? " on" : ""}`}
            aria-pressed={r.key === selected}
            onClick={() => onPick(r.key)}
          >
            {inner}
          </button>
        ) : (
          <div key={r.key} className="bar-row">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  stats: PoolStats;
  lcId: string;
  lcName: string;
  onPickLc: (lcId: string) => void;
}

export const StatsSection = memo(function StatsSection({ stats, lcId, lcName, onPickLc }: Props) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(0); // replays the bar animation each time it opens
  const share = stats.total ? stats.gta / stats.total : 0;

  return (
    <section id="stats" aria-labelledby="stats-title">
      <div className="stats-head">
        <h2 id="stats-title">Statistics</h2>
        <span className="scope pop" key={lcId}>{lcId ? lcName : "All LCs"}</span>
        <button
          className="btn btn-glass"
          aria-expanded={open}
          aria-controls="breakdown"
          onClick={() => {
            setOpen(!open);
            if (!open) setOpened(opened + 1);
          }}
        >
          Breakdown
          <svg className="chev-rot" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
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
            across <b><CountUp value={stats.lcCount} /></b> LC{stats.lcCount === 1 ? "" : "s"} ·{" "}
            <b><CountUp value={stats.fieldCount} /></b> work area{stats.fieldCount === 1 ? "" : "s"}
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
        </div>

        <div className="tile glass t-lc">
          <div className="t-head">
            <span className="chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            {stats.selected ? "LC rank" : "Top LCs"}
          </div>
          {stats.selected ? (
            <>
              <div className="rank">
                <span className="big">{stats.selected.rank ? `#${stats.selected.rank}` : "—"}</span>
                <span>of {stats.selected.of} LCs</span>
              </div>
              <div className="t-foot"><b>{stats.selected.sharePercent}%</b> of India&apos;s pool</div>
            </>
          ) : (
            <Mini rows={stats.perLc} />
          )}
        </div>

        <div className="tile glass t-field">
          <div className="t-head">
            <span className="chip teal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </span>
            Top work areas
          </div>
          <Mini key={lcId} rows={stats.perField} />
        </div>
      </div>

      <div className={`breakdown-wrap${open ? " open" : ""}`} id="breakdown" inert={!open}>
        <div>
          <div className="breakdown" key={`${opened}-${lcId}`}>
            <div className="panel glass">
              <h3>Applications per LC <em>· click one to filter</em></h3>
              <Bars rows={stats.perLc} selected={lcId} onPick={onPickLc} />
            </div>
            <div className="panel glass">
              <h3>Applications per work area{lcId ? <em> · {lcName}</em> : null}</h3>
              <Bars rows={stats.perField} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
