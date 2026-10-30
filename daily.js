/* „Rezepte des Tages“: Aus einer Webseite mit Rezeptvorschlägen (z. B. der Tagesrezepte-Seite von Chefkoch) die Rezept-Links herausziehen,
   die heute noch nicht entschieden sind. Reine Logik ohne DOM und ohne Netz; geladen wird in app.js über den Hilfsdienst. */
import { decodeEntities, durationLabel, extractJsonLd, parseIngredientLine, plainText } from './recipe-import.js';

export const DAILY_MAX = 10;
// Chefkoch: /rezepte/1234567/Spaghetti-Carbonara.html
const RECIPE_PATH = /\/rezepte\/(\d{4,})\/([^/?#"'\s<>]*)/i;
const host = hostname => hostname.replace(/^www\./, '').toLowerCase();

// Kennung eines Rezepts für den Vergleich („schon entschieden“, „schon in meinen Rezepten“): Bei Chefkoch die Nummer, sonst Adresse ohne Anhang.
export function recipeKey(url) {
  try {
    const parsed = new URL(url), found = RECIPE_PATH.exec(parsed.pathname);
    return found ? `${host(parsed.hostname)}:${found[1]}` : `${host(parsed.hostname)}${parsed.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch { return String(url || '').trim().toLowerCase(); }
}
// Lesbarer Titel aus der Adresse: …/Spaghetti-Carbonara-nach-Omas-Art.html → „Spaghetti Carbonara nach Omas Art“
export function slugTitle(url) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const words = decodeURIComponent(last).replace(/\.[a-z]{2,5}$/i, '').replace(/[-_+]+/g, ' ').trim();
    return words ? words[0].toUpperCase() + words.slice(1) : '';
  } catch { return ''; }
}

function itemList(node, found, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return;
  if (Array.isArray(node)) { node.forEach(entry => itemList(entry, found, depth + 1)); return; }
  const types = [].concat(node['@type'] || []);
  if (types.includes('ItemList') && Array.isArray(node.itemListElement)) {
    for (const element of node.itemListElement) {
      const item = element?.item && typeof element.item === 'object' ? element.item : element;
      const url = typeof element?.item === 'string' ? element.item : item?.url || item?.['@id'] || element?.url;
      if (typeof url === 'string') found.push({ url, title: plainText(item?.name || element?.name || '') });
    }
  }
  for (const value of Object.values(node)) if (value && typeof value === 'object') itemList(value, found, depth + 1);
}

/* Rezept-Links einer Seite in der Reihenfolge, in der sie dort stehen, ohne Doppelte.
   Quellen: 1. strukturierte Daten (ItemList), 2. Links der Form /rezepte/<Nummer>/<Name> im HTML. Ergebnis: [{ url, key, title }]. */
export function extractRecipeLinks(html, base) {
  const out = new Map();
  const add = (href, title = '') => {
    let url;
    try { const parsed = new URL(decodeEntities(String(href)), base); if (!/^https?:$/.test(parsed.protocol)) return; parsed.protocol = 'https:'; parsed.hash = ''; parsed.search = ''; url = parsed.href; }
    catch { return; }
    const key = recipeKey(url);
    if (!out.has(key)) out.set(key, { url, key, title: '' });
    const entry = out.get(key);
    if (title && !entry.title) entry.title = title.slice(0, 120);
  };
  const listed = [];
  for (const block of extractJsonLd(html)) itemList(block, listed);
  for (const entry of listed) if (RECIPE_PATH.test(entry.url)) add(entry.url, entry.title);
  for (const match of String(html).matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) if (RECIPE_PATH.test(match[1])) add(match[1]);
  for (const entry of out.values()) if (!entry.title) entry.title = slugTitle(entry.url);
  return [...out.values()];
}

// Die Vorschläge für heute: nicht schon entschiedene (`decided`) und nicht schon vorhandene (`known`), höchstens `max`. Beides sind Mengen von recipeKey.
export function planDay(links, decided = new Set(), known = new Set(), max = DAILY_MAX) {
  return links.filter(link => !decided.has(link.key) && !known.has(link.key)).slice(0, max);
}

/* ---------- Eingebaute Sammlung (ohne Hilfsdienst) ----------
   rezepte-des-tages.json: Hausrezepte als { n: Name, p: Portionen, t: Minuten, c: Kategorie, z: [Zutaten], s: [Schritte] }.
   Jeden Tag kommen drei neue Vorschläge. Die Reihenfolge ist für alle Geräte gleich (feste Mischung, Tag bestimmt die Stelle):
   Wer dieselbe App benutzt, sieht am selben Tag dieselben drei Rezepte. */
export const BUILTIN_SOURCE = 'eingebaut';
export const BUILTIN_PER_DAY = 3;
export const builtinKey = name => `eigene:${String(name).trim().toLocaleLowerCase('de')}`;
// Tage seit 1970 für ein Datum der Form JJJJ-MM-TT.
export const dayNumber = day => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);

export function validBuiltin(entry) {
  return Boolean(entry) && typeof entry.n === 'string' && entry.n.trim() && Number.isFinite(entry.p) && entry.p > 0 && Number.isFinite(entry.t) && entry.t > 0 &&
    Array.isArray(entry.z) && entry.z.length > 0 && entry.z.every(line => typeof line === 'string') && Array.isArray(entry.s) && entry.s.length > 0 && entry.s.every(step => typeof step === 'string');
}
// Feste, von der Tageszahl unabhängige Mischung 0 … n-1 (Mulberry32 mit festem Startwert).
export function fixedOrder(length, seed = 20260101) {
  const order = Array.from({ length }, (_, index) => index);
  let state = seed >>> 0;
  const random = () => { state = (state + 0x6D2B79F5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let index = length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [order[index], order[other]] = [order[other], order[index]]; }
  return order;
}
// Die heutigen Vorschläge: ab der Stelle des Tages in der festen Reihenfolge die nächsten, die noch nicht entschieden und nicht schon vorhanden sind.
export function planBuiltin(collection, day, decided = new Set(), known = new Set(), count = BUILTIN_PER_DAY) {
  const valid = collection.filter(validBuiltin), size = valid.length;
  if (!size) return [];
  const order = fixedOrder(size), start = (((dayNumber(day) * count) % size) + size) % size, picks = [];
  for (let offset = 0; offset < size && picks.length < count; offset++) {
    const entry = valid[order[(start + offset) % size]], key = builtinKey(entry.n);
    if (!decided.has(key) && !known.has(key)) picks.push({ key, title: entry.n, builtin: entry.n });
  }
  return picks;
}
// Entwurf wie aus dem Import: Zutaten über denselben Zerleger, Schritte nummeriert.
export function draftFromBuiltin(entry) {
  const ingredients = entry.z.map(parseIngredientLine).filter(Boolean);
  const steps = entry.s.map((step, index) => `${index + 1}. ${step}`).join('\n\n');
  return { name: entry.n, servings: entry.p, tags: entry.c ? [entry.c] : [], ingredients, instructions: `Gesamtzeit: ${durationLabel(entry.t)}\n\n${steps}`, warnings: [], via: 'schema', sourceUrl: '' };
}

/* Lokaler Tagesverlauf: nur die tatsächlichen Auswahlen von heute und gestern.
   Keine neue Planung beim Zurückblättern und keine Änderung an „schon entschieden“. */
export function dailyRecord(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.day || '') || !Array.isArray(value.queue)) return null;
  return JSON.parse(JSON.stringify({ day: value.day, source: value.source || '', queue: value.queue, index: value.index || 0,
    outcome: value.outcome || {}, drafts: value.drafts || {}, builtin: Boolean(value.builtin), found: value.found || 0 }));
}
export function dailyHistory(value, today) {
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10), records = new Map();
  for (const candidate of [...(Array.isArray(value?.history) ? value.history : []), value]) {
    const record = dailyRecord(candidate);
    if (record && [yesterday, today].includes(record.day)) records.set(record.day, record);
  }
  return [...records.values()].sort((a, b) => a.day.localeCompare(b.day));
}
export function dailySnapshot(draft) {
  return { name: String(draft.name || '').slice(0, 120), servings: Number(draft.servings) || 2, tags: Array.isArray(draft.tags) ? draft.tags.filter(t => typeof t === 'string') : [],
    instructions: String(draft.instructions || ''), sourceUrl: String(draft.sourceUrl || ''), via: draft.via || 'schema',
    ingredients: (draft.ingredients || []).map(row => ({ name: String(row.name), quantity: row.quantity, unit: String(row.unit) })) };
}
