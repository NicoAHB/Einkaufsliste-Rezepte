import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, aggregateIngredients, dayMonthLabel, daysBetween, isoDate, isoWeek, relativeDay, weekBasket, weekDays, weekLabel, weekStart } from '../plan.js';
import { validDay } from '../data.js';
import { NO_AMOUNT } from '../recipe-import.js';

test('Wochen beginnen montags und haben sieben Tage', () => {
  assert.equal(weekStart('2026-10-26'), '2026-10-26');   // Montag
  assert.equal(weekStart('2026-11-01'), '2026-10-26');   // Sonntag gehört zur Woche davor
  assert.equal(weekStart('2026-10-28'), '2026-10-26');
  assert.deepEqual(weekDays('2026-10-29'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
});

test('Datumsrechnung über Monats-, Jahres- und Zeitumstellungsgrenzen', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');   // Zeitumstellung
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('Kalenderwochen nach ISO 8601', () => {
  assert.deepEqual(isoWeek('2026-10-26'), { week: 44, year: 2026 });
  assert.deepEqual(isoWeek('2026-01-01'), { week: 1, year: 2026 });
  assert.deepEqual(isoWeek('2021-01-03'), { week: 53, year: 2020 });
  assert.deepEqual(isoWeek('2024-12-30'), { week: 1, year: 2025 });
  assert.equal(weekLabel('2026-10-28'), 'KW 44 · 26.10.–01.11.');
  assert.equal(dayMonthLabel('2026-03-05'), '05.03.');
});

test('Kochdatum in Worten', () => {
  const today = '2026-10-26';
  assert.equal(relativeDay('2026-10-26', today), 'heute');
  assert.equal(relativeDay('2026-10-25', today), 'gestern');
  assert.equal(relativeDay('2026-10-20', today), 'vor 6 Tagen');
  assert.equal(relativeDay('2026-10-05', today), 'vor 3 Wochen');
  assert.equal(relativeDay('2026-07-26', today), 'vor 3 Monaten');
  assert.equal(relativeDay('2025-01-01', today), 'vor über einem Jahr');
  assert.equal(relativeDay('2026-10-30', today), 'geplant');
  assert.equal(relativeDay('2026-10-20T10:00:00.000Z', today), 'vor 6 Tagen');
});

test('Gültige Kalendertage', () => {
  assert.ok(validDay('2026-02-28') && validDay('2028-02-29'));
  for (const bad of ['2026-02-30', '2026-13-01', '26-10-26', '2026-10-26T10:00', '', null, 5]) assert.equal(validDay(bad), false, String(bad));
});

const recipes = [{ id: 'r1', name: 'Suppe', servings: 2 }, { id: 'r2', name: 'Pasta', servings: 4 }, { id: 'r3', name: 'Salat', servings: 1 }];
const row = (recipeId, name, quantity, unit) => ({ id: `${recipeId}-${name}-${unit}`, recipeId, name, quantity, unit });
const ingredients = [row('r1', 'Tomaten', 800, 'g'), row('r1', 'Zwiebel', 1, 'Stück'), row('r1', 'Salz', 1, NO_AMOUNT), row('r1', 'Olivenöl', 2, 'EL'),
  row('r2', 'Tomaten', 0.4, 'kg'), row('r2', 'Zwiebeln', 2, 'Stk.'), row('r2', 'salz', 1, NO_AMOUNT), row('r2', 'Olivenöl', 100, 'ml'), row('r2', 'Milch', 250, 'ml'),
  row('r3', 'Milch', 0.75, 'l'), row('r3', 'Zwiebel', 1, 'Stück')];

test('Zutaten werden über Gerichte hinweg zusammengezählt und auf Portionen umgerechnet', () => {
  const rows = aggregateIngredients([{ recipeId: 'r1', servings: 4 }, { recipeId: 'r2', servings: 4 }, { recipeId: 'r3', servings: 2 }], recipes, ingredients);
  const text = Object.fromEntries(rows.map(item => [`${item.name}|${item.unit}`, item.quantity]));
  assert.equal(text['Tomaten|kg'], 2);            // 1600 g + 400 g
  assert.equal(text['Milch|l'], 1.75);            // 250 ml + 1,5 l
  assert.equal(text['Zwiebel|Stück'], 6);         // 1 x 2 Portionsfaktor + 1 x 2 + 2 „Zwiebeln“ (dasselbe Produkt, seit Version 2.48); die häufigste Schreibweise wird gezeigt
  assert.ok(!('Zwiebeln|Stück' in text));
  assert.equal(text['Salz|nach Bedarf'], 1);
  assert.equal(text['Olivenöl|EL'], 4);
  assert.equal(text['Olivenöl|ml'], 100);
  assert.deepEqual(rows.find(item => item.name === 'Tomaten').sources, ['Suppe', 'Pasta']);
});

test('Kleine Mengen bleiben in g bzw. ml; unbekannte Rezepte und leere Pläne sind harmlos', () => {
  const rows = aggregateIngredients([{ recipeId: 'r2', servings: 2 }, { recipeId: 'weg', servings: 2 }], recipes, ingredients);
  assert.equal(rows.find(item => item.name === 'Tomaten').unit, 'g');
  assert.equal(rows.find(item => item.name === 'Tomaten').quantity, 200);
  assert.equal(rows.find(item => item.name === 'Milch').unit, 'ml');
  assert.deepEqual(aggregateIngredients([], recipes, ingredients), []);
});

// Version 2.47: Schon auf die Liste übernommene Gerichte nicht noch einmal aufnehmen (sonst verdoppeln sich die Mengen)
const meal = (id, servings, extra = {}) => ({ id, recipeId: 'r1', servings, ...extra });
test('Wochen-Einkauf: noch nicht Übernommenes kommt ganz, Übernommenes bleibt draußen', () => {
  const basket = weekBasket([meal('a', 2), meal('b', 4, { listedServings: 4 }), meal('c', 3, { listedServings: 3, listedAt: '2026-10-28T10:00:00.000Z' })]);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2]]);
  assert.deepEqual(basket.listed.map(entry => [entry.meal.id, entry.kind]), [['b', 'same'], ['c', 'same']]);
});
test('Wochen-Einkauf: mehr Portionen seit der Übernahme: nur die zusätzlichen; weniger: nichts; die Gerichte selbst bleiben unverändert', () => {
  const original = [meal('a', 6, { listedServings: 4 }), meal('b', 2, { listedServings: 4 }), meal('c', 2.5, { listedServings: 2.25 })];
  const copy = structuredClone(original);
  const basket = weekBasket(original);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2], ['c', 0.25]]);
  assert.deepEqual(basket.listed.map(entry => [entry.meal.id, entry.kind, entry.extra]), [['a', 'more', 2], ['b', 'less', -2], ['c', 'more', 0.25]]);
  assert.deepEqual(original, copy);
  // die Zutaten stimmen: 2 zusätzliche von 4 Portionen = die halbe Menge
  const rows = aggregateIngredients(basket.use.slice(0, 1), [{ id: 'r1', name: 'R', servings: 4 }], [{ recipeId: 'r1', name: 'Mehl', quantity: 400, unit: 'g' }]);
  assert.deepEqual(rows.map(row => [row.name, row.quantity, row.unit]), [['Mehl', 200, 'g']]);
});
test('Wochen-Einkauf: ausdrücklich noch einmal – alle Gerichte mit allen Portionen', () => {
  const basket = weekBasket([meal('a', 2), meal('b', 4, { listedServings: 4 }), meal('c', 1, { listedServings: 3 })], true);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2], ['b', 4], ['c', 1]]);
  assert.deepEqual(basket.listed.map(entry => entry.meal.id), ['b', 'c']);
});
test('Wochen-Einkauf: Gleitkomma-Reste zählen nicht als „mehr“; ungültige Merker gelten als nicht übernommen', () => {
  assert.equal(weekBasket([meal('a', 0.1 + 0.2, { listedServings: 0.3 })]).use.length, 0);
  for (const bad of [null, 0, -1, 'x', undefined, NaN]) assert.deepEqual(weekBasket([meal('a', 2, { listedServings: bad })]).use.map(entry => entry.servings), [2], String(bad));
  assert.deepEqual(weekBasket([]), { use: [], listed: [] });
});

// Version 2.48: dasselbe Produkt in anderer Schreibweise wird zusammengezählt
test('Wochen-Einkauf: „Zwiebel“ und „Zwiebeln“, „Tomate“ und „Tomaten“ sind ein Eintrag; die häufigere Schreibweise (bei Gleichstand die längere) wird gezeigt', () => {
  const recipes = [{ id: 'a', name: 'A', servings: 2 }, { id: 'b', name: 'B', servings: 2 }, { id: 'c', name: 'C', servings: 2 }];
  const meals = ['a', 'b', 'c'].map(recipeId => ({ recipeId, servings: 2 }));
  const rows = aggregateIngredients(meals, recipes, [
    { recipeId: 'a', name: 'Zwiebel', quantity: 1, unit: 'Stück' }, { recipeId: 'b', name: 'Zwiebeln', quantity: 2, unit: 'Stück' },
    { recipeId: 'a', name: 'Tomate', quantity: 100, unit: 'g' }, { recipeId: 'b', name: 'Tomaten', quantity: 0.4, unit: 'kg' }, { recipeId: 'c', name: 'Tomaten', quantity: 100, unit: 'g' },
    { recipeId: 'a', name: 'Äpfel', quantity: 2, unit: 'Stück' }, { recipeId: 'c', name: 'Apfel', quantity: 1, unit: 'Stück' }]);
  assert.deepEqual(rows.map(row => [row.name, row.quantity, row.unit, row.sources]), [
    ['Äpfel', 3, 'Stück', ['A', 'C']], ['Tomaten', 600, 'g', ['A', 'B', 'C']], ['Zwiebeln', 3, 'Stück', ['A', 'B']]]);
});
test('Wochen-Einkauf: andere Wörter, andere Einheiten und Zahlen im Namen bleiben getrennt', () => {
  const recipes = [{ id: 'a', name: 'A', servings: 1 }];
  const ing = list => list.map(([name, quantity, unit]) => ({ recipeId: 'a', name, quantity, unit }));
  const rows = aggregateIngredients([{ recipeId: 'a', servings: 1 }], recipes, ing([['Zwiebel', 1, 'Stück'], ['rote Zwiebel', 1, 'Stück'], ['Zwiebeln', 200, 'g'], ['Milch', 1, 'l'], ['Hafermilch', 1, 'l'],
    ['Cola 1 l', 1, 'Stück'], ['Cola 2 l', 1, 'Stück'], ['Ei', 1, 'Stück'], ['Eis', 1, 'Stück']]));
  assert.deepEqual(rows.map(row => `${row.name}|${row.unit}`).sort(), ['Cola 1 l|Stück', 'Cola 2 l|Stück', 'Ei|Stück', 'Eis|Stück', 'Hafermilch|l', 'Milch|l', 'Zwiebel|Stück', 'Zwiebeln|g', 'rote Zwiebel|Stück'].sort());
});
