import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, merge, operation, validate } from '../data.js';
import { orderedStores, reorderedStoreIds } from '../store-order.js';

const at = '2026-11-01T12:00:00.000Z';
const store = (id, extra = {}) => ({ id, name: id, createdAt: at, updatedAt: at, deletedAt: null, ...extra });
const ids = rows => orderedStores(rows).map(row => row.id);

test('Geschäftsreihenfolge: alte Daten bleiben unverändert; neue Geschäfte werden angehängt', () => {
  const rows = [store('edeka'), store('lidl'), store('rewe'), store('weg', { deletedAt: at })];
  const before = structuredClone(rows);
  assert.deepEqual(ids(rows), ['edeka', 'lidl', 'rewe']);
  assert.deepEqual(rows, before);
  assert.deepEqual(ids([store('edeka', { sortOrder: 1 }), store('lidl', { sortOrder: 0 }), store('rewe')]), ['lidl', 'edeka', 'rewe']);
});

test('Geschäftsreihenfolge: versteckte Listen behalten ihren Platz; gelöschte und doppelte IDs stören nicht', () => {
  const rows = ['edeka', 'wünsche', 'lidl', 'rewe'].map(id => store(id));
  assert.deepEqual(reorderedStoreIds(rows, ['rewe', 'edeka', 'lidl']), ['rewe', 'wünsche', 'edeka', 'lidl']);
  assert.deepEqual(reorderedStoreIds(rows, ['rewe', 'weg', 'edeka', 'rewe', 'lidl']), ['rewe', 'wünsche', 'edeka', 'lidl']);
});

test('Geschäftsreihenfolge: Abgleich erhält gleichzeitige Umbenennung, Artikelzuordnung und JSON-Rundlauf', () => {
  const data = emptyData(); data.stores = ['edeka', 'lidl', 'rewe'].map(id => store(id));
  const sort = ['rewe', 'edeka', 'lidl'].map((id, sortOrder) => operation('stores', id, { sortOrder }, 'Nico', at));
  const rename = operation('stores', 'lidl', { name: 'Lidl Nord' }, 'Anna', at);
  const left = merge(merge(data, sort), [rename]), right = merge(merge(data, [rename]), sort);
  assert.deepEqual(ids(left.stores), ['rewe', 'edeka', 'lidl']);
  assert.deepEqual(left.stores, right.stores);
  assert.equal(left.stores.find(row => row.id === 'lidl').name, 'Lidl Nord');
  assert.deepEqual(ids(validate(JSON.parse(JSON.stringify(left))).stores), ids(left.stores));
  for (const value of [-1, 0.5, '0', Infinity]) {
    const invalid = structuredClone(data); invalid.stores[0].sortOrder = value;
    assert.throws(() => validate(invalid), /Geschäftsreihenfolge/);
  }
});

test('Geschäftsreihenfolge: gleichzeitiges Verschieben konvergiert bei unterschiedlicher Übertragungsreihenfolge', () => {
  const data = emptyData(); data.stores = ['a', 'b', 'c'].map(id => store(id));
  const order = (values, actor) => values.map((id, sortOrder) => operation('stores', id, { sortOrder }, actor, at));
  const a = order(['c', 'a', 'b'], 'Nico'), b = order(['b', 'c', 'a'], 'Anna');
  assert.deepEqual(ids(merge(merge(data, a), b).stores), ids(merge(merge(data, b), a).stores));
});
