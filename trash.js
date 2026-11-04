/* Papierkorb „Kürzlich gelöscht“. Reine Logik ohne DOM.
   Die App löscht nie sofort, sondern setzt eine Löschmarke (deletedAt). Diese Marken bleiben POLICY.tombstoneDays (14) Tage
   in der gemeinsamen Datei, danach entfernt das Aufräumen sie (compact.js). In dieser Zeit lässt sich ein Eintrag mit einer
   gewöhnlichen Änderung { deletedAt: null } wiederherstellen; der Abgleich verteilt das auf alle Geräte.

   Nicht im Papierkorb erscheinen Löschungen, die kein Verlust sind:
   - abgehakte Artikel (gekauft, z. B. nach „Einkauf beenden“; bis 2.146 auch „Erledigte entfernen“),
   - Artikel, die beim Verschieben zu einem gleichen Artikel dazugezählt wurden (`mergedInto`) oder als gleichzeitiges Doppel
     zweier Geräte zusammengeführt wurden (Änderung „fold-del-…“): Ihre Menge steckt bereits im anderen Artikel,
   - interne, auf null zurückgenommene Wochenplan-Anteile.

   Seit 2.145 auch: eigene Produkte (Löschmarke in productRemovals), gemerkte Schreibweisen (aliases) und Ausgabenkategorien.
   Eigene Produkte sind umgekehrt gespeichert: Eine aktive Zeile in productRemovals bedeutet „gelöscht“. Wiederherstellen hebt sie
   deshalb mit deletedAt auf; „Papierkorb leeren“ setzt purgedAt, die Marke selbst bleibt (sonst böte ein altes Gerät das Produkt wieder an). */
import { POLICY } from './compact.js';
import { productKey } from './prices.js';

export const TRASH_DAYS = POLICY.tombstoneDays;
const DAY = 86400000;
export const TRASH_KINDS = Object.freeze([
  { kind: 'items', label: 'Artikel', icon: 'cart' },
  { kind: 'recipes', label: 'Rezepte', icon: 'book' },
  { kind: 'meals', label: 'Wochenplan', icon: 'calendar' },
  { kind: 'purchases', label: 'Ausgaben', icon: 'chart' },
  { kind: 'stores', label: 'Geschäfte & Listen', icon: 'store' },
  { kind: 'templates', label: 'Vorlagen', icon: 'bookmark' },
  { kind: 'ownProducts', label: 'Eigene Produkte', icon: 'box' },
  { kind: 'aliases', label: 'Schreibweisen', icon: 'text' },
  { kind: 'expenseCategories', label: 'Kategorien', icon: 'tag' },
  // Geheime Liste: liegt nur auf diesem Gerät (private-list.js); app.js ergänzt diese Einträge selbst.
  { kind: 'private', label: 'Geheime Liste', icon: 'lock' }
]);
const categoryKey = name => String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
// Wann ein eigenes Produkt gelöscht wurde: als die Löschmarke zuletzt gesetzt (deletedAt auf null) wurde.
const removedAt = row => row?._clock?.deletedAt?.at || row?.createdAt || row?.updatedAt || '';
const removalActive = (row, since) => Boolean(row) && !row.deletedAt && !row.purgedAt && Date.parse(removedAt(row)) >= since;

const number = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(value);
const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const dayLabel = day => { const date = new Date(`${day}T12:00:00`); return Number.isNaN(date.getTime()) ? day : new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date); };
const byId = rows => new Map((rows || []).map(row => [row.id, row]));
// Endgültig gelöschte Einträge („Papierkorb leeren“, Feld purgedAt) erscheinen nicht mehr und lassen sich nicht zurückholen.
// Die Marke gilt nur für die Löschung, die beim Leeren bestand: Wird ein Eintrag später zurückgeholt und erneut gelöscht, steht er wieder hier.
export const isPurged = row => Boolean(row?.deletedAt && row.purgedAt && row.purgedAt >= row.deletedAt);
const recent = (row, since) => Boolean(row?.deletedAt) && !isPurged(row) && Date.parse(row.deletedAt) >= since;

// Wurde der Artikel als Doppel zusammengeführt oder zu einem gleichen Artikel gezählt, ist nichts verloren.
const foldedAway = row => Boolean(row.mergedInto) || String(row._clock?.deletedAt?.id || '').startsWith('fold-del-');
/* Abgehakte Artikel verschwinden normalerweise mit „Einkauf beenden“ (bis 2.146 auch „Erledigte entfernen“): Sie sind gekauft und gehören nicht in den
   Papierkorb. Wer aber einen einzelnen abgehakten Artikel bewusst löscht (Wischen, Bearbeiten, Auswahl), bekommt ihn hier zurück (2.147).
   Solche Löschungen tragen eine eigene Änderungskennung („one-del-…“, siehe SINGLE_DELETE). */
export const SINGLE_DELETE = 'one-del-';
const deletedOnPurpose = row => String(row._clock?.deletedAt?.id || '').startsWith(SINGLE_DELETE);

/* Alle wiederherstellbaren Einträge, neueste zuerst: { kind, collection, id, title, detail, deletedAt }. */
export function trashEntries(data, now = Date.now()) {
  const since = now - TRASH_DAYS * DAY, entries = [];
  const stores = byId(data.stores), recipes = byId(data.recipes);
  const storeLabel = id => { const store = stores.get(id); return !id ? '' : !store ? '' : store.deletedAt ? `${store.name} (gelöscht)` : store.name; };
  for (const row of data.items || []) {
    if (!recent(row, since) || (row.checked && !deletedOnPurpose(row)) || row._planEmpty || foldedAway(row)) continue;
    const amount = Number.isFinite(row.quantity) && row.unit ? `${number(row.quantity)} ${row.unit}` : '';
    entries.push({ kind: 'items', collection: 'items', id: row.id, title: row.name, detail: [amount, storeLabel(row.storeId)].filter(Boolean).join(' · '), deletedAt: row.deletedAt });
  }
  const ingredientCount = new Map();
  for (const row of data.ingredients || []) if (!row.deletedAt) ingredientCount.set(row.recipeId, (ingredientCount.get(row.recipeId) || 0) + 1);
  for (const row of data.recipes || []) {
    if (!recent(row, since)) continue;
    const count = ingredientCount.get(row.id) || 0;
    entries.push({ kind: 'recipes', collection: 'recipes', id: row.id, title: row.name, detail: [`${count} ${count === 1 ? 'Zutat' : 'Zutaten'}`, row.servings ? `${number(row.servings)} Portionen` : ''].filter(Boolean).join(' · '), deletedAt: row.deletedAt });
  }
  for (const row of data.meals || []) {
    if (!recent(row, since)) continue;
    const recipe = recipes.get(row.recipeId);
    entries.push({ kind: 'meals', collection: 'meals', id: row.id, title: recipe?.name || row.name || 'Gericht', detail: [`geplant für ${dayLabel(row.date)}`, row.servings ? `${number(row.servings)} Portionen` : '', recipe?.deletedAt ? 'Rezept wird mit wiederhergestellt' : ''].filter(Boolean).join(' · '), deletedAt: row.deletedAt });
  }
  for (const row of data.purchases || []) {
    if (!recent(row, since) || !Number.isSafeInteger(row.cents)) continue;
    const store = row.storeId ? storeLabel(row.storeId) : row.storeName || '';
    entries.push({ kind: 'purchases', collection: 'purchases', id: row.id, title: `${row.kind === 'refund' ? '− ' : ''}${euros(row.cents)}${store ? ` · ${store}` : ''}`, detail: [row.date ? dayLabel(row.date) : '', row.buyerName || '', row.note || ''].filter(Boolean).join(' · '), deletedAt: row.deletedAt });
  }
  const itemCount = new Map();
  for (const row of data.items || []) if (!row.deletedAt && !row._planEmpty) itemCount.set(row.storeId, (itemCount.get(row.storeId) || 0) + 1);
  for (const row of data.stores || []) {
    if (!recent(row, since)) continue;
    const count = itemCount.get(row.id) || 0;
    entries.push({ kind: 'stores', collection: 'stores', id: row.id, title: row.name, detail: [row.separate ? 'Eigene Liste' : 'Geschäft', count ? `${count} ${count === 1 ? 'Eintrag kommt' : 'Einträge kommen'} mit zurück` : ''].filter(Boolean).join(' · '), deletedAt: row.deletedAt });
  }
  for (const row of data.templates || []) {
    if (!recent(row, since)) continue;
    const count = Array.isArray(row.items) ? row.items.length : 0;
    entries.push({ kind: 'templates', collection: 'templates', id: row.id, title: row.name || 'Vorlage', detail: `${count} ${count === 1 ? 'Artikel' : 'Artikel'}`, deletedAt: row.deletedAt });
  }
  for (const row of data.productRemovals || []) {
    if (!removalActive(row, since)) continue;
    entries.push({ kind: 'ownProducts', collection: 'productRemovals', id: row.id, title: row.name, detail: 'aus Produktauswahl und Favoriten', deletedAt: removedAt(row) });
  }
  for (const row of data.aliases || []) {
    if (!recent(row, since)) continue;
    entries.push({ kind: 'aliases', collection: 'aliases', id: row.id, title: `${row.from} → ${row.name}`, detail: 'gemerkte Schreibweise', deletedAt: row.deletedAt });
  }
  // Eine Kategorie kann (nach gleichzeitigem Anlegen auf zwei Geräten) mehrfach gespeichert sein; der Papierkorb zeigt sie einmal.
  const categories = new Map(), live = new Map((data.expenseCategories || []).filter(row => !row.deletedAt).map(row => [row.id, row]));
  for (const row of data.expenseCategories || []) {
    if (!recent(row, since) || live.size && [...live.values()].some(other => categoryKey(other.name) === categoryKey(row.name))) continue;
    const key = categoryKey(row.name), previous = categories.get(key);
    if (!previous || row.deletedAt > previous.deletedAt) categories.set(key, row);
  }
  for (const row of categories.values()) {
    const target = live.get(row.replacementId);
    entries.push({ kind: 'expenseCategories', collection: 'expenseCategories', id: row.id, title: row.name, detail: target ? `Ausgabenkategorie · Buchungen jetzt bei „${target.name}“` : 'Ausgabenkategorie', deletedAt: row.deletedAt });
  }
  return entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || a.title.localeCompare(b.title, 'de'));
}

// Anzahl je Art (für Filter und die Hinweise unter den Listen).
export const trashCounts = entries => entries.reduce((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] || 0) + 1 }), {});

/* Änderungen zum Wiederherstellen eines Eintrags: [{ collection, id, patch }].
   Ein Artikel, dessen Geschäft inzwischen gelöscht ist, kommt ohne Geschäft zurück (sonst bliebe er unsichtbar).
   Ein Gericht bringt sein gelöschtes Rezept mit. */
export function restoreChanges(data, collection, id, at = new Date().toISOString()) {
  const row = (data[collection] || []).find(entry => entry.id === id);
  if (collection === 'productRemovals') {
    // Eigenes Produkt: Löschmarke aufheben und die dabei mitgelöschten Favoriten (gleicher Name, im selben Moment) zurückholen.
    if (!row || row.deletedAt || row.purgedAt) return [];
    const when = Date.parse(removedAt(row)), key = productKey(row.name);
    const favorites = (data.productFavorites || []).filter(fav => fav.deletedAt && productKey(fav.name) === key && Math.abs(Date.parse(fav.deletedAt) - when) <= 10000);
    return [{ collection, id, patch: { deletedAt: at } }, ...favorites.map(fav => ({ collection: 'productFavorites', id: fav.id, patch: { deletedAt: null } }))];
  }
  if (!row || !row.deletedAt || isPurged(row)) return [];
  const changes = [{ collection, id, patch: { deletedAt: null } }];
  // Eine zurückgeholte Kategorie leitet nicht mehr weiter; ihre früheren Buchungen bleiben bei der Ersatzkategorie.
  if (collection === 'expenseCategories') changes[0].patch.replacementId = null;
  if (collection === 'items' && row.storeId) {
    const store = (data.stores || []).find(entry => entry.id === row.storeId);
    if (!store || store.deletedAt) changes[0].patch.storeId = '';
  }
  if (collection === 'meals') {
    const recipe = (data.recipes || []).find(entry => entry.id === row.recipeId);
    if (recipe?.deletedAt) changes.push({ collection: 'recipes', id: recipe.id, patch: { deletedAt: null } });
  }
  return changes;
}

/* „Rückgängig“ nach dem Wiederherstellen: die Gegenänderungen. Eigene Produkte werden wieder als gelöscht markiert (deletedAt: null). */
export function undoRestoreChanges(changes, at = new Date().toISOString()) {
  return changes.map(({ collection, id }) => ({ collection, id, patch: { deletedAt: collection === 'productRemovals' ? null : at } }));
}

/* „Papierkorb leeren“: alle Einträge, die gerade im Papierkorb stehen, als endgültig gelöscht markieren. Die Marke verteilt sich
   wie jede Änderung auf alle Geräte; das anschließende Aufräumen (compact.js) entfernt die Daten aus der Datei. Nur bei Ausgaben
   bleibt die kleine Löschmarke dauerhaft, damit ein lange offline gewesenes Gerät sie nicht als neue Ausgabe wieder einträgt. */
export function purgeChanges(data, at = new Date().toISOString(), now = Date.parse(at)) {
  return trashEntries(data, now).map(entry => ({ collection: entry.collection, id: entry.id, patch: { purgedAt: at } }));
}

// Überschriften für die Gruppierung nach Tag: „Heute“, „Gestern“, sonst Wochentag und Datum.
export function trashDayLabel(at, now = Date.now()) {
  const day = value => { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; };
  if (day(at) === day(now)) return 'Heute';
  if (day(at) === day(now - DAY)) return 'Gestern';
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(at));
}
