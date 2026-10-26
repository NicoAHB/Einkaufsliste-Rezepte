import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { AUTO_BYTES, LIMIT_BYTES, POLICY, compact, due, sizeOf } from '../compact.js';
import { suggestCategory } from '../categories.js';
import { active, merge, operation, suggestItemNames, uid, validate } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const NOW = new Date('2027-03-01T12:00:00.000Z');
const ago = days => new Date(NOW.getTime() - days * 86400000).toISOString();
const op = (collection, id, patch, at, actor = 'Nico') => ({ ...operation(collection, id, patch, actor, at), id: `op-${collection}-${id}-${at}-${actor}` });
const item = (id, name, extra = {}, at = ago(1)) => op('items', id, { storeId: 'store-edeka', name, quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', ...extra }, at);
const base = () => structuredClone(demo);

test('Nichts zum Aufräumen: Datei bleibt genau gleich, es gibt keine Änderung zu schreiben', () => {
  const result = compact(base(), NOW);
  assert.equal(result.changed, false);
  assert.equal(result.data.sync.compactedAt, undefined);
  assert.equal(compact(compact(merge(base(), [item('a', 'Milch')]), NOW).data, NOW).changed, false);
});

test('Gelöschtes wird nach 14 Tagen entfernt, jüngeres bleibt', () => {
  const data = merge(base(), [item('alt', 'Alt', {}, ago(80)), op('items', 'alt', { deletedAt: ago(POLICY.tombstoneDays + 1) }, ago(POLICY.tombstoneDays + 1)),
    item('neu', 'Neu', {}, ago(40)), op('items', 'neu', { deletedAt: ago(POLICY.tombstoneDays - 1) }, ago(POLICY.tombstoneDays - 1)), item('lebt', 'Lebt', {}, ago(90))]);
  const { data: out, changed, removed } = compact(data, NOW);
  assert.equal(changed, true);
  assert.deepEqual(out.items.map(row => row.id).filter(id => ['alt', 'neu', 'lebt'].includes(id)).sort(), ['lebt', 'neu']);
  assert.equal(removed.items, 1);
  assert.doesNotThrow(() => validate(out));
  assert.equal(out.sync.compactedAt, NOW.toISOString());
  assert.ok(data.items.some(row => row.id === 'alt'), 'die Eingabe bleibt unverändert');
});

test('Erledigte, nie entfernte Artikel werden nach 21 Tagen entfernt, frische bleiben', () => {
  const data = merge(base(), [item('alt', 'Alt', { checked: true }, ago(60)), op('items', 'alt', { checked: true }, ago(POLICY.doneDays + 1)),
    item('frisch', 'Frisch', { checked: true }, ago(5)), item('offen', 'Offen', {}, ago(100))]);
  const out = compact(data, NOW).data;
  const ids = out.items.map(row => row.id);
  assert.ok(!ids.includes('alt') && ids.includes('frisch') && ids.includes('offen'), 'Offene Artikel bleiben immer');
});

test('Rezepte und Geschäfte: Zutaten, Artikel und Preise des Entfernten gehen mit', () => {
  const stamp = ago(40);
  const data = merge(base(), [
    op('recipes', 'r-weg', { name: 'Weg', servings: 2, tags: [], instructions: 'x' }, stamp), op('recipes', 'r-weg', { deletedAt: ago(35) }, ago(35)),
    op('ingredients', 'i-weg', { recipeId: 'r-weg', name: 'Mehl', quantity: 1, unit: 'kg' }, stamp),
    op('stores', 's-weg', { name: 'Weg' }, stamp), op('stores', 's-weg', { deletedAt: ago(33) }, ago(33)),
    item('a-weg', 'Zucker', { storeId: 's-weg' }, stamp), op('prices', 'p-weg', { storeId: 's-weg', name: 'Zucker', quote: { cents: 100, quantity: 1, unit: 'kg' } }, stamp)]);
  const out = compact(data, NOW).data;
  assert.ok(!out.recipes.some(row => row.id === 'r-weg') && !out.ingredients.some(row => row.id === 'i-weg'));
  assert.ok(!out.stores.some(row => row.id === 's-weg') && !out.items.some(row => row.id === 'a-weg') && !out.prices.some(row => row.id === 'p-weg'));
  assert.ok(out.recipes.some(row => row.id === 'recipe-pasta') && out.ingredients.length > 0, 'Anderes bleibt');
  assert.doesNotThrow(() => validate(out));
});

test('Wochenplan: vergangene Gerichte nach 120 Tagen weg, aktuelle bleiben', () => {
  const data = merge(base(), [op('meals', 'alt', { date: ago(130).slice(0, 10), recipeId: 'recipe-pasta', servings: 2 }, ago(130)),
    op('meals', 'neu', { date: ago(5).slice(0, 10), title: 'Pizza', servings: 2 }, ago(5))]);
  assert.deepEqual(compact(data, NOW).data.meals.map(row => row.id), ['neu']);
});

test('Gemerkte Preise: nur die neuesten je Geschäft, Produkt und Einheitengruppe', () => {
  const quote = cents => ({ cents, quantity: 1, unit: 'kg' });
  const prices = Array.from({ length: 6 }, (_, index) => op('prices', `p${index}`, { storeId: 'store-edeka', name: 'Mehl', quote: quote(100 + index) }, ago(60 - index)));
  prices.push(op('prices', 'andere', { storeId: 'store-lidl', name: 'Mehl', quote: quote(90) }, ago(60)));
  const out = compact(merge(base(), prices), NOW).data;
  const kept = out.prices.filter(row => row.name === 'Mehl').map(row => row.id).sort();
  assert.deepEqual(kept, ['andere', 'p4', 'p5']);
});

test('Änderungsprotokoll wird gekürzt, die neuesten bleiben in Reihenfolge', () => {
  const data = base(); data.sync.applied = Array.from({ length: POLICY.keepApplied + 50 }, (_, index) => `op-${index}`);
  const out = compact(data, NOW).data;
  assert.equal(out.sync.applied.length, POLICY.keepApplied);
  assert.equal(out.sync.applied[0], 'op-50'); assert.equal(out.sync.applied.at(-1), `op-${POLICY.keepApplied + 49}`);
});

test('Zeitstempel je Feld werden durch eine Sammelmarke ersetzt; neuere Änderungen gewinnen weiter, ältere nicht', () => {
  const data = merge(base(), [item('x', 'Altbrot', {}, ago(100)), op('items', 'x', { quantity: 3 }, ago(90))]);
  const out = compact(data, NOW).data, row = out.items.find(entry => entry.id === 'x');
  assert.deepEqual(Object.keys(row._clock), ['*']);
  assert.equal(row.quantity, 3);
  const newer = merge(out, [op('items', 'x', { quantity: 5 }, ago(2))]);
  assert.equal(newer.items.find(entry => entry.id === 'x').quantity, 5);
  const older = merge(out, [op('items', 'x', { quantity: 9 }, ago(95))]);
  assert.equal(older.items.find(entry => entry.id === 'x').quantity, 3, 'Eine uralte Änderung darf nichts überschreiben');
  assert.ok(sizeOf(out.items.find(entry => entry.id === 'x')) < sizeOf(data.items.find(entry => entry.id === 'x')));
});

test('Verwaiste Änderungen eines Geräts, das lange offline war, machen die Datei nicht ungültig', () => {
  const data = merge(base(), [item('weg', 'Weg', {}, ago(80)), op('items', 'weg', { deletedAt: ago(60) }, ago(60))]);
  const compacted = compact(data, NOW).data;
  assert.ok(!compacted.items.some(row => row.id === 'weg'));
  // Gerät B war offline und kennt „weg“ noch: abhaken, umbenennen, löschen, Menge ändern.
  const stale = [op('items', 'weg', { checked: true }, ago(50), 'Anna'), op('items', 'weg', { name: 'Neu benannt' }, ago(49), 'Anna'),
    op('items', 'weg', { deletedAt: ago(48) }, ago(48), 'Anna'), op('items', 'weg', { quantity: 2 }, ago(47), 'Anna'), item('echt', 'Echt', {}, ago(46))];
  const result = merge(compacted, stale);
  assert.ok(!result.items.some(row => row.id === 'weg'), 'kein halber Datensatz');
  assert.ok(result.items.some(row => row.id === 'echt'), 'echte Änderungen kommen durch');
  assert.ok(stale.every(entry => result.sync.applied.includes(entry.id)), 'alles gilt als verarbeitet, nichts wird erneut gesendet');
});

test('Namensgedächtnis: Vorschläge und gelernte Kategorien überleben das Aufräumen', () => {
  const rows = [item('m1', 'Kefir', { category: 'getraenke' }, ago(90)), op('items', 'm1', { deletedAt: ago(80) }, ago(80)),
    item('m2', 'kefir ', { category: 'getraenke' }, ago(70)), op('items', 'm2', { deletedAt: ago(60) }, ago(60)), item('m3', 'Kichererbsen', {}, ago(75)), op('items', 'm3', { deletedAt: ago(60) }, ago(60))];
  const out = compact(merge(base(), rows), NOW).data;
  assert.ok(!out.items.some(row => /kefir|kicher/i.test(row.name)));
  assert.deepEqual(out.names.map(entry => [entry.name, entry.count]), [['Kefir', 2], ['Kichererbsen', 1]]);
  const history = [...out.items, ...out.names.map(entry => ({ name: entry.name, category: entry.category, updatedAt: entry.at, weight: entry.count }))];
  assert.deepEqual(suggestItemNames(history, 'ke'), ['Kefir']);
  assert.equal(suggestCategory('KEFIR', history), 'getraenke');
  // Nochmaliges Aufräumen verdoppelt nichts.
  assert.equal(compact(out, NOW).changed, false);
});

test('Ein Jahr Nutzung (20 Artikel pro Woche): ohne Aufräumen über der Grenze, mit Aufräumen weit darunter', () => {
  let plain = base(), tidy = base(), t = Date.parse('2026-11-01T10:00:00Z');
  const sizes = [];
  for (let week = 1; week <= 52; week++) {
    const ops = [];
    for (let i = 0; i < 20; i++) {
      const id = uid(), at = () => new Date(t += 3600000).toISOString();
      ops.push(op('items', id, { storeId: 'store-edeka', name: `Artikel ${week}-${i % 12}`, quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', category: 'vorrat', price: null, onSale: false }, at()));
      ops.push(op('items', id, { checked: true }, at())); ops.push(op('items', id, { deletedAt: at() }, at()));
    }
    ops.forEach((entry, index) => { entry.id = uid(); });
    plain = merge(plain, ops); tidy = merge(tidy, ops);
    if (due(tidy)) tidy = compact(tidy, new Date(t)).data;
    sizes.push(sizeOf(tidy));
  }
  assert.ok(sizeOf(plain) > LIMIT_BYTES, `ohne Aufräumen nur ${sizeOf(plain)} Byte`);
  assert.ok(Math.max(...sizes) < AUTO_BYTES + 60000, `Höchststand ${Math.max(...sizes)} Byte`);
  assert.ok(sizeOf(tidy) < 200000, `im Dauerbetrieb nur ${sizeOf(tidy)} Byte`);
  assert.doesNotThrow(() => validate(tidy));
  assert.ok(tidy.names.length > 0 && tidy.names.length <= POLICY.maxNames);
  assert.equal(active(tidy.items).length, demo.items.length, 'Alle lebenden Artikel sind noch da');
});

test('Ergebnis ist eine gültige, aber kleinere Datei und enthält alles Lebende unverändert', () => {
  const data = merge(base(), [item('a', 'Milch', {}, ago(100)), op('items', 'a', { deletedAt: ago(99) }, ago(99)), item('b', 'Brot', {}, ago(100))]);
  const { data: out, before, after } = compact(data, NOW);
  assert.ok(after < before);
  const alive = rows => JSON.stringify(rows.filter(row => !row.deletedAt).map(row => [row.id, row.name]));
  assert.equal(alive(out.items), alive(data.items));
  assert.deepEqual(out.recipes.map(row => row.name), data.recipes.map(row => row.name));
});
