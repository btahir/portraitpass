import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LOCALES, localeOf } from "../i18n";
import { loadLocale } from "../i18n/registry";
import { strings } from "../i18n/strings";
import { ChromeContext, SiteFooter, SiteHeader } from "./chrome";
import { Home } from "./home/Home";
import { matchStaticRoute } from "./routes";
import type { Intake } from "./studio/handoff";
import "./styles.css";

// The studio is the heavy part (engine, canvas, checks). Home and the static pages don't load it.
const Studio = lazy(() => import("./studio/Studio"));

const DEFAULT_DOC = "us-passport";

// A translated page needs its language pack before the first render. English pages skip this, so
// their bundle never includes (or waits for) another language. If the pack cannot load, the
// prerendered page stays as it is. The prerender script has no window and loads packs itself.
if (typeof window !== "undefined") await loadLocale(localeOf(window.location.pathname.replace(/\/*$/, "/")));

function normalizePath(path: string) {
  return path === "/" ? path : `${path.replace(/\/+$/, "")}/`;
}
interface Location {
  path: string;
  search: string;
}
function readLocation(initialPath?: string, initialSearch?: string): Location {
  if (typeof window === "undefined")
    return { path: normalizePath(initialPath ?? "/"), search: initialSearch ?? "" };
  return {
    path: normalizePath(initialPath ?? window.location.pathname),
    search: initialSearch ?? window.location.search,
  };
}

function NotFound() {
  return (
    <main id="main" className="content-page pg">
      <div className="eyebrow">Page not found</div>
      <h1 className="page-title">That page is not here.</h1>
      <p className="lede">
        Try the <a href="/">home page</a> or the{" "}
        <a href="/documents/">list of documents</a>.
      </p>
    </main>
  );
}

/**
 * The shell. `/` is Home, `/studio/?doc=<id>` is the studio, and every other path comes from
 * src/ui/routes.tsx. `initialPath` lets a prerender script render any route on the server.
 */
export default function App({
  initialPath,
  initialSearch,
}: { initialPath?: string; initialSearch?: string } = {}) {
  const [loc, setLoc] = useState(() => readLocation(initialPath, initialSearch));
  // What Home hands to the studio (a file, the sample, the camera or a project). The studio takes it once.
  const [intake, setIntake] = useState<Intake | null>(null);
  const homeTitle = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => setLoc(readLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const go = useCallback((url: string, replace = false) => {
    const target = new URL(url, window.location.origin);
    const href = target.pathname + target.search;
    if (replace) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
    setLoc({ path: normalizePath(target.pathname), search: target.search });
  }, []);

  const locale = localeOf(loc.path);
  useEffect(() => {
    document.documentElement.lang = LOCALES[locale].hreflang;
    document.documentElement.dir = LOCALES[locale].dir;
  }, [locale]);
  const onStudio = loc.path === "/studio/";
  useEffect(() => {
    if (homeTitle.current === null) homeTitle.current = document.title;
    if (onStudio) document.title = "Photo studio — PortraitPass";
    else if (homeTitle.current) document.title = homeTitle.current;
  }, [onStudio]);

  const start = useCallback(
    (next: Intake, docId?: string) => {
      setIntake(next);
      go(docId ? `/studio/?doc=${encodeURIComponent(docId)}` : "/studio/");
      window.scrollTo(0, 0);
    },
    [go],
  );

  let body;
  if (loc.path === "/") {
    body = (
      <main id="main">
        <Home
          onUpload={(file, docId) => start({ kind: "file", file }, docId)}
          onCamera={(docId) => start({ kind: "camera" }, docId)}
          onSample={(docId) => start({ kind: "sample" }, docId)}
          onOpenProject={(file) => start({ kind: "project", file })}
        />
      </main>
    );
  } else if (onStudio) {
    const docId = new URLSearchParams(loc.search).get("doc") ?? DEFAULT_DOC;
    body = (
      <Suspense fallback={<main id="main" className="studio-loading" />}>
        <Studio
          docId={docId}
          intake={intake}
          onIntakeDone={() => setIntake(null)}
          onDocChange={(id) => go(`/studio/?doc=${encodeURIComponent(id)}`, true)}
        />
      </Suspense>
    );
  } else {
    body = matchStaticRoute(loc.path)?.element ?? <NotFound />;
  }

  return (
    <ChromeContext.Provider value={true}>
      <div className="app">
        <a className="skip-link" href="#main">
          {strings(locale).chrome.skip}
        </a>
        <SiteHeader force path={loc.path} />
        {body}
        <SiteFooter force path={loc.path} />
      </div>
    </ChromeContext.Provider>
  );
}
