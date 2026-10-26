import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentIds, newFromOthers } from '../news.js';

const item = (id, createdBy, extra = {}) => ({ id, name: id, createdBy, createdAt: '2026-10-20T10:00:00.000Z', deletedAt: null, checked: false, _clock: {}, ...extra });
const add = (id, by, at = '2026-10-21T10:00:00.000Z') => ({ id, at, by, quantity: 1, unit: 'Stück' });

test('Neu von anderen: nur offene Artikel anderer Personen, die man noch nicht übernommen hat', () => {
  const items = [item('milch', 'Anna'), item('brot', 'Nico'), item('kaese', 'Anna', { checked: true }), item('eier', 'Anna', { deletedAt: '2026-10-21T10:00:00.000Z' }), item('obst', 'Anna')];
  const news = newFromOthers(items, 'Nico', new Set(['obst']));
  assert.deepEqual(news.map(entry => [entry.item.id, entry.by, entry.entries[0].kind]), [['milch', ['Anna'], 'neu']]);
});

test('Erhöht jemand anderes die Menge eines Artikels, taucht er mit dem Zuwachs auf; eigene Zuwächse nicht', () => {
  const row = item('milch', 'Nico', { _base: { quantity: 1, unit: 'Stück' }, _adds: [add('a1', 'Anna'), add('a2', 'Nico')], quantity: 3 });
  const [entry] = newFromOthers([row], 'Nico', new Set());
  assert.deepEqual(entry.entries.map(e => [e.id, e.kind, e.by, e.quantity]), [['a1', 'mehr', 'Anna', 1]]);
  assert.deepEqual(newFromOthers([row], 'Nico', new Set(['a1'])), [], 'übernommen');
  // Zuwächse, die von einem späteren Setzen der Menge überschrieben wurden, zählen nicht
  const overwritten = item('milch', 'Nico', { _base: { quantity: 5, unit: 'Stück' }, _adds: [add('a1', 'Anna', '2026-10-19T10:00:00.000Z')], _clock: { quantity: { at: '2026-10-22T10:00:00.000Z', id: 'x' } } });
  assert.deepEqual(newFromOthers([overwritten], 'Nico', new Set()), []);
});

test('Zusammengeführtes Doppel: war der Ursprungsartikel schon gesehen, ist es auch der Zuwachs', () => {
  const row = item('milch', 'Nico', { _base: { quantity: 1, unit: 'Stück' }, _adds: [add('fold-add-dup1', 'Anna')] });
  assert.equal(newFromOthers([row], 'Nico', new Set()).length, 1);
  assert.equal(newFromOthers([row], 'Nico', new Set(['dup1'])).length, 0);
});

test('Kennungen für die Erstausstattung: alle Artikel und Zuwächse', () => {
  assert.deepEqual([...currentIds([item('a', 'x', { _adds: [add('z', 'y')] }), item('b', 'x')])].sort(), ['a', 'b', 'z']);
});
