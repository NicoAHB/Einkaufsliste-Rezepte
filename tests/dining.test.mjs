// Restaurant/Café/Bar (2.170): eigene Ausgaben fürs Auswärtsessen, wahlweise mit oder ohne Einfluss aufs Monatsbudget.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emptyData, merge, operation, SCHEMA_REV, validate } from '../data.js';
import { compact } from '../compact.js';
import { trashEntries } from '../trash.js';
import { budgetSpent, budgetStatus, diningCounts, diningFields, diningPlaces, duplicatePurchase, filterPurchases, possibleDuplicates, purchaseFrequency,
  spendingCsv, summarizePeriod, DINING_LABEL } from '../spending.js';

const at = '2026-11-01T12:00:00.000Z';
const op = (collection, id, patch, time = at) => operation(collection, id, patch, 'Gerät', time);
const shop = (id, date, cents, extra = {}) => ({ id, date, cents, createdAt: at, ...extra });
const dine = (id, date, cents, dining = 'restaurant', extra = {}) => ({ id, date, cents, dining, createdAt: at, ...extra });

describe('Eingaben prüfen', () => {
  test('Betrag, Art, Uhrzeit und Lokal werden geprüft; Lokal und Uhrzeit stehen immer im Ergebnis', () => {
    const fields = diningFields({ amount: '46,80', date: '2026-11-05', time: '19:30', kind: 'cafe', place: '  Café   Lotte ', buyerId: null }, '2026-11-06');
    assert.deepEqual(fields, { date: '2026-11-05', cents: 4680, source: 'hand', note: '', buyerId: null, buyerName: '', storeName: 'Café Lotte', dining: 'cafe', time: '19:30' });
    const plain = diningFields({ amount: '8', date: '2026-11-06', kind: 'bar' }, '2026-11-06');
    assert.equal(plain.storeName, ''); assert.equal(plain.time, ''); assert.equal(plain.dining, 'bar'); assert.equal(plain.storeId, undefined);
    assert.throws(() => diningFields({ amount: '', date: '2026-11-06' }, '2026-11-06'), /Betrag/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-11-06', kind: 'kantine' }, '2026-11-06'), /Restaurant, Café oder Bar/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-11-06', time: '25:00' }, '2026-11-06'), /Uhrzeit/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-12-24' }, '2026-11-06'), /Zukunft/);
    assert.equal(diningFields({ amount: '5', date: '2026-11-06', place: 'x'.repeat(120) }, '2026-11-06').storeName.length, 80);
  });
});

describe('Auswertung und Monatsbudget', () => {
  const rows = [shop('s1', '2026-11-02', 10000), shop('s2', '2026-11-03', 2000, { kind: 'refund' }), dine('d1', '2026-11-04', 4680, 'restaurant', { storeName: 'Pizzeria Roma', time: '19:30' }),
    dine('d2', '2026-11-04', 890, 'cafe', { storeName: 'Café Lotte', time: '15:10' }), dine('d3', '2026-11-05', 1200, 'restaurant', { storeName: 'pizzeria roma', time: '20:00' }),
    dine('old', '2026-10-30', 5000), dine('gone', '2026-11-06', 9999, 'bar', { deletedAt: at })];
  test('Restaurant/Café/Bar hat eine eigene Summe, Liste und Aufteilung; die Gesamtsumme zählt alles', () => {
    const summary = summarizePeriod(rows, '2026-11');
    assert.equal(summary.total, 10000 - 2000 + 4680 + 890 + 1200);
    assert.equal(summary.gross, 10000); assert.equal(summary.purchaseCount, 1); assert.equal(summary.average, 10000);
    assert.equal(summary.dining.total, 6770); assert.equal(summary.dining.count, 3); assert.equal(summary.dining.average, 2257);
    assert.deepEqual(summary.dining.byKind.map(kind => [kind.id, kind.total, kind.count]), [['restaurant', 5880, 2], ['cafe', 890, 1]]);
    // neueste zuerst, am selben Tag nach Uhrzeit
    assert.deepEqual(summary.dining.list.map(row => row.id), ['d3', 'd1', 'd2']);
    assert.equal(summary.byStore.find(group => group.dining).name, DINING_LABEL);
    assert.equal(summary.byStore.find(group => group.dining).total, 6770);
    assert.equal(summary.byNote.find(group => group.name === DINING_LABEL).count, 3);
  });
  test('Ohne Haken zählt Restaurant/Café/Bar nicht zum Budget, mit Haken schon', () => {
    const summary = summarizePeriod(rows, '2026-11');
    assert.equal(budgetSpent(summary, true), summary.total);
    assert.equal(budgetSpent(summary, false), 8000);
    assert.equal(budgetStatus(budgetSpent(summary, false), 10000).left, 2000);
    assert.equal(budgetStatus(budgetSpent(summary, true), 10000).level, 'over');
  });
  test('Die gemeinsame Einstellung: ohne Zeile zählt es, `counts: false` nimmt es heraus, gelöschte Zeilen zählen nicht', () => {
    assert.equal(diningCounts(undefined), true);
    assert.equal(diningCounts([{ id: 'monthly', cents: 40000 }]), true);
    assert.equal(diningCounts([{ id: 'dining', cents: 0, counts: false }]), false);
    assert.equal(diningCounts([{ id: 'dining', cents: 0, counts: true }]), true);
    assert.equal(diningCounts([{ id: 'dining', cents: 0, counts: false, deletedAt: at }]), true);
  });
  test('Personenfilter gilt auch für Restaurant/Café/Bar', () => {
    const own = rows.map(row => row.id === 'd2' ? { ...row, buyerId: 'member-anna', buyerName: 'Anna' } : row);
    assert.equal(summarizePeriod(own, '2026-11', [], [], 'member-anna').dining.total, 890);
  });
  test('Einkäufe je Geschäft zählen keine Restaurantbesuche', () => {
    assert.equal(purchaseFrequency(rows, '2026-11', []).count, 1);
  });
  test('Zuletzt besuchte Lokale: häufigste zuerst, Schreibweisen zusammengefasst, gelöschte nicht', () => {
    assert.deepEqual(diningPlaces(rows), [{ name: 'pizzeria roma', kind: 'restaurant' }, { name: 'Café Lotte', kind: 'cafe' }]);
    assert.deepEqual(diningPlaces([...rows, shop('s9', '2026-11-05', 100, { storeName: 'Rewe' })], 1), [{ name: 'pizzeria roma', kind: 'restaurant' }]);
  });
  test('Doppelt? nur bei gleichem Lokal, nie gegen einen Einkauf ohne Geschäft', () => {
    const base = [shop('a', '2026-11-04', 4680), dine('b', '2026-11-04', 4680, 'restaurant', { storeName: 'Roma' })];
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680, dining: 'restaurant', storeName: 'Roma' }).id, 'b');
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680, dining: 'cafe', storeName: 'Lotte' }), null);
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680 }).id, 'a');
    assert.equal(possibleDuplicates(base).size, 0);
  });
  test('CSV nennt Art, Lokal und Uhrzeit', () => {
    const csv = spendingCsv(filterPurchases(rows, '2026-11'));
    assert.match(csv.split('\r\n')[0], /"Kategorie";"Uhrzeit"$/);
    assert.ok(csv.includes('"2026-11-04";"Restaurant/Café/Bar: Café";"Nicht zugeordnet";"Café Lotte";"8,90";"Restaurant/Café/Bar";"15:10"'));
    assert.ok(csv.includes('"2026-11-02";"Einkauf";"Nicht zugeordnet";"";"100,00";"";""'));
  });
});

describe('Gemeinsame Datei', () => {
  test('Restaurantbesuche heben die Datenrevision auf 19; ungültige Angaben werden abgelehnt', () => {
    assert.ok(SCHEMA_REV >= 19);
    const plain = merge(emptyData(), [op('purchases', 'p1', { date: '2026-11-02', cents: 500, source: 'hand' })]);
    assert.equal(plain.sync.minRev, 6);
    const next = merge(plain, [op('purchases', 'd1', { date: '2026-11-04', cents: 4680, source: 'hand', note: '', storeName: 'Roma', dining: 'restaurant', time: '19:30' })]);
    assert.equal(next.sync.minRev, 19);
    assert.doesNotThrow(() => validate(next));
    assert.equal(compact(next, new Date('2027-06-01T00:00:00Z')).data.sync.minRev, 19);
    const broken = structuredClone(next); broken.purchases.find(row => row.id === 'd1').dining = 'kantine';
    assert.throws(() => validate(broken), /Restaurant\/Café\/Bar/);
    const late = structuredClone(next); late.purchases.find(row => row.id === 'd1').time = '7 Uhr';
    assert.throws(() => validate(late), /Restaurant\/Café\/Bar/);
    const empty = structuredClone(next); empty.purchases.find(row => row.id === 'd1').time = '';
    assert.doesNotThrow(() => validate(empty));
  });
  test('Die Einstellung „Zählt zum Budget“ ist eine eigene Budgetzeile, die ältere Apps lesen können', () => {
    const data = merge(emptyData(), [op('budgets', 'monthly', { cents: 40000 }), op('budgets', 'dining', { cents: 0, counts: false })]);
    assert.equal(diningCounts(data.budgets), false);
    assert.equal(data.budgets.find(row => row.id === 'monthly').cents, 40000);
    assert.equal(data.sync.minRev ?? 1, 1);   // die Einstellung allein schließt keine ältere App aus
    const bad = structuredClone(data); bad.budgets.find(row => row.id === 'dining').counts = 'nein';
    assert.throws(() => validate(bad), /Budget/);
    const wrong = structuredClone(data); wrong.budgets.find(row => row.id === 'monthly').counts = true;
    assert.throws(() => validate(wrong), /Budget/);
  });
  test('Im Papierkorb ist ein gelöschter Besuch als Restaurant/Café/Bar zu erkennen', () => {
    const data = merge(emptyData(), [op('purchases', 'd1', { date: '2026-11-04', cents: 4680, source: 'hand', note: '', storeName: 'Roma', dining: 'restaurant', time: '19:30' }),
      op('purchases', 'd1', { deletedAt: '2026-11-05T12:00:00.000Z' }, '2026-11-05T12:00:00.000Z')]);
    const entry = trashEntries(data, new Date('2026-11-06T12:00:00Z')).find(row => row.id === 'd1');
    assert.match(entry.title, /46,80\s€ · Roma/); assert.match(entry.detail, /Restaurant\/Café\/Bar/);
  });
});
