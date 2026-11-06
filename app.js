import { openOrderControls, watchSaveForms, resetSaveFeedback, confirmDataSave, confirmFormSave, confirmAutoSave, singleOpenAccordion, scrollHints, evenTabs } from './ui-controls.js';
import { createDraftStore } from './drafts.js';
import { checkedRecipeGroups } from './recipe-tags.js';
import { mountRecipeTagPicker } from './recipe-tag-picker.js';
import { categorizedPurchases, defaultExpenseCategory } from './expense-categories.js';
import { mountExpenseCategoryPicker } from './expense-category-view.js';
import {automaticStockChanges,consumeStockChanges,isOptionalBasic,nextStockBoundary,optionalRestockOperations,saveSmartStockChange,stockTransferNotice,undoAutomaticStockChanges} from './smart-stock.js';
import { closeRecipeStock, recipeStockView, refreshRecipeStock } from './recipe-stock-view.js';
import { backupPhotoIds, makeRestoreOperation, mountBackupRestore, recoveryStorageKey } from './backup-restore.js';
import { active, addToList, sameIngredient, aliasApplies, clone, duplicateFolds, emptyData, foldIntoList, frequentItems, inPantry, isCookingWater, listRow, merge, operation, pantryAdditions, pantryKeys, pantryKey, positive, spellingVariants, suggestItemNames, uid, validDay, validate } from './data.js';
import { mountStoreOrder, orderedStores, reorderedStoreIds, isStoreVisible as visibleStore } from './store-order.js';
import { defaultOfferUrl, localDay, offerUrl, productKey, storeOfferUrl, unitSpec } from './prices.js';
import { hasProductPrice, priceOverview, productPriceIndex, withProductPrice } from './product-prices.js';
import { splitSteps } from './cook.js';
import { ALL_STORES, HOLD_FINISH_MS, HOLD_ITEM_MS, HOLD_UNLOCK_MS, finishable, isSeparate, lockSeconds, shopAllView, shopCount, shopView, takesAnywhere, withoutSeparate } from './shop.js';
import { brandOf, chainForStore, defaultSymbol, symbolOf } from './brand.js';
import { REGULAR_SYMBOLS, NOTES_SYMBOL, DISPLAY_MODES, DISPLAY_LABELS, displayModeOf, fixedSymbol, symbolName, suggestedListName, uniqueName } from './list-symbols.js';
import { privateView, privateViewId } from './private-list.js';
import { mountPrivateList } from './private-list-view.js';
import { catalogByKey, searchCatalog } from './store-catalog.js';
import { productGroup, productGroupMigration, reuseProductNames } from './product-groups.js';
import { GROCERY_PRODUCTS, favoriteId, ownProductRemoval } from './product-catalog.js';
import { mountProductPicker } from './product-picker.js';
import { mountPantryBuy } from './pantry-view.js';
import { mountSpending } from './spending-view.js';
import { buyerNameOf, liveMembers, memberKey, ownMember, prepareMember, renameMember } from './family.js';
import { ingredientPantryProduct, pantryChanges, pantrySelectionChanges } from './pantry.js';
import { BUILTIN_PER_DAY, BUILTIN_SOURCE, DAILY_MAX, dailyRecord, dailyHistory, dailySnapshot, builtinKey, draftFromBuiltin, extractRecipeLinks, planBuiltin, planDay, recipeKey, validBuiltin } from './daily.js';
import { dragDelete } from './dragdelete.js';
import { wishGroup, wishImage } from './wish-images.js';
import { bindWishHold, hasWishDetails, productLink } from './wishes.js';
import { currentIds, newFromOthers } from './news.js';
import { aliasKey, parseReceipt, storeForChain } from './receipt.js';
import { NO_AMOUNT, firstUrl, hostLabel, htmlToText, ingredientLabel, parseIngredientLine, parseRecipeText, recipeFromAnyText, recipeFromHtml, webUrl, recipeTagKey, uniqueRecipeTags } from './recipe-import.js';
import { PUBLIC_PROXIES, fetchRecipePage, publicProxyEnabled, workerAddress, workerHost } from './page-source.js';
import { CATEGORIES, categoryLabel, groupByCategory, isCategory, itemCategory, learnCategories, orderCategories, suggestCategory } from './categories.js';
import { groupImageFor, imageForProduct, paintProductImage } from './product-images.js';
import { makeNameMatcher } from './product-names.js';
import { shoppingAmount, purchaseView, rememberedAmount, validPurchaseAmount, unitChoice, newerUnitChoice, amountChoice, newerAmountChoice } from './buying.js';
import { planReduction, planRemovalCounts, planRemovalDetails, planExistingDetails } from './plan-list.js';
import { mountQuantityControls } from './quantity-controls.js';
import { GROCERY_NAMES } from './grocery-names.js';
import { shoppingDeficits, addDays, aggregateIngredients, dayMonthLabel, dayName, isoDate, recipeChanges, relativeDay, shortHash, snapshotRows, weekBasket, weekDays, weekLabel, weekRowKeys, weekStart, weekTakeId } from './plan.js';
import { LONG_AGO, WITH_PANTRY, WITH_SHOPPING, byOften, cookCount, filterOptions, pickRecipes } from './recipe-filter.js';
import { isJpeg, localPhotoUrl, photoPath, photosDir, prunePhotos, removePhoto, retainedPhotoIds, queued, queuePhoto, readPhoto, resizePhoto, storePhoto, toBase64, unqueuePhoto } from './photos.js';
import { makeZip } from './zip.js';
import { parseQuantity } from './numbers.js';
import { addToQuarantine, applicableOps } from './pending-guard.js';
import { APP_VERSION } from './version.js';
import { contentsRequest, decodeFile, encodeFile } from './github.js';
import { armDirty, disarmDirty, refreshDirty } from './dirty-save.js';
import { SINGLE_DELETE, TRASH_DAYS, TRASH_KINDS, purgeChanges, restoreChanges, trashCounts, trashDayLabel, trashEntries, undoRestoreChanges, withBefore } from './trash.js';
import { layoutRecipe, sheetIngredient } from './recipe-sheet.js';
import { jpegInfo, makePdf } from './pdf.js';
import { renderSheet } from './sheet-view.js';
import { LIMIT_BYTES, POLICY, compact, due, purgeDue, sizeOf } from './compact.js';
import { namesFrom, rankRecipes, indexNames, availability, required, canCookRecipe } from './cookable.js';
import { ask, mountAsk } from './ask.js';
import { canShareFiles, downloadFile, externalLink, isStandaloneApp, mountExternalLinks, saveFile, shareFile, usesServiceWorker, vibrate } from './platform.js';
import { budgetStatus, dayLabel as spendDay, diningCounts, diningFields, diningKind, diningPlaces, diningRating, hasRating, lastRating, ratingStars, RATING_MEANING, duplicatePurchase, formatAmount, isDining, monthOf, parseAmount, parseBudgetAmount, purchaseFields, purchaseItems, purchaseValue, receiptAmount, storeNameOf, DINING_LABEL } from './spending.js';

const $ = selector => document.querySelector(selector);
const recipeTagPicker=mountRecipeTagPicker({input:$('#recipe-form').elements.tags,trigger:$('#recipe-groups-toggle'),selection:$('#recipe-groups-selection'),menu:$('#recipe-groups-menu'),options:$('#recipe-groups-options'),feedback:$('#recipe-groups-feedback'),warning:$('#recipe-groups-warning'),custom:$('#recipe-group-custom'),add:$('#recipe-group-add'),done:$('#recipe-groups-done'),dialog:$('#recipe-dialog'),knownTags:()=>active(state.recipes).flatMap(recipe=>recipe.tags||[]),recipe:()=>({name:$('#recipe-form').elements.name.value,ingredients:[...document.querySelectorAll('#ingredient-editor [data-field=name]')].map(node=>node.value)})});
const CONFIG_KEY = 'einkauf-settings-v1';
// Nur neue Geräte starten mit diesen Werten; gespeicherte Einstellungen behalten ihre bisherigen Vorgaben.
// Die Startwerte vor dem ersten Anzeigen müssen zu theme.js passen.
const DISPLAY_DEFAULTS = Object.freeze({theme:'light',storeStyle:'text',palette:'gruen',glass:true,glassBg:'schlicht',glassLevel:65,groupItems:true,productImages:true});
watchSaveForms();
scrollHints();
evenTabs(document.querySelector('.tabs'));
document.querySelectorAll('[data-app-version]').forEach(node => { node.textContent = `Version ${APP_VERSION}`; });
let config = {}, base = emptyData(), pending = [], state = emptyData();
// Produktbilder: eigene lokale Motive rechts in der Artikelzeile, sonst Gruppenbild (Einstellung „Produktbilder anzeigen“, Standard an).
const imagesOn = () => config.productImages !== false;
// Frühere Fassungen (2.13) hatten einen Speicher für Internet-Fotos; er wird nicht mehr gebraucht.
for (const old of ['einkauf-images-v1', 'einkauf-images-v2']) { try { localStorage.removeItem(old); } catch { /* ohne Speicher nichts zu löschen */ } }
let busy = false, ready = false, view = 'all', lastTime = 0, noticeTimer = 0;
let trashFilter = 'all', trashUndo = null, networkDown = false, bandTimer = 0;   // Papierkorb und Offline-Anzeige
let restoring = false, restoreController = null;
let productPicker = null, pantryBuyer = null, spendingView = null, privateList = null, expenseCategoryPicker = null;
let stockClockTimer=0,recipeAvailabilitySnapshot='';
const storeReorders = [];
let recipeBaseline = null, ingredientBaseline = [], transferRecipe = null;
let itemBaseline = null;
let wishBaseline = null;
let tagFilter = '', remoteEtag = '', deferredImport = null, deferredAdd = null;
let favoritesOnly = false, planWeek = weekStart(isoDate()), mealBaseline = null;
/* Sortierung der Rezeptliste (2.140), pro Gerät gemerkt:
   - „A–Z“: Favoriten zuerst, dann nach Namen (wie bisher),
   - „Zuletzt hinzugefügt“: neu angelegte, importierte und aus den Rezepten des Tages übernommene Rezepte zuerst,
   - „Lange nicht gekocht“: zuerst, was noch nie oder am längsten nicht auf dem Tisch stand (bis 2.139 ein Filterknopf). */
const RECIPE_SORT_KEY = 'einkauf-recipe-sort-v1';
const byTitle = (a, b) => a.name.localeCompare(b.name, 'de');
const RECIPE_ORDER = {
  name: byTitle,   // rein alphabetisch (2.165): Ein Stern verschiebt das Rezept nicht mehr; Favoriten zeigt der Filter „★ Favoriten“
  new: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || byTitle(a, b),
  cooked: (a, b) => (a.lastCookedAt || '').localeCompare(b.lastCookedAt || '') || byTitle(a, b),
  often: (a, b) => byOften(a, b)   // 2.166: am häufigsten gekochte zuerst
};
let recipeSort = (() => { try { const value = localStorage.getItem(RECIPE_SORT_KEY); return Object.hasOwn(RECIPE_ORDER, value) ? value : 'name'; } catch { return 'name'; } })();
let pendingPhoto = null, photoRemoved = false, previewUrl = '', photoEditVersion = 0;
const photoMiss = new Map(), photoJobs = new Map();
let importSource = 'link', importAbort = null, previewUrls = [];
const portions = new Map(), openRecipes = new Set();
mountAsk();
/* Kein Fokusring am × (2.167): Beim Öffnen setzt der Browser den Fokus auf das erste Bedienelement, meist das × oben rechts; Safari auf dem iPhone
   zeichnet darum einen zweiten Ring. Liegt der Fokus danach auf dem ×, wandert er unsichtbar auf die Überschrift des Fensters (Tab führt weiter). */
if (typeof HTMLDialogElement === 'function' && !HTMLDialogElement.prototype.showModal.calmFocus) {
  const nativeShowModal = HTMLDialogElement.prototype.showModal;
  const calmShowModal = function () {
    nativeShowModal.call(this);
    const focused = document.activeElement, title = this.querySelector('.sheet-head h2, .sheet-head h3');
    if (!title || !focused?.matches?.('.sheet-head [data-close]') || !this.contains(focused)) return;   // Rückfragen behalten den Fokus auf „Abbrechen“
    if (!title.hasAttribute('tabindex')) title.tabIndex = -1;
    title.focus({ preventScroll: true });
  };
  calmShowModal.calmFocus = true;
  HTMLDialogElement.prototype.showModal = calmShowModal;
}
/* Fokusring nur bei Tastaturbedienung (2.169): Setzt die App den Fokus selbst auf einen Knopf (z. B. „Abbrechen“ in einer Rückfrage, das × oder
   „Weiter“), zeichnet Safari auf dem iPhone einen zweiten Ring um den Knopf, obwohl nur getippt wurde. Nach einem Tipp oder Klick trägt <html> darum
   data-pointer, und styles.css zeichnet dann keinen Fokusring. Eine Taste außerhalb eines Textfelds (Tab auch darin) schaltet die Ringe wieder ein;
   Tippen in ein Feld, auch auf der Bildschirmtastatur, zählt nicht als Tastaturbedienung. */
{
  const html = document.documentElement, modifiers = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn']);
  const typing = target => target?.isContentEditable || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLInputElement && !/^(button|submit|reset|checkbox|radio|range|file|color|image)$/.test(target.type));
  document.addEventListener('pointerdown', () => { html.dataset.pointer = ''; }, true);
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || modifiers.has(event.key)) return;
    if (event.key !== 'Tab' && typing(event.target)) return;
    delete html.dataset.pointer;
  }, true);
}
singleOpenAccordion($('#help-body'), '.help-section');
singleOpenAccordion($('#recipe-list'), '.recipe-details', () => {
  openRecipes.clear();
  const opened = $('#recipe-list .recipe-details[open]');
  if (opened) openRecipes.add(opened.closest('[data-recipe-id]').dataset.recipeId);
});
const format = number => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(number);
const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
// Für Eingabefelder: ohne Tausenderpunkt, sonst würde „1.000“ später als 1 gelesen.
const plain = number => String(Math.round(number * 1000) / 1000).replace('.', ',');
const dateTime = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at));
const shortDate = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(new Date(at));
const connected = () => Boolean(config.owner && config.repo && config.token);
const namespace = (value = config) => value.owner && value.repo ?
  `einkauf-data-v1:${JSON.stringify([value.owner.toLowerCase(), value.repo.toLowerCase(), value.branch, value.path])}` : 'einkauf-demo-v1';
// Beim vollständigen Ersetzen zählt jede Änderung seit der Vorschau.
const restoreSignature = () => JSON.stringify(state);
// Wenn sich weder Zeitstempel noch Zahl der angewendeten Änderungen ändern, hat sich auch nichts Sichtbares geändert.
const signature = () => `${state.updatedAt}|${state.sync.applied.length}|${state.items.length}`;
// Gemerkte Namen, die wirken: bestätigte Schreibweisen und ausdrücklich behaltene Zuordnungen. Fragwürdige alte Zuordnungen (vom Kassenbon) wirken nie (siehe aliasKind in data.js).
const appliedAliases = () => active(state.aliases || []).filter(aliasApplies);
// Die Artikel der Einkaufsliste mit bestätigten Schreibweisen („Zwiebel“ → „Zwiebeln“), auch rückwirkend. Nur sie entscheiden, was schon auf der Liste steht.
let listMemo = { for: null, rows: [] };
function listItems() {
  if (listMemo.for !== state) {
    const rename = new Map(appliedAliases().map(alias => [alias.from, alias.name]));
    listMemo = { for: state, rows: state.items.map(row => { const to = rename.get(aliasKey(row.name)); return to ? { ...row, name: to } : row; }) };
  }
  return listMemo.rows;
}
// Was die App über Artikel weiß: die Artikel der Liste plus das Namensgedächtnis aus dem Aufräumen (siehe compact.js). Nur zum Raten (Kategorie, Einheit, Vorschläge),
// nie dafür, ob etwas schon auf der Liste steht: dafür gibt es listItems().
let historyMemo = { for: null, rows: [] };
function itemHistory() {
  if (historyMemo.for !== state) {
    const rename = new Map(appliedAliases().map(alias => [alias.from, alias.name]));
    const named = row => { const to = rename.get(aliasKey(row.name)); return to ? { ...row, name: to } : row; };
    historyMemo = { for: state, rows: [...listItems(), ...(state.names || []).map(entry => named({ name: entry.name, category: entry.category, unit: entry.unit, updatedAt: entry.at, createdAt: entry.at, weight: entry.count, purchaseUnit: entry.purchaseUnit, purchaseAt: entry.purchaseAt, purchaseMeasure:entry.purchaseMeasure,...amountChoice(entry) }))] };
  }
  return historyMemo.rows;
}
// Wortschatz für die Vorschläge beim Eintippen: eigene Artikel (itemHistory) vor Rezeptzutaten, Namen aus Kassenbons und bestätigten Zuordnungen, davor fest eingebaute häufige Artikel.
let vocabMemo = { for: null, rows: [] };
function suggestionHistory() {
  if (vocabMemo.for !== state) {
    const recipes = new Set(active(state.recipes).map(recipe => recipe.id)), plainName = name => String(name).replace(/\([^)]*\)/g, ' ').split(',')[0].trim().replace(/\s+/g, ' ');
    const extra = [...active(state.ingredients).filter(row => recipes.has(row.recipeId)).map(row => plainName(row.name)), ...active(state.pantry || []).map(row => row.name), ...active(state.prices).map(row => row.name), ...appliedAliases().map(row => row.name)];
    vocabMemo = { for: state, rows: [...itemHistory(), ...extra.filter(Boolean).map(name => ({ name, weight: 0.5 })), ...GROCERY_NAMES.map((name, index) => ({ name, weight: 0.4 - index * 0.002 })),
      ...GROCERY_PRODUCTS.filter(product => !GROCERY_NAMES.includes(product.name)).map(product => ({ ...product, weight: 0.05 }))] };
    vocabMemo.match = makeNameMatcher(vocabMemo.rows);
  }
  return vocabMemo.rows;
}
const recognizeName = typed => { suggestionHistory(); const result=vocabMemo.match(typed); return productGroup(typed) ? {...result,correction:null} : result; };
let itemQuantity = null, editQuantity = null;
const SVG_NS = 'http://www.w3.org/2000/svg';

// Ausschließlich Textknoten für Nutzereingaben: Rezeptnamen können kein HTML ausführen.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg'), use = document.createElementNS(SVG_NS, 'use');
  svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#i-${name}`); svg.append(use);
  return svg;
}
function button(text, action, className = 'secondary') {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', () => guard(action));
  return node;
}
function iconButton(name, label, action, className = '') {
  const node = button('', action, `icon-button ${className}`.trim());
  node.append(icon(name)); node.setAttribute('aria-label', label); node.title = label;
  return node;
}
function message(text = '') {
  document.querySelectorAll('[data-dialog-error]').forEach(node => { node.hidden = true; });
  const dialog = document.querySelector('#wish-dialog[open]') || document.querySelector('#store-catalog-dialog[open]') || document.querySelector('#store-add-dialog[open]') || document.querySelector('dialog[open]');
  $('#message').textContent = text; $('#message').hidden = !text || Boolean(dialog);
  if (text && dialog) {
    let alert = dialog.querySelector('[data-dialog-error]');
    if (!alert) {
      alert = element('p', '', 'dialog-error'); alert.dataset.dialogError = ''; alert.setAttribute('role', 'alert'); dialog.prepend(alert);
    }
    alert.textContent = text; alert.hidden = false; alert.scrollIntoView({ block: 'nearest' });
  }
}
function guard(action) {
  try { const result = action(); if (result?.catch) result.catch(error => message(error.message)); }
  catch (error) { message(error.message); }
}
function storageWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error('Der Browser kann nichts mehr lokal speichern. Diese Änderung wurde nicht übernommen. Unter Optionen → Datenumfang siehst du, was Platz belegt, und kannst den älteren Tagesverlauf löschen oder aufräumen.'); }
}
function saveConfig(next) { storageWrite(CONFIG_KEY, next); config = next; confirmAutoSave(document.activeElement); }
// Erst zusammenführen, dann schreiben: So wird nie eine Kombination gespeichert, die sich beim nächsten Start nicht laden ließe.
function saveLocal(nextBase, nextPending, nextState = merge(nextBase, nextPending)) {
  storageWrite(namespace(), { base: nextBase, pending: nextPending });
  base = nextBase; pending = nextPending; state = nextState;
}
/* Beiseitegelegte Änderungen (siehe pending-guard.js): Sie blockieren den Abgleich nicht mehr, gehen aber auch nicht still verloren. */
const quarantineKey = () => `einkauf-quarantine-v1:${namespace()}`;
function quarantined() { try { const list = JSON.parse(localStorage.getItem(quarantineKey())); return Array.isArray(list) ? list : []; } catch { return []; } }
function quarantine(entries) {
  if (!entries.length) return;
  let kept = true;
  try { localStorage.setItem(quarantineKey(), JSON.stringify(addToQuarantine(quarantined(), entries))); } catch { kept = false; }
  renderQuarantine();
  message(`${entries.length === 1 ? 'Eine Änderung ließ' : `${entries.length} Änderungen ließen`} sich nicht mit dem gemeinsamen Stand zusammenführen. Alle anderen Änderungen werden weiter abgeglichen. ${kept ? 'Unter Optionen kannst du sie als Datei sichern oder verwerfen.' : 'Der Browser konnte sie nicht aufbewahren, weil der Speicher voll ist.'}`);
}
function renderQuarantine() {
  const list = quarantined(), card = $('#quarantine-card');
  card.hidden = !list.length;
  if (!list.length) return;
  $('#quarantine-text').textContent = `${list.length === 1 ? 'Eine Änderung ließ' : `${list.length} Änderungen ließen`} sich nicht mit dem gemeinsamen Stand zusammenführen und ${list.length === 1 ? 'wurde' : 'wurden'} beiseitegelegt. Alle anderen Änderungen werden normal abgeglichen. Letzter Grund: ${list.at(-1).error}`;
}
function status(text, mode = 'local') {
  $('#status').textContent = text; $('#status').dataset.state = mode; document.body.dataset.sync = mode;
  $('#sync-tab-state').textContent = ['pending', 'error'].includes(mode) ? `Abgleich: ${text}` : '';
  syncDetail();
  if (mode === 'ok' && connectFailed) { connectFailed = false; updateSaveButtons(); }
}
function syncDetail() {
  const node = $('#sync-detail');
  if (!connected()) { node.textContent = 'Deine Änderungen sind lokal gespeichert.'; return; }
  if (pending.length) { node.textContent = `${pending.length} ${pending.length === 1 ? 'Änderung nur' : 'Änderungen nur'} auf diesem Gerät – ${pending.length === 1 ? 'wird' : 'werden'} später gesendet`; return; }
  if (photoIssue?.scope === namespace()) { node.textContent = 'Ein Rezeptfoto fehlt auf diesem Gerät. Bitte aus einer ZIP-Sicherung wiederherstellen. Der Upload-Auftrag bleibt erhalten.'; return; }
  if (queued(queueKey()).length) { node.textContent = 'Rezeptfotos warten noch auf den Upload. Vor dem Gerätewechsel bitte den Abgleich abschließen.'; return; }
  let at = 0; try { at = Number(localStorage.getItem(`einkauf-last-saved-v1:${namespace()}`)) || 0; } catch { /* status remains available */ }
  const date = new Date(at), today = new Date().toDateString() === date.toDateString();
  node.textContent = at ? `Auf GitHub gespeichert · zuletzt ${today ? '' : date.toLocaleDateString('de-DE') + ' '}um ${date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr` : 'Warte auf den ersten erfolgreichen GitHub-Abgleich.';
}
function rememberSyncTime() { try { localStorage.setItem(`einkauf-last-saved-v1:${namespace()}`, String(lastSyncAt)); } catch { /* sync already succeeded */ } }
function restingStatus() {
  if (!connected()) status('Nur auf diesem Gerät', 'local');
  else if (pending.length) status(`${pending.length} Änderung(en) warten`, 'pending');
  else if (photoIssue?.scope === namespace()) status('Ein Rezeptfoto fehlt', 'error');
  else if (queued(queueKey()).length) status('Rezeptfotos warten auf Upload', 'pending');
  else if (ready && tokenWarning() !== null) status(`Token ${tokenLabel(tokenWarning())} · neuen anlegen`, tokenWarning() < 0 ? 'error' : 'pending');
  else if (ready) status('Mit GitHub abgeglichen', 'ok');
  else status('Noch nicht verbunden', 'pending');
}
function nextOp(collection, id, patch) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  return operation(collection, id, patch, config.actor || 'Unbekannt', new Date(lastTime).toISOString());
}
const stockOps=changes=>changes.map(({collection,id,patch})=>nextOp(collection,id,patch));
function stockRemovalOperations(products){
  const ops=[];
  for(const product of products){
    const at=new Date(Math.max(Date.now(),lastTime+1,Date.parse(state.updatedAt)+1)).toISOString();
    ops.push(...stockOps(consumeStockChanges(state,product.name)),...optionalRestockOperations(state,product,config.actor||'Unbekannt',at));
  }
  return ops;
}
// Kurzer Hinweis; verschwindet von selbst. Mit `undo` steht ein Knopf „Rückgängig“ dabei (etwas länger sichtbar).
let noticeUndo = null;
function showNotice(text, undo = null, { trash = false, action = '', ms = 0 } = {}) {
  $('#notice-text').textContent = text; $('#notice').hidden = false;
  $('#notice-undo').textContent = action || 'Rückgängig';   // z. B. „Liste öffnen“ nach dem Anlegen (2.152)
  // Gelöschtes (2.147): kleiner Mülleimer vor dem Text, „Rückgängig“ daneben; was nicht zurückgenommen wird, liegt danach im Papierkorb.
  $('#notice').classList.toggle('toast-trash', trash); $('#notice-icon').toggleAttribute('hidden', !trash);   // SVG kennt .hidden nicht
  noticeUndo = undo; $('#notice-undo').hidden = !undo;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('#notice').hidden = true; noticeUndo = null; }, ms || (undo ? 6000 : 4000));   // `ms`: eigene Anzeigedauer (z. B. „✓ Hab ich“, 2.164)
}
// Nach dem Speichern eines Bearbeiten-Fensters (2.147): kurze Bestätigung mit Uhrzeit; beim nächsten Öffnen steht sie grau auf dem Knopf.
const savedNotice = (name = '') => showNotice(`${name ? `„${name}“ gespeichert` : 'Änderungen gespeichert'} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`);
$('#notice-undo').addEventListener('click', () => { const undo = noticeUndo; noticeUndo = null; $('#notice').hidden = true; clearTimeout(noticeTimer); if (undo) guard(undo); });
/* „Häufig gekocht“ (2.167): Jedes Rezept, das einem Tag im Wochenplan zugeordnet wird, zählt einmal (cookCount): ein neues Gericht mit Rezept oder ein
   Gericht, das ein anderes Rezept bekommt. Entfernen, Verschieben, Wiederherstellen und Abhaken ändern den Zähler nicht (vergangene Gerichte bleiben gekocht). */
function withPlanCounts(ops) {
  const meals = new Map(), deltas = new Map(), add = (id, step) => { if (id) deltas.set(id, (deltas.get(id) || 0) + step); };
  for (const op of ops) {
    if (op.collection !== 'meals') continue;
    const before = meals.has(op.entityId) ? meals.get(op.entityId) : (state.meals || []).find(row => row.id === op.entityId) || null, after = { ...(before || {}), ...op.patch };
    const was = before && !before.deletedAt ? before.recipeId || '' : '', now = !after.deletedAt ? after.recipeId || '' : '';
    meals.set(op.entityId, after);
    if (now && was !== now && (!before || !before.deletedAt)) add(now, 1);   // neu eingeplant oder anderes Rezept; nicht beim Wiederherstellen
  }
  const extra = [...deltas].filter(([, step]) => step).flatMap(([id, step]) => {
    const recipe = active(state.recipes).find(row => row.id === id);
    return recipe ? [nextOp('recipes', id, { cookCount: Math.max(0, cookCount(recipe) + step) })] : [];
  });
  return extra.length ? [...ops, ...extra] : ops;
}
function commit(ops, notice = '') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (!ops.length) return;
  ops = withPlanCounts(ops);
  const nextPending = [...pending, ...ops];
  const nextState = merge(base, nextPending);
  // Eine einzige atomare localStorage-Schreiboperation sichert Daten und Warteschlange.
  saveLocal(connected() ? base : nextState, connected() ? nextPending : [], connected() ? nextState : undefined);
  if (notice) showNotice(notice);
  message(); render(); restingStatus(); confirmDataSave(ops);
  if (connected()) void sync();
}

function tab(name) {
  closeRecipeStock();
  for (const id of ['shopping', 'recipes', 'plan', 'spending', 'settings']) $(`#${id}`).hidden = name !== id;
  document.querySelectorAll('[data-tab]').forEach(node => {
    if (node.dataset.tab === name) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (name !== 'shopping' && selecting) setSelecting(false);
  if (name === 'settings') renderStorage();
  if (name === 'spending') renderSpending();
  if (name === 'recipes') { if (recipesStale) renderRecipes(); prefetchDaily(); }
  syncShopAwake(); syncChrome();
}
// Auswahlliste der Geschäfte; mit `allowNone` zusätzlich „Kein Geschäft“ (Wert ''), z. B. für Artikel, die noch nirgends gekauft werden sollen.
// `storesOnly`: nur echte Geschäfte, keine Listen (Artikel bearbeiten: ein Artikel der Einkaufsliste wandert nie in eine Liste, 2.161).
function storeOptions(select, preferred = select.value, allowNone = false, keepHidden = false, storesOnly = false) {
  select.replaceChildren();
  if (allowNone) select.add(new Option('Kein Geschäft', ''));
  for (const store of orderedStores(state.stores).filter(store=>(visibleStore(store)||(keepHidden&&store.id===preferred))&&(!isNotesStore(store)||store.id===preferred)&&!(storesOnly&&isSeparate(store)))) select.add(new Option(store.name, store.id));   // Notizen sind kein Ziel für Artikel
  select.value = [...select.options].some(option => option.value === preferred) ? preferred : allowNone ? '' : select.options[0]?.value ?? '';
}
function currentStore(id) {
  if (!id) return '';
  if (!active(state.stores).some(store => store.id === id)) throw new Error('Dieses Geschäft wurde inzwischen gelöscht. Bitte ein anderes auswählen.');
  return id;
}
/* Ansicht der Einkaufsliste: 'all' (alle Geschäfte, Startseite), 'none' (Artikel ohne Geschäft) oder die ID eines Geschäfts.
   Artikel eines gelöschten Geschäfts bleiben überall verborgen; Artikel ohne Geschäft (storeId '') gehören zu keinem Geschäft. */
// Artikel einer eigenen Liste (Geschäft mit „separate“, z. B. „Wünsche“) fehlen hier, außer `including` ist dieses Geschäft; `true` nimmt alle mit (für die Zähler an den Geschäften).
const visibleItems = (including = '') => {
  const live = new Set(orderedStores(state.stores).filter(visibleStore).map(store => store.id)), rows = active(state.items).filter(item => !item.storeId || live.has(item.storeId));
  return including === true ? rows : withoutSeparate(rows, orderedStores(state.stores), including);
};
// „Alle“ zeigt eine eigene Liste nicht mit; sie erscheint nur unter ihrem Geschäft.
const inView = item => view === 'all' ? !state.stores.some(store => store.id === item.storeId && !store.deletedAt && isSeparate(store)) : view === 'none' ? !item.storeId : item.storeId === view;
const viewStore = () => active(state.stores).find(store => store.id === view);
const storeName = id => active(state.stores).find(store => store.id === id)?.name || 'Ohne Geschäft';
// Welches Geschäft ein neuer Artikel bekommt: das der gewählten Ansicht, sonst keines.
const defaultStore = () => viewStore()?.id || '';
function showView(next) {
  const privateId=privateViewId(next);
  if(privateId&&!privateList?.has(privateId))return;
  if(privateId){if(selecting)setSelecting(false);privateList.select(privateId);}
  view = next;
  renderListVisibility();
  const form = $('#item-form');
  // Wer ein einzelnes Geschäft ansieht, legt neue Artikel meist dort an (sonst verschwänden sie aus der Liste).
  // In „Alle“ bleibt die letzte Auswahl stehen (außer eine eigene Liste wie „Wünsche“: dort verschwänden neue Artikel unbemerkt); „Ohne Geschäft“ wählt keines.
  if (viewStore()) form.elements.storeId.value = view;
  else if (view === 'none' || (view === 'all' && isSeparate(active(state.stores).find(store => store.id === form.elements.storeId.value)))) form.elements.storeId.value = '';
  renderStorePick(); storeChanged(); renderStoreChips(); renderItems();syncPrivateView();
}
function syncPrivateView() {
  const own=privateViewId(view)&&privateList?.has(privateViewId(view)),notes=!own&&Boolean(notesView()),plain=Boolean(own)||notes;
  $('#private-list-panel').hidden=!own;$('#item-form').hidden=plain;$('#items').hidden=plain;
  $('#shared-list-actions').hidden=plain;$('#mode-shop').disabled=plain;
  renderNotes();
  renderTrashLinks();   // in der geheimen Liste nur deren eigener Papierkorb-Hinweis
}
/* ---------- Notizen (2.150) ----------
   Eine eigene Liste mit dem Klemmbrett-Symbol („Symbol 5 · Notizen“) ist ein Notizzettel: nur Textzeilen, ohne Geschäft, Menge, Einheit,
   Produkte oder Namensvorschläge. Eine Zeile eintippen und mit „Fertig“/Enter bestätigen speichert sie und schließt die Tastatur; darunter
   öffnet das grüne Plus die nächste Zeile. Antippen ändert eine Notiz, lange halten und nach rechts ziehen löscht sie (mit „Rückgängig“).
   Gespeichert werden Notizen als Einträge dieser Liste (gemeinsam, mit Abgleich und Papierkorb); „Im Laden“ erscheint die Liste nicht. */
const isNotesStore = store => Boolean(store) && !store.deletedAt && isSeparate(store) && symbolOf(store) === NOTES_SYMBOL;   // hängt am festen Symbol, nie an der Anzeige
// Notizlisten stehen überall zuletzt in einem eigenen Bereich (2.152). In beiden Gruppen gilt die gespeicherte Reihenfolge.
const displayStores = rows => { const ordered = orderedStores(rows); return [...ordered.filter(row => !isNotesStore(row)), ...ordered.filter(isNotesStore)]; };
const notesView = () => { const store = viewStore(); return isNotesStore(store) ? store : null; };
const NOTE_LIMIT = 500;
let noteDraft = false, noteEditing = '';
const notesOf = store => active(state.items).filter(item => item.storeId === store.id)
  .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id)));
function noteInput(item = null) {
  const input = element('input', undefined, 'note-input');
  Object.assign(input, { type: 'text', maxLength: NOTE_LIMIT, autocomplete: 'off', enterKeyHint: 'done', placeholder: 'Notiz eintippen …', value: item?.name || '' });
  input.setAttribute('autocapitalize', 'sentences'); input.setAttribute('aria-label', item ? `Notiz „${item.name}“ ändern` : 'Neue Notiz');
  let finished = false;
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); input.blur(); }   // „Fertig“: speichern, Tastatur schließt
    else if (event.key === 'Escape') { event.preventDefault(); finished = true; noteDraft = false; noteEditing = ''; input.blur(); renderNotes(); }
  });
  input.addEventListener('blur', () => { if (finished) return; finished = true; guard(() => saveNote(input.value, item)); });
  return input;
}
function noteRow(item) {
  const row = element('li', undefined, 'note-row'); row.dataset.id = item.id;
  if (noteEditing === item.id) { row.classList.add('editing'); row.append(noteInput(item)); return row; }
  // Wer die Notiz angelegt hat (2.151): klein und schwach grau oben rechts, der Text fließt darunter weiter.
  const by = String(item.createdBy || '').trim(), author = by && by !== 'Unbekannt' ? by : '';
  const text = element('button', undefined, 'note-text'); text.type = 'button';
  if (author) text.append(element('span', `von ${author}`, 'note-by'));
  text.append(document.createTextNode(item.name));
  text.setAttribute('aria-label', `Notiz „${item.name}“${author ? ` von ${author}` : ''} ändern`);
  text.addEventListener('click', () => guard(() => editNote(item.id)));
  row.append(text); return row;
}
function renderNotes() {
  const store = notesView(), panel = $('#notes-panel'), list = $('#notes-list');
  panel.hidden = !store;
  if (!store) { noteDraft = false; noteEditing = ''; list.replaceChildren(); return; }
  panel.setAttribute('aria-label', store.name);
  // Wer gerade tippt, behält Zeile und Tastatur: Ein Abgleich zeichnet die Notizen erst danach neu.
  if (list.contains(document.activeElement) && document.activeElement.matches('input')) return;
  const notes = notesOf(store);
  if (noteEditing && !notes.some(note => note.id === noteEditing)) noteEditing = '';
  const drafting = noteDraft || !notes.length;
  list.replaceChildren(...notes.map(noteRow));
  if (drafting) { const row = element('li', undefined, 'note-row editing draft'); row.append(noteInput()); list.append(row); }
  $('#notes-add').hidden = drafting || Boolean(noteEditing);
  $('#notes-hint').hidden = !notes.length;
}
// Die Bestätigung unter der Liste nennt Notizen, nicht die Einkaufsliste.
function relabelNotesSave() {
  const note = $('#shopping-save-note');
  if (notesView() && !note.hidden) note.textContent = note.textContent.replace(/^Einkaufsliste gespeichert/, 'Notizen gespeichert');
}
function focusNote(input) {
  if (!input) return;
  input.focus({ preventScroll: true }); input.setSelectionRange?.(input.value.length, input.value.length);
  input.closest('li')?.scrollIntoView({ block: 'nearest' });
}
function editNote(id) {
  if (!notesView() || !active(state.items).some(item => item.id === id)) return;
  noteEditing = id; noteDraft = false; renderNotes();
  focusNote($('#notes-list .note-row.editing .note-input'));
}
function saveNote(text, item) {
  const store = notesView(), name = String(text || '').trim().slice(0, NOTE_LIMIT);
  noteDraft = false; noteEditing = '';
  if (!store) return;
  if (item) {
    const current = active(state.items).find(row => row.id === item.id);
    if (!current) { renderNotes(); return; }
    if (!name) { deleteItems([item.id]); return; }   // geleert: wie Löschen, mit „Rückgängig“
    if (name !== current.name) { commit([nextOp('items', item.id, { name })]); relabelNotesSave(); } else renderNotes();
    return;
  }
  if (!name) { renderNotes(); return; }
  commit([nextOp('items', uid(), { name, quantity: 1, unit: 'Stück', storeId: store.id, checked: false, createdBy: config.actor || 'Unbekannt' })]);
  relabelNotesSave();
}
$('#notes-add').addEventListener('click', () => guard(() => {
  if (!notesView()) return;
  noteDraft = true; noteEditing = ''; renderNotes();
  focusNote($('#notes-list .note-row.draft .note-input'));   // im selben Tipp: Die Tastatur öffnet sich auch auf dem iPhone
}));
// Schnellwahl des Geschäfts im Formular: ein Tipp wählt, ein zweiter Tipp auf dasselbe Geschäft nimmt die Auswahl zurück.
// Ohne Auswahl („Kein Geschäft“) bekommt der Artikel kein Geschäft.
// Gemeinsame Listen werden gemeinsam ein-/ausgeblendet. Ihre Einträge bleiben erhalten.
const isWishStore = store => store.wishlist === true || (isSeparate(store) && defaultSymbol(store.name) === 'gift');
const wishStores = () => orderedStores(state.stores).filter(isWishStore);
/* Trennlinie zwischen Supermärkten und eigenen Listen (2.165): Vor einer Liste (Wünsche, eigene Listen), die direkt auf ein Geschäft folgt, steht
   eine waagerechte Linie wie vor den geheimen Listen und den Notizen. Die gemeinsame Reihenfolge bleibt unverändert; nach dem Umsortieren und bei
   jedem Neuzeichnen werden die Linien neu gesetzt. */
function markListBoundaries(editor = $('#store-editor')) {
  editor.querySelectorAll(':scope > .store-list-line').forEach(line => line.remove());
  let previous = '';
  for (const row of [...editor.children]) {
    if (!row.matches('.store-row[data-store-id], .store-wishes-placeholder')) { previous = ''; continue; }
    const list = row.classList.contains('store-wishes-placeholder') || isSeparate(active(state.stores).find(store => store.id === row.dataset.storeId));
    if (list && previous === 'store') { const line = element('div', undefined, 'store-group-line store-list-line'); line.setAttribute('aria-hidden', 'true'); editor.insertBefore(line, row); }
    previous = list ? 'list' : 'store';
  }
}
function renderListVisibility() {
  // Geöffnete Bearbeitungsfelder behalten ihre noch nicht gespeicherten Werte.
  for (const row of [...$('#store-editor').children, ...$('#store-notes-editor').children]) {
    const store = active(state.stores).find(store => store.id === row.dataset.id),list=privateList?.lists.find(list=>list.id===row.dataset.privateListId);
    if(!store&&!list)continue;
    const enabled=store?visibleStore(store):list.enabled,name=store?.name||list.name;
    const toggle=row.querySelector('.store-visibility');if(toggle)updateVisibilityButton(toggle,name,enabled);
    const badge=row.querySelector('summary .store-pill');if(badge){badge.textContent=list?(enabled?'Geheim':'Geheim · ausgeblendet'):storePill(store,enabled);badge.hidden=Boolean(store&&enabled&&!isSeparate(store));}
    const open = row.querySelector('.store-wishes-open,.store-list-open'); if (open) open.disabled = !enabled;
  }
  const shown=new Set(visibleItems(true).map(item=>item.id));for(const id of selected)if(!shown.has(id))selected.delete(id);
}
function updateVisibilityButton(button,name,enabled){
  button.textContent=enabled?'Ausblenden':'Einblenden';button.setAttribute('aria-label',`${name} ${enabled?'ausblenden':'einblenden'}`);button.setAttribute('aria-pressed',String(enabled));button.disabled=!ready;
}
function listVisibilityButton(name,enabled,onToggle){
  const scope=namespace(),toggle=element('button',undefined,'secondary store-visibility');toggle.type='button';updateVisibilityButton(toggle,name,enabled);
  for(const type of ['pointerdown','touchstart','keydown'])toggle.addEventListener(type,event=>event.stopPropagation());
  toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();guard(()=>{if(scope!==namespace())throw new Error('Bitte die Listenverwaltung erneut öffnen.');onToggle();});});return toggle;
}
function setStoreVisibility(id){
  const store=active(state.stores).find(store=>store.id===id);if(!ready||!store)throw new Error('Bitte die Listenverwaltung erneut öffnen.');
  const enabled=!visibleStore(store),patch={listEnabled:enabled,...(isWishStore(store)||store.wishlistEnabled!==undefined?{wishlistEnabled:enabled}:{})};
  commit([nextOp('stores',id,patch)],`${store.name} ${enabled?'eingeblendet':'ausgeblendet · alle Einträge bleiben erhalten'}`);
  message();
}
function openWishlist(id) {
  if (!ready) throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');
  const store = wishStores().find(store => store.id === id && visibleStore(store));
  if (!store) throw new Error('Bitte Wünsche zuerst unter Geschäfte einblenden.');
  $('#stores-dialog').close();
  if (shopOn()) setShopMode(false);
  tab('shopping'); showView(store.id);
}
function enableMissingWishes() {
  const stores = wishStores();
  if(stores.length){renderStores();return;}
  const removed = !stores.length && state.stores.filter(row => row.deletedAt && isWishStore(row))
    .sort((a,b) => b.deletedAt.localeCompare(a.deletedAt))[0];
  const id = removed?.id || 'wishlist-default';
  commit([nextOp('stores', id, { name: removed?.name || 'Wünsche', separate: true, wishlist: true, wishlistEnabled: true,listEnabled:true, symbol: removed?.symbol || 'gift', deletedAt: null })],'Wünsche eingeblendet');
  if ($('#stores-dialog').open) renderStores();
}
function renderStorePick() {
  const form = $('#item-form'), box = $('#store-pick');
  queueMicrotask(() => { form.elements.name.placeholder = 'Was brauchst du?'; });
  if (form.elements.storeId.value && !active(state.stores).some(store => store.id === form.elements.storeId.value&&visibleStore(store))) form.elements.storeId.value = '';
  const current = form.elements.storeId.value;
  box.hidden=isSeparate(viewStore());
  box.replaceChildren();
  const add = (id, label, store = null) => {
    const chip = element('button', store ? undefined : label, 'chip'); chip.type = 'button'; chip.setAttribute('aria-pressed', String(id === current));
    if (store) chip.append(storeLabel(store));
    chip.addEventListener('click', () => {
      form.elements.storeId.value = id && id === form.elements.storeId.value ? '' : id;
      renderStorePick(); storeChanged();
    });
    box.append(chip);
  };
  add('', 'Kein Geschäft');
  for (const store of orderedStores(state.stores).filter(store=>visibleStore(store)&&!isSeparate(store))) add(store.id, store.name, store);
  $('#open-products').hidden = isSeparate(viewStore()) || isSeparate(active(state.stores).find(store => store.id === current));
  $('#open-pantry').hidden = $('#open-products').hidden;
}
function storeChanged() {
  const form = $('#item-form');
  refreshCategoryHint(); renderItemSuggestions();
}
// Listenansichten werden aus dem zusammengeführten lokalen Stand aufgebaut.
// Geöffnete Eingabeformulare bleiben bei Hintergrund-Aktualisierungen bestehen.
function render() {
  resetSaveFeedback(namespace());
  privateList?.refresh();
  renderListVisibility();
  if(viewStore() && !visibleStore(viewStore())) { view='all'; $('#item-form').elements.storeId.value=''; }
  $('#identity').textContent = config.actor || '';
  if (view !== 'all' && view !== 'none' && !viewStore() && !privateList?.has(privateViewId(view))) view = 'all';
  const form = $('#item-form'), formStore = form.elements.storeId.value;
  renderStorePick();
  if (form.elements.storeId.value !== formStore) storeChanged();
  renderStoreChips(); renderItems(); renderRecipesWhenVisible(); renderPlan(); renderSpending(); renderPantry(); renderAliases(); renderStorage(); renderQuarantine(); renderTrashLinks(); applyMode(); syncForm(); expenseCategoryPicker?.refresh();
  if ($('#trash-dialog').open) renderTrash();
  renderConnectionBand();
  if ($('#plan-recipe-dialog').open) renderPlanRecipe();
  if ($('#template-dialog').open) renderTemplates();
  if ($('#week-dialog').open && weekSignature(weekPlan()) !== weekSignature($('#week-form')._plan)) { refreshWeekRows(); showNotice('Der Wochenplan hat sich geändert: Die Vorschau ist aktualisiert.'); }   // z. B. hat die andere Person gerade übernommen
  if ($('#cookable-dialog').open) renderCookable();
  refreshRecipePick();
  if($('#transfer-dialog').open)updateTransfer();
  productPicker?.refresh();
  if($('#finish-dialog').open)renderFinishStockHint();
  scheduleStockRefresh();
  renderDailyButton();
  refreshDailyActions();
  form.querySelector('button[type=submit]').disabled = !ready;
  $('#add-recipe').disabled = !ready;
  $('#import-recipe').disabled = !ready;
  $('#manage-stores').disabled = !ready;
  $('#open-products').disabled = !ready;
  $('#open-pantry').disabled = !ready;
  $('#add-purchase').disabled = !ready; $('#spending-first').disabled = !ready; $('#spending-members').disabled = !ready;
  $('#add-dining').disabled = !ready; $('#dining-budget').disabled = !ready;
}
function describeStoreChip(chip, id, label, selected) {
  chip.dataset.id = id; chip.setAttribute('aria-label', label);
  chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', String(selected));
  const menu = selected || id === 'all' || id === ALL_STORES, reorder = chip.hasAttribute('data-store-id');
  if (menu) {
    chip.setAttribute('aria-description', 'Lange drücken für die Auswahl aller Geschäfte und Listen.');
    chip.setAttribute('aria-haspopup', 'dialog'); chip.setAttribute('aria-controls', 'store-quick-dialog');
  } else if (reorder) chip.setAttribute('aria-description', 'Lange halten und ziehen, um die Geschäftsreihenfolge zu ändern.');
  const shortcuts = [menu && 'Shift+F10', reorder && 'Alt+ArrowLeft Alt+ArrowRight'].filter(Boolean);
  if (shortcuts.length) chip.setAttribute('aria-keyshortcuts', shortcuts.join(' '));
}
function renderStoreChips() {
  storeReorders.forEach(order => order.cancel());
  const box = $('#store-chips'); box.replaceChildren();
  const everything = visibleItems(true), items = visibleItems();   // `items`: ohne eigene Listen (für „Alle“ und „Ohne Geschäft“)
  const open = id => (id === 'all' ? items : id === 'none' ? items.filter(item => !item.storeId) : everything.filter(item => item.storeId === id)).filter(item => !item.checked).length;
  const add = (id, label, count, store = null, secret = null) => {
    const chip = element('button', store || secret ? undefined : label, 'chip'); chip.type = 'button';
    if (store) { chip.append(storeLabel(store)); chip.dataset.storeId = id; if (isNotesStore(store)) chip.dataset.notes = ''; }
    if (secret) { chip.dataset.private = secret.id; chip.append(privateLabel(secret)); }
    describeStoreChip(chip, id, label, id === view);
    if (count) chip.append(element('span', String(count), 'count'));
    chip.addEventListener('click', () => showView(id));
    box.append(chip);
  };
  add('all', 'Alle', open('all'));
  box.lastElementChild.dataset.allStores = '';
  // „Ohne Geschäft“ erscheint nur, wenn es solche Artikel gibt (oder gerade angezeigt wird).
  if (items.some(item => !item.storeId) || view === 'none') add('none', 'Ohne Geschäft', open('none'));
  const shown = displayStores(state.stores).filter(visibleStore), notes = shown.filter(isNotesStore);
  const divider = () => { const line = element('span', undefined, 'chip-divider'); line.setAttribute('aria-hidden', 'true'); box.append(line); };
  // Eigene Listen (2.166): vor jeder Liste, die auf ein Geschäft folgt, eine senkrechte Linie (in der Listenauswahl waagerecht), wie unter „Geschäfte & Listen“
  let previousStore = false;
  for (const store of shown.filter(store => !isNotesStore(store))) { if (isSeparate(store) && previousStore) divider(); previousStore = !isSeparate(store); add(store.id, store.name, open(store.id), store); }
  // Geheime Listen (2.161): ebenfalls hinter einer senkrechten Linie, immer nach allen Geschäften und Listen, vor den Notizen
  const secrets = (privateList?.lists || []).filter(list => list.enabled);
  if (secrets.length) divider();
  for (const list of secrets) add(privateView(list.id), list.name, privateList.count(list.id), null, list);
  // Notizen (2.152): ein eigener Bereich hinter einer senkrechten Linie, weil sie anders funktionieren
  if (notes.length) divider();
  for (const store of notes) add(store.id, store.name, open(store.id), store);
  // Nur die Chip-Leiste verschieben, nie die ganze Seite.
  const selected = box.querySelector('[aria-selected=true]');
  if (selected) box.scrollLeft = Math.max(0, selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2);
}
function openStoreQuickMenu(root) {
  const box = $('#store-quick-options'); box.replaceChildren();
  const inStore = root.id === 'shop-chips', scope = namespace();
  for (const chip of root.children) {
    // Die senkrechten Linien vor den geheimen Listen und den Notizen werden in der ausgeschriebenen Auswahl waagerechte (2.152, 2.161).
    if (chip.classList.contains('chip-divider')) { const line = element('div', undefined, 'quick-divider'); line.setAttribute('role', 'separator'); box.append(line); continue; }
    if (!chip.classList.contains('chip')) continue;
    const id = chip.dataset.id, label = chip.getAttribute('aria-label'), count = chip.querySelector('.count');
    const choice = button('', () => {
      if (scope !== namespace() || ![...root.querySelectorAll('.chip')].some(node => node.dataset.id === id)) throw new Error('Die Listen haben sich geändert. Bitte die Auswahl erneut öffnen.');
      if (inStore && isLocked()) return;
      $('#store-quick-dialog').close();
      if (inStore) { shopStore = id; renderShop(); } else showView(id);
      root.querySelector('[aria-selected=true]')?.focus({ preventScroll: true });
    }, 'secondary store-quick-choice');
    choice.dataset.view = id === ALL_STORES ? 'all' : id; choice.setAttribute('aria-label', label);
    choice.setAttribute('aria-pressed', chip.getAttribute('aria-selected'));
    const name = element('span', undefined, 'quick-label');
    for (const child of chip.childNodes) if (child !== count) name.append(child.cloneNode(true));
    // „Nur Symbol“ im Reiter: in der ausgeschriebenen Auswahl steht zur Orientierung trotzdem der Name (2.152)
    if (!name.textContent.trim() && label) name.append(element('span', label, 'quick-name'));
    choice.append(name);
    if (count) choice.append(element('span', `(${count.textContent})`, 'quick-count'));
    box.append(choice);
  }
  if (!inStore) {   // beschrifteter Weg zur Verwaltung (2.152)
    const manage = button('Geschäfte & Listen verwalten', () => { $('#store-quick-dialog').close(); openStoresDialog(); }, 'secondary store-quick-manage');
    manage.prepend(icon('store')); box.append(manage);
  }
  $('#store-quick-dialog').showModal(); vibrate(15);
}
for (const root of [$('#store-chips'), $('#shop-chips')]) bindWishHold(root, '[data-all-stores], .chip[aria-selected=true]',
  () => guard(() => openStoreQuickMenu(root)), () => !ready || !root.getClientRects().length || isLocked());
$('#store-order-open').addEventListener('click', () => openOrderControls({
  title: 'Geschäfte und Listen sortieren', scope: namespace(), getScope: namespace,
  getRows: storeOrderRows, onChange: saveStoreOrder
}));
// Geheime Listen (2.161) stehen fest am Ende unter einer eigenen Linie, nur hinter den Notizen; sie gelten nur auf diesem Gerät und werden nicht verschoben.
function storeOrderRows() {
  const stores = displayStores(state.stores), row = store => ({ id: store.id, name: store.name, group: isNotesStore(store) ? 'Notizen' : '' });
  const secrets = (privateList?.lists || []).filter(list => list.enabled).map(list => ({ id: privateView(list.id), name: list.name, group: 'Geheim', fixed: true }));
  return [...stores.filter(store => !isNotesStore(store)).map(row), ...secrets, ...stores.filter(isNotesStore).map(row)];
}
const byName = (a, b) => a.name.localeCompare(b.name, 'de');
/* „Neu von …“: Artikel, die andere angelegt (oder in der Menge erhöht) haben, stehen oben, bis man sie übernimmt. Welche man schon gesehen hat,
   merkt sich nur dieses Gerät. Beim ersten Start (und auf einem neuen Gerät nach dem ersten Abgleich) gilt alles Vorhandene als gesehen. */
let seen = null;
const seenKey = () => `einkauf-seen:${namespace()}`;
function saveSeen() {
  const keep = currentIds(state.items);
  seen = new Set([...seen].filter(id => keep.has(id)));
  try { localStorage.setItem(seenKey(), JSON.stringify({ ids: [...seen] })); } catch { /* nur ein Hinweis, nichts geht verloren */ }
}
function ensureSeen() {
  if (seen || !ready) return;
  try { const saved = JSON.parse(localStorage.getItem(seenKey())); if (Array.isArray(saved?.ids)) seen = new Set(saved.ids); } catch { /* neu anlegen */ }
  if (!seen) { seen = currentIds(state.items); saveSeen(); }
}
function acknowledge(ids) {
  ensureSeen(); ids.forEach(id => seen.add(id));
  const keep = currentIds(state.items);
  try { localStorage.setItem(seenKey(), JSON.stringify({ ids: [...seen].filter(id => keep.has(id)) })); } catch { /* s. o. */ }
  renderItems(); if (shopOn()) renderShop();
}
function newsRow(entry) {
  const item = entry.item, row = element('li', undefined, 'item news'); row.dataset.id = item.id;
  const copy = element('button', undefined, 'item-copy'); copy.type = 'button';
  copy.setAttribute('aria-label', `${item.name}: bearbeiten`); copy.addEventListener('click', () => guard(() => editItem(item.id)));
  const notes = entry.entries.map(e => e.kind === 'neu' ? `neu von ${e.by}` : `+${format(e.quantity)} ${e.unit} von ${e.by}`);
  copy.append(element('strong', item.name), element('small', `${shoppingAmount(item)}${view === 'all' ? ` · ${storeName(item.storeId)}` : ''} · ${notes.join(', ')}`));
  const actions = element('div', undefined, 'item-actions');
  actions.append(button('Übernehmen', () => acknowledge(entry.entries.map(e => e.id)), 'primary small'));
  row.append(copy);
  if (imagesOn() || isWish(item)) row.append(thumbFor(item));
  row.append(actions);
  return row;
}
// Reihenfolge der Gänge eines Geschäfts (leer = Standardweg durch den Laden)
const aislesOf = storeId => (storeId && active(state.stores).find(store => store.id === storeId)?.aisles) || null;
// `count` fehlt bei Kategorien („Im Laden“ seit Version 2.59, „Planen“ seit 2.60): Es zählt nur das Geschäft; „Erledigt“ behält seine Zahl.
function groupHead(label, count) {
  const row = element('li', undefined, 'group-head');
  row.append(element('span', label));
  if (count !== undefined) row.append(element('span', String(count), 'count'));
  return row;
}
// Kleines Bild statt Name (Geschenk bei „Wünsche“): Bildschirmleser und der Hinweis beim Berühren bekommen weiter den Namen.
function symbolNode(symbol, name) {
  const node = element('span', undefined, 'store-symbol'), svg = document.createElementNS(SVG_NS, 'svg'), use = document.createElementNS(SVG_NS, 'use');
  node.setAttribute('role', 'img'); node.setAttribute('aria-label', name); node.title = name;
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); use.setAttribute('href', `#i-${symbol}`); svg.append(use); node.append(svg);
  return node;
}
// Händlerbilder immer lokal; ein sichtbarer Ersatzname bleibt bei einem kaputten Bild erhalten.
function chainLogo(chain, name = chain.name) {
  const label = element('span', undefined, `brand brand-${chain.key} store-logo`), image = element('img'), text = element('span', name, 'sr-only');
  image.src = chain.logo; image.alt = ''; image.width = 48; image.height = 32;
  image.addEventListener('error', () => { image.hidden = true; text.className = ''; }, { once: true });
  label.append(image, text); return label;
}
/* Anzeige im Reiter (2.152): Das Symbol einer eigenen Liste ist fest, die Anzeige frei wählbar: Nur Symbol, Nur Name oder Symbol und Name.
   Ohne gespeicherte Wahl bleibt die bisherige Ansicht (mit Symbol nur das Symbol). Supermärkte behalten Name oder Händlerlogo. */
const listSymbolOf = store => isSeparate(store) ? symbolOf(store) : '';
const listDisplayOf = store => displayModeOf(store?.displayMode, listSymbolOf(store));
const shownSymbol = symbol => symbol === 'secret' ? 'secret-open' : symbol;   // geteilte Liste mit Schloss: offenes Schloss; geheime Listen: geschlossenes
function listLabel(symbol, name, mode) {
  if (!symbol || mode === 'name') return document.createTextNode(name);
  const picture = symbolNode(symbol, name);
  if (mode !== 'both') return picture;
  // Mit sichtbarem Namen ist das Bild Schmuck: Bildschirmleser lesen den Namen nur einmal.
  for (const attribute of ['role', 'aria-label', 'title']) picture.removeAttribute(attribute);
  picture.setAttribute('aria-hidden', 'true');
  const label = element('span', undefined, 'store-label-both'); label.append(picture, element('span', name, 'store-label-name'));
  return label;
}
const privateLabel = list => listLabel('secret', list.name, displayModeOf(list.displayMode, 'secret'));
// Name eines Geschäfts: Symbol, Text oder lokales Händlerlogo. Eigene Filialnamen bleiben lesbar. Am besten mit dem Datensatz aufrufen (eindeutig per Kennung).
function storeLabel(storeOrName) {
  const store = typeof storeOrName === 'string' ? active(state.stores).find(row => row.name === storeOrName) || { name: storeOrName } : storeOrName, name = store.name;
  const symbol = listSymbolOf(store);
  if (symbol) return listLabel(shownSymbol(symbol), name, listDisplayOf(store));
  if (isSeparate(store)) return document.createTextNode(name);
  const chain = config.storeStyle === 'logo' ? chainForStore(store) : null;
  if (typeof chain?.logo === 'string') {
    const label = chainLogo(chain, name);
    if (name.toLocaleLowerCase('de') !== chain.name.toLocaleLowerCase('de')) label.lastChild.className = 'store-location-name';
    return label;
  }
  const key = config.storeStyle === 'logo' ? brandOf(name) : '';
  return key ? element('span', name, `brand brand-${key}`) : document.createTextNode(name);
}
function storeHead(label, count, none, id = '') {
  const row = element('li', undefined, `store-head${none ? ' none' : ''}`), name = element('span'); row.dataset.store = id;   // `data-store`: Ziel beim Verschieben per Ziehen
  name.append(none ? document.createTextNode(label) : storeLabel(active(state.stores).find(store => store.id === id) || label));
  row.append(icon('store'), name, element('span', String(count), 'count'));
  return row;
}
// Eigene Produktbilder wie in der Schnellauswahl; unbekannte Produkte bekommen ein passendes Gruppenmotiv.
let thumbLearned = new Map();
function thumbFor(item) {
  const box = element('span', undefined, 'item-thumb'); box.setAttribute('aria-hidden', 'true');
  const category = itemCategory(item, thumbLearned), picture = element('span'); picture.setAttribute('aria-hidden', 'true');
  const image=isWish(item) ? wishImage(item) : imageForProduct({...item,category});
  if(image) box.append(paintProductImage(picture,image,groupImageFor(item.name,category)));
  else { box.classList.add('wish-no-image'); box.append(icon('box')); }
  return box;
}
/* Mehrere Artikel gemeinsam bearbeiten (nur „Planen“): „Auswählen“ in der Listenzeile schaltet den Auswahlmodus ein. Ein Tipp auf eine Zeile wählt sie
   aus oder ab (statt abzuhaken oder zu bearbeiten); unten steht eine Leiste mit „Geschäft zuordnen“ und „Löschen“ für alle ausgewählten. */
let selecting = false;
const selected = new Set();
const isWish = item => isSeparate(active(state.stores).find(store => store.id === item?.storeId));
function itemRow(item, withStore = false) {
  const row = element('li', undefined, `item${item.checked ? ' checked' : ''}${selecting && selected.has(item.id) ? ' selected' : ''}`); row.dataset.id = item.id;
  if (isWish(item)) row.dataset.wish = '';
  /* Unter „Planen“ wird nicht abgehakt (2.147): Abhaken (und wieder öffnen) geht nur „Im Laden“. So hakt niemand beim Planen aus Versehen etwas ab.
     Was im Laden schon abgehakt ist, steht hier unten unter „Erledigt“ mit einem kleinen Haken, der kein Knopf ist. */
  const bought = item.checked && !selecting ? element('span', undefined, 'bought-mark') : null;
  if (bought) { bought.append(icon('check')); bought.setAttribute('role', 'img'); bought.setAttribute('aria-label', 'im Laden abgehakt'); }
  // Die Zeile antippen öffnet die Bearbeitung; dort steht auch „Artikel löschen“.
  const copy = element('button', undefined, 'item-copy'); copy.type = 'button';
  copy.setAttribute('aria-label', `${item.name}, ${shoppingAmount(item)}${item.checked ? ', im Laden abgehakt' : ''}: bearbeiten`);
  copy.addEventListener('click', () => guard(() => editItem(item.id)));
  if (isWish(item)) copy.title = 'Lange drücken: Produktlink & Notiz';
  // Auswahlmodus: statt Bearbeiten ein Auswahlkreis; Kreis und Zeile wählen aus und ab.
  const pick = selecting ? button('', () => toggleSelected(item.id, row), 'check select-mark') : null;
  if (pick) {
    const mark = () => { const on = selected.has(item.id); pick.replaceChildren(...(on ? [icon('check')] : [])); pick.classList.toggle('on', on); pick.setAttribute('aria-pressed', String(on)); pick.setAttribute('aria-label', `${item.name}: ${on ? 'Auswahl aufheben' : 'auswählen'}`); copy.setAttribute('aria-pressed', String(on)); copy.setAttribute('aria-label', `${item.name}, ${shoppingAmount(item)}: ${on ? 'Auswahl aufheben' : 'auswählen'}`); };
    row._mark = mark; mark();
    copy.addEventListener('click', event => { event.stopImmediatePropagation(); toggleSelected(item.id, row); }, true);
  }
  // Erste Zeile: Name und Menge, deutlich. Zweite Zeile klein: Person (und das Geschäft in der Gesamtliste). Unter „Planen“ stehen in der Zeile keine Preise, Vergleiche oder
  // Preisentwicklungen; frühere Kaufpreise zeigt die App nicht (seit Version 2.44).
  copy.append(element('strong', item.name), element('span', `${shoppingAmount(item)}`, 'item-qty'),
    element('small', [item.createdBy || 'Unbekannt', ...(withStore ? [storeName(item.storeId)] : [])].join(' · '), 'item-meta'));
  if (isWish(item) && hasWishDetails(item)) copy.querySelector('.item-meta').append(' · ', icon(item.wishUrl ? 'link' : 'text'));
  if (!pick && !bought) row.classList.add('plain');
  row.append(...[pick || bought].filter(Boolean), copy);
  if (imagesOn() || isWish(item)) row.append(thumbFor(item));
  return row;
}
function toggleSelected(id, row) {
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  row.classList.toggle('selected', selected.has(id)); row._mark?.(); renderSelectBar();
}
// Ausgewählte, die in der Ansicht nicht (mehr) zu sehen sind (anderes Geschäft, gelöscht), zählen nicht.
const selectedItems = () => visibleItems(true).filter(row => inView(row) && selected.has(row.id));
function renderSelectBar() {
  const rows = selectedItems(), bar = $('#select-bar');
  bar.hidden = !selecting;
  $('#select-count').textContent = rows.length ? `${rows.length} ausgewählt` : 'Nichts ausgewählt – bitte runterscrollen zum Auswählen';
  $('#select-move').hidden=isSeparate(viewStore()) || rows.some(isWish);
  for (const id of ['select-move', 'select-delete']) $(`#${id}`).disabled = !rows.length;
  $('#select-mode').setAttribute('aria-pressed', String(selecting)); $('#select-mode').textContent = selecting ? 'Auswahl beenden' : 'Auswählen';
  document.body.classList.toggle('selecting', selecting);
  if (selecting) document.documentElement.style.setProperty('--select-h', `${bar.offsetHeight}px`);   // Platz unter der Liste: sie bleibt bis zum Ende erreichbar
}
function setSelecting(on) {
  if(on&&$('#select-mode').disabled)return;
  selecting=on;
  if(!on) { selected.clear();clearTimeout(noticeTimer);noticeUndo=null;$('#notice').hidden=true; }
  renderItems(); renderSelectBar();
}
function renderItems() {
  renderShoppingInfo();
  thumbLearned = learnCategories(state.items);
  const list = $('#items'); list.replaceChildren();
  const rows = visibleItems(true).filter(inView);
  if (selecting) { const here = new Set(rows.map(row => row.id)); for (const id of [...selected]) if (!here.has(id)) selected.delete(id); }
  ensureSeen();
  const news = seen ? newFromOthers(rows, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  const open = rows.filter(item => !item.checked && !newIds.has(item.id)), done = rows.filter(item => item.checked).sort(byName);
  $('#select-mode').disabled=!selecting&&!rows.some(item=>item.checked||!newIds.has(item.id));
  if (!rows.length && !news.length) list.append(element('li', view === 'none' ? 'Keine Artikel ohne Geschäft.' : 'Alles im Blick. Füge deinen ersten Artikel hinzu.', 'empty'));
  if (news.length) {
    const names = [...new Set(news.flatMap(entry => entry.by))].join(' und ');
    const head = element('li', undefined, 'news-head');
    head.append(element('span', `Neu von ${names}`), element('span', String(news.length), 'count'),
      button('Alle übernehmen', () => acknowledge(news.flatMap(entry => entry.entries.map(e => e.id))), 'text-button'));
    list.append(head); news.forEach(entry => list.append(newsRow(entry)));
  }
  // Nach Gängen im Laden geordnet (abschaltbar in den Optionen); Erledigtes steht immer unten.
  const grouped = config.groupItems !== false;
  const addOpen = (items, nested, order = null) => {
    if (!grouped) { items.sort(byName).forEach(item => list.append(itemRow(item))); return; }
    for (const group of groupByCategory(items, itemHistory(), order)) {
      const head = groupHead(group.label); if (nested) head.classList.add('sub');
      list.append(head); group.items.forEach(item => list.append(itemRow(item)));
    }
  };
  if (view === 'all') {
    // Gesamtliste: erst, was noch keinem Geschäft zugeordnet ist, dann ein Abschnitt je Geschäft.
    const sections = [{ id: '', label: 'Ohne Geschäft' }, ...orderedStores(state.stores).map(store => ({ id: store.id, label: store.name }))];
    for (const section of sections) {
      const items = open.filter(item => (item.storeId || '') === section.id);
      if (!items.length) continue;
      list.append(storeHead(section.label, items.length, !section.id, section.id)); addOpen(items, true, aislesOf(section.id));
    }
  } else addOpen(open, false, aislesOf(view));
  if (done.length) {
    if (grouped || view === 'all') list.append(groupHead('Erledigt', done.length));
    // Ohne „Erledigte entfernen“ (2.147): Der Hinweis sagt, wo Abgehaktes verschwindet.
    if (!selecting) list.append(element('li', 'Im Laden abgehakt. „Einkauf beenden“ unter „Im Laden“ räumt es auf.', 'done-note'));
    done.forEach(item => list.append(itemRow(item, view === 'all')));
  }
  if (document.activeElement === $('#item-form').elements.name) renderItemSuggestions();
  renderSelectBar();
  renderQuickPick();
}
// Das Eingabeformular ist zugeklappt (nur Namensfeld und „+“), solange niemand hineintippt. Offen bleibt es, wenn der Fokus im Formular liegt,
// schon etwas im Namensfeld steht oder „Kategorie“ aufgeklappt ist.
function syncForm() {
  const form = $('#item-form');
  const editingFocus=form.matches(':focus-within')&&!$('#offers-details').contains(document.activeElement);
  const open = form.dataset.choosingUnit === 'yes' || editingFocus || form.elements.name.value.trim() !== '' || form.querySelector('.price-fields').open;
  form.classList.toggle('compact', !open);
  $('#clear-item-name').hidden = !form.elements.name.value;
  $('#add-item-confirm').disabled = !form.elements.name.value.trim();
}
function renderItemSuggestions(event) {
  if (event?.type === 'input') delete $('#item-form').dataset.keepName;
  const form = $('#item-form'), box = $('#item-suggestions'), typed = form.elements.name.value.trim();
  if(isSeparate(viewStore()) || isSeparate(state.stores.find(store=>store.id===form.elements.storeId.value))) { box.replaceChildren(); box.hidden=true; itemQuantity?.suggest(''); return; }
  itemQuantity?.suggest(isSeparate(state.stores.find(store=>store.id===form.elements.storeId.value))?'':typed);
  const confirmed = appliedAliases().some(alias => alias.from === aliasKey(typed));
  const history = itemHistory(), correction = !confirmed && !isSeparate(state.stores.find(store => store.id === form.elements.storeId.value)) && form.dataset.keepName !== typed ? recognizeName(typed) : { suggestions: [], correction: null };
  // Ausdrücklich bestätigte ältere Schreibweisen bleiben weiterhin gültig.
  const variants = typed && !confirmed ? spellingVariants(typed, [...new Set(history.map(row => row.name))]).slice(0, 3) : [];
  const names = [...new Set([...suggestItemNames(suggestionHistory(), typed), ...correction.suggestions])].filter(name => !variants.includes(name));
  box.replaceChildren(); box.hidden = !names.length && !variants.length && !correction.correction;
  if (box.hidden) return;
  if (correction.correction) {
    const info = element('div', undefined, 'name-correction'); info.append(element('span', `Beim Hinzufügen: „${correction.correction}“`, 'hint'), button('Original behalten', () => { form.dataset.keepName = typed; box.hidden = true; }, 'text-button small')); box.append(info);
  }
  if (variants.length) {
    box.append(element('span', 'Meinst du dasselbe wie …?', 'hint'));
    const same = element('div', undefined, 'suggestion-choices');
    for (const name of variants) same.append(button(name, () => {
      commit([nextOp('aliases', uid(), { from: aliasKey(typed), name })], `„${typed}“ heißt jetzt immer „${name}“`);
      form.elements.name.value = name; box.hidden = true;
      itemQuantity?.suggest(name); refreshCategoryHint(); document.activeElement?.blur?.();
    }));
    box.append(same);
  }
  if (names.length) {
    const choices = element('div', undefined, 'suggestion-choices');
    for (const name of names) choices.append(button(name, () => {
      form.elements.name.value = name; box.hidden = true;
      itemQuantity?.suggest(name); refreshCategoryHint(); document.activeElement?.blur?.();
    }));
    box.append(choices);
  }
}
// Schnellwahl: häufig gekaufte Artikel, die gerade nicht auf der Liste stehen. Ein Tipp legt einen Artikel mit der gemerkten Einzelmenge im gewählten Geschäft an.
function renderQuickPick() {
  const box = $('#quick-pick'), form = $('#item-form');
  const picks = form.elements.name.value.trim() || isSeparate(viewStore()) || isSeparate(state.stores.find(store=>store.id===form.elements.storeId.value)) ? [] : frequentItems(itemHistory(), state.items, 6);
  box.hidden = !picks.length; box.replaceChildren();
  for (const pick of picks) {
    const chip = element('button', pick.name, 'chip'); chip.type = 'button';
    chip.addEventListener('click', () => {
      form.elements.name.value = pick.name; itemQuantity.suggest(pick.name,true);
      form.requestSubmit();
    });
    box.append(chip);
  }
}
function renderShoppingInfo() {
  const store = viewStore(), url = store && !isSeparate(store) ? storeOfferUrl(store) : '';
  const details=$('#offers-details'),context=`${store?.id||''}|${url}`;
  if(details.dataset.context!==context||!url)details.open=false;
  details.dataset.context=context;details.hidden=!url;
  $('#offers-link').hidden = !url;
  if (url) {
    externalLink($('#offers-link'), url);
    $('#offers-link .label').textContent = `Angebote bei ${store.name} ansehen`;
    $('#offers-link').setAttribute('aria-label', `Angebote bei ${store.name} ansehen – öffnet extern`);
  } else $('#offers-link').removeAttribute('href');
  $('#open-templates').hidden=isSeparate(store);
}
// Ein Tag (JJJJ-MM-TT) als kurzes Datum, unabhängig von der Zeitzone.
const dayLabel = day => shortDate(`${day}T12:00:00`);
function fillCategorySelects() {
  document.querySelectorAll('select[data-categories]').forEach(select => {
    select.replaceChildren(new Option('Automatisch', ''));
    for (const category of CATEGORIES) select.add(new Option(category.label, category.id));
  });
}
// „Automatisch (Obst & Gemüse)“: zeigt, was die App für diesen Namen vorschlagen würde.
function categoryHint(select, name) {
  const guess = String(name).trim() ? suggestCategory(name, itemHistory()) : null;
  select.options[0].textContent = guess ? `Automatisch (${categoryLabel(guess)})` : 'Automatisch';
}
// Preise werden seit 2.163 nicht mehr am Artikel eingetragen, sondern unter „Ausgaben“ am Produkt eines Einkaufs (siehe product-prices.js).
function refreshCategoryHint() { const form = $('#item-form'); categoryHint(form.elements.category, form.elements.name.value); }
function renderRememberedAmount() {
  const form = $('#edit-item-form'), memory = rememberedAmount(form.elements.name.value.trim(),itemHistory());
  $('#remembered-amount-text').textContent = memory?.purchaseAmount ? `Deine gemerkte Menge: ${amountText(memory.purchaseAmount)}` : 'Keine eigene Menge gemerkt – die App nutzt den üblichen Vorschlag.';
  $('#reset-remembered-amount').disabled = !memory?.purchaseAmount;
}
function saveRememberedAmount(amount) {
  const form = $('#edit-item-form'), item = active(state.items).find(row => row.id === form.elements.rowId.value);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen entfernt.');
  if (form.elements.name.value.trim() !== item.name) throw new Error('Bitte den geänderten Artikelnamen zuerst speichern.');
  if (amount !== null && !validPurchaseAmount(amount)) throw new Error('Bitte eine gültige Menge und Einheit eingeben (höchstens 1.000.000).');
  const stamp = nextOp('items',item.id,{}).at;
  commit([nextOp('items',item.id,{purchaseAmount:amount,purchaseAmountAt:stamp})], amount ? 'Gemerkte Menge gespeichert' : 'Gemerkte Menge zurückgesetzt');
  $('#remembered-amount-editor').hidden = true; renderRememberedAmount();
}
function editItem(id) {
  const item = active(state.items).find(row => row.id === id);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  if (isWish(item)) { openWish(id); return; }   // Wünsche (nur sie): direkt Name, Produktlink & Notiz, ohne Menge, Einheit, Kategorie und Preis
  itemBaseline = clone({ ...item, category: isCategory(item.category) ? item.category : null });
  const form = $('#edit-item-form'); form.reset();
  form.elements.rowId.value = item.id; form.elements.name.value = item.name;
  editQuantity.load(item);
  categoryHint(form.elements.category, item.name); form.elements.category.value = itemBaseline.category || '';
  storeOptions(form.elements.storeId, item.storeId || '', true, true, true);
  $('#remembered-amount-editor').hidden = true; renderRememberedAmount();
  message(); $('#item-dialog').showModal();
  // Packungsgröße und gewählte Einheit liegen nicht in Formularfeldern: Sie zählen über `extra` mit.
  armDirty(form, { savedAt: item.updatedAt, extra: () => [editQuantity.currentProfile(), editQuantity.preferenceChanged()], buttons: [form.querySelector('.sheet-actions button[type=submit]')] });
}

// Ein Wunsch (Artikel in einer eigenen Liste) hat ein eigenes kleines Fenster: Name, Produktlink, Notiz und ein lokales Gruppenbild – ohne Menge, Einheit, Kategorie und
// Preis. Ein kurzer Tipp und langes Drücken öffnen dasselbe Fenster; normale Artikel behalten ihr Bearbeiten-Fenster.
function showWishProductLink() {
  const link = $('#wish-product-link');
  let url = ''; try { url = productLink($('#wish-form').elements.wishUrl.value); } catch { /* unfertige Eingabe */ }
  link.hidden = !url;
  if (url) externalLink(link, url); else link.removeAttribute('href');
}
function openWish(id) {
  const item = active(state.items).find(row => row.id === id);
  if (!item || !isWish(item)) throw new Error('Dieser Wunsch ist nicht mehr in einer Wunschliste. Bitte die Liste aktualisieren.');
  const form = $('#wish-form'); form.reset();
  form.elements.rowId.value = id;
  wishBaseline = {name:item.name,wishUrl:item.wishUrl || '',wishNote:item.wishNote || '',wishImageHidden:item.wishImageHidden===true};
  form.dataset.imageHidden=String(wishBaseline.wishImageHidden);
  form.elements.name.value = wishBaseline.name;
  form.elements.wishUrl.value = wishBaseline.wishUrl; form.elements.wishNote.value = wishBaseline.wishNote;
  $('#wish-title').textContent = item.name;
  showWishProductLink(); renderWishImage(); message(); $('#wish-dialog').showModal();
  armDirty(form, { savedAt: item.updatedAt, extra: () => form.dataset.imageHidden });
}
function renderWishImage() {
  const form=$('#wish-form'),group=wishGroup(form.elements.name.value),hidden=form.dataset.imageHidden==='true',preview=$('#wish-image-preview');
  preview.replaceChildren();preview.className='';preview.removeAttribute('style');delete preview.dataset.photoKey;delete preview.dataset.photoKind;
  if(hidden) preview.append(icon('box')); else paintProductImage(preview,group.image);
  preview.setAttribute('aria-label',hidden?'Kein Bild':`${group.image.kind==='product'?'Produktbild':'Gruppenbild'}: ${group.name}`);
  $('#wish-image-group').textContent=hidden?'':group.name;
  $('#wish-remove-image').hidden=hidden; $('#wish-image-removed').hidden=!hidden;
}
function deleteOps(collection, ids, extra = {}) {
  const rows = active(state[collection]).filter(row => ids.includes(row.id));
  const at = new Date().toISOString();
  return rows.map(row => nextOp(collection, row.id, { deletedAt: at, ...extra }));
}
function removeRows(collection, ids) { commit(deleteOps(collection, ids)); }
/* Artikel löschen mit „Rückgängig“ (2.147). Alles Gelöschte liegt danach 14 Tage unter „Kürzlich gelöscht“.
   `single`: bewusst gelöscht (Wischen, Bearbeiten, Auswahl). Abgehakte Artikel bekommen dann die Kennung SINGLE_DELETE und
   erscheinen ebenfalls im Papierkorb; „Einkauf beenden“ (und früher „Erledigte entfernen“) räumt Gekauftes dagegen still weg. */
function deleteItems(ids, { notice = '', single = true } = {}) {
  const rows = active(state.items).filter(row => ids.includes(row.id));
  if (!rows.length) return [];
  const at = new Date().toISOString();
  commit(rows.map(row => { const op = nextOp('items', row.id, { deletedAt: at }); return single && row.checked ? { ...op, id: `${SINGLE_DELETE}${op.id}` } : op; }));
  relabelNotesSave();
  const removed = rows.map(row => row.id), scope = namespace();
  const title = rows[0].name.length > 40 ? `${rows[0].name.slice(0, 38).trimEnd()} …` : rows[0].name;   // lange Notizen gekürzt
  showNotice(notice || (rows.length === 1 ? `„${title}“ gelöscht` : `${rows.length} Artikel gelöscht`), () => undoDelete(removed, scope), { trash: true });
  return removed;
}
function undoDelete(ids, scope, collection = 'items') {
  if (scope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte unter „Kürzlich gelöscht“ wiederherstellen.');
  const at = new Date().toISOString(), changes = ids.flatMap(id => restoreChanges(state, collection, id, at)).filter(change => change.collection === collection);
  if (!changes.length) { showNotice('Schon wiederhergestellt'); return; }
  commit(changes.map(change => nextOp(change.collection, change.id, change.patch)));
  if (collection === 'purchases') { renderSpending(); showNotice(changes.length === 1 ? 'Die Ausgabe ist wieder eingetragen' : `${changes.length} Ausgaben sind wieder eingetragen`); return; }
  if (collection === 'recipes') { showNotice(`„${state.recipes.find(row => row.id === changes[0].id)?.name || 'Rezept'}“ ist wieder im Rezeptbuch`); return; }
  if (collection === 'meals') { showNotice('Das Gericht steht wieder im Wochenplan'); return; }
  const first = state.items.find(row => row.id === changes[0].id);
  showNotice(changes.length === 1 ? `„${first?.name || 'Artikel'}“ ist wieder da` : `${changes.length} Artikel sind wieder da`);
}
// Geschäfte-Dialog: Jedes vorhandene Geschäft ist eine zugeklappte Karte (Pfeil rechts); welche aufgeklappt sind, merkt sich nur das geöffnete Fenster.
// Das Anlegen öffnet ausschließlich das Plus nach dem letzten Eintrag.
const storesOpen = new Set();
let storeFresh = '';
let newListPrivacy=null;
function openStoresDialog(openId = '') {
  storesOpen.clear(); storeFresh = ''; if (openId) storesOpen.add(openId);
  if ($('#store-add-dialog').open) $('#store-add-dialog').close();
  renderStores(); $('#stores-dialog').showModal();
}
// Die Auswahl verändert erst das Formular; gespeichert wird bewusst mit „Geschäft hinzufügen“.
function renderStoreCatalog() {
  const list = $('#store-catalog-list'); list.replaceChildren();
  const chains = searchCatalog($('#store-catalog-search').value, $('#store-catalog-type').value);
  const existing = new Set(orderedStores(state.stores).filter(store => !isSeparate(store)).map(store => chainForStore(store)?.key));
  for (const chain of chains) {
    const used = existing.has(chain.key), choice = button('', () => {
      const form = $('#store-form');
      form.elements.chainKey.value = chain.key; form.elements.name.value = chain.name; form.elements.offersUrl.value = chain.offers;
      showStoreNameError(false); renderStoreTemplate(); $('#store-catalog-dialog').close();   // der Name ist schon eingetragen: keine Tastatur
    }, 'catalog-choice');
    choice.dataset.chain = chain.key; choice.disabled = used;
    choice.setAttribute('aria-label', `${chain.name}${used ? ': bereits hinzugefügt' : ' auswählen'}`);
    const name = element('span', chain.name, 'catalog-name');
    choice.append(chainLogo(chain), name, element('small', used ? 'Bereits hinzugefügt' : chain.offerNote || (chain.drugstore ? 'Drogerie' : 'Supermarkt'), 'catalog-note'));
    list.append(choice);
  }
  $('#store-catalog-count').textContent = chains.length ? `${chains.length} Händler gefunden` : 'Kein Treffer. Du kannst das Geschäft mit eigenem Namen anlegen.';
}
function renderStoreTemplate() {
  const chain = catalogByKey($('#store-form').elements.chainKey.value), preview = $('#store-template'); preview.replaceChildren(); preview.hidden = !chain;
  if (!chain) return;
  preview.append(chainLogo(chain), element('span', `Vorlage: ${chain.name}`), button('Auswahl aufheben', () => {
    const form = $('#store-form'); form.elements.chainKey.value = ''; form.elements.name.value = ''; form.elements.offersUrl.value = ''; renderStoreTemplate(); $('#choose-store').focus({ preventScroll: true });
  }, 'text-button small'));
}
function renderStores() {
  storeReorders.forEach(order => order.cancel());
  renderListVisibility();
  // Notizlisten haben einen eigenen Bereich unter einer Linie (2.152); alle anderen Geschäfte und Listen stehen in ihrer Reihenfolge darüber.
  const editor = $('#store-editor'), notesEditor = $('#store-notes-editor'); editor.replaceChildren(); notesEditor.replaceChildren();
  let fresh = null;
  for (const store of displayStores(state.stores)) {
    const row=storeEditorRow(store);(isNotesStore(store)?notesEditor:editor).append(row);
    if(store.id===storeFresh)fresh=row;
  }
  if(!wishStores().length){
    const row=element('details',undefined,'store-row store-wishes-placeholder'),summary=element('summary'),heading=element('span',undefined,'store-heading'),title=element('span','Wünsche','store-name');
    heading.append(title,element('span','Ausgeblendet','store-pill'));summary.append(heading,listVisibilityButton('Wünsche',false,enableMissingWishes));
    row.append(summary,element('p','Einblenden richtet die Wünsche-Liste ein oder holt die bisherige Liste mit ihren Einträgen zurück.','hint store-body'));editor.append(row);
  }
  markListBoundaries(editor);
  // Geheime Listen (2.161): unter einer eigenen Linie, wie die Notizen
  if(privateList?.lists?.length){const line=element('div',undefined,'store-group-line store-secret-line');line.setAttribute('aria-hidden','true');editor.append(line);}
  for(const list of privateList?.lists||[]){const row=privateStoreEditorRow(list);editor.append(row);if(storeFresh===`private:${list.id}`)fresh=row;}
  $('#store-notes-group').hidden=!notesEditor.children.length;
  // Neu angelegt: kurz hervorgehoben und in Sicht gerollt (nur einmal, nicht bei jedem späteren Neuzeichnen)
  if(fresh){fresh.classList.add('fresh');fresh.scrollIntoView({block:'nearest'});storeFresh='';}
}
const storePill = (store, enabled = visibleStore(store)) => !enabled ? 'Ausgeblendet' : isNotesStore(store) ? 'Notizliste' : 'Eigene Liste';
/* Motivwahl (2.152): vor dem Anlegen frei, danach fest. Angeboten werden die gewöhnlichen Motive mit ihrem Namen; das Klemmbrett gibt es
   nur über „Notizliste anlegen“, damit eine Liste nie versehentlich ihr Verhalten wechselt. */
/* 2.154: Ohne eigene Kachel „Ohne Symbol“: Ist nichts gewählt, bekommt die Liste kein Symbol; ein zweiter Tipp auf das gewählte Symbol
   (oder die Leertaste) hebt die Wahl wieder auf. Fünf Motive oben, darunter nach einer Linie „Geheim“ mit kurzer Erklärung. */
const SECRET_CHOICE_NOTE = 'Für eine geheime Liste, die nur auf diesem Gerät bleibt';
function symbolPicker({ value = '', legend = 'Symbol (optional)', hint = 'Ein zweiter Tipp hebt die Wahl auf. Nach dem Anlegen bleibt das Symbol fest.' } = {}) {
  const field=element('fieldset',undefined,'store-symbol-picker');field.append(element('legend',legend));
  const choices=element('div',undefined,'store-symbol-choices'),secret=element('div',undefined,'store-symbol-secret'),line=element('div',undefined,'store-symbol-line');
  line.setAttribute('aria-hidden','true');
  for(const choice of REGULAR_SYMBOLS) {
    const label=element('label',undefined,`store-symbol-choice${choice.id==='secret'?' secret-choice':''}`),input=element('input');
    input.type='radio';input.name='symbol';input.value=choice.id;input.checked=choice.id===value;input.defaultChecked=input.checked;
    input.setAttribute('aria-label',choice.id==='secret'?`${choice.name} – ${SECRET_CHOICE_NOTE}`:choice.name);
    const image=symbolNode(choice.id,choice.name);
    for(const attribute of ['role','aria-label','title'])image.removeAttribute(attribute);image.setAttribute('aria-hidden','true');
    if(choice.id==='secret'){const text=element('span',undefined,'secret-choice-text');text.append(element('span',choice.name),element('small',SECRET_CHOICE_NOTE));label.append(input,image,text);secret.append(label);}
    else{const text=element('span');choice.name.split('/').forEach((part,index)=>{if(index)text.append('/',element('wbr'));text.append(part);});label.append(input,image,text);choices.append(label);}
  }
  // Abwählen: Ein Radioknopf lässt sich sonst nicht wieder leeren.
  let armed=null;
  const clear=input=>{input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));};
  field.addEventListener('pointerdown',event=>{const input=event.target.closest('label')?.querySelector('input[name=symbol]');armed=input?.checked?input:null;});
  field.addEventListener('click',event=>{const input=event.target;if(!input.matches?.('input[name=symbol]'))return;if(armed===input)clear(input);armed=null;});
  field.addEventListener('keydown',event=>{if(event.key===' '&&event.target.matches('input[name=symbol]:checked')){event.preventDefault();clear(event.target);}});
  field.append(choices,line,secret,element('p',hint,'hint store-symbol-hint'));return field;
}
const pickedSymbol = picker => picker?.querySelector('input[name=symbol]:checked')?.value || '';
// Ein festgelegtes Symbol wird nur angezeigt, es gibt keine Galerie zum Tauschen.
function fixedSymbolInfo(symbol, shown = symbol) {
  const box=element('div',undefined,'store-symbol-fixed'),picture=symbolNode(shown,symbolName(symbol)),text=element('span',undefined,'store-symbol-fixed-text');
  for(const attribute of ['role','aria-label','title'])picture.removeAttribute(attribute);picture.setAttribute('aria-hidden','true');
  text.append('Symbol: ',element('strong',symbolName(symbol)),' · festgelegt');box.append(picture,text);return box;
}
/* Anzeige im Reiter (2.152) mit Vorschau. Ohne Symbol gibt es nur „Nur Name“. Wer ein Symbol wählt, bekommt „Symbol und Name“ vorgeschlagen;
   wird es wieder abgewählt, steht die Anzeige auf „Nur Name“. */
function displayPicker(value) {
  const field=element('fieldset',undefined,'store-display-picker'),options=element('div',undefined,'store-display-options'),inputs={};
  field.append(element('legend','Anzeige im Reiter'));
  for(const mode of DISPLAY_MODES) {
    const label=element('label',undefined,'store-display-choice'),input=element('input');
    input.type='radio';input.name='displayMode';input.value=mode;input.checked=mode===value;input.defaultChecked=input.checked;inputs[mode]=input;
    label.append(input,element('span',DISPLAY_LABELS[mode]));options.append(label);
  }
  const need=element('p','Für „Nur Symbol“ und „Symbol und Name“ brauchst du ein Symbol.','hint store-display-need');
  const preview=element('div',undefined,'store-preview'),chip=element('span',undefined,'store-preview-chip');
  preview.append(element('span','Vorschau','store-preview-label'),chip);field.append(options,need,preview);
  const current=()=>DISPLAY_MODES.find(mode=>inputs[mode].checked&&!inputs[mode].disabled)||'name';
  let hadSymbol=null;
  const sync=(name,symbol,shown=symbol)=>{
    if(hadSymbol!==null&&Boolean(symbol)!==hadSymbol)inputs[symbol?'both':'name'].checked=true;
    hadSymbol=Boolean(symbol);
    for(const mode of ['symbol','both']){inputs[mode].disabled=!symbol;inputs[mode].closest('label').classList.toggle('disabled',!symbol);}
    if(!symbol)inputs.name.checked=true;
    need.hidden=Boolean(symbol);
    chip.replaceChildren(listLabel(shown,name||'Name',symbol?current():'name'));
  };
  return {field,value:current,sync};
}
function listPrivacyField(getSymbol,watched,isOwn,checked=false) {
  const field=element('div',undefined,'list-privacy'),label=element('label',undefined,'checkbox-label'),input=element('input'),hint=element('p',undefined,'hint');
  input.type='checkbox';input.name='private';input.checked=checked;label.append(input,document.createTextNode('Diese Liste ist geheim'));field.append(label,hint);
  let wasSecret=false;
  const sync=(automatic=false)=>{
    const secret=isOwn()&&getSymbol()==='secret';field.hidden=!secret;
    if(!secret)input.checked=false;else if(automatic&&!wasSecret)input.checked=true;
    hint.textContent=input.checked?'Nur auf diesem Gerät. Kein GitHub-Abgleich und keine gemeinsame Sicherung.':'Mit der Familie geteilt. Beim Freigeben bisher privater Inhalte wird vorher nachgefragt.';
    wasSecret=secret;
  };
  for(const node of watched)node.addEventListener('change',()=>sync(true));
  input.addEventListener('change',()=>sync());sync();return {field,input,sync};
}
const PRIVATE_SOURCE_FIELDS=['quantity','unit','category','wishUrl','imageKey','wishImageHidden','purchaseUnit','purchaseMeasure','purchaseAmount','onSale','salePrice','saleUntil','createdBy'];
async function makeSharedListPrivate(storeId,name,displayMode) {
  if(!active(state.stores).some(row=>row.id===storeId))throw new Error('Diese Liste wurde inzwischen entfernt.');
  const count=active(state.items).filter(row=>row.storeId===storeId).length;
  if(!await ask({title:'Als geheime Liste weiterführen?',message:`„${name}“ mit ${count} Einträgen wird als geheime Kopie auf diesem Gerät weitergeführt. Die bisher gemeinsame Liste wird für die Familie ausgeblendet. Frühere gemeinsame Daten und Sicherungen bleiben bestehen.`,confirmLabel:'Geheim weiterführen'}))return null;
  // Nach der Rückfrage neu lesen: Inzwischen kann ein Abgleich Einträge geändert haben.
  if(!active(state.stores).some(row=>row.id===storeId))throw new Error('Diese Liste wurde inzwischen entfernt.');
  const rows=active(state.items).filter(row=>row.storeId===storeId);
  const id=privateList.createList(name,rows.map(row=>({name:row.name,note:row.wishNote||'',checked:Boolean(row.checked),source:Object.fromEntries(PRIVATE_SOURCE_FIELDS.filter(key=>row[key]!==undefined).map(key=>[key,clone(row[key])]))})),displayMode);
  if(!id)return null;
  try{commit([nextOp('stores',storeId,{deletedAt:new Date().toISOString()})]);}
  catch(error){privateList.removeList(id);throw error;}
  return id;
}
// Freigeben einer geheimen Liste: Das Schloss bleibt ihr Symbol (offen dargestellt), die gewählte Anzeige wird übernommen.
async function sharePrivateList(id,name,displayMode) {
  if(!await ask({title:'Für die Familie freigeben?',message:`„${name}“ mit ${privateList.size(id)} Einträgen und privaten Notizen wird für die Familie freigegeben. Diese Inhalte werden anschließend über GitHub geteilt.`,confirmLabel:'Freigeben'}))return null;
  const prepared=privateList.prepareShare(id);if(!prepared)return null;
  const storeId=prepared.list.sharedStoreId,ops=[nextOp('stores',storeId,{name,separate:true,anywhere:false,chainKey:null,offersUrl:'',symbol:'secret',displayMode,deletedAt:null})];
  for(const item of prepared.items)ops.push(nextOp('items',item.sharedId,{...Object.fromEntries(PRIVATE_SOURCE_FIELDS.filter(key=>item.source?.[key]!==undefined).map(key=>[key,clone(item.source[key])])),name:item.name,wishNote:item.note,quantity:item.source?.quantity||1,unit:item.source?.unit||'Stück',storeId,checked:item.checked,createdBy:item.source?.createdBy||config.actor||'Unbekannt',deletedAt:null}));
  commit(ops);
  if(!privateList.removeList(id)){message('Die Liste ist bereits für die Familie freigegeben. Die lokale Kopie konnte nicht entfernt werden. Bitte erneut speichern.');return null;}
  return storeId;
}
function replaceStoreEditorRow(old,replacement) {
  const scroll=$('#stores-dialog').scrollTop;replacement.open=old.open;old.replaceWith(replacement);$('#stores-dialog').scrollTop=scroll;
}
function openListView(id) { $('#stores-dialog').close(); tab('shopping'); showView(id); }
function privateStoreEditorRow(list) {
  const row=element('details',undefined,'store-row private-store-row'),summary=element('summary'),title=element('span',undefined,'store-name'),body=element('div',undefined,'store-body'),form=element('form');
  const heading=element('span',undefined,'store-heading');row.dataset.privateListId=list.id;title.append(symbolNode('secret',list.name),element('span',list.name));heading.append(title,element('span',list.enabled?'Geheim':'Geheim · ausgeblendet','store-pill'));summary.setAttribute('aria-label',list.name);summary.append(heading,listVisibilityButton(list.name,list.enabled,()=>{
    const latest=privateList.lists.find(row=>row.id===list.id);if(!latest)throw new Error('Diese geheime Liste wurde inzwischen entfernt.');
    if(privateList.setEnabled(list.id,!latest.enabled)){message();showNotice(`${latest.name} ${latest.enabled?'ausgeblendet · alle Einträge bleiben erhalten':'eingeblendet'}`);}
  }));row.append(summary,body);
  const label=element('label','Listenname'),name=element('input');name.name='name';name.required=true;name.maxLength=80;name.value=list.name;label.append(name);
  // Das Schloss ist fest; die Anzeige im Reiter wird nur auf diesem Gerät gespeichert.
  const mode=displayModeOf(list.displayMode,'secret'),display=displayPicker(mode),privacy=listPrivacyField(()=>'secret',[],()=>true,true);
  const warning=element('p','Beim Speichern wird die Freigabe dieser bisher privaten Liste für die Familie abgefragt.','hint'),save=element('button',undefined,'store-save');save.type='submit';
  const update=()=>{
    display.sync(name.value.trim()||list.name,'secret',privacy.input.checked?'secret':'secret-open');
    const dirty=name.value.trim()!==list.name||!privacy.input.checked||display.value()!==mode;
    warning.hidden=privacy.input.checked;save.disabled=!dirty;
    const at=new Date(list.updatedAt),caption=dirty?(privacy.input.checked?'Änderungen speichern':'Freigabe prüfen'):Number.isFinite(at.getTime())?`Gespeichert um ${at.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`:'Gespeichert';
    if(save.textContent!==caption)save.replaceChildren(icon('check'),element('span',caption));save.setAttribute('aria-label',`${name.value.trim()||list.name} ${dirty?'speichern':caption}`);
  };
  form.append(label,fixedSymbolInfo('secret'),display.field,privacy.field,warning,save);form.addEventListener('input',update);form.addEventListener('change',update);update();
  form.addEventListener('submit',event=>{event.preventDefault();guard(async()=>{
    const title=name.value.trim();if(!title)throw new Error('Bitte einen Listennamen eingeben.');
    if(privacy.input.checked){if(privateList.renameList(list.id,title,display.value()))replaceStoreEditorRow(row,privateStoreEditorRow(privateList.lists.find(item=>item.id===list.id)));}
    else {const id=await sharePrivateList(list.id,title,display.value());if(id)replaceStoreEditorRow(row,storeEditorRow(active(state.stores).find(store=>store.id===id)));}
  });});
  const open=button('Liste öffnen',()=>{if(!privateList.has(list.id)&&!privateList.enable(list.id))return;openListView(privateView(list.id));},'secondary store-private-open');open.prepend(icon('lock'));
  const remove=button('Geheime Liste auf diesem Gerät löschen',async()=>{if(await ask({title:'Geheime Liste löschen?',message:`„${list.name}“ und alle darin enthaltenen privaten Einträge werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.`,confirmLabel:'Löschen',danger:true})&&privateList.removeList(list.id))row.remove();},'danger store-delete');
  body.append(form,open,remove);return row;
}
function storeEditorRow(store) {
    let updateSave=()=>{};
    const wishList=wishStores().some(wish=>wish.id===store.id),notes=isNotesStore(store),fixed=fixedSymbol(store);
    const row = element('details', undefined, 'store-row'), summary = element('summary', undefined, 'store-summary'), body = element('div', undefined, 'store-body');
    row.open = storesOpen.has(store.id); row.dataset.id = store.id; row.dataset.storeId = store.id; if (notes) row.dataset.notes = '';
    summary.setAttribute('aria-label', store.name);
    summary.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    summary.setAttribute('aria-description', 'Lange halten und nach oben oder unten ziehen. Mit der Tastatur: Alt und Pfeil oben oder unten.');
    row.addEventListener('toggle', () => { if (row.open) storesOpen.add(store.id); else storesOpen.delete(store.id); });
    // In der Verwaltung steht zur Orientierung immer der vollständige Name, bei eigenen Listen mit ihrem Symbol – unabhängig von der Anzeige im Reiter.
    const title = element('span', undefined, 'store-name'), shown = listSymbolOf(store);
    if (shown) title.append(symbolNode(shownSymbol(shown), store.name), element('span', store.name)); else title.append(storeLabel(store));
    const heading=element('span',undefined,'store-heading'),badge=element('span',storePill(store),'store-pill');badge.hidden=visibleStore(store)&&!isSeparate(store);heading.append(title,badge);summary.append(heading,listVisibilityButton(store.name,visibleStore(store),()=>setStoreVisibility(store.id)));
    const form = element('form'), input = element('input');
    input.value = store.name; input.required = true; input.maxLength = 80; input.setAttribute('aria-label', 'Geschäftsname');
    input.name = 'name';
    const linkLabel = element('label', 'Angebotslink (optional)'), link = element('input');
    link.name = 'offersUrl'; link.type = 'url'; link.inputMode = 'url'; link.value = storeOfferUrl(store); link.maxLength = 2000; link.placeholder = 'https://…';
    linkLabel.append(link);
    const save = element('button', 'Speichern', 'store-save');save.type='submit';
    const nameLabel = element('label', 'Geschäftsname'); nameLabel.append(input);
    const chainLabel = element('label', 'Händler / Logo'), chainPick = element('select'); chainPick.name = 'chainKey';
    chainPick.append(new Option('Automatisch erkennen', ''));   // kurz, damit nichts abgeschnitten wird (2.155)
    for (const chain of searchCatalog()) chainPick.append(new Option(chain.name, chain.key));
    if (store.chainKey && !catalogByKey(store.chainKey)) chainPick.append(new Option('Gespeicherter Händler', store.chainKey));
    chainPick.value = store.chainKey || ''; chainLabel.append(chainPick);
    // Ein selbst gesetzter Angebotslink bleibt beim Wechseln erhalten; nur die bisherige Voreinstellung wird ausgetauscht.
    let previousDefault = defaultOfferUrl(store), previousAnywhere = takesAnywhere({ name: store.name, chainKey: store.chainKey });
    chainPick.addEventListener('change', () => {
      const identity = { name: input.value, chainKey: chainPick.value }, nextDefault = defaultOfferUrl(identity), nextAnywhere = takesAnywhere(identity);
      if (!link.value.trim() || link.value.trim() === previousDefault) link.value = nextDefault;
      if (anywhere.checked === previousAnywhere) anywhere.checked = nextAnywhere;
      previousDefault = nextDefault; previousAnywhere = nextAnywhere;
    });
    /* Geschäft oder eigene Liste wird beim Anlegen gewählt und hier nicht mehr umgestellt (2.155). Ein Umschalter war missverständlich und
       riskant: Ein Tipp verwarf Händler, Angebotslink und Gänge oder mischte Listeneinträge unter „Alle“. Wer sich vertan hat, legt die
       richtige Art an und verschiebt die Artikel (Auswählen → Geschäft zuordnen). */
    const apart = isSeparate(store) || wishList || notes;
    // „Im Laden“: Artikel ohne Geschäft auch hier zeigen – als Schalter mit verständlicher Erklärung (Name des Geschäfts, Abschnitt „Überall möglich“)
    const anywhereRow = element('label', undefined, 'store-setting'), anywhere = element('input'), anywhereText = element('span', undefined, 'store-setting-text'), anywhereHint = element('small');
    anywhere.type = 'checkbox'; anywhere.name = 'anywhere'; anywhere.className = 'store-switch'; anywhere.setAttribute('role', 'switch'); anywhere.checked = takesAnywhere(store);
    anywhere.setAttribute('aria-label', 'Artikel ohne Geschäft auch hier zeigen'); anywhereHint.id = `store-anywhere-${store.id}`; anywhere.setAttribute('aria-describedby', anywhereHint.id);
    anywhereText.append(element('strong', 'Artikel ohne Geschäft auch hier zeigen'), anywhereHint); anywhereRow.append(anywhereText, anywhere);
    /* Die Erklärung beschreibt den aktuellen Zustand mit demselben Beispiel (2.158): Was passiert mit „Brot“ ohne Geschäft beim Einkaufen hier? */
    const describeAnywhere = () => {
      const here = input.value.trim() || store.name;
      anywhereHint.replaceChildren(element('strong', anywhere.checked ? 'An: ' : 'Aus: '), anywhere.checked
        ? `„Brot“ steht ohne Geschäft auf der Liste? Dann siehst du es beim Einkaufen bei ${here} unter „Überall möglich“ und kannst es dort abhaken.`
        : `„Brot“ ohne Geschäft siehst du beim Einkaufen bei ${here} nicht. Es erscheint nur in Geschäften, bei denen dieser Schalter an ist, und unter „Alle“.`);
    };
    // Symbol (2.152): festgelegt und nur angezeigt. Eine Liste ohne Symbol darf einmalig eines bekommen; danach gilt dieselbe Sperre.
    const symbolBox=element('div',undefined,'store-symbol-section');let firstPick=null;
    if(fixed)symbolBox.append(fixedSymbolInfo(fixed,shownSymbol(fixed)));
    else {
      const none=element('div',undefined,'store-symbol-fixed none');none.append(icon('text'),element('span','Noch kein Symbol'));
      firstPick=symbolPicker({legend:'Symbol festlegen (einmalig)',hint:'Ein zweiter Tipp hebt die Wahl auf. Einmalig: Nach dem Speichern bleibt das Symbol fest.'});firstPick.hidden=true;
      const start=button('Symbol festlegen',()=>{start.hidden=true;firstPick.hidden=false;firstPick.querySelector('input[name=symbol]')?.focus({preventScroll:true});},'secondary store-symbol-first');
      symbolBox.append(none,start,firstPick);
    }
    const chosenSymbol=()=>fixed||pickedSymbol(firstPick);
    const display=displayPicker(listDisplayOf(store));
    const privacy=listPrivacyField(chosenSymbol,firstPick?[firstPick]:[],()=>apart);
    const syncDisplay=()=>{const symbol=chosenSymbol();display.sync(input.value.trim()||store.name,symbol,shownSymbol(symbol));};
    // Reihenfolge der Gänge: Standard ist der typische Weg durch den Laden; hier lässt sie sich für dieses Geschäft ändern (gilt unter „Planen“ und „Im Laden“, gespeichert mit „Speichern“).
    const aisleFold = element('details', undefined, 'aisle-fold'), aisleList = element('ol', undefined, 'aisle-list');
    let aisles = orderCategories(store.aisles).map(category => category.id);
    const aisleReset = button('Standardreihenfolge', () => { aisles = CATEGORIES.map(category => category.id); drawAisles();updateSave(); }, 'secondary aisle-reset');
    const drawAisles = () => {
      aisleList.replaceChildren();
      aisles.forEach((id, index) => {
        const item = element('li'), up = button('', () => { [aisles[index - 1], aisles[index]] = [aisles[index], aisles[index - 1]]; drawAisles();updateSave(); aisleList.children[index - 1].querySelector('.aisle-up').focus(); }, 'icon-button aisle-up'),
          down = button('', () => { [aisles[index + 1], aisles[index]] = [aisles[index], aisles[index + 1]]; drawAisles();updateSave(); aisleList.children[index + 1].querySelector('.aisle-down').focus(); }, 'icon-button aisle-down');
        up.append(icon('up')); down.append(icon('down'));
        up.setAttribute('aria-label', `${categoryLabel(id)} nach oben`); down.setAttribute('aria-label', `${categoryLabel(id)} nach unten`);
        up.disabled = index === 0; down.disabled = index === aisles.length - 1;
        item.append(element('span', categoryLabel(id)), up, down); aisleList.append(item);
      });
      aisleReset.hidden = aisles.every((id, index) => id === CATEGORIES[index].id);
    };
    const aisleSummary=element('summary');aisleSummary.append(icon('grid'),element('span','Reihenfolge der Gänge'),icon('down'));
    aisleFold.append(aisleSummary, aisleList, aisleReset); drawAisles();
    // Beides wirkt nur „Im Laden“ und steht deshalb in einem eigenen, beschrifteten Bereich
    const shopGroup=element('section',undefined,'store-shop-settings');shopGroup.append(element('h4','Im Laden','store-settings-title'),anywhereRow,aisleFold);
    function syncStoreKind() {
      nameLabel.firstChild.textContent=apart?'Listenname':'Geschäftsname';
      input.setAttribute('aria-label',apart?'Listenname':'Geschäftsname');
      for(const field of [chainLabel,linkLabel,shopGroup])field.hidden=apart;
      chainPick.disabled=link.disabled=anywhere.disabled=apart;
      symbolBox.hidden=display.field.hidden=!apart;
      privacy.sync();
    }
    syncStoreKind();syncDisplay();describeAnywhere();
    form.append(nameLabel, chainLabel, linkLabel, symbolBox, display.field, privacy.field, shopGroup, save);
    const storePatch=()=>{
      const name=input.value.trim(),chainKey=apart?null:chainPick.value||null,identity={name,chainKey};
      const typed=apart?'':offerUrl(link.value),symbol=chosenSymbol();
      return {name,chainKey,offersUrl:typed===defaultOfferUrl(identity)?'':typed,
        anywhere:apart?false:anywhere.checked===takesAnywhere(identity)?null:anywhere.checked,separate:apart||null,
        symbol:apart&&symbol?symbol:store.symbol??null,displayMode:apart&&symbol?display.value():store.displayMode??null,
        aisles:apart||aisles.every((id,index)=>id===CATEGORIES[index].id)?null:[...aisles]};
    };
    // Vergleich der sichtbaren Werte: auch „zurück auf den Ausgangswert“ wird erkannt.
    const initial=storePatch();
    const dirty=()=>privacy.input.checked||JSON.stringify(storePatch())!==JSON.stringify(initial);
    updateSave=()=>{
      let modified=true;try{modified=dirty();}catch{/* unfertiger Link bleibt bearbeitbar */}
      save.disabled=!modified;save.classList.toggle('is-saved',!modified);
      const time=new Date(store.updatedAt),label=modified?'Änderungen speichern':Number.isFinite(time.getTime())?`Gespeichert um ${time.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`:'Gespeichert';
      // Ein unveränderter Text bleibt im DOM: Fokuswechsel vor dem ersten Tipp
      // darf dessen Ziel nicht zwischen pointerdown und click austauschen.
      if(save.textContent!==label) {
        const caption=element('span',label);
        if(!modified && label.startsWith('Gespeichert um '))caption.replaceChildren(document.createTextNode('Gespeichert '),element('span',label.slice('Gespeichert '.length),'store-saved-time'));
        save.replaceChildren(icon('check'),caption);
      }
      save.setAttribute('aria-label',modified?`${input.value.trim()||store.name} speichern`:`${store.name}: ${label}`);
    };
    const refresh=()=>{syncDisplay();describeAnywhere();updateSave();};
    form.addEventListener('input',refresh);form.addEventListener('change',refresh);updateSave();
    form.addEventListener('submit', event => { event.preventDefault(); guard(async () => {
      const name = input.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
      currentStore(store.id);if(!dirty())return;
      const patch=storePatch(),delta=changed(patch,initial);
      if(privacy.input.checked&&patch.separate){const id=await makeSharedListPrivate(store.id,name,patch.displayMode||undefined);if(id)replaceStoreEditorRow(row,privateStoreEditorRow(privateList.lists.find(list=>list.id===id)));return;}
      if(wishList)delta.wishlist=true;
      if(patch.separate)Object.assign(delta,{chainKey:null,offersUrl:'',anywhere:false,aisles:null});
      if(fixed&&store.symbol!==fixed)delta.symbol=fixed;   // ein bisher nur aus „Wünsche“ abgeleitetes Geschenk festschreiben: Umbenennen ändert es nicht
      commit([nextOp('stores',store.id,delta)]);
      const replacement=storeEditorRow(active(state.stores).find(entry=>entry.id===store.id)),scroll=$('#stores-dialog').scrollTop;
      replacement.open=row.open;replacement.querySelector('.aisle-fold').open=aisleFold.open;
      row.replaceWith(replacement);$('#stores-dialog').scrollTop=scroll;
    }); });
    const remove = button(notes?'Notizliste löschen':isSeparate(store)?'Liste löschen':'Geschäft löschen', async () => {
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      if (!await ask({ title: `„${store.name}“ löschen?`, message: notes ? 'Die Notizen werden ausgeblendet. 14 Tage lang lässt sich alles unter „Kürzlich gelöscht“ zurückholen.' : 'Die zugehörigen Artikel werden ausgeblendet. 14 Tage lang lässt sich alles unter „Kürzlich gelöscht“ zurückholen.', confirmLabel: 'Löschen', danger: true })) return;
      if (!active(state.stores).some(row => row.id === store.id)) return;
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      removeRows('stores', [store.id]); renderStores();
    }, 'danger store-delete');
    remove.setAttribute('aria-label', `${store.name} löschen`); body.append(form);
    if (wishList) {
      const open = button('Wünsche öffnen', () => openWishlist(store.id), 'secondary store-wishes-open');
      open.disabled = !visibleStore(store); open.prepend(icon('gift')); body.append(open);
    } else if (isSeparate(store)) {
      const open = button(notes ? 'Notizen öffnen' : 'Liste öffnen', () => { if (!visibleStore(store)) return; openListView(store.id); }, 'secondary store-list-open');
      open.disabled = !visibleStore(store); open.prepend(icon(notes ? 'checklist' : 'right')); body.append(open);
    }
    body.append(remove); row.append(summary, body);
    return row;
}
/* Hinzufügen (2.152): erst die Aufgabe wählen – Geschäft, eigene Liste oder, unter einer Linie, eine Notizliste –, dann ein kurzes Formular.
   „Zurück“ behält die Eingaben, „Abbrechen“ und Schließen legen nichts an. Erst der abschließende Tipp speichert, und nur einmal. */
const ADD_KINDS = Object.freeze({
  store: { title: 'Geschäft hinzufügen', caption: 'Geschäftsname', placeholder: 'z. B. Mein Baumarkt', submit: 'Geschäft hinzufügen' },
  list: { title: 'Eigene Liste anlegen', caption: 'Listenname', placeholder: 'z. B. Urlaub oder Geschenke', submit: 'Liste anlegen' },   // ein Symbol trägt seinen Namen ein (2.156)
  notes: { title: 'Notizliste anlegen', caption: 'Listenname', placeholder: 'z. B. Notizen oder Familie', submit: 'Notizliste anlegen' }
});
let storeAddFrom = 'manage', newStoreSymbols = null, newStoreDisplay = null;
/* Namensvorschlag (2.156): Wer bei „Eigene Liste anlegen“ ein Symbol antippt, bekommt dessen Namen ins Feld „Listenname“ (Apotheke → „Apotheke“),
   ohne dass sich die Tastatur öffnet. Ein selbst eingetippter Name bleibt; ein anderes Symbol ersetzt nur den eigenen Vorschlag, Abwählen leert ihn.
   Gibt es den Namen schon, heißt der Vorschlag „Apotheke 2“. */
let suggestedName = '';
function suggestListName() {
  const form = $('#store-form'), input = form.elements.name;
  if (form.elements.kind.value !== 'list') return;
  const current = input.value.trim();
  if (current && current !== suggestedName) return;   // selbst benannt
  const symbol = pickedSymbol(newStoreSymbols);
  const taken = [...active(state.stores).map(store => store.name), ...(privateList?.lists || []).map(list => list.name)];
  suggestedName = symbol ? uniqueName(suggestedListName(symbol), taken) : '';
  input.value = suggestedName;
  if (suggestedName) showStoreNameError(false);
}
function openStoreAdd(from = 'manage') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  storeAddFrom = from; resetStoreAdd(); $('#store-add-dialog').showModal();
  $('#store-add-choice .store-kind').focus({ preventScroll: true });
}
function resetStoreAdd() {
  const form = $('#store-form'); form.reset(); form.elements.chainKey.value = ''; delete form.dataset.busy; $('#store-new-more').open = false; suggestedName = '';
  newStoreDisplay.sync('', ''); showStoreNameError(false); showStoreAddStep('');
}
function showStoreNameError(show) {
  const input = $('#store-form').elements.name; $('#store-name-error').hidden = !show;
  if (show) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}
function showStoreAddStep(kind) {
  const form = $('#store-form');
  $('#store-add-choice').hidden = Boolean(kind); form.hidden = !kind; $('#store-add-back').hidden = !kind;
  $('#store-add-title').textContent = ADD_KINDS[kind]?.title || 'Hinzufügen';
  $('#store-add-dialog').scrollTop = 0;
  if (!kind) return;
  form.elements.kind.value = kind; syncNewStoreForm();
  // Die Tastatur öffnet sich erst, wenn man selbst ins Namensfeld tippt (2.153). Der Fokus geht deshalb nie von selbst in ein Textfeld:
  // beim Geschäft auf „Händler auswählen“, bei eigenen Listen und Notizlisten auf die Überschrift (Bildschirmleser lesen sie vor).
  (kind === 'store' ? $('#choose-store') : $('#store-add-title')).focus({ preventScroll: true });
}
function syncNewStoreForm() {
  const form = $('#store-form'), kind = form.elements.kind.value, info = ADD_KINDS[kind] || ADD_KINDS.store, shop = kind === 'store';
  const symbol = kind === 'notes' ? NOTES_SYMBOL : kind === 'list' ? pickedSymbol(newStoreSymbols) : '';
  newListPrivacy?.sync(); const secret = kind === 'list' && newListPrivacy?.input.checked;
  if (!shop) { form.elements.chainKey.value = ''; form.elements.offersUrl.value = ''; }
  $('#store-new-chain').hidden = !shop; $('#store-new-more').hidden = !shop; form.elements.offersUrl.disabled = !shop;
  $('#store-new-symbols').hidden = shop; $('#store-list-symbols').hidden = kind !== 'list'; $('#store-notes-symbol').hidden = kind !== 'notes';
  $('#store-new-display').hidden = shop;
  $('#store-name-caption').textContent = info.caption; form.elements.name.placeholder = info.placeholder;
  $('#store-add-title').textContent = secret ? 'Geheime Liste anlegen' : info.title;
  $('#store-add-label').textContent = secret ? 'Geheime Liste anlegen' : info.submit;
  $('#store-new-share').textContent = secret ? 'Diese Liste und ihre Inhalte bleiben ausschließlich auf diesem Gerät.' : kind === 'notes' ? 'Wird mit der Familie geteilt. Nur Text: keine Mengen, Produkte oder Geschäfte.' : 'Diese Liste wird mit der Familie geteilt.';
  newStoreDisplay.sync(form.elements.name.value.trim() || (kind === 'notes' ? 'Notizen' : 'Name'), symbol, symbol === 'secret' && !secret ? 'secret-open' : symbol);
  if (shop) renderStoreTemplate();
}
function finishStoreAdd({ name, id = '', privateId = '', kind }) {
  const view = privateId ? privateView(privateId) : id;
  // Gleich leeren, nicht erst im „close“-Ereignis (das kommt eine Browser-Aufgabe später): danach steht nichts Altes mehr im Formular
  $('#store-add-dialog').close(); resetStoreAdd();
  if (storeAddFrom === 'manage' && $('#stores-dialog').open) {
    // In der Verwaltung: neuer Eintrag hervorgehoben, „Öffnen“ in der Meldung
    storeFresh = privateId ? `private:${privateId}` : id; renderStores();
    showNotice(`„${name}“ ${privateId ? 'angelegt · nur auf diesem Gerät' : 'angelegt'}`, () => openListView(view), { action: kind === 'store' ? 'Öffnen' : 'Liste öffnen' });
  } else { openListView(view); showNotice(`„${name}“ angelegt`); }
}

function chip(text, pressed, action) {
  const node = element('button', text, 'chip'); node.type = 'button'; node.setAttribute('aria-pressed', String(pressed));
  node.addEventListener('click', action);
  return node;
}
/* Die Rezeptliste ist die aufwendigste Ansicht (jede Karte prüft ihre Zutaten gegen Vorrat und Einkaufsliste). Ist der Reiter
   nicht sichtbar, wird sie erst beim nächsten Öffnen neu gezeichnet; so bleibt das Abhaken auch bei vielen Rezepten schnell. */
let recipesStale = false;
function renderRecipesWhenVisible() {
  if ($('#recipes').hidden) { recipesStale = true; return; }
  renderRecipes();
}
function renderRecipes() {
  recipesStale = false;
  recipeAvailabilitySnapshot=recipeStockSignature();
  const search = $('#recipe-search').value.trim().toLocaleLowerCase('de');
  const recipes = active(state.recipes);
  const tags = uniqueRecipeTags(recipes.flatMap(recipe => recipe.tags)).sort((a, b) => a.localeCompare(b, 'de'));
  if (tagFilter && !tags.some(tag=>recipeTagKey(tag)===tagFilter)) tagFilter = '';
  const chips = $('#tag-chips'); chips.replaceChildren(); chips.hidden = !recipes.length;
  chips.append(chip('★ Favoriten', favoritesOnly, () => { favoritesOnly = !favoritesOnly; renderRecipes(); }));
  for (const tag of tags){const key=recipeTagKey(tag);chips.append(chip(tag, key === tagFilter, () => { tagFilter = tagFilter === key ? '' : key; renderRecipes(); }));}
  const grid = $('#recipe-list'); grid.replaceChildren();
  const ingredientsOf = id => active(state.ingredients).filter(row => row.recipeId === id);
  const order = RECIPE_ORDER[recipeSort];
  const shown = recipes.filter(recipe => {
    const names = ingredientsOf(recipe.id).map(row => row.name).join(' ');
    return `${recipe.name} ${names} ${recipe.tags.join(' ')}`.toLocaleLowerCase('de').includes(search) &&
      (!tagFilter || recipe.tags.some(tag=>recipeTagKey(tag)===tagFilter)) && (!favoritesOnly || recipe.favorite);
  }).sort(order);
  for (const recipe of shown) grid.append(recipeCard(recipe, ingredientsOf(recipe.id), { sort: recipeSort }));
  // Anzahl und Sortierung über der Liste; die Anzahl sagt bei Suche oder Filter, wie viele von allen zu sehen sind.
  $('#recipe-toolbar').hidden = !recipes.length; $('#recipe-sort').value = recipeSort;
  $('#recipe-sort-label').textContent = $('#recipe-sort').selectedOptions[0]?.textContent || 'A–Z';
  $('#recipe-count').textContent = shown.length === recipes.length ? `${recipes.length} ${recipes.length === 1 ? 'Rezept' : 'Rezepte'}` : `${shown.length} von ${recipes.length} ${recipes.length === 1 ? 'Rezept' : 'Rezepten'}`;
  refreshRecipeStock();
  if (!grid.children.length) grid.append(element('p', recipes.length ? 'Kein passendes Rezept. Ändere die Suche oder den Filter.' : 'Noch kein Rezept. Importiere eines aus einem Link oder Screenshot oder lege es von Hand an.', 'empty'));
  hydratePhotos();
}
$('#recipe-sort').addEventListener('change', event => {
  recipeSort = Object.hasOwn(RECIPE_ORDER, event.target.value) ? event.target.value : 'name';
  try { localStorage.setItem(RECIPE_SORT_KEY, recipeSort); } catch { /* ohne Speicher gilt die Wahl bis zum Schließen */ }
  renderRecipes();
});
/* „✓ Hab ich“ (2.164): Eine fehlende Zutat ist doch da. Sie kommt sofort als Produkt (ohne Menge und Einheit) in den aktuellen Vorrat, wie eine Auswahl in der
   Vorratsauswahl; nichts wird doppelt angelegt (pantryChanges). Die Karte zeichnet sich neu: Die Zeile wandert nach „Im Vorrat vorhanden“, Balken und Überschrift
   folgen. Steht die Zutat offen auf dem Einkaufszettel, fragt die App, ob sie dort entfernt werden soll. Unten steht 4 Sekunden „Rückgängig“ für beides. */
async function haveIngredient(row) {
  if (!ready) throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');
  const product = ingredientPantryProduct(row), scope = namespace(), before = clone(state.pantry || []);
  const changes = pantryChanges([product], before);
  if (!changes.length) { showNotice(`${product.name} steht schon im Vorrat`); return; }
  commit(changes.map(({ id, patch }) => nextOp('pantry', id, patch)));
  // Zurücknehmen: neu angelegte Einträge löschen, wiederbelebte bekommen ihren vorigen Stand (aufgebraucht, automatisch, gelöscht) zurück
  const undoPantry = changes.map(({ id, patch }) => {
    const old = before.find(entry => entry.id === id);
    if (!old) return { id, patch: { deletedAt: new Date().toISOString() } };
    return { id, patch: Object.fromEntries(Object.keys(patch).map(key => [key, old[key] === undefined ? (key === 'available' ? true : null) : clone(old[key])])) };
  });
  const listed = () => active(withoutSeparate(state.items, state.stores)).filter(item => !item.checked && sameIngredient(item.name, row.name));
  let removed = [];
  if (listed().length) {
    const first = listed()[0];
    const remove = await ask({ title: `${product.name} vom Einkaufszettel entfernen?`, message: `„${first.name}“ (${shoppingAmount(first)}) steht noch auf dem Einkaufszettel. Du hast es jetzt im Vorrat.`, confirmLabel: 'Entfernen', cancelLabel: 'Behalten' });
    if (scope !== namespace()) return;
    const ids = remove ? listed().map(item => item.id) : [];
    if (ids.length) { commit(deleteOps('items', ids)); removed = ids; }
  }
  showNotice(`${product.name} zum Vorrat hinzugefügt${removed.length ? ' und vom Einkaufszettel entfernt' : ''}`, () => guard(() => {
    if (scope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte im Vorrat prüfen.');
    const at = new Date().toISOString(), restore = removed.flatMap(id => restoreChanges(state, 'items', id, at)).filter(change => change.collection === 'items');
    commit([...undoPantry.map(({ id, patch }) => nextOp('pantry', id, patch)), ...restore.map(change => nextOp(change.collection, change.id, change.patch))]);
    showNotice(`${product.name} ist wieder als fehlend markiert${restore.length ? ' und steht wieder auf dem Einkaufszettel' : ''}`);
  }), { ms: 4000 });
}
function addedLabel(at) { const day = relativeDay(at); return `hinzugefügt ${day === 'geplant' ? 'heute' : day}`; }
function recipeCard(recipe, ingredients, options = {}) {
  const card = element('article', undefined, 'card recipe-card'); card.dataset.recipeId = recipe.id;
  if (recipe.photoId) {
    const frame = element('div', undefined, 'recipe-photo'), image = element('img');
    image.dataset.photoId = recipe.photoId; image.alt = `Foto: ${recipe.name}`; image.hidden = true; image.loading = 'lazy';
    frame.append(icon('camera'), image); card.append(frame);
  }
  const head = element('div', undefined, 'recipe-head');
  const star = iconButton('star', recipe.favorite ? `${recipe.name} ist Favorit, zum Entfernen tippen` : `${recipe.name} als Favorit markieren`,
    () => commit([nextOp('recipes', recipe.id, { favorite: !recipe.favorite })]), 'fav');
  star.setAttribute('aria-pressed', String(Boolean(recipe.favorite)));
  head.append(element('h3', recipe.name), star); card.append(head);
  const source = webUrl(recipe.sourceUrl), cooked = recipe.lastCookedAt && relativeDay(recipe.lastCookedAt);
  // Je nach Sortierung steht vorn, wonach sortiert ist: „hinzugefügt gestern“ bzw. „noch nie gekocht“.
  card.append(element('p', [options.sort === 'new' && recipe.createdAt && addedLabel(recipe.createdAt), `${ingredients.length} Zutaten`, `${format(options.servings ?? recipe.servings)} Portionen`, source && hostLabel(source),
    cooked && cooked !== 'geplant' ? `gekocht ${cooked}` : options.sort === 'cooked' && !recipe.lastCookedAt && 'noch nie gekocht'].filter(Boolean).join(' · '), 'recipe-meta'));
  if (recipe.tags.length) {
    const tags = element('div', undefined, 'tags');
    uniqueRecipeTags(recipe.tags).forEach(tag => tags.append(element('span', tag, 'tag'))); card.append(tags);
  }
  const stock=namesFrom({pantry:state.pantry}), stockIndex=indexNames(stock), tracked=ingredients.filter(required),shopping=active(withoutSeparate(state.items,state.stores)).filter(row=>!row.checked);
  const showStock=stock.have.length>0;
  let stockView=null;
  if(showStock && tracked.length) {
    stockView=recipeStockView({key:options.isolated?`plan:${options.mealId}`:`book:${recipe.id}`,recipe,ingredients,index:stockIndex,makeIcon:icon,ingredientLabel,onHave:row=>guard(()=>haveIngredient(row))});
    card.append(stockView.element);
  }
  const details = element('details', undefined, 'recipe-details'); details.open = options.isolated ? options.expanded !== false : openRecipes.has(recipe.id);
  details.addEventListener('toggle', () => { if (options.isolated) return; if (details.open) openRecipes.add(recipe.id); else openRecipes.delete(recipe.id); });
  details.append(element('summary', 'Zutaten & Zubereitung'));
  const servingInput = element('input'), list = element('ul', undefined, 'recipe-ingredients');
  servingInput.inputMode = 'decimal'; servingInput.value = plain(options.servings ?? portions.get(recipe.id) ?? recipe.servings);
  servingInput.setAttribute('aria-label', `Portionen für ${recipe.name}`);
  const updateAmounts = () => {
    const count = positive(servingInput.value); if (!options.isolated) portions.set(recipe.id, count);
    stockView?.updateAmounts(count);
    const missing=new Map(recipeNeeds(ingredients,count/recipe.servings).map(row=>[row.id,row]));
    list.replaceChildren(...ingredients.map(row => {
      const li=element('li'), label=element('span',ingredientLabel(row,count/recipe.servings)); li.append(label);
      if(showStock||shopping.length) {
        const have=!required(row)||availability(row,stockIndex)==='have',need=missing.get(row.id),listed=!have&&!need;
        const partial=need&&shopping.some(item=>sameIngredient(item.name,row.name));
        const text=have?'Vorhanden':listed?'Auf Einkaufszettel':partial?`Noch ${format(need.quantity)} ${need.unit} fehlen`:'Fehlt';
        const status=element('span',text,`ingredient-stock ${have?'have':listed?'soon':'missing'}`);status.prepend(icon(have?'check':listed?'cart':'minus'));li.append(status);
      }
      return li;
    }));
  };
  const step = delta => () => { servingInput.value = plain(Math.max(1, positive(servingInput.value) + delta)); updateAmounts(); };
  const stepper = element('div', undefined, 'stepper');
  stepper.append(element('span', 'Portionen'), iconButton('minus', 'Eine Portion weniger', step(-1), 'round secondary'), servingInput,
    iconButton('plus', 'Eine Portion mehr', step(1), 'round secondary'));
  updateAmounts(); servingInput.addEventListener('change', () => guard(updateAmounts));
  servingInput.addEventListener('input', () => { try { updateAmounts(); } catch { /* Eingabe noch unvollständig */ } });
  details.append(stepper, list);
  details.append(element('h4', 'Zubereitung'), element('p', recipe.instructions || 'Keine Zubereitung eingetragen.', 'recipe-steps'));
  if (recipe.notes?.trim()) details.append(element('h4', 'Meine Notizen'), element('p', recipe.notes, 'recipe-steps'));
  if (source) {
    const link = element('a', `Quelle: ${hostLabel(source)}`, 'source-link');
    externalLink(link, source); link.append(icon('external'));
    details.append(link);
  }
  const more = element('div', undefined, 'detail-actions');
  more.append(button('Bearbeiten', () => editRecipe(recipe.id), 'recipe-manage-button recipe-edit'),
    button(RECIPE_DELETE_LABEL, () => deleteRecipe(recipe.id), 'recipe-manage-button recipe-delete danger'));
  details.append(more);
  card.append(details);
  const actions = element('div', undefined, 'actions recipe-actions');
  const action = (symbol,label,title,callback,className='secondary') => {
    const node=button('',callback,className); node.append(icon(symbol),element('span',label)); node.title=title; if(!['cart','pot'].includes(symbol)) node.setAttribute('aria-label',title); return node;
  };
  actions.append(action('cart','Einkaufen',`${recipe.name}: Zutaten auf die Einkaufsliste`, () => openTransfer(recipe.id,positive(servingInput.value),null,options.mealId),'recipe-outline'),
    action('pot','Kochen',`${recipe.name} kochen`, () => openCook(recipe.id,positive(servingInput.value)),'recipe-cook'),
    action('calendar','Einplanen',`${recipe.name} im Wochenplan einplanen`, () => { const servings=positive(servingInput.value); if(options.isolated) $('#plan-recipe-dialog').close(); openMeal({recipeId:recipe.id,servings}); },'recipe-outline'),
    action('text','Rezeptblatt',`${recipe.name}: Rezeptblatt (PDF) ansehen, speichern oder teilen`, () => openSheet(recipe.id,positive(servingInput.value)),'recipe-outline'));
  card.append(actions);
  return card;
}
const RECIPE_DELETE_LABEL = 'Rezept dauerhaft aus dem Rezeptbuch löschen';
async function deleteRecipe(id) {
  const recipe=active(state.recipes).find(row=>row.id===id);
  if(!recipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  if(!await ask({title:'Rezept löschen?',message:`„${recipe.name}“ wird aus dem Rezeptbuch gelöscht. 14 Tage lang lässt es sich unter „Kürzlich gelöscht“ zurückholen.`,confirmLabel:'Löschen',danger:true})) return;
  if(!active(state.recipes).some(row=>row.id===id)) return;
  removeSavedRecipe(id);
}
function removeSavedRecipe(id) {
  const recipe=active(state.recipes).find(row=>row.id===id);if(!recipe)return;
  removeRows('recipes',[id]);const scope=namespace();showNotice(`„${recipe.name}“ gelöscht`,()=>undoDelete([id],scope,'recipes'),{trash:true});
  if($('#recipe-dialog').open && $('#recipe-form').elements.rowId.value===id) { dropRecipeDraft();$('#recipe-dialog').close(); }
}
function ingredientRow(value = {}) {
  const row = element('div', undefined, 'ingredient-row'); row.dataset.id = value.id || uid();
  for (const [key, caption, fallback] of [['name', 'Zutat', ''], ['quantity', 'Menge', '1'], ['unit', 'Einheit', 'Stück']]) {
    const label = element('label', caption, key === 'name' ? 'wide' : '');
    const input = element('input'); input.dataset.field = key; input.value = key === 'quantity' && typeof value[key] === 'number' ? plain(value[key]) : value[key] ?? fallback;
    input.required = true; input.maxLength = key === 'name' ? 120 : 30;
    if (key === 'quantity') input.inputMode = 'decimal';
    if (key === 'unit') input.setAttribute('list', 'units');
    label.append(input); row.append(label);
  }
  row.append(iconButton('trash', 'Zutat entfernen', () => row.remove(), 'danger'));
  $('#ingredient-editor').append(row);
}
/* Entwürfe: Was im Rezeptfenster getippt ist, wird laufend auf diesem Gerät gesichert (nicht in der gemeinsamen Datei, ohne Foto). Schließt jemand das Fenster
   oder die App, bietet das nächste Öffnen den Entwurf an („Entwurf zurückholen“ oder „Verwerfen“). Je Rezept ein Entwurf, dazu „new“ (Neues Rezept) und „import“
   (Importiertes Rezept); gespeichert wird nur, was sich vom Öffnungsstand unterscheidet. Nach dem Speichern ist der Entwurf weg. */
let draftStore, recipeDraftScope = null;
const readDrafts = () => draftStore.read(recipeDraftScope || namespace());
const writeDrafts = drafts => draftStore.write(recipeDraftScope || namespace(), drafts);
let recipeDraftKey = null, recipeOpenState = null, draftTimer = null, recipeSaving = false;
function recipeFormState() {
  const form = $('#recipe-form');
  return { name: form.elements.name.value, servings: form.elements.servings.value, tags: form.elements.tags.value, instructions: form.elements.instructions.value, notes: form.elements.notes.value, sourceUrl: form.elements.sourceUrl.value,
    ingredients: [...$('#ingredient-editor').children].map(row => ({ id: row.dataset.id, name: row.querySelector('[data-field=name]').value, quantity: row.querySelector('[data-field=quantity]').value, unit: row.querySelector('[data-field=unit]').value })) };
}
function saveRecipeDraft() {
  clearTimeout(draftTimer); draftTimer = null;
  if (!recipeDraftKey) return true;
  try {
  const current = recipeFormState(), text = JSON.stringify(current), drafts = readDrafts();
  // Ein nur angebotener Entwurf wurde noch nicht ins Formular geladen. Das
  // unveränderte, leere Formular darf ihn beim Schließen nicht löschen.
  if (!$('#recipe-draft-note').hidden && text === recipeOpenState) return true;
  const blank = !current.name.trim() && !current.instructions.trim() && !current.notes.trim() && !current.tags.trim() && !current.sourceUrl.trim() && current.ingredients.every(row => !row.name.trim());
  if (blank || text === recipeOpenState) delete drafts[recipeDraftKey];
  else drafts[recipeDraftKey] = { at: new Date().toISOString(), state: current };
  writeDrafts(drafts);
  $('#recipe-draft-error').hidden = true;
  return true;
  } catch (error) {
    $('#recipe-draft-error').textContent = error.message; $('#recipe-draft-error').hidden = false;
    return false;
  }
}
const scheduleRecipeDraft = () => { if (!recipeDraftKey) return; clearTimeout(draftTimer); draftTimer = setTimeout(saveRecipeDraft, 500); };
function dropRecipeDraft() {
  clearTimeout(draftTimer); draftTimer = null;
  if (recipeDraftKey) { const drafts = readDrafts(); delete drafts[recipeDraftKey]; writeDrafts(drafts); }
  recipeDraftKey = null;
}
function applyRecipeDraft(state) {
  const form = $('#recipe-form');
  for (const field of ['name', 'servings', 'tags', 'instructions', 'notes', 'sourceUrl']) form.elements[field].value = state[field] ?? '';
  $('#ingredient-editor').replaceChildren();
  (state.ingredients?.length ? state.ingredients : [{}]).forEach(row => ingredientRow({ id: typeof row.id === 'string' ? row.id : undefined, name: String(row.name ?? ''), quantity: String(row.quantity ?? '1'), unit: String(row.unit ?? 'Stück') }));
  recipeTagPicker.reset();
}
function offerRecipeDraft() {
  const note = $('#recipe-draft-note'); note.replaceChildren(); note.hidden = true;
  // Beim Anlegen eines neuen Rezepts wird auch ein liegengebliebenes importiertes Rezept angeboten.
  const drafts = readDrafts(), slot = drafts[recipeDraftKey] ? recipeDraftKey : recipeDraftKey === 'new' && drafts.import ? 'import' : '', stored = slot && drafts[slot];
  if (!stored) return;
  const when = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(stored.at));
  const actions = element('div', undefined, 'draft-actions');
  actions.append(button('Entwurf zurückholen', () => {
      applyRecipeDraft(stored.state); note.hidden = true;
      if(slot==='import') $('#discard-imported-recipe').hidden=false;
      if (slot !== recipeDraftKey) { const all = readDrafts(); delete all[slot]; writeDrafts(all); }
      saveRecipeDraft();
    }, 'small'),
    button('Verwerfen', () => { const all = readDrafts(); delete all[slot]; writeDrafts(all); note.hidden = true; }, 'secondary small'));
  note.append(element('p', `Es gibt einen nicht gespeicherten Entwurf${slot === 'import' ? ' (importiertes Rezept)' : ''} von ${when}. Das Foto wird im Entwurf nicht gesichert.`), actions);
  note.hidden = false;
}
// `draft` stammt aus dem Import: Das Formular zeigt dann einen Vorschlag, gespeichert wird erst nach dem Prüfen.
function editRecipe(id = '', draft = null) {
  if (recipeSaving) throw new Error('Das Rezept wird gerade gespeichert. Bitte kurz warten.');
  const editorVersion=++photoEditVersion;
  recipeDraftScope = namespace(); $('#recipe-draft-error').hidden = true;
  const form = $('#recipe-form'); form.reset();form.elements.tags.value='';
  recipeBaseline = id ? clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt)) : null;
  if (id && !recipeBaseline) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  if (recipeBaseline) recipeBaseline.notes ??= '';
  ingredientBaseline = id ? clone(active(state.ingredients).filter(row => row.recipeId === id)) : [];
  form.elements.rowId.value = id;
  $('#recipe-editor-title').textContent = id ? 'Rezept bearbeiten' : draft ? 'Importiertes Rezept prüfen' : 'Neues Rezept';
  $('#discard-imported-recipe').hidden=!draft;
  $('#delete-recipe').hidden=!id;
  if (recipeBaseline) for (const field of ['name', 'servings', 'instructions', 'notes', 'tags', 'sourceUrl']) {
    form.elements[field].value = field === 'tags' ? recipeBaseline.tags.join(', ') : recipeBaseline[field] ?? '';
  }
  if (draft) {
    form.elements.name.value = draft.name || ''; form.elements.servings.value = plain(draft.servings || 2);
    form.elements.tags.value = (draft.tags || []).join(', '); form.elements.instructions.value = draft.instructions || '';
    form.elements.sourceUrl.value = draft.sourceUrl || '';
  }
  $('#ingredient-editor').replaceChildren();
  (draft ? draft.ingredients : ingredientBaseline.length ? ingredientBaseline : [{}]).forEach(ingredientRow);
  if (draft && !draft.ingredients.length) ingredientRow();
  pendingPhoto = null; photoRemoved = false; showPhotoPreview('');
  if (recipeBaseline?.photoId) ensurePhoto(recipeBaseline.photoId).then(url => { if (editorVersion===photoEditVersion && url && !pendingPhoto && !photoRemoved && $('#recipe-dialog').open) showPhotoPreview(url, false); });
  const note = $('#recipe-import-note'); note.replaceChildren(); note.hidden = !draft;
  if (draft) {
    note.append(element('p', draft.via === 'schema' ? 'Das Rezept wurde aus den Daten der Seite übernommen. Bitte kurz prüfen.' : 'Das Rezept wurde aus Text geschätzt. Bitte alles prüfen und korrigieren.'));
    for (const warning of draft.warnings || []) note.append(element('p', warning, 'warn'));
  }
  $('#recipe-raw').hidden = !draft?.raw; $('#recipe-raw').open = false; $('#recipe-raw-text').textContent = draft?.raw || '';
  recipeTagPicker.reset();
  // Entwurf: Ein importiertes Rezept gilt sofort als nicht gespeichert (der Import ist aufwendig); sonst zählt, was sich vom Öffnungsstand unterscheidet.
  recipeDraftKey = id || (draft ? 'import' : 'new'); recipeOpenState = draft ? null : JSON.stringify(recipeFormState());
  if (draft) saveRecipeDraft(); else offerRecipeDraft();
  if (draft) { $('#recipe-draft-note').replaceChildren(); $('#recipe-draft-note').hidden = true; }
  $('#recipe-dialog').showModal();
  // Vorhandenes Rezept: Speichern erst nach einer Änderung (Zutatenzeilen und Foto zählen mit). Neue und importierte Rezepte wie bisher.
  if (recipeBaseline) armDirty(form, { savedAt: recipeBaseline.updatedAt, extra: () => [recipeFormState(), Boolean(pendingPhoto), photoRemoved], buttons: [form.querySelector('.sheet-actions button[type=submit]')] });
  else disarmDirty(form);
}
function discardImportedRecipe() {
  if($('#discard-imported-recipe').hidden || recipeBaseline) return;
  dropRecipeDraft();++photoEditVersion;
  pendingPhoto=null;photoRemoved=false;showPhotoPreview('');
  const form=$('#recipe-form');form.reset();form.elements.rowId.value='';form.elements.tags.value='';recipeTagPicker.reset();
  $('#ingredient-editor').replaceChildren();
  for(const id of ['recipe-import-note','recipe-draft-note']) { $('#'+id).replaceChildren();$('#'+id).hidden=true; }
  $('#recipe-raw-text').textContent='';$('#recipe-raw').open=false;$('#recipe-raw').hidden=true;
  recipeBaseline=null;ingredientBaseline=[];recipeOpenState=null;
  $('#discard-imported-recipe').hidden=true;
  $('#recipe-dialog').close();
}
// Nur gegenüber dem Öffnungsstand geänderte Felder speichern. So überschreibt
// ein unverändertes Eingabefeld keine inzwischen angekommenen Partner-Änderungen.
function changed(patch, before) {
  return Object.fromEntries(Object.entries(patch).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before?.[key])));
}
function saveRecipe(event) {
  event.preventDefault();
  if (recipeSaving) return;
  const form = event.currentTarget;
  recipeSaving = true; form.setAttribute('aria-busy', 'true');
  const controls = [...form.querySelectorAll('input,textarea,select,button')].map(node => [node, node.disabled]);
  controls.forEach(([node]) => { node.disabled = true; });
  guard(async () => {
    try {
    const scope = namespace(), editorVersion = photoEditVersion, uploadKey = queueKey();
    const beforeRecipe = recipeBaseline && clone(recipeBaseline), beforeIngredients = clone(ingredientBaseline), removedPhoto = photoRemoved;
    const id = form.elements.rowId.value || uid();
    form.elements.rowId.value = id;
    if (beforeRecipe && !active(state.recipes).some(row => row.id === id)) throw new Error('Dieses Rezept wurde inzwischen gelöscht. Bitte schließen und neu anlegen.');
    const sourceText = form.elements.sourceUrl.value.trim(), sourceUrl = webUrl(sourceText);
    if (sourceText && !sourceUrl) throw new Error('Bitte bei der Quelle einen vollständigen Link mit https:// eingeben oder das Feld leeren.');
    const patch = { name: form.elements.name.value.trim(), servings: positive(form.elements.servings.value),
      instructions: form.elements.instructions.value.trim(), notes: form.elements.notes.value.trim(), tags: checkedRecipeGroups(form.elements.tags.value.split(',')) };
    if (sourceUrl || beforeRecipe?.sourceUrl) patch.sourceUrl = sourceUrl;
    if (patch.notes.length > 10000) throw new Error('Meine Notizen dürfen höchstens 10.000 Zeichen enthalten.');
    if (!patch.name) throw new Error('Bitte dem Rezept einen Namen geben.');
    const rows = [...$('#ingredient-editor').children].map(row => ({ id: row.dataset.id, recipeId: id,
      name: row.querySelector('[data-field=name]').value.trim(), quantity: positive(row.querySelector('[data-field=quantity]').value),
      unit: row.querySelector('[data-field=unit]').value.trim() }));
    if (!rows.length || rows.some(row => !row.name || !row.unit)) throw new Error('Bitte mindestens eine vollständige Zutat eingeben.');
    // Das Foto muss lokal gespeichert sein, bevor die Änderung abgeglichen wird, sonst fände der Upload es nicht.
    const photo = pendingPhoto;
    if (photo) {
      await storePhoto(photo.id, photo.blob); patch.photoId = photo.id;
      if (scope !== namespace() || editorVersion !== photoEditVersion) throw new Error('Die Liste oder das Rezeptfenster hat sich geändert. Bitte erneut öffnen.');
      if (connected()) queuePhoto(uploadKey, photo.id);
    } else if (removedPhoto && beforeRecipe?.photoId) patch.photoId = null;
    const ops = [], recipeChanges = changed(patch, beforeRecipe);
    if (Object.keys(recipeChanges).length) ops.push(nextOp('recipes', id, recipeChanges));
    for (const { id: ingredientId, ...fields } of rows) {
      const delta = changed(fields, beforeIngredients.find(row => row.id === ingredientId));
      if (Object.keys(delta).length) ops.push(nextOp('ingredients', ingredientId, delta));
    }
    for (const row of beforeIngredients.filter(row => !rows.some(candidate => candidate.id === row.id))) {
      ops.push(nextOp('ingredients', row.id, { deletedAt: new Date().toISOString() }));
    }
    try { commit(ops); }
    catch (error) { if (photo && !ops.every(op=>state.sync.applied.includes(op.id))) unqueuePhoto(uploadKey, photo.id); throw error; }
    try { dropRecipeDraft(); }
    catch { recipeDraftKey = null; showNotice('Rezept gespeichert. Der alte Entwurf konnte noch nicht entfernt werden. Bitte Gerätespeicher freigeben.'); }
    recipeDraftScope = null;
    $('#recipe-dialog').close();
    } finally {
      recipeSaving = false; form.removeAttribute('aria-busy');
      controls.forEach(([node, disabled]) => { node.disabled = disabled; });
    }
  });
}
// `only`: Kennungen der Zutaten, die vorausgewählt sein sollen (z. B. nur das, was zum Kochen noch fehlt); sonst alles außer Vorrat und „nach Bedarf“.
function recipeNeeds(ingredients,factor=1) {
  return shoppingDeficits(ingredients.map(row=>({...row,...listRow(row,factor)})),state.pantry||[],withoutSeparate(state.items,state.stores));
}
function openTransfer(id, servings, only = null, mealId = null) {
  transferRecipe = clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt));
  if (!transferRecipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const form = $('#transfer-form'); form.elements.servings.value = plain(servings);
  const meal=mealId?active(state.meals).find(row=>row.id===mealId&&row.recipeId===id):null;
  if(mealId&&!meal)throw new Error('Dieses Gericht wurde inzwischen geändert. Bitte den Wochenplan erneut öffnen.');
  form._meal=meal?clone(meal):null;
  form._mealRecipeSignature=meal?transferRecipeSignature(id):'';
  form._mealScope=namespace();
  $('#transfer-plan-note').hidden=!meal;
  $('#transfer-plan-note').textContent=meal?(meal.listedServings?'Die Zutaten sind für dieses Gericht schon berücksichtigt. Vorhandene Mengen werden erneut geprüft; ergänzt werden nur noch fehlende Mengen.':'Diese Zutaten werden dem Gericht im Wochenplan zugeordnet. Beim Entfernen des Gerichts kannst du sie wieder vom Einkaufszettel nehmen.'):'';
  storeOptions(form.elements.storeId, defaultStore(), true); $('#transfer-ingredients').replaceChildren(); form.elements.rememberPantry.checked = false;
  for (const row of active(state.ingredients).filter(row => row.recipeId === id)) {
    const label = element('label', undefined, 'transfer-row'), check = element('input'), water = isCookingWater(row.name);
    // Salz, Pfeffer und Co. („nach Bedarf“) und der Vorrat: hat man meist da, nicht vorausgewählt.
    check.type = 'checkbox'; check.disabled = water; check.value = row.id;
    label._eligible=!water&&(only?only.has(row.id):row.unit!==NO_AMOUNT);label._dirty=false;
    // Bewusst gesetzte Haken erhalten; automatisch vorgeschlagene Fehlmengen bleiben aktuell.
    label._ingredient = clone(row); label.append(check, element('span'));
    check.addEventListener('change',()=>{label._dirty=true;guard(updateTransfer);});
    $('#transfer-ingredients').append(label);
  }
  updateTransfer(); $('#transfer-dialog').showModal();
}
function transferRecipeSignature(id) {
  const recipe=active(state.recipes).find(row=>row.id===id);
  return JSON.stringify([recipe?.servings,active(state.ingredients).filter(row=>row.recipeId===id).map(row=>[row.id,row.name,row.quantity,row.unit]).sort((a,b)=>a[0].localeCompare(b[0]))]);
}
function updateTransfer() {
  const form=$('#transfer-form'),labels=[...$('#transfer-ingredients').children],keys=pantryKeys(state.pantry);
  let factor;try{factor=positive(form.elements.servings.value)/transferRecipe.servings;}catch{return;}
  const candidates=labels.filter(label=>!isCookingWater(label._ingredient.name)&&(label._dirty?label.querySelector('input').checked:label._eligible)).map(label=>label._ingredient);
  const missing=new Map(recipeNeeds(candidates,factor).map(row=>[row.id,row]));
  for(const label of labels) {
    const row=label._ingredient,check=label.querySelector('input'),stocked=inPantry(keys,row),need=missing.get(row.id);
    label._shoppingCovered=!stocked&&!need&&active(withoutSeparate(state.items,state.stores)).some(item=>!item.checked&&sameIngredient(item.name,row.name));
    if(!label._dirty)check.checked=label._eligible&&!stocked&&Boolean(need);
    label.querySelector('span').textContent=need?ingredientLabel(need):ingredientLabel(row,factor);
    label.querySelector('.pantry-badge')?.remove();
    if(stocked||label._shoppingCovered)label.append(element('small',stocked?'Vorrat':'Bereits auf dem Einkaufszettel','pantry-badge'));
  }
  form.querySelector('button[type=submit]').textContent=labels.some(label=>label.querySelector('input').checked)||form.elements.rememberPantry.checked?'Ausgewählte Zutaten hinzufügen':'Fertig';
}

/* ---------- Rezeptfotos ---------- */
const queueKey = () => `einkauf-photo-queue:${namespace()}`;
const photoApi = id => `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${photoPath(config.path, id).split('/').map(encodeURIComponent).join('/')}`;
const githubHeaders = extra => ({ Authorization: `Bearer ${config.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...extra });
async function timed(address, init) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try { return await fetch(address, { ...init, cache: 'no-store', signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function downloadPhoto(id) {
  try {
    const response = await timed(`${photoApi(id)}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders({ Accept: 'application/vnd.github.raw+json' }) });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return isJpeg(bytes) ? new Blob([bytes], { type: 'image/jpeg' }) : null;
  } catch { return null; }
}
// Anzeigeadresse eines Fotos: erst lokal, sonst (verbunden) aus dem Daten-Repository, danach lokal gemerkt.
function ensurePhoto(id) {
  if (photoJobs.has(id)) return photoJobs.get(id);
  const job = (async () => {
    const local = await localPhotoUrl(id);
    if (local || !connected() || Date.now() - (photoMiss.get(id) || 0) < 30000) return local;
    const blob = await downloadPhoto(id);
    if (!blob) { photoMiss.set(id, Date.now()); return null; }
    await storePhoto(id, blob).catch(() => {});
    return (await localPhotoUrl(id)) ?? URL.createObjectURL(blob);
  })().finally(() => photoJobs.delete(id));
  photoJobs.set(id, job);
  return job;
}
// Fotos, die noch fehlen (z. B. weil das andere Gerät sie erst hochlädt), werden bei jedem Abgleich erneut versucht.
function hydratePhotos() {
  document.querySelectorAll('img[data-photo-id]:not([data-loaded])').forEach(image => {
    ensurePhoto(image.dataset.photoId).then(url => {
      if (!url || !image.isConnected) return;
      image.src = url; image.hidden = false; image.dataset.loaded = 'yes';
      image.parentElement.querySelector('.icon')?.setAttribute('hidden', '');
    });
  });
}
// Hochladen als eigene Datei. Kennungen sind einmalig, deshalb ist „Datei existiert schon“ (422 wegen fehlender SHA) ein Erfolg.
let photoRetryAt = 0, photoIssue = null;
async function uploadPhotos(manual = false) {
  // Nach einem Fehler erst nach 20 Sekunden wieder versuchen, außer die Person löst den Abgleich selbst aus.
  if (!connected() || (!manual && Date.now() < photoRetryAt)) return;
  const key = queueKey();
  const later = () => { photoRetryAt = Date.now() + 20000; };
  for (const id of queued(key)) {
    try {
      const blob = await readPhoto(id);
      if (!blob) { photoIssue = { scope: namespace(), id }; later(); continue; }
      if (photoIssue?.id === id && photoIssue.scope === namespace()) photoIssue = null;
      const body = JSON.stringify({ message: 'SattPlan: Rezeptfoto', branch: config.branch, content: toBase64(new Uint8Array(await blob.arrayBuffer())) });
      const response = await timed(photoApi(id), { method: 'PUT', headers: githubHeaders({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }), body });
      if (response.ok) unqueuePhoto(key, id);
      else if (response.status === 422 && /sha/i.test(await response.text())) unqueuePhoto(key, id);
      else return later();   // z. B. 409 (gleichzeitiger Commit) oder 403
    } catch { return later(); }
  }
}
function showPhotoPreview(url, remember = true) {
  if (previewUrl && previewUrl.startsWith('blob:') && remember) URL.revokeObjectURL(previewUrl);
  previewUrl = remember ? url : '';
  $('#photo-preview').hidden = !url;
  if (url) $('#photo-preview-img').src = url; else $('#photo-preview-img').removeAttribute('src');
  $('#photo-label').textContent = url ? 'Foto ändern' : 'Foto hinzufügen';
}

/* ---------- Wochenplan ---------- */
function renderPlan() {
  const days = weekDays(planWeek), today = isoDate();
  $('#week-label').textContent = weekLabel(planWeek);
  $('#week-today').hidden = days.includes(today);
  const meals = active(state.meals).filter(meal => days.includes(meal.date));
  const recipes = new Map(active(state.recipes).map(recipe => [recipe.id, recipe]));
  const box = $('#plan-days'); box.replaceChildren();
  for (const day of days) {
    const past = day < today;   // vergangene Tage bleiben grau; nur langes Drücken darf ihren Planeintrag entfernen
    const card = element('article', undefined, `day${day === today ? ' today' : ''}${past ? ' past' : ''}`); card.dataset.day = day;
    const head = element('div', undefined, 'day-head'), title = element('h3', dayName(day));
    title.append(element('small', dayMonthLabel(day)));
    if (day === today) title.append(element('span', 'Heute', 'day-today-badge'));
    head.append(title); if (!past) head.append(iconButton('plus', `${dayName(day)}: Gericht planen`, () => openMeal({ date: day })));
    card.append(head);
    for (const meal of meals.filter(row => row.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) card.append(mealRow(meal, recipes, past));
    box.append(card);
  }
  $('#plan-shopping').disabled = !ready || !meals.some(meal => recipes.has(meal.recipeId));
}
function mealRow(meal, recipes, past = false) {
  const recipe = recipes.get(meal.recipeId);
  const name = meal.recipeId ? recipe?.name || 'Gelöschtes Rezept' : meal.title;
  const row = element('div', undefined, `meal${meal.done ? ' done' : ''}`);
  if (past) row.dataset.pastId=meal.id; else row.dataset.id=meal.id;   // vergangene Gerichte bleiben vom Ziehen ausgeschlossen
  const check = button('', () => toggleMeal(meal.id), 'check'); check.disabled = past;
  if (meal.done) check.append(icon('check'));
  check.setAttribute('aria-label', `${name}: ${meal.done ? 'als nicht gekocht markieren' : 'als gekocht markieren'}`);
  check.setAttribute('aria-pressed', String(Boolean(meal.done)));
  const copy = element('div', undefined, 'meal-copy');
  const listed = Number(meal.listedServings) > 0 ? Number(meal.listedServings) : 0;   // Zutaten schon auf die Einkaufsliste übernommen (siehe weekBasket in plan.js)
  copy.append(recipe ? button(name, () => showRecipe(recipe.id, meal.id), 'link-button') : element('strong', name), element('small', `${format(meal.servings)} Portionen`));
  const changed = recipe && listed ? mealChanges(meal) : null;
  if (listed && recipe) copy.append(element('small', listed + 1e-9 >= meal.servings ? 'Zutaten übernommen' : `Zutaten für ${format(listed)} Portionen übernommen`, 'meal-listed'));
  if (changed) copy.append(element('small', `Rezept seitdem geändert (${changeText(changed)}): Liste prüfen`, 'meal-listed changed'));
  if (past) copy.append(element('small', 'Zum Entfernen die Zeile lange gedrückt halten.', 'past-meal-hint'));
  row.append(check, copy);
  if (!past) row.append(iconButton('edit', `${name} ändern`, () => openMeal({ id: meal.id })), iconButton('trash', `${name} aus dem Plan entfernen`, () => changePlannedMeal(meal,{deletedAt:new Date().toISOString()},null)));
  return row;
}
// Ein Gericht auf einen anderen Tag verschieben (Version 2.51): Gericht lange halten, auf einen anderen Tag ziehen und loslassen. Ist der Tag frei, zieht es dorthin um; sonst fragt das Fenster
// „Tauschen?“ (Ja/Nein): Beide Gerichte tauschen dann die Tage. Es ändert sich nur der Tag: Portionen, „gekocht“ und die Übernahme auf die Einkaufsliste bleiben am Gericht.
const dayCards = () => [...document.querySelectorAll('#plan-days .day[data-day]')];
const dayTarget = {
  show: () => 0,
  at: (x, y, id) => {
    const card = dayCards().find(node => { const box = node.getBoundingClientRect(); return y >= box.top && y <= box.bottom; });
    const own = state.meals.find(row => row.id === id)?.date;
    return card && !card.classList.contains('past') && card.dataset.day !== own ? card.dataset.day : null;
  },
  mark: day => dayCards().forEach(node => node.classList.toggle('drop-target', node.dataset.day === day)),
  hide: () => dayCards().forEach(node => node.classList.remove('drop-target')),
  drop: (id, day) => guard(() => dropMeal(id, day))
};
const mealName = meal => meal.recipeId ? active(state.recipes).find(recipe => recipe.id === meal.recipeId)?.name || 'Gelöschtes Rezept' : meal.title;
let swapPending = null;
function dropMeal(id, day) {
  const meal = active(state.meals).find(row => row.id === id);
  if (!meal || meal.date === day || day < isoDate() || meal.date < isoDate()) return;
  const others = active(state.meals).filter(row => row.date === day && row.id !== id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!others.length) { commit([nextOp('meals', id, { date: day })], `„${mealName(meal)}“ auf ${dayName(day)} verschoben`); return; }
  swapPending = { id, otherId: others[0].id, day, from: meal.date };
  $('#swap-text').textContent = `„${mealName(meal)}“ (${dayName(meal.date)}) und „${mealName(others[0])}“ (${dayName(day)}) tauschen die Tage.${others.length > 1 ? ` Der ${dayName(day)} hat mehrere Gerichte: getauscht wird mit dem ersten.` : ''}`;
  $('#swap-dialog').showModal();
}
$('#swap-yes').addEventListener('click', () => guard(() => {
  const pending = swapPending; swapPending = null; $('#swap-dialog').close();
  const meal = pending && active(state.meals).find(row => row.id === pending.id), other = pending && active(state.meals).find(row => row.id === pending.otherId);
  if (!meal || !other) throw new Error('Eines der Gerichte wurde inzwischen geändert oder gelöscht. Bitte noch einmal versuchen.');
  commit([nextOp('meals', meal.id, { date: other.date }), nextOp('meals', other.id, { date: meal.date })], `„${mealName(meal)}“ und „${mealName(other)}“ getauscht`);
}));
$('#swap-no').addEventListener('click', () => { swapPending = null; $('#swap-dialog').close(); });
$('#swap-dialog').addEventListener('close', () => { swapPending = null; });
dragDelete($('#plan-days'), null, () => {}, '.meal[data-id]', { target: dayTarget, noZone: true });
// Vergangene Gerichte: Halten öffnet ausschließlich die Frage „nicht gekocht“.
// Das anschließende Loslassen darf weder den Rezeptlink noch den Dialog bedienen.
let pastMealPending=null,pastMealHeld=false,pastMealOrigin=null;
document.addEventListener('pointerdown',event=>{
  pastMealHeld=false;stopPastMealHold();
  pastMealOrigin=event.target.closest?.('.day.past .meal')?{x:event.clientX,y:event.clientY}:null;
},true);
document.addEventListener('pointermove',event=>{
  if(pastMealOrigin && Math.hypot(event.clientX-pastMealOrigin.x,event.clientY-pastMealOrigin.y)>10)stopPastMealHold();
},true);
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>{pastMealOrigin=null;stopPastMealHold();},true);
document.addEventListener('keydown',()=>{pastMealHeld=false;},true);
document.addEventListener('click',event=>{
  if(!pastMealHeld)return;
  pastMealHeld=false;event.preventDefault();event.stopImmediatePropagation();
},true);
function askPastMeal(node) {
  const meal=active(state.meals).find(row=>row.id===node.dataset.pastId);
  if(!node.isConnected || !meal || meal.date>=isoDate() || !ready)return;
  pastMealHeld=true;getSelection()?.removeAllRanges();
  pastMealPending={id:meal.id,date:meal.date,signature:JSON.stringify(meal),scope:namespace()};
  $('#past-meal-detail').textContent=`${mealName(meal)} · ${dayName(meal.date)} ${dayMonthLabel(meal.date)}`;
  $('#past-meal-error').hidden=true; $('#past-meal-dialog').showModal();
}
const stopPastMealHold=holdOn($('#plan-days'),'.day.past .meal[data-past-id]',600,node=>guard(()=>{askPastMeal(node);vibrate(15);}));
document.addEventListener('scroll',stopPastMealHold,true);
document.addEventListener('visibilitychange',stopPastMealHold);
window.addEventListener('blur',stopPastMealHold);
$('#plan-days').addEventListener('contextmenu',event=>{if(event.target.closest('.day.past .meal'))event.preventDefault();});
$('#past-meal-yes').addEventListener('click',()=>{
  const pending=pastMealPending;if(!pending)return;
  try {
    if(pending.scope!==namespace())throw new Error('Die Datenverbindung hat sich geändert. Bitte den Dialog schließen und neu beginnen.');
    const meal=active(state.meals).find(row=>row.id===pending.id);
    if(!meal)throw new Error('Dieses Gericht wurde inzwischen entfernt.');
    if(meal.date!==pending.date || meal.date>=isoDate())throw new Error('Der Tag dieses Gerichts hat sich geändert. Bitte den Wochenplan erneut prüfen.');
    if(JSON.stringify(meal)!==pending.signature)throw new Error('Dieses Gericht wurde inzwischen geändert. Bitte den Dialog schließen und den Wochenplan erneut prüfen.');
    commit([nextOp('meals',meal.id,{deletedAt:new Date().toISOString()})],'Gericht aus dem Wochenplan entfernt');
    $('#past-meal-dialog').close();
  } catch(error) { $('#past-meal-error').textContent=error.message;$('#past-meal-error').hidden=false; }
});
$('#past-meal-dialog').addEventListener('close',()=>{pastMealPending=null;});
// „Gekocht“ merkt sich auch am Rezept, wann es zuletzt auf dem Tisch stand.
function toggleMeal(id) {
  const meal = state.meals.find(row => row.id === id && !row.deletedAt);
  if (!meal) return;
  const ops = [nextOp('meals', id, { done: !meal.done })], today = isoDate();
  const recipe = meal.recipeId && active(state.recipes).find(row => row.id === meal.recipeId), day = meal.date < today ? meal.date : today;
  if (!meal.done && recipe && (!recipe.lastCookedAt || recipe.lastCookedAt.slice(0, 10) < day)) ops.push(nextOp('recipes', recipe.id, { lastCookedAt: day }));   // gezählt wurde schon beim Einplanen (2.167)
  commit(ops);
}
let plannedRecipe = null;
function showRecipe(id, mealId) {
  closeRecipeStock();
  const meal=state.meals.find(row=>row.id===mealId&&!row.deletedAt);
  if(!meal||meal.recipeId!==id)throw new Error('Dieses Gericht wurde inzwischen geändert. Bitte den Wochenplan erneut öffnen.');
  plannedRecipe={recipeId:id,mealId,signature:'',servings:meal.servings,scope:namespace()};
  renderPlanRecipe(); $('#plan-recipe-dialog').showModal();
}
function renderPlanRecipe() {
  if(!plannedRecipe)return;
  const meal=state.meals.find(row=>row.id===plannedRecipe.mealId&&!row.deletedAt);
  const recipe=active(state.recipes).find(row=>row.id===plannedRecipe.recipeId);
  const ingredients=active(state.ingredients).filter(row=>row.recipeId===plannedRecipe.recipeId);
  const signature=JSON.stringify([meal,recipe,ingredients,state.pantry,[...pantryKeys(state.pantry)]]);
  if(signature===plannedRecipe.signature)return;
  const dialog=$('#plan-recipe-dialog'),content=$('#plan-recipe-content'),scroll=dialog.scrollTop;
  let servings=meal?.servings;
  if(meal?.servings===plannedRecipe.servings){try{servings=positive(content.querySelector('.stepper input')?.value||servings);}catch{/* unfinished input */}}
  const expanded=content.querySelector('.recipe-details')?.open??true;
  plannedRecipe.signature=signature;plannedRecipe.servings=meal?.servings;
  content.replaceChildren();
  $('#plan-recipe-title').textContent=meal?`${dayName(meal.date)} ${dayMonthLabel(meal.date)}`:'Rezept zum Wochenplan';
  if(plannedRecipe.scope!==namespace()||!meal||meal.recipeId!==plannedRecipe.recipeId||!recipe){content.append(element('p','Das Gericht oder Rezept wurde inzwischen geändert oder entfernt. Bitte den Wochenplan erneut öffnen.','hint'));return;}
  content.append(recipeCard(recipe,ingredients,{isolated:true,expanded,servings,mealId:meal.id}));
  dialog.scrollTop=scroll;hydratePhotos();
}
function openMeal(options = {}) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const form = $('#meal-form'); form.reset();
  const meal = options.id ? state.meals.find(row => row.id === options.id && !row.deletedAt) : null;
  if (options.id && !meal) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  mealBaseline = meal ? clone(meal) : null;
  const recipes = active(state.recipes).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name, 'de'));
  fillRecipePick(recipes);
  form.elements.rowId.value = options.id || '';
  form.elements.date.value = meal?.date || options.date || isoDate(); form.elements.date.min = meal ? '' : isoDate();   // neue Gerichte nur ab heute
  let choice = meal ? (meal.recipeId || '__custom') : options.recipeId || '';
  if (choice && choice !== '__custom' && !recipes.some(recipe => recipe.id === choice)) choice = meal ? '__custom' : '';   // das Rezept gibt es nicht mehr
  setRecipeChoice(choice);
  form.elements.title.value = meal?.title || '';
  form.elements.servings.value = plain(meal?.servings || options.servings || recipes.find(recipe => recipe.id === choice)?.servings || 2);
  syncMealForm(false);
  // Kommt man von einem Tag (＋ am Tag, Bearbeiten), steht der Tag in der Überschrift und lässt sich hier nicht noch einmal wählen. Nur von der Rezeptkarte aus (noch kein Tag) gibt es die Tagesauswahl.
  const fixedDay = Boolean(meal || options.date), day = form.elements.date.value;
  form.querySelector('[data-day]').hidden = fixedDay;
  $('#meal-change-day').hidden = !meal || meal.date < isoDate();
  const title = $('#meal-title'); title.textContent = meal ? 'Gericht ändern' : 'Gericht planen';
  if (fixedDay) title.append(' – ', element('span', `${dayName(day)} ${dayMonthLabel(day)}`));
  $('#meal-dialog').showModal();
  $('#recipe-pick').querySelector('[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' });
}
function recipeStockMissing(recipe,mode='pantry') {
  const index=indexNames(cookableNames(mode));
  return active(state.ingredients).filter(row=>row.recipeId===recipe.id&&required(row)&&availability(row,index)==='missing');
}
const recipeAvailable=(recipe,filter)=>canCookRecipe(active(state.ingredients).filter(row=>row.recipeId===recipe.id),indexNames(cookableNames(filter===WITH_SHOPPING?'shopping':'pantry')));
function weekShoppingNeeds(plan,snapshot=state) {
  const recipes=active(snapshot.recipes),ingredients=active(snapshot.ingredients);
  const reserved=plan.basket.again?[]:aggregateIngredients((plan.coverageMeals||plan.meals).filter(meal=>Number(meal.listedServings)>0).map(meal=>({...meal,servings:Math.min(meal.servings,meal.listedServings)})),recipes,ingredients);
  return shoppingDeficits(aggregateIngredients(plan.basket.use,recipes,ingredients),snapshot.pantry||[],withoutSeparate(snapshot.items,snapshot.stores),reserved);
}
function syncMealForm(changedRecipe) {
  const form = $('#meal-form'), choice = form.elements.recipeId.value;
  form.querySelector('[data-custom]').hidden = choice !== '__custom';
  const recipe = active(state.recipes).find(row => row.id === choice);
  if (changedRecipe && recipe) form.elements.servings.value = plain(recipe.servings);
  $('#meal-save').disabled=!ready || (!recipe && choice!=='__custom');
  $('#meal-save-shopping').disabled = !recipe || !ready || form.elements.date.value < isoDate();
  const hint=$('#meal-save-shopping small');
  hint.hidden=!recipe;
  $('#meal-portions-down').disabled=parseQuantity(form.elements.servings.value)<=1;
  if(recipe){
    const stock=new Set(recipeStockMissing(recipe).map(row=>pantryKey(row.name))).size;
    const servings=parseQuantity(form.elements.servings.value)||recipe.servings;
    const rows=aggregateIngredients([{recipeId:recipe.id,servings}],[recipe],active(state.ingredients)).filter(required);
    const remaining=shoppingDeficits(rows,state.pantry||[],withoutSeparate(state.items,state.stores)).length;
    hint.textContent=`Nur Vorrat: ${stock} ${stock===1?'Produkt fehlt':'Produkte fehlen'} · ${remaining} noch auf den Einkaufszettel`;
  }else hint.textContent='Auf den Einkaufszettel für die gewählten Portionen';
}
function saveMeal(event) {
  event.preventDefault(); guard(() => {
    const alsoAdd=event.submitter?.value==='shopping';
    const form = event.currentTarget, choice = form.elements.recipeId.value, custom = choice === '__custom', title = form.elements.title.value.trim();
    const date = form.elements.date.value;
    if (!validDay(date)) throw new Error('Bitte einen Tag auswählen.');
    if (date < isoDate() && (!mealBaseline || mealBaseline.date !== date)) throw new Error('Vergangene Tage lassen sich nicht mehr planen. Bitte heute oder einen späteren Tag wählen.');
    if (!choice) throw new Error('Bitte ein Rezept wählen oder „Eigenes Gericht“ eintragen.');
    if (custom && !title) throw new Error('Bitte einen Namen für das eigene Gericht eingeben.');
    if(alsoAdd&&custom)throw new Error('Für ein eigenes Gericht ohne Rezept sind keine Zutaten hinterlegt. Bitte nur speichern oder ein Rezept wählen.');
    if (!custom) currentRecipe(choice);
    const id = form.elements.rowId.value || uid();
    const patch = { date, servings: positive(form.elements.servings.value), recipeId: custom ? '' : choice, title: custom ? title : '' };
    if (!mealBaseline) patch.done = false;
    else if (mealBaseline.listedServings && patch.recipeId !== (mealBaseline.recipeId || '')) Object.assign(patch, { listedServings: null, listedAt: null, listedRows: null, listedParts: null, listedUntracked: false });   // ein anderes Rezept: die Übernahme gilt nicht mehr
    const delta = changed(patch, mealBaseline);
    const finish = () => { planWeek = weekStart(date); $('#meal-dialog').close(); renderPlan(); tab('plan'); };
    if (Object.keys(delta).length && mealBaseline) changePlannedMeal(state.meals.find(row=>row.id===id),delta,{...mealBaseline,...patch},finish,alsoAdd);
    else {
      let ops=Object.keys(delta).length?[nextOp('meals',id,delta)]:[],notice='Gericht gespeichert';
      if(alsoAdd)({ops,notice}=withMealShopping(ops,id));
      if(ops.length)commit(ops,notice);else showNotice(notice);
      finish();
    }
  });
}
// Jede Wochenübernahme behält je Gericht die tatsächlich ausgewählten Anteile.
// Die Mengenänderungen bleiben normale additive Operationen; neue manuelle
// Einträge können deshalb auch während einer Korrektur sicher dazukommen.
function prepareWeekParts(plan, selected, storeId, rememberPantry, snapshot = state, unchecked = []) {
  const take=weekTakeId(plan.takeUse||plan.basket.use), ops=[],rename=new Map(appliedAliases().map(alias=>[alias.from,alias.name])); let projected=snapshot;
  const quotas=weekShoppingNeeds(plan,snapshot).filter(row=>selected.some(chosen=>sameIngredient(chosen.name,row.name)&&unitSpec(chosen.unit).group===unitSpec(row.unit).group)).map(row=>({...row,left:row.quantity*unitSpec(row.unit).factor}));
  for(const use of plan.basket.use) {
    const meal=plan.meals.find(row=>row.id===use.id);
    const rows=aggregateIngredients([use],active(snapshot.recipes),active(snapshot.ingredients)).flatMap(row=>{
      const quota=quotas.find(chosen=>sameIngredient(chosen.name,row.name)&&unitSpec(chosen.unit).group===unitSpec(row.unit).group);if(!quota)return [];
      const factor=unitSpec(row.unit).factor,amount=Math.min(row.quantity*factor,quota.left);quota.left-=amount;
      return amount>1e-7?[{...row,quantity:Math.round(amount/factor*1e6)/1e6}]:[];
    });
    const keys=weekRowKeys(rows),inputs=rows.map((row,index)=>({...listRow(row),key:keys[index]}));
    lastTime=Math.max(Date.now(),lastTime+1,Date.parse(projected.updatedAt)+1);
    const result=addToList(reuseProductNames(inputs,projected.items,storeId),storeId,config.actor||'Unbekannt',new Date(lastTime).toISOString(),projected.items.map(item=>rename.has(aliasKey(item.name))?{...item,name:rename.get(aliasKey(item.name))}:item),itemHistory(),`${take}-${shortHash(meal.id)}`);
    for(const op of result.ops)op.patch.planLinked=true;
    projected=merge(projected,result.ops);ops.push(...result.ops);
    const parts=result.ops.filter(op=>!rows.find(row=>row.unit===NO_AMOUNT&&sameIngredient(row.name,op.patch.name||projected.items.find(item=>item.id===op.entityId)?.name||''))).map(op=>{
      const item=projected.items.find(row=>row.id===op.entityId),amount=op.patch.add||op.patch;
      return {itemId:item.id,sourceId:op.id,at:op.at,name:item.name,storeId:item.storeId,quantity:amount.quantity,unit:amount.unit,remaining:amount.quantity};
    });
    ops.push(nextOp('meals',meal.id,{listedServings:meal.servings,listedAt:new Date().toISOString(),listedRows:snapshotRows(active(snapshot.ingredients).filter(row=>row.recipeId===meal.recipeId)),listedUntracked:Boolean(meal.listedUntracked||(meal.listedServings&&!Array.isArray(meal.listedParts))),listedParts:[...(meal.listedParts||[]),...parts]}));
  }
  if(rememberPantry){
    for(const change of pantryChanges(pantryAdditions(unchecked,pantryKeys(snapshot.pantry)),snapshot.pantry||[]))ops.push(nextOp('pantry',change.id,change.patch));
  }
  return ops;
}
function transferWeekParts(plan,selected,storeId,rememberPantry) {
  const unchecked=[...$('#week-ingredients').children].filter(label=>label._row&&!label.querySelector('input').checked).map(label=>label._row.name);
  commit(prepareWeekParts(plan,selected,storeId,rememberPantry,state,unchecked),'Wochenzutaten übernommen');
}
// Plan und Einkauf werden zusammen lokal gespeichert: bei einem Speicherfehler
// bleibt beides unverändert, und ein erneuter Tipp zählt nichts doppelt.
function withMealShopping(ops,mealId) {
  const snapshot=merge(state,ops),meal=active(snapshot.meals).find(row=>row.id===mealId);
  if(meal?.date<isoDate())throw new Error('Für vergangene Tage werden keine Einkaufszutaten hinzugefügt.');
  if(!meal?.recipeId)throw new Error('Dieses Gericht hat kein verfügbares Rezept.');
  if(!active(snapshot.recipes).some(recipe=>recipe.id===meal.recipeId))throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const basket=weekBasket([meal]),rows=aggregateIngredients(basket.use,active(snapshot.recipes),active(snapshot.ingredients));
  const keys=pantryKeys(snapshot.pantry),selected=rows.filter(row=>required(row)&&!inPantry(keys,row));
  if(!basket.use.length)return {ops,notice:'Gericht gespeichert · Zutaten sind bereits auf dem Einkaufszettel berücksichtigt'};

  // Dieselbe Übernahme wie beim normalen Wochen-Einkauf erkennen, auch wenn
  // auf dem zweiten Gerät die ganze Woche gleichzeitig bestätigt wird.
  const days=new Set(weekDays(meal.date)),known=new Set(active(snapshot.recipes).map(row=>row.id));
  const weekMeals=active(snapshot.meals).filter(row=>days.has(row.date)&&row.date>=isoDate()&&known.has(row.recipeId)&&(row.id===meal.id||!row.done));
  const takeUse=weekBasket(weekMeals).use;
  const transfer=prepareWeekParts({meals:[meal],coverageMeals:weekMeals,basket,rows,takeUse},selected,currentStore(defaultStore()),false,snapshot);
  return {ops:[...ops,...transfer],notice:'Gericht gespeichert · Zutaten dem Einkaufszettel hinzugefügt'};
}
let planAdjustment=null;
const adjustmentSignature = id => JSON.stringify([state.meals.find(row=>row.id===id),state.items]);
function changePlannedMeal(meal, patch, next, finish=()=>{}, alsoAdd=false) {
  if(!meal||meal.deletedAt)throw new Error('Dieses Gericht wurde inzwischen entfernt.');
  const reduces=Number(meal.listedServings)>0&&(!next||next.recipeId!==meal.recipeId||next.servings<meal.listedServings);
  if(!reduces){
    // Ohne `next` wird das Gericht entfernt (Papierkorb am Gericht oder im Bearbeiten-Fenster): dann „Gericht entfernt“ statt „gespeichert“.
    const result=alsoAdd?withMealShopping([nextOp('meals',meal.id,patch)],meal.id):{ops:[nextOp('meals',meal.id,patch)],notice:next?'Gericht gespeichert':'Gericht entfernt'};
    commit(result.ops,result.notice);
    // Entfernt (2.147): gleich „Rückgängig“ anbieten; der Einkaufszettel war nicht betroffen.
    if(!next&&!alsoAdd&&patch.deletedAt){const scope=namespace();showNotice(result.notice,()=>undoDelete([meal.id],scope,'meals'),{trash:true});}
    finish();return;
  }
  planAdjustment={mealId:meal.id,patch,next,finish,alsoAdd,scope:namespace()};renderPlanAdjustment();
  $('#plan-adjust-dialog').showModal();
}
function renderPlanAdjustment() {
  const request=planAdjustment,meal=state.meals.find(row=>row.id===request.mealId);
  if(!meal||meal.deletedAt)throw new Error('Dieses Gericht wurde inzwischen entfernt.');
  request.reduction=planReduction(meal,request.next,state.items);request.signature=adjustmentSignature(meal.id);
  const box=$('#plan-adjust-list');box.replaceChildren();const byItem=new Map();
  for(const change of request.reduction.changes){const entry=byItem.get(change.item.id)||{item:change.item,remove:0};entry.remove+=change.remove*unitSpec(change.part.unit).factor/unitSpec(change.item.unit).factor;byItem.set(change.item.id,entry);}
  for(const {item,remove} of byItem.values()){
    const left=Math.max(0,item.quantity-remove);
    box.append(element('li',`${item.name} · ${storeName(item.storeId)}: ${amountText(item)} → ${left>1e-8?amountText({...item,quantity:left}):'entfällt'}`));
  }
  const {legacy,partial,skipped}=request.reduction,noAdded=!legacy&&!partial&&meal.listedParts?.length===0;
  $('#plan-adjust-note').textContent=legacy?'Für diese frühere Übernahme fehlt eine genaue Zuordnung. Die Einkaufsliste bleibt unverändert; bitte die Mengen selbst prüfen.':partial?'Ein Teil stammt aus einer früheren Übernahme ohne genaue Zuordnung. Nur die zugeordneten Anteile werden angepasst; bitte die übrigen Mengen selbst prüfen.':noAdded?'Für dieses Gericht wurden keine zusätzlichen Mengen auf den Einkaufszettel geschrieben.':skipped.length?'Bereits gekaufte, entfernte, verschobene oder manuell neu gesetzte Zutaten bleiben unverändert. Bitte diese Mengen bei Bedarf selbst prüfen.':byItem.size?'Nur die hier aufgeführten, durch dieses Gericht hinzugefügten Mengen werden entfernt.':'Es gibt keine zugehörigen offenen Mengen mehr. Deine Einkaufsliste bleibt unverändert.';
  const removing=!request.next;
  const counts=planRemovalCounts(request.reduction),info=$('#plan-adjust-remaining'),counted=!legacy&&!partial;
  const details=planRemovalDetails(request.reduction,state.items),allRemoved=details.every(row=>row.status==='removed');
  info.hidden=!removing || !counts.total || (!counts.removed && counts.remaining>0) || !counted;
  info.textContent=allRemoved?(counts.remaining?`${counts.removed} von ${counts.total} hinzugefügten Zutaten hast du schon vom Einkaufszettel entfernt.`:'Alle hinzugefügten Zutaten sind schon vom Einkaufszettel entfernt.'):(counts.remaining?`${counts.removed} von ${counts.total} hinzugefügten Zutaten werden nicht mehr angepasst.`:'Diese hinzugefügten Zutaten werden nicht mehr angepasst.');
  const removedList=$('#plan-adjust-removed');removedList.replaceChildren();removedList.hidden=info.hidden||!details.length;
  const detailLabels={removed:'Bereits entfernt',purchased:'Bereits gekauft',moved:'In ein anderes Geschäft verschoben',changed:'Inzwischen geändert'};
  for(const row of details)removedList.append(element('li',allRemoved?row.name:`${row.name} · ${detailLabels[row.status]}`));
  const existing=removing?planExistingDetails(meal,withoutSeparate(state.items,state.stores)):[],context=$('#plan-adjust-existing'),existingList=$('#plan-adjust-existing-list');
  context.hidden=!existing.length;context.open=existing.some(row=>row.status!=='present');
  $('#plan-adjust-existing-title').textContent=`Schon vorher notiert (${existing.length})`;
  const contextLabels={removed:'Inzwischen entfernt',purchased:'Inzwischen gekauft',present:'Weiterhin auf dem Einkaufszettel'};
  existingList.replaceChildren(...existing.map(row=>element('li',`${row.name} · ${contextLabels[row.status]}`)));
  $('#plan-adjust-title').textContent=removing?`Gericht vom ${dayName(meal.date)} entfernen?`:'Einkaufsliste anpassen?';
  $('#plan-adjust-intro').textContent=removing?'Möchtest du die durch dieses Gericht hinzugefügten Mengen vom Einkaufszettel entfernen? Schon vorher notierte Mengen und das gespeicherte Rezept bleiben erhalten.':'Diese Zutaten werden weniger benötigt. Manuelle Zusatzmengen bleiben erhalten.';
  $('#plan-adjust-apply').textContent=removing?(counted&&counts.removed&&counts.remaining?(counts.remaining===1?'Ja, restliche Zutat auch vom Einkaufszettel entfernen':`Ja, restliche ${counts.remaining} Zutaten auch vom Einkaufszettel entfernen`):'Ja, hinzugefügte Mengen entfernen'):byItem.size?'Einkaufsliste anpassen':'Planänderung übernehmen';
  $('#plan-adjust-apply').hidden=removing&&!byItem.size;
  $('#plan-adjust-apply').disabled=removing&&!byItem.size;
  $('#plan-adjust-keep').textContent=removing?(byItem.size?'Nein, nur das Gericht entfernen – Zutaten bleiben auf dem Einkaufszettel':legacy||noAdded||!allRemoved?'Nur das Gericht entfernen – Einkaufsliste unverändert lassen':'Gericht entfernen – Zutaten sind bereits vom Einkaufszettel entfernt'):'Einkaufsliste unverändert lassen';
  $('#plan-adjust-error').hidden=true;
}
function finishPlanAdjustment(adjust) {
  const request=planAdjustment;if(!request)return;
  const error=$('#plan-adjust-error');
  try{
    if(request.scope!==namespace())throw new Error('Die Datenverbindung hat sich geändert. Bitte das Fenster schließen und neu beginnen.');
    if(request.signature!==adjustmentSignature(request.mealId)){renderPlanAdjustment();throw new Error('Der gemeinsame Stand hat sich geändert. Bitte die aktualisierte Vorschau erneut bestätigen.');}
    const patch={...request.patch},ops=[];
    if(adjust){
      for(const {item,part,cut} of request.reduction.changes)ops.push(nextOp('items',item.id,{cutPlan:{...cut,originalQuantity:part.quantity}}));
      if(!request.reduction.legacy){patch.listedServings=request.reduction.target||null;patch.listedParts=request.next?.recipeId===state.meals.find(row=>row.id===request.mealId).recipeId?request.reduction.parts:[];}
    }
    ops.push(nextOp('meals',request.mealId,patch));
    const trimmed=adjust&&request.reduction.changes.length;
    const result=request.alsoAdd?withMealShopping(ops,request.mealId):{ops,notice:!request.next?(trimmed?'Gericht entfernt · Zutaten vom Einkaufszettel genommen':'Gericht entfernt'):trimmed?'Wochenplan und Einkaufsliste angepasst':'Wochenplan geändert'};
    commit(result.ops,result.notice);
    $('#plan-adjust-dialog').close();planAdjustment=null;request.finish();
  }catch(problem){error.textContent=problem.message;error.hidden=false;}
}

function currentRecipe(id) {
  if (!active(state.recipes).some(recipe => recipe.id === id)) throw new Error('Dieses Rezept wurde inzwischen gelöscht. Bitte ein anderes wählen.');
}
// Die Gerichte der Woche mit Rezept und, was davon noch auf die Liste soll (siehe weekBasket in plan.js): schon Übernommenes bleibt draußen, sonst verdoppelten sich die Mengen.
function weekPlan() {
  const form = $('#week-form'), days = weekDays(planWeek), recipes = active(state.recipes), known = new Set(recipes.map(recipe => recipe.id));
  const meals = active(state.meals).filter(meal => days.includes(meal.date) && meal.date>=isoDate() && meal.recipeId && known.has(meal.recipeId) && !(form.elements.skipDone.checked && meal.done))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const basket = {...weekBasket(meals, !form.elements.skipListed.checked),again:!form.elements.skipListed.checked};
  const plan={ meals, basket, rows: aggregateIngredients(basket.use, recipes, active(state.ingredients)), changes: weekChangeLines() };
  plan.deficits=weekShoppingNeeds(plan);return plan;
}
// Der Hinweis über den Zutaten: was schon auf der Liste steht (und bleibt draußen) oder, mit abgewähltem Haken, was doppelt aufgenommen würde.
function weekListedNote(plan) {
  const names = new Map(active(state.recipes).map(recipe => [recipe.id, recipe.name])), again = !$('#week-form').elements.skipListed.checked;
  const label = entry => `${dayName(entry.meal.date)}: ${names.get(entry.meal.recipeId)}`;
  const listed = plan.basket.listed, same = listed.filter(entry => entry.kind !== 'more'), more = listed.filter(entry => entry.kind === 'more');
  const parts = [];
  if (again) {
    if (listed.length) parts.push(`Diese Gerichte werden erneut auf fehlende Mengen geprüft; vorhandene Einkaufsartikel werden angerechnet: ${listed.map(label).join(', ')}.`);
  } else {
    if (same.length) parts.push(`Schon übernommen: ${same.map(label).join(', ')}.`);
    if (more.length) parts.push(`Mehr Portionen seit der Übernahme, nur die zusätzlichen kommen dazu: ${more.map(entry => `${label(entry)} (+${format(entry.extra)})`).join(', ')}.`);
  }
  const note = $('#week-listed'); note.textContent = parts.join(' '); note.hidden = !parts.length; note.classList.remove('warn');
}
// Was am Rezept eines übernommenen Gerichts seit der Übernahme geändert wurde (siehe recipeChanges in plan.js), oder null.
function mealChanges(meal) {
  if (!meal.listedRows || !meal.recipeId) return null;
  const rows = active(state.ingredients).filter(row => row.recipeId === meal.recipeId);
  const changes = recipeChanges(meal.listedRows, rows);
  return changes.any ? changes : null;
}
const amountText = row => `${format(row.quantity)} ${row.unit}`;
const changeText = changes => [...changes.added.map(row => `neu: ${amountText(row)} ${row.name}`), ...changes.removed.map(row => `entfällt: ${row.name}`),
  ...changes.changed.map(entry => `${entry.name}: ${amountText(entry.from)} → ${amountText(entry.to)}`)].join(', ');
// Nur noch geplante, nicht gekochte Gerichte ab heute brauchen einen Hinweis.
// Gelöschte Planeinträge sind bestätigte Entscheidungen, keine offenen Aufgaben.
function weekChangeLines() {
  const days = weekDays(planWeek), recipes = new Map(state.recipes.map(recipe => [recipe.id, recipe])), groups = new Map(), today = isoDate();
  for (const meal of active(state.meals).filter(row => !row.done && row.date >= today && days.includes(row.date) && row.recipeId && Number(row.listedServings) > 0).sort((a, b) => a.date.localeCompare(b.date))) {
    const recipe = recipes.get(meal.recipeId), name = recipe?.name || 'Rezept';
    let note;
    if (!recipe || recipe.deletedAt) note = 'Das Rezept ist nicht mehr verfügbar. Zugehörige Artikel bei Bedarf im Einkaufszettel prüfen.';
    else { const changes = mealChanges(meal); if (changes) note = `Rezept seit der Übernahme geändert (${changeText(changes)}).`; }
    if (!note) continue;
    const key = JSON.stringify([meal.recipeId, note]), entry = groups.get(key) || { name, note, days: new Set() };
    entry.days.add(dayName(meal.date)); groups.set(key, entry);
  }
  return [...groups.values()].map(entry => `${entry.name} · ${[...entry.days].join(', ')}: ${entry.note}`);
}
// Woran man erkennt, dass sich die Vorschau überholt hat: welche Gerichte mit wie vielen Portionen aufgenommen werden und welche Zutaten daraus werden.
const weekSignature = plan => JSON.stringify([plan.basket.use.map(meal => [meal.id, meal.servings]), plan.rows.map(row => [row.name, row.quantity, row.unit]), (plan.deficits||[]).map(row=>[row.name,row.quantity,row.unit]), plan.changes || []]);
// Die Vorschau neu aufbauen, ohne abgewählte Zutaten wieder anzuhaken (Schlüssel: Name und Einheit).
function refreshWeekRows() {
  const unchecked = new Set([...$('#week-ingredients').children].filter(label => label._row && !label.querySelector('input').checked).map(label => `${productKey(label._row.name)}|${label._row.unit}`));
  renderWeekRows();
  for (const label of $('#week-ingredients').children) if (label._row && unchecked.has(`${productKey(label._row.name)}|${label._row.unit}`)) label.querySelector('input').checked = false;
}
function renderWeekRows() {
  const box = $('#week-ingredients'); box.replaceChildren();
  const plan = weekPlan(), rows = plan.rows, keys = pantryKeys(state.pantry), deficits=weekShoppingNeeds(plan);
  $('#week-form')._plan = plan; weekListedNote(plan);
  const lines = plan.changes, changes = $('#week-changes'), changeList = $('#week-change-list');
  changeList.replaceChildren(...lines.map(line => element('li', line))); changes.hidden = !lines.length;
  if (!lines.length) changes.open = false;
  if (!rows.length) {
    const allListed = plan.basket.listed.length > 0 && $('#week-form').elements.skipListed.checked;
    box.append(element('p', allListed ? 'Alles aus dieser Woche ist schon übernommen. Ohne diesen Haken werden die fehlenden Mengen erneut geprüft; vorhandene Einkaufsartikel zählen mit.'
      : 'Keine Zutaten: Plane zuerst Gerichte mit Rezepten ein oder nimm schon gekochte Gerichte hinzu.', 'empty'));
  }
  for (const row of rows) {
    const missing=deficits.find(needed=>sameIngredient(needed.name,row.name)&&unitSpec(needed.unit).group===unitSpec(row.unit).group);
    const label = element('label', undefined, 'transfer-row'), check = element('input'), text = element('span', ingredientLabel(missing||row));
    const stocked = inPantry(keys, row);
    check.type = 'checkbox'; check.checked = required(row) && !stocked && Boolean(missing);
    check.disabled = isCookingWater(row.name);
    label._row = row;
    if (row.sources.length) text.append(element('small', row.sources.join(', '), 'hint'));
    label.append(check, text); if (stocked) label.append(element('small', 'Vorrat', 'pantry-badge'));else if(!missing&&row.unit!==NO_AMOUNT)label.append(element('small','Bereits auf dem Einkaufszettel','pantry-badge'));
    box.append(label);
  }
  if(rows.length&&!deficits.filter(required).length)box.append(element('p','Vorrat und Einkaufszettel decken die Zutaten ab. Es müssen keine weiteren Produkte hinzugefügt werden.','hint'));
  syncWeekSubmit();
}
function syncWeekSubmit(){ $('#week-form button[type=submit]').disabled=!$('#week-ingredients input:checked'); }
$('#week-ingredients').addEventListener('change',syncWeekSubmit);
function openWeekShopping() {
  const form = $('#week-form'); storeOptions(form.elements.storeId, defaultStore(), true);
  $('#week-intro').textContent = `${weekLabel(planWeek)}: Nur heute und künftige Tage: fehlende Zutaten nach Abgleich mit Vorrat und offenen Einkaufsartikeln.`;
  form.elements.rememberPantry.checked = false; form.elements.skipListed.checked = true; $('#week-changes').open = false; renderWeekRows(); $('#week-dialog').showModal();
}

/* ---------- Rezept-Import: Link, Screenshot, Text ---------- */
const IMPORT_LABELS = { link: 'Rezept laden', image: 'Text erkennen', text: 'Text auswerten' };
let stopImportHold = () => {};
function setImportBusy(busy) {
  const form=$('#import-form'),run=$('#import-run');
  stopImportHold();
  for(const field of form.querySelectorAll('input,textarea,[data-source]')) field.disabled=busy;
  // Der Knopf bleibt beim Laden bedienbar; langes Halten bricht den Import ab.
  run.disabled=false;run.type=busy?'button':'submit';
  $('#import-cancel').hidden = !busy;
  run.classList.toggle('is-loading',busy);run.setAttribute('aria-busy',String(busy));
  run.replaceChildren();
  if(busy) run.append(element('span',importSource==='image'?'Text wird erkannt …':'Rezept wird geladen …'),element('small','Zum Abbrechen gedrückt halten'));
  else run.textContent=IMPORT_LABELS[importSource];
}
function cancelImport(quiet = false) {
  if(!importAbort) return;
  const controller=importAbort;importAbort=null;controller.abort();
  setImportBusy(false);
  importStatus(quiet?'':'Laden abgebrochen.');
}
function saveImportPermission() {
  const form=$('#import-form'),allowed=form.elements.publicProxy.checked;
  if(config.publicProxy!==allowed) saveConfig({...config,publicProxy:allowed});
  form.elements.publicProxy.defaultChecked=allowed;
  $('#import-settings-form').elements.publicProxy.defaultChecked=allowed;
  $('#import-settings-form').elements.publicProxy.checked=allowed;
  linkHint();updateSaveButtons();
}
function setImportSource(name) {
  if(importAbort) return;
  importSource = name;
  document.querySelectorAll('#import-form [data-source]').forEach(node => node.setAttribute('aria-selected', String(node.dataset.source === name)));
  document.querySelectorAll('#import-form [data-pane]').forEach(node => { node.hidden = node.dataset.pane !== name; });
  $('#import-run').textContent = IMPORT_LABELS[name];
  importStatus(''); message();
}
function importStatus(text, fraction) {
  $('#import-status').textContent = text;
  $('#import-progress').hidden = fraction === undefined; if (fraction !== undefined) $('#import-progress').value = Math.round(fraction * 100);
}
function linkHint() {
  const form = $('#import-form'), proxy = workerHost(config.importProxy);
  $('#import-form [data-link-hint]').textContent = proxy ? 'Die Seite wird über deinen eigenen Hilfsdienst geladen.' :
    form.elements.publicProxy.checked ? `Nur der Link wird an ${PUBLIC_PROXIES.map(row => row.name).join(' oder ')} gesendet. Falls das nicht klappt: Seite öffnen, Text kopieren und unter „Text“ einfügen.` :
    'Zum Laden braucht die App einen Hilfsdienst. Erlaube die öffentlichen Dienste (es wird nur der Link gesendet) oder richte einen eigenen ein. Text und Screenshot benötigen keinen Hilfsdienst. Bitte das Ergebnis sorgfältig prüfen.';
}
function releasePreviews() { previewUrls.forEach(url => URL.revokeObjectURL(url)); previewUrls = []; }
function openImport(options = {}) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  cancelImport(true);
  const form = $('#import-form'); form.reset(); releasePreviews(); $('#import-previews').replaceChildren();
  form.elements.publicProxy.checked = publicProxyEnabled(config);
  saveImportPermission();
  setImportSource(options.source || 'link'); setImportBusy(false); linkHint();
  if (options.url) form.elements.url.value = options.url;
  $('#import-dialog').showModal();
  if (options.url && (workerHost(config.importProxy) || form.elements.publicProxy.checked)) form.requestSubmit();
}
function showPreviews(files) {
  releasePreviews(); const box = $('#import-previews'); box.replaceChildren();
  for (const file of files) {
    const url = URL.createObjectURL(file), image = element('img'); previewUrls.push(url);
    image.src = url; image.alt = `Ausgewählt: ${file.name}`; box.append(image);
  }
}
async function runImport() {
  if (importAbort) return;
  const form = $('#import-form'), text = form.elements.text.value.trim();
  // Ein eingefügter Link im Textfeld ist ein Link-Import.
  if (importSource === 'text' && /^https?:\/\/\S+$/i.test(text)) { form.elements.url.value = text; setImportSource('link'); }
  message();
  const controller=new AbortController();importAbort=controller;
  const {signal}=controller;
  setImportBusy(true);
  let draft,raw='';
  try {
    if (importSource === 'link') {
      const allowPublic = form.elements.publicProxy.checked;
      saveImportPermission();
      importStatus('Seite wird geladen …', 0.1);
      const link = form.elements.url.value.trim(), { html } = await fetchRecipePage(link, {workerUrl:config.importProxy,allowPublic,
        onAttempt:(attempt,total)=>{if(importAbort===controller&&!signal.aborted)importStatus(`Versuch ${attempt} von ${total} …`,.1+(attempt-1)*.15);},
        validate:page=>{ draft=recipeFromHtml(page,link); if(!draft.name || !draft.ingredients?.length) throw new Error('Keine Rezeptdaten gefunden'); }
      },signal);
      draft ||= recipeFromHtml(html,link);
      if (draft.via === 'text') raw = htmlToText(html).slice(0, 8000);
    } else if (importSource === 'image') {
      const files = [...form.elements.images.files];
      if (!files.length) throw new Error('Bitte zuerst einen Screenshot oder ein Foto wählen.');
      const { recognizeImages } = await import('./ocr.js');
      raw = await recognizeImages(files,(fraction,label)=>{if(importAbort===controller&&!signal.aborted)importStatus(label,fraction);},signal);
      if (!raw) throw new Error('Im Bild wurde kein Text erkannt. Bitte einen schärferen Ausschnitt wählen oder den Text einfügen.');
      draft = parseRecipeText(raw);
    } else {
      if (!text) throw new Error('Bitte zuerst den Rezepttext einfügen.');
      draft = recipeFromAnyText(text);
      if (draft.via === 'text') raw = text;
    }
    if(signal.aborted || importAbort!==controller) return;
  } catch (error) {
    if(importAbort===controller && !signal.aborted && error?.name!=='AbortError') { importStatus('');message(error.message); }
    return;
  } finally {
    if(importAbort===controller) { importAbort=null;setImportBusy(false);importStatus(''); }
  }
  $('#import-dialog').close();
  editRecipe('',{...draft,raw});
}

/* ---------- Anleitung ---------- */
// Die Anleitung ist ein eigenes Fenster in der App (mit Schließen-Knopf), kein Link auf eine Textdatei: Eine Datei in der Home-Bildschirm-App hat keinen Weg zurück.
// Inhalt steht in help.js und wird erst beim ersten Öffnen geladen. `**fett**` und `Code` werden ohne HTML aufgebaut.
function richText(text) {
  const fragment = document.createDocumentFragment();
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith('**')) fragment.append(element('strong', part.slice(2, -2)));
    else if (part.startsWith('`')) fragment.append(element('code', part.slice(1, -1)));
    else fragment.append(part);
  }
  return fragment;
}
let helpBuilt = false;
async function openHelp() {
  if (!helpBuilt) {
    const { HELP } = await import('./help.js'), body = $('#help-body');
    for (const section of HELP) {
      const details = element('details', undefined, 'fold help-section'), summary = element('summary'), inner = element('div', undefined, 'help-text');
      details.open = Boolean(section.open);
      summary.append(element('h3', section.title)); details.append(summary, inner);
      for (const block of section.blocks) {
        if (block.p) { const paragraph = element('p'); paragraph.append(richText(block.p)); inner.append(paragraph); }
        else { const list = element(block.ol ? 'ol' : 'ul'); for (const line of block.ol || block.ul) { const item = element('li'); item.append(richText(line)); list.append(item); } inner.append(list); }
      }
      body.append(details);
    }
    helpBuilt = true;
  }
  $('#help-dialog').showModal();
}
$('#open-help').addEventListener('click', () => guard(openHelp));

/* ---------- Rezepte des Tages ---------- */
// Ohne Einstellung kommen jeden Tag drei Rezepte aus der eingebauten Sammlung (rezepte-des-tages.json, kein Hilfsdienst nötig), danach neu zusammengestellte (recipe-maker.js).
// Mit einem Link in den Optionen wird stattdessen diese Seite einmal am Tag geladen (braucht den Hilfsdienst) und die ersten zehn
// noch nicht entschiedenen Rezepte kommen einzeln zum Durchklicken. Gemerkt wird nur auf diesem Gerät: heutige Auswahl, Stand und alles Entschiedene.
const dailyStore = () => `einkauf-daily:${namespace()}`;
let daily = null, dailyTicket = 0, dailyTried = '', builtinCollection = null, dailyScope = '', dailyReview = null, dailyLoading = null, pendingDailyRemoval = null;
const dailyDrafts = new Map(), dailyDraftJobs = new Map();
const dailySource = () => webUrl(config.dailySource);
const dailySourceKey = () => dailySource() || BUILTIN_SOURCE;
function loadDaily() {
  if (dailyScope !== namespace()) { if (dailyScope && $('#daily-dialog').open) $('#daily-dialog').close(); dailyScope = namespace(); daily = null; dailyReview = null; dailyDrafts.clear(); dailyDraftJobs.clear(); dailyTried = ''; dailyTicket++; }
  if (daily) return daily;
  try { const saved = JSON.parse(localStorage.getItem(dailyStore())); if (saved && typeof saved === 'object' && Array.isArray(saved.queue)) daily = saved; } catch { /* neu anlegen */ }
  daily ||= { day: '', source: '', queue: [], index: 0, outcome: {}, decided: [] };
  daily.decided ||= []; daily.outcome ||= {}; daily.index ||= 0;
  return daily;
}
function saveDaily() { daily.history = dailyHistory(daily, localDay()); try { localStorage.setItem(dailyStore(), JSON.stringify({ ...daily, decided: daily.decided.slice(-600) })); } catch { /* nur ein Merkzettel */ } }
// Schlüssel der eigenen Rezepte: Quelle (Link) und Name, damit dasselbe Rezept nicht noch einmal vorgeschlagen wird.
const knownRecipeKeys = () => new Set(active(state.recipes).flatMap(row => [row.name ? builtinKey(row.name) : '', row.sourceUrl ? recipeKey(row.sourceUrl) : '']).filter(Boolean));
// Wie viele sind heute noch offen? null = heute noch nicht geladen.
// Ein heute geladener, aber leerer Stand der Sammlung (aus der Zeit vor den neuen Rezepten) gilt als veraltet und wird neu geplant.
const dailyFresh = d => d.day === localDay() && d.source === dailySourceKey() && !(d.builtin && !d.queue.length);
const dailyLeft = () => { const d = loadDaily(); return dailyFresh(d) ? d.queue.filter(item=>!d.outcome[item.key]).length : null; };
function renderDailyButton() {
  const left = dailyLeft();
  $('#daily-label').textContent = left === null ? 'Rezepte des Tages' : left === 0 ? 'Rezepte des Tages: alles gesehen' : `Rezepte des Tages · ${left} offen`;
}
async function loadBuiltin() {
  if (!builtinCollection) {
    const response = await fetch('./rezepte-des-tages.json');
    if (!response.ok) throw new Error('Die eingebauten Rezepte konnten nicht geladen werden. Bitte die App aktualisieren.');
    const list = await response.json();
    builtinCollection = Array.isArray(list) ? list.filter(validBuiltin) : [];
  }
  return builtinCollection;
}
function dailyContext() { return JSON.stringify([namespace(), localDay(), dailySourceKey()]); }
async function loadDailyList(signal) {
  const old = loadDaily(); if (dailyFresh(old)) return old;
  const context = dailyContext(); if (dailyLoading?.context === context) return dailyLoading.promise;
  const task = { context, promise: null };
  task.promise = (async () => {
    const source = dailySource(), key = dailySourceKey(); let queue, found, builtin = !source;
    if (!source) {
      const collection = await loadBuiltin(), known = knownRecipeKeys(); found = collection.length;
      queue = planBuiltin(collection, localDay(), new Set(old.decided), known);
      if (queue.length < BUILTIN_PER_DAY) queue.push(...(await import('./recipe-maker.js')).planGenerated(localDay(), known, queue.length));
    } else {
      const { html } = await fetchRecipePage(source, { workerUrl: config.importProxy, allowPublic: publicProxyEnabled(config) }, signal);
      const links = extractRecipeLinks(html, source); found = links.length;
      queue = planDay(links, new Set(old.decided), knownRecipeKeys(), DAILY_MAX);
    }
    if (dailyContext() !== context) throw new Error('Die Auswahl hat sich geändert. Bitte die Tagesrezepte erneut öffnen.');
    daily = { day: localDay(), source: key, queue, index: 0, outcome: {}, decided: old.decided, drafts: {}, history: dailyHistory(old, localDay()), found, builtin };
    saveDaily(); return daily;
  })();
  dailyLoading = task; try { return await task.promise; } finally { if (dailyLoading === task) dailyLoading = null; }
}
// Pro Tag einmal still vorladen, sobald man den Rezepte-Bereich öffnet, damit die Zahl der offenen Rezepte schon dasteht.
function prefetchDaily() {
  if (!ready || dailyLeft() !== null || dailyTried === localDay()) return;
  dailyTried = localDay();
  loadDailyList().then(renderDailyButton).catch(() => { /* erst beim Öffnen melden */ });
}
const dailyCacheKey = (item, record) => JSON.stringify([record.day, record.source, item.key]);
const shownDaily = () => dailyReview?.record || loadDaily();
function dailySavedRecipe(item, draft) {
  const recipes=active(state.recipes),source=draft?.sourceUrl||item.url;
  return (source&&recipes.find(row=>row.sourceUrl&&recipeKey(row.sourceUrl)===recipeKey(source)))
    ||recipes.find(row=>row.sourceUrl&&recipeKey(row.sourceUrl)===item.key)
    ||recipes.find(row=>row.name&&[item.key,builtinKey(draft?.name||item.title)].includes(builtinKey(row.name)));
}
const dailyKnown=(item,draft)=>Boolean(dailySavedRecipe(item,draft));
async function dailyDraft(item, record = shownDaily()) {
  const cache = dailyCacheKey(item, record);
  if (dailyDrafts.has(cache)) return dailyDrafts.get(cache);
  if (dailyDraftJobs.has(cache)) return dailyDraftJobs.get(cache);
  const job = fetchDailyDraft(item, record); dailyDraftJobs.set(cache, job);
  try { return await job; } finally { if (dailyDraftJobs.get(cache) === job) dailyDraftJobs.delete(cache); }
}
async function fetchDailyDraft(item, record) {
  const scope = namespace(), cache = dailyCacheKey(item, record);
  if (dailyDrafts.has(cache)) return dailyDrafts.get(cache);
  let draft = record.drafts?.[item.key];
  if (!draft) {
    if (item.gen !== undefined) draft = draftFromBuiltin((await import('./recipe-maker.js')).makeRecipe(item.gen));
    else if (item.builtin) {
      const entry = (await loadBuiltin()).find(candidate => candidate.n === item.builtin);
      if (!entry) throw new Error('Dieses Rezept gibt es in der Sammlung nicht mehr.');
      draft = draftFromBuiltin(entry);
    } else {
      const { html } = await fetchRecipePage(item.url, { workerUrl: config.importProxy, allowPublic: publicProxyEnabled(config) });
      draft = recipeFromHtml(html, item.url);
    }
  }
  if (scope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte erneut öffnen.');
  draft = dailySnapshot(draft); dailyDrafts.set(cache, draft);
  record.drafts ||= {}; record.drafts[item.key] = draft;
  const current = loadDaily();
  if (current.day === record.day && current.source === record.source) { current.drafts ||= {}; current.drafts[item.key] = draft; }
  else current.history = [...dailyHistory(current, localDay()).filter(row => row.day !== record.day), dailyRecord(record)];
  saveDaily(); return draft;
}
function dailyReviewChoices() {
  const records = dailyHistory(loadDaily(), localDay()).filter(row=>row.queue.length);
  $('#daily-review-choices').hidden = false;
  $('#daily-review-open').disabled = !records.length;
  $('#daily-review-unavailable').hidden = Boolean(records.length);
}
function dailyDayTitle(day){
  if(day===localDay())return 'Heute';if(day===addDays(localDay(),-1))return 'Gestern';
  return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${day}T12:00:00`));
}
function renderDailyDays(day=localDay()){
  const records=dailyHistory(loadDaily(),localDay());$('#daily-days').hidden=false;
  $('#daily-day-label').textContent=day===localDay()||day===addDays(localDay(),-1)?`${dailyDayTitle(day)} · ${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(new Date(`${day}T12:00:00`))}`:dailyDayTitle(day);
  $('#daily-day-prev').disabled=!records.some(row=>row.day<day&&row.queue.length);
  $('#daily-day-next').disabled=day>=localDay();
}
/* Beim letzten Rezept (2.152) wird „Weiter“ an derselben Stelle zu einem aktiven „✓ Fertig“, das die Rezepte des Tages schließt:
   kein grauer Knopf ohne Funktion, der Daumen bleibt, wo er ist. Wer schnell durchtippt, schließt nicht aus Versehen (kurze Sperre). */
const DAILY_DONE_GUARD = 450;
function dailyRecipeNavigation(record,index,review=false){
  $('#daily-review-nav').hidden=!review&&!record.queue.length;
  $('#daily-review-prev').disabled=index<=0;
  const next=$('#daily-review-next'),last=index>=record.queue.length-1,was=next.dataset.done==='true';
  next.disabled=false;next.dataset.done=String(last);next.classList.toggle('daily-done',last);
  if(last!==was||!next.querySelector('span'))next.replaceChildren(...(last?[icon('check'),element('span','Fertig')]:[element('span','Weiter'),icon('right')]));
  next.setAttribute('aria-label',last?'Fertig – Rezepte des Tages schließen':'Nächstes Rezept');
  if(last)next.title='Rezepte des Tages schließen';else next.removeAttribute('title');
  if(last&&!was)next.dataset.doneSince=String(Date.now());
}
function rememberDailyView(review){
  const record=review.record,current=loadDaily(),item=record.queue[review.index];
  if(!item||record.day!==localDay()||current.day!==record.day||current.source!==record.source)return;
  current.outcome[item.key]||='seen';
  if(item.gen===undefined&&!current.decided.includes(item.key))current.decided.push(item.key);
  while(current.index<current.queue.length&&current.outcome[current.queue[current.index].key])current.index++;
  record.outcome={...current.outcome};record.index=current.index;saveDaily();renderDailyButton();
}
async function showDailyReview() {
  const review = dailyReview, record = review?.record;
  if (!review || review.scope !== namespace() || record.day>localDay()) { dailyReview = null; return showDaily(); }
  const ticket = ++dailyTicket, item = record.queue[review.index];setDailyNote();dailyButtons();$('#daily-content').scrollTop=0;
  renderDailyDays(record.day);
  $('#daily-review-choices').hidden = true;dailyRecipeNavigation(record,review.index,true);
  $('#daily-progress').textContent = `${dailyDayTitle(record.day)}${record.day<localDay()||record.index>=record.queue.length?' erneut':''}${item?` · Rezept ${review.index + 1} von ${record.queue.length}`:''}`;
  if(!item){$('#daily-card').replaceChildren(element('h3','Keine gespeicherte Auswahl'),element('p','Für diesen Tag sind auf diesem Gerät keine Tagesrezepte gespeichert. Mit den Tagespfeilen kannst du weiterblättern.'));return;}
  $('#daily-card').replaceChildren(element('h3', item.title), element('p', 'Rezept wird geladen …', 'hint'));
  try {
    const draft = await dailyDraft(item, record); if (ticket !== dailyTicket) return;
    fillDailyCard(draft, item, true);rememberDailyView(review);refreshDailyActions();
  } catch (error) { if (ticket !== dailyTicket) return;setDailyNote(error.message);dailyButtons({ retry: true }); }
}
function openDailyReview(day,index=0) {
  if(day>localDay())return;
  const record = dailyHistory(loadDaily(), localDay()).find(row => row.day === day);
  if(day===localDay()&&!record?.queue.length){dailyReview=null;return showDaily();}
  dailyReview = { record:record||{day,queue:[],drafts:{},outcome:{}}, index:Math.max(0,Math.min(index,(record?.queue.length||1)-1)), scope: namespace() }; return showDailyReview();
}
function dailyButtons({ add = false, remove = false, retry = false } = {}) {
  $('#daily-add').hidden = !add; $('#daily-remove').hidden = !remove; $('#daily-retry').hidden = !retry;
  $('#daily-add').disabled = false;
  syncDailyFooter();
}
function syncDailyFooter(){
  const note=$('#daily-note');note.hidden=!note.textContent.trim();
  $('#daily-footer').hidden=note.hidden&&['daily-add','daily-remove','daily-retry'].every(id=>$('#'+id).hidden);
}
function setDailyNote(text=''){$('#daily-note').textContent=text;syncDailyFooter();}
function refreshDailyActions(){
  if(!$('#daily-dialog').open)return;
  loadDaily();if(!$('#daily-dialog').open)return;
  const record=shownDaily(),item=record.queue[dailyReview?dailyReview.index:record.index],draft=item&&dailyDrafts.get(dailyCacheKey(item,record));
  if(!draft||!$('#daily-card .daily-ingredients'))return;
  const known=dailyKnown(item,draft);dailyButtons({add:!known,remove:known});$('#daily-add').disabled=!draft.ingredients.length;
  setDailyNote();
}
function fillDailyCard(draft, item, full = false) {
  const card = $('#daily-card'); card.replaceChildren();
  card.append(element('h3', draft.name || item.title));
  const time = /Gesamtzeit:\s*([^\n]+)/.exec(draft.instructions || '')?.[1];
  const facts = [time, draft.servings ? `${format(draft.servings)} Portionen` : '', draft.ingredients.length ? `${draft.ingredients.length} ${draft.ingredients.length===1?'Zutat':'Zutaten'}` : ''].filter(Boolean);
  if (facts.length) card.append(element('p', facts.join(' · '), 'daily-facts'));
  if (draft.via === 'text') card.append(element('p', 'Keine strukturierten Rezeptdaten: Zutaten und Schritte sind geschätzt.', 'warn'));
  if (draft.ingredients.length) {
    const list = element('ul', undefined, 'daily-ingredients');
    for (const row of draft.ingredients.slice(0, full ? undefined : 8)) list.append(element('li', ingredientLabel(row)));
    if (!full && draft.ingredients.length > 8) list.append(element('li', `… und ${draft.ingredients.length - 8} weitere`, 'more'));
    card.append(list);
  } else card.append(element('p', 'Es wurden keine Zutaten erkannt. Dieses Rezept lässt sich über „Import“ von Hand übernehmen.', 'warn'));
  const steps = (draft.instructions || '').replace(/Gesamtzeit:[^\n]*\n*/, '').replace(/\n{2,}/g, '\n').trim();
  if (steps) card.append(element('p', !full && steps.length > 260 ? `${steps.slice(0, 260).trim()} …` : steps, 'daily-steps'));
  if (item.url) {
    const link = element('a', `Auf ${hostLabel(item.url)} ansehen`, 'daily-link'); externalLink(link, item.url);
    card.append(link);
  } else card.append(element('p', item.gen === undefined ? 'Aus der eingebauten Sammlung' : 'Neu zusammengestellt. Gespeichert wird nur, was du hinzufügst.', 'hint'));
}
async function showDaily() {
  loadDaily(); if (dailyReview) return showDailyReview();
  renderDailyDays();
  $('#daily-review-choices').hidden = true; $('#daily-review-nav').hidden = true;
  const ticket = ++dailyTicket, card = $('#daily-card'), progress = $('#daily-progress');
  setDailyNote();dailyButtons();$('#daily-content').scrollTop=0;
  $('#daily-add').disabled = true;
  try {
    card.replaceChildren(element('p', 'Rezepte werden geladen …', 'hint')); progress.textContent = '';
    const d = await loadDailyList();
    if (ticket !== dailyTicket) return;
    // Was inzwischen schon in den eigenen Rezepten steht (z. B. per Import), wird nicht noch einmal vorgeschlagen.
    const known = knownRecipeKeys();
    while (d.index < d.queue.length && known.has(d.queue[d.index].key)) { d.outcome[d.queue[d.index].key] = 'known'; d.index += 1; }
    saveDaily(); renderDailyButton();renderDailyDays();
    if (!d.queue.length) {
      card.replaceChildren(element('p', d.builtin ? 'Heute gibt es keine neuen Vorschläge. Morgen geht es weiter.' : d.found ? 'Alle Rezepte dieser Seite hast du schon gesehen oder in deinen Rezepten. Morgen gibt es neue.' : 'Auf der Seite wurden keine Rezept-Links gefunden. Prüfe den Link in den Optionen. Seiten, die ihre Rezepte erst per JavaScript nachladen, kann die App nicht lesen.'));
      dailyButtons(); dailyReviewChoices(); return;
    }
    if (d.index >= d.queue.length) {
      const added = Object.values(d.outcome).filter(value => value === 'added').length;
      progress.textContent = '';
      card.replaceChildren(element('h3', 'Für heute geschafft'), element('p', `${added} von ${d.queue.length} Rezepten hinzugefügt. Alle Vorschläge angesehen. Morgen gibt es neue Vorschläge.`));
      dailyButtons(); dailyReviewChoices(); return;
    }
    const item = d.queue[d.index];
    const review={record:d,index:d.index,scope:namespace(),fromQueue:true};dailyReview=review;
    dailyRecipeNavigation(d,review.index);
    progress.textContent = `Rezept ${review.index + 1} von ${d.queue.length}`;
    card.replaceChildren(element('h3', item.title), element('p', 'Rezept wird geladen …', 'hint'));
    const draft = await dailyDraft(item, d);
    if (ticket !== dailyTicket) return;
    fillDailyCard(draft, item,true);rememberDailyView(review);
    refreshDailyActions();
    const next = d.queue[review.index + 1];
    if (next) dailyDraft(next, d).catch(() => { /* beim Anzeigen erneut versuchen */ });
  } catch (error) {
    if (ticket !== dailyTicket || error?.name === 'AbortError') return;
    setDailyNote(error.message);
    const d = loadDaily(), item = d.queue[d.index];
    if (item && d.day === localDay()) { card.replaceChildren(element('h3', item.title)); dailyButtons({ retry: true }); }
    else { card.replaceChildren(); dailyButtons({ retry: true }); }
  }
}
function addDailyRecipe() {
  const d = shownDaily(), item = d.queue[dailyReview ? dailyReview.index : d.index], draft = item && dailyDrafts.get(dailyCacheKey(item, d));
  if (!draft?.ingredients.length) return false;
  if (dailyKnown(item, draft)) return false;
  const id = uid(), name = (draft.name || item.title).trim().slice(0, 120);
  let tags;
  try{tags=checkedRecipeGroups(draft.tags);}catch(error){
    $('#daily-dialog').close();editRecipe('',{...draft,warnings:[...(draft.warnings||[]),error.message]});recipeTagPicker.open();return null;
  }
  const patch = { name, servings: positive(draft.servings || 2), instructions: draft.instructions || '', tags };
  if (draft.sourceUrl || item.url) patch.sourceUrl = draft.sourceUrl || item.url;
  const ops = [nextOp('recipes', id, patch), ...draft.ingredients.map(row => nextOp('ingredients', uid(), { recipeId: id, name: row.name.slice(0, 120), quantity: row.quantity, unit: String(row.unit).slice(0, 30) }))];
  commit(ops, `„${name}“ zu deinen Rezepten hinzugefügt`); return true;
}
$('#daily-open').addEventListener('click', () => guard(() => {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  loadDaily(); dailyReview = null; $('#daily-dialog').showModal(); showDaily();
  $('#daily-title').focus({ preventScroll: true });   // nicht das ×: Safari zeichnet sonst um den Schließen-Knopf einen Fokusring (2.162)
}));
function confirmDailyRecipe() {
  const added=addDailyRecipe();if(added===null)return;
  if (added) {
    const record=dailyReview.record;setDailyOutcome(record,record.queue[dailyReview.index].key,'added');
  }
  if(dailyReview?.fromQueue){dailyReview=null;return showDaily();}
  refreshDailyActions();
}
function setDailyOutcome(record,key,outcome){
  const current=loadDaily();record.outcome[key]=outcome;
  if(current.day===record.day&&current.source===record.source)current.outcome[key]=outcome;
  else current.history=[...dailyHistory(current,localDay()).filter(row=>row.day!==record.day),dailyRecord(record)];
  saveDaily();
}
function openDailyRemoval(){
  const record=shownDaily(),item=record.queue[dailyReview?dailyReview.index:record.index],draft=item&&dailyDrafts.get(dailyCacheKey(item,record)),recipe=item&&dailySavedRecipe(item,draft);
  if(!recipe){refreshDailyActions();return;}
  pendingDailyRemoval={id:recipe.id,scope:namespace(),record,key:item.key};
  $('#daily-remove-text').textContent=`Möchtest du „${recipe.name}“ aus deinen Rezepten entfernen? Du kannst es hier später erneut hinzufügen.`;
  $('#daily-remove-dialog').showModal();
}
function confirmDailyRemoval(){
  const pending=pendingDailyRemoval;if(!pending)return;
  pendingDailyRemoval=null;$('#daily-remove-dialog').close();
  if(pending.scope!==namespace())return;
  removeSavedRecipe(pending.id);setDailyOutcome(pending.record,pending.key,'seen');refreshDailyActions();
  if(!$('#daily-add').hidden)$('#daily-add').focus({preventScroll:true});
}
$('#daily-add').addEventListener('click', () => guard(confirmDailyRecipe));
$('#daily-remove').addEventListener('click',()=>guard(openDailyRemoval));
$('#daily-remove-confirm').addEventListener('click',()=>guard(confirmDailyRemoval));
$('#daily-remove-dialog').addEventListener('close',()=>{pendingDailyRemoval=null;});
$('#daily-retry').addEventListener('click', () => guard(() => showDaily()));
$('#daily-dialog').addEventListener('close', () => { dailyTicket += 1; dailyReview = null; if($('#daily-remove-dialog').open)$('#daily-remove-dialog').close();pendingDailyRemoval=null; });
$('#daily-review-open').addEventListener('click', () => guard(() => {
  const record=dailyHistory(loadDaily(),localDay()).filter(row=>row.queue.length).at(-1);
  if(record)return openDailyReview(record.day);
}));
$('#daily-day-prev').addEventListener('click',()=>guard(()=>{if(!$('#daily-day-prev').disabled)return openDailyReview(addDays(dailyReview?.record.day||localDay(),-1));}));
$('#daily-day-next').addEventListener('click',()=>guard(()=>{if(!$('#daily-day-next').disabled)return openDailyReview(addDays(dailyReview?.record.day||localDay(),1));}));
function moveDailyRecipe(delta){
  const record=shownDaily(),index=(dailyReview?dailyReview.index:record.index)+delta;
  if(index<0||index>=record.queue.length)return;
  if(dailyReview){dailyReview.index=index;return showDailyReview();}
  return openDailyReview(localDay(),index);
}
$('#daily-review-prev').addEventListener('click',()=>guard(()=>moveDailyRecipe(-1)));
$('#daily-review-next').addEventListener('click',()=>guard(()=>{
  const next=$('#daily-review-next');
  if(next.dataset.done!=='true')return moveDailyRecipe(1);
  if(Date.now()-Number(next.dataset.doneSince||0)<DAILY_DONE_GUARD)return;   // ein Doppeltipp auf „Weiter“ schließt nicht gleich mit
  $('#daily-dialog').close();
}));
// Zusätzlich zu den Pfeilen: nach links wischen zeigt das nächste, nach rechts das vorherige Rezept des Tages.
(()=>{
  const area=$('#daily-content');let start=null;
  area.addEventListener('pointerdown',event=>{start=event.pointerType==='mouse'?null:{x:event.clientX,y:event.clientY,at:Date.now(),id:event.pointerId};},{passive:true});
  area.addEventListener('pointercancel',()=>{start=null;});
  area.addEventListener('pointerup',event=>{
    if(!start||start.id!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y,quick=Date.now()-start.at<800;start=null;
    if(!quick||Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return;
    const target=$(dx<0?'#daily-review-next':'#daily-review-prev');
    if(target.dataset.done==='true')return;   // Wischen blättert nur; geschlossen wird bewusst mit „Fertig“ oder ×
    if(!target.disabled&&!target.hidden&&!target.closest('[hidden]'))target.click();
  });
})();

/* ---------- Was kann ich kochen? ---------- */
const cookableMode = () => config.cookableMode === 'shopping' ? 'shopping' : 'pantry';
function cookableNames(mode = cookableMode()) {
  const stores=orderedStores(state.stores),live=new Set(stores.map(store=>store.id));
  return namesFrom({pantry:state.pantry||[],items:withoutSeparate(state.items.filter(item=>!item.storeId||live.has(item.storeId)),stores),mode});
}
function cookableMissing(rows) {
  const index=indexNames(cookableNames('shopping'));
  return rows.filter(row=>availability(row,index)==='missing');
}
function renderCookable() {
  const recipes = active(state.recipes), ingredients = active(state.ingredients), mode=cookableMode(), names=cookableNames(mode);
  for(const button of document.querySelectorAll('[data-cookable-mode]'))button.setAttribute('aria-pressed',String(button.dataset.cookableMode===mode));
  $('#cookable-explanation').textContent='„Da“ heißt: steht im aktuellen Vorrat. '+(mode==='shopping'?'„Kommt noch“ heißt: steht offen auf der Einkaufsliste. ':'')+'Aufgebrauchter Vorrat zählt nicht. Geprüft wird nur, ob eine Zutat da ist, nicht die Menge. Salz, Pfeffer, Zutaten „nach Bedarf“ und Wasser zählen nicht mit.';
  const ranked = rankRecipes(recipes, recipe => ingredients.filter(row => row.recipeId === recipe.id), names);
  const ready = ranked.filter(entry => entry.tier === 0).length, soon = ranked.filter(entry => entry.tier === 1).length;
  $('#cookable-count').textContent = !recipes.length ? 'Noch kein Rezept.' : !ranked.length ? mode==='shopping'?'Noch passt kein Rezept zu euren Vorräten und der Einkaufsliste.':'Noch passt kein Rezept zu eurem aktuellen Vorrat.' :
    [ready && `${ready} ${ready === 1 ? 'Rezept' : 'Rezepte'} könnt ihr sofort kochen`, soon && `${soon} nach dem Einkauf`].filter(Boolean).join(' · ') || (ranked.length === 1 ? '1 Vorschlag, bei dem nur wenig fehlt' : `${ranked.length} Vorschläge, bei denen nur wenig fehlt`);
  const box = $('#cookable-list'); box.replaceChildren();
  if (recipes.length && !ranked.length) box.append(element('p', 'Pflegt unter Einkauf → Vorrat, was ihr aktuell zu Hause habt. Dann erscheinen hier passende Rezepte.', 'empty'));
  const line = (label, list) => { const item = element('li'); item.append(element('strong', `${label}: `), document.createTextNode(list.join(', '))); return item; };
  const later = action => () => { $('#cookable-dialog').close(); action(); };
  for (const entry of ranked) {
    const { recipe } = entry, card = element('article', undefined, 'card cookable-card'), lines = element('ul', undefined, 'cookable-lines'), servings = recipe.servings;
    card.append(element('h3', recipe.name), element('p', entry.tier === 0 ? 'Alles da' : entry.tier === 1 ? `Alles da, sobald ihr einkauft (${entry.soon.length} von der Liste)` :
      `${entry.missing.length === 1 ? 'Es fehlt' : 'Es fehlen'} ${entry.missing.length} von ${entry.total} Zutaten`, `cookable-status tier${entry.tier}`));
    if (entry.have.length) lines.append(line('Da', entry.have));
    if (entry.soon.length) lines.append(line('Kommt noch', entry.soon));
    if (entry.missing.length) lines.append(line('Fehlt', entry.missing.map(row => row.name)));
    card.append(lines);
    const actions = element('div', undefined, 'actions');
    const cook = button('', later(() => openCook(recipe.id, servings)), 'secondary cookable-action');
    cook.append(icon('pot'), element('span', 'Kochen'));
    const plan = button('', later(() => openMeal({ recipeId: recipe.id, servings })), 'secondary cookable-action');
    plan.setAttribute('aria-label', `${recipe.name} im Wochenplan einplanen`);
    plan.append(icon('calendar'), element('span', 'Einplanen'));
    actions.append(cook, plan);
    if (entry.missing.length) {
      const buy = button('', later(() => {
      const missing=cookableMissing(entry.missing);
      if(!missing.length){showNotice('Die fehlenden Zutaten stehen bereits offen auf der Einkaufsliste.');return;}
      openTransfer(recipe.id,servings,new Set(missing.map(row=>row.id)));
      }), 'primary-action cookable-action cookable-buy');
      buy.append(icon('cart'), element('span', 'Fehlendes auf die Liste')); actions.append(buy);
    }
    card.append(actions); box.append(card);
  }
}
for(const button of document.querySelectorAll('[data-cookable-mode]'))button.addEventListener('click',()=>guard(()=>{saveConfig({...config,cookableMode:button.dataset.cookableMode});renderCookable();}));
$('#cookable-open').addEventListener('click', () => guard(() => {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  renderCookable(); $('#cookable-dialog').showModal();
}));

/* ---------- GitHub ---------- */
// Lesen und Schreiben der Datendatei: github.js. Hier nur die Verbindung dieses Geräts.
const api = (method, body, etag = '') => contentsRequest(config, method, body, etag);
let retryAt = 0, compactRequested = false, lastSyncAt = 0;   // lastSyncAt: letzter geglückter Abgleich (die Foto-Bereinigung verlangt einen frischen)
async function sync(manual = false) {
  if (!connected()) { restingStatus(); return; }
  if (restoring || busy || (!manual && Date.now() < retryAt)) return;
  busy = true; $('#refresh').disabled = true;
  if (pending.length || manual || !ready) status('Gleiche ab …', 'busy');
  try {
    if (queued(queueKey()).length) await uploadPhotos(manual);
    for (let attempt = 0; attempt < 4; attempt++) {
      // Ohne eigene Änderungen genügt die Frage „hat sich etwas geändert?“ (HTTP 304).
      const file = await api('GET', undefined, !pending.length && !manual && ready && attempt === 0 ? remoteEtag : '');
      if (!file) { retryAt = 0; lastSyncAt = Date.now(); rememberSyncTime(); message(); if (networkDown) { networkDown = false; renderConnectionBand('online'); } renderConnectionBand('synced'); restingStatus(); hydratePhotos(); return; }
      const remote = decodeFile(file);
      // Eine Änderung, die sich mit dem neuen gemeinsamen Stand nicht vereinbaren lässt, wird beiseitegelegt statt den Abgleich zu blockieren.
      const split = applicableOps(remote, pending.slice());
      if (split.bad.length) quarantine(split.bad);
      const batch = split.good, setAside = split.bad.map(entry => entry.op.id);
      let merged = split.state, tidy = null;
      const groupOps=productGroupMigration(merged);
      if(groupOps.length) merged=merge(merged,groupOps);
      // Haben zwei Geräte gleichzeitig denselben Artikel neu angelegt, wird das Doppel hier deterministisch zusammengeführt (siehe data.js).
      const folds = duplicateFolds(merged.items);
      if (folds.length) merged = merge(merged, folds);
      // Aufräumen auf dem gerade gelesenen gemeinsamen Stand: automatisch ab 250 KB, nach „Papierkorb leeren“ oder auf Wunsch. Es darf den Abgleich nie verhindern.
      if (compactRequested || due(merged) || purgeDue(merged)) {
        try { tidy = compact(merged); if (tidy.changed) merged = tidy.data; } catch { tidy = null; }
      }
      // Schon bestätigte Operationen brauchen nach einem verlorenen HTTP-Ergebnis
      // nicht erneut geschrieben zu werden.
      let written = false;
      if (batch.some(op => !remote.sync.applied.includes(op.id)) || groupOps.length || folds.length || tidy?.changed) {
        try {
          await api('PUT', { message: 'SattPlan: Änderungen synchronisieren',
            content: encodeFile(merged), sha: file.sha, branch: config.branch });
          written = true;
        } catch (error) { if ([409, 422].includes(error.status) && attempt < 3) continue; throw error; }
      }
      const sent = new Set([...batch.map(op => op.id), ...setAside]), wasReady = ready, before = signature();
      const rest = applicableOps(merged, pending.filter(op => !sent.has(op.id)));
      if (rest.bad.length) quarantine(rest.bad);
      saveLocal(merged, rest.good, rest.state);
      remoteEtag = written ? '' : file.etag;
      if (compactRequested) { compactRequested = false; noteCompaction(tidy); }
      ready = true; retryAt = 0; lastSyncAt = Date.now(); rememberSyncTime(); message();
      if (networkDown) { networkDown = false; renderConnectionBand('online'); }
      renderConnectionBand('synced');
      // Nur neu zeichnen, wenn sich etwas geändert hat: So bleiben geöffnete Rezepte, Auswahllisten und Eingaben stehen.
      if (!wasReady || signature() !== before) render();
      restingStatus(); hydratePhotos();
      return;
    }
  } catch (error) {
    compactRequested = false;
    if (error.network) { networkDown = true; renderConnectionBand('offline'); }
    retryAt = error.retryAt || Date.now() + ([401, 404].includes(error.status) ? 60000 : 15000);
    status(pending.length ? 'Lokal gesichert · Abgleich später' : 'Abgleich nicht möglich', 'error'); message(error.message);
  } finally {
    busy = false; $('#refresh').disabled = false;
    if (pending.length && !retryAt) setTimeout(() => void sync(), 300);
  }
}
async function loadWorkspace() {
  ready = false; seen = null; pending = []; base = emptyData(); state = base; $('#notice').hidden = true;
  remoteEtag = '';
  const cache = localStorage.getItem(namespace());
  if (cache) {
    let saved;
    try { saved = JSON.parse(cache); validate(saved.base); if (!Array.isArray(saved.pending)) throw new Error('Warteschlange fehlt'); }
    catch {
      openStorageRecovery(cache);
      throw new Error('Der lokale Speicher ist beschädigt. In der Notfallansicht kannst du ihn als Datei sichern und den Stand neu laden.');
    }
    const split = applicableOps(saved.base, saved.pending);
    base = saved.base; pending = split.good; state = split.state; ready = true;
    if (split.bad.length) { quarantine(split.bad); saveLocal(base, pending, state); }
  } else if (!connected()) {
    const response = await fetch('./beispieldaten.json');
    if (!response.ok) throw new Error('Die Beispieldaten konnten nicht geladen werden. Bitte alle App-Dateien hochladen.');
    base = validate(await response.json()); saveLocal(base, []); ready = true;
  }
  if (ready) {
    const ops = productGroupMigration(state), all = [...pending, ...ops];
    if (namespace() === 'einkauf-demo-v1' && all.length) saveLocal(merge(base, all), []);
    else if (ops.length) saveLocal(base, all);
  }
  render(); restingStatus(); requestPersistentStorage(); if (connected()) await sync(true);
}
// Bittet den Browser, die lokalen Daten nicht bei Speicherknappheit selbst zu löschen (wo unterstützt, z. B. als Home-Bildschirm-App).
let persistAsked = false;
function requestPersistentStorage() {
  if (persistAsked || !ready || !navigator.storage?.persist) return;
  persistAsked = true;
  navigator.storage.persisted?.().then(already => already || navigator.storage.persist()).catch(() => {});
}
// Namensvorschläge nur aus den eigenen Daten (Personen, Ersteller von Einträgen); ohne bekannte Namen kein Auswahlpfeil.
function fillActorNames() {
  const names = [...new Set([...liveMembers(state.members).map(row => row.name), ...active(state.items).map(row => row.createdBy)].map(name => String(name || '').trim()).filter(name => name && name !== 'Unbekannt'))].slice(0, 12);
  $('#actors').replaceChildren(...names.map(name => new Option(name, name)));
  document.querySelectorAll('input[name=actor]').forEach(input => { if (names.length) input.setAttribute('list', 'actors'); else input.removeAttribute('list'); });
}
function fillSettings() {
  fillActorNames();
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token', 'tokenExpires']) {
    $('#settings-form').elements[key].value = config[key] || ({ branch: 'main', path: 'daten.json' }[key] || '');
  }
  const importForm = $('#import-settings-form');
  importForm.elements.importProxy.value = config.importProxy || ''; importForm.elements.dailySource.value = config.dailySource || ''; importForm.elements.publicProxy.checked = publicProxyEnabled(config);
  fillDisplaySettings();
  // Nach dem Einrichten steht die Verbindung unten und eingeklappt; solange nichts verbunden ist, oben und offen.
  $('#settings').dataset.connected = connected() ? 'yes' : 'no';
  showOriginHint();
  applyFolds();
  showConnectionState(); updateSaveButtons();
}
// Alle GitHub-Pages-Seiten eines Kontos teilen sich eine Herkunft und damit den Browserspeicher (auch den Token).
function showOriginHint() {
  const host = location.hostname, node = $('#origin-hint');
  node.hidden = !/\.github\.io$/i.test(host);
  if (!node.hidden) node.textContent = `Sicherheit: Die App läuft unter ${host}. Alle GitHub-Pages-Seiten dieses Kontos teilen sich den Browserspeicher und könnten den Token lesen. Veröffentliche unter diesem Konto keine weiteren Seiten oder nutze für die App eine eigene Organisation bzw. Domain (README, Abschnitt 4).`;
}
function fillDisplaySettings() {
  $('#theme').value = config.theme || 'system'; $('#store-style').value = config.storeStyle === 'logo' ? 'logo' : 'text'; $('#group-items').checked = config.groupItems !== false; $('#product-images').checked = imagesOn(); applyTheme();
}
// Speichern-Knöpfe der Einstellungen: grau mit „Gespeichert am …“, solange nichts geändert ist; bei einer Änderung wieder aktiv.
function saveButtonState(form, dirty, savedAt, idle) {
  const node = form.querySelector('button[type=submit]');
  node.disabled = !dirty;
  node.textContent = dirty ? idle : savedAt ? `Gespeichert am ${dateTime(savedAt)}` : 'Gespeichert';
}
const CONNECTION_FIELDS = ['actor', 'owner', 'repo', 'branch', 'path', 'token', 'tokenExpires'];
let connectFailed = false;   // das letzte Speichern & Verbinden ist gescheitert: Der Knopf bleibt für einen neuen Versuch aktiv
function updateSaveButtons() {
  showConnectionState();
  const form = $('#settings-form'), imports = $('#import-settings-form');
  const changed = CONNECTION_FIELDS.some(key => form.elements[key].value.trim() !== (config[key] || ({ branch: 'main', path: 'daten.json' }[key] || '')));
  saveButtonState(form, !connected() || changed || connectFailed, config.savedAt, connected() ? 'Speichern' : 'Speichern & verbinden');
  const importChanged = imports.elements.importProxy.value.trim() !== (config.importProxy || '') || imports.elements.dailySource.value.trim() !== (config.dailySource || '') || imports.elements.publicProxy.checked !== publicProxyEnabled(config);
  saveButtonState(imports, importChanged, config.importSavedAt, 'Import-Einstellungen speichern');
  if (!importChanged && !config.importSavedAt && !config.importProxy && !publicProxyEnabled(config)) imports.querySelector('button[type=submit]').textContent = 'Import-Einstellungen speichern';
}
for (const id of ['#settings-form', '#import-settings-form']) for (const type of ['input', 'change']) $(id).addEventListener(type, updateSaveButtons);
function showConnectionState() {
  const left = tokenDaysLeft();
  // Ohne gespeicherten Token gibt es nichts zu entfernen.
  $('#disconnect').hidden = !config.token;
  $('#connection-state').textContent = connected() ? `✓ ${config.owner}/${config.repo} · ${config.actor || ''}${left !== null && left <= 14 ? ` · Token ${tokenLabel(left)}` : ''}` : 'nicht verbunden';
}
// Welche Bereiche der Einstellungen offen sind, merkt sich jedes Gerät. „Gemeinsame Liste“ steht offen, solange nichts verbunden ist.
function applyFolds() {
  const saved = config.folds || [];
  document.querySelectorAll('#settings details.fold').forEach(node => { node.open = node.id === 'connection-details' && !connected() ? true : saved.includes(node.id); });
}
document.querySelectorAll('#settings details.fold').forEach(node => node.addEventListener('toggle', () => {
  const open = [...document.querySelectorAll('#settings details.fold[open]')].map(entry => entry.id).filter(id => id !== 'connection-details' || connected());
  if (JSON.stringify(open) !== JSON.stringify(config.folds || [])) saveConfig({ ...config, folds: open });
}));
// Ablaufdatum des Tokens (steht bei GitHub beim Token, hier von Hand eingetragen: GitHub gibt es dem Browser nicht heraus). Ab sieben Tagen vorher warnt die Statuszeile.
// Der Token gilt bis zum Ende dieses Tages. Ergebnis: Tage ab heute (0 = heute, negativ = abgelaufen) oder null ohne Datum.
const tokenDaysLeft = () => /^\d{4}-\d{2}-\d{2}$/.test(config.tokenExpires || '') ? Math.round((Date.parse(`${config.tokenExpires}T12:00:00`) - Date.parse(`${localDay()}T12:00:00`)) / 86400000) : null;
const tokenLabel = days => days < 0 ? 'abgelaufen' : days === 0 ? 'läuft heute ab' : days === 1 ? 'läuft morgen ab' : `läuft in ${days} Tagen ab`;
const tokenWarning = () => { const left = tokenDaysLeft(); return left !== null && left <= 7 ? left : null; };
const PALETTES = ['gruen', 'blau', 'tuerkis', 'flieder', 'rose', 'pfirsich'];
const GLASS_BACKGROUNDS = ['lichter', 'verlauf', 'schlicht'];
const glassOn = () => config.glass !== false;
const glassBackground = () => GLASS_BACKGROUNDS.includes(config.glassBg) ? config.glassBg : 'lichter';
const glassLevel = () => Number.isFinite(config.glassLevel) ? Math.min(100, Math.max(0, Math.round(config.glassLevel))) : 50;
function showGlassLevel(level) {
  document.documentElement.style.setProperty('--gs', String(level / 100));
  $('#glass-level-value').textContent = `${level} %`;
}
function applyTheme() {
  const root = document.documentElement, palette = PALETTES.includes(config.palette) ? config.palette : 'blau';
  if (!config.theme || config.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = config.theme;
  root.dataset.palette = palette;
  document.querySelectorAll('#palette button').forEach(node => node.setAttribute('aria-checked', String(node.dataset.palette === palette)));
  // Glas-Design: aus = alles wie vor Version 2.22 (kein Attribut, keine Variable)
  const glass = glassOn(), background = glassBackground(), level = glassLevel();
  if (glass) { root.dataset.glass = ''; root.dataset.glassBg = background; showGlassLevel(level); }
  else { delete root.dataset.glass; delete root.dataset.glassBg; root.style.removeProperty('--gs'); }
  $('#glass-on').checked = glass; $('#glass-options').hidden = !glass; $('#glass-level').value = String(level); $('#glass-level-value').textContent = `${level} %`;
  document.querySelectorAll('#glass-bg button').forEach(node => node.setAttribute('aria-checked', String(node.dataset.bg === background)));
  // Die Farbe der Statusleiste folgt der gewählten Hintergrundfarbe, nicht nur dem Gerät (die Seite selbst, denn mit Glas ist der Körper durchsichtig).
  const channels = getComputedStyle(root).backgroundColor.match(/[\d.]+/g).map(Number);
  if (channels.length < 3 || channels[3] === 0) return;   // noch keine Farbe berechnet: Statusleiste unverändert lassen
  const [red, green, blue] = channels;
  $('#theme-color').content = `#${[red, green, blue].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}
function sameTarget(left, right) { return namespace(left) === namespace(right); }
// Auf dem iPhone öffnet ein Download aus einer Homescreen-App oft eine Seite ohne Rückweg: besser den Teilen-Dialog nehmen.
// Dateien weitergeben (Teilen-Menü oder Download) über die Plattformschicht, damit eine spätere App das nativ lösen kann.
async function deliverFile(file) { await saveFile(file); }
async function backup() {
  const name = `sattplan-backup-${new Date().toISOString().slice(0, 10)}.json`, json = JSON.stringify(state, null, 2);
  await deliverFile(new File([json], name, { type: 'application/json' }));
}
// Vollsicherung: eine ZIP-Datei mit den Daten (daten.json, wie die JSON-Sicherung) und allen Rezeptfotos (fotos/<Kennung>.jpg). Fotos kommen aus dem Gerätespeicher,
// sonst aus dem Daten-Repository; was sich nicht holen lässt, wird gezählt und in „lies-mich.txt“ genannt. Die Wiederherstellung läuft unter Optionen → Datensicherung.
async function backupFull() {
  const note = $('#export-note'), button = $('#export-full');
  button.disabled = true;
  try {
    const stamp = new Date().toISOString().slice(0, 10), encode = text => new TextEncoder().encode(text);
    const ids = [...new Set(state.recipes.map(row => row.photoId).filter(Boolean))];
    const files = [{ name: 'daten.json', data: encode(JSON.stringify(state, null, 2)) }], missing = [];
    for (const [index, id] of ids.entries()) {
      note.textContent = `Hole Foto ${index + 1} von ${ids.length} …`;
      const blob = (await readPhoto(id)) ?? (connected() ? await downloadPhoto(id) : null);
      if (blob) files.push({ name: `fotos/${id}.jpg`, data: new Uint8Array(await blob.arrayBuffer()) }); else missing.push(id);
    }
    const lines = [`Vollsicherung von SattPlan vom ${stamp}`, '', `daten.json: alle Daten (wie „Alle Daten als JSON sichern“), enthält keinen Token.`, `fotos/: ${files.length - 1} Rezeptfotos (Name = Foto-Kennung im Rezept, Feld photoId).`];
    if (missing.length) lines.push('', `Nicht gesichert (nicht auf diesem Gerät und nicht im Daten-Repository gefunden): ${missing.join(', ')}`);
    lines.push('', 'Wiederherstellen: In SattPlan unter Optionen → Datensicherung → Datensicherung wiederherstellen diese ZIP-Datei auswählen. Vorschau prüfen und Ersetzen bestätigen. Bitte vertraulich aufbewahren.');
    files.push({ name: 'lies-mich.txt', data: encode(lines.join('\n')) });
    const zip = makeZip(files);
    await deliverFile(new File([zip], `sattplan-vollsicherung-${stamp}.zip`, { type: 'application/zip' }));
    const photos = files.length - 2, plural = count => `${count} ${count === 1 ? 'Foto' : 'Fotos'}`;
    note.textContent = `Gesichert: Daten und ${plural(photos)}${missing.length ? `, ${plural(missing.length)} nicht gefunden` : ''}.`;
  } catch (error) { note.textContent = ''; throw error; }
  finally { button.disabled = false; }
}

/* ---------- Geführte, portable Wiederherstellung ---------- */
async function restoreBackup(bundle, preview) {
  if (!ready) throw new Error('Bitte die Liste zuerst öffnen oder verbinden.');
  if (busy || restoring) throw new Error('Bitte den laufenden Abgleich kurz abwarten und erneut versuchen.');
  if (namespace() !== preview.scope) throw new Error('Die Datenverbindung hat sich geändert. Bitte die Datei erneut auswählen.');
  if (connected()) await freshSync();
  if (namespace() !== preview.scope || restoreSignature() !== preview.signature) {
    throw Object.assign(new Error('Der aktuelle Stand hat sich seit der Vorschau geändert. Bitte die aktualisierte Vorschau prüfen und erneut bestätigen.'),{changed:true});
  }
  const scope = namespace(), uploadKey = queueKey(), oldQueue = localStorage.getItem(uploadKey), staged = [];
  restoring = true;
  let committed = false, queueChanged = false, restoreOp;
  try {
    restoreOp = makeRestoreOperation(bundle.data,state,config.actor || 'Unbekannt');
    const check = merge(state,[restoreOp]);
    if (sizeOf(check) + 1 > LIMIT_BYTES) throw new Error('Der wiederhergestellte Stand wäre zu groß. Bitte zuerst eine kleinere Sicherung erstellen.');
    // Falls schon das Sichern scheitert, bleibt der aktuelle Datenstand unberührt.
    storageWrite(recoveryStorageKey(scope),{at:new Date().toISOString(),data:clone(state)});
    for (const [id,bytes] of bundle.photos) {
      const cached = await readPhoto(id), existing = cached ?? (connected() ? await downloadPhoto(id) : null);
      if (existing) {
        const previous = new Uint8Array(await existing.arrayBuffer());
        if (previous.length!==bytes.length || !previous.every((value,i)=>value===bytes[i])) throw new Error('Ein Foto hat dieselbe Kennung, aber einen anderen Inhalt. Bitte eine unveränderte Sicherung verwenden.');
      }
      if (!cached) { await storePhoto(id,new Blob([bytes],{type:'image/jpeg'})); staged.push(id); }
    }
    if (namespace()!==scope) throw new Error('Die Datenverbindung hat sich geändert. Es wurde nichts ersetzt.');
    if (connected()) {
      const ids = new Set(queued(uploadKey));
      for (const id of backupPhotoIds(bundle.data)) if (await readPhoto(id)) ids.add(id);
      storageWrite(uploadKey,[...ids]); queueChanged = true;
    }
    commit([restoreOp]); committed = true;
    photoIssue = null; photoRetryAt = 0; photoMiss.clear();
  } catch (error) {
    committed ||= Boolean(restoreOp && state.sync.applied.includes(restoreOp.id));
    if (!committed) {
      let queueRestored = true;
      if (queueChanged) try { if(oldQueue===null)localStorage.removeItem(uploadKey);else localStorage.setItem(uploadKey,oldQueue); } catch { queueRestored=false; }
      if(queueRestored) for(const id of staged) await removePhoto(id).catch(()=>{});
      throw error;
    }
    // Persistierte Daten bleiben auch bei einem Fehler der nachfolgenden Anzeige erhalten.
  } finally { restoring = false; }
  restingStatus(); render(); if(connected())void sync(true);
}

/* ---------- Im Laden ---------- */
// Umschalter „Planen | Im Laden“ (gilt für dieses Gerät). Im Laden: Geschäft oben wählen, nur das Wichtige sehen, abhaken.
let shopStore = ALL_STORES, shopDoneOpen = false;
// Preise „Im Laden“ (2.163): unter „Ausgaben“ nachgetragene Produktpreise, je Produktname gesammelt; welche Übersichten offen sind, bleibt beim Abgleich erhalten
let shopPrices = new Map();
const shopPricesOpen = new Set();
const shopChecked = new Map();   // Artikel ohne Geschäft, die in dieser Sitzung in einem Geschäft abgehakt wurden: Kennung → Geschäft
const shopOn = () => config.shopMode === true;
// Beim Öffnen von „Im Laden“ (ein Tipp der Person) wird der Bildschirm neu angefordert, auch wenn es vorher nicht klappte; ebenso beim Zurückkehren in die App.
function setShopMode(on) { if (on) shopStore = ALL_STORES; awake.shop.failed = false; if (on && selecting) setSelecting(false); saveConfig({ ...config, shopMode: on }); applyMode(); window.scrollTo(0, 0); }
function applyMode() {
  const on = shopOn();
  $('#plan-view').hidden = on; $('#shop-view').hidden = !on; $('#mode-row').hidden = on;
  $('#mode-plan').setAttribute('aria-selected', String(!on)); $('#mode-shop').setAttribute('aria-selected', String(on));
  if (on) renderShop();
  syncChrome(); syncShopLock();syncPrivateView();
}
// Im Laden steht ganz oben die Geschäftsauswahl: Kopfzeile und Umschalter verschwinden, solange diese Ansicht offen ist.
function syncChrome() {
  document.body.classList.toggle('in-store', shopOn() && !$('#shopping').hidden);
  armLock();
}
function syncShopAwake() {
  const supported = 'wakeLock' in navigator;
  // Standardmäßig an; nur ein ausdrückliches Abwählen (`shopScreenOn: false`) gilt. Das frühere Feld `shopAwake` (Version 1.9 bis 2.35, damals Standard „aus“) wird nicht mehr gelesen.
  const on = config.shopScreenOn !== false;
  // Gesperrt gibt es weder den Haken noch den Hinweis dazu; der Bildschirm bleibt trotzdem an.
  const locked = isLocked();
  $('#shop-awake-label').hidden = !supported || locked; $('#shop-awake-hint').hidden = locked; $('#shop-awake').checked = supported && on && !awake.shop.failed;
  const want = supported && on && shopOn() && !$('#shopping').hidden && !document.hidden;
  void keepAwake('shop', want);
}
/* ---------- Schutz vor versehentlichen Berührungen ---------- */
// Gedrückt halten statt Tippen: Der Knopf füllt sich, nach `ms` wird `action` ausgeführt. Ein kurzer Tipp tut nichts (nur ein Hinweis).
// Tastatur und Bedienhilfen (kein Zeigerereignis, nur „click“) lösen die Aktion sofort aus.
function holdToConfirm(node, ms, action, hint = '', enabled = () => true, onTap = null) {
  let timer = null, startX = 0, startY = 0, pointer = false, reset = 0, completed = false, cancelled = false;
  node.style.setProperty('--hold', `${ms}ms`);
  const stop = () => { clearTimeout(timer); timer = null; node.classList.remove('holding'); };
  const settle = () => { clearTimeout(reset); reset = setTimeout(() => { pointer = false; }, 800); };   // das „click“ nach dem Loslassen gehört noch zum Zeiger
  node.addEventListener('pointerdown', event => {
    if(!enabled()) { pointer=false;stop();return; }
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = true; completed = false; cancelled = false; clearTimeout(reset); startX = event.clientX; startY = event.clientY;
    stop(); node.classList.add('holding');
    timer = setTimeout(() => { stop(); settle(); if(!enabled())return;clearSelection(); completed = true; vibrate(15); guard(action); }, ms);
  });
  node.addEventListener('pointermove', event => { if (pointer && Math.hypot(event.clientX - startX, event.clientY - startY) > 16) { cancelled = true; stop(); } });
  node.addEventListener('pointerleave', () => { cancelled = true; stop(); });
  for (const type of ['pointerup', 'pointercancel']) node.addEventListener(type, event => {
    const early = timer !== null; if (type === 'pointercancel') cancelled = true; stop(); settle();
    if (early && type === 'pointerup' && hint && !onTap && !isLocked()) showNotice(hint);
  });
  node.addEventListener('click', event => {
    if(!enabled()) { if(pointer && event.detail!==0) event.preventDefault();return; }
    event.preventDefault();if(!pointer) guard(action); else if (onTap && !completed && !cancelled) guard(onTap);
  });
  node.addEventListener('contextmenu', event => { if(enabled() || pointer) event.preventDefault(); });
  return stop;
}
// Sperre: Gesperrt bewirkt Tippen nichts (Scrollen geht weiter). Zum Entsperren den Knopf unten gedrückt halten. Sie greift von selbst nach einiger Zeit ohne
// Berührung (einstellbar) und wenn die App aus dem Hintergrund zurückkommt; der Zustand wird gemerkt (auch nach einem Neuladen noch gesperrt).
let lockTimer = null, lockQuiet = 0, lockAnnounced = 0, nudgeTimer = null;
const isLocked = () => config.shopLocked === true && shopOn();   // die gemerkte Einstellung ist die Quelle der Wahrheit (die Einstellungen werden erst beim Start geladen)
function setLocked(on) {
  const next = on && shopOn();
  if ((config.shopLocked === true) !== next) saveConfig({ ...config, shopLocked: next });
  syncShopLock();
}
function syncShopLock() {
  if (!shopOn() && config.shopLocked === true) saveConfig({ ...config, shopLocked: false });   // außerhalb von „Im Laden“ gibt es keine Sperre
  const locked = isLocked();
  document.body.classList.toggle('shop-locked', locked);
  $('#shop-lockbar').hidden = !locked; $('#shop-lock').hidden = locked;
  $('#shop-finish').hidden = locked;   // „Einkauf beenden“ gibt es nur entsperrt
  $('#shop-autolock').value = String(lockSeconds(config.shopLock));
  syncShopAwake(); armLock();
}
function armLock() {
  clearTimeout(lockTimer); lockTimer = null;
  const seconds = lockSeconds(config.shopLock);
  if (!seconds || isLocked() || !shopOn() || $('#shopping').hidden || document.hidden) return;
  lockTimer = setTimeout(() => {
    if (document.querySelector('dialog[open]')) { armLock(); return; }   // mitten in einem Fenster (z. B. Beenden) wird nicht gesperrt
    setLocked(true);
  }, seconds * 1000);
}
// Jede Berührung, jeder Tastendruck und jedes Scrollen setzt die Wartezeit zurück.
for (const type of ['pointerdown', 'keydown', 'scroll']) document.addEventListener(type, () => { if (shopOn() && !isLocked()) armLock(); }, { capture: true, passive: true });
// Gesperrt: Alles außer dem Entsperren wird verschluckt, auch Reiter und „Planen“. Drei Dinge gehen auch gesperrt, aber nur durch Gedrückthalten:
// den Kreis eines Artikels (abhaken), ein Geschäft (wechseln) und „Erledigt“ (öffnen oder schließen).
let lockBypass = false, lockHold = null;
const LOCK_HOLD = '#shop-list .shop-tap, #shop-chips .chip, #shop-list .shop-done summary, #shop-list .shop-price-toggle';
// Eine verschluckte Berührung zeigt keinen Text: Der Knopf zum Entsperren leuchtet kurz in der Farbe auf (zwei Pulse, CSS „nudge“). Bildschirmleser bekommen den Hinweis als unsichtbare Ansage.
function nudgeUnlock() {
  const bar = $('#shop-lockbar');
  bar.classList.remove('nudge'); void bar.offsetWidth; bar.classList.add('nudge');   // die Animation startet bei jeder Berührung neu
  clearTimeout(nudgeTimer); nudgeTimer = setTimeout(() => bar.classList.remove('nudge'), 1300);
  if (Date.now() - lockAnnounced > 4000) {
    lockAnnounced = Date.now();
    const live = $('#shop-lock-live'); live.textContent = '';
    setTimeout(() => { live.textContent = 'Gesperrt. Zum Entsperren unten gedrückt halten.'; }, 50);
  }
}
document.addEventListener('click', event => {
  if (!isLocked() || lockBypass || event.target.closest?.('#shop-lockbar, #notice-undo')) return;   // „Rückgängig“ nach dem Abhaken geht auch gesperrt
  event.preventDefault(); event.stopPropagation();
  if (Date.now() >= lockQuiet) nudgeUnlock();
}, true);
function endLockHold() { if (lockHold) { clearTimeout(lockHold.timer); lockHold.node.classList.remove('holding'); lockHold = null; } }
// Ein langer Druck markiert auf iOS sonst Text in der Nähe (blaue Auswahl mit Griffen): Im Laden gibt es keine Textauswahl (CSS), und beim Gedrückthalten wird sie zusätzlich unterbunden.
// Native Eingabefelder müssen weiterhin leeren, ersetzen und einfügen können.
// Nur die Auswahl durch eine echte Haltegeste wird dort zusammengeklappt.
let selectionPointer=null;
const textField=node=>node?.matches?.('input:not([type=checkbox]):not([type=radio]),textarea');
function collapseFieldSelection(field){if(textField(field)&&typeof field.selectionStart==='number'&&field.selectionStart!==field.selectionEnd)field.setSelectionRange(field.selectionEnd,field.selectionEnd);}
document.addEventListener('pointerdown',event=>{selectionPointer=event.isPrimary&&textField(event.target)?{field:event.target,at:Date.now()}:null;},true);
document.addEventListener('pointerup',()=>{if(selectionPointer&&Date.now()-selectionPointer.at>=450){collapseFieldSelection(selectionPointer.field);}selectionPointer=null;},true);
document.addEventListener('pointercancel',()=>{selectionPointer=null;},true);
document.addEventListener('selectstart',event=>{if(!textField(event.target)||selectionPointer)event.preventDefault();},true);
document.addEventListener('contextmenu', event => {event.preventDefault();collapseFieldSelection(event.target);}, true);
document.addEventListener('select',event=>{if(selectionPointer&&Date.now()-selectionPointer.at>=450)collapseFieldSelection(event.target);},true);
document.addEventListener('selectionchange', () => {
  if(textField(document.activeElement))return;
  const selection=window.getSelection();if(selection&&!selection.isCollapsed)selection.removeAllRanges();
});
const clearSelection = () => { try { getSelection()?.removeAllRanges(); } catch { /* keine Auswahl */ } };
document.addEventListener('pointerdown', event => {
  if (!isLocked() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const node = event.target.closest?.(LOCK_HOLD);
  if (!node) return;
  endLockHold();
  node.style.setProperty('--hold', `${HOLD_ITEM_MS}ms`); node.classList.add('holding');
  lockHold = { node, x: event.clientX, y: event.clientY, timer: setTimeout(() => {
    const target = node; endLockHold(); clearSelection(); vibrate(15);
    lockQuiet = Date.now() + 800;   // das Loslassen danach ist ein Klick auf dasselbe Element (bleibt es stehen, wie „Erledigt“): er wird verschluckt, ohne den Knopf aufleuchten zu lassen
    lockBypass = true; try { target.click(); } finally { lockBypass = false; }
  }, HOLD_ITEM_MS) };
}, true);
document.addEventListener('pointermove', event => { if (lockHold && Math.hypot(event.clientX - lockHold.x, event.clientY - lockHold.y) > 16) endLockHold(); }, true);
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, endLockHold, true);
// Aus dem Hintergrund (Bildschirm aus, Hosentasche, andere App) kommt man gesperrt zurück.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && shopOn() && !$('#shopping').hidden && lockSeconds(config.shopLock) > 0) setLocked(true);
  else armLock();
});
$('#shop-lock').addEventListener('click', () => guard(() => setLocked(true)));
$('#shop-autolock').addEventListener('change', () => guard(() => { saveConfig({ ...config, shopLock: Number($('#shop-autolock').value) }); armLock(); }));
holdToConfirm($('#shop-unlock'), HOLD_UNLOCK_MS, () => setLocked(false));

// Abgehakt wird nur über den Kreis links (große Tippfläche). Name und Menge tippen tut nichts. So hakt man nicht aus Versehen etwas ab, wenn man das Handy anfasst.
function shopRow(item) {
  const row = element('li', undefined, `shop-item${item.checked ? ' checked' : ''}`); row.dataset.id = item.id;
  if (isWish(item)) row.dataset.wish = '';
  const tap = element('button', undefined, 'shop-tap'); tap.type = 'button';
  const mark = element('span', undefined, 'shop-mark'); if (item.checked) mark.append(icon('check'));
  tap.append(mark);
  const text = element('div', undefined, 'shop-text');
  if (isWish(item)) {
    text.tabIndex = 0; text.setAttribute('role', 'button'); text.setAttribute('aria-label', `${item.name}: Wunschdetails öffnen (lange drücken)`);
    text.addEventListener('keydown', event => { if (!isLocked() && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); guard(() => openWish(item.id)); } });
  }
  text.append(element('span', item.name, 'shop-name'), element('span', `${shoppingAmount(item)}`, 'shop-qty'));
  if (imagesOn() || isWish(item)) text.append(thumbFor(item));
  const prices = isWish(item) ? [] : shopPrices.get(productKey(item.name)) || [];
  let panel = null;
  if (prices.length) {
    // Kleiner Pfeil links neben dem Bild: klappt darunter die Preise dieses Produkts auf (gesperrt: gedrückt halten). Ohne gespeicherten Preis kein Pfeil.
    const key = productKey(item.name), open = shopPricesOpen.has(key), toggle = element('button', undefined, 'shop-price-toggle');
    toggle.type = 'button'; toggle.append(icon('down')); toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${item.name}: gespeicherte Preise ${open ? 'zuklappen' : 'anzeigen'}`);
    panel = shopPricePanel(item, prices); panel.hidden = !open; toggle.setAttribute('aria-controls', panel.id);
    toggle.addEventListener('click', () => {
      const show = !shopPricesOpen.has(key); if (show) shopPricesOpen.add(key); else shopPricesOpen.delete(key);
      panel.hidden = !show; row.classList.toggle('prices-open', show); toggle.setAttribute('aria-expanded', String(show));
      toggle.setAttribute('aria-label', `${item.name}: gespeicherte Preise ${show ? 'zuklappen' : 'anzeigen'}`);
    });
    text.append(toggle); row.classList.add('has-prices'); row.classList.toggle('prices-open', open);
  }
  tap.setAttribute('aria-pressed', String(Boolean(item.checked)));
  tap.setAttribute('aria-label', `${item.name}, ${shoppingAmount(item)}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
  tap.addEventListener('click', () => guard(() => {
    const latest = state.items.find(entry => entry.id === item.id);
    if (!latest || latest.deletedAt) return;
    // Ein Artikel ohne Geschäft, der hier abgehakt wird, steht in den anderen Geschäften nicht mehr auf der Liste.
    if (!latest.checked && !latest.storeId && shopStore !== ALL_STORES) shopChecked.set(latest.id, shopStore); else shopChecked.delete(latest.id);
    const boughtAt=!latest.checked&&!isWish(latest)?new Date().toISOString():null;
    const autoChanges=latest.checked?undoAutomaticStockChanges(state,latest):boughtAt?automaticStockChanges(state,latest,boughtAt):[];
    commit([nextOp('items', item.id, { checked: !latest.checked, shopBoughtAt:boughtAt,shopPurchase:boughtAt?{at:boughtAt,by:config.actor||'Unbekannt'}:null,...(latest.stockConsumedAt!==undefined?{stockConsumedAt:null}:{}) }),...stockOps(autoChanges)]);
    // Ein versehentliches Abhaken lässt sich gleich zurücknehmen (der Artikel verschwindet sonst aus der offenen Liste).
    if (!latest.checked) showNotice(`„${latest.name}“ abgehakt`, () => {
      const now = state.items.find(entry => entry.id === item.id);
      if (!now || now.deletedAt || !now.checked) return;
      shopChecked.delete(item.id); commit([nextOp('items', item.id, { checked: false, shopBoughtAt: latest.shopBoughtAt || null,shopPurchase:latest.shopPurchase||null,...(latest.stockConsumedAt!==undefined?{stockConsumedAt:latest.stockConsumedAt}:{}) }),...stockOps(undoAutomaticStockChanges(state,now))]);
    });
  }));
  row.append(tap, text); if (panel) row.append(panel);
  return row;
}
/* Kompakte Preisübersicht eines Produkts (2.163): je Geschäft der zuletzt gezahlte Preis, die jüngsten oben. Geschäft (mit Logo, falls bekannt), Datum,
   Preis und „Angebot“; der günstigste normale Preis ist hervorgehoben (siehe priceOverview). Die Preise trägt man unter „Ausgaben“ am Einkauf nach. */
let shopPriceSerial = 0;
function shopPriceStore(row) {
  const store = active(state.stores).find(entry => entry.id === row.storeId), name = row.storeName || 'Ohne Geschäft', box = element('span', undefined, 'shop-price-store');
  const chain = row.storeName ? chainForStore(store || { name: row.storeName }) : null;
  if (typeof chain?.logo === 'string') {
    const logo = element('img', undefined, 'shop-price-logo'); logo.src = chain.logo; logo.alt = ''; logo.width = 36; logo.height = 24;
    logo.addEventListener('error', () => { logo.hidden = true; }, { once: true });
    box.append(logo);
  }
  box.append(element('span', name, 'shop-price-name'));
  return box;
}
function shopPricePanel(item, prices) {
  const { rows, showAmounts } = priceOverview(prices), today = isoDate();
  const panel = element('div', undefined, 'shop-prices'); panel.id = `shop-prices-${++shopPriceSerial}`;
  const list = element('ul', undefined, 'shop-price-list'); list.setAttribute('aria-label', `Preise für ${item.name}`);
  for (const row of rows) {
    const li = element('li', undefined, `shop-price${row.cheapest ? ' cheapest' : ''}${row.offer ? ' offer' : ''}`), where = element('span', undefined, 'shop-price-where');
    const date = row.date === today ? 'Heute' : row.date.slice(0, 4) === today.slice(0, 4) ? spendDay(row.date) : dayLabel(row.date);
    where.append(shopPriceStore(row), element('span', [date, showAmounts && row.amount ? row.amount : ''].filter(Boolean).join(' · '), 'shop-price-date'));
    const value = element('span', undefined, 'shop-price-value');
    value.append(element('strong', euros(row.cents)));
    const tags = element('span', undefined, 'shop-price-tags');
    if (row.offer) tags.append(element('span', 'Angebot', 'offer-tag'));
    if (row.cheapest) tags.append(element('span', 'Günstigster', 'cheapest-tag'));
    if (tags.childNodes.length) value.append(tags);
    li.append(where, value); list.append(li);
  }
  panel.append(list);
  return panel;
}
function shopNewsRow(entry) {
  const item = entry.item, row = element('li', undefined, 'shop-item news');
  const copy = element('div', undefined, 'item-copy');
  copy.append(element('strong', item.name, 'shop-name'), element('small', `${shoppingAmount(item)} · ${entry.entries.map(e => e.kind === 'neu' ? `neu von ${e.by}` : `+${format(e.quantity)} ${e.unit} von ${e.by}`).join(', ')}`));
  row.append(copy, button('Übernehmen', () => acknowledge(entry.entries.map(e => e.id)), 'primary small'));
  return row;
}
function renderShop() {
  storeReorders.forEach(order => order.cancel());
  shopPrices = productPriceIndex(state.purchases || [], purchase => storeNameOf(purchase, active(state.stores)));
  const stores = orderedStores(state.stores).filter(store => visibleStore(store) && !isNotesStore(store)), everything = visibleItems(true);   // Notizen gehören nicht in den Laden
  if (shopStore && shopStore !== ALL_STORES && !stores.some(store => store.id === shopStore)) shopStore = ALL_STORES;
  const items = visibleItems(shopStore === ALL_STORES ? '' : shopStore);   // ohne die eigenen Listen anderer Geschäfte und ohne die „Alle“-Ansicht
  const chips = $('#shop-chips'); chips.replaceChildren();
  // „Alle“ steht vor den Geschäften (wie unter „Planen“): alles Offene aus allen Geschäften und ohne Geschäft
  if (stores.length) {
    const all = element('button', 'Alle', 'chip'); all.type = 'button';
    all.dataset.allStores = ''; describeStoreChip(all, ALL_STORES, 'Alle', shopStore === ALL_STORES);
    const open = visibleItems().filter(item => !item.checked).length; if (open) all.append(element('span', String(open), 'count'));
    all.addEventListener('click', () => { shopStore = ALL_STORES; renderShop(); });
    chips.append(all);
  }
  for (const store of stores) {
    const chip = element('button', undefined, 'chip'); chip.type = 'button'; chip.append(storeLabel(store));
    chip.dataset.storeId = store.id; describeStoreChip(chip, store.id, store.name, store.id === shopStore);
    const count = shopCount(everything, store.id, takesAnywhere(store)); if (count) chip.append(element('span', String(count), 'count'));
    chip.addEventListener('click', () => { shopStore = store.id; renderShop(); });
    chips.append(chip);
  }
  const selected = chips.querySelector('[aria-selected=true]');
  if (selected) chips.scrollLeft = Math.max(0, selected.offsetLeft - (chips.clientWidth - selected.offsetWidth) / 2);
  const list = $('#shop-list'); list.replaceChildren();
  if (!shopStore) {
    list.append(element('li', stores.length ? 'Tippe oben auf das Geschäft, in dem du gerade bist.' : 'Es gibt noch kein Geschäft. Lege unter „Planen“ eines an.', 'empty'));
    return;
  }
  ensureSeen();
  if (shopStore === ALL_STORES) { renderShopAll(list, items, stores); return; }
  const shop = shopView(items, shopStore, shopChecked, takesAnywhere(stores.find(store => store.id === shopStore))), here = [...shop.open, ...shop.anywhere];
  const news = seen ? newFromOthers(here, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  const groups = rows => groupByCategory(rows.filter(item => !newIds.has(item.id)), itemHistory(), aislesOf(shopStore));
  if (!here.length) list.append(element('li', `Alles erledigt bei ${storeName(shopStore)}.`, 'empty'));
  news.forEach(entry => list.append(shopNewsRow(entry)));
  for (const group of groups(shop.open)) { list.append(groupHead(group.label)); group.items.forEach(item => list.append(shopRow(item))); }
  const anywhere = groups(shop.anywhere);
  if (anywhere.length) {
    list.append(element('li', 'Überall möglich', 'store-head none'));
    for (const group of anywhere) { list.append(groupHead(group.label)); group.items.forEach(item => list.append(shopRow(item))); }
  }
  const apart = isSeparate(stores.find(store => store.id === shopStore));   // eine eigene Liste steht für sich: keine Hinweise auf Artikel anderswo
  if (shop.elsewhere && !apart) list.append(element('li', `${shop.elsewhere} Artikel für andere Geschäfte`, 'shop-note'));
  if (shop.hidden && !apart) list.append(element('li', `${shop.hidden} Artikel ohne Geschäft stehen hier nicht (einstellbar unter „Geschäfte & Listen“ → Geschäft → „Im Laden“)`, 'shop-note'));
  appendShopDone(list, shop.done);
}
function appendShopDone(list, rows) {
  if (!rows.length) return;
  const done = element('li', undefined, 'shop-done'), details = element('details'), inner = element('ul');
  details.open = shopDoneOpen; details.addEventListener('toggle', () => { shopDoneOpen = details.open; });
  details.append(element('summary', `Erledigt (${rows.length})`), inner);
  rows.sort((a, b) => a.name.localeCompare(b.name, 'de')).forEach(item => inner.append(shopRow(item)));
  done.append(details); list.append(done);
}
// Auswahl „Alle“: ein Abschnitt je Geschäft (zuerst „Ohne Geschäft“), darin nach Gängen geordnet; Abhaken wie sonst.
function renderShopAll(list, items, stores) {
  const all = shopAllView(items, stores), here = all.sections.flatMap(section => section.open);
  const news = seen ? newFromOthers(here, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  if (!here.length) list.append(element('li', 'Alles erledigt.', 'empty'));
  news.forEach(entry => list.append(shopNewsRow(entry)));
  for (const section of all.sections) {
    const open = section.open.filter(item => !newIds.has(item.id)); if (!open.length) continue;
    list.append(storeHead(section.store ? section.store.name : 'Ohne Geschäft', open.length, !section.store));
    for (const group of groupByCategory(open, itemHistory(), aislesOf(section.store?.id))) { const head = groupHead(group.label); head.classList.add('sub'); list.append(head); group.items.forEach(item => list.append(shopRow(item))); }
  }
  appendShopDone(list, all.done);
}
// Was „Einkauf beenden“ entfernt: unter „Alle“ alles Abgehakte, bei einem Geschäft nur dessen Einkauf (siehe `finishable` in shop.js). Abgehaktes anderer Geschäfte bleibt stehen.
// Eine eigene Liste („Wünsche“) bleibt dabei unberührt; ist sie selbst gewählt, wird nur sie beendet.
function finishItems() {
  const store = active(state.stores).find(row => row.id === shopStore);
  return finishable(visibleItems(shopStore === ALL_STORES ? '' : shopStore), shopStore, shopChecked, takesAnywhere(store));
}
function openFinish() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const checked = finishItems().length, others = shopStore && shopStore !== ALL_STORES ? visibleItems(shopStore).filter(item => item.checked).length - checked : 0;
  $('#finish-text').textContent = (checked ? `${checked === 1 ? '1 abgehakter Artikel wird' : `${checked} abgehakte Artikel werden`} von der Liste entfernt.` : 'Es ist noch nichts abgehakt.')
    + (others > 0 ? ` ${others === 1 ? 'Ein abgehakter Artikel eines anderen Geschäfts bleibt' : `${others} abgehakte Artikel anderer Geschäfte bleiben`} bis zum jeweiligen Abschluss stehen.` : '');
  $('#finish-form').reset(); syncFinishActions();renderFinishStockHint(); message(); finishScope = namespace();
  spendingView.fillBuyer($('#finish-form').elements.buyerId, spendingView.defaultBuyer());
  const expenseStores=$('#finish-form').elements.expenseStoreId;
  expenseStores.replaceChildren(new Option('Ohne Zuordnung',''));
  for(const store of orderedStores(state.stores).filter(row=>!isSeparate(row)))expenseStores.add(new Option(store.name,store.id));
  $('#finish-store-field').hidden=shopStore!==ALL_STORES;
  $('#finish-dialog').showModal();
}
// Beendet den Einkauf: Abgehaktes verschwindet von der Liste. Mit `amount` (bezahlter Betrag) wird er gleich unter „Ausgaben“ gespeichert, für das gewählte Geschäft und heute,
// und die App springt zurück zu „Planen“.
let finishScope = '';
function syncFinishActions(){
  const hasAmount=Boolean($('#finish-amount').value.trim());
  $('#finish-save').hidden=!hasAmount;$('#finish-save-hint').hidden=!hasAmount;
  $('#finish-only').textContent=hasAmount?'Ohne Betrag beenden':'Einkauf beenden';
}
function renderFinishStockHint(){const text=stockTransferNotice(state,finishItems()),hint=$('#finish-stock-hint');hint.textContent=text;hint.hidden=!text;}
function finishShopping(amount = '') {
  if(!$('#finish-dialog').open)return;
  if (finishScope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte den Einkauf erneut öffnen.');
  const checked = finishItems(), ids = checked.map(item => item.id), typed = amount.trim();
  const storeId = shopStore === ALL_STORES && typed ? currentStore($('#finish-form').elements.expenseStoreId.value) : shopStore === ALL_STORES ? '' : shopStore;
  const buyer = typed ? purchaseBuyer($('#finish-form').elements.buyerId.value) : null;
  const category = defaultExpenseCategory(state);
  const fields = typed ? purchaseFields({ amount: typed, date: isoDate(), storeId, storeName: active(state.stores).find(store => store.id === storeId)?.name || '', note: category?.name || '', categoryId: category?.id || null,
    kind: 'purchase', buyerId: buyer.id, buyerName: buyer.name }, isoDate()) : null;
  // Die abgehakten Produkte gehören zu diesem Einkauf (2.160), mit dem Bild, das die Einkaufsliste gerade zeigt (Wünsche haben eigene Fotos und bleiben ohne)
  if (fields && checked.length) fields.items = purchaseItems(checked, shoppingAmount, item => { if (isWish(item)) return null; const category = itemCategory(item, thumbLearned); return { imageKey: imageForProduct({ ...item, category })?.key, category }; });
  if (fields) duplicateWarning(fields, '', 'tippe auf „Einkauf beenden & Betrag speichern“');
  const ops = [...(buyer?.change ? [nextOp('members', buyer.id, buyer.change.patch)] : []), ...deleteOps('items', ids), ...(fields ? [nextOp('purchases', uid(), fields)] : [])];
  const notice = [fields ? `${euros(fields.cents)} unter Ausgaben gespeichert${budgetNote(monthTotalWith(monthOf(fields.date), fields.cents))}` : '',stockTransferNotice(state,checked)].filter(Boolean).join(' · ');
  if (fields) rememberOwnBuyer(buyer.id);
  // Erst lokal sichern, dann die Ansicht schließen. Bei vollem Gerätespeicher bleibt der Einkauf offen.
  if (ops.length) commit(ops, notice); else {render();if(notice)showNotice(notice);}
  for (const id of ids) shopChecked.delete(id);
  if (fields) spendingView.reveal(fields);
  $('#finish-dialog').close(); setShopMode(false);
}

/* ---------- Rezeptblatt (PDF) ---------- */
/* Ein Rezept als schön gestaltetes Blatt (recipe-sheet.js): zuerst die Vorschau, daraus „PDF speichern“ und „Teilen“. Erreichbar über das Download-Symbol an der Rezeptkarte und im Fenster
   „Gericht planen“: Dort zeigt langes Drücken auf ein Rezept in der Auswahl das Blatt. Die Vorschau schließt das „×“ oben rechts oder langes Drücken irgendwo auf dem Blatt. */
const HOLD_SHEET_MS = 600;
// Gedrückthalten, ohne zu wackeln: ruft `handler` auf, wenn ein Finger (oder die Maus) `ms` lang auf einem Element von `selector` still liegt. Bewegen, Loslassen, Scrollen
// oder ein zweiter Finger (Zoomen) brechen ab.
function holdOn(root, selector, ms, handler) {
  let timer = 0, start = null;
  const stop = () => { clearTimeout(timer); timer = 0; start = null; };
  root.addEventListener('pointerdown', event => {
    stop();
    const node = event.target.closest?.(selector);
    if (!node || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    start = { x: event.clientX, y: event.clientY };
    timer = setTimeout(() => { stop(); handler(node, event); }, ms);
  });
  root.addEventListener('pointermove', event => { if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) stop(); });
  for (const type of ['pointerup', 'pointercancel', 'scroll']) root.addEventListener(type, stop, true);
  return stop;
}
// Das Foto eines Rezepts als JPEG-Bytes (lokal, sonst aus dem Daten-Repository), oder null
async function photoForPdf(id) {
  let blob = await readPhoto(id);
  if (!blob && connected()) { blob = await downloadPhoto(id); if (blob) await storePhoto(id, blob).catch(() => {}); }
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer()), info = jpegInfo(bytes);
  return info ? { bytes, ...info } : null;
}
async function recipeLayout(recipeId, servings) {
  const recipe = active(state.recipes).find(row => row.id === recipeId);
  if (!recipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const count = servings > 0 ? servings : recipe.servings, source = webUrl(recipe.sourceUrl);
  const rows = active(state.ingredients).filter(row => row.recipeId === recipeId);
  const photo = recipe.photoId ? await photoForPdf(recipe.photoId) : null;
  return layoutRecipe({ recipe: { name: recipe.name, servings: count, tags: uniqueRecipeTags(recipe.tags), sourceHost: source ? hostLabel(source) : '', sourceUrl: source, notes: recipe.notes || '' },
    ingredients: rows.map(row => sheetIngredient(row, count / recipe.servings)), instructions: recipe.instructions, photo });
}
let sheet = null;   // das gerade gezeigte Blatt: { layout, release }
function sheetStatus(text = '', error = false) { const node = $('#sheet-status'); node.textContent = text; node.classList.toggle('error', error); }
// Die Größe der Seiten: 1 = Breite des Bildschirms, 2 und 3 = größer (zum Lesen). Die Mitte des gerade Sichtbaren bleibt dabei in der Mitte.
function setSheetZoom(level) {
  const pages = $('#sheet-pages'), scroll = $('#sheet-scroll');
  const centerX = (scroll.scrollLeft + scroll.clientWidth / 2) / (scroll.scrollWidth || 1), centerY = (scroll.scrollTop + scroll.clientHeight / 2) / (scroll.scrollHeight || 1);
  pages.dataset.zoom = String(level);
  $('#sheet-zoom').setAttribute('aria-label', level >= 3 ? 'Kleiner anzeigen' : 'Größer anzeigen');
  scroll.scrollLeft = Math.max(0, centerX * scroll.scrollWidth - scroll.clientWidth / 2);
  scroll.scrollTop = Math.max(0, centerY * scroll.scrollHeight - scroll.clientHeight / 2);
}
async function openSheet(recipeId, servings) {
  const layout = await recipeLayout(recipeId, servings);
  sheet?.release();
  sheet = { layout, release: renderSheet(layout, $('#sheet-pages')) };
  sheetStatus();
  $('#sheet-share').hidden = !canShareFiles();
  const dialog = $('#sheet-dialog');
  if (!dialog.open) dialog.showModal();
  setSheetZoom(1);
  $('#sheet-scroll').scrollTop = 0;
}
const pdfName = title => `${String(title).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Rezept'}.pdf`;
function sheetFile() {
  const { layout } = sheet;
  return new File([makePdf(layout.pages, { title: layout.title, subject: 'Rezept' })], pdfName(layout.title), { type: 'application/pdf' });
}
// Teilen und Speichern laufen über platform.js (2.149), damit eine spätere App nur dort ihr Teilen-Plugin einsetzt.
async function shareSheet() {
  if (await shareFile(sheetFile(), sheet.layout.title) === 'shared') sheetStatus('Geteilt.');
}
// Speichern: eine Datei herunterladen. In einer Homescreen-App auf dem iPhone führt ein Download oft in eine Seite ohne Rückweg; dort ist der Teilen-Dialog („In Dateien sichern“) der sichere Weg.
async function saveSheet() {
  if (isStandaloneApp() && canShareFiles()) return shareSheet();
  const file = sheetFile(); downloadFile(file, 4000);
  sheetStatus(`„${file.name}“ wird gespeichert.`);
}
const sheetAction = action => async () => { sheetStatus(); try { await action(); } catch (error) { sheetStatus(error.message || 'Das hat nicht geklappt.', true); } };
$('#sheet-save').addEventListener('click', sheetAction(saveSheet));
$('#sheet-share').addEventListener('click', sheetAction(shareSheet));
$('#sheet-zoom').addEventListener('click', () => setSheetZoom(Number($('#sheet-pages').dataset.zoom) % 3 + 1));
$('#sheet-dialog').addEventListener('close', () => { sheet?.release(); sheet = null; $('#sheet-pages').replaceChildren(); });
holdOn($('#sheet-scroll'), '*', HOLD_SHEET_MS, () => { vibrate(15); $('#sheet-dialog').close(); });
$('#sheet-scroll').addEventListener('contextmenu', event => event.preventDefault());
// Doppeltippen: größer und wieder zurück. Der Browser meldet auf dem iPhone kein „dblclick“, deshalb zählt die App zwei kurze Tipps selbst.
{
  let down = null, lastTap = null;
  const scroll = $('#sheet-scroll');
  scroll.addEventListener('pointerdown', event => { down = event.isPrimary ? { x: event.clientX, y: event.clientY, at: Date.now() } : null; if (!event.isPrimary) lastTap = null; });
  scroll.addEventListener('pointerup', event => {
    const start = down; down = null;
    if (!start || !event.isPrimary || Date.now() - start.at > 350 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) { lastTap = null; return; }
    if (lastTap && Date.now() - lastTap.at < 400 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) { lastTap = null; setSheetZoom(Number($('#sheet-pages').dataset.zoom) >= 2 ? 1 : 2); }
    else lastTap = { x: event.clientX, y: event.clientY, at: Date.now() };
  });
  scroll.addEventListener('pointercancel', () => { down = null; lastTap = null; });
}
// Die Auswahl „Rezept“ im Fenster „Gericht planen“: eine Liste statt einer Auswahlbox, damit sich ein Rezept lange drücken lässt
let pickPool = [], pickSignature = '';   // alle Rezepte, aus denen die Auswahl im Fenster „Gericht planen“ filtert
// Die Liste nach dem Filter: das gerade gewählte Rezept bleibt immer sichtbar (siehe recipe-filter.js); „Eigenes Gericht“ steht immer am Ende.
function renderPick() {
  const list = $('#recipe-pick'), form = $('#meal-form'), filter = $('#recipe-filter').value, choice = form.elements.recipeId.value;
  list.replaceChildren();
  const row = (value, title, meta, custom) => {
    const node = element('button', undefined, `pick-row${custom ? ' custom' : ''}`); node.type = 'button'; node.dataset.value = value;
    node.setAttribute('aria-pressed', String(value === choice));
    node.append(element('strong', title)); if (meta) node.append(element('small', meta));
    if (!custom) node.append(element('span','Auch per langem Drücken als PDF ansehen','pick-pdf-hint'));
    list.append(node);
  };
  // Bei „Lange nicht gekocht“ steht dabei, wie lange es her ist.
  const lastTime = recipe => {
    if (filter !== LONG_AGO) return '';
    const when = recipe.lastCookedAt ? relativeDay(recipe.lastCookedAt) : '';
    return !recipe.lastCookedAt ? ' · noch nie gekocht' : when === 'geplant' ? '' : ` · zuletzt ${when}`;
  };
  const shown = pickRecipes(pickPool, filter, { today: isoDate(), keep: choice, available:recipeAvailable });
  for (const recipe of shown) {
    const tracked=active(state.ingredients).some(item=>item.recipeId===recipe.id&&required(item)),missing=new Set(recipeStockMissing(recipe).map(item=>pantryKey(item.name))).size;
    const stock=tracked?`${missing} ${missing===1?'Produkt fehlt':'Produkte fehlen'} im Vorrat`:'Keine prüfbaren Zutaten';
    const kept=[WITH_PANTRY,WITH_SHOPPING].includes(filter)&&recipe.id===choice&&!recipeAvailable(recipe,filter)?' · ausgewählt, passt nicht zum Filter':'';
    row(recipe.id, `${recipe.favorite ? '★ ' : ''}${recipe.name}`, `${format(recipe.servings)} Portionen${lastTime(recipe)} · ${stock}${kept}`, false);
  }
  if (!shown.length) list.append(element('p', 'Kein Rezept dafür.', 'pick-empty'));
  row('__custom', 'Eigenes Gericht (ohne Rezept)', '', true);
  const hint=$('#recipe-filter-hint');
  hint.hidden=![WITH_PANTRY,WITH_SHOPPING].includes(filter);
  hint.textContent=hint.hidden?'':filter===WITH_PANTRY?'Alle nötigen Zutaten stehen im aktuellen Vorrat. Die Mengen werden nicht geprüft.':'Vorrat + offene Einkaufsliste: kochbar, sobald die Produkte eingekauft sind. Die Mengen werden nicht geprüft.';
  syncPickHint();
}
// Das Auswahlfeld für den Filter (Alle, Favoriten, Lange nicht gekocht, jedes Stichwort); mit nur einem Eintrag gibt es nichts zu filtern.
function recipePickSignature(recipes) { return JSON.stringify([namespace(),isoDate(),recipes,active(state.ingredients),cookableNames('shopping')]); }
function fillRecipePick(recipes, keepFilter = false) {
  pickPool = recipes;
  pickSignature = recipePickSignature(recipes);
  const select = $('#recipe-filter'), previous = keepFilter ? select.value : '', options = filterOptions(recipes, isoDate(),recipeAvailable);
  const groups = new Map(); select.replaceChildren();
  for (const option of options) {
    const node = element('option', `${option.label} (${option.count})`); node.value = option.value;
    if (!option.value) { select.append(node); continue; }
    const label = [WITH_PANTRY,WITH_SHOPPING].includes(option.value) ? 'Kochbarkeit' : option.value.startsWith('tag:') ? 'Rezeptgruppen' : 'Deine Auswahl';
    if (!groups.has(label)) { const group=element('optgroup');group.label=label;groups.set(label,group);select.append(group); }
    groups.get(label).append(node);
  }
  select.value = options.some(option=>option.value===previous) ? previous : ''; select.hidden = options.length < 2;
  renderPick();
}
function refreshRecipePick() {
  if (!$('#meal-dialog').open) return;
  const recipes=active(state.recipes).sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite))||a.name.localeCompare(b.name,'de'));
  if (recipePickSignature(recipes)===pickSignature) return;
  const list=$('#recipe-pick'), scroll=list.scrollTop, focused=document.activeElement.closest('#recipe-pick .pick-row')?.dataset.value;
  fillRecipePick(recipes,true); syncMealForm(false); list.scrollTop=scroll;
  if (focused) (Array.from(list.querySelectorAll('.pick-row')).find(row=>row.dataset.value===focused)||$('#recipe-filter')).focus({preventScroll:true});
}
$('#pick-preview').addEventListener('click', () => { const selected = $('#recipe-pick .pick-row[aria-pressed=true]:not(.custom)'); if (selected) openPickedSheet(selected); });
$('#recipe-filter').addEventListener('change', () => { renderPick(); $('#recipe-pick').scrollTop = 0; });
function syncPickHint() { const selected = $('#recipe-pick .pick-row[aria-pressed=true]:not(.custom)'); $('#recipe-pick-help').hidden = Boolean(selected); $('#pick-preview').disabled = !selected; }
function setRecipeChoice(value) {
  $('#meal-form').elements.recipeId.value = value;
  $('#recipe-pick').querySelectorAll('.pick-row').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.value === value)));
  syncPickHint();
}
let pickOpenedAt = 0, pickHeld = false, pickOrigin = null;   // Loslassen nach Halten oder Verschieben ändert keine Auswahl
function openPickedSheet(node) {
  const id = node.dataset.value;
  if (!id || id === '__custom') return;
  const form = $('#meal-form'), shown = form.elements.recipeId.value === id ? positive(form.elements.servings.value) : 0;   // gewählt: die eingestellten Portionen, sonst die des Rezepts
  pickOpenedAt = Date.now(); pickHeld = true; vibrate(15);
  guard(() => openSheet(id, shown));
}
$('#recipe-pick').addEventListener('pointerdown', event => { pickHeld = false; pickOrigin = { x:event.clientX, y:event.clientY }; }, true);
$('#recipe-pick').addEventListener('pointermove', event => {
  if(pickOrigin && Math.hypot(event.clientX-pickOrigin.x,event.clientY-pickOrigin.y)>10) pickHeld=true;
});
for(const type of ['pointerup','pointercancel']) $('#recipe-pick').addEventListener(type,()=>{pickOrigin=null;},true);
$('#recipe-pick').addEventListener('keydown', () => { pickHeld = false; }, true);
holdOn($('#recipe-pick'), '.pick-row', HOLD_ITEM_MS, openPickedSheet);
$('#recipe-pick').addEventListener('click', event => {
  const node = event.target.closest('.pick-row');
  if (!node) return;
  if (pickHeld) { pickHeld = false; event.preventDefault(); return; }
  setRecipeChoice($('#meal-form').elements.recipeId.value===node.dataset.value?'':node.dataset.value); syncMealForm(true);
});
// Mit der rechten Maustaste, dem Menü-Knopf der Tastatur oder (Android) langem Drücken meldet der Browser ein Kontextmenü: Das öffnet ebenfalls das Blatt.
$('#recipe-pick').addEventListener('contextmenu', event => {
  const node = event.target.closest('.pick-row');
  if (!node) return;
  event.preventDefault();
  if (Date.now() - pickOpenedAt > 900) openPickedSheet(node);
});

/* ---------- Kochmodus ---------- */
// Haken in Zutaten und Schritten gelten nur für dieses Öffnen der App; sie werden nicht gespeichert und nicht abgeglichen.
const cooked = new Map();
// Bildschirm anlassen (Wake Lock), getrennt für den Kochmodus und den Laden-Modus. Mehrfaches Anfordern ist harmlos.
const awake = { cook: { lock: null, wanted: false, failed: false, box: '#cook-awake', hint: '#cook-awake-hint' }, shop: { lock: null, wanted: false, failed: false, box: '#shop-awake', hint: '#shop-awake-hint' } };
async function keepAwake(name, on) {
  const entry = awake[name], hint = $(entry.hint);
  entry.wanted = on;
  if (!on) { try { await entry.lock?.release(); } catch { /* schon freigegeben */ } entry.lock = null; hint.textContent = ''; return; }
  if (entry.lock || entry.failed) return;   // nach einem Fehlschlag erst wieder, wenn die Person den Schalter erneut betätigt
  try {
    const lock = await navigator.wakeLock.request('screen');
    entry.lock = lock; lock.addEventListener('release', () => { if (entry.lock === lock) entry.lock = null; });
    hint.textContent = name === 'shop' ? '' : 'Der Bildschirm bleibt an, solange diese Ansicht offen ist.';   // im Laden steht die Liste im Mittelpunkt, kein Erklärtext
  } catch {
    entry.lock = null; entry.failed = true; $(entry.box).checked = false; entry.wanted = false;
    // Wer „Bildschirm anlassen“ nicht selbst eingeschaltet hat (Standard an), bekommt bei einem Fehlschlag keine Fehlermeldung, nur den abgewählten Haken.
    hint.textContent = name === 'shop' && config.shopScreenOn !== true ? '' : 'Geht gerade nicht. Stattdessen am Handy unter Anzeige & Helligkeit → Automatische Sperre eine längere Zeit wählen.';
  }
}
function openCook(id, servings) {
  const recipe = active(state.recipes).find(row => row.id === id);
  if (!recipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const factor = servings / recipe.servings, saved = cooked.get(id) || { ingredients: new Set(), steps: new Set() };
  cooked.set(id, saved);
  $('#cook-title').textContent = recipe.name; $('#cook-portions').textContent = `Für ${format(servings)} Portionen. Antippen hakt ab.`;
  const list = $('#cook-ingredients'); list.replaceChildren();
  for (const row of active(state.ingredients).filter(entry => entry.recipeId === id)) {
    const item = element('li'), label = element('label'), check = element('input'); check.type = 'checkbox'; check.checked = saved.ingredients.has(row.id);
    check.addEventListener('change', () => { if (check.checked) saved.ingredients.add(row.id); else saved.ingredients.delete(row.id); });
    label.append(check, element('span', ingredientLabel(row, factor))); item.append(label); list.append(item);
  }
  if (!list.children.length) list.append(element('li', 'Keine Zutaten eingetragen.', 'hint'));
  const steps = $('#cook-steps'); steps.replaceChildren();
  splitSteps(recipe.instructions).forEach((text, index) => {
    const step = element('button'), item = element('li'); step.type = 'button'; step.append(element('span', text));
    const mark = () => step.setAttribute('aria-pressed', String(saved.steps.has(index)));
    step.addEventListener('click', () => { if (saved.steps.has(index)) saved.steps.delete(index); else saved.steps.add(index); mark(); });
    mark(); item.append(step); steps.append(item);
  });
  if (!steps.children.length) steps.append(element('li', 'Keine Zubereitung eingetragen.', 'hint'));
  const supported = 'wakeLock' in navigator;
  $('#cook-awake-label').hidden = !supported; $('#cook-awake').checked = supported && config.cookAwake === true; $('#cook-awake-hint').textContent = '';
  $('#cook-done').onclick = () => guard(() => { commit([nextOp('recipes', id, { lastCookedAt: isoDate(), ...(String(recipe.lastCookedAt || '').slice(0, 10) === isoDate() || active(state.meals || []).some(meal => meal.recipeId === id && meal.date === isoDate()) ? {} : { cookCount: cookCount(recipe) + 1 }) })], `„${recipe.name}“ als heute gekocht notiert`); cooked.delete(id); $('#cook-dialog').close(); });
  $('#cook-dialog').showModal();
  if (supported && config.cookAwake === true) void keepAwake('cook', true);
}

/* ---------- Ausgaben ---------- */
// Wie viel ihr eingekauft habt: Beträge von Hand oder aus einem Kassenbon-Foto/-Screenshot (Texterkennung auf dem Gerät, immer zur Kontrolle im Feld).
// Die Einträge liegen in der gemeinsamen Datei (Sammlung `purchases`) und sind für beide Personen sichtbar.
let spendMonth = monthOf(isoDate()), purchaseAbort = null, purchaseSource = 'hand', purchaseEditing = null, purchaseScope = '', budgetScope = '';
const purchaseRows = () => active(state.purchases || []);
// Die Person gehört zum Einkauf, nicht zum Gerät, das ihn später bearbeitet.
// Die lokale Zuordnung gilt nur für diese Datendatei; Umbenennen bewahrt ihre feste ID.
function ownExpenseMember() {
  if (!config.actor?.trim()) return null;
  return ownMember(state.members || [], config.actor, config.memberScope === namespace() ? config.memberId : '');
}
function rememberOwnBuyer(id) {
  const own = ownExpenseMember();
  if (own?.id === id && (config.memberId !== id || config.memberScope !== namespace())) saveConfig({ ...config, memberId: id, memberScope: namespace() });
}
function purchaseBuyer(id, original = null) {
  if (!id) return { id: null, name: '', change: null };
  const member = liveMembers(state.members).find(row => row.id === id);
  if (member) return { id, name: member.name, change: null };
  const own = ownExpenseMember(); if (own?.id === id) return own;
  if (original?.buyerId === id) return { id, name: original.buyerName || '', change: null };
  throw new Error('Diese Person ist nicht mehr vorhanden. Bitte erneut auswählen.');
}
const budgetCents = () => active(state.budgets || []).find(row => row.id === 'monthly')?.cents || 0;
// Kurzer Zusatz für die Meldung nach dem Speichern: ab 80 % des Budgets („85 % des Budgets verbraucht“, „Budget um 12,30 € überschritten“).
function budgetNote(total) {
  const status = budgetStatus(total, budgetCents());
  return !status || status.level === 'ok' ? '' : status.level === 'over' ? ` · Budget um ${euros(-status.left)} überschritten` : ` · ${status.percent} % des Budgets verbraucht`;
}
// Summe des Monats nach dem Speichern eines Betrags (beim Ändern ohne den alten Betrag). Restaurant/Café/Bar nur, wenn es zum Budget zählt (2.170).
const monthTotalWith = (month, cents, replacing = null) => purchaseRows().filter(row => monthOf(row.date) === month && row.id !== replacing?.id && (diningCountsNow() || !isDining(row))).reduce((sum, row) => sum + purchaseValue(row), 0) + cents;
const diningCountsNow = () => diningCounts(state.budgets);
function renderBudget(spent, dining = null) {
  const box = $('#spending-budget'), budget = budgetCents(), status = budgetStatus(spent, budget);
  box.replaceChildren();
  if (!status) { box.append(element('p', 'Noch kein Monatsbudget. Lege fest, wie viel ihr im Monat ausgeben wollt; die App zeigt dann, wie viel noch übrig ist.', 'hint empty-budget-text'), button('Monatsbudget festlegen', openBudget, 'text-button')); box.classList.add('empty-budget'); return; }
  box.classList.remove('empty-budget');
  const head = element('div', undefined, 'spend-budget-head'), copy = element('div');
  copy.append(element('strong', `Budget ${euros(budget)}`), element('small', status.left >= 0 ? `${status.percent} % verbraucht · noch ${euros(status.left)}` : `${euros(-status.left)} über dem Budget (${status.percent} %)`, `budget-${status.level}`));
  head.append(copy, iconButton('edit', 'Monatsbudget ändern', openBudget));
  const bar = element('div', undefined, 'spend-share'), fill = element('span', undefined, `budget-fill ${status.level}`);
  fill.style.width = `${Math.min(100, Math.max(2, status.percent))}%`; bar.append(fill);
  bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(Math.min(100, status.percent)));
  bar.setAttribute('aria-label', `Budget zu ${status.percent} Prozent verbraucht`);
  box.append(head, bar);
  // Restaurant/Café/Bar ohne Haken „Zählt zum Monatsbudget“ (2.170): sagen, was herausgerechnet ist
  if (dining?.total && !dining.counts) box.append(element('small', `Ohne Restaurant/Café/Bar (${euros(dining.total)}): zählt nicht zum Budget`, 'spend-budget-dining'));
}
function openBudget() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const form = $('#budget-form'), budget = budgetCents();
  form.reset(); message(); budgetScope = namespace(); form.elements.amount.value = budget && budget % 100 === 0 ? String(budget / 100) : '';
  const previous = $('#budget-existing-hint');
  previous.hidden = budget % 100 === 0;
  previous.textContent = previous.hidden ? '' : `Bisheriges Budget: ${euros(budget)}. Bitte lege einen vollen Eurobetrag fest.`;
  $('#budget-remove').hidden = !budget;
  $('#budget-dialog').showModal();
  // Bestehendes Budget (2.147): Speichern erst nach einer Änderung; ein neues Budget wie bisher.
  if (budget) armDirty(form, { savedAt: (state.budgets || []).find(row => row.id === 'monthly')?.updatedAt }); else disarmDirty(form);
}
function saveBudget() {
  if (budgetScope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte das Budget erneut öffnen.');
  const cents = parseBudgetAmount($('#budget-form').elements.amount.value);
  commit([nextOp('budgets', 'monthly', { cents })], `Monatsbudget ${euros(cents)} gespeichert`);
  $('#budget-dialog').close();
}
function renderSpending() {
  const own = ownExpenseMember();
  // Nur eine lokale Profilpräferenz merken, keine Person oder Ausgabe im Hintergrund anlegen.
  // So folgt auch das zweite Gerät einer späteren Umbenennung derselben Person.
  if (own && !own.change && (config.memberId !== own.id || config.memberScope !== namespace() || config.actor !== own.name)) {
    try {
      const previousName = config.actor, nameField = $('#settings-form').elements.actor;
      saveConfig({ ...config, actor: own.name, memberId: own.id, memberScope: namespace() });
      if (nameField.value === previousName && document.activeElement !== nameField) nameField.value = own.name;
      $('#identity').textContent = own.name; updateSaveButtons();
    } catch { /* Bei vollem Speicher bleibt die lesbare Ausgabenansicht benutzbar. */ }
  }
  const diningOn = diningCountsNow(); $('#dining-budget').checked = diningOn;
  $('#dining-budget-state').textContent = diningOn ? 'Ja: wird vom Monatsbudget abgezogen' : 'Nein: Monatsbudget bleibt unberührt, Beträge nur in der Übersicht';
  // Zugeklappt steht der Stand unauffällig in der Klappleiste (2.172)
  $('#dining-budget-short').textContent = diningOn ? 'Ja' : 'Nein'; $('#dining-budget-details > summary').dataset.counts = String(diningOn);
  spendingView?.render();
}
function purchaseStatus(text, fraction) {
  $('#purchase-status').textContent = text;
  $('#purchase-progress').hidden = fraction === undefined; if (fraction !== undefined) $('#purchase-progress').value = Math.round(fraction * 100);
}
function openPurchase(id = '') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const row = id ? purchaseRows().find(entry => entry.id === id) : null;
  if (id && !row) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  const form = $('#purchase-form'), select = form.elements.storeId;
  form.reset(); message(); purchaseStatus('');
  purchaseEditing = row ? clone(row) : null; purchaseSource = row?.source || 'hand'; purchaseScope = namespace();
  // Der ausgewählte Laden geht vor; andernfalls den letzten eigenen Einkauf vorschlagen.
  const ownId = spendingView.defaultBuyer(), latest = purchaseRows().filter(entry => entry.buyerId === ownId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  storeOptions(select, row ? row.storeId || '' : viewStore()?.id || latest?.storeId || '', true, Boolean(row));
  spendingView.fillBuyer(form.elements.buyerId, row ? row.buyerId || '' : ownId, row?.buyerName || '');
  form.elements.kind.value = row?.kind || 'purchase'; $('#purchase-more').open = row?.kind === 'refund';
  // Geschäft inzwischen gelöscht: der gemerkte Name bleibt wählbar, damit er beim Ändern nicht verloren geht.
  if (row?.storeId && row.storeName && ![...select.options].some(option => option.value === row.storeId)) { select.add(new Option(`${row.storeName} (gelöscht)`, row.storeId)); select.value = row.storeId; }
  form.elements.rowId.value = row?.id || '';
  form.elements.amount.value = row ? formatAmount(row.cents) : '';
  form.elements.date.value = row?.date || isoDate();
  expenseCategoryPicker.open(row || null);
  $('#purchase-title').textContent = row ? 'Ausgabe bearbeiten' : 'Ausgabe eintragen';
  $('#purchase-delete').hidden = !row;

  $('#purchase-dialog').showModal();
  if (row) armDirty(form, { savedAt: row.updatedAt, buttons: [$('#purchase-save'), $('#purchase-plus')] }); else disarmDirty(form);
  // Wie beim Monatsbudget: Die Tastatur öffnet sich erst, wenn das Betragsfeld angetippt wird.
  $('#purchase-dialog [data-close]').focus({ preventScroll: true });
}
// Foto oder Screenshot eines Kassenbons: Text erkennen, Summe/Datum/Geschäft als Vorschlag in die Felder eintragen. Gespeichert wird erst mit „Speichern“.
async function readPurchasePhoto(files) {
  if (!files.length || purchaseAbort) return;
  const form = $('#purchase-form'); message();
  purchaseAbort = new AbortController();
  try {
    const { recognizeImages } = await import('./ocr.js');
    const raw = await recognizeImages(files, (fraction, label) => purchaseStatus(label, fraction), purchaseAbort.signal, 'den Betrag von Hand eingeben');
    if (!raw) throw new Error('Im Bild wurde kein Text erkannt. Bitte einen schärferen Ausschnitt wählen oder den Betrag von Hand eingeben.');
    const parsed = parseReceipt(raw), found = receiptAmount(parsed);
    if (!found) throw new Error('Im Bild wurde kein Betrag gefunden. Bitte einen Ausschnitt mit der Summe wählen oder den Betrag von Hand eingeben.');
    purchaseSource = 'bon';
    form.elements.amount.value = formatAmount(found.cents);
    if (parsed.date) form.elements.date.value = parsed.date;
    const chainStore = storeForChain(parsed.chain, orderedStores(state.stores));
    if (chainStore) form.elements.storeId.value = chainStore;
    purchaseStatus(found.how === 'bon' ? `Erkannt: Summe ${euros(found.cents)}. Bitte mit dem Kassenbon vergleichen.` :
      `Keine Summe gefunden. Die erkannten Zeilen ergeben ${euros(found.cents)} (vielleicht fehlen Zeilen). Bitte prüfen und korrigieren.`);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    purchaseStatus(''); message(error.message);
  } finally { purchaseAbort = null; $('#purchase-progress').hidden = true; form.elements.images.value = ''; refreshDirty(form); }   // erkannte Werte zählen als Änderung
}
// Mögliches Doppel: Am gleichen Tag steht schon ein Einkauf mit gleichem Betrag im gleichen Geschäft. Beim ersten Versuch wird gewarnt und nichts gespeichert; der zweite Versuch mit
// denselben Angaben speichert (es kann ja wirklich ein zweiter Einkauf sein). `warned` merkt sich die Angaben der Warnung.
let duplicateWarned = '';
function duplicateWarning(fields, ignoreId, how) {
  const twin = duplicatePurchase(purchaseRows(), fields, ignoreId);
  if (!twin) { duplicateWarned = ''; return; }
  const key = `${fields.date}|${fields.cents}|${fields.storeId || ''}|${fields.kind || 'purchase'}`;
  if (duplicateWarned === key) { duplicateWarned = ''; return; }
  duplicateWarned = key;
  const store = storeNameOf(twin, orderedStores(state.stores));
  const what = isDining(twin) ? 'Besuch' : 'Einkauf';
  throw new Error(`Möglicherweise doppelt: Am ${spendDay(twin.date)} steht schon ein ${what} über ${euros(twin.cents)}${store ? ` ${isDining(twin) ? 'in' : 'bei'} ${store}` : ''}${twin.buyerId ? ` (von ${buyerNameOf(twin, state.members)})` : ''}. War es ein zweiter ${what}, ${how} noch einmal.`);
}
function savePurchase() {
  const form = $('#purchase-form'), id = form.elements.rowId.value, editing = purchaseEditing, storeId = form.elements.storeId.value;
  if (purchaseScope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte den Eintrag erneut öffnen.');
  if (purchaseAbort) throw new Error('Die Texterkennung läuft noch. Bitte kurz warten.');
  const current = id ? purchaseRows().find(row => row.id === id) : null;
  if (id && !current) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  const buyer = purchaseBuyer(form.elements.buyerId.value, editing);
  const storeName = active(state.stores).find(store => store.id === storeId)?.name || (editing?.storeId === storeId ? editing.storeName || '' : '');
  const fields = { storeId: '', storeName: '', ...purchaseFields({ amount: form.elements.amount.value, date: form.elements.date.value, storeId, storeName,
    ...expenseCategoryPicker.fields(), source: purchaseSource, kind: form.elements.kind.value, buyerId: buyer.id, buyerName: buyer.name }, isoDate()) };
  // Nur tatsächlich bearbeitete Felder senden: Ein fremdes Gerät kann währenddessen
  // z. B. die Person korrigieren, ohne dass unsere reine Betragsänderung sie überschreibt.
  let patch = fields;
  if (editing) {
    const prior = { storeId: '', storeName: '', source: 'hand', note: '', kind: 'purchase', ...editing, buyerId: editing.buyerId || null, buyerName: editing.buyerName || '' };
    patch = Object.fromEntries(Object.entries(fields).filter(([key, value]) => key !== 'buyerName' && value !== prior[key]));
    if (!expenseCategoryPicker.changed()) { delete patch.note; delete patch.categoryId; }
    if (fields.storeId === prior.storeId) delete patch.storeName;
    if (fields.buyerId !== prior.buyerId) patch.buyerName = fields.buyerName;
    if (!Object.keys(patch).length) { $('#purchase-dialog').close(); return; }
  }
  const effective = { ...current, ...patch };
  duplicateWarning(effective, id, editing ? 'tippe auf „Änderungen speichern“' : 'tippe auf „Speichern“');
  const ops = [...(buyer.change && effective.buyerId === buyer.id ? [nextOp('members', buyer.id, buyer.change.patch)] : []), nextOp('purchases', id || uid(), patch)];
  const notice = `${euros(purchaseValue(effective))} unter Ausgaben gespeichert${budgetNote(monthTotalWith(monthOf(effective.date), purchaseValue(effective), current))}`;
  if (effective.buyerId === buyer.id) rememberOwnBuyer(buyer.id);
  commit(ops, notice); spendingView.reveal(effective); renderSpending(); $('#purchase-dialog').close();
}

/* ---------- Restaurant/Café/Bar (2.170) ---------- */
// Auswärts essen und trinken mit wenigen Tipps: Art (Restaurant oder Getränke, Restaurant ist vorgewählt), Betrag, auf Wunsch das Lokal (zuletzt besuchte zum Antippen).
// Datum, Uhrzeit und die eigene Person sind vorbelegt. Gespeichert wird eine normale Ausgabe mit `dining`; der Haken „Zählt zum Monatsbudget“
// unter „Ausgaben“ entscheidet für die ganze Familie, ob diese Beträge vom Budget abgehen. In der Übersicht stehen sie immer.
let diningScope = '', diningEditing = null;
const clockNow = () => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; };
function renderDiningPlaces() {
  const form = $('#dining-form'), box = $('#dining-places'), places = diningPlaces(purchaseRows()), typed = form.elements.place.value.trim().toLocaleLowerCase('de');
  box.replaceChildren(); box.hidden = !places.length;
  for (const place of places) {
    const chip = button(place.name, () => {
      form.elements.place.value = place.name; form.elements.kind.value = place.kind;
      renderDiningPlaces(); syncDiningKind(); refreshDirty(form);
    }, 'chip dining-place');
    chip.setAttribute('aria-pressed', String(place.name.toLocaleLowerCase('de') === typed));
    box.append(chip);
  }
}
/* Bewertung (2.174): nur bei Restaurant, zugeklappt eine Zeile wie die übrigen Felder (mit Sternen, sobald bewertet). Aufgeklappt fünf große
   Sterne ohne Tastatur; ein Tipp auf den gewählten Stern nimmt die Bewertung zurück. Dazu eine kurze Notiz. Unter dem Lokal zeigt ein kleiner
   Hinweis, wie es beim letzten Besuch dort bewertet wurde. Alles ist eine interne Notiz und ändert weder Summen noch Budget. */
const starsLabel = stars => `${stars} von 5 Sternen (${RATING_MEANING[stars]})`;
function paintStars(target, stars) {
  target.replaceChildren(element('span', '★'.repeat(stars), 'stars-on'), element('span', '☆'.repeat(5 - stars), 'stars-off'));
  target.setAttribute('aria-label', starsLabel(stars)); target.setAttribute('role', 'img');
}
function renderDiningRating() {
  const form = $('#dining-form'), stars = Number(form.elements.rating.value) || 0, value = $('#dining-rating-value');
  for (const star of $('#dining-rating').querySelectorAll('.dining-star')) {
    const own = Number(star.dataset.value); star.classList.toggle('on', own <= stars); star.setAttribute('aria-pressed', String(own === stars));
  }
  if (stars) paintStars(value, stars); else { value.replaceChildren(); value.removeAttribute('aria-label'); value.removeAttribute('role'); }
}
function setDiningRating(stars) {
  const field = $('#dining-form').elements.rating;
  field.value = stars ? String(stars) : ''; field.dispatchEvent(new Event('input', { bubbles: true }));
  renderDiningRating();
}
function openDiningRating(open) {
  $('#dining-rating-panel').hidden = !open; $('#dining-rating-toggle').setAttribute('aria-expanded', String(open));
}
function renderLastRating() {
  const form = $('#dining-form'), hint = $('#dining-last-rating'), restaurant = form.elements.kind.value === 'restaurant';
  const last = restaurant ? lastRating(purchaseRows(), form.elements.place.value, form.elements.rowId.value) : null;
  hint.hidden = !last; hint.replaceChildren();
  if (!last) return;
  const stars = element('span', undefined, 'dining-last-stars'); paintStars(stars, last.rating);
  hint.append('Zuletzt: ', stars);
  if (last.ratingNote) hint.append(element('span', ` · ${last.ratingNote}`, 'dining-last-note'));
}
// Bewertung nur bei Restaurant: Bei „Getränke“ verschwinden Bewertung und Hinweis (eine eingegebene Bewertung wird dann nicht gespeichert)
function syncDiningKind() {
  const restaurant = $('#dining-form').elements.kind.value === 'restaurant';
  $('#dining-rating').hidden = !restaurant; renderLastRating();
}
function openDining(id = '') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const row = id ? purchaseRows().find(entry => entry.id === id) : null;
  if (id && !row) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  const form = $('#dining-form');
  form.reset(); message(); duplicateWarned = '';
  diningEditing = row ? clone(row) : null; diningScope = namespace();
  form.elements.rowId.value = row?.id || '';
  form.elements.kind.value = row ? diningKind(row).id : 'restaurant';
  form.elements.amount.value = row ? formatAmount(row.cents) : '';
  form.elements.place.value = row?.storeName || '';
  form.elements.date.value = row?.date || isoDate();
  form.elements.time.value = row ? row.time || '' : clockNow();
  form.elements.rating.value = hasRating(row) && diningKind(row).id === 'restaurant' ? String(row.rating) : '';
  form.elements.ratingNote.value = row?.ratingNote || '';
  spendingView.fillBuyer(form.elements.buyerId, row ? row.buyerId || '' : spendingView.defaultBuyer(), row?.buyerName || '');
  renderDiningPlaces(); openDiningRating(false); renderDiningRating(); syncDiningKind();
  $('#dining-budget-note').textContent = diningCountsNow() ? 'Zählt zum Monatsbudget.' : 'Zählt nicht zum Monatsbudget (Haken unter „Ausgaben“). In der Übersicht „Restaurant/Café/Bar“ steht der Betrag trotzdem.';
  $('#dining-title').textContent = row ? 'Restaurant/Café/Bar bearbeiten' : DINING_LABEL;
  $('#dining-delete').hidden = !row;
  $('#dining-dialog').showModal();
  if (row) armDirty(form, { savedAt: row.updatedAt, buttons: [$('#dining-save')] }); else disarmDirty(form);
  // Wie bei „Ausgabe eintragen“: Die Tastatur öffnet sich erst, wenn das Betragsfeld angetippt wird.
  $('#dining-dialog [data-close]').focus({ preventScroll: true });
}
function saveDining() {
  const form = $('#dining-form'), id = form.elements.rowId.value, editing = diningEditing;
  if (diningScope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte den Eintrag erneut öffnen.');
  const current = id ? purchaseRows().find(row => row.id === id) : null;
  if (id && !current) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  const buyer = purchaseBuyer(form.elements.buyerId.value, editing);
  const fields = diningFields({ amount: form.elements.amount.value, date: form.elements.date.value, time: form.elements.time.value, kind: form.elements.kind.value,
    place: form.elements.place.value, buyerId: buyer.id, buyerName: buyer.name, rating: form.elements.rating.value, ratingNote: form.elements.ratingNote.value }, isoDate());
  // Ohne Bewertung bekommt ein neuer Eintrag keine leeren Felder; beim Ändern löscht null bzw. '' eine frühere Bewertung
  if (!editing) { if (fields.rating === null) delete fields.rating; if (!fields.ratingNote) delete fields.ratingNote; }
  let patch = fields;
  if (editing) {
    const prior = { storeName: '', time: '', note: '', source: 'hand', ...editing, rating: hasRating(editing) ? editing.rating : null, ratingNote: editing.ratingNote || '', buyerId: editing.buyerId || null, buyerName: editing.buyerName || '' };
    patch = Object.fromEntries(Object.entries(fields).filter(([key, value]) => key !== 'buyerName' && value !== prior[key]));
    if (fields.buyerId !== prior.buyerId) patch.buyerName = fields.buyerName;
    if (!Object.keys(patch).length) { $('#dining-dialog').close(); return; }
  }
  const effective = { ...current, ...patch };
  duplicateWarning(effective, id, editing ? 'tippe auf „Änderungen speichern“' : 'tippe auf „Speichern“');
  const ops = [...(buyer.change && effective.buyerId === buyer.id ? [nextOp('members', buyer.id, buyer.change.patch)] : []), nextOp('purchases', id || uid(), patch)];
  const where = effective.storeName ? ` · ${effective.storeName}` : '';
  const notice = `${euros(effective.cents)} ${diningKind(effective).label}${where}${hasRating(effective) ? ` ${ratingStars(effective.rating)}` : ''} gespeichert${diningCountsNow() ? budgetNote(monthTotalWith(monthOf(effective.date), effective.cents, current)) : ' · zählt nicht zum Budget'}`;
  if (effective.buyerId === buyer.id) rememberOwnBuyer(buyer.id);
  commit(ops, notice); spendingView.reveal(effective); renderSpending(); $('#dining-dialog').close();
}
// Eine Ausgabe löschen (Einkauf oder Restaurant/Café/Bar): in den Papierkorb, unten „Rückgängig“.
function dropPurchase(row) {
  removeRows('purchases', [row.id]); const scope = namespace();
  showNotice(`${euros(row.cents)} gelöscht`, () => undoDelete([row.id], scope, 'purchases'), { trash: true });
}
function setDiningBudget(counts) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (counts === diningCountsNow()) return;
  commit([nextOp('budgets', 'dining', { cents: 0, counts })], counts ? 'Restaurant/Café/Bar zählt jetzt zum Monatsbudget' : 'Restaurant/Café/Bar zählt nicht mehr zum Monatsbudget');
}

/* ---------- Vorrat ---------- */
// Gemerkte Namen (Sammlung `aliases`): bestätigte Schreibweisen („Zwiebel“ → „Zwiebeln“) und behaltene Zuordnungen wirken; falsche lassen sich hier entfernen.
// Fragwürdige alte Zuordnungen (Text vom Kassenbon, siehe aliasKind in data.js) wirken nicht und stehen darunter zur Prüfung: behalten oder entfernen.
function renderAliases() {
  const list = $('#alias-list'), doubtList = $('#alias-doubt-list'); list.replaceChildren(); doubtList.replaceChildren();
  const rows = active(state.aliases || []).sort((a, b) => a.from.localeCompare(b.from, 'de')), applied = rows.filter(aliasApplies), doubtful = rows.filter(row => !aliasApplies(row));
  $('#alias-count').textContent = [applied.length ? ` (${applied.length})` : '', doubtful.length ? ` · ${doubtful.length} prüfen` : ''].join('');
  if (!applied.length) list.append(element('li', 'Noch nichts gemerkt.', 'empty'));
  for (const row of applied) {
    const entry = element('li'); entry.append(element('span', `${row.from} → ${row.name}`), iconButton('x', `Zuordnung ${row.from} zu ${row.name} entfernen`, () => removeRows('aliases', [row.id])));
    list.append(entry);
  }
  $('#alias-doubt').hidden = !doubtful.length;
  for (const row of doubtful) {
    const entry = element('li'), keep = button('Behalten', () => commit([nextOp('aliases', row.id, { confirmed: true })], `„${row.from}“ bleibt „${row.name}“`), 'secondary small');
    keep.setAttribute('aria-label', `Zuordnung ${row.from} zu ${row.name} behalten`);
    entry.append(element('span', `${row.from} → ${row.name}`), keep, iconButton('x', `Zuordnung ${row.from} zu ${row.name} entfernen`, () => removeRows('aliases', [row.id])));
    doubtList.append(entry);
  }
}
function renderPantry() {
  pantryBuyer?.refresh();
}
function scheduleStockRefresh(){
  clearTimeout(stockClockTimer);const at=nextStockBoundary(state);
  if(at!==null)stockClockTimer=setTimeout(()=>{if(!document.hidden)refreshTimedStock();},Math.max(10,Math.min(2147483000,at-Date.now()+5)));
}
function recipeStockSignature(){return JSON.stringify([localDay(),[...pantryKeys(state.pantry)].sort()]);}
function refreshTimedStock(){
  renderPantry();if(recipeAvailabilitySnapshot!==recipeStockSignature())renderRecipesWhenVisible();productPicker?.refresh();
  if($('#plan-recipe-dialog').open)renderPlanRecipe();
  if($('#cookable-dialog').open)renderCookable();
  refreshRecipePick();
  if($('#transfer-dialog').open)updateTransfer();
  scheduleStockRefresh();
}

/* ---------- Vorlagen ---------- */
const templateRows = () => active(state.templates || []).sort((a, b) => a.name.localeCompare(b.name, 'de'));
const templateSource = () => visibleItems(true).filter(item => inView(item) && !item.checked);
function renderTemplates() {
  const list = $('#template-list'); list.replaceChildren();
  const rows = templateRows();
  if (!rows.length) list.append(element('li', 'Noch keine Vorlage.', 'empty'));
  for (const row of rows) {
    const entry = element('li'), copy = element('span');
    copy.append(element('strong', row.name), element('small', `${row.items.length} Artikel`));
    entry.append(copy, button('Auf die Liste', () => useTemplate(row.id), 'small'),
      iconButton('trash', `Vorlage „${row.name}“ löschen`, () => removeRows('templates', [row.id]), 'danger'));
    list.append(entry);
  }
  const source = templateSource(), store = viewStore();
  $('#template-hint').textContent = source.length
    ? `Gespeichert werden die ${source.length} offenen Artikel von „${store ? store.name : view === 'none' ? 'Ohne Geschäft' : 'Alle Geschäfte'}“ mit Menge und Geschäft.`
    : 'Gerade stehen keine offenen Artikel auf der Liste.';
  $('#template-form').querySelector('button').disabled = !source.length;
}
function useTemplate(id) {
  const row = active(state.templates || []).find(entry => entry.id === id);
  if (!row) throw new Error('Diese Vorlage wurde inzwischen gelöscht.');
  const stores = new Set(orderedStores(state.stores).map(store => store.id)), groups = new Map();
  for (const item of row.items) {
    const key = item.storeId && stores.has(item.storeId) ? item.storeId : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name: item.name, quantity: item.quantity, unit: item.unit });
  }
  const ops = [], total = { added: 0, counted: 0, skipped: 0 };
  for (const [storeId, rows] of groups) {
    lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
    const result = addToList(reuseProductNames(rows,listItems(),storeId), storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), listItems(), itemHistory());
    ops.push(...result.ops); total.added += result.added; total.counted += result.counted.length; total.skipped += result.skipped;
  }
  if (!ops.length) throw new Error('Alles davon steht schon auf der Liste.');
  const parts = [total.added && `${total.added} neu`, total.counted && `${total.counted} dazugezählt`, total.skipped && `${total.skipped} schon vorhanden`].filter(Boolean);
  commit(ops, `„${row.name}“: ${parts.join(', ')}`);
  $('#template-dialog').close();
}
$('#open-templates').addEventListener('click', () => guard(() => { renderTemplates(); $('#template-dialog').showModal(); }));
$('#template-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, name = form.elements.name.value.trim().replace(/\s+/g, ' '), source = templateSource();
  if (!name) throw new Error('Bitte einen Namen eingeben.');
  if (!source.length) throw new Error('Es gibt keine offenen Artikel zum Speichern.');
  if (source.length > 80) throw new Error('Eine Vorlage nimmt höchstens 80 Artikel auf. Bitte erst die Ansicht auf ein Geschäft eingrenzen.');
  const items = source.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, ...(item.purchaseUnit!==undefined?{purchaseUnit:item.purchaseUnit,purchaseMeasure:item.purchaseMeasure,purchaseAt:item.purchaseAt}:{}), ...(item.storeId ? { storeId: item.storeId } : {}) }));
  const same = templateRows().find(entry => entry.name.toLowerCase() === name.toLowerCase());
  commit([same ? nextOp('templates', same.id, { items }) : nextOp('templates', uid(), { name, items })], `Vorlage „${same?.name || name}“ gespeichert (${items.length} Artikel)`);
  form.reset(); renderTemplates();
}); });

/* ---------- Datenumfang ---------- */
const kb = bytes => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const entries = removed => removed.items + removed.recipes + removed.ingredients + removed.stores + removed.prices + removed.meals + removed.pantry + removed.aliases + removed.templates + removed.purchases + removed.budgets;
function noteCompaction(result) {
  $('#storage-note').textContent = !result?.changed ? 'Es gab nichts aufzuräumen.' :
    `Aufgeräumt: ${entries(result.removed)} Einträge entfernt, ${kb(result.before - result.after)} gespart.`;
}
function renderStorage() {
  restoreController?.refreshRecovery();
  if ($('#settings').hidden) return;
  const bytes = sizeOf(state), percent = Math.min(100, Math.round(bytes * 100 / LIMIT_BYTES));
  let result = null; try { result = compact(state); } catch { /* Anzeige ist optional */ }
  $('#storage-bar').value = percent;
  $('#storage-text').textContent = `${kb(bytes)} von ${kb(LIMIT_BYTES)} belegt (${percent} %)`;
  $('#storage-hint').textContent = result?.changed ? `Aufräumbar: ${entries(result.removed)} Einträge, etwa ${kb(result.before - result.after)}.` : 'Nichts zum Aufräumen.';
  $('#clean-photos').hidden = !connected();
  renderDeviceStorage();
}
/* Browserspeicher dieses Geräts (localStorage, meist rund 5 MB je Adresse): Familiendaten mit Warteschlange, Tagesverlauf und übrige Merkzettel. */
function renderDeviceStorage() {
  const sizes = { data: 0, daily: 0, other: 0 };
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index), bytes = ((localStorage.getItem(key) || '').length + key.length) * 2;
      sizes[key.startsWith('einkauf-data-v1:') || key === 'einkauf-demo-v1' ? 'data' : key.startsWith('einkauf-daily:') ? 'daily' : 'other'] += bytes;
    }
  } catch { $('#device-storage').textContent = ''; return; }
  const mb = bytes => bytes < 102400 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(bytes / 1048576)} MB`;
  const total = sizes.data + sizes.daily + sizes.other;
  $('#device-storage').textContent = `Auf diesem Gerät belegt: ${mb(total)} von meist etwa 5 MB (Daten und Warteschlange ${mb(sizes.data)}, Tagesverlauf ${mb(sizes.daily)}, Sonstiges ${mb(sizes.other)}).`;
  $('#clear-daily-history').hidden = sizes.daily < 2048;
}
$('#clear-daily-history').addEventListener('click', () => guard(async () => {
  if (!await ask({ title: 'Älteren Tagesverlauf löschen?', message: 'Der Tagesverlauf früherer Tage wird auf diesem Gerät gelöscht. Die heutigen Rezepte des Tages und deine Rezeptsammlung bleiben erhalten.', confirmLabel: 'Löschen', danger: true })) return;
  const current = loadDaily(); current.history = []; saveDaily(); renderDeviceStorage(); showNotice('Älterer Tagesverlauf gelöscht');
}));
function compactNow() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (connected()) { compactRequested = true; $('#storage-note').textContent = 'Räume auf …'; return sync(true); }
  const result = compact(state);
  if (result.changed) saveLocal(result.data, []);
  noteCompaction(result); render();
}
// Fotodateien im Daten-Repository, auf die kein Rezept mehr verweist (ersetzte, entfernte, mit dem Rezept gelöschte Fotos).
// Vorsicht: Das zweite Gerät lädt ein Foto hoch, bevor seine Rezeptänderung hier ankommt. Deshalb: ein ausdrücklich geglückter Abgleich vorher und noch einmal
// nach der Rückfrage, und Fotos, die jünger als 24 Stunden sind (oder deren Alter GitHub nicht verrät), bleiben stehen.
const PHOTO_GRACE_MS = 24 * 3600000;
async function freshSync() {
  const started = Date.now();
  await sync(true);
  if (pending.length) throw new Error('Es warten noch Änderungen. Bitte zuerst abgleichen (grüner Punkt oben).');
  if (lastSyncAt < started) throw new Error('Der Abgleich hat gerade nicht geklappt. Es wird nichts gelöscht. Bitte später erneut versuchen.');
}
async function photoIsOld(file) {
  try {
    const response = await timed(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/commits?sha=${encodeURIComponent(config.branch)}&per_page=1&path=${encodeURIComponent(`${photosDir(config.path)}/${file.name}`)}`,
      { headers: githubHeaders({ Accept: 'application/vnd.github+json' }) });
    if (!response.ok) return false;
    const date = Date.parse((await response.json())?.[0]?.commit?.committer?.date);
    return Number.isFinite(date) && Date.now() - date > PHOTO_GRACE_MS;
  } catch { return false; }
}
async function cleanPhotos() {
  if (!connected()) return;
  if (busy || restoring) throw new Error('Bitte den laufenden Abgleich oder die Wiederherstellung kurz abwarten.');
  await freshSync();
  const note = $('#storage-note'); note.textContent = 'Prüfe Fotos …';
  const response = await timed(`${photosApi()}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders({ Accept: 'application/vnd.github+json' }) });
  if (response.status === 404) { note.textContent = 'Es gibt keine Fotos im Daten-Repository.'; return; }
  if (!response.ok) throw new Error(`GitHub meldet Fehler ${response.status}. Bitte später erneut versuchen.`);
  const used = retainedPhotoIds(localStorage,usedPhotos());
  if (!used) throw new Error('Ein gespeicherter Datenstand ist nicht lesbar. Die Foto-Bereinigung wurde zum Schutz der Sicherungen gestoppt.');
  const files = (await response.json()).filter(file => file.type === 'file' && /^[A-Za-z0-9-]{8,64}\.jpg$/.test(file.name));
  const orphans = files.filter(file => !used.has(file.name.slice(0, -4)));
  if (!orphans.length) { note.textContent = 'Alle Fotos werden noch verwendet.'; return; }
  const old = [];
  for (const file of orphans) if (await photoIsOld(file)) old.push(file);
  const young = orphans.length - old.length;
  if (!old.length) { note.textContent = `${young} ungenutzte Fotos sind noch neu (unter 24 Stunden) und bleiben vorerst.`; return; }
  const size = old.reduce((sum, file) => sum + (file.size || 0), 0);
  if (!await ask({ title: 'Ungenutzte Fotos löschen?', message: `${old.length} nicht mehr verwendete Fotos (${kb(size)}) werden endgültig gelöscht.${young ? `\n\n${young} neuere bleiben vorerst stehen.` : ''}\n\nNur sinnvoll, wenn beide Geräte gerade abgeglichen sind.`, confirmLabel: 'Endgültig löschen', danger: true })) { note.textContent = ''; return; }
  // Nach der Rückfrage noch einmal abgleichen: Inzwischen kann ein Rezept auf eines der Fotos verweisen.
  await freshSync();
  const stillUnused = retainedPhotoIds(localStorage,usedPhotos());
  if (!stillUnused) throw new Error('Die gespeicherten Daten konnten nicht geprüft werden. Es wurden keine Fotos gelöscht.');
  const doomed = old.filter(file => !stillUnused.has(file.name.slice(0, -4)));
  let deleted = 0, freed = 0;
  for (const file of doomed) {
    const result = await timed(`${photosApi()}/${encodeURIComponent(file.name)}`, { method: 'DELETE', headers: githubHeaders({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'SattPlan: ungenutztes Rezeptfoto entfernt', sha: file.sha, branch: config.branch }) });
    if (!result.ok) { note.textContent = `${deleted} Fotos gelöscht, dann Fehler ${result.status}.`; return; }
    deleted++; freed += file.size || 0;
  }
  note.textContent = `${deleted} Fotos gelöscht, ${kb(freed)} frei.${young ? ` ${young} neuere bleiben vorerst stehen.` : ''}`;
}
// Fotos, auf die irgendein Rezept (auch ein gerade gelöschtes) oder die Upload-Warteschlange verweist.
const usedPhotos = () => new Set([...state.recipes.map(row => row.photoId), ...queued(queueKey())].filter(Boolean));
const photosApi = () => `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${photosDir(config.path).split('/').map(encodeURIComponent).join('/')}`;

/* ---------- Ereignisse ---------- */
fillCategorySelects();
itemQuantity = mountQuantityControls($('#item-form'), { getHistory:itemHistory });
editQuantity = mountQuantityControls($('#edit-item-form'), { getHistory:itemHistory });
document.querySelectorAll('[data-tab]').forEach(node => node.addEventListener('click', () => tab(node.dataset.tab)));
function requestDialogClose(dialog) {
  if (dialog.id === 'expense-category-delete-dialog' && expenseCategoryPicker?.busy()) return;
  if (dialog.id === 'restore-dialog' && restoreController?.busy()) return;
  if (dialog.id === 'recipe-dialog' && !canCloseRecipe()) return;
  dialog.close();
}
function canCloseRecipe() {
  if (recipeSaving) { message('Das Rezept wird gerade gespeichert. Bitte kurz warten.'); return false; }
  return saveRecipeDraft();
}
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => requestDialogClose($(`#${node.dataset.close}`))));
// Ein Tipp auf den Bereich außerhalb eines Fensters (oben, auf den abgedunkelten Hintergrund) schließt es wie das „×“. Das Drücken und das Loslassen müssen beide außerhalb liegen:
// Wer in einem Feld Text markiert und außerhalb loslässt, schließt nichts. Das Willkommensfenster lässt sich nicht wegtippen (es braucht den Namen).
let outsideDown = null;
const outsideOf = (dialog, event) => { const box = dialog.getBoundingClientRect(); return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom; };
const tapDialog = event => event.target instanceof HTMLDialogElement && event.target.open && event.target.id !== 'welcome' && outsideOf(event.target, event) ? event.target : null;
document.addEventListener('pointerdown', event => { outsideDown = tapDialog(event); }, true);
document.addEventListener('click', event => {
  const dialog = tapDialog(event), started = outsideDown; outsideDown = null;
  if (dialog && dialog === started) requestDialogClose(dialog);
}, true);
// iOS Safari meldet einen Tipp auf ein Element ohne eigenen Klick-Empfänger nicht als Klick: Der leere Empfänger macht den Hintergrund des Fensters „antippbar“.
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', () => {}));
$('#refresh').addEventListener('click', () => guard(() => sync(true)));
// Die Statuszeile oben ist zugleich ein Knopf: verbunden gleicht sie ab, sonst führt sie in die Optionen zum Verbinden.
$('#syncline').addEventListener('click', () => guard(() => {
  if (connected() && tokenWarning() === null) return sync(true);
  tab('settings'); $('#connection-details').open = true;   // ohne Verbindung oder bei ablaufendem Token: dorthin, wo man ihn einträgt
}));
let waitingWorker = null, reloadRequested = false;
$('#reload').addEventListener('click', () => {
  if (waitingWorker?.state === 'installed') { reloadRequested = true; waitingWorker.postMessage('skipWaiting'); setTimeout(() => location.reload(), 3000); }
  else location.reload();
});
for (const key of ['name', 'unit']) $('#item-form').elements[key].addEventListener('blur', refreshCategoryHint);
for (const event of ['input', 'focus']) $('#item-form').elements.name.addEventListener(event, renderItemSuggestions);
$('#item-form').elements.name.addEventListener('input', () => { delete $('#item-form').dataset.keepOpen; renderQuickPick(); });
$('#clear-item-name').addEventListener('click',clearItemDraft);
$('#clear-item-name').addEventListener('pointerdown',event=>event.preventDefault());
$('#change-remembered-amount').addEventListener('click',()=>{
  const form=$('#edit-item-form'),memory=rememberedAmount(form.elements.name.value.trim(),itemHistory());
  form.elements.memoryQuantity.value=plain(memory?.purchaseAmount?.quantity||1);form.elements.memoryUnit.value=memory?.purchaseAmount?.unit||form.elements.unit.value;
  $('#remembered-amount-editor').hidden=false;
});
$('#reset-remembered-amount').addEventListener('click',()=>guard(()=>saveRememberedAmount(null)));
$('#save-remembered-amount').addEventListener('click',()=>guard(()=>saveRememberedAmount({quantity:positive($('#edit-item-form').elements.memoryQuantity.value),unit:$('#edit-item-form').elements.memoryUnit.value.trim()})));
$('#edit-item-form').elements.name.addEventListener('input',renderRememberedAmount);
for (const event of ['focusin', 'focusout', 'input', 'toggle', 'unitchoiceend']) $('#item-form').addEventListener(event, () => setTimeout(syncForm, 0), true);
$('#item-form').elements.name.addEventListener('input', () => categoryHint($('#item-form').elements.category, $('#item-form').elements.name.value));
$('#item-form').elements.name.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); const form=$('#item-form'); const correction=isSeparate(state.stores.find(store=>store.id===form.elements.storeId.value))?null:recognizeName(form.elements.name.value).correction; if(correction && form.dataset.keepName!==form.elements.name.value.trim()) form.elements.name.value=correction; itemQuantity.suggest(isSeparate(state.stores.find(store=>store.id===form.elements.storeId.value))?'':form.elements.name.value.trim()); $('#item-suggestions').hidden=true; document.activeElement?.blur?.(); return; }
  if (event.key === 'Escape') $('#item-suggestions').hidden = true;
  if (event.key === 'ArrowDown' && !$('#item-suggestions').hidden) {
    event.preventDefault(); $('#item-suggestions button')?.focus();
  }
});
document.addEventListener('focusin', event => {
  if (event.target !== $('#item-form').elements.name && !$('#item-suggestions').contains(event.target)) $('#item-suggestions').hidden = true;
});
// Beim Tippen schiebt iOS die Tastatur hoch: Sie verkleinert nur den sichtbaren Bereich, nicht das Layout.
// Die fixierte Leiste würde dann mitten auf dem Bildschirm hängen bleiben. Solange die Tastatur offen ist,
// wird sie ausgeblendet. Erkannt wird die Tastatur selbst, nicht der Fokus: iOS nimmt dem Feld ihn nicht zuverlässig weg.
const typing = node => node?.matches?.('input:not([type=checkbox],[type=radio],[type=file],[type=button],[type=submit]),textarea,select');
const viewport = window.visualViewport;
function syncKeyboard() {
  const open = Boolean(viewport) && viewport.scale < 1.05 && window.innerHeight - viewport.height > 120;
  document.body.classList.toggle('typing', open && Boolean(typing(document.activeElement)));
}
viewport?.addEventListener('resize', syncKeyboard);
// Die App steht immer hochkant, ohne Einstellung. Wo Webseiten die Drehung sperren dürfen (Android, als App installiert: Manifest und lock()), kommt das Querformat gar nicht erst vor.
// Auf dem iPhone geht das nicht; dort verdeckt im Querformat ein Hinweis die Ansicht, bis das Handy wieder hochkant gehalten wird (Tablets und Computer drehen frei).
// Erkannt wird die Drehung des Geräts, nicht das Seitenverhältnis des Fensters: Eine offene Tastatur macht das Fenster auch hochkant breiter als hoch.
try { screen.orientation?.lock?.('portrait')?.catch(() => { /* nicht erlaubt (Browser-Tab, iPhone): der Hinweis übernimmt */ }); } catch { /* ältere Browser */ }
const deviceLandscape = () => screen.orientation ? screen.orientation.type.startsWith('landscape') : Math.abs(Number(window.orientation)) === 90;
const phoneScreen = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
function syncTurned() { document.documentElement.toggleAttribute('data-landscape', phoneScreen() && deviceLandscape()); }
screen.orientation?.addEventListener?.('change', syncTurned);
for (const type of ['orientationchange', 'resize']) window.addEventListener(type, syncTurned);
syncTurned();
document.addEventListener('focusin', () => setTimeout(syncKeyboard, 350));
document.addEventListener('focusout', () => setTimeout(syncKeyboard, 100));
// Ein Tipp auf leere Fläche (nicht auf Eingaben, Knöpfe, Links oder Beschriftungen) nimmt dem Feld den Fokus, damit sich die Tastatur schließt:
// iOS tut das von selbst nicht. Ein Wischen (Scrollen) zählt nicht, nur ein Tipp mit höchstens 10 px Bewegung.
const INTERACTIVE = 'input,textarea,select,button,a,label,summary,[role=button],[role=tab],[contenteditable=true]';
let tapStart = null;
document.addEventListener('pointerdown', event => { tapStart = event.isPrimary ? { x: event.clientX, y: event.clientY, target: event.target } : null; }, true);
document.addEventListener('pointerup', event => {
  const start = tapStart; tapStart = null;
  if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
  const field = document.activeElement;
  if (typing(field) && !start.target.closest?.(INTERACTIVE)) field.blur();
}, true);
// Zutaten auf die Liste setzen: Gleiche Artikel werden zusammengezählt (siehe data.js).
// `unchecked`: Namen der abgewählten Zutaten; mit `remember` kommen sie in den Vorrat.
// `take`: Kennung einer Wochenübernahme (siehe weekTakeId in plan.js); Zeilen mit `key` bekommen dann feste Kennungen, damit dieselbe Übernahme von zwei Geräten nur einmal zählt.
function addRows(rows, storeId, unchecked = [], remember = false, extraOps = [], take = '') {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  const result = addToList(reuseProductNames(rows,listItems(),storeId), storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), listItems(), itemHistory(), take);
  const stocked = remember ? pantryAdditions(unchecked, pantryKeys(state.pantry)) : [];
  if (!result.ops.length && !stocked.length && !extraOps.length) throw new Error('Alles davon steht schon auf der Liste.');
  const pantryOps = pantryChanges(stocked, state.pantry || []).map(({ id, patch }) => {
    const op = nextOp('pantry', id, patch);
    if (take) op.id = `take-${take}-pantry-${shortHash(id)}`;
    return op;
  });
  const parts = [result.added && `${result.added} neu`, result.counted.length && `${result.counted.length} dazugezählt`, result.skipped && `${result.skipped} schon vorhanden`,
    stocked.length && `${stocked.length} in den Vorrat`].filter(Boolean);
  commit([...result.ops, ...pantryOps, ...extraOps], `Übernommen: ${parts.join(', ') || 'alles stand schon auf der Liste'}`);
}
function clearItemDraft() {
  const form=$('#item-form'),kept=form.elements.storeId.value;
  document.activeElement?.blur?.(); form.reset();form.elements.storeId.value=kept;
  form.querySelector('.price-fields').open=false;
  delete form.dataset.keepName;delete form.dataset.keepOpen;delete form.dataset.choosingUnit;   // nach dem Hinzufügen immer zugeklappt (2.159)
  renderStorePick();itemQuantity.reset();refreshCategoryHint();$('#item-suggestions').hidden=true;renderQuickPick();syncForm();
}
// Fertig/Enter prüft den Namen und schließt die Tastatur. Das „+“ bestätigt die Einkaufsmenge.
$('#item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, typed = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  if (!typed || !unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const known = appliedAliases().find(alias => alias.from === aliasKey(typed)), correction = form.dataset.keepName === typed || isSeparate(state.stores.find(store => store.id === form.elements.storeId.value)) ? null : recognizeName(typed).correction, name = known?.name || correction || typed;
  if(name!==typed) itemQuantity.suggest(name);
  const category = form.elements.category.value || suggestCategory(name, itemHistory());
  const item = { storeId: currentStore(form.elements.storeId.value), name, ...itemQuantity.read(), checked: false, createdBy: config.actor || 'Unbekannt', ...(category ? { category } : {}) };
  // Steht derselbe Artikel schon offen auf der Liste (gleiches Geschäft, passende Einheit), wird die Menge erhöht.
  const same = foldIntoList([{ name, quantity: item.quantity, unit:item.unit, purchaseUnit:item.purchaseUnit,purchaseMeasure:item.purchaseMeasure,purchaseAt:item.purchaseAt,...amountChoice(item) }], item.storeId, state.items).counted[0];
  const renamed = name !== typed ? `„${typed}“ → „${name}“` : '';
  if (same) {
    const current=state.items.find(row=>row.id===same.id),preference={...newerUnitChoice(item,current),...newerAmountChoice(item,current)};
    commit([nextOp('items', same.id, { add: same.add, ...preference })], `${renamed ? `${renamed}: ` : ''}„${same.name}“: jetzt ${shoppingAmount({ ...current, ...same.after, ...preference, name:same.name })}`);
  } else {
    const id = uid(), ops = [nextOp('items', id, item)];
    // Erscheint der neue Artikel nicht in der gerade gewählten Ansicht (anderes oder kein Geschäft), sagt die App, wo er steht.
    commit(ops, inView(item) ? renamed : `${renamed ? `${renamed}; ` : ''}„${name}“ steht bei „${storeName(item.storeId)}“`);
  }
  // Das gewählte Geschäft bleibt stehen: Man trägt meist mehrere Artikel nacheinander für denselben Laden ein.
  clearItemDraft();
}); });
$('#delete-item').addEventListener('click', () => guard(() => {
  const id = $('#edit-item-form').elements.rowId.value;
  if (!active(state.items).some(row => row.id === id)) { $('#item-dialog').close(); return; }
  $('#item-dialog').close(); deleteItems([id]);
}));
// Zeile lange halten und über den Bildschirm auf ein Geschäft ziehen: oben erscheint eine Leiste mit allen Geschäften (und „Ohne Geschäft“); außerdem zählt jeder
// sichtbare Abschnitt der Gesamtliste unter „Planen“ als Ziel. Beim Loslassen über einem Ziel landet der Artikel dort (siehe moveItem).
// Ziele sind nur echte Geschäfte: Artikel der Einkaufsliste lassen sich nie in eine Liste (Wünsche, eigene Listen, Notizen) verschieben (2.161).
const moveTargets = () => orderedStores(state.stores).filter(store => visibleStore(store) && !isSeparate(store));
const intoList = storeId => isSeparate(active(state.stores).find(store => store.id === storeId));
const moveBar = {
  show(id) {
    const item = state.items.find(row => row.id === id && !row.deletedAt), bar = $('#move-bar');
    if (!item) return 0;
    bar.replaceChildren();
    const add = (storeId, label) => {
      const target = element('div', undefined, `move-target${(item.storeId || '') === storeId ? ' current' : ''}`); target.dataset.store = storeId; target.append(label); bar.append(target);
    };
    add('', document.createTextNode('Ohne Geschäft'));
    for (const store of moveTargets()) add(store.id, storeLabel(store));
    bar.hidden = false;
    return bar.getBoundingClientRect().bottom;
  },
  // Ziel unter dem Finger: ein Feld der Leiste oder der Abschnitt der Gesamtliste, über dem der Finger steht; das eigene Geschäft zählt nicht
  at(x, y, id) {
    const item = state.items.find(row => row.id === id && !row.deletedAt), own = item?.storeId || '', bar = $('#move-bar');
    const inside = node => { const box = node.getBoundingClientRect(); return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom; };   // die Leiste selbst fängt keine Zeigerereignisse ab
    let key = null;
    if (!bar.hidden && inside(bar)) key = [...bar.children].find(inside)?.dataset.store ?? null;   // über der Leiste zählen nur ihre Felder
    else {
      const list = $('#items');
      for (let node = document.elementsFromPoint(x, y).find(entry => entry.parentElement === list); node; node = node.previousElementSibling) {
        if (node.classList.contains('store-head')) { key = node.dataset.store ?? null; break; }
      }
    }
    return key === null || key === own || (key && !moveTargets().some(store => store.id === key)) ? null : key;   // nie in eine Liste (2.161)
  },
  mark(key) {
    const bar = $('#move-bar'), list = $('#items');
    bar.querySelectorAll('.hot').forEach(node => node.classList.remove('hot'));
    list.querySelectorAll('.drop-over').forEach(node => node.classList.remove('drop-over'));
    if (key === null) return;
    [...bar.children].find(node => node.dataset.store === key)?.classList.add('hot');
    const head = [...list.querySelectorAll('.store-head')].find(node => node.dataset.store === key);
    for (let node = head; node && (node === head || !node.classList.contains('store-head')); node = node.nextElementSibling) node.classList.add('drop-over');
  },
  hide() { this.mark(null); $('#move-bar').hidden = true; },
  drop(id, key) { guard(() => moveItem(id, key)); }
};
// Zeile lange halten und nach rechts in den roten Mülleimer schieben löscht den Artikel (nur in der Planungsansicht, nicht „Im Laden“).
dragDelete($('#items'), $('#trash-zone'), id => guard(() => deleteItems([id])), '.item[data-id]:not([data-wish])', { onHold: id => guard(() => openMove(id)), hint: $('#drag-hint'), target: moveBar, disabled: () => selecting });
// Wünsche (2.147): ebenfalls lange halten und nach rechts in den Mülleimer ziehen. Halten und Loslassen ohne Ziehen öffnet die Wunschdetails;
// verschieben lassen sich Wünsche nicht (sie gehören zu ihrer Wunschliste).
dragDelete($('#items'), $('#trash-zone'), id => guard(() => deleteItems([id])), '.item[data-wish][data-id]', { onHold: id => guard(() => openWish(id)), disabled: () => selecting });
// Notizen (2.150): lange halten und nach rechts in den Mülleimer ziehen; Halten und Loslassen ändert die Notiz. Eine Zeile, in der gerade getippt wird, hebt nicht ab.
dragDelete($('#notes-list'), $('#trash-zone'), id => guard(() => deleteItems([id])), '.note-row[data-id]:not(.editing)', { onHold: id => guard(() => editNote(id)) });
// Geheime Liste (2.147): genauso lange halten und nach rechts in den Mülleimer ziehen; Halten und Loslassen öffnet den Eintrag.
for (const list of [$('#private-items'), $('#private-done-items')]) dragDelete(list, $('#trash-zone'), id => guard(() => privateList?.remove(id)), '.private-row[data-id]', { onHold: id => guard(() => privateList?.edit(id)) });
$('#items').addEventListener('keydown', event => {
  const node = event.target.closest?.('.item[data-wish] .item-copy');
  if (node && !selecting && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) { event.preventDefault(); guard(() => openWish(node.closest('[data-id]').dataset.id)); }
});
// Im Laden wird nur abgehakt, nicht gelöscht (Rollen getrennt: „Planen“ bearbeitet und löscht, „Im Laden“ hakt ab). Wünsche: lange drücken öffnet die Details.
bindWishHold($('#shop-list'), '.shop-item[data-wish] .shop-text', id => guard(() => openWish(id)), () => isLocked());
// Lange halten und loslassen, ohne zu ziehen: „Verschieben nach …“ (ein anderes Geschäft oder kein Geschäft). Steht dort derselbe Artikel schon offen, werden die Mengen zusammengezählt.
let moveDeleteIds = [], moveScope = '';
function openMove(id) {
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item || isWish(item)) return;
  moveDeleteIds = [id]; moveScope = namespace(); $('#move-delete-label').textContent = 'Artikel löschen';
  $('#move-dialog').dataset.id = id;
  $('#move-text').textContent = `„${item.name}“ (${shoppingAmount(item)}) steht ${item.storeId ? `bei ${storeName(item.storeId)}` : 'ohne Geschäft'}. Wohin soll er?`;
  const box = $('#move-choices'); box.replaceChildren();
  const choice = (storeId, label, name) => {
    const entry = element('button', undefined, 'secondary move-choice'); entry.type = 'button';
    entry.append(label);
    if ((item.storeId || '') === storeId) { entry.disabled = true; entry.setAttribute('aria-label', `${name}, hier steht er jetzt`); entry.append(element('span', 'jetzt hier', 'move-current')); }
    else entry.addEventListener('click', () => guard(() => moveItem(id, storeId)));
    box.append(entry);
  };
  fillMoveChoices(choice);
}
// Mehrere ausgewählte Artikel in ein Geschäft (oder ohne Geschäft) verschieben: eine Änderung für alle; gleiche offene Artikel im Ziel werden zusammengezählt.
function openMoveSelected() {
  const rows = selectedItems(); if (!rows.length || rows.some(isWish)) return;
  moveDeleteIds = rows.map(row => row.id); moveScope = namespace(); $('#move-delete-label').textContent = `${rows.length} Artikel löschen`;
  $('#move-dialog').dataset.id = '';
  $('#move-text').textContent = `${rows.length} Artikel ausgewählt. Wohin sollen sie?`;
  const box = $('#move-choices'); box.replaceChildren();
  const choice = (storeId, label) => {
    const entry = element('button', undefined, 'secondary move-choice'); entry.type = 'button'; entry.append(label);
    entry.addEventListener('click', () => guard(() => moveSelected(storeId)));
    box.append(entry);
  };
  fillMoveChoices(choice);
}
$('#move-delete').addEventListener('click', () => guard(async () => {
  if (!$('#move-dialog').open) return;
  if (moveScope !== namespace()) throw new Error('Die Datenverbindung hat sich geändert. Bitte die Auswahl erneut öffnen.');
  const ids = moveDeleteIds.filter(id => active(state.items).some(row => row.id === id));
  if (!ids.length) { $('#move-dialog').close(); showNotice('Diese Artikel wurden inzwischen entfernt.'); return; }
  if (ids.length > 1 && !await ask({ title: `${ids.length} Artikel löschen?`, message: '14 Tage lang lassen sie sich unter „Kürzlich gelöscht“ zurückholen.', confirmLabel: 'Löschen', danger: true })) return;
  if (!$('#move-dialog').open) return;
  const still = ids.filter(id => active(state.items).some(row => row.id === id)); if (!still.length) return;
  selected.clear(); setSelecting(false); $('#move-dialog').close();
  deleteItems(still, { notice: still.length === 1 ? 'Artikel gelöscht' : `${still.length} Artikel gelöscht` });
}));
function moveSelected(storeId) {
  if (intoList(storeId)) throw new Error('Artikel der Einkaufsliste lassen sich nicht in eine Liste verschieben.');
  const target = currentStore(storeId), label = target ? storeName(target) : 'ohne Geschäft', rows = selectedItems(), ops = [];
  let items = state.items, merged = 0, moved = 0;
  const stamp = new Date().toISOString();
  for (const item of rows) {
    if(isWish(item)) continue;
    if ((item.storeId || '') === target) continue;
    // Wie beim einzelnen Verschieben: Ein offener Artikel ohne eigenen Preis wird zu einem gleichen Artikel im Ziel dazugezählt; sonst wechselt nur das Geschäft.
    const same = !item.checked && !hasWishDetails(item) && (item.price === undefined || item.price === null) ? foldIntoList([{ name: item.name, quantity: item.quantity, unit: item.unit, purchaseUnit:item.purchaseUnit }], target, items).counted[0] : null;
    if (same) {
      ops.push(nextOp('items', same.id, { add: same.add }), ...deleteOps('items', [item.id], { mergedInto: same.id })); merged++;
      items = items.map(row => row.id === same.id ? { ...row, quantity: same.after.quantity, unit: same.after.unit } : row.id === item.id ? { ...row, deletedAt: stamp } : row);
    } else { ops.push(nextOp('items', item.id, { storeId: target })); moved++; items = items.map(row => row.id === item.id ? { ...row, storeId: target } : row); }
  }
  $('#move-dialog').close();
  if (!ops.length) { showNotice('Die Artikel stehen schon dort'); return; }
  commit(ops, `${moved + merged} Artikel → ${label}${merged ? ` (${merged} zusammengezählt)` : ''}`);
  selected.clear(); renderItems();
}
function fillMoveChoices(choice) {
  choice('', document.createTextNode('Ohne Geschäft'), 'Ohne Geschäft');
  for (const store of moveTargets()) choice(store.id, storeLabel(store), store.name);
  message(); $('#move-dialog').showModal();
}
function moveItem(id, storeId) {
  if(isWish(state.items.find(row=>row.id===id))) return;
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  if (intoList(storeId)) throw new Error('Artikel der Einkaufsliste lassen sich nicht in eine Liste verschieben.');
  const target = currentStore(storeId);
  if ((item.storeId || '') === target) { $('#move-dialog').close(); return; }
  const label = target ? storeName(target) : 'ohne Geschäft';
  // Ein offener Artikel ohne eigenen Preis wird zu einem gleichen Artikel im Ziel dazugezählt (wie beim Hinzufügen); sonst wechselt nur das Geschäft.
  const same = !item.checked && !hasWishDetails(item) && (item.price === undefined || item.price === null) ? foldIntoList([{ name: item.name, quantity: item.quantity, unit: item.unit, purchaseUnit:item.purchaseUnit }], target, state.items).counted[0] : null;
  if (same) commit([nextOp('items', same.id, { add: same.add }), ...deleteOps('items', [id], { mergedInto: same.id })], `„${item.name}“ → ${label}: jetzt ${shoppingAmount({ ...state.items.find(row=>row.id===same.id), ...same.after, name:same.name })}`);
  else commit([nextOp('items', id, { storeId: target })], `„${item.name}“ → ${label}`);
  $('#move-dialog').close();
}
$('#edit-item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = state.items.find(row => row.id === form.elements.rowId.value && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const patch = { name: form.elements.name.value.trim(), ...editQuantity.read(),
    category: form.elements.category.value || null, storeId: currentStore(form.elements.storeId.value) };
  if (!patch.name || !patch.unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const delta = changed(patch, itemBaseline);
  if(editQuantity.preferenceChanged())Object.assign(delta,unitChoice(patch));
  if(patch.purchaseAmount!==undefined)Object.assign(delta,amountChoice(patch));
  const ops = Object.keys(delta).length ? [nextOp('items', item.id, delta)] : [];
  commit(ops); $('#item-dialog').close(); if (ops.length) savedNotice(patch.name);
}); });
$('#wish-form').elements.name.addEventListener('input',renderWishImage);
$('#wish-remove-image').addEventListener('click',()=>{ $('#wish-form').dataset.imageHidden='true'; renderWishImage(); });
$('#wish-form').elements.wishUrl.addEventListener('input', showWishProductLink);
$('#wish-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = active(state.items).find(row => row.id === form.elements.rowId.value);
  if (!item || !isWish(item)) throw new Error('Dieser Wunsch wurde inzwischen gelöscht oder verschoben. Bitte schließen und die Liste aktualisieren.');
  const patch = { name: form.elements.name.value.trim(), wishUrl: productLink(form.elements.wishUrl.value), wishNote: form.elements.wishNote.value.trim(), wishImageHidden:form.dataset.imageHidden==='true' };
  if (!patch.name) throw new Error('Bitte einen Namen eingeben.');
  const delta = changed(patch, wishBaseline);
  if (Object.keys(delta).length) commit([nextOp('items', item.id, delta)]);
  $('#wish-dialog').close(); if (Object.keys(delta).length) savedNotice(patch.name);
}); });
$('#delete-wish').addEventListener('click', () => guard(() => {
  const id = $('#wish-form').elements.rowId.value, item = active(state.items).find(row => row.id === id);
  $('#wish-dialog').close();
  if (item) deleteItems([id]);
}));
$('#select-mode').addEventListener('click', () => guard(() => setSelecting(!selecting)));
window.addEventListener('resize', () => { if (selecting) renderSelectBar(); });
$('#select-done').addEventListener('click', () => guard(()=>setSelecting(false)));
$('#select-move').addEventListener('click', () => guard(openMoveSelected));
$('#select-delete').addEventListener('click', () => guard(async () => {
  const chosen = selectedItems(); if (!chosen.length) return;
  if (!await ask({ title: `${chosen.length} Artikel löschen?`, message: '14 Tage lang lassen sie sich unter „Kürzlich gelöscht“ zurückholen.', confirmLabel: 'Löschen', danger: true })) return;
  const rows = selectedItems(); if (!rows.length) return;
  selected.clear(); deleteItems(rows.map(row => row.id), { notice: `${rows.length} Artikel gelöscht` }); renderItems();
}));
$('#welcome-stores').addEventListener('click',()=>openStoresDialog());
$('#manage-stores').addEventListener('click', () => openStoresDialog());
function saveStoreOrder(visibleIds) {
  const order = reorderedStoreIds(state.stores, visibleIds);
  if (JSON.stringify(order) === JSON.stringify(orderedStores(state.stores).map(store => store.id))) return;
  commit(order.map((id, sortOrder) => nextOp('stores', id, { sortOrder })), 'Geschäftsreihenfolge gespeichert');
  // Offene Bearbeitungsfelder samt noch nicht gespeicherten Eingaben erhalten.
  const editor = $('#store-editor'), rows = [...editor.children];
  const trailing = editor.querySelector('.store-wishes-placeholder,.store-secret-line,.private-store-row');
  for (const row of order.map(id => rows.find(row => row.dataset.storeId === id)).filter(Boolean)) editor.insertBefore(row, trailing);
  markListBoundaries(editor);
}
for (const [selector, horizontal, itemSelector, handleSelector] of [
  ['#store-editor', false, '.store-row[data-store-id]', '.store-summary'],
  ['#store-chips', true, '[data-store-id]:not([data-notes])', '[data-store-id]:not([data-notes])'],
  ['#store-notes-editor', false, '.store-row[data-store-id]', '.store-summary'],
  ['#shop-chips', true, '[data-store-id]', '[data-store-id]']
]) {
  const root = $(selector);
  storeReorders.push(mountStoreOrder(root, {
    horizontal, itemSelector, handleSelector,
    enabled: () => ready && root.getClientRects().length > 0 && !isLocked(),
    canDrag: handle => !horizontal || handle.getAttribute('aria-selected') !== 'true',
    getVersion: () => JSON.stringify([namespace(), orderedStores(state.stores).map(store => store.id)]),
    onChange: saveStoreOrder,
    announce: text => { $(root.closest('dialog') ? '#store-order-status' : '#store-tabs-status').textContent = text; },
    onError: error => showNotice(error.message)
  }));
}

productPicker = mountProductPicker({
  getScope: namespace,
  getStores: () => orderedStores(state.stores).filter(store => visibleStore(store)&&!isSeparate(store)),
  getData: () => ({ productRemovals:state.productRemovals||[], recentItems: withoutSeparate(state.items,state.stores), favorites: state.productFavorites || [], items: listItems(), pantry: state.pantry || [], stockSettings:state.stockSettings||[],
    history: itemHistory().filter(item => !item.storeId || !state.stores.some(store => store.id === item.storeId && isSeparate(store))) }),
  onAdd: (rows, storeId) => addRows(rows, currentStore(storeId)),
  onPantry: products => { const changes=pantrySelectionChanges(products,state.pantry||[]),removals=products.filter(product=>product.pantryAvailable===false);const ops=[...changes.map(({id,patch})=>nextOp('pantry',id,patch)),...stockRemovalOperations(removals)];if(ops.length)commit(ops);return removals.filter(product=>isOptionalBasic(product.name)).map(product=>product.name); },
  onStockSettings:patch=>commit(stockOps([saveSmartStockChange(state,patch,config.actor||'Unbekannt')])),
  onConsume:product=>{commit(stockRemovalOperations([product]));return isOptionalBasic(product.name);},
  recognizeName,
  onQuickBuy: product => pantryBuyer.buyProduct(product),
  onDeleteOwn:product=>{const removal=ownProductRemoval(product);const ids=(state.productFavorites||[]).filter(row=>!row.deletedAt&&productKey(row.name)===productKey(product.name)).map(row=>row.id);commit([nextOp('productRemovals',removal.id,{...removal.patch,favoriteIds:ids}),...ids.map(id=>nextOp('productFavorites',id,{deletedAt:new Date().toISOString()}))]);return {removalId:removal.id,favoriteIds:ids};},   // favoriteIds (2.149): genau diese Sterne kommen beim Wiederherstellen zurück
  // „Rückgängig“ nach dem Löschen (2.144): Die Löschmarke wird aufgehoben, gelöschte Favoriten kommen zurück.
  // Endgültig gelöscht (Papierkorb geleert, 2.149): Ein altes „Rückgängig“ holt nichts mehr zurück.
  onRestoreOwn:({removalId,favoriteIds=[]})=>{const removal=(state.productRemovals||[]).find(row=>row.id===removalId);if(removal?.purgedAt&&!removal.deletedAt)throw new Error(`„${removal.name}“ wurde inzwischen endgültig gelöscht und lässt sich nicht mehr zurückholen.`);if(removal?.deletedAt)return;const at=new Date().toISOString();commit([nextOp('productRemovals',removalId,{deletedAt:at}),...favoriteIds.filter(id=>(state.productFavorites||[]).some(row=>row.id===id&&row.deletedAt)).map(id=>nextOp('productFavorites',id,{deletedAt:null}))]);},
  onFavorite: product => {
    const id = product.favorite?.id || favoriteId(product), existing = (state.productFavorites || []).find(row => row.id === id);
    const patch = existing && !existing.deletedAt ? { deletedAt: new Date().toISOString() } : {
      name: product.name, productId: product.own ? null : product.catalogId || product.id, quantity: product.quantity, unit: product.unit, category: product.category,
      imageKey: product.imageKey || null, deletedAt: null
    };
    const ids=existing && !existing.deletedAt ? (product.favorite?.ids || [id]) : [id];
    commit(ids.map(key=>nextOp('productFavorites',key,patch)));
  }
});
pantryBuyer = mountPantryBuy({
  getScope:namespace,getStores:()=>orderedStores(state.stores).filter(store=>visibleStore(store)&&!isSeparate(store)),
  getPreferredStore:()=>$('#open-products').hidden?'':$('#item-form').elements.storeId.value,
  getHistory:itemHistory,onBuy:(rows,storeId)=>addRows(rows,currentStore(storeId))
});
spendingView = mountSpending({
  getData: () => ({ purchases: categorizedPurchases(state), members: state.members || [], stores: state.stores }), getScope: namespace,
  getMonth: () => spendMonth, setMonth: month => { spendMonth = month; }, today: isoDate, getOwn: ownExpenseMember,
  onEdit: id => guard(() => (isDining(purchaseRows().find(row => row.id === id)) ? openDining(id) : openPurchase(id))), onBudget: renderBudget, onMessage: showNotice, productImages: () => imagesOn(),
  getDiningCounts: diningCountsNow,
  onExport: (csv, name) => deliverFile(new File([csv], name, { type: 'text/csv;charset=utf-8' })),
  onMemberSave: (id, name) => {
    if (!ready) throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');
    const own = ownExpenseMember(), change = id ? renameMember(id, name, state.members || []) : prepareMember(name, state.members || []).change;
    const memberId = id || prepareMember(name, state.members || []).id;
    if (id && own?.id === id) { saveConfig({ ...config, actor: name, memberId: id, memberScope: namespace() }); fillSettings(); }
    if (change) commit([nextOp('members', change.id, change.patch)]);
    else if (state.members?.some(row => row.id === memberId && row.archived)) commit([nextOp('members', memberId, { archived: false })]);
    if (memberKey(name) === memberKey(config.actor)) rememberOwnBuyer(memberId);
    return memberId;
  },
  onMemberArchive: (id, archived) => {
    if (!liveMembers(state.members).some(row => row.id === id)) throw new Error('Diese Person ist nicht mehr vorhanden.');
    commit([nextOp('members', id, { archived })]);
  },
  // Preis eines Produkts nachtragen, ändern oder löschen (2.163). Nur das eine Produkt im aktuellen Stand ändert sich; Betrag, Geschäft und Datum des Einkaufs bleiben.
  onProductPrice: (purchaseId, index, name, price) => {
    if (!ready) throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');
    const purchase = active(state.purchases || []).find(row => row.id === purchaseId);
    if (!purchase) throw new Error('Dieser Einkauf wurde inzwischen gelöscht.');
    const before = purchase.items?.[index], items = withProductPrice(purchase.items, index, name, price), after = items[index];
    if ((before.cents ?? null) === (after.cents ?? null) && Boolean(before.offer) === Boolean(after.offer)) return;
    commit([nextOp('purchases', purchaseId, { items })]);
    if (price) { showNotice(`Preis für „${name}“ gespeichert: ${euros(price.cents)}${price.offer ? ' (Angebot)' : ''}`); return; }
    const was = { cents: before.cents, offer: before.offer === true }, scope = namespace();
    showNotice(`Preis für „${name}“ gelöscht`, () => guard(() => {
      const now = active(state.purchases || []).find(row => row.id === purchaseId);
      if (scope !== namespace() || !now || hasProductPrice(now.items?.[index])) return;
      commit([nextOp('purchases', purchaseId, { items: withProductPrice(now.items, index, name, was) })], `Preis für „${name}“ wiederhergestellt`);
    }));
  },
  // Versehentlich angelegte Person löschen (2.162): nur ohne Einkäufe; mit Einkäufen bleibt nur Ausblenden, damit die Historie stimmt
  onMemberDelete: async id => {
    const member = liveMembers(state.members).find(row => row.id === id), scope = namespace();
    if (!ready || !member) throw new Error('Diese Person ist nicht mehr vorhanden.');
    if (!await ask({ title: `„${member.name}“ löschen?`, message: 'Die Person hat keine Einkäufe und verschwindet aus der Personenliste – auf allen verbundenen Geräten. Du kannst sie jederzeit neu hinzufügen.', confirmLabel: 'Löschen', danger: true })) return;
    if (scope !== namespace() || !liveMembers(state.members).some(row => row.id === id)) return;
    if ((state.purchases || []).some(row => row.buyerId === id)) throw new Error('Inzwischen gibt es Einkäufe dieser Person. Sie lässt sich nur noch ausblenden.');
    commit(deleteOps('members', [id]), `„${member.name}“ gelöscht`);
  }
});
$('#open-pantry').addEventListener('click',()=>guard(()=>{if(!ready)throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');productPicker.open('',{target:'pantry'});}));
$('#open-products').addEventListener('click', () => guard(() => {
  if (!ready) throw new Error('Bitte zuerst die Liste öffnen oder GitHub verbinden.');
  productPicker.open($('#item-form').elements.storeId.value);
}));
$('#choose-store').addEventListener('click', () => {
  $('#store-catalog-search').value = ''; $('#store-catalog-type').value = ''; renderStoreCatalog(); $('#store-catalog-dialog').showModal();
});
$('#store-catalog-search').addEventListener('input', renderStoreCatalog);
$('#store-catalog-type').addEventListener('change', renderStoreCatalog);
// Anlegen (2.152): Motivwahl samt Geheim-Haken für eigene Listen, festes Klemmbrett für Notizlisten, Anzeige im Reiter mit Vorschau
newStoreSymbols=symbolPicker();newStoreSymbols.addEventListener('change',suggestListName);   // vor der Vorschau, die den Namen zeigt
newListPrivacy=listPrivacyField(()=>pickedSymbol(newStoreSymbols),[newStoreSymbols],()=>$('#store-form').elements.kind.value==='list');
$('#store-list-symbols').append(newStoreSymbols,newListPrivacy.field);
$('#store-notes-symbol').append(fixedSymbolInfo(NOTES_SYMBOL),element('p','Das Klemmbrett gehört fest zur Notizliste. Die Anzeige im Reiter kannst du später jederzeit ändern.','hint'));
newStoreDisplay=displayPicker('name');$('#store-new-display').prepend(newStoreDisplay.field);
$('#store-form').addEventListener('change',syncNewStoreForm);
$('#store-form').addEventListener('input',event=>{if(event.target.name==='name'){if(event.target.value.trim())showStoreNameError(false);syncNewStoreForm();}});
$('#store-create').addEventListener('click',()=>guard(()=>openStoreAdd('manage')));
for(const kind of document.querySelectorAll('#store-add-choice .store-kind'))kind.addEventListener('click',()=>showStoreAddStep(kind.dataset.kind));
for(const back of [$('#store-add-back'),$('#store-form-back')])back.addEventListener('click',()=>{showStoreAddStep('');$(`#store-add-choice .store-kind[data-kind="${$('#store-form').elements.kind.value}"]`)?.focus({preventScroll:true});});
$('#store-add-dialog').addEventListener('close',resetStoreAdd);
$('#store-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, kind = form.elements.kind.value, name = form.elements.name.value.trim();
  if (form.dataset.busy) return;   // ein zweiter schneller Tipp legt nichts doppelt an
  if (!name) { showStoreNameError(true); form.elements.name.closest('label').scrollIntoView({ block: 'center' }); return; }   // Hinweis zeigen, Tastatur erst beim Antippen
  showStoreNameError(false);
  if (kind === 'list' && newListPrivacy.input.checked) {
    form.dataset.busy = '1';
    const id = privateList.createList(name, [], newStoreDisplay.value()); if (!id) { delete form.dataset.busy; return; }
    finishStoreAdd({ name, privateId: id, kind }); return;
  }
  if (active(state.stores).some(store => store.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) throw new Error(kind === 'store' ? 'Dieses Geschäft gibt es bereits.' : 'Eine Liste oder ein Geschäft mit diesem Namen gibt es bereits.');
  let patch;
  if (kind === 'store') {
    const chainKey = form.elements.chainKey.value || null;
    if (chainKey && !catalogByKey(chainKey)) throw new Error('Bitte den Händler erneut auswählen.');
    if (chainKey && active(state.stores).some(store => !isSeparate(store) && chainForStore(store)?.key === chainKey)) throw new Error('Dieser Händler ist bereits hinzugefügt. Für eine weitere Filiale kannst du einen eigenen Namen eintragen.');
    const identity = { name, chainKey }, typed = offerUrl(form.elements.offersUrl.value);
    patch = { name, chainKey, offersUrl: typed === defaultOfferUrl(identity) ? '' : typed };
  } else {
    // Eigene Liste oder Notizliste: ohne Händler; das Symbol ist ab jetzt fest, die Anzeige bleibt änderbar
    const symbol = kind === 'notes' ? NOTES_SYMBOL : pickedSymbol(newStoreSymbols);
    patch = { name, separate: true, anywhere: false, chainKey: null, offersUrl: '', symbol: symbol || 'none', ...(symbol ? { displayMode: newStoreDisplay.value() } : {}) };
  }
  const id = uid(); form.dataset.busy = '1';
  try { commit([nextOp('stores', id, patch)]); } catch (error) { delete form.dataset.busy; throw error; }
  finishStoreAdd({ name, id, kind });
}); });
$('#recipe-search').addEventListener('input', renderRecipes);
$('#add-recipe').addEventListener('click', () => guard(() => editRecipe()));
$('#import-recipe').addEventListener('click', () => guard(() => openImport()));
$('#add-ingredient').addEventListener('click', () => ingredientRow());
$('#recipe-form').addEventListener('submit', saveRecipe);
$('#discard-imported-recipe').addEventListener('click',()=>guard(discardImportedRecipe));
$('#delete-recipe').addEventListener('click',()=>guard(()=>deleteRecipe($('#recipe-form').elements.rowId.value)));
$('#recipe-form').addEventListener('input', scheduleRecipeDraft);
$('#recipe-form').addEventListener('click', scheduleRecipeDraft);   // Zutat hinzufügen oder entfernen
$('#recipe-dialog').addEventListener('cancel', event => { if (!canCloseRecipe()) event.preventDefault(); });
// Sofort sichern, bevor mobile Browser Hintergrund-Timer pausieren.
document.addEventListener('visibilitychange',()=>{if(document.hidden && recipeDraftKey && !recipeSaving)saveRecipeDraft();});
window.addEventListener('beforeunload',event=>{
  if(restoring || recipeSaving || (recipeDraftKey && !saveRecipeDraft())) { event.preventDefault(); event.returnValue=''; }
});
$('#recipe-dialog').addEventListener('close', () => {
  if (recipeDraftKey && (recipeSaving || !saveRecipeDraft())) { $('#recipe-dialog').showModal(); return; }
  recipeDraftKey = null; recipeDraftScope = null;
});
document.querySelectorAll('#import-form [data-source]').forEach(node => node.addEventListener('click', () => setImportSource(node.dataset.source)));
$('#import-form').elements.publicProxy.addEventListener('change', () => guard(saveImportPermission));
stopImportHold=holdToConfirm($('#import-run'),1000,()=>cancelImport(),'',()=>Boolean(importAbort));
$('#import-cancel').addEventListener('click', () => cancelImport());
$('#import-form').elements.images.addEventListener('change', event => showPreviews([...event.target.files]));
$('#import-form').addEventListener('submit', event => { event.preventDefault(); guard(runImport); });
$('#import-dialog').addEventListener('close', () => { cancelImport(true); releasePreviews(); importStatus(''); });
$('#week-prev').addEventListener('click', () => { planWeek = addDays(planWeek, -7); renderPlan(); });
$('#week-next').addEventListener('click', () => { planWeek = addDays(planWeek, 7); renderPlan(); });
$('#week-today').addEventListener('click', () => { planWeek = weekStart(isoDate()); renderPlan(); });
$('#plan-shopping').addEventListener('click', () => guard(openWeekShopping));
$('#meal-form').addEventListener('submit', saveMeal);
$('#meal-change-day').addEventListener('click', () => { const form = $('#meal-form'); form.querySelector('[data-day]').hidden = false; form.elements.date.min = isoDate(); form.elements.date.focus(); });
for(const [id,delta] of [['meal-portions-down',-1],['meal-portions-up',1]]) $('#'+id).addEventListener('click',()=>guard(()=>{
  const input=$('#meal-form').elements.servings;
  input.value=plain(Math.max(1,positive(input.value)+delta));syncMealForm(false);
}));
$('#meal-servings').addEventListener('pointerdown',event=>event.preventDefault());
$('#meal-servings').addEventListener('focus',event=>event.target.blur());
for(const field of ['servings','date'])$('#meal-form').elements[field].addEventListener('input',()=>syncMealForm(false));
$('#plan-adjust-apply').addEventListener('click',()=>finishPlanAdjustment(true));
$('#plan-adjust-keep').addEventListener('click',()=>finishPlanAdjustment(false));
$('#plan-adjust-dialog').addEventListener('close',()=>{planAdjustment=null;});
$('#plan-recipe-dialog').addEventListener('close',()=>{if(!$('#plan-recipe-dialog').open){closeRecipeStock();plannedRecipe=null;$('#plan-recipe-content').replaceChildren();}});
$('#week-form').elements.skipDone.addEventListener('change', renderWeekRows);
$('#week-form').elements.skipListed.addEventListener('change', renderWeekRows);
$('#week-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget;
  // Unmittelbar vor dem Übernehmen noch einmal den aktuellen Stand prüfen: Hat inzwischen jemand übernommen oder den Plan geändert (das Fenster stand offen), wird nichts addiert;
  // die Vorschau wird aktualisiert und muss noch einmal bestätigt werden.
  if (weekSignature(weekPlan()) !== weekSignature(form._plan)) { refreshWeekRows(); throw new Error('Der Wochenplan hat sich geändert (z. B. wurde schon übernommen). Die Vorschau ist aktualisiert; bitte prüfen und noch einmal bestätigen.'); }
  const selected = [...$('#week-ingredients').children].filter(label => label._row && label.querySelector('input').checked).map(label => label._row);
  if (!selected.length) throw new Error('Bitte mindestens eine Zutat auswählen.');
  const storeId = currentStore(form.elements.storeId.value);
  // Die Gerichte, deren Zutaten jetzt auf die Liste gehen, merken sich das (für wie viele Portionen), damit ein zweites Mal nichts verdoppelt. Dieselbe Änderung wie die Artikel.
  transferWeekParts(form._plan,selected,storeId,form.elements.rememberPantry.checked);
  view = 'all'; $('#week-dialog').close(); render(); tab('shopping');
}); });
$('#recipe-form').elements.photo.addEventListener('change', event => guard(async () => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  const editorVersion=photoEditVersion;
  const blob = await resizePhoto(file);
  if(editorVersion!==photoEditVersion || !$('#recipe-dialog').open) return;
  pendingPhoto = { id: uid(), blob }; photoRemoved = false;
  showPhotoPreview(URL.createObjectURL(blob)); refreshDirty($('#recipe-form'));   // das Foto ist erst nach dem Verkleinern da
}));
$('#photo-remove').addEventListener('click', () => { ++photoEditVersion;pendingPhoto = null; photoRemoved = true; showPhotoPreview(''); });
$('#recipe-dialog').addEventListener('close', () => { if ($('#recipe-dialog').open) return; ++photoEditVersion;pendingPhoto = null; showPhotoPreview(''); });
$('#transfer-form').elements.servings.addEventListener('change', () => guard(updateTransfer));
$('#transfer-form').elements.rememberPantry.addEventListener('change', () => guard(updateTransfer));
// Während des Tippens still mitrechnen; bei unfertiger Eingabe („2,“) bleibt die Anzeige einfach stehen.
$('#transfer-form').elements.servings.addEventListener('input', () => { try { updateTransfer(); } catch { /* Eingabe noch unvollständig */ } });
$('#transfer-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget; let selected = [...$('#transfer-ingredients').children]
    .filter(label => label.querySelector('input').checked && !isCookingWater(label._ingredient.name)).map(label => label._ingredient);
  if (!active(state.recipes).some(row => row.id === transferRecipe.id)) throw new Error('Das Rezept wurde inzwischen gelöscht.');
  const factor = positive(form.elements.servings.value) / transferRecipe.servings;
  const unchecked=[...$('#transfer-ingredients').children].filter(label=>!label.querySelector('input').checked&&(!label._shoppingCovered||label._dirty)).map(label=>label._ingredient.name);
  if(form._meal){
    const meal=active(state.meals).find(row=>row.id===form._meal.id&&row.recipeId===transferRecipe.id);
    if(form._mealScope!==namespace()||!meal||JSON.stringify(meal)!==JSON.stringify(form._meal)||transferRecipeSignature(transferRecipe.id)!==form._mealRecipeSignature)throw new Error('Das Gericht wurde inzwischen geändert. Bitte die Zutatenübernahme schließen und aus dem Wochenplan erneut öffnen.');
    const count=positive(form.elements.servings.value),use={...meal,servings:count},mark={...meal,servings:(Number(meal.listedServings)||0)+count};
    commit(prepareWeekParts({meals:[mark],basket:{use:[use]}},selected,currentStore(form.elements.storeId.value),form.elements.rememberPantry.checked,state,unchecked),'Zutaten für das geplante Gericht übernommen');
  }else {
    const missing=recipeNeeds(selected,factor),remember=form.elements.rememberPantry.checked;
    if(missing.length||remember&&pantryAdditions(unchecked,pantryKeys(state.pantry)).length)addRows(missing,currentStore(form.elements.storeId.value),unchecked,remember);
    else showNotice(selected.length?'Die ausgewählten Zutaten stehen bereits im Vorrat oder auf dem Einkaufszettel.':'Keine weiteren Zutaten hinzugefügt.');
  }
  if(form._meal)$('#plan-recipe-dialog').close();
  view = 'all'; $('#transfer-dialog').close(); render(); tab('shopping');
}); });
$('#settings-form').addEventListener('submit', event => { event.preventDefault(); guard(async () => {
  if (busy || restoring) throw new Error('Bitte den laufenden Abgleich oder die Wiederherstellung kurz abwarten.');
  const form = event.currentTarget, next = { ...config };
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token']) next[key] = form.elements[key].value.trim();
  next.tokenExpires = form.elements.tokenExpires.value;
  if (next.token !== config.token && next.tokenExpires === (config.tokenExpires || '')) next.tokenExpires = '';   // neuer Token: das alte Datum gilt nicht mehr
  if (!/^[A-Za-z0-9-]+$/.test(next.owner) || !/^[A-Za-z0-9_.-]+$/.test(next.repo) ||
      !next.branch || !next.path.endsWith('.json') || next.path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Bitte Benutzername, Repository, Branch und einen relativen JSON-Dateinamen prüfen (keine vollständige URL).');
  if (!sameTarget(config, next) && pending.length && namespace() !== 'einkauf-demo-v1') throw new Error('Vor einem Repository-Wechsel bitte die ausstehenden Änderungen synchronisieren. Du kannst dafür den Token des bisherigen Repositorys ersetzen.');
  delete next.savedAt;
  if (next.actor !== config.actor) { delete next.memberId; delete next.memberScope; }
  saveConfig(next); retryAt = 0; message(); await loadWorkspace();
  // „Gespeichert am …“ erst, wenn die Verbindung klappt; sonst bleibt der Knopf für einen neuen Versuch aktiv.
  connectFailed = $('#status').dataset.state === 'error';
  if (!connectFailed) { saveConfig({ ...config, savedAt: new Date().toISOString() }); confirmFormSave(form, 'Verbindungseinstellungen gespeichert'); }
  updateSaveButtons();
}); });
$('#import-settings-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, text = form.elements.importProxy.value.trim(), proxy = workerAddress(text);
  if (text && !proxy) throw new Error('Bitte die Adresse deines Cloudflare-Workers eingeben. Sie beginnt mit https:// und endet auf .workers.dev.');
  const dailyText = form.elements.dailySource.value.trim(), dailyLink = webUrl(dailyText);
  if (dailyText && !dailyLink) throw new Error('Bitte bei „Rezepte des Tages“ einen vollständigen Link mit https:// eingeben oder das Feld leeren.');
  saveConfig({ ...config, importProxy: proxy, publicProxy: form.elements.publicProxy.checked, dailySource: dailyLink, importSavedAt: new Date().toISOString() });
  form.elements.dailySource.value = dailyLink; renderDailyButton();
  form.elements.importProxy.value = proxy; updateSaveButtons(); confirmFormSave(form, 'Import-Einstellungen gespeichert'); message(); status('Import-Einstellungen gespeichert', 'ok'); setTimeout(restingStatus, 2500);
}); });
$('#test-proxy').addEventListener('click', () => guard(async () => {
  const proxy = workerAddress($('#import-settings-form').elements.importProxy.value);
  if (!proxy) throw new Error('Bitte zuerst die Adresse deines Hilfsdienstes eintragen (https://…workers.dev).');
  saveConfig({ ...config, importProxy: proxy, importSavedAt: new Date().toISOString() }); updateSaveButtons();
  try { await fetchRecipePage('https://example.com/', { workerUrl: proxy, allowPublic: false }); }
  catch (error) { throw new Error(`Der Hilfsdienst antwortet nicht wie erwartet. ${error.message}`); }
  message(); status('Hilfsdienst funktioniert', 'ok'); setTimeout(restingStatus, 2500);
}));
/* ---------- Papierkorb „Kürzlich gelöscht“ (siehe trash.js) ---------- */
const TRASH_ICON = Object.fromEntries(TRASH_KINDS.map(entry => [entry.kind, entry.icon]));
const TRASH_LABEL = Object.fromEntries(TRASH_KINDS.map(entry => [entry.kind, entry.label]));
const timeOf = at => new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
// Die Hinweise unter Einkaufsliste, Rezepten, Wochenplan und Ausgaben erscheinen nur, wenn dort etwas zurückzuholen ist.
/* Zwei getrennte Papierkörbe (2.157): der allgemeine „Kürzlich gelöscht“ mit allem Gemeinsamen (trash.js) und je geheimer Liste ein eigener
   (private-list-view.js), erreichbar nur am Ende dieser Liste. Was in einer geheimen Liste gelöscht wurde, erscheint nirgends sonst. */
let trashScope = 'shared';
const newestFirst = entries => entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || a.title.localeCompare(b.title, 'de'));
const sharedTrash = () => ready ? newestFirst(trashEntries(state)) : [];
const openPrivateId = () => !$('#private-list-panel').hidden ? privateViewId(view) : '';
const privateTrashEntries = (listId = openPrivateId()) => ready && listId ? newestFirst(privateList?.trash(Date.now(), listId) || []) : [];
const allTrash = () => trashScope === 'private' ? privateTrashEntries() : sharedTrash();
function renderTrashLinks() {
  const shared = trashCounts(sharedTrash()), own = privateTrashEntries().length, privateOpen = !$('#private-list-panel').hidden;
  for (const node of document.querySelectorAll('[data-trash-kind]')) {
    const count = node.dataset.trashKind === 'private' ? own : node.dataset.trashKind.split(' ').reduce((sum, kind) => sum + (shared[kind] || 0), 0);
    node.hidden = !count || (privateOpen && node.id === 'shopping-trash-link'); node.querySelector('.trash-link-count').textContent = count ? `(${count})` : '';
    node.setAttribute('aria-label', `${node.querySelector('span').textContent}: ${count} ${count === 1 ? 'Eintrag' : 'Einträge'} wiederherstellbar`);
  }
  const total = sharedTrash().length;   // Optionen: nur der allgemeine Papierkorb
  $('#trash-summary').textContent = total ? `${total} ${total === 1 ? 'Eintrag' : 'Einträge'} aus den letzten ${TRASH_DAYS} Tagen wiederherstellbar` : `Leer · Gelöschtes bleibt hier ${TRASH_DAYS} Tage`;
}
function openTrash(kind = 'all') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  trashScope = kind === 'private' ? 'private' : 'shared';
  const secret = trashScope === 'private' && privateList?.lists.find(list => list.id === openPrivateId());
  $('#trash-title').textContent = secret ? `Kürzlich gelöscht · ${secret.name}` : 'Kürzlich gelöscht';
  $('#trash-intro').textContent = secret ? `Was in „${secret.name}“ in den letzten ${TRASH_DAYS} Tagen gelöscht wurde. Es liegt nur auf diesem Gerät und erscheint in keinem anderen Papierkorb.` : `Was in den letzten ${TRASH_DAYS} Tagen gelöscht wurde, kannst du hier zurückholen – auf allen verbundenen Geräten.`;
  document.querySelector('#trash-dialog .trash-foot').hidden = Boolean(secret);   // „Einkauf beenden“ betrifft nur gemeinsame Artikel
  // Ein Hinweis kann mehrere Arten zusammenfassen (Einkaufsliste: Artikel und Listen); markiert wird die erste vorhandene.
  const counts = trashCounts(allTrash());
  trashFilter = kind === 'all' ? 'all' : kind.split(' ').find(entry => counts[entry]) || 'all'; trashUndo = null; $('#trash-status').hidden = true;
  renderTrash(); if (!$('#trash-dialog').open) { $('#trash-dialog').showModal(); $('#trash-title').focus({ preventScroll: true }); }   // nicht das ×: Safari zeichnet sonst einen Fokusring (wie 2.162)
}
function renderTrash() {
  const entries = allTrash(), counts = trashCounts(entries);
  const kinds = trashFilter.split(' ').filter(kind => counts[kind]);
  if (trashFilter !== 'all' && !kinds.length) trashFilter = 'all';
  const shown = trashFilter === 'all' ? entries : entries.filter(entry => trashFilter.split(' ').includes(entry.kind));
  const filter = $('#trash-filter'); filter.replaceChildren();
  const chip = (value, label, count) => {
    const node = element('button', undefined, 'chip'); node.type = 'button'; node.setAttribute('aria-pressed', String(trashFilter === value));
    node.append(element('span', label), element('span', String(count), 'count'));
    node.addEventListener('click', () => { trashFilter = value; renderTrash(); });
    filter.append(node);
  };
  if (entries.length) chip('all', 'Alle', entries.length);
  for (const { kind, label } of TRASH_KINDS) if (counts[kind]) chip(kind, label, counts[kind]);
  filter.hidden = TRASH_KINDS.filter(({ kind }) => counts[kind]).length < 2;
  const list = $('#trash-list'); list.replaceChildren();
  let day = '';
  for (const entry of shown) {
    const label = trashDayLabel(entry.deletedAt);
    if (label !== day) { day = label; list.append(element('h3', label, 'trash-day')); }
    const row = element('article', undefined, 'trash-row'); row.dataset.kind = entry.kind;
    const badge = element('span', undefined, 'trash-row-icon'); badge.append(icon(TRASH_ICON[entry.kind]));
    const copy = element('div', undefined, 'trash-row-copy');
    copy.append(element('strong', entry.title), element('small', [TRASH_LABEL[entry.kind], entry.detail, `gelöscht ${timeOf(entry.deletedAt)} Uhr`].filter(Boolean).join(' · ')));
    const restore = button('', () => restoreFromTrash(entry), 'secondary trash-restore');
    restore.append(icon('undo'), element('span', 'Wiederherstellen')); restore.setAttribute('aria-label', `${entry.title} wiederherstellen`);
    row.append(badge, copy, restore); list.append(row);
  }
  $('#trash-empty').hidden = entries.length > 0;
  list.hidden = !shown.length;
  // „Papierkorb leeren“ steht klein am Ende und nur, wenn es etwas zu leeren gibt.
  // Geleert wird nur, was im gewählten Reiter steht (2.165); unter „Alle“ heißt der Knopf wie bisher „Papierkorb leeren“.
  const part = trashScope === 'private' ? '' : trashPurgeLabel();
  $('#trash-purge').hidden = !shown.length;
  $('#trash-purge').querySelector('span').textContent = part ? `${part} endgültig löschen` : 'Papierkorb leeren';
  $('#trash-purge').setAttribute('aria-label', `${part ? `${part} leeren` : 'Papierkorb leeren'}: ${shown.length} ${shown.length === 1 ? 'Eintrag' : 'Einträge'} endgültig löschen`);
}
function restoredWhere(entry, changes) {
  const name = `„${entry.title}“`;
  const notes = entry.kind === 'items' && isNotesStore(active(state.stores).find(store => store.id === state.items.find(row => row.id === entry.id)?.storeId));
  if (notes) return `${name} steht wieder bei den Notizen`;
  if (entry.kind === 'items') return `${name} steht wieder auf der Einkaufsliste${changes[0].patch.storeId === '' ? ' (ohne Geschäft, weil das Geschäft gelöscht ist)' : ''}`;
  if (entry.kind === 'recipes') return `${name} ist wieder im Rezeptbuch`;
  if (entry.kind === 'meals') return `${name} steht wieder im Wochenplan${changes.length > 1 ? ', das Rezept ebenfalls wieder im Rezeptbuch' : ''}`;
  if (entry.kind === 'purchases') return 'Die Ausgabe ist wieder eingetragen';
  if (entry.kind === 'stores') return `${name} ist wieder da`;
  if (entry.kind === 'ownProducts') return `${name} ist wieder bei den eigenen Produkten${changes.length > 1 ? ', samt Stern' : ''}`;
  if (entry.kind === 'aliases') return `Die Schreibweise ${name} gilt wieder`;
  if (entry.kind === 'expenseCategories') return `Die Kategorie ${name} ist wieder wählbar`;
  if (entry.kind === 'private') return `${name} steht wieder in der geheimen Liste`;
  return `Vorlage ${name} ist wieder da`;
}
function restoreFromTrash(entry) {
  if (entry.kind === 'private') {
    if (!privateList?.restore(entry.id)) return;
    trashUndo = [{ collection: 'private', id: entry.id }];
    $('#trash-status-text').textContent = restoredWhere(entry, []); $('#trash-status').hidden = false; $('#trash-undo').hidden = false;
    renderTrash(); return;
  }
  const changes = restoreChanges(state, entry.collection, entry.id, new Date().toISOString());
  if (!changes.length) throw new Error('Dieser Eintrag ist nicht mehr im Papierkorb.');
  const undo = withBefore(state, changes);   // Vorher-Stand vor dem Speichern merken (2.149): „Rückgängig“ stellt ihn genau wieder her
  commit(changes.map(change => nextOp(change.collection, change.id, change.patch)));
  trashUndo = undo;
  $('#trash-status-text').textContent = restoredWhere(entry, changes); $('#trash-status').hidden = false; $('#trash-undo').hidden = false;
  renderTrash();
}
$('#trash-undo').addEventListener('click', () => guard(() => {
  const undo = trashUndo; trashUndo = null; if (!undo) return;
  if (undo[0]?.collection === 'private') { privateList?.remove(undo[0].id, { quiet: true }); $('#trash-status-text').textContent = 'Wieder in den Papierkorb gelegt'; $('#trash-undo').hidden = true; renderTrash(); return; }
  // Nur zurücknehmen, was noch im wiederhergestellten Zustand ist (eigene Produkte: Löschmarke aufgehoben, sonst: nicht gelöscht).
  const restored = ({ collection, id }) => (state[collection] || []).some(row => row.id === id && (collection === 'productRemovals' ? row.deletedAt : !row.deletedAt));
  commit(undoRestoreChanges(undo.filter(restored)).map(change => nextOp(change.collection, change.id, change.patch)));
  $('#trash-status-text').textContent = 'Wieder in den Papierkorb gelegt'; $('#trash-undo').hidden = true; renderTrash();
}));
/* „Papierkorb leeren“: endgültig löschen (auf allen Geräten), was im gewählten Reiter steht: unter „Alle“ alles, unter „Artikel“ nur Artikel,
   unter „Ausgaben“ nur Ausgaben usw. (2.165). Bewusst mit Rückfrage und ohne „Rückgängig“; der Git-Verlauf des privaten Daten-Repositorys bleibt
   die letzte Rettung. Der nächste Abgleich räumt die Daten aus der Datei. */
function trashPurgeKinds() { return trashFilter === 'all' ? null : trashFilter.split(' '); }
function trashPurgeLabel() { return trashFilter === 'all' ? '' : TRASH_KINDS.filter(({ kind }) => trashFilter.split(' ').includes(kind)).map(({ label }) => label).join(' und '); }
$('#trash-purge').addEventListener('click', () => guard(async () => {
  // Geleert wird nur der gerade offene Papierkorb: der allgemeine oder der einer geheimen Liste (2.157).
  const secret = trashScope === 'private', listId = secret ? openPrivateId() : '';
  const kinds = secret ? null : trashPurgeKinds(), part = secret ? '' : trashPurgeLabel();
  const before = secret ? privateTrashEntries(listId).length : trashEntries(state).filter(entry => !kinds || kinds.includes(entry.kind)).length;
  if (!before) return;
  const what = part ? (before === 1 ? `Den Eintrag unter „${part}“` : `Alle ${before} Einträge unter „${part}“`) : before === 1 ? 'Den Eintrag' : `Alle ${before} Einträge`;
  if (!await ask({ title: part ? `${part} endgültig löschen?` : 'Papierkorb leeren?', message: `${what} im Papierkorb endgültig löschen?\n\nDas lässt sich nicht rückgängig machen${secret ? ' (nur auf diesem Gerät)' : connected() ? ' und gilt auf allen Geräten' : ''}.`, confirmLabel: 'Endgültig löschen', danger: true })) return;
  // Erst nach der Rückfrage bestimmen, was gelöscht wird: Ein Abgleich kann den Papierkorb inzwischen verändert haben.
  const changes = secret ? [] : purgeChanges(state, undefined, undefined, kinds), own = secret && listId ? privateList?.purge(listId) || 0 : 0;
  const count = secret ? own : trashEntries(state).filter(entry => !kinds || kinds.includes(entry.kind)).length;
  if (!count) return;
  if (changes.length) {
    if (connected()) compactRequested = true;
    commit(changes.map(change => nextOp(change.collection, change.id, change.patch)));
    if (!connected()) { const result = compact(state); if (result.changed) saveLocal(result.data, []); render(); }
  }
  trashUndo = null; trashFilter = 'all';
  $('#trash-status-text').textContent = `${part ? `${part} geleert` : 'Papierkorb geleert'} · ${count} ${count === 1 ? 'Eintrag' : 'Einträge'} endgültig gelöscht`;
  $('#trash-status').hidden = false; $('#trash-undo').hidden = true;
  renderTrash();
}));
$('#trash-open').addEventListener('click', () => guard(() => openTrash()));
document.querySelectorAll('[data-trash-kind]').forEach(node => node.addEventListener('click', () => guard(() => openTrash(node.dataset.trashKind))));

/* ---------- Offline-Anzeige ---------- */
// Ein schmales Band oben: ohne Netz (oder wenn GitHub nicht erreichbar ist) mit der Zahl der wartenden Änderungen,
// nach der Rückkehr kurz „Wieder online“. Gearbeitet werden kann jederzeit; nichts geht verloren.
function renderConnectionBand(event = '') {
  const band = $('#connection-band'), offline = navigator.onLine === false || networkDown, use = band.querySelector('use');
  if (offline) {
    clearTimeout(bandTimer);
    const waiting = connected() && pending.length ? ` · ${pending.length} ${pending.length === 1 ? 'Änderung wartet' : 'Änderungen warten'}` : '';
    const text = navigator.onLine === false ? `Offline${waiting || (connected() ? ' · Änderungen werden später gesendet' : ' · die App funktioniert weiter')}` : `GitHub nicht erreichbar${waiting || ' · Änderungen bleiben auf diesem Gerät'}`;
    if ($('#connection-text').textContent !== text) $('#connection-text').textContent = text;
    use.setAttribute('href', '#i-wifi-off'); band.dataset.state = 'offline'; band.hidden = false;
    return;
  }
  if (band.hidden || band.dataset.state === 'idle') return;
  if (band.dataset.state === 'offline' || event === 'online') {
    band.dataset.state = 'online'; use.setAttribute('href', '#i-wifi');
    $('#connection-text').textContent = connected() && (pending.length || busy) ? 'Wieder online · gleiche ab …' : 'Wieder online';
    clearTimeout(bandTimer); bandTimer = setTimeout(() => { band.hidden = true; band.dataset.state = 'idle'; }, connected() && pending.length ? 6000 : 2400);
  } else if (band.dataset.state === 'online' && event === 'synced') {
    $('#connection-text').textContent = 'Wieder online · alles abgeglichen';
    clearTimeout(bandTimer); bandTimer = setTimeout(() => { band.hidden = true; band.dataset.state = 'idle'; }, 1800);
  }
}
addEventListener('offline', () => renderConnectionBand('offline'));
addEventListener('online', () => { networkDown = false; renderConnectionBand('online'); });

// Notfallansicht für einen beschädigten lokalen Speicher: erst sichern, dann bewusst verwerfen und neu laden.
let brokenCache = '';
function openStorageRecovery(raw) {
  brokenCache = String(raw || '');
  $('#storage-recovery-reload').textContent = connected() ? 'Lokalen Stand verwerfen und neu von GitHub laden' : 'Lokalen Stand verwerfen und Beispieldaten laden';
  if (!$('#storage-recovery').open) $('#storage-recovery').showModal();
}
const backupName = kind => `sattplan-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
$('#storage-recovery-save').addEventListener('click', () => guard(() => deliverFile(new File([brokenCache], backupName('lokaler-speicher'), { type: 'application/json' }))));
$('#storage-recovery-reload').addEventListener('click', () => guard(async () => {
  if (!await ask({ title: 'Lokalen Stand verwerfen?', message: 'Noch nicht gesendete Änderungen auf diesem Gerät gehen dabei verloren. Sichere ihn vorher als Datei.', confirmLabel: 'Verwerfen', danger: true })) return;
  try { localStorage.removeItem(namespace()); } catch { throw new Error('Der Browser lässt den Speicher gerade nicht ändern. Bitte die App ganz schließen und erneut öffnen.'); }
  location.reload();
}));
$('#quarantine-save').addEventListener('click', () => guard(() => deliverFile(new File([JSON.stringify({ app: 'Sattplan', target: namespace(), changes: quarantined() }, null, 2)], backupName('nicht-uebernommene-aenderungen'), { type: 'application/json' }))));
$('#quarantine-discard').addEventListener('click', () => guard(async () => {
  if (!await ask({ title: 'Beiseitegelegte Änderungen verwerfen?', message: 'Sie werden endgültig verworfen. Sichere sie vorher als Datei, falls du sie noch brauchst.', confirmLabel: 'Verwerfen', danger: true })) return;
  try { localStorage.removeItem(quarantineKey()); } catch { /* bleibt sichtbar */ }
  renderQuarantine(); showNotice('Beiseitegelegte Änderungen verworfen');
}));
$('#disconnect').addEventListener('click', () => guard(async () => {
  if (busy || restoring) throw new Error('Bitte den laufenden Abgleich oder die Wiederherstellung kurz abwarten.');
  if (!await ask({ title: 'Token entfernen?', message: 'Der Token wird auf diesem Gerät entfernt. Lokale Repository-Daten und ausstehende Änderungen bleiben für eine spätere erneute Verbindung gespeichert.', confirmLabel: 'Token entfernen', danger: true })) return;
  if (busy || restoring) throw new Error('Bitte den laufenden Abgleich oder die Wiederherstellung kurz abwarten.');
  const { owner, repo, branch, path, token, tokenExpires, savedAt, ...kept } = config;   // alles andere (Name, Darstellung, Hilfsdienst …) bleibt auf diesem Gerät
  saveConfig(kept);
  fillSettings(); message(); await loadWorkspace();
}));
$('#group-items').addEventListener('change', () => guard(() => { saveConfig({ ...config, groupItems: $('#group-items').checked }); renderItems(); }));
$('#display-reset').addEventListener('click', () => guard(() => {
  saveConfig({...config,...DISPLAY_DEFAULTS});fillDisplaySettings();render();renderShop();renderStores();
  message();showNotice('Anzeige-Einstellungen auf Standard zurückgesetzt.');
}));
// Gilt sofort, ohne Neuladen: Aus = keine Kacheln, die Zeile sieht aus wie früher.
$('#product-images').addEventListener('change', () => guard(() => { saveConfig({ ...config, productImages: $('#product-images').checked }); renderItems(); renderShop(); renderPantry();privateList?.refresh(); renderSpending(); }));
$('#store-style').addEventListener('change', () => guard(() => { saveConfig({ ...config, storeStyle: $('#store-style').value }); render(); renderShop(); renderStores(); }));
$('#theme').addEventListener('change', () => guard(() => { saveConfig({ ...config, theme: $('#theme').value }); applyTheme(); }));
$('#glass-on').addEventListener('change', () => guard(() => { saveConfig({ ...config, glass: $('#glass-on').checked }); applyTheme(); }));
$('#glass-bg').addEventListener('click', event => guard(() => {
  const choice = event.target.closest('button[data-bg]')?.dataset.bg;
  if (choice) { saveConfig({ ...config, glassBg: choice }); applyTheme(); }
}));
// Beim Ziehen sofort zeigen, erst beim Loslassen merken.
$('#glass-level').addEventListener('input', () => guard(() => { if (glassOn()) showGlassLevel(Number($('#glass-level').value)); }));
$('#glass-level').addEventListener('change', () => guard(() => { saveConfig({ ...config, glassLevel: Number($('#glass-level').value) }); applyTheme(); }));
$('#palette').addEventListener('click', event => guard(() => {
  const choice = event.target.closest('button[data-palette]')?.dataset.palette;
  if (choice) { saveConfig({ ...config, palette: choice }); applyTheme(); }
}));
expenseCategoryPicker = mountExpenseCategoryPicker({
  getData:()=>state,getScope:namespace,makeIcon:icon,
  onCommit:changes=>{
    if(!ready)throw new Error('Bitte die Daten zuerst öffnen oder verbinden.');
    const ops=changes.map(change=>nextOp(change.collection,change.id,change.patch));
    if(sizeOf(merge(state,ops))>LIMIT_BYTES)throw new Error('Die Änderung wäre für den Datenspeicher zu groß. Bitte zuerst eine Sicherung erstellen und alte Daten aufräumen. Es wurde nichts geändert.');
    commit(ops);
  },
  beforeDelete:async()=>{if(connected()){if(busy)throw new Error('Bitte den laufenden Abgleich kurz abwarten.');await freshSync();}},
  onOrder:(getRows,onChange)=>openOrderControls({title:'Kategorien sortieren',scope:namespace(),getScope:namespace,getRows,onChange})
});
$('#export').addEventListener('click', () => guard(backup));
$('#export-full').addEventListener('click', () => guard(backupFull));
$('#cook-awake').addEventListener('change', event => guard(async () => { awake.cook.failed = false; saveConfig({ ...config, cookAwake: event.target.checked }); await keepAwake('cook', event.target.checked); }));
$('#cook-dialog').addEventListener('close', () => { void keepAwake('cook', false); });
// iOS gibt die Sperre frei, sobald die App in den Hintergrund geht; beim Zurückkehren wird sie neu angefordert.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (awake.cook.wanted && !awake.cook.lock && $('#cook-dialog').open) void keepAwake('cook', true);
  awake.shop.failed = false; syncShopAwake();
});
$('#mode-plan').addEventListener('click', () => guard(() => setShopMode(false)));
$('#shop-back').addEventListener('click', () => guard(() => setShopMode(false)));
$('#mode-shop').addEventListener('click', () => guard(() => setShopMode(true)));
$('#shop-awake').addEventListener('change', event => guard(() => { awake.shop.failed = false; saveConfig({ ...config, shopScreenOn: event.target.checked }); syncShopAwake(); }));
holdToConfirm($('#shop-finish'), HOLD_FINISH_MS, () => { if (!isLocked()) openFinish(); }, '', () => !isLocked(), openFinish);
$('#finish-only').addEventListener('click', () => guard(() => finishShopping()));
// Eine sichtbare Abschlussaktion statt des Plus im Betragsfeld. „Fertig“
// schließt nur die Tastatur; die Angaben lassen sich vor dem Speichern prüfen.
let finishSaveIntent = 0;
for(const type of ['input','change'])$('#finish-amount').addEventListener(type,syncFinishActions);
$('#finish-amount').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.isComposing){event.preventDefault();document.activeElement?.blur?.();if(!$('#finish-save').hidden)$('#finish-save').focus();}
});
$('#finish-save').addEventListener('pointerdown', () => { finishSaveIntent = Date.now(); });
$('#finish-form').addEventListener('submit', event => {
  event.preventDefault();
  if (Date.now() - finishSaveIntent < 1500) document.activeElement?.blur?.();
  finishSaveIntent = 0;
  guard(() => {
    const amount = event.currentTarget.elements.amount.value;
    if (!amount.trim()) throw new Error('Bitte einen Betrag eingeben oder „Einkauf beenden“ wählen.');
    finishShopping(amount);
  });
});
$('#add-purchase').addEventListener('click', () => guard(() => openPurchase()));
$('#spending-first').addEventListener('click', () => guard(() => openPurchase()));
$('#add-dining').addEventListener('click', () => guard(() => openDining()));
$('#dining-budget').addEventListener('change', event => {
  const box = event.target;
  try { setDiningBudget(box.checked); } catch (error) { box.checked = diningCountsNow(); message(error.message); }
});
$('#dining-form').addEventListener('submit', event => { event.preventDefault(); guard(saveDining); });
// Gespeichert wird nur mit „Speichern“ (2.174): Enter bzw. „Fertig“ auf der Tastatur schließt in den Feldern nur die Tastatur.
$('#dining-form').addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.isComposing || !(event.target instanceof HTMLInputElement)) return;
  event.preventDefault(); event.target.blur();
});
$('#dining-form').elements.place.addEventListener('input', () => { renderDiningPlaces(); renderLastRating(); });
for (const radio of $('#dining-form').querySelectorAll('input[name=kind]')) radio.addEventListener('change', syncDiningKind);
$('#dining-rating-toggle').addEventListener('click', () => openDiningRating($('#dining-rating-panel').hidden));
for (const star of $('#dining-rating').querySelectorAll('.dining-star')) star.addEventListener('click', () => {
  const stars = Number(star.dataset.value), current = Number($('#dining-form').elements.rating.value) || 0;
  setDiningRating(stars === current ? 0 : stars);   // nochmals auf den gewählten Stern: Bewertung zurücksetzen
});
$('#dining-delete').addEventListener('click', () => guard(async () => {
  const id = $('#dining-form').elements.rowId.value, row = id ? purchaseRows().find(entry => entry.id === id) : null;
  if (!row) { $('#dining-dialog').close(); return; }
  const what = `${euros(row.cents)}${row.storeName ? ` in ${row.storeName}` : ''} vom ${new Date(`${row.date}T12:00:00`).toLocaleDateString('de-DE')}`;
  if (!await ask({ title: diningKind(row).id === 'drinks' ? 'Getränke löschen?' : 'Restaurantbesuch löschen?', message: `${what} wird gelöscht. 14 Tage lang lässt er sich unter „Kürzlich gelöscht“ zurückholen.`, confirmLabel: 'Löschen', danger: true })) return;
  if (!purchaseRows().some(entry => entry.id === id)) { $('#dining-dialog').close(); return; }
  $('#dining-dialog').close(); dropPurchase(row);
}));
$('#dining-dialog').addEventListener('close', () => { duplicateWarned = ''; });
$('#budget-form').addEventListener('submit', event => { event.preventDefault(); guard(saveBudget); });
$('#budget-remove').addEventListener('click', () => guard(() => { $('#budget-dialog').close(); commit([nextOp('budgets', 'monthly', { cents: 0 })], 'Monatsbudget entfernt'); }));
// Das „+“ im Betragsfeld: Ein Tipp darauf fügt den Einkauf hinzu und schließt die Tastatur (auch wenn etwas fehlt, damit die Meldung nicht verdeckt wird).
let purchasePlus = 0;
$('#purchase-plus').addEventListener('pointerdown', () => { purchasePlus = Date.now(); });
$('#purchase-form').addEventListener('submit', event => {
  event.preventDefault();
  if (Date.now() - purchasePlus < 1500) document.activeElement?.blur?.();
  purchasePlus = 0; guard(savePurchase);
});
// Einträge wie Artikel löschen: Zeile lange halten und nach rechts in den roten Mülleimer schieben (statt nachträglich zu bearbeiten).
dragDelete($('#purchase-list'), $('#trash-zone'), id => guard(() => {
  const row = purchaseRows().find(entry => entry.id === id);
  if (row) dropPurchase(row);
}), '.spend-item[data-id]');
dragDelete($('#spending-dining-list'), $('#trash-zone'), id => guard(() => {
  const row = purchaseRows().find(entry => entry.id === id);
  if (row) dropPurchase(row);
}), '.dining-item[data-id]');
$('#purchase-form').elements.amount.addEventListener('input', () => { purchaseSource = 'hand'; });
$('#purchase-form').elements.images.addEventListener('change', event => guard(() => readPurchasePhoto([...event.target.files])));
$('#purchase-delete').addEventListener('click', () => guard(async () => {
  const id = $('#purchase-form').elements.rowId.value, row = id ? purchaseRows().find(entry => entry.id === id) : null;
  if (!row) { $('#purchase-dialog').close(); return; }
  // Erst nachfragen (2.160): Ein Tipp daneben löscht keinen Einkauf.
  const store = row.storeName || active(state.stores).find(entry => entry.id === row.storeId)?.name || '';
  const what = `${euros(row.cents)}${store ? ` bei ${store}` : ''} vom ${new Date(`${row.date}T12:00:00`).toLocaleDateString('de-DE')}`;
  if (!await ask({ title: row.kind === 'refund' ? 'Rückerstattung löschen?' : 'Einkauf löschen?', message: `${what} wird gelöscht. 14 Tage lang lässt er sich unter „Kürzlich gelöscht“ zurückholen.`, confirmLabel: 'Löschen', danger: true })) return;
  if (!purchaseRows().some(entry => entry.id === id)) { $('#purchase-dialog').close(); return; }   // inzwischen anderswo gelöscht
  $('#purchase-dialog').close();
  removeRows('purchases', [id]); const scope = namespace(); showNotice(`${euros(row.cents)} gelöscht`, () => undoDelete([id], scope, 'purchases'), { trash: true });
}));
$('#purchase-dialog').addEventListener('close', () => { purchaseAbort?.abort(); duplicateWarned = ''; });
$('#finish-dialog').addEventListener('close', () => { duplicateWarned = '';finishSaveIntent=0; });
$('#compact-now').addEventListener('click', () => guard(compactNow));
$('#clean-photos').addEventListener('click', () => guard(cleanPhotos));
$('#welcome').addEventListener('cancel', event => event.preventDefault());
$('#welcome-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const actor = event.currentTarget.elements.actor.value.trim(); if (!actor) throw new Error('Bitte einen Namen eingeben.');
  const next = { ...config, actor }; if (actor !== config.actor) { delete next.memberId; delete next.memberScope; }
  saveConfig(next); fillSettings(); render(); $('#welcome').close();
  if (deferredImport) { const link = deferredImport; deferredImport = null; openImport({ url: link }); }
  if (deferredAdd) { const pending = deferredAdd; deferredAdd = null; guard(() => askAddFromLink(pending)); }
}); });

// Link aus dem Teilen-Dialog oder aus einem iOS-Kurzbefehl: …/?import=https://…
// …/?add=Milch, Eier und Butter&store=Lidl (z. B. aus einem iPhone-Kurzbefehl mit Siri): legt die Artikel an. Die Adresse wird danach bereinigt.
function incomingAdd() {
  const params = new URLSearchParams(location.search), text = params.get('add');
  if (text === null) return null;
  history.replaceState(null, '', location.pathname);
  return text.trim() ? { text: text.slice(0, 2000), store: (params.get('store') || '').slice(0, 80) } : null;
}
function linkRows({ text, store }) {
  const aliases = appliedAliases();
  const rows = text.split(/[\n;]+|,(?!\d)|\s+und\s+/i).map(part => part.trim()).filter(Boolean).slice(0, 30).map(part => parseIngredientLine(part)).filter(Boolean)
    .map(row => ({ name: aliases.find(alias => alias.from === aliasKey(row.name))?.name || row.name, quantity: row.unit === NO_AMOUNT ? 1 : row.quantity, unit: row.unit === NO_AMOUNT ? 'Stück' : row.unit }));
  if (!rows.length) throw new Error('Im Link stand nichts zum Hinzufügen.');
  const wanted = productKey(store), match = wanted ? active(state.stores).find(row => productKey(row.name).includes(wanted)) : null;
  return { rows, match };
}
// Ein Link kann von überall kommen (Nachricht, Webseite). Deshalb zuerst zeigen, was er hinzufügen würde; ein Tipp bestätigt.
let incomingRows = null;
function askAddFromLink(adding) {
  const { rows, match } = linkRows(adding);
  incomingRows = adding;
  $('#incoming-add-list').replaceChildren(...rows.map(row => element('li', `${format(row.quantity)} ${row.unit} ${row.name}`)));
  $('#incoming-add-text').textContent = `${rows.length === 1 ? 'Dieser Artikel kommt' : `Diese ${rows.length} Artikel kommen`} ${match ? `bei ${match.name} ` : ''}auf die Einkaufsliste${connected() ? ' und werden mit der Familie geteilt' : ''}. Bestätige nur Links, die du selbst geöffnet hast, z. B. über einen Kurzbefehl oder Siri.`;
  if (!$('#incoming-add-dialog').open) $('#incoming-add-dialog').showModal();
}
$('#incoming-add-confirm').addEventListener('click', () => guard(() => {
  const adding = incomingRows; incomingRows = null; $('#incoming-add-dialog').close();
  if (adding) addFromLink(adding);
}));
$('#incoming-add-dialog').addEventListener('close', () => { incomingRows = null; });
function addFromLink(adding) {
  const { rows, match } = linkRows(adding);
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  const result = addToList(rows, match?.id || '', config.actor || 'Unbekannt', new Date(lastTime).toISOString(), listItems(), itemHistory());
  commit(result.ops, `Hinzugefügt: ${rows.map(row => row.name).join(', ')}${match ? ` (${match.name})` : ''}${connected() ? '' : ' · nur auf diesem Gerät: hier ist GitHub nicht verbunden'}`);
}
function incomingLink() {
  const params = new URLSearchParams(location.search);
  const link = firstUrl(params.get('import') || params.get('url') || params.get('text') || '');
  if (params.has('import') || params.has('url') || params.has('text')) history.replaceState(null, '', location.pathname);
  return link;
}
// Andere Tabs dürfen ihre Warteschlangen nicht gegenseitig überschreiben.
// Ein zweiter Tab bleibt deshalb vollständig inaktiv, bis der erste geschlossen ist.
// Frischer Start: War die App ganz geschlossen, öffnet sie wieder unter „Einkauf → Planen“ (nicht „Im Laden“ und nicht gesperrt). Ein Neuladen in derselben Sitzung
// (z. B. wenn das Handy die Seite im Hintergrund verworfen hat) bleibt, wie es war. Die Sitzung merkt sich der Browser bis zum vollständigen Schließen (sessionStorage).
const SESSION_KEY = 'einkauf-session-v1';
function freshStart() {
  try { const fresh = sessionStorage.getItem(SESSION_KEY) === null; sessionStorage.setItem(SESSION_KEY, '1'); return fresh; }
  catch { return true; }   // ohne Sitzungsspeicher gilt jeder Start als frisch
}
async function start() {
  try {
    const storedConfig=localStorage.getItem(CONFIG_KEY);
    config = storedConfig===null?{...DISPLAY_DEFAULTS}:JSON.parse(storedConfig);
    draftStore = createDraftStore(localStorage, namespace());
    try { draftStore.migrateLegacy(); } catch (error) { showNotice(error.message); }
    restoreController = mountBackupRestore({getData:()=>state,getScope:namespace,getSignature:restoreSignature,
      getTarget:()=>connected()?`${config.owner}/${config.repo} · ${config.path}`:'Nur auf diesem Gerät',
      resolvePhoto:async id=>{const local=await readPhoto(id);if(local)return local;const remote=connected()?await downloadPhoto(id):null;if(remote)await storePhoto(id,remote);return remote;},
      onRestore:restoreBackup,onSuccess:()=>showNotice(connected()?'Stand auf diesem Gerät wiederhergestellt. Der gemeinsame Abgleich läuft.':'Stand auf diesem Gerät wiederhergestellt.')});
    privateList=mountPrivateList({
      getScope:namespace,makeId:uid,makeIcon:icon,imagesOn,onError:message,
      // Gelöscht (2.147): Meldung mit „Rückgängig“; danach 14 Tage unter „Kürzlich gelöscht“ (nur auf diesem Gerät).
      onDeleted:removed=>{const scope=namespace();showNotice(`„${removed.name}“ gelöscht`,()=>{if(scope!==namespace())throw new Error('Die Datenverbindung hat sich geändert. Bitte unter „Kürzlich gelöscht“ wiederherstellen.');if(privateList.restore(removed.id))showNotice(`„${removed.name}“ ist wieder da`);},{trash:true});},
      onEdit:(form,item)=>armDirty(form,{savedAt:item.updatedAt||item.createdAt}),onSaved:name=>savedNotice(name),
      onChange:()=>{if(privateViewId(view)&&!privateList.has(privateViewId(view)))view='all';render();},
      makeThumb:item=>{const box=element('span',undefined,'item-thumb');box.setAttribute('aria-hidden','true');const image=wishImage({...item.source,...item});if(image)box.append(paintProductImage(element('span'),image));return box;}
    });
    if (freshStart() && (config.shopMode === true || config.shopLocked === true)) saveConfig({ ...config, shopMode: false, shopLocked: false });
    fillSettings();
    const adding = incomingAdd(), incoming = incomingLink();
    await loadWorkspace();
    prunePhotos(usedPhotos()).catch(() => {});
    if (!config.actor) { deferredImport = incoming; deferredAdd = adding; fillActorNames(); $('#welcome').showModal(); }
    else {
      if (adding && ready) guard(() => askAddFromLink(adding));
      if (incoming && ready) { tab('recipes'); guard(() => openImport({ url: incoming })); }
    }
    setInterval(() => { if (!document.hidden) void sync(); }, 8000);
    window.addEventListener('online', () => void sync(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) {refreshTimedStock();void sync();} });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
    mountExternalLinks();   // in einer späteren App: Links mit neuem Tab im In-App-Browser öffnen (im Browser ohne Wirkung)
    // Offline-Paket nur im Browser; eine spätere App (native Hülle) bringt ihre Dateien selbst mit (platform.js).
    if (usesServiceWorker()) {
      // Neue App-Version: Hinweis statt stillem Wechsel mitten in einer Eingabe.
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadRequested) location.reload(); else if (hadController) $('#update-banner').hidden = false; });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
        // Eine fertig geladene neue Version wartet (siehe sw.js), bis „Neu laden“ angetippt wird.
        const offer = worker => { if (worker && navigator.serviceWorker.controller) { waitingWorker = worker; $('#update-banner').hidden = false; } };
        offer(registration?.waiting);
        registration?.addEventListener?.('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(worker); }); });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) registration?.update?.().catch(() => {}); });
      }).catch(() => message('Offline-Start konnte nicht vorbereitet werden. Online funktioniert die App weiter. Bitte HTTPS und alle App-Dateien prüfen.'));
    }
  } catch (error) { message(error.message); status('Fehler · Einrichtung prüfen', 'error'); }
}
if (navigator.locks) {
  navigator.locks.request('einkauf-app-v1', { ifAvailable: true }, async lock => {
    if (!lock) {
      document.querySelectorAll('button,input,select,textarea').forEach(node => { node.disabled = true; });
      message('Die App ist bereits in einem anderen Tab oder Fenster geöffnet. Schließe es und lade diese Seite neu.');
      status('Zweiter Tab pausiert', 'error'); return;
    }
    await start(); await new Promise(() => {});
  });
} else {
  document.querySelectorAll('button,input,select,textarea').forEach(node => { node.disabled = true; });
  message('Bitte Safari/iOS 15.4 oder neuer bzw. einen aktuellen Browser verwenden. Sichere gleichzeitige Tabs benötigen die Web Locks API.');
}
