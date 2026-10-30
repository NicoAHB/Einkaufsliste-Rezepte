import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { active, emptyData, merge, operation, SCHEMA_REV, validate } from '../data.js';
import { compact, POLICY } from '../compact.js';
import { buyerKey, buyerNameOf, memberName, ownMember, prepareMember, renameMember } from '../family.js';
import { budgetStatus, duplicatePurchase, filterPurchases, fullMonth, periodBounds, possibleDuplicates, purchaseFields, purchaseValue, recentMonths, spendingCsv, summarizePeriod } from '../spending.js';

const at = '2026-10-01T12:00:00.000Z';
const op = (collection, id, patch, time = at, actor = 'Gerät') => operation(collection, id, patch, actor, time);
const member = name => { const m = prepareMember(name); return { id: m.id, ...m.change.patch }; };
const nico = member('Nico'), anna = member('Anna');
const buy = (id, date, cents, buyerId = nico.id, extra = {}) => ({ id, date, cents, buyerId, buyerName: buyerId === nico.id ? 'Nico' : 'Anna', ...extra });

describe('Feste Familienzuordnung', () => {
  test('Schreibweise, Umlaute und Leerzeichen ergeben offline dieselbe ID', () => {
    assert.equal(prepareMember('  JÖRG  Müller ').id, prepareMember('jörg müller').id);
    assert.equal(memberName('Nico   von Felde'), 'Nico von Felde');
    assert.match(prepareMember("D'Angelo").id, /^member-/);
    assert.throws(() => memberName('  '), /Namen/);
    assert.throws(() => memberName('x'.repeat(31)), /Namen/);
  });
  test('Umbenennen bewahrt die ID, belegte frühere Namen bekommen eine neue ID', () => {
    const change = renameMember(nico.id, 'Nicolas', [nico, anna]);
    assert.equal(change.id, nico.id);
    const renamed = { ...nico, ...change.patch };
    assert.equal(ownMember([renamed], 'Nico', nico.id).name, 'Nicolas');
    assert.notEqual(prepareMember('Nico', [renamed]).id, nico.id);
    assert.throws(() => renameMember(nico.id, ' anna ', [nico, anna]), /bereits/);
  });
  test('Archivierung und Namens-Snapshot bewahren frühere Käufe; alte Zeilen werden nie geraten', () => {
    assert.equal(prepareMember('Nico', [{ ...nico, archived: true }]).change, null);
    assert.equal(buyerNameOf({ buyerId: nico.id, buyerName: 'Alt' }, [{ ...nico, name: 'Nicolas', archived: true }]), 'Nicolas');
    assert.equal(buyerNameOf({ buyerId: nico.id, buyerName: 'Nico' }, []), 'Nico');
    assert.equal(buyerNameOf({ createdBy: 'Nico' }, [nico]), 'Nicht zugeordnet');
    assert.equal(buyerKey({}), 'unassigned');
  });
  test('zwei Offline-Geräte legen dieselbe Person ohne doppelte Zeile an', () => {
    const a = prepareMember('Nico'), b = prepareMember('nico');
    const data = merge(emptyData(), [op('members', a.id, a.change.patch), op('members', b.id, b.change.patch, '2026-10-01T12:00:01.000Z')]);
    assert.equal(data.members.length, 1);
    assert.equal(data.members[0].id, nico.id);
    assert.equal(data.sync.minRev, 6);
  });
  test('Namensänderung und anderer Einkaufsbetrag werden feldweise zusammengeführt', () => {
    const base = merge(emptyData(), [op('members', nico.id, nico), op('purchases', 'p', buy('p', '2026-10-01', 1000))]);
    const a = op('members', nico.id, { name: 'Nicolas' }, '2026-10-02T12:00:00.000Z');
    const b = op('purchases', 'p', { cents: 1200 }, '2026-10-02T12:00:01.000Z', 'Anna');
    for (const ops of [[a, b], [b, a]]) {
      const data = merge(base, ops); assert.equal(data.purchases[0].buyerId, nico.id);
      assert.equal(data.purchases[0].cents, 1200); assert.equal(buyerNameOf(data.purchases[0], data.members), 'Nicolas');
    }
  });
  test('unabhängige Änderungen an Person und Betrag gehen auf beiden Geräten nicht verloren', () => {
    const base = merge(emptyData(), [op('purchases', 'p', buy('p', '2026-10-01', 1000))]);
    const person = op('purchases', 'p', { buyerId: anna.id, buyerName: 'Anna' }, '2026-10-02T12:00:00.000Z');
    const amount = op('purchases', 'p', { cents: 2400 }, '2026-10-02T12:00:01.000Z');
    const data = merge(base, [person, amount]); assert.equal(data.purchases[0].buyerId, anna.id); assert.equal(data.purchases[0].cents, 2400);
  });
});

describe('Zeiträume, Personen und Rückerstattungen', () => {
  const rows = [buy('a', '2026-09-30', 500), buy('b', '2026-10-01', 1000), buy('c', '2026-10-15', 2000, anna.id),
    buy('d', '2026-10-31', 3000, null), buy('e', '2026-11-01', 700), buy('f', '2026-10-03', 400, anna.id, { kind: 'refund' }),
    buy('gone', '2026-10-03', 9000, anna.id, { deletedAt: at })];
  test('Datumsgrenzen sind einschließlich, Schalttag und vollständiger Monat stimmen', () => {
    assert.deepEqual(periodBounds('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
    assert.equal(fullMonth({ from: '2024-02-01', to: '2024-02-29' }), '2024-02');
    assert.equal(fullMonth({ from: '2024-02-02', to: '2024-02-29' }), null);
    assert.deepEqual(filterPurchases(rows, { from: '2026-10-01', to: '2026-10-31' }).map(r => r.id), ['d', 'c', 'f', 'b']);
    for (const period of ['2026-13', { from: '2026-02-30', to: '2026-03-01' }, { from: '2026-10-10', to: '2026-10-01' }]) assert.throws(() => periodBounds(period), /Zeitraum|Anfangsdatum/);
  });
  test('Familiengesamt entspricht genau den Personensummen inklusive Nicht zugeordnet', () => {
    const result = summarizePeriod(rows, '2026-10', [], [nico, anna]);
    assert.equal(result.total, 5600); assert.equal(result.byPerson.reduce((sum, p) => sum + p.total, 0), result.total);
    assert.equal(result.gross, 6000); assert.equal(result.refunds, 400); assert.equal(result.purchaseCount, 3); assert.equal(result.refundCount, 1); assert.equal(result.average, 2000);
    assert.equal(result.byPerson.find(p => p.id === 'unassigned').name, 'Nicht zugeordnet');
    assert.equal(summarizePeriod(rows, '2026-10', [], [nico, anna], anna.id).total, 1600);
    assert.deepEqual(filterPurchases(rows, '2026-10', 'unassigned').map(r => r.id), ['d']);
  });
  test('reine Retouren ergeben negative Ausgaben, Diagramm und Budget bleiben korrekt', () => {
    const refund = buy('r', '2026-10-03', 800, nico.id, { kind: 'refund' });
    assert.equal(purchaseValue(refund), -800); assert.equal(summarizePeriod([refund], '2026-10').total, -800);
    assert.equal(recentMonths([refund], '2026-10', 1)[0].total, -800);
    assert.deepEqual(budgetStatus(-800, 50000), { percent: 0, left: 50800, level: 'ok' });
  });
  test('Duplikatwarnung gilt personenübergreifend, Einkauf und Retoure sind verschieden', () => {
    const a = buy('1', '2026-10-01', 1000, nico.id), b = buy('2', '2026-10-01', 1000, anna.id), r = { ...b, id: 'r', kind: 'refund' };
    assert.equal(duplicatePurchase([a], b).id, a.id); assert.equal(duplicatePurchase([a], r), null);
    assert.deepEqual([...possibleDuplicates([a, b, r])].sort(), ['1', '2']);
  });
  test('manuell und vom Bon speichern dieselbe feste Person, leere Zuordnung ist ausdrücklich möglich', () => {
    for (const source of ['hand', 'bon']) {
      const row = purchaseFields({ amount: '12,30', date: '2026-10-02', buyerId: nico.id, buyerName: 'Nico', source, kind: 'refund' }, '2026-10-30');
      assert.equal(row.buyerId, nico.id); assert.equal(purchaseValue(row), -1230); assert.equal(row.source, source);
    }
    assert.equal(purchaseFields({ amount: '1', date: '2026-10-02', buyerId: null }, '2026-10-30').buyerName, '');
    assert.throws(() => purchaseFields({ amount: '1', date: '2026-10-02', buyerId: '<x>' }, '2026-10-30'), /Person/);
    assert.throws(() => purchaseFields({ amount: '1', date: '2026-10-02', kind: 'test' }, '2026-10-30'), /Einkauf/);
  });
  test('CSV berücksichtigt Auswahl, Rückerstattung, Umlaute, Anführungszeichen und Formelzeichen', () => {
    const selected = filterPurchases([...rows, buy('csv', '2026-10-20', 1234, anna.id, { kind: 'refund', note: '=1+1; "Test"', storeName: 'Äpfel & Co' })], '2026-10', anna.id);
    const csv = spendingCsv(selected, [], [nico, { ...anna, name: 'Annegret' }]);
    assert.equal(csv.charCodeAt(0), 0xfeff); assert.match(csv, /"-12,34"/); assert.match(csv, /"Annegret"/); assert.match(csv, /"Äpfel & Co"/);
    assert.ok(csv.includes('"\'=1+1; ""Test"""')); assert.ok(!csv.includes('"Nico"')); assert.equal(csv.split('\r\n').filter(Boolean).length, 4);
  });
});

describe('Abwärtskompatibilität und dauerhafte Historie', () => {
  test('alte Dateien werden ohne automatisches Zuordnen gelesen', () => {
    const old = emptyData(); delete old.members;
    old.purchases = [{ ...buy('alt', '2018-01-01', 500, undefined), createdAt: at, updatedAt: at, deletedAt: null }]; delete old.purchases[0].buyerId; delete old.purchases[0].buyerName;
    assert.doesNotThrow(() => validate(old)); const next = merge(old, []);
    assert.deepEqual(next.members, []); assert.equal(next.purchases[0].buyerId, undefined); assert.equal(next.sync.minRev, 6);
    assert.equal(buyerNameOf(next.purchases[0], next.members), 'Nicht zugeordnet');
  });
  test('ungültige Familien-/Ausgabenfelder werden abgefangen', () => {
    for (const bad of [{ name: '' }, { name: 'x'.repeat(31) }, { name: 'Nico', archived: 'ja' }]) assert.equal(merge(emptyData(), [op('members', 'm1', bad)]).members.length, 0);
    const base = merge(emptyData(), [op('purchases', 'p', buy('p', '2026-10-01', 1000))]);
    for (const patch of [{ buyerId: 4 }, { buyerName: 'x'.repeat(31) }, { kind: 'other' }]) assert.throws(() => merge(base, [op('purchases', 'p', patch, '2026-10-02T12:00:00.000Z')]), /Person|Art/);
    assert.ok(SCHEMA_REV >= 6);
    assert.throws(() => validate({ ...base, sync: { applied: [], minRev: SCHEMA_REV + 1 } }), /zu alt/);
  });
  test('alte Käufe und Löschmarken überstehen Aufräumen; verspätete Offline-Anlage bleibt gelöscht', () => {
    const add = op('purchases', 'p', buy('p', '2018-01-01', 1000), '2018-01-01T12:00:00.000Z');
    const data = merge(emptyData(), [add, op('purchases', 'p', { deletedAt: '2025-01-01T12:00:00.000Z' }, '2025-01-01T12:00:00.000Z'), op('members', nico.id, nico)]);
    const result = compact(data, new Date('2026-10-30T12:00:00.000Z'), { ...POLICY, keepApplied: 0, maxApplied: 0 });
    assert.equal(result.removed.purchases, 0); assert.equal(result.data.purchases.length, 1); assert.equal(result.data.members.length, 1);
    assert.equal(active(merge(result.data, [add]).purchases).length, 0); assert.equal(result.data.sync.minRev, 6);
  });
  test('auch bisherige Dateien ohne Mindestversion werden beim Aufräumen vor alten App-Versionen geschützt', () => {
    const data = merge(emptyData(), [op('purchases', 'p', buy('p', '2018-01-01', 1000))]); delete data.sync.minRev;
    const result = compact(data, new Date('2026-10-30T12:00:00.000Z'));
    assert.ok(result.changed); assert.equal(result.data.sync.minRev, 6); assert.equal(result.data.purchases.length, 1);
  });
});
