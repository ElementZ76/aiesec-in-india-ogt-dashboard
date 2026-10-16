"use client";
// One application = one summary card; clicking it opens the details popup (CLAUDE.md UI Spec).
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDate, formatIndiaDate, initials, weeksBetween } from "@/lib/pool/format";
import type { PoolApplication } from "@/lib/pool/types";
import { Icon, type IconName } from "./icons";

export type Notify = (text: string, ok?: boolean) => void;

export function CopyButton({ value, label, notify }: { value: string; label: string; notify: Notify }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      notify(`Copied ${value}`);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1300);
    } catch {
      notify("Copy not allowed here", false);
    }
  }

  return (
    <button className={`copy${done ? " done" : ""}`} onClick={copy} aria-label={`Copy ${label} ${value}`} title="Copy">
      <Icon name={done ? "check" : "copy"} size={15} />
    </button>
  );
}

/** One contact line: icon, value as a link, copy button. Missing value → "Not available" (or nothing). */
export function ContactRow({ icon, value, href, label, notify, hideWhenMissing = false }: {
  icon: IconName;
  value: string | null;
  href: string;
  label: string;
  notify: Notify;
  hideWhenMissing?: boolean;
}) {
  if (!value) {
    if (hideWhenMissing) return null;
    return (
      <div className="row">
        <Icon name={icon} />
        <span className="na">Not available</span>
      </div>
    );
  }
  return (
    <div className="row">
      <Icon name={icon} />
      <a className="val" href={href}>{value}</a>
      <CopyButton value={value} label={label} notify={notify} />
    </div>
  );
}

/** Name, LC and programme badge (card and popup). */
export function CardTop({ app, titleId }: { app: PoolApplication; titleId?: string }) {
  return (
    <div className="card-top">
      <div className={`avatar ${app.programme}`} aria-hidden="true">{initials(app.fullName)}</div>
      <div className="who">
        <h3 id={titleId} title={app.fullName}>{app.fullName}</h3>
        <div className="lcname">{app.homeLc}</div>
      </div>
      <span className={`badge ${app.programme}`}>{app.programme}</span>
    </div>
  );
}

/** Company, work area and dates (card and popup). */
export function JobBlock({ app }: { app: PoolApplication }) {
  const weeks = weeksBetween(app.startDate, app.endDate);
  return (
    <div className="job">
      <div className="company">{app.companyName ?? "Company not specified"}</div>
      <div className="area">{app.opportunityField ?? <span className="na">Work area not specified</span>}</div>
      <div className="dates">
        <Icon name="cal" size={15} />
        {formatDate(app.startDate)} – {formatDate(app.endDate)}
        {weeks ? <span className="weeks">{weeks} week{weeks === 1 ? "" : "s"}</span> : null}
      </div>
    </div>
  );
}

/** View CV button (or "CV not available") and the applied date. */
export function CardFoot({ app }: { app: PoolApplication }) {
  return (
    <div className="card-foot">
      {app.cvUrl ? (
        <a className="btn btn-primary" href={app.cvUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="cv" size={17} />
          View CV
          <Icon name="arrow" size={15} className="arrow" />
        </a>
      ) : (
        <button className="btn btn-glass" disabled>CV not available</button>
      )}
      <span className="applied">Applied {formatIndiaDate(app.appliedAt)}</span>
    </div>
  );
}

export const AppCard = memo(function AppCard({ app, index, animate, onOpen }: {
  app: PoolApplication;
  index: number;
  animate: boolean;
  onOpen: (app: PoolApplication) => void;
}) {
  // Rise-in animation only for cards that appear on load, filter change or "Load more" (not while typing).
  const [enter] = useState(animate);

  return (
    <article className={`card glass${enter ? " enter" : ""}`} style={{ "--i": index % 12 } as CSSProperties}>
      {/* The whole card is one button (stretched over it); View CV sits above it and still works. */}
      <button className="card-open" onClick={() => onOpen(app)} aria-haspopup="dialog" aria-label={`Show contact details and EP manager for ${app.fullName}`} />
      <CardTop app={app} />
      <JobBlock app={app} />
      <div className="card-hint" aria-hidden="true">
        Contact &amp; EP manager
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <CardFoot app={app} />
    </article>
  );
});
