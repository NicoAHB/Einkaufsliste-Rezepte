/* Produktbilder für die Einkaufsliste. Die Bilder kommen vollautomatisch von Open Food Facts (kostenlos, ohne Schlüssel): Zu jedem
   Artikelnamen wird einmal gesucht, der erste Treffer mit brauchbarem Vorderseiten-Bild gilt. Das Ergebnis (Bild-Adresse oder „kein Treffer“)
   bleibt auf dem Gerät gespeichert, gleiche Namen (ohne Rücksicht auf Groß-/Kleinschreibung) teilen sich ein Bild. Reine Logik ohne DOM. */
import { productKey } from './prices.js';

export const IMAGE_CACHE_KEY = 'einkauf-images-v1';
export const MISS_DAYS = 7;              // „kein Treffer“ wird erst nach so vielen Tagen erneut versucht
export const REQUEST_GAP_MS = 6500;      // Open Food Facts erlaubt etwa 10 Suchen pro Minute: höchstens eine Abfrage alle 6,5 Sekunden
export const FAILURE_RETRY_MS = 10 * 60 * 1000;   // nach einem Netzfehler frühestens nach zehn Minuten erneut
const RATE_LIMIT_PAUSE_MS = 60 * 1000;
const MAX_ENTRIES = 1500;
const DAY_MS = 86400000;
const API = 'https://world.openfoodfacts.org/cgi/search.pl';
const IMAGE_HOSTS = new Set(['images.openfoodfacts.org', 'static.openfoodfacts.org']);

export const imageKey = name => productKey(name);

// Ersatzsymbol, solange es kein Bild gibt: je Kategorie (Symbole in index.html), sonst ein neutrales Paket.
const CATEGORY_ICONS = { obst: 'i-p-obst', brot: 'i-p-brot', fleisch: 'i-p-fleisch', kuehl: 'i-p-kuehl', tiefkuehl: 'i-p-tiefkuehl', vorrat: 'i-p-vorrat',
  gewuerze: 'i-p-gewuerze', snacks: 'i-p-snacks', getraenke: 'i-p-getraenke', haushalt: 'i-p-haushalt' };
export const categoryIcon = id => CATEGORY_ICONS[id] || 'i-p-box';

// Such-Adresse: bevorzugt Produkte aus Deutschland, sonst weltweit. Nur die nötigen Felder, kleines Bild.
export function searchUrl(name, germany = true) {
  const query = new URLSearchParams({
    search_terms: String(name).trim().replace(/\s+/g, ' ').slice(0, 80), search_simple: '1', action: 'process', json: '1', page_size: '12',
    sort_by: 'unique_scans_n', fields: 'code,product_name,image_front_small_url,image_front_thumb_url,image_small_url'
  });
  if (germany) { query.set('tagtype_0', 'countries'); query.set('tag_contains_0', 'contains'); query.set('tag_0', 'germany'); }
  return `${API}?${query}`;
}
// Nur Bilder von Open Food Facts, immer über https.
export function allowedImage(value) {
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol) || !IMAGE_HOSTS.has(url.hostname) || url.username || url.password) return '';
    url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}
// Der erste Treffer mit einem brauchbaren Vorderseiten-Bild (klein genug für eine Kachel); '' = keiner.
export function pickImage(data) {
  const products = Array.isArray(data?.products) ? data.products : [];
  for (const product of products) {
    for (const field of ['image_front_small_url', 'image_front_thumb_url', 'image_small_url']) {
      const url = allowedImage(product?.[field]);
      if (url) return url;
    }
  }
  return '';
}

function readCache(storage) {
  const cache = new Map();
  try {
    const saved = JSON.parse(storage?.getItem(IMAGE_CACHE_KEY) || '{}');
    for (const [key, entry] of Object.entries(saved || {})) {
      if (!entry || typeof entry !== 'object' || !Number.isFinite(entry.t)) continue;
      if (typeof entry.u === 'string' && allowedImage(entry.u)) cache.set(key, { u: allowedImage(entry.u), t: entry.t });
      else if (entry.n === 1) cache.set(key, { n: 1, t: entry.t });
    }
  } catch { /* leerer Speicher */ }
  return cache;
}

/* Der Bilddienst. Zustände je Artikelname (`state`):
   image = Bild-Adresse bekannt · none = kein Treffer (Ersatzsymbol) · failed = Abfrage fehlgeschlagen (Ersatzsymbol, später neuer Versuch) · pending = wird noch gesucht.
   Abfragen laufen nacheinander im Abstand von `gap` Millisekunden. Ausgeschaltet (setEnabled(false)) sendet er nichts und bricht Laufendes ab. */
export function createImages({ fetch: fetchImpl = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage, now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id), gap = REQUEST_GAP_MS, timeout = 12000, onChange = () => {} } = {}) {
  const cache = readCache(storage), queue = [], waiting = new Set(), failed = new Map();
  let enabled = true, running = false, last = -Infinity, pauseUntil = 0, timer = null, controller = null;

  function save() {
    if (cache.size > MAX_ENTRIES) for (const [key] of [...cache].sort((a, b) => a[1].t - b[1].t).slice(0, cache.size - MAX_ENTRIES)) cache.delete(key);
    try { storage?.setItem(IMAGE_CACHE_KEY, JSON.stringify(Object.fromEntries(cache))); } catch { /* Speicher voll oder gesperrt: dann eben ohne Merken */ }
  }
  const freshMiss = entry => entry?.n === 1 && now() - entry.t < MISS_DAYS * DAY_MS;

  function state(name) {
    const key = imageKey(name), entry = cache.get(key);
    if (entry?.u) return { state: 'image', url: entry.u };
    if (entry?.n === 1) return { state: 'none' };                         // auch ein abgelaufener Fehlversuch zeigt solange das Ersatzsymbol
    if ((failed.get(key) ?? 0) > now()) return { state: 'failed' };
    return { state: 'pending' };
  }
  function request(name) {
    const key = imageKey(name);
    if (!enabled || !key || !fetchImpl) return;
    const entry = cache.get(key);
    if (entry?.u || freshMiss(entry) || waiting.has(key) || (failed.get(key) ?? 0) > now()) return;
    waiting.add(key); queue.push({ key, name: String(name).trim(), germany: true });
    pump();
  }
  function pump() {
    if (!enabled || running || timer !== null || !queue.length) return;
    timer = setTimer(() => { timer = null; void run(); }, Math.max(0, last + gap - now(), pauseUntil - now()));
  }
  async function run() {
    if (!enabled || running) return;
    const job = queue.shift();
    if (!job) return;
    running = true; last = now(); controller = new AbortController();
    const own = controller, stop = setTimer(() => own.abort(), timeout);
    let again = false;
    try {
      const response = await fetchImpl(searchUrl(job.name, job.germany), { signal: own.signal });
      if (response.status === 429) { pauseUntil = now() + RATE_LIMIT_PAUSE_MS; throw new Error('Zu viele Abfragen'); }
      if (!response.ok) throw new Error(`Open Food Facts: ${response.status}`);
      const data = await response.json();
      if (own.signal.aborted || !enabled) throw new Error('abgebrochen');   // inzwischen ausgeschaltet: nichts mehr übernehmen
      const url = pickImage(data);
      if (url) { cache.set(job.key, { u: url, t: now() }); failed.delete(job.key); save(); }
      else if (job.germany) { queue.unshift({ ...job, germany: false }); again = true; }   // nichts aus Deutschland: einmal weltweit versuchen
      else { cache.set(job.key, { n: 1, t: now() }); failed.delete(job.key); save(); }
    } catch {
      if (enabled) failed.set(job.key, now() + FAILURE_RETRY_MS);    // nichts speichern: später noch einmal versuchen
    } finally {
      clearTimer(stop);
      if (!again) waiting.delete(job.key);
      running = false; controller = null;
    }
    if (!again && enabled) onChange(job.key);
    pump();
  }
  function setEnabled(on) {
    enabled = Boolean(on);
    if (enabled) return;
    queue.length = 0; waiting.clear();
    if (timer !== null) { clearTimer(timer); timer = null; }
    controller?.abort();
  }
  // Ein gespeichertes Bild lässt sich nicht laden (z. B. gelöscht): wie „kein Treffer“ behandeln, später neu suchen.
  function broken(name) {
    const key = imageKey(name);
    if (cache.get(key)?.u) { cache.set(key, { n: 1, t: now() }); save(); onChange(key); }
  }
  return { state, request, setEnabled, broken, get enabled() { return enabled; }, get busy() { return running || queue.length > 0; }, get size() { return cache.size; } };
}
