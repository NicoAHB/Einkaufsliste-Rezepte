import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, aggregateIngredients, dayMonthLabel, daysBetween, isoDate, isoWeek, relativeDay, weekDays, weekLabel, weekStart } from '../plan.js';
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
  assert.equal(text['Zwiebel|Stück'], 4);         // 1 x 2 Portionsfaktor + 1 x 2; „Zwiebeln“ ist ein eigener Name
  assert.equal(text['Zwiebeln|Stück'], 2);
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
