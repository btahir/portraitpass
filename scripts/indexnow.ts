// Tell Bing, Yandex, Naver, Seznam and other IndexNow search engines which URLs changed.
// Google does not use IndexNow: for Google use Search Console (sitemap submit, URL Inspection).
//
// Run it by hand AFTER a deploy is live (the key file must already be reachable):
//   ./node_modules/.bin/tsx scripts/indexnow.ts --dry          # list what would be sent, send nothing
//   ./node_modules/.bin/tsx scripts/indexnow.ts                # send every URL in the live sitemaps
//   ./node_modules/.bin/tsx scripts/indexnow.ts --since 2026-10-01   # only URLs whose lastmod is on or after this date
//   ./node_modules/.bin/tsx scripts/indexnow.ts --url /us-passport-photo/ --url /uk-passport-photo/
//
// The key is public by design: IndexNow proves ownership by fetching SITE_URL/<key>.txt, which
// public/<key>.txt serves. Rotating it means renaming that file and changing KEY below.
import { SITE_URL } from "../src/config";

const KEY = "30c8ad67453ddff1d9d8a5f90dd68012";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const values = (name: string) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const since = values("--since")[0];
const explicit = values("--url");
const dry = flag("--dry");

async function text(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return r.text();
}

async function sitemapUrls(url: string): Promise<{ loc: string; lastmod?: string }[]> {
  const xml = await text(url);
  if (xml.includes("<sitemapindex")) {
    const children = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    return (await Promise.all(children.map(sitemapUrls))).flat();
  }
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(m[1])![1].replace(/&amp;/g, "&"),
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1],
  }));
}

// The key file has to be live before search engines can accept the submission.
const keyBody = (await text(`${SITE_URL}/${KEY}.txt`)).trim();
if (keyBody !== KEY) throw new Error(`${SITE_URL}/${KEY}.txt does not contain the key. Deploy first.`);

let urls: string[];
if (explicit.length) urls = explicit.map((u) => (u.startsWith("http") ? u : SITE_URL + u));
else {
  const all = await sitemapUrls(`${SITE_URL}/sitemap.xml`);
  urls = all.filter((u) => !since || (u.lastmod ?? "9999") >= since).map((u) => u.loc);
}
console.log(`${urls.length} URLs${since ? ` with lastmod >= ${since}` : ""}.`);
if (dry) {
  console.log(urls.slice(0, 10).join("\n"), urls.length > 10 ? "\n..." : "");
  process.exit(0);
}
// The protocol takes up to 10,000 URLs per request.
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList: batch,
    }),
  });
  // 200 or 202 means accepted. 403: key file not found or mismatched. 422: URLs do not belong to the host. 429: slow down.
  console.log(`batch ${i / 10000 + 1}: HTTP ${r.status} (${batch.length} URLs)`);
  if (r.status >= 300) console.log(await r.text());
}
