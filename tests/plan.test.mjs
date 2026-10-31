import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, aggregateIngredients, dayMonthLabel, daysBetween, isoDate, isoWeek, recipeChanges, relativeDay, shortHash, snapshotRows, weekBasket, weekDays, weekLabel, weekRowKeys, weekStart, weekTakeId } from '../plan.js';
import { validDay } from '../data.js';
import { NO_AMOUNT } from '../recipe-import.js';

test('Wochen beginnen montags und haben sieben Tage', () => {
  assert.equal(weekStart('2026-10-26'), '2026-10-26');   // Montag
  assert.equal(weekStart('2026-11-01'), '2026-10-26');   // Sonntag gehört zur Woche davor
  assert.equal(weekStart('2026-10-28'), '2026-10-26');
  assert.deepEqual(weekDays('2026-10-29'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
});

test('Datumsrechnung über Monats-, Jahres- und Zeitumstellungsgrenzen', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');   // Zeitumstellung
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('Kalenderwochen nach ISO 8601', () => {
  assert.deepEqual(isoWeek('2026-10-26'), { week: 44, year: 2026 });
  assert.deepEqual(isoWeek('2026-01-01'), { week: 1, year: 2026 });
  assert.deepEqual(isoWeek('2021-01-03'), { week: 53, year: 2020 });
  assert.deepEqual(isoWeek('2024-12-30'), { week: 1, year: 2025 });
  assert.equal(weekLabel('2026-10-28'), 'KW 44 · 26.10.–01.11.');
  assert.equal(dayMonthLabel('2026-03-05'), '05.03.');
});

test('Kochdatum in Worten', () => {
  const today = '2026-10-26';
  assert.equal(relativeDay('2026-10-26', today), 'heute');
  assert.equal(relativeDay('2026-10-25', today), 'gestern');
  assert.equal(relativeDay('2026-10-20', today), 'vor 6 Tagen');
  assert.equal(relativeDay('2026-10-05', today), 'vor 3 Wochen');
  assert.equal(relativeDay('2026-07-26', today), 'vor 3 Monaten');
  assert.equal(relativeDay('2025-01-01', today), 'vor über einem Jahr');
  assert.equal(relativeDay('2026-10-30', today), 'geplant');
  assert.equal(relativeDay('2026-10-20T10:00:00.000Z', today), 'vor 6 Tagen');
});

test('Gültige Kalendertage', () => {
  assert.ok(validDay('2026-02-28') && validDay('2028-02-29'));
  for (const bad of ['2026-02-30', '2026-13-01', '26-10-26', '2026-10-26T10:00', '', null, 5]) assert.equal(validDay(bad), false, String(bad));
});

const recipes = [{ id: 'r1', name: 'Suppe', servings: 2 }, { id: 'r2', name: 'Pasta', servings: 4 }, { id: 'r3', name: 'Salat', servings: 1 }];
const row = (recipeId, name, quantity, unit) => ({ id: `${recipeId}-${name}-${unit}`, recipeId, name, quantity, unit });
const ingredients = [row('r1', 'Tomaten', 800, 'g'), row('r1', 'Zwiebel', 1, 'Stück'), row('r1', 'Salz', 1, NO_AMOUNT), row('r1', 'Olivenöl', 2, 'EL'),
  row('r2', 'Tomaten', 0.4, 'kg'), row('r2', 'Zwiebeln', 2, 'Stk.'), row('r2', 'salz', 1, NO_AMOUNT), row('r2', 'Olivenöl', 100, 'ml'), row('r2', 'Milch', 250, 'ml'),
  row('r3', 'Milch', 0.75, 'l'), row('r3', 'Zwiebel', 1, 'Stück')];

test('Zutaten werden über Gerichte hinweg zusammengezählt und auf Portionen umgerechnet', () => {
  const rows = aggregateIngredients([{ recipeId: 'r1', servings: 4 }, { recipeId: 'r2', servings: 4 }, { recipeId: 'r3', servings: 2 }], recipes, ingredients);
  const text = Object.fromEntries(rows.map(item => [`${item.name}|${item.unit}`, item.quantity]));
  assert.equal(text['Tomaten|kg'], 2);            // 1600 g + 400 g
  assert.equal(text['Milch|l'], 1.75);            // 250 ml + 1,5 l
  assert.equal(text['Zwiebel|Stück'], 6);         // 1 x 2 Portionsfaktor + 1 x 2 + 2 „Zwiebeln“ (dasselbe Produkt, seit Version 2.48); die häufigste Schreibweise wird gezeigt
  assert.ok(!('Zwiebeln|Stück' in text));
  assert.equal(text['Salz|nach Bedarf'], 1);
  assert.equal(text['Olivenöl|EL'], 4);
  assert.equal(text['Olivenöl|ml'], 100);
  assert.deepEqual(rows.find(item => item.name === 'Tomaten').sources, ['Suppe', 'Pasta']);
});

test('Kleine Mengen bleiben in g bzw. ml; unbekannte Rezepte und leere Pläne sind harmlos', () => {
  const rows = aggregateIngredients([{ recipeId: 'r2', servings: 2 }, { recipeId: 'weg', servings: 2 }], recipes, ingredients);
  assert.equal(rows.find(item => item.name === 'Tomaten').unit, 'g');
  assert.equal(rows.find(item => item.name === 'Tomaten').quantity, 200);
  assert.equal(rows.find(item => item.name === 'Milch').unit, 'ml');
  assert.deepEqual(aggregateIngredients([], recipes, ingredients), []);
});

// Version 2.47: Schon auf die Liste übernommene Gerichte nicht noch einmal aufnehmen (sonst verdoppeln sich die Mengen)
const meal = (id, servings, extra = {}) => ({ id, recipeId: 'r1', servings, ...extra });
test('Wochen-Einkauf: noch nicht Übernommenes kommt ganz, Übernommenes bleibt draußen', () => {
  const basket = weekBasket([meal('a', 2), meal('b', 4, { listedServings: 4 }), meal('c', 3, { listedServings: 3, listedAt: '2026-10-28T10:00:00.000Z' })]);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2]]);
  assert.deepEqual(basket.listed.map(entry => [entry.meal.id, entry.kind]), [['b', 'same'], ['c', 'same']]);
});
test('Wochen-Einkauf: mehr Portionen seit der Übernahme: nur die zusätzlichen; weniger: nichts; die Gerichte selbst bleiben unverändert', () => {
  const original = [meal('a', 6, { listedServings: 4 }), meal('b', 2, { listedServings: 4 }), meal('c', 2.5, { listedServings: 2.25 })];
  const copy = structuredClone(original);
  const basket = weekBasket(original);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2], ['c', 0.25]]);
  assert.deepEqual(basket.listed.map(entry => [entry.meal.id, entry.kind, entry.extra]), [['a', 'more', 2], ['b', 'less', -2], ['c', 'more', 0.25]]);
  assert.deepEqual(original, copy);
  // die Zutaten stimmen: 2 zusätzliche von 4 Portionen = die halbe Menge
  const rows = aggregateIngredients(basket.use.slice(0, 1), [{ id: 'r1', name: 'R', servings: 4 }], [{ recipeId: 'r1', name: 'Mehl', quantity: 400, unit: 'g' }]);
  assert.deepEqual(rows.map(row => [row.name, row.quantity, row.unit]), [['Mehl', 200, 'g']]);
});
test('Wochen-Einkauf: ausdrücklich noch einmal – alle Gerichte mit allen Portionen', () => {
  const basket = weekBasket([meal('a', 2), meal('b', 4, { listedServings: 4 }), meal('c', 1, { listedServings: 3 })], true);
  assert.deepEqual(basket.use.map(entry => [entry.id, entry.servings]), [['a', 2], ['b', 4], ['c', 1]]);
  assert.deepEqual(basket.listed.map(entry => entry.meal.id), ['b', 'c']);
});
test('Wochen-Einkauf: Gleitkomma-Reste zählen nicht als „mehr“; ungültige Merker gelten als nicht übernommen', () => {
  assert.equal(weekBasket([meal('a', 0.1 + 0.2, { listedServings: 0.3 })]).use.length, 0);
  for (const bad of [null, 0, -1, 'x', undefined, NaN]) assert.deepEqual(weekBasket([meal('a', 2, { listedServings: bad })]).use.map(entry => entry.servings), [2], String(bad));
  assert.deepEqual(weekBasket([]), { use: [], listed: [] });
});

// Version 2.48: dasselbe Produkt in anderer Schreibweise wird zusammengezählt
test('Wochen-Einkauf: „Zwiebel“ und „Zwiebeln“, „Tomate“ und „Tomaten“ sind ein Eintrag; die häufigere Schreibweise (bei Gleichstand die längere) wird gezeigt', () => {
  const recipes = [{ id: 'a', name: 'A', servings: 2 }, { id: 'b', name: 'B', servings: 2 }, { id: 'c', name: 'C', servings: 2 }];
  const meals = ['a', 'b', 'c'].map(recipeId => ({ recipeId, servings: 2 }));
  const rows = aggregateIngredients(meals, recipes, [
    { recipeId: 'a', name: 'Zwiebel', quantity: 1, unit: 'Stück' }, { recipeId: 'b', name: 'Zwiebeln', quantity: 2, unit: 'Stück' },
    { recipeId: 'a', name: 'Tomate', quantity: 100, unit: 'g' }, { recipeId: 'b', name: 'Tomaten', quantity: 0.4, unit: 'kg' }, { recipeId: 'c', name: 'Tomaten', quantity: 100, unit: 'g' },
    { recipeId: 'a', name: 'Äpfel', quantity: 2, unit: 'Stück' }, { recipeId: 'c', name: 'Apfel', quantity: 1, unit: 'Stück' }]);
  assert.deepEqual(rows.map(row => [row.name, row.quantity, row.unit, row.sources]), [
    ['Äpfel', 3, 'Stück', ['A', 'C']], ['Tomaten', 600, 'g', ['A', 'B', 'C']], ['Zwiebeln', 3, 'Stück', ['A', 'B']]]);
});
test('Wochen-Einkauf: andere Wörter, andere Einheiten und Zahlen im Namen bleiben getrennt', () => {
  const recipes = [{ id: 'a', name: 'A', servings: 1 }];
  const ing = list => list.map(([name, quantity, unit]) => ({ recipeId: 'a', name, quantity, unit }));
  const rows = aggregateIngredients([{ recipeId: 'a', servings: 1 }], recipes, ing([['Zwiebel', 1, 'Stück'], ['rote Zwiebel', 1, 'Stück'], ['Zwiebeln', 200, 'g'], ['Milch', 1, 'l'], ['Hafermilch', 1, 'l'],
    ['Cola 1 l', 1, 'Stück'], ['Cola 2 l', 1, 'Stück'], ['Ei', 1, 'Stück'], ['Eis', 1, 'Stück']]));
  assert.deepEqual(rows.map(row => `${row.name}|${row.unit}`).sort(), ['Cola 1 l|Stück', 'Cola 2 l|Stück', 'Ei|Stück', 'Eis|Stück', 'Hafermilch|l', 'Milch|l', 'Zwiebel|Stück', 'Zwiebeln|g', 'rote Zwiebel|Stück'].sort());
});

// Version 2.50: Was hat sich am Rezept seit der Übernahme geändert?
test('Rezept nach der Übernahme geändert: neue, entfernte und geänderte Zutaten werden erkannt; gleiche nicht', () => {
  const rows = [{ name: 'Mehl', quantity: 150, unit: 'g' }, { name: 'Zwiebel', quantity: 1, unit: 'Stück' }, { name: 'Salz', quantity: 1, unit: 'nach Bedarf' }];
  const snapshot = snapshotRows(rows);
  assert.deepEqual(snapshot, ['Mehl|150|g', 'Zwiebel|1|Stück', 'Salz|1|nach Bedarf']);
  assert.equal(recipeChanges(snapshot, rows).any, false, 'unverändert');
  assert.equal(recipeChanges(snapshot, [...rows].reverse()).any, false, 'die Reihenfolge ist egal');
  const changes = recipeChanges(snapshot, [{ name: 'mehl', quantity: 200, unit: 'g' }, { name: 'Salz', quantity: 1, unit: 'nach Bedarf' }, { name: 'Öl', quantity: 1, unit: 'EL' }]);
  assert.deepEqual([changes.added.map(row => row.name), changes.removed.map(row => row.name), changes.changed.map(entry => [entry.name, entry.from.quantity, entry.to.quantity])], [['Öl'], ['Zwiebel'], [['mehl', 150, 200]]]);
  assert.deepEqual(recipeChanges(snapshot, [{ name: 'Mehl', quantity: 0.15, unit: 'kg' }, rows[1], rows[2]]).added.map(row => row.unit), ['kg'], 'andere Einheit: neu und entfernt');
  assert.deepEqual(recipeChanges(undefined, rows).added.length, 3, 'ohne Merker alles neu (wird in der App nicht verwendet)');
  assert.deepEqual(snapshotRows([{ name: 'A|B', quantity: 1, unit: 'g' }]), ['A/B|1|g'], 'ein senkrechter Strich im Namen stört nicht');
});

test('Kennung einer Wochenübernahme (Version 2.56): gleich auf jedem Gerät, unabhängig von der Reihenfolge; andere Gerichte, Portionen oder ein anderer Übernahme-Stand ergeben eine andere', () => {
  const meal = (id, servings, extra = {}) => ({ id, servings, date: '2026-10-29', recipeId: 'r', ...extra });
  const base = weekTakeId([meal('m1', 2), meal('m2', 4)]);
  assert.match(base, /^[0-9a-z]{6,}$/);
  assert.equal(weekTakeId([meal('m2', 4), meal('m1', 2)]), base, 'Reihenfolge egal');
  assert.equal(weekTakeId([meal('m1', 2, { date: '2026-10-30', createdAt: 'x' }), meal('m2', '4')]), base, 'Datum und Rezept gehören nicht zur Kennung, 4 und „4“ sind gleich');
  assert.notEqual(weekTakeId([meal('m1', 2)]), base, 'ein Gericht weniger');
  assert.notEqual(weekTakeId([meal('m1', 3), meal('m2', 4)]), base, 'andere Portionen');
  assert.notEqual(weekTakeId([meal('m1', 2, { listedServings: 2, listedAt: '2026-10-29T10:00:00.000Z' }), meal('m2', 4)]), base, 'schon einmal übernommen: eine neue, bewusste Übernahme');
  assert.notEqual(weekTakeId([meal('m1', 2, { listedServings: 2, listedAt: '2026-10-29T11:00:00.000Z' }), meal('m2', 4)]), weekTakeId([meal('m1', 2, { listedServings: 2, listedAt: '2026-10-29T10:00:00.000Z' }), meal('m2', 4)]), 'zweite und dritte Übernahme unterscheiden sich');
  assert.equal(weekTakeId([]), weekTakeId([]));
});

test('Schlüssel der Zeilen: Name und Einheit (Schreibweisen gleich), kommt derselbe zweimal vor, wird durchgezählt; fester Hash', () => {
  const rows = [{ name: 'Nudeln', unit: 'g' }, { name: 'nudeln ', unit: 'G' }, { name: 'Nudeln', unit: 'Stück' }, { name: 'Tomaten', unit: 'g' }];
  const keys = weekRowKeys(rows);
  assert.equal(new Set(keys).size, 4, 'jede Zeile hat einen eigenen Schlüssel');
  assert.ok(keys[1].startsWith(keys[0]) && keys[1].endsWith('-2'));
  assert.deepEqual(weekRowKeys(rows), keys, 'immer gleich');
  assert.equal(shortHash('abc'), shortHash('abc'));
  assert.notEqual(shortHash('abc'), shortHash('abd'));
  assert.ok(keys.every(key => /^[0-9a-z-]+$/.test(key)), 'nur Zeichen, die in einer Kennung stehen dürfen');
});

// Quellenbezogene Rücknahmen: manuelle Mengen und gleichzeitige Geräte erhalten.
import { emptyData, merge, addToList, operation, active } from '../data.js';
import { planReduction } from '../plan-list.js';
import { compact } from '../compact.js';
const planAt = n => `2026-10-31T10:00:${String(n).padStart(2,'0')}.000Z`;
function plannedFixture(manual = 100, fresh = false) {
  let data=emptyData();
  if(!fresh)data=merge(data,addToList([{name:'Reis',quantity:manual,unit:'g'}],'','Nico',planAt(1)).ops);
  const result=addToList([{name:'Reis',quantity:400,unit:'g',key:'reis'}],'','Nico',planAt(2),data.items,data.items,'meal');
  for(const op of result.ops)op.patch.planLinked=true;
  data=merge(data,result.ops);const source=result.ops[0],item=data.items.find(row=>row.id===source.entityId),amount=source.patch.add||source.patch;
  const part={itemId:item.id,sourceId:source.id,name:item.name,storeId:'',at:source.at,quantity:amount.quantity,unit:amount.unit,remaining:amount.quantity};
  return {data,item,meal:{id:'meal',recipeId:'recipe',servings:4,listedServings:4,listedParts:[part]}};
}
function correction(data, meal, target, tick=3) {
  const reduction=planReduction(meal,target===null?null:{recipeId:'recipe',servings:target},data.items);
  const ops=reduction.changes.map(({item,part,cut})=>operation('items',item.id,{cutPlan:{...cut,originalQuantity:part.quantity}},'Nico',planAt(tick)));
  return {reduction,ops,data:merge(data,ops)};
}
test('Plan-Korrektur: weniger Portionen lässt manuelle Zusatzmengen erhalten',()=>{
  const {data,meal}=plannedFixture();const out=correction(data,meal,2);
  assert.equal(out.reduction.changes[0].remove,200);assert.equal(out.data.items[0].quantity,300);assert.equal(out.data.sync.minRev,10);
});
test('Plan-Korrektur: Entfernen löscht nur den Rezeptanteil, niemals den manuellen Rest',()=>{
  const {data,meal}=plannedFixture();assert.equal(correction(data,meal,null).data.items[0].quantity,100);
});
test('Plan-Korrektur: reine Rezeptzutat verschwindet; ein späterer manueller Zuwachs bleibt sichtbar',()=>{
  const {data,meal,item}=plannedFixture(0,true);let out=correction(data,meal,null).data;
  assert.equal(active(out.items).length,0);assert.equal(out.items[0].quantity,0);
  out=merge(out,[operation('items',item.id,{add:{quantity:50,unit:'g'}},'Anna',planAt(5))]);assert.equal(active(out.items)[0].quantity,50);
});
test('Plan-Korrektur: unterschiedliche Bestätigungen zweier Geräte ziehen denselben Anteil nur einmal ab',()=>{
  const {data,meal}=plannedFixture();const a=correction(data,meal,2,3).ops,b=correction(data,meal,2,4).ops;
  for(const ops of [[...a,...b],[...b,...a],[...a,...a,...b]])assert.equal(merge(data,ops).items[0].quantity,300);
});
test('Plan-Korrektur: gleichzeitiges manuelles Hinzufügen bleibt auch bei kg/g-Umrechnung erhalten',()=>{
  const {data,meal,item}=plannedFixture(800);const a=correction(data,meal,2).ops,b=[operation('items',item.id,{add:{quantity:.5,unit:'kg'}},'Anna',planAt(4))];
  for(const ops of [[...a,...b],[...b,...a]]){const out=merge(data,ops).items[0];assert.equal(out.quantity,1.5);assert.equal(out.unit,'kg');}
});
test('Plan-Korrektur: weitere Verringerung verwendet den kumulierten Anteil statt zweimal abzuziehen',()=>{
  const {data,meal}=plannedFixture();const first=correction(data,meal,2);const next={...meal,servings:2,listedServings:2,listedParts:first.reduction.parts};
  const second=correction(first.data,next,1,4);assert.equal(second.data.items[0].quantity,200);assert.equal(correction(second.data,{...next,servings:1,listedServings:1,listedParts:second.reduction.parts},null,5).data.items[0].quantity,100);
});
test('Plan-Korrektur: gekaufte, verschobene, gelöschte und manuell neu gesetzte Artikel werden übersprungen',()=>{
  for(const patch of [{checked:true},{storeId:'anders'},{deletedAt:planAt(3)},{quantity:900,unit:'g'},{name:'Basmatireis'}]){
    const {data,meal,item}=plannedFixture();const changed=merge(data,[operation('items',item.id,patch,'Anna',planAt(3))]);const result=correction(changed,meal,2,4);
    assert.equal(result.reduction.changes.length,0);assert.equal(result.reduction.skipped.length,1);
  }
});
test('Plan-Korrektur: Rezeptwechsel und alte Übernahmen sind ausdrücklich unterscheidbar',()=>{
  const {data,meal}=plannedFixture();assert.equal(planReduction(meal,{recipeId:'anders',servings:4},data.items).changes[0].remove,400);
  assert.equal(planReduction({...meal,listedParts:undefined},null,data.items).legacy,true);
});
test('Plan-Korrektur: Aufräumen erhält die exakte Quellenzuordnung',()=>{
  const {data,meal}=plannedFixture();const tidied=compact(data,new Date('2027-02-01T10:00:00Z')).data;assert.equal(correction(tidied,meal,2).data.items[0].quantity,300);
  const corrected=correction(data,meal,2).data;const tidied2=compact(corrected,new Date('2027-02-01T10:00:00Z')).data;assert.equal(merge(tidied2,[]).items[0].quantity,300);
});
test('Plan-Korrektur: eine nachträglich manuell gesetzte Gesamtmenge verdrängt alte Abzüge',()=>{
  const {data,meal,item}=plannedFixture();const reduced=correction(data,meal,2).data;
  const out=merge(reduced,[operation('items',item.id,{quantity:700,unit:'g'},'Anna',planAt(5))]);assert.equal(out.items[0].quantity,700);
});

test('Plan-Korrektur: Verschieben oder Umbenennen nach einem Abzug stellt entfernte Mengen nicht wieder her',()=>{
  for(const patch of [{storeId:'anders'},{name:'Basmatireis'},{checked:true}]){
    const {data,meal,item}=plannedFixture();const reduced=correction(data,meal,2).data;const out=merge(reduced,[operation('items',item.id,patch,'Anna',planAt(5))]);assert.equal(out.items[0].quantity,300);
  }
});
test('Plan-Korrektur: gleichzeitige verschiedene Portionsziele folgen derselben jüngsten Entscheidung',()=>{
  const {data,meal}=plannedFixture();const older=correction(data,meal,1,3).ops,newer=correction(data,meal,2,4).ops;
  for(const ops of [[...older,...newer],[...newer,...older]])assert.equal(merge(data,ops).items[0].quantity,300);
  assert.equal(merge(merge(data,newer),older).items[0].quantity,300);
});
test('Plan-Korrektur: die Anteile eines anderen Gerichts bleiben im gemeinsamen Artikel erhalten',()=>{
  const {data,meal}=plannedFixture();const added=addToList([{name:'Reis',quantity:200,unit:'g',key:'reis'}],'','Anna',planAt(3),data.items,data.items,'anderes-gericht');
  const shared=merge(data,added.ops),out=correction(shared,meal,null,4).data;assert.equal(out.items[0].quantity,300);
});
test('Plan-Korrektur: stabile Quelle wird auch nach abweichender Artikelzuordnung zweier Geräte gefunden',()=>{
  const {data,meal,item}=plannedFixture(0,true);const stale={...meal,listedParts:meal.listedParts.map(part=>({...part,itemId:'anderer-lokaler-artikel'}))};
  const out=correction(data,stale,2);assert.equal(out.reduction.changes[0].item.id,item.id);assert.equal(out.data.items[0].quantity,200);
});
test('Plan-Korrektur: vollständig entfernte Anteile werden nach der normalen Aufbewahrungszeit aufgeräumt',()=>{
  const {data,meal}=plannedFixture(0,true);const empty=correction(data,meal,null).data;assert.equal(active(empty.items).length,0);assert.equal(empty.items.length,1);
  assert.equal(compact(empty,new Date('2027-02-01T12:00:00Z')).data.items.length,0);
});
