import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emptyData, merge, operation, validate } from '../data.js';
import { compact } from '../compact.js';
import { hasProductPrice, priceOverview, productPriceCents, productPriceIndex, withProductPrice } from '../product-prices.js';
import { productKey } from '../prices.js';

const make = (id, patch, at = '2026-11-01T10:00:00.000Z') => operation('purchases', id, patch, 'Nico', at);
const purchase = (id, storeId, storeName, date, items, extra = {}) => ({ id, storeId, storeName, date, cents: 1000, items, createdAt: `${date}T10:00:00.000Z`, ...extra });

describe('2.163: Preis eines Produkts eingeben', () => {
  test('Komma, Punkt und Euro-Zeichen werden verstanden', () => {
    for (const [input, cents] of Object.entries({ '1,99': 199, '1.99': 199, '3': 300, '0,5': 50, '2,49 €': 249, ' 12,00 ': 1200, '99.999,99': 9999999 })) assert.equal(productPriceCents(input), cents, input);
  });
  test('Leer, 0, negativ, zu groß oder unklar wird mit einer deutschen Meldung abgelehnt', () => {
    for (const bad of ['', '  ', '0', '0,00', '-1', 'abc', '1,999', '100.000,00', null]) assert.throws(() => productPriceCents(bad), /bezahlten Preis in Euro/, String(bad));
  });
});

describe('2.163: Preis am Produkt eines Einkaufs', () => {
  const items = [{ name: 'Honig', amount: '1 Stück', imageKey: 'honig' }, { name: 'Kochschinken', amount: '1 Packung' }];
  test('nur das gewählte Produkt ändert sich; Angebot nur mit Häkchen; Löschen entfernt Preis und Angebot', () => {
    const priced = withProductPrice(items, 0, 'Honig', { cents: 349, offer: false });
    assert.deepEqual(priced, [{ name: 'Honig', amount: '1 Stück', imageKey: 'honig', cents: 349 }, items[1]]);
    assert.equal(priced[1], items[1], 'das andere Produkt bleibt dasselbe Objekt');
    const offer = withProductPrice(priced, 1, 'Kochschinken', { cents: 199, offer: true });
    assert.deepEqual(offer[1], { name: 'Kochschinken', amount: '1 Packung', cents: 199, offer: true });
    const changed = withProductPrice(offer, 1, 'kochschinken', { cents: 229, offer: false });
    assert.deepEqual(changed[1], { name: 'Kochschinken', amount: '1 Packung', cents: 229 }, 'Angebot wieder aus');
    assert.deepEqual(withProductPrice(offer, 1, 'Kochschinken', null)[1], items[1], 'gelöscht');
    assert.deepEqual(items, [{ name: 'Honig', amount: '1 Stück', imageKey: 'honig' }, { name: 'Kochschinken', amount: '1 Packung' }], 'die Eingabe bleibt unverändert');
  });
  test('ein inzwischen geändertes Produkt wird nicht überschrieben', () => {
    assert.throws(() => withProductPrice(items, 0, 'Butter', { cents: 100 }), /inzwischen geändert/);
    assert.throws(() => withProductPrice(items, 5, 'Honig', { cents: 100 }), /inzwischen geändert/);
    assert.throws(() => withProductPrice(undefined, 0, 'Honig', { cents: 100 }), /inzwischen geändert/);
    assert.throws(() => withProductPrice(items, 0, 'Honig', { cents: 0 }), /bezahlten Preis/);
  });
  test('Datenmodell: Preise werden geprüft, zusammengeführt und beim Aufräumen behalten; der Gesamtbetrag bleibt unberührt', () => {
    let data = merge(emptyData(), [make('e1', { date: '2026-11-01', cents: 1802, items })]);
    const priced = withProductPrice(data.purchases[0].items, 0, 'Honig', { cents: 349, offer: true });
    data = merge(data, [make('e1', { items: priced }, '2026-11-02T10:00:00.000Z')]);
    assert.equal(data.purchases[0].cents, 1802, 'keine Neuberechnung des Betrags');
    assert.deepEqual(data.purchases[0].items[0], { name: 'Honig', amount: '1 Stück', imageKey: 'honig', cents: 349, offer: true });
    assert.doesNotThrow(() => validate(data));
    data = merge(data, [make('e1', { cents: 1900 }, '2026-11-03T10:00:00.000Z')]);
    assert.deepEqual(data.purchases[0].items, priced, 'eine Betragsänderung lässt die Preise stehen');
    assert.deepEqual(compact(data, new Date('2026-11-04T10:00:00.000Z')).data.purchases[0].items, priced, 'das Aufräumen behält sie');
    for (const broken of [{ cents: 0 }, { cents: -5 }, { cents: 1.5 }, { cents: '349' }, { cents: 10000000 }, { offer: true }, { cents: 100, offer: false }, { cents: 100, offer: 'ja' }]) {
      const copy = structuredClone(data); copy.purchases[0].items = [{ name: 'Honig', ...broken }];
      assert.throws(() => validate(copy), /Ungültige Produkte eines Einkaufs/, JSON.stringify(broken));
    }
  });
});

describe('2.163: Preisübersicht im Laden', () => {
  const purchases = [
    purchase('p1', 'lidl', 'Lidl', '2026-11-04', [{ name: 'Milch', amount: '1 Liter', cents: 109 }, { name: 'Honig' }]),
    purchase('p2', 'edeka', 'Edeka', '2026-11-02', [{ name: 'Milch', amount: '1 Liter', cents: 129 }]),
    purchase('p3', 'rewe', 'Rewe', '2026-10-28', [{ name: 'milch ', amount: '1 Liter', cents: 99, offer: true }]),
    purchase('p4', 'lidl', 'Lidl', '2026-10-20', [{ name: 'Milch', amount: '1 Liter', cents: 119 }]),
    purchase('p5', 'lidl', 'Lidl', '2026-11-05', [{ name: 'Milch', amount: '1 Liter', cents: 89 }], { deletedAt: '2026-11-05T12:00:00.000Z' }),
    purchase('p6', 'edeka', 'Edeka', '2026-11-05', [{ name: 'Milch', amount: '1 Liter', cents: 79 }], { kind: 'refund' }),
  ];
  test('je Geschäft der letzte Preis, die jüngsten oben; gelöschte Einkäufe und Rückerstattungen zählen nicht', () => {
    const index = productPriceIndex(purchases), { rows } = priceOverview(index.get(productKey('Milch')));
    assert.deepEqual(rows.map(row => [row.storeName, row.cents, row.date, row.offer]), [['Lidl', 109, '2026-11-04', false], ['Edeka', 129, '2026-11-02', false], ['Rewe', 99, '2026-10-28', true]]);
    assert.equal(index.has(productKey('Honig')), false, 'ohne Preis keine Übersicht');
  });
  test('der günstigste Normalpreis wird markiert; ein günstigeres Angebot bleibt Angebot', () => {
    const { rows, showAmounts } = priceOverview(productPriceIndex(purchases).get('milch'));
    assert.deepEqual(rows.filter(row => row.cheapest).map(row => row.storeName), ['Lidl']);
    assert.equal(rows.find(row => row.offer).cheapest, false);
    assert.equal(showAmounts, false);
  });
  test('ein einzelnes Geschäft wird nicht als „günstigster“ markiert; gleich günstige beide', () => {
    assert.deepEqual(priceOverview(productPriceIndex([purchases[0]]).get('milch')).rows.map(row => row.cheapest), [false]);
    const tie = priceOverview(productPriceIndex([purchase('a', 'x', 'X', '2026-11-01', [{ name: 'Brot', cents: 199 }]), purchase('b', 'y', 'Y', '2026-11-02', [{ name: 'Brot', cents: 199 }])]).get('brot'));
    assert.deepEqual(tie.rows.map(row => row.cheapest), [true, true]);
  });
  test('verschiedene Mengen: Mengen anzeigen, nichts als günstigster markieren', () => {
    const mixed = priceOverview(productPriceIndex([purchase('a', 'x', 'X', '2026-11-01', [{ name: 'Honig', amount: '1 Stück', cents: 349 }]), purchase('b', 'y', 'Y', '2026-11-02', [{ name: 'Honig', amount: '2 Stück', cents: 598 }])]).get('honig'));
    assert.equal(mixed.showAmounts, true);
    assert.deepEqual(mixed.rows.map(row => row.cheapest), [false, false]);
  });
  test('Geschäft über den gemerkten Namen; am selben Tag zählt der später angelegte Einkauf', () => {
    const rows = [purchase('a', '', 'Wochenmarkt', '2026-11-01', [{ name: 'Eier', cents: 300 }], { createdAt: '2026-11-01T08:00:00.000Z' }),
      purchase('b', '', 'Wochenmarkt', '2026-11-01', [{ name: 'Eier', cents: 280 }], { createdAt: '2026-11-01T09:00:00.000Z' }),
      purchase('c', '', '', '2026-10-01', [{ name: 'Eier', cents: 250 }])];
    const overview = priceOverview(productPriceIndex(rows).get('eier'));
    assert.deepEqual(overview.rows.map(row => [row.storeName, row.cents]), [['Wochenmarkt', 280], ['', 250]]);
    assert.equal(hasProductPrice({ cents: 1 }), true); assert.equal(hasProductPrice({}), false);
  });
  test('der aktuelle Name eines Geschäfts kommt von außen (umbenannt oder gelöscht)', () => {
    const index = productPriceIndex([purchases[0]], row => row.storeId === 'lidl' ? 'Lidl Hauptstraße' : '');
    assert.equal(index.get('milch')[0].storeName, 'Lidl Hauptstraße');
  });
});
