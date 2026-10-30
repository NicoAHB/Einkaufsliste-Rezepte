import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, merge, operation, validate } from '../data.js';
import { dailyHistory, dailyRecord, dailySnapshot } from '../daily.js';
import { GROCERY_PRODUCTS, PANTRY_BASIC_IDS, pantryProductAllowed, pantryProductLibrary, productLibrary } from '../product-catalog.js';
import { pantryChanges } from '../pantry.js';
import { layoutRecipe, PAGE } from '../recipe-sheet.js';
import { makePdf, textWidth } from '../pdf.js';

const at = '2026-10-30T09:00:00.000Z', op = (collection, id, patch, time = at) => operation(collection, id, patch, 'Nico', time);
const recipe = { name: 'Notizrezept', servings: 2, instructions: 'Alles kochen.', tags: [] };
const make = notes => layoutRecipe({ recipe: { ...recipe, notes }, ingredients: [{ amount: '200 g', name: 'Nudeln' }], instructions: recipe.instructions });
const text = layout => layout.pages.flatMap(page => page.items.filter(item => item.type === 'text'));
const noteBody = layout => text(layout).filter(item => item.x === 42 && item.font === 'sans' && item.size === 11);

test('Rezeptnotizen: optionale alte Dateien, Längenprüfung und feldweiser Abgleich', () => {
  const base = merge(emptyData(), [op('recipes', 'r', recipe)]); assert.doesNotThrow(() => validate(base));
  const a = op('recipes', 'r', { notes: 'Weniger Salz.\nMit Zitrone servieren.' }, '2026-10-30T10:00:00.000Z');
  const b = op('recipes', 'r', { name: 'Neuer Titel' }, '2026-10-30T10:00:01.000Z');
  for (const ops of [[a, b], [b, a]]) {
    const next = merge(base, ops); assert.equal(next.recipes[0].name, 'Neuer Titel'); assert.equal(next.recipes[0].notes, a.patch.notes);
    assert.equal(merge(next, [op('recipes', 'r', { notes: '' }, '2026-10-30T11:00:00.000Z')]).recipes[0].notes, '');
  }
  for (const notes of [42, null, 'x'.repeat(10001)]) assert.throws(() => merge(base, [op('recipes', 'r', { notes }, '2026-10-30T12:00:00.000Z')]), /notizen/i);
  assert.equal(merge(base, [a]).recipes[0].notes, a.patch.notes);
});
test('PDF: kurze Notizen erscheinen im vorgesehenen Notizfeld, leere lassen Schreiblinien', () => {
  const layout = make('Mit Zitrone servieren.\nNicht zu scharf.'); assert.equal(layout.pages.length, 1);
  assert.deepEqual(noteBody(layout).map(item => item.text), ['Mit Zitrone servieren.', 'Nicht zu scharf.']);
  assert.ok(noteBody(layout).every(item => item.y > text(layout).find(item => item.text === 'Meine Notizen').y));
  assert.ok(text(make('')).some(item => item.text === 'Für Ideen, Änderungen und das nächste Mal.'));
  assert.ok(makePdf(layout.pages).length > 1000);
});
test('PDF: lange mehrzeilige Notizen werden vollständig und ohne Überlappung fortgesetzt', () => {
  const lines = Array.from({ length: 140 }, (_, i) => `Hinweis ${i + 1}: nächstes Mal etwas milder würzen.`);
  const layout = make(lines.join('\n')); assert.ok(layout.pages.length > 2);
  assert.deepEqual(noteBody(layout).map(item => item.text), lines);
  for (const item of noteBody(layout)) {
    assert.ok(item.y < PAGE.height - 62); assert.ok(item.x + textWidth(item.text, item.font, item.size) <= PAGE.width - 42 + 0.01);
  }
  layout.pages.forEach((page, i) => assert.ok(page.items.some(item => item.text === `Seite ${i + 1} / ${layout.pages.length}`)));
});
test('PDF: ein sehr langes Wort bleibt vollständig und passt in die Seite', () => {
  const layout = make('x'.repeat(10000)); assert.equal(noteBody(layout).map(item => item.text.replace(/-$/, '')).join('').length, 10000);
  assert.ok(noteBody(layout).every(item => textWidth(item.text, item.font, item.size) <= PAGE.width - 84 + 0.01));
});
test('PDF: lange Rezeptnamen bleiben auch auf Notiz-Folgeseiten innerhalb der Seitenränder', () => {
  const layout = layoutRecipe({ recipe: { ...recipe, name: 'W'.repeat(120), notes: 'Mein nächster Versuch.\n'.repeat(100) }, ingredients: [], instructions: recipe.instructions });
  const continuations = layout.pages.filter(page => page.items.some(item => item.text === 'Meine Notizen · Fortsetzung'));
  assert.ok(continuations.length > 0);
  for (const page of continuations) {
    const heading = page.items.find(item => item.type === 'text' && item.y === 78);
    assert.ok(heading.x + textWidth(heading.text, heading.font, heading.size) <= PAGE.width - 42 + .01);
  }
});
test('Tagesverlauf: nur tatsächliche Auswahlen von heute und gestern, ohne Fortschritt zu verändern', () => {
  const old = { day: '2026-10-29', source: 'eingebaut', queue: [{ key: 'a', title: 'A' }], index: 1, outcome: { a: 'skipped' }, decided: ['a'] };
  const current = { day: '2026-10-30', source: 'eingebaut', queue: [{ key: 'b', title: 'B' }], index: 0, history: [dailyRecord(old), { day: '2026-10-28', queue: [{ key: 'gone' }] }] };
  const before = JSON.stringify(current), history = dailyHistory(current, '2026-10-30');
  assert.deepEqual(history.map(row => row.day), ['2026-10-29', '2026-10-30']); assert.equal(JSON.stringify(current), before);
  history[0].queue[0].title = 'geändert'; assert.equal(current.history[0].queue[0].title, 'A');
  assert.deepEqual(dailyHistory(current, '2026-11-01'), []);
});
test('Tagesverlauf: Upgrade vom alten einzelnen Merkzettel bewahrt gestern', () => {
  const old = { day: '2026-10-29', source: 'eingebaut', queue: [{ key: 'old' }], index: 1, outcome: { old: 'added' } };
  assert.equal(dailyHistory(old, '2026-10-30')[0].queue[0].key, 'old');
  assert.deepEqual(dailyHistory({ day: '', queue: [] }, '2026-10-30'), []);
  assert.equal(dailyRecord({ day: '2026-10-30', queue: 'kaputt' }), null);
});
test('Tagesverlauf: Schnappschüsse enthalten das Rezept, keine rohen Webseiten oder fremde Felder', () => {
  const input = { name: 'Suppe', servings: 4, tags: ['schnell'], instructions: 'Kochen.', ingredients: [{ name: 'Linsen', quantity: 200, unit: 'g' }], raw: '<html>lang</html>', token: 'niemals', sourceUrl: 'https://example.com/rezept' };
  const snap = dailySnapshot(input); assert.ok(!('raw' in snap) && !('token' in snap)); assert.equal(snap.ingredients[0].quantity, 200);
  snap.ingredients[0].name = 'neu'; assert.equal(input.ingredients[0].name, 'Linsen');
});
test('Grundvorrat: alle 28 festen Zutaten haben Bilder und gehören zum Kochen', () => {
  assert.equal(PANTRY_BASIC_IDS.length, 28); assert.equal(new Set(PANTRY_BASIC_IDS).size, 28);
  for (const id of PANTRY_BASIC_IDS) {
    const product = GROCERY_PRODUCTS.find(p => p.id === id); assert.ok(product, id); assert.ok(pantryProductAllowed(product)); assert.notEqual(product.category, 'haushalt');
  }
});
test('Vorratsauswahl enthält Essen/Drogerie, keine Technik aus Verlauf oder Favoriten', () => {
  const history = [{ name: 'TV', category: 'haushalt' }, { name: 'Fernseher', category: 'sonstiges' }, { name: 'Zahnpasta', category: 'haushalt' }];
  const favorites = [{ id: 'favorite-own-tv', name: 'TV', productId: null, category: 'haushalt', quantity: 1, unit: 'Stück' }];
  const list = pantryProductLibrary(history, favorites, []); assert.ok(list.some(p => p.name === 'Zahnpasta')); assert.ok(list.some(p => p.id === 'salz'));
  for (const name of ['TV', 'Fernseher', 'LED-Lampe', 'Blumendünger', 'AA-Batterien', 'Katzenfutter']) assert.ok(!list.some(p => p.name === name), name);
  assert.ok(productLibrary(history, favorites).some(p => p.name === 'TV'), 'Einkaufs- und Wunschfunktionen bleiben unabhängig');
  assert.equal(favorites.length, 1, 'Favoriten werden nur gefiltert, nicht gelöscht');
});
test('Eigener Kochvorrat behält sein Bild, offensichtliche Technik wird auch manuell abgelehnt', () => {
  const pantry = [{ name: 'Meine Frühstücksmischung', imageKey: 'muesli', category: 'sonstiges' }];
  assert.equal(pantryProductLibrary([], [], pantry).find(p => p.name === pantry[0].name).imageKey, 'muesli');
  for (const name of ['TV', 'Smart TV', 'Laptop', 'Blumenerde']) assert.throws(() => pantryChanges([name]), /Vorrat/);
  assert.equal(pantryChanges(['Mein Gewürzmix'])[0].patch.name, 'Mein Gewürzmix');
});
