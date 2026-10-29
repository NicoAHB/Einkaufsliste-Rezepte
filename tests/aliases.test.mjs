import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compact } from '../compact.js';
import { aliasApplies, aliasKind, merge, operation, validate } from '../data.js';

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

// Version 2.47: Zuordnungen vom Kassenbon (Versionen 2.40 bis 2.43) von bestätigten Schreibweisen unterscheiden
test('Bestätigte Schreibweisen wirken; Text vom Kassenbon („Apfeltasche“ → „Apfel“) ist fragwürdig und wirkt nicht', () => {
  const kinds = [
    [{ from: 'zwiebel', name: 'Zwiebeln' }, 'spelling'], [{ from: 'apfel', name: 'Äpfel' }, 'spelling'], [{ from: 'tomate', name: 'Tomaten' }, 'spelling'],
    [{ from: 'apfeltasche', name: 'Apfel' }, 'doubtful'], [{ from: 'herz.naturjoghurt', name: 'Joghurt' }, 'doubtful'], [{ from: 'hafermilch', name: 'Milch' }, 'doubtful'],
    [{ from: 'gala äpfel', name: 'Äpfel', variant: 'Gala' }, 'doubtful'], [{ from: 'tom cherry', name: 'Cherrytomaten', variant: 'Cherry' }, 'doubtful'],
    [{ from: 'zwiebel', name: 'Zwiebeln', variant: 'rot' }, 'doubtful'],   // eine Sorte stammt immer vom Kassenbon
    [{ from: 'apfeltasche', name: 'Apfel', confirmed: true }, 'kept'], [{ from: 'zwiebel', name: 'Zwiebeln', confirmed: true }, 'kept'],
    [{ from: 'apfeltasche', name: 'Apfel', confirmed: false }, 'doubtful'],
  ];
  for (const [alias, kind] of kinds) { assert.equal(aliasKind(alias), kind, JSON.stringify(alias)); assert.equal(aliasApplies(alias), kind !== 'doubtful', JSON.stringify(alias)); }
});

test('Datenmodell: „confirmed“ ist ein Wahrheitswert; das Behalten einer Zuordnung verlangt keine neuere App', () => {
  const alias = { id: 'al', from: 'apfeltasche', name: 'Apfel' };
  const out = merge(structuredClone(demo), [operation('aliases', 'al', alias, 'Nico', day(0)), operation('aliases', 'al', { confirmed: true }, 'Nico', day(1))]);
  assert.deepEqual(out.aliases.map(entry => [entry.from, entry.name, entry.confirmed]), [['apfeltasche', 'Apfel', true]]);
  assert.ok(!(out.sync.minRev > 2), 'ältere Apps dürfen weiter schreiben (sie ignorieren das Feld)');
  const bad = merge(structuredClone(demo), [operation('aliases', 'al2', { ...alias, confirmed: 'ja' }, 'Nico', day(0))]);
  assert.deepEqual(bad.aliases.map(entry => entry.id), [], 'ein falscher Wert wird verworfen');
  assert.doesNotThrow(() => validate(out));
});
