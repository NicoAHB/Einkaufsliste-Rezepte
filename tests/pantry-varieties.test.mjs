import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pantryKey, pantryKeys, pantryRows, stockKey, stockKeys, inPantry } from '../data.js';
import { pantryChanges } from '../pantry.js';
import { consumeStockChanges } from '../smart-stock.js';
import { recentPurchases } from '../recent-purchases.js';
import { pantryProductLibrary } from '../product-catalog.js';
import { imageForProduct } from '../product-images.js';

const at = '2026-11-03T10:00:00.000Z';
const row = (id, name, extra = {}) => ({ id, name, available: true, category: 'vorrat', createdAt: at, updatedAt: at, deletedAt: null, _clock: {}, ...extra });

test('2.145: Sorten haben eigene Schlüssel, Schreibweisen und Zubereitungen nicht', () => {
  assert.notEqual(stockKey('Basmati-Reis'), stockKey('Reis'));
  assert.notEqual(stockKey('Cherrytomaten'), stockKey('Tomaten'));
  assert.equal(stockKey('Äpfel'), stockKey('Apfel'));
  assert.equal(stockKey('Knoblauchzehen'), stockKey('Knoblauch'));
  assert.equal(stockKey('Tomaten, gehackt'), stockKey('Tomaten'));
  // Die Gruppe bleibt für Rezepte gleich
  assert.equal(pantryKey('Basmati-Reis'), pantryKey('Reis'));
});

test('2.145: Basmati-Reis legt neben „Reis“ einen eigenen Eintrag an; Rezepte mit „Reis“ zählen ihn mit', () => {
  const rows = [row('pantry-reis', 'Reis')];
  const changes = pantryChanges([{ name: 'Basmati-Reis', category: 'vorrat', imageKey: 'basmati-reis' }], rows);
  assert.equal(changes.length, 1); assert.notEqual(changes[0].id, 'pantry-reis', 'nicht der Reis-Eintrag');
  assert.equal(changes[0].patch.name, 'Basmati-Reis');
  const both = [...rows, row(changes[0].id, 'Basmati-Reis')];
  assert.equal(pantryRows(both).length, 2, 'zwei Sorten, zwei Zeilen');
  assert.deepEqual([...stockKeys(both)].sort(), [stockKey('Basmati-Reis'), stockKey('Reis')].sort());
  // Nur Basmati da: ein Rezept mit „Reis“ ist erfüllt, eins mit „Sushi-Reis“ ebenso (Gruppe, wie bisher)
  const onlyBasmati = [row('b', 'Basmati-Reis')];
  assert.equal(inPantry(pantryKeys(onlyBasmati), 'Reis'), true);
  assert.equal(inPantry(pantryKeys(onlyBasmati), 'Sushi-Reis'), true);
});

test('2.145: Aufbrauchen und „Letzte 7 Tage gekauft“ trennen die Sorten', () => {
  const data = { pantry: [row('r', 'Reis'), row('b', 'Basmati-Reis')], items: [] };
  const changes = consumeStockChanges(data, 'Basmati-Reis', at);
  assert.deepEqual(changes.map(change => change.id), ['b'], 'nur der Basmati-Reis ist aufgebraucht');
  const bought = recentPurchases([
    { id: 'i1', name: 'Reis', shopBoughtAt: '2026-11-02T10:00:00.000Z' },
    { id: 'i2', name: 'Basmati-Reis', shopBoughtAt: '2026-11-02T11:00:00.000Z' }
  ], Date.parse(at));
  assert.deepEqual(bought.map(item => item.name), ['Basmati-Reis', 'Reis']);
});

test('2.145: Vorratsauswahl zeigt jede Sorte als eigene Kachel mit ihrem Katalogfoto', () => {
  const library = pantryProductLibrary([], [], [row('r', 'Reis'), row('b', 'Basmati-Reis')]);
  const basmati = library.find(product => product.name === 'Basmati-Reis'), rice = library.find(product => product.name === 'Reis');
  assert.ok(basmati && rice, 'beide Kacheln');
  assert.equal(imageForProduct(basmati).key, 'basmati-reis', 'eigenes Foto statt Gruppenbild');
  assert.equal(library.filter(product => stockKey(product.name) === stockKey('Reis')).length, 1, 'keine doppelte Reis-Kachel');
});
