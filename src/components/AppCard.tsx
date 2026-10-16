"use client";
// One application = one card (CLAUDE.md UI Spec "Cards").
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDate, formatIndiaDate, initials, telHref, weeksBetween } from "@/lib/pool/format";
import type { PoolApplication } from "@/lib/pool/types";
import { Icon, type IconName } from "./icons";

export type Notify = (text: string, ok?: boolean) => void;

function CopyButton({ value, label, className, icon, notify }: {
  value: string;
  label: string;
  className: "copy" | "icon-btn";
  icon: IconName;
  notify: Notify;
}) {
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
    <button
      className={`${className}${done ? " done" : ""}`}
      onClick={copy}
      aria-label={`Copy ${label} ${value}`}
      title={className === "icon-btn" ? `${value} · click to copy` : "Copy"}
    >
      <Icon name={done ? "check" : icon} size={15} />
    </button>
  );
}

function ContactRow({ icon, value, href, notify }: { icon: IconName; value: string | null; href: string; notify: Notify }) {
  if (!value) {
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
      <CopyButton value={value} label={icon === "mail" ? "email" : "phone"} className="copy" icon="copy" notify={notify} />
    </div>
  );
}

export const AppCard = memo(function AppCard({ app, index, animate, notify }: {
  app: PoolApplication;
  index: number;
  animate: boolean;
  notify: Notify;
}) {
  // Rise-in animation only for cards that appear on load, LC change or "Load more" (not while typing).
  const [enter] = useState(animate);
  const weeks = weeksBetween(app.startDate, app.endDate);

  return (
    <article className={`card glass${enter ? " enter" : ""}`} style={{ "--i": index % 12 } as CSSProperties}>
      <div className="card-top">
        <div className={`avatar ${app.programme}`} aria-hidden="true">{initials(app.fullName)}</div>
        <div className="who">
          <h3 title={app.fullName}>{app.fullName}</h3>
          <div className="lcname">{app.homeLc}</div>
        </div>
        <span className={`badge ${app.programme}`}>{app.programme}</span>
      </div>

      <div className="job">
        <div className="company">{app.companyName ?? "Company not specified"}</div>
        <div className="area">
          {app.opportunityField ?? <span className="na">Work area not specified</span>}
        </div>
        <div className="dates">
          <Icon name="cal" size={15} />
          {formatDate(app.startDate)} – {formatDate(app.endDate)}
          {weeks ? <span className="weeks">{weeks} week{weeks === 1 ? "" : "s"}</span> : null}
        </div>
      </div>

      <div>
        <div className="label">Applicant</div>
        <ContactRow icon="mail" value={app.email} href={`mailto:${app.email}`} notify={notify} />
        <ContactRow icon="phone" value={app.phone} href={app.phone ? telHref(app.phone) : ""} notify={notify} />
        <div className="row">
          <Icon name="linkedin" />
          {app.linkedinUrl ? (
            <a className="val" href={app.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn profile</a>
          ) : (
            <span className="na">Not available</span>
          )}
        </div>
      </div>

      <div>
        <div className="label">EP manager</div>
        {app.epManagers.length ? (
          app.epManagers.map((m, i) => (
            <div className="mgr" key={i}>
              <span className="mname" title={m.name}>{m.name || "Name not on EXPA"}</span>
              {m.email ? <CopyButton value={m.email} label="EP manager email" className="icon-btn" icon="mail" notify={notify} /> : null}
              {m.phone ? <CopyButton value={m.phone} label="EP manager phone" className="icon-btn" icon="phone" notify={notify} /> : null}
            </div>
          ))
        ) : (
          <div className="mgr"><span className="na">No EP manager assigned</span></div>
        )}
      </div>

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
    </article>
  );
});
