/* PortraitPass service worker. Hand-written, no build step.
 *
 * It only ever stores this site's own files (pages, scripts, fonts, models).
 * Photos never reach it: they are local blobs inside the page and are never
 * fetched over the network. Cross-origin requests and non-GET requests are
 * not touched at all.
 *
 * Strategies:
 *   navigations           network first (5 s), then cached page, then cached "/"
 *   /assets/* (hashed)    cache first
 *   /wasm/*, /models/*    cache first (stored only once face assist first loads them)
 *   icons, demo images    stale while revalidate
 * Correctness does not depend on a cache version: pages are always tried on
 * the network first, and hashed assets are immutable by name.
 */
const PAGES = "pp-pages-v1";
const ASSETS = "pp-assets-v1";
const HEAVY = "pp-heavy-v1";
const STATIC = "pp-static-v1";
const CURRENT = [PAGES, ASSETS, HEAVY, STATIC];
const MAX_ASSETS = 80; // hashed files from older builds are trimmed oldest-first
const NAV_TIMEOUT_MS = 5000;
const SHELL = ["/", "/studio/"];
const SKIP_PRECACHE = /vision_bundle/;

const pageKey = (url) => {
  const u = new URL(url);
  return u.origin + u.pathname;
};

const cacheable = (res) => res && res.status === 200 && res.type === "basic" && !res.redirected;

/** Fetch the shell pages and the hashed files they need, so the first visit is enough to work offline. */
async function precache() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const wanted = new Set();
  const scan = (text) => {
    for (const m of text.matchAll(/\/?assets\/[A-Za-z0-9_.-]+\.(?:js|css|woff2)/g)) {
      const path = "/" + m[0].replace(/^\//, "");
      if (SKIP_PRECACHE.test(path)) continue;
      // Latin fonts only; other subsets are cached the first time they are used.
      if (path.endsWith(".woff2") && !/-latin-\d/.test(path)) continue;
      wanted.add(path);
    }
  };
  for (const path of SHELL) {
    try {
      const res = await fetch(path, { cache: "reload" });
      if (!cacheable(res)) continue;
      scan(await res.clone().text());
      await pages.put(pageKey(new URL(path, self.location.origin)), res);
    } catch {
      /* offline during install: the worker still installs and caches as pages load */
    }
  }
  // Follow script imports one level at a time (lazy chunks such as the studio).
  const seen = new Set();
  let queue = [...wanted];
  for (let depth = 0; depth < 3 && queue.length; depth++) {
    const next = [];
    await Promise.all(
      queue.map(async (path) => {
        if (seen.has(path)) return;
        seen.add(path);
        try {
          const req = new Request(path);
          let res = await assets.match(req);
          if (!res) {
            res = await fetch(req);
            if (!cacheable(res)) return;
            await assets.put(req, res.clone());
          }
          if (path.endsWith(".js") || path.endsWith(".css")) {
            const known = new Set(wanted);
            scan(await res.text());
            for (const p of wanted) if (!known.has(p)) next.push(p);
          }
        } catch {
          /* ignore: fetched on demand later */
        }
      }),
    );
    queue = next;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("pp-") && !CURRENT.includes(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) {
    await cache.put(request, res.clone());
    if (limit) trim(cacheName, limit);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then(async (res) => {
      if (cacheable(res)) await cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (hit) return hit;
  const res = await update;
  return res || Response.error();
}

async function navigation(request) {
  const cache = await caches.open(PAGES);
  const key = pageKey(request.url);
  const cached = async () => {
    const withSlash = key.endsWith("/") ? key : key + "/";
    return (
      (await cache.match(key)) ||
      (await cache.match(withSlash)) ||
      (await cache.match(pageKey(new URL("/", self.location.origin))))
    );
  };
  try {
    const network = fetch(request);
    const res = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS);
      network.then(
        (r) => (clearTimeout(timer), resolve(r)),
        (e) => (clearTimeout(timer), reject(e)),
      );
    });
    if (cacheable(res) && (res.headers.get("content-type") || "").includes("text/html")) {
      await cache.put(key, res.clone());
    }
    return res;
  } catch {
    const fallback = await cached();
    if (fallback) return fallback;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(navigation(request));
    return;
  }
  // Range requests would give partial bodies; let the network answer them.
  if (request.headers.has("range")) return;

  const p = url.pathname;
  if (p.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS, MAX_ASSETS));
  } else if (p.startsWith("/wasm/") || p.startsWith("/models/")) {
    event.respondWith(cacheFirst(request, HEAVY));
  } else if (
    p.startsWith("/icons/") ||
    p === "/favicon.svg" ||
    p === "/manifest.webmanifest" ||
    /^\/demo-[a-z0-9-]+\.(?:png|webp)$/.test(p)
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC));
  }
});
