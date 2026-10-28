import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { active, emptyData, merge, operation, validate } from '../data.js';
import { POLICY, compact } from '../compact.js';

const make = (id, patch, at = '2026-03-01T10:00:00.000Z') => operation('templates', id, patch, 'Nico', at);
const items = [{ name: 'Milch', quantity: 2, unit: 'l', storeId: 'store-lidl' }, { name: 'Brot', quantity: 1, unit: 'Stück' }];

describe('Einkaufsvorlagen', () => {
  test('eine Vorlage wird angelegt, geändert und gelöscht; ältere Dateien ohne Vorlagen bleiben gültig', () => {
    const old = emptyData(); delete old.templates;
    assert.doesNotThrow(() => validate(old));
    let data = merge(old, [make('t1', { name: 'Wocheneinkauf', items })]);
    assert.equal(active(data.templates).length, 1);
    assert.equal(data.templates[0].items.length, 2);
    data = merge(data, [make('t1', { items: [items[0]] }, '2026-03-02T10:00:00.000Z')]);
    assert.equal(data.templates[0].items.length, 1, 'die neuere Fassung gilt');
    data = merge(data, [make('t1', { items }, '2026-03-01T12:00:00.000Z')]);
    assert.equal(data.templates[0].items.length, 1, 'eine ältere Änderung überschreibt nichts');
    data = merge(data, [make('t1', { deletedAt: '2026-03-03T10:00:00.000Z' }, '2026-03-03T10:00:00.000Z')]);
    assert.equal(active(data.templates).length, 0);
  });

  test('ungültige Vorlagen werden nicht übernommen', () => {
    const bads = [{ name: '', items }, { name: 'X', items: 'Milch' }, { name: 'X', items: [{ name: 'Milch', quantity: 0, unit: 'l' }] },
      { name: 'X', items: [{ name: '', quantity: 1, unit: 'l' }] }, { name: 'X', items: [{ name: 'Milch', quantity: 1, unit: 'l', storeId: 5 }] },
      { name: 'X'.repeat(61), items }, { name: 'X', items: Array.from({ length: 81 }, () => items[1]) }];
    for (const bad of bads) assert.equal(merge(emptyData(), [make('t', bad)]).templates.length, 0, 'ein neuer ungültiger Eintrag wird verworfen');
    const good = merge(emptyData(), [make('t', { name: 'Gut', items })]);
    for (const bad of bads.slice(1)) assert.throws(() => merge(good, [make('t', bad, '2026-03-05T00:00:00.000Z')]), /Ungültige Einkaufsvorlage/, 'eine ungültige Änderung macht die Datei nicht kaputt, sondern wird abgelehnt');
  });

  test('Aufräumen entfernt lange gelöschte Vorlagen, behält aktive und legt keine leere Sammlung an', () => {
    let data = merge(emptyData(), [make('keep', { name: 'Behalten', items }), make('gone', { name: 'Weg', items }),
      make('gone', { deletedAt: '2026-01-01T00:00:00.000Z' }, '2026-01-01T00:00:00.000Z')]);
    const result = compact(data, new Date('2026-03-10T00:00:00.000Z'));
    assert.equal(result.removed.templates, 1);
    assert.deepEqual(result.data.templates.map(row => row.id), ['keep']);
    const bare = emptyData(); delete bare.templates; bare.sync.applied = Array.from({ length: POLICY.maxApplied + 100 }, (_, index) => `op-${index}`);
    const none = compact(bare, new Date('2026-03-10T00:00:00.000Z'));
    assert.equal(none.changed, true);
    assert.equal(none.data.templates, undefined, 'ohne Vorlagen entsteht keine leere Liste');
  });
});

describe('Geschäfte: Einstellung für Artikel ohne Geschäft', () => {
  const store = patch => operation('stores', 's1', { name: 'Rossmann', ...patch }, 'Nico', '2026-03-01T10:00:00.000Z');
  test('anywhere darf fehlen, null oder ein Wahrheitswert sein, sonst wird die Änderung abgelehnt', () => {
    for (const ok of [undefined, null, true, false]) assert.doesNotThrow(() => merge(emptyData(), [store(ok === undefined ? {} : { anywhere: ok })]), String(ok));
    const good = merge(emptyData(), [store({})]);
    assert.throws(() => merge(good, [operation('stores', 's1', { anywhere: 'false' }, 'Nico', '2026-03-02T00:00:00.000Z')]), /Ungültige Einstellung/);
  });
  test('symbol (Bild statt Name) darf fehlen, null, „gift“ oder „none“ sein, sonst wird die Änderung abgelehnt', () => {
    for (const ok of [undefined, null, 'gift', 'none']) assert.doesNotThrow(() => merge(emptyData(), [store(ok === undefined ? {} : { symbol: ok })]), String(ok));
    const good = merge(emptyData(), [store({})]);
    for (const bad of ['Geschenk', '', true, 5]) assert.throws(() => merge(good, [operation('stores', 's1', { symbol: bad }, 'Nico', '2026-03-02T00:00:00.000Z')]), /Ungültiges Symbol/, String(bad));
  });
  test('separate (eigene Liste) darf fehlen, null oder ein Wahrheitswert sein, sonst wird die Änderung abgelehnt; es wird mit dem Geschäft zusammengeführt', () => {
    for (const ok of [undefined, null, true, false]) assert.doesNotThrow(() => merge(emptyData(), [store(ok === undefined ? {} : { separate: ok })]), String(ok));
    const good = merge(emptyData(), [store({})]);
    assert.throws(() => merge(good, [operation('stores', 's1', { separate: 'ja' }, 'Nico', '2026-03-02T00:00:00.000Z')]), /eigene Liste/);
    const on = merge(good, [operation('stores', 's1', { separate: true }, 'Nico', '2026-03-02T00:00:00.000Z')]);
    assert.equal(on.stores.find(row => row.id === 's1').separate, true);
    const off = merge(on, [operation('stores', 's1', { separate: null }, 'Anna', '2026-03-03T00:00:00.000Z')]);
    assert.equal(off.stores.find(row => row.id === 's1').separate, null, 'die spätere Änderung gilt');
  });
});
