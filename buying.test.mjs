import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyData,merge,addToList,operation,duplicateFolds,validate,SCHEMA_REV} from '../data.js';
import {defaultPurchaseUnit,preferredPurchase,purchaseView,shoppingAmount,purchaseCompatible} from '../buying.js';
import {compact} from '../compact.js';
const time=n=>`2026-10-30T12:00:${String(n).padStart(2,'0')}.000Z`;
const add=(data,q,unit='ml',at=1,store='s')=>merge(data,addToList([{name:'Milch',quantity:q,unit}],store,'Nico',time(at),data.items).ops);
const milk=data=>data.items.find(row=>!row.deletedAt&&row.name==='Milch');
test('Packungen: erst 500 + 900 ml summieren, dann zwei Literpackungen anzeigen',()=>{let d=add(emptyData(),500);d=add(d,900,'ml',2);assert.equal(milk(d).quantity,1.4);assert.equal(milk(d).unit,'l');assert.equal(shoppingAmount(milk(d)),'2 Packungen à 1 l');});
test('Packungen: zwei kleine Übernahmen benötigen gemeinsam nur eine Packung',()=>{let d=add(emptyData(),250);d=add(d,250,'ml',2);assert.equal(shoppingAmount(milk(d)),'1 Packung à 1 l');assert.equal(milk(d).quantity,500);});
test('Packungen: exakte Grenzen, verschiedene Maße und keine Abrundung unter den Bedarf',()=>{for(const [q,u,count]of [[1000,'ml',1],[1,'l',1],[1001,'ml',2],[0.5,'l',1],[2000,'ml',2]])assert.equal(purchaseView({name:'Milch',quantity:q,unit:u}).quantity,count);});
test('Packungen: 500-ml-Flaschen für 1,4 l ergeben drei, der Bedarf bleibt unverändert',()=>{const row={name:'Milch',quantity:1.4,unit:'l',purchaseUnit:{label:'Flasche',quantity:500,unit:'ml'}};assert.equal(shoppingAmount(row),'3 Flaschen à 500 ml');assert.equal(row.quantity,1.4);});
test('Packungen: kurze Produkte und fremde Maße werden nicht geraten oder als Milch verstanden',()=>{for(const name of ['Milchreis','Scheuermilch','Milchschokolade','Apfeltasche','Zitronensaft'])assert.equal(defaultPurchaseUnit(name),null,name);assert.equal(purchaseView({name:'Mehl',quantity:2,unit:'EL'}).profile,null);assert.equal(shoppingAmount({name:'Milch',quantity:250,unit:'ml',purchaseUnit:null}),'250 ml');});
test('Packungen: zwei Geräte addieren exakte Mengen in jeder Reihenfolge, Wiederholen bleibt idempotent',()=>{const shared=add(emptyData(),100);const a=addToList([{name:'Milch',quantity:500,unit:'ml'}],'s','Nico',time(2),shared.items).ops,b=addToList([{name:'Milch',quantity:900,unit:'ml'}],'s','Anna',time(3),shared.items).ops;for(const ops of [[...a,...b],[...b,...a],[...a,...b,...a]]){const out=merge(shared,ops);assert.equal(milk(out).quantity,1.5);assert.equal(purchaseView(milk(out)).quantity,2);}});
test('Packungen: gleichzeitig neu angelegte Mengen werden physikalisch zusammengeführt, nicht pro Gerät gerundet',()=>{const a=addToList([{name:'Milch',quantity:500,unit:'ml'}],'s','Nico',time(1)).ops,b=addToList([{name:'Milch',quantity:900,unit:'ml'}],'s','Anna',time(2)).ops;const both=merge(emptyData(),[...a,...b]);const folds=duplicateFolds(both.items,time(3)),out=merge(both,folds);assert.equal(out.items.filter(r=>!r.deletedAt).length,1);assert.equal(milk(out).quantity,1.4);assert.equal(purchaseView(milk(out)).quantity,2);assert.equal(milk(merge(out,folds)).quantity,1.4);});
test('Packungen: verschiedene explizite Packungsgrößen und Geschäfte bleiben getrennt',()=>{let d=add(emptyData(),1000);d=merge(d,addToList([{name:'Milch',quantity:500,unit:'ml',purchaseUnit:{label:'Flasche',quantity:500,unit:'ml'}}],'s','Nico',time(2),d.items).ops);d=add(d,900,'ml',3,'anderes');assert.equal(d.items.filter(r=>!r.deletedAt).length,3);assert.equal(duplicateFolds(d.items,time(4)).length,0);assert.equal(purchaseCompatible(d.items[0],{name:'Milch',quantity:1,unit:'l'}),true);});
test('Packungen: Wochenübernahme wird auch auf zwei Geräten nur einmal angewendet',()=>{const rows=[{name:'Milch',quantity:1.4,unit:'l',key:'milch-volume'}];const a=addToList(rows,'s','Nico',time(1),[],[],'week'),b=addToList(rows,'s','Anna',time(2),[],[],'week');const out=merge(emptyData(),[...a.ops,...b.ops]);assert.equal(out.items.length,1);assert.equal(milk(out).quantity,1.4);assert.equal(purchaseView(milk(out)).quantity,2);});
test('Packungen: bewusst gewählte Einheit bleibt im Gedächtnis nach dem Aufräumen',()=>{let d=add(emptyData(),500);const row=milk(d);d=merge(d,[operation('items',row.id,{purchaseUnit:{label:'Flasche',quantity:750,unit:'ml'},purchaseAt:time(2),checked:true,deletedAt:time(3)},'Nico',time(3))]);const out=compact(d,new Date('2026-12-30T12:00:00Z')).data;assert.equal(out.items.length,0);assert.equal(preferredPurchase('Milch',out.names).purchaseUnit.quantity,750);assert.equal(out.sync.minRev,7);assert.doesNotThrow(()=>validate(JSON.parse(JSON.stringify(out))));});
test('Packungen: optionale Felder werden geprüft, alte Dateien bleiben gültig und Mindestversion schützt ältere Apps',()=>{assert.doesNotThrow(()=>validate(emptyData()));const d=add(emptyData(),500);assert.equal(d.sync.minRev,7);assert.ok(SCHEMA_REV>=7);for(const p of [{label:'Packung',quantity:0,unit:'l'},{label:'',quantity:1,unit:'l'},{label:'Packung',quantity:1,unit:'unbekannt'}])assert.throws(()=>merge(d,[operation('items',milk(d).id,{purchaseUnit:p},'Nico',time(4))]),/Einkaufseinheit/);});

test('Packungen: Bruchteile knapp über einer Literpackung werden beim Summieren nicht abgerundet',()=>{let d=add(emptyData(),999.9);d=add(d,.5,'ml',2);assert.equal(milk(d).quantity,1.0004);assert.equal(purchaseView(milk(d)).quantity,2);});

test('Einheiten: alte eigene Einheiten bleiben als Vorgabe erhalten, ausdrücklicher Verzicht gilt auch für spätere Rezepte',()=>{assert.equal(preferredPurchase('Apfel',[{name:'Äpfel',unit:'Stück',updatedAt:time(1)}]).unit,'Stück');const history=[{name:'Milch',unit:'ml',purchaseUnit:null,purchaseAt:time(1)}];const out=merge(emptyData(),addToList([{name:'Milch',quantity:500,unit:'ml'}],'s','Nico',time(2),[],history).ops);assert.equal(milk(out).purchaseUnit,null);assert.equal(shoppingAmount(milk(out)),'500 ml');});

test('Einheiten merken: manuelle Grammwahl bleibt nach Umrechnen in Kilogramm erhalten',()=>{
  let d=merge(emptyData(),addToList([{name:'Mandeln',quantity:600,unit:'g',purchaseUnit:null,purchaseMeasure:'g',purchaseAt:time(1)}],'s','Nico',time(1)).ops);
  d=merge(d,addToList([{name:'Mandeln',quantity:800,unit:'g'}],'s','Nico',time(2),d.items).ops);
  assert.equal(d.items[0].quantity,1.4);assert.equal(d.items[0].unit,'kg');assert.equal(preferredPurchase('Mandeln',d.items).unit,'g');assert.equal(shoppingAmount(d.items[0]),'1.400 g');assert.equal(d.sync.minRev,8);
});
test('Einheiten merken: automatische Rezeptübernahmen und Abhaken verdrängen keine manuelle Wahl',()=>{
  const chosen={name:'Milch',unit:'ml',purchaseUnit:null,purchaseMeasure:'ml',purchaseAt:time(1),updatedAt:time(1)};
  const auto={name:'Milch',unit:'l',purchaseUnit:{label:'Packung',quantity:1,unit:'l'},purchaseAt:time(9),updatedAt:time(9)};
  assert.equal(preferredPurchase('Milch',[auto,chosen]).unit,'ml');assert.equal(preferredPurchase('Milch',[{...chosen,updatedAt:time(9)},auto]).unit,'ml');
  assert.equal(preferredPurchase('Bananen',[{...chosen,name:'Banane',purchaseMeasure:'kg',unit:'kg'}]).unit,'kg');
});
test('Einheiten merken: spätere bewusste Auswahl ersetzt die alte, auch beim Dazuzählen',()=>{
  const first={name:'Mandeln',quantity:600,unit:'g',purchaseUnit:null,purchaseMeasure:'g',purchaseAt:time(1)};
  let d=merge(emptyData(),addToList([first],'s','Nico',time(1)).ops);
  const second={...first,quantity:1,unit:'kg',purchaseMeasure:'kg',purchaseAt:time(2)};
  d=merge(d,addToList([second],'s','Nico',time(2),d.items).ops);assert.equal(d.items.length,1);assert.equal(preferredPurchase('Mandeln',d.items).unit,'kg');
  d=merge(d,addToList([{...first,quantity:100}],'s','Anna',time(3),d.items).ops);assert.equal(preferredPurchase('Mandeln',d.items).unit,'kg','alter Offline-Entwurf überschreibt jüngere Wahl nicht');assert.equal(d.items[0].quantity,1.7);
});
test('Einheiten merken: Aufräumen und JSON-Backup behalten die manuelle Maßeinheit',()=>{
  let d=merge(emptyData(),addToList([{name:'Mandeln',quantity:600,unit:'g',purchaseUnit:null,purchaseMeasure:'g',purchaseAt:time(1)}],'s','Nico',time(1)).ops);
  d=merge(d,addToList([{name:'Mandeln',quantity:800,unit:'g'}],'s','Nico',time(2),d.items).ops);
  const id=d.items[0].id;d=merge(d,[operation('items',id,{checked:true,deletedAt:time(3)},'Nico',time(3))]);
  const cleaned=compact(d,new Date('2026-12-30T12:00:00Z')).data;assert.equal(cleaned.items.length,0);assert.equal(preferredPurchase('Mandeln',cleaned.names).unit,'g');assert.equal(cleaned.sync.minRev,8);assert.doesNotThrow(()=>validate(JSON.parse(JSON.stringify(cleaned))));
});
test('Einheiten merken: Feldprüfung und ältere Dateien ohne neue Angaben',()=>{
  assert.doesNotThrow(()=>validate(emptyData()));let d=add(emptyData(),500);for(const purchaseMeasure of ['',123,'x'.repeat(31)])assert.throws(()=>merge(d,[operation('items',milk(d).id,{purchaseMeasure},'Nico',time(4))]),/Maßeinheit/);
});
test('Einheiten merken: echter Offline-Abgleich bewahrt jüngere Wahl in jeder Empfangsfolge',()=>{
  const first={name:'Mandeln',quantity:600,unit:'g',purchaseUnit:null,purchaseMeasure:'g',purchaseAt:time(1)};
  const shared=merge(emptyData(),addToList([first],'s','Nico',time(1)).ops),id=shared.items[0].id;
  const choice=operation('items',id,{purchaseUnit:null,purchaseMeasure:'kg',purchaseAt:time(2)},'Nico',time(2));
  // Auf Annas noch altem Gerät erzeugt: neuer Zuwachs, aber alte Einheitenwahl.
  const late=addToList([{...first,quantity:100}],'s','Anna',time(3),shared.items).ops;
  for(const out of [merge(merge(shared,[choice]),late),merge(merge(shared,late),[choice]),merge(shared,[...late,choice])]) {
    assert.equal(out.items[0].quantity,700);assert.equal(out.items[0].purchaseMeasure,'kg');assert.equal(out.items[0].purchaseAt,time(2));assert.equal(preferredPurchase('Mandeln',out.items).unit,'kg');
  }
});
test('Einheiten merken: exakt gleichzeitige Wahlen bleiben konsistent und die Angaben zusammengehörig',()=>{
  const shared=add(emptyData(),500),id=milk(shared).id;
  const a=operation('items',id,{purchaseUnit:{label:'Flasche',quantity:750,unit:'ml'},purchaseMeasure:'ml',purchaseAt:time(2)},'Nico',time(3));
  const b=operation('items',id,{purchaseUnit:null,purchaseMeasure:'l',purchaseAt:time(2)},'Anna',time(4));
  const x=milk(merge(merge(shared,[a]),[b])),y=milk(merge(merge(shared,[b]),[a]));
  assert.deepEqual([x.purchaseMeasure,x.purchaseUnit,x.purchaseAt],[y.purchaseMeasure,y.purchaseUnit,y.purchaseAt]);
  assert.ok((x.purchaseMeasure==='ml'&&x.purchaseUnit?.quantity===750)||(x.purchaseMeasure==='l'&&x.purchaseUnit===null));
});
