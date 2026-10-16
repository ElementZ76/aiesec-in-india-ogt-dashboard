"use client";
// Small browser-only hooks. Each has a fixed server value, so server and first browser render match.
import { useSyncExternalStore } from "react";

/** True while the media query matches (false on the server). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

/** Current time, updated once a minute (null on the server). */
export function useMinuteClock(): number | null {
  const minute = useSyncExternalStore(
    (onChange) => {
      const h = setInterval(onChange, 60_000);
      return () => clearInterval(h);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : minute * 60_000;
}

export type Theme = "light" | "dark";

/** The theme on <html data-theme>, set before paint by the script in layout.tsx. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (onChange) => {
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => obs.disconnect();
    },
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Private mode / storage blocked: the theme still applies for this visit.
  }
}
