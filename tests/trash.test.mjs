import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, merge, operation } from '../data.js';
import { TRASH_DAYS, restoreChanges, trashCounts, trashDayLabel, trashEntries } from '../trash.js';

const now = Date.parse('2026-11-03T12:00:00.000Z'), at = offset => new Date(now - offset).toISOString(), HOUR = 3600000, DAY = 24 * HOUR;
const base = (id, extra) => ({ id, createdAt: at(30 * DAY), updatedAt: at(30 * DAY), deletedAt: null, _clock: {}, ...extra });
function sample() {
  const data = emptyData();
  data.stores = [base('edeka', { name: 'Edeka' }), base('alt', { name: 'Alter Markt', deletedAt: at(2 * HOUR) })];
  const item = (id, extra) => base(id, { name: id, quantity: 1, unit: 'Stück', storeId: 'edeka', checked: false, createdBy: 'Nico', ...extra });
  data.items = [item('Tomaten', { quantity: 500, unit: 'g', deletedAt: at(HOUR) }), item('Gekauft', { checked: true, deletedAt: at(HOUR) }),
    item('Verschoben', { deletedAt: at(HOUR), mergedInto: 'Tomaten' }), item('Doppel', { deletedAt: at(HOUR), _clock: { deletedAt: { at: at(HOUR), id: 'fold-del-x' } } }),
    item('Uralt', { deletedAt: at((TRASH_DAYS + 1) * DAY) }), item('Im alten Markt', { storeId: 'alt', deletedAt: at(3 * HOUR) }), item('Noch da')];
  data.recipes = [base('suppe', { name: 'Linsensuppe', servings: 4, deletedAt: at(DAY) })];
  data.ingredients = [base('i1', { recipeId: 'suppe', name: 'Linsen', quantity: 200, unit: 'g' }), base('i2', { recipeId: 'suppe', name: 'Möhren', quantity: 2, unit: 'Stück' })];
  data.meals = [base('m1', { recipeId: 'suppe', date: '2026-11-05', servings: 2, deletedAt: at(2 * DAY) })];
  data.purchases = [base('p1', { date: '2026-11-02', cents: 2345, storeId: 'edeka', buyerName: 'Anna', note: 'Wocheneinkauf', deletedAt: at(5 * HOUR) })];
  data.templates = [base('t1', { name: 'Grundeinkauf', items: [{ name: 'Milch' }, { name: 'Brot' }], deletedAt: at(6 * DAY) })];
  return data;
}

test('Papierkorb: zeigt nur echte Löschungen der letzten 14 Tage, neueste zuerst', () => {
  const entries = trashEntries(sample(), now);
  assert.deepEqual(entries.map(entry => `${entry.kind}:${entry.title.replace(/\s/g, ' ')}`), ['items:Tomaten', 'stores:Alter Markt', 'items:Im alten Markt', 'purchases:23,45 € · Edeka', 'recipes:Linsensuppe', 'meals:Linsensuppe', 'templates:Grundeinkauf']);
  assert.equal(entries[0].detail, '500 g · Edeka');
  assert.equal(entries[2].detail, '1 Stück · Alter Markt (gelöscht)');
  assert.equal(entries.find(entry => entry.kind === 'recipes').detail, '2 Zutaten · 4 Portionen');
  assert.match(entries.find(entry => entry.kind === 'meals').detail, /Rezept wird mit wiederhergestellt/);
  assert.equal(entries.find(entry => entry.kind === 'templates').detail, '2 Artikel');
  assert.deepEqual(trashCounts(entries), { items: 2, stores: 1, purchases: 1, recipes: 1, meals: 1, templates: 1 });
});

test('Papierkorb: Wiederherstellen setzt die Löschmarke zurück; Artikel gelöschter Geschäfte kommen ohne Geschäft, Gerichte mit Rezept', () => {
  const data = sample();
  assert.deepEqual(restoreChanges(data, 'items', 'Tomaten'), [{ collection: 'items', id: 'Tomaten', patch: { deletedAt: null } }]);
  assert.deepEqual(restoreChanges(data, 'items', 'Im alten Markt'), [{ collection: 'items', id: 'Im alten Markt', patch: { deletedAt: null, storeId: '' } }]);
  assert.deepEqual(restoreChanges(data, 'meals', 'm1'), [{ collection: 'meals', id: 'm1', patch: { deletedAt: null } }, { collection: 'recipes', id: 'suppe', patch: { deletedAt: null } }]);
  assert.deepEqual(restoreChanges(data, 'items', 'Noch da'), [], 'nichts zu tun für aktive Einträge');
  // Über den gewöhnlichen Abgleich: Die spätere Änderung gewinnt gegen die Löschung, auf jedem Gerät gleich.
  const shared = merge(emptyData(), [operation('stores', 'edeka', { name: 'Edeka' }, 'Nico', at(10 * DAY)),
    operation('items', 'x', { name: 'Tomaten', quantity: 500, unit: 'g', storeId: 'edeka', checked: false, createdBy: 'Nico' }, 'Nico', at(10 * DAY)),
    operation('items', 'x', { deletedAt: at(HOUR) }, 'Anna', at(HOUR))]);
  assert.equal(trashEntries(shared, now).length, 1);
  const restored = merge(shared, restoreChanges(shared, 'items', 'x').map(change => operation(change.collection, change.id, change.patch, 'Nico', at(0))));
  assert.equal(restored.items[0].deletedAt, null);
  assert.equal(trashEntries(restored, now).length, 0);
});

test('Papierkorb: Tagesüberschriften', () => {
  assert.equal(trashDayLabel(now - HOUR, now), 'Heute');
  assert.equal(trashDayLabel(now - DAY, now), 'Gestern');
  assert.match(trashDayLabel(now - 3 * DAY, now), /Oktober/);
});
