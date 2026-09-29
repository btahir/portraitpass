// Static SEO audit of a prerendered build. Never point it at dist by accident: pass the folder.
//
//   OUT_DIR=/tmp/pp-seo ./node_modules/.bin/vite build --outDir /tmp/pp-seo --emptyOutDir
//   OUT_DIR=/tmp/pp-seo ./node_modules/.bin/tsx scripts/prerender.ts
//   ./node_modules/.bin/tsx scripts/seo-audit.ts /tmp/pp-seo            # human summary
//   ./node_modules/.bin/tsx scripts/seo-audit.ts /tmp/pp-seo --json     # machine-readable
//   ./node_modules/.bin/tsx scripts/seo-audit.ts /tmp/pp-seo --live https://portraitpass.vercel.app
//
// Exit code 1 when any error-level finding exists (warnings do not fail). Checks per page: title
// and description length and uniqueness, one H1, canonical, hreflang (self, x-default, reciprocity),
// JSON-LD parse and required properties, Open Graph and Twitter tags, lang/dir, robots meta, image
// alt, link graph (broken links, orphans, depth from home), sitemap coverage and lastmod, robots.txt,
// 404 noindex, near-duplicate text between pages.
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { SITE_URL } from "../src/config";
import { DOCUMENTS } from "../src/core/documents";

const args = process.argv.slice(2);
const liveIdx = args.indexOf("--live");
const dirArg = args.find((a, i) => !a.startsWith("--") && i !== (liveIdx >= 0 ? liveIdx + 1 : -1));
const AS_JSON = args.includes("--json");
const LIVE = liveIdx >= 0 ? args[liveIdx + 1] : undefined;
const ROOT = resolve(dirArg ?? process.env.OUT_DIR ?? "");
if (!dirArg && !process.env.OUT_DIR) {
  console.error("usage: tsx scripts/seo-audit.ts <build-dir> [--json] [--live <url>]");
  process.exit(2);
}
if (ROOT === resolve("dist")) console.error("note: auditing dist; prefer a scratch build dir.");

type Level = "error" | "warn";
interface Finding {
  level: Level;
  check: string;
  path: string;
  detail: string;
}
const findings: Finding[] = [];
const add = (level: Level, check: string, path: string, detail: string) =>
  findings.push({ level, check, path, detail });

// ------------------------------------------------------------------ helpers
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const stripTags = (h: string) =>
  decode(
    h
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<svg[\s\S]*?<\/svg>/g, " ")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? decode(m[2] ?? m[3] ?? "") : undefined;
};
const tags = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
const pathOfFile = (file: string) => {
  const rel = file.slice(ROOT.length).replace(/\\/g, "/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
};

interface Page {
  path: string;
  html: string;
  body: string;
  title: string;
  description?: string;
  h1: string[];
  canonical?: string;
  hreflangs: { hreflang: string; href: string }[];
  lang?: string;
  dir?: string;
  robots?: string;
  jsonLd: unknown[];
  links: string[];
  text: string;
}

// ------------------------------------------------------------------ load pages
const files = await walk(ROOT);
const pages = new Map<string, Page>();
for (const file of files) {
  if (!file.endsWith("/index.html") && !file.endsWith("/404.html")) continue;
  if (file.includes("/assets/") || file.includes("/wasm/") || file.includes("/models/")) continue;
  const html = await readFile(file, "utf8");
  const path = file.endsWith("/404.html") ? "/404.html" : pathOfFile(file);
  const head = html.slice(0, html.indexOf("</head>"));
  const rootIdx = html.indexOf('<div id="root">');
  const body = rootIdx >= 0 ? html.slice(rootIdx) : html;
  const titleM = /<title>([\s\S]*?)<\/title>/.exec(head);
  const metaTags = tags(head, "meta");
  const linkTags = tags(head, "link");
  const jsonLd: unknown[] = [];
  for (const m of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      jsonLd.push(JSON.parse(m[1]));
    } catch (e) {
      add("error", "jsonld-parse", path, `invalid JSON: ${(e as Error).message}`);
    }
  }
  pages.set(path, {
    path,
    html,
    body,
    title: titleM ? decode(titleM[1]) : "",
    description: metaTags.map((t) => (attr(t, "name") === "description" ? attr(t, "content") : undefined)).find(Boolean),
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => stripTags(m[1])),
    canonical: linkTags.map((t) => (attr(t, "rel") === "canonical" ? attr(t, "href") : undefined)).find(Boolean),
    hreflangs: linkTags
      .filter((t) => attr(t, "rel") === "alternate" && attr(t, "hreflang"))
      .map((t) => ({ hreflang: attr(t, "hreflang")!, href: attr(t, "href")! })),
    lang: /<html[^>]*\slang="([^"]*)"/.exec(html)?.[1],
    dir: /<html[^>]*\sdir="([^"]*)"/.exec(html)?.[1] ?? "ltr",
    robots: metaTags.map((t) => (attr(t, "name") === "robots" ? attr(t, "content") : undefined)).find(Boolean),
    jsonLd,
    links: [...body.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => decode(m[1])),
    text: stripTags(body),
  });
}

const metaOf = (page: Page, key: string, attrName: "name" | "property") =>
  tags(page.html.slice(0, page.html.indexOf("</head>")), "meta")
    .map((t) => (attr(t, attrName) === key ? attr(t, "content") : undefined))
    .find((v) => v !== undefined);

// ------------------------------------------------------------------ per-page checks
const titles = new Map<string, string[]>();
const descs = new Map<string, string[]>();
const isSchemaType = (node: unknown, type: string) => {
  const t = (node as { "@type"?: unknown })?.["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
};
const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);
const ok200 = (p: string) => pages.has(p);

const expectedLang = (path: string) => {
  const m = /^\/(es|pt|hi|bn|ur|ar)\//.exec(path);
  return m ? m[1] : "en";
};
const expectedDir = (path: string) => (/^\/(ur|ar)\//.test(path) ? "rtl" : "ltr");

let jsonLdBlocks = 0;
const typeCounts = new Map<string, number>();
for (const page of pages.values()) {
  const { path } = page;
  const is404 = path === "/404.html";

  // title
  if (!page.title) add("error", "title-missing", path, "no <title>");
  else {
    if (!is404) titles.set(page.title, [...(titles.get(page.title) ?? []), path]);
    const len = [...page.title].length;
    if (len > 60) add("warn", "title-long", path, `${len} chars: ${page.title}`);
    if (len < 15) add("warn", "title-short", path, `${len} chars: ${page.title}`);
  }
  // description
  if (!is404) {
    if (!page.description) add("error", "description-missing", path, "no meta description");
    else {
      descs.set(page.description, [...(descs.get(page.description) ?? []), path]);
      const len = [...page.description].length;
      if (len > 165) add("warn", "description-long", path, `${len} chars`);
      if (len < 70) add("warn", "description-short", path, `${len} chars`);
    }
  }
  const noindexed = /noindex/i.test(page.robots ?? "");
  // h1 (a noindex utility shell such as /studio/ is exempt)
  if (page.h1.length !== 1 && !noindexed) add("error", "h1-count", path, `${page.h1.length} h1 elements`);
  // lang, dir
  if (page.lang !== expectedLang(path) && !is404) add("error", "lang", path, `lang=${page.lang}, expected ${expectedLang(path)}`);
  if (page.dir !== expectedDir(path) && !is404) add("error", "dir", path, `dir=${page.dir}`);
  // canonical
  if (!is404) {
    if (!page.canonical) add("error", "canonical-missing", path, "no canonical");
    else if (page.canonical !== SITE_URL + path)
      add("error", "canonical-mismatch", path, `${page.canonical} != ${SITE_URL + path}`);
  }
  // robots meta
  const noindex = /noindex/i.test(page.robots ?? "");
  if (is404 && !noindex) add("error", "404-indexable", path, "404 page lacks noindex");
  if (!is404 && noindex) add("warn", "noindex-page", path, `robots=${page.robots} (expected only for utility pages)`);
  if (!is404 && !noindex && !/max-image-preview:large/.test(page.robots ?? "")) add("warn", "robots-meta", path, "no max-image-preview:large");
  // hreflang
  if (page.hreflangs.length) {
    const self = page.hreflangs.find((h) => h.href === SITE_URL + path);
    if (!self) add("error", "hreflang-self", path, "no self-referencing hreflang");
    if (!page.hreflangs.some((h) => h.hreflang === "x-default")) add("error", "hreflang-xdefault", path, "missing x-default");
    for (const h of page.hreflangs) {
      if (!isUrl(h.href)) add("error", "hreflang-url", path, `not absolute: ${h.href}`);
      const target = pages.get(h.href.replace(SITE_URL, ""));
      if (!target) add("error", "hreflang-missing", path, `${h.hreflang} -> ${h.href} not built`);
      else if (!target.hreflangs.some((b) => b.href === SITE_URL + path))
        add("error", "hreflang-reciprocal", path, `${h.href} does not link back`);
      else if (h.hreflang !== "x-default" && target.lang !== h.hreflang)
        add("error", "hreflang-lang", path, `${h.hreflang} points at a page with lang=${target.lang}`);
    }
  }
  // Open Graph, Twitter
  if (!is404) {
    for (const k of ["og:title", "og:description", "og:image", "og:url", "og:type", "og:locale", "og:site_name"])
      if (!metaOf(page, k, "property")) add("error", "og-missing", path, k);
    for (const k of ["twitter:card", "twitter:title", "twitter:image"])
      if (!metaOf(page, k, "name")) add("error", "twitter-missing", path, k);
    const img = metaOf(page, "og:image", "property");
    if (img && !isUrl(img)) add("error", "og-image-relative", path, img);
    if (img && img.startsWith(SITE_URL)) {
      const rel = img.slice(SITE_URL.length).split("?")[0];
      if (!existsSync(join(ROOT, rel))) add("error", "og-image-missing", path, img);
    }
    if (!metaOf(page, "og:image:alt", "property")) add("warn", "og-image-alt", path, "no og:image:alt");
    if (img && ![...page.jsonLd].length) add("warn", "no-jsonld", path, "no structured data");
    if (metaOf(page, "og:url", "property") !== page.canonical) add("error", "og-url", path, "og:url differs from canonical");
    if (metaOf(page, "og:locale", "property") == null) add("error", "og-locale", path, "missing");
  }
  // JSON-LD
  for (const block of page.jsonLd) {
    jsonLdBlocks++;
    const b = block as Record<string, unknown>;
    const type = String(b["@type"]);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    if (b["@context"] !== "https://schema.org") add("error", "jsonld-context", path, type);
    if (isSchemaType(b, "BreadcrumbList")) {
      const items = (b.itemListElement as Record<string, unknown>[]) ?? [];
      if (items.length < 2) add("error", "breadcrumb-items", path, "fewer than 2 items");
      items.forEach((it, i) => {
        if (it.position !== i + 1) add("error", "breadcrumb-position", path, `position ${it.position} at ${i}`);
        if (!it.name) add("error", "breadcrumb-name", path, `item ${i} has no name`);
        if (i < items.length - 1 && !isUrl(it.item)) add("error", "breadcrumb-item", path, `item ${i} has no absolute url`);
        if (isUrl(it.item) && !ok200(it.item.replace(SITE_URL, ""))) add("error", "breadcrumb-broken", path, String(it.item));
      });
    } else if (isSchemaType(b, "FAQPage")) {
      const q = (b.mainEntity as Record<string, unknown>[]) ?? [];
      if (!q.length) add("error", "faq-empty", path, "no questions");
      for (const item of q) {
        const answer = (item.acceptedAnswer as Record<string, unknown> | undefined)?.text;
        if (!item.name || !answer) add("error", "faq-question", path, "question without name or answer");
        else if (!page.text.includes(String(item.name).slice(0, 40)))
          add("warn", "faq-not-visible", path, `question not on page: ${item.name}`);
      }
    } else if (isSchemaType(b, "WebApplication") || isSchemaType(b, "SoftwareApplication")) {
      const offers = b.offers as Record<string, unknown> | undefined;
      if (!b.name) add("error", "app-name", path, "missing name");
      if (!offers || String(offers.price) !== "0") add("error", "app-offers", path, "missing free offer");
      if (!b.applicationCategory) add("warn", "app-category", path, "no applicationCategory");
      // Google's rich result also wants aggregateRating or review; we have none and never invent them.
    } else if (isSchemaType(b, "WebSite")) {
      if (!b.name || !isUrl(b.url)) add("error", "website-props", path, "needs name and absolute url");
      if (path !== "/") add("warn", "website-not-home", path, "WebSite markup belongs on the home page only");
    } else if (isSchemaType(b, "Organization")) {
      if (!b.name || !isUrl(b.url)) add("error", "organization-props", path, "needs name and url");
      const logo = (b.logo as { url?: string } | undefined)?.url;
      if (!logo || !existsSync(join(ROOT, logo.replace(SITE_URL, "")))) add("error", "organization-logo", path, `logo ${logo} not in build`);
    } else if (isSchemaType(b, "WebPage")) {
      if (b.url !== SITE_URL + path) add("error", "webpage-url", path, String(b.url));
      if (b.dateModified && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.dateModified))) add("error", "webpage-date", path, String(b.dateModified));
    } else if (isSchemaType(b, "Dataset")) {
      if (!b.name) add("error", "dataset-name", path, "missing name");
      for (const d of (b.distribution as { contentUrl?: string }[]) ?? [])
        if (!d.contentUrl || !existsSync(join(ROOT, d.contentUrl.replace(SITE_URL, "")))) add("error", "dataset-distribution", path, `${d.contentUrl} not in build`);
      const d = String(b.description ?? "");
      if (d.length < 50 || d.length > 5000) add("error", "dataset-description", path, `${d.length} chars (50 to 5000)`);
      if (!b.license) add("warn", "dataset-license", path, "no license");
    } else if (!(isSchemaType(b, "ItemList") || isSchemaType(b, "TechArticle") || isSchemaType(b, "Article") || isSchemaType(b, "WebPage") || isSchemaType(b, "CollectionPage")))
      add("warn", "jsonld-unknown-type", path, type);
  }
  // images
  for (const img of tags(page.body, "img")) {
    if (attr(img, "alt") === undefined) add("error", "img-alt", path, img.slice(0, 80));
  }
  // links: relative internal links must use trailing slash (or be a file)
  for (const href of page.links) {
    if (/^(mailto:|tel:|#|javascript:)/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(SITE_URL + "/")) add("warn", "absolute-internal-link", path, href);
      continue;
    }
    const clean = href.split(/[?#]/)[0];
    if (!clean) continue;
    if (!clean.endsWith("/") && !/\.[a-z0-9]+$/i.test(clean)) add("warn", "no-trailing-slash", path, href);
  }
}
for (const [t, ps] of titles) if (ps.length > 1) add("error", "title-duplicate", ps[0], `${ps.length} pages share "${t}": ${ps.slice(0, 4).join(", ")}`);
for (const [d, ps] of descs) if (ps.length > 1) add("error", "description-duplicate", ps[0], `${ps.length} pages share "${d.slice(0, 60)}": ${ps.slice(0, 4).join(", ")}`);

// ------------------------------------------------------------------ link graph
const targetOf = (from: string, href: string): string | undefined => {
  if (/^(mailto:|tel:|#|javascript:)/.test(href)) return undefined;
  let u = href;
  if (/^https?:\/\//.test(u)) {
    if (!u.startsWith(SITE_URL)) return undefined;
    u = u.slice(SITE_URL.length) || "/";
  }
  u = u.split(/[?#]/)[0];
  if (!u) return from;
  if (!u.startsWith("/")) return undefined;
  return u;
};
const fileExists = (p: string) => existsSync(join(ROOT, p));
const graph = new Map<string, Set<string>>();
let brokenLinks = 0;
for (const page of pages.values()) {
  if (page.path === "/404.html") continue;
  const out = new Set<string>();
  for (const href of page.links) {
    const t = targetOf(page.path, href);
    if (!t) continue;
    if (pages.has(t)) out.add(t);
    else if (!fileExists(t)) {
      brokenLinks++;
      add("error", "broken-link", page.path, href);
    }
  }
  graph.set(page.path, out);
}
const depth = new Map<string, number>([["/", 0]]);
const queue = ["/"];
while (queue.length) {
  const cur = queue.shift()!;
  for (const n of graph.get(cur) ?? []) {
    if (!depth.has(n)) {
      depth.set(n, depth.get(cur)! + 1);
      queue.push(n);
    }
  }
}
const inbound = new Map<string, number>();
for (const [from, outs] of graph) for (const o of outs) if (o !== from) inbound.set(o, (inbound.get(o) ?? 0) + 1);
let orphans = 0;
let deep = 0;
let maxDepth = 0;
for (const p of pages.keys()) {
  if (p === "/404.html") continue;
  if (!depth.has(p)) {
    orphans++;
    add("error", "orphan", p, "not reachable from home by links");
  } else {
    maxDepth = Math.max(maxDepth, depth.get(p)!);
    if (depth.get(p)! > 3) {
      deep++;
      add("warn", "depth", p, `${depth.get(p)} clicks from home`);
    }
  }
  if ((inbound.get(p) ?? 0) < 3 && p !== "/") add("warn", "few-inlinks", p, `${inbound.get(p) ?? 0} internal inbound links`);
}

// ------------------------------------------------------------------ sitemap
const sitemapUrls = new Map<string, { lastmod?: string; alternates: { hreflang: string; href: string }[] }>();
const sitemapFiles: string[] = [];
async function readSitemap(name: string) {
  sitemapFiles.push(name);
  const xml = await readFile(join(ROOT, name), "utf8");
  if (xml.includes("<sitemapindex")) {
    for (const m of xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)) {
      const loc = /<loc>([^<]*)<\/loc>/.exec(m[1])?.[1];
      if (!loc) continue;
      if (!loc.startsWith(SITE_URL)) add("error", "sitemap-index-loc", name, loc);
      const rel = loc.slice(SITE_URL.length);
      if (!fileExists(rel)) add("error", "sitemap-index-missing", name, loc);
      else await readSitemap(rel.replace(/^\//, ""));
    }
    return;
  }
  const count = (xml.match(/<url>/g) ?? []).length;
  if (count > 50000) add("error", "sitemap-size", name, `${count} urls`);
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = decode(/<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? "");
    const lastmod = /<lastmod>([^<]*)<\/lastmod>/.exec(m[1])?.[1];
    const alternates = [...m[1].matchAll(/<xhtml:link[^>]*>/g)].map((x) => ({
      hreflang: attr(x[0], "hreflang") ?? "",
      href: attr(x[0], "href") ?? "",
    }));
    if (sitemapUrls.has(loc)) add("error", "sitemap-duplicate", name, loc);
    sitemapUrls.set(loc, { lastmod, alternates });
  }
}
if (!fileExists("/sitemap.xml")) add("error", "sitemap-missing", "/sitemap.xml", "no sitemap.xml");
else await readSitemap("sitemap.xml");
for (const p of pages.keys()) {
  if (p === "/404.html") continue;
  const hidden = /noindex/i.test(pages.get(p)!.robots ?? "");
  if (!hidden && !sitemapUrls.has(SITE_URL + p)) add("error", "sitemap-coverage", p, "page not in sitemap");
  if (hidden && sitemapUrls.has(SITE_URL + p)) add("error", "sitemap-noindex", p, "noindex page is listed in the sitemap");
}
if (![...pages.get("/")!.jsonLd].some((b) => isSchemaType(b, "WebSite"))) add("error", "home-website", "/", "no WebSite markup");
if (![...pages.get("/")!.jsonLd].some((b) => isSchemaType(b, "Organization"))) add("error", "home-organization", "/", "no Organization markup");
if (!files.some((f) => /\/[0-9a-f]{32}\.txt$/.test(f))) add("warn", "indexnow-key", "/", "no IndexNow key file at the site root");
for (const [loc, info] of sitemapUrls) {
  if (!loc.startsWith(SITE_URL)) add("error", "sitemap-host", loc, "wrong host");
  const rel = loc.slice(SITE_URL.length);
  if (!pages.has(rel)) add("error", "sitemap-extra", loc, "sitemap lists a URL that was not built");
  if (info.lastmod && !/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/.test(info.lastmod)) add("error", "sitemap-lastmod", loc, info.lastmod);
  const page = pages.get(rel);
  if (page && !info.lastmod) add("warn", "sitemap-no-lastmod", loc, "no lastmod");
  if (page && page.hreflangs.length !== info.alternates.length)
    add("warn", "sitemap-hreflang", loc, `page has ${page.hreflangs.length} alternates, sitemap ${info.alternates.length}`);
}
const lastmods = [...sitemapUrls.values()].map((v) => v.lastmod).filter(Boolean) as string[];
const distinctLastmod = new Set(lastmods).size;

// ------------------------------------------------------------------ robots.txt
let robots = "";
if (!fileExists("/robots.txt")) add("error", "robots-missing", "/robots.txt", "missing");
else {
  robots = await readFile(join(ROOT, "robots.txt"), "utf8");
  if (!/^sitemap:\s*https?:\/\//im.test(robots)) add("error", "robots-sitemap", "/robots.txt", "no Sitemap line");
  if (/^disallow:\s*\/\s*$/im.test(robots)) add("error", "robots-blocks-all", "/robots.txt", "Disallow: /");
  for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"])
    if (!new RegExp(`user-agent:\\s*${bot}`, "i").test(robots)) add("warn", "robots-ai", "/robots.txt", `no explicit rule for ${bot}`);
}
for (const f of ["/llms.txt", "/manifest.webmanifest", "/og.png", "/favicon.svg"])
  if (!fileExists(f)) add("error", "asset-missing", f, "not in build");

// ------------------------------------------------------------------ near-duplicate text
const shingles = (text: string) => {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i += 1) set.add(words.slice(i, i + 5).join(" "));
  return set;
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};
const mainText = (page: Page) => {
  const m = /<main\b[\s\S]*?<\/main>/.exec(page.body);
  return stripTags(m ? m[0] : page.body);
};
const enPaths = [...pages.keys()].filter((p) => expectedLang(p) === "en" && p !== "/404.html");
const sh = new Map(enPaths.map((p) => [p, shingles(mainText(pages.get(p)!))]));
let dupPairs = 0;
const thin: string[] = [];
for (let i = 0; i < enPaths.length; i++) {
  const words = mainText(pages.get(enPaths[i])!).split(/\s+/).length;
  if (words < 150 && !["/studio/", "/"].includes(enPaths[i])) {
    thin.push(enPaths[i]);
    add("warn", "thin-content", enPaths[i], `${words} words in <main>`);
  }
  for (let j = i + 1; j < enPaths.length; j++) {
    const sim = jaccard(sh.get(enPaths[i])!, sh.get(enPaths[j])!);
    if (sim > 0.85) {
      dupPairs++;
      add("warn", "near-duplicate", enPaths[i], `${(sim * 100).toFixed(0)}% similar to ${enPaths[j]}`);
    }
  }
}
// Exact duplicates of whole <main> text across all languages.
const hashes = new Map<string, string>();
for (const p of pages.keys()) {
  if (p === "/404.html") continue;
  const h = createHash("sha1").update(mainText(pages.get(p)!)).digest("hex");
  if (hashes.has(h)) add("error", "identical-content", p, `same main text as ${hashes.get(h)}`);
  else hashes.set(h, p);
}
// Translated pages that still contain long English runs.
const sourceTitles = [...new Set(DOCUMENTS.flatMap((d) => d.sources.map((x) => x.title)))].sort((a, b) => b.length - a.length);
const latinRun = /[A-Za-z][A-Za-z'’-]+(?:\s+[A-Za-z][A-Za-z'’-]+){9,}/;
for (const p of pages.keys()) {
  if (!/^\/(hi|bn|ur|ar)\//.test(p)) continue;
  // Source titles are the authority's own (English) page titles, so they are blanked out first.
  const html = (/<main\b[\s\S]*?<\/main>/.exec(pages.get(p)!.body)?.[0] ?? "").replace(/<ul class="pg-sources">[\s\S]*?<\/ul>/g, " ");
  let text = stripTags(html);
  for (const t of sourceTitles) text = text.split(t).join(" ");
  const m = latinRun.exec(text);
  if (m) add("warn", "untranslated-run", p, m[0].slice(0, 90));
}

// ------------------------------------------------------------------ optional live checks
const live: Record<string, unknown> = {};
if (LIVE) {
  const base = LIVE.replace(/\/$/, "");
  const probes = ["/", "/us-passport-photo/", "/es/us-passport-photo/", "/robots.txt", "/sitemap.xml", "/llms.txt", "/og.png", "/no-such-page/"];
  for (const p of probes) {
    try {
      const r = await fetch(base + p, { redirect: "manual" });
      const h = Object.fromEntries(r.headers.entries());
      live[p] = {
        status: r.status,
        contentType: h["content-type"],
        cache: h["cache-control"],
        xRobotsTag: h["x-robots-tag"] ?? null,
        location: h.location ?? null,
      };
      if (h["x-robots-tag"] && /noindex/i.test(h["x-robots-tag"])) add("error", "live-noindex", p, `x-robots-tag: ${h["x-robots-tag"]}`);
      if (p === "/no-such-page/" && r.status !== 404) add("error", "live-404-status", p, `status ${r.status}`);
      if (p !== "/no-such-page/" && r.status !== 200) add("error", "live-status", p, `status ${r.status}`);
      if (p === "/") {
        const t = await r.text();
        const c = /<link rel="canonical" href="([^"]*)"/.exec(t)?.[1];
        live["canonical"] = c;
        if (c !== SITE_URL + "/") add("error", "live-canonical", p, String(c));
      }
    } catch (e) {
      add("error", "live-fetch", p, (e as Error).message);
    }
  }
}

// ------------------------------------------------------------------ report
const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");
const byCheck = new Map<string, { level: Level; n: number; sample: string }>();
for (const f of findings) {
  const cur = byCheck.get(f.check);
  if (cur) cur.n++;
  else byCheck.set(f.check, { level: f.level, n: 1, sample: `${f.path}: ${f.detail}` });
}
const langCounts: Record<string, number> = {};
for (const p of pages.keys()) langCounts[expectedLang(p)] = (langCounts[expectedLang(p)] ?? 0) + 1;
const titleLens = [...pages.values()].filter((p) => p.path !== "/404.html").map((p) => [...p.title].length);
const summary = {
  root: ROOT,
  pages: pages.size,
  pagesByLanguage: langCounts,
  sitemapFiles,
  sitemapUrls: sitemapUrls.size,
  sitemapDistinctLastmod: distinctLastmod,
  jsonLdBlocks,
  jsonLdTypes: Object.fromEntries(typeCounts),
  titleLength: { max: Math.max(...titleLens), over60: titleLens.filter((n) => n > 60).length },
  brokenLinks,
  orphans,
  maxClickDepth: maxDepth,
  deeperThan3: deep,
  nearDuplicatePairs: dupPairs,
  thinPages: thin.length,
  errors: errors.length,
  warnings: warns.length,
  live,
};
if (AS_JSON) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log("SEO audit of", ROOT);
  console.log(JSON.stringify(summary, null, 2));
  for (const [check, v] of [...byCheck].sort((a, b) => (a[1].level === b[1].level ? b[1].n - a[1].n : a[1].level === "error" ? -1 : 1)))
    console.log(`${v.level.toUpperCase().padEnd(5)} ${check.padEnd(24)} x${String(v.n).padEnd(5)} e.g. ${v.sample.slice(0, 150)}`);
  if (!findings.length) console.log("No findings.");
}
await stat(ROOT);
process.exit(errors.length ? 1 : 0);
