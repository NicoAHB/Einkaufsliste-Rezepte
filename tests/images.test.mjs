import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FAILURE_RETRY_MS, GAPS, IMAGE_CACHE_KEY, MISS_DAYS, allowedImage, createImages, imageKey, pickImage, pickWiki, queryWords, searchUrl, stem, wikiUrl } from '../images.js';

const OFF = 'https://images.openfoodfacts.org/images/products/400/123/front_de.200.jpg';
const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Birnen.jpg/240px-Birnen.jpg';
const DAY = 86400000;
const product = (name, extra = {}) => ({ product_name: name, image_front_small_url: OFF, ...extra });
const page = (title, extra = {}) => ({ pageid: 1, title, index: 1, description: 'Gattung der Familie der Rosengewächse', pageimage: 'Foto.jpg', thumbnail: { source: WIKI, width: 240, height: 180 }, ...extra });
const wikiAnswer = pages => ({ query: { pages } });

describe('Produktbilder: Wörter und Wortstamm', () => {
  test('bedeutsame Wörter: ohne Zahlen, Mengenangaben und Füllwörter', () => {
    assert.deepEqual(queryWords('Bio Milch 1,5% 1 l'), ['milch']);
    assert.deepEqual(queryWords('Barilla Spaghetti No. 5 500 g'), ['barilla', 'spaghetti', 'no']);
    assert.deepEqual(queryWords('  Domol   Feinwaschmittel '), ['domol', 'feinwaschmittel']);
    assert.deepEqual(queryWords('Bio'), ['bio'], 'bleibt nichts übrig, bleiben alle Wörter');
    assert.deepEqual(queryWords(''), []); assert.deepEqual(queryWords(null), []);
  });
  test('Wortstamm: Mehrzahl und Umlaute gleich, aber „Birne“ ≠ „Birnensaft“ und „Reis“ ≠ „Reiswaffel“', () => {
    for (const [a, b] of [['Tomaten', 'Tomate'], ['Äpfel', 'Apfel'], ['Nüsse', 'Nuss'], ['Kartoffeln', 'Kartoffel'], ['Bananen', 'Banane'], ['Birnen', 'Birne'], ['Zwiebeln', 'Zwiebel'], ['Käse', 'Käses'], ['Gurken', 'Gurke']]) assert.equal(stem(a), stem(b), `${a} / ${b}`);
    for (const [a, b] of [['Birne', 'Birnensaft'], ['Reis', 'Reiswaffeln'], ['Milch', 'Milchschokolade']]) assert.notEqual(stem(a), stem(b), `${a} / ${b}`);
    assert.equal(stem('Reis'), 'reis'); assert.equal(stem('Eis'), 'eis');
  });
  test('gleiche Namen (Groß-/Kleinschreibung, Leerzeichen) teilen sich einen Schlüssel', () => {
    assert.equal(imageKey('  Milch  '), imageKey('milch')); assert.equal(imageKey('Domol  Feinwaschmittel'), imageKey('domol feinwaschmittel')); assert.notEqual(imageKey('Milch'), imageKey('Mehl'));
  });
  test('nur Bilder von Open Food Facts und Wikimedia, immer über https', () => {
    assert.equal(allowedImage(OFF), OFF); assert.equal(allowedImage(WIKI), WIKI);
    assert.equal(allowedImage('http://images.openfoodfacts.org/a.jpg'), 'https://images.openfoodfacts.org/a.jpg');
    for (const bad of ['https://evil.example/a.jpg', 'https://images.openfoodfacts.org.evil.example/a.jpg', 'https://upload.wikimedia.org.evil.de/wikipedia/a.jpg', 'https://upload.wikimedia.org/other/a.jpg',
      'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://user:pw@images.openfoodfacts.org/a.jpg', '', null, undefined, 42, 'kein link']) assert.equal(allowedImage(bad), '', String(bad));
  });
});

describe('Produktbilder: Wikipedia/Wikimedia', () => {
  test('Such-Adresse: Suche in Artikeln mit Vorschaubild und Kurzbeschreibung, CORS erlaubt; „Eier“ über den Artikel „Hühnerei“', () => {
    const url = new URL(wikiUrl('Bio Birnen 1 kg')), params = url.searchParams;
    assert.equal(url.origin + url.pathname, 'https://de.wikipedia.org/w/api.php');
    assert.equal(params.get('gsrsearch'), 'birnen'); assert.equal(params.get('generator'), 'search'); assert.equal(params.get('origin'), '*'); assert.equal(params.get('gsrnamespace'), '0');
    assert.match(params.get('prop'), /pageimages/); assert.match(params.get('prop'), /description/); assert.match(params.get('prop'), /pageprops/);
    assert.equal(new URL(wikiUrl('Eier')).searchParams.get('gsrsearch'), 'Hühnerei');
    assert.equal(new URL(wikiUrl('Rote Linsen')).searchParams.get('gsrsearch'), 'rote linsen');
  });
  test('der Artikel muss zum Namen passen: „Birne“ → „Birnen“, nicht „Birnensaft“ oder „Birnenkuchen“', () => {
    const pages = [page('Birnensaft', { index: 1 }), page('Birnenkuchen', { index: 2 }), page('Birnen', { index: 3 })];
    assert.equal(pickWiki(wikiAnswer(pages), 'Birne'), WIKI);
    assert.equal(pickWiki(wikiAnswer(pages.slice(0, 2)), 'Birne'), '', 'nur ähnliche Titel: kein Treffer');
    assert.equal(pickWiki(wikiAnswer([page('Reiswaffel', { index: 1, description: 'Knabbergebäck' }), page('Reis', { index: 2, description: 'Getreideart' })]), 'Reis'), WIKI, 'Reis, nicht Reiswaffel');
  });
  test('Reihenfolge der Suche gilt, auch bei der älteren Antwortform (Objekt statt Liste)', () => {
    const first = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Erste.jpg/240px-Erste.jpg';
    const answer = { query: { pages: { 9: page('Birne', { index: 2 }), 5: page('Birne', { index: 1, thumbnail: { source: first } }) } } };
    assert.equal(pickWiki(answer, 'Birne'), first);
  });
  test('Begriffsklärung, Personen und Orte, Nicht-Fotos und fremde Adressen werden übersprungen', () => {
    const food = page('Birne');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { pageprops: { disambiguation: '' } })]), 'Birne'), '', 'Begriffsklärung');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { description: 'Familienname' })]), 'Birne'), '', 'kein Lebensmittel');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Birne.svg/240px-Birne.svg.png' }, pageimage: 'Birne.svg' })]), 'Birne'), '', 'Zeichnung statt Foto');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { pageimage: 'Logo_Birne.jpg' })]), 'Birne'), '', 'Logo');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { thumbnail: { source: 'https://evil.example/a.jpg' } })]), 'Birne'), '', 'fremde Adresse');
    assert.equal(pickWiki(wikiAnswer([page('Birne', { thumbnail: undefined })]), 'Birne'), '', 'ohne Foto');
    assert.equal(pickWiki(wikiAnswer([food]), 'Birne'), WIKI);
    for (const bad of [null, undefined, {}, { query: {} }, { query: { pages: [null, 5, 'x'] } }]) assert.equal(pickWiki(bad, 'Birne'), '');
    assert.equal(pickWiki(wikiAnswer([food]), ''), '');
  });
  test('ohne Beschreibung nur bei genau gleichem Titel; Hauptwort genügt bei mehreren Wörtern („Rote Linsen“ → „Linsen“)', () => {
    assert.equal(pickWiki(wikiAnswer([page('Birne', { description: undefined })]), 'Birne'), WIKI);
    assert.equal(pickWiki(wikiAnswer([page('Linsen', { description: undefined })]), 'Rote Linsen'), '', 'nur das Hauptwort und keine Beschreibung: unsicher');
    assert.equal(pickWiki(wikiAnswer([page('Linsen', { description: 'Hülsenfrucht' })]), 'Rote Linsen'), WIKI);
    assert.equal(pickWiki(wikiAnswer([page('Feinwaschmittel', { description: 'Waschmittel für Feinwäsche' })]), 'Domol Feinwaschmittel'), '', 'Haushaltsware: kein Lebensmittel-Foto');
    assert.equal(pickWiki(wikiAnswer([page('Hühnerei', { description: 'Ei des Haushuhns' })]), 'Eier'), WIKI, '„Eier“ über „Hühnerei“');
  });
});

describe('Produktbilder: Open Food Facts', () => {
  test('Such-Adresse: nur die bedeutsamen Wörter, bevorzugt Deutschland, sonst weltweit, nur nötige Felder', () => {
    const url = new URL(searchUrl('Bio Reis 500 g')), params = url.searchParams;
    assert.equal(url.origin + url.pathname, 'https://world.openfoodfacts.org/cgi/search.pl');
    assert.equal(params.get('search_terms'), 'reis'); assert.equal(params.get('json'), '1'); assert.equal(params.get('action'), 'process');
    assert.match(params.get('fields'), /product_name_de/); assert.match(params.get('fields'), /image_front_small_url/);
    assert.deepEqual([params.get('tagtype_0'), params.get('tag_contains_0'), params.get('tag_0')], ['countries', 'contains', 'germany']);
    assert.equal(new URL(searchUrl('Milch', false)).searchParams.has('tag_0'), false);
    assert.equal(new URL(searchUrl('x'.repeat(300))).searchParams.get('search_terms').length, 80);
  });
  test('„Birne“ findet keinen Birnensaft, „Reis“ keine Reiswaffeln: ganze Wörter, die wenigsten Zusätze gewinnen', () => {
    assert.equal(pickImage({ products: [product('Birnensaft'), product('Birne Williams Christ', { image_front_small_url: `${OFF}?b` })] }, 'Birne'), `${OFF}?b`);
    assert.equal(pickImage({ products: [product('Birnensaft'), product('Birnenschorle')] }, 'Birne'), '', 'nur Ableitungen: kein Treffer');
    const rice = { products: [product('Reiswaffeln Natur'), product('Basmati Reis', { image_front_small_url: `${OFF}?basmati` }), product('Reis', { image_front_small_url: `${OFF}?reis` }), product('Reis Pfanne mit Gemüse')] };
    assert.equal(pickImage(rice, 'Reis'), `${OFF}?reis`, 'genau „Reis“ vor „Basmati Reis“');
    assert.equal(pickImage({ products: rice.products.slice(0, 2) }, 'Reis'), `${OFF}?basmati`);
    assert.equal(pickImage({ products: [product('Milchschokolade'), product('Frische Milch', { image_front_small_url: `${OFF}?m` })] }, 'Milch'), `${OFF}?m`);
  });
  test('Marke zählt nicht als Zusatz, bei Gleichstand gewinnt der beliebtere (der frühere); Produktname deutsch vor allgemein', () => {
    const a = product('Barilla Spaghetti Nr. 5', { brands: 'Barilla', image_front_small_url: `${OFF}?a` }), b = product('Spaghetti', { image_front_small_url: `${OFF}?b` }), c = product('Spaghetti Bolognese Fertiggericht');
    assert.equal(pickImage({ products: [c, a, b] }, 'Spaghetti'), `${OFF}?b`, 'ohne jeden Zusatz gewinnt');
    assert.equal(pickImage({ products: [c, a] }, 'Spaghetti'), `${OFF}?a`, 'die Marke zählt nicht als Zusatz, „Bolognese Fertiggericht“ schon');
    assert.equal(pickImage({ products: [product('Spaghetti Nr. 5', { image_front_small_url: `${OFF}?x` }), product('Spaghetti Nr. 7', { image_front_small_url: `${OFF}?y` })] }, 'Spaghetti'), `${OFF}?x`, 'gleich viele Zusätze: der Beliebtere (der frühere)');
    assert.equal(pickImage({ products: [product('Pasta', { product_name_de: 'Spaghetti', image_front_small_url: `${OFF}?de` })] }, 'Spaghetti'), `${OFF}?de`);
    assert.equal(pickImage({ products: [product('Pasta', { generic_name: 'Spaghetti', image_front_small_url: `${OFF}?g` })] }, 'Spaghetti'), `${OFF}?g`, 'allgemeine Bezeichnung genügt');
  });
  test('mehrere Wörter: alle müssen vorkommen, sonst genügt das Hauptwort; ohne Bild oder mit fremder Adresse zählt ein Treffer nicht', () => {
    assert.equal(pickImage({ products: [product('Spaghetti Barilla')] }, 'Barilla Spaghetti'), OFF);
    assert.equal(pickImage({ products: [product('Spaghetti')] }, 'Barilla Spaghetti'), OFF, 'Hauptwort „Spaghetti“');
    assert.equal(pickImage({ products: [product('Barilla Sauce')] }, 'Barilla Spaghetti'), '', 'weder noch');
    assert.equal(pickImage({ products: [{ product_name: 'Reis' }, product('Reis', { image_front_small_url: 'https://evil.example/x.jpg' })] }, 'Reis'), '');
    assert.equal(pickImage({ products: [{ product_name: 'x' }, product('y')] }), OFF, 'ohne Namen: der erste mit Bild');
    for (const bad of [null, undefined, {}, { products: 'x' }, { products: [null, 5, {}] }]) assert.equal(pickImage(bad, 'Reis'), '');
  });
});

// Künstliche Uhr und Zeitgeber: Die Prüfung läuft ohne Warten, und Abstände lassen sich genau messen.
function harness({ answer = () => ({}), stored = null, ...options } = {}) {
  let time = Date.parse('2026-10-27T10:00:00Z'), counter = 0;
  const timers = [], calls = [], changes = [], store = new Map(stored ? [[IMAGE_CACHE_KEY, JSON.stringify(stored)]] : []);
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); }, removeItem: key => { store.delete(key); } };
  const setTimer = (fn, ms) => { const timer = { id: ++counter, at: time + ms, fn }; timers.push(timer); return timer.id; };
  const clearTimer = id => { const index = timers.findIndex(timer => timer.id === id); if (index >= 0) timers.splice(index, 1); };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const advance = async ms => {
    const end = time + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      time = Math.max(time, next.at); timers.shift(); next.fn(); await settle();
    }
    time = end; await settle();
  };
  const fetch = async (url, init = {}) => {
    const parsed = new URL(url), source = parsed.hostname.includes('wikipedia') ? 'wiki' : 'off';
    calls.push({ url: parsed, source, signal: init.signal, at: time, term: parsed.searchParams.get(source === 'wiki' ? 'gsrsearch' : 'search_terms'), germany: parsed.searchParams.has('tag_0') });
    const result = await answer(parsed, source, calls.length);
    if (result instanceof Error) throw result;
    if (result && result.status) return { ok: result.status < 400, status: result.status, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => result };
  };
  const make = extra => createImages({ fetch, storage, now: () => time, setTimer, clearTimer, onChange: key => changes.push(key), ...options, ...extra });
  return { service: make(), calls, changes, store, advance, now: () => time, saved: () => JSON.parse(store.get(IMAGE_CACHE_KEY) || '{}'), fresh: () => make({ onChange: () => {} }) };
}
const wikiHit = () => wikiAnswer([page('Birnen')]);
const miss = (url, source) => (source === 'wiki' ? wikiAnswer([]) : { products: [] });

describe('Produktbilder: Dienst', () => {
  test('Reihenfolge: erst Wikipedia; ein Treffer dort beendet die Suche, Open Food Facts wird nicht gefragt; gemerkt und beim nächsten Start ohne Abfrage da', async () => {
    const h = harness({ answer: (url, source) => (source === 'wiki' ? wikiHit() : { products: [product('Birne')] }) });
    assert.equal(h.service.state('Birne').state, 'pending');
    h.service.request('Birne'); await h.advance(0);
    assert.deepEqual(h.calls.map(call => call.source), ['wiki']);
    assert.deepEqual(h.service.state('Birne'), { state: 'image', url: WIKI });
    assert.deepEqual(h.changes, ['birne']); assert.deepEqual(h.saved().birne, { u: WIKI, t: h.now() });
    const again = h.fresh();
    assert.deepEqual(again.state('BIRNE '), { state: 'image', url: WIKI });
    again.request('Birne'); await h.advance(60000);
    assert.equal(h.calls.length, 1, 'beim nächsten Öffnen wird nicht neu gesucht');
  });
  test('ohne Wikipedia-Treffer: Open Food Facts zuerst Deutschland, dann weltweit; erst danach „kein Treffer“', async () => {
    const h = harness({ answer: (url, source) => (source === 'off' && !url.searchParams.has('tag_0') ? { products: [product('Tahini Paste')] } : miss(url, source)) });
    h.service.request('Tahini Paste'); await h.advance(GAPS.off * 3);
    assert.deepEqual(h.calls.map(call => [call.source, call.germany]), [['wiki', false], ['off', true], ['off', false]]);
    assert.equal(h.service.state('Tahini Paste').state, 'image'); assert.deepEqual(h.changes, ['tahini paste'], 'nur eine Meldung, erst am Ende');
    const none = harness({ answer: miss });
    none.service.request('Domol Feinwaschmittel'); await none.advance(GAPS.off * 3);
    assert.equal(none.calls.length, 3); assert.deepEqual(none.service.state('Domol Feinwaschmittel'), { state: 'none' });
    assert.equal(none.saved()[imageKey('Domol Feinwaschmittel')].n, 1);
  });
  test('„kein Treffer“ wird erst nach einigen Tagen erneut versucht, bis dahin bleibt das Symbol', async () => {
    const h = harness({ answer: miss });
    h.service.request('Birne'); await h.advance(GAPS.off * 3);
    assert.equal(h.calls.length, 3);
    h.service.request('Birne'); await h.advance(GAPS.off * 3); assert.equal(h.calls.length, 3, 'kein neuer Versuch');
    await h.advance((MISS_DAYS - 1) * DAY);
    h.service.request('Birne'); await h.advance(GAPS.off * 3); assert.equal(h.calls.length, 3, `nach ${MISS_DAYS - 1} Tagen noch nicht`);
    await h.advance(2 * DAY);
    assert.deepEqual(h.service.state('Birne'), { state: 'none' });
    h.service.request('Birne'); await h.advance(GAPS.off * 3); assert.equal(h.calls.length, 6, `nach ${MISS_DAYS} Tagen wieder alle drei Stationen`);
  });
  test('gleiche Artikelnamen werden nur einmal gesucht', async () => {
    const h = harness({ answer: wikiHit });
    for (const name of ['Birne', 'birne', ' BIRNE', 'Birne']) h.service.request(name);
    await h.advance(GAPS.off * 3); assert.equal(h.calls.length, 1);
    h.service.request('birne'); await h.advance(GAPS.off * 3); assert.equal(h.calls.length, 1);
  });
  test('jede Quelle hat ihren eigenen Takt: Wikipedia alle 0,4 s, Open Food Facts höchstens alle 6,5 s, nie zwei gleichzeitig je Quelle', async () => {
    let running = { wiki: 0, off: 0 }, most = { wiki: 0, off: 0 };
    const h = harness({ answer: async (url, source) => { running[source]++; most[source] = Math.max(most[source], running[source]); await Promise.resolve(); running[source]--; return miss(url, source); } });
    for (const name of ['Milch', 'Butter', 'Mehl']) h.service.request(name);
    await h.advance(GAPS.off * 12);
    const wiki = h.calls.filter(call => call.source === 'wiki'), off = h.calls.filter(call => call.source === 'off');
    assert.deepEqual(wiki.map(call => call.at - wiki[0].at), [0, GAPS.wiki, GAPS.wiki * 2], 'Wikipedia im Takt');
    assert.equal(off.length, 6);
    for (let index = 1; index < off.length; index++) assert.ok(off[index].at - off[index - 1].at >= GAPS.off, `Abstand ${off[index].at - off[index - 1].at}`);
    assert.deepEqual(most, { wiki: 1, off: 1 });
    assert.deepEqual(off.map(call => `${call.term} ${call.germany ? 'DE' : 'WELT'}`), ['milch DE', 'milch WELT', 'butter DE', 'butter WELT', 'mehl DE', 'mehl WELT'], 'ein Artikel nach dem anderen');
  });
  test('Fehler unterwegs: nicht als „kein Treffer“ gemerkt; später neuer Versuch; ein Fehler bei einer Quelle hindert die andere nicht', async () => {
    for (const failure of [new Error('offline'), { status: 500 }, { status: 429 }]) {
      let broken = true;
      const h = harness({ answer: (url, source) => (broken ? failure : source === 'wiki' ? wikiHit() : miss(url, source)) });
      h.service.request('Birne'); await h.advance(GAPS.off * 4 + 150 * 1000);   // bei 429 pausiert jede Quelle erst eine Minute
      assert.equal(h.service.state('Birne').state, 'failed', JSON.stringify(failure));
      assert.deepEqual(h.saved(), {}, 'nichts gespeichert'); assert.deepEqual(h.changes, ['birne']);
      h.service.request('Birne'); await h.advance(GAPS.off * 12); assert.equal(h.calls.length, 3, 'zunächst kein neuer Versuch');
      broken = false;
      await h.advance(FAILURE_RETRY_MS);
      h.service.request('Birne'); await h.advance(GAPS.off * 4);
      assert.equal(h.service.state('Birne').state, 'image', 'später klappt es');
    }
    const partial = harness({ answer: (url, source) => (source === 'wiki' ? new Error('gesperrt') : { products: [product('Birne')] }) });
    partial.service.request('Birne'); await partial.advance(GAPS.off * 3);
    assert.equal(partial.service.state('Birne').state, 'image', 'Wikipedia fällt aus, Open Food Facts liefert');
    const unsure = harness({ answer: (url, source) => (source === 'wiki' ? new Error('gesperrt') : { products: [] }) });
    unsure.service.request('Birne'); await unsure.advance(GAPS.off * 3);
    assert.equal(unsure.service.state('Birne').state, 'failed', 'ein Fehler unterwegs und sonst nichts gefunden: unsicher, nicht „kein Treffer“');
    assert.deepEqual(unsure.saved(), {});
  });
  test('bei „Zu viele Abfragen“ (429) pausiert nur diese Quelle eine Minute', async () => {
    const h = harness({ answer: (url, source, count) => (source === 'off' && count <= 2 ? { status: 429 } : miss(url, source)) });
    h.service.request('Milch'); h.service.request('Butter');
    await h.advance(GAPS.wiki * 2 + 10);
    assert.equal(h.calls.filter(call => call.source === 'wiki').length, 2, 'Wikipedia läuft weiter');
    const before = h.calls.filter(call => call.source === 'off').length;
    await h.advance(GAPS.off + 100); assert.equal(h.calls.filter(call => call.source === 'off').length, before, 'Open Food Facts pausiert');
    await h.advance(60 * 1000); assert.ok(h.calls.filter(call => call.source === 'off').length > before);
  });
  test('Ausgeschaltet: keine Abfragen, Wartendes entfällt, Laufendes wird abgebrochen und nichts übernommen; wieder an geht es weiter', async () => {
    let release;
    const h = harness({ answer: (url, source) => (source === 'wiki' ? new Promise(resolve => { release = () => resolve(wikiHit()); }) : miss(url, source)) });
    h.service.request('Birne'); h.service.request('Apfel');
    await h.advance(0); assert.equal(h.calls.length, 1);
    h.service.setEnabled(false);
    assert.equal(h.calls[0].signal.aborted, true, 'laufende Abfrage abgebrochen');
    release(); await h.advance(GAPS.off * 5);
    assert.equal(h.calls.length, 1); assert.deepEqual(h.saved(), {}, 'nichts gespeichert');
    h.service.request('Mehl'); await h.advance(GAPS.off * 5); assert.equal(h.calls.length, 1, 'solange aus, bleibt es still'); assert.equal(h.service.enabled, false);
    h.service.setEnabled(true); h.service.request('Mehl'); await h.advance(GAPS.off * 3); assert.ok(h.calls.length > 1, 'wieder an: neue Abfragen');
    const off = harness(); off.service.setEnabled(false);
    for (const name of ['Milch', 'Butter']) off.service.request(name);
    await off.advance(DAY); assert.equal(off.calls.length, 0, 'ausgeschaltet gestartet: kein Aufruf');
  });
  test('der alte Speicher (erste Fassung, schlechte Treffer) wird verworfen', async () => {
    const h = harness();
    h.store.set('einkauf-images-v1', JSON.stringify({ reis: { u: OFF, t: 1 } }));
    const fresh = h.fresh();
    assert.equal(fresh.state('Reis').state, 'pending', 'das alte „Reiswaffeln“-Bild gilt nicht mehr');
    assert.equal(h.store.has('einkauf-images-v1'), false);
  });
  test('ein Bild, das sich nicht laden lässt, gilt als „kein Treffer“; beschädigter Speicher wird ignoriert, ein zu großer begrenzt', async () => {
    const h = harness({ answer: wikiHit });
    h.service.request('Birne'); await h.advance(0); h.changes.length = 0;
    h.service.broken('Birne'); assert.equal(h.service.state('Birne').state, 'none'); assert.deepEqual(h.changes, ['birne']);
    h.service.broken('Unbekannt'); assert.equal(h.changes.length, 1);
    const bad = { getItem: () => '{kaputt', setItem: () => { throw new Error('voll'); } };
    const service = createImages({ fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }), storage: bad, setTimer: () => 1, clearTimer: () => {} });
    assert.equal(service.size, 0); assert.doesNotThrow(() => service.broken('x'));
    const stored = { milch: { u: 'https://evil.example/a.jpg', t: 1 }, butter: { u: WIKI, t: 2 }, mehl: { n: 1, t: 3 }, nix: { t: 4 }, kaputt: 5, leer: null };
    const loaded = harness({ stored });
    assert.deepEqual(['milch', 'butter', 'mehl', 'nix'].map(name => loaded.service.state(name).state), ['pending', 'image', 'none', 'pending']);
    const many = Object.fromEntries(Array.from({ length: 1600 }, (_, index) => [`artikel ${index}`, { n: 1, t: index + 10 }]));
    const full = harness({ stored: many, answer: miss });
    full.service.request('Neu'); await full.advance(GAPS.off * 4);
    assert.ok(Object.keys(full.saved()).length <= 1500); assert.ok(full.saved()['artikel 1599'] && !full.saved()['artikel 0'], 'die ältesten fliegen zuerst raus');
  });
  test('keine Lookbehind-Ausdrücke im Code (ältere iOS-Versionen können sie nicht und würden die ganze Datei ablehnen)', async () => {
    for (const file of ['images.js', 'emoji.js', 'app.js']) assert.doesNotMatch(await readFile(path.join(import.meta.dirname, '..', file), 'utf8'), /\(\?<[=!]/, file);
  });
});
