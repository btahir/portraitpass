// Static (prerendered) routes: legal and info pages, one page per dataset document, size pages and
// the print guide, in English and in every translated locale (src/i18n). STUDIO's App calls
// matchStaticRoute(pathname); scripts/prerender.ts walks staticRoutes() and routeMeta().
import type { ReactElement } from "react";
import { DOCUMENTS, type DocumentSpec } from "../core/documents";
import { SITE_NAME, SITE_URL } from "../config";
import {
  DEFAULT_LOCALE,
  LOCALES,
  alternatesFor,
  localeOf,
  withLocale,
  type Locale,
} from "../i18n";
import { localizeDocument } from "../i18n/localize";
import { loadedTranslations } from "../i18n/registry";
import { strings } from "../i18n/strings";
import { DocumentPage } from "./pages/DocumentPage";
import { DocumentsIndexPage } from "./pages/DocumentsIndex";
import { AboutPage, SupportPage } from "./pages/Info";
import { AccessibilityPage, PrivacyPage, TermsPage } from "./pages/Legal";
import { sizePages, type PageDef } from "./pages/SizePages";
import { documentFaq, documentMeta, docPath, type Faq } from "./pages/content";

export interface HreflangLink {
  hreflang: string;
  /** Absolute URL. */
  href: string;
}
export interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: object[];
  /** <html lang>, and og:locale. */
  lang: string;
  dir: "ltr" | "rtl";
  ogLocale: string;
  /** hreflang alternates (including x-default) for pages that exist in more than one language. */
  alternates: HreflangLink[];
}
export interface StaticRoute extends RouteMeta {
  element: ReactElement;
}

const HOME_META = {
  title: "PortraitPass — Free passport photo maker, sized exactly",
  description:
    "Free passport and ID photo maker that runs in your browser. Exact sizes, head and eye guides, and print sheets. Nothing is uploaded, no watermark, no account.",
};
const STUDIO_META = {
  title: "Passport photo studio — PortraitPass",
  description:
    "Frame, check and export a passport, visa or ID photo in your browser. Head and eye guides, exact sizes and print sheets. Your photo never leaves your device.",
};

export function normalizePath(pathname: string): string {
  let p = pathname.split(/[?#]/)[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  return p === "/" ? "/" : `${p.replace(/\/+$/, "")}/`;
}

const absolute = (path: string) => `${SITE_URL}${path}`;

function faqLd(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
function crumbLd(items: { name: string; path?: string }[], L: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: strings(L).shell.home, path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: absolute(it.path) } : {}),
    })),
  };
}

/** Language, direction and hreflang alternates for a page at `path`. */
function localeMeta(path: string) {
  const L = localeOf(path);
  const alts = alternatesFor(path);
  const alternates: HreflangLink[] = alts.length
    ? [
        ...alts.map((a) => ({ hreflang: a.hreflang, href: absolute(a.path) })),
        {
          hreflang: "x-default",
          href: absolute(alts.find((a) => a.locale === DEFAULT_LOCALE)!.path),
        },
      ]
    : [];
  return {
    lang: LOCALES[L].hreflang,
    dir: LOCALES[L].dir,
    ogLocale: LOCALES[L].ogLocale,
    alternates,
  };
}

interface Entry {
  path: string;
  build: () => StaticRoute;
}

const fixed = (
  path: string,
  title: string,
  description: string,
  crumb: string,
  element: () => ReactElement,
): Entry => ({
  path,
  build: () => ({
    title,
    description,
    canonical: absolute(path),
    element: element(),
    jsonLd: [crumbLd([{ name: crumb }], DEFAULT_LOCALE)],
    ...localeMeta(path),
  }),
});

function fromDef(def: PageDef, L: Locale): Entry {
  const path = withLocale(def.path, L);
  return {
    path,
    build: () => ({
      title: def.title,
      description: def.description,
      canonical: absolute(path),
      element: def.element,
      jsonLd: [
        crumbLd([{ name: def.crumb }], L),
        ...(def.faq ? [faqLd(def.faq)] : []),
      ],
      ...localeMeta(path),
    }),
  };
}

function fromDocument(doc: DocumentSpec, L: Locale): Entry {
  const path = docPath(doc, L);
  return {
    path,
    build: () => {
      const meta = documentMeta(doc, L);
      return {
        ...meta,
        canonical: absolute(path),
        element: <DocumentPage doc={doc} locale={L} />,
        jsonLd: [
          crumbLd(
            [
              { name: strings(L).index.crumb, path: withLocale("/documents/", L) },
              { name: localizeDocument(doc, L).name },
            ],
            L,
          ),
          faqLd(documentFaq(doc, L)),
        ],
        ...localeMeta(path),
      };
    },
  };
}

function documentsIndex(L: Locale): Entry {
  const path = withLocale("/documents/", L);
  const t = strings(L);
  return {
    path,
    build: () => ({
      title: t.meta.indexTitle,
      description: t.meta.indexDescription(DOCUMENTS.length),
      canonical: absolute(path),
      element: <DocumentsIndexPage locale={L} />,
      jsonLd: [crumbLd([{ name: t.index.crumb }], L)],
      ...localeMeta(path),
    }),
  };
}

/** Documents, size pages and print guide in one locale. */
function localizedEntries(L: Locale): Entry[] {
  const list: Entry[] = [documentsIndex(L), ...sizePages(L).map((d) => fromDef(d, L))];
  const taken = new Set(list.map((e) => e.path));
  for (const doc of DOCUMENTS) {
    const path = docPath(doc, L);
    if (taken.has(path)) continue;
    taken.add(path);
    list.push(fromDocument(doc, L));
  }
  return list;
}

// Translated pages exist only for language packs that are loaded (a page load needs one language;
// the prerender script loads them all), so the table is rebuilt if the set of loaded packs changes.
let cache: Map<string, Entry> | undefined;
let cacheKey = "";
function entries(): Map<string, Entry> {
  const translations = loadedTranslations();
  const key = translations.join();
  if (cache && key === cacheKey) return cache;
  const en = strings(DEFAULT_LOCALE);
  const list: Entry[] = [
    fixed(
      "/about/",
      "About PortraitPass",
      "An independent open-source passport photo tool. Your photos stay on your device. Learn how it works, where the numbers come from and what it cannot promise.",
      "About",
      () => <AboutPage />,
    ),
    fixed(
      "/support/",
      "Support PortraitPass",
      "Tips keep PortraitPass free, private and open source. Optional one-time or monthly tips; they never unlock features or touch your photos.",
      "Support",
      () => <SupportPage />,
    ),
    fixed(
      "/privacy/",
      "Privacy — PortraitPass",
      "Your photo never leaves your device. What the host logs, why there are no cookies or analytics, and what a saved project file contains.",
      "Privacy",
      () => <PrivacyPage />,
    ),
    fixed(
      "/terms/",
      "Terms — PortraitPass",
      "PortraitPass is a free open-source tool provided as is, under the MIT License, with no guarantee that any photo is accepted.",
      "Terms",
      () => <TermsPage />,
    ),
    fixed(
      "/accessibility/",
      "Accessibility — PortraitPass",
      "How PortraitPass works with a keyboard and screen reader, the WCAG 2.2 AA standard we aim for, known limits, and how to report an accessibility barrier.",
      "Accessibility",
      () => <AccessibilityPage />,
    ),
    // English documents index (its title text lives with the other English strings).
    {
      path: "/documents/",
      build: () => ({
        title: en.meta.indexTitle,
        description: en.meta.indexDescription(DOCUMENTS.length),
        canonical: absolute("/documents/"),
        element: <DocumentsIndexPage />,
        jsonLd: [crumbLd([{ name: en.index.crumb }], DEFAULT_LOCALE)],
        ...localeMeta("/documents/"),
      }),
    },
    ...sizePages(DEFAULT_LOCALE).map((d) => fromDef(d, DEFAULT_LOCALE)),
  ];
  const taken = new Set(list.map((e) => e.path));
  // The US and UK passport pages double as the long-standing keyword URLs.
  for (const doc of DOCUMENTS) {
    const path = docPath(doc);
    if (taken.has(path)) continue;
    taken.add(path);
    list.push(fromDocument(doc, DEFAULT_LOCALE));
  }
  for (const L of translations) list.push(...localizedEntries(L));
  cacheKey = key;
  cache = new Map(list.map((e) => [e.path, e]));
  return cache;
}

/** Route for a pathname, or undefined (home, studio, and unknown paths belong to the app). */
export function matchStaticRoute(pathname: string): StaticRoute | undefined {
  return entries().get(normalizePath(pathname))?.build();
}

/** Every path to prerender and list in the sitemap, in a stable order. */
export function staticRoutes(): string[] {
  return ["/", "/studio/", ...entries().keys()];
}

/** Title, description and structured data for any prerendered path (including / and /studio/). */
export function routeMeta(pathname: string): RouteMeta | undefined {
  const path = normalizePath(pathname);
  const base = localeMeta(path);
  if (path === "/")
    return {
      ...HOME_META,
      ...base,
      canonical: absolute("/"),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: absolute("/"),
          applicationCategory: "PhotographyApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: HOME_META.description,
        },
      ],
    };
  if (path === "/studio/") return { ...STUDIO_META, ...base, canonical: absolute("/studio/") };
  const route = matchStaticRoute(path);
  if (!route) return undefined;
  const { element: _element, ...meta } = route;
  return meta;
}
