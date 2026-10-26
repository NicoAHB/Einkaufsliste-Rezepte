import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BUILTIN_PER_DAY, builtinKey, dayNumber, draftFromBuiltin, validBuiltin } from '../daily.js';
import { makeRecipe, planGenerated, recipeCount } from '../recipe-maker.js';
import { parseIngredientLine } from '../recipe-import.js';

const collection = JSON.parse(await readFile(path.join(import.meta.dirname, '..', 'rezepte-des-tages.json'), 'utf8'));
const count = recipeCount(), all = Array.from({ length: count }, (_, number) => makeRecipe(number));
const SAUSAGE = 'Bratwürste|Würstchen|Wurst|wurst';
const MEAT = new RegExp(`Hähnchen|Pute|Rind|Hackfleisch|${SAUSAGE}|Speck|Schinken|Lachs|Thunfisch|Garnelen`);

describe('Neue Rezepte aus Bausteinen (recipe-maker)', () => {
  test('es gibt genug Rezepte für mehrere Jahre, jedes hat einen eigenen Namen und keines gleicht der eingebauten Sammlung', () => {
    assert.ok(count >= 2000, `nur ${count} Rezepte`);
    const names = all.map(recipe => builtinKey(recipe.n));
    assert.equal(new Set(names).size, count, 'Namen sind eindeutig');
    const builtin = new Set(collection.map(entry => builtinKey(entry.n)));
    assert.deepEqual(names.filter(name => builtin.has(name)), [], 'kein Name aus der Sammlung');
  });
  test('jedes Rezept ist vollständig, die Zutaten lassen sich lesen, nichts ist doppelt oder kaputt formuliert', () => {
    for (const recipe of all) {
      assert.ok(validBuiltin(recipe), recipe.n);
      assert.equal(recipe.p, 4);
      assert.ok(recipe.t >= 5 && recipe.t <= 120 && recipe.t % 5 === 0, `${recipe.n}: ${recipe.t} Min.`);
      assert.ok(recipe.z.length >= 6 && recipe.s.length >= 4, `${recipe.n}: zu wenig Zutaten oder Schritte`);
      const parsed = recipe.z.map(parseIngredientLine);
      assert.ok(parsed.every(row => row?.name), `${recipe.n}: eine Zutat ist nicht lesbar`);
      const keys = parsed.map(row => row.name.toLowerCase());
      assert.equal(new Set(keys).size, keys.length, `${recipe.n}: Zutat doppelt (${keys.join(', ')})`);
      assert.ok(recipe.z.some(line => /^\d/.test(line)), `${recipe.n}: keine Mengen`);
      for (const step of recipe.s) {
        assert.match(step, /^[A-ZÄÖÜ].*[.!)]$/, `${recipe.n}: Satz „${step}“`);
        assert.doesNotMatch(step, /undefined|NaN|\$|\[object|  | ,|\.\./, `${recipe.n}: Platzhalter oder Doppelzeichen in „${step}“`);
      }
      assert.equal(new Set(recipe.s).size, recipe.s.length, `${recipe.n}: Schritt doppelt`);
      assert.doesNotMatch(recipe.n, /undefined|NaN|  /);
    }
  });
  test('Kategorien stimmen mit den Zutaten überein: vegetarisch ohne Fleisch und Fisch, Fleisch und Fisch mit Fleisch bzw. Fisch', () => {
    const known = new Set(collection.map(entry => entry.c));
    for (const recipe of all) {
      assert.ok(known.has(recipe.c), `${recipe.n}: Kategorie ${recipe.c} gibt es in der Sammlung nicht`);
      const text = recipe.z.join(' ');
      if (recipe.c === 'Vegetarisch' || recipe.c === 'Süß') assert.doesNotMatch(text, MEAT, recipe.n);
      if (recipe.c === 'Fleisch') assert.match(text, new RegExp(`Hähnchen|Pute|Rind|Hackfleisch|${SAUSAGE}|Speck|Schinken`), recipe.n);
      if (recipe.c === 'Fisch') assert.match(text, /Lachs|Thunfisch|Garnelen/, recipe.n);
    }
  });
  test('alle Rezeptarten kommen vor, Backen und Kochen haben eine Zeit, späte Zutaten stehen nach dem Garen', () => {
    const kinds = ['Nudelpfanne', 'Reispfanne', 'Kokos-Curry', 'Gnocchi-Pfanne', 'Wraps', 'Couscous-Bowl', 'Ofenblech', 'Kartoffelauflauf', 'Frittata', 'Flammkuchen', 'Tortilla-Pizza', 'Cremesuppe', 'Eintopf', 'Risotto', 'Crumble', 'Pfannkuchen', 'Milchreis', 'Quarkspeise', 'Overnight Oats'];
    for (const kind of kinds) assert.ok(all.filter(recipe => recipe.n.includes(kind)).length >= 30, `${kind} kommt zu selten vor`);
    const oven = all.find(recipe => recipe.n === 'Ofenblech mit Zucchini und Feta');
    assert.match(oven.s.join('\n'), /etwa 35 Minuten backen/);
    assert.ok(oven.s.findIndex(step => /^Feta würfeln, dann in den letzten 15 Minuten/.test(step)) > oven.s.findIndex(step => /backen/.test(step)), 'Feta kommt erst nach dem Backstart dazu');
    assert.equal(oven.c, 'Vegetarisch');
    const soup = all.find(recipe => recipe.n === 'Champignon-Cremesuppe mit Würstchen');
    assert.equal(soup.c, 'Suppe');
    assert.ok(soup.s.at(-1).startsWith('Würstchen'), 'der Belag steht am Schluss');
    assert.equal(all.find(recipe => recipe.n === 'Quarkspeise mit Erdbeeren und Mandeln').t, 15, 'ohne Kochen bleibt die Grundzeit');
  });
  test('draftFromBuiltin macht daraus einen Rezeptentwurf wie beim Import', () => {
    const draft = draftFromBuiltin(makeRecipe(7));
    assert.equal(draft.servings, 4);
    assert.ok(draft.ingredients.length >= 6 && draft.ingredients.every(row => row.name));
    assert.match(draft.instructions, /^Gesamtzeit: .*\n\n1\. /);
    assert.deepEqual(draft.tags, [makeRecipe(7).c]);
  });
});

describe('Reihenfolge der neuen Rezepte', () => {
  test('gleiche Nummer = gleiches Rezept, auch negativ und nach einer vollen Runde', () => {
    assert.deepEqual(makeRecipe(42), makeRecipe(42));
    assert.deepEqual(makeRecipe(5), makeRecipe(5 + count));
    assert.deepEqual(makeRecipe(-1), makeRecipe(count - 1));
    assert.notEqual(makeRecipe(1).n, makeRecipe(2).n);
  });
  test('aufeinanderfolgende Tage ergeben nie dasselbe Rezept: 900 Tage lang kein Wiederholen', () => {
    const seen = new Set(), start = dayNumber('2026-01-01');
    for (let offset = 0; offset < 900; offset++) {
      const day = new Date((start + offset) * 86400000).toISOString().slice(0, 10), picks = planGenerated(day);
      assert.equal(picks.length, BUILTIN_PER_DAY);
      for (const pick of picks) { assert.ok(!seen.has(pick.key), `${pick.title} am ${day} schon einmal`); seen.add(pick.key); }
    }
  });
  test('Vorschläge sind für alle gleich, enthalten Nummer und Titel und lassen sich neu erzeugen', () => {
    const a = planGenerated('2027-03-05'), b = planGenerated('2027-03-05');
    assert.deepEqual(a, b);
    assert.deepEqual(a.map(pick => makeRecipe(pick.gen).n), a.map(pick => pick.title));
    assert.deepEqual(a.map(pick => pick.key), a.map(pick => builtinKey(pick.title)));
    assert.notDeepEqual(a, planGenerated('2027-03-06'));
  });
  test('schon vorhandene Rezepte werden ersetzt, `from` füllt nur die freien Plätze', () => {
    const plain = planGenerated('2027-03-05'), taken = planGenerated('2027-03-05', new Set([plain[1].key]));
    assert.equal(taken.length, 3);
    assert.ok(!taken.some(pick => pick.key === plain[1].key), 'das vorhandene wird nicht vorgeschlagen');
    assert.equal(taken[0].key, plain[0].key); assert.equal(taken[2].key, plain[2].key);
    const rest = planGenerated('2027-03-05', new Set(), 2);
    assert.equal(rest.length, 1);
    assert.equal(rest[0].key, plain[2].key, 'Platz 3 bleibt derselbe, auch wenn davor Rezepte aus der Sammlung stehen');
    assert.deepEqual(planGenerated('2027-03-05', new Set(), 3), []);
  });
});
