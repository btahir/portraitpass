import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { SITE_URL } from "../src/config";
const routes: Record<string, { title: string; description: string }> = {
  "/": {
    title: "PortraitPass — Your next chapter starts here.",
    description:
      "A private passport photo studio. Precisely sized photos and print sheets in your browser. Free, no upload, no watermark.",
  },
  "/support/": {
    title: "Support PortraitPass",
    description:
      "Help keep PortraitPass free, private and available to everyone.",
  },
  "/about/": {
    title: "About & privacy — PortraitPass",
    description:
      "Your photos stay on your device. Learn how the open-source PortraitPass studio works.",
  },
  "/us-passport-photo/": {
    title: "US passport photo 2×2 — PortraitPass",
    description:
      "Prepare a 2 by 2 inch US passport photo and print sheet locally, with source-backed dimensions and framing guides.",
  },
  "/uk-passport-photo/": {
    title: "UK passport photo 35×45 — PortraitPass",
    description:
      "Prepare 35×45 mm printed UK passport photos. For online applications, keep your digital original unchanged.",
  },
  "/35x45-photo/": {
    title: "35×45 mm photo maker — PortraitPass",
    description:
      "Crop and arrange a 35×45 mm photo on a precisely sized print sheet, privately in your browser.",
  },
  "/passport-photo-print-sheet/": {
    title: "Passport photos on a 4×6 print sheet — PortraitPass",
    description:
      "Make a printable passport photo sheet with exact physical sizing, cut marks, and 4×6, A4 or Letter paper.",
  },
};
let template = await readFile("dist/index.html", "utf8");
// The studio's small stylesheet is critical to its first paint. Inline the built
// stylesheet so static pages do not wait for a separate mobile network round trip.
for (const match of template.matchAll(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g,
)) {
  const css = await readFile(
    resolve("dist", match[1].replace(/^\//, "")),
    "utf8",
  );
  template = template.replace(match[0], `<style>${css}</style>`);
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/ui/App.tsx");
  for (const [path, meta] of Object.entries(routes)) {
    const rendered = renderToString(createElement(App, { initialPath: path }));
    const html = template
      .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"\s*\/>/,
        `<meta name="description" content="${meta.description}"/>`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${SITE_URL}${path}"/><meta property="og:title" content="${meta.title}"/><meta property="og:description" content="${meta.description}"/><meta property="og:type" content="website"/><meta property="og:url" content="${SITE_URL}${path}"/><meta property="og:image" content="${SITE_URL}/og.png"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/></head>`,
      )
      .replace('<div id="root"></div>', `<div id="root">${rendered}</div>`);
    const dir = resolve("dist", path.slice(1));
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, "index.html"), html);
  }
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(
      routes,
    )
      .map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`)
      .join("")}</urlset>`,
  );
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
  console.log(`Prerendered ${Object.keys(routes).length} pages.`);
} finally {
  await server.close();
}
