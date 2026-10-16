"use client";
// Floating pill navbar: logo, section links with a sliding highlight, theme switch, Export CSV.
import { useEffect, useRef, type MouseEvent } from "react";
import { setTheme, useTheme, type Theme } from "./hooks";

const SECTIONS = [
  { id: "stats", label: "Statistics" },
  { id: "applications", label: "Applications" },
] as const;

function ThemeSwitch() {
  const theme = useTheme();

  function choose(next: Theme, e: MouseEvent<HTMLButtonElement>) {
    if (next === theme) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return setTheme(next);
    // New theme spreads out in a circle from the click.
    const x = e.clientX;
    const y = e.clientY;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
      ),
    );
  }

  return (
    <div className="theme" role="group" aria-label="Colour theme">
      <span className="thumb" aria-hidden="true" />
      <button aria-pressed={theme === "light"} aria-label="Light mode" title="Light mode" onClick={(e) => choose("light", e)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
      <button aria-pressed={theme === "dark"} aria-label="Dark mode" title="Dark mode" onClick={(e) => choose("dark", e)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </div>
  );
}

export function NavBar({ onExport }: { onExport: () => void }) {
  const shell = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchors = [...(links.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const bar = indicator.current;
    if (!bar || !anchors.length) return;
    let current = anchors[0];
    const move = (a: HTMLAnchorElement) => {
      current = a;
      anchors.forEach((l) => l.classList.toggle("on", l === a));
      bar.style.width = `${a.offsetWidth}px`;
      bar.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    // Highlight the section in the middle of the screen.
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const a = visible && anchors.find((l) => l.hash === `#${visible.target.id}`);
        if (a) move(a);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
    const onClick = (e: Event) => move(e.currentTarget as HTMLAnchorElement);
    anchors.forEach((a) => a.addEventListener("click", onClick));
    // Place it without sliding once the font has loaded (widths change with the font).
    bar.style.transition = "none";
    document.fonts.ready.then(() => {
      move(current);
      requestAnimationFrame(() => (bar.style.transition = ""));
    });
    const onResize = () => move(current);
    const onScroll = () => shell.current?.classList.toggle("scrolled", scrollY > 10);
    addEventListener("resize", onResize);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      spy.disconnect();
      anchors.forEach((a) => a.removeEventListener("click", onClick));
      removeEventListener("resize", onResize);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className="nav-shell" ref={shell}>
      <nav className="nav blur" aria-label="Main">
        <a className="logo" href="#top">
          <span className="logo-text">
            <b>AIESEC in India</b>
          </span>
        </a>
        <span className="divider" aria-hidden="true" />
        <div className="links" ref={links}>
          <span className="indicator" ref={indicator} aria-hidden="true" />
          {SECTIONS.map(({ id, label }) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
        <div className="nav-right">
          <ThemeSwitch />
          <button className="btn btn-primary" onClick={onExport} title="Download the applications currently shown as a spreadsheet (CSV)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            <span className="export-label">Export CSV</span>
            <span className="sr"> (spreadsheet of the applications shown)</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
