/* Was kann ich kochen? Reine Logik ohne DOM: ordnet die Rezepte danach, wie viele Zutaten schon da sind.
   „Da“ ist ausschließlich der aktuelle Vorrat. „Kommt noch“ ist, was offen auf der Einkaufsliste steht. Alles andere fehlt.
   Geprüft wird nur, ob eine Zutat da ist, nicht die Menge. Zutaten „nach Bedarf“ (Salz, Pfeffer) und Wasser zählen nicht mit. */
import { active, isCookingWater, pantryRows, spellingStem } from './data.js';
import { ingredientMatchName, ingredientProductName } from './product-groups.js';
import { NO_AMOUNT } from './recipe-import.js';


// Verschiedene Namen für dasselbe: Wer Olivenöl hat, kann ein Rezept mit „Öl“ kochen.
const SAME = [['öl', 'olivenöl', 'rapsöl', 'sonnenblumenöl', 'speiseöl', 'pflanzenöl'], ['sahne', 'schlagsahne', 'kochsahne'], ['hack', 'hackfleisch'],
  ['mehl', 'weizenmehl'], ['milch', 'vollmilch'], ['zwiebel', 'speisezwiebel']];
const stemOf = word => spellingStem(word);
const group = new Map(SAME.flatMap((names, index) => names.map(name => [stemOf(name), `g${index}`])));
const ALWAYS = new Set(['wasser', 'leitungswasser', 'salz', 'pfeffer'].map(stemOf));
const ingredientName = name => {
  const canonical = ingredientProductName(name);
  return canonical === 'Wasser' && !isCookingWater(name) ? name : canonical;
};

// Bekannte Beschreibungen über die gemeinsame Zutatenidentität auflösen.
// Unbekannte Zusätze bleiben bedeutend; „getrocknet“ oder „laktosefrei“ nicht pauschal übergehen.
const parts = name => String(ingredientName(name ?? '')).split(/\s*(?:,|;|\bund\b)\s*/i)
  .map(part => [...new Set(stemOf(ingredientName(part)).split(' ').filter(Boolean).map(word => group.get(word) || word))]).filter(tokens => tokens.length);
const within = (small, big) => small.every(token => big.includes(token));
// Nach der Namensauflösung müssen alle Wörter passen, auch bei umgekehrter Wortreihenfolge.
const same = (a, b) => a.length === b.length && within(a, b);

/* Erreichbarkeit der Zutaten: `have` und `soon` sind Namenslisten. Gibt für einen Zutatennamen 'have', 'soon' oder 'missing' zurück;
   bei mehreren Teilen („Salz und Pfeffer“) zählt der schlechteste. */
export function indexNames({ have = [], soon = [] }) {
  const tokens = names => names.flatMap(parts);
  return { have: tokens(have), soon: tokens(soon) };
}
export function availability(entry, index) {
  // Eine Zutatenzeile (mit Einheit) oder ein Name: „1 Dose Tomaten“ wird als Konserve geprüft.
  const name = entry && typeof entry === 'object' ? ingredientMatchName(entry) : entry;
  if (isCookingWater(name)) return 'have';
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
export const required = row => !isCookingWater(row.name) && row.unit !== NO_AMOUNT && parts(row.name).some(part => !part.every(token => ALWAYS.has(token)));

// Ohne prüfbare Zutaten gibt es keinen Nachweis, dass ein Rezept kochbar ist.
export function canCookRecipe(ingredients, index) {
  const rows = ingredients.filter(required);
  return rows.length > 0 && rows.every(row => availability(row, index) !== 'missing');
}

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
      const state = availability(row, index);
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

/* Verfügbarkeit kommt ausschließlich aus pantryRows (einschließlich Smart Stock),
   nicht aus einem Rückschluss auf abgehakte Einkaufszeilen. */
export function namesFrom({ pantry = [], items = [], mode = 'pantry', now = Date.now() }) {
  return { have: pantryRows(pantry, now).filter(row => row.available !== false).map(ingredientMatchName),
    // Dieselben aktiven Zeilen wie auf dem Einkaufszettel: zurückgenommene Wochenplan-Mengen sind keine offenen Einkäufe.
    soon: mode === 'shopping' ? active(items).filter(item => !item.checked && typeof item.name === 'string' && (item.quantity === undefined || Number.isFinite(item.quantity) && item.quantity > 0)).map(ingredientMatchName) : [] };
}
