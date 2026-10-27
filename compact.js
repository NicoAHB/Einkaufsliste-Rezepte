/* Aufräumen: hält die gemeinsame Datendatei klein. Reine Logik ohne DOM.
   Hintergrund: Die App löscht nie sofort, sondern markiert („Löschmarkierung“), damit „Rückgängig“ und der Abgleich zweier
   Geräte funktionieren. Ohne Aufräumen wächst die Datei um knapp 2 KB je Artikel, also bei 20 Artikeln pro Woche in einem
   halben Jahr über die Grenze von 900 KB (GitHub liefert größere Dateien nicht mehr direkt aus).

   Aufgeräumt wird nur, was sicher nicht mehr gebraucht wird, und zwar auf dem gemeinsamen Stand, nicht auf einem einzelnen
   Gerät: Das Ergebnis wird wie jede Änderung mit der SHA der gelesenen Datei geschrieben. Ändert ein anderes Gerät dazwischen,
   wird neu gelesen und neu aufgeräumt. Was weg ist, liegt weiter im Git-Verlauf des privaten Daten-Repositorys. */
import { clone, foldOldAdds, validate } from './data.js';
import { isCategory } from './categories.js';
import { productKey, unitSpec } from './prices.js';

export const LIMIT_BYTES = 900000;      // so groß darf die Datei werden (Grenze der GitHub-Contents-API ist 1 MB)
export const AUTO_BYTES = 250000;       // ab hier räumt die App von selbst auf
export const POLICY = {
  tombstoneDays: 14,     // gelöschte Einträge („Rückgängig“ gilt nur, solange die Seite offen ist; zwei Wochen decken auch Urlaub ohne Netz ab)
  doneDays: 21,          // erledigte, aber nie entfernte Artikel
  mealDays: 120,         // vergangene Gerichte im Wochenplan
  settledDays: 14,       // ab hier brauchen Datensätze keine Zeitstempel je Feld mehr
  keepApplied: 600,      // Liste bereits angewendeter Änderungen (nur gegen doppeltes Senden nötig)
  keepPrices: 2,         // gemerkte Preise je Geschäft, Produkt und Einheitengruppe
  maxNames: 300,         // Namensgedächtnis für Vorschläge
  maxAliases: 400,       // gemerkte Zuordnungen von Kassenbon-Zeilen zu Namen
  purchaseMonths: 36     // Ausgaben (Einkaufsbeträge) bleiben so viele Monate in der Datei; ältere liegen weiter im Git-Verlauf
};
const DAY = 86400000;

export const sizeOf = data => new TextEncoder().encode(JSON.stringify(data)).length;

// Aus entfernten Artikeln bleibt ein kleines Gedächtnis (Name, Kategorie, Häufigkeit): Vorschläge und gelernte Kategorien
// funktionieren weiter, ohne dass jeder alte Artikel in der Datei bleibt.
function remember(names, rows, max) {
  const known = new Map(names.map(entry => [productKey(entry.name), { ...entry }]));
  for (const row of rows) {
    if (typeof row.name !== 'string' || !row.name.trim()) continue;
    const key = productKey(row.name), at = row.updatedAt || row.createdAt;
    const entry = known.get(key) || { name: row.name.trim().replace(/\s+/g, ' '), count: 0, at };
    entry.count += Number(row.weight) || 1;
    if (at >= entry.at) { entry.at = at; if (isCategory(row.category)) entry.category = row.category; if (typeof row.unit === 'string' && row.unit) entry.unit = row.unit; }
    else if (!entry.category && isCategory(row.category)) entry.category = row.category;
    known.set(key, entry);
  }
  return [...known.values()].sort((a, b) => b.count - a.count || b.at.localeCompare(a.at)).slice(0, max);
}

/* Gibt { data, changed, removed } zurück. `data` ist eine Kopie; die Eingabe bleibt unverändert. Ohne etwas aufzuräumen
   ist `changed` false (dann wird auch nichts geschrieben). */
export function compact(input, now = new Date(), policy = POLICY) {
  const next = clone(input);
  next.prices ||= []; next.meals ||= []; next.pantry ||= []; next.aliases ||= []; next.templates ||= []; next.purchases ||= []; next.budgets ||= [];
  const before = sizeOf(input), removed = { items: 0, recipes: 0, ingredients: 0, stores: 0, prices: 0, meals: 0, pantry: 0, aliases: 0, templates: 0, purchases: 0, budgets: 0, clocks: 0, adds: 0, applied: 0 };
  const olderThan = (stamp, days) => Number.isFinite(Date.parse(stamp)) && Date.parse(stamp) < now.getTime() - days * DAY;
  const gone = [];   // entfernte Artikel für das Namensgedächtnis

  // 1. Gelöschtes endgültig entfernen, erledigte Artikel nach langer Zeit ebenfalls.
  for (const key of ['stores', 'items', 'recipes', 'ingredients', 'meals', 'pantry', 'aliases', 'templates', 'purchases', 'budgets']) {
    next[key] = next[key].filter(row => {
      const drop = (row.deletedAt && olderThan(row.deletedAt, policy.tombstoneDays)) ||
        (key === 'items' && row.checked && !row.deletedAt && olderThan(row.updatedAt, policy.doneDays));
      if (drop) { removed[key]++; if (key === 'items') gone.push(row); }
      return !drop;
    });
  }
  // 2. Was an Entfernten hing, geht mit: Artikel eines entfernten Geschäfts, Zutaten eines entfernten Rezepts.
  const stores = new Set(next.stores.map(row => row.id)), recipes = new Set(next.recipes.map(row => row.id));
  next.items = next.items.filter(row => { const drop = row.storeId && !stores.has(row.storeId); if (drop) { removed.items++; gone.push(row); } return !drop; });
  next.prices = next.prices.filter(row => { const drop = row.storeId && !stores.has(row.storeId); if (drop) removed.prices++; return !drop; });
  next.ingredients = next.ingredients.filter(row => { const drop = !recipes.has(row.recipeId); if (drop) removed.ingredients++; return !drop; });
  // 3. Vergangene Gerichte (das Kochdatum steht am Rezept).
  const mealCutoff = new Date(now.getTime() - policy.mealDays * DAY).toISOString().slice(0, 10);
  next.meals = next.meals.filter(row => { const drop = row.date < mealCutoff; if (drop) removed.meals++; return !drop; });
  // 3b. Ausgaben: nach 36 Monaten aus der Datei (Auswertung und Diagramm brauchen nur die letzten Monate).
  const purchaseCutoff = new Date(now.getFullYear(), now.getMonth() - (policy.purchaseMonths ?? POLICY.purchaseMonths), 1, 12).toISOString().slice(0, 10);
  next.purchases = next.purchases.filter(row => { const drop = row.date < purchaseCutoff; if (drop) removed.purchases++; return !drop; });
  // 4. Gemerkte Preise: je Geschäft, Produkt und Einheitengruppe nur die neuesten (Vergleich und Vorschläge nutzen nur die neuesten).
  const groups = new Map();
  for (const row of next.prices) {
    const id = `${row.storeId}|${productKey(row.name)}|${unitSpec(row.quote?.unit ?? '').group}`;
    groups.set(id, [...(groups.get(id) || []), row]);
  }
  const doomed = new Set();
  for (const rows of groups.values()) {
    rows.sort((a, b) => `${b.createdAt}|${b.id}`.localeCompare(`${a.createdAt}|${a.id}`));
    rows.slice(policy.keepPrices).forEach(row => doomed.add(row.id));
  }
  next.prices = next.prices.filter(row => { const drop = doomed.has(row.id); if (drop) removed.prices++; return !drop; });
  // 5. Zeitstempel je Feld sind nur für gleichzeitige Änderungen nötig. Bei lange unveränderten Datensätzen genügt eine Sammelmarke.
  for (const key of ['stores', 'items', 'recipes', 'ingredients', 'prices', 'meals', 'pantry', 'aliases', 'templates', 'purchases', 'budgets']) {
    for (const row of next[key]) {
      if (key === 'items') removed.adds += foldOldAdds(row, new Date(now.getTime() - policy.settledDays * DAY).toISOString());
      const fields = Object.keys(row._clock || {}).filter(field => field !== '*');
      if (fields.length && olderThan(row.updatedAt, policy.settledDays)) { row._clock = { '*': { at: row.updatedAt, id: '' } }; removed.clocks++; }
    }
  }
  // 6. Liste angewendeter Änderungen auf die neuesten kürzen.
  if (next.sync.applied.length > policy.keepApplied) {
    removed.applied = next.sync.applied.length - policy.keepApplied;
    next.sync.applied = next.sync.applied.slice(-policy.keepApplied);
  }
  // 7. Gemerkte Kassenbon-Zuordnungen: bei sehr vielen bleiben die zuletzt geänderten.
  if (next.aliases.length > policy.maxAliases) {
    const keep = new Set([...next.aliases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, policy.maxAliases).map(row => row.id));
    removed.aliases += next.aliases.length - keep.size;
    next.aliases = next.aliases.filter(row => keep.has(row.id));
  }
  if (gone.length) next.names = remember(next.names || [], gone, policy.maxNames);

  // Leere Hilfslisten nicht erst anlegen, sonst gilt die Datei nach jedem Lauf als geändert.
  for (const key of ['prices', 'meals', 'pantry', 'aliases', 'templates', 'purchases', 'budgets']) if (!next[key].length && !input[key]?.length) delete next[key];
  const changed = Object.values(removed).some(Boolean);
  if (changed) next.sync.compactedAt = now.toISOString();
  validate(next);
  return { data: changed ? next : input, changed, removed, before, after: changed ? sizeOf(next) : before };
}

export const due = (data, bytes = sizeOf(data)) => bytes > AUTO_BYTES;
