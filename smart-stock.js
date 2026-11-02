// Automatische Vorräte besitzen eine eigene Herkunft und Ablaufzeit. Manuell
// gepflegter Vorrat und Kaufhistorie werden niemals durch Ablauf gelöscht.
import {addToList,pantryKey,pantryRows} from './data.js';
import {itemCategory,suggestCategory} from './categories.js';
import {isRecentPurchase,PURCHASE_DAYS} from './recent-purchases.js';
import {GROCERY_PRODUCTS,isPantryBasic,OPTIONAL_PANTRY_BASIC_IDS} from './product-catalog.js';
import {isSeparate} from './shop.js';
const DAY=86400000;
const FOOD=new Set(['obst','brot','fleisch','kuehl','tiefkuehl','vorrat','gewuerze','snacks','getraenke']);
const basicKeys=new Set(GROCERY_PRODUCTS.filter(isPantryBasic).map(product=>pantryKey(product.name)));
export const isAutomaticBasic = name => basicKeys.has(pantryKey(name));
const optionalKeys=new Set(GROCERY_PRODUCTS.filter(product=>OPTIONAL_PANTRY_BASIC_IDS.includes(product.id)).map(product=>pantryKey(product.name)));
export const isOptionalBasic=name=>optionalKeys.has(pantryKey(name));
export function smartStockSettings(data){const row=(data.stockSettings||[]).find(row=>row.id==='smart-stock'&&!row.deletedAt);return {enabled:row?.enabled===true,days:row?.days??7};}
export function smartStockSettingChange(patch){
  if(!patch||!Object.keys(patch).length||Object.keys(patch).some(key=>!['enabled','days'].includes(key))||(patch.enabled!==undefined&&typeof patch.enabled!=='boolean')||(patch.days!==undefined&&(!Number.isInteger(patch.days)||patch.days<1||patch.days>7)))throw new Error('Bitte eine gültige Einstellung für den automatischen Vorrat wählen.');
  return {collection:'stockSettings',id:'smart-stock',patch};
}
export function autoStockEligible(item,history=[]){return FOOD.has(itemCategory(item,history))&&suggestCategory(item.name)!=='haushalt';}
export function automaticStockChanges(data,item,boughtAt){
  const settings=smartStockSettings(data),time=Date.parse(boughtAt);
  if(!settings.enabled||!Number.isFinite(time)||!autoStockEligible(item,[...(data.names||[]),...(data.items||[])]))return [];
  const key=pantryKey(item.name),rows=data.pantry||[],manual=pantryRows(rows.filter(row=>!row.autoStock),time).find(row=>pantryKey(row.name)===key);
  if(manual&&manual.available!==false)return [];
  const id=`pantry-auto-${encodeURIComponent(key)}`;
  const basic=isAutomaticBasic(item.name);
  return [{collection:'pantry',id,patch:{name:item.name,category:itemCategory(item,[...(data.names||[]),...(data.items||[])]),available:true,deletedAt:null,autoStock:{purchaseId:item.id,boughtAt,storeId:item.storeId||'',expiresAt:basic?null:new Date(time+settings.days*DAY).toISOString(),...(basic?{basic:true}:{})}}}];
}
export function undoAutomaticStockChanges(data,item){return (data.pantry||[]).filter(row=>!row.deletedAt&&row.autoStock?.purchaseId===item.id&&row.autoStock.boughtAt===item.shopBoughtAt).map(row=>({collection:'pantry',id:row.id,patch:{available:false}}));}
export function consumeStockChanges(data,name,at=new Date().toISOString()){
  const key=pantryKey(name),changes=[];
  if(!Number.isFinite(Date.parse(at)))throw new Error('Der Zeitpunkt zum Aufbrauchen ist ungültig.');
  for(const row of data.pantry||[])if(!row.deletedAt&&pantryKey(row.name)===key&&row.available!==false)changes.push({collection:'pantry',id:row.id,patch:{available:false}});
  for(const row of data.items||data.recentItems||[])if(pantryKey(row.name)===key&&isRecentPurchase(row,Date.parse(at)))changes.push({collection:'items',id:row.id,patch:{stockConsumedAt:at}});
  return changes;
}
export function optionalRestockOperations(data,product,actor,at=new Date().toISOString()){
  if(!isOptionalBasic(product.name))return [];
  const key=pantryKey(product.name),normal=row=>!isSeparate((data.stores||[]).find(store=>store.id===row.storeId));
  if((data.items||[]).some(row=>!row.deletedAt&&!row._planEmpty&&!row.checked&&normal(row)&&pantryKey(row.name)===key))return [];
  const stock=pantryRows(data.pantry||[]).find(row=>pantryKey(row.name)===key);
  const latest=(data.items||[]).filter(row=>pantryKey(row.name)===key&&normal(row)&&row.shopBoughtAt).sort((a,b)=>String(b.shopBoughtAt).localeCompare(String(a.shopBoughtAt)))[0];
  const store=(data.stores||[]).find(row=>!row.deletedAt&&!isSeparate(row)&&row.id===(latest?.storeId||stock?.autoStock?.storeId));
  const clock=stock?._clock?.available||stock?._clock?.['*'];
  const cycle=stock?.autoStock?`${stock.autoStock.purchaseId}|${stock.autoStock.boughtAt}`:stock?`${stock.id}|${clock?.at||stock.createdAt}|${clock?.id||''}`:`${latest?.id||key}|${latest?.shopBoughtAt||''}`;
  const catalog=GROCERY_PRODUCTS.find(row=>pantryKey(row.name)===key);
  const row={...catalog,...product,quantity:product.quantity||catalog?.quantity||1,unit:product.unit||catalog?.unit||'Stück',key:encodeURIComponent(key)};
  return addToList([row],store?.id||'',actor,at,data.items||[],data.names||data.items||[],`stock-${encodeURIComponent(cycle)}`).ops;
}
export function nextStockBoundary(data,now=Date.now()){
  const times=[];
  for(const row of data.pantry||[])if(!row.deletedAt&&row.available!==false&&row.autoStock){const time=Date.parse(row.autoStock.expiresAt);if(time>now)times.push(time);}
  let recent=false;
  for(const row of data.items||[]){const time=Date.parse(row.shopBoughtAt);if(Number.isFinite(time)&&time+PURCHASE_DAYS*DAY>now){times.push(time>now?time:time+PURCHASE_DAYS*DAY);recent=true;}}
  if(recent){const midnight=new Date(now);midnight.setHours(24,0,0,0);times.push(midnight.getTime());}
  return times.length?Math.min(...times):null;
}
