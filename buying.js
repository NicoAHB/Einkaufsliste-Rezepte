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
const looseMeat = name => /(?:^|\s)(?:hackfleisch|rinderhack|schweinehack|putenhack|geflügelhack|rindergehacktes)(?:\s|$)/i.test(productKey(name));
export const validPurchaseAmount = amount => Boolean(amount && typeof amount==='object' && !Array.isArray(amount) && Number.isFinite(amount.quantity) && amount.quantity>0 && amount.quantity<=1e6 && typeof amount.unit==='string' && amount.unit.trim() && amount.unit.length<=30);
export const hasAmountChoice = row => (row?.purchaseAmount === null || validPurchaseAmount(row?.purchaseAmount)) && typeof row.purchaseAmountAt==='string' && Number.isFinite(Date.parse(row.purchaseAmountAt));
export const amountChoice = row => hasAmountChoice(row) ? {purchaseAmount:row.purchaseAmount === null ? null : {quantity:row.purchaseAmount.quantity,unit:row.purchaseAmount.unit},purchaseAmountAt:row.purchaseAmountAt} : {};
export function compareAmountChoice(a,b) {
  const present=Number(hasAmountChoice(a))-Number(hasAmountChoice(b));if(present||!hasAmountChoice(a))return present;
  const signature=row=>`${row.purchaseAmountAt}|${JSON.stringify(row.purchaseAmount === null ? null : [row.purchaseAmount.quantity,row.purchaseAmount.unit])}`;
  const x=signature(a),y=signature(b);return x<y?-1:x>y?1:0;
}
export const newerAmountChoice = (row,current={}) => hasAmountChoice(row)&&compareAmountChoice(row,current)>=0 ? amountChoice(row) : {};
export const rememberedAmount = (name, history) => history.filter(row => key(row.name) === key(name) && hasAmountChoice(row)).sort((a,b) => compareAmountChoice(b,a))[0] || null;
// Nur manuell bestätigte Einzelmengen merken, niemals die aggregierte Liste.
export function preferredQuantity(name,history,unit,profile,fallback=1) {
  const remembered=history.filter(row=>key(row.name)===key(name)&&hasAmountChoice(row)).sort((a,b)=>compareAmountChoice(b,a))[0];
  if(!remembered?.purchaseAmount)return fallback;
  const amount=remembered.purchaseAmount,source=unitSpec(amount.unit),target=unitSpec(profile?.unit||unit);
  if(source.group!==target.group)return fallback;
  const quantity=amount.quantity*source.factor/target.factor;
  const result=profile?Math.max(1,Math.ceil(quantity/profile.quantity-1e-9)):Math.round(quantity*1e6)/1e6;
  return Number.isFinite(result)&&result>0&&result<=1e6?result:fallback;
}
export function startQuantity(name,unit,profile=null) {
  if(profile)return 1;
  const spec=unitSpec(unit);if(!['weight','volume'].includes(spec.group))return 1;
  let base=spec.factor===1000?1000:100;
  if(spec.group==='weight'&&looseMeat(name))base=100;
  if(spec.group==='weight'&&catalog.get(key(name))?.[4]==='gewuerze')base=10;
  return base/spec.factor;
}
export function minimumQuantity(unit,profile=null) {
  const spec=unitSpec(unit);return !profile&&['weight','volume'].includes(spec.group)?1/spec.factor:1;
}
export function stepQuantity(value,unit,direction,profile=null,name='') {
  if(!Number.isFinite(value)||value<=0)return startQuantity(name,unit,profile);
  const spec=unitSpec(unit),up=direction>0;
  if(profile)return Math.min(1e6,Math.max(1,up?Math.floor(value)+1:Math.ceil(value)-1));
  if(!['weight','volume'].includes(spec.group))return Math.min(1e6,Math.max(1,value+(up?1:-1)));
  const base=value*spec.factor,step=up?(base<100?10:base<=1000?50:100):(base<=100?10:base<=1000?50:100);
  let next=base+(up?step:-step);
  if(!up){if(base>1000)next=Math.max(1000,next);else if(base>100)next=Math.max(100,next);}
  return Math.min(1e6,Math.round(Math.max(1,next)/spec.factor*1e6)/1e6);
}
const defaults = new Map();
const pack = (label, quantity, unit) => ({ label, quantity, unit });
// Vorschläge, keine unterstellten Packungsinhalte. Erst die bewusste Auswahl
// verknüpft Stückbedarf aus Rezepten mit einer persönlichen Einkaufsgröße.
const countedPacks = new Map();
function counted(names, sizes, singular, plural) {
  for (const name of names) countedPacks.set(key(name), {sizes, singular, plural});
}
counted(['Ei','Eier','Bio-Eier','Bio Eier','Bioeier','Freilandeier','Gekochte Eier'], [4,6,10,12,15,20,30], 'Ei','Eier');
counted(['Wachteleier'], [6,12,18,24], 'Ei','Eier');
counted(['Wraps','Weizenwraps','Vollkornwraps','Tortillas','Tortillafladen','Weizentortillas'], [4,6,8,10,12], 'Stück','Stück');
counted(['Brötchen','Aufbackbrötchen','Tiefkühlbrötchen','Milchbrötchen'], [4,6,8,9,10,12], 'Stück','Stück');
counted(['Burgerbrötchen','Burger-Brötchen','Hamburgerbrötchen','Hotdogbrötchen','Hotdog-Brötchen'], [2,4,6,8], 'Stück','Stück');
counted(['Croissants','Aufbackcroissants','Tiefkühlcroissants'], [4,6,8,10], 'Stück','Stück');
counted(['Würstchen','Wiener Würstchen','Wiener','Hotdogwürstchen','Bockwurst','Bratwurst','Weißwurst'], [4,5,6,8,10,12], 'Stück','Stück');
counted(['Fischstäbchen'], [10,12,15,20,30], 'Stück','Stück');
counted(['Spülmaschinentabs','Geschirrspültabs','Spülmitteltabs'], [30,40,50,60,80,100], 'Tab','Tabs');
counted(['Kaffeekapseln'], [10,16,20,30,40,50], 'Kapsel','Kapseln');
counted(['Küchenschwamm','Küchenschwämme','Spülschwämme'], [2,3,4,6,10], 'Stück','Stück');
counted(['Spültücher'], [3,5,6,10], 'Stück','Stück');
counted(['Teelichter'], [10,20,30,50,100], 'Stück','Stück');
export const packOptions = name => (countedPacks.get(key(name))?.sizes || []).map(quantity=>pack('Packung',quantity,'Stück'));
export const countAmount = (name,quantity) => {
  const info=countedPacks.get(key(name));
  return `${number(quantity)} ${info ? quantity===1?info.singular:info.plural : 'Stück'}`;
};
export const needsPackSize = (name,unit,profile=null) => !profile && countedPacks.has(key(name)) && ['packung','packungen','pack','päckchen','beutel','karton','schachtel','dose','glas'].includes(productKey(unit));
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
  return { remembered:Boolean(remembered), purchaseUnit: remembered ? remembered.purchaseUnit : defaultPurchaseUnit(name), ...unitChoice(remembered), unit: remembered?.purchaseMeasure || remembered?.unit || legacy?.unit || catalog.get(key(name))?.[3] || (looseMeat(name)?'g':'Stück') };
}
// Auch Rezeptangaben wie „½ Packung Wraps“ sind bei bekannter Größe eindeutig.
// Keine Gramm/Stück-Schätzung und kein Erfinden eines unbekannten Inhalts.
export function withKnownPack(row,history=[]) {
  if(row.purchaseUnit!==undefined)return row;
  const pref=preferredPurchase(row.name,history),profile=pref.purchaseUnit;
  if(!validPurchaseUnit(profile))return row;
  const isPack=key(row.unit)===key(profile.label)||(profile.label==='Packung'&&['pck','pck.','pkg','pkg.','pk','päckchen'].includes(productKey(row.unit)));
  const quantity=row.quantity*profile.quantity;
  if(!isPack||!Number.isFinite(quantity)||quantity<=0||quantity>1e6)return row;
  return {...row,quantity:Math.round(quantity*1e6)/1e6,unit:profile.unit,purchaseUnit:{...profile},...unitChoice(pref)};
}
export function purchaseProfile(row, history = []) {
  const profile = row.purchaseUnit === undefined ? defaultPurchaseUnit(row.name) : row.purchaseUnit;
  return validPurchaseUnit(profile) && unitSpec(row.unit).group === unitSpec(profile.unit).group ? profile : null;
}
export const purchaseSizeText = (profile,name='') => unitSpec(profile.unit).group==='count' ? countAmount(name,profile.quantity) : `${number(profile.quantity)} ${profile.unit}`;
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
  return `${number(view.quantity)} ${view.quantity === 1 ? view.unit : plurals[view.unit] || view.unit}${view.profile ? ` à ${purchaseSizeText(view.profile,row.name)}` : ''}`;
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
