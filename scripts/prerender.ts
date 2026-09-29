// Prerenders every static route to dist/<path>/index.html, plus sitemap.xml and
// robots.txt. Run after `vite build`. Set OUT_DIR to build into another folder.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { SITE_NAME, SITE_URL } from "../src/config";
import { LOCALES, TRANSLATED_LOCALES, localeOf } from "../src/i18n";

const OUT_DIR = resolve(process.env.OUT_DIR || "dist");

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const escapeXml = escapeHtml;
/** JSON for an inline <script>: keep "<" and line separators from ending it. */
const jsonForScript = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");

let template = await readFile(resolve(OUT_DIR, "index.html"), "utf8");
// The built stylesheet is critical to first paint. Inline it so static pages
// do not wait on a separate mobile network round trip.
for (const match of template.matchAll(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g,
)) {
  const css = await readFile(
    resolve(OUT_DIR, match[1].replace(/^\//, "")),
    "utf8",
  );
  template = template.replace(match[0], () => `<style>${css}</style>`);
}
// Head tags this script owns: drop any the template already has.
template = template
  .replace(/<title>.*?<\/title>/s, "")
  .replace(/<meta name="description"[^>]*>/g, "")
  .replace(/<link rel="canonical"[^>]*>/g, "")
  .replace(/<meta (?:property|name)="(?:og|twitter):[^>]*>/g, "");

// Each language pack is its own chunk (assets/<code>-<hash>.js). Translated pages preload theirs,
// because the page cannot render its text until it arrives.
const assetFiles = await readdir(resolve(OUT_DIR, "assets"));
const packChunk = (code: string) => assetFiles.find((f) => new RegExp(`^${code}-[\\w-]+\\.js$`).test(f));

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/ui/App.tsx");
  const { staticRoutes, routeMeta, matchStaticRoute } = await server.ssrLoadModule(
    "/src/ui/routes.tsx",
  );
  // Language packs load on demand in the app; here every one is loaded (through the same module
  // graph the pages render from). A translation with a missing document, a lost number or a banned
  // claim must not ship.
  const registry = await server.ssrLoadModule("/src/i18n/registry.ts");
  await registry.loadAllLocales();
  const { BANNED, validateDocs } = await server.ssrLoadModule("/src/i18n/localize.ts");
  for (const locale of TRANSLATED_LOCALES) {
    const problems: string[] = validateDocs(locale);
    if (problems.length)
      throw new Error(`Incomplete ${locale} dataset text:\n  ${problems.join("\n  ")}`);
  }
  const paths: string[] = staticRoutes();
  const titles = new Map<string, string>();
  const alternatesByPath = new Map<string, { hreflang: string; href: string }[]>();

  for (const path of paths) {
    const meta = routeMeta(path);
    if (!meta) throw new Error(`No metadata for ${path}`);
    const rendered = renderToString(createElement(App, { initialPath: path }));
    if (matchStaticRoute(path) && !rendered.includes("data-pp-page="))
      throw new Error(
        `App did not render the static page for ${path}; check that App calls matchStaticRoute.`,
      );
    const locale = localeOf(path);
    const banned: RegExp | undefined = BANNED[locale];
    if (banned) {
      const hit = banned.exec(textOf(rendered) + " " + meta.title + " " + meta.description);
      if (hit) throw new Error(`Banned claim "${hit[0]}" on ${path}`);
    }
    alternatesByPath.set(path, meta.alternates);
    if (meta.lang !== LOCALES[locale].hreflang) throw new Error(`Wrong lang for ${path}`);
    const clash = titles.get(meta.title);
    if (clash) throw new Error(`Duplicate title "${meta.title}" on ${clash} and ${path}`);
    titles.set(meta.title, path);

    const title = escapeHtml(meta.title);
    const description = escapeHtml(meta.description);
    const url = escapeHtml(meta.canonical);
    const image = `${SITE_URL}/og.png`;
    const alternates = meta.alternates.map(
      (a: { hreflang: string; href: string }) =>
        `<link rel="alternate" hreflang="${escapeHtml(a.hreflang)}" href="${escapeHtml(a.href)}"/>`,
    );
    const font = LOCALES[locale].fontStack;
    const head = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}"/>`,
      `<link rel="canonical" href="${url}"/>`,
      ...alternates,
      ...(locale !== "en" && packChunk(locale)
        ? [`<link rel="modulepreload" crossorigin href="/assets/${packChunk(locale)}"/>`]
        : []),
      ...(font
        ? [
            `<style>html:lang(${meta.lang}) :is(body,h1,h2,h3,h4,.brand,.page-title,.eyebrow,.lede){font-family:${font}}</style>`,
          ]
        : []),
      `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}"/>`,
      `<meta property="og:title" content="${title}"/>`,
      `<meta property="og:description" content="${description}"/>`,
      `<meta property="og:type" content="website"/>`,
      `<meta property="og:locale" content="${meta.ogLocale}"/>`,
      `<meta property="og:url" content="${url}"/>`,
      `<meta property="og:image" content="${image}"/>`,
      `<meta property="og:image:width" content="1200"/>`,
      `<meta property="og:image:height" content="630"/>`,
      `<meta name="twitter:card" content="summary_large_image"/>`,
      `<meta name="twitter:title" content="${title}"/>`,
      `<meta name="twitter:description" content="${description}"/>`,
      `<meta name="twitter:image" content="${image}"/>`,
      ...(meta.jsonLd ?? []).map(
        (block: object) =>
          `<script type="application/ld+json">${jsonForScript(block)}</script>`,
      ),
    ].join("");

    const html = template
      .replace(/<html[^>]*>/, () => `<html lang="${meta.lang}"${meta.dir === "rtl" ? ' dir="rtl"' : ""}>`)
      .replace("</head>", () => `${head}</head>`)
      .replace('<div id="root"></div>', () => `<div id="root">${rendered}</div>`);
    const dir = resolve(OUT_DIR, path.slice(1));
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, "index.html"), html);
  }

  // Unknown addresses get this page (Vercel serves 404.html). App shows its not-found page for any path it does not know.
  const notFound = renderToString(createElement(App, { initialPath: "/404/" }));
  await writeFile(
    resolve(OUT_DIR, "404.html"),
    template
      .replace(
        "</head>",
        () =>
          `<title>Page not found — ${escapeHtml(SITE_NAME)}</title><meta name="robots" content="noindex"/></head>`,
      )
      .replace('<div id="root"></div>', () => `<div id="root">${notFound}</div>`),
  );

  // Every hreflang alternate must point at a prerendered page that points back.
  for (const [path, alts] of alternatesByPath) {
    for (const a of alts) {
      const target = a.href.slice(SITE_URL.length);
      if (!alternatesByPath.has(target)) throw new Error(`${path}: hreflang ${a.hreflang} points at missing ${target}`);
      const back = alternatesByPath.get(target)!;
      if (!back.some((b) => b.href === SITE_URL + path))
        throw new Error(`${path}: ${target} does not link back (hreflang)`);
    }
  }
  await writeFile(
    resolve(OUT_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${paths
      .map(
        (p) =>
          `<url><loc>${escapeXml(SITE_URL + p)}</loc>${(alternatesByPath.get(p) ?? [])
            .map(
              (a) =>
                `<xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}"/>`,
            )
            .join("")}</url>`,
      )
      .join("")}</urlset>\n`,
  );
  await writeFile(
    resolve(OUT_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
  console.log(`Prerendered ${paths.length} pages into ${OUT_DIR}.`);
} finally {
  await server.close();
}
