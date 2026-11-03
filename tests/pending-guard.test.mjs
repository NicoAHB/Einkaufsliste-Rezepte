import assert from 'node:assert/strict';
import { test } from 'node:test';
import { active, addToList, emptyData, merge, operation } from '../data.js';
import { QUARANTINE_LIMIT, addToQuarantine, applicableOps } from '../pending-guard.js';

const at = n => `2026-11-03T10:00:${String(n).padStart(2, '0')}.000Z`;
const shared = () => merge(emptyData(), addToList([{ name: 'Milch', quantity: 1, unit: 'l' }], '', 'Nico', at(1)).ops);

test('Warteschlange: eine ungültige Änderung blockiert die übrigen nicht', () => {
  const base = shared(), milk = base.items[0].id;
  const broken = operation('items', milk, { quantity: -3 }, 'Nico', at(2));          // ergäbe einen ungültigen Artikel
  const good = addToList([{ name: 'Brot', quantity: 1, unit: 'Stück' }], '', 'Anna', at(3)).ops;
  const later = operation('items', milk, { checked: true }, 'Anna', at(4));
  assert.throws(() => merge(base, [broken, ...good, later]), /Ungültige/);
  const result = applicableOps(base, [broken, ...good, later]);
  assert.deepEqual(result.good.map(op => op.id), [...good, later].map(op => op.id), 'Reihenfolge bleibt erhalten');
  assert.deepEqual(result.bad.map(entry => entry.op.id), [broken.id]);
  assert.match(result.bad[0].error, /Ungültige/);
  assert.deepEqual(active(result.state.items).map(row => [row.name, row.quantity, row.checked]), [['Milch', 1, true], ['Brot', 1, false]]);
});

test('Warteschlange: ohne Problem bleibt alles unverändert, ein ungültiger Ausgangsstand wird gemeldet', () => {
  const base = shared(), ops = addToList([{ name: 'Brot', quantity: 1, unit: 'Stück' }], '', 'Anna', at(3)).ops;
  const result = applicableOps(base, ops);
  assert.equal(result.good, ops); assert.deepEqual(result.bad, []);
  assert.deepEqual(result.state, merge(base, ops));
  assert.throws(() => applicableOps({ version: 2 }, ops), /Datenversion/);
});

test('Warteschlange: aufeinander aufbauende Änderungen bleiben zusammen anwendbar', () => {
  const create = addToList([{ name: 'Brot', quantity: 1, unit: 'Stück' }], '', 'Anna', at(3)).ops, base = merge(shared(), create);
  const id = create[0].entityId, update = operation('items', id, { quantity: 2 }, 'Anna', at(4)), broken = operation('items', id, { unit: 7 }, 'Anna', at(5));
  const result = applicableOps(base, [update, broken]);
  assert.deepEqual(result.bad.map(entry => entry.op.id), [broken.id]);
  assert.equal(active(result.state.items).find(row => row.id === id).quantity, 2);
});

test('Beiseitegelegte Änderungen: keine Doppel, höchstens die neuesten behalten', () => {
  const entry = n => ({ op: { id: `op-${n}` }, error: 'x' });
  let list = addToQuarantine([], [entry(1), entry(2)], at(1));
  list = addToQuarantine(list, [entry(2), entry(3)], at(2));
  assert.deepEqual(list.map(row => row.op.id), ['op-1', 'op-2', 'op-3']);
  assert.equal(list[2].at, at(2));
  const many = addToQuarantine([], Array.from({ length: QUARANTINE_LIMIT + 5 }, (_, n) => entry(n)));
  assert.equal(many.length, QUARANTINE_LIMIT); assert.equal(many[0].op.id, 'op-5');
});
