"use client";
// One person = one summary card; clicking it opens the details popup (CLAUDE.md UI Spec).
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDate, formatIndiaDate, initials, weeksBetween } from "@/lib/pool/format";
import { programmesOf } from "@/lib/pool/people";
import type { Match } from "@/lib/pool/search";
import type { PersonApplication, PoolPerson } from "@/lib/pool/types";
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

/** Name, LC and programme badge(s) (card and popup). Both badges when they applied to GTa and GTe. */
export function CardTop({ person, titleId }: { person: PoolPerson; titleId?: string }) {
  return (
    <div className="card-top">
      <div className={`avatar ${person.applications[0].programme}`} aria-hidden="true">{initials(person.fullName)}</div>
      <div className="who">
        <h3 id={titleId} title={person.fullName}>{person.fullName}</h3>
        <div className="lcname">{person.homeLc}</div>
      </div>
      <div className="badges">
        {programmesOf(person.applications).map((p) => <span key={p} className={`badge ${p}`}>{p}</span>)}
      </div>
    </div>
  );
}

/**
 * Company, work area and dates of one application. `full` (popup): also its programme and applied
 * date, and the company links to the opportunity's page on aiesec.org (not on the card, which
 * opens the popup when tapped).
 */
export function JobBlock({ job, full = false }: { job: PersonApplication; full?: boolean }) {
  const weeks = weeksBetween(job.startDate, job.endDate);
  const company = job.companyName ?? "Company not specified";
  return (
    <div className="job">
      <div className="job-head">
        {full && job.opportunityUrl ? (
          <a className="company" href={job.opportunityUrl} target="_blank" rel="noopener noreferrer" aria-label={`${company}: opportunity page on aiesec.org (opens in a new tab)`}>
            {company}
            <Icon name="arrow" size={14} className="arrow" />
          </a>
        ) : (
          <div className="company">{company}</div>
        )}
        {full ? <span className={`badge ${job.programme}`}>{job.programme}</span> : null}
      </div>
      <div className="area">{job.opportunityField ?? <span className="na">Work area not specified</span>}</div>
      <div className="dates">
        <Icon name="cal" size={15} />
        {formatDate(job.startDate)} – {formatDate(job.endDate)}
        {weeks ? <span className="weeks">{weeks} week{weeks === 1 ? "" : "s"}</span> : null}
      </div>
      {full ? <div className="applied">Applied {formatIndiaDate(job.appliedAt)}</div> : null}
    </div>
  );
}

/** View CV button (or "CV not available") and the newest applied date. */
export function CardFoot({ person }: { person: PoolPerson }) {
  const many = person.applications.length > 1;
  return (
    <div className="card-foot">
      {person.cvUrl ? (
        <a className="btn btn-primary" href={person.cvUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="cv" size={17} />
          View CV
          <Icon name="arrow" size={15} className="arrow" />
        </a>
      ) : (
        <button className="btn btn-glass" disabled>CV not available</button>
      )}
      <span className="applied">{many ? "Last applied" : "Applied"} {formatIndiaDate(person.applications[0].appliedAt)}</span>
    </div>
  );
}

export const AppCard = memo(function AppCard({ match, index, animate, onOpen }: {
  match: Match;
  index: number;
  animate: boolean;
  onOpen: (match: Match) => void;
}) {
  // Rise-in animation only for cards that appear on load, filter or page change (not while typing).
  const [enter] = useState(animate);
  const { person, matches } = match;
  const more = person.applications.length - 1;

  return (
    <article className={`card glass${enter ? " enter" : ""}`} style={{ "--i": index % 12 } as CSSProperties}>
      {/* The whole card is one button (stretched over it); View CV sits above it and still works. */}
      <button className="card-open" onClick={() => onOpen(match)} aria-haspopup="dialog" aria-label={`Show applications, contact details and EP manager for ${person.fullName}`} />
      <CardTop person={person} />
      {/* The newest application that matches the search and filters; the rest are in the popup. */}
      <div className="job-group">
        <JobBlock job={matches[0]} />
        {more ? <div className="more">+{more} more application{more === 1 ? "" : "s"}</div> : null}
      </div>
      <div className="card-hint" aria-hidden="true">
        {more ? "Applications, contact & EP manager" : "Contact & EP manager"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <CardFoot person={person} />
    </article>
  );
});
