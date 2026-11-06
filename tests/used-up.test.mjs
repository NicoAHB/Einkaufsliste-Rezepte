// „Aufgebraucht“ (2.175): welche Vorratseinträge eine Zutat zu „da“ machen, und die übliche Einkaufsmenge fürs Nachkaufen.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availability, coveringStock, indexNames } from '../cookable.js';
import { standardPurchase } from '../buying.js';
import { catalogProductFor } from '../product-catalog.js';

test('coveringStock findet genau die Vorratsnamen, die die Zutat zu „da“ machen (auch Sorten und Mengenangaben)', () => {
  const stock = ['Weizenmehl', 'Zucker', 'Olivenöl', 'Bananen', 'Walnüsse'];
  assert.deepEqual(coveringStock({ name: 'Mehl', quantity: 200, unit: 'g' }, stock), ['Weizenmehl']);
  assert.deepEqual(coveringStock({ name: 'reife Bananen', quantity: 3, unit: 'Stück' }, stock), ['Bananen']);
  assert.deepEqual(coveringStock({ name: 'Öl', quantity: 2, unit: 'EL' }, stock), ['Olivenöl']);
  assert.deepEqual(coveringStock({ name: 'Butter', quantity: 100, unit: 'g' }, stock), []);
  // Wer alle gefundenen Namen herausnimmt, dem fehlt die Zutat danach
  for (const name of ['Mehl', 'reife Bananen', 'Öl']) {
    const row = { name, quantity: 1, unit: 'Stück' }, left = stock.filter(entry => !coveringStock(row, stock).includes(entry));
    assert.equal(availability(row, indexNames({ have: stock })), 'have'); assert.equal(availability(row, indexNames({ have: left })), 'missing');
  }
});

test('standardPurchase: übliche Einkaufsmenge wie beim Antippen eines Produkts, nie die Rezeptmenge', () => {
  const plain = name => { const known = catalogProductFor(name); return standardPurchase({ name, ...(known ? { quantity: known.quantity, unit: known.unit } : {}) }, []); };
  const flour = plain('Mehl'); assert.deepEqual([flour.quantity, flour.unit, flour.purchaseUnit?.label], [1, 'kg', 'Packung']);
  const eggs = plain('Eier'); assert.deepEqual([eggs.quantity, eggs.unit], [6, 'Stück']);
  const odd = plain('Hausgemachte Würzmischung'); assert.ok(odd.quantity > 0 && typeof odd.unit === 'string' && odd.unit);
  // Eine zuletzt bewusst gewählte Menge gilt (z. B. 2 kg Mehl ohne Packung)
  const at = '2026-11-01T10:00:00.000Z', history = [{ name: 'Mehl', quantity: 2, unit: 'kg', purchaseUnit: null, purchaseMeasure: 'kg', purchaseAt: at, purchaseAmount: { quantity: 2, unit: 'kg' }, purchaseAmountAt: at, createdAt: at, updatedAt: at }];
  const remembered = standardPurchase({ name: 'Mehl', quantity: 1, unit: 'kg' }, history); assert.deepEqual([remembered.quantity, remembered.unit, remembered.purchaseUnit], [2, 'kg', null]);
});
