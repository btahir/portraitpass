// Static (prerendered) routes: legal and info pages, one page per dataset
// document, size pages and the print guide. STUDIO's App calls
// matchStaticRoute(pathname); scripts/prerender.ts walks staticRoutes().
import type { ReactElement } from "react";
import { DOCUMENTS, type DocumentSpec } from "../core/documents";
import { SITE_NAME, SITE_URL } from "../config";
import { DocumentPage } from "./pages/DocumentPage";
import { DocumentsIndexPage } from "./pages/DocumentsIndex";
import { AboutPage, SupportPage } from "./pages/Info";
import { AccessibilityPage, PrivacyPage, TermsPage } from "./pages/Legal";
import { sizePages, type PageDef } from "./pages/SizePages";
import { documentFaq, documentMeta, docPath, type Faq } from "./pages/content";

export interface StaticRoute {
  title: string;
  description: string;
  element: ReactElement;
  canonical: string;
  jsonLd?: object[];
}
export interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: object[];
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
function crumbLd(items: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: absolute(it.path) } : {}),
    })),
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
    jsonLd: [crumbLd([{ name: crumb }])],
  }),
});

function fromDef(def: PageDef): Entry {
  return {
    path: def.path,
    build: () => ({
      title: def.title,
      description: def.description,
      canonical: absolute(def.path),
      element: def.element,
      jsonLd: [
        crumbLd([{ name: def.crumb }]),
        ...(def.faq ? [faqLd(def.faq)] : []),
      ],
    }),
  };
}

function fromDocument(doc: DocumentSpec): Entry {
  const path = docPath(doc);
  return {
    path,
    build: () => {
      const meta = documentMeta(doc);
      return {
        ...meta,
        canonical: absolute(path),
        element: <DocumentPage doc={doc} />,
        jsonLd: [
          crumbLd([{ name: "Documents", path: "/documents/" }, { name: doc.name }]),
          faqLd(documentFaq(doc)),
        ],
      };
    },
  };
}

let cache: Map<string, Entry> | undefined;
function entries(): Map<string, Entry> {
  if (cache) return cache;
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
    {
      path: "/documents/",
      build: () => ({
        title: "Passport, visa and ID photo requirements — PortraitPass",
        description: `Photo size, head position, background and file size rules for ${DOCUMENTS.length} passports, visas and IDs, each with its source and check date.`,
        canonical: absolute("/documents/"),
        element: <DocumentsIndexPage />,
        jsonLd: [crumbLd([{ name: "Documents" }])],
      }),
    },
    ...sizePages().map(fromDef),
  ];
  const taken = new Set(list.map((e) => e.path));
  // The US and UK passport pages double as the long-standing keyword URLs.
  for (const doc of DOCUMENTS) {
    const path = docPath(doc);
    if (taken.has(path)) continue;
    taken.add(path);
    list.push(fromDocument(doc));
  }
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
  if (path === "/")
    return {
      ...HOME_META,
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
  if (path === "/studio/")
    return { ...STUDIO_META, canonical: absolute("/studio/") };
  const route = matchStaticRoute(path);
  if (!route) return undefined;
  const { element: _element, ...meta } = route;
  return meta;
}
