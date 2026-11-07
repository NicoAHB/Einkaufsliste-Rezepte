// „Aufgebraucht“ (2.175): welche Vorratseinträge eine Zutat zu „da“ machen, und die übliche Einkaufsmenge fürs Nachkaufen.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availability, byCompleteness, coveringStock, indexNames, stockCompleteness } from '../cookable.js';
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

test('Sortierung „Meiste Zutaten im Vorrat“ (2.181): größter Anteil zuerst, bei Gleichstand weniger fehlende, ohne mitgezählte Zutaten zuletzt', () => {
  const index = indexNames({ have: ['Mehl', 'Eier', 'Zucker', 'Butter', 'Bananen', 'Backpulver'] }), row = (name, unit = 'g') => ({ name, quantity: 1, unit });
  const recipes = {
    banana: [row('reife Bananen', 'Stück'), row('Mehl'), row('Zucker'), row('Butter'), row('Eier', 'Stück'), row('Backpulver', 'Päckchen'), row('Walnüsse')],
    bread: [row('Butter'), row('Salz', 'Prise')], pancakes: [row('Mehl'), row('Milch', 'ml'), row('Eier', 'Stück')], curry: [row('Linsen'), row('Reis'), row('Kokosmilch', 'ml')],
    toast: [row('Toast', 'Scheibe')], water: [row('Wasser', 'l'), row('Salz', 'Prise')]
  };
  const stats = Object.fromEntries(Object.entries(recipes).map(([key, list]) => [key, stockCompleteness(list, index)]));
  assert.deepEqual(stats.banana, { have: 6, total: 7, missing: 1, share: 6 / 7 });
  assert.deepEqual(stats.bread, { have: 1, total: 1, missing: 0, share: 1 }, 'Salz zählt nicht');
  assert.equal(stats.water.share, -1);
  assert.deepEqual(Object.keys(stats).sort((a, b) => byCompleteness(stats[a], stats[b]) || a.localeCompare(b)), ['bread', 'banana', 'pancakes', 'toast', 'curry', 'water']);
});

test('2.187: usedUpPlan – genau eine Sorte wird genau so nachgekauft, mehrere Einträge werden alle genannt und das allgemeine Produkt kommt auf die Liste', async () => {
  const { usedUpPlan, joinNames } = await import('../pantry.js');
  const at = '2026-11-01T10:00:00.000Z';
  const stock = names => names.map((name, index) => ({ id: `p${index}`, name, category: 'vorrat', available: true, createdAt: at, updatedAt: at, deletedAt: null }));
  const line = (name, quantity, unit) => ({ name, quantity, unit });
  // Eine Sorte: Basmati-Reis statt „Reis“, Spaghetti statt „Nudeln“, Rote Zwiebeln statt „Zwiebeln“ (mit Gang aus dem Katalog)
  for (const [ingredient, pantry, rebuy] of [[line('Reis', 200, 'g'), 'Basmati-Reis', 'Basmati-Reis'], [line('Nudeln', 300, 'g'), 'Spaghetti', 'Spaghetti'],
    [line('Zwiebel', 1, 'Stück'), 'Rote Zwiebeln', 'Rote Zwiebeln'], [line('Mehl', 200, 'g'), 'Mehl', 'Mehl']]) {
    const plan = usedUpPlan(ingredient, stock([pantry, 'Zucker']));
    assert.deepEqual(plan.stocked.map(entry => entry.name), [pantry]); assert.equal(plan.rebuy.name, rebuy);
    assert.equal(plan.rebuy.category, catalogProductFor(rebuy).category);
  }
  // Mehrere Einträge: beide werden aufgebraucht, nachgekauft wird „Öl“ (welches, entscheidet man im Laden)
  const oil = usedUpPlan(line('Öl', 2, 'EL'), stock(['Olivenöl', 'Rapsöl', 'Zucker']));
  assert.deepEqual(oil.stocked.map(entry => entry.name).sort(), ['Olivenöl', 'Rapsöl']); assert.equal(oil.rebuy.name, 'Öl'); assert.equal(oil.generic.name, 'Öl');
  // Schon aufgebrauchte Einträge zählen nicht; nichts im Vorrat: das allgemeine Produkt
  const gone = stock(['Olivenöl', 'Rapsöl']); gone[1].available = false;
  assert.equal(usedUpPlan(line('Öl', 2, 'EL'), gone).rebuy.name, 'Olivenöl');
  assert.deepEqual(usedUpPlan(line('Butter', 100, 'g'), stock(['Zucker'])), { generic: { name: 'Butter', category: catalogProductFor('Butter').category }, stocked: [], rebuy: { name: 'Butter', category: catalogProductFor('Butter').category } });
  assert.deepEqual(['', 'A', 'A und B', 'A, B und C'], [[], ['A'], ['A', 'B'], ['A', 'B', 'C']].map(joinNames));
});
