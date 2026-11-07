/* Leichter Haushaltsvorrat: vorhanden/aufgebraucht, keine automatische Mengenbuchhaltung.
   Die App speichert jeden Eintrag und jedes Feld mit ihrer vorhandenen Offline-/Merge-Logik. */
import { stockKey, pantryRows } from './data.js';
// Seit 2.145 führt der Vorrat Sorten getrennt (stockKey statt pantryKey): „Basmati-Reis“ legt einen eigenen Eintrag an,
// statt einen vorhandenen „Reis“ zu überschreiben. Rezepte prüfen weiter nach Gruppe (pantryKey in data.js).
import { isCategory, suggestCategory } from './categories.js';
import { catalogProductFor, pantryProductAllowed } from './product-catalog.js';
import { ingredientMatchName, varietyName } from './product-groups.js';
import { coveringStock } from './cookable.js';

// Gleiche erstmalige Anlage auf zwei Geräten ergibt dieselbe ID. Bestehende/alte IDs bleiben erhalten.
// Umbenannte Datensätze dürfen die Kennung für den alten Namen nicht versehentlich belegen.
function newPantryId(name, rows) {
  let id = `pantry-${encodeURIComponent(stockKey(name))}`;
  while (rows.some(row => row.id === id && stockKey(row.name) !== stockKey(name))) id += '-new';
  return id;
}
export function pantryChanges(products, rows = []) {
  const changes = [], seen = new Set();
  for (const product of products) {
    const name = String(typeof product === 'string' ? product : product?.name || '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 120) throw new Error('Bitte einen Produktnamen mit 1 bis 120 Zeichen eingeben.');
    if (!rows.some(row=>stockKey(row.name)===stockKey(name)) && !pantryProductAllowed({ name })) throw new Error('Der Vorrat ist für Lebensmittel und Drogerieprodukte gedacht. Technik und Einrichtungsartikel gehören auf die Einkaufsliste oder den Wunschzettel.');
    const key = stockKey(name); if (seen.has(key)) continue; seen.add(key);
    const matches = rows.filter(row => stockKey(row.name) === key), live = matches.filter(row => !row.deletedAt);
    if (live.length) {
      for (const row of live) if (row.available === false || row.autoStock) changes.push({ id: row.id, patch: { available: true, ...(row.autoStock?{autoStock:null}:{}) } });
      continue;
    }
    const existing = [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0];
    if (existing) { changes.push({ id: existing.id, patch: { available: true, deletedAt: null, ...(existing.autoStock?{autoStock:null}:{}) } }); continue; }
    const category = isCategory(product?.category) ? product.category : suggestCategory(name) || 'sonstiges';
    const imageKey = typeof product?.imageKey === 'string' ? product.imageKey : null;
    changes.push({ id: newPantryId(name, rows), patch: { name, category, imageKey, available: true, deletedAt: null } });
  }
  return changes;
}

/* „✓ Hab ich“ (2.164): Aus einer Rezeptzutat wird das Produkt für den Vorrat, ohne Menge und Einheit („50 g Walnüsse, gehackt“ → „Walnüsse“,
   „2 Knoblauchzehen“ → „Knoblauch“, „1 Dose Tomaten“ → „Tomaten (Konserve)“). Steht es im Katalog, gelten dessen Name und Gang, wie bei einer
   Auswahl in der Vorratsauswahl; das Bild ergibt sich dort wie gewohnt aus dem Namen. Anlegen und Wiederbeleben übernimmt pantryChanges. */
export function ingredientPantryProduct(row) {
  const name = String(varietyName(ingredientMatchName(row)) || row?.name || '').trim().replace(/\s+/g, ' '), known = catalogProductFor(name);
  return known ? { name: known.name, category: known.category } : { name };
}
/* „Aufgebraucht“ an einer Rezeptzutat (2.175, seit 2.187 als reine Logik): Welche Vorratseinträge machen die Zutat gerade zu „da“
   (`stocked`, z. B. „Basmati-Reis“ für „Reis“ oder „Öl“ und „Olivenöl“ für „Öl“), und was kann auf die Einkaufsliste?
   - Genau ein Eintrag: genau diese Sorte (`rebuy`, Basmati-Reis statt „Reis“, Spaghetti statt „Nudeln“).
   - Mehrere Einträge (2.188): `choices`, je Eintrag ein Produkt; die Person wählt eines, mehrere oder alle.
   - Keiner: das allgemeine Produkt der Zutat (`generic`, wie bei „✓ Hab ich“).
   `rows`: alle Vorratszeilen. Der Gang kommt aus dem Katalog, sonst vom Vorratseintrag. */
const rebuyOf = entry => {
  const known = catalogProductFor(entry.name), category = known?.category || (isCategory(entry.category) ? entry.category : '');
  return { name: entry.name, ...(category ? { category } : {}) };
};
export function usedUpPlan(row, rows = [], now = Date.now()) {
  const generic = ingredientPantryProduct(row);
  const stocked = pantryRows(rows, now).filter(entry => entry.available !== false && coveringStock(row, [ingredientMatchName(entry)]).length);
  return { generic, stocked, rebuy: stocked.length === 1 ? rebuyOf(stocked[0]) : generic, choices: stocked.length > 1 ? stocked.map(rebuyOf) : [] };
}
// Namen für Rückfragen und Meldungen: „Olivenöl“, „Öl und Olivenöl“, „A, B und C“ (bzw. „A oder B“)
export const joinNames = (names, word = 'und') => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${word} ${names.at(-1)}`;
// Bildauswahl: nur ausdrückliche Zu-/Abwahlen übernehmen. Bestehende IDs,
// Namen, Kategorien, Bilder und unbekannte Erweiterungen bleiben erhalten.
export function pantrySelectionChanges(products,rows=[]) {
  const changes=[],seen=new Set();
  for(const product of products){
    const key=stockKey(product.name);if(seen.has(key))continue;seen.add(key);
    if(product.pantryAvailable===false){
      const existing=pantryRows(rows).find(row=>stockKey(row.name)===key);
      if(existing)for(const id of existing.ids){const row=rows.find(value=>value.id===id);if(row.available!==false)changes.push({id,patch:{available:false}});}
    }else changes.push(...pantryChanges([product],rows));
  }
  return changes;
}
