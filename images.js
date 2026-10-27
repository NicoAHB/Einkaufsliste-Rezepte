/* Echte Fotos zu Artikeln (nur auf Wunsch, Einstellung „Fotos aus dem Internet suchen“; ohne sie zeigt die App Emoji, siehe emoji.js).
   Zu jedem Artikelnamen wird einmal gesucht, in dieser Reihenfolge: 1. Wikipedia/Wikimedia (Foto der Sache selbst: Birne, Reis, Butter),
   2. Open Food Facts, Produkte aus Deutschland, 3. Open Food Facts weltweit. Ein Treffer zählt nur, wenn Titel bzw. Produktname wirklich zum
   Artikelnamen passen („Birne“ findet kein „Birnensaft“, „Reis“ keine „Reiswaffeln“). Das Ergebnis (Bild-Adresse oder „kein Treffer“) bleibt auf
   dem Gerät gespeichert, gleiche Namen teilen sich ein Bild. Reine Logik ohne DOM. */
import { productKey } from './prices.js';

export const IMAGE_CACHE_KEY = 'einkauf-images-v2';      // v1 (erste Fassung mit schlechter Trefferauswahl) wird verworfen
const OLD_CACHE_KEYS = ['einkauf-images-v1'];
export const MISS_DAYS = 7;                              // „kein Treffer“ wird erst nach so vielen Tagen erneut versucht
export const GAPS = Object.freeze({ wiki: 400, off: 6500 });   // Mindestabstand der Abfragen je Quelle (ms): Open Food Facts erlaubt rund 10 Suchen pro Minute
export const FAILURE_RETRY_MS = 10 * 60 * 1000;          // nach einem Netzfehler frühestens nach zehn Minuten erneut
const RATE_LIMIT_PAUSE_MS = 60 * 1000;
const MAX_ENTRIES = 1500;
const DAY_MS = 86400000;
const WIKI_API = 'https://de.wikipedia.org/w/api.php';
const OFF_API = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_HOSTS = new Set(['images.openfoodfacts.org', 'static.openfoodfacts.org']);

export const imageKey = name => productKey(name);

/* ---------- Wörter ---------- */
const fold = text => String(text).normalize('NFC').toLocaleLowerCase('de').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
const STOP = new Set(['bio', 'frisch', 'frische', 'frischer', 'frisches', 'mit', 'und', 'oder', 'in', 'aus', 'vom', 'von', 'der', 'die', 'das', 'ein', 'eine', 'kg', 'g', 'ml', 'l',
  'stück', 'stueck', 'stk', 'packung', 'pack', 'pkg', 'dose', 'dosen', 'glas', 'flasche', 'bund', 'becher', 'beutel', 'tüte', 'xl', 'xxl', 'groß', 'gross', 'klein', 'kleine', 'mini',
  'light', 'zero', 'vegan', 'ohne', 'extra', 'neu', 'original', 'classic', 'tk']);
// Die bedeutsamen Wörter eines Namens (ohne Zahlen, Mengenangaben und Füllwörter); bleibt nichts übrig, alle Wörter.
export function queryWords(name) {
  const all = String(name ?? '').normalize('NFC').toLocaleLowerCase('de').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const words = all.filter(word => word.length >= 2 && !/^\d+$/.test(word) && !STOP.has(word));
  return words.length ? words : all;
}
// Wortstamm für den Vergleich: Umlaute und ß vereinfacht, Mehrzahl- und Beugungsendungen weg („Äpfel“ = „Apfel“, „Tomaten“ = „Tomate“, „Nüsse“ = „Nuss“).
const ENDINGS = ['ern', 'en', 'er', 'es', 'em', 'e', 'n', 's'];
export function stem(word) {
  const w = fold(word);
  for (const end of ENDINGS) {
    if (!w.endsWith(end) || w.length - end.length < 3) continue;
    if (end === 's' && (w.length <= 4 || w.endsWith('ss'))) continue;      // „Reis“, „Nuss“ bleiben ganz
    return w.slice(0, -end.length);
  }
  return w;
}

/* ---------- Bild-Adressen ---------- */
// Nur Bilder von Open Food Facts und Wikimedia, immer über https.
export function allowedImage(value) {
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return '';
    const ok = OFF_HOSTS.has(url.hostname) || (url.hostname === 'upload.wikimedia.org' && url.pathname.startsWith('/wikipedia/'));
    if (!ok) return '';
    url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}

/* ---------- Wikipedia / Wikimedia ---------- */
// Wo die Suche nach dem Namen selbst nichts Rechtes findet, gibt es den Artikel unter einem anderen Titel.
const WIKI_TITLES = { ei: 'Hühnerei', eier: 'Hühnerei', salz: 'Speisesalz', wasser: 'Mineralwasser', ol: 'Speiseöl', chips: 'Kartoffelchips' };
const wikiTerm = name => { const words = queryWords(name); return (words.length === 1 && WIKI_TITLES[fold(words[0])]) || words.join(' '); };
export function wikiUrl(name) {
  const term = wikiTerm(name).slice(0, 80);
  const params = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search', gsrsearch: term, gsrnamespace: '0', gsrlimit: '8',
    prop: 'pageimages|description|pageprops', piprop: 'thumbnail|name', pithumbsize: '240', pilimit: '8', ppprop: 'disambiguation' });
  return `${WIKI_API}?${params}`;
}
// Die Kurzbeschreibung des Artikels muss nach Lebensmittel, Pflanze, Getränk, Gewürz oder Ähnlichem klingen (sonst Person, Ort, Marke, Film …).
const FOOD = /lebensmittel|nahrungsmittel|gemüse|obst|frucht|früchte|pflanze|gattung|art der|unterart|sorte|nutz|gewürz|kraut|getreide|reis|nuss|nüsse|samen|pilz|hülsenfrucht|speise|gericht|gebäck|backware|brot|teigware|nudel|käse|milch|wurst|fleisch|fisch|getränk|saft|wein|bier|tee|kaffee|süßware|schokolade|zucker|öl|fett|essig|soße|sauce|creme|aufstrich|konserve|zutat|beilage|snack|kuchen|torte|honig|marmelade|joghurt|sahne|butter|margarine|pudding|dessert|keks|eier|ei\b|salz|mehl|stärke|kartoffel|zwiebel|knoblauch|salat|suppe|eintopf|süßspeise|nachspeise|kost|essen|trink|mahlzeit|mineralwasser|brotaufstrich|mehrzahl|gelee|likör|spirituose|konfekt|gemisch/i;
const BAD_FILE = /logo|wappen|flag|flagge|karte|map|symbol|icon|diagramm|schema|signet|piktogramm|portrait|porträt|\.svg|\.gif|\.pdf|\.tif/i;
const baseTitle = title => String(title ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
const titleStem = title => baseTitle(title).split(/\s+/).map(stem).join(' ');
// Der erste Artikel, dessen Titel zum Namen passt, eine Lebensmittel-Beschreibung hat und ein Foto zeigt; '' = keiner.
export function pickWiki(data, name) {
  const words = queryWords(name);
  if (!words.length) return '';
  const alias = words.length === 1 ? WIKI_TITLES[fold(words[0])] : '';
  const exact = alias ? titleStem(alias) : words.map(stem).join(' '), head = alias ? exact : stem(words[words.length - 1]);
  const raw = data?.query?.pages, pages = (Array.isArray(raw) ? raw : Object.values(raw || {})).filter(page => page && typeof page === 'object');
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of pages) {
    const stemmed = titleStem(page.title);
    if (page.pageprops && 'disambiguation' in page.pageprops) continue;
    if (stemmed !== exact && stemmed !== head) continue;                      // der Titel muss der Name sein (oder dessen Hauptwort), nicht nur ähnlich
    const description = typeof page.description === 'string' ? page.description : '';
    if (description ? !FOOD.test(description) : stemmed !== exact) continue;    // ohne Beschreibung nur bei genau gleichem Titel
    const source = allowedImage(page.thumbnail?.source);
    if (!source || !source.startsWith('https://upload.wikimedia.org/') || BAD_FILE.test(`${page.pageimage ?? ''} ${source}`)) continue;
    return source;
  }
  return '';
}

/* ---------- Open Food Facts ---------- */
// Such-Adresse: bevorzugt Produkte aus Deutschland, sonst weltweit. Nur die nötigen Felder, kleines Bild.
export function searchUrl(name, germany = true) {
  const query = new URLSearchParams({
    search_terms: queryWords(name).join(' ').slice(0, 80) || String(name).trim().slice(0, 80), search_simple: '1', action: 'process', json: '1', page_size: '24', sort_by: 'unique_scans_n',
    fields: 'code,product_name,product_name_de,generic_name,generic_name_de,brands,image_front_small_url,image_front_thumb_url,image_small_url'
  });
  if (germany) { query.set('tagtype_0', 'countries'); query.set('tag_contains_0', 'contains'); query.set('tag_0', 'germany'); }
  return `${OFF_API}?${query}`;
}
const frontImage = product => {
  for (const field of ['image_front_small_url', 'image_front_thumb_url', 'image_small_url']) {
    const url = allowedImage(product?.[field]);
    if (url) return url;
  }
  return '';
};
/* Der passendste Treffer mit brauchbarem Vorderseiten-Bild: Der Produktname muss alle bedeutsamen Wörter des Artikelnamens als ganze Wörter enthalten
   (nach Wortstamm), und unter den passenden gewinnt der mit den wenigsten zusätzlichen Wörtern („Reis“ vor „Reis-Pfanne mit Gemüse“); gleich viele: der Beliebtere.
   Findet sich so nichts, genügt bei mehreren Wörtern das letzte (das Hauptwort: „Barilla Spaghetti“ → „Spaghetti“). Ohne Namen: der erste mit Bild. */
export function pickImage(data, name = '') {
  const products = Array.isArray(data?.products) ? data.products : [], words = queryWords(name).map(stem);
  const rank = need => {
    let best = null;
    for (const product of products) {
      const url = frontImage(product);
      if (!url) continue;
      const title = queryWords(product?.product_name_de || product?.product_name || '').map(stem), generic = queryWords(product?.generic_name_de || product?.generic_name || '').map(stem);
      const have = new Set([...title, ...generic]), brand = new Set(queryWords(product?.brands || '').map(stem));
      if (!need.every(word => have.has(word))) continue;
      const extra = title.filter(word => !need.includes(word) && !brand.has(word)).length;
      if (!best || extra < best.extra) best = { url, extra };
    }
    return best?.url || '';
  };
  if (!words.length) return products.map(frontImage).find(Boolean) || '';
  return rank(words) || (words.length > 1 ? rank([words[words.length - 1]]) : '');
}

/* ---------- Speicher ---------- */
function readCache(storage) {
  const cache = new Map();
  try {
    for (const old of OLD_CACHE_KEYS) storage?.removeItem?.(old);
    const saved = JSON.parse(storage?.getItem(IMAGE_CACHE_KEY) || '{}');
    for (const [key, entry] of Object.entries(saved || {})) {
      if (!entry || typeof entry !== 'object' || !Number.isFinite(entry.t)) continue;
      if (typeof entry.u === 'string' && allowedImage(entry.u)) cache.set(key, { u: allowedImage(entry.u), t: entry.t });
      else if (entry.n === 1) cache.set(key, { n: 1, t: entry.t });
    }
  } catch { /* leerer Speicher */ }
  return cache;
}

// Die Stationen einer Suche, nacheinander, bis eine ein Bild liefert.
const PLAN = [
  { source: 'wiki', url: job => wikiUrl(job.name), pick: (data, job) => pickWiki(data, job.name) },
  { source: 'off', url: job => searchUrl(job.name, true), pick: (data, job) => pickImage(data, job.name) },
  { source: 'off', url: job => searchUrl(job.name, false), pick: (data, job) => pickImage(data, job.name) }
];

/* Der Bilddienst. Zustände je Artikelname (`state`):
   image = Bild-Adresse bekannt · none = kein Treffer · failed = Abfrage fehlgeschlagen (später neuer Versuch) · pending = wird noch gesucht.
   Jede Quelle hat ihre eigene Reihe: nacheinander, im Abstand von `gaps[quelle]` Millisekunden. Ausgeschaltet (setEnabled(false)) sendet er nichts. */
export function createImages({ fetch: fetchImpl = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage, now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id), gaps = GAPS, timeout = 12000, onChange = () => {} } = {}) {
  const cache = readCache(storage), waiting = new Set(), failed = new Map();
  const lanes = Object.fromEntries(Object.keys(gaps).map(source => [source, { queue: [], running: false, last: -Infinity, pauseUntil: 0, timer: null, controller: null }]));
  let enabled = true;

  function save() {
    if (cache.size > MAX_ENTRIES) for (const [key] of [...cache].sort((a, b) => a[1].t - b[1].t).slice(0, cache.size - MAX_ENTRIES)) cache.delete(key);
    try { storage?.setItem(IMAGE_CACHE_KEY, JSON.stringify(Object.fromEntries(cache))); } catch { /* Speicher voll oder gesperrt: dann eben ohne Merken */ }
  }
  const freshMiss = entry => entry?.n === 1 && now() - entry.t < MISS_DAYS * DAY_MS;

  function state(name) {
    const key = imageKey(name), entry = cache.get(key);
    if (entry?.u) return { state: 'image', url: entry.u };
    if (entry?.n === 1) return { state: 'none' };                         // auch ein abgelaufener Fehlversuch bleibt bis zur neuen Suche „kein Treffer“
    if ((failed.get(key) ?? 0) > now()) return { state: 'failed' };
    return { state: 'pending' };
  }
  function request(name) {
    const key = imageKey(name);
    if (!enabled || !key || !fetchImpl) return;
    const entry = cache.get(key);
    if (entry?.u || freshMiss(entry) || waiting.has(key) || (failed.get(key) ?? 0) > now()) return;
    waiting.add(key); enqueue({ key, name: String(name).trim(), step: 0, trouble: false });
  }
  function enqueue(job, front = false) {
    const source = PLAN[job.step].source;
    lanes[source].queue[front ? 'unshift' : 'push'](job);
    pump(source);
  }
  function pump(source) {
    const lane = lanes[source];
    if (!enabled || lane.running || lane.timer !== null || !lane.queue.length) return;
    lane.timer = setTimer(() => { lane.timer = null; void run(source); }, Math.max(0, lane.last + gaps[source] - now(), lane.pauseUntil - now()));
  }
  function finish(job, entry) {
    cache.set(job.key, entry); failed.delete(job.key); waiting.delete(job.key); save(); onChange(job.key);
  }
  async function run(source) {
    const lane = lanes[source];
    if (!enabled || lane.running) return;
    const job = lane.queue.shift();
    if (!job) return;
    lane.running = true; lane.last = now(); lane.controller = new AbortController();
    const own = lane.controller, stop = setTimer(() => own.abort(), timeout), step = PLAN[job.step];
    let found = '', trouble = false;
    try {
      const response = await fetchImpl(step.url(job), { signal: own.signal });
      if (response.status === 429) { lane.pauseUntil = now() + RATE_LIMIT_PAUSE_MS; throw new Error('Zu viele Abfragen'); }
      if (!response.ok) throw new Error(`${source}: ${response.status}`);
      const data = await response.json();
      if (own.signal.aborted || !enabled) throw new Error('abgebrochen');   // inzwischen ausgeschaltet: nichts mehr übernehmen
      found = step.pick(data, job);
    } catch { trouble = true; }
    finally { clearTimer(stop); lane.running = false; lane.controller = null; }
    if (!enabled) return;
    if (found) finish(job, { u: found, t: now() });
    else {
      job.trouble ||= trouble; job.step += 1;
      if (job.step < PLAN.length) enqueue(job, PLAN[job.step].source === source);     // nächste Station; in derselben Reihe vorn (der Artikel ist schon dran), sonst hinten
      else if (job.trouble) { failed.set(job.key, now() + FAILURE_RETRY_MS); waiting.delete(job.key); onChange(job.key); }   // unsicher (Fehler unterwegs): nicht als „kein Treffer“ merken
      else finish(job, { n: 1, t: now() });
    }
    pump(source);
  }
  function setEnabled(on) {
    enabled = Boolean(on);
    if (enabled) return;
    waiting.clear();
    for (const lane of Object.values(lanes)) {
      lane.queue.length = 0;
      if (lane.timer !== null) { clearTimer(lane.timer); lane.timer = null; }
      lane.controller?.abort();
    }
  }
  // Ein gespeichertes Bild lässt sich nicht laden (z. B. gelöscht): wie „kein Treffer“ behandeln, später neu suchen.
  function broken(name) {
    const key = imageKey(name);
    if (cache.get(key)?.u) { cache.set(key, { n: 1, t: now() }); save(); onChange(key); }
  }
  return { state, request, setEnabled, broken, get enabled() { return enabled; }, get busy() { return Object.values(lanes).some(lane => lane.running || lane.queue.length) }, get size() { return cache.size; } };
}
