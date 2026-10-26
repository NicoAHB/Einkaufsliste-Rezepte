import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { active, addToList, combineQuantity, foldIntoList, merge } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const AT = '2026-10-27T10:00:00.000Z';
const row = (id, name, quantity, unit, extra = {}) => ({ id, name, quantity, unit, storeId: 'store-edeka', checked: false, createdBy: 'Nico', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', deletedAt: null, _clock: {}, ...extra });
const open = items => ({ ...structuredClone(demo), items });

test('Mengen zusammenpassender Einheiten werden addiert, größere Mengen umgerechnet', () => {
  assert.deepEqual(combineQuantity({ quantity: 500, unit: 'g' }, { quantity: 300, unit: 'g' }), { quantity: 800, unit: 'g' });
  assert.deepEqual(combineQuantity({ quantity: 600, unit: 'g' }, { quantity: 0.5, unit: 'kg' }), { quantity: 1.1, unit: 'kg' });
  assert.deepEqual(combineQuantity({ quantity: 1, unit: 'kg' }, { quantity: 200, unit: 'g' }), { quantity: 1.2, unit: 'kg' });
  assert.deepEqual(combineQuantity({ quantity: 0.2, unit: 'kg' }, { quantity: 300, unit: 'g' }), { quantity: 500, unit: 'g' });
  assert.deepEqual(combineQuantity({ quantity: 250, unit: 'ml' }, { quantity: 0.75, unit: 'l' }), { quantity: 1, unit: 'l' });
  assert.deepEqual(combineQuantity({ quantity: 2, unit: 'Stück' }, { quantity: 3, unit: 'Stk.' }), { quantity: 5, unit: 'Stück' });
  assert.deepEqual(combineQuantity({ quantity: 1, unit: 'Bund' }, { quantity: 2, unit: 'bund' }), { quantity: 3, unit: 'Bund' });
  assert.deepEqual(combineQuantity({ quantity: 0.1, unit: 'Stück' }, { quantity: 0.2, unit: 'Stück' }), { quantity: 0.3, unit: 'Stück' }, 'keine Gleitkomma-Reste');
});

test('Unterschiedliche Einheiten werden nie verrechnet', () => {
  for (const [a, b] of [['g', 'Stück'], ['l', 'kg'], ['Bund', 'EL'], ['Packung', 'Stück'], ['ml', 'EL']]) {
    assert.equal(combineQuantity({ quantity: 1, unit: a }, { quantity: 1, unit: b }), null, `${a} + ${b}`);
  }
});

test('Gleicher Name im selben Geschäft: Menge wird erhöht statt eines zweiten Eintrags', () => {
  const items = [row('a', 'Zwiebeln', 2, 'Stück')];
  const result = addToList([{ name: ' zwiebeln', quantity: 3, unit: 'Stück' }], 'store-edeka', 'Nico', AT, [], items);
  assert.equal(result.added, 0);
  assert.deepEqual(result.counted, [{ id: 'a', name: 'Zwiebeln', before: { quantity: 2, unit: 'Stück' }, after: { quantity: 5, unit: 'Stück' } }]);
  assert.equal(result.ops.length, 1);
  const out = merge(open(items), result.ops).items.find(item => item.id === 'a');
  assert.equal(out.quantity, 5);
  const back = merge(open(items), [...result.ops, ...result.undo.map(entry => ({ ...entry, id: 'u', entityId: entry.id, actor: 'Nico', at: '2026-10-27T10:00:05.000Z' }))]);
  assert.equal(back.items.find(item => item.id === 'a').quantity, 2, 'Rückgängig stellt die Menge wieder her');
});

test('Anderes Geschäft, erledigt oder gelöscht: kein Zusammenzählen', () => {
  const items = [row('a', 'Milch', 1, 'l', { storeId: 'store-lidl' }), row('b', 'Butter', 1, 'Stück', { checked: true }), row('c', 'Käse', 1, 'Stück', { deletedAt: AT }), row('d', 'Brot', 1, 'Stück', { storeId: '' })];
  const result = foldIntoList([{ name: 'Milch', quantity: 1, unit: 'l' }, { name: 'Butter', quantity: 1, unit: 'Stück' }, { name: 'Käse', quantity: 1, unit: 'Stück' }, { name: 'Brot', quantity: 1, unit: 'Stück' }], 'store-edeka', items);
  assert.equal(result.fresh.length, 4);
  assert.equal(result.counted.length, 0);
  // „Ohne Geschäft“ zählt untereinander zusammen
  assert.deepEqual(foldIntoList([{ name: 'Brot', quantity: 2, unit: 'Stück' }], '', items).counted.map(entry => entry.after.quantity), [3]);
});

test('Unpassende Einheit wird ein eigener Eintrag', () => {
  const result = foldIntoList([{ name: 'Tomaten', quantity: 2, unit: 'Stück' }], 'store-edeka', [row('a', 'Tomaten', 500, 'g')]);
  assert.equal(result.fresh.length, 1);
  assert.equal(result.counted.length, 0);
});

test('Doppelte Zutaten innerhalb einer Lieferung werden zusammengefasst', () => {
  const result = foldIntoList([{ name: 'Mehl', quantity: 300, unit: 'g' }, { name: 'mehl', quantity: 0.5, unit: 'kg' }, { name: 'Mehl', quantity: 1, unit: 'Packung' }], 'store-edeka', []);
  assert.deepEqual(result.fresh.map(entry => [entry.name, entry.quantity, entry.unit]), [['Mehl', 800, 'g'], ['Mehl', 1, 'Packung']]);
});

test('Zutat „nach Bedarf“: nicht erneut aufschreiben, wenn schon vorhanden', () => {
  const items = [row('a', 'Salz', 1, 'Packung')];
  const result = foldIntoList([{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Pfeffer', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Pfeffer', quantity: 1, unit: 'Stück', noAmount: true }], 'store-edeka', items);
  assert.equal(result.skipped, 1, 'Salz steht schon auf der Liste');
  assert.deepEqual(result.fresh.map(entry => entry.name), ['Pfeffer'], 'Pfeffer nur einmal');
  assert.equal(result.counted.length, 0);
  // Eine echte Menge ersetzt den Platzhalter „nach Bedarf“
  const real = foldIntoList([{ name: 'Salz', quantity: 1, unit: 'Stück', noAmount: true }, { name: 'Salz', quantity: 500, unit: 'g' }], 'store-edeka', []);
  assert.deepEqual(real.fresh.map(entry => [entry.quantity, entry.unit]), [[500, 'g']]);
});

test('addToList: neue Artikel mit Rückgängig-Anweisung, vorhandene erhöht, alles gültig', () => {
  const items = [row('a', 'Nudeln', 500, 'g')];
  const result = addToList([{ name: 'Nudeln', quantity: 250, unit: 'g' }, { name: 'Äpfel', quantity: 6, unit: 'Stück' }], 'store-edeka', 'Nico', AT, [], items);
  assert.equal(result.added, 1);
  assert.equal(result.counted.length, 1);
  assert.equal(result.undo.length, 2);
  const out = merge(open(items), result.ops);
  assert.equal(active(out.items).find(item => item.id === 'a').quantity, 750);
  assert.ok(active(out.items).some(item => item.name === 'Äpfel' && item.quantity === 6));
  assert.deepEqual(result.undo.map(entry => Object.keys(entry.patch)[0]).sort(), ['deletedAt', 'quantity']);
});
