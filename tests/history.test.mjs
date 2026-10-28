import assert from 'node:assert/strict';
import { test } from 'node:test';
import { merge, operation, validate } from '../data.js';
import { UNKNOWN_UNIT, dateText, entryKey, euroText, hasReceiptKey, isPaid, lastPaid, needsReview, paidEntries, paidRows, priceText, receiptKeyOf, reviewRows, titleOf } from '../history.js';
import { parseReceipt, suggestName } from '../receipt.js';

const stores = [{ id: 'edeka', name: 'Edeka' }, { id: 'rewe', name: 'Rewe' }, { id: 'weg', name: 'Weg', deletedAt: '2026-01-01T00:00:00.000Z' }];
const q = (cents, quantity = 1, unit = 'Stück') => ({ cents, quantity, unit });
const nb = text => text.replace(/ €/g, '\u00a0€');   // Intl schreibt einen geschützten Leerschritt vor „€“
let n = 0;
// Eine bestätigte Bonposition (src 'bon'); `at` ist der Tag des Kaufs.
const paid = (name, storeId, at, quote, extra = {}) => ({ id: `p${++n}`, storeId, name, quote, regularQuote: quote, onSale: false, src: 'bon', createdAt: `${at}T10:00:00.000Z`, updatedAt: `${at}T10:00:00.000Z`, deletedAt: null, ...extra });
const legacy = (name, storeId, at, quote, extra = {}) => { const { src: _src, ...row } = paid(name, storeId, at, quote, extra); return row; };

test('Äpfel: Gala und Pink Lady stehen getrennt, je Geschäft und Sorte der neueste Kauf, das gewählte Geschäft zuerst', () => {
  const prices = [
    paid('Äpfel', 'edeka', '2026-10-26', q(59), { variant: 'Gala' }),
    paid('Äpfel', 'edeka', '2026-10-12', q(55), { variant: 'Gala' }),
    paid('Äpfel', 'rewe', '2026-10-21', q(79), { variant: 'Pink Lady', onSale: true }),
    paid('Äpfel', 'rewe', '2026-09-30', q(89), { variant: 'Pink Lady' }),
    paid('Äpfel', 'rewe', '2026-10-01', q(129))   // Bon sagt nur „Äpfel“
  ];
  const here = paidEntries(prices, 'Äpfel', stores, 'edeka');
  assert.deepEqual(here.map(entry => [entry.title, entry.storeName, entry.here, entry.latest.quote.cents, entry.older.length]), [
    ['Gala', 'Edeka', true, 59, 1],
    ['Pink Lady', 'Rewe', false, 79, 1],
    ['Äpfel – Sorte unbekannt', 'Rewe', false, 129, 0]
  ]);
  assert.equal(here[1].latest.onSale, true, 'damals im Angebot');
  assert.equal(dateText(here[0].latest.createdAt), '26.10.2026');
  // Im anderen Geschäft stehen dessen Einträge vorn
  assert.deepEqual(paidEntries(prices, 'Äpfel', stores, 'rewe').map(entry => entry.title), ['Pink Lady', 'Äpfel – Sorte unbekannt', 'Gala']);
  // Ohne gewähltes Geschäft: nur nach Datum
  assert.deepEqual(paidEntries(prices, 'Äpfel', stores, '').map(entry => entry.title), ['Gala', 'Pink Lady', 'Äpfel – Sorte unbekannt']);
  assert.equal(titleOf(prices[4]), 'Äpfel – Sorte unbekannt', 'keine Sorte erfunden');
});

test('Andere Produkte bekommen nie den Preis von „Äpfel“: Apfeltasche, Apfelsaft, Hafermilch, Kuhmilch', () => {
  const prices = [paid('Äpfel', 'edeka', '2026-10-26', q(59), { variant: 'Gala' }), paid('Apfeltasche', 'edeka', '2026-10-26', q(149)), paid('Apfelsaft', 'edeka', '2026-10-26', q(199, 1, 'l')),
    paid('Hafermilch', 'edeka', '2026-10-26', q(149, 1, 'l')), paid('Milch', 'edeka', '2026-10-26', q(119, 1, 'l'))];
  const names = list => list.map(entry => entry.latest.name);
  assert.deepEqual(names(paidEntries(prices, 'Äpfel', stores)), ['Äpfel']);
  assert.deepEqual(names(paidEntries(prices, 'Apfeltasche', stores)), ['Apfeltasche']);
  assert.deepEqual(names(paidEntries(prices, 'Apfelsaft', stores)), ['Apfelsaft']);
  assert.deepEqual(names(paidEntries(prices, 'Milch', stores)), ['Milch']);
  assert.deepEqual(names(paidEntries(prices, 'Hafermilch', stores)), ['Hafermilch']);
  assert.deepEqual(paidEntries(prices, 'Apfel', stores), [], '„Apfel“ ist nicht „Äpfel“: im Zweifel getrennt');
  assert.deepEqual(paidEntries(prices, 'Birnen', stores), []);
  assert.equal(paidEntries(prices, '  äpfel ', stores).length, 1, 'Groß- und Kleinschreibung und Leerzeichen sind egal');
});

test('Nur bestätigte Bonpositionen zählen: Notizen aus früheren Versionen, gelöschte und ungültige nicht', () => {
  const prices = [paid('Milch', 'edeka', '2026-10-26', q(119, 1, 'l')), legacy('Milch', 'edeka', '2026-10-27', q(99, 1, 'l')), paid('Milch', 'edeka', '2026-10-28', q(89, 1, 'l'), { deletedAt: '2026-10-29T00:00:00.000Z' }),
    paid('Milch', 'edeka', '2026-10-24', { cents: -5, quantity: 1, unit: 'l' }), paid('Milch', 'weg', '2026-10-25', q(79, 1, 'l'))];
  const entries = paidEntries(prices, 'Milch', stores, 'edeka');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].latest.quote.cents, 119);
  assert.equal(entries[0].older.length, 0);
  assert.deepEqual([prices.map(isPaid), prices.map(needsReview)], [[true, false, false, false, true], [false, true, false, false, false]]);
  assert.deepEqual(reviewRows(prices).map(row => row.quote.cents), [99], 'nur die ungeprüfte Notiz steht zur Prüfung an');
  assert.equal(paidRows(prices).length, 2, 'bestätigt (auch bei entferntem Geschäft); der Verlauf blendet Preise entfernter Geschäfte aus');
});

test('Einheiten: je kg bleibt je kg, je Stück bleibt je Stück, verschiedene Packungen werden nicht gleichgesetzt', () => {
  const prices = [
    paid('Äpfel', 'edeka', '2026-10-26', q(299, 1, 'kg'), { variant: 'Gala' }),
    paid('Äpfel', 'edeka', '2026-10-25', q(59, 1, 'Stück'), { variant: 'Gala' }),
    paid('Äpfel', 'edeka', '2026-10-24', q(129, 500, 'g'), { variant: 'Gala' }),
    paid('Äpfel', 'edeka', '2026-10-23', q(249, 1, 'kg'), { variant: 'Gala' }),   // früherer Kauf je kg
    paid('Äpfel', 'edeka', '2026-10-22', q(199, 6, 'Stück'), { variant: 'Gala' }),
    paid('Äpfel', 'edeka', '2026-10-21', q(129, 1, UNKNOWN_UNIT), { variant: 'Gala' })
  ];
  const entries = paidEntries(prices, 'Äpfel', stores, 'edeka');
  assert.deepEqual(entries.map(entry => priceText(entry.latest.quote)), ['2,99 € pro kg', '0,59 € pro Stück', '1,29 € für 500 g', '1,99 € für 6 Stück', '1,29 € laut Bon (Menge unbekannt)'].map(nb));
  assert.equal(entries[0].older.length, 1, 'der frühere Kauf je kg gehört zum selben Eintrag');
  assert.equal(entries[0].older[0].quote.cents, 249);
  assert.equal(new Set(prices.map(entryKey)).size, 5);
  assert.ok(entries.every(entry => !/pro Stück|Stück/.test(priceText(entry.latest.quote)) || entry.latest.quote.unit === 'Stück'), 'ein kg-Preis wird nie als Stückpreis gezeigt');
});

test('Preis- und Datumstexte', () => {
  assert.equal(priceText(q(59)), nb('0,59 € pro Stück'));
  assert.equal(priceText(q(398, 1, 'kg')), nb('3,98 € pro kg'));
  assert.equal(priceText(q(129, 0.5, 'kg')), nb('1,29 € für 0,5 kg'));
  assert.equal(euroText(1250), nb('12,50 €'));
  assert.equal(dateText('2026-10-26T10:00:00.000Z'), '26.10.2026');
});

test('Dieselbe Bonposition wird nicht doppelt übernommen: der Schlüssel hängt an Geschäft, Tag, Text und Betrag', () => {
  const key = receiptKeyOf('edeka', '2026-10-26', 'GALA ÄPFEL 1KG   2,99 A', 299);
  assert.equal(key, receiptKeyOf('edeka', '2026-10-26', 'gala äpfel 1kg 2,99 a', 299), 'Schreibweise und Leerzeichen sind egal');
  assert.notEqual(key, receiptKeyOf('rewe', '2026-10-26', 'GALA ÄPFEL 1KG   2,99 A', 299));
  assert.notEqual(key, receiptKeyOf('edeka', '2026-10-27', 'GALA ÄPFEL 1KG   2,99 A', 299));
  assert.notEqual(key, receiptKeyOf('edeka', '2026-10-26', 'GALA ÄPFEL 1KG   2,99 A', 300));
  const prices = [paid('Äpfel', 'edeka', '2026-10-26', q(299, 1, 'kg'), { receiptKey: key })];
  assert.equal(hasReceiptKey(prices, key), true);
  assert.equal(hasReceiptKey(prices, receiptKeyOf('edeka', '2026-10-26', 'BANANEN', 100)), false);
  assert.equal(hasReceiptKey([{ ...prices[0], deletedAt: '2026-10-27T00:00:00.000Z' }], key), false, 'vergessene Positionen dürfen neu übernommen werden');
});

test('Letzter bestätigter Kauf derselben Sorte, Packung und desselben Geschäfts (zur Kontrolle beim Übernehmen)', () => {
  const prices = [paid('Äpfel', 'edeka', '2026-10-12', q(55), { variant: 'Gala' }), paid('Äpfel', 'edeka', '2026-10-20', q(65), { variant: 'Pink Lady' }), paid('Äpfel', 'rewe', '2026-10-21', q(49), { variant: 'Gala' })];
  assert.equal(lastPaid(prices, { storeId: 'edeka', name: 'Äpfel', variant: 'Gala', quote: q(59) }, '2026-10-26T00:00:00.000Z').quote.cents, 55);
  assert.equal(lastPaid(prices, { storeId: 'edeka', name: 'Äpfel', variant: 'Gala', quote: q(59) }, '2026-10-01T00:00:00.000Z'), null, 'nur frühere Käufe');
  assert.equal(lastPaid(prices, { storeId: 'edeka', name: 'Äpfel', variant: 'Gala', quote: q(299, 1, 'kg') }), null, 'andere Einheit: kein Vergleich');
  assert.equal(lastPaid(prices, { storeId: 'edeka', name: 'Äpfel', variant: '', quote: q(59) }), null, 'Sorte unbekannt ist eine eigene Sorte');
});

test('Von der Bonzeile zum Verlauf: „Gala Äpfel“ und „Äpfel Pink Lady“ landen getrennt, „Apfeltasche“ und „Apfelsaft“ bleiben eigene Produkte', () => {
  const known = ['Äpfel', 'Apfelsaft'];
  // Was die Prüfansicht vorbelegt (unsichere Vorschläge nur als Knopf, nicht im Feld)
  const saved = text => {
    const item = parseReceipt(`EDEKA\n${text}   2,99 A\nSUMME 2,99`).items[0], guess = suggestName(item, [], known), unsure = guess.how === 'Vorschlag';
    return { name: unsure ? item.name : guess.name, variant: guess.variant };
  };
  assert.deepEqual(saved('GALA ÄPFEL 1KG'), { name: 'Äpfel', variant: 'Gala' });
  assert.deepEqual(saved('ÄPFEL PINK LADY'), { name: 'Äpfel', variant: 'Pink Lady' });
  assert.deepEqual(saved('ÄPFEL'), { name: 'Äpfel', variant: '' });
  assert.deepEqual(saved('APFELTASCHE'), { name: 'Apfeltasche', variant: '' });
  assert.deepEqual(saved('APFELSAFT 1L'), { name: 'Apfelsaft', variant: '' });
  const prices = ['GALA ÄPFEL 1KG', 'ÄPFEL PINK LADY', 'ÄPFEL', 'APFELTASCHE', 'APFELSAFT 1L'].map((text, index) => {
    const { name, variant } = saved(text);
    return paid(name, 'edeka', `2026-10-${20 + index}`, q(100 + index), variant ? { variant } : {});
  });
  assert.deepEqual(paidEntries(prices, 'Äpfel', stores, 'edeka').map(entry => entry.title).sort(), ['Gala', 'Pink Lady', 'Äpfel – Sorte unbekannt'].sort());
  assert.deepEqual(paidEntries(prices, 'Apfeltasche', stores).map(entry => entry.title), ['Apfeltasche – Sorte unbekannt']);
  assert.deepEqual(paidEntries(prices, 'Apfelsaft', stores).map(entry => entry.title), ['Apfelsaft – Sorte unbekannt']);
});

test('Datenmodell: bezahlter Preis mit Sorte ist gültig, ungültige Angaben werden verworfen; ältere Notizen bleiben gültig', () => {
  const base = { version: 1, updatedAt: '2026-10-20T00:00:00.000Z', stores: [{ id: 'edeka', name: 'Edeka', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null, _clock: {} }],
    items: [], recipes: [], ingredients: [], sync: { applied: [] } };
  const make = patch => merge(structuredClone(base), [operation('prices', 'p1', { storeId: 'edeka', name: 'Äpfel', quote: q(59), ...patch }, 'Nico', '2026-10-26T10:00:00.000Z')]);
  assert.equal(make({ src: 'bon', variant: 'Gala', receipt: 'GALA ÄPFEL 1KG 2,99 A', receiptKey: 'edeka|2026-10-26|gala|299' }).prices.length, 1);
  assert.equal(make({}).prices.length, 1, 'Notiz ohne die neuen Felder (Altbestand)');
  for (const bad of [{ src: 'hand' }, { src: 'bon', variant: 5 }, { variant: 'x'.repeat(81) }, { receipt: 'x'.repeat(201) }, { receiptKey: 'x'.repeat(301) }]) assert.equal(make(bad).prices.length, 0, JSON.stringify(bad).slice(0, 40));
  assert.doesNotThrow(() => validate(make({ src: 'bon', variant: 'Gala' })));
  const alias = patch => merge(structuredClone(base), [operation('aliases', 'a1', { from: 'gala äpfel', name: 'Äpfel', ...patch }, 'Nico', '2026-10-26T10:00:00.000Z')]);
  assert.equal(alias({ variant: 'Gala' }).aliases.length, 1);
  assert.equal(alias({ variant: 5 }).aliases.length, 0);
});
