/* Interstitium Labs — service worker.
   Cache-first app shell (versioned), network-first for catalog data.
   No third-party requests are ever cached or made. */
var CACHE = 'il-university-v4'; // v4: command palette + Palantir motion pass (data/ stays network-first)

var SHELL = [
  './',
  './index.html',
  './paths.html',
  './academy.html',
  './path.html',
  './learn.html',
  './assess.html',
  './courses.html',
  './enroll.html',
  './honesty.html',
  './about.html',
  './css/il.css',
  './js/app.js',
  './js/hero.js',
  './js/adaptive.js',
  './js/noah.js',
  './js/palette.js',
  './assets/sigil.svg',
  './assets/noah-avatar.png',
  './manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isDataRequest(url) {
  return url.pathname.indexOf('/data/') !== -1;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // same-origin only, always

  if (isDataRequest(url)) {
    // Catalog data: network-first so new publishes arrive; cache fallback offline.
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || Response.error();
        });
      })
    );
    return;
  }

  // App shell: cache-first.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline and not cached: fall back to the shell entry page for navigations.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
