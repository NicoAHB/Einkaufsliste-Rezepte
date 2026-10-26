import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { merge, operation, validate } from '../data.js';
import { comparePrices, effectiveQuote, itemCost, localDay, saleExpired } from '../prices.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const q = (cents, quantity = 1, unit = 'Stück') => ({ cents, quantity, unit });
const item = (extra = {}) => ({ name: 'Joghurt', storeId: 's', quantity: 2, unit: 'Stück', price: q(100), salePrice: q(60), onSale: true, ...extra });

test('Ein Angebot gilt bis einschließlich zum letzten Tag, danach nicht mehr', () => {
  assert.equal(saleExpired(item(), '2026-03-12'), false, 'ohne Datum gilt es weiter');
  assert.equal(saleExpired(item({ saleUntil: '2026-03-12' }), '2026-03-12'), false, 'am letzten Tag noch gültig');
  assert.equal(saleExpired(item({ saleUntil: '2026-03-12' }), '2026-03-13'), true);
  assert.equal(saleExpired(item({ saleUntil: '2026-03-01', onSale: false }), '2026-03-13'), false, 'kein Angebot, nichts abgelaufen');
  assert.equal(saleExpired(item({ saleUntil: null }), '2026-03-13'), false);
  assert.match(localDay(), /^\d{4}-\d{2}-\d{2}$/);
});

test('Abgelaufene Angebote zählen nicht mehr als Preis: Summe und effektiver Preis nehmen den Normalpreis', () => {
  const sale = item({ saleUntil: '2026-03-12' });
  assert.deepEqual(effectiveQuote(sale, [], '2026-03-12'), q(60));
  assert.deepEqual(effectiveQuote(sale, [], '2026-03-13'), q(100));
  assert.equal(itemCost(sale, [], '2026-03-12'), 120);
  assert.equal(itemCost(sale, [], '2026-03-13'), 200);
});

test('Preisvergleich zeigt den Tag der Notiz, markiert alte Notizen und rechnet abgelaufene Aktionen mit dem Normalpreis', () => {
  const stores = [{ id: 'a', name: 'Edeka', deletedAt: null }, { id: 'b', name: 'Lidl', deletedAt: null }, { id: 'c', name: 'Rewe', deletedAt: null }];
  const row = (id, storeId, createdAt, extra) => ({ id, storeId, name: 'Joghurt', createdAt, updatedAt: createdAt, deletedAt: null, quote: q(100), regularQuote: q(100), onSale: false, ...extra });
  const history = [row('1', 'a', '2026-03-01T12:00:00.000Z'), row('2', 'b', '2025-12-01T12:00:00.000Z', { quote: q(50), regularQuote: q(80), onSale: true, saleUntil: '2025-12-10' }),
    row('3', 'c', '2026-03-10T12:00:00.000Z', { quote: q(40), regularQuote: null, onSale: true, saleUntil: '2026-03-11' })];
  const rows = comparePrices({ name: 'Joghurt', unit: 'Stück' }, stores, history, '2026-03-12');
  assert.deepEqual(rows.map(entry => [entry.storeName, entry.rate, entry.expired, entry.old]), [['Lidl', 80, true, true], ['Edeka', 100, false, false]], 'Rewe: abgelaufene Aktion ohne bekannten Normalpreis wird nicht verglichen');
  assert.equal(rows[1].at, '2026-03-01T12:00:00.000Z');
  // Ein noch gültiges Angebot zählt zu seinem Preis
  assert.equal(comparePrices({ name: 'Joghurt', unit: 'Stück' }, stores, history, '2026-03-10').find(entry => entry.storeName === 'Rewe').rate, 40);
});

test('Datenmodell: saleUntil ist optional und wird geprüft', () => {
  const make = patch => merge(structuredClone(demo), [operation('items', 'neu', { storeId: 'store-edeka', name: 'Joghurt', quantity: 1, unit: 'Stück', checked: false, createdBy: 'Nico', ...patch }, 'Nico', '2026-10-20T10:00:00.000Z')]);
  assert.ok(make({ saleUntil: '2026-12-31' }).items.some(row => row.id === 'neu'));
  assert.ok(make({ saleUntil: null }).items.some(row => row.id === 'neu'));
  assert.ok(!make({ saleUntil: 'morgen' }).items.some(row => row.id === 'neu'), 'ungültiges Datum wird verworfen');
  assert.doesNotThrow(() => validate(make({})));
});
