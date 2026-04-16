const CACHE_NAME = "fitassess-v1";

// Recursos estáticos que cacheamos al instalar
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/favicon.png",
];

// Instalar: precachear assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar: eliminar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first para páginas SSR, cache first para assets estáticos
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptamos mismo origen
  if (url.origin !== location.origin) return;

  // Assets estáticos (_astro/, icons/, fonts) → cache first
  if (
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Páginas SSR → Network first, fallback a offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/login").then((cached) => cached || new Response(
          `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión — FitAssess Pro</title><style>body{font-family:sans-serif;background:#070c18;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:2rem}h1{font-size:1.5rem;font-weight:900}p{color:#94a3b8;margin-top:.5rem}a{display:inline-block;margin-top:1.5rem;background:#10b981;color:#000;font-weight:700;padding:.75rem 1.5rem;border-radius:.75rem;text-decoration:none}</style></head><body><div><h1>Sin conexión</h1><p>Verifica tu conexión a internet e intenta de nuevo.</p><a href="/login">Reintentar</a></div></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        ))
      )
    );
    return;
  }
});
