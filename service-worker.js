const CACHE = "zhelezo-shell-v4";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Главная страница и манифест: сначала сеть, чтобы правки доезжали сразу.
  // Кэш — только запасной вариант, если сети нет вообще (офлайн).
  const isShellPage = e.request.mode === "navigate"
    || e.request.url.endsWith("/")
    || e.request.url.endsWith("index.html")
    || e.request.url.endsWith("manifest.json");

  if (isShellPage) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Кэшируем только удачные ответы: 404 не должен затирать рабочую копию.
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Статика (иконки) меняется редко — можно смело кэшировать первой.
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
