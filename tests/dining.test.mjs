// Restaurant/Café/Bar (2.170): eigene Ausgaben fürs Auswärtsessen, wahlweise mit oder ohne Einfluss aufs Monatsbudget.
// Seit 2.171 zwei Arten: Restaurant und Getränke (`drinks`); `cafe` und `bar` aus 2.170 zählen als Getränke.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emptyData, merge, operation, SCHEMA_REV, validate } from '../data.js';
import { compact } from '../compact.js';
import { trashEntries } from '../trash.js';
import { budgetSpent, budgetStatus, diningCounts, diningFields, diningPlaces, diningRating, duplicatePurchase, filterPurchases, hasRating, hasRatingNote, hasReview, lastRating, possibleDuplicates, purchaseClock, purchaseFrequency,
  ratingStars, spendingCsv, summarizePeriod, DINING_LABEL } from '../spending.js';

const at = '2026-11-01T12:00:00.000Z';
const op = (collection, id, patch, time = at) => operation(collection, id, patch, 'Gerät', time);
const shop = (id, date, cents, extra = {}) => ({ id, date, cents, createdAt: at, ...extra });
const dine = (id, date, cents, dining = 'restaurant', extra = {}) => ({ id, date, cents, dining, createdAt: at, ...extra });

describe('Eingaben prüfen', () => {
  test('Betrag, Art, Uhrzeit und Lokal werden geprüft; Lokal und Uhrzeit stehen immer im Ergebnis', () => {
    const fields = diningFields({ amount: '46,80', date: '2026-11-05', time: '19:30', kind: 'drinks', place: '  Café   Lotte ', buyerId: null }, '2026-11-06');
    assert.deepEqual(fields, { date: '2026-11-05', cents: 4680, source: 'hand', note: '', buyerId: null, buyerName: '', storeName: 'Café Lotte', dining: 'drinks', time: '19:30', rating: null, ratingNote: '' });
    const plain = diningFields({ amount: '8', date: '2026-11-06', kind: 'drinks' }, '2026-11-06');
    assert.equal(plain.storeName, ''); assert.equal(plain.time, ''); assert.equal(plain.dining, 'drinks'); assert.equal(plain.storeId, undefined);
    assert.equal(diningFields({ amount: '8', date: '2026-11-06' }, '2026-11-06').dining, 'restaurant', 'Restaurant ist vorgewählt');
    // Neue Einträge nur noch Restaurant oder Getränke; Café und Bar gibt es nicht mehr als eigene Wahl
    assert.throws(() => diningFields({ amount: '5', date: '2026-11-06', kind: 'cafe' }, '2026-11-06'), /Restaurant oder Getränke/);
    assert.throws(() => diningFields({ amount: '', date: '2026-11-06' }, '2026-11-06'), /Betrag/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-11-06', kind: 'kantine' }, '2026-11-06'), /Restaurant oder Getränke/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-11-06', time: '25:00' }, '2026-11-06'), /Uhrzeit/);
    assert.throws(() => diningFields({ amount: '5', date: '2026-12-24' }, '2026-11-06'), /Zukunft/);
    assert.equal(diningFields({ amount: '5', date: '2026-11-06', place: 'x'.repeat(120) }, '2026-11-06').storeName.length, 80);
  });
});

describe('Auswertung und Monatsbudget', () => {
  const rows = [shop('s1', '2026-11-02', 10000), shop('s2', '2026-11-03', 2000, { kind: 'refund' }), dine('d1', '2026-11-04', 4680, 'restaurant', { storeName: 'Pizzeria Roma', time: '19:30' }),
    dine('d2', '2026-11-04', 890, 'drinks', { storeName: 'Café Lotte', time: '15:10' }), dine('d3', '2026-11-05', 1200, 'restaurant', { storeName: 'pizzeria roma', time: '20:00' }),
    dine('old', '2026-10-30', 5000), dine('gone', '2026-11-06', 9999, 'bar', { deletedAt: at })];
  test('Restaurant/Café/Bar hat eine eigene Summe, Liste und Aufteilung; die Gesamtsumme zählt alles', () => {
    const summary = summarizePeriod(rows, '2026-11');
    assert.equal(summary.total, 10000 - 2000 + 4680 + 890 + 1200);
    assert.equal(summary.gross, 10000); assert.equal(summary.purchaseCount, 1); assert.equal(summary.average, 10000);
    assert.equal(summary.dining.total, 6770); assert.equal(summary.dining.count, 3); assert.equal(summary.dining.average, 2257);
    assert.deepEqual(summary.dining.byKind.map(kind => [kind.id, kind.label, kind.total, kind.count]), [['restaurant', 'Restaurant', 5880, 2], ['drinks', 'Getränke', 890, 1]]);
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
  test('Café und Bar aus 2.170 zählen als Getränke', () => {
    const old = [dine('c', '2026-11-04', 300, 'cafe', { storeName: 'Café Lotte' }), dine('b', '2026-11-05', 700, 'bar', { storeName: 'Zur Linde' }), dine('n', '2026-11-05', 1000, 'drinks')];
    const summary = summarizePeriod(old, '2026-11');
    assert.deepEqual(summary.dining.byKind.map(kind => [kind.id, kind.total, kind.count]), [['drinks', 2000, 3]]);
    assert.deepEqual(diningPlaces(old).map(place => place.kind), ['drinks', 'drinks']);
    assert.match(spendingCsv(old), /"Restaurant\/Café\/Bar: Getränke";"Nicht zugeordnet";"Zur Linde"/);
  });
  test('2.187: Reihenfolge am selben Tag ist eindeutig – Restaurant nach Uhrzeit, Einkäufe nach dem Erfassen, unabhängig von der Reihenfolge in der Datei', () => {
    const local = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();   // Ortszeit, damit der Test in jeder Zeitzone gilt
    // Abendessen 19:00 (morgens vorab erfasst), Einkauf um 15:00 erfasst, Mittagessen 12:00 (abends nachgetragen), Einkauf am nächsten Tag nachgetragen, Eintrag ohne Zeitpunkt
    const day = [dine('dinner', '2026-11-06', 5000, 'restaurant', { time: '19:00', createdAt: local(6, 10) }), shop('shop', '2026-11-06', 3000, { createdAt: local(6, 15) }),
      dine('lunch', '2026-11-06', 1200, 'drinks', { time: '12:00', createdAt: local(6, 20) }), shop('later', '2026-11-06', 800, { createdAt: local(7, 9) }),
      shop('old', '2026-11-06', 100, { createdAt: undefined }), dine('notime', '2026-11-06', 900, 'restaurant', { time: '', createdAt: local(6, 13, 30) })];
    const expected = ['later', 'dinner', 'shop', 'notime', 'lunch', 'old'];
    const permutations = list => list.length <= 1 ? [list] : list.flatMap((row, index) => permutations([...list.slice(0, index), ...list.slice(index + 1)]).map(rest => [row, ...rest]));
    for (const order of permutations(day)) assert.deepEqual(filterPurchases(order, '2026-11').map(row => row.id), expected);
    assert.equal(purchaseClock(day[0]), '19:00'); assert.equal(purchaseClock(day[1]), '15:00'); assert.equal(purchaseClock(day[3]), '24:00'); assert.equal(purchaseClock(day[4]), '');
    assert.equal(purchaseClock(shop('ahead', '2026-11-08', 100, { createdAt: local(6, 9) })), '', 'vorab erfasst: Anfang des Tags');
  });
  test('Personenfilter gilt auch für Restaurant/Café/Bar', () => {
    const own = rows.map(row => row.id === 'd2' ? { ...row, buyerId: 'member-anna', buyerName: 'Anna' } : row);
    assert.equal(summarizePeriod(own, '2026-11', [], [], 'member-anna').dining.total, 890);
  });
  test('Einkäufe je Geschäft zählen keine Restaurantbesuche', () => {
    assert.equal(purchaseFrequency(rows, '2026-11', []).count, 1);
  });
  test('Zuletzt besuchte Lokale: häufigste zuerst, Schreibweisen zusammengefasst, gelöschte nicht', () => {
    assert.deepEqual(diningPlaces(rows), [{ name: 'pizzeria roma', kind: 'restaurant' }, { name: 'Café Lotte', kind: 'drinks' }]);
    assert.deepEqual(diningPlaces([...rows, shop('s9', '2026-11-05', 100, { storeName: 'Rewe' })], 1), [{ name: 'pizzeria roma', kind: 'restaurant' }]);
  });
  test('Doppelt? nur bei gleichem Lokal, nie gegen einen Einkauf ohne Geschäft', () => {
    const base = [shop('a', '2026-11-04', 4680), dine('b', '2026-11-04', 4680, 'restaurant', { storeName: 'Roma' })];
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680, dining: 'restaurant', storeName: 'Roma' }).id, 'b');
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680, dining: 'drinks', storeName: 'Lotte' }), null);
    assert.equal(duplicatePurchase(base, { date: '2026-11-04', cents: 4680 }).id, 'a');
    assert.equal(possibleDuplicates(base).size, 0);
  });
  test('CSV nennt Art, Lokal und Uhrzeit', () => {
    const csv = spendingCsv(filterPurchases(rows, '2026-11'));
    assert.match(csv.split('\r\n')[0], /"Kategorie";"Uhrzeit";"Bewertung \(1–5\)";"Notiz zur Bewertung"$/);
    assert.ok(csv.includes('"2026-11-04";"Restaurant/Café/Bar: Getränke";"Nicht zugeordnet";"Café Lotte";"8,90";"Restaurant/Café/Bar";"15:10";"";""'));
    assert.ok(csv.includes('"2026-11-02";"Einkauf";"Nicht zugeordnet";"";"100,00";"";"";"";""'));
  });
});

describe('Bewertung eines Restaurantbesuchs (2.174)', () => {
  test('Sterne 1–5 und eine kurze Notiz, bei Restaurant und (seit 2.177) Getränken; leer oder 0 heißt keine Bewertung', () => {
    const rated = diningFields({ amount: '46,80', date: '2026-11-05', kind: 'restaurant', rating: '4', ratingNote: '  Pizza top,   Bedienung langsam ' }, '2026-11-06');
    assert.equal(rated.rating, 4); assert.equal(rated.ratingNote, 'Pizza top, Bedienung langsam');
    assert.equal(diningFields({ amount: '5', date: '2026-11-05', kind: 'restaurant', rating: '' }, '2026-11-06').rating, null);
    assert.equal(diningFields({ amount: '5', date: '2026-11-05', kind: 'restaurant', rating: '0' }, '2026-11-06').rating, null, 'zurückgesetzt');
    assert.deepEqual(['rating', 'ratingNote'].map(key => diningFields({ amount: '5', date: '2026-11-05', kind: 'drinks', rating: '5', ratingNote: ' Bester Cappuccino ' }, '2026-11-06')[key]), [5, 'Bester Cappuccino'], 'Getränke werden genauso bewertet');
    assert.equal(diningFields({ amount: '5', date: '2026-11-05', ratingNote: 'x'.repeat(300) }, '2026-11-06').ratingNote.length, 120);
    for (const bad of ['6', '-1', '2.5', 'viel']) assert.throws(() => diningRating(bad), /1 bis 5 Sterne/);
    assert.equal(ratingStars(4), '★★★★☆'); assert.equal(ratingStars(1), '★☆☆☆☆');
    assert.equal(hasRating({ rating: null }), false); assert.equal(hasRating({}), false); assert.equal(hasRating({ rating: 5 }), true);
  });
  test('Die Bewertung ändert keine Summe und kein Budget', () => {
    const plain = [dine('a', '2026-11-04', 4680, 'restaurant', { storeName: 'Roma' })], rated = [{ ...plain[0], rating: 1, ratingNote: 'nie wieder' }];
    for (const counts of [true, false]) assert.equal(budgetSpent(summarizePeriod(rated, '2026-11'), counts), budgetSpent(summarizePeriod(plain, '2026-11'), counts));
    assert.equal(summarizePeriod(rated, '2026-11').dining.total, 4680);
  });
  test('Letzte Bewertung je Lokal: ohne Groß-/Kleinschreibung, der jüngste bewertete Besuch, nicht der gerade bearbeitete', () => {
    const rows = [dine('r1', '2026-10-01', 3000, 'restaurant', { storeName: 'Pizzeria Roma', rating: 2, ratingNote: 'zu salzig' }),
      dine('r2', '2026-11-01', 3000, 'restaurant', { storeName: 'pizzeria  ROMA', rating: 5, ratingNote: 'super', time: '19:00' }),
      dine('r3', '2026-11-03', 3000, 'restaurant', { storeName: 'Pizzeria Roma' }),   // ohne Bewertung: zählt nicht
      dine('r4', '2026-11-04', 3000, 'restaurant', { storeName: 'Pizzeria Roma', rating: 1, deletedAt: at }),
      dine('x', '2026-11-05', 3000, 'restaurant', { storeName: 'Sushi Bar', rating: 3 }), dine('c', '2026-11-06', 450, 'drinks', { storeName: 'Café Lotte', rating: 4, ratingNote: 'Kuchen top' })];
    assert.equal(lastRating(rows, ' PIZZERIA roma ').id, 'r2');
    assert.equal(lastRating(rows, 'Pizzeria Roma', 'r2').id, 'r1');
    assert.equal(lastRating(rows, 'Unbekannt'), null); assert.equal(lastRating(rows, ''), null);
    assert.equal(lastRating(rows, 'café lotte').ratingNote, 'Kuchen top', 'auch für Getränke');
  });
  test('2.187: Eine Notiz ohne Sterne geht nicht verloren – „Zuletzt“ und Export zeigen sie', () => {
    const fields = diningFields({ amount: '20', date: '2026-11-06', kind: 'restaurant', place: 'Roma', rating: '', ratingNote: '  Pizza   top ' }, '2026-11-07');
    assert.equal(fields.rating, null); assert.equal(fields.ratingNote, 'Pizza top');
    const rows = [dine('r1', '2026-11-01', 3000, 'restaurant', { storeName: 'Roma', rating: 4 }), dine('r2', '2026-11-06', 2000, 'restaurant', { ...fields, rating: undefined }),
      dine('r3', '2026-11-07', 2000, 'restaurant', { storeName: 'Roma', ratingNote: '   ' })];
    assert.equal(lastRating(rows, 'roma').id, 'r2', 'der jüngste Besuch mit Notiz, auch ohne Sterne; nur Leerzeichen zählen nicht');
    assert.equal(lastRating(rows, 'roma', 'r2').id, 'r1');
    assert.ok(hasRatingNote(rows[1]) && !hasRating(rows[1]) && hasReview(rows[1]) && !hasReview(rows[2]));
    assert.ok(spendingCsv([rows[1]]).includes('"Roma";"20,00";"Restaurant/Café/Bar";"";"";"Pizza top"'));
  });
  test('Export enthält Sterne und Notiz; alte Einträge ohne Bewertung bleiben leer', () => {
    const csv = spendingCsv([dine('r', '2026-11-04', 4680, 'restaurant', { storeName: 'Roma', rating: 4, ratingNote: 'Pizza top', time: '19:30' }), dine('o', '2026-11-03', 500, 'restaurant')]);
    assert.ok(csv.includes('"Roma";"46,80";"Restaurant/Café/Bar";"19:30";"4";"Pizza top"'));
    assert.ok(csv.includes('"2026-11-03";"Restaurant/Café/Bar: Restaurant";"Nicht zugeordnet";"";"5,00";"Restaurant/Café/Bar";"";"";""'));
  });
  test('Gemeinsame Datei: Bewertungen sind gültig, brauchen keine neuere App; Unsinn wird abgelehnt', () => {
    const data = merge(emptyData(), [op('purchases', 'r1', { date: '2026-11-04', cents: 4680, source: 'hand', note: '', storeName: 'Roma', dining: 'restaurant', time: '19:30', rating: 4, ratingNote: 'Pizza top' })]);
    assert.equal(data.sync.minRev, 19, 'nur die Restaurantzeile selbst, keine neue Revision'); assert.doesNotThrow(() => validate(data));
    const cleared = merge(data, [op('purchases', 'r1', { rating: null, ratingNote: '' }, '2026-11-05T12:00:00.000Z')]);
    assert.equal(cleared.purchases[0].rating, null); assert.equal(hasRating(cleared.purchases[0]), false); assert.doesNotThrow(() => validate(cleared));
    for (const rating of [0, 6, 2.5, '4']) { const bad = structuredClone(data); bad.purchases[0].rating = rating; assert.throws(() => validate(bad), /Bewertung/); }
    const long = structuredClone(data); long.purchases[0].ratingNote = 'x'.repeat(201); assert.throws(() => validate(long), /Bewertung/);
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
    // Café und Bar aus 2.170 bleiben gültig und brauchen keine neuere App
    const legacy = merge(next, [op('purchases', 'c1', { date: '2026-11-04', cents: 300, source: 'hand', note: '', dining: 'cafe' })]);
    assert.equal(legacy.sync.minRev, 19);
  });
  test('Getränke heben die Datenrevision auf 20: Version 2.170 kennt den Wert nicht und soll aufs Aktualisieren verweisen', () => {
    assert.ok(SCHEMA_REV >= 20);
    const data = merge(emptyData(), [op('purchases', 'g1', { date: '2026-11-04', cents: 450, source: 'hand', note: '', storeName: 'Café Lotte', dining: 'drinks', time: '15:10' })]);
    assert.equal(data.sync.minRev, 20); assert.doesNotThrow(() => validate(data));
    assert.throws(() => validate({ ...data, sync: { ...data.sync, minRev: SCHEMA_REV + 1 } }), /zu alt/);
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
