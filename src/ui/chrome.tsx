import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SUPPORT_URL } from "../config";
import { DEFAULT_LOCALE, LOCALES, localeOf, switchTargets, withLocale } from "../i18n";
import { strings } from "../i18n/strings";

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

function ThemeToggle({ locale }: { locale: ReturnType<typeof localeOf> }) {
  const t = strings(locale).chrome;
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
        theme === "dark" ? t.themeToLight : t.themeToDark
      }
      onClick={flip}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/** `lang`/`hrefLang` for a link whose text is in the page language but whose target is English-only. */
const toEnglish = (locale: string) =>
  locale === DEFAULT_LOCALE ? {} : { hrefLang: LOCALES[DEFAULT_LOCALE].hreflang };

/**
 * `path` is the page being shown (normalized, e.g. "/es/documents/"); it selects the language of
 * the chrome and the target of the language switcher.
 */
export function SiteHeader({ force = false, path = "/" }: { force?: boolean; path?: string } = {}) {
  if (useContext(ChromeContext) && !force) return null;
  const locale = localeOf(path);
  const t = strings(locale).chrome;
  const other = switchTargets(path).filter((x) => !x.current);
  return (
    <header className="site-header">
      <div className="wrap">
        <a href="/" className="brand" aria-label={t.homeLabel} {...toEnglish(locale)}>
          <BrandMark />
          <span>
            PortraitPass<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </a>
        <nav className="site-nav" aria-label={t.mainNav}>
          <a href={withLocale("/documents/", locale)}>{t.documents}</a>
          <a className="nav-extra" href={withLocale("/print-passport-photos/", locale)}>
            {t.printShort}
          </a>
          <a className="nav-extra" href="/about/" {...toEnglish(locale)}>
            {t.about}
          </a>
          <a href={SUPPORT_URL} {...toEnglish(locale)}>
            {t.support}
          </a>
          {other.map((x) => (
            <a
              key={x.locale}
              className="nav-extra lang-link"
              href={x.path}
              lang={LOCALES[x.locale].hreflang}
              hrefLang={LOCALES[x.locale].hreflang}
            >
              {x.name}
            </a>
          ))}
          <ThemeToggle locale={locale} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ force = false, path = "/" }: { force?: boolean; path?: string } = {}) {
  if (useContext(ChromeContext) && !force) return null;
  const locale = localeOf(path);
  const t = strings(locale).chrome;
  const en = toEnglish(locale);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav className="footer-links" aria-label={t.footerNav}>
          <a href={withLocale("/documents/", locale)}>{t.documents}</a>
          <a href={withLocale("/print-passport-photos/", locale)}>{t.printGuide}</a>
          <a href="/about/" {...en}>
            {t.about}
          </a>
          <a href="/privacy/" {...en}>
            {t.privacy}
          </a>
          <a href="/terms/" {...en}>
            {t.terms}
          </a>
          <a href="/accessibility/" {...en}>
            {t.accessibility}
          </a>
          <a href={SUPPORT_URL} {...en}>
            {t.support}
          </a>
          <a href="/llms.txt" {...en}>
            {t.forAgents}
          </a>
        </nav>
        <nav className="footer-links footer-lang" aria-label={t.languageLabel}>
          <span>{t.languageLabel}:</span>
          {switchTargets(path).map((x) =>
            x.current ? (
              <span key={x.locale} lang={LOCALES[x.locale].hreflang} aria-current="true">
                {x.name}
              </span>
            ) : (
              <a
                key={x.locale}
                href={x.path}
                lang={LOCALES[x.locale].hreflang}
                hrefLang={LOCALES[x.locale].hreflang}
              >
                {x.name}
              </a>
            ),
          )}
        </nav>
        <p className="footer-legal">{t.legal}</p>
        {t.englishOnlyNote && <p className="footer-legal">{t.englishOnlyNote}</p>}
      </div>
    </footer>
  );
}
