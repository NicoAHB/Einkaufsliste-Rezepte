/* Regressionstests 2.149 für die von ChatGPT gemeldeten Fehler (geprüft und bestätigt). */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, merge, operation, stockKey } from '../data.js';
import { pantryProductLibrary } from '../product-catalog.js';
import { purgeChanges, restoreChanges, trashEntries, undoRestoreChanges, withBefore } from '../trash.js';
import { expenseCategoryId } from '../expense-categories.js';

const now = Date.parse('2026-11-04T12:00:00.000Z'), t = ms => new Date(now - ms).toISOString(), MIN = 60000, HOUR = 3600000, DAY = 24 * HOUR;
const pantryRow = (id, name) => ({ id, name, available: true, quantity: 1, unit: 'Flasche', createdAt: t(DAY), updatedAt: t(DAY), deletedAt: null, _clock: {} });
const favorite = (id, name, extra = {}) => ({ id, name, createdAt: t(HOUR), updatedAt: t(HOUR), deletedAt: null, _clock: {}, ...extra });

test('1: „Öl“ und „Olivenöl“ im Vorrat haben verschiedene Kennungen; Foto und Katalog bleiben bei Olivenöl', () => {
  const library = pantryProductLibrary([], [], [pantryRow('p1', 'Öl'), pantryRow('p2', 'Olivenöl')], []);
  const oil = library.find(card => card.name === 'Öl'), olive = library.find(card => card.name === 'Olivenöl');
  assert.ok(oil && olive);
  assert.notEqual(oil.id, olive.id, 'eigene Auswahlkennung je Sorte');
  assert.equal(new Set(library.map(card => card.id)).size, library.length, 'keine doppelte Kennung im ganzen Vorrat');
  assert.equal(olive.imageKey, 'olivenoel'); assert.equal(olive.catalogId, 'olivenoel');
  assert.equal(oil.id, 'olivenoel', 'die Gruppe behält ihre bisherige Kennung');
});

test('2: Ein Stern für „Basmati-Reis“ steht auf Basmati-Reis, nicht auf „Reis“; ohne eigene Kachel bleibt er bei der Gruppe', () => {
  const pantry = [pantryRow('p1', 'Reis'), pantryRow('p2', 'Basmati-Reis')];
  let library = pantryProductLibrary([], [favorite('fav-basmati', 'Basmati-Reis', { productId: 'basmati-reis' })], pantry, []);
  assert.equal(library.find(card => card.name === 'Basmati-Reis').favorite?.id, 'fav-basmati');
  assert.equal(library.find(card => card.name === 'Reis').favorite, undefined);
  library = pantryProductLibrary([], [favorite('fav-reis', 'Reis', { productId: 'reis' }), favorite('fav-basmati', 'Basmati-Reis', { productId: 'basmati-reis' })], pantry, []);
  assert.equal(library.find(card => card.name === 'Reis').favorite?.id, 'fav-reis');
  assert.deepEqual(library.find(card => card.name === 'Basmati-Reis').favorite?.ids, ['fav-basmati']);
  // Basmati-Reis nicht im Vorrat: der Stern bleibt wie bisher bei der Gruppe „Reis“ sichtbar
  library = pantryProductLibrary([], [favorite('fav-basmati', 'Basmati-Reis', { productId: 'basmati-reis' })], [pantryRow('p1', 'Reis')], []);
  assert.equal(library.find(card => stockKey(card.name) === stockKey('Reis')).favorite?.id, 'fav-basmati');
});

// Anlegen → löschen → gleichnamig neu anlegen (nächste Generation der Kennung) → erneut löschen
const grill1 = expenseCategoryId('Grillen'), grill2 = expenseCategoryId('Grillen', 1);
const categoryData = () => merge(emptyData(), [
  operation('expenseCategories', grill1, { name: 'Grillen', sortOrder: 0, deletedAt: null }, 'Nico', t(3 * DAY)),
  operation('expenseCategories', grill1, { deletedAt: t(2 * DAY) }, 'Nico', t(2 * DAY)),
  operation('expenseCategories', grill2, { name: 'Grillen', sortOrder: 1, deletedAt: null }, 'Nico', t(DAY)),
  operation('expenseCategories', grill2, { deletedAt: t(HOUR) }, 'Nico', t(HOUR))
].map((op, index) => ({ ...op, id: `op-${index}` })));

test('3: „Papierkorb leeren“ löscht gleichnamige Kategorien zusammen; danach taucht keine ältere wieder auf', () => {
  const data = categoryData();
  assert.equal(trashEntries(data, now).filter(entry => entry.kind === 'expenseCategories').length, 1, 'eine Zeile im Papierkorb');
  const changes = purgeChanges(data, new Date(now).toISOString(), now);
  assert.equal(categoryData().expenseCategories.length, 2, 'intern zwei Zeilen');
  assert.deepEqual(changes.map(change => change.id).sort(), [grill1, grill2].sort());
  const after = merge(data, changes.map(change => operation(change.collection, change.id, change.patch, 'Nico', new Date(now).toISOString())));
  assert.equal(trashEntries(after, now).filter(entry => entry.kind === 'expenseCategories').length, 0, 'nichts kehrt zurück');
});

test('4: Wiederherstellen und Rückgängig stellen die Weiterleitung einer Kategorie genau wieder her', () => {
  const grill = expenseCategoryId('Grillen'), other = expenseCategoryId('Sonstiges');
  const data = merge(emptyData(), [
    operation('expenseCategories', other, { name: 'Sonstiges', sortOrder: 0, deletedAt: null }, 'Nico', t(3 * DAY)),
    operation('expenseCategories', grill, { name: 'Grillen', sortOrder: 1, deletedAt: null }, 'Nico', t(3 * DAY)),
    operation('expenseCategories', grill, { deletedAt: t(HOUR), replacementId: other }, 'Nico', t(HOUR))
  ].map((op, index) => ({ ...op, id: `op-${index}` })));
  const changes = restoreChanges(data, 'expenseCategories', grill, t(2 * MIN));
  const undo = withBefore(data, changes);
  assert.deepEqual(undo[0].before, { deletedAt: t(HOUR), replacementId: other });
  const restored = merge(data, changes.map(change => operation(change.collection, change.id, change.patch, 'Nico', t(2 * MIN))));
  assert.equal(restored.expenseCategories.find(row => row.id === grill).replacementId, null);
  const back = merge(restored, undoRestoreChanges(undo).map(change => operation(change.collection, change.id, change.patch, 'Nico', t(MIN))));
  const row = back.expenseCategories.find(entry => entry.id === grill);
  assert.equal(row.replacementId, other, 'Weiterleitung wieder da: spätere Offline-Buchungen landen bei „Sonstiges“');
  assert.equal(row.deletedAt, t(HOUR));
  // Ohne Vorher-Stand (ältere Aufrufer) bleibt das bisherige Verhalten
  assert.deepEqual(undoRestoreChanges([{ collection: 'items', id: 'x' }], 'T'), [{ collection: 'items', id: 'x', patch: { deletedAt: 'T' } }]);
});

test('7: Ein eigenes Produkt bringt nur die beim Löschen gemerkten Sterne zurück, nicht einen kurz vorher bewusst entfernten', () => {
  const data = merge(emptyData(), [
    operation('productFavorites', 'fav-bewusst', { name: 'Keckd', productId: null, quantity: 1, unit: 'Stück', category: 'sonstiges', deletedAt: null }, 'Nico', t(2 * HOUR)),
    operation('productFavorites', 'fav-bewusst', { deletedAt: t(5000) }, 'Nico', t(5000)),          // 5 s vor dem Löschen selbst entfernt
    operation('productFavorites', 'fav-mit', { name: 'Keckd', productId: null, quantity: 1, unit: 'Stück', category: 'sonstiges', deletedAt: null }, 'Nico', t(2 * HOUR)),
    operation('productFavorites', 'fav-mit', { deletedAt: t(0) }, 'Nico', t(0)),
    operation('productRemovals', 'own-keckd', { name: 'Keckd', deletedAt: null, purgedAt: null, favoriteIds: ['fav-mit'] }, 'Nico', t(0))
  ].map((op, index) => ({ ...op, id: `op-${index}` })));
  const ids = restoreChanges(data, 'productRemovals', 'own-keckd', new Date(now + MIN).toISOString()).map(change => change.id);
  assert.deepEqual(ids, ['own-keckd', 'fav-mit']);
  // Ältere Löschmarke ohne favoriteIds: weiter über den Zeitpunkt
  const legacy = merge(emptyData(), [
    operation('productFavorites', 'fav-alt', { name: 'Keckd', productId: null, quantity: 1, unit: 'Stück', category: 'sonstiges', deletedAt: null }, 'Nico', t(2 * HOUR)),
    operation('productFavorites', 'fav-alt', { deletedAt: t(0) }, 'Nico', t(0)),
    operation('productRemovals', 'own-keckd', { name: 'Keckd', deletedAt: null }, 'Nico', t(0))
  ].map((op, index) => ({ ...op, id: `op-${index}` })));
  assert.deepEqual(restoreChanges(legacy, 'productRemovals', 'own-keckd', new Date(now + MIN).toISOString()).map(change => change.id), ['own-keckd', 'fav-alt']);
});
