"use client";
// Page buttons under the cards (CLAUDE.md UI Spec "Paging"). Real links, so Ctrl/middle-click opens
// a page in a new tab; a plain click changes the page without reloading.
import type { MouseEvent, ReactNode } from "react";
import { pageItems } from "@/lib/pool/view";

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={back ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

export function Pagination({ page, pages, hrefFor, onPage }: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;

  function link(to: number, className: string, children: ReactNode, label: string, current = false) {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab / window
      e.preventDefault();
      onPage(to);
    };
    return (
      <a className={className} href={hrefFor(to)} onClick={onClick} aria-label={label} aria-current={current ? "page" : undefined}>
        {children}
      </a>
    );
  }

  // Previous / Next on the first / last page: shown but not clickable, so the row keeps its shape.
  function step(to: number, back: boolean) {
    const word = back ? "Previous" : "Next";
    const inner = back ? <><Chevron back /><span className="pager-word">{word}</span></> : <><span className="pager-word">{word}</span><Chevron /></>;
    return to < 1 || to > pages ? (
      <span className="btn btn-glass pager-step" aria-disabled="true">{inner}</span>
    ) : (
      link(to, "btn btn-glass pager-step", inner, `${word} page`)
    );
  }

  return (
    <nav className="pager" aria-label="Pages">
      {step(page - 1, true)}
      <ol className="pager-list">
        {pageItems(page, pages).map((item, i) =>
          item === "gap" ? (
            <li key={`gap${i}`} className="pager-gap" aria-hidden="true">…</li>
          ) : (
            <li key={item}>{link(item, `pager-num${item === page ? " on" : ""}`, item, `Page ${item}`, item === page)}</li>
          ),
        )}
      </ol>
      {/* Phones: no room for the numbers, so just the position. */}
      <span className="pager-compact">Page <b>{page}</b> of <b>{pages}</b></span>
      {step(page + 1, false)}
    </nav>
  );
}
