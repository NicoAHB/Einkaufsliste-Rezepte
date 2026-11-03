import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GROCERY_PRODUCTS,internationalProductLibrary,ownProduct,ownProductRemoval,productLibrary,filterProducts} from '../product-catalog.js';
import {INTERNATIONAL_CATEGORY,INTERNATIONAL_COUNTRIES,internationalProductGroups} from '../international-products.js';
import {emptyData,merge,operation,validate,SCHEMA_REV} from '../data.js';
import {compact} from '../compact.js';
import {normaliseBackup} from '../backup-restore.js';
import {imageForProduct} from '../product-images.js';
const at='2026-11-03T12:00:00.000Z';
test('international view groups real catalog IDs by countries and keeps physical grocery aisles',()=>{
 assert.equal(GROCERY_PRODUCTS.length,1056);assert.equal(INTERNATIONAL_COUNTRIES.length,14);
 for(const country of INTERNATIONAL_COUNTRIES)for(const id of country.products)assert.ok(GROCERY_PRODUCTS.some(p=>p.id===id),`${country.label}: ${id}`);
 const products=filterProducts(internationalProductLibrary(),{category:INTERNATIONAL_CATEGORY});assert.ok(products.length>=60);const groups=internationalProductGroups(products);assert.equal(groups[0].label,'China');assert.ok(groups.find(g=>g.id==='ua').matches.some(p=>p.id==='buchweizen'));assert.equal(products.find(p=>p.id==='buchweizen').category,'vorrat');assert.ok(filterProducts(productLibrary(),{query:'Japan'}).some(p=>p.id==='misopaste'));
});
test('Buckwheat automatically gains its local image, including earlier own entries; no old sheet positions change',async()=>{
 const product=productLibrary([{name:'Buchweizen',quantity:1,unit:'Stück',category:'sonstiges'}]).find(p=>p.name==='Buchweizen');assert.equal(product.own,false);const photo=imageForProduct(product);assert.equal(photo.kind,'product');assert.equal(photo.cell,0);assert.equal(photo.url,'assets/products/international-selection.webp');const image=await readFile(new URL('../assets/products/international-selection.webp',import.meta.url));assert.equal(image.subarray(8,12).toString(),'WEBP');assert.equal(GROCERY_PRODUCTS[1023].id,'kuehlakku');
});
test('only actual own products can be removed, even if a caller forges the own flag',()=>{
 assert.throws(()=>ownProductRemoval(GROCERY_PRODUCTS[0]),/Nur/);assert.throws(()=>ownProductRemoval(ownProduct('Äpfel')),/Nur/);assert.throws(()=>ownProductRemoval(ownProduct('Buchweizen')),/Nur/);assert.throws(()=>ownProductRemoval({...ownProduct('Keckd'),id:'aepfel'}),/Nur/);
 assert.equal(ownProductRemoval(ownProduct('Keckd')).id,'own-keckd');
});
test('deletion survives history, reload, favorites, a delayed device and compacting without erasing expenses or shopping entries',()=>{
 const product=ownProduct('Keckd'),removal=ownProductRemoval(product);let data=merge(emptyData(),[operation('items','existing',{name:'Keckd',quantity:1,unit:'Stück',checked:false,storeId:'',category:'sonstiges',deletedAt:null},'Nico',at)]);const before=JSON.stringify(data.items);data=merge(data,[operation('productRemovals',removal.id,removal.patch,'Nico',at)]);assert.equal(data.sync.minRev,17);assert.ok(SCHEMA_REV>=17);assert.equal(JSON.stringify(data.items),before);
 const late=operation('productFavorites','favorite-keckd',{name:'Keckd',productId:null,quantity:1,unit:'Stück',category:'sonstiges',deletedAt:null},'Other','2026-11-03T12:01:00.000Z');data=merge(data,[late]);data=JSON.parse(JSON.stringify(data));assert.doesNotThrow(()=>validate(data));assert.ok(!productLibrary(data.items,data.productFavorites,data.pantry,data.productRemovals).some(p=>p.name==='Keckd'));assert.ok(productLibrary(data.items,data.productFavorites,data.pantry,data.productRemovals).some(p=>p.id==='aepfel'));
 const cleaned=compact(data,new Date('2030-01-01T00:00:00Z')).data;assert.equal(cleaned.productRemovals.length,1);assert.equal(normaliseBackup(cleaned).productRemovals.length,1);
 const invalid=JSON.parse(JSON.stringify(data));invalid.productRemovals[0].id='aepfel';assert.throws(()=>validate(invalid),/Löschmarkierung/);
});

test('2.144: weitere Küchen mit vorhandenen Katalogbildern, deutsch sortiert; jedes Produkt hat ein eigenes Bild',()=>{
 const labels=INTERNATIONAL_COUNTRIES.map(country=>country.label);
 assert.deepEqual(labels,[...labels].sort((a,b)=>a.localeCompare(b,'de')),'Länder alphabetisch');
 assert.ok(labels.includes('Naher Osten & Nordafrika')&&labels.includes('USA & Kanada'));
 const lib=internationalProductLibrary(),byId=new Map(lib.map(p=>[p.id,p]));
 for(const [country,id] of [['it','mascarpone'],['in','ghee'],['mx','guacamole'],['cn','mie-nudeln'],['me','hummus'],['us','erdnussbutter'],['th','fischsauce']]){
  assert.ok(INTERNATIONAL_COUNTRIES.find(c=>c.id===country).products.includes(id),`${country}: ${id}`);
  assert.equal(imageForProduct(byId.get(id)).kind,'product',`${id} hat ein eigenes Katalogbild`);
 }
 for(const product of lib)assert.equal(imageForProduct(product).key,product.id,`${product.name}: Variantenfoto statt allgemeines Gruppenbild`);
 const custom=internationalProductLibrary([],[{id:'favorite-mie',productId:'mie-nudeln',name:'Mie-Nudeln',quantity:250,unit:'g',imageKey:'group-pantry'}]).find(p=>p.id==='mie-nudeln');assert.equal(imageForProduct(custom).key,'group-pantry','bewusst gewähltes Favoritenbild bleibt erhalten');
 for(const country of INTERNATIONAL_COUNTRIES)assert.equal(new Set(country.products).size,country.products.length,`${country.label} ohne Doppel`);
 const groups=internationalProductGroups(filterProducts(lib,{category:INTERNATIONAL_CATEGORY}));assert.equal(groups.length,14);assert.ok(groups.every(group=>group.matches.length>=3));
});
