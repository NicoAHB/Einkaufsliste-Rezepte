/* Produktauswahl als eigenes Fenster. Keine Händler-/Bilddienste: Fotos und Katalog liegen in der App.
   Änderungen gehen ausschließlich über die vorhandenen Speicher-Callbacks der App. */
import { INTERNATIONAL_CATEGORY, internationalProductGroups, isInternationalProduct } from './international-products.js';
import { ask } from './ask.js';
import { mountQuantityControls } from './quantity-controls.js';
import { shoppingAmount, preferredPurchase, rawPurchase, unitChoice, preferredQuantity } from './buying.js';
import { CATEGORIES } from './categories.js';
import { GROCERY_PRODUCTS, internationalProductLibrary, filterProducts, ownProduct, productLibrary, selectedProducts, pantryProductLibrary, pantryProductAllowed, isPantryBasic, pantryProductsForMode } from './product-catalog.js';
import { groupImageFor, imageForProduct, paintProductImage } from './product-images.js';
import { productKey, unitSpec } from './prices.js';
import { pantryKey, pantryKeys, pantryRows } from './data.js';
import {isOptionalBasic,smartStockSaved,smartStockSettings} from './smart-stock.js';
import { recentPurchases, purchaseLabel, purchaseBuyer } from './recent-purchases.js';
import { bindWishHold } from './wishes.js';
import { openOrderControls } from './ui-controls.js';
import { mountProductTabOrder } from './product-tab-order.js';

const number = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3, useGrouping: false }).format(value);
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
const svg = name => {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = document.createElementNS(icon.namespaceURI, 'use');
  icon.classList.add('icon'); icon.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#i-${name}`); icon.append(use); return icon;
};

export function mountProductPicker({ getData, getStores, getScope, onAdd, onPantry, onFavorite, onQuickBuy, recognizeName, onStockSettings, onConsume, onDeleteOwn, onRestoreOwn }) {
  const $ = id => document.getElementById(id), dialog = $('product-picker-dialog'), form = $('product-picker-form');
  const search = $('product-picker-search'), category = $('product-picker-category'), store = $('product-picker-store'), grid = $('product-picker-list');
  if(![...category.options].some(option=>option.value===INTERNATIONAL_CATEGORY))category.add(new Option('Internationale Produkte',INTERNATIONAL_CATEGORY),1);
  const selection = new Map();
  const PAGE_SIZE = 96;
  let mode = 'all', scope = '', submitting = false, target = 'list', visibleLimit = PAGE_SIZE;
  let stockChanges={};
  const helpToggle=$('product-picker-help-toggle'),help=$('product-picker-help');
  function showHelp(open,restoreFocus=false) {
    const expanded=Boolean(open);
    help.hidden=!expanded;
    helpToggle.setAttribute('aria-expanded',String(expanded));
    helpToggle.setAttribute('aria-label',`Hilfe zur ${target==='pantry'?'Vorratsauswahl':'Produktauswahl'} ${expanded?'ausblenden':'anzeigen'}`);
    if(restoreFocus){document.activeElement?.blur?.();helpToggle.focus({preventScroll:true});}
  }
  function resetHelp() {
    const hint=$('product-picker-hint'),list=node('ul');
    const texts=target==='pantry'
      ?['Antippen: Vorrat vormerken oder ausgrauen; unten mit „Produkte dem Vorrat hinzufügen“ (bzw. „Aus dem Vorrat entfernen“) übernehmen. ★ merkt Favoriten.','„Nachkaufen“: Menge und Geschäft wählen, mit „Auf die Einkaufsliste“ zum Einkaufszettel hinzufügen.','Unter „Letzte 7 Tage gekauft“ die Einstellung aufklappen, einschalten, 1–7 Tage wählen und „Speichern“ drücken. Die Kopfzeile zeigt den gespeicherten Zustand; Datum und Nutzer stehen auf dem gespeicherten Button.','Ausnahme Grundvorrat: Mehl, Nudeln und andere Grundvorräte bleiben, bis du sie als aufgebraucht markierst. Manuelle Vorräte laufen nicht ab.','Haushalt, Drogerie und Sonstiges werden nicht automatisch übernommen.','„Aufgebraucht“ nimmt das Produkt sofort aus dem Vorrat. Der Einkauf bleibt sieben Tage sichtbar, aufgebrauchte Produkte grau.','Optionale Grundvorräte (Nudeln, Tomatenmark, Butter) kommen beim Aufbrauchen automatisch auf den Einkaufszettel.']
      :['Antippen zum Auswählen - Mit dem Stern als Favorit merken.','Wähle die gewünschten Produkte aus und füge sie mit dem Button unten schnell zur Einkaufsliste hinzu.'];
    for(const text of texts)list.append(node('li',text));
    hint.replaceChildren(list);
    showHelp(false);
  }
  helpToggle.addEventListener('click',()=>showHelp(help.hidden,true));
  $('product-picker-help-close').addEventListener('click',()=>showHelp(false,true));
  dialog.addEventListener('cancel',event=>{if(!help.hidden){event.preventDefault();showHelp(false,true);}});
  const fail = error => { $('product-picker-error').textContent = error.message; $('product-picker-error').hidden = false; $('product-picker-error').scrollIntoView({ block: 'nearest' }); };
  const clearError = () => { $('product-picker-error').hidden = true; };
  function renderStockControls(){
    const current=smartStockSettings(getData());
    for(const key of Object.keys(stockChanges))if(stockChanges[key]===current[key])delete stockChanges[key];
    const draft={...current,...stockChanges},dirty=Object.keys(stockChanges).length>0,saved=smartStockSaved(getData()),save=$('smart-stock-save');
    $('smart-stock-controls').hidden=target!=='pantry'||mode!=='recent';$('smart-stock-enabled').checked=draft.enabled;$('smart-stock-days').value=String(draft.days);$('smart-stock-days-field').hidden=!draft.enabled;
    const duration=current.days===7?'1 Woche':current.days===1?'1 Tag':`${current.days} Tage`;
    $('smart-stock-summary').textContent=current.enabled?`Gekaufte Lebensmittel werden automatisch für ${duration} in den Vorrat übernommen.`:'Automatische Übernahme gekaufter Produkte: ausgeschaltet.';
    $('smart-stock-draft').hidden=!dirty;$('smart-stock-unsaved').hidden=!dirty;
    save.disabled=!dirty&&Boolean(saved);save.textContent=save.disabled?`Gespeichert am ${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(saved.at))} von ${saved.by}`:'Speichern';
  }
  function changeStockDraft(patch){
    if(!dialog.open||target!=='pantry'||scope!==getScope())return;
    clearError();Object.assign(stockChanges,patch);renderStockControls();
  }
  $('smart-stock-enabled').addEventListener('change',event=>changeStockDraft({enabled:event.target.checked}));
  $('smart-stock-days').addEventListener('change',event=>changeStockDraft({days:Number(event.target.value)}));
  $('smart-stock-save').addEventListener('click',()=>{try{
    if(!dialog.open||target!=='pantry'||scope!==getScope())throw new Error('Bitte die Vorratsauswahl erneut öffnen.');
    if($('smart-stock-save').disabled)return;
    clearError();onStockSettings({...stockChanges});stockChanges={};renderStockControls();$('product-picker-feedback').textContent='Einstellung gespeichert.';$('product-picker-feedback').hidden=false;
  }catch(error){renderStockControls();fail(error);}});
  const tabOrder = mountProductTabOrder(dialog.querySelector('.product-modes'), {
    enabled: () => dialog.open && target === 'pantry' && scope === getScope(),
    announce: text => { $('product-modes-status').textContent = text; },
    onError: fail
  });
  $('product-tabs-order').addEventListener('click', () => openOrderControls({
    title: 'Vorratsreiter sortieren', scope, getScope,
    getRows: () => tabOrder.getOrder().map(id => ({ id, name: dialog.querySelector(`[data-product-mode="${id}"]`).textContent.trim() })),
    onChange: order => tabOrder.setOrder(order)
  }));
  // „Internationale Produkte“ zeigt die genauen Sorten (Sushi-Reis, Tortillas …) statt der zusammengefassten Gruppen – für die
  // Einkaufsliste und seit 2.144 auch für den Vorrat (dort bis dahin gesperrt). Der Vorrat nimmt nur, was als Vorrat taugt.
  const library = (international = category.value === INTERNATIONAL_CATEGORY) => {
    const data=getData(),source=international?internationalProductLibrary:target==='pantry'?pantryProductLibrary:productLibrary;
    let products=source(data.history,data.favorites,data.pantry,data.productRemovals);
    if(international&&target==='pantry')products=products.filter(pantryProductAllowed);
    if(target==='pantry')for(const product of selection.values())if(!products.some(row=>pantryKey(row.name)===pantryKey(product.name)))products.push(product);
    return products;
  };
  const stockedKeys = () => {const keys=pantryKeys(getData().pantry||[]);for(const product of selection.values()){if(product.pantryAvailable===false)keys.delete(pantryKey(product.name));else keys.add(pantryKey(product.name));}return keys;};

  function photo(product) {
    const frame = node('span', undefined, 'product-photo'); frame.setAttribute('aria-hidden', 'true');
    const image = product.image || imageForProduct(product);
    return paintProductImage(frame, image, groupImageFor(product.name, product.category));
  }
  function renderStores() {
    const previous = store.value, shops = getStores(); store.replaceChildren(new Option('Kein Geschäft', ''));
    for (const shop of shops) store.add(new Option(shop.name, shop.id));
    if (previous && !shops.some(shop => shop.id === previous)) { const removed = new Option('Geschäft gelöscht – bitte wählen', previous); removed.disabled = true; store.add(removed); }
    store.value = previous;
  }
  function updateFooter() {
    const count = selection.size, invalidStore = target === 'list' && store.value && !getStores().some(shop => shop.id === store.value);
    $('product-picker-add').disabled = !count || submitting || Boolean(invalidStore);
    // Vorrat (2.144): Der Knopf sagt, was passiert – hinzufügen, entfernen oder beides.
    const removing=target==='pantry'?[...selection.values()].filter(product=>product.pantryAvailable===false).length:0;
    $('product-picker-add').textContent = target==='pantry'&&count ? (!removing ? `${count === 1 ? 'Produkt' : 'Produkte'} dem Vorrat hinzufügen` : removing === count ? 'Aus dem Vorrat entfernen' : 'Vorrat aktualisieren') : count ? `${count} ${count === 1 ? 'Produkt' : 'Produkte'} hinzufügen` : 'Produkte auswählen';
    $('product-picker-clear').hidden = !count;
    $('product-picker-selected').textContent = `Auswahl (${count}) · Mengen ändern`;
    $('product-picker-cart').hidden = target !== 'list' || !count;
    $('product-picker-count').disabled = target === 'pantry' || !count;
    $('product-picker-count').setAttribute('aria-label', target === 'pantry' ? `${count} ausgewählt` : `${count} ausgewählt: Mengen ändern`);
  }
  const cartControls=new Map();
  function renderCart() {
    cartControls.clear();
    const box = $('product-picker-cart-rows'); box.replaceChildren();
    if (target === 'list') for (const product of selection.values()) {
      const row = node('div', undefined, 'product-cart-row'), label = node('span', product.name);
      const qtyLabel = node('label'), qty = node('input'), unitLabel = node('label'), unit = node('input');
      qtyLabel.append(node('span', 'Menge', 'sr-only')); qty.value = product.quantity; qty.inputMode = 'decimal'; qty.maxLength = 16;
      qty.setAttribute('aria-label', `${product.name}: Menge`);  qtyLabel.append(qty);
      unitLabel.append(node('span', 'Einheit', 'sr-only')); unit.value = product.unit; unit.maxLength = 30; unit.setAttribute('list', 'units');
      unit.setAttribute('aria-label', `${product.name}: Einheit`);  unitLabel.append(unit);
      const remove = node('button', undefined, 'icon-button product-cart-remove'); remove.type = 'button'; remove.setAttribute('aria-label', `${product.name}: Auswahl entfernen`); remove.append(svg('x'));
      remove.addEventListener('click', () => { selection.delete(product.id); $('product-picker-feedback').hidden = true; renderCart(); renderProducts(); });
      row.append(label, qtyLabel, unitLabel, remove);
      box.append(row);
      {const controls=mountQuantityControls({elements:{quantity:qty,unit}},{getHistory:()=>getData().history||[],getName:()=>product.name,rememberOnSave:true});controls.load(product);cartControls.set(product.id,controls);
        const update=()=>{try{Object.assign(product,controls.read());}catch{product.quantity=qty.value;}clearError();updateAmount(product);};
        qty.addEventListener('input',update);qty.addEventListener('change',update);unit.addEventListener('change',update);
      }
    }
    updateFooter();
  }
  function updateAmount(product) {
    const label = grid.querySelector(`.product-card[data-product="${CSS.escape(product.id)}"] .product-amount`);
    if (label) label.textContent = shoppingAmount(product);
  }
  const purchaseStart = product => {
    const history=getData().history||[],p=preferredPurchase(product.name,history);
    if(p.purchaseUnit)return {...product,...rawPurchase(preferredQuantity(product.name,history,p.unit,p.purchaseUnit,1),p.purchaseUnit,p.unit),...unitChoice(p)};
    const a=unitSpec(product.unit),b=unitSpec(p.unit),unit=p.remembered?p.unit:product.unit,fallback=p.remembered&&a.group===b.group?product.quantity*a.factor/b.factor:product.quantity;
    return {...product,...(p.remembered?{purchaseUnit:null,...unitChoice(p)}:{}),unit,quantity:preferredQuantity(product.name,history,unit,null,fallback)};
  };
  function renderProducts() {
    $('product-picker-title').textContent=target==='pantry'?'Vorrat auswählen':'Produkte auswählen';
    const focused=dialog.contains(document.activeElement)?document.activeElement:null;
    const focusKey=focused?.dataset.productAction,focusId=focused?.dataset.product;
    const available=target==='pantry'?stockedKeys():pantryKeys(getData().pantry||[]);
    const inventory=new Map(pantryRows(getData().pantry||[]).map(row=>[pantryKey(row.name),row]));
    renderStockControls();
    const allProducts=library();
    // Gespeicherte Vorräte bleiben bis zum Speichern an ihrem Platz, auch abgewählte.
    const currentViewKeys=new Set([...pantryKeys(getData().pantry||[]),...[...selection.values()].map(product=>pantryKey(product.name))]);
    const purchases=target==='pantry'&&mode==='recent'?recentPurchases(getData().recentItems||[]):[];
    const forMode = all => target === 'pantry' ? mode==='recent'?purchases.map(row=>({...all.find(product=>pantryKey(product.name)===pantryKey(row.name))||ownProduct(row.name,row),name:row.name,shopBoughtAt:row.shopBoughtAt,boughtBy:purchaseBuyer(row),stockConsumedAt:row.stockConsumedAt||null,...(row.imageKey?{imageKey:row.imageKey}:{})})):pantryProductsForMode(all, mode, currentViewKeys) : all;
    const products = forMode(allProducts);
    // In „Aktuell“, „Grundvorrat“ und „Gekauft“ sind nur Kategorien wählbar, in denen etwas steht. Gezählt wird immer im passenden Bestand:
    // die Gänge in der normalen Auswahl, „Internationale Produkte“ in den genauen Sorten.
    if (target === 'pantry' && mode !== 'all') {
      const international = category.value === INTERNATIONAL_CATEGORY, regular = international ? forMode(library(false)) : products, worldwide = international ? products : forMode(library(true));
      // Der Grundvorrat ist eine feste Liste allgemeiner Produkte; Sorten aus aller Welt gehören dort nicht hinein.
      const categories = new Set(regular.map(product => product.category)), hasInternational = mode !== 'basics' && worldwide.some(isInternationalProduct);
      for (const option of category.options) option.disabled = Boolean(option.value) && !(option.value === INTERNATIONAL_CATEGORY ? hasInternational : categories.has(option.value));
    } else for (const option of category.options) option.disabled = false;
    if (category.selectedOptions[0]?.disabled) category.value = '';
    const visible = filterProducts(products, {mode:target === 'pantry' && ['current','basics','recent'].includes(mode) ? 'all' : mode,
      query:search.value, category:category.value, includeOwn:target === 'pantry'});
    if(mode==='recent')visible.sort((a,b)=>Date.parse(b.shopBoughtAt)-Date.parse(a.shopBoughtAt));
    const data = getData(), allItems = data.items || [], selectedStore = store.value;
    const exactOnList = new Map();
    for (const item of allItems) if (!item.deletedAt && !item.checked && item.storeId === selectedStore) exactOnList.set(productKey(item.name), item);
    // Neuer eigener Name ist ausdrücklich möglich, ohne eine unklare Schreibweise in ein bekanntes Produkt umzudeuten.
    if (!visible.length && ['all', 'own'].includes(mode) && search.value.trim().length >= 2) {
      const own = products.find(product => productKey(product.name) === productKey(search.value)) || ownProduct(search.value);
      if (!(getData().productRemovals||[]).some(row=>!row.deletedAt&&productKey(row.name)===productKey(own.name)) && (!category.value || category.value === own.category) && (target !== 'pantry' || pantryProductAllowed(own))) visible.push(own);
    }
    grid.replaceChildren();
    // Der Hinweis auf gelöschte eigene Produkte gehört nur zum Reiter „Eigene“ der Einkaufsauswahl (die App setzt Anzahl und Sichtbarkeit).
    $('product-picker-trash')?.classList.toggle('picker-trash-off', !(target==='list'&&mode==='own'));
    if(category.value===INTERNATIONAL_CATEGORY)grid.append(node('p','Länder und Küchen als Orientierung. Verfügbarkeit und Packungsgrößen hängen vom Geschäft ab.','hint product-international-hint'));
    // Favoriten und häufige Käufe bleiben ein kompaktes Raster, auch wenn sie aus vielen Gängen stammen.
    const shown = visible.slice(0, visibleLimit);
    const groups = category.value===INTERNATIONAL_CATEGORY?internationalProductGroups(shown):['favorites','frequent','recent'].includes(mode)?[{label:mode==='favorites'?'Deine Favoriten':mode==='recent'?'Letzte Einkäufe':'Oft auf deiner Liste'}]:CATEGORIES;
    for (const group of groups) {
      const matches = group.matches || (group.id ? shown.filter(product => product.category === group.id) : shown); if (!matches.length) continue;
      const section = node('section', undefined, 'product-group'), heading = node('h3', group.label), cards = node('div', undefined, 'product-grid');
      section.append(heading, cards); grid.append(section);
      for (const product of matches) {
        const chosen=selection.get(product.id),picked=Boolean(chosen);
        const amount = shoppingAmount(chosen || purchaseStart(product));
        const stocked = available.has(pantryKey(product.name));
        const stock=inventory.get(pantryKey(product.name)),consumed=mode==='recent'&&!stocked&&Boolean(product.stockConsumedAt);
        const card=node('div',undefined,`product-card${picked?' picked':''}${target==='pantry'&&stocked?' in-stock':''}${target==='pantry'&&chosen?.pantryAvailable===false?' pending-removal':''}`);
        if(consumed)card.classList.add('consumed-recent');
        card.dataset.product = product.id; card.dataset.id = product.id;
        const pick = node('button', undefined, 'product-pick'); pick.type = 'button'; pick.dataset.productAction = 'pick'; pick.dataset.product = product.id;
        pick.setAttribute('aria-pressed',String(target==='pantry'?stocked:picked));
        pick.setAttribute('aria-label',target==='pantry'?`${product.name}: ${stocked?'aus dem Vorrat nehmen':'als vorhanden auswählen'}`:`${product.name}, ${amount}: ${picked?'Auswahl aufheben':'auswählen'}`);
        if(target==='pantry'&&mode==='recent'&&stocked)pick.setAttribute('aria-label',`${product.name}: vorhanden. Zum Aufbrauchen den Button unter dem Produkt wählen.`);
        if(target==='pantry'){pick.setAttribute('aria-keyshortcuts','Shift+F10');pick.setAttribute('aria-description','Lange drücken: auf die Einkaufsliste. Änderungen am Vorrat unten übernehmen.');}
        const check=node('span',undefined,'product-picked');check.append(svg('check'));check.hidden=target==='pantry'?!stocked:!picked;check.setAttribute('aria-hidden','true');
        pick.append(photo(product), node('span', product.name, 'product-name'));
        if (target === 'list') pick.append(node('small', amount, 'product-amount'));
        pick.append(check);
        const inList = exactOnList.get(productKey(product.name));
        // Der Vorrat fasst Sorten zusammen (Sushi-Reis zählt als Reis). Steht die Sorte unter anderem Namen im Vorrat, sagt die Kachel unter welchem.
        const stockedAs=category.value===INTERNATIONAL_CATEGORY&&stocked&&stock&&productKey(stock.name)!==productKey(product.name)?stock.name:'';
        if(target==='pantry'&&(stocked||chosen))pick.append(node('small',chosen?(chosen.pantryAvailable===false?(stockedAs?`${stockedAs} wird entfernt`:'Wird entfernt'):'Wird dem Vorrat hinzugefügt'):stockedAs?`Vorhanden als ${stockedAs}`:'Vorhanden','product-on-list'));
        else if(target==='list'&&inList)pick.append(node('small',`Auf Liste: ${shoppingAmount(inList)}`,'product-on-list'));
        else if(product.own)pick.append(node('small','Eigenes Produkt','product-on-list'));
        if(mode==='recent')pick.append(node('small',`${purchaseLabel(product.shopBoughtAt)}${product.boughtBy?` von ${product.boughtBy}`:' · Käufer unbekannt'}`,'product-on-list product-purchase'));
        if(target==='pantry'&&mode==='basics'&&isOptionalBasic(product.name))pick.append(node('small','Optional · beim Aufbrauchen nachkaufen','product-on-list'));
        if(consumed)pick.append(node('small','Aufgebraucht','product-on-list'));
        else if(target==='pantry'&&stocked&&stock?.autoStock)pick.append(node('small',stock.autoStock.basic?'Grundvorrat · ohne Ablauf':`Automatisch bis ${new Date(stock.autoStock.expiresAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`,'product-on-list'));
        else if(mode==='recent'&&!stocked&&stock?.autoStock&&Date.parse(stock.autoStock.expiresAt)<=Date.now())pick.append(node('small','Automatisch abgelaufen','product-on-list'));
        pick.addEventListener('click',()=>{
          if(mode==='recent'&&stocked&&!chosen)return;
          clearError(); $('product-picker-feedback').hidden = true;
          if(selection.has(product.id))selection.delete(product.id);
          else selection.set(product.id,target==='list'?purchaseStart(product):{...product,quantity:number(product.quantity),pantryAvailable:!stocked});
          renderCart();renderProducts();
        });
        const star = node('button', undefined, 'product-star'); star.type = 'button'; star.dataset.productAction = 'star'; star.dataset.product = product.id;
        star.setAttribute('aria-label', `${product.name}: ${product.favorite ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}`);
        star.setAttribute('aria-pressed', String(Boolean(product.favorite))); star.append(svg('star'));
        star.addEventListener('click', () => { try { clearError(); onFavorite(product); renderProducts(); } catch (error) { fail(error); } });
        card.append(pick,star);
        if(target==='list'&&mode==='own'&&product.own&&onDeleteOwn){
          card.classList.add('has-own-delete');
          // Mülleimer mit Wort (2.144): eindeutig, aber erst nach Rückfrage wirksam; danach „Rückgängig“ in der Meldung.
          const remove=node('button',undefined,'product-delete');remove.type='button';remove.dataset.productAction='delete';remove.dataset.product=product.id;remove.setAttribute('aria-label',`${product.name} dauerhaft löschen`);
          remove.append(svg('trash'),node('span','Löschen'));
          remove.addEventListener('click',async()=>{try{
            const check=()=>{if(!dialog.open||scope!==getScope()||target!=='list'||mode!=='own'||submitting)throw new Error('Bitte den Reiter „Eigene“ erneut öffnen.');const found=library().find(row=>row.id===product.id);if(!found?.own)throw new Error('Nur eigene Produkte können gelöscht werden.');return found;};
            const asked=check();
            if(!await ask({title:'Eigenes Produkt löschen?',message:`„${asked.name}“ verschwindet aus der Produktauswahl und den Favoriten. Bereits angelegte Einkaufspositionen, Vorräte und Belege bleiben erhalten. 14 Tage lang lässt es sich unter „Kürzlich gelöscht“ zurückholen.`,confirmLabel:'Löschen',danger:true}))return;
            const current=check();
            const undo=onDeleteOwn(current);selection.delete(current.id);clearError();renderCart();renderProducts();
            const feedback=$('product-picker-feedback');feedback.replaceChildren(node('span',`„${current.name}“ aus eigenen Produkten gelöscht.`));
            if(onRestoreOwn&&undo){const back=node('button','Rückgängig','text-button product-undo');back.type='button';back.addEventListener('click',()=>{try{if(scope!==getScope())throw new Error('Bitte die Produktauswahl erneut öffnen.');onRestoreOwn(undo);feedback.replaceChildren(node('span',`„${current.name}“ ist wieder bei den eigenen Produkten.`));renderProducts();}catch(error){fail(error);}});feedback.append(' ',back);}
            feedback.hidden=false;
            (grid.querySelector('button')||search).focus({preventScroll:true});
          }catch(error){fail(error);}});card.append(remove);
        }

        if(target==='pantry'&&mode==='recent'&&!consumed&&onConsume){
          const consume=node('button',isOptionalBasic(product.name)?'Aufgebraucht & nachkaufen':'Aufgebraucht','secondary pantry-consume');consume.type='button';consume.dataset.productAction='consume';consume.dataset.product=product.id;consume.setAttribute('aria-label',`${product.name} als aufgebraucht markieren`);if(isOptionalBasic(product.name))consume.setAttribute('aria-description','Wird automatisch auf den Einkaufszettel gesetzt.');
          consume.addEventListener('click',()=>{try{if(scope!==getScope())throw new Error('Bitte die Vorratsauswahl erneut öffnen.');const restocked=onConsume(purchaseStart(product));for(const [id,selected]of selection)if(pantryKey(selected.name)===pantryKey(product.name))selection.delete(id);renderCart();renderProducts();$('product-picker-feedback').textContent=restocked?`${product.name} ist aufgebraucht und steht auf dem Einkaufszettel.`:`${product.name} ist aufgebraucht. Der Einkauf bleibt in der Historie.`;$('product-picker-feedback').hidden=false;}catch(error){fail(error);}});card.append(consume);
        }
        if (target === 'pantry' && onQuickBuy) {
          const buy = node('button', 'Nachkaufen', 'secondary pantry-quick-buy'); buy.type = 'button';
          buy.setAttribute('aria-label', `${product.name} nachkaufen`);
          buy.addEventListener('click', () => { try {
            if (scope !== getScope()) throw new Error('Bitte die Vorratsauswahl erneut öffnen.');
            onQuickBuy({ ...product, imageKey: product.imageKey || imageForProduct(product).key });
          } catch (error) { fail(error); } });
          card.append(buy);
        }
        cards.append(card);
      }
    }
    const count = target==='pantry'&&mode==='current'?visible.filter(product=>available.has(pantryKey(product.name))).length:visible.length;
    $('product-picker-status').textContent=mode==='current'?`${count} ${count===1?'Produkt':'Produkte'} im aktuellen Vorrat${count>visibleLimit?` · ${shown.length} angezeigt`:''}`:count?`${count} ${count===1?'Produkt':'Produkte'}${mode==='favorites'?' in Favoriten':mode==='frequent'?' häufig gekauft':mode==='basics'?' im Grundvorrat':mode==='recent'?' in den letzten 7 Tagen gekauft':''}${count>visibleLimit?` · ${shown.length} angezeigt`:''}`:
      search.value.trim()?'Keine passenden Produkte in dieser Auswahl.':mode==='favorites'?'Noch keine Favoriten. Merke Produkte unter „Alle“ mit dem Stern.':mode==='frequent'?'Hier erscheinen Produkte, die du mindestens zweimal eingetragen hast.':mode==='own'?'Hier findest du eure eigenen Artikel. Oder suche einen neuen Namen.':'Keine Produkte in dieser Kategorie.';
    if(!count&&mode==='recent')grid.append(node('p','Noch keine Einkäufe aus den letzten 7 Tagen. Hier erscheinen Produkte, die ihr unter „Im Laden“ abhakt.','empty'));
    if(!visible.length&&mode==='current')grid.append(node('p',search.value.trim()||category.value?'Keine passenden Produkte im aktuellen Vorrat. Unter „Alle“ findest du weitere.':'Dein aktueller Vorrat ist leer. Unter „Alle“ kannst du Produkte auswählen oder mit + eigene anlegen.','empty'));
    $('product-picker-count').textContent = `${selection.size} ausgewählt`;
    $('product-picker-more').hidden = visible.length <= visibleLimit;
    $('product-picker-more').textContent = `Weitere ${Math.min(PAGE_SIZE, Math.max(0, visible.length - visibleLimit))} Produkte anzeigen`;
    category.hidden=false;
    $('pantry-add-basics').hidden = target !== 'pantry' || mode !== 'basics';
    for (const tab of dialog.querySelectorAll('[data-product-mode]')) tab.setAttribute('aria-pressed', String(tab.dataset.productMode === mode));
    updateFooter();
    if (focusId && focusKey) form.querySelector(`[data-product-action="${focusKey}"][data-product="${CSS.escape(focusId)}"]`)?.focus({ preventScroll: true });
  }
  const ownDialog=$('pantry-own-dialog'),ownForm=$('pantry-own-form');let keepName='';
  function ownHint(){const typed=ownForm.elements.name.value.trim(),correction=keepName===typed?null:recognizeName?.(typed).correction;$('pantry-own-hint').hidden=!correction;$('pantry-own-hint').querySelector('span').textContent=correction?`Beim Hinzufügen: „${correction}“`:'';}
  $('pantry-own-add').addEventListener('click',()=>{ownForm.reset();keepName='';$('pantry-own-error').hidden=true;ownHint();ownDialog.showModal();ownForm.elements.name.focus();});
  ownForm.elements.name.addEventListener('input',()=>{keepName='';ownHint();});
  $('pantry-own-original').addEventListener('click',()=>{keepName=ownForm.elements.name.value.trim();ownHint();});
  ownForm.addEventListener('submit',event=>{
    event.preventDefault();try{
      if(target!=='pantry'||scope!==getScope())throw new Error('Die Datenverbindung hat sich geändert. Bitte den Vorrat erneut öffnen.');
      const typed=ownForm.elements.name.value.trim().replace(/\s+/g,' '),name=keepName===typed?typed:recognizeName?.(typed).name||typed;
      if(!name||name.length>120)throw new Error('Bitte einen Produktnamen mit 1 bis 120 Zeichen eingeben.');
      if(!pantryProductAllowed({name}))throw new Error('Der Vorrat ist für Lebensmittel und Drogerieprodukte gedacht.');
      const known=library().find(product=>pantryKey(product.name)===pantryKey(name)),product=known?{...known,name}:ownProduct(name);
      if(!pantryKeys(getData().pantry||[]).has(pantryKey(name)))selection.set(product.id,{...product,pantryAvailable:true});
      else selection.delete(product.id);
      mode='current';search.value=name;category.value='';visibleLimit=PAGE_SIZE;clearError();$('product-picker-feedback').hidden=true;renderCart();renderProducts();ownDialog.close();
      dialog.querySelector('[data-product-mode][aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});
    }catch(error){$('pantry-own-error').textContent=error.message;$('pantry-own-error').hidden=false;}
  });
  $('pantry-add-basics').addEventListener('click',()=>{
    if(target!=='pantry')return;
    const available=pantryKeys(getData().pantry||[]),products=library();let added=0;
    for(const basic of GROCERY_PRODUCTS.filter(isPantryBasic)){
      const product=products.find(row=>pantryKey(row.name)===pantryKey(basic.name))||basic;
      if(available.has(pantryKey(product.name)))selection.delete(product.id);
      else{selection.set(product.id,{...product,pantryAvailable:true});added++;}
    }
    mode='basics';search.value='';category.value='';visibleLimit=PAGE_SIZE;clearError();renderCart();renderProducts();
    $('product-picker-feedback').textContent=added?`${added} Grundvorratsprodukte ausgewählt – unten übernehmen.`:'Der Grundvorrat ist bereits vorhanden.';$('product-picker-feedback').hidden=false;
    $('product-picker-add').scrollIntoView({block:'nearest'});
  });
  bindWishHold(form, '.product-pick', id => { try { const recent=mode==='recent'?recentPurchases(getData().recentItems||[]).find(row=>ownProduct(row.name).id===id):null;const product = library().find(p => p.id === id)||(recent?ownProduct(recent.name,recent):null); if (product) onQuickBuy?.({ ...product, imageKey: product.imageKey || imageForProduct(product).key }); } catch (error) { fail(error); } }, () => !dialog.open || target !== 'pantry' || scope !== getScope());
  grid.addEventListener('selectstart', event => { if (target === 'pantry') event.preventDefault(); });
  for (const group of CATEGORIES) category.add(new Option(group.label, group.id));
  search.addEventListener('input', () => { visibleLimit = PAGE_SIZE; clearError(); renderProducts(); });
  category.addEventListener('change', () => { visibleLimit = PAGE_SIZE; renderProducts(); });
  store.addEventListener('change', () => { clearError(); renderProducts(); });
  for (const tab of dialog.querySelectorAll('[data-product-mode]')) tab.addEventListener('click', () => {
    if(mode!==tab.dataset.productMode)search.value='';
    mode=tab.dataset.productMode;visibleLimit=PAGE_SIZE;clearError();renderProducts();
  });
  $('product-picker-more').addEventListener('click', () => { const firstNew = visibleLimit; visibleLimit += PAGE_SIZE; renderProducts(); grid.querySelectorAll('.product-pick')[firstNew]?.focus({ preventScroll: true }); });
  $('product-picker-clear').addEventListener('click', () => { selection.clear(); $('product-picker-feedback').hidden = true; renderCart(); renderProducts(); });
  $('product-picker-count').addEventListener('click', () => { if (target === 'list' && selection.size) { $('product-picker-cart').open = true; $('product-picker-cart').scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!dialog.open || submitting || !selection.size) return;
    try {
      clearError();if(scope!==getScope())throw new Error('Die Datenverbindung hat sich geändert. Bitte die Auswahl erneut öffnen.'); if(target==='list')for(const [id,controls]of cartControls){try{Object.assign(selection.get(id),controls.read());}catch(error){throw new Error(`${selection.get(id).name}: ${error.message}`);}} const selected = target === 'pantry' ? [...selection.values()] : selectedProducts(selection);
      if (target === 'list' && store.value && !getStores().some(shop => shop.id === store.value)) throw new Error('Dieses Geschäft wurde gelöscht. Bitte wähle ein anderes.');
      submitting = true; updateFooter();
      const restocked=target === 'pantry'?onPantry(selected.map(product=>product.pantryAvailable===false?{...purchaseStart(product),pantryAvailable:false}:product)):[];
      if(target!=='pantry')onAdd(selected,store.value);
      selection.clear();
      if(target==='pantry'){$('product-picker-feedback').textContent=`Vorrat gespeichert.${restocked?.length?` Auf dem Einkaufszettel: ${restocked.join(', ')}.`:''}`;$('product-picker-feedback').hidden=false;renderCart();renderProducts();}
      else dialog.close();
    } catch (error) { fail(error); }
    finally { submitting = false; updateFooter(); }
  });
  dialog.addEventListener('close', () => { if (!dialog.open) { stockChanges={};$('smart-stock-controls').open=false;showHelp(false);tabOrder.cancel(); selection.clear();$('pantry-own-dialog').close();renderCart(); clearError(); } });
  return {
    open(storeId = '', options = {}) {
      tabOrder.cancel();
      target=options.target==='pantry'?'pantry':'list';
      stockChanges={};$('smart-stock-controls').open=false;
      $('product-tabs-order').hidden = target !== 'pantry';
      tabOrder.arrange(target);
      $('product-picker-cart').open = false;
      dialog.dataset.target=target;
      scope = getScope(); $('product-picker-feedback').hidden = true; selection.clear(); search.value = ''; category.value = ''; clearError(); visibleLimit = PAGE_SIZE;
      mode=target==='pantry'?'current':library().some(product=>product.favorite)?'favorites':'all';
      if(target==='list'&&['all','favorites','frequent','own'].includes(options.mode))mode=options.mode;
      resetHelp();
      dialog.querySelector('.product-target').hidden=target!=='list';
      $('pantry-own-add').hidden=target!=='pantry';
      dialog.querySelector('[data-close]').setAttribute('aria-label',target==='pantry'?'Vorratsauswahl schließen':'Produktauswahl schließen');
      for(const tab of dialog.querySelectorAll('[data-product-mode]'))tab.hidden=target==='pantry'?tab.dataset.productMode==='own':['current','basics','recent'].includes(tab.dataset.productMode);
      renderStores(); store.value = getStores().some(shop => shop.id === storeId) ? storeId : '';
      renderCart(); renderProducts(); dialog.showModal(); dialog.scrollTop = 0;
      // Auf dem iPhone keine Tastatur beim Öffnen: Erst bewusst in die Suche tippen.
      dialog.querySelector('[data-close]')?.focus({ preventScroll: true });
      // Der aktive Filter bleibt auch auf schmalen Handys erkennbar.
      dialog.querySelector('[data-product-mode][aria-pressed=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    },
    refresh() {
      if (!dialog.open) return;
      if (getScope() !== scope) { dialog.close(); return; }
      renderStores(); renderProducts();
    },

  };
}
