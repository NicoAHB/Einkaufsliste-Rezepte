import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGE, fitText, formatNumber, layoutRecipe, sheetIngredient, wrapText } from '../recipe-sheet.js';
import { jpegInfo, makePdf, textWidth } from '../pdf.js';

const photo = () => { const bytes = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAMABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMF/8QAGRAAAQUAAAAAAAAAAAAAAAAAAAISFFFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAP/xAAYEQACAwAAAAAAAAAAAAAAAAAAAQITFP/aAAwDAQACEQMRAD8AnJ0SdM16rD1WMsSl7P/Z', 'base64')); return { bytes, ...jpegInfo(bytes) }; };
const recipe = (extra = {}) => ({ name: 'Spiegeleierkuchen', servings: 12, tags: ['Backen', 'Kuchen'], sourceHost: '', sourceUrl: '', ...extra });
const rows = [['Eier', 6, 'Stück'], ['Zucker', 200, 'g'], ['Butter, weich', 250, 'g'], ['Salz', 1, 'nach Bedarf']];
const ingredients = (list = rows, factor = 1) => list.map(([name, quantity, unit]) => sheetIngredient({ name, quantity, unit }, factor));
const STEPS = 'Den Backofen vorheizen.\nEier und Zucker schaumig rühren.\nAlles auf das Blech streichen und backen.';
const texts = page => page.items.filter(item => item.type === 'text');
const allText = layout => layout.pages.flatMap(texts);
const content = layout => allText(layout).map(item => item.text).join('\n');
const make = (options = {}) => layoutRecipe({ recipe: recipe(options.recipe), ingredients: options.ingredients ?? ingredients(), instructions: options.instructions ?? STEPS, photo: options.photo ?? null });

test('Zutat: Menge und Einheit, Umrechnung auf andere Portionen, „nach Bedarf“ ohne erfundene Zahl, deutsche Zahlenschreibweise', () => {
  assert.deepEqual(sheetIngredient({ name: 'Mehl', quantity: 250, unit: 'g' }), { amount: '250 g', name: 'Mehl', soft: false });
  assert.equal(sheetIngredient({ name: 'Mehl', quantity: 250, unit: 'g' }, 2).amount, '500 g');
  assert.equal(sheetIngredient({ name: 'Öl', quantity: 1, unit: 'EL' }, 1.5).amount, '1,5 EL');
  assert.equal(sheetIngredient({ name: 'Zucker', quantity: 1000, unit: 'g' }).amount, '1.000 g');
  assert.deepEqual(sheetIngredient({ name: ' Salz ', quantity: 1, unit: 'nach Bedarf' }, 4), { amount: 'nach Bedarf', name: 'Salz', soft: true });
  assert.equal(formatNumber(0.333333), '0,33');
});

test('Text umbrechen: ganze Wörter, Zeilenumbrüche bleiben, sehr lange Wörter werden mit Trennstrich gebrochen, nie breiter als erlaubt', () => {
  const lines = wrapText('Die Eier trennen und das Eigelb mit dem Zucker schaumig rühren', 'sans', 10.5, 120);
  assert.ok(lines.length >= 3);
  for (const line of lines) assert.ok(textWidth(line, 'sans', 10.5) <= 120, line);
  assert.equal(lines.join(' '), 'Die Eier trennen und das Eigelb mit dem Zucker schaumig rühren', 'nichts geht verloren');
  assert.deepEqual(wrapText('Eins\nZwei', 'sans', 10, 200), ['Eins', 'Zwei']);
  assert.deepEqual(wrapText('', 'sans', 10, 100), ['']);
  const long = wrapText('Donaudampfschifffahrtsgesellschaftskapitän', 'sans', 10.5, 80);
  assert.ok(long.length > 1 && long.slice(0, -1).every(line => line.endsWith('-')), 'gebrochen mit Trennstrich');
  for (const line of long) assert.ok(textWidth(line, 'sans', 10.5) <= 80 + 0.01, line);
  assert.equal(long.join('').replace(/-/g, ''), 'Donaudampfschifffahrtsgesellschaftskapitän');
});

test('Text anpassen: erst kleiner, dann mit „…“ gekürzt', () => {
  assert.deepEqual(fitText('Kurz', 'sansBold', 12.5, 200, 8), { text: 'Kurz', size: 12.5 });
  const smaller = fitText('Backen, Kuchen, Sommer', 'sansBold', 12.5, 118, 8);
  assert.ok(smaller.size < 12.5 && smaller.size >= 8 && !smaller.text.endsWith('…'));
  const cut = fitText('Backen, Kuchen, Sommer, Winter, Herbst, Frühling', 'sansBold', 12.5, 118, 8);
  assert.equal(cut.size, 8); assert.ok(cut.text.endsWith('…')); assert.ok(textWidth(cut.text, 'sansBold', 8) <= 118);
});

test('Rezeptblatt: eine A4-Seite mit Rahmen, „REZEPT“, Titel, vier Kästchen, Zutaten und Schritten; alles ist Text oder Form, nichts fehlt', () => {
  const layout = make();
  assert.equal(layout.pages.length, 1);
  assert.deepEqual([layout.width, layout.height, layout.pages[0].width, layout.pages[0].height], [PAGE.width, PAGE.height, PAGE.width, PAGE.height]);
  assert.equal(layout.title, 'Spiegeleierkuchen');
  const text = content(layout);
  for (const part of ['REZEPT', 'Spiegeleierkuchen', 'PORTIONEN', '12', 'ZUTATEN', '4', 'STICHWORTE', 'Backen, Kuchen', 'QUELLE', 'Eigenes Rezept', 'ZUBEREITUNG', '6 Stück', 'Eier', '200 g', 'Butter, weich', 'nach Bedarf', 'Salz',
    '1.', 'Den Backofen vorheizen.', '2.', 'Eier und Zucker schaumig rühren.', '3.', 'Einkauf & Rezepte']) assert.ok(text.includes(part), `${part} fehlt`);
  const title = allText(layout).find(item => item.text === 'Spiegeleierkuchen');
  assert.equal(title.font, 'serifBold'); assert.equal(title.size, 32);
  assert.equal(layout.pages[0].items[0].type, 'rect', 'der Rahmen kommt zuerst');
  assert.equal(layout.pages[0].items.filter(item => item.type === 'image').length, 0, 'ohne Foto kein Bild');
});

test('Eckdaten: vier Kästchen nebeneinander ohne Foto, zwei mal zwei mit Foto neben dem Sofortbild; Quelle zeigt den Rechnernamen', () => {
  const boxes = layout => layout.pages[0].items.filter(item => item.type === 'rect' && item.fill === '#fbf3e6');
  const plain = boxes(make({ recipe: { sourceHost: 'chefkoch.de', sourceUrl: 'https://www.chefkoch.de/rezepte/1/kuchen' } }));
  assert.equal(plain.length, 4);
  assert.equal(new Set(plain.map(box => box.y)).size, 1, 'eine Reihe');
  const withPhoto = make({ photo: photo() });
  const grid = boxes(withPhoto);
  assert.equal(grid.length, 4);
  assert.equal(new Set(grid.map(box => box.y)).size, 2, 'zwei Reihen');
  const image = withPhoto.pages[0].items.find(item => item.type === 'image');
  assert.ok(image && image.rotate && image.photo.width === 16);
  for (const box of grid) assert.ok(box.x + box.w <= image.x - 10, 'die Kästchen liegen links vom Foto');
  const sourceBox = content(make({ recipe: { sourceHost: 'chefkoch.de', sourceUrl: 'https://www.chefkoch.de/rezepte/1/kuchen' } }));
  assert.ok(sourceBox.includes('chefkoch.de') && sourceBox.includes('Quelle: chefkoch.de/rezepte/1/kuchen'));
});

test('Titel: so groß wie möglich in höchstens zwei Zeilen, sehr lange Titel kleiner in drei, danach mit „…“; leerer Titel heißt „Rezept“', () => {
  const lines = layout => allText(layout).filter(item => item.font === 'serifBold' && item.y < 200);
  assert.equal(lines(make()).length, 1);
  const middle = make({ recipe: { name: 'Gebratene Nudeln mit Gemüse und Erdnusssoße' }, photo: photo() });
  assert.ok(lines(middle).length >= 2 && lines(middle).length <= 3);
  const huge = make({ recipe: { name: 'Spaghetti Bolognese mit frischem Basilikum und geriebenem Parmesan nach Omas Rezept aus der Toskana' }, photo: photo() });
  assert.equal(lines(huge).length, 3); assert.equal(lines(huge)[0].size, 22); assert.ok(lines(huge)[2].text.endsWith('…'));
  assert.equal(make({ recipe: { name: '   ' } }).title, 'Rezept');
  for (const item of lines(huge)) assert.ok(textWidth(item.text, 'serifBold', item.size) <= 292 + 0.01);
});

test('Spalten: Zutaten links (Menge | Zutat), Zubereitung rechts; Linien bis zum Seitenende; nichts ragt über seine Spalte hinaus', () => {
  const layout = make({ ingredients: ingredients([...rows, ['Sahne, mind. 30 % Fett, gut gekühlt und steif geschlagen', 400, 'ml']]), instructions: `${STEPS}\nDie Sahne steif schlagen, auf den Kuchen streichen und mit Aprikosenhälften belegen, mit Puderzucker bestäuben und kühl servieren.` });
  const [page] = layout.pages;
  const rules = page.items.filter(item => item.type === 'line' && item.color === '#d4cec6' && item.y1 === item.y2);
  const left = rules.filter(item => item.x1 === 52), right = rules.filter(item => item.x1 > 250);
  assert.equal(left.length, right.length);
  assert.ok(left.length > 20, 'die Linien laufen bis unten');
  assert.ok(Math.max(...left.map(item => item.y1)) > 740 && Math.max(...left.map(item => item.y1)) < 780);
  for (const item of texts(page)) {
    if (item.align) continue;
    const width = textWidth(item.text, item.font, item.size, item.charSpace ?? 0);
    assert.ok(item.x >= 52 - 0.01, `${item.text} links`);
    assert.ok(item.x + width <= 543.28 + 0.01, `${item.text} rechts (${item.x + width})`);
  }
  const names = texts(page).filter(item => item.x === 52 + 74 + 8), amounts = texts(page).filter(item => item.x === 56);
  for (const item of names) assert.ok(item.x + textWidth(item.text, item.font, item.size) <= 52 + 226, `${item.text} bleibt in der Zutatenspalte`);
  assert.ok(amounts.some(item => item.text === '400 ml'));
  const cream = names.filter(item => /Sahne|gekühlt|geschlagen/.test(item.text));
  assert.equal(cream.length, 2, 'der lange Name bricht um');
  assert.equal(cream[1].y - cream[0].y, 17, 'jede Zeile liegt auf einer Linie');
  const baselines = texts(page).filter(item => item.x >= 56 && item.size === 10.5).map(item => item.y);
  for (const y of baselines) assert.ok(rules.some(rule => Math.abs(rule.y1 - y - 5.2) < 0.01), 'der Text steht auf einer Linie');
});

test('Lange Rezepte gehen auf weiteren Seiten weiter: nichts geht verloren, die Reihenfolge bleibt, jede Seite zählt mit', () => {
  const many = Array.from({ length: 70 }, (_, index) => [`Zutat ${index + 1}`, index + 1, 'g']);
  const steps = Array.from({ length: 30 }, (_, index) => `Arbeitsgang ${index + 1}: ${'Alles gut verrühren und etwas ziehen lassen. '.repeat(3)}`.trim());
  const layout = make({ ingredients: ingredients(many), instructions: steps.join('\n') });
  assert.ok(layout.pages.length >= 3);
  const text = content(layout);
  many.forEach(([name], index) => assert.ok(text.includes(name), name));
  const order = steps.map((_, index) => text.indexOf(`Arbeitsgang ${index + 1}:`));
  assert.ok(order.every((at, index) => at >= 0 && (index === 0 || at > order[index - 1])), 'alle Schritte in Reihenfolge');
  const numbers = allText(layout).filter(item => /^\d+\.$/.test(item.text)).map(item => Number(item.text.slice(0, -1)));
  assert.deepEqual(numbers, steps.map((_, index) => index + 1), 'Nummern lückenlos');
  layout.pages.forEach((page, index) => {
    const own = texts(page).map(item => item.text);
    assert.ok(own.includes(`Seite ${index + 1} von ${layout.pages.length}`));
    if (index > 0) assert.ok(own.includes('REZEPT · FORTSETZUNG') && own.includes('Spiegeleierkuchen'));
  });
  // Jede Seite hat zwei Spalten mit Überschrift; eine leere Spalte heißt „NOTIZEN“
  const heads = layout.pages.map(page => texts(page).filter(item => ['ZUTATEN', 'ZUBEREITUNG', 'NOTIZEN'].includes(item.text) && item.color === '#ffffff').map(item => item.text));
  assert.ok(heads.every(list => list.length === 2));
  assert.ok(heads.flat().includes('NOTIZEN'), 'die Zutaten sind früher fertig als die Schritte');
  for (const page of layout.pages) for (const item of texts(page)) if (!item.align) assert.ok(item.x + textWidth(item.text, item.font, item.size, item.charSpace ?? 0) <= 543.3, item.text);
});

test('Ein Schritt bleibt zusammen; nur lange Schritte werden getrennt und nie so, dass eine einzelne Zeile allein steht', () => {
  const steps = Array.from({ length: 12 }, (_, index) => `Schritt ${index + 1} ${'wort '.repeat(40)}`.trim());
  const layout = make({ instructions: steps.join('\n') });
  assert.ok(layout.pages.length >= 2);
  const lineCount = page => texts(page).filter(item => item.x >= 52 + 226 + 22 + 19 - 0.01 && item.size === 10.5 && item.x < 400).length;
  const perPage = layout.pages.map(lineCount);
  assert.ok(perPage.every(count => count > 0));
  for (const page of layout.pages.slice(1)) {
    const first = texts(page).filter(item => item.size === 10.5 && item.x > 250 && item.x < 400).sort((a, b) => a.y - b.y).slice(0, 2);
    assert.ok(first.length === 2, 'mindestens zwei Zeilen auf der Folgeseite');
  }
});

test('Seitenwechsel mitten in einem Schritt: auf der Folgeseite stehen mindestens zwei Zeilen davon, nie eine einzelne', () => {
  const stepLines = page => texts(page).filter(item => item.x === 319 && item.size === 10.5).length;
  const capacity = (() => { const [page] = make({ instructions: 'Kurz.' }).pages; return page.items.filter(item => item.type === 'line' && item.y1 === item.y2 && item.x1 === 300).length - 1; })();
  let words = 1;
  while (wrapText(('wort '.repeat(words)).trim(), 'sans', 10.5, 243.28 - 19).length < 4) words++;
  assert.equal(wrapText(('wort '.repeat(words)).trim(), 'sans', 10.5, 243.28 - 19).length, 4, 'ein Schritt mit genau vier Zeilen');
  const long = ('wort '.repeat(words)).trim();
  // Drei Zeilen frei, der Schritt hat vier: ohne Regel bliebe eine Zeile allein auf Seite 2
  const steps = [...Array.from({ length: capacity - 3 }, (_, index) => `Kurz ${index + 1}`), long];
  const layout = make({ instructions: steps.join('\n') });
  assert.equal(layout.pages.length, 2);
  assert.equal(stepLines(layout.pages[1]), 2, 'zwei Zeilen auf der Folgeseite');
  assert.equal(stepLines(layout.pages[0]), capacity - 1);
  // Passt der ganze Schritt noch, bleibt er auf der Seite
  const fits = make({ instructions: [...Array.from({ length: capacity - 4 }, (_, index) => `Kurz ${index + 1}`), long].join('\n') });
  assert.equal(fits.pages.length, 1);
});

test('„Gesamtzeit: 25 Min.“ am Anfang der Zubereitung (Import, Rezepte des Tages) wird ein Kästchen statt eines Schritts', () => {
  const layout = make({ instructions: 'Gesamtzeit: 1 Std. 5 Min.\n\nNudeln kochen.\nSoße rühren.' });
  const text = content(layout);
  assert.ok(text.includes('GESAMTZEIT') && text.includes('1 Std. 5 Min.'));
  assert.ok(!text.includes('Gesamtzeit') && !text.includes('ZUTATEN\n4'), 'kein Schritt, und die Zahl der Zutaten weicht dem Kästchen');
  const numbers = allText(layout).filter(item => /^\d+\.$/.test(item.text)).map(item => item.text);
  assert.deepEqual(numbers, ['1.', '2.'], 'die Schritte beginnen bei 1');
  assert.ok(text.includes('Nudeln kochen.') && text.includes('Soße rühren.'));
  const withoutTime = content(make({ instructions: 'Nudeln kochen.' }));
  assert.ok(!withoutTime.includes('GESAMTZEIT') && withoutTime.includes('ZUTATEN'));
  assert.equal(make({ instructions: 'Gesamtzeit: 10 Min.' }).pages.length, 1, 'nur eine Zeitangabe: „Keine Zubereitung eingetragen.“');
  assert.ok(content(make({ instructions: 'Gesamtzeit: 10 Min.' })).includes('Keine Zubereitung eingetragen.'));
});

test('Leere Rezepte: „Keine Zutaten eingetragen.“ und „Keine Zubereitung eingetragen.“, nie eine kaputte Seite', () => {
  const layout = make({ ingredients: [], instructions: '' });
  const text = content(layout);
  assert.equal(layout.pages.length, 1);
  assert.ok(text.includes('Keine Zutaten eingetragen.') && text.includes('Keine Zubereitung eingetragen.'));
  assert.ok(text.includes('ZUTATEN') && text.includes('0'));
});

test('Quelle und Fußzeile: ohne Quelle steht „Einkauf & Rezepte“, bei mehreren Seiten „Seite x von y“', () => {
  const single = content(make());
  assert.equal((single.match(/Einkauf & Rezepte/g) || []).length, 1);
  const sourced = make({ recipe: { sourceHost: 'chefkoch.de', sourceUrl: 'https://www.chefkoch.de/rezepte/42/kuchen/' } });
  assert.ok(content(sourced).includes('Quelle: chefkoch.de/rezepte/42/kuchen'));
});

test('Das Layout ist unveränderlich für gleiche Eingaben und ergibt eine gültige PDF-Datei mit Foto', () => {
  const input = { ingredients: ingredients(), photo: photo() };
  assert.deepEqual(JSON.stringify(make(input).pages.map(page => page.items.map(item => ({ ...item, photo: undefined })))), JSON.stringify(make(input).pages.map(page => page.items.map(item => ({ ...item, photo: undefined })))));
  const layout = make(input);
  const pdf = makePdf(layout.pages, { title: layout.title });
  const body = Buffer.from(pdf).toString('latin1');
  assert.ok(body.startsWith('%PDF-1.4') && body.includes('/DCTDecode') && body.includes('/Count 1 '));
});
