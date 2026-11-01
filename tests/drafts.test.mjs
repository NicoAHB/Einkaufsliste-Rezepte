import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDraftStore,draftStorageKey,LEGACY_DRAFT_KEY} from '../drafts.js';
const now=Date.parse('2026-11-01T12:00:00Z');
const entry=name=>({at:new Date(now).toISOString(),state:{name}});
function memory(){const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,String(val)),removeItem:key=>map.delete(key)};}
test('Entwürfe sind je Verbindung getrennt und nach einem Neustart wieder verfügbar',()=>{
 const s=memory(),a=createDraftStore(s,'A',()=>now);a.write('A',{new:entry('A')});a.write('B',{new:entry('B')});
 const b=createDraftStore(s,'B',()=>now);assert.equal(b.read('B').new.state.name,'B');assert.equal(b.read('A').new.state.name,'A');assert.deepEqual(b.read('C'),{});
 assert.notEqual(draftStorageKey('a/b'),draftStorageKey('a%2Fb'));
});
test('Alte Entwürfe werden einmalig ihrer ursprünglichen Verbindung zugeordnet',()=>{
 const s=memory();s.setItem(LEGACY_DRAFT_KEY,JSON.stringify({new:entry('alt')}));createDraftStore(s,'A',()=>now).migrateLegacy();
 const b=createDraftStore(s,'B',()=>now);b.migrateLegacy();assert.deepEqual(b.read('B'),{});assert.equal(b.read('A').new.state.name,'alt');assert.equal(s.getItem(LEGACY_DRAFT_KEY),null);
});
test('Bei vollem Speicher bleibt der alte Entwurf erhalten und erscheint nicht in einer anderen Verbindung',()=>{
 const s=memory();s.setItem(LEGACY_DRAFT_KEY,JSON.stringify({new:entry('alt')}));const write=s.setItem;s.setItem=(key,value)=>{if(key.startsWith('einkauf-recipe-drafts-v2:'))throw new Error('Quota');write(key,value);};
 const a=createDraftStore(s,'A',()=>now);assert.throws(()=>a.migrateLegacy(),/nicht gespeichert/);assert.ok(s.getItem(LEGACY_DRAFT_KEY));assert.equal(a.read('A').new.state.name,'alt');
 const b=createDraftStore(s,'B',()=>now);assert.deepEqual(b.read('B'),{});assert.throws(()=>b.write('B',{new:entry('B')}),/Fenster offen lassen/);
 s.setItem=write;b.migrateLegacy();assert.equal(b.read('A').new.state.name,'alt');assert.deepEqual(b.read('B'),{});
});
test('Beschädigte Entwürfe werden nicht still überschrieben, alte Einträge laufen nach 30 Tagen aus',()=>{
 const s=memory(),store=createDraftStore(s,'A',()=>now);s.setItem(draftStorageKey('A'),'{kaputt');assert.throws(()=>store.read('A'));assert.equal(s.getItem(draftStorageKey('A')),'{kaputt');
 s.setItem(draftStorageKey('A'),JSON.stringify({old:{at:'2025-01-01',state:{}},new:entry('neu')}));assert.deepEqual(Object.keys(store.read('A')),['new']);
});
