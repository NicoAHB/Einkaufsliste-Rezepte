import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES, categoryLabel, groupByCategory, guessCategory, isCategory, itemCategory, orderCategories, rememberedCategory, suggestCategory, validAisles } from '../categories.js';

const corpus = {
  obst: ['Äpfel', 'Bananen', 'Zwiebeln', 'Rote Zwiebeln', 'Knoblauch', 'Kartoffeln', 'Süßkartoffeln', 'Tomaten', 'Cherrytomaten', 'Gurke', 'Salatgurke', 'Paprika', 'Karotten', 'Möhren', 'Brokkoli', 'Blumenkohl', 'Rotkohl', 'Eisbergsalat', 'Rucola', 'Spinat', 'Zucchini', 'Zitronen', 'Limetten', 'Avocado', 'Champignons', 'Frühlingszwiebeln', 'Lauch', 'Petersilie', 'Basilikum', 'Ingwer', 'Erdbeeren', 'Himbeeren', 'Preiselbeeren', 'Weintrauben', 'Gemüse', 'Frisches Gemüse', 'Maiskolben', 'Chilischote', 'Kohlrabi', 'Mangold'],
  brot: ['Brot', 'Vollkornbrot', 'Brötchen', 'Toastbrot', 'Baguette', 'Croissants', 'Tortillas', 'Käsekuchen', 'Knäckebrot', 'Laugenbrezel'],
  fleisch: ['Hackfleisch', 'Gehacktes', 'Hähnchenbrust', 'Rinderhack', 'Schweinefilet', 'Kochschinken', 'Salami', 'Bratwurst', 'Würstchen', 'Lachs', 'Räucherlachs', 'Garnelen', 'Fischfilet', 'Speck', 'Bacon', 'Putenbrust', 'Lammkeule', 'Pfeffersalami', 'Currywurst', 'Aufschnitt', 'Rindersteak', 'Fleischwurst'],
  kuehl: ['Milch', 'H-Milch', 'Vollmilch', 'Buttermilch', 'Hafermilch', 'Butter', 'Kräuterbutter', 'Eier', 'Ei', 'Joghurt', 'Naturjoghurt', 'Quark', 'Sahne', 'Schlagsahne', 'Schmand', 'Crème fraîche', 'Mozzarella', 'Gouda', 'Parmesan', 'Feta', 'Frischkäse', 'Reibekäse', 'Mascarpone', 'Tofu', 'Kaffeesahne', 'Margarine', 'Vanillepudding'],
  tiefkuehl: ['Tiefkühlpizza', 'Pommes', 'Eis', 'Eiscreme', 'Fischstäbchen', 'Pizza', 'Rahmspinat', 'Gefrorene Beeren'],
  vorrat: ['Nudeln', 'Spaghetti', 'Eiernudeln', 'Reis', 'Basmatireis', 'Milchreis', 'Mehl', 'Weizenmehl', 'Zucker', 'Haferflocken', 'Müsli', 'Couscous', 'Linsen', 'Kichererbsen', 'Kidneybohnen', 'Mais', 'Passierte Tomaten', 'Gehackte Tomaten', 'Tomatenmark', 'Kokosmilch', 'Erdnussbutter', 'Thunfisch', 'Honig', 'Marmelade', 'Nutella', 'Walnüsse', 'Mandeln', 'Rosinen', 'Backpulver', 'Hefe', 'Oliven', 'Sonnenblumenkerne', 'Paniermehl', 'Apfelmus', 'Sauerkraut', 'Pesto'],
  gewuerze: ['Salz', 'Pfeffer', 'Olivenöl', 'Öl', 'Rapsöl', 'Sonnenblumenöl', 'Essig', 'Balsamico', 'Weinessig', 'Senf', 'Ketchup', 'Mayonnaise', 'Sojasauce', 'Paprikapulver', 'Curry', 'Currypulver', 'Zimt', 'Muskatnuss', 'Oregano', 'Kurkuma', 'Gemüsebrühe', 'Hühnerbrühe', 'Fleischbrühe', 'Zitronensaft', 'Vanillezucker', 'Grillsauce', 'Salatdressing', 'Tabasco', 'Knoblauchpulver'],
  snacks: ['Chips', 'Kartoffelchips', 'Schokolade', 'Butterkeks', 'Gummibärchen', 'Müsliriegel', 'Popcorn', 'Kekse', 'Salzstangen'],
  getraenke: ['Wasser', 'Mineralwasser', 'Orangensaft', 'Apfelsaft', 'Apfelschorle', 'Cola', 'Bier', 'Rotwein', 'Weißwein', 'Wein', 'Prosecco', 'Tee', 'Pfefferminztee', 'Eistee', 'Kaffee', 'Kaffeebohnen', 'Limonade', 'Sekt'],
  haushalt: ['Spülmittel', 'Toilettenpapier', 'Küchenrolle', 'Müllbeutel', 'Waschmittel', 'Zahnpasta', 'Shampoo', 'Duschgel', 'Alufolie', 'Backpapier', 'Kaffeefilter', 'Spülmaschinentabs', 'Taschentücher', 'Batterien', 'Katzenfutter']
};

test('Schätzung nach Stichwörtern: typische Einkäufe landen im richtigen Gang', () => {
  const wrong = [];
  for (const [id, names] of Object.entries(corpus)) for (const name of names) if (guessCategory(name) !== id) wrong.push(`${name}: ${guessCategory(name)} statt ${id}`);
  assert.deepEqual(wrong, []);
});

test('Unbekanntes und Leeres bleibt ohne Schätzung', () => {
  for (const name of ['Xyzzy', '', '   ', 'Geschenk für Oma']) assert.equal(guessCategory(name), null);
  assert.equal(itemCategory({ name: 'Xyzzy' }), 'sonstiges');
});

test('Gelerntes schlägt Schätzung: zuletzt verwendete Kategorie desselben Namens', () => {
  const items = [{ name: 'Nudeln', category: 'kuehl', updatedAt: '2026-01-01' }, { name: ' nudeln ', category: 'tiefkuehl', updatedAt: '2026-02-01' },
    { name: 'Nudeln', category: 'ungueltig', updatedAt: '2026-03-01' }, { name: 'Milch', updatedAt: '2026-03-01' }];
  assert.equal(rememberedCategory(items, 'NUDELN'), 'tiefkuehl');
  assert.equal(suggestCategory('Nudeln', items), 'tiefkuehl');
  assert.equal(suggestCategory('Milch', items), 'kuehl');
  assert.equal(rememberedCategory([], 'Milch'), null);
});

test('Ausdrücklich gesetzte Kategorie des Artikels gewinnt', () => {
  assert.equal(itemCategory({ name: 'Milch', category: 'getraenke' }, []), 'getraenke');
  assert.equal(itemCategory({ name: 'Milch', category: 'kaputt' }, []), 'kuehl');
  assert.equal(itemCategory({ name: 'Milch', category: null }, []), 'kuehl');
});

test('Gruppierung: Reihenfolge wie im Laden, leere Gruppen fehlen, Namen alphabetisch', () => {
  const rows = ['Zwiebeln', 'Butter', 'Äpfel', 'Spülmittel', 'Xyzzy'].map(name => ({ name }));
  const groups = groupByCategory(rows);
  assert.deepEqual(groups.map(group => group.id), ['obst', 'kuehl', 'haushalt', 'sonstiges']);
  assert.deepEqual(groups[0].items.map(item => item.name), ['Äpfel', 'Zwiebeln']);
  assert.deepEqual(groupByCategory([]), []);
});

test('Kategorienliste ist konsistent', () => {
  assert.equal(new Set(CATEGORIES.map(category => category.id)).size, CATEGORIES.length);
  assert.equal(CATEGORIES.at(-1).id, 'sonstiges');
  assert.ok(isCategory('obst') && !isCategory('x') && !isCategory(null));
  assert.equal(categoryLabel('obst'), 'Obst & Gemüse');
  assert.equal(categoryLabel('nix'), 'Sonstiges');
});

test('Lange Artikelverläufe bremsen die Anzeige nicht aus', () => {
  const history = Array.from({ length: 20000 }, (_, index) => ({ name: `Artikel ${index % 500}`, category: 'vorrat', updatedAt: `2026-01-${String(1 + index % 28).padStart(2, '0')}` }));
  const rows = Array.from({ length: 300 }, (_, index) => ({ name: `Artikel ${index}` }));
  const started = performance.now();
  const groups = groupByCategory(rows, history);
  assert.ok(performance.now() - started < 500, `zu langsam: ${Math.round(performance.now() - started)} ms`);
  assert.equal(groups.find(group => group.id === 'vorrat').items.length, 300);
});

test('Eigene Reihenfolge der Gänge: genannte zuerst, der Rest wie im Standard; Unbekanntes und Doppeltes zählt nicht', () => {
  const ids = order => orderCategories(order).map(category => category.id);
  assert.deepEqual(ids(null), CATEGORIES.map(category => category.id), 'ohne Liste: Standardweg');
  assert.deepEqual(ids(undefined), ids([]));
  assert.deepEqual(ids(['getraenke', 'obst']).slice(0, 3), ['getraenke', 'obst', 'brot']);
  assert.equal(ids(['getraenke', 'obst']).length, CATEGORIES.length, 'kein Gang geht verloren');
  assert.deepEqual(ids(['obst', 'obst', 'unsinn', 7, null]), ids(['obst']), 'doppelt und unbekannt wird ignoriert');
  assert.deepEqual(ids('kein Feld'), ids(null));
  assert.equal(new Set(ids(['vorrat', 'sonstiges', 'obst'])).size, CATEGORIES.length);
  const input = ['vorrat']; ids(input); assert.deepEqual(input, ['vorrat'], 'die Eingabe bleibt unverändert');
});

test('Gültige Liste: fehlt oder null ist der Standard; nur bekannte, nicht doppelte Kennungen', () => {
  for (const ok of [undefined, null, [], ['obst'], CATEGORIES.map(category => category.id)]) assert.equal(validAisles(ok), true, JSON.stringify(ok));
  for (const bad of ['obst', {}, ['unsinn'], ['obst', 'obst'], [1], [...CATEGORIES.map(category => category.id), 'obst']]) assert.equal(validAisles(bad), false, JSON.stringify(bad));
});

test('groupByCategory ordnet nach der Reihenfolge des Geschäfts; ohne Angabe bleibt alles wie bisher', () => {
  const rows = ['Tomaten', 'Nudeln', 'Milch', 'Wasser'].map(name => ({ name }));
  const labels = order => groupByCategory(rows, rows, order).map(group => group.id);
  assert.deepEqual(labels(), ['obst', 'kuehl', 'vorrat', 'getraenke']);
  assert.deepEqual(labels(null), labels());
  assert.deepEqual(labels(['getraenke', 'vorrat']), ['getraenke', 'vorrat', 'obst', 'kuehl']);
  assert.deepEqual(labels(['unsinn']), labels(), 'Unbekanntes ändert nichts');
  // Namen bleiben in jeder Gruppe alphabetisch
  const mixed = ['Birne', 'Apfel', 'Zwiebel'].map(name => ({ name }));
  assert.deepEqual(groupByCategory(mixed, mixed, ['obst'])[0].items.map(item => item.name), ['Apfel', 'Birne', 'Zwiebel']);
});
