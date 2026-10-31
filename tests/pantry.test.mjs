import assert from 'node:assert/strict';
import { test } from 'node:test';
import { active, addToList, emptyData, inPantry, merge, operation, pantryKey, pantryKeys, pantryRows, validate } from '../data.js';
import { compact } from '../compact.js';
import { namesFrom } from '../cookable.js';
import { pantryChanges, pantrySelectionChanges, recentlyRemovedBasics } from '../pantry.js';
import { imageForProduct } from '../product-images.js';
import { ownProduct, productLibrary, selectedProducts, pantryProductLibrary, filterProducts, productById } from '../product-catalog.js';

const at = '2026-10-29T20:00:00.000Z', later = '2026-10-30T20:00:00.000Z';
const ops = (changes, time = at, actor = 'Nico') => changes.map(({ id, patch }) => operation('pantry', id, patch, actor, time));
const seed = products => merge(emptyData(), ops(pantryChanges(products)));

test('Vorrat: alte Namenslisten bleiben lesbar, Bilder und Vorhanden funktionieren ohne Migration', () => {
  const data = merge(emptyData(), [operation('pantry', 'legacy', { name: 'Zwiebeln' }, 'Nico', at)]);
  assert.ok(inPantry(pantryKeys(data.pantry), 'Zwiebel'));
  assert.equal(imageForProduct(data.pantry[0]).key, 'zwiebeln');
  assert.doesNotThrow(() => validate(data));
  assert.ok(!data.sync.minRev, 'alte Daten brauchen noch keine neue Revision');
});

test('Vorrat: zwei offline angelegte gleiche Produkte haben dieselbe ID; Einzahl/Mehrzahl wird nicht doppelt angelegt', () => {
  const a = ops(pantryChanges(['Zwiebeln', 'Salz'])), b = ops(pantryChanges(['zwiebel']), at, 'Anna');
  const left = merge(merge(emptyData(), a), b), right = merge(merge(emptyData(), b), a);
  assert.equal(active(left.pantry).length, 2);
  assert.deepEqual([...left.pantry].sort((a, b) => a.id.localeCompare(b.id)), [...right.pantry].sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(pantryChanges(['ZWIEBELN'], left.pantry), []);
});

test('Vorrat: Aufgebraucht zählt weder bei Rezeptübernahme noch als kürzlich eingekauft; alte Apps werden geschützt', () => {
  let data = seed(['Milch', 'Nudeln']); const milk = data.pantry.find(row => row.name === 'Milch');
  data = merge(data, [operation('pantry', milk.id, { available: false }, 'Nico', later)]);
  assert.ok(!inPantry(pantryKeys(data.pantry), 'Milch')); assert.ok(inPantry(pantryKeys(data.pantry), 'Nudeln'));
  const names = namesFrom({ pantry: data.pantry, items: [{ name: 'Milch', checked: true, updatedAt: later }], now: Date.parse(later) + 1000 });
  assert.ok(!names.have.includes('Milch'), 'ausdrücklich leer überstimmt die Einkaufserinnerung');
  assert.equal(data.sync.minRev, 5);
});

test('Vorrat: gleichzeitige Status- und Bildänderungen bleiben beide erhalten, auch nach Export', () => {
  const base = seed(['Meine Frühstücksmischung']), row = base.pantry[0];
  const status = operation('pantry', row.id, { available: false }, 'Nico', later);
  const image = operation('pantry', row.id, { imageKey: 'muesli' }, 'Anna', later);
  const a = merge(merge(base, [status]), [image]), b = merge(merge(base, [image]), [status]);
  assert.deepEqual(a.pantry, b.pantry); assert.equal(a.pantry[0].available, false);
  assert.equal(imageForProduct(a.pantry[0]).key, 'muesli');
  assert.equal(imageForProduct(validate(JSON.parse(JSON.stringify(a))).pantry[0]).key, 'muesli');
});

test('Vorrat: Wiederauffüllen und Entfernen erhalten eigene Bilder und nutzen bestehende IDs', () => {
  let data = seed([{ name: 'Meine Mischung', imageKey: 'group-breakfast' }]); const row = data.pantry[0];
  data = merge(data, [operation('pantry', row.id, { available: false }, 'Nico', later)]);
  data = merge(data, ops(pantryChanges(['Meine Mischung'], data.pantry), '2026-10-31T20:00:00Z'));
  assert.equal(data.pantry.length, 1); assert.equal(data.pantry[0].available, true); assert.equal(data.pantry[0].imageKey, 'group-breakfast');
  data = merge(data, [operation('pantry', row.id, { deletedAt: '2026-11-01T20:00:00Z' }, 'Nico', '2026-11-01T20:00:00Z')]);
  const restore = pantryChanges(['Meine Mischung'], data.pantry);
  assert.equal(restore[0].id, row.id);
  const result = merge(data, ops(restore, '2026-11-02T20:00:00Z'));
  assert.equal(result.pantry[0].imageKey, 'group-breakfast'); assert.equal(result.pantry[0].deletedAt, null);
});

test('Vorrat: Löschmarken bleiben beim Aufräumen gegen späte Offline-Anlagen geschützt', () => {
  const create = ops(pantryChanges(['Haferflocken'])), base = merge(emptyData(), create), row = base.pantry[0];
  const data = merge(base, [operation('pantry', row.id, { deletedAt: later }, 'Anna', later)]);
  const cleaned = compact(data, new Date('2027-11-01T00:00:00Z')).data;
  assert.ok(cleaned.pantry.some(row => row.deletedAt));
  assert.equal(active(merge(cleaned, create).pantry).length, 0, 'alte Anlage belebt den Eintrag nicht wieder');
});

test('Vorrat: manuelle zusammengesetzte Produktnamen bleiben ein Eintrag, ohne andere Zutaten vorzutäuschen', () => {
  const data = seed(['Erbsen und Möhren']); const keys = pantryKeys(data.pantry);
  assert.equal(data.pantry.length, 1); assert.ok(inPantry(keys, 'Erbsen und Möhren'));
  assert.ok(!inPantry(keys, 'Erbsen')); assert.ok(!inPantry(keys, 'Möhren'));
});

test('Vorrat: Bildauswahl durchsucht aktuelle eigene Produkte und Kategorien ohne Datenänderung', () => {
  const data=seed([{name:'Äpfel',category:'obst'},{name:'Mehl',category:'vorrat'},{name:'Mein Shampoo',category:'haushalt'},{name:'Meine Hausmischung',category:'sonstiges'}]);
  const flour=data.pantry.find(row=>row.name==='Mehl'),next=merge(data,[operation('pantry',flour.id,{available:false},'Nico',later)]),before=structuredClone(next);
  const lib=pantryProductLibrary([],[],next.pantry),current=lib.filter(product=>pantryKeys(next.pantry).has(pantryKey(product.name)));
  assert.deepEqual(filterProducts(current,{query:'aepfel',includeOwn:true}).map(row=>row.name),['Äpfel']);
  assert.equal(filterProducts(current,{includeOwn:true}).length,3);
  assert.deepEqual(filterProducts(current,{category:'haushalt',includeOwn:true}).map(row=>row.name),['Mein Shampoo']);
  assert.ok(filterProducts(lib,{includeOwn:true}).some(row=>row.name==='Meine Hausmischung'));
  assert.deepEqual(next,before,'das Anzeigen verändert weder Vorrat noch Revision');
});

test('Vorrat: bestehende alte Dubletten werden gemeinsam angezeigt; jüngster Status entscheidet', () => {
  const data = merge(emptyData(), [operation('pantry', 'old-a', { name: 'Zwiebel' }, 'Nico', at), operation('pantry', 'old-b', { name: 'Zwiebeln', available: false }, 'Anna', later)]);
  assert.equal(pantryRows(data.pantry).length, 1); assert.deepEqual(pantryRows(data.pantry)[0].ids.sort(), ['old-a', 'old-b']);
  assert.equal(pantryKeys(data.pantry).size, 0);
});

test('Vorrat: nach Umbenennen bleibt das ursprüngliche Produkt neu anlegbar, ohne den anderen Eintrag zu überschreiben', () => {
  const base = seed(['Salz']), rename = merge(base, [operation('pantry', base.pantry[0].id, { name: 'Kräutersalz' }, 'Nico', later)]);
  const result = merge(rename, ops(pantryChanges(['Salz'], rename.pantry), '2026-10-31T20:00:00Z'));
  assert.deepEqual(result.pantry.map(row => row.name).sort(), ['Kräutersalz', 'Salz']);
});

test('Vorrat: eigene Produktbilder bleiben bei Favorit, Auswahl und Nachkaufen erhalten; Vorrat ist kein Kaufzähler', () => {
  const own = ownProduct('Mein Müslimix', { imageKey: 'muesli', quantity: 1, unit: 'Packung' });
  const lib = productLibrary([], [], [{ name: own.name, imageKey: 'muesli' }]);
  const product = lib.find(row => row.name === own.name); assert.equal(product.count, 0); assert.equal(imageForProduct(product).key, 'muesli');
  const picked = selectedProducts(new Map([[own.id, own]]));
  const added = merge(emptyData(), addToList(picked, '', 'Nico', at).ops);
  assert.equal(added.items[0].imageKey, 'muesli'); assert.equal(imageForProduct(added.items[0]).key, 'muesli');
});

test('Vorrat: Bildauswahl entfernt und reaktiviert dieselben Datensätze ohne Metadatenverlust', () => {
  const rows=[{id:'old-a',name:'Zwiebel',category:'obst',imageKey:'group-vegetables',extra:'behalten',available:true,updatedAt:at},
    {id:'old-b',name:'Zwiebeln',available:true,updatedAt:later},{id:'other',name:'Salz',available:true,updatedAt:at}];
  const before=structuredClone(rows),changes=pantrySelectionChanges([{name:'Zwiebeln',pantryAvailable:false}],rows);
  assert.deepEqual(changes,[{id:'old-a',patch:{available:false}},{id:'old-b',patch:{available:false}}]);assert.deepEqual(rows,before);
  const out=rows.map(row=>({...row,...changes.find(change=>change.id===row.id)?.patch}));
  const restore=pantrySelectionChanges([{name:'Zwiebel',pantryAvailable:true,imageKey:'zwiebeln'}],out);
  assert.deepEqual(restore,[{id:'old-a',patch:{available:true}},{id:'old-b',patch:{available:true}}]);
  assert.equal(out[0].extra,'behalten');assert.equal(out[0].imageKey,'group-vegetables');assert.deepEqual(out[2],rows[2]);
});
test('Vorrat: Auswahl ändert nur ausdrücklich gewählte Statusfelder; alte Datensätze brauchen kein Neusetzen', () => {
  const rows=[{id:'legacy',name:'Milch',imageKey:'milch',updatedAt:at},{id:'out',name:'Mehl',available:false,updatedAt:at}];
  assert.deepEqual(pantrySelectionChanges([{name:'Milch',pantryAvailable:true},{name:'Mehl',pantryAvailable:false}],rows),[]);
  assert.deepEqual(pantrySelectionChanges([{name:'Milch',pantryAvailable:false},{name:'Mehl',pantryAvailable:true}],rows),[
    {id:'legacy',patch:{available:false}},{id:'out',patch:{available:true}}]);
  assert.deepEqual(pantrySelectionChanges([{name:'Unbekannt',pantryAvailable:false}],rows),[]);
});
test('Vorrat: ältere eigene Namen bleiben sichtbar und lassen sich erneut als vorhanden setzen', () => {
  const rows=[{id:'legacy-tv',name:'TV',category:'sonstiges',available:false,updatedAt:at},{id:'legacy-spice',name:'Meine ganz eigene Mischung',available:true,updatedAt:at}];
  const before=structuredClone(rows),lib=pantryProductLibrary([],[],rows);
  assert.ok(lib.some(row=>row.name==='TV'));assert.ok(lib.some(row=>row.name==='Meine ganz eigene Mischung'));assert.deepEqual(rows,before);
  assert.deepEqual(pantrySelectionChanges([{name:'TV',pantryAvailable:true}],rows),[{id:'legacy-tv',patch:{available:true}}]);
  assert.throws(()=>pantryChanges(['TV']),/Vorrat/,'neue Technikartikel bleiben ausgeschlossen');
});

test('Vorrat: eigene Kategorie wird beim Nachkaufen vor der Schätzung übernommen; zuletzt gelernte Einkaufskategorie bleibt vorrangig', () => {
  const product = { name: 'Milch', quantity: 1, unit: 'l', category: 'vorrat' };
  assert.equal(addToList([product], '', 'Nico', at).ops[0].patch.category, 'vorrat');
  const history = [{ name: 'Milch', category: 'sonstiges', updatedAt: later }];
  assert.equal(addToList([product], '', 'Nico', at, [], history).ops[0].patch.category, 'sonstiges');
});

test('Vorrat: unsichere Bildwerte und falsche Statuswerte werden abgelehnt, unbekannte lokale Kennungen bleiben erweiterbar', () => {
  const base = seed(['Mehl']), row = base.pantry[0];
  for (const patch of [{ available: 'false' }, { category: 'bogus' }, { imageKey: 'https://example.org/x.png' }, { imageKey: 'url(javascript:alert(1))' }])
    assert.throws(() => merge(base, [operation('pantry', row.id, patch, 'Nico', later)]));
  const next = merge(base, [operation('pantry', row.id, { imageKey: 'future-picture' }, 'Nico', later)]);
  assert.equal(imageForProduct(next.pantry[0]).key, 'mehl', 'unbekannte Kennung fällt auf automatische lokale Auswahl zurück');
  assert.throws(() => pantryChanges(['a'.repeat(121)]), /120/); assert.throws(() => pantryChanges([' ']), /Produktnamen/);
});

test('Vorrat: ein eigener Favorit ohne bekannte Kategorie bleibt schon vor der Vorratsübernahme erreichbar', () => {
  const favorite={...ownProduct('Meine Hausmischung'),id:'favorite-own',productId:null,deletedAt:null};
  const library=pantryProductLibrary([], [favorite], []),found=filterProducts(library,{mode:'favorites',includeOwn:true});
  assert.deepEqual(found.map(row=>row.name),['Meine Hausmischung']);assert.equal(found[0].favorite.id,favorite.id);
  assert.ok(!pantryProductLibrary([], [{...favorite,name:'TV'}], []).some(row=>row.name==='TV'));
});

test('Kürzlich entfernt: nur Grundvorräte mit tatsächlicher Statusänderung, nicht neue Bildänderungen oder alter Vorrat',()=>{
 const now=Date.parse('2026-10-31T12:00:00Z'),at=days=>new Date(now-days*86400000).toISOString();
 const rows=[{id:'milk',name:'Milch',available:false,_clock:{available:{at:at(1)}}},{id:'flour',name:'Mehl',available:false,updatedAt:at(0),_clock:{available:{at:at(8)}}},{id:'salt',name:'Salz',available:true},{id:'apple',name:'Äpfel',available:false,_clock:{available:{at:at(0)}}}],before=structuredClone(rows),products=['milch','mehl','salz','aepfel'].map(productById);
 assert.deepEqual(recentlyRemovedBasics(products,rows,[],now).map(row=>row.name),['Milch']);
 assert.deepEqual(recentlyRemovedBasics(products,rows,[{...productById('milch'),pantryAvailable:true},{...productById('salz'),pantryAvailable:false}],now).map(row=>row.name),['Salz']);assert.deepEqual(rows,before);
});
