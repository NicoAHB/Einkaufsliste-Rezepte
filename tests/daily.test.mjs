import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BUILTIN_PER_DAY, DAILY_MAX, builtinKey, dayNumber, draftFromBuiltin, extractRecipeLinks, fixedOrder, planBuiltin, planDay, recipeKey, slugTitle, validBuiltin } from '../daily.js';
import { NO_AMOUNT } from '../recipe-import.js';

const BASE = 'https://www.chefkoch.de/rezepte/tagesrezepte/';
const page = `<!doctype html><html><head><title>Tagesrezepte</title>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: [
  { '@type': 'ListItem', position: 1, url: 'https://www.chefkoch.de/rezepte/1111111/Spaghetti-Carbonara.html', name: 'Spaghetti Carbonara' },
  { '@type': 'ListItem', position: 2, item: { '@type': 'Recipe', '@id': 'https://www.chefkoch.de/rezepte/2222222/Linsensuppe.html', name: 'Linsensuppe &amp; Würstchen' } }] })}</script></head>
<body><nav><a href="/rezepte/">Rezepte</a><a href="/magazin/">Magazin</a></nav>
<a href="/rezepte/3333333/Kaesekuchen-ohne-Boden.html?utm=x#kommentare"><img alt="Käsekuchen"><span>Käsekuchen</span></a>
<a href='https://www.chefkoch.de/rezepte/1111111/Spaghetti-Carbonara.html'>noch einmal</a>
<a href="http://chefkoch.de/rezepte/4444444/Gem%C3%BCsepfanne-mit-Reis.html">Gemüsepfanne</a>
<a href="/rezepte/5555555/">ohne Namen</a><a href="/rezepte/kategorien/12/">keine Nummer</a>
<a href="javascript:void(0)">nichts</a></body></html>`;

describe('Rezepte des Tages: Links aus einer Seite', () => {
  test('Rezept-Links aus strukturierten Daten und aus dem HTML, ohne Doppelte, in Seitenreihenfolge', () => {
    const links = extractRecipeLinks(page, BASE);
    assert.deepEqual(links.map(link => link.key), ['chefkoch.de:1111111', 'chefkoch.de:2222222', 'chefkoch.de:3333333', 'chefkoch.de:4444444', 'chefkoch.de:5555555']);
    assert.equal(links[0].url, 'https://www.chefkoch.de/rezepte/1111111/Spaghetti-Carbonara.html');
    assert.equal(links[0].title, 'Spaghetti Carbonara', 'Titel aus den strukturierten Daten');
    assert.equal(links[1].title, 'Linsensuppe & Würstchen');
    assert.equal(links[2].url, 'https://www.chefkoch.de/rezepte/3333333/Kaesekuchen-ohne-Boden.html', 'Anhang (?utm, #) entfernt');
    assert.equal(links[2].title, 'Kaesekuchen ohne Boden', 'sonst Titel aus der Adresse');
    assert.equal(links[3].url, 'https://chefkoch.de/rezepte/4444444/Gem%C3%BCsepfanne-mit-Reis.html', 'http wird https');
    assert.equal(links[3].title, 'Gemüsepfanne mit Reis');
  });
  test('Seiten ohne Rezept-Links, kaputtes HTML und fremde Adressen ergeben eine leere Liste statt eines Fehlers', () => {
    for (const html of ['', '<html></html>', '<a href="/rezepte/">x</a>', '<script type="application/ld+json">{kaputt</script>', null, undefined]) assert.deepEqual(extractRecipeLinks(html, BASE), []);
    assert.doesNotThrow(() => extractRecipeLinks('<a href="/rezepte/1234567/X.html">', 'kein link'));
  });
  test('recipeKey und slugTitle', () => {
    assert.equal(recipeKey('https://www.chefkoch.de/rezepte/1111111/Name.html'), recipeKey('http://chefkoch.de/rezepte/1111111/Ganz-anderer-Name.html?x=1'));
    assert.notEqual(recipeKey('https://www.chefkoch.de/rezepte/1111111/a.html'), recipeKey('https://www.chefkoch.de/rezepte/1111112/a.html'));
    assert.equal(recipeKey('https://example.com/rezept/Tarte/'), 'example.com/rezept/tarte');
    assert.equal(slugTitle('https://x.de/rezepte/1/Spaghetti-Carbonara-nach-Omas-Art.html'), 'Spaghetti Carbonara nach Omas Art');
    assert.equal(slugTitle('nicht gültig'), '');
  });
});

describe('Rezepte des Tages: Auswahl für heute', () => {
  const many = Array.from({ length: 14 }, (_, index) => ({ url: `https://www.chefkoch.de/rezepte/${1000000 + index}/R${index}.html`, key: `chefkoch.de:${1000000 + index}`, title: `R${index}` }));
  test('höchstens zehn, ohne schon Entschiedenes und ohne schon vorhandene Rezepte, Reihenfolge bleibt', () => {
    assert.equal(planDay(many).length, DAILY_MAX);
    const plan = planDay(many, new Set(['chefkoch.de:1000000', 'chefkoch.de:1000003']), new Set(['chefkoch.de:1000001']));
    assert.deepEqual(plan.map(link => link.title), ['R2', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12']);
    assert.deepEqual(planDay(many.slice(0, 3), new Set(many.map(link => link.key))), [], 'alles entschieden: nichts mehr');
    assert.equal(planDay(many, new Set(), new Set(), 3).length, 3);
  });
});

describe('Eingebaute Rezeptsammlung (ohne Hilfsdienst)', async () => {
  const collection = JSON.parse(await readFile(path.join(import.meta.dirname, '..', 'rezepte-des-tages.json'), 'utf8'));
  test('jedes Rezept der Sammlung ist vollständig, eindeutig und seine Zutaten lassen sich lesen', () => {
    assert.ok(collection.length >= 60, `nur ${collection.length} Rezepte`);
    const names = collection.map(entry => entry.n.toLowerCase());
    assert.equal(new Set(names).size, names.length, 'doppelte Namen');
    for (const entry of collection) {
      assert.ok(validBuiltin(entry), entry.n);
      assert.ok(entry.z.length >= 3 && entry.s.length >= 3 && entry.n.length <= 60 && entry.t <= 240, entry.n);
      const draft = draftFromBuiltin(entry);
      assert.equal(draft.ingredients.length, entry.z.length, `${entry.n}: eine Zutat wurde nicht erkannt`);
      for (const row of draft.ingredients) assert.ok(row.name && row.quantity > 0 && row.unit, `${entry.n}: ${JSON.stringify(row)}`);
      assert.ok(draft.ingredients.some(row => row.unit !== NO_AMOUNT), entry.n);
      assert.match(draft.instructions, /^Gesamtzeit: .*\n\n1\. /s, entry.n);
    }
  });
  test('drei Rezepte pro Tag, am selben Tag auf jedem Gerät dieselben, an den Folgetagen andere, ohne Wiederholung innerhalb der Runde', () => {
    assert.equal(BUILTIN_PER_DAY, 3);
    const first = planBuiltin(collection, '2026-10-26'), again = planBuiltin(collection, '2026-10-26'), next = planBuiltin(collection, '2026-10-27');
    assert.equal(first.length, 3);
    assert.deepEqual(first.map(item => item.key), again.map(item => item.key));
    assert.equal(new Set([...first, ...next].map(item => item.key)).size, 6);
    const days = Math.floor(collection.length / 3), seen = new Set();
    for (let offset = 0; offset < days; offset++) {
      for (const item of planBuiltin(collection, new Date(Date.UTC(2026, 10, 1 + offset)).toISOString().slice(0, 10))) {
        assert.ok(!seen.has(item.key), `${item.title} kommt in der ersten Runde zweimal vor`); seen.add(item.key);
      }
    }
    assert.equal(seen.size, days * 3);
    assert.equal(dayNumber('1970-01-02'), 1);
  });
  test('Entschiedenes und schon Vorhandenes (gleicher Name) wird übersprungen, alles entschieden ergibt nichts', () => {
    const base = planBuiltin(collection, '2026-10-26');
    const decided = new Set([base[0].key]), known = new Set([builtinKey(base[1].title.toUpperCase())]);
    const plan = planBuiltin(collection, '2026-10-26', decided, known);
    assert.equal(plan.length, 3);
    assert.ok(!plan.some(item => item.key === base[0].key || item.key === base[1].key));
    assert.equal(plan[0].key, base[2].key, 'die Reihenfolge bleibt, die übersprungenen rücken nach');
    assert.deepEqual(planBuiltin(collection, '2026-10-26', new Set(collection.map(entry => builtinKey(entry.n)))), []);
    assert.deepEqual(planBuiltin([], '2026-10-26'), []);
    assert.equal(planBuiltin(collection.slice(0, 2), '2026-10-26').length, 2, 'weniger Rezepte als gewünscht: alle');
  });
  test('feste Mischung: gleiche Reihenfolge bei jedem Aufruf, jede Stelle genau einmal', () => {
    const order = fixedOrder(50);
    assert.deepEqual(order, fixedOrder(50));
    assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: 50 }, (_, index) => index));
    assert.notDeepEqual(order, Array.from({ length: 50 }, (_, index) => index), 'wirklich gemischt');
  });
});
