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

test('Papierkorb leeren: Einträge sind endgültig weg, das Aufräumen entfernt sie aus der Datei; Ausgaben behalten ihre Löschmarke', async () => {
  const { compact } = await import('../compact.js');
  const { purgeChanges, isPurged } = await import('../trash.js');
  const data = sample(), stamp = new Date(now).toISOString();
  const changes = purgeChanges(data, stamp, now);
  assert.equal(changes.length, trashEntries(data, now).length);
  assert.ok(changes.every(change => change.patch.purgedAt === stamp));
  // Auf die Beispieldaten anwenden, wie es der Abgleich täte
  for (const change of changes) Object.assign(data[change.collection].find(row => row.id === change.id), change.patch);
  assert.deepEqual(trashEntries(data, now), [], 'der Papierkorb ist leer');
  assert.deepEqual(restoreChanges(data, 'items', 'Tomaten'), [], 'nicht mehr wiederherstellbar');
  const tidy = compact(data, new Date(now)).data;
  assert.equal(tidy.items.some(row => row.id === 'Tomaten'), false, 'Artikel aus der Datei entfernt');
  assert.equal(tidy.recipes.some(row => row.id === 'suppe'), false, 'Rezept entfernt');
  assert.equal(tidy.ingredients.some(row => row.recipeId === 'suppe'), false, 'samt Zutaten');
  assert.equal(tidy.items.some(row => row.id === 'Noch da'), true, 'aktive Einträge bleiben');
  assert.equal(tidy.purchases.find(row => row.id === 'p1').deletedAt !== null, true, 'Ausgabe behält ihre Löschmarke');
  // Später zurückgeholt und erneut gelöscht: steht wieder im Papierkorb
  const again = { ...data.items.find(row => row.id === 'Tomaten'), deletedAt: new Date(now + 1000).toISOString() };
  assert.equal(isPurged(again), false);
  assert.equal(trashEntries({ ...data, items: [again] }, now + 2000).some(entry => entry.id === 'Tomaten'), true);
});

test('2.145: eigene Produkte, Schreibweisen und Kategorien im Papierkorb – mit Wiederherstellen, Rückgängig und Leeren', async () => {
  const { undoRestoreChanges, purgeChanges } = await import('../trash.js');
  const { expenseCategoryId } = await import('../expense-categories.js');
  const t = offset => new Date(now - offset).toISOString(), grill = expenseCategoryId('Grillen'), spare = expenseCategoryId('Freizeit');
  let data = merge(emptyData(), [
    operation('productFavorites', 'fav-keckd', { name: 'Keckd', productId: null, quantity: 1, unit: 'Stück', category: 'sonstiges', deletedAt: null }, 'Nico', t(3 * HOUR)),
    operation('productRemovals', 'own-keckd', { name: 'Keckd', deletedAt: null }, 'Nico', t(HOUR)),
    operation('productFavorites', 'fav-keckd', { deletedAt: t(HOUR) }, 'Nico', t(HOUR)),
    operation('productRemovals', 'own-alt', { name: 'Alt', deletedAt: null }, 'Nico', t((TRASH_DAYS + 2) * DAY)),
    operation('aliases', 'alias-1', { from: 'tomatn', name: 'Tomaten', deletedAt: null }, 'Nico', t(2 * DAY)),
    operation('aliases', 'alias-1', { deletedAt: t(2 * HOUR) }, 'Nico', t(2 * HOUR)),
    operation('expenseCategories', grill, { name: 'Grillen', sortOrder: 0, deletedAt: null }, 'Nico', t(3 * DAY)),
    operation('expenseCategories', spare, { name: 'Freizeit', sortOrder: 1, deletedAt: null }, 'Nico', t(3 * DAY)),
    operation('expenseCategories', grill, { name: 'Grillen', sortOrder: 0, deletedAt: t(30 * 60000), replacementId: spare }, 'Nico', t(30 * 60000))
  ].map((op, index) => ({ ...op, id: `op-${index}` })));
  const entries = trashEntries(data, now), byKind = kind => entries.filter(entry => entry.kind === kind);
  assert.deepEqual(byKind('ownProducts').map(entry => entry.title), ['Keckd'], 'nur das kürzlich gelöschte eigene Produkt');
  assert.deepEqual(byKind('aliases').map(entry => entry.title), ['tomatn → Tomaten']);
  assert.equal(byKind('expenseCategories')[0].title, 'Grillen');
  assert.match(byKind('expenseCategories')[0].detail, /Buchungen jetzt bei „Freizeit“/);
  // Eigenes Produkt: Löschmarke aufheben und den mitgelöschten Stern zurückholen; Rückgängig setzt die Marke wieder
  const restore = restoreChanges(data, 'productRemovals', 'own-keckd', t(0));
  assert.deepEqual(restore, [{ collection: 'productRemovals', id: 'own-keckd', patch: { deletedAt: t(0) } }, { collection: 'productFavorites', id: 'fav-keckd', patch: { deletedAt: null } }]);
  assert.deepEqual(undoRestoreChanges(restore, t(0)).map(change => change.patch.deletedAt), [null, t(0)]);
  // Kategorie: kommt ohne Weiterleitung zurück
  assert.deepEqual(restoreChanges(data, 'expenseCategories', grill)[0].patch, { deletedAt: null, replacementId: null });
  // Leeren: Marken bleiben, verschwinden aber aus dem Papierkorb und lassen sich nicht mehr zurückholen
  const purged = merge(data, purgeChanges(data, t(0), now).map((change, index) => ({ ...operation(change.collection, change.id, change.patch, 'Nico', t(0)), id: `purge-${index}` })));
  assert.deepEqual(trashEntries(purged, now + 1000), []);
  assert.equal(purged.productRemovals.find(row => row.id === 'own-keckd').deletedAt, null, 'die Löschmarke selbst bleibt aktiv');
  assert.deepEqual(restoreChanges(purged, 'productRemovals', 'own-keckd'), []);
});

test('2.165: purgeChanges leert auf Wunsch nur bestimmte Arten (gewählter Reiter)', async () => {
  const { purgeChanges, trashEntries } = await import('../trash.js');
  const now = Date.parse('2026-11-05T12:00:00.000Z'), stamp = new Date(now - 3600000).toISOString(), created = new Date(now - 7200000).toISOString();
  const data = merge(emptyData(), [operation('items', 'a', { name: 'Tomaten', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', storeId: '' }, 'Nico', created),
    operation('purchases', 'p', { date: '2026-11-05', cents: 200 }, 'Nico', created)]);
  const deleted = merge(data, [operation('items', 'a', { deletedAt: stamp }, 'Nico', stamp), operation('purchases', 'p', { deletedAt: stamp }, 'Nico', stamp)]);
  assert.deepEqual(trashEntries(deleted, now).map(entry => entry.kind).sort(), ['items', 'purchases']);
  assert.deepEqual(purgeChanges(deleted, stamp, now, ['purchases']).map(change => change.collection), ['purchases']);
  assert.deepEqual(purgeChanges(deleted, stamp, now, ['items']).map(change => change.collection), ['items']);
  assert.deepEqual(purgeChanges(deleted, stamp, now).map(change => change.collection).sort(), ['items', 'purchases'], 'ohne Angabe: alles');
});
