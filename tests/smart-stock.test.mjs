import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyData,merge,operation,pantryKeys,pantryRows,validate,SCHEMA_REV} from '../data.js';
import {pantryChanges,pantrySelectionChanges} from '../pantry.js';
import {automaticStockChanges,autoStockEligible,consumeStockChanges,isAutomaticBasic,isOptionalBasic,nextStockBoundary,optionalRestockOperations,saveSmartStockChange,smartStockSaved,smartStockSettingChange,smartStockSettings,undoAutomaticStockChanges} from '../smart-stock.js';
import {recentPurchases} from '../recent-purchases.js';
import {namesFrom} from '../cookable.js';
import {compact} from '../compact.js';
import {makeRestoreOperation,normaliseBackup} from '../backup-restore.js';
const DAY=86400000,stamp='2026-11-02T14:00:00.000Z',now=Date.parse(stamp),at=n=>new Date(now+n*DAY).toISOString();
const item=(name='Bananen',extra={})=>({id:'buy-1',name,quantity:1,unit:'Stück',category:'obst',storeId:'',createdBy:'Nico',checked:true,shopBoughtAt:stamp,createdAt:stamp,updatedAt:stamp,deletedAt:null,_clock:{},...extra});
function apply(data,changes,time=stamp,actor='Nico'){return merge(data,changes.map(c=>operation(c.collection,c.id,c.patch,actor,time)));}
function enabled(days=1){return apply(emptyData(),[smartStockSettingChange({enabled:true,days})]);}
function bought(days=1){const data=enabled(days);data.items=[item()];return apply(data,automaticStockChanges(data,data.items[0],stamp));}
test('Smart Stock ist standardmäßig aus; Einstellungen sind gemeinsam, einzeln änderbar und validiert',()=>{
 const data=emptyData();assert.deepEqual(smartStockSettings(data),{enabled:false,days:7});assert.deepEqual(automaticStockChanges(data,item(),stamp),[]);
 const first=operation('stockSettings','smart-stock',{enabled:true},'Nico',stamp),second=operation('stockSettings','smart-stock',{days:3},'Anna',at(.1));const a=merge(merge(data,[first]),[second]),b=merge(merge(data,[second]),[first]);assert.deepEqual(a.stockSettings,b.stockSettings);assert.deepEqual(smartStockSettings(a),{enabled:true,days:3});assert.equal(a.sync.minRev,16);
 for(const patch of [{days:0},{days:8},{days:1.5},{enabled:'true'},{}])assert.throws(()=>smartStockSettingChange(patch));
});
test('Nur Lebensmittel gehen automatisch in den Vorrat; Haushalt, Drogerie, Sonstiges und unbekannte Kategorien bleiben draußen',()=>{
 for(const category of ['obst','brot','fleisch','kuehl','tiefkuehl','vorrat','gewuerze','snacks','getraenke'])assert.equal(autoStockEligible(item('Meine Zutat',{category})),true);
 for(const category of ['haushalt','sonstiges'])assert.equal(autoStockEligible(item('Bananen',{category})),false);
 assert.equal(autoStockEligible(item('Shampoo',{category:'obst'})),false);assert.equal(autoStockEligible(item('Unbekanntes Ding',{category:null})),false);assert.equal(autoStockEligible(item('Milch',{category:null})),true);
});
test('Grundvorratsprodukte wie Mehl und Nudeln bleiben unabhängig von der Dauer bis zum manuellen Aufbrauchen vorhanden',()=>{
 for(const name of ['Mehl','Weizenmehl','Nudeln','Spaghetti','Reis','Zucker','Salz','Essig','Olivenöl','Butter']){
  assert.equal(isAutomaticBasic(name),true,name);let data=enabled();const row=item(name,{category:name==='Milch'?'kuehl':'vorrat'});data.items=[row];data=apply(data,automaticStockChanges(data,row,stamp));assert.equal(data.pantry[0].autoStock.basic,true);assert.equal(data.pantry[0].autoStock.expiresAt,null);assert.equal(pantryKeys(data.pantry,now+90*DAY).size,1,name);assert.equal(recentPurchases(data.items,now+8*DAY).length,0);
  data=apply(data,consumeStockChanges(data,name,at(2)),at(2));assert.equal(pantryKeys(data.pantry,now+2*DAY).size,0);assert.ok(data.items[0].stockConsumedAt);
 }
 assert.equal(isAutomaticBasic('Bananen'),false);
 for(const name of ['Milch','Eier','Kartoffeln','Zwiebeln','Knoblauch']){
  assert.equal(isAutomaticBasic(name),false,name);const row=item(name,{category:['Milch','Eier','Butter'].includes(name)?'kuehl':'obst'}),data=enabled();data.items=[row];const after=apply(data,automaticStockChanges(data,row,stamp));assert.equal(after.pantry[0].autoStock.expiresAt,at(1));assert.equal(pantryKeys(after.pantry,now+DAY).size,0);
 }
});
test('Alle sieben Ablaufzeiten entfernen automatische Bestände exakt beim Ablauf, ohne Rohdaten oder Historie zu löschen',()=>{
 for(let days=1;days<=7;days++){const data=bought(days),before=structuredClone(data);assert.equal(pantryKeys(data.pantry,now+days*DAY-1).size,1);assert.equal(pantryKeys(data.pantry,now+days*DAY).size,0);assert.equal(pantryRows(data.pantry,now+days*DAY)[0].available,false);assert.deepEqual(data,before);assert.equal(data.pantry[0].autoStock.expiresAt,at(days));assert.equal(recentPurchases(data.items,now+Math.min(days,6)*DAY).length,1);}
});
test('Manueller Vorrat bleibt ohne Ablauf; automatische Herkunft gewinnt auch bei gleichzeitiger Anlage nicht gegen vorhandenen manuellen Vorrat',()=>{
 let data=enabled();data=apply(data,pantryChanges(['Bananen']).map(c=>({...c,collection:'pantry'})),at(-1));assert.deepEqual(automaticStockChanges(data,item(),stamp),[]);
 const automatic=automaticStockChanges(enabled(),item(),stamp);data=apply(data,automatic);assert.equal(pantryKeys(data.pantry,now+8*DAY).size,1);assert.equal(pantryRows(data.pantry,now+8*DAY)[0].autoStock,undefined);
});
test('Manuell bestätigtes Wiederauffüllen macht abgelaufenen automatischen Vorrat dauerhaft, ohne Bild oder IDs zu verlieren',()=>{
 let data=bought();data.pantry[0].imageKey='group-fruit';const id=data.pantry[0].id;const changes=pantrySelectionChanges([{name:'Bananen',pantryAvailable:true}],data.pantry);data=apply(data,changes.map(c=>({...c,collection:'pantry'})),at(2));assert.equal(data.pantry[0].id,id);assert.equal(data.pantry[0].autoStock,null);assert.equal(data.pantry[0].imageKey,'group-fruit');assert.equal(pantryKeys(data.pantry,now+30*DAY).size,1);
});
test('Aufbrauchen entfernt sofort alle Bestände eines Namens, bewahrt jeden Kauf und markiert auch Nicht-Lebensmittel in der Historie',()=>{
 let data=bought();data.items.push(item('BANANE',{id:'buy-2'}),item('Shampoo',{id:'drug',category:'haushalt'}));data=apply(data,pantryChanges(['Bananen']).map(c=>({...c,collection:'pantry'})),at(.01));const before=structuredClone(data.items);data=apply(data,consumeStockChanges(data,'Banane',at(.1)),at(.1));assert.equal(pantryKeys(data.pantry,now+.1*DAY).size,0);
 assert.deepEqual(data.items.map(row=>({id:row.id,quantity:row.quantity,shopBoughtAt:row.shopBoughtAt,checked:row.checked})),before.map(row=>({id:row.id,quantity:row.quantity,shopBoughtAt:row.shopBoughtAt,checked:row.checked})));assert.ok(data.items.slice(0,2).every(row=>row.stockConsumedAt===at(.1)));assert.equal(recentPurchases(data.items,now+.1*DAY).length,2);
 data=apply(data,consumeStockChanges(data,'Shampoo',at(.2)),at(.2));assert.equal(data.items.at(-1).stockConsumedAt,at(.2));assert.equal(data.pantry.some(row=>row.name==='Shampoo'),false);
});
test('Ein erneuter Einkauf verlängert nur automatischen Vorrat; Rückgängig entfernt ausschließlich die zugehörige Übernahme',()=>{
 let data=bought();const old=data.items[0];const next=item('Bananen',{id:'buy-new',shopBoughtAt:at(.5)});data.items.push(next);data=apply(data,automaticStockChanges(data,next,at(.5)),at(.5));assert.equal(data.pantry.length,1);assert.equal(data.pantry[0].autoStock.expiresAt,at(1.5));assert.deepEqual(undoAutomaticStockChanges(data,old),[]);
 data=apply(data,undoAutomaticStockChanges(data,next),at(.6));assert.equal(pantryKeys(data.pantry,now+.6*DAY).size,0);assert.equal(data.items.length,2);
 const manual=apply(bought(),pantryChanges(['Bananen'],bought().pantry).map(c=>({...c,collection:'pantry'})),at(.5));assert.deepEqual(undoAutomaticStockChanges(manual,old),[]);
});
test('Ausschalten beendet nur künftige Übernahmen; Änderungen der Dauer ändern vorhandene Ablaufzeiten nicht rückwirkend',()=>{
 const before=bought(2),disabled=apply(before,[smartStockSettingChange({enabled:false,days:7})],at(.1));assert.deepEqual(disabled.pantry,before.pantry);assert.deepEqual(automaticStockChanges(disabled,item('Milch',{id:'next',category:'kuehl'}),at(.2)),[]);assert.equal(disabled.pantry[0].autoStock.expiresAt,at(2));
});
test('Die Kaufhistorie enthält alle Kategorien unabhängig vom Bestand und endet exakt nach sieben Tagen',()=>{
 const rows=[item(),item('Shampoo',{id:'drug',category:'haushalt',stockConsumedAt:at(.1)}),item('Unbekannt',{id:'other',category:'sonstiges'})];assert.equal(recentPurchases(rows,now+7*DAY-1).length,3);assert.equal(recentPurchases(rows,now+7*DAY).length,0);
});
test('Abgelaufener Vorrat zählt nicht bei Rezepten; Aufräumen und Sicherung bewahren Ablaufzeit und Einstellungen',()=>{
 const data=bought(),clean=compact(data,new Date(at(2))).data,restored=apply(emptyData(),[]);assert.deepEqual(clean.pantry,data.pantry);assert.deepEqual(clean.stockSettings,data.stockSettings);
 const snapshot=normaliseBackup(data),backup=merge(restored,[makeRestoreOperation(snapshot,data,'Nico')]);assert.equal(backup.sync.minRev,16);assert.equal(backup.pantry[0].autoStock.expiresAt,at(1));assert.equal(pantryKeys(backup.pantry,now+3*DAY).size,0);assert.ok(SCHEMA_REV>=16);
 const realNow=Date.now,expired=bought();try{Date.now=()=>now+2*DAY;assert.deepEqual(namesFrom({pantry:expired.pantry}).have,[]);}finally{Date.now=realNow;}
});
test('Zeitgrenzen liefern Ablauf und Historienende für sichtbare Aktualisierung, ohne Datensätze zu verändern',()=>{
 const data=bought();assert.ok(nextStockBoundary(data,now)>now);assert.ok(nextStockBoundary(data,now)<=now+DAY);assert.equal(nextStockBoundary(data,now+8*DAY),null);assert.equal(nextStockBoundary(emptyData(),now),null);
});
test('Ungültige Ablaufzeiten und Kaufstatus werden beim Einlesen abgewiesen',()=>{
 const data=bought();for(const patch of [{expiresAt:at(-1)},{expiresAt:at(8)},{purchaseId:''}]){const broken=structuredClone(data);Object.assign(broken.pantry[0].autoStock,patch);assert.throws(()=>validate(broken),/Ablaufzeit/);}const broken=structuredClone(data);broken.items[0].stockConsumedAt='ungültig';assert.throws(()=>validate(broken));
});
test('Optionale Grundvorräte landen beim Aufbrauchen einmalig auf dem Einkaufszettel; vorhandene offene Mengen bleiben unverändert',()=>{
 for(const name of ['Nudeln','Tomatenmark','Butter']){
  assert.equal(isOptionalBasic(name),true);let data=enabled();data.stores=[{id:'edeka',name:'Edeka',createdAt:stamp,updatedAt:stamp,deletedAt:null,_clock:{}}];data.items=[item(name,{category:name==='Butter'?'kuehl':'vorrat',storeId:'edeka'})];data=apply(data,automaticStockChanges(data,data.items[0],stamp));
  const product={name,quantity:2,unit:'Stück'},ops=optionalRestockOperations(data,product,'Nico',at(.1)),consumed=apply(data,consumeStockChanges(data,name,at(.1)),at(.1)),after=merge(consumed,ops);const open=after.items.filter(row=>!row.checked&&!row.deletedAt);assert.equal(open.length,1);assert.equal(open[0].quantity,2);assert.equal(open[0].storeId,'edeka');assert.equal(pantryKeys(after.pantry,now+.1*DAY).size,0);assert.ok(after.items.find(row=>row.id==='buy-1').stockConsumedAt);
  assert.deepEqual(optionalRestockOperations(after,product,'Anna',at(.2)),[]);assert.equal(after.items.find(row=>!row.checked).quantity,2);
 }
 assert.equal(isOptionalBasic('Mehl'),false);assert.deepEqual(optionalRestockOperations(enabled(),{name:'Mehl',quantity:1,unit:'kg'},'Nico',stamp),[]);
});
test('Gleichzeitiges Aufbrauchen optionaler Grundvorräte erzeugt dieselbe Übernahme; ein neuer Auffüllzyklus bleibt möglich',()=>{
 let data=enabled();data.items=[item('Nudeln',{category:'vorrat'})];data=apply(data,automaticStockChanges(data,data.items[0],stamp));const product={name:'Nudeln',quantity:1,unit:'Stück'},a=optionalRestockOperations(data,product,'Nico',at(.1)),b=optionalRestockOperations(data,product,'Anna',at(.2));assert.equal(a[0].id,b[0].id);assert.equal(a[0].entityId,b[0].entityId);let after=merge(data,[...a,...b]);assert.equal(after.items.filter(row=>!row.checked&&!row.deletedAt).length,1);assert.equal(after.items.find(row=>!row.checked).quantity,1);
 const boughtAgain=after.items.find(row=>!row.checked);after=apply(after,[{collection:'items',id:boughtAgain.id,patch:{checked:true,shopBoughtAt:at(1)}},...automaticStockChanges(after,boughtAgain,at(1))],at(1));const next=optionalRestockOperations(after,product,'Nico',at(1.1));assert.equal(next.length,1);assert.notEqual(next[0].entityId,a[0].entityId);
});
test('Explizites Speichern hält Datum und Nutzer gemeinsam fest und verändert nur gewählte Einstellungen',()=>{
 const data=enabled(2),change=saveSmartStockChange(data,{days:3},'Nico',at(.1));assert.equal(change.patch.enabled,undefined);assert.deepEqual(change.patch.saved,{by:'Nico',at:at(.1)});const after=apply(data,[change],at(.1));assert.deepEqual(smartStockSettings(after),{enabled:true,days:3});assert.deepEqual(smartStockSaved(after),{by:'Nico',at:at(.1)});assert.deepEqual(after.pantry,data.pantry);assert.deepEqual(after.items,data.items);
 const initial=apply(emptyData(),[saveSmartStockChange(emptyData(),{},'Nico',stamp)]);assert.deepEqual(smartStockSettings(initial),{enabled:false,days:7});assert.equal(initial.stockSettings[0].days,7);assert.equal(initial.stockSettings[0].enabled,false);assert.equal(smartStockSaved(initial).by,'Nico');
});
test('Alte Einstellungen ohne Nachweis lassen sich bestätigen; spätere Änderungen alter Apps erhalten keinen falschen Speichernamen',()=>{
 let data=enabled(2);assert.equal(smartStockSaved(data),null);data=apply(data,[saveSmartStockChange(data,{},'Nico',at(.1))],at(.1));assert.equal(smartStockSaved(data).by,'Nico');data=apply(data,[smartStockSettingChange({days:4})],at(.2),'Anna');assert.equal(smartStockSaved(data),null);data=apply(data,[saveSmartStockChange(data,{},'Anna',at(.3))],at(.3),'Anna');assert.equal(smartStockSaved(data).by,'Anna');assert.equal(smartStockSettings(data).days,4);
});
test('Parallele Speichervorgänge bewahren unabhängige Einstellungen und einen zusammengehörigen Speichernachweis',()=>{
 const data=enabled(2),a=saveSmartStockChange(data,{days:3},'Nico',at(.1)),b=saveSmartStockChange(data,{enabled:false},'Anna',at(.2));const ops=[operation(a.collection,a.id,a.patch,'Nico',at(.1)),operation(b.collection,b.id,b.patch,'Anna',at(.2))],left=merge(data,ops),right=merge(merge(data,[ops[1]]),[ops[0]]);assert.deepEqual(left.stockSettings,right.stockSettings);assert.deepEqual(smartStockSettings(left),{enabled:false,days:3});assert.equal(smartStockSaved(left).by,'Anna');
});
test('Ungültige Speichernachweise werden zurückgewiesen',()=>{
 for(const [name,time]of [['',stamp],['Nico','kaputt']])assert.throws(()=>saveSmartStockChange(emptyData(),{},name,time));const data=enabled();data.stockSettings[0].saved={at:stamp,by:42};assert.throws(()=>validate(data),/Speichernachweis/);
});
