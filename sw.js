/* Service worker — makes the app installable and lets it open (from cache) on a weak connection.
   Only this website's own files are cached (network first, cache as fallback). Database / login traffic
   (Firestore, Firebase Auth, CDNs) is never touched, so live data always comes straight from the server. */
const CACHE_NAME = "png-enterprise-v3";
const APP_SHELL = ["./", "./index.html", "./forms-tpl.js", "./manifest.json", "./icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;          // Firestore, Firebase login, CDNs: straight to the network
  if (url.pathname.startsWith("/__/")) return;               // Firebase Hosting's own reserved paths
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
