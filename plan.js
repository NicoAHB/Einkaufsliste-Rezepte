/* Wochenplan: Datumsrechnung und Zutaten über mehrere Gerichte zusammenzählen. Reine Logik ohne DOM.
   Tage sind lokale Kalendertage im Format JJJJ-MM-TT; gerechnet wird um 12 Uhr, damit Zeitumstellungen nie einen Tag verschieben. */
import { sameProduct } from './data.js';
import { productKey, unitSpec } from './prices.js';
import { NO_AMOUNT } from './recipe-import.js';

const pad = number => String(number).padStart(2, '0');
export const isoDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = iso => new Date(`${iso}T12:00:00`);
export function addDays(iso, days) { const date = parse(iso); date.setDate(date.getDate() + days); return isoDate(date); }
// Wochen beginnen montags.
export const weekStart = iso => addDays(iso, -((parse(iso).getDay() + 6) % 7));
export const weekDays = iso => Array.from({ length: 7 }, (_, index) => addDays(weekStart(iso), index));
const utcDay = iso => { const [year, month, day] = iso.split('-').map(Number); return Date.UTC(year, month - 1, day); };
export const daysBetween = (from, to) => Math.round((utcDay(to) - utcDay(from)) / 86400000);

// Kalenderwoche nach ISO 8601: Der Donnerstag bestimmt das Jahr der Woche.
export function isoWeek(iso) {
  const thursday = addDays(weekStart(iso), 3), [year] = thursday.split('-').map(Number);
  return { week: Math.floor(daysBetween(`${year}-01-01`, thursday) / 7) + 1, year };
}
const weekdayName = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }), dayMonth = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
export const dayName = iso => weekdayName.format(parse(iso));
export const dayMonthLabel = iso => dayMonth.format(parse(iso));
export function weekLabel(iso) {
  const days = weekDays(iso);
  return `KW ${isoWeek(iso).week} · ${dayMonthLabel(days[0])}–${dayMonthLabel(days[6])}`;
}

// „vor 3 Tagen“ für das Kochdatum eines Rezepts.
export function relativeDay(iso, today = isoDate()) {
  const days = daysBetween(iso.slice(0, 10), today);
  if (days <= 0) return days === 0 ? 'heute' : 'geplant';
  if (days === 1) return 'gestern';
  if (days < 14) return `vor ${days} Tagen`;
  if (days < 60) return `vor ${Math.round(days / 7)} Wochen`;
  if (days < 365) return `vor ${Math.round(days / 30)} Monaten`;
  return 'vor über einem Jahr';
}

/* „Schon auf der Liste“ (Version 2.47): Wer die Zutaten der Woche auf die Einkaufsliste setzt, merkt sich an jedem Gericht (`listedServings`, `listedAt`), für wie viele Portionen das geschah.
   Beim nächsten Mal bleiben solche Gerichte draußen, sonst verdoppelten sich die Mengen auf der Liste. Wurden die Portionen seitdem erhöht, kommen nur die zusätzlichen dazu.
   `again`: schon Übernommenes ausdrücklich noch einmal aufnehmen (mit allen Portionen). Ergebnis: `use` (Gerichte für die Zutatenliste, mit den Portionen, die gelten) und `listed`
   (die schon übernommenen Gerichte: `kind` 'same' = unverändert, 'more' = mehr Portionen seit der Übernahme (`extra`), 'less' = weniger). */
const EPSILON = 1e-9;
export function weekBasket(meals, again = false) {
  const use = [], listed = [];
  for (const meal of meals) {
    const done = Number(meal.listedServings) > 0 ? Number(meal.listedServings) : 0;
    if (!done) { use.push(meal); continue; }
    const extra = Math.round((meal.servings - done) * 1000) / 1000;
    const kind = extra > EPSILON ? 'more' : extra < -EPSILON ? 'less' : 'same';
    listed.push({ meal, kind, extra, done });
    if (again) use.push(meal); else if (kind === 'more') use.push({ ...meal, servings: extra });
  }
  return { use, listed };
}

/* Nachträgliche Änderungen (Version 2.50): Bei der Übernahme merkt sich das Gericht die Zutaten seines Rezepts (`listedRows`, „Name|Menge|Einheit“). Wurde das Rezept danach geändert,
   zeigt `recipeChanges`, was sich geändert hat (hinzugekommen, entfernt, andere Menge), damit man die Einkaufsliste prüfen kann. Die Liste selbst ändert die App nie von selbst. */
const snapshotKey = entry => `${productKey(entry.name)}|${productKey(entry.unit)}`;
export const snapshotRows = rows => rows.map(row => `${String(row.name).replace(/\|/g, '/').trim()}|${row.quantity}|${String(row.unit).replace(/\|/g, '/').trim()}`);
const parseRow = text => { const [name, quantity, unit] = String(text).split('|'); return { name, quantity: Number(quantity), unit: unit ?? '' }; };
export function recipeChanges(snapshot, rows) {
  const before = new Map((snapshot || []).map(parseRow).map(entry => [snapshotKey(entry), entry])), now = new Map(rows.map(row => [snapshotKey(row), row]));
  const added = [], removed = [], changed = [];
  for (const [key, row] of now) { const old = before.get(key); if (!old) added.push(row); else if (Math.abs(old.quantity - row.quantity) > 1e-9) changed.push({ name: row.name, from: old, to: row }); }
  for (const [key, old] of before) if (!now.has(key)) removed.push(old);
  return { added, removed, changed, any: Boolean(added.length || removed.length || changed.length) };
}

/* Zutaten aller Gerichte zusammenzählen. Gleicher Name und vergleichbare Einheit werden addiert
   (g und kg zusammen, ml und l zusammen); 1,2 kg statt 1200 g. Unterschiedliche Einheiten wie
   „2 EL Öl“ und „100 ml Öl“ bleiben getrennt, weil sich ein Esslöffel nicht ehrlich umrechnen lässt.
   Als gleicher Name gilt auch eine andere Schreibweise desselben Produkts („Zwiebel“ und „Zwiebeln“, siehe sameProduct in data.js); angezeigt wird die Schreibweise, die in den
   Rezepten am häufigsten vorkommt, bei Gleichstand die längere (meist die Mehrzahl). */
export function aggregateIngredients(meals, recipes, ingredients) {
  const recipeById = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const byRecipe = new Map();
  for (const row of ingredients) byRecipe.set(row.recipeId, [...(byRecipe.get(row.recipeId) || []), row]);
  const entries = [];
  for (const meal of meals) {
    const recipe = recipeById.get(meal.recipeId);
    if (!recipe) continue;
    const factor = meal.servings / recipe.servings;
    for (const row of byRecipe.get(recipe.id) || []) {
      const spec = unitSpec(row.unit), noAmount = row.unit === NO_AMOUNT, group = noAmount ? 'nach' : spec.group, name = row.name.trim();
      let entry = entries.find(found => found.group === group && sameProduct(found.name, name));
      if (!entry) { entry = { name, group, label: spec.label, unit: row.unit, base: 0, sources: new Set(), spellings: new Map() }; entries.push(entry); }
      if (!noAmount) entry.base += row.quantity * factor * spec.factor;
      entry.sources.add(recipe.name);
      const spelling = entry.spellings.get(productKey(name));
      entry.spellings.set(productKey(name), { name: spelling?.name ?? name, count: (spelling?.count || 0) + 1 });   // bei gleicher Schreibweise (Groß-/Kleinschreibung) zählt die zuerst genannte
    }
  }
  const round = value => Math.round(value * 1000) / 1000;
  return entries.map(entry => {
    let quantity = entry.base, unit = entry.label;
    if (entry.group === 'nach') { quantity = 1; unit = NO_AMOUNT; }
    else if (entry.group === 'weight') [quantity, unit] = entry.base >= 1000 ? [entry.base / 1000, 'kg'] : [entry.base, 'g'];
    else if (entry.group === 'volume') [quantity, unit] = entry.base >= 1000 ? [entry.base / 1000, 'l'] : [entry.base, 'ml'];
    else if (entry.group === 'count') unit = 'Stück';
    else unit = entry.unit.trim();
    const shown = [...entry.spellings.values()].reduce((best, spelling) => (spelling.count > best.count || (spelling.count === best.count && spelling.name.length > best.name.length) ? spelling : best));
    return { name: shown.name, quantity: round(quantity), unit, sources: [...entry.sources] };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de') || a.unit.localeCompare(b.unit, 'de'));
}
