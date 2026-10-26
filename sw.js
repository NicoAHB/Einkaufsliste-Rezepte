// Bei Änderungen an App-Dateien die Cache-Version erhöhen.
const CACHE = 'einkauf-shell-v3';
const FILES = ['./', './index.html', './styles.css', './app.js', './data.js', './prices.js',
  './manifest.webmanifest', './icon.svg', './apple-touch-icon.png', './beispieldaten.json', './README.md'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(new URL(file, self.location.href), { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('einkauf-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Niemals GitHub-API-Antworten oder Tokens im Service-Worker-Cache speichern.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const file = FILES.find(file => new URL(file, self.registration.scope).pathname === url.pathname);
  if (!file) return;
  // Ein vollständig installiertes Paket zusammen ausliefern. Dadurch bleiben
  // HTML und JavaScript auch bei schlechtem Empfang auf derselben App-Version.
  // Suchparameter zum Neuladen ändern nicht den Offline-Cache-Schlüssel.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(new URL(file, self.registration.scope).href);
    return cached || fetch(event.request);
  }));
});
