import assert from 'node:assert/strict';
import { test } from 'node:test';
import { euroCents, parseQuantity } from '../numbers.js';
import { positive } from '../data.js';
import { parseCents } from '../prices.js';
import { parseAmount } from '../spending.js';
import { parseIngredientLine } from '../recipe-import.js';

test('Mengen: deutsches Format wie beim Rezept-Import', () => {
  const cases = [['1', 1], ['1,5', 1.5], ['1.5', 1.5], [',5', 0.5], ['1.000', 1000], ['2.500', 2500], ['1.000,5', 1000.5], ['½', 0.5], ['1½', 1.5], ['1 ½', 1.5],
    ['1 1/2', 1.5], ['3/4', 0.75], [' 2 ', 2], ['0,125', 0.125]];
  for (const [input, expected] of cases) assert.equal(parseQuantity(input), expected, input);
  for (const bad of ['', 'abc', '1e3', '2-3', '1/0', '1,2,3', '-1']) assert.ok(Number.isNaN(parseQuantity(bad)), bad);
  assert.equal(positive('1.000'), 1000);
  assert.equal(positive('½'), 0.5);
  assert.throws(() => positive('1e3'), /Menge/);
  // Dieselbe Angabe ergibt im Formular und beim Import dieselbe Menge.
  assert.equal(positive('1.000'), parseIngredientLine('1.000 g Mehl').quantity);
});

test('Beträge: Preis- und Ausgabenfelder verstehen dieselben Schreibweisen', () => {
  for (const [input, cents] of [['1,99', 199], ['1.99', 199], ['1.234,56', 123456], ['1,234.56', 123456], ['€ 12', 1200], ['12 EUR', 1200], ['7,5', 750]]) {
    assert.equal(euroCents(input), cents, input);
    assert.equal(parseCents(input), cents, `Preis ${input}`);
    assert.equal(parseAmount(input), cents, `Ausgabe ${input}`);
  }
  for (const bad of ['', 'abc', '-3', '0,001', '12,345']) {
    assert.equal(euroCents(bad), null, bad);
    assert.throws(() => parseCents(bad), /Preis/);
    assert.throws(() => parseAmount(bad), /Betrag/);
  }
  assert.equal(parseCents('0'), 0, 'ein Preis von 0 € bleibt möglich');
  assert.throws(() => parseAmount('0'), /größer als 0/);
});
