import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyData,merge,operation,validate,SCHEMA_REV} from '../data.js';
import {compact} from '../compact.js';
import {normaliseBackup,makeRestoreOperation} from '../backup-restore.js';
import {summarizePeriod,spendingCsv} from '../spending.js';
import {addExpenseCategoryChanges,categorizedPurchases,defaultExpenseCategory,deleteExpenseCategoryChanges,expenseCategories,expenseCategoryId,expenseCategoryUsage,orderExpenseCategoryChanges,purchaseCategory} from '../expense-categories.js';
const time=n=>`2026-11-02T10:00:${String(n).padStart(2,'0')}.000Z`;
function apply(data,changes,n=10){return merge(data,changes.map((c,i)=>operation(c.collection,c.id,c.patch,'Test',time(n+i))));}
const record=(id,note,extra={})=>({id,date:'2026-10-10',cents:1250,note,storeId:'',source:'hand',buyerId:'member-nico',buyerName:'Nico',createdAt:time(0),updatedAt:time(0),deletedAt:null,_clock:{},...extra});
function fixture(){const data=emptyData();data.updatedAt=time(0);data.purchases=[record('a','Getränke'),record('b','Getränke',{kind:'refund',cents:250}),record('c','Getränke',{deletedAt:time(1)}),record('d','Haushalt')];return data;}
const id=name=>expenseCategoryId(name);
test('Legacy-Notizen bleiben Kategorien, ohne Originaldaten zu verändern; Großschreibung erzeugt keine Duplikate',()=>{
 const data=fixture();data.purchases.push(record('e','  GETRÄNKE  '),record('f','Meine alte Kategorie'));const before=structuredClone(data),catalog=expenseCategories(data);
 assert.equal(catalog.filter(c=>c.name==='Getränke').length,1);assert.ok(catalog.some(c=>c.name==='Meine alte Kategorie'));assert.equal(purchaseCategory(data,data.purchases[0]).id,id('Getränke'));assert.equal(defaultExpenseCategory(data).name,'Wocheneinkauf');assert.deepEqual(data,before);
});
test('Hinzufügen und Reihenfolge werden gemeinsam gespeichert; leere und doppelte Namen werden abgewiesen',()=>{
 let data=fixture();const created=addExpenseCategoryChanges(data,'Eigene Kategorie');data=apply(data,created.changes);assert.equal(expenseCategories(data).at(-1).name,'Eigene Kategorie');
 assert.throws(()=>addExpenseCategoryChanges(data,' eigene  Kategorie '),/bereits/);assert.throws(()=>addExpenseCategoryChanges(data,''));
 const order=expenseCategories(data).map(c=>c.id).reverse();data=apply(data,orderExpenseCategoryChanges(data,order),30);assert.deepEqual(expenseCategories(data).map(c=>c.id),order);assert.equal(data.sync.minRev,15);
 assert.throws(()=>orderExpenseCategoryChanges(data,order.slice(1)),/geändert/);
});
test('Verwendete Kategorie verlangt eine andere bestehende Kategorie; Beträge, Personen und Buchungsarten bleiben erhalten',()=>{
 const data=fixture(),source=id('Getränke'),target=id('Haushalt');assert.equal(expenseCategoryUsage(data,source).length,3);
 assert.throws(()=>deleteExpenseCategoryChanges(data,source,''),/andere/);assert.throws(()=>deleteExpenseCategoryChanges(data,source,source),/andere/);
 const after=apply(data,deleteExpenseCategoryChanges(data,source,target,time(2))),protectedFields=row=>Object.fromEntries(['id','date','cents','storeId','source','buyerId','buyerName','kind','deletedAt'].map(k=>[k,row[k]]));
 assert.deepEqual(after.purchases.map(protectedFields),data.purchases.map(protectedFields));assert.equal(after.purchases.length,data.purchases.length);assert.ok(after.purchases.slice(0,3).every(row=>row.categoryId===target&&row.note==='Haushalt'));
 assert.ok(!expenseCategories(after).some(c=>c.id===source));assert.equal(summarizePeriod(categorizedPurchases(after),'2026-10').total,summarizePeriod(data.purchases,'2026-10').total);assert.ok(!spendingCsv(categorizedPurchases(after)).includes('Getränke'));
});
test('Unbenutzte Kategorie lässt sich löschen und erscheint nicht erneut; Neu-Anlegen desselben Namens belebt alte Buchungen nicht wieder',()=>{
 let data=fixture();data=apply(data,deleteExpenseCategoryChanges(data,id('Grillen'),null,time(2)));assert.ok(!expenseCategories(data).some(c=>c.name==='Grillen'));
 data=apply(data,deleteExpenseCategoryChanges(data,id('Getränke'),id('Haushalt'),time(3)),20);const added=addExpenseCategoryChanges(data,'Getränke');assert.notEqual(added.id,id('Getränke'));data=apply(data,added.changes,30);
 assert.equal(expenseCategories(data).filter(c=>c.name==='Getränke').length,1);assert.equal(purchaseCategory(data,record('late','Getränke')).name,'Haushalt');assert.equal(purchaseCategory(data,record('new','Getränke',{categoryId:added.id})).name,'Getränke');
});
test('Spät eintreffende Offline-Buchungen folgen der Weiterleitung; Weiterleitungsketten und Zyklen verlieren keine Beträge',()=>{
 let data=fixture();data=apply(data,deleteExpenseCategoryChanges(data,id('Getränke'),id('Haushalt'),time(2)));
 const late=operation('purchases','late',record('late','Getränke',{categoryId:id('Getränke')}),'Anna',time(20));data=merge(data,[late]);assert.equal(purchaseCategory(data,data.purchases.find(row=>row.id==='late')).name,'Haushalt');
 data=apply(data,deleteExpenseCategoryChanges(data,id('Haushalt'),id('Sonstiges'),time(21)),30);assert.ok(categorizedPurchases(data).every(row=>row.note==='Sonstiges'));assert.equal(data.purchases.length,5);
 const initial=fixture(),a=deleteExpenseCategoryChanges(initial,id('Getränke'),id('Haushalt'),time(2)),b=deleteExpenseCategoryChanges(initial,id('Haushalt'),id('Getränke'),time(3));const cycle=apply(initial,[...a,...b],10);
 assert.ok(categorizedPurchases(cycle).every(row=>row.note==='Sonstiges'));assert.equal(cycle.purchases.length,4);
});
test('Kategorien und Weiterleitungen überstehen Aufräumen und Sicherung/Wiederherstellung; alte Apps werden geschützt',()=>{
 const data=apply(fixture(),deleteExpenseCategoryChanges(fixture(),id('Getränke'),id('Haushalt'),time(2))),clean=compact(data,new Date('2027-11-02T00:00:00Z')).data;
 assert.deepEqual(clean.expenseCategories,data.expenseCategories);assert.equal(purchaseCategory(clean,record('late','Getränke')).name,'Haushalt');const backup=normaliseBackup(data),restored=merge(emptyData(),[makeRestoreOperation(backup,data,'Test')]);assert.equal(purchaseCategory(restored,record('late','Getränke')).name,'Haushalt');assert.equal(restored.sync.minRev,15);assert.ok(SCHEMA_REV>=15);
 assert.throws(()=>validate({...data,expenseCategories:[{...data.expenseCategories[0],replacementId:data.expenseCategories[0].id}]}),/kategorie/i);
});
test('Lange ältere Notizen und ausdrücklich fehlende Kategorien bleiben lesbar',()=>{
 const data=fixture(),name='L'.repeat(200);data.purchases.push(record('long',name),record('empty','',{categoryId:null}));assert.equal(purchaseCategory(data,data.purchases.at(-2)).name,name);assert.equal(purchaseCategory(data,data.purchases.at(-1)),null);
 assert.doesNotThrow(()=>apply(data,orderExpenseCategoryChanges(data,expenseCategories(data).map(c=>c.id))));
});
