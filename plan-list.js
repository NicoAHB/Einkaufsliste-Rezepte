/* Nachvollziehbare Wochenplan-Anteile. Korrekturen betreffen ausschließlich die
   ursprüngliche Übernahme, niemals spätere manuelle Zuwächse oder neue Käufe. */
import { unitSpec } from './prices.js';
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
  return { parts, changes, skipped, target, partial: Boolean(meal.listedUntracked), legacy: listed > 0 && !meal.listedParts?.length };
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
