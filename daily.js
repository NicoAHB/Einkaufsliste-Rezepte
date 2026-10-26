/* „Rezepte des Tages“: Aus einer Webseite mit Rezeptvorschlägen (z. B. der Tagesrezepte-Seite von Chefkoch) die Rezept-Links herausziehen,
   die heute noch nicht entschieden sind. Reine Logik ohne DOM und ohne Netz; geladen wird in app.js über den Hilfsdienst. */
import { decodeEntities, extractJsonLd, plainText } from './recipe-import.js';

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
