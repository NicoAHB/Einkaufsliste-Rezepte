import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { active, emptyData, merge, operation, validate } from '../data.js';
import { compact, POLICY } from '../compact.js';
import { DEFAULT_NOTE, budgetStatus, compareTotals, dayLabel, duplicatePurchase, estimateOf, possibleDuplicates, estimateVerdict, firstMonth, formatAmount, lastDay, latestMonth, monthLabel, monthName, monthOf, noteSuggestions, parseAmount, purchaseFields, purchasesOf, receiptAmount, recentMonths, shiftMonth, storeNameOf, summarize, validMonth } from '../spending.js';
import { parseReceipt } from '../receipt.js';

const make = (id, patch, at = '2026-03-01T10:00:00.000Z') => operation('purchases', id, patch, 'Nico', at);
const row = (id, date, cents, extra = {}) => ({ id, date, cents, createdAt: `${date}T10:00:00.000Z`, ...extra });

describe('Betrag lesen', () => {
  test('gängige Schreibweisen ergeben Cent', () => {
    const cases = { '23,45': 2345, '23.45': 2345, '7,5': 750, '7': 700, '0,99': 99, '1.234,56': 123456, '1,234.56': 123456, '1.234': 123400, '€ 12': 1200, '12 EUR': 1200, '12,00 €': 1200,
      '  45,10 ': 4510, '99.999,99': 9999999, '12 euro': 1200 };
    for (const [input, cents] of Object.entries(cases)) assert.equal(parseAmount(input), cents, input);
  });
  test('Unsinn wird mit einer deutschen Meldung abgelehnt', () => {
    for (const bad of ['', '   ', 'abc', '12,345', '1,2,3', '--5', '12 Äpfel', null, undefined, '1.23.456']) assert.throws(() => parseAmount(bad), /Betrag/, String(bad));
    assert.throws(() => parseAmount('0'), /größer als 0/);
    assert.throws(() => parseAmount('0,00'), /größer als 0/);
    assert.throws(() => parseAmount('-5'), /Betrag/);
    assert.throws(() => parseAmount('100.000,00'), /zu groß/);
    assert.throws(() => parseAmount('1234567,89'), /Betrag/);
  });
  test('formatAmount ist die Umkehrung ohne Tausenderpunkt', () => {
    assert.equal(formatAmount(2345), '23,45');
    assert.equal(formatAmount(123400), '1234,00');
    assert.equal(formatAmount(5), '0,05');
    for (const cents of [1, 99, 100, 2345, 123456, 9999999]) assert.equal(parseAmount(formatAmount(cents)), cents);
  });
});

describe('Eintrag prüfen', () => {
  test('gültige Eingaben werden bereinigt', () => {
    const fields = purchaseFields({ amount: '23,45', date: '2026-05-10', storeId: 's1', storeName: '  Edeka   Nord ', note: '  Wocheneinkauf  ', source: 'bon' }, '2026-05-10');
    assert.deepEqual(fields, { date: '2026-05-10', cents: 2345, source: 'bon', storeId: 's1', storeName: 'Edeka Nord', note: 'Wocheneinkauf' });
    assert.deepEqual(purchaseFields({ amount: '5', date: '2026-05-10' }, '2026-05-10'), { date: '2026-05-10', cents: 500, source: 'hand', note: '' });
    assert.equal(purchaseFields({ amount: '5', date: '2026-05-10', source: 'unsinn' }, '2026-05-10').source, 'hand');
    assert.equal(purchaseFields({ amount: '5', date: '2026-05-10', note: 'x'.repeat(300) }, '2026-05-10').note.length, 120);
  });
  test('Datum: ungültig oder zu weit in der Zukunft wird abgelehnt, morgen ist erlaubt', () => {
    assert.throws(() => purchaseFields({ amount: '5', date: '' }, '2026-05-10'), /gültiges Datum/);
    assert.throws(() => purchaseFields({ amount: '5', date: '2026-02-30' }, '2026-05-10'), /gültiges Datum/);
    assert.throws(() => purchaseFields({ amount: '5', date: '2026-05-12' }, '2026-05-10'), /Zukunft/);
    assert.equal(purchaseFields({ amount: '5', date: '2026-05-11' }, '2026-05-10').date, '2026-05-11');
    assert.equal(purchaseFields({ amount: '5', date: '2026-06-01' }, '2026-05-31').date, '2026-06-01', 'morgen über die Monatsgrenze');
    assert.throws(() => purchaseFields({ amount: 'abc', date: '2026-05-10' }, '2026-05-10'), /Betrag/);
  });
});

describe('Betrag aus dem Kassenbon', () => {
  const bon = `EDEKA Nord\nMilch 1,29\nBrot 2,49\nSUMME 3,78\n12.05.2026`;
  test('die Summe laut Bon gewinnt, sonst die Summe der Zeilen, sonst nichts', () => {
    assert.deepEqual(receiptAmount(parseReceipt(bon)), { cents: 378, how: 'bon' });
    assert.deepEqual(receiptAmount({ items: [{}], total: null, sum: 500 }), { cents: 500, how: 'zeilen' });
    assert.equal(receiptAmount({ items: [], total: null, sum: 0 }), null);
    assert.equal(receiptAmount(parseReceipt('nur Text ohne Zahlen')), null);
    assert.equal(receiptAmount(null), null);
    assert.equal(receiptAmount({ items: [{}], total: 0, sum: 0 }), null);
  });
});

describe('Monate', () => {
  test('Monate verschieben, auch über Jahresgrenzen', () => {
    assert.equal(shiftMonth('2026-05', -1), '2026-04');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-03', -15), '2024-12');
    assert.equal(shiftMonth('2026-03', 0), '2026-03');
  });
  test('gültige Monate, Namen und letzter Tag', () => {
    assert.ok(validMonth('2026-05') && validMonth('2026-12'));
    for (const bad of ['2026-00', '2026-13', '2026-5', '26-05', '', 'x', null, undefined]) assert.equal(validMonth(bad), false, String(bad));
    assert.equal(monthOf('2026-05-17'), '2026-05');
    assert.equal(monthName('2026-05'), 'Mai');
    assert.equal(monthLabel('2026-05'), 'Mai 2026');
    assert.equal(lastDay('2026-02'), '2026-02-28');
    assert.equal(lastDay('2028-02'), '2028-02-29');
    assert.equal(lastDay('2026-12'), '2026-12-31');
    assert.equal(lastDay('2026-04'), '2026-04-30');
    assert.match(dayLabel('2026-05-10'), /So/);
  });
});

describe('Auswertung', () => {
  const stores = [{ id: 'e', name: 'Edeka' }, { id: 'l', name: 'Lidl' }];
  const rows = [row('a', '2026-05-02', 2000, { storeId: 'e' }), row('b', '2026-05-09', 3000, { storeId: 'l' }), row('c', '2026-05-20', 1050, { storeId: 'e' }),
    row('d', '2026-05-21', 500), row('f', '2026-04-15', 4000, { storeId: 'e' }), row('g', '2026-05-09', 100, { storeId: 'l' }),
    row('h', '2026-05-25', 700, { storeId: 'weg', storeName: 'Alter Markt' })];
  test('Summe, Anzahl, Durchschnitt und Aufteilung nach Geschäft', () => {
    const may = summarize(rows, '2026-05', stores);
    assert.equal(may.total, 7350);
    assert.equal(may.count, 6);
    assert.equal(may.average, 1225);
    assert.deepEqual(may.byStore.map(group => [group.name, group.total, group.count]), [['Lidl', 3100, 2], ['Edeka', 3050, 2], ['Alter Markt', 700, 1], ['Ohne Geschäft', 500, 1]]);
    assert.ok(Math.abs(may.byStore.reduce((sum, group) => sum + group.share, 0) - 1) < 1e-9);
    assert.deepEqual(summarize(rows, '2026-03', stores), { month: '2026-03', total: 0, count: 0, average: 0, byStore: [], list: [] });
  });
  test('gelöschte Geschäfte behalten den gemerkten Namen, umbenannte zeigen den neuen', () => {
    const renamed = summarize(rows, '2026-05', [{ id: 'e', name: 'Edeka Süd' }, { id: 'l', name: 'Lidl' }]);
    assert.ok(renamed.byStore.some(group => group.name === 'Edeka Süd'));
    assert.equal(storeNameOf(rows[0], stores), 'Edeka');
    assert.equal(storeNameOf(rows[6], stores), 'Alter Markt');
    assert.equal(storeNameOf(rows[3], stores), '');
  });
  test('die Liste eines Monats ist neueste zuerst, gleicher Tag: zuletzt erfasst zuerst', () => {
    const list = purchasesOf(rows, '2026-05');
    assert.deepEqual(list.map(entry => entry.id), ['h', 'd', 'c', 'g', 'b', 'a']);
    const same = purchasesOf([{ ...row('x', '2026-05-09', 100), createdAt: '2026-05-09T08:00:00.000Z' }, { ...row('y', '2026-05-09', 200), createdAt: '2026-05-09T09:00:00.000Z' }], '2026-05');
    assert.deepEqual(same.map(entry => entry.id), ['y', 'x']);
  });
  test('Vergleich mit dem Vormonat', () => {
    assert.deepEqual(compareTotals(7350, 4000), { diff: 3350, percent: 84 });
    assert.deepEqual(compareTotals(3000, 4000), { diff: -1000, percent: -25 });
    assert.deepEqual(compareTotals(4000, 4000), { diff: 0, percent: 0 });
    assert.deepEqual(compareTotals(100, 0), { diff: 100, percent: null });
  });
  test('die letzten sechs Monate bis einschließlich dem gewählten, über die Jahresgrenze', () => {
    const months = recentMonths(rows, '2026-05', 6);
    assert.deepEqual(months.map(entry => entry.month), ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05']);
    assert.deepEqual(months.map(entry => entry.total), [0, 0, 0, 0, 4000, 7350]);
    assert.equal(months.length, 6);
    assert.ok(months.every(entry => typeof entry.label === 'string' && entry.label.length > 0));
  });
  test('frühester und spätester Monat begrenzen die Pfeile', () => {
    assert.equal(firstMonth(rows, '2026-06'), '2026-04');
    assert.equal(firstMonth([], '2026-06'), '2026-06');
    assert.equal(latestMonth(rows, '2026-03'), '2026-05');
    assert.equal(latestMonth([], '2026-06'), '2026-06');
  });
});

describe('Ausgaben in der gemeinsamen Datei', () => {
  test('ältere Dateien ohne Ausgaben bleiben gültig, Einträge werden angelegt, geändert, gelöscht', () => {
    const old = emptyData(); delete old.purchases;
    assert.doesNotThrow(() => validate(old));
    let data = merge(old, [make('p1', { date: '2026-05-02', cents: 2345, source: 'hand', note: '' })]);
    assert.equal(active(data.purchases).length, 1);
    data = merge(data, [make('p1', { cents: 3000, storeId: 'e', storeName: 'Edeka' }, '2026-03-02T10:00:00.000Z')]);
    assert.equal(data.purchases[0].cents, 3000);
    data = merge(data, [make('p1', { cents: 1 }, '2026-03-01T12:00:00.000Z')]);
    assert.equal(data.purchases[0].cents, 3000, 'eine ältere Änderung überschreibt nichts');
    data = merge(data, [make('p1', { deletedAt: '2026-03-03T10:00:00.000Z' }, '2026-03-03T10:00:00.000Z')]);
    assert.equal(active(data.purchases).length, 0);
  });
  test('zwei Geräte tragen gleichzeitig ein: beide Einträge bleiben, in jeder Reihenfolge', () => {
    const a = make('a', { date: '2026-05-02', cents: 1000 }, '2026-05-02T10:00:00.000Z'), b = make('b', { date: '2026-05-02', cents: 2000 }, '2026-05-02T10:00:01.000Z');
    const one = merge(emptyData(), [a, b]), two = merge(emptyData(), [b, a]);
    assert.deepEqual(one.purchases.map(r => [r.id, r.cents]).sort(), two.purchases.map(r => [r.id, r.cents]).sort());
    assert.equal(one.purchases.length, 2);
  });
  test('Felder gleichzeitig geändert: jedes Feld für sich, das jüngere gewinnt', () => {
    const base = merge(emptyData(), [make('p', { date: '2026-05-02', cents: 1000, note: '' }, '2026-05-02T10:00:00.000Z')]);
    const next = merge(base, [make('p', { cents: 1500 }, '2026-05-03T10:00:00.000Z'), make('p', { note: 'Fest' }, '2026-05-03T10:00:01.000Z')]);
    assert.equal(next.purchases[0].cents, 1500);
    assert.equal(next.purchases[0].note, 'Fest');
  });
  test('ungültige Beträge werden nicht übernommen', () => {
    const bads = [{ date: '2026-02-30', cents: 100 }, { date: '2026-05-02', cents: 0 }, { date: '2026-05-02', cents: -5 }, { date: '2026-05-02', cents: 1.5 }, { date: '2026-05-02', cents: '12' },
      { date: '2026-05-02', cents: 100000000 }, { date: '2026-05-02', cents: 100, source: 'foto' }, { date: '2026-05-02', cents: 100, storeId: 4 }, { date: '2026-05-02', cents: 100, note: 'x'.repeat(201) },
      { date: '2026-05-02', cents: 100, storeName: 'x'.repeat(81) }];
    for (const bad of bads) assert.equal(merge(emptyData(), [make('p', bad)]).purchases.length, 0, JSON.stringify(bad));
    const good = merge(emptyData(), [make('p', { date: '2026-05-02', cents: 100 })]);
    for (const bad of bads.slice(1, 3)) assert.throws(() => merge(good, [make('p', bad, '2026-06-01T00:00:00.000Z')]), /Ungültiger Einkaufsbetrag/);
  });
});

describe('Aufräumen', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  test('Einträge älter als 36 Monate und lange gelöschte werden entfernt, neuere bleiben', () => {
    assert.equal(POLICY.purchaseMonths, 36);
    let data = merge(emptyData(), [make('alt', { date: '2022-01-15', cents: 100 }), make('neu', { date: '2026-05-15', cents: 200 }), make('grenze', { date: '2023-07-01', cents: 300 }),
      make('weg', { date: '2026-04-01', cents: 400 }), make('weg', { deletedAt: '2026-01-01T00:00:00.000Z' }, '2026-01-01T00:00:00.000Z')]);
    const result = compact(data, now);
    assert.equal(result.removed.purchases, 2);
    assert.deepEqual(result.data.purchases.map(r => r.id).sort(), ['grenze', 'neu']);
  });
  test('eine Aufräum-Regel ohne Angabe zu Ausgaben (ältere Aufrufe) fällt auf die 36 Monate zurück', () => {
    const { purchaseMonths, ...partial } = POLICY;
    const data = merge(emptyData(), [make('alt', { date: '2022-01-15', cents: 100 }), make('neu', { date: '2026-05-15', cents: 200 })]);
    assert.deepEqual(compact(data, now, partial).data.purchases.map(r => r.id), ['neu']);
  });
  test('ohne Ausgaben entsteht keine leere Sammlung, und die Zahl in removed ist immer da', () => {
    const bare = emptyData(); delete bare.purchases; bare.sync.applied = Array.from({ length: 700 }, (_, index) => `op-${index}`);
    const result = compact(bare, now);
    assert.equal(result.removed.purchases, 0);
    assert.equal(result.data.purchases, undefined);
  });
});

describe('Notiz-Vorschläge', () => {
  const note = (text, date = '2026-05-10', createdAt = `${date}T10:00:00.000Z`) => ({ note: text, date, createdAt });
  test('ohne Verlauf: „Wocheneinkauf“ zuerst, dann feste Ideen, höchstens zwölf, keine Doppelten', () => {
    const list = noteSuggestions([]);
    assert.equal(DEFAULT_NOTE, 'Wocheneinkauf');
    assert.deepEqual(list.slice(0, 4), ['Wocheneinkauf', 'Großeinkauf', 'Zwischendurch', 'Getränke']);
    assert.ok(list.includes('Wochenmarkt') && list.includes('Geschenk'), 'auch die späteren Ideen sind da (die Liste in der App scrollt)');
    assert.equal(list.length, 12);
    assert.equal(new Set(list.map(text => text.toLocaleLowerCase('de'))).size, list.length);
  });
  test('Drogerien bekommen „Drogerie“ gleich nach dem Standard, andere Geschäfte nicht', () => {
    assert.deepEqual(noteSuggestions([], 'Rossmann').slice(0, 2), ['Wocheneinkauf', 'Drogerie']);
    assert.deepEqual(noteSuggestions([], 'dm').slice(0, 2), ['Wocheneinkauf', 'Drogerie']);
    assert.equal(noteSuggestions([], 'Edeka')[1], 'Großeinkauf');
    assert.equal(noteSuggestions([], '')[1], 'Großeinkauf');
    assert.equal(noteSuggestions([], 'Rossmann').filter(text => text === 'Drogerie').length, 1);
  });
  test('eigene Notizen: häufigste zuerst, bei Gleichstand die zuletzt benutzte; Schreibweisen werden zusammengefasst', () => {
    const rows = [note('Grillabend'), note('grillabend', '2026-05-12'), note('Grillabend', '2026-05-14'), note('Geburtstag', '2026-04-01'), note('Kuchen', '2026-05-20'),
      note('Wocheneinkauf'), note('wocheneinkauf'), note(''), note('   '), { date: '2026-05-01' }, note('x'.repeat(31))];
    const list = noteSuggestions(rows);
    assert.deepEqual(list.slice(0, 5), ['Wocheneinkauf', 'Grillabend', 'Kuchen', 'Geburtstag', 'Großeinkauf']);
    assert.ok(!list.some(text => text.length > 30));
    assert.equal(list.filter(text => text.toLocaleLowerCase('de') === 'wocheneinkauf').length, 1);
    assert.equal(list.length, 12);
    assert.ok(list.includes('Grillabend') && !list.includes('grillabend'), 'die jüngste Schreibweise gilt');
  });
  test('nur die vier häufigsten eigenen Notizen, der Rest bleibt bei den festen Ideen; das Limit gilt', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((text, index) => Array.from({ length: 6 - index }, () => note(text)));
    assert.deepEqual(noteSuggestions(rows, '', 8).slice(0, 5), ['Wocheneinkauf', 'A', 'B', 'C', 'D']);
    assert.ok(!noteSuggestions(rows).includes('E'));
    assert.equal(noteSuggestions(rows, '', 3).length, 3);
    assert.deepEqual(noteSuggestions(rows, '', 1), ['Wocheneinkauf']);
  });
});

describe('Geschätzt gegen bezahlt', () => {
  test('die Schätzung wird nur mit einer gültigen Zahl gespeichert', () => {
    const base = { amount: '23,45', date: '2026-05-10' };
    assert.equal(purchaseFields({ ...base, estimate: 2000 }, '2026-05-10').estimate, 2000);
    for (const bad of [0, -5, 1.5, NaN, '20', null, undefined, 100000000]) assert.ok(!('estimate' in purchaseFields({ ...base, estimate: bad }, '2026-05-10')), String(bad));
  });
  test('Punkt: grün im Rahmen oder günstiger, rot ab mehr als 5 % (mindestens 0,50 €) darüber, nichts ohne Schätzung', () => {
    assert.equal(estimateVerdict(2345, undefined), null);
    assert.equal(estimateVerdict(2345, 0), null);
    assert.deepEqual(estimateVerdict(1500, 2000), { diff: -500, level: 'ok' }, 'günstiger');
    assert.deepEqual(estimateVerdict(2000, 2000), { diff: 0, level: 'ok' });
    assert.deepEqual(estimateVerdict(2100, 2000), { diff: 100, level: 'ok' }, '5 % darüber: noch im Rahmen');
    assert.equal(estimateVerdict(2101, 2000).level, 'over', 'mehr als 5 % darüber');
    assert.equal(estimateVerdict(2050, 500).level, 'over');
    assert.equal(estimateVerdict(540, 500).level, 'ok', 'bei kleinen Beträgen zählen erst 0,50 € mehr');
    assert.equal(estimateVerdict(551, 500).level, 'over');
  });
  test('Schätzung der Artikel: nur mit Preisen für mindestens 70 %', () => {
    const item = (name, price) => ({ name, quantity: 2, unit: 'Stück', price, onSale: false });
    const priced = price => ({ cents: price, quantity: 1, unit: 'Stück' });
    assert.equal(estimateOf([item('A', priced(100)), item('B', priced(250))]), 700);
    assert.equal(estimateOf([item('A', priced(100)), item('B', priced(100)), item('C', undefined)]), 0, '2 von 3 (67 %): zu wenig');
    assert.equal(estimateOf([item('A', priced(100)), item('B', priced(100)), item('C', priced(100)), item('D', undefined)]), 600, '3 von 4 (75 %)');
    assert.equal(estimateOf([]), 0);
    assert.equal(estimateOf([item('A', undefined)]), 0);
  });
  test('Schätzung ist im Datenmodell nur als ganze positive Zahl gültig und überlebt das Zusammenführen', () => {
    for (const bad of [0, -1, 1.5, '20', 100000000]) assert.equal(merge(emptyData(), [make('p', { date: '2026-05-02', cents: 100, estimate: bad })]).purchases.length, 0, String(bad));
    const data = merge(emptyData(), [make('p', { date: '2026-05-02', cents: 100, estimate: 90 }), make('p', { cents: 120 }, '2026-05-03T00:00:00.000Z')]);
    assert.deepEqual([data.purchases[0].cents, data.purchases[0].estimate], [120, 90], 'Betrag ändern lässt die Schätzung stehen');
  });
});

describe('Monatsbudget', () => {
  test('Stand: ohne Budget null, ok unter 80 %, Warnung ab 80 %, überschritten über 100 %', () => {
    assert.equal(budgetStatus(5000, 0), null);
    assert.equal(budgetStatus(5000, undefined), null);
    assert.equal(budgetStatus(5000, -1), null);
    assert.deepEqual(budgetStatus(0, 40000), { percent: 0, left: 40000, level: 'ok' });
    assert.deepEqual(budgetStatus(31999, 40000), { percent: 80, left: 8001, level: 'ok' }, 'knapp unter 80 %');
    assert.equal(budgetStatus(32000, 40000).level, 'warn');
    assert.equal(budgetStatus(40000, 40000).level, 'warn', 'genau 100 % ist noch nicht überschritten');
    assert.deepEqual(budgetStatus(41230, 40000), { percent: 103, left: -1230, level: 'over' });
  });
  test('das Budget liegt als Zeile „monthly“ in der gemeinsamen Datei: anlegen, ändern, entfernen (0), ungültiges wird abgelehnt', () => {
    const old = emptyData(); delete old.budgets;
    assert.doesNotThrow(() => validate(old));
    const budget = (patch, at) => operation('budgets', 'monthly', patch, 'Nico', at);
    let data = merge(old, [budget({ cents: 40000 }, '2026-05-01T10:00:00.000Z')]);
    assert.equal(data.budgets.length, 1);
    assert.equal(data.budgets[0].cents, 40000);
    data = merge(data, [budget({ cents: 50000 }, '2026-05-02T10:00:00.000Z'), budget({ cents: 10000 }, '2026-05-01T12:00:00.000Z')]);
    assert.equal(data.budgets[0].cents, 50000, 'die jüngere Fassung gewinnt, eine ältere überschreibt nichts');
    data = merge(data, [budget({ cents: 0 }, '2026-05-03T10:00:00.000Z')]);
    assert.equal(data.budgets[0].cents, 0, '0 heißt: kein Budget');
    for (const bad of [-1, 1.5, '400', 100000000, null]) assert.equal(merge(emptyData(), [budget({ cents: bad }, '2026-05-01T10:00:00.000Z')]).budgets.length, 0, String(bad));
    assert.throws(() => merge(data, [budget({ cents: -5 }, '2026-06-01T00:00:00.000Z')]), /Ungültiges Budget/);
  });
  test('zwei Geräte setzen gleichzeitig ein Budget: es gibt nur eine Zeile, der spätere Wert gilt, in jeder Reihenfolge', () => {
    const a = operation('budgets', 'monthly', { cents: 30000 }, 'Nico', '2026-05-01T10:00:00.000Z'), b = operation('budgets', 'monthly', { cents: 45000 }, 'Anna', '2026-05-01T10:00:05.000Z');
    for (const order of [[a, b], [b, a]]) { const data = merge(emptyData(), order); assert.equal(data.budgets.length, 1); assert.equal(data.budgets[0].cents, 45000); }
  });
  test('Aufräumen behält das Budget und führt die neue Sammlung in removed auf', () => {
    const data = merge(emptyData(), [operation('budgets', 'monthly', { cents: 40000 }, 'Nico', '2026-01-01T10:00:00.000Z')]);
    const result = compact(data, new Date('2026-06-01T00:00:00.000Z'));
    assert.equal(result.removed.budgets, 0);
    assert.deepEqual(result.data.budgets.map(row => row.cents), [40000]);
    const bare = emptyData(); delete bare.budgets; bare.sync.applied = Array.from({ length: 700 }, (_, index) => `op-${index}`);
    assert.equal(compact(bare, new Date('2026-06-01T00:00:00.000Z')).data.budgets, undefined, 'ohne Budget entsteht keine leere Sammlung');
  });
});

// Version 2.51: Ausgaben gegen doppelte Erfassung schützen
describe('Doppelt erfasst?', () => {
  const rows = [row('a', '2026-10-27', 4000, { storeId: 'store-edeka' }), row('b', '2026-10-27', 1550), row('c', '2026-10-26', 4000, { storeId: 'store-edeka' }), row('d', '2026-10-27', 4000, { storeId: 'store-edeka', deletedAt: '2026-10-28T10:00:00.000Z' })];
  test('gleicher Tag, gleiches Geschäft und gleicher Betrag sind ein Hinweis', () => {
    assert.equal(duplicatePurchase(rows, { date: '2026-10-27', cents: 4000, storeId: 'store-edeka' })?.id, 'a');
    assert.equal(duplicatePurchase(rows, { date: '2026-10-27', cents: 1550 })?.id, 'b', 'beide ohne Geschäft');
  });
  test('anderer Tag, anderes Geschäft, anderer Betrag, gelöschte Einträge und der eigene Eintrag sind kein Hinweis', () => {
    for (const fields of [{ date: '2026-10-28', cents: 4000, storeId: 'store-edeka' }, { date: '2026-10-27', cents: 4000, storeId: 'store-lidl' }, { date: '2026-10-27', cents: 4001, storeId: 'store-edeka' },
      { date: '2026-10-27', cents: 1550, storeId: 'store-edeka' }, { date: '2026-10-27', cents: 4000 }]) assert.equal(duplicatePurchase(rows, fields), null, JSON.stringify(fields));
    assert.equal(duplicatePurchase(rows, { date: '2026-10-27', cents: 4000, storeId: 'store-edeka' }, 'a'), null, 'beim Ändern zählt der Eintrag selbst nicht');
    assert.equal(duplicatePurchase([rows[3]], { date: '2026-10-27', cents: 4000, storeId: 'store-edeka' }), null, 'gelöscht');
  });
  test('Einträge mit Zwilling für den Hinweis in der Liste', () => {
    assert.deepEqual([...possibleDuplicates([...rows, row('e', '2026-10-27', 4000, { storeId: 'store-edeka' }), row('f', '2026-10-27', 1550)])].sort(), ['a', 'b', 'e', 'f']);
    assert.deepEqual([...possibleDuplicates(rows)], []);
  });
});
