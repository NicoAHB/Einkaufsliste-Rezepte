/* Das Rezeptblatt (Version 2.45): ein Rezept als schön gestaltete DIN-A4-Seite. Reine Logik ohne DOM.
   Das Blatt folgt einer Rezeptkarte: oben „REZEPT“, der Titel in einer Schrift mit Serifen und einem Strich darunter, vier Kästchen mit den Eckdaten, rechts das Foto als
   aufgeklebtes Sofortbild, darunter links die Zutaten (Menge | Zutat) und rechts die Zubereitung, beides auf Linien wie auf liniertem Papier. Die Linien laufen bis zum Seitenende:
   unten bleibt Platz für Notizen. Ist das Rezept lang, geht es auf einer zweiten (dritten …) Seite weiter.
   `layoutRecipe` liefert nur Zeichenbefehle (siehe pdf.js: Rechteck, Linie, Text, Bild); dieselben Befehle ergeben die PDF-Datei (pdf.js) und die Vorschau (sheet-view.js). */
import { textWidth } from './pdf.js';
import { splitSteps } from './cook.js';

export const PAGE = { width: 595.28, height: 841.89 };
export const COLOR = { ink: '#2f2a26', accent: '#b5702d', accentLine: '#c0813c', border: '#f0e3ce', box: '#fbf3e6', boxLine: '#f1e3cb', label: '#8b8175', rule: '#d4cec6', soft: '#9a9186', tape: '#f1e1bd' };
const MARGIN = 52, FRAME = 26, PITCH = 17, BODY = 10.5, BOTTOM = PAGE.height - 52 - 14;
const LEFT = MARGIN, RIGHT = PAGE.width - MARGIN, WIDTH = RIGHT - LEFT;
const INGREDIENTS = { width: 226, amount: 74 }, GAP = 22;
const STEPS = { x: LEFT + INGREDIENTS.width + GAP, width: RIGHT - (LEFT + INGREDIENTS.width + GAP), number: 19 };
const NO_AMOUNT = 'nach Bedarf';

const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
export const formatNumber = value => number.format(value);

/* ---------- Text umbrechen und kürzen ---------- */
// Zeilen, die in `maxWidth` passen. Sehr lange Wörter werden mit Trennstrich gebrochen.
export function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of String(text ?? '').replace(/\r/g, '').split('\n')) {
    let line = '';
    for (let word of paragraph.split(/[ \t]+/).filter(Boolean)) {
      while (textWidth(word, font, size) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && textWidth(`${word.slice(0, cut)}-`, font, size) > maxWidth) cut--;
        if (line) { lines.push(line); line = ''; }
        lines.push(`${word.slice(0, cut)}-`);
        word = word.slice(cut);
      }
      const joined = line ? `${line} ${word}` : word;
      if (textWidth(joined, font, size) <= maxWidth) line = joined; else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
// Text auf eine Breite bringen: erst die Schrift verkleinern (bis `min`), dann mit „…“ kürzen
export function fitText(text, font, size, maxWidth, min = size) {
  let current = size;
  while (current > min && textWidth(text, font, current) > maxWidth) current = Math.max(min, current - 0.5);
  let out = String(text ?? '');
  if (textWidth(out, font, current) <= maxWidth) return { text: out, size: current };
  while (out.length > 1 && textWidth(`${out}…`, font, current) > maxWidth) out = out.slice(0, -1);
  return { text: `${out.trimEnd()}…`, size: current };
}
const clip = (lines, count) => lines.length > count ? [...lines.slice(0, count - 1), `${lines[count - 1].replace(/[.,;:\s]+$/, '')}…`] : lines;

/* ---------- Zutaten und Schritte als Zeilen ---------- */
// Eine Zutat → Menge und Name; `factor` rechnet auf andere Portionen um
export function sheetIngredient(row, factor = 1) {
  const noAmount = row.unit === NO_AMOUNT;
  return { amount: noAmount ? NO_AMOUNT : `${formatNumber(row.quantity * factor)} ${row.unit}`.trim(), name: String(row.name ?? '').trim(), soft: noAmount };
}
function ingredientGroups(ingredients) {
  const nameWidth = INGREDIENTS.width - INGREDIENTS.amount - 10;
  return ingredients.map(entry => {
    const amount = wrapText(entry.amount, entry.soft ? 'sans' : 'sansBold', entry.soft ? 9 : BODY, INGREDIENTS.amount - 8), name = wrapText(entry.name, 'sans', BODY, nameWidth);
    return Array.from({ length: Math.max(amount.length, name.length) }, (_, index) => ({ amount: amount[index] ?? '', name: name[index] ?? '', soft: entry.soft }));
  });
}
function stepGroups(instructions) {
  const width = STEPS.width - STEPS.number;
  return splitSteps(instructions).map((step, index) => wrapText(step, 'sans', BODY, width).map((text, line) => ({ text, number: line === 0 ? index + 1 : 0 })));
}
// Gruppen (zusammengehörige Zeilen) auf Seiten verteilen. Eine Gruppe bleibt ganz beieinander; nur lange Gruppen (Schritte) dürfen getrennt werden, nie eine einzelne Zeile allein.
function paginate(groups, capacities) {
  const pages = capacities.map(() => []);
  let page = 0;
  const free = () => capacities[page] - pages[page].length;
  for (const group of groups) {
    let rest = group;
    while (rest.length) {
      if (rest.length <= free()) { pages[page].push(...rest); rest = []; continue; }
      let take = free();
      if (rest.length - take === 1) take--;   // nie eine einzelne Zeile allein auf die nächste Seite
      if (rest.length >= 4 && take >= 2) { pages[page].push(...rest.slice(0, take)); rest = rest.slice(take); }
      if (page + 1 >= pages.length) { pages[page].push(...rest.slice(0, free())); break; }
      page++;
    }
  }
  return pages;
}

/* ---------- Seiten ---------- */
function frame(items) {
  items.push({ type: 'rect', x: FRAME, y: FRAME, w: PAGE.width - 2 * FRAME, h: PAGE.height - 2 * FRAME, r: 16, stroke: COLOR.border, lineWidth: 1.4 });
}
function pill(items, x, y, label) {
  const size = 8.5, spacing = 1.1, width = textWidth(label, 'sansBold', size, spacing) + 26, height = 18;
  items.push({ type: 'rect', x, y, w: width, h: height, r: height / 2, fill: COLOR.accent });
  items.push({ type: 'text', x: x + width / 2 + spacing / 2, y: y + 12.2, text: label, font: 'sansBold', size, color: '#ffffff', charSpace: spacing, align: 'center' });
}
function infoBox(items, x, y, w, h, label, value) {
  items.push({ type: 'rect', x, y, w, h, r: 9, fill: COLOR.box, stroke: COLOR.boxLine, lineWidth: 1 });
  items.push({ type: 'text', x: x + 11, y: y + 15, text: label, font: 'sansBold', size: 6.8, color: COLOR.label, charSpace: 0.7 });
  const fitted = fitText(value || '–', 'sansBold', 12.5, w - 22, 8);
  items.push({ type: 'text', x: x + 11, y: y + h - 12, text: fitted.text, font: 'sansBold', size: fitted.size, color: COLOR.ink });
}
// Das Foto als aufgeklebtes Sofortbild: Schatten, weißer Rahmen mit breitem unteren Rand, Klebestreifen, leicht schief
function polaroid(items, photo, x, y) {
  const w = 172, h = 168, rotate = { deg: 3.4, cx: x + w / 2, cy: y + h / 2 };
  for (const [grow, dx, dy, alpha] of [[0, 2, 3, 0.1], [2, 3, 4.5, 0.06], [5, 4, 6, 0.035]]) items.push({ type: 'rect', x: x - grow / 2 + dx, y: y - grow / 2 + dy, w: w + grow, h: h + grow, r: 3, fill: '#000000', alpha, rotate });
  items.push({ type: 'rect', x, y, w, h, r: 2.5, fill: '#ffffff', stroke: '#e6e1d9', lineWidth: 0.7, rotate });
  items.push({ type: 'image', x: x + 8, y: y + 8, w: w - 16, h: h - 42, photo, rotate });
  items.push({ type: 'rect', x: x + w / 2 - 33, y: y - 9, w: 66, h: 18, fill: COLOR.tape, alpha: 0.88, rotate: { deg: -2.2, cx: x + w / 2, cy: y } });
  return y + h + 12;
}
function footer(items, page, pages, source) {
  const y = PAGE.height - FRAME - 11.5;
  const left = source ? fitText(`Quelle: ${source}`, 'sans', 7.5, 330, 7.5).text : 'Einkauf & Rezepte';
  const right = pages > 1 ? `Seite ${page} von ${pages}` : source ? 'Einkauf & Rezepte' : '';
  items.push({ type: 'text', x: LEFT, y, text: left, font: 'sans', size: 7.5, color: COLOR.soft });
  if (right) items.push({ type: 'text', x: RIGHT, y, text: right, font: 'sans', size: 7.5, color: COLOR.soft, align: 'right' });
}
// Linien, senkrechter Strich bei den Zutaten und der Inhalt der Spalten
function columns(items, top, count, ingredients, steps) {
  for (let line = 0; line <= count; line++) {
    const y = top + line * PITCH;
    items.push({ type: 'line', x1: LEFT, y1: y, x2: LEFT + INGREDIENTS.width, y2: y, color: COLOR.rule, width: 0.6 });
    items.push({ type: 'line', x1: STEPS.x, y1: y, x2: RIGHT, y2: y, color: COLOR.rule, width: 0.6 });
  }
  items.push({ type: 'line', x1: LEFT + INGREDIENTS.amount, y1: top, x2: LEFT + INGREDIENTS.amount, y2: top + count * PITCH, color: COLOR.rule, width: 0.8 });
  ingredients.forEach((row, index) => {
    const baseline = top + (index + 1) * PITCH - 5.2;
    if (row.amount) items.push({ type: 'text', x: LEFT + 4, y: baseline, text: row.amount, font: row.soft ? 'sans' : 'sansBold', size: row.soft ? 9 : BODY, color: row.soft ? COLOR.label : COLOR.ink });
    if (row.name) items.push({ type: 'text', x: LEFT + INGREDIENTS.amount + 8, y: baseline, text: row.name, font: 'sans', size: BODY, color: COLOR.ink });
  });
  steps.forEach((row, index) => {
    const baseline = top + (index + 1) * PITCH - 5.2;
    if (row.number) items.push({ type: 'text', x: STEPS.x + 1, y: baseline, text: `${row.number}.`, font: 'sansBold', size: BODY, color: COLOR.accent });
    items.push({ type: 'text', x: STEPS.x + STEPS.number, y: baseline, text: row.text, font: 'sans', size: BODY, color: row.soft ? COLOR.label : COLOR.ink });
  });
}

/* Das ganze Blatt.
   recipe:      { name, servings (Anzeige), tags[], sourceHost, sourceUrl }
   ingredients: [{ amount, name, soft }] (siehe sheetIngredient)
   instructions: Text der Zubereitung (Zeilen oder Sätze werden zu Schritten)
   photo:       { bytes, width, height, components } oder null
   Ergebnis:    { width, height, title, pages: [{ width, height, items }] } */
export function layoutRecipe({ recipe, ingredients, instructions: rawInstructions, photo = null }) {
  const title = String(recipe.name || 'Rezept').trim() || 'Rezept';
  // Importierte Rezepte beginnen mit „Gesamtzeit: 25 Min.“: Das ist ein Eckdatum, kein Schritt
  const timeLine = /^\s*Gesamtzeit:[^\n]*\n*/i.exec(String(rawInstructions ?? ''));
  const time = timeLine ? timeLine[0].replace(/^\s*Gesamtzeit:\s*/i, '').trim() : '';
  const instructions = timeLine ? String(rawInstructions).slice(timeLine[0].length) : rawInstructions;
  const first = [];
  frame(first);
  first.push({ type: 'text', x: LEFT, y: MARGIN + 9, text: 'REZEPT', font: 'sansBold', size: 8, color: COLOR.accent, charSpace: 3 });
  const leftWidth = photo ? 292 : WIDTH;
  // Titel: so groß wie möglich in höchstens zwei Zeilen, sonst kleiner in drei
  let size = 32, lines = wrapText(title, 'serifBold', size, leftWidth);
  while (lines.length > 2 && size > 22) { size -= 2; lines = wrapText(title, 'serifBold', size, leftWidth); }
  lines = clip(lines, 3);
  let baseline = MARGIN + 9 + 10 + size * 0.78;
  for (const line of lines) { first.push({ type: 'text', x: LEFT, y: baseline, text: line, font: 'serifBold', size, color: COLOR.ink }); baseline += size * 1.12; }
  const ruleY = baseline - size * 1.12 + 11;
  first.push({ type: 'line', x1: LEFT, y1: ruleY, x2: LEFT + leftWidth, y2: ruleY, color: COLOR.accentLine, width: 1.3 });
  // Eckdaten
  const tags = (recipe.tags || []).join(', '), servings = formatNumber(recipe.servings);
  const facts = [['PORTIONEN', servings], time ? ['GESAMTZEIT', time] : ['ZUTATEN', String(ingredients.length)], ['STICHWORTE', tags], ['QUELLE', recipe.sourceHost || 'Eigenes Rezept']];
  const boxTop = ruleY + 17, boxH = 46;
  let boxesBottom;
  if (photo) {
    const boxW = (leftWidth - 10) / 2;
    facts.forEach(([label, value], index) => infoBox(first, LEFT + (index % 2) * (boxW + 10), boxTop + Math.floor(index / 2) * (boxH + 10), boxW, boxH, label, value));
    boxesBottom = boxTop + 2 * boxH + 10;
  } else {
    const boxW = (WIDTH - 30) / 4;
    facts.forEach(([label, value], index) => infoBox(first, LEFT + index * (boxW + 10), boxTop, boxW, boxH, label, value));
    boxesBottom = boxTop + boxH;
  }
  const photoBottom = photo ? polaroid(first, photo, RIGHT - 172, MARGIN + 12) : 0;
  const pillTop = Math.max(boxesBottom, photoBottom) + 20;
  // Zeilen für die Spalten verteilen
  const firstTop = pillTop + 18 + 10, otherTop = MARGIN + 50 + 18 + 10;
  const firstCount = Math.floor((BOTTOM - firstTop) / PITCH), otherCount = Math.floor((BOTTOM - otherTop) / PITCH);
  const ingredientRows = ingredientGroups(ingredients), stepRows = stepGroups(instructions);
  if (!ingredientRows.length) ingredientRows.push([{ amount: '', name: 'Keine Zutaten eingetragen.', soft: true }]);
  if (!stepRows.length) stepRows.push([{ text: 'Keine Zubereitung eingetragen.', number: 0, soft: true }]);
  // Seitenzahl: so viele, bis alles untergebracht ist
  let count = 1, ingredientPages, stepPages;
  for (;; count++) {
    const capacities = Array.from({ length: count }, (_, index) => index === 0 ? firstCount : otherCount);
    ingredientPages = paginate(ingredientRows, capacities); stepPages = paginate(stepRows, capacities);
    const placed = pages => pages.reduce((sum, rows) => sum + rows.length, 0);
    if (count >= 30 || (placed(ingredientPages) === ingredientRows.flat().length && placed(stepPages) === stepRows.flat().length)) break;
  }
  const sheets = [];
  for (let index = 0; index < count; index++) {
    const items = index === 0 ? first : [];
    if (index > 0) {
      frame(items);
      items.push({ type: 'text', x: LEFT, y: MARGIN + 9, text: 'REZEPT · FORTSETZUNG', font: 'sansBold', size: 7.5, color: COLOR.accent, charSpace: 2.4 });
      const small = fitText(title, 'serifBold', 20, WIDTH, 14);
      items.push({ type: 'text', x: LEFT, y: MARGIN + 31, text: small.text, font: 'serifBold', size: small.size, color: COLOR.ink });
      items.push({ type: 'line', x1: LEFT, y1: MARGIN + 38, x2: RIGHT, y2: MARGIN + 38, color: COLOR.accentLine, width: 1.1 });
    }
    const top = index === 0 ? firstTop : otherTop, pills = (index === 0 ? pillTop : MARGIN + 50);
    // Auf Folgeseiten steht über einer leeren Spalte „NOTIZEN“: Die Linien sind Platz zum Schreiben
    pill(items, LEFT, pills, ingredientPages[index].length ? 'ZUTATEN' : 'NOTIZEN');
    pill(items, STEPS.x, pills, stepPages[index].length ? 'ZUBEREITUNG' : 'NOTIZEN');
    columns(items, top, index === 0 ? firstCount : otherCount, ingredientPages[index], stepPages[index]);
    sheets.push({ width: PAGE.width, height: PAGE.height, items });
  }
  sheets.forEach((sheet, index) => footer(sheet.items, index + 1, sheets.length, recipe.sourceUrl ? `${recipe.sourceHost || ''}${shortPath(recipe.sourceUrl)}` : ''));
  return { width: PAGE.width, height: PAGE.height, title, pages: sheets };
}
// Der Pfad einer Quelladresse, gekürzt („/rezepte/123/spiegeleierkuchen“)
function shortPath(url) {
  try { const path = new URL(url).pathname.replace(/\/$/, ''); return path.length > 1 ? path : ''; } catch { return ''; }
}
