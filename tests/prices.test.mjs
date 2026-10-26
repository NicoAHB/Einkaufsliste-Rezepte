import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparePrices, itemCost, offerUrl, parseCents, productKey, rememberedPrice, shoppingTotal, storeOfferUrl, unitRate, unitSpec } from '../prices.js';

test('Preise in Euro werden zu ganzen Cent', () => {
  assert.equal(parseCents('1,99'), 199);
  assert.equal(parseCents('0'), 0);
  assert.equal(parseCents('12.5'), 1250);
  for (const bad of ['1,999', '-1', 'abc', '', '1,', '12345678']) assert.throws(() => parseCents(bad), /Preis/);
});

test('Einheiten: g/kg und ml/l werden umgerechnet, Packungen nie geraten', () => {
  assert.equal(unitRate({ cents: 199, quantity: 500, unit: 'g' }, 'kg'), 398);
  assert.equal(unitRate({ cents: 120, quantity: 1, unit: 'l' }, 'ml'), 0.12);
  assert.equal(unitRate({ cents: 199, quantity: 1, unit: 'Packung' }, 'kg'), null);
  assert.equal(unitRate({ cents: 199, quantity: 1, unit: 'Packung' }, 'Packung'), 199);
  assert.equal(unitRate({ cents: 100, quantity: 0, unit: 'g' }, 'g'), null);
  assert.equal(unitSpec('Stk.').group, 'count');
  assert.equal(unitSpec('EL').comparable, false);
});

test('Kosten: 2 kg bei 1,99 € je 500 g sind 7,96 €; Angebot ersetzt den Normalpreis', () => {
  const item = { storeId: 's', name: 'Tomaten', quantity: 2, unit: 'kg', price: { cents: 199, quantity: 500, unit: 'g' } };
  assert.equal(itemCost(item), 796);
  const sale = { ...item, onSale: true, salePrice: { cents: 149, quantity: 500, unit: 'g' } };
  assert.equal(itemCost(sale), 596);
  assert.equal(itemCost({ ...sale, onSale: false }), 796);
  assert.equal(itemCost({ ...item, price: null }), null);
  assert.equal(itemCost({ ...item, price: { cents: 0, quantity: 1, unit: 'kg' } }), 0);
});

test('Summe: erledigte und gelöschte Artikel zählen nicht, fehlende Preise werden gemeldet', () => {
  const quote = { cents: 100, quantity: 1, unit: 'Stück' };
  const items = [{ quantity: 2, unit: 'Stück', price: quote }, { quantity: 1, unit: 'Stück', price: quote, checked: true },
    { quantity: 1, unit: 'Stück', price: quote, deletedAt: '2026-01-01T00:00:00.000Z' }, { quantity: 1, unit: 'Stück', price: null }];
  assert.deepEqual(shoppingTotal(items), { cents: 200, missing: 1, count: 2, priced: 1 });
});

test('Gemerkter Preis: neuester passender Eintrag des Geschäfts, Aktionspreis wird kein Normalpreis', () => {
  const row = (id, createdAt, quote, regularQuote, extra = {}) => ({ id, createdAt, storeId: 's1', name: 'Milch', quote, regularQuote, deletedAt: null, ...extra });
  const normal = { cents: 120, quantity: 1, unit: 'l' }, sale = { cents: 99, quantity: 1, unit: 'l' };
  const history = [row('a', '2026-01-01', normal, normal), row('b', '2026-02-01', sale, normal, { onSale: true })];
  assert.deepEqual(rememberedPrice(history, 's1', ' milch ', 'l'), normal);
  assert.equal(rememberedPrice(history, 's2', 'Milch', 'l'), null);
  assert.equal(rememberedPrice(history, 's1', 'Milch', 'kg'), null);
  assert.equal(productKey('  Äpfel  Rot '), 'äpfel rot');
});

test('Geschäftsvergleich: günstigster Preis je kg zuerst', () => {
  const stores = [{ id: 'a', name: 'Edeka' }, { id: 'b', name: 'Lidl' }, { id: 'c', name: 'Weg', deletedAt: '2026-01-01' }];
  const history = [{ id: '1', createdAt: '1', storeId: 'a', name: 'Nudeln', quote: { cents: 199, quantity: 500, unit: 'g' } },
    { id: '2', createdAt: '2', storeId: 'b', name: 'Nudeln', quote: { cents: 150, quantity: 500, unit: 'g' } },
    { id: '3', createdAt: '3', storeId: 'c', name: 'Nudeln', quote: { cents: 1, quantity: 500, unit: 'g' } }];
  const rows = comparePrices({ name: 'Nudeln', unit: 'kg' }, stores, history);
  assert.deepEqual(rows.map(row => [row.storeName, row.rate]), [['Lidl', 300], ['Edeka', 398]]);
  assert.deepEqual(comparePrices({ name: 'Nudeln', unit: 'Packung' }, stores, history), []);
});

test('Angebotslinks: nur https ohne Zugangsdaten; Standardlinks für bekannte Händler', () => {
  assert.equal(offerUrl(''), '');
  assert.equal(offerUrl(' https://www.edeka.de/angebote '), 'https://www.edeka.de/angebote');
  for (const bad of ['http://a.de', 'javascript:alert(1)', 'https://u:p@a.de', 'kein link']) assert.throws(() => offerUrl(bad));
  assert.match(storeOfferUrl({ name: 'Edeka' }), /^https:\/\/www\.edeka\.de/);
  assert.equal(storeOfferUrl({ name: 'Aldi' }), '');
  assert.equal(storeOfferUrl({ name: 'Edeka', offersUrl: '' }), '');
});
