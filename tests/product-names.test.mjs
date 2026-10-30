import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeNameMatcher } from '../product-names.js';
import { GROCERY_PRODUCTS, filterProducts } from '../product-catalog.js';
import { GROCERY_NAMES } from '../grocery-names.js';
import { filterPantry } from '../pantry.js';
const match = makeNameMatcher([...GROCERY_NAMES, ...GROCERY_PRODUCTS]);
test('Tippfehler: eindeutige Buchstabendreher und ein fehlender/doppelter Buchstabe werden erkannt', () => {
  for (const [typed, name] of [['Tmoaten','Tomaten'],['Mlich','Milch'],['Spagetti','Spaghetti'],['Joguhrt','Joghurt'],['Zuchini','Zucchini'],['Toiletenpapier','Toilettenpapier'],['Kochschinkne','Kochschinken'],['Rote Zweibeln','Rote Zwiebeln']]) assert.equal(match(typed).correction, name, typed);
});
test('Tippfehler: verschiedene mögliche Produkte werden vorgeschlagen und nicht automatisch entschieden', () => {
  const result = makeNameMatcher(['Milch','Mulch'])('Mylch'); assert.equal(result.correction, null); assert.deepEqual(new Set(result.suggestions), new Set(['Milch','Mulch']));
});
test('Tippfehler: kurze Namen, Sorten, Zahlen, Modelle, Marken und komplette Zusätze bleiben erhalten', () => {
  for (const name of ['Ei','Eis','Reis','Mehl','Apfel','Zwiebel','Apfeltasche','Apfelsaft','Gala Apfel','Pink Lady Apfel','Bio Tmoaten','Coca Cola 0,5 l','TV 55 Zoll','Domol Feinwaschmittel','Salz & Pfeffer','Hafermilch']) assert.equal(match(name).name, name, name);
});
test('Tippfehler: eigene genaue Produktnamen sind geschützt, neue eigene Namen kommen ohne Pflege hinzu', () => {
  const own = makeNameMatcher(['Milch','Meine Hausmischung','Mylk']); assert.equal(own('Mylk').correction, null); assert.equal(own('Meine Hausmischugn').correction,'Meine Hausmischung'); assert.equal(own('Mein neuer eigener Artikel').name,'Mein neuer eigener Artikel');
});
test('Tippfehler: bekannte deutsche Schreibweisen und Ein-/Mehrzahl brauchen keine neue Zuordnung', () => {
  for (const name of ['Tomate','Zwiebel','Aepfel','Olivenoel','Käse','Nudel']) assert.equal(match(name).correction, null,name);
});
test('Tippfehlersuche respektiert Kategorie, Favoriten und Vorratsstatus', () => {
  assert.ok(filterProducts(GROCERY_PRODUCTS,{query:'Tmoaten'}).some(row=>row.id==='tomaten'));
  assert.deepEqual(filterProducts(GROCERY_PRODUCTS,{query:'Tmoaten',category:'haushalt'}),[]);
  assert.deepEqual(filterProducts(GROCERY_PRODUCTS,{query:'Tmoaten',mode:'favorites'}),[]);
  const rows=[{id:'a',name:'Tomaten',available:true},{id:'b',name:'Toilettenpapier',available:false}];
  assert.deepEqual(filterPantry(rows,{query:'Tmoaten'}).map(row=>row.name),['Tomaten']); assert.deepEqual(filterPantry(rows,{query:'Toiletenpapier',status:'available'}),[]);
});
