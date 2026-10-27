import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CATEGORIES } from '../categories.js';
import { FAILURE_RETRY_MS, IMAGE_CACHE_KEY, MISS_DAYS, REQUEST_GAP_MS, allowedImage, categoryIcon, createImages, imageKey, pickImage, searchUrl } from '../images.js';

const GOOD = 'https://images.openfoodfacts.org/images/products/400/123/front_de.200.jpg';
const hit = (url = GOOD) => ({ products: [{ product_name: 'x', image_front_small_url: url }] });
const DAY = 86400000;

// Künstliche Uhr und Zeitgeber: Die Prüfung läuft ohne Warten, und Abstände lassen sich genau messen.
function harness({ answer = () => hit(), stored = null, ...options } = {}) {
  let time = Date.parse('2026-10-27T10:00:00Z'), counter = 0;
  const timers = [], calls = [], changes = [], store = new Map(stored ? [[IMAGE_CACHE_KEY, JSON.stringify(stored)]] : []);
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } };
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
    calls.push({ url: new URL(url), signal: init.signal, at: time });
    const result = await answer(new URL(url), calls.length);
    if (result instanceof Error) throw result;
    if (result && result.status) return { ok: result.status < 400, status: result.status, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => result };
  };
  const service = createImages({ fetch, storage, now: () => time, setTimer, clearTimer, onChange: key => changes.push(key), ...options });
  return { service, calls, changes, store, advance, now: () => time, saved: () => JSON.parse(store.get(IMAGE_CACHE_KEY) || '{}'), fresh: () => createImages({ fetch, storage, now: () => time, setTimer, clearTimer }) };
}

describe('Produktbilder: Suche und Bildauswahl', () => {
  test('Such-Adresse: Artikelname bereinigt, nur nötige Felder, bevorzugt Deutschland, sonst weltweit', () => {
    const url = new URL(searchUrl('  Domol   Feinwaschmittel ')), params = url.searchParams;
    assert.equal(url.origin + url.pathname, 'https://world.openfoodfacts.org/cgi/search.pl');
    assert.equal(params.get('search_terms'), 'Domol Feinwaschmittel');
    assert.equal(params.get('json'), '1'); assert.equal(params.get('search_simple'), '1'); assert.equal(params.get('action'), 'process');
    assert.match(params.get('fields'), /image_front_small_url/);
    assert.deepEqual([params.get('tagtype_0'), params.get('tag_contains_0'), params.get('tag_0')], ['countries', 'contains', 'germany']);
    assert.equal(new URL(searchUrl('Milch', false)).searchParams.has('tag_0'), false, 'weltweit: ohne Länderfilter');
    assert.equal(new URL(searchUrl('x'.repeat(300))).searchParams.get('search_terms').length, 80);
    assert.equal(new URL(searchUrl('Äpfel & Birnen=1')).searchParams.get('search_terms'), 'Äpfel & Birnen=1', 'Sonderzeichen bleiben ein Suchtext');
  });
  test('nur Bilder von Open Food Facts, immer über https', () => {
    assert.equal(allowedImage(GOOD), GOOD);
    assert.equal(allowedImage('http://images.openfoodfacts.org/a.jpg'), 'https://images.openfoodfacts.org/a.jpg');
    assert.equal(allowedImage('https://static.openfoodfacts.org/images/a.jpg'), 'https://static.openfoodfacts.org/images/a.jpg');
    for (const bad of ['https://evil.example/a.jpg', 'https://images.openfoodfacts.org.evil.example/a.jpg', 'https://openfoodfacts.org.evil.de/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA',
      'https://user:pw@images.openfoodfacts.org/a.jpg', '', null, undefined, 42, 'kein link']) assert.equal(allowedImage(bad), '', String(bad));
  });
  test('der erste Treffer mit brauchbarem Vorderseiten-Bild: klein vor Vorschaubild, Fremdes und Leeres wird übersprungen', () => {
    const thumb = 'https://images.openfoodfacts.org/images/products/2/front.100.jpg';
    assert.equal(pickImage({ products: [{ image_front_small_url: '' }, { product_name: 'ohne Bild' }, { image_front_small_url: 'https://evil.example/x.jpg' }, { image_front_small_url: GOOD }, { image_front_small_url: thumb }] }), GOOD);
    assert.equal(pickImage({ products: [{ image_front_thumb_url: thumb, image_front_small_url: '' }] }), thumb, 'Vorschaubild, wenn es kein kleines gibt');
    assert.equal(pickImage({ products: [{ image_small_url: thumb }] }), thumb);
    for (const empty of [{ products: [] }, { products: [null, 5, {}] }, {}, null, undefined, 'x', { products: 'x' }]) assert.equal(pickImage(empty), '');
  });
  test('gleiche Namen (Groß-/Kleinschreibung, Leerzeichen) teilen sich einen Schlüssel', () => {
    assert.equal(imageKey('  Milch  '), imageKey('milch'));
    assert.equal(imageKey('Domol  Feinwaschmittel'), imageKey('domol feinwaschmittel'));
    assert.notEqual(imageKey('Milch'), imageKey('Mehl'));
  });
});

describe('Produktbilder: Dienst', () => {
  test('sucht einmal, merkt sich das Bild dauerhaft und meldet die Änderung; ein neuer Start findet es ohne Abfrage', async () => {
    const h = harness();
    assert.equal(h.service.state('Milch').state, 'pending');
    h.service.request('Milch');
    await h.advance(0);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.service.state('Milch'), { state: 'image', url: GOOD });
    assert.deepEqual(h.changes, [imageKey('Milch')]);
    assert.deepEqual(h.saved()[imageKey('Milch')], { u: GOOD, t: h.now() });
    const again = h.fresh();
    assert.deepEqual(again.state('MILCH '), { state: 'image', url: GOOD });
    again.request('Milch');
    await h.advance(60 * 1000);
    assert.equal(h.calls.length, 1, 'beim nächsten Öffnen wird nicht neu gesucht');
  });
  test('gleiche Artikelnamen werden nur einmal gesucht', async () => {
    const h = harness();
    for (const name of ['Milch', 'milch', ' MILCH', 'Milch']) h.service.request(name);
    await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 1);
    h.service.request('milch'); await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 1, 'auch später nicht noch einmal');
  });
  test('zuerst Deutschland, ohne Treffer einmal weltweit; erst danach „kein Treffer“, das erst nach einigen Tagen erneut versucht wird', async () => {
    const h = harness({ answer: () => ({ products: [] }) });
    h.service.request('Domol Feinwaschmittel');
    await h.advance(REQUEST_GAP_MS * 3);
    assert.deepEqual(h.calls.map(call => call.url.searchParams.has('tag_0')), [true, false], 'Deutschland, dann weltweit');
    assert.deepEqual(h.service.state('Domol Feinwaschmittel'), { state: 'none' });
    assert.deepEqual(h.changes, [imageKey('Domol Feinwaschmittel')], 'nur eine Meldung, erst am Ende');
    assert.equal(h.saved()[imageKey('Domol Feinwaschmittel')].n, 1);
    h.service.request('Domol Feinwaschmittel'); await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 2, 'kein neuer Versuch');
    await h.advance((MISS_DAYS - 1) * DAY);
    h.service.request('Domol Feinwaschmittel'); await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 2, `nach ${MISS_DAYS - 1} Tagen noch nicht`);
    await h.advance(2 * DAY);
    assert.deepEqual(h.service.state('Domol Feinwaschmittel'), { state: 'none' }, 'bis zur neuen Suche bleibt das Ersatzsymbol');
    h.service.request('Domol Feinwaschmittel'); await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 4, `nach ${MISS_DAYS} Tagen wieder (Deutschland und weltweit)`);
  });
  test('findet Deutschland nichts, aber die Welt: das Bild wird genommen', async () => {
    const h = harness({ answer: url => (url.searchParams.has('tag_0') ? { products: [] } : hit()) });
    h.service.request('Tahini'); await h.advance(REQUEST_GAP_MS * 3);
    assert.equal(h.calls.length, 2);
    assert.equal(h.service.state('Tahini').state, 'image');
  });
  test('Abfragen laufen nacheinander im Abstand von mindestens 6,5 Sekunden (Open Food Facts erlaubt etwa 10 Suchen pro Minute)', async () => {
    let running = 0, most = 0;
    const h = harness({ answer: async () => { running++; most = Math.max(most, running); await Promise.resolve(); running--; return hit(); } });
    for (const name of ['Milch', 'Butter', 'Mehl', 'Nudeln']) h.service.request(name);
    await h.advance(REQUEST_GAP_MS * 6);
    assert.equal(h.calls.length, 4);
    assert.equal(most, 1, 'nie zwei gleichzeitig');
    assert.deepEqual(h.calls.map(call => call.at - h.calls[0].at), [0, REQUEST_GAP_MS, REQUEST_GAP_MS * 2, REQUEST_GAP_MS * 3]);
    assert.deepEqual(h.calls.map(call => call.url.searchParams.get('search_terms')), ['Milch', 'Butter', 'Mehl', 'Nudeln'], 'Reihenfolge der Liste');
  });
  test('Fehler (Netz, 500, 429) werden nicht als „kein Treffer“ gespeichert; Ersatzsymbol jetzt, späterer neuer Versuch', async () => {
    for (const failure of [new Error('offline'), { status: 500 }, { status: 429 }]) {
      let fail = true;
      const h = harness({ answer: () => (fail ? failure : hit()) });
      h.service.request('Milch'); await h.advance(0);
      assert.equal(h.service.state('Milch').state, 'failed', JSON.stringify(failure));
      assert.deepEqual(h.saved(), {}, 'nichts gespeichert');
      assert.deepEqual(h.changes, ['milch'], 'die Anzeige wird auf das Ersatzsymbol umgestellt');
      h.service.request('Milch'); await h.advance(REQUEST_GAP_MS * 12);
      assert.equal(h.calls.length, 1, 'zunächst kein neuer Versuch');
      fail = false;
      await h.advance(FAILURE_RETRY_MS);
      h.service.request('Milch'); await h.advance(70 * 1000);
      assert.equal(h.service.state('Milch').state, 'image', 'später klappt es');
    }
  });
  test('bei „Zu viele Abfragen“ (429) pausiert die Warteschlange eine Minute', async () => {
    const h = harness({ answer: (url, count) => (count === 1 ? { status: 429 } : hit()) });
    h.service.request('Milch'); h.service.request('Butter');
    await h.advance(0);
    await h.advance(REQUEST_GAP_MS + 100);
    assert.equal(h.calls.length, 1, 'noch Pause');
    await h.advance(60 * 1000);
    assert.equal(h.calls.length, 2);
  });
  test('Ausgeschaltet: keine Abfragen, Wartendes entfällt, Laufendes wird abgebrochen; wieder an geht es weiter', async () => {
    let release;
    const h = harness({ answer: () => new Promise(resolve => { release = () => resolve(hit()); }) });
    h.service.request('Milch'); h.service.request('Butter');
    await h.advance(0);
    assert.equal(h.calls.length, 1);
    h.service.setEnabled(false);
    assert.equal(h.calls[0].signal.aborted, true, 'laufende Abfrage abgebrochen');
    release();
    await h.advance(REQUEST_GAP_MS * 5);
    assert.equal(h.calls.length, 1, 'Butter wurde nie abgefragt');
    assert.deepEqual(h.saved(), {}, 'nichts gespeichert');
    h.service.request('Mehl'); await h.advance(REQUEST_GAP_MS * 5);
    assert.equal(h.calls.length, 1, 'solange aus, bleibt es still');
    assert.equal(h.service.enabled, false);
    h.service.setEnabled(true);
    h.service.request('Mehl'); await h.advance(REQUEST_GAP_MS * 2);
    assert.equal(h.calls.length, 2, 'wieder an: neue Abfragen');
  });
  test('ausgeschaltet gestartet: kein einziger Aufruf, auch nicht nach langer Zeit', async () => {
    const h = harness();
    h.service.setEnabled(false);
    for (const name of ['Milch', 'Butter', 'Mehl']) h.service.request(name);
    await h.advance(DAY);
    assert.equal(h.calls.length, 0);
  });
  test('ein Bild, das sich nicht laden lässt, gilt als „kein Treffer“ und wird später neu gesucht', async () => {
    const h = harness();
    h.service.request('Milch'); await h.advance(0);
    h.changes.length = 0;
    h.service.broken('Milch');
    assert.equal(h.service.state('Milch').state, 'none');
    assert.deepEqual(h.changes, ['milch']);
    h.service.broken('Unbekannt'); assert.equal(h.changes.length, 1, 'Unbekanntes bleibt ohne Wirkung');
  });
  test('beschädigter oder fremder Speicher wird ignoriert, ein zu großer wird auf die jüngsten Einträge begrenzt', async () => {
    const bad = { getItem: () => '{kaputt', setItem: () => { throw new Error('voll'); } };
    const service = createImages({ fetch: async () => ({ ok: true, status: 200, json: async () => hit() }), storage: bad, setTimer: () => 1, clearTimer: () => {} });
    assert.equal(service.size, 0); assert.doesNotThrow(() => service.broken('x'));
    const stored = { milch: { u: 'https://evil.example/a.jpg', t: 1 }, butter: { u: GOOD, t: 2 }, mehl: { n: 1, t: 3 }, nix: { t: 4 }, kaputt: 5, leer: null };
    const h = harness({ stored });
    assert.deepEqual([h.service.state('milch').state, h.service.state('butter').state, h.service.state('mehl').state, h.service.state('nix').state], ['pending', 'image', 'none', 'pending'], 'fremde Adresse und Unsinn verworfen');
    const many = Object.fromEntries(Array.from({ length: 1600 }, (_, index) => [`artikel ${index}`, { n: 1, t: index + 10 }]));
    const full = harness({ stored: many });
    full.service.request('Neu'); await full.advance(REQUEST_GAP_MS * 3);
    assert.ok(Object.keys(full.saved()).length <= 1500, 'begrenzt');
    assert.ok(full.saved()['artikel 1599'] && !full.saved()['artikel 0'], 'die ältesten fliegen zuerst raus');
  });
  test('Ersatzsymbole: jede Kategorie hat eines, es steckt in index.html; sonst das neutrale Paket', async () => {
    const html = await readFile(path.join(import.meta.dirname, '..', 'index.html'), 'utf8');
    for (const { id } of CATEGORIES) {
      const symbol = categoryIcon(id);
      assert.match(symbol, /^i-p-[a-z]+$/);
      assert.ok(html.includes(`<symbol id="${symbol}"`), `${symbol} fehlt in index.html`);
    }
    assert.equal(categoryIcon('sonstiges'), 'i-p-box'); assert.equal(categoryIcon(undefined), 'i-p-box'); assert.equal(categoryIcon('gibtsnicht'), 'i-p-box');
    assert.equal(new Set(CATEGORIES.map(category => categoryIcon(category.id))).size, CATEGORIES.length, 'jede Kategorie ein eigenes Symbol');
  });
});
