/* „Neu von …“: Was andere Personen auf die Liste gesetzt haben, steht farbig oben, bis man es übernimmt. Reine Logik ohne DOM.
   Gemerkt wird nur auf dem eigenen Gerät, welche Einträge man schon gesehen hat (`seen`: Menge von Kennungen). */
import { active, liveAdds } from './data.js';

// Kennungen, die als „gesehen“ gelten: alle Artikel und alle Mengenzuwächse, die jetzt in den Daten stehen.
export function currentIds(items) {
  const ids = new Set();
  for (const item of items) { ids.add(item.id); for (const add of item._adds || []) ids.add(add.id); }
  return ids;
}

/* Offene Artikel mit Neuem von anderen: [{ item, by: [Namen], entries: [{ id, by, kind: 'neu' | 'mehr', quantity?, unit? }] }].
   „neu“: der Artikel wurde von jemand anderem angelegt. „mehr“: jemand anderes hat die Menge eines vorhandenen Artikels erhöht. */
export function newFromOthers(items, me, seen) {
  const news = [];
  for (const item of active(items)) {
    if (item.checked) continue;
    const entries = [];
    if (item.createdBy && item.createdBy !== me && !seen.has(item.id)) entries.push({ id: item.id, by: item.createdBy, kind: 'neu' });
    for (const add of liveAdds(item)) {
      // Zusammengeführte Doppel („fold-add-<Kennung>“) gelten als gesehen, wenn der Artikel, aus dem sie stammen, schon gesehen war.
      const origin = add.id.startsWith('fold-add-') ? add.id.slice('fold-add-'.length) : null;
      if (add.by && add.by !== me && !seen.has(add.id) && !(origin && seen.has(origin))) entries.push({ id: add.id, by: add.by, kind: 'mehr', quantity: add.quantity, unit: add.unit });
    }
    if (entries.length) news.push({ item, entries, by: [...new Set(entries.map(entry => entry.by))] });
  }
  return news.sort((a, b) => a.item.name.localeCompare(b.item.name, 'de'));
}
