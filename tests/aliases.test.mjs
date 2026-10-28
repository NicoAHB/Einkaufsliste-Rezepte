import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compact } from '../compact.js';
import { merge, operation, validate } from '../data.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const day = n => new Date(Date.UTC(2026, 2, 1 + n, 12)).toISOString();
const q = (cents, quantity = 1, unit = 'Stück') => ({ cents, quantity, unit });

test('Datenmodell: das alte Feld Preisentwicklung bleibt gültig, Zuordnungen sind optional und werden geprüft', () => {
  assert.doesNotThrow(() => validate(structuredClone(demo)));
  const price = (patch, id = 'p1') => operation('prices', id, { storeId: 'store-edeka', name: 'Milch', quote: q(129), ...patch }, 'Nico', day(0));
  const known = demo.prices?.length || 0;
  assert.equal(merge(structuredClone(demo), [price({ trend: { was: q(119), at: day(0) } })]).prices.length, known + 1);
  assert.equal(merge(structuredClone(demo), [price({ trend: { was: { cents: -1 }, at: day(0) } })]).prices.length, known, 'ungültige Entwicklung wird verworfen');
  const out = merge(structuredClone(demo), [operation('aliases', 'a1', { from: 'tom cherry', name: 'Tomaten' }, 'Nico', day(0)), operation('aliases', 'a2', { from: ' ', name: 'X' }, 'Nico', day(0))]);
  assert.deepEqual(out.aliases.map(entry => [entry.from, entry.name]), [['tom cherry', 'Tomaten']]);
});

test('Aufräumen: gelöschte Zuordnungen verschwinden, bei sehr vielen bleiben die neuesten', () => {
  const NOW = new Date(day(100));
  const ops = [operation('aliases', 'alt', { from: 'alt', name: 'Alt' }, 'Nico', day(0)), operation('aliases', 'alt', { deletedAt: day(10) }, 'Nico', day(10)),
    operation('aliases', 'neu', { from: 'neu', name: 'Neu' }, 'Nico', day(95))];
  const out = compact(merge(structuredClone(demo), ops), NOW);
  assert.deepEqual(out.data.aliases.map(entry => entry.id), ['neu']);
  assert.equal(out.removed.aliases, 1);
  const many = merge(structuredClone(demo), Array.from({ length: 12 }, (_, i) => operation('aliases', `a${i}`, { from: `r${i}`, name: `N${i}` }, 'Nico', day(90 + i % 5))));
  const capped = compact(many, NOW, { ...{ tombstoneDays: 14, doneDays: 21, mealDays: 120, settledDays: 14, keepApplied: 600, keepPrices: 4, maxNames: 300 }, maxAliases: 5 });
  assert.equal(capped.data.aliases.length, 5);
  assert.doesNotThrow(() => validate(capped.data));
});
