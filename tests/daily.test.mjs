import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DAILY_MAX, extractRecipeLinks, planDay, recipeKey, slugTitle } from '../daily.js';

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
