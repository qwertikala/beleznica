// Beležnica — service worker za offline rad
// Verzija keša — povećaj broj kad god želiš da forsiraš osvežavanje keša
var CACHE_NAME = "beleznica-cache-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL).catch(function () {
        // Ako neki fajl fali (npr. icon.png nije upload-ovan), ne blokiraj instalaciju
        return Promise.resolve();
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate: odmah posluži iz keša (radi offline i brzo),
// u pozadini osveži keš sa mreže ako je dostupna (uvek najnovija verzija sledeći put).
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
