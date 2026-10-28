import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemCost, itemQuote, offerUrl, parseCents, productKey, shoppingTotal, storeOfferUrl, unitRate, unitSpec } from '../prices.js';

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

test('Der Preis eines Artikels ist nur der eigene: nie ein früher bezahlter oder notierter Preis (auch nicht bei Altbestand ohne Feld)', () => {
  assert.equal(itemQuote({ name: 'Milch', unit: 'l' }), null, 'fehlendes Feld heißt kein Preis');
  assert.equal(itemQuote({ name: 'Milch', unit: 'l', price: null }), null);
  assert.equal(itemQuote({ name: 'Milch', unit: 'l', price: { cents: -1, quantity: 1, unit: 'l' } }), null, 'ungültiger Preis zählt nicht');
  const own = { cents: 120, quantity: 1, unit: 'l' };
  assert.deepEqual(itemQuote({ name: 'Milch', unit: 'l', price: own }), own);
  assert.equal(shoppingTotal([{ name: 'Milch', quantity: 1, unit: 'l' }]).priced, 0);
  assert.equal(productKey('  Äpfel  Rot '), 'äpfel rot');
});

test('Angebotslinks: nur https ohne Zugangsdaten; Standardlinks für bekannte Händler', () => {
  assert.equal(offerUrl(''), '');
  assert.equal(offerUrl(' https://www.edeka.de/angebote '), 'https://www.edeka.de/angebote');
  for (const bad of ['http://a.de', 'javascript:alert(1)', 'https://u:p@a.de', 'kein link']) assert.throws(() => offerUrl(bad));
  assert.match(storeOfferUrl({ name: 'Edeka' }), /^https:\/\/www\.edeka\.de/);
  assert.equal(storeOfferUrl({ name: 'Aldi' }), '');
  assert.match(storeOfferUrl({ name: 'Edeka', offersUrl: '' }), /^https:\/\/www\.edeka\.de/, 'ein leeres Feld heißt: Standardlink der Kette');
  assert.equal(storeOfferUrl({ name: 'Aldi', offersUrl: '' }), '');
  for (const name of ['Rossmann', 'Roßmann', ' ROSSMANN ']) assert.equal(storeOfferUrl({ name }), 'https://www.rossmann.de/de/angebote', name);
  assert.equal(storeOfferUrl({ name: 'Roßmann', offersUrl: 'https://www.rossmann.de/de/angebote/x' }), 'https://www.rossmann.de/de/angebote/x', 'ein eigener Link gewinnt');
});
