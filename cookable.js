/* Was kann ich kochen? Reine Logik ohne DOM: ordnet die Rezepte danach, wie viele Zutaten schon da sind.
   „Da“ ist, was im Vorrat steht oder schon eingekauft wurde. „Kommt noch“ ist, was offen auf der Einkaufsliste steht. Alles andere fehlt.
   Geprüft wird nur, ob eine Zutat da ist, nicht die Menge. Zutaten „nach Bedarf“ (Salz, Pfeffer) und Wasser zählen nicht mit. */
import { pantryKey, pantryRows, spellingStem } from './data.js';
import { NO_AMOUNT } from './recipe-import.js';

export const RECENT_DAYS = 7;   // so lange gilt ein abgehakter Artikel als „schon eingekauft“, auch wenn er inzwischen von der Liste entfernt wurde

// Verschiedene Namen für dasselbe: Wer Olivenöl hat, kann ein Rezept mit „Öl“ kochen.
const SAME = [['öl', 'olivenöl', 'rapsöl', 'sonnenblumenöl', 'speiseöl', 'pflanzenöl'], ['sahne', 'schlagsahne', 'kochsahne'], ['hack', 'hackfleisch'],
  ['mehl', 'weizenmehl'], ['milch', 'vollmilch'], ['zwiebel', 'speisezwiebel']];
const stemOf = word => spellingStem(word);
const group = new Map(SAME.flatMap((names, index) => names.map(name => [stemOf(name), `g${index}`])));
const ALWAYS = new Set(['wasser', 'leitungswasser'].map(stemOf));

// Namensteile ohne Klammerzusatz („Salz, Pfeffer“, „Tomaten und Zwiebeln“ sind mehrere Zutaten); jeder Teil als Menge von Wortstämmen.
const parts = name => String(name ?? '').replace(/\([^)]*\)/g, ' ').split(/\s*(?:,|;|\bund\b)\s*/i)
  .map(part => [...new Set(stemOf(part).split(' ').filter(Boolean).map(word => group.get(word) || word))]).filter(tokens => tokens.length);
const within = (small, big) => small.every(token => big.includes(token));
// Passt ein Zutatenteil zu einem Namen? Gleiche Wörter (Einzahl/Mehrzahl egal), auch wenn einer mehr Wörter hat („rote Zwiebel“ zu „Zwiebeln“).
const same = (a, b) => within(a, b) || within(b, a);

/* Erreichbarkeit der Zutaten: `have` und `soon` sind Namenslisten. Gibt für einen Zutatennamen 'have', 'soon' oder 'missing' zurück;
   bei mehreren Teilen („Salz und Pfeffer“) zählt der schlechteste. */
export function indexNames({ have = [], soon = [] }) {
  const tokens = names => names.flatMap(parts);
  return { have: tokens(have), soon: tokens(soon) };
}
export function availability(name, index) {
  const wanted = parts(name);
  if (!wanted.length) return 'have';
  let worst = 'have';
  for (const part of wanted) {
    if (part.every(token => ALWAYS.has(token))) continue;
    if (index.have.some(entry => same(part, entry))) continue;
    if (index.soon.some(entry => same(part, entry))) worst = 'soon'; else return 'missing';
  }
  return worst;
}
// Muss die Zutat vorhanden sein? „Nach Bedarf“ (Salz, Pfeffer) und Wasser nicht.
export const required = row => row.unit !== NO_AMOUNT && parts(row.name).some(part => !part.every(token => ALWAYS.has(token)));

/* Rezepte ordnen. `recipes`: aktive Rezepte; `ingredientsOf(recipe)`: deren Zutaten (mit id, name, unit); `names`: { have, soon }.
   Ergebnis: [{ recipe, total, have: [Namen], soon: [Namen], missing: [{ id, name }], tier }] mit tier 0 = alles da, 1 = alles da, sobald
   die Einkaufsliste abgearbeitet ist, 2 = es fehlt etwas (nur wenn mindestens die Hälfte der Zutaten da ist oder kommt). Zuerst Stufe 0, dann 1,
   dann 2 mit den wenigsten fehlenden Zutaten; bei Gleichstand zuerst, was am längsten nicht gekocht wurde (nie gekocht zuerst), dann Favoriten. */
export function rankRecipes(recipes, ingredientsOf, names, limit = 15) {
  const index = indexNames(names), ranked = [];
  for (const recipe of recipes) {
    const rows = ingredientsOf(recipe).filter(required);
    if (!rows.length) continue;
    const entry = { recipe, total: rows.length, have: [], soon: [], missing: [], tier: 0 };
    for (const row of rows) {
      const state = availability(row.name, index);
      if (state === 'have') entry.have.push(row.name); else if (state === 'soon') entry.soon.push(row.name); else entry.missing.push({ id: row.id, name: row.name });
    }
    entry.tier = entry.missing.length ? 2 : entry.soon.length ? 1 : 0;
    if (entry.tier === 2 && (entry.have.length + entry.soon.length) * 2 < entry.total) continue;
    if (entry.tier === 2 && entry.have.length + entry.soon.length === 0) continue;
    ranked.push(entry);
  }
  const byName = (a, b) => a.recipe.name.localeCompare(b.recipe.name, 'de');
  ranked.sort((a, b) => a.tier - b.tier || a.missing.length - b.missing.length || a.soon.length - b.soon.length ||
    (a.recipe.lastCookedAt || '').localeCompare(b.recipe.lastCookedAt || '') || Number(Boolean(b.recipe.favorite)) - Number(Boolean(a.recipe.favorite)) || byName(a, b));
  return limit ? ranked.slice(0, limit) : ranked;
}

/* Namen für `indexNames` aus den Daten: `pantry` (Vorrat), `items` (alle Artikel der Liste einschließlich entfernter, nur Geschäfte, die es noch gibt),
   `now` (Zeitpunkt). Da: Vorrat, abgehakte Artikel und Artikel, die in den letzten RECENT_DAYS Tagen abgehakt und danach entfernt wurden.
   Kommt noch: offene Artikel der Liste. Wer nur entfernt (nicht abgehakt) hat, hat nichts gekauft. */
export function namesFrom({ pantry = [], items = [], now = Date.now() }) {
  const stock = pantryRows(pantry), depleted = new Set(stock.filter(row => row.available === false).map(row => pantryKey(row.name)));
  const since = now - RECENT_DAYS * 86400000, have = stock.filter(row => row.available !== false).map(row => row.name), soon = [];
  for (const item of items) {
    if (typeof item.name !== 'string') continue;
    // Eine ausdrückliche Aufgebraucht-Markierung ist verlässlicher als ein kürzlich abgehakter Einkauf.
    if (item.checked) { if (!depleted.has(pantryKey(item.name)) && Date.parse(item.updatedAt) > since) have.push(item.name); } else if (!item.deletedAt) soon.push(item.name);
  }
  return { have, soon };
}
