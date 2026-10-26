import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NO_AMOUNT, decodeEntities, firstUrl, htmlToText, parseDuration, parseIngredientLine, parseRecipeText, parseServings,
  recipeFromAnyText, recipeFromHtml, webUrl } from '../recipe-import.js';

const line = text => parseIngredientLine(text);

test('Zutatenzeilen: Mengen, Einheiten und Namen', () => {
  assert.deepEqual(line('400 g Spaghetti'), { name: 'Spaghetti', quantity: 400, unit: 'g' });
  assert.deepEqual(line('200g Mehl'), { name: 'Mehl', quantity: 200, unit: 'g' });
  assert.deepEqual(line('1,5 kg Kartoffeln'), { name: 'Kartoffeln', quantity: 1.5, unit: 'kg' });
  assert.deepEqual(line('1.000 g Mehl'), { name: 'Mehl', quantity: 1000, unit: 'g' });
  assert.deepEqual(line('2 EL Olivenöl'), { name: 'Olivenöl', quantity: 2, unit: 'EL' });
  assert.deepEqual(line('1/2 TL Salz'), { name: 'Salz', quantity: 0.5, unit: 'TL' });
  assert.deepEqual(line('1 1/2 Tassen Reis'), { name: 'Reis', quantity: 1.5, unit: 'Tassen' });
  assert.deepEqual(line('½ Bund Petersilie'), { name: 'Petersilie', quantity: 0.5, unit: 'Bund' });
  assert.deepEqual(line('1½ l Milch'), { name: 'Milch', quantity: 1.5, unit: 'l' });
  assert.deepEqual(line('2 Zwiebeln'), { name: 'Zwiebeln', quantity: 2, unit: 'Stück' });
  assert.deepEqual(line('3 Zehen Knoblauch'), { name: 'Knoblauch', quantity: 3, unit: 'Zehen' });
  assert.deepEqual(line('1 Zehe Knoblauch'), { name: 'Knoblauch', quantity: 1, unit: 'Zehe' });
  assert.deepEqual(line('2 Dosen Tomaten'), { name: 'Tomaten', quantity: 2, unit: 'Dosen' });
  assert.deepEqual(line('1 Pck. Vanillezucker'), { name: 'Vanillezucker', quantity: 1, unit: 'Packung' });
  assert.deepEqual(line('3 Blatt Gelatine'), { name: 'Gelatine', quantity: 3, unit: 'Blatt' });
});

test('Zutatenzeilen: Bereiche, Umrechnung, Zahlwörter und Füllwörter', () => {
  assert.deepEqual(line('2-3 Zwiebeln'), { name: 'Zwiebeln', quantity: 3, unit: 'Stück' });
  assert.deepEqual(line('2 bis 3 EL Sahne'), { name: 'Sahne', quantity: 3, unit: 'EL' });
  assert.deepEqual(line('50 cl Wein'), { name: 'Wein', quantity: 500, unit: 'ml' });
  assert.deepEqual(line('ca. 200 g Butter'), { name: 'Butter', quantity: 200, unit: 'g' });
  assert.deepEqual(line('eine Zwiebel'), { name: 'Zwiebel', quantity: 1, unit: 'Stück' });
  assert.deepEqual(line('eine halbe Zitrone'), { name: 'Zitrone', quantity: 0.5, unit: 'Stück' });
  assert.deepEqual(line('zwei Eier'), { name: 'Eier', quantity: 2, unit: 'Stück' });
  assert.deepEqual(line('ein Bund Petersilie'), { name: 'Petersilie', quantity: 1, unit: 'Bund' });
  assert.deepEqual(line('1 Dose à 400 g Tomaten'), { name: 'Tomaten (à 400 g)', quantity: 1, unit: 'Dose' });
  assert.deepEqual(line('Mehl – 200 g'), { name: 'Mehl', quantity: 200, unit: 'g' });
});

test('Zutatenzeilen ohne Menge erfinden keine Zahl', () => {
  assert.deepEqual(line('Salz'), { name: 'Salz', quantity: 1, unit: NO_AMOUNT });
  assert.deepEqual(line('etwas Zitronensaft'), { name: 'Zitronensaft', quantity: 1, unit: NO_AMOUNT });
  assert.deepEqual(line('Pfeffer nach Geschmack'), { name: 'Pfeffer', quantity: 1, unit: NO_AMOUNT });
  assert.deepEqual(line('ein paar Blätter Basilikum'), { name: 'ein paar Blätter Basilikum', quantity: 1, unit: NO_AMOUNT });
  assert.equal(line('   '), null);
  assert.equal(line('•'), null);
});

test('Aufzählungszeichen aus Texterkennung und Listen werden entfernt', () => {
  assert.deepEqual(line('• 200 g Zucker'), { name: 'Zucker', quantity: 200, unit: 'g' });
  assert.deepEqual(line('- 2 Eier'), { name: 'Eier', quantity: 2, unit: 'Stück' });
  assert.deepEqual(line('▢ 1 TL Backpulver'), { name: 'Backpulver', quantity: 1, unit: 'TL' });
  assert.deepEqual(line('e 3 EL Öl'), { name: 'Öl', quantity: 3, unit: 'EL' });
});

test('Namen werden gekürzt und Mengen bleiben positive Zahlen', () => {
  const long = line(`1 Stück ${'a'.repeat(300)}`);
  assert.equal(long.name.length, 120);
  assert.deepEqual(line('0 g Zucker'), { name: 'Zucker', quantity: 1, unit: NO_AMOUNT });
});

test('Portionen, Zeiten, Links und Entities', () => {
  assert.equal(parseServings('4 Portionen'), 4);
  assert.equal(parseServings(['6', '6 Personen']), 6);
  assert.equal(parseServings(2), 2);
  assert.equal(parseServings('für 1,5 Personen'), 1.5);
  assert.equal(parseServings('Portionen'), null);
  assert.equal(parseServings(0), null);
  assert.equal(parseDuration('PT1H30M'), 90);
  assert.equal(parseDuration('PT45M'), 45);
  assert.equal(parseDuration('kaputt'), 0);
  assert.equal(webUrl('javascript:alert(1)'), '');
  assert.equal(webUrl('https://user:pw@example.com/'), '');
  assert.equal(webUrl('https://example.com/a b'), 'https://example.com/a%20b');
  assert.equal(firstUrl('Schau mal: https://www.chefkoch.de/rezepte/1. Lecker!'), 'https://www.chefkoch.de/rezepte/1');
  assert.equal(decodeEntities('Gem&uuml;se &amp; K&#228;se &#x41; &bogus; &constructor;'), 'Gemüse & Käse A &bogus; &constructor;');
});

const chefkoch = `<!doctype html><html><head><title>Spaghetti Carbonara | Chefkoch</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Chefkoch"},
{"@type":"Recipe","name":"Spaghetti Carbonara","recipeYield":"4 Portionen","totalTime":"PT30M",
"keywords":["Pasta","schnell","Pasta"],"recipeCategory":"Hauptspeise","recipeCuisine":["Italien"],
"recipeIngredient":["400 g Spaghetti","150 g Schinkenspeck","2 Ei(er)","100 g Parmesan","Salz und Pfeffer","1 EL Olivenöl"],
"recipeInstructions":"Spaghetti in Salzwasser kochen.\\nSpeck in der Pfanne ausbraten.\\n<p>Eier mit K&auml;se verr&uuml;hren.</p>"}]}
</script></head><body>nichts</body></html>`;

test('Seite mit schema.org-Rezept wird vollständig übernommen', () => {
  const recipe = recipeFromHtml(chefkoch, 'https://www.chefkoch.de/rezepte/1');
  assert.equal(recipe.via, 'schema');
  assert.equal(recipe.name, 'Spaghetti Carbonara');
  assert.equal(recipe.servings, 4);
  assert.equal(recipe.sourceUrl, 'https://www.chefkoch.de/rezepte/1');
  assert.deepEqual(recipe.tags, ['Pasta', 'schnell', 'Hauptspeise', 'Italien']);
  assert.deepEqual(recipe.ingredients.map(row => `${row.quantity} ${row.unit} ${row.name}`), [
    '400 g Spaghetti', '150 g Schinkenspeck', '2 Stück Ei(er)', '100 g Parmesan', `1 ${NO_AMOUNT} Salz und Pfeffer`, '1 EL Olivenöl']);
  assert.equal(recipe.instructions, 'Gesamtzeit: 30 Min.\n\n1. Spaghetti in Salzwasser kochen.\n\n2. Speck in der Pfanne ausbraten.\n\n3. Eier mit Käse verrühren.');
});

test('HowToSection, HowToStep und JSON-LD als Liste', () => {
  const html = `<script type='application/ld+json'>[{"@type":["Recipe","Thing"],"name":"Kuchen","recipeYield":12,
  "recipeIngredient":["250 g Mehl"],"recipeInstructions":[{"@type":"HowToSection","name":"Teig","itemListElement":[
  {"@type":"HowToStep","text":"Mehl sieben."},{"@type":"HowToStep","text":"Alles verrühren."}]},
  {"@type":"HowToSection","name":"Backen","itemListElement":[{"@type":"HowToStep","name":"Backen","text":"40 Minuten backen."}]}]}]</script>`;
  const recipe = recipeFromHtml(html, '');
  assert.equal(recipe.servings, 12);
  assert.equal(recipe.instructions, 'Teig:\n\n1. Mehl sieben.\n\n2. Alles verrühren.\n\nBacken:\n\n3. 40 Minuten backen.');
});

test('Kaputtes JSON-LD mit Zeilenumbrüchen in Strings wird repariert; Seite ohne Rezept fällt auf Text zurück', () => {
  const broken = '<script type="application/ld+json">{"@type":"Recipe","name":"Suppe\n mit Brot","recipeIngredient":["1 l Wasser"],"recipeInstructions":"Kochen."}</script>';
  assert.equal(recipeFromHtml(broken).name, 'Suppe mit Brot');
  const plain = recipeFromHtml('<html><head><title>Pfannkuchen - Blog</title></head><body><h1>Pfannkuchen</h1><p>Zutaten für 4 Personen:</p><ul><li>250 g Mehl</li><li>3 Eier</li><li>500 ml Milch</li></ul><h2>Zubereitung</h2><p>Alles verrühren und in der Pfanne ausbacken.</p></body></html>', 'https://blog.example/pfannkuchen');
  assert.equal(plain.via, 'text');
  assert.equal(plain.name, 'Pfannkuchen');
  assert.equal(plain.servings, 4);
  assert.deepEqual(plain.ingredients.map(row => row.name), ['Mehl', 'Eier', 'Milch']);
  assert.match(plain.instructions, /ausbacken/);
  assert.match(plain.warnings[0], /geschätzt/);
});

test('htmlToText entfernt Skripte und Stile', () => {
  assert.equal(htmlToText('<style>a{}</style><script>alert(1)</script><p>Hallo&nbsp;Welt</p><ul><li>eins</li><li>zwei</li></ul>'), 'Hallo Welt\n\neins\n\nzwei');
});

test('Freitext mit Überschriften (Screenshot-Texterkennung)', () => {
  const recipe = parseRecipeText(`Cremige Tomatensuppe 🍅

Zutaten für 4 Portionen:
• 800 g Tomaten
• 1 Zwiebel
2 EL Olivenöl
Für die Einlage:
100 g Sahne
Salz, Pfeffer

Zubereitung:
Zwiebel würfeln und in Öl glasig dünsten. Tomaten
zugeben und 20 Minuten köcheln lassen.

Mit der Sahne ver-
feinern und pürieren.`);
  assert.equal(recipe.name, 'Cremige Tomatensuppe 🍅');
  assert.equal(recipe.servings, 4);
  assert.deepEqual(recipe.ingredients.map(row => `${row.quantity} ${row.unit} ${row.name}`),
    ['800 g Tomaten', '1 Stück Zwiebel', '2 EL Olivenöl', '100 g Sahne', `1 ${NO_AMOUNT} Salz, Pfeffer`]);
  assert.equal(recipe.instructions, 'Zwiebel würfeln und in Öl glasig dünsten. Tomaten zugeben und 20 Minuten köcheln lassen.\n\nMit der Sahne verfeinern und pürieren.');
  assert.deepEqual(recipe.warnings, []);
});

test('Freitext ohne Überschriften: Zutatenblock wird am Aufbau erkannt', () => {
  const recipe = parseRecipeText(`Mein Pfannkuchenrezept
250 g Mehl
3 Eier
500 ml Milch
1 Prise Salz
Alles verrühren und 10 Minuten ruhen lassen. Dann in der Pfanne ausbacken.`);
  assert.equal(recipe.name, 'Mein Pfannkuchenrezept');
  assert.deepEqual(recipe.ingredients.map(row => row.name), ['Mehl', 'Eier', 'Milch', 'Salz']);
  assert.match(recipe.instructions, /^Alles verrühren/);
});

test('Arbeitsschritte mit Zahl am Anfang gelten nicht als Zutaten', () => {
  const recipe = parseRecipeText(`Suppe
Zutaten
1 l Brühe
2 Karotten
Zubereitung
10 Minuten kochen
5 Minuten ziehen lassen`);
  assert.deepEqual(recipe.ingredients.map(row => row.name), ['Brühe', 'Karotten']);
  assert.match(recipe.instructions, /10 Minuten kochen/);
});

test('Text ohne erkennbare Struktur liefert Warnungen statt Fehlern', () => {
  const recipe = parseRecipeText('Das ist ein Satz ohne Zutaten.');
  assert.equal(recipe.ingredients.length, 0);
  assert.ok(recipe.warnings.length >= 1);
  assert.equal(parseRecipeText('').instructions, '');
});

test('Eingefügtes JSON-LD und eingefügtes HTML werden erkannt', () => {
  const json = JSON.stringify({ '@type': 'Recipe', name: 'Brot', recipeIngredient: ['500 g Mehl'], recipeInstructions: 'Backen.' });
  assert.equal(recipeFromAnyText(json).name, 'Brot');
  assert.equal(recipeFromAnyText(chefkoch, 'https://www.chefkoch.de/').name, 'Spaghetti Carbonara');
  assert.equal(recipeFromAnyText('Zutaten\n2 Eier\n1 Prise Salz\nZubereitung\nKochen.').via, 'text');
  assert.equal(recipeFromAnyText('x', 'javascript:alert(1)').sourceUrl, '');
});
