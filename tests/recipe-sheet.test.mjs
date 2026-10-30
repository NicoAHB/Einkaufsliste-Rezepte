import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLOR, PAGE, fitText, formatNumber, layoutRecipe, sheetIngredient, wrapText } from '../recipe-sheet.js';
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

import { stepParts } from '../recipe-sheet.js';
const by = (layout, predicate) => allText(layout).filter(predicate);
const sheetMake = (options = {}) => make(options);

test('Rezeptblatt (Entwurf Version 2.54): A4, „REZEPTSAMMLUNG“, großer Titel, Eckdaten, Zutaten-Kasten mit Kästchen, nummerierte Schritte, „Meine Notizen“; alles ist Text oder Form', () => {
  const layout = make({ instructions: STEPS });
  assert.equal(layout.pages.length, 1);
  assert.deepEqual([layout.pages[0].width, layout.pages[0].height], [PAGE.width, PAGE.height]);
  const text = content(layout);
  for (const part of ['REZEPTSAMMLUNG', 'SATTPLAN', 'Spiegeleierkuchen', 'PORTIONEN', 'ZUTATEN', 'STICHWORTE', 'Backen · Kuchen', 'Zutaten', 'Für 12 Portionen', 'Zubereitung', 'Eier', '6 Stück',
    'Zucker', '200 g', 'Butter, weich', 'nach Bedarf', 'Salz', 'Den Backofen vorheizen.', 'Eier und Zucker schaumig rühren.', 'Meine Notizen', 'Für Ideen, Änderungen und das nächste Mal.', 'Eigenes Rezept', 'Seite 1 / 1']) assert.ok(text.includes(part), `${part} fehlt`);
  const kinds = new Set(layout.pages[0].items.map(item => item.type));
  assert.deepEqual([...kinds].sort(), ['line', 'rect', 'text']);
  assert.equal(layout.pages[0].items.filter(item => item.type === 'rect' && item.w < 12 && item.stroke).length, 4, 'ein Kästchen zum Abhaken je Zutat');
  const title = by(layout, item => item.text === 'Spiegeleierkuchen')[0];
  assert.equal(title.font, 'serifBold'); assert.ok(title.size >= 30);
  assert.equal(by(layout, item => item.text === '6 Stück')[0].font, 'sansBold', 'die Menge ist hervorgehoben');
  assert.equal(by(layout, item => item.text === 'nach Bedarf')[0].font, 'sans', '„nach Bedarf“ ist keine Menge und nicht fett');
  assert.ok(!layout.pages[0].items.some(item => item.type === 'image'));
});

test('Schritte: erster Satz fett als Überschrift, der Rest darunter; ein kurzer Satz allein ist Überschrift, ein langer nur Text', () => {
  assert.deepEqual(stepParts('Nudeln in Salzwasser kochen. Nudelwasser aufheben.'), { title: 'Nudeln in Salzwasser kochen.', body: 'Nudelwasser aufheben.' });
  assert.deepEqual(stepParts('Alles vermischen.'), { title: 'Alles vermischen.', body: '' });
  const long = 'Die Zwiebeln schälen und in sehr feine Würfel schneiden, dann in reichlich Olivenöl langsam goldbraun und weich anbraten';
  assert.deepEqual(stepParts(long), { title: '', body: long });
  assert.deepEqual(stepParts('Kurz ohne Punkt'), { title: 'Kurz ohne Punkt', body: '' });
  assert.deepEqual(stepParts('Beeren aufkochen – 5 Min. köcheln lassen.'), { title: 'Beeren aufkochen – 5 Min. köcheln lassen.', body: '' }, '„Min.“ vor Kleinbuchstaben ist kein Satzende');
  assert.deepEqual(stepParts('Kalt servieren (ca. 1½ Std.). Danach essen.'), { title: 'Kalt servieren (ca. 1½ Std.).', body: 'Danach essen.' });
  assert.deepEqual(stepParts('20 Min. backen. Dann abkühlen lassen.'), { title: '20 Min. backen.', body: 'Dann abkühlen lassen.' });
  assert.deepEqual(stepParts('Mit z. B. Zimt würzen. Fertig.'), { title: 'Mit z. B. Zimt würzen.', body: 'Fertig.' });
  const layout = make({ instructions: 'Nudeln kochen. Das Wasser aufheben.\nAlles mischen.' });
  assert.equal(by(layout, item => item.text === 'Nudeln kochen.')[0].font, 'sansBold');
  assert.equal(by(layout, item => item.text === 'Das Wasser aufheben.')[0].font, 'sans');
  assert.deepEqual(by(layout, item => /^[12]$/.test(item.text) && item.font === 'sansBold' && item.align === 'center').map(item => item.text), ['1', '2'], 'die Nummern stehen in Kreisen');
});

test('Eckdaten: Portionen, Zutaten, Stichworte; mit Gesamtzeit und Quelle kommen zwei Spalten dazu; Stichworte beginnen groß', () => {
  const plain = content(make({ recipe: { tags: ['schnell', 'vegetarisch'] } }));
  assert.ok(plain.includes('Schnell · vegetarisch') && !plain.includes('GESAMTZEIT') && !plain.includes('QUELLE'));
  const full = content(make({ recipe: { sourceHost: 'chefkoch.de', sourceUrl: 'https://www.chefkoch.de/rezepte/1/x' }, instructions: 'Gesamtzeit: 25 Min.\nBacken.' }));
  for (const part of ['GESAMTZEIT', '25 Min.', 'Gesamtzeit: 25 Min.', 'QUELLE', 'chefkoch.de', 'Quelle: chefkoch.de/rezepte/1/x']) assert.ok(full.includes(part), part);
  assert.ok(!full.includes('Gesamtzeit: 25 Min.\nBacken'), 'die Zeitzeile ist kein Schritt');
  assert.ok(content(make({ recipe: { tags: [] } })).includes('–'), 'ohne Stichworte steht ein Strich');
});

test('Titel: so groß wie möglich in höchstens zwei Zeilen, sehr lange Titel kleiner in drei, danach mit „…“; leerer Titel heißt „Rezept“; ein Foto steht klein oben rechts', () => {
  const sizeOf = layout => by(layout, item => item.font === 'serifBold' && item.size > 20).map(item => item.size);
  assert.deepEqual(sizeOf(make({ recipe: { name: 'Tomaten-Pasta' } })), [34]);
  const long = make({ recipe: { name: 'Kichererbsen-Curry mit Reis und frischem Koriander aus dem Ofen' } });
  assert.ok(sizeOf(long).length <= 3 && sizeOf(long).length >= 2);
  const huge = make({ recipe: { name: 'Sehr langer Titel '.repeat(12) } });
  assert.ok(sizeOf(huge).length <= 3 && content(huge).includes('…'));
  assert.ok(content(make({ recipe: { name: '   ' } })).includes('Rezept'));
  const withPhoto = make({ photo: photo() });
  const image = withPhoto.pages[0].items.find(item => item.type === 'image');
  assert.ok(image && image.x + image.w <= PAGE.width - 40 && image.y < 100 && image.w <= 160, 'klein, oben rechts');
  assert.ok(Math.max(...by(withPhoto, item => item.font === 'serifBold' && item.size > 20).map(item => textWidth(item.text, 'serifBold', item.size))) <= PAGE.width - 84 - image.w, 'der Titel läuft nicht ins Foto');
});

test('Kasten und Spalten: Zutaten links im Kasten (Kästchen, Menge rechtsbündig, Name), Zubereitung rechts; nichts ragt über den Rand oder die Seite hinaus', () => {
  const layout = make({ ingredients: ingredients(Array.from({ length: 12 }, (_, i) => [`Zutat Nummer ${i + 1} mit einem recht langen Namen`, i + 1, 'g'])), instructions: STEPS });
  for (const page of layout.pages) for (const item of page.items) {
    if (item.type === 'text') {
      const width = textWidth(item.text, item.font, item.size, item.charSpace || 0), left = item.align === 'right' ? item.x - width : item.align === 'center' ? item.x - width / 2 : item.x;
      assert.ok(left >= 40 && left + width <= PAGE.width - 40 + 0.5, `${item.text}: ${left}–${left + width}`);
      assert.ok(item.y > 20 && item.y < PAGE.height - 20);
    } else if (item.type === 'rect') assert.ok(item.x >= 40 && item.x + item.w <= PAGE.width - 40 + 0.5 && item.y >= 0 && item.y + item.h <= PAGE.height, JSON.stringify(item));
  }
  const card = layout.pages[0].items.find(item => item.type === 'rect' && item.fill === COLOR.card);
  const amounts = by(layout, item => /^\d+ g$/.test(item.text));
  assert.ok(amounts.length === 12 && amounts.every(item => item.align === 'right' && item.x < card.x + card.w / 2));
  assert.ok(by(layout, item => item.text === 'Zubereitung')[0].x > card.x + card.w, 'die Schritte stehen rechts neben dem Kasten');
});

test('Lange Rezepte gehen auf weiteren Seiten weiter: nichts geht verloren, die Reihenfolge bleibt, jede Seite zählt mit, die Notizen stehen nur auf der letzten', () => {
  const many = ingredients(Array.from({ length: 45 }, (_, i) => [`Zutat ${i + 1}`, i + 1, 'g']));
  const steps = Array.from({ length: 30 }, (_, i) => `Schritt ${i + 1} wird gemacht. Dazu gehört eine längere Erklärung, die über mehrere Zeilen im Text geht und gut lesbar sein soll.`).join('\n');
  const layout = make({ ingredients: many, instructions: steps });
  assert.ok(layout.pages.length >= 3 && layout.pages.length <= 8);
  const names = allText(layout).map(item => item.text), at = text => names.indexOf(text);
  for (let i = 1; i <= 45; i++) assert.ok(names.includes(`Zutat ${i}`), `Zutat ${i} fehlt`);
  for (let i = 1; i <= 30; i++) assert.ok(names.includes(`Schritt ${i} wird gemacht.`), `Schritt ${i} fehlt`);
  assert.ok(at('Zutat 1') < at('Zutat 45') && at('Schritt 1 wird gemacht.') < at('Schritt 30 wird gemacht.'), 'Reihenfolge');
  layout.pages.forEach((page, index) => {
    assert.ok(texts(page).some(item => item.text === `Seite ${index + 1} / ${layout.pages.length}`));
    assert.equal(texts(page).some(item => item.text === 'Meine Notizen'), index === layout.pages.length - 1);
    assert.equal(texts(page).some(item => item.text === 'REZEPTSAMMLUNG · FORTSETZUNG'), index > 0);
    for (const item of page.items) if (item.type === 'text') assert.ok(item.y < PAGE.height - 25, `${item.text} unterhalb der Seite`);
  });
  const lastPage = layout.pages.at(-1), notesY = texts(lastPage).find(item => item.text === 'Meine Notizen').y;
  assert.ok(texts(lastPage).filter(item => item.y > notesY - 20 && item.y < notesY + 60).every(item => /^(Meine Notizen|Für Ideen|Seite|Eigenes)/.test(item.text)), 'unter den Notizen steht nichts anderes');
});

test('Ein Schritt bleibt auf einer Seite zusammen (Nummer, Überschrift und Text)', () => {
  const steps = Array.from({ length: 20 }, (_, i) => `Schritt ${i + 1} mit Namen. Und danach kommt ein Text, der zu diesem Schritt gehört und etwas länger ist als eine Zeile im Blatt.`).join('\n');
  const layout = make({ instructions: steps });
  layout.pages.forEach(page => {
    const heads = texts(page).filter(item => /^Schritt \d+ mit Namen\.$/.test(item.text)), bodies = texts(page).filter(item => item.text.startsWith('Und danach') || item.text.includes('Zeile im Blatt'));
    assert.ok(bodies.length >= heads.length, 'zu jeder Überschrift auf dieser Seite gehört ihr Text');
  });
});

/* ---------- Lange Schritte (Version 2.56): nie gekürzt, auf Folgeseiten fortgesetzt, Notizen frei ---------- */
const STEP_X = 324;   // linke Kante des Schritttexts: Kasten 226 + Abstand + Kreis
const sentenceNo = i => `Satz ${i} beschreibt einen weiteren Handgriff, der genau so ausgeführt werden soll, damit nichts anbrennt oder zu weich wird.`;
const longStep = count => `Alles gründlich vorbereiten. ${Array.from({ length: count }, (_, i) => sentenceNo(i + 1)).join(' ')} Zum Schluss alles sofort servieren.`;
const stepLines = layout => layout.pages.flatMap(page => texts(page).filter(item => item.x === STEP_X && item.text !== 'Fortsetzung'));
const BOTTOM = PAGE.height - 62;

test('Ein sehr langer Schritt wird nie gekürzt: jedes Wort steht in der richtigen Reihenfolge im Blatt, auch der letzte Satz, ohne „…“', () => {
  for (const count of [3, 6, 12, 30, 80]) {
    const step = longStep(count), layout = make({ instructions: `${step}\nDanach abkühlen lassen.` });
    const lines = stepLines(layout), joined = lines.map(item => item.text).join(' ');
    assert.equal(joined, `${step} Danach abkühlen lassen.`.replace(/\. (Satz|Zum|Danach)/g, (_, word) => `. ${word}`), `${count} Sätze: der Text ist unverändert`);
    assert.ok(!joined.includes('…') && !allText(layout).some(item => item.text.endsWith('…')), 'keine Auslassungspunkte');
    assert.ok(joined.includes('Zum Schluss alles sofort servieren.') && joined.endsWith('Danach abkühlen lassen.'), 'der letzte Satz ist da');
  }
});

test('Ein langer Schritt läuft auf der nächsten Seite weiter: „Fortsetzung“ an seiner Nummer, mindestens zwei Zeilen je Seite, die Nummern bleiben richtig', () => {
  const layout = make({ instructions: `Zuerst die Zutaten abwiegen.\n${longStep(40)}\nDanach abkühlen lassen.` });
  assert.ok(layout.pages.length >= 3);
  layout.pages.forEach((page, index) => {
    const marks = texts(page).filter(item => item.text === 'Fortsetzung'), badge = texts(page).filter(item => item.align === 'center' && /^\d+$/.test(item.text) && item.font === 'sansBold');
    if (index === 0) assert.equal(marks.length, 0, 'auf der ersten Seite beginnt der Schritt');
    else if (index < layout.pages.length - 1) {
      assert.equal(marks.length, 1, `Seite ${index + 1}: genau eine Fortsetzung`);
      assert.equal(badge[0].text, '2', 'die Fortsetzung trägt die Nummer des Schritts');
      assert.equal(marks[0].y, badge[0].y + 0.4, 'sie steht neben der Nummer');
      assert.ok(texts(page).filter(item => item.x === STEP_X && item.text !== 'Fortsetzung').length >= 2, 'mindestens zwei Zeilen');
    }
  });
  const numbers = layout.pages.flatMap(page => texts(page).filter(item => item.align === 'center' && /^\d+$/.test(item.text) && item.font === 'sansBold').map(item => item.text));
  assert.deepEqual(numbers.filter((value, index) => value !== numbers[index - 1]), ['1', '2', '3'], 'Schritt 1, dann 2 (mit Fortsetzungen), dann 3');
  assert.equal(by(layout, item => item.text === 'Zuerst die Zutaten abwiegen.').length, 1);
  assert.ok(texts(layout.pages.at(-1)).some(item => item.text === 'Danach abkühlen lassen.'), 'der folgende Schritt steht nach dem langen');
});

test('Der Notizbereich bleibt frei und nichts läuft über den Rand: kein Schritttext unterhalb der Notizlinie, keiner unterhalb des Seitenfußes oder rechts über den Rand', () => {
  for (const count of [2, 9, 14, 25, 60]) {
    const layout = make({ instructions: `Kurz.\n${longStep(count)}` });
    layout.pages.forEach((page, index) => {
      const last = index === layout.pages.length - 1, notes = texts(page).find(item => item.text === 'Meine Notizen');
      assert.equal(Boolean(notes), last);
      const top = notes ? notes.y - 26 : BOTTOM;
      for (const item of texts(page)) {
        const width = textWidth(item.text, item.font, item.size, item.charSpace || 0), left = item.align === 'right' ? item.x - width : item.align === 'center' ? item.x - width / 2 : item.x;
        assert.ok(left >= 41.5 && left + width <= PAGE.width - 41.5, `${count}: „${item.text}“ ragt über den Rand`);
        if (item.x === STEP_X || item.text === 'Fortsetzung') assert.ok(item.y < top - 8, `${count} Sätze, Seite ${index + 1}: „${item.text}“ (y ${item.y.toFixed(1)}) reicht an die Notizen (${top.toFixed(1)})`);
        else if (!/^(Seite |Quelle|Eigenes|EINKAUF|REZEPT)/.test(item.text)) assert.ok(item.y < BOTTOM, `${item.text} unterhalb des Randes`);
      }
    });
  }
});

test('Ein Schritt, der auf die nächste Seite passt, wird nicht zerrissen; erst was länger als eine Seite ist, wird geteilt', () => {
  const mid = 'Mittlerer Schritt. ' + Array.from({ length: 10 }, (_, i) => sentenceNo(i + 1)).join(' ');
  const steps = Array.from({ length: 6 }, (_, i) => i === 3 ? mid : `Schritt ${i + 1} wird ausgeführt. ${sentenceNo(i + 1)} ${sentenceNo(i + 2)}`).join('\n');
  const layout = make({ instructions: steps });
  assert.ok(!allText(layout).some(item => item.text === 'Fortsetzung'), 'nichts wurde geteilt');
  assert.ok(content(layout).includes('Mittlerer Schritt.'));
  assert.ok(allText(make({ instructions: `Vorweg.\n${longStep(60)}` })).some(item => item.text === 'Fortsetzung'), 'der lange Schritt wird geteilt');
  assert.ok(!allText(make({ instructions: longStep(60) })).some(item => item.text === 'Fortsetzung'), 'ein Absatz ohne Zeilenumbruch wird an Satzenden in Schritte geteilt, die einzeln zusammenbleiben');
});

test('Mehrere lange Schritte hintereinander: jeder vollständig, in der Reihenfolge, mit richtigen Nummern', () => {
  const steps = [1, 2, 3, 4].map(n => `Schritt ${n} beginnt hier. ${Array.from({ length: 14 }, (_, i) => `Teil ${n}.${i + 1} wird gründlich und in Ruhe erledigt, bis alles gleichmäßig verteilt ist.`).join(' ')}`);
  const layout = make({ instructions: steps.join('\n') }), joined = stepLines(layout).map(item => item.text).join(' ');
  assert.equal(joined, steps.join(' '));
  for (const n of [1, 2, 3, 4]) assert.ok(joined.includes(`Teil ${n}.14 wird`), `Ende von Schritt ${n}`);
  assert.ok(layout.pages.length >= 3);
});

test('Ein einziges sehr langes Wort und Zeilenumbrüche im Schritt gehen nicht verloren', () => {
  const word = 'Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichenverleihung'.repeat(2);
  const layout = make({ instructions: `Das ${word} sorgfältig aufbewahren. ${'Noch ein Hinweis steht hier. '.repeat(40)}Ende.` });
  const joined = stepLines(layout).map(item => item.text).join(' ').replace(/- /g, '');
  assert.ok(joined.includes(word) && joined.endsWith('Ende.'));
});

test('„Gesamtzeit: 25 Min.“ am Anfang der Zubereitung (Import, Rezepte des Tages) wird eine Eckdate und ein Zeitvermerk statt eines Schritts', () => {
  const layout = make({ instructions: 'Gesamtzeit: 25 Min.\n\nNudeln kochen.\nSoße rühren.' });
  const text = content(layout);
  assert.ok(text.includes('GESAMTZEIT') && text.includes('25 Min.'));
  assert.deepEqual(by(layout, item => /^[0-9]$/.test(item.text) && item.align === 'center').map(item => item.text), ['1', '2'], 'zwei Schritte, nicht drei');
  assert.ok(!allText(layout).some(item => /Gesamtzeit:.*Nudeln/.test(item.text)));
});

test('Leere Rezepte: „Keine Zutaten eingetragen.“ und „Keine Zubereitung eingetragen.“, nie eine kaputte Seite', () => {
  const layout = make({ ingredients: [], instructions: '' });
  const text = content(layout);
  assert.equal(layout.pages.length, 1);
  assert.ok(text.includes('Keine Zutaten eingetragen.') && text.includes('Keine Zubereitung eingetragen.'));
  assert.ok(text.includes('ZUTATEN') && text.includes('0'));
});


test('Fußzeile: ohne Quelle „Eigenes Rezept“, mit Quelle „Quelle: …“; rechts „Seite x / y“', () => {
  assert.ok(content(make()).includes('Eigenes Rezept') && content(make()).includes('Seite 1 / 1'));
  const withSource = content(make({ recipe: { sourceHost: 'chefkoch.de', sourceUrl: 'https://www.chefkoch.de/rezepte/123/spiegeleierkuchen' } }));
  assert.ok(withSource.includes('Quelle: chefkoch.de/rezepte/123/spiegeleierkuchen') && !withSource.includes('Eigenes Rezept'));
});

test('Das Layout ist unveränderlich für gleiche Eingaben und ergibt eine gültige PDF-Datei mit Foto', () => {
  const input = { ingredients: ingredients(), photo: photo() };
  assert.deepEqual(JSON.stringify(make(input).pages.map(page => page.items.map(item => ({ ...item, photo: undefined })))), JSON.stringify(make(input).pages.map(page => page.items.map(item => ({ ...item, photo: undefined })))));
  const layout = make(input);
  const pdf = makePdf(layout.pages, { title: layout.title });
  const body = Buffer.from(pdf).toString('latin1');
  assert.ok(body.startsWith('%PDF-1.4') && body.includes('/DCTDecode') && body.includes('/Count 1 '));
});
