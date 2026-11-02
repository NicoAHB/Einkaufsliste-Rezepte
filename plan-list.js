/* Nachvollziehbare Wochenplan-Anteile. Korrekturen betreffen ausschließlich die
   ursprüngliche Übernahme, niemals spätere manuelle Zuwächse oder neue Käufe. */
import { unitSpec } from './prices.js';
import { ingredientProductName, spellingStem } from './product-groups.js';
import { NO_AMOUNT } from './recipe-import.js';
const round = n => Math.round(n * 1e9) / 1e9;
export function planSourceLive(item, part) {
  if (!item || item.deletedAt || item.checked || item.name !== part.name || item.storeId !== part.storeId) return false;
  const source = part.sourceId === item.id ? { at: item.createdAt, quantity: item._base?.quantity ?? item.quantity, unit: item._base?.unit ?? item.unit } : item._adds?.find(add => add.id === part.sourceId);
  if (!source || unitSpec(source.unit).group !== unitSpec(part.unit).group) return false;
  const floor = ['quantity','unit','*'].map(key => item._clock?.[key]).filter(Boolean);
  if (floor.some(clock => `${clock.at}|${clock.id}` > `${source.at}|${part.sourceId}`)) return false;
  return part.quantity * unitSpec(part.unit).factor <= source.quantity * unitSpec(source.unit).factor + 1e-7;
}
export function planReduction(meal, next, items) {
  const listed = Number(meal.listedServings) || 0;
  const target = !next || next.recipeId !== meal.recipeId ? 0 : Math.min(listed, next.servings);
  const ratio = listed > 0 ? target / listed : 1;
  const parts = [], changes = [], skipped = [];
  for (const saved of meal.listedParts || []) {
    // Dieselbe stabile Übernahme kann auf einem Gerät neu angelegt und auf
    // einem anderen zu einem vorhandenen Artikel gezählt worden sein.
    const item = items.find(row => row.id === saved.sourceId || row._adds?.some(add => add.id === saved.sourceId)) || items.find(row => row.id === saved.itemId);
    const part = item ? {...saved,itemId:item.id} : saved;
    const remaining = round(part.remaining * ratio), remove = round(part.remaining - remaining);
    if (remove > 1e-8 && planSourceLive(item, part)) {
      const cut = { ...part, quantity: round(part.quantity - remaining) };
      changes.push({ item, part, remove, cut }); parts.push({ ...part, remaining });
    } else { parts.push(part); if (remove > 1e-8) skipped.push(part); }
  }
  return { parts, changes, skipped, target, partial: Boolean(meal.listedUntracked), legacy: listed > 0 && !Array.isArray(meal.listedParts) };
}
// Mehrere Übernahmen derselben Einkaufszeile zählen als eine Zutat. Grundlage
// sind genau die zugeordneten Anteile, die auch die Mengenprüfung verwendet.
export function planRemovalCounts(reduction) {
  const remaining = new Set(reduction.changes.map(change => change.item.id));
  const total = new Set([...remaining, ...reduction.skipped.map(part => part.itemId)]);
  return { total: total.size, remaining: remaining.size, removed: total.size - remaining.size };
}
// Dieselben Einkaufszeilen wie im Zähler: Namen aus der ursprünglichen
// Übernahme bleiben auch nach Löschen oder Aufräumen noch nachvollziehbar.
export function planRemovalDetails(reduction, items) {
  const remaining = new Set(reduction.changes.map(change => change.item.id)), details = new Map();
  for (const part of reduction.skipped) {
    if (remaining.has(part.itemId) || details.has(part.itemId)) continue;
    const item = items.find(row => row.id === part.itemId);
    const status = !item || item.deletedAt || item._planEmpty ? 'removed' : item.checked ? 'purchased' : item.storeId !== part.storeId ? 'moved' : 'changed';
    details.set(part.itemId, { itemId: part.itemId, name: part.name, status });
  }
  return [...details.values()];
}

// Nur erläuternder Kontext: frühere eigene Einkaufsartikel sind keine Anteile
// des Gerichts. Die Zuordnung und die Löschmengen oben werden dadurch nie erweitert.
export function planExistingDetails(meal, items) {
  if (!Array.isArray(meal.listedParts) || meal.listedUntracked || !Array.isArray(meal.listedRows)) return [];
  const at=Date.parse(meal._clock?.listedAt?.at||meal.listedAt);if(!Number.isFinite(at))return [];
  const key=name=>spellingStem(ingredientProductName(name));
  const wanted=new Set(meal.listedRows.map(text=>text.split('|')).filter(([name,,unit])=>name&&unit!==NO_AMOUNT).map(([name])=>key(name)));
  const owned=new Set(meal.listedParts.map(part=>part.itemId));
  for(const part of meal.listedParts){const current=items.find(item=>item.id===part.sourceId||item._adds?.some(add=>add.id===part.sourceId));if(current)owned.add(current.id);}
  const stamp=(row,field)=>Date.parse(row._clock?.[field]?.at||row[field]);
  return items.filter(item=>{
    if(owned.has(item.id)||!wanted.has(key(item.name))||!(Date.parse(item.createdAt)<=at))return false;
    if(item.deletedAt&&stamp(item,'deletedAt')<=at)return false;
    if(item.checked&&!(stamp(item,'checked')>at||Date.parse(item.shopBoughtAt)>at))return false;
    if(item._planEmpty&&!(Date.parse(item.updatedAt)>at))return false;
    if(stamp(item,'name')>at&&!wanted.has(key(item.productOriginalName||'')))return false;
    return true;
  }).map(item=>({itemId:item.id,name:item.name,status:item.checked?'purchased':item.deletedAt||item._planEmpty?'removed':'present'}))
    .sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
export function applyPlanCuts(item) {
  const spec = unitSpec(item.unit);
  let total = item.quantity * spec.factor;
  for (const cut of item._planCuts || []) {
    // Die ursprüngliche Menge steht im separaten Feld; quantity ist der bisher
    // insgesamt entfernte Anteil. Mehrfaches Bestätigen zieht ihn nur einmal ab.
    const part = { ...cut, quantity: cut.originalQuantity };
    if (planSourceLive({ ...item, checked: false, name: cut.name, storeId: cut.storeId }, part) && unitSpec(cut.unit).group === spec.group) total -= cut.quantity * unitSpec(cut.unit).factor;
  }
  const quantity = round(Math.max(0, total) / spec.factor);
  item.quantity = quantity; item._planEmpty = quantity <= 1e-9;
}
