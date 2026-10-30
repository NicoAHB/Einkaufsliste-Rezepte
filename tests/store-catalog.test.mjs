import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { STORE_CATALOG, catalogByKey, searchCatalog } from '../store-catalog.js';
import { chainForStore, chainOf } from '../brand.js';
import { defaultOfferUrl, storeOfferUrl } from '../prices.js';
import { takesAnywhere } from '../shop.js';
import { merge, operation, validate } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const op = (patch, at) => operation('stores', 'store-edeka', patch, 'Nico', at);

test('Händlerkatalog: eindeutige Einträge, HTTPS-Angebotsseiten, lokale Logos und Offline-Paket', async () => {
  assert.ok(STORE_CATALOG.length >= 30);
  assert.equal(new Set(STORE_CATALOG.map(row => row.key)).size, STORE_CATALOG.length);
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const sources = await readFile(new URL('../assets/stores/README.md', import.meta.url), 'utf8');
  for (const chain of STORE_CATALOG) {
    assert.equal(new URL(chain.offers).protocol, 'https:', chain.name);
    assert.equal(new URL(chain.offers).username, '', chain.name);
    assert.match(chain.logo, /^assets\/stores\/[a-z-]+\.(png|svg)$/);
    const bytes = await readFile(new URL('../' + chain.logo, import.meta.url));
    assert.ok(bytes.length > 100 && bytes.length < 100000, chain.name);
    if (chain.logo.endsWith('.svg')) assert.doesNotMatch(bytes.toString(), /<script|<foreignObject|(?:href|src)=["'](?:https?:|\/\/)|@import|url\(https?/i);
    assert.ok(sw.includes(`'./${chain.logo}'`), chain.name + ' muss offline vorhanden sein');
    assert.ok(sources.includes(chain.name));
    assert.ok(sources.includes(chain.offers));
    assert.equal(chainOf(chain.name)?.key, chain.key, chain.name);
  }
});

test('ALDI, Netto und famila: Regionen getrennt, ohne Zusatz kein geratener Link', () => {
  for (const [a, b] of [['aldi-nord', 'aldi-sued'], ['netto-marken', 'netto-hund'], ['famila-nordost', 'famila-nordwest']]) {
    assert.notEqual(catalogByKey(a).offers, catalogByKey(b).offers);
    assert.notEqual(catalogByKey(a).logo, catalogByKey(b).logo);
  }
  for (const name of ['ALDI', 'Netto', 'famila', 'Mein Baumarkt', 'Müller Bäckerei', 'Globus Baumarkt']) assert.equal(defaultOfferUrl({ name }), '', name);
  assert.equal(chainOf('ALDI SUED Köln')?.key, 'aldi-sued');
  assert.equal(chainOf('Netto Marken-Discount')?.key, 'netto-marken');
  assert.equal(chainOf('Netto mit Hund')?.key, 'netto-hund');
});

test('Händlersuche: Umlaute, ue-Schreibweise, mehrere Wörter und Bereichsfilter', () => {
  for (const term of ['Müller', 'MUELLER', 'muller']) assert.deepEqual(searchCatalog(term).map(row => row.key), ['mueller']);
  assert.deepEqual(searchCatalog('aldi sued').map(row => row.key), ['aldi-sued']);
  assert.deepEqual(searchCatalog('netto hund').map(row => row.key), ['netto-hund']);
  assert.equal(searchCatalog('', 'drugstore').length, 4);
  assert.ok(searchCatalog('', 'supermarket').every(chain => !chain.drugstore));
  assert.deepEqual(searchCatalog('Unbekannt'), []);
  assert.deepEqual(searchCatalog('Lidl', 'drugstore'), []);
});

test('Umbenannter Händler: Logo, Standardlink und Drogerieverhalten bleiben zugeordnet; eigene Links gewinnen', () => {
  const renamed = { name: 'Innenstadt', chainKey: 'dm' };
  assert.equal(chainForStore(renamed).key, 'dm');
  assert.equal(defaultOfferUrl(renamed), catalogByKey('dm').offers);
  assert.equal(takesAnywhere(renamed), false);
  assert.equal(takesAnywhere({ ...renamed, anywhere: true }), true);
  assert.equal(storeOfferUrl({ ...renamed, offersUrl: 'https://example.org/filiale' }), 'https://example.org/filiale');
  assert.equal(chainForStore({ name: 'Lidl', chainKey: 'future-shop' }).key, 'lidl', 'künftige Zuordnung fällt sicher auf Namen zurück');
  assert.equal(chainForStore({ name: 'Baumarkt' }), null);
});

test('Katalogverweis: optional, validiert, getrennt zusammengeführt und im Backup erhalten', () => {
  const one = op({ chainKey: 'dm', name: 'Innenstadt' }, '2026-10-29T12:00:00Z');
  const two = op({ offersUrl: 'https://example.org/partner' }, '2026-10-29T12:01:00Z');
  const result = merge(merge(structuredClone(demo), [one]), [two]);
  const saved = JSON.parse(JSON.stringify(result));
  assert.doesNotThrow(() => validate(saved));
  const row = saved.stores.find(row => row.id === 'store-edeka');
  assert.deepEqual([row.name, row.chainKey, row.offersUrl], ['Innenstadt', 'dm', 'https://example.org/partner']);
  assert.deepEqual(merge(merge(structuredClone(demo), [two]), [one]).stores, result.stores);
  assert.equal(merge(result, [one, two]).stores.length, result.stores.length, 'wiederholter Offline-Versand legt keinen Händler doppelt an');
  const future = structuredClone(row); future.chainKey = 'future-shop';
  const copied = structuredClone(saved); copied.stores[0] = future;
  assert.doesNotThrow(() => validate(copied));
  for (const invalid of [42, {}, 'https://example.org', '<img>', '', 'a'.repeat(81)]) {
    const invalidData = structuredClone(saved); invalidData.stores[0].chainKey = invalid;
    assert.throws(() => validate(invalidData), /Händlerzuordnung/);
  }
  assert.doesNotThrow(() => validate(demo), 'bestehende Daten unverändert lesbar');
});
