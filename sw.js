// Bei Änderungen an App-Dateien die Cache-Version erhöhen.
const CACHE = 'einkauf-shell-v1';
const FILES = ['./', './index.html', './styles.css', './app.js', './data.js',
  './manifest.webmanifest', './icon.svg', './apple-touch-icon.png', './beispieldaten.json', './README.md'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('einkauf-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Niemals GitHub-API-Antworten oder Tokens im Service-Worker-Cache speichern.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const allowed = FILES.some(file => new URL(file, self.registration.scope).href === url.href);
  if (!allowed) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
