import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL, FAVORITES, LONG_AGO, LONG_AGO_DAYS, cookedLongAgo, filterOptions, pickRecipes } from '../recipe-filter.js';

const TODAY = '2026-10-28';
const recipe = (id, name, extra = {}) => ({ id, name, tags: [], servings: 2, favorite: false, lastCookedAt: '', ...extra });
const ids = list => list.map(row => row.id);

test('„Lange nicht gekocht“: noch nie oder seit mindestens 28 Tagen nicht; ein Datum mit Uhrzeit zählt nach dem Tag', () => {
  assert.equal(LONG_AGO_DAYS, 28);
  assert.equal(cookedLongAgo(recipe('a', 'A'), TODAY), true, 'noch nie gekocht');
  assert.equal(cookedLongAgo(recipe('a', 'A', { lastCookedAt: '2026-09-30' }), TODAY), true, 'genau 28 Tage');
  assert.equal(cookedLongAgo(recipe('a', 'A', { lastCookedAt: '2026-10-01' }), TODAY), false, '27 Tage');
  assert.equal(cookedLongAgo(recipe('a', 'A', { lastCookedAt: '2026-10-28' }), TODAY), false, 'heute');
  assert.equal(cookedLongAgo(recipe('a', 'A', { lastCookedAt: '2026-09-30T23:59:00.000Z' }), TODAY), true, 'Uhrzeit wird ignoriert');
  assert.equal(cookedLongAgo(recipe('a', 'A', { lastCookedAt: '2026-11-15' }), TODAY), false, 'in der Zukunft');
});

test('Einträge: „Alle Rezepte“ zuerst, Favoriten und „Lange nicht gekocht“ nur wenn es welche gibt, dann die Stichworte sortiert und gezählt', () => {
  const recipes = [
    recipe('1', 'Linsensuppe', { tags: ['Suppe', 'vegan'], favorite: true, lastCookedAt: '2026-10-20' }),
    recipe('2', 'Kürbissuppe', { tags: ['suppe', 'Einfach'], lastCookedAt: '2026-10-25' }),
    recipe('3', 'Pfannkuchen', { tags: ['süß', 'süß', ' Vegan '], lastCookedAt: '2026-10-26' }),
  ];
  assert.deepEqual(filterOptions(recipes, TODAY), [
    { value: ALL, label: 'Alle Rezepte', count: 3 },
    { value: FAVORITES, label: '★ Favoriten', count: 1 },
    { value: 'tag:einfach', label: 'Einfach', count: 1 },
    { value: 'tag:suppe', label: 'Suppe', count: 2 },
    { value: 'tag:süß', label: 'Süß', count: 1 },
    { value: 'tag:vegan', label: 'Vegan', count: 2 },
  ], 'vegan/Vegan und Suppe/suppe sind je ein Eintrag; doppelt genanntes Stichwort zählt einmal; nichts lange nicht gekocht, keine Zeile dafür');
  const old = filterOptions([...recipes, recipe('4', 'Alt', { lastCookedAt: '2026-01-01' })], TODAY);
  assert.deepEqual(old.map(option => option.value).slice(0, 3), [ALL, FAVORITES, LONG_AGO]);
  assert.equal(old[2].count, 1);
  assert.deepEqual(filterOptions([recipe('1', 'A', { lastCookedAt: '2026-10-27' })], TODAY), [{ value: ALL, label: 'Alle Rezepte', count: 1 }], 'ohne Favoriten und Stichworte nur „Alle Rezepte“');
  assert.deepEqual(filterOptions([], TODAY), [{ value: ALL, label: 'Alle Rezepte', count: 0 }]);
});

test('Stichworte: leere und fehlende werden übersehen; Umlaute und Großschreibung stimmen; die Schreibweise des ersten Rezepts mit großem Anfang', () => {
  const recipes = [recipe('1', 'A', { tags: ['', '  ', 'ÖKO'], lastCookedAt: '2026-10-27' }), { id: '2', name: 'B', lastCookedAt: '2026-10-27' }, recipe('3', 'C', { tags: ['öko', 'schnell'], lastCookedAt: '2026-10-27' })];
  assert.deepEqual(filterOptions(recipes, TODAY).slice(1).map(option => [option.label, option.count]), [['ÖKO', 2], ['Schnell', 1]]);
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:öko', { today: TODAY })), ['1', '3'], 'ÖKO und öko sind dasselbe');
  assert.deepEqual(pickRecipes(recipes, 'tag:schnell', { today: TODAY }).map(row => row.id), ['3']);
});

test('Auswahl nach Stichwort: nur passende Rezepte, Favoriten zuerst, dann nach Namen (ä, ö, ü wie im Deutschen)', () => {
  const recipes = [
    recipe('1', 'Zwiebelsuppe', { tags: ['Suppe'] }), recipe('2', 'Äpfel-Suppe', { tags: ['suppe'] }),
    recipe('3', 'Nudeln', { tags: ['Pasta'] }), recipe('4', 'Tomatensuppe', { tags: ['Suppe'], favorite: true }),
  ];
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:suppe', { today: TODAY })), ['4', '2', '1']);
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:gibtsnicht', { today: TODAY })), [], 'kein passendes Rezept: leere Liste');
});

test('Alle Rezepte (und ein unbekannter Eintrag): Favoriten zuerst, dann nach Namen', () => {
  const recipes = [recipe('1', 'Brot'), recipe('2', 'Apfelkuchen'), recipe('3', 'Curry', { favorite: true })];
  assert.deepEqual(ids(pickRecipes(recipes, ALL, { today: TODAY })), ['3', '2', '1']);
  assert.deepEqual(ids(pickRecipes(recipes, 'unsinn', { today: TODAY })), ['3', '2', '1']);
  assert.deepEqual(ids(pickRecipes(recipes, FAVORITES, { today: TODAY })), ['3']);
});

test('Lange nicht gekocht: noch nie gekochte zuerst, dann das am längsten her; kürzlich gekochte fehlen', () => {
  const recipes = [
    recipe('1', 'Zebra', { lastCookedAt: '2026-08-01' }), recipe('2', 'Adler', { lastCookedAt: '2026-10-27' }),
    recipe('3', 'Marmor', { lastCookedAt: '' }), recipe('4', 'Birne', { lastCookedAt: '2026-06-01', favorite: true }),
    recipe('5', 'Anis', { lastCookedAt: '' }), recipe('6', 'Dattel', { lastCookedAt: '2026-08-01T10:00:00.000Z' }),
  ];
  assert.deepEqual(ids(pickRecipes(recipes, LONG_AGO, { today: TODAY })), ['5', '3', '4', '6', '1'], 'Favoriten bekommen hier keinen Vorrang; gleiche Tage nach Namen');
});

test('Das gewählte Rezept bleibt in der Liste, auch wenn der Filter es ausschließt, und steht an seinem Platz', () => {
  const recipes = [recipe('1', 'Apfelkuchen', { tags: ['süß'] }), recipe('2', 'Linsensuppe', { tags: ['Suppe'] }), recipe('3', 'Tomatensuppe', { tags: ['Suppe'] })];
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:suppe', { today: TODAY, keep: '1' })), ['1', '2', '3']);
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:suppe', { today: TODAY, keep: '' })), ['2', '3']);
  assert.deepEqual(ids(pickRecipes(recipes, 'tag:suppe', { today: TODAY, keep: 'weg' })), ['2', '3'], 'ein unbekanntes Rezept kommt nicht dazu');
  assert.deepEqual(ids(pickRecipes([...recipes, recipe('4', 'Frisch', { lastCookedAt: '2026-10-27' })], LONG_AGO, { today: TODAY, keep: '4' })), ['1', '2', '3', '4'], 'auch bei „Lange nicht gekocht“');
  assert.deepEqual(ids(pickRecipes(recipes, FAVORITES, { today: TODAY, keep: '2' })), ['2']);
});

test('Die Eingabe wird nicht verändert', () => {
  const recipes = [recipe('2', 'B', { tags: ['x'] }), recipe('1', 'A', { tags: ['x'] })];
  const copy = structuredClone(recipes);
  pickRecipes(recipes, 'tag:x', { today: TODAY }); filterOptions(recipes, TODAY);
  assert.deepEqual(recipes, copy);
});
