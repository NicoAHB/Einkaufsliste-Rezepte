import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {clone,emptyData,merge,operation,validate} from '../data.js';
import {decodeBackup,makeRestoreOperation,backupCounts} from '../backup-restore.js';
import {makeZip,readZip} from '../zip.js';
import {compact} from '../compact.js';
const demo=JSON.parse(await readFile(new URL('../beispieldaten.json',import.meta.url),'utf8'));
const blank=()=>({...emptyData(),updatedAt:demo.updatedAt});
const enc=s=>new TextEncoder().encode(s),time=n=>`2026-11-01T12:00:${String(n).padStart(2,'0')}.000Z`;
const op=(collection,id,patch,n)=>operation(collection,id,patch,'Test',time(n));
const restore=(snapshot,current,n=20)=>makeRestoreOperation(snapshot,current,'Test',Date.parse(time(n)));
const semantic=data=>Object.fromEntries(Object.entries(data).filter(([k])=>k!=='sync').map(([k,v])=>[k,Array.isArray(v)?v.toSorted((a,b)=>a.id.localeCompare(b.id)):v]));
test('JSON und ZIP übernehmen Daten, Mengenmetadaten und nur referenzierte Fotos',()=>{
 const snapshot=clone(demo),id='backup-photo-0001';snapshot.recipes[0].photoId=id;
 const bytes=enc(JSON.stringify(snapshot)),jpeg=Uint8Array.of(255,216,255,224,0);
 const json=decodeBackup(bytes,'alt.json');assert.equal(json.photos.size,0);assert.equal(backupCounts(json.data).find(r=>r.key==='recipes').count,snapshot.recipes.length);
 const zip=makeZip([{name:'daten.json',data:bytes},{name:`fotos/${id}.jpg`,data:jpeg},{name:'fotos/unused-photo.jpg',data:jpeg}]);
 assert.deepEqual([...decodeBackup(zip,'sicherung.zip').photos.keys()],[id]);assert.throws(()=>decodeBackup(enc('{}'),'falsch.json'),/Datenversion/);
 assert.throws(()=>decodeBackup(makeZip([{name:'daten.json',data:bytes},{name:`fotos/${id}.jpg`,data:enc('kein Foto')}]),'x.zip'),/Rezeptfoto/);
});
test('ZIP lehnt manipulierte Längen, Pfade, fehlende Daten und defekte Prüfsummen ab',()=>{
 const zip=makeZip([{name:'daten.json',data:enc(JSON.stringify(demo))}]);const corrupt=zip.slice();corrupt[45]^=1;assert.throws(()=>decodeBackup(corrupt,'x.zip'));
 for(const n of [0,1,10,zip.length-1])assert.throws(()=>readZip(zip.slice(0,n)));
 const length=zip.slice(),v=new DataView(length.buffer);v.setUint32(22,0xffffffff,true);assert.throws(()=>readZip(length));
 assert.throws(()=>decodeBackup(makeZip([{name:'x.txt',data:enc('x')}]),'x.zip'),/daten.json/);
});
test('Wiederherstellung ersetzt bewusst den gesamten Stand, ist idempotent und blockiert ältere Offline-Änderungen',()=>{
 const snapshot=clone(demo),current=merge(snapshot,[op('items','neu',{name:'Extra',quantity:1,unit:'Stück',storeId:'',checked:false,createdBy:'Nico'},1)]);
 const r=restore(snapshot,current),once=merge(current,[r]);assert.ok(!once.items.some(row=>row.id==='neu'));assert.equal(once.sync.minRev,14);assert.deepEqual(merge(once,[r]),once);
 const old=op('items','zurueck',{name:'Alt',quantity:1,unit:'Stück',storeId:'',checked:false,createdBy:'Nico'},2);
 assert.ok(!merge(once,[old]).items.some(row=>row.id==='zurueck'));assert.doesNotThrow(()=>validate(once));
});
test('Jüngere Feldänderungen und additive Mengen ergeben unabhängig von der Reihenfolge denselben Stand',()=>{
 const snapshot=clone(demo),id=snapshot.items[0].id;
 const current=merge(snapshot,[op('items',id,{name:'Vorher geändert',quantity:20},1)]),r=restore(snapshot,current);
 const late=[op('items',id,{checked:true},30),op('items',id,{add:{quantity:2,unit:snapshot.items[0].unit}},31)];
 const expected=merge(current,[r,...late]);
 for(const order of [[...late,r],[r,...late],[late[1],r,late[0]]]){
   let state=current;for(const single of order)state=merge(state,[single]);assert.deepEqual(semantic(state),semantic(expected));
 }
 assert.equal(expected.items.find(row=>row.id===id).name,snapshot.items[0].name);
});
test('Ein ausdrücklich jüngerer Mengen-Reset bleibt nach Wiederherstellung bestehen',()=>{
 const snapshot=clone(demo),id=snapshot.items[0].id,current=merge(snapshot,[op('items',id,{add:{quantity:3,unit:snapshot.items[0].unit}},1)]),r=restore(snapshot,current);
 const set=op('items',id,{quantity:7},30);assert.deepEqual(semantic(merge(merge(current,[set]),[r])),semantic(merge(current,[r,set])));
});
test('Neue Datensätze bleiben in beiden Abgleichreihenfolgen erhalten, ältere fehlende Datensätze kommen nicht zurück',()=>{
 const snapshot=blank(),current=clone(demo),r=restore(snapshot,current),late=op('items','spaeter',{name:'Neu',quantity:1,unit:'Stück',storeId:'',checked:false,createdBy:'Nico'},30);
 assert.deepEqual(semantic(merge(merge(current,[late]),[r])),semantic(merge(current,[r,late])));
 assert.equal(merge(current,[r,late]).items.length,1);
});
test('Eine zweite Wiederherstellung gewinnt deterministisch; Aufräumen behält die Grenze',()=>{
 const a=clone(demo),b=blank(),r1=restore(a,a),r2=restore(b,a,25);
 assert.deepEqual(semantic(merge(merge(a,[r2]),[r1])),semantic(merge(a,[r1,r2])));
 const cleaned=compact(merge(a,[r2]),new Date('2027-01-01T00:00:00Z')).data;assert.deepEqual(cleaned.sync.restore,{id:r2.id,at:r2.at});
});

test('Quellenbezogene Wochenplan-Rücknahmen und manuelle Mengen bleiben beim Zurückholen erhalten',async()=>{
 const {addToList}=await import('../data.js');const {planReduction}=await import('../plan-list.js');
 let data=blank();data=merge(data,addToList([{name:'Reis',quantity:100,unit:'g'}],'','Nico',time(1)).ops);
 const additions=addToList([{name:'Reis',quantity:400,unit:'g',key:'reis'}],'','Nico',time(2),data.items,data.items,'meal');for(const entry of additions.ops)entry.patch.planLinked=true;
 data=merge(data,additions.ops);const source=additions.ops[0],item=data.items[0],amount=source.patch.add||source.patch;
 const meal={id:'meal',recipeId:'r',servings:4,listedServings:4,listedParts:[{itemId:item.id,sourceId:source.id,name:item.name,storeId:'',at:source.at,quantity:amount.quantity,unit:amount.unit,remaining:amount.quantity}]};
 const cuts=planReduction(meal,{recipeId:'r',servings:2},data.items).changes.map(({item,part,cut})=>op('items',item.id,{cutPlan:{...cut,originalQuantity:part.quantity}},30));
 const r=restore(data,data);assert.deepEqual(semantic(merge(merge(data,cuts),[r])),semantic(merge(data,[r,...cuts])));assert.equal(merge(data,[r,...cuts]).items[0].quantity,300);
 const snapshot=merge(data,cuts),again=merge(blank(),[restore(snapshot,snapshot,40)]);assert.equal(again.items[0].quantity,300);assert.deepEqual(again.items[0]._planCuts,snapshot.items[0]._planCuts);
});
test('Unbrauchbare Zeitangaben werden vor jeder Wiederherstellung abgelehnt',()=>{
 const bad=clone(demo);bad.items[0].createdAt='kein Datum';assert.throws(()=>decodeBackup(enc(JSON.stringify(bad)),'alt.json'),/Zeitangaben|Ungültiger Eintrag/);
});

test('Wiederherstellung verwirft Aufräum-Marken mit ungültig gewordenen Listenpositionen',()=>{
 const snapshot=clone(demo);snapshot.sync.applied=['alt'];snapshot.sync.marks=[{at:'2025-01-01T00:00:00.000Z',n:1}];
 const current=merge(clone(demo),[op('items',demo.items[0].id,{checked:true},30)]),r=restore(snapshot,demo);
 const out=merge(current,[r]);assert.equal(out.sync.marks,undefined);assert.ok(out.sync.applied.includes(current.sync.applied.at(-1)));
 const tidy=compact(out,new Date(time(40))).data;assert.ok(tidy.sync.applied.includes(current.sync.applied.at(-1)));
});

test('Zeitgleiche Neuanlage und Wiederherstellung entscheiden auch in umgekehrter Reihenfolge nach der Operations-ID',()=>{
 const snapshot=clone(demo);snapshot.items=[];const r=restore(snapshot,demo);
 for(const id of ['z-creation','!creation']) {
   const create={...op('items','gleichzeitig',{name:'Zeitgleich',quantity:1,unit:'Stück',storeId:'',checked:false,createdBy:'Test'},20),at:r.at,id};
   const before=merge(merge(demo,[create]),[r]),after=merge(merge(demo,[r]),[create]);assert.deepEqual(semantic(before),semantic(after));
   assert.equal(after.items.length,id==='z-creation'?1:0);
 }
});
