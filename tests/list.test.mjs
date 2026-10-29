import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { active, addToList, combineQuantity, foldIntoList, inPantry, listRow, merge, operation, pantryAdditions, pantryKeys, sameProduct, validate, wordSimilarity } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const AT = '2026-10-27T10:00:00.000Z';
const row = (id, name, quantity, unit, extra = {}) => ({ id, name, quantity, unit, storeId: 'store-edeka', checked: false, createdBy: 'Nico', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {}, ...extra });
const open = items => ({ ...structuredClone(demo), items });

test('Mengen zusammenpassender Einheiten werden addiert, größere Mengen umgerechnet', () => {
  assert.deepEqual(combineQuantity({ quantity: 500, unit: 'g' }, { quantity: 300, unit: 'g' }), { quantity: 800, unit: 'g' });
  assert.deepEqual(combineQuantity({ quantity: 600, unit: 'g' }, { quantity: 0.5, unit: 'kg' }), { quantity: 1.1, unit: 'kg' });
  assert.deepEqual(combineQuantity({ quantity: 1, unit: 'kg' }, { quantity: 200, unit: 'g' }), { quantity: 1.2, unit: 'kg' });
  assert.deepEqual(combineQuantity({ quantity: 0.2, unit: 'kg' }, { quantity: 300, unit: 'g' }), { quantity: 500, unit: 'g' });
  assert.deepEqual(combineQuantity({ quantity: 250, unit: 'ml' }, { quantity: 0.75, unit: 'l' }), { quantity: 1, unit: 'l' });
  assert.deepEqual(combineQuantity({ quantity: 2, unit: 'Stück' }, { quantity: 3, unit: 'Stk.' }), { quantity: 5, unit: 'Stück' });
  assert.deepEqual(combineQuantity({ quantity: 1, unit: 'Bund' }, { quantity: 2, unit: 'bund' }), { quantity: 3, unit: 'Bund' });
  assert.deepEqual(combineQuantity({ quantity: 0.1, unit: 'Stück' }, { quantity: 0.2, unit: 'Stück' }), { quantity: 0.3, unit: 'Stück' }, 'keine Gleitkomma-Reste');
});

test('Unterschiedliche Einheiten werden nie verrechnet', () => {
  for (const [a, b] of [['g', 'Stück'], ['l', 'kg'], ['Bund', 'EL'], ['Packung', 'Stück'], ['ml', 'EL']]) {
    assert.equal(combineQuantity({ quantity: 1, unit: a }, { quantity: 1, unit: b }), null, `${a} + ${b}`);
  }
});

test('Gleicher Name im selben Geschäft: Menge wird erhöht statt eines zweiten Eintrags', () => {
  const items = [row('a', 'Zwiebeln', 2, 'Stück')];
  const result = addToList([{ name: ' zwiebeln', quantity: 3, unit: 'Stück' }], 'store-edeka', 'Nico', AT, items);
  assert.equal(result.added, 0);
  assert.deepEqual(result.counted, [{ id: 'a', name: 'Zwiebeln', add: { quantity: 3, unit: 'Stück' }, after: { quantity: 5, unit: 'Stück' } }]);
  assert.equal(result.ops.length, 1);
  const out = merge(open(items), result.ops).items.find(item => item.id === 'a');
  assert.equal(out.quantity, 5);
});

test('Anderes Geschäft, erledigt oder gelöscht: kein Zusammenzählen', () => {
  const items = [row('a', 'Milch', 1, 'l', { storeId: 'store-lidl' }), row('b', 'Butter', 1, 'Stück', { checked: true }), row('c', 'Käse', 1, 'Stück', { deletedAt: AT }), row('d', 'Brot', 1, 'Stück', { storeId: '' })];
  const result = foldIntoList([{ name: 'Milch', quantity: 1, unit: 'l' }, { name: 'Butter', quantity: 1, unit: 'Stück' }, { name: 'Käse', quantity: 1, unit: 'Stück' }, { name: 'Brot', quantity: 1, unit: 'Stück' }], 'store-edeka', items);
  assert.equal(result.fresh.length, 4);
  assert.equal(result.counted.length, 0);
  // „Ohne Geschäft“ zählt untereinander zusammen
  assert.deepEqual(foldIntoList([{ name: 'Brot', quantity: 2, unit: 'Stück' }], '', items).counted.map(entry => entry.after.quantity), [3]);
});

test('Unpassende Einheit wird ein eigener Eintrag', () => {
  const result = foldIntoList([{ name: 'Tomaten', quantity: 2, unit: 'Stück' }], 'store-edeka', [row('a', 'Tomaten', 500, 'g')]);
  assert.equal(result.fresh.length, 1);
  assert.equal(result.counted.length, 0);
});

test('Doppelte Zutaten innerhalb einer Lieferung werden zusammengefasst', () => {
  const result = foldIntoList([{ name: 'Mehl', quantity: 300, unit: 'g' }, { name: 'mehl', quantity: 0.5, unit: 'kg' }, { name: 'Mehl', quantity: 1, unit: 'Packung' }], 'store-edeka', []);
  assert.deepEqual(result.fresh.map(entry => [entry.name, entry.quantity, entry.unit]), [['Mehl', 800, 'g'], ['Mehl', 1, 'Packung']]);
});

test('Zutat „nach Bedarf“: nicht erneut aufschreiben, wenn schon vorhanden', () => {
  const items = [row('a', 'Salz', 1, 'Packung')];
  const result = foldIntoList([{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Pfeffer', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Pfeffer', quantity: 1, unit: 'Stück', noAmount: true }], 'store-edeka', items);
  assert.equal(result.skipped, 1, 'Salz steht schon auf der Liste');
  assert.deepEqual(result.fresh.map(entry => entry.name), ['Pfeffer'], 'Pfeffer nur einmal');
  assert.equal(result.counted.length, 0);
  // Eine echte Menge ersetzt den Platzhalter „nach Bedarf“
  const real = foldIntoList([{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Salz', quantity: 500, unit: 'g' }], 'store-edeka', []);
  assert.deepEqual(real.fresh.map(entry => [entry.quantity, entry.unit]), [[500, 'g']]);
});

test('addToList: neue Artikel, vorhandene erhöht, alles gültig', () => {
  const items = [row('a', 'Nudeln', 500, 'g')];
  const result = addToList([{ name: 'Nudeln', quantity: 250, unit: 'g' }, { name: 'Äpfel', quantity: 6, unit: 'Stück' }], 'store-edeka', 'Nico', AT, items);
  assert.equal(result.added, 1);
  assert.equal(result.counted.length, 1);
  const out = merge(open(items), result.ops);
  assert.equal(active(out.items).find(item => item.id === 'a').quantity, 750);
  assert.ok(active(out.items).some(item => item.name === 'Äpfel' && item.quantity === 6));
});

const stock = (...names) => pantryKeys(names.map(name => ({ name, deletedAt: null })));

test('Vorrat: Name, Groß-/Kleinschreibung und zusammengesetzte Namen', () => {
  const keys = stock('Salz', 'Pfeffer', 'Olivenöl');
  assert.equal(inPantry(keys, 'salz'), true);
  assert.equal(inPantry(keys, ' Olivenöl '), true);
  assert.equal(inPantry(keys, 'Salz, Pfeffer'), true, 'alle Teile im Vorrat');
  assert.equal(inPantry(keys, 'Salz und Pfeffer'), true);
  assert.equal(inPantry(keys, 'Salz (fein)'), true, 'Klammerzusatz zählt nicht');
  assert.equal(inPantry(keys, 'Salz, Zucker'), false, 'ein Teil fehlt');
  assert.equal(inPantry(keys, 'Meersalz'), false, 'kein Teilwort-Treffer');
  assert.equal(inPantry(keys, ''), false);
  assert.equal(inPantry(stock(), 'Salz'), false);
});

test('Vorrat: gelöschte Einträge zählen nicht; neue Namen ohne Doppelte und ohne Vorhandenes', () => {
  const keys = pantryKeys([{ name: 'Salz', deletedAt: null }, { name: 'Mehl', deletedAt: '2026-10-27T10:00:00.000Z' }]);
  assert.equal(inPantry(keys, 'Mehl'), false);
  assert.deepEqual(pantryAdditions(['Salz, Pfeffer', 'pfeffer', 'Mehl und Zucker'], keys), ['Pfeffer', 'Mehl', 'Zucker']);
  assert.deepEqual(pantryAdditions([], keys), []);
});

test('Vorrat ist eine optionale Erweiterung: alte Dateien bleiben gültig, neue Zeilen werden geprüft', () => {
  assert.doesNotThrow(() => validate(structuredClone(demo)));
  const out = merge(structuredClone(demo), [operation('pantry', 'p1', { name: 'Salz' }, 'Nico', AT)]);
  assert.deepEqual(active(out.pantry).map(row => row.name), ['Salz']);
  assert.deepEqual(merge(structuredClone(demo), [operation('pantry', 'p2', { name: '  ' }, 'Nico', AT)]).pantry, [], 'ungültiger Vorrat wird verworfen');
});

// Fehler (Version 2.47): Das Namensgedächtnis („Salz“ aus früheren Einkäufen) steckt im Verlauf, mit dem die App Kategorien und Einheiten rät.
// Es darf nie als Artikel auf der Liste zählen: Sonst fehlte „Salz nach Bedarf“ beim Übernehmen („Alles davon steht schon auf der Liste.“).
const remembered = (name, extra = {}) => ({ name, category: 'vorrat', unit: 'Stück', updatedAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', weight: 3, ...extra });
test('Gelernte Namen zählen nicht als Artikel auf der Liste: „Salz nach Bedarf“ kommt auf die leere Liste', () => {
  const salt = [{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }];
  const result = addToList(salt, '', 'Nico', AT, [], [remembered('Salz')]);
  assert.equal(result.ops.length, 1, 'Salz wird angelegt');
  assert.equal(result.skipped, 0);
  const [op] = result.ops;
  assert.deepEqual([op.collection, op.patch.name, op.patch.quantity, op.patch.unit, op.patch.storeId], ['items', 'Salz', 1, 'Stück', '']);
  assert.equal(op.patch.category, 'vorrat', 'das Gelernte hilft weiter bei der Kategorie');
  // Mit Menge: kein „Dazuzählen“ zu einem Namen ohne Artikel (das hätte eine Änderung ohne Ziel erzeugt)
  const sum = addToList([{ name: 'Milch', quantity: 200, unit: 'ml' }], '', 'Nico', AT, [], [remembered('Milch', { unit: 'l' })]);
  assert.deepEqual(sum.ops.map(entry => [entry.patch.name, entry.patch.quantity, entry.patch.unit]), [['Milch', 200, 'ml']]);
  assert.equal(sum.counted.length, 0);
});

test('Ein Eintrag ohne Kennung (kein echter Artikel) zählt in foldIntoList nie als vorhanden; echte Artikel weiterhin', () => {
  const salt = [{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }];
  assert.deepEqual(foldIntoList(salt, '', [remembered('Salz')]).fresh.map(entry => entry.name), ['Salz']);
  const real = foldIntoList(salt, 'store-edeka', [row('a', 'Salz', 1, 'Stück')]);
  assert.deepEqual([real.fresh.length, real.skipped], [0, 1], 'steht Salz wirklich auf der Liste, wird es nicht noch einmal aufgeschrieben');
  assert.equal(addToList(salt, 'store-edeka', 'Nico', AT, [row('a', 'Salz', 1, 'Stück')], [remembered('Salz')]).ops.length, 0);
});

test('Ohne Verlauf wie bisher: der Verlauf ist der Liste gleich', () => {
  const items = [row('a', 'Zwiebeln', 2, 'Stück', { category: 'obst-gemuese' })];
  const result = addToList([{ name: 'Zwiebeln', quantity: 1, unit: 'Stück' }, { name: 'Paprika', quantity: 1, unit: 'Stück' }], 'store-edeka', 'Nico', AT, items);
  assert.deepEqual([result.added, result.counted.length], [1, 1]);
});

// Version 2.47: Übernahme von Rezept und Wochenplan
test('Umgerechnete Mengen werden auf drei Stellen gerundet und werden nie 0; „nach Bedarf“ bleibt 1 Stück', () => {
  assert.deepEqual(listRow({ name: 'Mehl', quantity: 200, unit: 'g' }, 1 / 3), { name: 'Mehl', quantity: 66.667, unit: 'g' });
  assert.deepEqual(listRow({ name: 'Mehl', quantity: 150, unit: 'g' }, 1.5), { name: 'Mehl', quantity: 225, unit: 'g' });
  assert.equal(listRow({ name: 'Safran', quantity: 0.0004, unit: 'g' }, 1).quantity, 0.0004, 'sehr kleine Mengen werden nicht zu 0');
  assert.deepEqual(listRow({ name: 'Salz', quantity: 1, unit: 'nach Bedarf' }, 5), { name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true });
});

test('Übernahme zweier Geräte: dieselbe Zutat gleichzeitig auf beiden Geräten – nichts geht verloren, nichts wird zerstört; die Mengen addieren sich', () => {
  const start = open([row('a', 'Nudeln', 100, 'g', { storeId: '' })]);
  const rows = [{ name: 'Nudeln', quantity: 400, unit: 'g' }, { name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }];
  const nico = addToList(rows, '', 'Nico', '2026-10-29T10:00:00.000Z', start.items).ops, anna = addToList(rows, '', 'Anna', '2026-10-29T10:00:01.000Z', start.items).ops;
  const ab = merge(merge(structuredClone(start), nico), anna), ba = merge(merge(structuredClone(start), anna), nico);
  const view = data => active(data.items).map(item => [item.name, item.quantity, item.unit]).sort((x, y) => x[0].localeCompare(y[0]));
  assert.deepEqual(view(ab), view(ba), 'die Reihenfolge des Abgleichs ändert nichts');
  assert.deepEqual(view(ab).filter(entry => entry[0] === 'Nudeln'), [['Nudeln', 900, 'g']], '100 + 400 + 400: beide Zuwächse zählen');
  assert.equal(view(ab).filter(entry => entry[0] === 'Salz').length, 2, 'zwei neue Salz-Artikel (jede Person legte ihn an); das Zusammenführen doppelter Artikel macht daraus einen');
  assert.doesNotThrow(() => validate(ab));
});

test('Datenmodell: Merker „auf die Liste übernommen“ am Gericht wird geprüft und lässt sich wieder entfernen', () => {
  const at = '2026-10-29T10:00:00.000Z', meal = { id: 'm1', date: '2026-10-27', recipeId: 'recipe-pasta', servings: 2 };
  let data = merge(structuredClone(demo), [operation('meals', 'm1', meal, 'Nico', at)]);
  data = merge(data, [operation('meals', 'm1', { listedServings: 2, listedAt: at }, 'Nico', '2026-10-29T10:00:01.000Z')]);
  assert.deepEqual(data.meals.map(entry => [entry.listedServings, entry.listedAt]), [[2, at]]);
  data = merge(data, [operation('meals', 'm1', { listedServings: null, listedAt: null }, 'Nico', '2026-10-29T10:00:02.000Z')]);
  assert.deepEqual(data.meals.map(entry => [entry.listedServings, entry.listedAt]), [[null, null]]);
  for (const patch of [{ listedServings: 0 }, { listedServings: -2 }, { listedServings: 'x' }, { listedAt: 'gestern' }]) {
    assert.throws(() => merge(structuredClone(data), [operation('meals', 'm1', patch, 'Nico', '2026-10-29T10:00:03.000Z')]), /Ungültige Angabe zur Übernahme/, JSON.stringify(patch));
  }
});

// Version 2.48: dasselbe Produkt in anderer Schreibweise
test('Dasselbe Produkt: gleiche Grundform oder (bei langen Wörtern) mindestens 95 % Übereinstimmung; sonst getrennt', () => {
  for (const [a, b] of [['Zwiebel', 'Zwiebeln'], ['zwiebeln', 'Zwiebel'], ['Äpfel', 'Apfel'], ['Tomate', 'Tomaten'], ['Ei', 'Eier'], ['Kichererbsen, abgetropft', 'Kichererbsen abgetropft'],
    ['rote Zwiebeln', 'rote Zwiebel'], ['Mehl', 'mehl '], ['Haferflocken', 'Haferflocke'], ['Kartoffelstärkemehlmischung', 'Kartoffelstaerkemehlmischung'], ['Cola 1 l', 'Cola 1 L']]) assert.equal(sameProduct(a, b), true, `${a} = ${b}`);
  for (const [a, b] of [['Zwiebel', 'rote Zwiebel'], ['Milch', 'Hafermilch'], ['Ei', 'Eis'], ['Vollkornspaghetti mit Ei', 'Vollkornspaghetti mit Eis'], ['Cola 1 l', 'Cola 2 l'], ['Salz', 'Salami'],
    ['Zwiebel', 'Zwiebelmett'], ['Nudeln', 'Nudelsalat'], ['', 'x'], ['?', '!'], ['Butter', 'Margarine']]) assert.equal(sameProduct(a, b), false, `${a} ≠ ${b}`);
  assert.equal(sameProduct('?', '?'), true, 'derselbe Text ist immer derselbe Name');
  // die 95 %: Roh sind „Zwiebel“ und „Zwiebeln“ nur 87,5 % gleich (die Grundform ist es zu 100 %)
  assert.equal(wordSimilarity('zwiebel', 'zwiebeln'), 0.875);
  assert.equal(wordSimilarity('kartoffelstarkemehlmischung', 'kartoffelstarkemehlmischunq') >= 0.95, true);
});

test('Auf die Liste: „Zwiebel“ zählt zu „Zwiebeln“ dazu (und umgekehrt), der Artikel behält seinen Namen; 500 g und 2 Stück bleiben getrennt', () => {
  const items = [row('a', 'Zwiebeln', 2, 'Stück'), row('b', 'Tomate', 500, 'g')];
  const result = foldIntoList([{ name: 'Zwiebel', quantity: 1, unit: 'Stück' }, { name: 'Tomaten', quantity: 250, unit: 'g' }, { name: 'Zwiebel', quantity: 300, unit: 'g' }], 'store-edeka', items);
  assert.deepEqual(result.counted.map(entry => [entry.id, entry.name, entry.add, entry.after]), [['a', 'Zwiebeln', { quantity: 1, unit: 'Stück' }, { quantity: 3, unit: 'Stück' }], ['b', 'Tomate', { quantity: 250, unit: 'g' }, { quantity: 750, unit: 'g' }]]);
  assert.deepEqual(result.fresh.map(entry => [entry.name, entry.quantity, entry.unit]), [['Zwiebel', 300, 'g']], 'andere Einheit: eigener Artikel');
  const batch = foldIntoList([{ name: 'Zwiebel', quantity: 1, unit: 'Stück' }, { name: 'Zwiebeln', quantity: 2, unit: 'Stück' }], '', []);
  assert.deepEqual(batch.fresh.map(entry => [entry.name, entry.quantity]), [['Zwiebel', 3]], 'auch innerhalb einer Übernahme');
  const noAmount = foldIntoList([{ name: 'Salze', quantity: 1, unit: 'Stück', noAmount: true }], 'store-edeka', [row('s', 'Salz', 1, 'Stück')]);
  assert.deepEqual([noAmount.fresh.length, noAmount.skipped], [0, 1]);
});

test('Vorrat: „Zwiebeln“ im Vorrat deckt das Rezept „Zwiebel“ ab; Hinzufügen erkennt vorhandene Schreibweisen', () => {
  const keys = stock('Zwiebeln', 'Eier', 'Salz');
  assert.equal(inPantry(keys, 'Zwiebel'), true);
  assert.equal(inPantry(keys, 'Ei'), true);
  assert.equal(inPantry(keys, 'Salz, Zwiebel'), true);
  assert.equal(inPantry(keys, 'rote Zwiebel'), false);
  assert.deepEqual(pantryAdditions(['Zwiebel', 'Tomate', 'Tomaten'], keys), ['Tomate'], 'Zwiebel steht schon da; Tomate und Tomaten sind eins');
});
