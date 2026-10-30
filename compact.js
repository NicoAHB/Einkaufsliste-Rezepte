import {hasUnitChoice,unitChoice,compareUnitChoice} from './buying.js';
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
  keepApplied: 600,      // Liste bereits angewendeter Änderungen (nur gegen doppeltes Senden nötig): so viele bleiben mindestens
  appliedDays: 45,       // … und alle, die jünger als das sind (Marken, siehe `trimApplied`); ein Gerät, dessen Antwort verloren ging, sendet sonst alte Änderungen erneut
  maxApplied: 2500,      // Obergrenze (etwa 100 KB), danach fallen die ältesten weg
  keepPrices: 4,         // bezahlte Preise je Geschäft, Produkt, Sorte und Einheitengruppe (der neueste steht im Laden, die übrigen sind „frühere Käufe“)
  maxNames: 300,         // Namensgedächtnis für Vorschläge
  maxAliases: 400        // gemerkte Zuordnungen von Kassenbon-Zeilen zu Namen
};
const DAY = 86400000;

export const sizeOf = data => new TextEncoder().encode(JSON.stringify(data)).length;

/* Liste der angewendeten Änderungen kürzen. Ein Gerät, dessen Schreiben gelang, dessen Antwort aber verloren ging, sendet dieselben Änderungen erneut;
   sind sie vergessen, würden sie ein zweites Mal wirken (aus 3 wird 4, ein entfernter Artikel kommt wieder). Deshalb bleibt nicht einfach die Zahl
   der letzten 600, sondern alles, was jünger als `appliedDays` ist. Dafür merkt sich jedes Aufräumen mit `sync.marks` eine Marke { at, n }:
   „die ersten n Einträge der Liste waren vor `at` angewendet“. Die Liste wächst nur am Ende (die App hängt an), die Marken bleiben deshalb gültig.
   Unlesbare oder widersprüchliche Marken werden ignoriert; dann bleibt es bei der Untergrenze `keepApplied`. */
export function cleanMarks(marks, length) {
  if (!Array.isArray(marks)) return [];
  const clean = []; let last = 0;
  for (const mark of marks) {
    if (!mark || typeof mark.at !== 'string' || !Number.isFinite(Date.parse(mark.at)) || !Number.isInteger(mark.n) || mark.n <= last || mark.n > length) continue;
    if (clean.length && Date.parse(mark.at) < Date.parse(clean.at(-1).at)) continue;
    clean.push({ at: mark.at, n: mark.n }); last = mark.n;
  }
  return clean;
}
export function trimApplied(sync, now, policy) {
  const length = sync.applied.length;
  let marks = cleanMarks(sync.marks, length), drop = 0;
  const cutoff = now.getTime() - (policy.appliedDays ?? POLICY.appliedDays) * DAY;
  for (const mark of marks) if (Date.parse(mark.at) < cutoff) drop = mark.n;
  drop = Math.min(drop, Math.max(0, length - policy.keepApplied));
  drop = Math.max(drop, length - (policy.maxApplied ?? POLICY.maxApplied), 0);
  const applied = drop ? sync.applied.slice(drop) : sync.applied;
  marks = marks.map(mark => ({ at: mark.at, n: mark.n - drop })).filter(mark => mark.n > 0);
  // Höchstens eine neue Marke je Tag
  if (applied.length && (!marks.length || (applied.length > marks.at(-1).n && now.getTime() - Date.parse(marks.at(-1).at) >= DAY))) marks.push({ at: now.toISOString(), n: applied.length });
  return { applied, marks, dropped: drop };
}

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
    const prefAt=row.purchaseAt || row._clock?.purchaseUnit?.at || row.createdAt || at;
    if(hasUnitChoice(row) ? compareUnitChoice(row,entry)>=0 : !hasUnitChoice(entry)&&row.purchaseUnit!==undefined&&prefAt>=(entry.purchaseAt||'')) { entry.purchaseUnit=row.purchaseUnit;entry.purchaseAt=prefAt; if(hasUnitChoice(row))Object.assign(entry,unitChoice(row)); }
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
  // Vorrat hat seit 2.65 feste Kennungen. Seine Löschmarken bleiben wie Favoriten erhalten,
  // damit ein lange offline gebliebenes Gerät entfernte Einträge nicht wiederbelebt.
  // Auch Ausgaben und ihre Löschmarken bleiben erhalten: Historie bewahren und späte
  // Offline-Anlagen nicht nachträglich wieder als neue Ausgabe zählen.
  for (const key of ['stores', 'items', 'recipes', 'ingredients', 'meals', 'aliases', 'templates', 'budgets']) {
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
  // Ausgaben werden nicht altersbedingt entfernt (seit 2.67). Zeitstempel je Feld
  // können weiterhin verdichtet werden; Personen und die Buchung selbst bleiben erhalten.
  // 4. Gemerkte Preise: je Geschäft, Produkt, Sorte und Einheitengruppe nur die neuesten. Bestätigte (`src: 'bon'`) und ungeprüfte Notizen zählen getrennt: Eine neue ungeprüfte Notiz verdrängt keinen bezahlten Preis.
  const groups = new Map();
  for (const row of next.prices) {
    const id = `${row.src || ''}|${row.storeId}|${productKey(row.name)}|${productKey(row.variant || '')}|${unitSpec(row.quote?.unit ?? '').group}`;
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
  // 6. Liste angewendeter Änderungen kürzen: Alles unter `appliedDays` Tagen bleibt (mindestens `keepApplied`, höchstens `maxApplied`).
  const trimmed = trimApplied(next.sync, now, policy);
  removed.applied = trimmed.dropped;
  next.sync.applied = trimmed.applied;
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
  if (changed) {
    next.sync.compactedAt = now.toISOString();
    if (next.items.some(row=>row.purchaseUnit!==undefined) || next.names?.some(row=>row.purchaseUnit!==undefined)) next.sync.minRev=Math.max(Number(next.sync.minRev)||1,7);
    if(next.items.some(row=>row.purchaseMeasure!==undefined)||next.names?.some(row=>row.purchaseMeasure!==undefined))next.sync.minRev=Math.max(Number(next.sync.minRev)||1,8);
    if (next.purchases?.length || next.members?.length) next.sync.minRev = Math.max(Number(next.sync.minRev) || 1, 6);
    if (trimmed.marks.length) { next.sync.marks = trimmed.marks; next.sync.minRev = Math.max(Number(next.sync.minRev) || 1, 2); }
    else delete next.sync.marks;
  }
  validate(next);
  return { data: changed ? next : input, changed, removed, before, after: changed ? sizeOf(next) : before };
}

export const due = (data, bytes = sizeOf(data)) => bytes > AUTO_BYTES;
