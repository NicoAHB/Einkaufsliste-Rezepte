// Gemeinsame Ausgabenkategorien. Alte Notiztexte bleiben ohne Schreibmigration
// lesbar; Löschungen behalten ihre Weiterleitung für spät abgeglichene Buchungen.
export const EXPENSE_CATEGORY_DEFAULTS = ['Wocheneinkauf','Großeinkauf','Zwischendurch','Getränke','Drogerie','Obst & Gemüse','Grillen','Besuch','Wochenmarkt','Frühstück','Haushalt','Geschenk','Sonstiges'];
const keyOf = name => String(name || '').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
export function expenseCategoryName(value) {
  const name = String(value || '').trim().replace(/\s+/g,' ');
  if (!name || name.length > 120) throw new Error('Bitte einen Kategorienamen mit 1 bis 120 Zeichen eingeben.');
  return name;
}
export function expenseCategoryId(name, generation = 0) {
  let bytes = ''; for (const byte of new TextEncoder().encode(keyOf(name))) bytes += String.fromCharCode(byte);
  const base = `expense-category:${btoa(bytes).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}`;
  return generation ? `${base}:g${generation}` : base;
}
const generationOf = row => Number(row.id.match(/:g(\d+)$/)?.[1] || 0);
function catalogState(data) {
  const all = new Map(), defaults = new Map(EXPENSE_CATEGORY_DEFAULTS.map((name,index)=>[keyOf(name),index]));
  const add = name => { if (!keyOf(name)) return; const id = expenseCategoryId(name); if (!all.has(id)) all.set(id,{id,name:String(name).trim().replace(/\s+/g,' '),deletedAt:null}); };
  EXPENSE_CATEGORY_DEFAULTS.forEach(add);
  for (const purchase of data.purchases || []) add(purchase.note);
  for (const row of data.expenseCategories || []) all.set(row.id,row);
  const byName = new Map();
  for (const row of all.values()) if (!row.deletedAt) {
    const key = keyOf(row.name), previous = byName.get(key);
    if (!previous || generationOf(row)>generationOf(previous)) byName.set(key,row);
  }
  const entries = [...byName.values()].sort((a,b)=>(a.sortOrder??Infinity)-(b.sortOrder??Infinity) || (defaults.get(keyOf(a.name))??Infinity)-(defaults.get(keyOf(b.name))??Infinity) || a.name.localeCompare(b.name,'de') || a.id.localeCompare(b.id));
  return {all,entries,byName};
}
function resolve(catalog,id) {
  const seen = new Set();
  while (id) {
    if (seen.has(id)) return catalog.entries.find(row=>keyOf(row.name)==='sonstiges'&&!seen.has(row.id)) || catalog.entries.find(row=>!seen.has(row.id)) || null;
    seen.add(id); const row = catalog.all.get(id); if (!row) return null;
    if (!row.deletedAt) return catalog.byName.get(keyOf(row.name)) || row;
    id = row.replacementId;
  }
  return null;
}
function forPurchase(catalog,row) {
  if (row.categoryId === null || row.categoryId === '') return null;
  const id = row.categoryId || (keyOf(row.note)?expenseCategoryId(row.note):'');
  if (id && catalog.all.has(id)) return resolve(catalog,id);
  return keyOf(row.note)?resolve(catalog,expenseCategoryId(row.note)):null;
}
export const expenseCategories = data => catalogState(data).entries;
export const resolveExpenseCategory = (data,id) => resolve(catalogState(data),id);
export const purchaseCategory = (data,row) => forPurchase(catalogState(data),row);
export function categorizedPurchases(data) {
  const catalog = catalogState(data);
  return (data.purchases || []).map(row=>{const category=forPurchase(catalog,row);return {...row,categoryId:category?.id||null,note:category?.name||''};});
}
export function defaultExpenseCategory(data) {
  const catalog = catalogState(data);
  return catalog.byName.get('wocheneinkauf') || resolve(catalog,expenseCategoryId('Wocheneinkauf')) || catalog.byName.get('sonstiges') || catalog.entries[0] || null;
}
export function expenseCategoryUsage(data,id) {
  const catalog = catalogState(data), target = resolve(catalog,id);
  if (!target) return [];
  return (data.purchases || []).filter(row=>forPurchase(catalog,row)?.id===target.id);
}
export function addExpenseCategoryChanges(data,value) {
  const name=expenseCategoryName(value),catalog=catalogState(data),key=keyOf(name);
  if (catalog.byName.has(key)) throw new Error('Diese Kategorie gibt es bereits. Bitte einen anderen Namen eingeben.');
  const previous=[...catalog.all.values()].filter(row=>keyOf(row.name)===key);
  const generation=previous.length?Math.max(...previous.map(generationOf))+1:0;
  if(!Number.isSafeInteger(generation))throw new Error('Die gespeicherte Kategorie kann nicht erneut angelegt werden. Bitte einen anderen Namen wählen.');
  const id=expenseCategoryId(name,generation);
  return {id,changes:[...catalog.entries.map((row,sortOrder)=>({collection:'expenseCategories',id:row.id,patch:{name:row.name,sortOrder}})),{collection:'expenseCategories',id,patch:{name,sortOrder:catalog.entries.length}}]};
}
export function orderExpenseCategoryChanges(data,ids) {
  const entries=expenseCategories(data),known=new Map(entries.map(row=>[row.id,row]));
  if (ids.length!==entries.length || new Set(ids).size!==ids.length || ids.some(id=>!known.has(id))) throw new Error('Die Kategorien haben sich geändert. Bitte die Reihenfolge erneut prüfen.');
  return ids.map((id,sortOrder)=>({collection:'expenseCategories',id,patch:{name:known.get(id).name,sortOrder}}));
}
export function deleteExpenseCategoryChanges(data,id,replacementId,at=new Date().toISOString()) {
  const catalog=catalogState(data),source=catalog.entries.find(row=>row.id===id);
  if (!source) throw new Error('Diese Kategorie wurde inzwischen entfernt.');
  const usage=expenseCategoryUsage(data,id),target=catalog.entries.find(row=>row.id===replacementId&&row.id!==id);
  if (usage.length&&!target) throw new Error('Bitte eine andere bestehende Kategorie für die Buchungen auswählen.');
  if (replacementId&&!target) throw new Error('Die Ersatzkategorie ist nicht mehr verfügbar. Bitte erneut auswählen.');
  const changes=usage.map(row=>({collection:'purchases',id:row.id,patch:{categoryId:target.id,note:target.name}}));
  for (const row of catalog.all.values()) if (!row.deletedAt&&keyOf(row.name)===keyOf(source.name)) changes.push({collection:'expenseCategories',id:row.id,patch:{name:row.name,sortOrder:row.sortOrder??catalog.entries.indexOf(source),deletedAt:at,replacementId:target?.id||null}});
  return changes;
}
