// Bei Änderungen an App-Dateien die Cache-Version erhöhen.
const CACHE = 'einkauf-shell-v60';
// Die Texterkennung ist groß (ca. 5 MB) und ändert sich selten: eigener Speicher, der App-Updates übersteht.
const VENDOR = 'einkauf-vendor-v1';
const FILES = ['./', './index.html', './styles.css', './app.js', './data.js', './prices.js', './recipe-import.js', './page-source.js', './ocr.js', './categories.js', './plan.js', './photos.js', './compact.js', './receipt.js', './cook.js', './news.js', './shop.js', './dragdelete.js', './brand.js', './help.js', './daily.js', './recipe-maker.js', './emoji.js', './spending.js', './cookable.js', './grocery-names.js', './pantry-suggestions.js', './zip.js', './pdf.js', './pdf-fonts.js', './recipe-sheet.js', './sheet-view.js', './recipe-filter.js', './theme.js',
  './manifest.webmanifest', './rezepte-des-tages.json', './icon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './beispieldaten.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(new URL(file, self.location.href), { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('einkauf-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
async function vendorFile(request) {
  const cache = await caches.open(VENDOR);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200) await cache.put(request, response.clone()).catch(() => {});
  return response;
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Niemals GitHub-API-Antworten oder Tokens im Service-Worker-Cache speichern.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(new URL('vendor/', self.registration.scope).pathname)) { event.respondWith(vendorFile(event.request)); return; }
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
