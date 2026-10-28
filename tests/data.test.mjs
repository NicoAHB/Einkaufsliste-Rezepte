import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { active, emptyData, ingredientItems, merge, newItems, operation, positive, spellingStem, suggestItemNames, validate } from '../data.js';
import { GROCERY_NAMES } from '../grocery-names.js';
import { NO_AMOUNT } from '../recipe-import.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const at = second => `2026-10-26T10:00:${String(second).padStart(2, '0')}.000Z`;
const op = (collection, id, patch, second, actor = 'Nico') => ({ ...operation(collection, id, patch, actor, at(second)), id: `op-${collection}-${id}-${second}-${actor}` });

test('Beispieldaten sind gültig', () => {
  assert.doesNotThrow(() => validate(structuredClone(demo)));
  assert.ok(active(demo.recipes).length >= 3);
});

test('Unbekannte Version und beschädigte Daten werden abgelehnt', () => {
  assert.throws(() => validate({ ...structuredClone(demo), version: 2 }), /Unbekannte Datenversion/);
  assert.throws(() => validate({ ...structuredClone(demo), sync: {} }), /Synchronisierungsdaten/);
  const broken = structuredClone(demo); broken.items[0].quantity = -1;
  assert.throws(() => validate(broken), /Ungültige Zutat/);
  const duplicate = structuredClone(demo); duplicate.items.push(structuredClone(duplicate.items[0]));
  assert.throws(() => validate(duplicate), /Ungültiger Eintrag/);
});

test('Optionale Rezeptquelle: Text erlaubt, andere Typen nicht', () => {
  const data = structuredClone(demo);
  data.recipes[0].sourceUrl = 'https://www.chefkoch.de/rezepte/1';
  assert.doesNotThrow(() => validate(data));
  data.recipes[0].sourceUrl = 5;
  assert.throws(() => validate(data), /Rezeptquelle/);
});

test('Feldweise Zusammenführung: jüngere Änderung gewinnt, andere Felder bleiben', () => {
  const id = demo.items[0].id;
  const merged = merge(demo, [op('items', id, { name: 'Passierte Tomaten', quantity: 2 }, 5), op('items', id, { quantity: 3 }, 9, 'Partnerin'), op('items', id, { name: 'Tomaten alt' }, 1)]);
  const row = merged.items.find(item => item.id === id);
  assert.equal(row.name, 'Passierte Tomaten');
  assert.equal(row.quantity, 3);
  assert.equal(row.unit, demo.items[0].unit);
});

test('Zusammenführen ist reihenfolgeunabhängig und wiederholbar', () => {
  const ops = [op('items', 'neu', { storeId: demo.stores[0].id, name: 'Reis', quantity: 1, unit: 'kg', checked: false, createdBy: 'Nico' }, 2),
    op('items', 'neu', { checked: true }, 4, 'Partnerin'), op('items', 'neu', { name: 'Basmati' }, 3)];
  const forward = merge(demo, ops), backward = merge(demo, [...ops].reverse()), twice = merge(forward, ops);
  const pick = data => data.items.find(item => item.id === 'neu');
  assert.deepEqual([pick(forward).name, pick(forward).checked], ['Basmati', true]);
  assert.deepEqual([pick(backward).name, pick(backward).checked], ['Basmati', true]);
  assert.equal(twice.items.filter(item => item.id === 'neu').length, 1);
  assert.equal(twice.sync.applied.length, forward.sync.applied.length);
});

test('Löschen bleibt bestehen, gewöhnliches Bearbeiten belebt nichts wieder', () => {
  const id = demo.items[0].id;
  const merged = merge(demo, [op('items', id, { deletedAt: at(5) }, 5), op('items', id, { name: 'Später umbenannt' }, 6)]);
  assert.ok(merged.items.find(item => item.id === id).deletedAt);
  assert.ok(!active(merged.items).some(item => item.id === id));
  const restored = merge(merged, [op('items', id, { deletedAt: null }, 8)]);
  assert.equal(restored.items.find(item => item.id === id).deletedAt, null);
});

test('Gefährliche Feldnamen werden ignoriert', () => {
  const merged = merge(demo, [op('items', demo.items[0].id, JSON.parse('{"__proto__":{"polluted":1},"constructor":"x","name":"ok"}'), 5)]);
  assert.equal({}.polluted, undefined);
  assert.equal(merged.items[0].name, 'ok');
});

test('Zahleneingaben: deutsches Komma, keine Null, kein Text', () => {
  assert.equal(positive('1,5'), 1.5);
  assert.equal(positive(' 2 '), 2);
  for (const bad of ['0', '-1', 'abc', '', '1e999']) assert.throws(() => positive(bad), /Menge/);
});

test('Zutaten auf die Liste: Portionen umrechnen, „nach Bedarf“ wird 1 Stück', () => {
  const ingredients = [
    { id: 'i1', recipeId: 'r', name: 'Nudeln', quantity: 200, unit: 'g', deletedAt: null },
    { id: 'i2', recipeId: 'r', name: 'Salz', quantity: 1, unit: NO_AMOUNT, deletedAt: null },
    { id: 'i3', recipeId: 'r', name: 'Gelöscht', quantity: 1, unit: 'g', deletedAt: at(1) },
    { id: 'i4', recipeId: 'andere', name: 'Fremd', quantity: 1, unit: 'g', deletedAt: null }];
  const ops = ingredientItems(ingredients, 'r', 'store-1', 2.5, 'Nico', at(7));
  assert.equal(ops.length, 2);
  assert.deepEqual(ops.map(row => [row.patch.name, row.patch.quantity, row.patch.unit]), [['Nudeln', 500, 'g'], ['Salz', 1, 'Stück']]);
  assert.ok(ops.every(row => row.collection === 'items' && row.patch.checked === false && row.patch.createdBy === 'Nico'));
});

test('Artikelvorschläge: Wortanfang zuerst, häufig vor selten, ohne Doppelte', () => {
  const items = ['Kochschinken', 'kochschinken ', 'Kochsalz', 'Brokkoli', 'Zwiebeln', 'Zwiebeln', 'Rote Zwiebeln'].map((name, index) => ({ name, createdAt: at(index), updatedAt: at(index) }));
  assert.deepEqual(suggestItemNames(items, 'kochs'), ['kochschinken ', 'Kochsalz'].map(name => name.trim()).map(name => name === 'kochschinken' ? 'kochschinken' : name));
  assert.deepEqual(suggestItemNames(items, 'zwie'), ['Zwiebeln', 'Rote Zwiebeln']);
  assert.deepEqual(suggestItemNames(items, ''), []);
  assert.equal(suggestItemNames(items, 'o', 2).length, 2);
});

test('Artikelvorschläge: „ap“ findet Apfel und Äpfel (Umlaut egal, nur einmal), „ba“ auch „Bio Bananen“; Wortanfang vor Mitte, eigene vor eingebauten', () => {
  const own = names => names.map((name, index) => ({ name, createdAt: at(index), updatedAt: at(index) }));
  assert.deepEqual(suggestItemNames(own(['Äpfel', 'Birnen', 'Zahnpasta']), 'ap'), ['Äpfel'], 'Umlaut zählt wie sein Grundbuchstabe');
  assert.deepEqual(suggestItemNames(own(['Apfel', 'Äpfel', 'Apfel']), 'ap'), ['Apfel'], 'Apfel und Äpfel nur einmal, die häufigere Schreibweise');
  assert.deepEqual(suggestItemNames(own(['Banane', 'Bananen']), 'ba'), ['Bananen'], 'gleiche Wortstämme nur einmal, die neuere Schreibweise');
  const ranked = suggestItemNames(own(['Zahnpasta', 'Bio Bananen', 'Bananenchips', 'Basilikum']), 'ba');
  assert.deepEqual(ranked, ['Basilikum', 'Bananenchips', 'Bio Bananen'], 'zuerst Namen, die mit „ba“ beginnen (die zuletzt benutzte zuerst), dann ein späteres Wort; „Zahnpasta“ enthält kein „ba“');
  assert.deepEqual(suggestItemNames(own(['Fußmatte']), 'fuss'), ['Fußmatte'], 'ß zählt als ss');
  // Gewicht: eigene Artikel (Standard 1) vor Zutaten (0,5) vor eingebauten Namen (kleiner)
  const mixed = [{ name: 'Basilikum', weight: 0.4 }, { name: 'Bananen', weight: 0.5 }, { name: 'Basmati-Reis', weight: 1 }];
  assert.deepEqual(suggestItemNames(mixed, 'ba'), ['Basmati-Reis', 'Bananen', 'Basilikum']);
});

test('Eingebaute Artikelnamen: ohne Doppelte (auch nicht in anderer Schreibweise), mit den wichtigsten Anfängen', () => {
  assert.ok(GROCERY_NAMES.length >= 150);
  assert.equal(new Set(GROCERY_NAMES.map(name => spellingStem(name))).size, GROCERY_NAMES.length, 'keine zwei Namen mit demselben Wortstamm');
  assert.ok(GROCERY_NAMES.every(name => typeof name === 'string' && name.trim() === name && name.length >= 2 && name.length <= 30));
  const rows = GROCERY_NAMES.map((name, index) => ({ name, weight: 0.4 - index * 0.002 }));
  assert.ok(rows.every(row => row.weight > 0), 'alle Gewichte bleiben positiv');
  assert.equal(suggestItemNames(rows, 'ba')[0], 'Bananen', 'ba → Bananen zuerst');
  assert.equal(suggestItemNames(rows, 'ap')[0], 'Äpfel');
  assert.ok(suggestItemNames(rows, 'ap').includes('Aprikosen'));
  assert.equal(suggestItemNames(rows, 'mi')[0], 'Milch');
  assert.equal(suggestItemNames(rows, 'to')[0], 'Tomaten');
  assert.equal(suggestItemNames(rows, 'zw')[0], 'Zwiebeln');
  assert.equal(suggestItemNames(rows, 'but')[0], 'Butter');
});

test('Leere Daten sind gültig', () => assert.doesNotThrow(() => validate(emptyData())));

test('Wochenplan, Kategorie, Favorit, Kochdatum und Foto sind optionale Erweiterungen von v1', () => {
  const data = structuredClone(demo);
  assert.equal(data.meals, undefined, 'ältere Dateien haben keinen Wochenplan');
  assert.doesNotThrow(() => validate(data));
  const stamp = { createdAt: at(1), updatedAt: at(1), deletedAt: null, _clock: {} };
  data.meals = [{ id: 'm1', date: '2026-10-26', recipeId: 'recipe-pasta', servings: 2, done: false, ...stamp }, { id: 'm2', date: '2026-10-27', title: 'Pizza bestellen', servings: 1, ...stamp }];
  data.items[0].category = 'obst';
  Object.assign(data.recipes[0], { favorite: true, lastCookedAt: '2026-10-20', photoId: '0f8fad5b-d9cb-469f-a165-70867728950e' });
  assert.doesNotThrow(() => validate(data));
  const bad = patch => { const copy = structuredClone(data); patch(copy); return () => validate(copy); };
  assert.throws(bad(copy => { copy.meals[0].date = '2026-02-30'; }), /Wochenplan/);
  assert.throws(bad(copy => { copy.meals[0].servings = 0; }), /Wochenplan/);
  assert.throws(bad(copy => { copy.meals[1].title = ''; }), /Wochenplan/);
  assert.throws(bad(copy => { copy.meals[0].done = 'ja'; }), /Wochenplan/);
  assert.throws(bad(copy => { copy.items[0].category = 5; }), /Kategorie/);
  assert.throws(bad(copy => { copy.recipes[0].favorite = 'ja'; }), /Favorit/);
  assert.throws(bad(copy => { copy.recipes[0].lastCookedAt = 'gestern'; }), /Kochdatum/);
  assert.throws(bad(copy => { copy.recipes[0].photoId = '../../etc/passwd'; }), /Foto-Kennung/);
});

test('Wochenplan-Änderungen werden wie alle anderen zusammengeführt (auch ohne vorhandene Liste)', () => {
  const merged = merge(demo, [op('meals', 'm1', { date: '2026-10-26', recipeId: 'recipe-pasta', servings: 2, done: false }, 3),
    op('meals', 'm1', { done: true }, 5, 'Partnerin'), op('meals', 'm1', { servings: 4 }, 4)]);
  const meal = merged.meals.find(row => row.id === 'm1');
  assert.deepEqual([meal.done, meal.servings, meal.date], [true, 4, '2026-10-26']);
  assert.equal(active(merged.meals).length, 1);
});

test('Neue Artikel: Kategorie wird aus früheren Artikeln gelernt, sonst geschätzt, sonst weggelassen', () => {
  const known = [{ name: 'Kefir', category: 'getraenke', updatedAt: at(1) }];
  const ops = newItems([{ name: 'kefir', quantity: 1, unit: 'l' }, { name: 'Äpfel', quantity: 6, unit: 'Stück' }, { name: 'Xyzzy', quantity: 1, unit: 'Stück' }], 'store-1', 'Nico', at(5), known);
  assert.deepEqual(ops.map(row => row.patch.category), ['getraenke', 'obst', undefined]);
  assert.ok(!('category' in ops[2].patch));
  assert.ok(ops.every(row => row.collection === 'items' && row.patch.createdBy === 'Nico' && row.patch.checked === false));
});

test('Reihenfolge der Gänge am Geschäft (aisles): gültige Listen werden gespeichert, ungültige lehnt die Datei ab', () => {
  const store = patch => operation('stores', 's-neu', { name: 'Neu', ...patch }, 'Nico', '2027-03-01T10:00:00.000Z');
  const ok = merge(emptyData(), [store({ aisles: ['getraenke', 'obst'] })]);
  assert.deepEqual(ok.stores.find(row => row.id === 's-neu').aisles, ['getraenke', 'obst']);
  assert.doesNotThrow(() => validate(merge(ok, [store({ aisles: null })])), 'null = Standard');
  // Eine ungültige Liste (von einer fehlerhaften Datei oder einem anderen Gerät) macht die Zeile ungültig; merge verwirft sie nicht still
  for (const bad of ['obst', ['unsinn'], ['obst', 'obst']]) {
    const data = merge(emptyData(), [store({})]); data.stores.find(row => row.id === 's-neu').aisles = bad;
    assert.throws(() => validate(data), /Reihenfolge der Gänge/, JSON.stringify(bad));
  }
});
