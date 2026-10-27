// Frame for the entity list and the login screen: a plain navbar (logo + theme switch) and the footer.
import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeSwitch } from "./NavBar";

export function GateShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="nav-shell">
        <nav className="nav blur" aria-label="Main">
          <Link className="logo" href="/">
            <span className="logo-text">
              <b>AIESEC in India</b>
            </span>
          </Link>
          <div className="nav-right">
            <ThemeSwitch />
          </div>
        </nav>
      </header>
      <main className="gate">{children}</main>
      <footer>
        <div className="wrap">
          <span>
            Built by{" "}
            <a href="https://www.linkedin.com/in/praveen-pr190705/" target="_blank" rel="noopener noreferrer">
              Praveen
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
