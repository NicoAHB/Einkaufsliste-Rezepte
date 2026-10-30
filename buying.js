/* Einkaufseinheiten: Rezepte behalten ihren exakten Bedarf. Erst die Anzeige
   rundet die Summe in ganze Packungen auf. Kein Runden einzelner Rezeptzeilen. */
import { productKey, unitSpec } from './prices.js';
import { PRODUCT_ROWS } from './product-catalog-data.js';
const number = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3, useGrouping: true }).format(value);
// Gleiche Grundformen wie bei der Artikelerkennung: z. B. Banane/Bananen.
const key = name => productKey(name).replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word=>{for(const end of ['en','er','n','e'])if(word.length-end.length>=2&&word.endsWith(end))return word.slice(0,-end.length);return word;}).join(' ');
export const hasUnitChoice = row => Boolean(typeof row?.purchaseMeasure === 'string' && row.purchaseMeasure.trim() && typeof row.purchaseAt === 'string');
export function unitChoice(row) { return hasUnitChoice(row) ? {purchaseUnit:row.purchaseUnit??null,purchaseMeasure:row.purchaseMeasure,purchaseAt:row.purchaseAt} : {}; }
// Eine weitergereichte Vorgabe behält ihren ursprünglichen Zeitpunkt. Bei exakt
// gleichen Zeitpunkten entscheidet der Inhalt, unabhängig von der Empfangsfolge.
export function compareUnitChoice(a, b) {
  const chosen = Number(hasUnitChoice(a)) - Number(hasUnitChoice(b));
  if (chosen || !hasUnitChoice(a)) return chosen;
  const compare = (left,right) => left < right ? -1 : left > right ? 1 : 0;
  const stamp = compare(String(a.purchaseAt),String(b.purchaseAt));
  if (stamp) return stamp;
  const signature = row => JSON.stringify([row.purchaseMeasure, row.purchaseUnit?.label || '', row.purchaseUnit?.quantity || 0, row.purchaseUnit?.unit || '']);
  return compare(signature(a),signature(b));
}
export function newerUnitChoice(row,current={}) {
  if(!hasUnitChoice(row))return {};
  return compareUnitChoice(row,current)>=0 ? unitChoice(row) : {};
}
const catalog = new Map(PRODUCT_ROWS.map(row => [key(row[1]), row]));
const defaults = new Map();
const pack = (label, quantity, unit) => ({ label, quantity, unit });
for (const [,name,quantity,unit] of PRODUCT_ROWS) {
  if (quantity === 1 && unit === 'l' && /milch|saft|drink/i.test(name)) defaults.set(key(name), pack('Packung',1,'l'));
}
for (const name of ['Vollmilch','H-Milch','Frische Milch','Fettarme Milch','Laktosefreie Milch','Bio Milch','Bio Vollmilch']) defaults.set(key(name),pack('Packung',1,'l'));
for (const id of ['butter','nudeln','spaghetti','reis','mehl','zucker','suppennudeln','vollkornnudeln','glutenfreie-nudeln','linsennudeln','reisnudeln','basmati-reis','jasmin-reis','vollkornreis','risotto-reis','sushi-reis','wildreis','dinkelmehl','roggenmehl','vollkornmehl','mandelmehl','kokosmehl','brauner-zucker','rohrzucker','gelierzucker']) {
  const row = PRODUCT_ROWS.find(row => row[0] === id); if (row) defaults.set(key(row[1]),pack('Packung',row[2],row[3]));
}
for (const name of ['Sahne','Schlagsahne','Kochsahne']) defaults.set(key(name),pack('Becher',200,'ml'));
export function validPurchaseUnit(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof value.label === 'string' && value.label.trim() && value.label.length <= 30 &&
    Number.isFinite(value.quantity) && value.quantity > 0 && value.quantity <= 1e6 && typeof value.unit === 'string' && ['weight','volume','count'].includes(unitSpec(value.unit).group));
}
export const defaultPurchaseUnit = name => defaults.get(key(name)) || null;
export function preferredPurchase(name, history = []) {
  const choices = history.filter(row => key(row.name) === key(name) && row.purchaseUnit !== undefined)
    .sort((a,b) => compareUnitChoice(b,a) || String(b.purchaseAt || b._clock?.purchaseUnit?.at || b.createdAt || b.at || '').localeCompare(String(a.purchaseAt || a._clock?.purchaseUnit?.at || a.createdAt || a.at || '')));
  const remembered = choices[0], legacy=history.filter(row=>key(row.name)===key(name)&&row.unit).sort((a,b)=>String(b.updatedAt||b.at||b.createdAt||'').localeCompare(String(a.updatedAt||a.at||a.createdAt||'')))[0];
  return { remembered:Boolean(remembered), purchaseUnit: remembered ? remembered.purchaseUnit : defaultPurchaseUnit(name), ...unitChoice(remembered), unit: remembered?.purchaseMeasure || remembered?.unit || legacy?.unit || catalog.get(key(name))?.[3] || 'Stück' };
}
export function purchaseProfile(row, history = []) {
  const profile = row.purchaseUnit === undefined ? defaultPurchaseUnit(row.name) : row.purchaseUnit;
  return validPurchaseUnit(profile) && unitSpec(row.unit).group === unitSpec(profile.unit).group ? profile : null;
}
export const purchaseSizeText = profile => `${number(profile.quantity)} ${profile.unit}`;
export function purchaseView(row, history = []) {
  const profile = purchaseProfile(row,history);
  if (!profile) {
    const source=unitSpec(row.unit),target=unitSpec(row.purchaseMeasure||row.unit),compatible=source.group===target.group;
    return {quantity:compatible?row.quantity*source.factor/target.factor:row.quantity,unit:compatible?row.purchaseMeasure||row.unit:row.unit,profile:null};
  }
  const amount = row.quantity * unitSpec(row.unit).factor, size = profile.quantity * unitSpec(profile.unit).factor;
  return { quantity: Math.max(1,Math.ceil(amount / size - 1e-9)), unit: profile.label, profile };
}
const plurals = { Packung:'Packungen',Flasche:'Flaschen',Dose:'Dosen',Glas:'Gläser',Becher:'Becher',Beutel:'Beutel',Rolle:'Rollen',Tube:'Tuben',Bund:'Bund',Sack:'Säcke',Karton:'Kartons' };
export function shoppingAmount(row) {
  const view = purchaseView(row);
  return `${number(view.quantity)} ${view.quantity === 1 ? view.unit : plurals[view.unit] || view.unit}${view.profile ? ` à ${purchaseSizeText(view.profile)}` : ''}`;
}
export function rawPurchase(quantity, profile, unit) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e6) throw new Error('Bitte eine Menge größer als 0 und höchstens 1.000.000 eingeben.');
  if (profile) {
    if (!Number.isInteger(quantity)) throw new Error('Packungen bitte als ganze Anzahl wählen. Für Teilmengen kannst du g, kg, ml oder l auswählen.');
    const amount=Math.round(quantity * profile.quantity * 1e6) / 1e6; if(!Number.isFinite(amount)||amount>1e6)throw new Error('Diese Menge ist zu groß. Bitte eine kleinere Zahl wählen.');
    return { quantity: amount, unit: profile.unit, purchaseUnit: { ...profile } };
  }
  return { quantity, unit, purchaseUnit: null };
}
export function purchaseCompatible(left,right,incoming=true) {
  // Rezeptzeilen ohne ausdrückliche Einkaufseinheit ergänzen den exakten Bedarf.
  if (incoming && right.purchaseUnit === undefined) return true;
  const a = purchaseProfile(left), b = purchaseProfile(right);
  if (!a || !b) return !a && !b;
  return a.label === b.label && unitSpec(a.unit).group === unitSpec(b.unit).group && Math.abs(a.quantity * unitSpec(a.unit).factor - b.quantity * unitSpec(b.unit).factor) < 1e-8;
}

export function purchaseIdentity(row) { const p=purchaseProfile(row); return p ? `${p.label}|${unitSpec(p.unit).group}|${p.quantity*unitSpec(p.unit).factor}` : "raw"; }
