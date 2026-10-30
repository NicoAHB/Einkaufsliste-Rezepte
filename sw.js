// Bei Änderungen an App-Dateien die Cache-Version erhöhen.
const CACHE = 'einkauf-shell-v83';
// Die Texterkennung ist groß (ca. 5 MB) und ändert sich selten: eigener Speicher, der App-Updates übersteht.
const VENDOR = 'einkauf-vendor-v1';
const FILES = ['./', './index.html', './styles.css', './app.js', './data.js', './prices.js', './wishes.js', './recipe-import.js', './page-source.js', './ocr.js', './categories.js', './plan.js', './photos.js', './compact.js', './receipt.js', './cook.js', './news.js', './shop.js', './dragdelete.js', './brand.js', './store-catalog.js', './product-catalog.js', './product-catalog-data.js', './product-picker.js', './product-images.js', './help.js', './daily.js', './recipe-maker.js', './emoji.js', './spending.js', './family.js', './spending-view.js', './cookable.js', './grocery-names.js', './product-names.js', './pantry-suggestions.js', './pantry.js', './pantry-view.js', './zip.js', './pdf.js', './pdf-fonts.js', './recipe-sheet.js', './sheet-view.js', './recipe-filter.js', './theme.js',
  './manifest.webmanifest', './rezepte-des-tages.json', './icon.svg', './assets/branding/sattplan-logo.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './beispieldaten.json',
  './assets/stores/aldi-nord.png', './assets/stores/aldi-sued.svg', './assets/stores/alnatura.png', './assets/stores/bio-company.png', './assets/stores/budni.png', './assets/stores/combi.png', './assets/stores/denns.png', './assets/stores/diska.png', './assets/stores/dm.png', './assets/stores/edeka.png', './assets/stores/famila-nordost.png', './assets/stores/famila-nordwest.png', './assets/stores/feneberg.png', './assets/stores/globus.png', './assets/stores/hit.png', './assets/stores/kaufland.png', './assets/stores/lidl.svg', './assets/stores/marktkauf.svg', './assets/stores/mueller.png', './assets/stores/nah-gut.png', './assets/stores/nahkauf.png', './assets/stores/netto-hund.png', './assets/stores/netto-marken.png', './assets/stores/norma.png', './assets/stores/penny.png', './assets/stores/rewe.png', './assets/stores/rossmann.png', './assets/stores/tegut.png', './assets/stores/v-markt.png', './assets/stores/wasgau.png',
  './assets/products/produce.webp', './assets/products/fresh.webp', './assets/products/everyday.webp', './assets/products/household.webp', './assets/products/produce-more.webp', './assets/products/pantry-more.webp', './assets/products/groups.webp',
  './assets/products/fruit-varieties.webp', './assets/products/vegetable-varieties.webp', './assets/products/greens-herbs.webp', './assets/products/bakery-selection.webp', './assets/products/cheese-selection.webp', './assets/products/dairy-selection.webp', './assets/products/plant-based-selection.webp', './assets/products/meat-deli-selection.webp', './assets/products/meat-fish-selection.webp', './assets/products/frozen-selection.webp', './assets/products/pasta-grains-selection.webp', './assets/products/canned-selection.webp', './assets/products/sauces-selection.webp', './assets/products/spices-selection.webp', './assets/products/baking-nuts-selection.webp', './assets/products/breakfast-selection.webp', './assets/products/sweets-selection.webp', './assets/products/savoury-selection.webp', './assets/products/drinks-selection.webp', './assets/products/coffee-tea-selection.webp', './assets/products/cleaning-selection.webp', './assets/products/laundry-kitchen-selection.webp', './assets/products/body-care-selection.webp', './assets/products/hygiene-selection.webp', './assets/products/baby-pets-selection.webp', './assets/products/home-garden-selection.webp'];
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
