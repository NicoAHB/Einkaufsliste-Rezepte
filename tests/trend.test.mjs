import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compact } from '../compact.js';
import { merge, operation, validate } from '../data.js';
import { TREND, activeTrend, definiteChange, priceChange, trendFor } from '../prices.js';

const demo = JSON.parse(await readFile(new URL('../beispieldaten.json', import.meta.url), 'utf8'));
const day = n => new Date(Date.UTC(2026, 2, 1 + n, 12)).toISOString();
const row = (id, at, quote, extra = {}) => ({ id, storeId: 's', name: 'Milch', createdAt: at, updatedAt: at, deletedAt: null, quote, regularQuote: extra.onSale ? null : quote, onSale: false, ...extra });
const fresh = (quote, extra = {}) => ({ storeId: 's', name: 'milch', quote, regularQuote: extra.onSale ? (extra.regularQuote ?? null) : quote, onSale: false, ...extra });
const q = (cents, quantity = 1, unit = 'Stück') => ({ cents, quantity, unit });

test('Deutliche Änderungen werden erkannt, kleine nicht', () => {
  assert.equal(priceChange(q(129), q(139)).diff, 10);
  assert.ok(definiteChange(q(129), q(139)));
  assert.equal(definiteChange(q(100), q(101)), null, 'ein Cent ist keine Änderung');
  assert.equal(definiteChange(q(1000), q(1020)), null, '2 % sind keine Änderung');
  assert.ok(definiteChange(q(1000), q(1040)), '4 % und 40 Cent schon');
  assert.ok(definiteChange(q(139), q(129)).diff < 0);
  assert.equal(definiteChange(q(129), q(139, 1, 'kg')), null, 'Stück und kg lassen sich nicht vergleichen');
});

test('Preise werden auf dieselbe Menge umgerechnet', () => {
  assert.equal(definiteChange(q(199, 500, 'g'), q(99, 250, 'g')), null, '99 ct für 250 g sind 198 ct für 500 g');
  assert.ok(definiteChange(q(199, 500, 'g'), q(249, 500, 'g')));
  assert.ok(definiteChange(q(199, 500, 'g'), q(500, 1, 'kg')), '500 ct/kg statt 398 ct/kg');
  assert.equal(priceChange(q(199, 500, 'g'), q(398, 1, 'kg')).diff, 0);
});

test('trendFor: gestiegen, gesunken, gleich, ohne Vorgänger', () => {
  const history = [row('a', day(0), q(129))];
  assert.deepEqual(trendFor(history, fresh(q(139)), day(10)), { was: q(129), at: day(10) });
  assert.deepEqual(trendFor(history, fresh(q(119)), day(10)), { was: q(129), at: day(10) });
  assert.equal(trendFor(history, fresh(q(129)), day(10)), null);
  assert.equal(trendFor([], fresh(q(139)), day(10)), null);
  assert.equal(trendFor(history, { ...fresh(q(139)), storeId: 'anderes' }, day(10)), null, 'anderes Geschäft: kein Vergleich');
  assert.equal(trendFor(history, { ...fresh(q(139)), name: 'Butter' }, day(10)), null, 'anderes Produkt');
  assert.equal(trendFor(history, fresh(q(139, 1, 'kg')), day(10)), null, 'andere Einheitengruppe');
});

test('Aktionen sind keine Preisänderung', () => {
  const history = [row('a', day(0), q(129))];
  // Aktion mit bekanntem Normalpreis: der Normalpreis ist unverändert
  assert.equal(trendFor(history, fresh(q(99), { onSale: true, regularQuote: q(129) }), day(10)), null);
  // Aktion ohne bekannten Normalpreis: keine Entwicklung, eine vorhandene bleibt
  assert.equal(trendFor(history, fresh(q(99), { onSale: true }), day(10)), null);
  const rising = [row('a', day(0), q(129)), row('b', day(5), q(139), { trend: { was: q(129), at: day(5) } })];
  assert.deepEqual(trendFor(rising, fresh(q(99), { onSale: true }), day(10)), { was: q(129), at: day(5) });
  // Eine frühere Aktion wird nicht zum Vergleichspreis
  const afterSale = [row('a', day(0), q(129)), row('b', day(5), q(99), { onSale: true, regularQuote: q(129) })];
  assert.equal(trendFor(afterSale, fresh(q(129)), day(10)), null);
  assert.deepEqual(trendFor(afterSale, fresh(q(149)), day(10)), { was: q(129), at: day(10) });
});

test('Eine junge Entwicklung bleibt bei gleichem Preis erhalten, eine alte läuft nach 60 Tagen aus', () => {
  const history = [row('a', day(0), q(129)), row('b', day(5), q(139), { trend: { was: q(129), at: day(5) } })];
  assert.deepEqual(trendFor(history, fresh(q(139)), day(20)), { was: q(129), at: day(5) });
  assert.equal(trendFor(history, fresh(q(139)), day(5 + TREND.days + 1)), null);
  // Kehrt der Preis zurück, ist das eine neue Entwicklung nach unten
  assert.deepEqual(trendFor(history, fresh(q(129)), day(20)), { was: q(139), at: day(20) });
});

test('Ein älterer Bon, der später eingefügt wird, vergleicht nur mit noch älteren Notizen', () => {
  const history = [row('a', day(0), q(129)), row('c', day(30), q(149))];
  assert.deepEqual(trendFor(history, fresh(q(139)), day(10)), { was: q(129), at: day(10) });
});

test('activeTrend: nur im selben Geschäft, nur frisch, nur mit passender Einheit', () => {
  const rows = [row('a', day(0), q(129)), row('b', day(5), q(139), { trend: { was: q(129), at: day(5) } })];
  const item = { storeId: 's', name: 'Milch', unit: 'Stück' };
  const now = new Date(day(20));
  const trend = activeTrend(item, rows, now);
  assert.equal(trend.direction, 'up');
  assert.equal(trend.before, 129);
  assert.equal(trend.now.cents, 139);
  assert.ok(Math.abs(trend.percent - 7.75) < 0.1);
  assert.equal(activeTrend({ ...item, storeId: 'x' }, rows, now), null);
  assert.equal(activeTrend({ ...item, storeId: '' }, rows, now), null, 'ohne Geschäft kein Hinweis');
  assert.equal(activeTrend({ ...item, unit: 'kg' }, rows, now), null);
  assert.equal(activeTrend(item, rows, new Date(day(5 + TREND.days + 1))), null, 'nach 60 Tagen nicht mehr');
  const down = [row('a', day(0), q(139)), row('b', day(5), q(119), { trend: { was: q(139), at: day(5) } })];
  assert.equal(activeTrend(item, down, now).direction, 'down');
});

test('Datenmodell: Preisentwicklung und Zuordnungen sind optional und werden geprüft', () => {
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
  const capped = compact(many, NOW, { ...{ tombstoneDays: 14, doneDays: 21, mealDays: 120, settledDays: 14, keepApplied: 600, keepPrices: 2, maxNames: 300 }, maxAliases: 5 });
  assert.equal(capped.data.aliases.length, 5);
  assert.doesNotThrow(() => validate(capped.data));
});
