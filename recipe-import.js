/* Rezept-Import: reine Textlogik ohne DOM und ohne Netzwerk.
   Alles hier liefert nur Vorschläge. Die Person prüft sie im Rezept-Editor,
   bevor etwas gespeichert wird. Eingaben stammen aus fremden Webseiten und
   Texterkennung; deshalb wird nie HTML eingefügt, sondern nur Text erzeugt. */
export const NO_AMOUNT = 'nach Bedarf';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', auml: 'ä', ouml: 'ö', uuml: 'ü',
  Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', ndash: '–', mdash: '—',
  hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', eacute: 'é',
  egrave: 'è', agrave: 'à', ccedil: 'ç', times: '×', middot: '·', euro: '€' };

export function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (all, code) => {
    if (code[0] === '#') {
      const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(number) && number > 0 && number < 0x110000 && !(number >= 0xd800 && number < 0xe000) ?
        String.fromCodePoint(number) : all;
    }
    return Object.hasOwn(NAMED, code) ? NAMED[code] : all;
  });
}

// Text mit eingestreuten Tags oder Entities (JSON-LD enthält oft beides) in einfachen Text verwandeln.
export function plainText(value) {
  return decodeEntities(String(value ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(?:p|li|div)>/gi, '\n').replace(/<[^>]*>/g, ''))
    .replace(/[   ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- Zutatenzeilen ---------- */
const VULGAR = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8, '⅕': 1 / 5 };
const WORDS = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7,
  acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, halbe: .5, halben: .5, halber: .5, halbes: .5, halb: .5, anderthalb: 1.5 };
// Maßeinheiten werden vereinheitlicht und gegebenenfalls umgerechnet (cl → ml).
const MEASURES = { g: ['g', 1], gr: ['g', 1], gramm: ['g', 1], kg: ['kg', 1], kilo: ['kg', 1], kilogramm: ['kg', 1],
  pfund: ['g', 500], ml: ['ml', 1], milliliter: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['l', 1], liter: ['l', 1],
  el: ['EL', 1], essl: ['EL', 1], esslöffel: ['EL', 1], tl: ['TL', 1], teel: ['TL', 1], teelöffel: ['TL', 1],
  stk: ['Stück', 1], stück: ['Stück', 1], stücke: ['Stück', 1] };
// Zählwörter mit Einzahl und Mehrzahl: „1 Zehe“, aber „3 Zehen“.
const PLURALS = [['Zehe', 'Zehen'], ['Dose', 'Dosen'], ['Packung', 'Packungen'], ['Scheibe', 'Scheiben'], ['Stange', 'Stangen'],
  ['Tasse', 'Tassen'], ['Kopf', 'Köpfe'], ['Zweig', 'Zweige'], ['Stiel', 'Stiele'], ['Flasche', 'Flaschen'], ['Tüte', 'Tüten'],
  ['Knolle', 'Knollen'], ['Prise', 'Prisen'], ['Messerspitze', 'Messerspitzen'], ['Rolle', 'Rollen'], ['Kugel', 'Kugeln'],
  ['Schale', 'Schalen'], ['Tube', 'Tuben']];
const PLURAL_LOOKUP = new Map(PLURALS.flatMap(pair => pair.map(word => [word.toLocaleLowerCase('de'), pair])));
for (const alias of ['pck', 'pkg', 'pack']) PLURAL_LOOKUP.set(alias, PLURALS[2]);
PLURAL_LOOKUP.set('msp', PLURALS[13]);
// Wörter, die im Deutschen Mengenangaben sind, aber in der Mehrzahl gleich bleiben oder idiomatisch benutzt werden.
const PLAIN_UNITS = new Set(['bund', 'bünde', 'blatt', 'blätter', 'glas', 'gläser', 'becher', 'handvoll', 'schuss', 'spritzer', 'würfel', 'streifen', 'hauch', 'bündel', 'päckchen']);
const FILLER = /^(?:(?:ca|circa|etwa|ungefähr|evtl|eventuell|optional|etwas)[.:]?\s+|~\s*|nach\s+(?:geschmack|belieben|bedarf)\s+)/i;
const TRAILING_FILLER = /[,;]?\s*\(?(?:nach\s+(?:geschmack|belieben|bedarf)|optional|evtl\.?|bei\s+bedarf|zum\s+abschmecken)\)?\s*$/i;

function number(text) {
  let m;
  if ((m = /^(\d+)\s?([½¼¾⅓⅔⅛⅜⅝⅞⅕])/.exec(text))) return [Number(m[1]) + VULGAR[m[2]], m[0].length];
  if ((m = /^([½¼¾⅓⅔⅛⅜⅝⅞⅕])/.exec(text))) return [VULGAR[m[1]], m[0].length];
  if ((m = /^(\d+) (\d+)\/(\d+)(?!\d)/.exec(text)) && Number(m[3])) return [Number(m[1]) + Number(m[2]) / Number(m[3]), m[0].length];
  if ((m = /^(\d+)\/(\d+)(?!\d)/.exec(text)) && Number(m[2])) return [Number(m[1]) / Number(m[2]), m[0].length];
  if ((m = /^\d{1,3}(?:\.\d{3})+(?![\d,]|\.\d)/.exec(text))) return [Number(m[0].replace(/\./g, '')), m[0].length];
  if ((m = /^\d+(?:[.,]\d+)?/.exec(text))) return [Number(m[0].replace(',', '.')), m[0].length];
  return null;
}
// Zahl oder Zahlwort am Anfang, optional als Bereich („2–3“, „2 bis 3“); beim Bereich zählt die größere Menge.
function amount(text) {
  const first = number(text);
  if (first) {
    let [value, length] = first;
    const range = /^\s*(?:-|–|—|bis)\s*/.exec(text.slice(length));
    const upper = range && number(text.slice(length + range[0].length));
    if (upper && upper[0] >= value) { value = upper[0]; length += range[0].length + upper[1]; }
    return [value, length];
  }
  const word = /^([a-zäöüß]+)\b/i.exec(text);
  const key = word?.[1].toLocaleLowerCase('de');
  if (!word || !Object.hasOwn(WORDS, key) || /^ein\s+paar\b/i.test(text)) return null;
  let value = WORDS[key], length = word[0].length;
  const half = /^\s+(halbe[nrs]?)\b/i.exec(text.slice(length));
  if (half && value === 1) { value = .5; length += half[0].length; }
  return [value, length];
}
function unitOf(text, quantity) {
  const m = /^\s*([A-Za-zÄÖÜäöüß]+)\.?(?![A-Za-zÄÖÜäöüß])/.exec(text);
  if (!m) return null;
  const key = m[1].toLocaleLowerCase('de');
  if (Object.hasOwn(MEASURES, key)) { const [unit, factor] = MEASURES[key]; return { unit, factor, length: m[0].length }; }
  if (PLURAL_LOOKUP.has(key)) { const [one, many] = PLURAL_LOOKUP.get(key); return { unit: quantity === 1 ? one : many, factor: 1, length: m[0].length }; }
  if (PLAIN_UNITS.has(key)) return { unit: m[1][0].toLocaleUpperCase('de') + m[1].slice(1), factor: 1, length: m[0].length };
  return null;
}
const tidy = text => text.replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—]+|[\s,;:]+$/g, '').trim();
const cleanName = text => tidy(text).replace(/^(?:von|vom|of)\s+/i, '').slice(0, 120);
const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });
const format = value => numberFormat.format(value);

/* Eine Zutatenzeile in Menge, Einheit und Name zerlegen. Ohne Menge („Salz“) entsteht
   „nach Bedarf“, damit die Zeile nie eine erfundene Zahl enthält. Gibt null für leere Zeilen zurück. */
export function parseIngredientLine(raw) {
  let line = plainText(raw).replace(/\n+/g, ' ')
    .replace(/^[^\p{L}\p{N}(½¼¾⅓⅔⅛⅜⅝⅞⅕]+/u, '').replace(/^[eo]\s+(?=\d)/, '').trim();
  if (!line || !/[\p{L}\p{N}]/u.test(line)) return null;
  line = line.replace(FILLER, '');
  let found = amount(line);
  if (found) {
    const quantity = found[0];
    let rest = line.slice(found[1]);
    // „200g“ ohne Leerzeichen und „200 g“ werden gleich behandelt.
    const unit = unitOf(rest, quantity);
    let name, outUnit = 'Stück', outQuantity = quantity;
    if (unit) { outUnit = unit.unit; outQuantity = quantity * unit.factor; rest = rest.slice(unit.length); }
    // „1 Dose à 400 g Tomaten“: Packungsgröße als Hinweis hinter dem Namen behalten.
    const pack = /^\s*(?:à|a|je)\s*([\d.,/]+\s*[A-Za-zäöü]+)\.?\s+(.+)$/i.exec(rest);
    name = pack ? `${cleanName(pack[2])} (à ${pack[1].replace(/\s+/g, ' ')})` : cleanName(rest);
    if (!name) return null;
    if (!(outQuantity > 0) || !Number.isFinite(outQuantity)) return { name, quantity: 1, unit: NO_AMOUNT };
    return { name: name.slice(0, 120), quantity: Math.round(outQuantity * 1000) / 1000, unit: outUnit };
  }
  // Menge hinter dem Namen: „Mehl – 200 g“ oder „Mehl: 200g“.
  const trailing = /^(.+?)\s*[-–—:]\s*(\d.*)$/.exec(line);
  if (trailing) {
    const parsed = parseIngredientLine(trailing[2] + ' ' + trailing[1]);
    if (parsed && parsed.unit !== NO_AMOUNT) return parsed;
  }
  const name = cleanName(line.replace(TRAILING_FILLER, ''));
  return name ? { name, quantity: 1, unit: NO_AMOUNT } : null;
}

export function ingredientLabel(row, factor = 1) {
  return row.unit === NO_AMOUNT ? `${row.name} (${NO_AMOUNT})` : `${format(row.quantity * factor)} ${row.unit} ${row.name}`;
}

/* ---------- Metadaten ---------- */
export function parseServings(value) {
  const first = Array.isArray(value) ? value.find(Boolean) : value;
  if (typeof first === 'number') return first > 0 ? first : null;
  const m = /(\d+(?:[.,]\d+)?)/.exec(plainText(first));
  const result = m ? Number(m[1].replace(',', '.')) : 0;
  return result > 0 && result <= 500 ? result : null;
}
export function parseDuration(value) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(String(value ?? '').trim());
  const minutes = m ? Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
  return minutes > 0 ? minutes : 0;
}
export function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}
export function webUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export const firstUrl = text => webUrl(/https?:\/\/[^\s<>"'„“”]+/i.exec(String(text || ''))?.[0].replace(/[).,;]+$/, ''));
export const hostLabel = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

/* ---------- strukturierte Rezeptdaten (schema.org/Recipe) ---------- */
function asList(value) { return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]; }
function isRecipe(node) { return node && typeof node === 'object' && asList(node['@type']).some(type => /(?:^|[/#])Recipe$/i.test(String(type))); }

export function extractJsonLd(html) {
  const found = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of String(html).matchAll(pattern)) {
    const text = match[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
    for (const candidate of [text, text.replace(/[\u0000-\u001f]+/g, ' ')]) {
      try { found.push(JSON.parse(candidate)); break; } catch { /* nächster Versuch */ }
    }
  }
  return found;
}
export function findRecipeNode(json, depth = 0) {
  if (!json || typeof json !== 'object' || depth > 6) return null;
  if (Array.isArray(json)) { for (const entry of json) { const hit = findRecipeNode(entry, depth + 1); if (hit) return hit; } return null; }
  if (isRecipe(json)) return json;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const hit = findRecipeNode(json[key], depth + 1); if (hit) return hit;
  }
  return null;
}
function steps(value, depth = 0) {
  if (depth > 4) return [];
  if (typeof value === 'string') return plainText(value).split(/\n+/).map(line => line.trim()).filter(Boolean);
  const out = [];
  for (const entry of asList(value)) {
    if (typeof entry === 'string') out.push(...steps(entry, depth + 1));
    else if (entry && typeof entry === 'object') {
      if (entry.itemListElement) {
        const title = plainText(entry.name);
        if (title) out.push(`${title}:`);
        out.push(...steps(entry.itemListElement, depth + 1));
      } else out.push(...steps(entry.text ?? entry.name, depth + 1));
    }
  }
  return out;
}
const numbered = lines => lines.map(line => /^(?:\d+[.)]|[-•*])\s/.test(line) ? line : null).filter(Boolean).length > lines.length / 2;
// Schritte nummerieren, sofern die Quelle es nicht selbst tut. Zwischenüberschriften („Teig:“) bleiben unnummeriert.
function formatSteps(lines) {
  if (lines.length === 1 || numbered(lines)) return lines.join('\n\n');
  let count = 0;
  return lines.map(line => /:$/.test(line) && line.length < 60 ? line : `${++count}. ${line}`).join('\n\n');
}
function tagsFrom(node) {
  const raw = [...asList(node.keywords), ...asList(node.recipeCategory), ...asList(node.recipeCuisine)]
    .flatMap(entry => typeof entry === 'string' ? plainText(entry).split(',') : []);
  const seen = new Set(), tags = [];
  for (const tag of raw.map(entry => entry.trim()).filter(entry => entry && entry.length <= 30)) {
    const key = tag.toLocaleLowerCase('de');
    if (!seen.has(key)) { seen.add(key); tags.push(tag); }
  }
  return tags.slice(0, 6);
}

export function recipeFromSchema(node) {
  const lines = asList(node.recipeIngredient ?? node.ingredients).flatMap(entry => plainText(typeof entry === 'string' ? entry : entry?.name ?? '').split(/\n+/));
  const ingredients = lines.map(parseIngredientLine).filter(Boolean);
  const stepLines = steps(node.recipeInstructions);
  const minutes = parseDuration(node.totalTime) || parseDuration(node.cookTime) + parseDuration(node.prepTime);
  const body = stepLines.length ? formatSteps(stepLines) : '';
  return { name: plainText(node.name).slice(0, 120), servings: parseServings(node.recipeYield), tags: tagsFrom(node), ingredients,
    instructions: [minutes ? `Gesamtzeit: ${durationLabel(minutes)}` : '', body].filter(Boolean).join('\n\n'), warnings: [] };
}

/* ---------- HTML ---------- */
export function htmlToText(html) {
  return decodeEntities(String(html).slice(0, 2_500_000)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|head|nav|footer|form|iframe|button|select)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(?:p|div|br|li|ul|ol|tr|h[1-6]|section|article|header|table|dd|dt|figure)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[   ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
export function pageTitle(html) {
  const source = String(html).slice(0, 400_000);
  const meta = /<meta\b[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i.exec(source) ||
    /<meta\b[^>]*content\s*=\s*["']([^"']*)["'][^>]*property\s*=\s*["']og:title["']/i.exec(source);
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(source), title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(source);
  const raw = plainText((meta || h1 || title || [])[1] || '');
  // „Spaghetti Carbonara | Chefkoch“ → „Spaghetti Carbonara“
  return raw.split(/\s+[|–—]\s+|\s+-\s+/)[0].slice(0, 120).trim();
}

/* ---------- freier Text (Texterkennung, Einfügen, Seitentext) ---------- */
const HEAD_INGREDIENTS = /^(?:zutaten(?:liste)?|einkaufsliste|einkaufszettel|das\s+brauchst\s+du|du\s+brauchst|ihr\s+braucht|man\s+braucht|ingredients?)\b(.*)$/i;
const HEAD_STEPS = /^(?:zubereitung(?:sschritte)?|anleitung|so\s+geht(?:'|’)?s|so\s+geht\s+es|so\s+wird(?:'|’)?s\s+gemacht|so\s+gelingt(?:'|’)?s|und\s+so\s+geht(?:'|’)?s|arbeitsschritte|schritte|directions?|instructions?|method)\b(.*)$/i;
const HEAD_SERVINGS = /^(?:ergibt|ergiebigkeit|portionen?|personen?|für|fuer|serves?|yield)\b[:\s]*(.*)$/i;
const headingText = line => line.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[\s:：*_#=\-–—]+$/u, '').trim();
function headingOf(line) {
  const text = headingText(line);
  if (!text || text.length > 70) return null;
  let m;
  if ((m = HEAD_INGREDIENTS.exec(text)) && m[1].length <= 45 && !/\d\s*(?:g|kg|ml|l|el|tl)\b/i.test(m[1])) return { kind: 'ingredients', rest: m[1] };
  if ((m = HEAD_STEPS.exec(text)) && m[1].length <= 30) return { kind: 'steps', rest: m[1] };
  return null;
}
function servingsLine(line) {
  const text = headingText(line);
  const m = HEAD_SERVINGS.exec(text);
  if (m) { const value = parseServings(m[1]); if (value && text.length <= 40) return value; }
  const bare = /^(\d+(?:[.,]\d+)?)\s*(?:portionen?|personen?|port\.|pers\.)$/i.exec(text);
  return bare ? parseServings(bare[1]) : null;
}
const wordCount = line => line.trim().split(/\s+/).length;
const isSentence = line => (/[.!?]$/.test(line.trim()) && wordCount(line) >= 3) || wordCount(line) > 12;
// „10 Minuten köcheln lassen“ ist ein Arbeitsschritt, keine Zutat.
const TIME_WORD = /^(?:minuten?|min|sek|sekunden?|stunden?|std|grad|°|%|mal|schritt|tage?|wochen?)\b/i;
function ingredientLike(line) {
  const text = line.trim();
  if (!text || isSentence(text)) return false;
  const parsed = parseIngredientLine(text);
  return Boolean(parsed && parsed.unit !== NO_AMOUNT && wordCount(text) <= 9 && !TIME_WORD.test(parsed.name));
}

// Zeilen zu Absätzen formen. Umbrüche der Texterkennung innerhalb eines Satzes werden wieder verbunden,
// Silbentrennung wird aufgelöst, nummerierte Schritte bleiben getrennt.
function joinLines(parts) {
  return parts.reduce((text, line) => !text ? line :
    /[a-zäöüß]-$/.test(text) && /^[a-zäöüß]/.test(line) ? text.slice(0, -1) + line :
    /[.!?:]$/.test(text) ? `${text}\n${line}` : `${text} ${line}`, '');
}
function paragraphs(lines) {
  const blocks = [[]];
  for (const line of lines) { if (line) blocks.at(-1).push(line); else if (blocks.at(-1).length) blocks.push([]); }
  return blocks.filter(block => block.length).map(block => {
    if (block.filter(line => /^(?:\d+[.)]|[-•*▪●])\s?/.test(line)).length < 2) return joinLines(block);
    const items = [];
    for (const line of block) {
      if (/^(?:\d+[.)]|[-•*▪●])\s?/.test(line) || !items.length) items.push([line]); else items.at(-1).push(line);
    }
    return items.map(parts => parts.reduce((text, line) => !text ? line : /[a-zäöüß]-$/.test(text) && /^[a-zäöüß]/.test(line) ? text.slice(0, -1) + line : `${text} ${line}`, '')).join('\n\n');
  }).join('\n\n');
}

export function parseRecipeText(input) {
  const lines = plainText(input).split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim());
  while (lines.length && !lines[0]) lines.shift();
  const warnings = [], meta = [];
  const marks = lines.map((line, index) => ({ index, ...(headingOf(line) || {}) })).filter(mark => mark.kind);
  const firstIngredients = marks.find(mark => mark.kind === 'ingredients'), firstSteps = marks.find(mark => mark.kind === 'steps');
  let servings = null, ingredientRange = null, stepsStart = -1, titleEnd = lines.length;

  if (firstIngredients) {
    const start = firstIngredients.index + 1;
    servings = parseServings(firstIngredients.rest);
    const nextSteps = marks.find(mark => mark.kind === 'steps' && mark.index > firstIngredients.index);
    let end = nextSteps ? nextSteps.index : lines.length;
    // Ohne Zubereitungs-Überschrift endet die Liste bei der ersten Satzzeile.
    if (!nextSteps) for (let i = start; i < end; i++) { if (lines[i] && isSentence(lines[i]) && !ingredientLike(lines[i])) { end = i; break; } }
    ingredientRange = [start, end]; titleEnd = firstIngredients.index;
    stepsStart = nextSteps ? nextSteps.index + 1 : end;
  } else if (firstSteps) {
    stepsStart = firstSteps.index + 1; titleEnd = firstSteps.index;
    const run = longestRun(lines, 0, firstSteps.index);
    if (run) { ingredientRange = run; titleEnd = run[0]; }
  } else {
    const run = longestRun(lines, 0, lines.length);
    if (run) { ingredientRange = run; titleEnd = run[0]; stepsStart = run[1]; }
    else { titleEnd = Math.min(1, lines.length); stepsStart = titleEnd; }
  }

  const ingredients = [];
  if (ingredientRange) {
    for (const line of lines.slice(ingredientRange[0], ingredientRange[1])) {
      if (!line || headingOf(line) || (/:$/.test(line) && !/\d/.test(line))) continue;   // Überschriften wie „Für den Teig:“
      const serving = servingsLine(line);
      if (serving && !ingredientLike(line)) { servings ||= serving; continue; }
      const parsed = parseIngredientLine(line);
      if (parsed) ingredients.push(parsed);
    }
  }
  let title = '';
  for (const line of lines.slice(0, titleEnd)) {
    if (!line) continue;
    const serving = servingsLine(line);
    if (serving) { servings ||= serving; continue; }
    if (/^(?:arbeitszeit|zubereitungszeit|kochzeit|backzeit|ruhezeit|gesamtzeit|zeit)\b.*\d/i.test(headingText(line))) { meta.push(headingText(line)); continue; }
    if (!title && line.length <= 100 && !ingredientLike(line) && /\p{L}{3}/u.test(line) && !/^[@#]/.test(line)) {
      title = headingText(line).replace(/^rezept[:\s]+/i, '').slice(0, 120);
    }
  }
  const body = stepsStart >= 0 ? paragraphs(lines.slice(stepsStart)) : '';
  if (!ingredients.length) warnings.push('Keine Zutaten erkannt. Bitte Zutaten von Hand ergänzen oder den Text prüfen.');
  if (!body) warnings.push('Keine Zubereitung erkannt.');
  return { name: title, servings, tags: [], ingredients, instructions: [meta.join(' · '), body].filter(Boolean).join('\n\n'), warnings };
}
// Der längste zusammenhängende Block von Zeilen, die wie Zutaten aussehen (Leerzeilen unterbrechen nicht).
function longestRun(lines, from, to) {
  let best = null, start = -1, count = 0, last = -1;
  const close = () => { if (count >= 2 && (!best || count > best[2])) best = [start, last + 1, count]; start = -1; count = 0; };
  for (let i = from; i < to; i++) {
    if (!lines[i]) continue;
    if (ingredientLike(lines[i])) { if (start < 0) start = i; count++; last = i; }
    else close();
  }
  close();
  return best ? [best[0], best[1]] : null;
}

/* ---------- Einstieg für Seiten und eingefügten Text ---------- */
export function recipeFromHtml(html, sourceUrl = '') {
  for (const block of extractJsonLd(html)) {
    const node = findRecipeNode(block);
    if (!node) continue;
    const recipe = recipeFromSchema(node);
    if (recipe.ingredients.length || recipe.instructions) {
      if (!recipe.name) recipe.name = pageTitle(html);
      if (!recipe.ingredients.length) recipe.warnings.push('Keine Zutaten erkannt. Bitte Zutaten von Hand ergänzen.');
      return { ...recipe, sourceUrl: webUrl(sourceUrl), via: 'schema' };
    }
  }
  const recipe = parseRecipeText(htmlToText(html));
  recipe.name = recipe.name || pageTitle(html);
  recipe.warnings.unshift('Die Seite enthält keine strukturierten Rezeptdaten. Der Text wurde geschätzt; bitte alles prüfen.');
  return { ...recipe, sourceUrl: webUrl(sourceUrl), via: 'text' };
}
export function recipeFromAnyText(text, sourceUrl = '') {
  const input = String(text || ''), url = webUrl(sourceUrl);
  const tryJson = value => { try { return JSON.parse(value); } catch { return null; } };
  const blocks = /<script\b[^>]*ld\+json/i.test(input) ? extractJsonLd(input) : /^\s*[{[]/.test(input) ? [tryJson(input)] : [];
  for (const block of blocks) {
    const node = findRecipeNode(block);
    if (node) return { ...recipeFromSchema(node), sourceUrl: url, via: 'schema' };
  }
  if (/<\/?(?:html|body|div|p|li|ul|h[1-6])\b/i.test(input) && input.length > 300) return recipeFromHtml(input, url);
  return { ...parseRecipeText(input), sourceUrl: url, via: 'text' };
}
