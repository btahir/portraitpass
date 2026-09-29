import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { DISCLAIMER, SUPPORT_URL } from "../config";

/**
 * The app shell (App.tsx) renders the header and footer once around every route. A page that also
 * renders <SiteHeader/> or <SiteFooter/> inside the shell gets nothing extra, so nothing shows twice.
 * Rendered on its own (for example by a prerender script), they draw themselves.
 */
export const ChromeContext = createContext(false);

type Theme = "light" | "dark";

/** The theme the page is showing right now: an explicit choice, otherwise the system setting. */
function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 38" fill="none" aria-hidden="true">
      <path
        d="M2 11V3h8M24 3h8v8M32 27v8h-8M10 35H2v-8"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <ellipse
        cx="17"
        cy="14"
        rx="5.7"
        ry="6.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 30c.8-6 4.5-8.5 10-8.5S26.2 24 27 30"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ThemeToggle() {
  // Server render and first paint follow the system setting through CSS; the button label
  // catches up once the page is running in the browser.
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => setTheme(currentTheme()), []);
  const flip = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };
  return (
    <button
      className="icon-button"
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={flip}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function SiteHeader({ force = false }: { force?: boolean } = {}) {
  if (useContext(ChromeContext) && !force) return null;
  return (
    <header className="site-header">
      <div className="wrap">
        <a href="/" className="brand" aria-label="PortraitPass home">
          <BrandMark />
          <span>
            PortraitPass<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="/documents/">Documents</a>
          <a className="nav-extra" href="/print-passport-photos/">
            Print for 40¢
          </a>
          <a className="nav-extra" href="/about/">
            About
          </a>
          <a href={SUPPORT_URL}>Support</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ force = false }: { force?: boolean } = {}) {
  if (useContext(ChromeContext) && !force) return null;
  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/documents/">Documents</a>
          <a href="/print-passport-photos/">Print guide</a>
          <a href="/about/">About</a>
          <a href="/privacy/">Privacy</a>
          <a href="/terms/">Terms</a>
          <a href="/accessibility/">Accessibility</a>
          <a href={SUPPORT_URL}>Support</a>
          <a href="/llms.txt">For agents</a>
        </nav>
        <p className="footer-legal">
          {DISCLAIMER} Some authorities, such as Canada and Germany, only accept
          photos from professional or certified providers.
        </p>
      </div>
    </footer>
  );
}
