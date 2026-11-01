import assert from 'node:assert/strict';
import {test} from 'node:test';
import {privateListKey,readPrivateList,updatePrivateList,validatePrivateList} from '../private-list.js';
const store=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};};
const item=()=>({id:'only-mine',name:'Privates Geschenk',note:'Nur für mich',checked:false,createdAt:'2026-11-01T10:00:00.000Z'});

test('Geheime Liste: eigener Geräteschlüssel und getrennte Haushalte ohne Änderung gemeinsamer Daten',()=>{
  const storage=store();storage.setItem('einkauf-demo-v1','gemeinsame Daten');
  assert.deepEqual(readPrivateList(storage,'familie-a'),{version:1,enabled:false,items:[]});
  updatePrivateList(storage,'familie-a',data=>({...data,enabled:true,items:[item()]}));
  assert.equal(storage.getItem('einkauf-demo-v1'),'gemeinsame Daten');
  assert.equal(readPrivateList(storage,'familie-a').items[0].name,'Privates Geschenk');
  assert.deepEqual(readPrivateList(storage,'familie-b').items,[]);
  assert.notEqual(privateListKey('familie-a'),privateListKey('familie-b'));
});
test('Geheime Liste: zweites Gerät erhält weder Aktivierung noch Einträge',()=>{
  const a=store(),b=store();updatePrivateList(a,'familie',data=>({...data,enabled:true,items:[item()]}));
  assert.equal(readPrivateList(b,'familie').enabled,false);assert.deepEqual(readPrivateList(b,'familie').items,[]);
});
test('Geheime Liste: Ausschalten behält Notiz und Abhakzustand',()=>{
  const storage=store();updatePrivateList(storage,'familie',data=>({...data,enabled:true,items:[{...item(),checked:true}]}));
  updatePrivateList(storage,'familie',data=>({...data,enabled:false}));
  const restored=updatePrivateList(storage,'familie',data=>({...data,enabled:true}));assert.deepEqual(restored.items,[{...item(),checked:true}]);
});
test('Geheime Liste: Speicherfehler verändert weder gespeicherte Daten noch den alten sichtbaren Stand',()=>{
  const storage=store();const previous=updatePrivateList(storage,'familie',data=>({...data,enabled:true,items:[item()]})),text=storage.getItem(privateListKey('familie'));
  storage.setItem=()=>{throw new Error('voll');};
  assert.throws(()=>updatePrivateList(storage,'familie',data=>{data.items[0].name='Änderung';return data;}),/voll/);
  assert.equal(storage.getItem(privateListKey('familie')),text);assert.equal(previous.items[0].name,'Privates Geschenk');
});
test('Geheime Liste: beschädigte Daten werden nicht überschrieben',()=>{
  const storage=store(),key=privateListKey('familie');storage.setItem(key,'kaputte Datei');
  assert.throws(()=>readPrivateList(storage,'familie'),/nicht gelesen/);
  assert.throws(()=>updatePrivateList(storage,'familie',data=>({...data,enabled:true})),/nicht gelesen/);assert.equal(storage.getItem(key),'kaputte Datei');
});
test('Geheime Liste: ungültige Namen, Notizen und doppelte Kennungen werden nicht geschrieben',()=>{
  const storage=store();
  for(const items of [[{...item(),name:''}],[{...item(),name:'x'.repeat(121)}],[{...item(),note:'x'.repeat(1001)}],[item(),item()]])assert.throws(()=>updatePrivateList(storage,'familie',data=>({...data,items})),/beschädigt/);
  assert.equal(storage.values.size,0);assert.doesNotThrow(()=>validatePrivateList({version:1,enabled:true,items:[item()]}));
});
