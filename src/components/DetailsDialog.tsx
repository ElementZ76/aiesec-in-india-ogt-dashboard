"use client";
// The details popup: one native <dialog> for the whole page (docs/sops/pool-page.md step 6).
import { useEffect, useRef, useState } from "react";
import { formatMonthRange, telHref } from "@/lib/pool/format";
import type { PoolApplication } from "@/lib/pool/types";
import { CardFoot, CardTop, ContactRow, JobBlock, type Notify } from "./AppCard";
import { Icon } from "./icons";

export function DetailsDialog({ app, onClose, notify }: {
  app: PoolApplication | null;
  onClose: () => void;
  notify: Notify;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // While the popup slides away after closing, keep showing the person it was opened for.
  const [last, setLast] = useState(app);
  if (app && app !== last) setLast(app);
  const shown = app ?? last;

  // showModal(): focus moves inside, Esc closes, the page behind is inert. close() returns focus.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (app && !d.open) d.showModal();
    if (!app && d.open) d.close();
  }, [app]);

  return (
    <dialog
      ref={ref}
      className="details"
      aria-labelledby="details-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close(); // a click on the backdrop
      }}
    >
      {shown ? (
        <div className="details-panel glass">
          <button className="details-close" onClick={() => ref.current?.close()} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <CardTop app={shown} titleId="details-title" />
          <JobBlock app={shown} />

          <div>
            <div className="label">Applicant</div>
            <ContactRow icon="mail" value={shown.email} href={`mailto:${shown.email}`} label="email" notify={notify} />
            <ContactRow icon="phone" value={shown.phone} href={shown.phone ? telHref(shown.phone) : ""} label="phone" notify={notify} />
            <div className="row">
              <Icon name="linkedin" />
              {shown.linkedinUrl ? (
                <a className="val" href={shown.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn profile</a>
              ) : (
                <span className="na">Not available</span>
              )}
            </div>
          </div>

          <div>
            <div className="label">EP manager{shown.epManagers.length > 1 ? "s" : ""}</div>
            {shown.epManagers.length ? (
              shown.epManagers.map((m, i) => (
                <div className="mgr-block" key={i}>
                  <div className="mname">{m.name || "Name not on EXPA"}</div>
                  <ContactRow icon="mail" value={m.email} href={`mailto:${m.email}`} label="EP manager email" notify={notify} hideWhenMissing />
                  <ContactRow icon="phone" value={m.phone} href={m.phone ? telHref(m.phone) : ""} label="EP manager phone" notify={notify} hideWhenMissing />
                  {!m.email && !m.phone ? <div className="row"><span className="na">No contact details on EXPA</span></div> : null}
                </div>
              ))
            ) : (
              <div className="row"><span className="na">No EP manager assigned</span></div>
            )}
          </div>

          <div>
            <div className="label">Languages</div>
            {shown.languages.length ? (
              <p className="lang-list">{shown.languages.map((l) => l.name).join(", ")}</p>
            ) : (
              <div className="row"><span className="na">Not available</span></div>
            )}
          </div>

          <div>
            <div className="label">Professional experience{shown.professionalExperiences.length > 1 ? "s" : ""}</div>
            {shown.professionalExperiences.length ? (
              shown.professionalExperiences.map((e, i) => (
                <div className="exp-block" key={i}>
                  <div className="exp-title">{e.title ?? e.organisation}</div>
                  {e.title && e.organisation ? <div className="exp-meta">{e.organisation}</div> : null}
                  <div className="exp-meta">{[e.type, formatMonthRange(e.start, e.end)].filter(Boolean).join(" · ")}</div>
                  {e.description ? <p className="exp-desc">{e.description}</p> : null}
                </div>
              ))
            ) : (
              <div className="row"><span className="na">Not available</span></div>
            )}
          </div>

          <CardFoot app={shown} />
        </div>
      ) : null}
    </dialog>
  );
}
