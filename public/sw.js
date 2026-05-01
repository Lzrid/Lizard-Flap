// Bumped from v1 -> v2 so old caches (which contained the pre-D1, localStorage
// leaderboard bundle) get purged on activate.
const CACHE = "lizard-flap-v2";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache or intercept the leaderboard API — must be live across devices.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation / HTML: network-first so a fresh deploy is picked up immediately.
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") ?? "").includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (hit) => hit ?? caches.match("./index.html").then((r) => r ?? Response.error()),
          ),
        ),
    );
    return;
  }

  // Hashed JS/CSS assets and icons: cache-first (filename hash invalidates).
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r ?? Response.error()));
    }),
  );
});
