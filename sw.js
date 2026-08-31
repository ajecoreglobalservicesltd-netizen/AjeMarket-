const CACHE_NAME = "ajemarket-shell-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./sell.html",
  "./dashboard.html",
  "./messages.html",
  "./account.html",
  "./product.html",
  "./edit.html",
  "./style.css",
  "./supabase.js",
  "./categories.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept external requests such as Supabase/CDN/Paystack.
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    PAGE NAVIGATION
    Always try the real GitHub Pages file first.
    If the network is unavailable, use the matching cached page.
    NEVER fall back to index.html for another page.
  */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) {
              return cached;
            }

            return new Response(
              `
              <!doctype html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>AjeMarket</title>
              </head>
              <body>
                <h2>AjeMarket is temporarily offline</h2>
                <p>Please reconnect to the internet and try again.</p>
              </body>
              </html>
              `,
              {
                headers: {
                  "Content-Type": "text/html; charset=utf-8"
                }
              }
            );
          });
        })
    );

    return;
  }

  /*
    STATIC FILES
    Network first so GitHub updates are picked up quickly.
    Cache is used only when the network is unavailable.
  */
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
