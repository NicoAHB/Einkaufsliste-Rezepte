import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import {emptyData,merge,operation,pantryKeys,inPantry,sameIngredient,sameProduct,validate} from '../data.js';
import {canonicalProductName,ingredientProductName,productGroupMigration,PRODUCT_FAMILIES,reuseProductNames} from '../product-groups.js';
import {imageForProduct} from '../product-images.js';
import {productLibrary,filterProducts} from '../product-catalog.js';
import {availability,indexNames} from '../cookable.js';
import {aggregateIngredients,shoppingDeficits} from '../plan.js';
import {summarizePeriod} from '../spending.js';
import {wishGroup,wishImage} from '../wish-images.js';
import {fetchRecipePage} from '../page-source.js';

const at='2026-11-01T10:00:00.000Z';
const old=(id,name,extra={})=>({id,name,createdAt:at,updatedAt:at,deletedAt:null,...extra});
const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;});

test('Produktgruppen: jede bekannte Variante findet genau eine Kachel und ihr lokales Bild bleibt erreichbar',()=>{
  const library=productLibrary();
  assert.equal(library.length,712);assert.equal(new Set(library.map(row=>row.name)).size,library.length);
  for(const group of PRODUCT_FAMILIES) {
    assert.equal(library.filter(row=>row.name===group.name).length,1);assert.equal(imageForProduct({name:group.name}).key,group.id);
    for(const name of group.aliases) assert.ok(filterProducts(library,{query:name}).some(row=>row.name===group.name),`${name} → ${group.name}`);
  }
  for(const [name,wanted] of [['Grüne Oliven','Oliven'],['Schwarze Oliven','Oliven'],['Rapsöl','Öl'],['Gummibärchen','Süßigkeiten']]) assert.equal(canonicalProductName(name),wanted);
  assert.notEqual(canonicalProductName('Milch'),canonicalProductName('Käse'));
  assert.notEqual(canonicalProductName('Glutenfreie Nudeln'),canonicalProductName('Nudeln'));
  assert.notEqual(canonicalProductName('Passierte Tomaten'),canonicalProductName('Tomaten'));
});

test('Produktgruppen: Migration bewahrt IDs, Mengen, Notizen, Bildwahl, gelöschte Zeilen und spätere freie Eingaben',()=>{
  const data=emptyData();data.updatedAt=at;
  data.items=[old('a','Oliven schwarz',{quantity:2,unit:'Glas',storeId:'laden',checked:false,createdBy:'Nico',wishNote:'Marke behalten',imageKey:'oliven-schwarz'})];
  data.pantry=[old('green','Oliven grün',{available:true}),old('black','Oliven schwarz',{available:false})];
  data.recipes=[old('recipe','Salat',{servings:2,instructions:'Mischen',tags:[]})];
  data.ingredients=[old('ingredient','Oliven schwarz',{quantity:100,unit:'g',recipeId:'recipe'})];
  data.productFavorites=[old('favorite','Oliven schwarz',{quantity:2,unit:'Glas',productId:'oliven-schwarz'})];
  data.meals=[old('meal',undefined,{date:'2026-11-03',recipeId:'recipe',servings:2,listedRows:['Oliven schwarz|100|g'],listedParts:[{itemId:'a',sourceId:'take-a',name:'Oliven schwarz',quantity:2,remaining:2,unit:'Glas',storeId:'laden',at}]})];
  const before=structuredClone(data),ops=productGroupMigration(data),migrated=merge(data,ops);
  assert.deepEqual(data,before);assert.equal(migrated.items[0].name,'Oliven');
  assert.deepEqual(['id','quantity','unit','storeId','checked','createdBy','wishNote','imageKey'].map(key=>migrated.items[0][key]),['a',2,'Glas','laden',false,'Nico','Marke behalten','oliven-schwarz']);
  assert.equal(migrated.items[0].productOriginalName,'Oliven schwarz');
  assert.equal(migrated.ingredients[0].name,'Oliven');assert.equal(migrated.productFavorites[0].name,'Oliven');
  assert.ok(migrated.pantry.every(row=>row.available));assert.deepEqual(migrated.meals[0].listedRows,['Oliven|100|g']);assert.equal(migrated.meals[0].listedParts[0].name,'Oliven');
  assert.deepEqual(productGroupMigration(migrated),[]);assert.deepEqual(merge(migrated,ops),migrated);
  const renamed=merge(migrated,[operation('items','a',{name:'Grüne Oliven'},'Nico','2026-11-01T11:00:00.000Z')]);
  assert.equal(renamed.items[0].name,'Grüne Oliven');assert.deepEqual(productGroupMigration(renamed),[]);
  assert.equal(validate(JSON.parse(JSON.stringify(renamed))).items.length,1);
});

test('Produktgruppen: Favoriten von mehreren Varianten und aktueller Vorrat funktionieren nach Zusammenfassung',()=>{
  const favorites=[old('f1','Oliven grün',{productId:'oliven-gruen',quantity:1,unit:'Glas'}),old('f2','Oliven schwarz',{productId:'oliven-schwarz',quantity:2,unit:'Glas'})];
  const olives=productLibrary([],favorites).find(row=>row.name==='Oliven');assert.deepEqual(olives.favorite.ids,['f1','f2']);
  const keys=pantryKeys([old('p','Oliven',{available:true})]);assert.ok(inPantry(keys,'Schwarze Oliven'));
  const index=indexNames({have:['Oliven','Öl']});assert.equal(availability('schwarze Oliven',index),'have');assert.equal(availability('Rapsöl',index),'have');assert.equal(availability('Milch',index),'missing');
});

test('Ausgaben nach Notiz: gleiche Personen-/Zeitraumfilter, leere Notiz und Rückerstattung ergeben exakt die Gesamtsumme',()=>{
  const rows=[
    {date:'2026-11-01',cents:500,note:'Getränke',buyerId:'member-nico'},
    {date:'2026-11-02',cents:100,note:'Getränke',kind:'refund',buyerId:'member-nico'},
    {date:'2026-11-03',cents:200,note:'',buyerId:'member-nico'},
    {date:'2026-11-03',cents:900,note:'Wocheneinkauf',buyerId:'member-anna'},
    {date:'2026-10-31',cents:999,note:'Getränke',buyerId:'member-nico'}
  ];
  for(const person of ['all','member-nico','member-anna']) {
    const summary=summarizePeriod(rows,'2026-11',[],[],person);
    assert.equal(summary.byNote.reduce((sum,row)=>sum+row.total,0),summary.total);
    assert.equal(summary.byNote.reduce((sum,row)=>sum+row.count,0),summary.count);
  }
  assert.deepEqual(summarizePeriod(rows,'2026-11',[],[],'member-nico').byNote,[{name:'Getränke',total:400,count:2},{name:'Ohne Notiz',total:200,count:1}]);
});

test('Wunschbilder: lokale Gruppen, Wortteile/Umlaute, unbekannte Wünsche und dauerhaft unterdrückte Bilder',()=>{
  for(const [name,group] of [['PlayStation 5 Pro','Technik & Multimedia'],['SCHÖNE BÜCHER','Bücher & Medien'],['Lego Spielzeugauto','Spielzeug & Spiele'],['Laufschuhe','Kleidung & Schuhe'],['Konzerttickets','Erlebnisse & Reisen']]) {
    const found=wishGroup(name);assert.equal(found.name,group);assert.match(found.image.url,/^assets\//);
  }
  assert.equal(wishGroup('Überraschung für uns').name,'Sonstiges');
  assert.equal(wishImage(JSON.parse(JSON.stringify({name:'PlayStation',wishImageHidden:true}))),null);
});
test('Eigene Listen übernehmen bekannte Produktbilder, behalten freie Namen und respektieren Bild entfernen',()=>{
  for(const name of ['Milch','Zahnpasta','Orangensaft','Shampoo']) {
    const row={name};const before=JSON.stringify(row),known=imageForProduct(row);
    assert.equal(known.kind,'product');assert.deepEqual(wishImage(row),known);
    assert.deepEqual(wishGroup(name).image,known);assert.equal(JSON.stringify(row),before);
    assert.equal(wishImage({...row,wishImageHidden:true}),null);
  }
  assert.match(wishGroup('Schöner Roman für den Urlaub').image.url,/^assets\/wishes\//);
});
test('Neue Listensymbole erhalten den Aktualisierungsschutz und parallele Listenänderungen',()=>{
  // Seit 2.152 ist ein vergebenes Symbol fest. Eine Liste ohne Motiv („none“) bekommt ihr erstes Symbol, ein späterer Tausch bleibt wirkungslos.
  const baseline=merge(emptyData(),[operation('stores','extra',{name:'Apotheke',separate:true,symbol:'none'},'Nico',at)]);
  assert.ok((baseline.sync.minRev||1)<12);
  const icon=operation('stores','extra',{symbol:'pharmacy'},'Nico','2026-11-01T10:00:01.000Z');
  const name=operation('stores','extra',{name:'Hausapotheke'},'Anna','2026-11-01T10:00:02.000Z');
  for(const ops of [[icon,name],[name,icon]]) {
    const next=merge(baseline,ops);assert.equal(next.sync.minRev,12);assert.equal(next.stores[0].symbol,'pharmacy');assert.equal(next.stores[0].name,'Hausapotheke');assert.equal(next.stores[0].separate,true);
    assert.equal(merge(next,[operation('stores','extra',{symbol:'gift'},'Anna','2026-11-01T10:00:03.000Z')]).stores[0].symbol,'pharmacy','kein Tausch');
  }
});
test('Das Schloss-Symbol einer geteilten eigenen Liste schützt vor älteren App-Versionen',()=>{
  const data=merge(emptyData(),[operation('stores','schloss',{name:'Liste mit Schloss',separate:true,symbol:'secret'},'Nico',at)]);
  assert.equal(data.sync.minRev,13);assert.equal(data.stores[0].symbol,'secret');
});

test('Import: zehn Lidl-Aufrufe nach transienten Fehlern, fünf Versuche, nur freigegebene Routen und ruhiger Fortschritt',async()=>{
  const html='<html>'+('x'.repeat(250))+'</html>';
  for(let run=0;run<10;run++) {
    const calls=[],progress=[];
    globalThis.fetch=async url=>{calls.push(url);return new Response(calls.length<3?'kurzer Fehler':html,{status:calls.length<3?502:200});};
    const result=await fetchRecipePage('https://rezepte.lidl.de/rezepte/doener-croissant',{workerUrl:'https://test.rezepte.workers.dev',retryDelayMs:0,onAttempt:n=>progress.push(n)});
    assert.equal(result.html,html);assert.equal(calls.length,3);assert.ok(calls.every(url=>url.startsWith('https://test.rezepte.workers.dev/')));assert.deepEqual(progress,[1,2,3]);
  }
  let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Netz unterbrochen');};
  await assert.rejects(fetchRecipePage('https://www.chefkoch.de/rezepte/test',{allowPublic:true,retryDelayMs:0}),error=>error.code==='failed' && /5 Versuchen/.test(error.message));assert.equal(calls,5);
  const abort=new AbortController();abort.abort();calls=0;
  await assert.rejects(fetchRecipePage('https://example.com/recipe',{allowPublic:true,retryDelayMs:0},abort.signal),{name:'AbortError'});assert.equal(calls,0);
});


test('Produktmigration: neuere Offline-Änderungen werden geprüft, bewusste freie Eingaben bleiben exakt',()=>{
  const data=emptyData();data.items=[old('a','Oliven schwarz',{quantity:1,unit:'Glas',storeId:'',checked:false,createdBy:'Nico'})];
  const first=productGroupMigration(data),remote={id:'old-client-name',collection:'items',entityId:'a',patch:{name:'Oliven grün'},actor:'Anna',at:'2026-11-01T11:00:00.000Z'};
  const combined=merge(data,[...first,remote]),updated=merge(combined,productGroupMigration(combined));
  assert.equal(updated.items[0].name,'Oliven');
  const free=operation('items','a',{name:'Schwarze Oliven'},'Nico','2026-11-01T12:00:00.000Z');
  const manual=merge(updated,[free]);assert.deepEqual(productGroupMigration(manual),[]);assert.equal(manual.items[0].name,'Schwarze Oliven');
});


test('Produktgruppen: ein frei benannter Einkaufsartikel deckt die Rezeptgruppe ohne doppelte Wochen-Zutaten ab',()=>{
  const free={name:'Grüne Oliven',quantity:1,unit:'Glas',checked:false};
  assert.deepEqual(shoppingDeficits([{name:'Oliven',quantity:100,unit:'g'}],[],[free]),[]);
  assert.deepEqual(shoppingDeficits([{name:'Öl',quantity:200,unit:'ml'}],[],[{name:'Rapsöl',quantity:100,unit:'ml',checked:false}]),[{name:'Öl',quantity:100,unit:'ml'}]);
  assert.equal(free.name,'Grüne Oliven');
});


test('Rezeptübernahme: genaue freie Artikelbezeichnung bleibt, Mengen und Einkaufsmerker werden weiterverwendet',()=>{
  const items=[{name:'Hackfleisch gemischt',quantity:900,unit:'g',storeId:'laden',checked:false}];
  const rows=reuseProductNames([{name:'Hackfleisch',quantity:200,unit:'g'}],items,'laden');
  assert.deepEqual(rows,[{name:'Hackfleisch gemischt',quantity:200,unit:'g'}]);
  assert.equal(items[0].quantity,900);assert.equal(items[0].name,'Hackfleisch gemischt');
});

test('Reife Bananen: vorhandene Einkaufsmenge deckt die Zutat ab, nur eine echte Fehlmenge wird ergänzt',()=>{
  const rows=[{name:'Reife Bananen',quantity:3,unit:'Stück'}],item={name:'Bananen',quantity:3,unit:'Stück',checked:false},before=JSON.stringify([rows,item]);
  assert.deepEqual(shoppingDeficits(rows,[],[item]),[]);
  assert.deepEqual(shoppingDeficits(rows,[],[{...item,name:'Banane',quantity:1}]),[{...rows[0],quantity:2}]);
  assert.equal(JSON.stringify([rows,item]),before,'Reifehinweis und manuelle Produktnamen bleiben erhalten');
});

test('Zutatenidentität: geprüfte Reife-/Größenangaben, Einzahl und Wortreihenfolge werden gemeinsam erkannt',()=>{
  for(const [name,base] of [['Reife Bananen','Bananen'],['sehr überreife Banane','Bananen'],['Bananen (reif)','Bananen'],['Bananen, reif','Bananen'],['kleine frische Karotte','Karotten'],['große Kartoffel','Kartoffeln'],['frische Petersilie','Petersilie'],['kleines Ei','Eier']]) {
    assert.equal(ingredientProductName(name),base,name);
    assert.ok(sameIngredient(name,base),name); assert.ok(sameIngredient(base,name),name);
    assert.ok(inPantry(pantryKeys([{name:base,available:true}]),name),name);
    assert.equal(availability(name,indexNames({have:[base]})),'have',name);
    assert.equal(availability(name,indexNames({soon:[base]})),'soon',name);
  }
  assert.equal(sameProduct('Reife Bananen','Bananen'),false,'freie Artikel behalten ihre bewusst gewählten Namen');
  assert.equal(canonicalProductName('Reife Bananen'),'Reife Bananen','keine nachträgliche Umbenennung von Rezepten');
});

test('Zutatenidentität: Produktart, Verarbeitung und Ernährungsangaben werden nicht pauschal entfernt',()=>{
  for(const [a,b] of [['Banane','Bananenchips'],['Banane','Kochbanane'],['Tomaten','Tomatenmark'],['Tomaten','getrocknete Tomaten'],['Tomaten','Tomaten (getrocknet)'],['Tomaten','Tomaten (Konserve)'],['Milch','Hafermilch'],['Milch','Milch (laktosefrei)'],['Nudeln','glutenfreie Nudeln'],['Hefe','frische Hefe'],['Butter','Buttermilch'],['Banane','Bananen für Nico']]) {
    assert.equal(sameIngredient(a,b),false,`${a} ≠ ${b}`);
    assert.equal(inPantry(pantryKeys([{name:a,available:true}]),b),false,`${a} ≠ ${b} im Vorrat`);
    assert.equal(availability(b,indexNames({have:[a]})),'missing',`${a} ≠ ${b} beim Rezeptabgleich`);
    assert.equal(shoppingDeficits([{name:b,quantity:3,unit:'Stück'}],[],[{name:a,quantity:3,unit:'Stück'}]).length,1,`${a} ≠ ${b} beim Einkaufsbedarf`);
  }
  assert.equal(ingredientProductName('große Überraschung'),'große Überraschung','kein Raten bei unbekannten Produkten');
});

test('Zutatenmengen: mehrere Rezepte und reservierte Mengen werden trotz beschreibender Zusätze einmalig angerechnet',()=>{
  const recipes=[{id:'bread',name:'Bananenbrot',servings:10},{id:'shake',name:'Shake',servings:2}];
  const ingredients=[{recipeId:'bread',name:'Reife Bananen',quantity:3,unit:'Stück'},{recipeId:'shake',name:'kleine Banane',quantity:2,unit:'Stück'}];
  const before=JSON.stringify(ingredients),rows=aggregateIngredients([{recipeId:'bread',servings:10},{recipeId:'shake',servings:2}],recipes,ingredients);
  assert.equal(rows.length,1);assert.equal(rows[0].quantity,5);
  assert.deepEqual(new Set(rows[0].sources),new Set(['Bananenbrot','Shake']));
  assert.equal(shoppingDeficits(rows,[],[{name:'Bananen',quantity:2,unit:'Stück'}])[0].quantity,3);
  assert.equal(shoppingDeficits([{name:'Reife Bananen',quantity:3,unit:'Stück'}],[],[{name:'Banane',quantity:4,unit:'Stück'}],[{name:'Bananen',quantity:2,unit:'Stück'}])[0].quantity,1);
  assert.equal(JSON.stringify(ingredients),before);
});

test('Zutatenübernahme: Restmengen verwenden den bestehenden Namen und Merker; unbekannte Bundgrößen werden nicht geraten',()=>{
  const item={name:'Bananen',quantity:1,unit:'Stück',checked:false,storeId:'laden',purchaseAmount:{quantity:1,unit:'Stück'},purchaseAmountAt:at};
  const missing=shoppingDeficits([{name:'Reife Bananen',quantity:3,unit:'Stück'}],[],[item]);
  assert.deepEqual(reuseProductNames(missing,[item],'laden'),[{name:'Bananen',quantity:2,unit:'Stück'}]);
  assert.equal(item.quantity,1); assert.equal(item.purchaseAmountAt,at);
  assert.deepEqual(shoppingDeficits([{name:'Reife Bananen',quantity:3,unit:'Stück'}],[],[{...item,unit:'Bund'}]),[]);
  assert.equal(shoppingDeficits([{name:'Reife Bananen',quantity:3,unit:'Stück'}],[],[{...item,checked:true}])[0].quantity,3);
  assert.equal(shoppingDeficits([{name:'Reife Bananen',quantity:3,unit:'Stück'}],[],[{...item,_planEmpty:true,quantity:0}])[0].quantity,3);
});

test('Rezeptübernahme ordnet „Ei(er)“ dem vorhandenen Artikel „Eier“ zu und bereinigt neue Listenzeilen', () => {
  const items = [{ id: 'eggs', name: 'Eier', quantity: 6, unit: 'Stück', storeId: '', checked: false, deletedAt: null }];
  const rows = reuseProductNames([{ name: 'Ei(er)', quantity: 2, unit: 'Stück' }, { name: 'Zwiebel(n)', quantity: 1, unit: 'Stück' }, { name: 'Tomaten (à 400 g)', quantity: 1, unit: 'Dose' }], items, '');
  assert.deepEqual(rows.map(row => row.name), ['Eier', 'Zwiebeln', 'Tomaten (Konserve)'], 'eine Dose Tomaten ist die Konserve');
  assert.equal(ingredientProductName('Ei(er)'), 'Eier');
  assert.equal(sameIngredient('Tomaten (à 400 g)', 'Tomaten'), true);
  assert.equal(sameIngredient('Milch (laktosefrei)', 'Milch'), false);
});

test('Dosen: Rezeptzeilen mit Einheit Dose werden zur Konserve des Katalogs mit passendem Bild und Gang', async () => {
  const { cannedProductName, ingredientMatchName } = await import('../product-groups.js');
  const { imageForProduct } = await import('../product-images.js');
  const { itemCategory } = await import('../categories.js');
  assert.equal(cannedProductName('Tomaten', 'Dose'), 'Tomaten (Konserve)');
  assert.equal(cannedProductName('Tomaten (à 400 g)', 'Dosen'), 'Tomaten (Konserve)');
  assert.equal(cannedProductName('stückige Tomaten', 'Dose'), 'Tomaten (Konserve)');
  assert.equal(cannedProductName('Tomaten aus der Dose', 'g'), 'Tomaten (Konserve)');
  assert.equal(cannedProductName('Erbsen', 'Dose'), 'Erbsen in der Dose');
  assert.equal(cannedProductName('Mais', 'Dose'), null, 'Mais ist ohnehin ein Dosenprodukt');
  assert.equal(cannedProductName('Tomaten', 'g'), null);
  assert.equal(ingredientMatchName({ name: 'Tomaten', unit: 'Stück' }), 'Tomaten');
  assert.equal(imageForProduct({ name: 'Tomaten', unit: 'Dose' }).key, 'gehackte-tomaten');
  assert.equal(imageForProduct({ name: 'Tomaten', unit: 'g' }).key, 'tomaten');
  assert.equal(itemCategory({ name: 'Tomaten', unit: 'Dose' }), 'vorrat');
  const items = [{ id: 'can', name: 'Tomaten (Konserve)', quantity: 1, unit: 'Dose', storeId: '', checked: false, deletedAt: null }];
  assert.deepEqual(reuseProductNames([{ name: 'Tomaten', quantity: 2, unit: 'Dose' }, { name: 'Knoblauch, gepresst', quantity: 1, unit: 'Zehe' }], items, '').map(row => row.name), ['Tomaten (Konserve)', 'Knoblauch']);
});
