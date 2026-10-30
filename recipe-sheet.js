/* Das Rezeptblatt (Version 2.54): ein Rezept als lesbare DIN-A4-Seite. Reine Logik ohne DOM.
   Aufbau (Entwurf „Rezeptblatt“): oben klein „REZEPTSAMMLUNG“ und „SATTPLAN“, der Titel groß in einer Schrift mit Serifen, darunter die Eckdaten (Portionen, Zutaten,
   Gesamtzeit, Stichworte, Quelle); links ein heller Kasten mit den Zutaten (Kästchen zum Abhaken, Menge hervorgehoben), rechts die Zubereitung in klar getrennten, nummerierten
   Schritten (erster Satz fett als Überschrift); unten „Meine Notizen“ mit eigenem Platz zum Schreiben. Ein Foto steht klein oben rechts. Ist das Rezept lang, geht es auf einer zweiten
   (dritten …) Seite weiter; die Notizen stehen auf der letzten. Zubereitungsschritte werden nie gekürzt: ein langer Schritt läuft auf der nächsten Seite weiter („Fortsetzung“).
   `layoutRecipe` liefert nur Zeichenbefehle (siehe pdf.js: Rechteck, Linie, Text, Bild); dieselben Befehle ergeben die PDF-Datei (pdf.js) und die Vorschau (sheet-view.js). */
import { textWidth } from './pdf.js';
import { splitSteps } from './cook.js';

export const PAGE = { width: 595.28, height: 841.89 };
export const COLOR = { ink: '#26352e', body: '#38403b', accent: '#a8502e', soft: '#6f7872', label: '#6f7872', rule: '#d9ddd5', card: '#f0f2ea', cardRule: '#d7dccf', box: '#9aa59b', badge: '#f7e4dc' };
const MARGIN = 42, LEFT = MARGIN, RIGHT = PAGE.width - MARGIN, WIDTH = RIGHT - LEFT, BOTTOM = PAGE.height - 62;
const CARD = { width: 226, pad: 15, box: 11, amount: 60 };
const STEPS = { x: LEFT + CARD.width + 26, number: 18 }; STEPS.width = RIGHT - STEPS.x;
const NOTES = { height: 150 };
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
        // Binäre Suche hält auch lange eingefügte URLs/Notizen zügig.
        let low = 1, high = word.length - 1;
        while (low < high) { const middle = Math.ceil((low + high) / 2); if (textWidth(`${word.slice(0, middle)}-`, font, size) <= maxWidth) low = middle; else high = middle - 1; }
        const cut = low;
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
// Text auf eine Breite bringen (nur für Titel und Eckdaten, nie für Kochanweisungen): erst die Schrift verkleinern (bis `min`), dann mit „…“ kürzen
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

/* ---------- Schritte: erster Satz fett, der Rest darunter ---------- */
// „Nudeln in Salzwasser kochen. Nudelwasser aufheben.“ → Überschrift „Nudeln in Salzwasser kochen.“ und Text „Nudelwasser aufheben.“; ein einzelner kurzer Satz ist nur Überschrift,
// ein langer Satz nur Text.
export function stepParts(step) {
  const text = String(step ?? '').trim();
  // Satzende: . ! ? gefolgt von Leerraum und einem Großbuchstaben (oder Ziffer, Anführungszeichen) oder vom Ende; „5 Min. köcheln“ und „ca. 1½ Std.“ enden keinen Satz
  const ABBREVIATION = /(?:^|[\s(])(?:Min|Std|ca|evtl|bzw|ggf|etc|Nr|ungef|[a-zäöü]|kg|ml|EL|TL|Pck|Pkg)\.$/i;   // auch einzelne Buchstaben („z. B.“, „d. h.“, „g“)
  for (const match of text.matchAll(/[.!?](?=\s+[A-ZÄÖÜ„"(\d]|\s*$)/g)) {
    const end = match.index + 1, head = text.slice(0, end);
    if (head.length < 3 || (match[0] === '.' && ABBREVIATION.test(head))) continue;
    if (head.length > 70) break;
    return { title: head, body: text.slice(end).trim() };
  }
  return text.length <= 60 ? { title: text, body: '' } : { title: '', body: text };
}

/* ---------- Bausteine ---------- */
const capital = text => text.charAt(0).toLocaleUpperCase('de') + text.slice(1);
function header(items, continued) {
  items.push({ type: 'text', x: LEFT, y: 50, text: continued ? 'REZEPTSAMMLUNG · FORTSETZUNG' : 'REZEPTSAMMLUNG', font: 'sansBold', size: 7, color: COLOR.accent, charSpace: 1.8 });
  items.push({ type: 'text', x: RIGHT, y: 50, text: 'SATTPLAN', font: 'sans', size: 7, color: COLOR.soft, charSpace: 0.9, align: 'right' });
}
function footer(items, page, pages, source) {
  const y = PAGE.height - 30;
  items.push({ type: 'text', x: LEFT, y, text: source ? fitText(`Quelle: ${source}`, 'sans', 7.5, 360, 7.5).text : 'Eigenes Rezept', font: 'sans', size: 7.5, color: COLOR.soft });
  items.push({ type: 'text', x: RIGHT, y, text: `Seite ${page} / ${pages}`, font: 'sans', size: 7.5, color: COLOR.soft, align: 'right', charSpace: 0.4 });
}
// Zeilen der Zutaten im Kasten: Kästchen, Menge (rechtsbündig, fett), Name
function ingredientBlocks(ingredients) {
  const nameWidth = CARD.width - 2 * CARD.pad - CARD.box - 8 - CARD.amount - 10;
  return ingredients.map(entry => {
    const amount = wrapText(entry.amount, entry.soft ? 'sans' : 'sansBold', entry.soft ? 8.5 : 10.5, CARD.amount), name = wrapText(entry.name, 'sans', 10.5, nameWidth);
    const count = Math.max(amount.length, name.length);
    return { amount, name, soft: entry.soft, height: 19 + count * 14 };
  });
}
// Schritte: Kreis mit Nummer, Überschrift fett, Text. Nichts wird gekürzt: jede Zeile jedes Schritts steht im Blatt.
function stepBlocks(instructions) {
  const width = STEPS.width - STEPS.number - 12;
  return splitSteps(instructions).map((step, index) => {
    const { title, body } = stepParts(step);
    return { number: index + 1, titleLines: title ? wrapText(title, 'sansBold', 12, width) : [], bodyLines: body ? wrapText(body, 'sans', 11, width) : [] };
  });
}
// Höhe eines Schrittstücks: Überschriftzeilen, Textzeilen, Abstand dazwischen, bei einer Fortsetzung die Zeile „Fortsetzung“, Abstand zum nächsten Schritt
const stepHeight = (titles, bodies, continued) => titles * 15.5 + bodies * 15 + (titles && bodies ? 2 : 0) + (continued ? 15 : 0) + 24;
// Die Schritte in der Reihenfolge auf Seiten verteilen; `heights` ist die verfügbare Höhe je Seite. Ein Schritt bleibt auf einer Seite, wenn er dort ganz hineinpasst. Ist er länger
// als der Rest der Seite und passt auch auf die nächste nicht ganz, geht er zeilenweise auf den Folgeseiten weiter (mit „Fortsetzung“ an seiner Nummer); dabei bleiben mindestens
// zwei Zeilen auf jeder Seite. So geht kein Text verloren und keiner läuft in die Notizen oder über den Seitenrand.
function flowSteps(blocks, heights) {
  const pages = heights.map(() => []), used = heights.map(() => 0), last = heights.length - 1;
  let page = 0;
  for (const block of blocks) {
    let rest = [...block.titleLines.map(text => ({ text, title: true })), ...block.bodyLines.map(text => ({ text, title: false }))], continued = false;
    const fragment = (lines, again) => {
      const titleLines = lines.filter(line => line.title).map(line => line.text), bodyLines = lines.filter(line => !line.title).map(line => line.text);
      return { number: block.number, continued: again, soft: block.soft, titleLines, bodyLines, height: stepHeight(titleLines.length, bodyLines.length, again) };
    };
    const wholeOnNext = fragment(rest, false).height;
    while (rest.length) {
      const room = heights[page] - used[page], whole = fragment(rest, continued);
      if (whole.height <= room + 0.01) { pages[page].push(whole); used[page] += whole.height; break; }
      if (!continued && pages[page].length && page < last && wholeOnNext <= heights[page + 1] + 0.01) { page++; continue; }
      let take = 0;
      while (take < rest.length && fragment(rest.slice(0, take + 1), continued).height <= room + 0.01) take++;
      if (rest.length - take < 2) take = rest.length - 2;
      if (take < 2 && pages[page].length && page < last) { page++; continue; }
      take = Math.max(1, Math.min(take, rest.length));
      const part = fragment(rest.slice(0, take), continued);
      pages[page].push(part); used[page] += part.height;
      rest = rest.slice(take); continued = true;
      if (rest.length && page < last) page++;
    }
  }
  return { pages, fits: used.every((height, index) => height <= heights[index] + 0.01) };
}
// Blöcke in der Reihenfolge auf Seiten verteilen: jede Seite hat eine verfügbare Höhe; ein Block bleibt ganz auf einer Seite
function pack(blocks, heights) {
  const pages = heights.map(() => []), used = heights.map(() => 0);
  let page = 0;
  for (const block of blocks) {
    while (page < heights.length - 1 && used[page] + block.height > heights[page] && pages[page].length) page++;
    pages[page].push(block); used[page] += block.height;
  }
  return { pages, fits: used.every((height, index) => height <= heights[index] + 0.01) };
}
function ingredientCard(items, x, top, blocks, servings, continued) {
  const heading = continued ? 'Zutaten · Fortsetzung' : 'Zutaten', headerH = 54, height = headerH + blocks.reduce((sum, block) => sum + block.height, 0) + 10;
  items.push({ type: 'rect', x, y: top, w: CARD.width, h: height, r: 12, fill: COLOR.card });
  items.push({ type: 'text', x: x + CARD.pad, y: top + 29, text: heading, font: 'sansBold', size: 16, color: COLOR.ink });
  if (!continued) items.push({ type: 'text', x: x + CARD.pad, y: top + 43, text: `Für ${servings} ${servings === '1' ? 'Portion' : 'Portionen'}`, font: 'sans', size: 8, color: COLOR.soft });
  let y = top + headerH;
  blocks.forEach((block, index) => {
    const first = y + 14;
    items.push({ type: 'rect', x: x + CARD.pad, y: first - 9, w: CARD.box - 2, h: CARD.box - 2, r: 1.8, fill: '#ffffff', stroke: COLOR.box, lineWidth: 0.8 });
    const amountRight = x + CARD.pad + CARD.box + 8 + CARD.amount;
    block.amount.forEach((line, row) => items.push({ type: 'text', x: amountRight, y: first + row * 14, text: line, font: block.soft ? 'sans' : 'sansBold', size: block.soft ? 8.5 : 10.5, color: block.soft ? COLOR.soft : COLOR.ink, align: 'right' }));
    block.name.forEach((line, row) => items.push({ type: 'text', x: amountRight + 10, y: first + row * 14, text: line, font: 'sans', size: 10.5, color: COLOR.body }));
    y += block.height;
    if (index < blocks.length - 1) items.push({ type: 'line', x1: x + CARD.pad, y1: y - 2, x2: x + CARD.width - CARD.pad, y2: y - 2, color: COLOR.cardRule, width: 0.6 });
  });
  return top + height;
}
function stepsColumn(items, top, blocks, continued) {
  items.push({ type: 'text', x: STEPS.x, y: top + 29, text: continued ? 'Zubereitung · Fortsetzung' : 'Zubereitung', font: 'sansBold', size: 17, color: COLOR.ink });
  let y = top + 60;
  for (const block of blocks) {
    items.push({ type: 'rect', x: STEPS.x, y: y - 12, w: STEPS.number, h: STEPS.number, r: STEPS.number / 2, fill: COLOR.badge });
    items.push({ type: 'text', x: STEPS.x + STEPS.number / 2, y: y - 0.4, text: String(block.number), font: 'sansBold', size: 8, color: COLOR.accent, align: 'center' });
    const textX = STEPS.x + STEPS.number + 12;
    let baseline = y;
    if (block.continued) { items.push({ type: 'text', x: textX, y: baseline, text: 'Fortsetzung', font: 'sansBold', size: 8, color: COLOR.accent, charSpace: 0.8 }); baseline += 15; }
    for (const line of block.titleLines) { items.push({ type: 'text', x: textX, y: baseline, text: line, font: 'sansBold', size: 12, color: COLOR.ink }); baseline += 15.5; }
    if (block.titleLines.length && block.bodyLines.length) baseline += 2;
    for (const line of block.bodyLines) { items.push({ type: 'text', x: textX, y: baseline, text: line, font: 'sans', size: 11, color: block.soft ? COLOR.soft : COLOR.body }); baseline += 15; }
    y += block.height;
  }
}
function notes(items, top, lines = []) {
  items.push({ type: 'line', x1: LEFT, y1: top, x2: RIGHT, y2: top, color: COLOR.rule, width: 0.8 });
  items.push({ type: 'text', x: LEFT, y: top + 26, text: 'Meine Notizen', font: 'serifBold', size: 15, color: COLOR.ink });
  if (lines.length) {
    const count = Math.max(1, Math.floor((BOTTOM - 8 - (top + 52)) / 15) + 1);
    for (const [index, text] of lines.splice(0, count).entries()) items.push({ type: 'text', x: LEFT, y: top + 52 + index * 15, text, font: 'sans', size: 11, color: COLOR.body });
    return;
  }
  items.push({ type: 'text', x: LEFT, y: top + 41, text: 'Für Ideen, Änderungen und das nächste Mal.', font: 'sans', size: 8, color: COLOR.soft });
  for (let line = 0; line < 3; line++) items.push({ type: 'line', x1: LEFT, y1: top + 72 + line * 28, x2: RIGHT, y2: top + 72 + line * 28, color: COLOR.rule, width: 0.7 });
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
  header(first, false);
  const photoW = photo ? 150 : 0, titleWidth = WIDTH - (photo ? photoW + 22 : 0);
  // Titel: so groß wie möglich in höchstens zwei Zeilen, sonst kleiner in drei
  let size = 34, lines = wrapText(title, 'serifBold', size, titleWidth);
  while (lines.length > 2 && size > 22) { size -= 2; lines = wrapText(title, 'serifBold', size, titleWidth); }
  lines = clip(lines, 3);
  let baseline = 70 + size * 0.85;
  for (const line of lines) { first.push({ type: 'text', x: LEFT, y: baseline, text: line, font: 'serifBold', size, color: COLOR.ink }); baseline += size * 1.1; }
  let bottom = baseline - size * 1.1 + 8;
  if (time) { first.push({ type: 'text', x: LEFT, y: bottom + 12, text: `Gesamtzeit: ${time}`, font: 'sans', size: 10.5, color: COLOR.soft }); bottom += 20; }
  if (photo) {
    const px = RIGHT - photoW, py = 62, ph = 106;
    first.push({ type: 'image', x: px, y: py, w: photoW, h: ph, photo });
    first.push({ type: 'rect', x: px, y: py, w: photoW, h: ph, r: 3, stroke: COLOR.rule, lineWidth: 0.8 });
    bottom = Math.max(bottom, py + ph + 4);
  }
  // Eckdaten zwischen zwei Linien
  const ruleTop = bottom + 14, tags = (recipe.tags || []).map(tag => String(tag).trim()).filter(Boolean).join(' · '), servings = formatNumber(recipe.servings);
  const facts = [['PORTIONEN', servings, 1, 17], ['ZUTATEN', String(ingredients.length), 1, 17], ...(time ? [['GESAMTZEIT', time, 1.5, 12]] : []), ['STICHWORTE', capital(tags) || '–', 2.4, 11.5], ...(recipe.sourceHost ? [['QUELLE', recipe.sourceHost, 1.8, 11.5]] : [])];
  const weight = facts.reduce((sum, fact) => sum + fact[2], 0);
  first.push({ type: 'line', x1: LEFT, y1: ruleTop, x2: RIGHT, y2: ruleTop, color: COLOR.rule, width: 0.8 });
  let fx = LEFT;
  for (const [label, value, share, valueSize] of facts) {
    const width = WIDTH * share / weight, fitted = fitText(value, 'sansBold', valueSize, width - 10, 8);
    first.push({ type: 'text', x: fx, y: ruleTop + 19, text: label, font: 'sansBold', size: 6.5, color: COLOR.label, charSpace: 1.1 });
    first.push({ type: 'text', x: fx, y: ruleTop + 40, text: fitted.text, font: 'sansBold', size: fitted.size, color: COLOR.ink });
    fx += width;
  }
  first.push({ type: 'line', x1: LEFT, y1: ruleTop + 54, x2: RIGHT, y2: ruleTop + 54, color: COLOR.rule, width: 0.8 });
  const firstTop = ruleTop + 74, otherTop = 76;
  const ingredientRows = ingredientBlocks(ingredients), stepRows = stepBlocks(instructions);
  if (!ingredientRows.length) ingredientRows.push({ amount: [''], name: ['Keine Zutaten eingetragen.'], soft: true, height: 33 });
  if (!stepRows.length) stepRows.push({ number: 1, titleLines: [], bodyLines: ['Keine Zubereitung eingetragen.'], soft: true });
  // Seitenzahl: so viele, bis alles untergebracht ist; auf der letzten Seite bleibt unten Platz für die Notizen
  let count = 1, left, right;
  for (;; count++) {
    const room = index => BOTTOM - (index === 0 ? firstTop : otherTop) - (index === count - 1 ? NOTES.height : 0);
    left = pack(ingredientRows, Array.from({ length: count }, (_, index) => room(index) - 64));
    right = flowSteps(stepRows, Array.from({ length: count }, (_, index) => room(index) - 60));
    if (count >= 200 || (left.fits && right.fits)) break;
  }
  const sheets = [], noteText = String(recipe.notes || '').trim(), noteLines = noteText ? wrapText(noteText, 'sans', 11, WIDTH) : [];
  for (let index = 0; index < count; index++) {
    const items = index === 0 ? first : [];
    if (index > 0) {
      header(items, true);
      const small = fitText(title, 'serifBold', 22, WIDTH, 14);
      items.push({ type: 'text', x: LEFT, y: 72, text: small.text, font: 'serifBold', size: small.size, color: COLOR.ink });
    }
    const top = index === 0 ? firstTop : otherTop;
    if (left.pages[index].length) ingredientCard(items, LEFT, top, left.pages[index], servings, index > 0);
    if (right.pages[index].length) stepsColumn(items, top, right.pages[index], index > 0);
    if (index === count - 1) notes(items, BOTTOM - NOTES.height + 14, noteLines);
    sheets.push({ width: PAGE.width, height: PAGE.height, items });
  }
  while (noteLines.length) {
    const items = []; header(items, true);
    const heading = fitText(title, 'serifBold', 22, WIDTH, 14);
    items.push({ type: 'text', x: LEFT, y: 78, text: heading.text, font: 'serifBold', size: heading.size, color: COLOR.ink });
    items.push({ type: 'text', x: LEFT, y: 112, text: 'Meine Notizen · Fortsetzung', font: 'serifBold', size: 15, color: COLOR.ink });
    const capacity = Math.floor((BOTTOM - 8 - 142) / 15) + 1;
    for (const [index, text] of noteLines.splice(0, capacity).entries()) items.push({ type: 'text', x: LEFT, y: 142 + index * 15, text, font: 'sans', size: 11, color: COLOR.body });
    sheets.push({ width: PAGE.width, height: PAGE.height, items });
  }
  sheets.forEach((sheet, index) => footer(sheet.items, index + 1, sheets.length, recipe.sourceUrl ? `${recipe.sourceHost || ''}${shortPath(recipe.sourceUrl)}` : ''));
  return { width: PAGE.width, height: PAGE.height, title, pages: sheets };
}
// Der Pfad einer Quelladresse, gekürzt („/rezepte/123/spiegeleierkuchen“)
function shortPath(url) {
  try { const path = new URL(url).pathname.replace(/\/$/, ''); return path.length > 1 ? path : ''; } catch { return ''; }
}
