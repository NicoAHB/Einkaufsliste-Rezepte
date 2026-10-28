import { active, addToList, clone, duplicateFolds, emptyData, foldIntoList, frequentItems, inPantry, listRow, merge, operation, pantryAdditions, pantryKeys, positive, spellingVariants, suggestItemNames, uid, validDay, validate } from './data.js';
import { defaultOfferUrl, itemQuote, localDay, offerUrl, parseCents, productKey, shoppingTotal, storeOfferUrl, unitRate } from './prices.js';
import { splitSteps } from './cook.js';
import { ALL_STORES, HOLD_FINISH_MS, HOLD_ITEM_MS, HOLD_UNLOCK_MS, isSeparate, lockSeconds, shopAllView, shopCount, shopView, takesAnywhere, withoutSeparate } from './shop.js';
import { brandOf, defaultSymbol, symbolOf } from './brand.js';
import { BUILTIN_PER_DAY, BUILTIN_SOURCE, DAILY_MAX, builtinKey, draftFromBuiltin, extractRecipeLinks, planBuiltin, planDay, recipeKey, validBuiltin } from './daily.js';
import { dragDelete } from './dragdelete.js';
import { currentIds, newFromOthers } from './news.js';
import { aliasKey, parseReceipt, storeForChain } from './receipt.js';
import { pantrySuggestions } from './pantry-suggestions.js';
import { NO_AMOUNT, firstUrl, hostLabel, htmlToText, ingredientLabel, parseIngredientLine, parseRecipeText, recipeFromAnyText, recipeFromHtml, webUrl } from './recipe-import.js';
import { PUBLIC_PROXIES, fetchRecipePage, workerHost } from './page-source.js';
import { CATEGORIES, categoryLabel, groupByCategory, isCategory, itemCategory, learnCategories, orderCategories, suggestCategory } from './categories.js';
import { emojiFor } from './emoji.js';
import { GROCERY_NAMES } from './grocery-names.js';
import { addDays, aggregateIngredients, dayMonthLabel, dayName, isoDate, relativeDay, weekDays, weekLabel, weekStart } from './plan.js';
import { LONG_AGO, filterOptions, pickRecipes } from './recipe-filter.js';
import { isJpeg, localPhotoUrl, photoPath, photosDir, prunePhotos, queued, queuePhoto, readPhoto, resizePhoto, storePhoto, toBase64, unqueuePhoto } from './photos.js';
import { makeZip } from './zip.js';
import { layoutRecipe, sheetIngredient } from './recipe-sheet.js';
import { jpegInfo, makePdf } from './pdf.js';
import { renderSheet } from './sheet-view.js';
import { LIMIT_BYTES, POLICY, compact, due, sizeOf } from './compact.js';
import { namesFrom, rankRecipes } from './cookable.js';
import { DEFAULT_NOTE, budgetStatus, compareTotals, dayLabel as spendDay, estimateOf, estimateVerdict, firstMonth, formatAmount, lastDay, latestMonth, monthLabel, monthName, monthOf, noteSuggestions, parseAmount, purchaseFields, receiptAmount, recentMonths, shiftMonth, storeNameOf, summarize, validMonth } from './spending.js';

const $ = selector => document.querySelector(selector);
const CONFIG_KEY = 'einkauf-settings-v1';
let config = {}, base = emptyData(), pending = [], state = emptyData();
// Produktbilder: farbige Symbole rechts in der Artikelzeile (Einstellung „Produktbilder anzeigen“, Standard an).
const imagesOn = () => config.productImages !== false;
// Frühere Fassungen (2.13) hatten einen Speicher für Internet-Fotos; er wird nicht mehr gebraucht.
for (const old of ['einkauf-images-v1', 'einkauf-images-v2']) { try { localStorage.removeItem(old); } catch { /* ohne Speicher nichts zu löschen */ } }
let busy = false, ready = false, view = 'all', lastTime = 0, noticeTimer = 0;
let recipeBaseline = null, ingredientBaseline = [], transferRecipe = null;
let itemBaseline = null;
let tagFilter = '', remoteEtag = '', deferredImport = null, deferredAdd = null;
let favoritesOnly = false, oldestFirst = false, planWeek = weekStart(isoDate()), mealBaseline = null;
let pendingPhoto = null, photoRemoved = false, previewUrl = '';
const photoMiss = new Map(), photoJobs = new Map();
let importSource = 'link', importAbort = null, previewUrls = [];
const portions = new Map(), openRecipes = new Set();
const format = number => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(number);
const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
// Für Eingabefelder: ohne Tausenderpunkt, sonst würde „1.000“ später als 1 gelesen.
const plain = number => String(Math.round(number * 1000) / 1000).replace('.', ',');
const dateTime = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at));
const shortDate = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(new Date(at));
const connected = () => Boolean(config.owner && config.repo && config.token);
const namespace = (value = config) => value.owner && value.repo ?
  `einkauf-data-v1:${JSON.stringify([value.owner.toLowerCase(), value.repo.toLowerCase(), value.branch, value.path])}` : 'einkauf-demo-v1';
// Wenn sich weder Zeitstempel noch Zahl der angewendeten Änderungen ändern, hat sich auch nichts Sichtbares geändert.
const signature = () => `${state.updatedAt}|${state.sync.applied.length}|${state.items.length}`;
// Was die App über Artikel weiß: vorhandene Artikel plus das Namensgedächtnis aus dem Aufräumen (siehe compact.js).
let historyMemo = { for: null, rows: [] };
function itemHistory() {
  if (historyMemo.for !== state) {
    // Bestätigte Zuordnungen („Zwiebel“ → „Zwiebeln“) führen die Schreibweisen zusammen, auch rückwirkend.
    const rename = new Map(active(state.aliases || []).map(alias => [alias.from, alias.name]));
    const named = row => { const to = rename.get(aliasKey(row.name)); return to ? { ...row, name: to } : row; };
    historyMemo = { for: state, rows: [...state.items, ...(state.names || []).map(entry => ({ name: entry.name, category: entry.category, unit: entry.unit, updatedAt: entry.at, createdAt: entry.at, weight: entry.count }))].map(named) };
  }
  return historyMemo.rows;
}
// Wortschatz für die Vorschläge beim Eintippen: eigene Artikel (itemHistory) vor Rezeptzutaten, Namen aus Kassenbons und bestätigten Zuordnungen, davor fest eingebaute häufige Artikel.
let vocabMemo = { for: null, rows: [] };
function suggestionHistory() {
  if (vocabMemo.for !== state) {
    const recipes = new Set(active(state.recipes).map(recipe => recipe.id)), plainName = name => String(name).replace(/\([^)]*\)/g, ' ').split(',')[0].trim().replace(/\s+/g, ' ');
    const extra = [...active(state.ingredients).filter(row => recipes.has(row.recipeId)).map(row => plainName(row.name)), ...active(state.prices).map(row => row.name), ...active(state.aliases || []).map(row => row.name)];
    vocabMemo = { for: state, rows: [...itemHistory(), ...extra.filter(Boolean).map(name => ({ name, weight: 0.5 })), ...GROCERY_NAMES.map((name, index) => ({ name, weight: 0.4 - index * 0.002 }))] };
  }
  return vocabMemo.rows;
}
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
  const dialog = document.querySelector('dialog[open]');
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
  catch { throw new Error('Der Browser kann nichts mehr lokal speichern. Bitte Speicher freigeben und erneut versuchen. Diese Änderung wurde nicht übernommen.'); }
}
function saveConfig(next) { storageWrite(CONFIG_KEY, next); config = next; }
function saveLocal(nextBase, nextPending) {
  storageWrite(namespace(), { base: nextBase, pending: nextPending });
  base = nextBase; pending = nextPending; state = merge(base, pending);
}
function status(text, mode = 'local') {
  $('#status').textContent = text; $('#status').dataset.state = mode; document.body.dataset.sync = mode;
  if (mode === 'ok' && connectFailed) { connectFailed = false; updateSaveButtons(); }
}
function restingStatus() {
  if (!connected()) status('Nur auf diesem Gerät', 'local');
  else if (pending.length) status(`${pending.length} Änderung(en) warten`, 'pending');
  else if (ready && tokenWarning() !== null) status(`Token ${tokenLabel(tokenWarning())} · neuen anlegen`, tokenWarning() < 0 ? 'error' : 'pending');
  else if (ready) status('Mit GitHub abgeglichen', 'ok');
  else status('Noch nicht verbunden', 'pending');
}
function nextOp(collection, id, patch) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  return operation(collection, id, patch, config.actor || 'Unbekannt', new Date(lastTime).toISOString());
}
// Kurzer Hinweis; verschwindet von selbst. Mit `undo` steht ein Knopf „Rückgängig“ dabei (etwas länger sichtbar).
let noticeUndo = null;
function showNotice(text, undo = null) {
  $('#notice-text').textContent = text; $('#notice').hidden = false;
  noticeUndo = undo; $('#notice-undo').hidden = !undo;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('#notice').hidden = true; noticeUndo = null; }, undo ? 6000 : 4000);
}
$('#notice-undo').addEventListener('click', () => { const undo = noticeUndo; noticeUndo = null; $('#notice').hidden = true; clearTimeout(noticeTimer); if (undo) guard(undo); });
function commit(ops, notice = '') {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (!ops.length) return;
  const nextPending = [...pending, ...ops];
  const nextState = merge(base, nextPending);
  // Eine einzige atomare localStorage-Schreiboperation sichert Daten und Warteschlange.
  saveLocal(connected() ? base : nextState, connected() ? nextPending : []);
  if (notice) showNotice(notice);
  message(); render(); restingStatus();
  if (connected()) void sync();
}

function tab(name) {
  for (const id of ['shopping', 'recipes', 'plan', 'spending', 'settings']) $(`#${id}`).hidden = name !== id;
  document.querySelectorAll('[data-tab]').forEach(node => {
    if (node.dataset.tab === name) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (name !== 'shopping' && selecting) setSelecting(false);
  if (name === 'settings') renderStorage();
  if (name === 'spending') renderSpending();
  if (name === 'recipes') prefetchDaily();
  syncShopAwake(); syncChrome();
}
// Auswahlliste der Geschäfte; mit `allowNone` zusätzlich „Kein Geschäft“ (Wert ''), z. B. für Artikel, die noch nirgends gekauft werden sollen.
function storeOptions(select, preferred = select.value, allowNone = false) {
  select.replaceChildren();
  if (allowNone) select.add(new Option('Kein Geschäft', ''));
  for (const store of active(state.stores)) select.add(new Option(store.name, store.id));
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
  const live = new Set(active(state.stores).map(store => store.id)), rows = active(state.items).filter(item => !item.storeId || live.has(item.storeId));
  return including === true ? rows : withoutSeparate(rows, active(state.stores), including);
};
// „Alle“ zeigt eine eigene Liste nicht mit; sie erscheint nur unter ihrem Geschäft.
const inView = item => view === 'all' ? !state.stores.some(store => store.id === item.storeId && !store.deletedAt && isSeparate(store)) : view === 'none' ? !item.storeId : item.storeId === view;
const viewStore = () => active(state.stores).find(store => store.id === view);
const storeName = id => active(state.stores).find(store => store.id === id)?.name || 'Ohne Geschäft';
// Welches Geschäft ein neuer Artikel bekommt: das der gewählten Ansicht, sonst keines.
const defaultStore = () => viewStore()?.id || '';
function showView(next) {
  view = next;
  const form = $('#item-form');
  // Wer ein einzelnes Geschäft ansieht, legt neue Artikel meist dort an (sonst verschwänden sie aus der Liste).
  // In „Alle“ bleibt die letzte Auswahl stehen (außer eine eigene Liste wie „Wünsche“: dort verschwänden neue Artikel unbemerkt); „Ohne Geschäft“ wählt keines.
  if (viewStore()) form.elements.storeId.value = view;
  else if (view === 'none' || (view === 'all' && isSeparate(active(state.stores).find(store => store.id === form.elements.storeId.value)))) form.elements.storeId.value = '';
  renderStorePick(); storeChanged(); renderStoreChips(); renderItems();
}
// Schnellwahl des Geschäfts im Formular: ein Tipp wählt, ein zweiter Tipp auf dasselbe Geschäft nimmt die Auswahl zurück.
// Ohne Auswahl („Kein Geschäft“) bekommt der Artikel kein Geschäft.
function renderStorePick() {
  const form = $('#item-form'), box = $('#store-pick');
  queueMicrotask(() => { const id = form.elements.storeId.value; form.elements.name.placeholder = id ? `Was brauchst du? → ${storeName(id)}` : 'Was brauchst du? z. B. Zwiebeln'; });
  if (form.elements.storeId.value && !active(state.stores).some(store => store.id === form.elements.storeId.value)) form.elements.storeId.value = '';
  const current = form.elements.storeId.value;
  box.replaceChildren();
  const add = (id, label, store = false) => {
    const chip = element('button', store ? undefined : label, 'chip'); chip.type = 'button'; chip.setAttribute('aria-pressed', String(id === current));
    if (store) chip.append(storeLabel(label));
    chip.addEventListener('click', () => {
      form.elements.storeId.value = id && id === form.elements.storeId.value ? '' : id;
      renderStorePick(); storeChanged();
    });
    box.append(chip);
  };
  add('', 'Kein Geschäft');
  for (const store of active(state.stores)) add(store.id, store.name, true);
}
function storeChanged() {
  const form = $('#item-form');
  form.elements.onSale.checked = false; delete form.dataset.manualPrice; rememberPriceInForm();
}
// Listenansichten werden aus dem zusammengeführten lokalen Stand aufgebaut.
// Geöffnete Eingabeformulare bleiben bei Hintergrund-Aktualisierungen bestehen.
function render() {
  $('#identity').textContent = config.actor || '';
  if (view !== 'all' && view !== 'none' && !viewStore()) view = 'all';
  const form = $('#item-form'), formStore = form.elements.storeId.value;
  renderStorePick();
  if (form.elements.storeId.value !== formStore) storeChanged();
  renderStoreChips(); renderItems(); renderRecipes(); renderPlan(); renderSpending(); renderPantry(); renderAliases(); renderStorage(); applyMode(); syncForm();
  if ($('#template-dialog').open) renderTemplates();
  if ($('#cookable-dialog').open) renderCookable();
  renderDailyButton();
  form.querySelector('button[type=submit]').disabled = !ready;
  $('#add-recipe').disabled = !ready;
  $('#import-recipe').disabled = !ready;
  $('#manage-stores').disabled = !ready;
  $('#add-purchase').disabled = !ready; $('#spending-first').disabled = !ready;
}
function renderStoreChips() {
  const box = $('#store-chips'); box.replaceChildren();
  const everything = visibleItems(true), items = visibleItems();   // `items`: ohne eigene Listen (für „Alle“ und „Ohne Geschäft“)
  const open = id => (id === 'all' ? items : id === 'none' ? items.filter(item => !item.storeId) : everything.filter(item => item.storeId === id)).filter(item => !item.checked).length;
  const add = (id, label, count, store = false) => {
    const chip = element('button', store ? undefined : label, 'chip'); chip.type = 'button';
    if (store) chip.append(storeLabel(label));
    chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', String(id === view));
    if (count) chip.append(element('span', String(count), 'count'));
    chip.addEventListener('click', () => showView(id));
    box.append(chip);
  };
  add('all', 'Alle', open('all'));
  // „Ohne Geschäft“ erscheint nur, wenn es solche Artikel gibt (oder gerade angezeigt wird).
  if (items.some(item => !item.storeId) || view === 'none') add('none', 'Ohne Geschäft', open('none'));
  for (const store of active(state.stores)) add(store.id, store.name, open(store.id), true);
  // Nur die Chip-Leiste verschieben, nie die ganze Seite.
  const selected = box.querySelector('[aria-selected=true]');
  if (selected) box.scrollLeft = Math.max(0, selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2);
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
  copy.append(element('strong', item.name), element('small', `${format(item.quantity)} ${item.unit}${view === 'all' ? ` · ${storeName(item.storeId)}` : ''} · ${notes.join(', ')}`));
  const actions = element('div', undefined, 'item-actions');
  actions.append(button('Übernehmen', () => acknowledge(entry.entries.map(e => e.id)), 'primary small'));
  row.append(copy);
  if (imagesOn()) row.append(thumbFor(item));
  row.append(actions);
  return row;
}
// Reihenfolge der Gänge eines Geschäfts (leer = Standardweg durch den Laden)
const aislesOf = storeId => (storeId && active(state.stores).find(store => store.id === storeId)?.aisles) || null;
function groupHead(label, count) {
  const row = element('li', undefined, 'group-head');
  row.append(element('span', label), element('span', String(count), 'count'));
  return row;
}
// Kleines Bild statt Name (Geschenk bei „Wünsche“): Bildschirmleser und der Hinweis beim Berühren bekommen weiter den Namen.
function symbolNode(symbol, name) {
  const node = element('span', undefined, 'store-symbol'), svg = document.createElementNS(SVG_NS, 'svg'), use = document.createElementNS(SVG_NS, 'use');
  node.setAttribute('role', 'img'); node.setAttribute('aria-label', name); node.title = name;
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); use.setAttribute('href', `#i-${symbol}`); svg.append(use); node.append(svg);
  return node;
}
// Name eines Geschäfts: als Bild (Voreinstellung für „Wünsche“, pro Geschäft einstellbar), sonst als Text oder (Einstellung „Geschäfte anzeigen als“) als Schriftzug in den Farben der Kette; unbekannte Geschäfte bleiben Text.
function storeLabel(name) {
  const symbol = symbolOf(active(state.stores).find(store => store.name === name) || { name });
  if (symbol) return symbolNode(symbol, name);
  const key = config.storeStyle === 'logo' ? brandOf(name) : '';
  return key ? element('span', name, `brand brand-${key}`) : document.createTextNode(name);
}
function storeHead(label, count, none, id = '') {
  const row = element('li', undefined, `store-head${none ? ' none' : ''}`), name = element('span'); row.dataset.store = id;   // `data-store`: Ziel beim Verschieben per Ziehen
  name.append(none ? document.createTextNode(label) : storeLabel(label));
  row.append(icon('store'), name, element('span', String(count), 'count'));
  return row;
}
// Kachel rechts in der Zeile: ein farbiges Symbol (Emoji) passend zum Artikel (emoji.js), sonst zur Kategorie. Rein dekorativ, nicht antippbar, ohne Internet.
let thumbLearned = new Map();
function thumbFor(item) {
  const box = element('span', undefined, 'item-thumb'); box.setAttribute('aria-hidden', 'true');
  box.append(element('span', emojiFor(item.name, itemCategory(item, thumbLearned)), 'emoji'));
  return box;
}
/* Mehrere Artikel gemeinsam bearbeiten (nur „Planen“): „Auswählen“ in der Listenzeile schaltet den Auswahlmodus ein. Ein Tipp auf eine Zeile wählt sie
   aus oder ab (statt abzuhaken oder zu bearbeiten); unten steht eine Leiste mit „Geschäft zuordnen“ und „Löschen“ für alle ausgewählten. */
let selecting = false;
const selected = new Set();
function itemRow(item, withStore = false) {
  const row = element('li', undefined, `item${item.checked ? ' checked' : ''}${selecting && selected.has(item.id) ? ' selected' : ''}`); row.dataset.id = item.id;
  const check = button('', () => {
    const latest = state.items.find(entry => entry.id === item.id);
    if (!latest || latest.deletedAt) return;
    commit([nextOp('items', item.id, { checked: !latest.checked })]);
  }, 'check');
  if (item.checked) check.append(icon('check'));
  check.setAttribute('aria-label', `${item.name}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
  check.setAttribute('aria-pressed', String(Boolean(item.checked)));
  // Die Zeile antippen öffnet die Bearbeitung; dort steht auch „Artikel löschen“.
  const copy = element('button', undefined, 'item-copy'); copy.type = 'button';
  copy.setAttribute('aria-label', `${item.name}, ${format(item.quantity)} ${item.unit}: bearbeiten`);
  copy.addEventListener('click', () => guard(() => editItem(item.id)));
  // Auswahlmodus: statt Abhaken und Bearbeiten ein Auswahlkreis; Kreis und Zeile wählen aus und ab.
  const pick = selecting ? button('', () => toggleSelected(item.id, row), 'check select-mark') : null;
  if (pick) {
    const mark = () => { const on = selected.has(item.id); pick.replaceChildren(...(on ? [icon('check')] : [])); pick.classList.toggle('on', on); pick.setAttribute('aria-pressed', String(on)); pick.setAttribute('aria-label', `${item.name}: ${on ? 'Auswahl aufheben' : 'auswählen'}`); copy.setAttribute('aria-pressed', String(on)); copy.setAttribute('aria-label', `${item.name}, ${format(item.quantity)} ${item.unit}: ${on ? 'Auswahl aufheben' : 'auswählen'}`); };
    row._mark = mark; mark();
    copy.addEventListener('click', event => { event.stopImmediatePropagation(); toggleSelected(item.id, row); }, true);
  }
  // Erste Zeile: Name und Menge, deutlich. Zweite Zeile klein: Person (und das Geschäft in der Gesamtliste). Unter „Planen“ stehen in der Zeile keine Preise, Vergleiche oder
  // Preisentwicklungen; frühere Kaufpreise gibt es nur im Modus „Im Laden“ (Artikelname antippen).
  copy.append(element('strong', item.name), element('span', `${format(item.quantity)} ${item.unit}`, 'item-qty'),
    element('small', [item.createdBy || 'Unbekannt', ...(withStore ? [storeName(item.storeId)] : [])].join(' · '), 'item-meta'));
  row.append(pick || check, copy);
  if (imagesOn()) row.append(thumbFor(item));
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
  $('#select-count').textContent = rows.length ? `${rows.length} ausgewählt` : 'Nichts ausgewählt';
  for (const id of ['select-move', 'select-delete']) $(`#${id}`).disabled = !rows.length;
  const all = visibleItems(true).filter(inView);
  $('#select-all').textContent = all.length && rows.length === all.length ? 'Keine' : 'Alle';
  $('#select-mode').setAttribute('aria-pressed', String(selecting)); $('#select-mode').textContent = selecting ? 'Auswahl beenden' : 'Auswählen';
  $('#clear-checked').hidden = selecting;
  document.body.classList.toggle('selecting', selecting);
  if (selecting) document.documentElement.style.setProperty('--select-h', `${bar.offsetHeight}px`);   // Platz unter der Liste: sie bleibt bis zum Ende erreichbar
}
function setSelecting(on) {
  selecting = on; if (!on) selected.clear();
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
  $('#clear-checked').disabled = !done.length;
  if (!rows.length && !news.length) list.append(element('li', view === 'none' ? 'Keine Artikel ohne Geschäft.' : 'Alles im Blick. Füge deinen ersten Artikel hinzu.', 'empty'));
  if (news.length) {
    const names = [...new Set(news.flatMap(entry => entry.by))].join(' und ');
    const head = element('li', undefined, 'news-head');
    head.append(element('span', `Neu von ${names}`), element('span', String(news.length), 'count'),
      button('Alle übernehmen', () => acknowledge(news.flatMap(entry => entry.entries.map(e => e.id))), 'text-button'));
    list.append(head); news.forEach(entry => list.append(newsRow(entry)));
  }
  // Nach Gängen im Laden geordnet (abschaltbar in den Einstellungen); Erledigtes steht immer unten.
  const grouped = config.groupItems !== false;
  const addOpen = (items, nested, order = null) => {
    if (!grouped) { items.sort(byName).forEach(item => list.append(itemRow(item))); return; }
    for (const group of groupByCategory(items, itemHistory(), order)) {
      const head = groupHead(group.label, group.items.length); if (nested) head.classList.add('sub');
      list.append(head); group.items.forEach(item => list.append(itemRow(item)));
    }
  };
  if (view === 'all') {
    // Gesamtliste: erst, was noch keinem Geschäft zugeordnet ist, dann ein Abschnitt je Geschäft.
    const sections = [{ id: '', label: 'Ohne Geschäft' }, ...active(state.stores).map(store => ({ id: store.id, label: store.name }))];
    for (const section of sections) {
      const items = open.filter(item => (item.storeId || '') === section.id);
      if (!items.length) continue;
      list.append(storeHead(section.label, items.length, !section.id, section.id)); addOpen(items, true, aislesOf(section.id));
    }
  } else addOpen(open, false, aislesOf(view));
  if (done.length) {
    if (grouped || view === 'all') list.append(groupHead('Erledigt', done.length));
    done.forEach(item => list.append(itemRow(item, view === 'all')));
  }
  if (document.activeElement === $('#item-form').elements.name) renderItemSuggestions();
  renderSelectBar();
  renderQuickPick();
}
// Das Eingabeformular ist zugeklappt (nur Namensfeld und „+“), solange niemand hineintippt. Offen bleibt es, wenn der Fokus im Formular liegt,
// schon etwas im Namensfeld steht oder „Kategorie, Preis & Angebot“ aufgeklappt ist.
function syncForm() {
  const form = $('#item-form');
  const open = form.matches(':focus-within') || form.elements.name.value.trim() !== '' || form.querySelector('.price-fields').open || form.dataset.manualPrice === 'yes';
  form.classList.toggle('compact', !open);
}
function renderItemSuggestions() {
  const form = $('#item-form'), box = $('#item-suggestions'), typed = form.elements.name.value.trim();
  const history = itemHistory();
  // Andere Schreibweise eines bekannten Namens („Zwiebel“ statt „Zwiebeln“): nur vorschlagen, erst die Bestätigung wird gemerkt.
  const confirmed = active(state.aliases || []).some(alias => alias.from === aliasKey(typed));
  const variants = typed && !confirmed ? spellingVariants(typed, [...new Set(history.map(row => row.name))]).slice(0, 3) : [];
  const names = suggestItemNames(suggestionHistory(), typed).filter(name => !variants.includes(name));
  box.replaceChildren(); box.hidden = !names.length && !variants.length;
  if (box.hidden) return;
  if (variants.length) {
    box.append(element('span', 'Meinst du dasselbe wie …?', 'hint'));
    const same = element('div', undefined, 'suggestion-choices');
    for (const name of variants) same.append(button(name, () => {
      commit([nextOp('aliases', uid(), { from: aliasKey(typed), name })], `„${typed}“ heißt jetzt immer „${name}“`);
      form.elements.name.value = name; box.hidden = true;
      rememberPriceInForm(); form.elements.quantity.focus(); form.elements.quantity.select();
    }));
    box.append(same);
  }
  if (names.length) {
    const choices = element('div', undefined, 'suggestion-choices');
    for (const name of names) choices.append(button(name, () => {
      form.elements.name.value = name; box.hidden = true;
      rememberPriceInForm(); form.elements.quantity.focus(); form.elements.quantity.select();
    }));
    box.append(choices);
  }
}
// Schnellwahl: häufig gekaufte Artikel, die gerade nicht auf der Liste stehen. Ein Tipp legt einen Artikel (Menge 1) im gewählten Geschäft an.
function renderQuickPick() {
  const box = $('#quick-pick'), form = $('#item-form');
  const picks = form.elements.name.value.trim() ? [] : frequentItems(itemHistory(), state.items, 6);
  box.hidden = !picks.length; box.replaceChildren();
  for (const pick of picks) {
    const chip = element('button', pick.name, 'chip'); chip.type = 'button';
    chip.addEventListener('click', () => {
      form.elements.name.value = pick.name; form.elements.quantity.value = '1'; form.elements.unit.value = pick.unit || 'Stück';
      form.requestSubmit();
    });
    box.append(chip);
  }
}
function renderShoppingInfo() {
  const store = viewStore(), url = storeOfferUrl(store);
  $('#offers-link').hidden = !url; $('#set-offers').hidden = Boolean(url) || !store;
  if (url) { $('#offers-link').href = url; $('#offers-link').setAttribute('aria-label', `${store.name}: Angebote ansehen`); }
  else $('#offers-link').removeAttribute('href');
  const total = shoppingTotal(visibleItems(true).filter(inView));
  const box = $('#shopping-total'); box.replaceChildren();
  // Eine Zeile, die Geschäftsauswahl darüber sagt schon, wofür die Summe gilt.
  if (!total.count) box.append(element('strong', 'Alles erledigt'));
  else if (!total.priced) box.append(element('small', 'Noch keine Preise notiert'));
  else {
    box.append(element('strong', `Geschätzt ${euros(total.cents)}`));
    if (total.missing) box.append(element('small', `${total.missing} ohne Preis, nicht eingerechnet`));
  }
}
function quoteLabel(quote) { return `${euros(quote.cents)} für ${format(quote.quantity)} ${quote.unit}`; }
function setQuoteFields(form, quote, fallbackUnit, prefix = 'price') {
  form.elements[`${prefix}Euros`].value = quote ? (quote.cents / 100).toFixed(2).replace('.', ',') : '';
  form.elements[`${prefix}Quantity`].value = quote ? String(quote.quantity).replace('.', ',') : '1';
  form.elements[`${prefix}Unit`].value = quote?.unit || fallbackUnit;
}
// Ein Tag (JJJJ-MM-TT) als kurzes Datum, unabhängig von der Zeitzone.
const dayLabel = day => shortDate(`${day}T12:00:00`);
function setSaleFields(form, quote = null, until = '') {
  form._savedSaleQuote = quote ? clone(quote) : null;
  form.elements.saleUntil.value = until || '';
  setQuoteFields(form, quote, form.elements.priceUnit.value, 'sale');
  if (!quote) form.elements.saleQuantity.value = form.elements.priceQuantity.value;
  toggleSaleFields(form);
}
function toggleSaleFields(form) {
  const section = form.querySelector('[data-sale-fields]');
  section.hidden = !form.elements.onSale.checked;
  if (!section.hidden && !form.elements.saleEuros.value.trim()) {
    form.elements.saleQuantity.value = form.elements.priceQuantity.value;
    form.elements.saleUnit.value = form.elements.priceUnit.value;
  }
}
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
function rememberPriceInForm() {
  const form = $('#item-form');
  categoryHint(form.elements.category, form.elements.name.value);
  if (form.dataset.manualPrice === 'yes') return;
  // Ein früher bezahlter Preis wird nie von selbst eingetragen: Das Preisfeld ist nur für eine eigene Schätzung (Summe), frühere Kaufpreise gibt es im Modus „Im Laden“.
  setQuoteFields(form, null, form.elements.unit.value.trim());
  setSaleFields(form);
  form.querySelector('[data-price-hint]').textContent = 'Beispiel: 1,99 € für 500 g. Nur eine eigene Schätzung für die Summe. Frühere Kaufpreise siehst du im Modus „Im Laden“, wenn du den Artikelnamen antippst.';
}
function readQuote(form, prefix = 'price') {
  const value = form.elements[`${prefix}Euros`].value.trim();
  if (!value) return null;
  const quote = { cents: parseCents(value), quantity: positive(form.elements[`${prefix}Quantity`].value), unit: form.elements[`${prefix}Unit`].value.trim() };
  if (!quote.unit) throw new Error('Bitte die Einheit des Preises eingeben.');
  if (unitRate(quote, form.elements.unit.value.trim()) === null) throw new Error('Artikeleinheit und Preiseinheit passen nicht zusammen. Verwende zum Beispiel kg und g oder l und ml. Bei Packungen muss der Preis ebenfalls je Packung angegeben sein.');
  return quote;
}
function readPricing(form) {
  const price = readQuote(form), onSale = form.elements.onSale.checked;
  // Beim Ausschalten bleibt ein bereits gespeicherter Angebotspreis erhalten,
  // beeinflusst die Summe aber nicht mehr. Neue inaktive Angebote werden nicht notiert.
  const salePrice = onSale ? readQuote(form, 'sale') : form._savedSaleQuote || null;
  if (onSale && price && salePrice && unitRate(salePrice, price.unit) * price.quantity >= price.cents - 0.0000001) {
    throw new Error('Der Angebotspreis muss für die gleiche Menge günstiger als der normale Preis sein. Bitte Preise und Bezugsmengen prüfen.');
  }
  return { price, salePrice, onSale, saleUntil: form.elements.saleUntil.value || null };
}
function editItem(id) {
  const item = active(state.items).find(row => row.id === id);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  itemBaseline = clone({ ...item, price: itemQuote(item), salePrice: item.salePrice || null, onSale: Boolean(item.onSale), saleUntil: item.saleUntil || null,
    category: isCategory(item.category) ? item.category : null });
  const form = $('#edit-item-form'); form.reset();
  for (const key of ['id', 'name', 'quantity', 'unit']) form.elements[key].value = item[key];
  categoryHint(form.elements.category, item.name); form.elements.category.value = itemBaseline.category || '';
  storeOptions(form.elements.storeId, item.storeId || '', true);
  setQuoteFields(form, itemQuote(item), item.unit);
  form.elements.onSale.checked = Boolean(item.onSale);
  setSaleFields(form, item.salePrice, item.saleUntil);
  form.querySelector('[data-price-hint]').textContent = 'Nur eine eigene Schätzung für die Summe. Frühere Kaufpreise siehst du im Modus „Im Laden“, wenn du den Artikelnamen antippst.';
  // Preis & Angebot sind zugeklappt (Name, Menge, Einheit, Geschäft stehen oben); die Zeile verrät den Stand.
  const quote = itemQuote(item), summary = [quote ? quoteLabel(quote) : '', item.onSale ? 'Im Angebot' : ''].filter(Boolean).join(' · ');
  $('#item-price-fold').open = false; $('#item-price-summary').textContent = summary || 'optional';
  message(); $('#item-dialog').showModal();
}
function deleteOps(collection, ids) {
  const rows = active(state[collection]).filter(row => ids.includes(row.id));
  const at = new Date().toISOString();
  return rows.map(row => nextOp(collection, row.id, { deletedAt: at }));
}
function removeRows(collection, ids) { commit(deleteOps(collection, ids)); }
// Geschäfte-Dialog: Jedes vorhandene Geschäft ist eine zugeklappte Karte (Pfeil rechts); welche aufgeklappt sind, merkt sich nur das geöffnete Fenster.
// „Neues Geschäft“ unten ist immer sichtbar und nicht klappbar; ein neu angelegtes Geschäft erscheint zugeklappt und leuchtet kurz auf.
const storesOpen = new Set();
let storeFresh = '';
function openStoresDialog(openId = '') {
  storesOpen.clear(); storeFresh = ''; if (openId) storesOpen.add(openId);
  renderStores(); $('#stores-dialog').showModal();
}
function renderStores() {
  const editor = $('#store-editor'); editor.replaceChildren();
  for (const store of active(state.stores)) {
    const row = element('details', undefined, 'store-row'), summary = element('summary', undefined, 'store-summary'), body = element('div', undefined, 'store-body');
    row.open = storesOpen.has(store.id); row.dataset.id = store.id;
    row.addEventListener('toggle', () => { if (row.open) storesOpen.add(store.id); else storesOpen.delete(store.id); });
    const title = element('span', undefined, 'store-name'); title.append(storeLabel(store.name)); summary.append(title);
    if (isSeparate(store)) summary.append(element('span', 'Eigene Liste', 'store-pill'));
    const form = element('form'), input = element('input');
    input.value = store.name; input.required = true; input.maxLength = 80; input.setAttribute('aria-label', 'Geschäftsname');
    input.name = 'name';
    const linkLabel = element('label', 'Angebotslink (optional)'), link = element('input');
    link.name = 'offersUrl'; link.type = 'url'; link.inputMode = 'url'; link.value = storeOfferUrl(store); link.maxLength = 2000; link.placeholder = 'https://…';
    linkLabel.append(link);
    const save = element('button', 'Speichern', 'secondary'); save.setAttribute('aria-label', `${store.name} speichern`);
    const nameLabel = element('label', 'Geschäftsname'); nameLabel.append(input);
    const anywhereLabel = element('label', undefined, 'checkbox-label'), anywhere = element('input');
    anywhere.type = 'checkbox'; anywhere.name = 'anywhere'; anywhere.checked = takesAnywhere(store);
    anywhereLabel.append(anywhere, ' „Im Laden“ auch Artikel ohne Geschäft anzeigen');
    // Eigene Liste (z. B. „Wünsche“): Die Artikel erscheinen nirgends, nur wenn dieses Geschäft gewählt ist. Dann gibt es keine Artikel ohne Geschäft dazu.
    const separateLabel = element('label', undefined, 'checkbox-label'), separate = element('input');
    separate.type = 'checkbox'; separate.name = 'separate'; separate.checked = isSeparate(store); anywhereLabel.hidden = separate.checked;
    separate.addEventListener('change', () => { anywhereLabel.hidden = separate.checked; });
    separateLabel.append(separate, ' Eigene Liste: Artikel nur zeigen, wenn dieses Geschäft gewählt ist');
    // Anzeige im Reiter: der Name oder ein kleines Bild (Voreinstellung nach dem Namen, siehe brand.js)
    const symbolLabel = element('label', 'Anzeige im Reiter'), symbolPick = element('select');
    symbolPick.name = 'symbol'; symbolPick.append(new Option('Name', 'name'), new Option('Geschenk-Symbol (kleines Bild)', 'gift')); symbolPick.value = symbolOf(store) || 'name'; symbolLabel.append(symbolPick);
    // Reihenfolge der Gänge: Standard ist der typische Weg durch den Laden; hier lässt sie sich für dieses Geschäft ändern (gilt unter „Planen“ und „Im Laden“, gespeichert mit „Speichern“).
    const aisleFold = element('details', undefined, 'aisle-fold'), aisleList = element('ol', undefined, 'aisle-list');
    let aisles = orderCategories(store.aisles).map(category => category.id);
    const aisleReset = button('Standardreihenfolge', () => { aisles = CATEGORIES.map(category => category.id); drawAisles(); }, 'text-button');
    const drawAisles = () => {
      aisleList.replaceChildren();
      aisles.forEach((id, index) => {
        const item = element('li'), up = button('', () => { [aisles[index - 1], aisles[index]] = [aisles[index], aisles[index - 1]]; drawAisles(); aisleList.children[index - 1].querySelector('.aisle-up').focus(); }, 'icon-button aisle-up'),
          down = button('', () => { [aisles[index + 1], aisles[index]] = [aisles[index], aisles[index + 1]]; drawAisles(); aisleList.children[index + 1].querySelector('.aisle-down').focus(); }, 'icon-button aisle-down');
        up.append(icon('up')); down.append(icon('down'));
        up.setAttribute('aria-label', `${categoryLabel(id)} nach oben`); down.setAttribute('aria-label', `${categoryLabel(id)} nach unten`);
        up.disabled = index === 0; down.disabled = index === aisles.length - 1;
        item.append(element('span', categoryLabel(id)), up, down); aisleList.append(item);
      });
      aisleReset.hidden = aisles.every((id, index) => id === CATEGORIES[index].id);
    };
    aisleFold.append(element('summary', 'Reihenfolge der Gänge'), aisleList, aisleReset); drawAisles();
    form.append(nameLabel, linkLabel, symbolLabel, separateLabel, anywhereLabel, aisleFold, save);
    form.addEventListener('submit', event => { event.preventDefault(); guard(() => {
      const name = input.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
      currentStore(store.id); const typed = offerUrl(link.value);
      // Der Standardlink der Kette und die Voreinstellung nach dem Namen werden nicht festgeschrieben, damit spätere Änderungen daran wirken.
      commit([nextOp('stores', store.id, { name, offersUrl: typed === defaultOfferUrl({ name }) ? '' : typed, anywhere: anywhere.checked === takesAnywhere({ name }) ? null : anywhere.checked, separate: separate.checked || null,
        symbol: (symbolPick.value === 'gift' ? 'gift' : '') === defaultSymbol(name) ? null : symbolPick.value === 'gift' ? 'gift' : 'none',
        aisles: aisles.every((id, index) => id === CATEGORIES[index].id) ? null : [...aisles] })]); renderStores();
    }); });
    const remove = button('Geschäft löschen', () => {
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      if (!confirm(`„${store.name}“ löschen? Die Artikel werden ausgeblendet. Du kannst das Löschen rückgängig machen.`)) return;
      removeRows('stores', [store.id]); renderStores();
    }, 'danger');
    remove.setAttribute('aria-label', `${store.name} löschen`); body.append(form, remove); row.append(summary, body); editor.append(row);
    if (store.id === storeFresh) { row.classList.add('fresh'); row.scrollIntoView({ block: 'nearest' }); }
  }
}

function chip(text, pressed, action) {
  const node = element('button', text, 'chip'); node.type = 'button'; node.setAttribute('aria-pressed', String(pressed));
  node.addEventListener('click', action);
  return node;
}
function renderRecipes() {
  const search = $('#recipe-search').value.trim().toLocaleLowerCase('de');
  const recipes = active(state.recipes);
  const tags = [...new Set(recipes.flatMap(recipe => recipe.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  if (tagFilter && !tags.includes(tagFilter)) tagFilter = '';
  const chips = $('#tag-chips'); chips.replaceChildren(); chips.hidden = !recipes.length;
  chips.append(chip('★ Favoriten', favoritesOnly, () => { favoritesOnly = !favoritesOnly; renderRecipes(); }),
    chip('Lange nicht gekocht', oldestFirst, () => { oldestFirst = !oldestFirst; renderRecipes(); }));
  for (const tag of tags) chips.append(chip(tag, tag === tagFilter, () => { tagFilter = tagFilter === tag ? '' : tag; renderRecipes(); }));
  const grid = $('#recipe-list'); grid.replaceChildren();
  const ingredientsOf = id => active(state.ingredients).filter(row => row.recipeId === id);
  const byTitle = (a, b) => a.name.localeCompare(b.name, 'de');
  // Favoriten zuerst; „Lange nicht gekocht“ zeigt zuerst, was noch nie oder am längsten nicht auf dem Tisch stand.
  const order = oldestFirst ? (a, b) => (a.lastCookedAt || '').localeCompare(b.lastCookedAt || '') || byTitle(a, b) :
    (a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || byTitle(a, b);
  for (const recipe of recipes.filter(recipe => {
    const names = ingredientsOf(recipe.id).map(row => row.name).join(' ');
    return `${recipe.name} ${names} ${recipe.tags.join(' ')}`.toLocaleLowerCase('de').includes(search) &&
      (!tagFilter || recipe.tags.includes(tagFilter)) && (!favoritesOnly || recipe.favorite);
  }).sort(order)) grid.append(recipeCard(recipe, ingredientsOf(recipe.id)));
  if (!grid.children.length) grid.append(element('p', recipes.length ? 'Kein passendes Rezept. Ändere die Suche oder den Filter.' : 'Noch kein Rezept. Importiere eines aus einem Link oder Screenshot oder lege es von Hand an.', 'empty'));
  hydratePhotos();
}
function recipeCard(recipe, ingredients) {
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
  card.append(element('p', [`${ingredients.length} Zutaten`, `${format(recipe.servings)} Portionen`, source && hostLabel(source),
    cooked && cooked !== 'geplant' && `gekocht ${cooked}`].filter(Boolean).join(' · '), 'recipe-meta'));
  if (recipe.tags.length) {
    const tags = element('div', undefined, 'tags');
    recipe.tags.forEach(tag => tags.append(element('span', tag, 'tag'))); card.append(tags);
  }
  const details = element('details', undefined, 'recipe-details'); details.open = openRecipes.has(recipe.id);
  details.addEventListener('toggle', () => { if (details.open) openRecipes.add(recipe.id); else openRecipes.delete(recipe.id); });
  details.append(element('summary', 'Zutaten & Zubereitung'));
  const servingInput = element('input'), list = element('ul', undefined, 'recipe-ingredients');
  servingInput.inputMode = 'decimal'; servingInput.value = plain(portions.get(recipe.id) || recipe.servings);
  servingInput.setAttribute('aria-label', `Portionen für ${recipe.name}`);
  const updateAmounts = () => {
    const count = positive(servingInput.value); portions.set(recipe.id, count);
    list.replaceChildren(...ingredients.map(row => element('li', ingredientLabel(row, count / recipe.servings))));
  };
  const step = delta => () => { servingInput.value = plain(Math.max(1, positive(servingInput.value) + delta)); updateAmounts(); };
  const stepper = element('div', undefined, 'stepper');
  stepper.append(element('span', 'Portionen'), iconButton('minus', 'Eine Portion weniger', step(-1), 'round secondary'), servingInput,
    iconButton('plus', 'Eine Portion mehr', step(1), 'round secondary'));
  updateAmounts(); servingInput.addEventListener('change', () => guard(updateAmounts));
  servingInput.addEventListener('input', () => { try { updateAmounts(); } catch { /* Eingabe noch unvollständig */ } });
  details.append(stepper, list);
  details.append(element('h4', 'Zubereitung'), element('p', recipe.instructions || 'Keine Zubereitung eingetragen.', 'recipe-steps'));
  if (source) {
    const link = element('a', `Quelle: ${hostLabel(source)}`, 'source-link');
    link.href = source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(icon('external'));
    details.append(link);
  }
  const more = element('div', undefined, 'detail-actions');
  more.append(button('Heute gekocht', () => commit([nextOp('recipes', recipe.id, { lastCookedAt: isoDate() })]), 'secondary small'),
    button('Bearbeiten', () => editRecipe(recipe.id), 'secondary small'),
    button('Löschen', () => {
      if (confirm(`Rezept „${recipe.name}“ löschen?`)) removeRows('recipes', [recipe.id]);
    }, 'danger small'));
  details.append(more);
  card.append(details);
  const actions = element('div', undefined, 'actions');
  actions.append(button('Auf die Liste', () => openTransfer(recipe.id, positive(servingInput.value)), 'primary-action'),
    button('Kochen', () => openCook(recipe.id, positive(servingInput.value)), 'secondary'),
    iconButton('calendar', `${recipe.name} im Wochenplan einplanen`, () => openMeal({ recipeId: recipe.id, servings: positive(servingInput.value) })),
    iconButton('text', `${recipe.name}: Rezeptblatt (PDF) ansehen, speichern oder teilen`, () => openSheet(recipe.id, positive(servingInput.value))));
  card.append(actions);
  return card;
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
const DRAFT_KEY = 'einkauf-recipe-drafts-v1', DRAFT_DAYS = 30, DRAFT_MAX = 10;
function readDrafts() {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const cutoff = Date.now() - DRAFT_DAYS * 86400000;
    return Object.fromEntries(Object.entries(stored).filter(([, entry]) => entry && typeof entry.at === 'string' && Date.parse(entry.at) > cutoff && entry.state && typeof entry.state === 'object'));
  } catch { return {}; }
}
function writeDrafts(drafts) {
  const keys = Object.keys(drafts).sort((a, b) => drafts[b].at.localeCompare(drafts[a].at)).slice(0, DRAFT_MAX);
  try { if (keys.length) localStorage.setItem(DRAFT_KEY, JSON.stringify(Object.fromEntries(keys.map(key => [key, drafts[key]])))); else localStorage.removeItem(DRAFT_KEY); }
  catch { /* Speicher voll oder gesperrt: dann gibt es eben keinen Entwurf */ }
}
let recipeDraftKey = null, recipeOpenState = null, draftTimer = null;
function recipeFormState() {
  const form = $('#recipe-form');
  return { name: form.elements.name.value, servings: form.elements.servings.value, tags: form.elements.tags.value, instructions: form.elements.instructions.value, sourceUrl: form.elements.sourceUrl.value,
    ingredients: [...$('#ingredient-editor').children].map(row => ({ id: row.dataset.id, name: row.querySelector('[data-field=name]').value, quantity: row.querySelector('[data-field=quantity]').value, unit: row.querySelector('[data-field=unit]').value })) };
}
function saveRecipeDraft() {
  clearTimeout(draftTimer); draftTimer = null;
  if (!recipeDraftKey) return;
  const current = recipeFormState(), text = JSON.stringify(current), drafts = readDrafts();
  const blank = !current.name.trim() && !current.instructions.trim() && !current.tags.trim() && !current.sourceUrl.trim() && current.ingredients.every(row => !row.name.trim());
  if (blank || text === recipeOpenState) delete drafts[recipeDraftKey];
  else drafts[recipeDraftKey] = { at: new Date().toISOString(), state: current };
  writeDrafts(drafts);
}
const scheduleRecipeDraft = () => { if (!recipeDraftKey) return; clearTimeout(draftTimer); draftTimer = setTimeout(saveRecipeDraft, 500); };
function dropRecipeDraft() {
  clearTimeout(draftTimer); draftTimer = null;
  if (recipeDraftKey) { const drafts = readDrafts(); delete drafts[recipeDraftKey]; writeDrafts(drafts); }
  recipeDraftKey = null;
}
function applyRecipeDraft(state) {
  const form = $('#recipe-form');
  for (const field of ['name', 'servings', 'tags', 'instructions', 'sourceUrl']) form.elements[field].value = state[field] ?? '';
  $('#ingredient-editor').replaceChildren();
  (state.ingredients?.length ? state.ingredients : [{}]).forEach(row => ingredientRow({ id: typeof row.id === 'string' ? row.id : undefined, name: String(row.name ?? ''), quantity: String(row.quantity ?? '1'), unit: String(row.unit ?? 'Stück') }));
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
      if (slot !== recipeDraftKey) { const all = readDrafts(); delete all[slot]; writeDrafts(all); }
      saveRecipeDraft();
    }, 'small'),
    button('Verwerfen', () => { const all = readDrafts(); delete all[slot]; writeDrafts(all); note.hidden = true; }, 'secondary small'));
  note.append(element('p', `Es gibt einen nicht gespeicherten Entwurf${slot === 'import' ? ' (importiertes Rezept)' : ''} von ${when}. Das Foto wird im Entwurf nicht gesichert.`), actions);
  note.hidden = false;
}
// `draft` stammt aus dem Import: Das Formular zeigt dann einen Vorschlag, gespeichert wird erst nach dem Prüfen.
function editRecipe(id = '', draft = null) {
  const form = $('#recipe-form'); form.reset();
  recipeBaseline = id ? clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt)) : null;
  if (id && !recipeBaseline) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  ingredientBaseline = id ? clone(active(state.ingredients).filter(row => row.recipeId === id)) : [];
  form.elements.id.value = id;
  $('#recipe-editor-title').textContent = id ? 'Rezept bearbeiten' : draft ? 'Importiertes Rezept prüfen' : 'Neues Rezept';
  if (recipeBaseline) for (const field of ['name', 'servings', 'instructions', 'tags', 'sourceUrl']) {
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
  if (recipeBaseline?.photoId) ensurePhoto(recipeBaseline.photoId).then(url => { if (url && !pendingPhoto && !photoRemoved && $('#recipe-dialog').open) showPhotoPreview(url, false); });
  const note = $('#recipe-import-note'); note.replaceChildren(); note.hidden = !draft;
  if (draft) {
    note.append(element('p', draft.via === 'schema' ? 'Das Rezept wurde aus den Daten der Seite übernommen. Bitte kurz prüfen.' : 'Das Rezept wurde aus Text geschätzt. Bitte alles prüfen und korrigieren.'));
    for (const warning of draft.warnings || []) note.append(element('p', warning, 'warn'));
  }
  $('#recipe-raw').hidden = !draft?.raw; $('#recipe-raw').open = false; $('#recipe-raw-text').textContent = draft?.raw || '';
  // Entwurf: Ein importiertes Rezept gilt sofort als nicht gespeichert (der Import ist aufwendig); sonst zählt, was sich vom Öffnungsstand unterscheidet.
  recipeDraftKey = id || (draft ? 'import' : 'new'); recipeOpenState = draft ? null : JSON.stringify(recipeFormState());
  if (draft) saveRecipeDraft(); else offerRecipeDraft();
  if (draft) { $('#recipe-draft-note').replaceChildren(); $('#recipe-draft-note').hidden = true; }
  $('#recipe-dialog').showModal();
}
// Nur gegenüber dem Öffnungsstand geänderte Felder speichern. So überschreibt
// ein unverändertes Eingabefeld keine inzwischen angekommenen Partner-Änderungen.
function changed(patch, before) {
  return Object.fromEntries(Object.entries(patch).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before?.[key])));
}
function saveRecipe(event) {
  event.preventDefault();
  const form = event.currentTarget;
  guard(async () => {
    const id = form.elements.id.value || uid();
    if (recipeBaseline && !active(state.recipes).some(row => row.id === id)) throw new Error('Dieses Rezept wurde inzwischen gelöscht. Bitte schließen und neu anlegen.');
    const sourceText = form.elements.sourceUrl.value.trim(), sourceUrl = webUrl(sourceText);
    if (sourceText && !sourceUrl) throw new Error('Bitte bei der Quelle einen vollständigen Link mit https:// eingeben oder das Feld leeren.');
    const patch = { name: form.elements.name.value.trim(), servings: positive(form.elements.servings.value),
      instructions: form.elements.instructions.value.trim(), tags: [...new Set(form.elements.tags.value.split(',').map(tag => tag.trim()).filter(Boolean))] };
    if (sourceUrl || recipeBaseline?.sourceUrl) patch.sourceUrl = sourceUrl;
    if (!patch.name) throw new Error('Bitte dem Rezept einen Namen geben.');
    const rows = [...$('#ingredient-editor').children].map(row => ({ id: row.dataset.id, recipeId: id,
      name: row.querySelector('[data-field=name]').value.trim(), quantity: positive(row.querySelector('[data-field=quantity]').value),
      unit: row.querySelector('[data-field=unit]').value.trim() }));
    if (!rows.length || rows.some(row => !row.name || !row.unit)) throw new Error('Bitte mindestens eine vollständige Zutat eingeben.');
    // Das Foto muss lokal gespeichert sein, bevor die Änderung abgeglichen wird, sonst fände der Upload es nicht.
    const photo = pendingPhoto;
    if (photo) {
      await storePhoto(photo.id, photo.blob); patch.photoId = photo.id;
      if (connected()) queuePhoto(queueKey(), photo.id);
    } else if (photoRemoved && recipeBaseline?.photoId) patch.photoId = null;
    const ops = [], recipeChanges = changed(patch, recipeBaseline);
    if (Object.keys(recipeChanges).length) ops.push(nextOp('recipes', id, recipeChanges));
    for (const { id: ingredientId, ...fields } of rows) {
      const delta = changed(fields, ingredientBaseline.find(row => row.id === ingredientId));
      if (Object.keys(delta).length) ops.push(nextOp('ingredients', ingredientId, delta));
    }
    for (const row of ingredientBaseline.filter(row => !rows.some(candidate => candidate.id === row.id))) {
      ops.push(nextOp('ingredients', row.id, { deletedAt: new Date().toISOString() }));
    }
    try { commit(ops); }
    catch (error) { if (photo) unqueuePhoto(queueKey(), photo.id); throw error; }
    dropRecipeDraft();
    $('#recipe-dialog').close();
  });
}
// `only`: Kennungen der Zutaten, die vorausgewählt sein sollen (z. B. nur das, was zum Kochen noch fehlt); sonst alles außer Vorrat und „nach Bedarf“.
function openTransfer(id, servings, only = null) {
  transferRecipe = clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt));
  if (!transferRecipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const form = $('#transfer-form'); form.elements.servings.value = plain(servings);
  storeOptions(form.elements.storeId, defaultStore(), true); $('#transfer-ingredients').replaceChildren(); form.elements.rememberPantry.checked = false;
  const keys = pantryKeys(state.pantry);
  for (const row of active(state.ingredients).filter(row => row.recipeId === id)) {
    const label = element('label', undefined, 'transfer-row'), check = element('input'), stocked = inPantry(keys, row.name);
    // Salz, Pfeffer und Co. („nach Bedarf“) und der Vorrat: hat man meist da, nicht vorausgewählt.
    check.type = 'checkbox'; check.checked = only ? only.has(row.id) : row.unit !== NO_AMOUNT && !stocked; check.value = row.id;
    // Die angezeigte Auswahl bleibt bis zur Bestätigung stabil, auch beim Abgleich.
    label._ingredient = clone(row); label.append(check, element('span')); if (stocked) label.append(element('small', 'Vorrat', 'pantry-badge'));
    $('#transfer-ingredients').append(label);
  }
  updateTransfer(); $('#transfer-dialog').showModal();
}
function updateTransfer() {
  const factor = positive($('#transfer-form').elements.servings.value) / transferRecipe.servings;
  for (const label of $('#transfer-ingredients').children) label.querySelector('span').textContent = ingredientLabel(label._ingredient, factor);
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
let photoRetryAt = 0;
async function uploadPhotos(manual = false) {
  // Nach einem Fehler erst nach 20 Sekunden wieder versuchen, außer die Person löst den Abgleich selbst aus.
  if (!connected() || (!manual && Date.now() < photoRetryAt)) return;
  const key = queueKey();
  const later = () => { photoRetryAt = Date.now() + 20000; };
  for (const id of queued(key)) {
    try {
      const blob = await readPhoto(id);
      if (!blob) { unqueuePhoto(key, id); continue; }
      const body = JSON.stringify({ message: 'Einkauf & Rezepte: Rezeptfoto', branch: config.branch, content: toBase64(new Uint8Array(await blob.arrayBuffer())) });
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
    const card = element('article', undefined, `day${day === today ? ' today' : ''}`);
    const head = element('div', undefined, 'day-head'), title = element('h3', dayName(day));
    title.append(element('small', dayMonthLabel(day)));
    head.append(title, iconButton('plus', `${dayName(day)}: Gericht planen`, () => openMeal({ date: day })));
    card.append(head);
    for (const meal of meals.filter(row => row.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) card.append(mealRow(meal, recipes));
    box.append(card);
  }
  $('#plan-shopping').disabled = !ready || !meals.some(meal => recipes.has(meal.recipeId));
}
function mealRow(meal, recipes) {
  const recipe = recipes.get(meal.recipeId);
  const name = meal.recipeId ? recipe?.name || 'Gelöschtes Rezept' : meal.title;
  const row = element('div', undefined, `meal${meal.done ? ' done' : ''}`);
  const check = button('', () => toggleMeal(meal.id), 'check');
  if (meal.done) check.append(icon('check'));
  check.setAttribute('aria-label', `${name}: ${meal.done ? 'als nicht gekocht markieren' : 'als gekocht markieren'}`);
  check.setAttribute('aria-pressed', String(Boolean(meal.done)));
  const copy = element('div', undefined, 'meal-copy');
  copy.append(recipe ? button(name, () => showRecipe(recipe.id), 'link-button') : element('strong', name), element('small', `${format(meal.servings)} Portionen`));
  row.append(check, copy, iconButton('edit', `${name} ändern`, () => openMeal({ id: meal.id })),
    iconButton('trash', `${name} aus dem Plan entfernen`, () => removeRows('meals', [meal.id])));
  return row;
}
// „Gekocht“ merkt sich auch am Rezept, wann es zuletzt auf dem Tisch stand.
function toggleMeal(id) {
  const meal = state.meals.find(row => row.id === id && !row.deletedAt);
  if (!meal) return;
  const ops = [nextOp('meals', id, { done: !meal.done })], today = isoDate();
  const recipe = meal.recipeId && active(state.recipes).find(row => row.id === meal.recipeId), day = meal.date < today ? meal.date : today;
  if (!meal.done && recipe && (!recipe.lastCookedAt || recipe.lastCookedAt.slice(0, 10) < day)) ops.push(nextOp('recipes', recipe.id, { lastCookedAt: day }));
  commit(ops);
}
function showRecipe(id) {
  $('#recipe-search').value = ''; tagFilter = ''; favoritesOnly = false; oldestFirst = false; openRecipes.add(id);
  tab('recipes'); renderRecipes();
  document.querySelector(`[data-recipe-id="${id}"]`)?.scrollIntoView({ block: 'start' });
}
function openMeal(options = {}) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const form = $('#meal-form'); form.reset();
  const meal = options.id ? state.meals.find(row => row.id === options.id && !row.deletedAt) : null;
  if (options.id && !meal) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  mealBaseline = meal ? clone(meal) : null;
  const recipes = active(state.recipes).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name, 'de'));
  fillRecipePick(recipes);
  form.elements.id.value = options.id || '';
  form.elements.date.value = meal?.date || options.date || isoDate();
  let choice = meal ? (meal.recipeId || '__custom') : options.recipeId || '';
  if (choice && choice !== '__custom' && !recipes.some(recipe => recipe.id === choice)) choice = meal ? '__custom' : '';   // das Rezept gibt es nicht mehr
  setRecipeChoice(choice);
  form.elements.title.value = meal?.title || '';
  form.elements.servings.value = plain(meal?.servings || options.servings || recipes.find(recipe => recipe.id === choice)?.servings || 2);
  syncMealForm(false);
  // Kommt man von einem Tag (＋ am Tag, Bearbeiten), steht der Tag in der Überschrift und lässt sich hier nicht noch einmal wählen. Nur von der Rezeptkarte aus (noch kein Tag) gibt es die Tagesauswahl.
  const fixedDay = Boolean(meal || options.date), day = form.elements.date.value;
  form.querySelector('[data-day]').hidden = fixedDay;
  const title = $('#meal-title'); title.textContent = meal ? 'Gericht ändern' : 'Gericht planen';
  if (fixedDay) title.append(' – ', element('span', `${dayName(day)} ${dayMonthLabel(day)}`));
  $('#meal-dialog').showModal();
  $('#recipe-pick').querySelector('[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' });
}
function syncMealForm(changedRecipe) {
  const form = $('#meal-form'), choice = form.elements.recipeId.value;
  form.querySelector('[data-custom]').hidden = choice !== '__custom';
  const recipe = active(state.recipes).find(row => row.id === choice);
  if (changedRecipe && recipe) form.elements.servings.value = plain(recipe.servings);
}
function saveMeal(event) {
  event.preventDefault(); guard(() => {
    const form = event.currentTarget, choice = form.elements.recipeId.value, custom = choice === '__custom', title = form.elements.title.value.trim();
    const date = form.elements.date.value;
    if (!validDay(date)) throw new Error('Bitte einen Tag auswählen.');
    if (!choice) throw new Error('Bitte ein Rezept wählen oder „Eigenes Gericht“ eintragen.');
    if (custom && !title) throw new Error('Bitte einen Namen für das eigene Gericht eingeben.');
    if (!custom) currentRecipe(choice);
    const id = form.elements.id.value || uid();
    const patch = { date, servings: positive(form.elements.servings.value), recipeId: custom ? '' : choice, title: custom ? title : '' };
    if (!mealBaseline) patch.done = false;
    const delta = changed(patch, mealBaseline);
    if (Object.keys(delta).length) commit([nextOp('meals', id, delta)]);
    planWeek = weekStart(date); $('#meal-dialog').close(); renderPlan(); tab('plan');
  });
}
function currentRecipe(id) {
  if (!active(state.recipes).some(recipe => recipe.id === id)) throw new Error('Dieses Rezept wurde inzwischen gelöscht. Bitte ein anderes wählen.');
}
function weekRows() {
  const form = $('#week-form'), days = weekDays(planWeek);
  const meals = active(state.meals).filter(meal => days.includes(meal.date) && meal.recipeId && !(form.elements.skipDone.checked && meal.done));
  return aggregateIngredients(meals, active(state.recipes), active(state.ingredients));
}
function renderWeekRows() {
  const box = $('#week-ingredients'); box.replaceChildren();
  const rows = weekRows(), keys = pantryKeys(state.pantry);
  if (!rows.length) box.append(element('p', 'Keine Zutaten: Plane zuerst Gerichte mit Rezepten ein oder nimm schon gekochte Gerichte hinzu.', 'empty'));
  for (const row of rows) {
    const label = element('label', undefined, 'transfer-row'), check = element('input'), text = element('span', ingredientLabel(row));
    const stocked = inPantry(keys, row.name);
    check.type = 'checkbox'; check.checked = row.unit !== NO_AMOUNT && !stocked;
    label._row = row;
    if (row.sources.length) text.append(element('small', row.sources.join(', '), 'hint'));
    label.append(check, text); if (stocked) label.append(element('small', 'Vorrat', 'pantry-badge'));
    box.append(label);
  }
}
function openWeekShopping() {
  const form = $('#week-form'); storeOptions(form.elements.storeId, defaultStore(), true);
  $('#week-intro').textContent = `${weekLabel(planWeek)}: Zutaten aller geplanten Gerichte, zusammengezählt und auf die Portionen umgerechnet.`;
  form.elements.rememberPantry.checked = false; renderWeekRows(); $('#week-dialog').showModal();
}

/* ---------- Rezept-Import: Link, Screenshot, Text ---------- */
const IMPORT_LABELS = { link: 'Rezept laden', image: 'Text erkennen', text: 'Text auswerten' };
function setImportSource(name) {
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
    'Zum Laden braucht die App einen Hilfsdienst. Erlaube die öffentlichen Dienste (es wird nur der Link gesendet) oder richte einen eigenen ein. Screenshot und Text funktionieren immer ohne.';
}
function releasePreviews() { previewUrls.forEach(url => URL.revokeObjectURL(url)); previewUrls = []; }
function openImport(options = {}) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const form = $('#import-form'); form.reset(); releasePreviews(); $('#import-previews').replaceChildren();
  form.elements.publicProxy.checked = Boolean(config.publicProxy);
  setImportSource(options.source || 'link'); linkHint();
  if (options.url) form.elements.url.value = options.url;
  $('#import-dialog').showModal();
  if (options.url && (workerHost(config.importProxy) || config.publicProxy)) form.requestSubmit();
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
  importAbort = new AbortController();
  const { signal } = importAbort, runButton = $('#import-run');
  runButton.disabled = true;
  try {
    let draft, raw = '';
    if (importSource === 'link') {
      const allowPublic = form.elements.publicProxy.checked;
      if (allowPublic !== Boolean(config.publicProxy)) saveConfig({ ...config, publicProxy: allowPublic });
      importStatus('Seite wird geladen …', 0.1);
      const link = form.elements.url.value.trim(), { html } = await fetchRecipePage(link, { workerUrl: config.importProxy, allowPublic }, signal);
      draft = recipeFromHtml(html, link);
      if (draft.via === 'text') raw = htmlToText(html).slice(0, 8000);
    } else if (importSource === 'image') {
      const files = [...form.elements.images.files];
      if (!files.length) throw new Error('Bitte zuerst einen Screenshot oder ein Foto wählen.');
      const { recognizeImages } = await import('./ocr.js');
      raw = await recognizeImages(files, (fraction, label) => importStatus(label, fraction), signal);
      if (!raw) throw new Error('Im Bild wurde kein Text erkannt. Bitte einen schärferen Ausschnitt wählen oder den Text einfügen.');
      draft = parseRecipeText(raw);
    } else {
      if (!text) throw new Error('Bitte zuerst den Rezepttext einfügen.');
      draft = recipeFromAnyText(text);
      if (draft.via === 'text') raw = text;
    }
    $('#import-dialog').close();
    editRecipe('', { ...draft, raw });
  } catch (error) {
    if (error?.name !== 'AbortError') { importStatus(''); message(error.message); }
  } finally { importAbort = null; runButton.disabled = false; importStatus(''); }
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
// Mit einem Link in den Einstellungen wird stattdessen diese Seite einmal am Tag geladen (braucht den Hilfsdienst) und die ersten zehn
// noch nicht entschiedenen Rezepte kommen einzeln zum Durchklicken. Gemerkt wird nur auf diesem Gerät: heutige Auswahl, Stand und alles Entschiedene.
const dailyStore = () => `einkauf-daily:${namespace()}`;
let daily = null, dailyTicket = 0, dailyTried = '', builtinCollection = null;
const dailyDrafts = new Map();
const dailySource = () => webUrl(config.dailySource);
const dailySourceKey = () => dailySource() || BUILTIN_SOURCE;
function loadDaily() {
  if (daily) return daily;
  try { const saved = JSON.parse(localStorage.getItem(dailyStore())); if (saved && typeof saved === 'object' && Array.isArray(saved.queue)) daily = saved; } catch { /* neu anlegen */ }
  daily ||= { day: '', source: '', queue: [], index: 0, outcome: {}, decided: [] };
  daily.decided ||= []; daily.outcome ||= {}; daily.index ||= 0;
  return daily;
}
function saveDaily() { try { localStorage.setItem(dailyStore(), JSON.stringify({ ...daily, decided: daily.decided.slice(-600) })); } catch { /* nur ein Merkzettel */ } }
// Schlüssel der eigenen Rezepte: Quelle (Link) und Name, damit dasselbe Rezept nicht noch einmal vorgeschlagen wird.
const knownRecipeKeys = () => new Set(active(state.recipes).flatMap(row => [row.name ? builtinKey(row.name) : '', row.sourceUrl ? recipeKey(row.sourceUrl) : '']).filter(Boolean));
// Wie viele sind heute noch offen? null = heute noch nicht geladen.
// Ein heute geladener, aber leerer Stand der Sammlung (aus der Zeit vor den neuen Rezepten) gilt als veraltet und wird neu geplant.
const dailyFresh = d => d.day === localDay() && d.source === dailySourceKey() && !(d.builtin && !d.queue.length);
const dailyLeft = () => { const d = loadDaily(); return dailyFresh(d) ? Math.max(0, d.queue.length - d.index) : null; };
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
async function loadDailyList(signal) {
  const source = dailySource(), old = loadDaily(), key = dailySourceKey();
  if (dailyFresh(old)) return old;
  if (!source) {
    const collection = await loadBuiltin(), known = knownRecipeKeys(), queue = planBuiltin(collection, localDay(), new Set(old.decided), known);
    // Ist die Sammlung durch, kommen die fehlenden Plätze des Tages aus neu zusammengestellten Rezepten (recipe-maker.js, wird erst dann geladen).
    if (queue.length < BUILTIN_PER_DAY) queue.push(...(await import('./recipe-maker.js')).planGenerated(localDay(), known, queue.length));
    daily = { day: localDay(), source: key, queue, index: 0, outcome: {}, decided: old.decided, found: collection.length, builtin: true };
  } else {
    const { html } = await fetchRecipePage(source, { workerUrl: config.importProxy, allowPublic: Boolean(config.publicProxy) }, signal);
    const links = extractRecipeLinks(html, source);
    daily = { day: localDay(), source: key, queue: planDay(links, new Set(old.decided), knownRecipeKeys(), DAILY_MAX), index: 0, outcome: {}, decided: old.decided, found: links.length };
  }
  saveDaily();
  return daily;
}
// Pro Tag einmal still vorladen, sobald man den Rezepte-Bereich öffnet, damit die Zahl der offenen Rezepte schon dasteht.
function prefetchDaily() {
  if (!ready || dailyLeft() !== null || dailyTried === localDay()) return;
  dailyTried = localDay();
  loadDailyList().then(renderDailyButton).catch(() => { /* erst beim Öffnen melden */ });
}
async function dailyDraft(item) {
  if (!dailyDrafts.has(item.key)) {
    if (item.gen !== undefined) dailyDrafts.set(item.key, draftFromBuiltin((await import('./recipe-maker.js')).makeRecipe(item.gen)));
    else if (item.builtin) {
      const entry = (await loadBuiltin()).find(candidate => candidate.n === item.builtin);
      if (!entry) throw new Error('Dieses Rezept gibt es in der Sammlung nicht mehr.');
      dailyDrafts.set(item.key, draftFromBuiltin(entry));
    } else {
      const { html } = await fetchRecipePage(item.url, { workerUrl: config.importProxy, allowPublic: Boolean(config.publicProxy) });
      dailyDrafts.set(item.key, recipeFromHtml(html, item.url));
    }
  }
  return dailyDrafts.get(item.key);
}
function dailyButtons({ add = false, skip = false, retry = false } = {}) {
  $('#daily-add').hidden = !add; $('#daily-skip').hidden = !skip; $('#daily-retry').hidden = !retry;
  $('#daily-add').disabled = $('#daily-skip').disabled = false;
}
function fillDailyCard(draft, item) {
  const card = $('#daily-card'); card.replaceChildren();
  card.append(element('h3', draft.name || item.title));
  const time = /Gesamtzeit:\s*([^\n]+)/.exec(draft.instructions || '')?.[1];
  const facts = [time, draft.servings ? `${format(draft.servings)} Portionen` : '', draft.ingredients.length ? `${draft.ingredients.length} Zutaten` : ''].filter(Boolean);
  if (facts.length) card.append(element('p', facts.join(' · '), 'daily-facts'));
  if (draft.via === 'text') card.append(element('p', 'Keine strukturierten Rezeptdaten: Zutaten und Schritte sind geschätzt.', 'warn'));
  if (draft.ingredients.length) {
    const list = element('ul', undefined, 'daily-ingredients');
    for (const row of draft.ingredients.slice(0, 8)) list.append(element('li', ingredientLabel(row)));
    if (draft.ingredients.length > 8) list.append(element('li', `… und ${draft.ingredients.length - 8} weitere`, 'more'));
    card.append(list);
  } else card.append(element('p', 'Es wurden keine Zutaten erkannt. Dieses Rezept lässt sich über „Import“ von Hand übernehmen.', 'warn'));
  const steps = (draft.instructions || '').replace(/Gesamtzeit:[^\n]*\n*/, '').replace(/\n{2,}/g, '\n').trim();
  if (steps) card.append(element('p', steps.length > 260 ? `${steps.slice(0, 260).trim()} …` : steps, 'daily-steps'));
  if (item.url) {
    const link = element('a', `Auf ${hostLabel(item.url)} ansehen`, 'daily-link'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    card.append(link);
  } else card.append(element('p', item.gen === undefined ? 'Aus der eingebauten Sammlung' : 'Neu zusammengestellt. Gespeichert wird nur, was du hinzufügst.', 'hint'));
}
async function showDaily() {
  const ticket = ++dailyTicket, card = $('#daily-card'), progress = $('#daily-progress'), note = $('#daily-note');
  note.textContent = ''; dailyButtons();
  $('#daily-add').disabled = $('#daily-skip').disabled = true;
  try {
    card.replaceChildren(element('p', 'Rezepte werden geladen …', 'hint')); progress.textContent = '';
    const d = await loadDailyList();
    if (ticket !== dailyTicket) return;
    // Was inzwischen schon in den eigenen Rezepten steht (z. B. per Import), wird nicht noch einmal vorgeschlagen.
    const known = knownRecipeKeys();
    while (d.index < d.queue.length && known.has(d.queue[d.index].key)) { d.outcome[d.queue[d.index].key] = 'known'; d.index += 1; }
    saveDaily(); renderDailyButton();
    if (!d.queue.length) {
      card.replaceChildren(element('p', d.builtin ? 'Heute gibt es keine neuen Vorschläge. Morgen geht es weiter.' : d.found ? 'Alle Rezepte dieser Seite hast du schon gesehen oder in deinen Rezepten. Morgen gibt es neue.' : 'Auf der Seite wurden keine Rezept-Links gefunden. Prüfe den Link in den Einstellungen. Seiten, die ihre Rezepte erst per JavaScript nachladen, kann die App nicht lesen.'));
      dailyButtons(); return;
    }
    if (d.index >= d.queue.length) {
      const added = Object.values(d.outcome).filter(value => value === 'added').length;
      progress.textContent = '';
      card.replaceChildren(element('h3', 'Für heute geschafft'), element('p', `${added} von ${d.queue.length} Rezepten hinzugefügt, ${d.queue.length - added} übersprungen oder schon vorhanden. Morgen gibt es neue Vorschläge.`));
      dailyButtons(); return;
    }
    const item = d.queue[d.index];
    progress.textContent = `Rezept ${d.index + 1} von ${d.queue.length}`;
    card.replaceChildren(element('h3', item.title), element('p', 'Rezept wird geladen …', 'hint'));
    const draft = await dailyDraft(item);
    if (ticket !== dailyTicket) return;
    fillDailyCard(draft, item);
    dailyButtons({ add: true, skip: true });
    $('#daily-add').disabled = !draft.ingredients.length;
    const next = d.queue[d.index + 1];
    if (next) dailyDraft(next).catch(() => { /* beim Anzeigen erneut versuchen */ });
  } catch (error) {
    if (ticket !== dailyTicket || error?.name === 'AbortError') return;
    note.textContent = error.message;
    const d = loadDaily(), item = d.queue[d.index];
    if (item && d.day === localDay()) { card.replaceChildren(element('h3', item.title)); dailyButtons({ skip: true, retry: true }); }
    else { card.replaceChildren(); dailyButtons({ retry: true }); }
  }
}
function decideDaily(outcome) {
  const d = loadDaily(), item = d.queue[d.index];
  if (!item) return;
  d.outcome[item.key] = outcome;
  if (item.gen === undefined && !d.decided.includes(item.key)) d.decided.push(item.key);   // gemerkt wird nur die Sammlung; neu zusammengestellte Rezepte kommen von selbst nicht wieder
  d.index += 1; saveDaily(); renderDailyButton();
  return showDaily();
}
function addDailyRecipe() {
  const d = loadDaily(), item = d.queue[d.index], draft = item && dailyDrafts.get(item.key);
  if (!draft?.ingredients.length) return;
  const id = uid(), name = (draft.name || item.title).trim().slice(0, 120);
  const patch = { name, servings: positive(draft.servings || 2), instructions: draft.instructions || '', tags: draft.tags || [] };
  if (draft.sourceUrl || item.url) patch.sourceUrl = draft.sourceUrl || item.url;
  const ops = [nextOp('recipes', id, patch), ...draft.ingredients.map(row => nextOp('ingredients', uid(), { recipeId: id, name: row.name.slice(0, 120), quantity: row.quantity, unit: String(row.unit).slice(0, 30) }))];
  commit(ops, `„${name}“ zu deinen Rezepten hinzugefügt`);
}
$('#daily-open').addEventListener('click', () => guard(() => {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  $('#daily-dialog').showModal(); showDaily();
}));
$('#daily-add').addEventListener('click', () => guard(() => { addDailyRecipe(); return decideDaily('added'); }));
$('#daily-skip').addEventListener('click', () => guard(() => decideDaily('skipped')));
$('#daily-retry').addEventListener('click', () => guard(() => showDaily()));
$('#daily-dialog').addEventListener('close', () => { dailyTicket += 1; });

/* ---------- Was kann ich kochen? ---------- */
// Ordnet die Rezepte danach, wie viele Zutaten schon da sind (Vorrat, Eingekauftes) oder noch kommen (offen auf der Einkaufsliste). Logik in cookable.js.
function renderCookable() {
  const recipes = active(state.recipes), ingredients = active(state.ingredients), live = new Set(active(state.stores).map(store => store.id));
  // Auch bereits entfernte Artikel zählen (schon eingekauft); eine eigene Liste („Wünsche“) zählt nicht.
  const names = namesFrom({ pantry: state.pantry || [], items: withoutSeparate(state.items.filter(item => !item.storeId || live.has(item.storeId)), active(state.stores)), now: Date.now() });
  const ranked = rankRecipes(recipes, recipe => ingredients.filter(row => row.recipeId === recipe.id), names);
  const ready = ranked.filter(entry => entry.tier === 0).length, soon = ranked.filter(entry => entry.tier === 1).length;
  $('#cookable-count').textContent = !recipes.length ? 'Noch kein Rezept.' : !ranked.length ? 'Noch passt kein Rezept zu euren Vorräten und der Einkaufsliste.' :
    [ready && `${ready} ${ready === 1 ? 'Rezept' : 'Rezepte'} könnt ihr sofort kochen`, soon && `${soon} nach dem Einkauf`].filter(Boolean).join(' · ') || (ranked.length === 1 ? '1 Vorschlag, bei dem nur wenig fehlt' : `${ranked.length} Vorschläge, bei denen nur wenig fehlt`);
  const box = $('#cookable-list'); box.replaceChildren();
  if (recipes.length && !ranked.length) box.append(element('p', 'Tippe unter Einstellungen → Vorrat ein, was ihr immer zu Hause habt, oder setze Artikel auf die Einkaufsliste. Dann erscheinen hier passende Rezepte.', 'empty'));
  const line = (label, list) => { const item = element('li'); item.append(element('strong', `${label}: `), document.createTextNode(list.join(', '))); return item; };
  const later = action => () => { $('#cookable-dialog').close(); action(); };
  for (const entry of ranked) {
    const { recipe } = entry, card = element('article', undefined, 'card cookable-card'), lines = element('ul', undefined, 'cookable-lines'), servings = recipe.servings;
    card.append(element('h3', recipe.name), element('p', entry.tier === 0 ? 'Alles da' : entry.tier === 1 ? `Alles da, sobald ihr einkauft (${entry.soon.length} von der Liste)` :
      `Es fehlen ${entry.missing.length} von ${entry.total} Zutaten`, `cookable-status tier${entry.tier}`));
    if (entry.have.length) lines.append(line('Da', entry.have));
    if (entry.soon.length) lines.append(line('Kommt noch', entry.soon));
    if (entry.missing.length) lines.append(line('Fehlt', entry.missing.map(row => row.name)));
    card.append(lines);
    const actions = element('div', undefined, 'actions');
    actions.append(button('Kochen', later(() => openCook(recipe.id, servings)), 'secondary'));
    if (entry.missing.length) actions.append(button('Fehlendes auf die Liste', later(() => openTransfer(recipe.id, servings, new Set(entry.missing.map(row => row.id)))), 'primary-action'));
    actions.append(iconButton('calendar', `${recipe.name} im Wochenplan einplanen`, later(() => openMeal({ recipeId: recipe.id, servings }))));
    card.append(actions); box.append(card);
  }
}
$('#cookable-open').addEventListener('click', () => guard(() => {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  renderCookable(); $('#cookable-dialog').showModal();
}));

/* ---------- GitHub ---------- */
// GitHub Contents API: erst aktuellen Stand lesen, nur eigene Operationen anwenden,
// dann mit genau dessen SHA schreiben. 409/422 führen zu erneutem Lesen und Mischen.
function apiPath() {
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${config.path.split('/').map(encodeURIComponent).join('/')}`;
}
async function api(method, body, etag = '') {
  let response;
  // AbortController funktioniert auch auf älteren iPhones, die die neuere
  // Hilfsmethode AbortSignal.timeout noch nicht anbieten.
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(`${apiPath()}${method === 'GET' ? `?ref=${encodeURIComponent(config.branch)}` : ''}`, {
      method, cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(etag ? { 'If-None-Match': etag } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch { throw new Error('Keine Verbindung zu GitHub. Deine Änderungen bleiben lokal gespeichert. Bei Empfang wird automatisch erneut gesendet; die App dafür geöffnet lassen.'); }
  finally { clearTimeout(timeout); }
  // 304: seit der letzten Abfrage unverändert. Solche Abfragen zählen nicht zum GitHub-Limit.
  if (response.status === 304) return null;
  if (!response.ok) {
    const error = new Error(response.status === 401 ?
      'Der GitHub-Token ist ungültig oder abgelaufen. Auf GitHub unter Settings → Developer settings → Personal access tokens → Fine-grained tokens einen neuen Token für das Daten-Repository erstellen (Contents: Read and write). Auf diesem Gerät unter Einstellungen ersetzen.' :
      response.status === 403 ? 'GitHub verweigert den Zugriff oder begrenzt Anfragen. Bitte Token-Rechte (Contents: Read and write), eine mögliche Freigabe und das GitHub-Limit prüfen. Details stehen in der Anleitung (Einstellungen → Anleitung). Lokale Änderungen bleiben erhalten.' :
      response.status === 404 ? 'GitHub findet Repository, Branch oder JSON-Datei nicht, oder dein Token hat keinen Zugriff. Prüfe Eigentümer, Repository, Branch, Dateiname und Token-Auswahl. Lege daten.json im privaten Repository an (siehe Anleitung).' :
      response.status === 429 ? 'Zu viele Anfragen an GitHub. Bitte kurz warten; lokale Änderungen bleiben erhalten.' :
      `GitHub meldet Fehler ${response.status}. Lokal gespeicherte Änderungen bleiben erhalten. Bitte später erneut aktualisieren.`);
    error.status = response.status;
    const retry = Number(response.headers.get('Retry-After'));
    const reset = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
    if ([403, 429].includes(response.status)) error.retryAt = Math.max(Date.now() + 60000, retry ? Date.now() + retry * 1000 : reset || 0);
    throw error;
  }
  const json = await response.json();
  if (method === 'GET') json.etag = response.headers.get('ETag') || '';
  return json;
}
function decodeFile(file) {
  if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('GitHub liefert die Datei nicht als kleine JSON-Datei. Bitte Datei und Größe prüfen (erste Version: unter 900 KB).');
  try { return validate(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0))))); }
  catch (error) { throw new Error(`Datendatei nicht lesbar: ${error.message}`); }
}
// Ohne Einrückung: Das spart rund die Hälfte der Dateigröße. GitHub und ältere App-Versionen lesen beides.
function encodeFile(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data) + '\n');
  if (bytes.length > LIMIT_BYTES) throw new Error('Die Daten sind größer als 900 KB, auch nach dem Aufräumen. Bitte ein Backup erstellen und Rezeptfotos, Verlauf und Wochenplan prüfen. Nichts wurde verworfen.');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
let retryAt = 0, compactRequested = false, lastSyncAt = 0;   // lastSyncAt: letzter geglückter Abgleich (die Foto-Bereinigung verlangt einen frischen)
async function sync(manual = false) {
  if (!connected()) { restingStatus(); return; }
  if (busy || (!manual && Date.now() < retryAt)) return;
  busy = true; $('#refresh').disabled = true;
  if (pending.length || manual || !ready) status('Gleiche ab …', 'busy');
  try {
    if (queued(queueKey()).length) await uploadPhotos(manual);
    for (let attempt = 0; attempt < 4; attempt++) {
      // Ohne eigene Änderungen genügt die Frage „hat sich etwas geändert?“ (HTTP 304).
      const file = await api('GET', undefined, !pending.length && !manual && ready && attempt === 0 ? remoteEtag : '');
      if (!file) { retryAt = 0; lastSyncAt = Date.now(); message(); restingStatus(); hydratePhotos(); return; }
      const remote = decodeFile(file);
      const batch = pending.slice();
      let merged = merge(remote, batch), tidy = null;
      // Haben zwei Geräte gleichzeitig denselben Artikel neu angelegt, wird das Doppel hier deterministisch zusammengeführt (siehe data.js).
      const folds = duplicateFolds(merged.items);
      if (folds.length) merged = merge(merged, folds);
      // Aufräumen auf dem gerade gelesenen gemeinsamen Stand: automatisch ab 250 KB oder auf Wunsch. Es darf den Abgleich nie verhindern.
      if (compactRequested || due(merged)) {
        try { tidy = compact(merged); if (tidy.changed) merged = tidy.data; } catch { tidy = null; }
      }
      // Schon bestätigte Operationen brauchen nach einem verlorenen HTTP-Ergebnis
      // nicht erneut geschrieben zu werden.
      let written = false;
      if (batch.some(op => !remote.sync.applied.includes(op.id)) || folds.length || tidy?.changed) {
        try {
          await api('PUT', { message: 'Einkauf & Rezepte: Änderungen synchronisieren',
            content: encodeFile(merged), sha: file.sha, branch: config.branch });
          written = true;
        } catch (error) { if ([409, 422].includes(error.status) && attempt < 3) continue; throw error; }
      }
      const sent = new Set(batch.map(op => op.id)), wasReady = ready, before = signature();
      saveLocal(merged, pending.filter(op => !sent.has(op.id)));
      remoteEtag = written ? '' : file.etag;
      if (compactRequested) { compactRequested = false; noteCompaction(tidy); }
      ready = true; retryAt = 0; lastSyncAt = Date.now(); message();
      // Nur neu zeichnen, wenn sich etwas geändert hat: So bleiben geöffnete Rezepte, Auswahllisten und Eingaben stehen.
      if (!wasReady || signature() !== before) render();
      restingStatus(); hydratePhotos();
      return;
    }
  } catch (error) {
    compactRequested = false;
    retryAt = error.retryAt || Date.now() + ([401, 404].includes(error.status) ? 60000 : 15000);
    status(pending.length ? 'Fehler · lokal gesichert' : 'Abgleich nicht möglich', 'error'); message(error.message);
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
    try { saved = JSON.parse(cache); validate(saved.base); if (!Array.isArray(saved.pending)) throw new Error('Warteschlange fehlt'); state = merge(saved.base, saved.pending); }
    catch { throw new Error('Der lokale Speicher ist beschädigt. Bitte Browserdaten nicht löschen und zuerst eine Sicherung der Browserdaten anfertigen.'); }
    base = saved.base; pending = saved.pending; ready = true;
  } else if (!connected()) {
    const response = await fetch('./beispieldaten.json');
    if (!response.ok) throw new Error('Die Beispieldaten konnten nicht geladen werden. Bitte alle App-Dateien hochladen.');
    base = validate(await response.json()); saveLocal(base, []); ready = true;
  }
  render(); restingStatus(); if (connected()) await sync(true);
}
function fillSettings() {
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token', 'tokenExpires']) {
    $('#settings-form').elements[key].value = config[key] || ({ branch: 'main', path: 'daten.json' }[key] || '');
  }
  const importForm = $('#import-settings-form');
  importForm.elements.importProxy.value = config.importProxy || ''; importForm.elements.dailySource.value = config.dailySource || ''; importForm.elements.publicProxy.checked = Boolean(config.publicProxy);
  $('#theme').value = config.theme || 'system'; $('#store-style').value = config.storeStyle === 'logo' ? 'logo' : 'text'; $('#group-items').checked = config.groupItems !== false; $('#product-images').checked = imagesOn(); applyTheme();
  // Nach dem Einrichten steht die Verbindung unten und eingeklappt; solange nichts verbunden ist, oben und offen.
  $('#settings').dataset.connected = connected() ? 'yes' : 'no';
  applyFolds();
  showConnectionState(); updateSaveButtons();
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
  const importChanged = imports.elements.importProxy.value.trim() !== (config.importProxy || '') || imports.elements.dailySource.value.trim() !== (config.dailySource || '') || imports.elements.publicProxy.checked !== Boolean(config.publicProxy);
  saveButtonState(imports, importChanged, config.importSavedAt, 'Import-Einstellungen speichern');
  if (!importChanged && !config.importSavedAt && !config.importProxy && !config.publicProxy) imports.querySelector('button[type=submit]').textContent = 'Import-Einstellungen speichern';
}
for (const id of ['#settings-form', '#import-settings-form']) for (const type of ['input', 'change']) $(id).addEventListener(type, updateSaveButtons);
function showConnectionState() {
  const left = tokenDaysLeft();
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
const PALETTES = ['blau', 'gruen', 'tuerkis', 'flieder', 'rose', 'pfirsich'];
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
async function deliverFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const link = element('a'); link.href = url; link.download = file.name;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function backup() {
  const name = `einkauf-backup-${new Date().toISOString().slice(0, 10)}.json`, json = JSON.stringify(state, null, 2);
  await deliverFile(new File([json], name, { type: 'application/json' }));
}
// Vollsicherung: eine ZIP-Datei mit den Daten (daten.json, wie die JSON-Sicherung) und allen Rezeptfotos (fotos/<Kennung>.jpg). Fotos kommen aus dem Gerätespeicher,
// sonst aus dem Daten-Repository; was sich nicht holen lässt, wird gezählt und in „lies-mich.txt“ genannt. Die Wiederherstellung bleibt Handarbeit (siehe Anleitung).
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
    const lines = [`Vollsicherung von Einkauf & Rezepte vom ${stamp}`, '', `daten.json: alle Daten (wie „Alle Daten als JSON sichern“), enthält keinen Token.`, `fotos/: ${files.length - 1} Rezeptfotos (Name = Foto-Kennung im Rezept, Feld photoId).`];
    if (missing.length) lines.push('', `Nicht gesichert (nicht auf diesem Gerät und nicht im Daten-Repository gefunden): ${missing.join(', ')}`);
    lines.push('', 'Wiederherstellen ist Handarbeit: Die Dateien liegen im Daten-Repository (daten.json und der Ordner photos). Bitte vertraulich aufbewahren.');
    files.push({ name: 'lies-mich.txt', data: encode(lines.join('\n')) });
    const zip = makeZip(files);
    await deliverFile(new File([zip], `einkauf-vollsicherung-${stamp}.zip`, { type: 'application/zip' }));
    const photos = files.length - 2, plural = count => `${count} ${count === 1 ? 'Foto' : 'Fotos'}`;
    note.textContent = `Gesichert: Daten und ${plural(photos)}${missing.length ? `, ${plural(missing.length)} nicht gefunden` : ''}.`;
  } catch (error) { note.textContent = ''; throw error; }
  finally { button.disabled = false; }
}

/* ---------- Im Laden ---------- */
// Umschalter „Planen | Im Laden“ (gilt für dieses Gerät). Im Laden: Geschäft oben wählen, nur das Wichtige sehen, abhaken.
let shopStore = '', shopDoneOpen = false;
const shopChecked = new Map();   // Artikel ohne Geschäft, die in dieser Sitzung in einem Geschäft abgehakt wurden: Kennung → Geschäft
const shopOn = () => config.shopMode === true;
// Beim Öffnen von „Im Laden“ (ein Tipp der Person) wird der Bildschirm neu angefordert, auch wenn es vorher nicht klappte; ebenso beim Zurückkehren in die App.
function setShopMode(on) { awake.shop.failed = false; if (on && selecting) setSelecting(false); saveConfig({ ...config, shopMode: on }); applyMode(); window.scrollTo(0, 0); }
function applyMode() {
  const on = shopOn();
  $('#plan-view').hidden = on; $('#shop-view').hidden = !on; $('#mode-row').hidden = on;
  $('#mode-plan').setAttribute('aria-selected', String(!on)); $('#mode-shop').setAttribute('aria-selected', String(on));
  if (on) renderShop();
  syncChrome(); syncShopLock();
}
// Im Laden steht ganz oben die Geschäftsauswahl: Kopfzeile und Umschalter verschwinden, solange diese Ansicht offen ist.
function syncChrome() { document.body.classList.toggle('in-store', shopOn() && !$('#shopping').hidden); armLock(); }
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
function holdToConfirm(node, ms, action, hint = '') {
  let timer = null, startX = 0, startY = 0, pointer = false, reset = 0;
  node.style.setProperty('--hold', `${ms}ms`);
  const stop = () => { clearTimeout(timer); timer = null; node.classList.remove('holding'); };
  const settle = () => { clearTimeout(reset); reset = setTimeout(() => { pointer = false; }, 800); };   // das „click“ nach dem Loslassen gehört noch zum Zeiger
  node.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = true; clearTimeout(reset); startX = event.clientX; startY = event.clientY;
    stop(); node.classList.add('holding');
    timer = setTimeout(() => { stop(); settle(); clearSelection(); navigator.vibrate?.(15); guard(action); }, ms);
  });
  node.addEventListener('pointermove', event => { if (timer !== null && Math.hypot(event.clientX - startX, event.clientY - startY) > 16) stop(); });
  node.addEventListener('pointerleave', stop);
  for (const type of ['pointerup', 'pointercancel']) node.addEventListener(type, event => {
    const early = timer !== null; stop(); settle();
    if (early && type === 'pointerup' && hint && !isLocked()) showNotice(hint);
  });
  node.addEventListener('click', event => { event.preventDefault(); if (!pointer) guard(action); });
  node.addEventListener('contextmenu', event => event.preventDefault());
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
const LOCK_HOLD = '#shop-list .shop-tap, #shop-chips .chip, #shop-list .shop-done summary';
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
document.addEventListener('selectstart', event => { if (shopOn() && (event.target.parentElement || event.target).closest?.('#shop-view')) event.preventDefault(); }, true);
const clearSelection = () => { try { getSelection()?.removeAllRanges(); } catch { /* keine Auswahl */ } };
document.addEventListener('pointerdown', event => {
  if (!isLocked() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const node = event.target.closest?.(LOCK_HOLD);
  if (!node) return;
  endLockHold();
  node.style.setProperty('--hold', `${HOLD_ITEM_MS}ms`); node.classList.add('holding');
  lockHold = { node, x: event.clientX, y: event.clientY, timer: setTimeout(() => {
    const target = node; endLockHold(); clearSelection(); navigator.vibrate?.(15);
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
  const tap = element('button', undefined, 'shop-tap'); tap.type = 'button';
  const mark = element('span', undefined, 'shop-mark'); if (item.checked) mark.append(icon('check'));
  tap.append(mark);
  const text = element('div', undefined, 'shop-text');
  text.append(element('span', item.name, 'shop-name'), element('span', `${format(item.quantity)} ${item.unit}`, 'shop-qty'));
  if (imagesOn()) text.append(thumbFor(item));
  tap.setAttribute('aria-pressed', String(Boolean(item.checked)));
  tap.setAttribute('aria-label', `${item.name}, ${format(item.quantity)} ${item.unit}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
  tap.addEventListener('click', () => guard(() => {
    const latest = state.items.find(entry => entry.id === item.id);
    if (!latest || latest.deletedAt) return;
    // Ein Artikel ohne Geschäft, der hier abgehakt wird, steht in den anderen Geschäften nicht mehr auf der Liste.
    if (!latest.checked && !latest.storeId && shopStore !== ALL_STORES) shopChecked.set(latest.id, shopStore); else shopChecked.delete(latest.id);
    commit([nextOp('items', item.id, { checked: !latest.checked })]);
    // Ein versehentliches Abhaken lässt sich gleich zurücknehmen (der Artikel verschwindet sonst aus der offenen Liste).
    if (!latest.checked) showNotice(`„${latest.name}“ abgehakt`, () => {
      const now = state.items.find(entry => entry.id === item.id);
      if (!now || now.deletedAt || !now.checked) return;
      shopChecked.delete(item.id); commit([nextOp('items', item.id, { checked: false })]);
    });
  }));
  row.append(tap, text);
  return row;
}
function shopNewsRow(entry) {
  const item = entry.item, row = element('li', undefined, 'shop-item news');
  const copy = element('div', undefined, 'item-copy');
  copy.append(element('strong', item.name, 'shop-name'), element('small', `${format(item.quantity)} ${item.unit} · ${entry.entries.map(e => e.kind === 'neu' ? `neu von ${e.by}` : `+${format(e.quantity)} ${e.unit} von ${e.by}`).join(', ')}`));
  row.append(copy, button('Übernehmen', () => acknowledge(entry.entries.map(e => e.id)), 'primary small'));
  return row;
}
function renderShop() {
  const stores = active(state.stores), everything = visibleItems(true);
  if (shopStore && shopStore !== ALL_STORES && !stores.some(store => store.id === shopStore)) shopStore = '';
  const items = visibleItems(shopStore === ALL_STORES ? '' : shopStore);   // ohne die eigenen Listen anderer Geschäfte und ohne die „Alle“-Ansicht
  const chips = $('#shop-chips'); chips.replaceChildren();
  // „Alle“ steht vor den Geschäften (wie unter „Planen“): alles Offene aus allen Geschäften und ohne Geschäft
  if (stores.length) {
    const all = element('button', 'Alle', 'chip'); all.type = 'button';
    all.setAttribute('role', 'tab'); all.setAttribute('aria-selected', String(shopStore === ALL_STORES));
    const open = visibleItems().filter(item => !item.checked).length; if (open) all.append(element('span', String(open), 'count'));
    all.addEventListener('click', () => { shopStore = ALL_STORES; renderShop(); });
    chips.append(all);
  }
  for (const store of stores) {
    const chip = element('button', undefined, 'chip'); chip.type = 'button'; chip.append(storeLabel(store.name));
    chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', String(store.id === shopStore));
    const count = shopCount(everything, store.id, takesAnywhere(store)); if (count) chip.append(element('span', String(count), 'count'));
    chip.addEventListener('click', () => { shopStore = store.id; renderShop(); });
    chips.append(chip);
  }
  const selected = chips.querySelector('[aria-selected=true]');
  if (selected) chips.scrollLeft = Math.max(0, selected.offsetLeft - (chips.clientWidth - selected.offsetWidth) / 2);
  const list = $('#shop-list'); list.replaceChildren();
  if (!shopStore) {
    $('#shop-status').textContent = '';
    list.append(element('li', stores.length ? 'Tippe oben auf das Geschäft, in dem du gerade bist.' : 'Es gibt noch kein Geschäft. Lege unter „Planen“ eines an.', 'empty'));
    return;
  }
  ensureSeen();
  if (shopStore === ALL_STORES) { renderShopAll(list, items, stores); return; }
  const shop = shopView(items, shopStore, shopChecked, takesAnywhere(stores.find(store => store.id === shopStore))), here = [...shop.open, ...shop.anywhere];
  const news = seen ? newFromOthers(here, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  const groups = rows => groupByCategory(rows.filter(item => !newIds.has(item.id)), itemHistory(), aislesOf(shopStore));
  const total = shoppingTotal(here);
  $('#shop-status').textContent = here.length ? `Noch ${here.length} offen${total.cents > 0 ? ` · ca. ${euros(total.cents)}` : ''}` : `Alles erledigt bei ${storeName(shopStore)}.`;
  news.forEach(entry => list.append(shopNewsRow(entry)));
  for (const group of groups(shop.open)) { list.append(groupHead(group.label, group.items.length)); group.items.forEach(item => list.append(shopRow(item))); }
  const anywhere = groups(shop.anywhere);
  if (anywhere.length) {
    list.append(element('li', 'Überall möglich', 'store-head none'));
    for (const group of anywhere) { list.append(groupHead(group.label, group.items.length)); group.items.forEach(item => list.append(shopRow(item))); }
  }
  const apart = isSeparate(stores.find(store => store.id === shopStore));   // eine eigene Liste steht für sich: keine Hinweise auf Artikel anderswo
  if (shop.elsewhere && !apart) list.append(element('li', `${shop.elsewhere} Artikel für andere Geschäfte`, 'shop-note'));
  if (shop.hidden && !apart) list.append(element('li', `${shop.hidden} Artikel ohne Geschäft stehen hier nicht (einstellbar unter „Geschäfte“)`, 'shop-note'));
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
  const total = shoppingTotal(here);
  $('#shop-status').textContent = here.length ? `Noch ${here.length} offen${total.cents > 0 ? ` · ca. ${euros(total.cents)}` : ''}` : 'Alles erledigt.';
  news.forEach(entry => list.append(shopNewsRow(entry)));
  for (const section of all.sections) {
    const open = section.open.filter(item => !newIds.has(item.id)); if (!open.length) continue;
    list.append(storeHead(section.store ? section.store.name : 'Ohne Geschäft', open.length, !section.store));
    for (const group of groupByCategory(open, itemHistory(), aislesOf(section.store?.id))) { const head = groupHead(group.label, group.items.length); head.classList.add('sub'); list.append(head); group.items.forEach(item => list.append(shopRow(item))); }
  }
  appendShopDone(list, all.done);
}
// Was „Einkauf beenden“ entfernt: alles Abgehakte der Ansicht. Eine eigene Liste („Wünsche“) bleibt dabei unberührt; ist sie selbst gewählt, wird nur sie beendet.
function finishItems() {
  const own = isSeparate(active(state.stores).find(store => store.id === shopStore));
  return visibleItems(shopStore === ALL_STORES ? '' : shopStore).filter(item => item.checked && (!own || item.storeId === shopStore));
}
function openFinish() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const checked = finishItems().length;
  $('#finish-text').textContent = checked ? `${checked} abgehakte ${checked === 1 ? 'Artikel wird' : 'Artikel werden'} von der Liste entfernt.` : 'Es ist noch nichts abgehakt.';
  $('#finish-form').reset(); message();
  $('#finish-dialog').showModal();
}
// Beendet den Einkauf: Abgehaktes verschwindet von der Liste. Mit `amount` (bezahlter Betrag) wird er gleich unter „Ausgaben“ gespeichert, für das gewählte Geschäft und heute,
// und die App springt zurück zu „Planen“.
function finishShopping(amount = '') {
  const checked = finishItems(), ids = checked.map(item => item.id), typed = amount.trim();
  const storeId = shopStore === ALL_STORES ? '' : shopStore;   // „Alle“ ist kein Geschäft: der Betrag wird dann ohne Geschäft gespeichert
  // Betrag zuerst prüfen: bei einem Fehler bleibt alles, wie es ist. `estimate`: geschätzte Summe der abgehakten Artikel (0, wenn zu wenige Preise bekannt sind).
  const fields = typed ? purchaseFields({ amount: typed, date: isoDate(), storeId, storeName: active(state.stores).find(store => store.id === storeId)?.name || '', note: DEFAULT_NOTE,
    estimate: estimateOf(checked) }, isoDate()) : null;
  const ops = [...deleteOps('items', ids), ...(fields ? [nextOp('purchases', uid(), fields)] : [])];
  shopChecked.clear();
  $('#finish-dialog').close();
  const notice = fields ? `${euros(fields.cents)} unter Ausgaben gespeichert${budgetNote(monthTotalWith(monthOf(fields.date), fields.cents))}` : '';
  if (fields) spendMonth = monthOf(fields.date);
  if (ops.length) commit(ops, notice); else render();
  setShopMode(false);   // auf jedem Weg, den Einkauf zu beenden: zurück zur Liste („Planen“)
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
  return layoutRecipe({ recipe: { name: recipe.name, servings: count, tags: recipe.tags, sourceHost: source ? hostLabel(source) : '', sourceUrl: source },
    ingredients: rows.map(row => sheetIngredient(row, count / recipe.servings)), instructions: recipe.instructions, photo });
}
let sheet = null;   // das gerade gezeigte Blatt: { layout, release }
const canShareFiles = () => { try { return Boolean(navigator.canShare?.({ files: [new File(['%PDF'], 'rezept.pdf', { type: 'application/pdf' })] })); } catch { return false; } };
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
async function shareSheet() {
  const file = sheetFile();
  try { await navigator.share({ files: [file], title: sheet.layout.title }); sheetStatus('Geteilt.'); }
  catch (error) { if (error?.name !== 'AbortError') throw error; }
}
// Speichern: eine Datei herunterladen. In einer Homescreen-App auf dem iPhone führt ein Download oft in eine Seite ohne Rückweg; dort ist der Teilen-Dialog („In Dateien sichern“) der sichere Weg.
async function saveSheet() {
  if (navigator.standalone === true && canShareFiles()) return shareSheet();
  const file = sheetFile(), url = URL.createObjectURL(file), link = element('a');
  link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  sheetStatus(`„${file.name}“ wird gespeichert.`);
}
const sheetAction = action => async () => { sheetStatus(); try { await action(); } catch (error) { sheetStatus(error.message || 'Das hat nicht geklappt.', true); } };
$('#sheet-save').addEventListener('click', sheetAction(saveSheet));
$('#sheet-share').addEventListener('click', sheetAction(shareSheet));
$('#sheet-zoom').addEventListener('click', () => setSheetZoom(Number($('#sheet-pages').dataset.zoom) % 3 + 1));
$('#sheet-dialog').addEventListener('close', () => { sheet?.release(); sheet = null; $('#sheet-pages').replaceChildren(); });
holdOn($('#sheet-scroll'), '*', HOLD_SHEET_MS, () => { navigator.vibrate?.(15); $('#sheet-dialog').close(); });
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
let pickPool = [];   // alle Rezepte, aus denen die Auswahl im Fenster „Gericht planen“ filtert
// Die Liste nach dem Filter: das gerade gewählte Rezept bleibt immer sichtbar (siehe recipe-filter.js); „Eigenes Gericht“ steht immer am Ende.
function renderPick() {
  const list = $('#recipe-pick'), form = $('#meal-form'), filter = $('#recipe-filter').value, choice = form.elements.recipeId.value;
  list.replaceChildren();
  const row = (value, title, meta, custom) => {
    const node = element('button', undefined, `pick-row${custom ? ' custom' : ''}`); node.type = 'button'; node.dataset.value = value;
    node.setAttribute('aria-pressed', String(value === choice));
    node.append(element('strong', title)); if (meta) node.append(element('small', meta));
    list.append(node);
  };
  // Bei „Lange nicht gekocht“ steht dabei, wie lange es her ist.
  const lastTime = recipe => {
    if (filter !== LONG_AGO) return '';
    const when = recipe.lastCookedAt ? relativeDay(recipe.lastCookedAt) : '';
    return !recipe.lastCookedAt ? ' · noch nie gekocht' : when === 'geplant' ? '' : ` · zuletzt ${when}`;
  };
  const shown = pickRecipes(pickPool, filter, { today: isoDate(), keep: choice });
  for (const recipe of shown) row(recipe.id, `${recipe.favorite ? '★ ' : ''}${recipe.name}`, `${format(recipe.servings)} Portionen${lastTime(recipe)}`, false);
  if (!shown.length) list.append(element('p', 'Kein Rezept dafür.', 'pick-empty'));
  row('__custom', 'Eigenes Gericht (ohne Rezept)', '', true);
}
// Das Auswahlfeld für den Filter (Alle, Favoriten, Lange nicht gekocht, jedes Stichwort); mit nur einem Eintrag gibt es nichts zu filtern.
function fillRecipePick(recipes) {
  pickPool = recipes;
  const select = $('#recipe-filter'), options = filterOptions(recipes, isoDate());
  select.replaceChildren(...options.map(option => { const node = element('option', `${option.label} (${option.count})`); node.value = option.value; return node; }));
  select.value = ''; select.hidden = options.length < 2;
  renderPick();
}
$('#recipe-filter').addEventListener('change', () => { renderPick(); $('#recipe-pick').scrollTop = 0; });
function setRecipeChoice(value) {
  $('#meal-form').elements.recipeId.value = value;
  $('#recipe-pick').querySelectorAll('.pick-row').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.value === value)));
}
let pickOpenedAt = 0, pickHeld = false;   // pickHeld: Der Finger liegt nach dem langen Drücken noch auf der Zeile; sein Loslassen wählt nichts
function openPickedSheet(node) {
  const id = node.dataset.value;
  if (!id || id === '__custom') return;
  const form = $('#meal-form'), shown = form.elements.recipeId.value === id ? positive(form.elements.servings.value) : 0;   // gewählt: die eingestellten Portionen, sonst die des Rezepts
  pickOpenedAt = Date.now(); pickHeld = true; navigator.vibrate?.(15);
  guard(() => openSheet(id, shown));
}
$('#recipe-pick').addEventListener('pointerdown', () => { pickHeld = false; }, true);
$('#recipe-pick').addEventListener('keydown', () => { pickHeld = false; }, true);
holdOn($('#recipe-pick'), '.pick-row', HOLD_ITEM_MS, openPickedSheet);
$('#recipe-pick').addEventListener('click', event => {
  const node = event.target.closest('.pick-row');
  if (!node) return;
  if (pickHeld) { pickHeld = false; event.preventDefault(); return; }
  setRecipeChoice(node.dataset.value); syncMealForm(true);
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
  $('#cook-done').onclick = () => guard(() => { commit([nextOp('recipes', id, { lastCookedAt: isoDate() })], `„${recipe.name}“ als heute gekocht notiert`); cooked.delete(id); $('#cook-dialog').close(); });
  $('#cook-dialog').showModal();
  if (supported && config.cookAwake === true) void keepAwake('cook', true);
}

/* ---------- Ausgaben ---------- */
// Wie viel ihr eingekauft habt: Beträge von Hand oder aus einem Kassenbon-Foto/-Screenshot (Texterkennung auf dem Gerät, immer zur Kontrolle im Feld).
// Die Einträge liegen in der gemeinsamen Datei (Sammlung `purchases`) und sind für beide Personen sichtbar.
let spendMonth = monthOf(isoDate()), purchaseAbort = null, purchaseSource = 'hand', purchaseEditing = null;
const purchaseRows = () => active(state.purchases || []);
const countLabel = (count, one, many) => `${count} ${count === 1 ? one : many}`;
// Kurze Zahl über einer Säule: ganze Euro, ab 10.000 € in Tausendern („12k“), damit sie auch auf schmalen Telefonen in die Spalte passt.
const compactEuros = cents => cents >= 1000000 ? `${Math.round(cents / 100000)}k` : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(cents / 100));
// „Geschätzt 20,00 €, bezahlt 3,45 € mehr“ für Bildschirmleser und das Änderungsfenster.
function estimateWords(cents, estimate) {
  const diff = cents - estimate;
  return `geschätzt ${euros(estimate)}, ${!diff ? 'genau so viel bezahlt' : diff > 0 ? `${euros(diff)} mehr bezahlt` : `${euros(-diff)} weniger bezahlt`}`;
}
const budgetCents = () => active(state.budgets || []).find(row => row.id === 'monthly')?.cents || 0;
// Kurzer Zusatz für die Meldung nach dem Speichern: ab 80 % des Budgets („85 % des Budgets verbraucht“, „Budget um 12,30 € überschritten“).
function budgetNote(total) {
  const status = budgetStatus(total, budgetCents());
  return !status || status.level === 'ok' ? '' : status.level === 'over' ? ` · Budget um ${euros(-status.left)} überschritten` : ` · ${status.percent} % des Budgets verbraucht`;
}
// Summe des Monats nach dem Speichern eines Betrags (beim Ändern ohne den alten Betrag).
const monthTotalWith = (month, cents, replacing = null) => purchaseRows().filter(row => monthOf(row.date) === month && row.id !== replacing?.id).reduce((sum, row) => sum + row.cents, 0) + cents;
function renderBudget(spent) {
  const box = $('#spending-budget'), budget = budgetCents(), status = budgetStatus(spent, budget);
  box.replaceChildren();
  if (!status) { box.append(button('Monatsbudget festlegen', openBudget, 'text-button')); box.classList.add('empty-budget'); return; }
  box.classList.remove('empty-budget');
  const head = element('div', undefined, 'spend-budget-head'), copy = element('div');
  copy.append(element('strong', `Budget ${euros(budget)}`), element('small', status.left >= 0 ? `${status.percent} % verbraucht · noch ${euros(status.left)}` : `${euros(-status.left)} über dem Budget (${status.percent} %)`, `budget-${status.level}`));
  head.append(copy, iconButton('edit', 'Monatsbudget ändern', openBudget));
  const bar = element('div', undefined, 'spend-share'), fill = element('span', undefined, `budget-fill ${status.level}`);
  fill.style.width = `${Math.min(100, Math.max(2, status.percent))}%`; bar.append(fill);
  bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(Math.min(100, status.percent)));
  bar.setAttribute('aria-label', `Budget zu ${status.percent} Prozent verbraucht`);
  box.append(head, bar);
}
function openBudget() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const form = $('#budget-form'), budget = budgetCents();
  form.reset(); message(); form.elements.amount.value = budget ? String(budget % 100 ? formatAmount(budget) : budget / 100) : '';
  $('#budget-remove').hidden = !budget;
  $('#budget-dialog').showModal(); form.elements.amount.focus();
}
function saveBudget() {
  const cents = parseAmount($('#budget-form').elements.amount.value);
  $('#budget-dialog').close();
  commit([nextOp('budgets', 'monthly', { cents })], `Monatsbudget ${euros(cents)} gespeichert`);
}
function renderSpending() {
  if ($('#spending').hidden) return;
  const rows = purchaseRows(), stores = active(state.stores), now = monthOf(isoDate());
  if (!validMonth(spendMonth)) spendMonth = now;
  const before = shiftMonth(spendMonth, -1), current = summarize(rows, spendMonth, stores), last = summarize(rows, before, stores);
  $('#month-label').textContent = monthLabel(spendMonth);
  $('#month-today').hidden = spendMonth === now;
  $('#month-prev').disabled = spendMonth <= firstMonth(rows, now);
  $('#month-next').disabled = spendMonth >= latestMonth(rows, now);

  // Ganz ohne Einträge: eine kurze Erklärung mit „Ersten Einkauf eintragen“; Monatswahl, Summe, Diagramm und Liste erscheinen nach dem ersten Eintrag.
  const none = rows.length === 0;
  $('#spending-empty').hidden = !none;
  for (const node of [$('#spending .week-nav'), $('#spending-summary'), $('#spending-chart-card'), $('#spending .list-head'), $('#purchase-list'), $('#spending .spend-hint')]) node.hidden = none;
  const summary = $('#spending-summary'); summary.replaceChildren();
  summary.append(element('span', spendMonth === now ? 'Bisher ausgegeben' : 'Ausgegeben', 'spend-label'), element('strong', euros(current.total), 'spend-total'),
    element('small', current.count ? `${countLabel(current.count, 'Einkauf', 'Einkäufe')} · Ø ${euros(current.average)}` : 'In diesem Monat ist noch nichts eingetragen.'));
  if (last.count) {
    const name = monthName(before), diff = compareTotals(current.total, last.total), more = diff.diff > 0;
    if (!current.count) summary.append(element('small', `Im ${name}: ${euros(last.total)}`));
    else if (!diff.diff) summary.append(element('small', `Genau so viel wie im ${name}`));
    else summary.append(element('small', `${more ? '▲' : '▼'} ${euros(Math.abs(diff.diff))} ${more ? 'mehr' : 'weniger'} als im ${name}${diff.percent === null ? '' : ` (${more ? '+' : '−'}${Math.abs(diff.percent)}\u00a0%)`}`, `trend ${more ? 'up' : 'down'}`));
  } else if (current.count) summary.append(element('small', `Im ${monthName(before)} wurde nichts eingetragen.`));

  renderBudget(current.total);

  const months = recentMonths(rows, spendMonth, 6), top = Math.max(1, ...months.map(entry => entry.total)), chart = $('#spending-chart'); chart.replaceChildren();
  for (const entry of months) {
    const item = element('li'), column = element('button'), track = element('span', undefined, 'track'), bar = element('span', undefined, 'bar');
    column.type = 'button'; column.title = `${monthLabel(entry.month)}: ${euros(entry.total)}`; column.setAttribute('aria-label', column.title);
    if (entry.month === spendMonth) column.setAttribute('aria-current', 'true');
    bar.style.height = `${entry.total ? Math.max(3, Math.round(entry.total / top * 80)) : 2}px`; track.append(bar);
    column.append(element('span', entry.total ? compactEuros(entry.total) : '', 'value'), track, element('span', entry.label));
    column.addEventListener('click', () => { spendMonth = entry.month; renderSpending(); });
    item.append(column); chart.append(item);
  }

  $('#spending-stores-card').hidden = current.byStore.length < 2;
  const groups = $('#spending-stores'); groups.replaceChildren();
  for (const group of current.byStore) {
    const item = element('li', undefined, 'spend-store'), head = element('div', undefined, 'spend-store-head'), share = element('div', undefined, 'spend-share'), fill = element('span');
    head.append(element('strong', group.name), element('span', euros(group.total)));
    fill.style.width = `${Math.max(2, Math.round(group.share * 100))}%`; share.append(fill);
    item.append(head, share, element('small', `${countLabel(group.count, 'Einkauf', 'Einkäufe')} · ${Math.round(group.share * 100)} %`));
    groups.append(item);
  }

  const list = $('#purchase-list'); list.replaceChildren();
  $('#purchase-count').textContent = current.count ? countLabel(current.count, 'Eintrag', 'Einträge') : '';
  if (!current.count) list.append(element('li', 'Noch nichts eingetragen. Tippe oben auf „Einkauf“: Betrag eingeben oder einen Kassenbon lesen lassen.', 'empty'));
  for (const row of current.list) {
    const item = element('li', undefined, 'spend-item'), open = element('button', undefined, 'spend-row'), copy = element('span', undefined, 'spend-copy'), store = storeNameOf(row, stores);
    open.type = 'button'; item.dataset.id = row.id;
    copy.append(element('strong', spendDay(row.date)), element('small', [store || 'Ohne Geschäft', row.note, row.source === 'bon' ? 'vom Kassenbon' : ''].filter(Boolean).join(' · ')));
    const verdict = estimateVerdict(row.cents, row.estimate), amount = element('span', euros(row.cents), 'spend-amount');
    // Kleiner Punkt: bezahlt gegen die geschätzte Summe der abgehakten Artikel (grün: im Rahmen oder günstiger, rot: teurer)
    if (verdict) { const dot = element('span', undefined, `spend-dot ${verdict.level}`); dot.setAttribute('aria-hidden', 'true'); amount.prepend(dot); }
    open.append(copy, amount);
    open.setAttribute('aria-label', `${spendDay(row.date)}, ${store || 'ohne Geschäft'}, ${euros(row.cents)}${verdict ? `, ${estimateWords(row.cents, row.estimate)}` : ''}: ändern`);
    open.addEventListener('click', () => guard(() => openPurchase(row.id)));
    item.append(open); list.append(item);
  }
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
  purchaseEditing = row; purchaseSource = row?.source || 'hand';
  // Neue Einträge: zuletzt benutztes Geschäft, sonst das der Einkaufsansicht.
  const latest = purchaseRows().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  storeOptions(select, row ? row.storeId || '' : latest?.storeId || viewStore()?.id || '', true);
  // Geschäft inzwischen gelöscht: der gemerkte Name bleibt wählbar, damit er beim Ändern nicht verloren geht.
  if (row?.storeId && row.storeName && ![...select.options].some(option => option.value === row.storeId)) { select.add(new Option(`${row.storeName} (gelöscht)`, row.storeId)); select.value = row.storeId; }
  form.elements.id.value = row?.id || '';
  form.elements.amount.value = row ? formatAmount(row.cents) : '';
  form.elements.date.value = row?.date || (spendMonth === monthOf(isoDate()) ? isoDate() : lastDay(spendMonth));
  // Neue Einträge beginnen mit „Wocheneinkauf“ (Vorschläge zum Austauschen erscheinen beim Tippen ins Feld); beim Ändern bleibt die Notiz, wie sie ist.
  form.elements.note.value = row ? row.note || '' : DEFAULT_NOTE; showNotePicks(false);
  $('#purchase-title').textContent = row ? 'Einkauf ändern' : 'Einkauf eintragen';
  $('#purchase-delete').hidden = !row;
  $('#purchase-estimate').hidden = !row?.estimate; $('#purchase-estimate').textContent = row?.estimate ? `Zum Vergleich: ${estimateWords(row.cents, row.estimate)}.` : '';
  $('#purchase-dialog').showModal();
  if (!row) form.elements.amount.focus();
}
// Vorschläge für die Notiz: Der Knopf rechts im Feld klappt eine scrollbare Liste auf; ein Tipp auf einen Eintrag übernimmt ihn und klappt sie wieder zu.
function showNotePicks(open) {
  $('#purchase-note-picks').hidden = !open; $('#purchase-note-toggle').setAttribute('aria-expanded', String(open));
}
function renderNotePicks() {
  const form = $('#purchase-form'), box = $('#purchase-note-picks'), storeId = form.elements.storeId.value;
  const store = active(state.stores).find(entry => entry.id === storeId)?.name || (purchaseEditing?.storeId === storeId ? purchaseEditing.storeName || '' : '');
  box.replaceChildren();
  for (const text of noteSuggestions(purchaseRows(), store)) {
    const pick = element('button', text); pick.type = 'button'; pick.setAttribute('aria-pressed', String(text === form.elements.note.value.trim()));
    pick.addEventListener('click', () => { form.elements.note.value = text; showNotePicks(false); });
    box.append(pick);
  }
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
    const chainStore = storeForChain(parsed.chain, active(state.stores));
    if (chainStore) form.elements.storeId.value = chainStore;
    purchaseStatus(found.how === 'bon' ? `Erkannt: Summe ${euros(found.cents)}. Bitte mit dem Kassenbon vergleichen.` :
      `Keine Summe gefunden. Die erkannten Zeilen ergeben ${euros(found.cents)} (vielleicht fehlen Zeilen). Bitte prüfen und korrigieren.`);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    purchaseStatus(''); message(error.message);
  } finally { purchaseAbort = null; $('#purchase-progress').hidden = true; form.elements.images.value = ''; }
}
function savePurchase() {
  const form = $('#purchase-form'), id = form.elements.id.value, editing = purchaseEditing, storeId = form.elements.storeId.value;
  if (purchaseAbort) throw new Error('Die Texterkennung läuft noch. Bitte kurz warten.');
  const storeName = active(state.stores).find(store => store.id === storeId)?.name || (editing?.storeId === storeId ? editing.storeName || '' : '');
  const fields = purchaseFields({ amount: form.elements.amount.value, date: form.elements.date.value, storeId, storeName, note: form.elements.note.value, source: purchaseSource }, isoDate());
  if (id && !purchaseRows().some(row => row.id === id)) throw new Error('Dieser Eintrag wurde inzwischen gelöscht.');
  // Beim Ändern auch leer gewordene Felder überschreiben (Geschäft entfernt, Notiz gelöscht).
  const op = id ? nextOp('purchases', id, { storeId: '', storeName: '', ...fields }) : nextOp('purchases', uid(), fields);
  spendMonth = monthOf(fields.date);
  $('#purchase-dialog').close();
  commit([op], `${euros(fields.cents)} unter Ausgaben gespeichert${budgetNote(monthTotalWith(spendMonth, fields.cents, editing))}`);
}

/* ---------- Vorrat ---------- */
// Gemerkte Namen (Sammlung `aliases`): bestätigte Schreibweisen („Zwiebel“ → „Zwiebeln“); falsche lassen sich hier entfernen. (Ältere Einträge können auch Text von einem Kassenbon enthalten.)
function renderAliases() {
  const list = $('#alias-list'); list.replaceChildren();
  const rows = active(state.aliases || []).sort((a, b) => a.from.localeCompare(b.from, 'de'));
  $('#alias-count').textContent = rows.length ? ` (${rows.length})` : '';
  if (!rows.length) list.append(element('li', 'Noch nichts gemerkt.', 'empty'));
  for (const row of rows) {
    const entry = element('li'); entry.append(element('span', `${row.from} → ${row.name}`), iconButton('x', `Zuordnung ${row.from} zu ${row.name} entfernen`, () => removeRows('aliases', [row.id])));
    list.append(entry);
  }
}
function renderPantry() {
  const list = $('#pantry-list'); list.replaceChildren();
  const rows = active(state.pantry || []).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  if (!rows.length) list.append(element('li', 'Noch nichts im Vorrat.', 'empty'));
  for (const row of rows) {
    const entry = element('li'); entry.append(element('span', row.name), iconButton('x', `${row.name} aus dem Vorrat entfernen`, () => removeRows('pantry', [row.id])));
    list.append(entry);
  }
  renderPantrySuggestions();
}
// Vorschläge häufiger Vorräte (pantry-suggestions.js) zum Übernehmen: ein Tipp auf einen Namen nimmt ihn in den Vorrat, „Alle übernehmen“ alle noch fehlenden.
// Was schon im Vorrat steht (auch in anderer Groß- und Kleinschreibung), wird nicht mehr angeboten.
function addToPantry(names) {
  const fresh = pantryAdditions(names, pantryKeys(state.pantry));
  if (fresh.length) commit(fresh.map(name => nextOp('pantry', uid(), { name })));
}
function renderPantrySuggestions() {
  const box = $('#pantry-suggestions'); box.replaceChildren();
  const groups = pantrySuggestions(pantryKeys(state.pantry));
  const head = element('div', undefined, 'suggest-head'); head.append(element('h4', 'Vorschläge zum Übernehmen'));
  box.append(head);
  if (!groups.length) { box.append(element('p', 'Alle Vorschläge stehen schon im Vorrat.', 'hint')); return; }
  head.append(button('Alle übernehmen', () => addToPantry(groups.flatMap(group => group.names)), 'secondary small'));
  for (const group of groups) {
    const section = element('div', undefined, 'suggest-group'), chips = element('div', undefined, 'suggest-chips');
    for (const name of group.names) {
      const chip = element('button', undefined, 'chip'); chip.type = 'button'; chip.append(icon('plus'), document.createTextNode(name));
      chip.setAttribute('aria-label', `${name} in den Vorrat übernehmen`);
      chip.addEventListener('click', () => guard(() => addToPantry([name])));
      chips.append(chip);
    }
    section.append(element('span', group.title, 'suggest-title'), chips); box.append(section);
  }
}
$('#pantry-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, name = form.elements.name.value.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Bitte eine Zutat eingeben.');
  if (pantryAdditions([name], pantryKeys(state.pantry)).length) commit([nextOp('pantry', uid(), { name })]);
  form.reset(); form.elements.name.focus();
}); });

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
  const stores = new Set(active(state.stores).map(store => store.id)), groups = new Map();
  for (const item of row.items) {
    const key = item.storeId && stores.has(item.storeId) ? item.storeId : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name: item.name, quantity: item.quantity, unit: item.unit });
  }
  const ops = [], total = { added: 0, counted: 0, skipped: 0 };
  for (const [storeId, rows] of groups) {
    lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
    const result = addToList(rows, storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), itemHistory());
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
  const items = source.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, ...(item.storeId ? { storeId: item.storeId } : {}) }));
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
  if ($('#settings').hidden) return;
  const bytes = sizeOf(state), percent = Math.min(100, Math.round(bytes * 100 / LIMIT_BYTES));
  let result = null; try { result = compact(state); } catch { /* Anzeige ist optional */ }
  $('#storage-bar').value = percent;
  $('#storage-text').textContent = `${kb(bytes)} von ${kb(LIMIT_BYTES)} belegt (${percent} %)`;
  $('#storage-hint').textContent = result?.changed ? `Aufräumbar: ${entries(result.removed)} Einträge, etwa ${kb(result.before - result.after)}.` : 'Nichts zum Aufräumen.';
  $('#clean-photos').hidden = !connected();
}
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
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  await freshSync();
  const note = $('#storage-note'); note.textContent = 'Prüfe Fotos …';
  const response = await timed(`${photosApi()}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders({ Accept: 'application/vnd.github+json' }) });
  if (response.status === 404) { note.textContent = 'Es gibt keine Fotos im Daten-Repository.'; return; }
  if (!response.ok) throw new Error(`GitHub meldet Fehler ${response.status}. Bitte später erneut versuchen.`);
  const used = usedPhotos(), files = (await response.json()).filter(file => file.type === 'file' && /^[A-Za-z0-9-]{8,64}\.jpg$/.test(file.name));
  const orphans = files.filter(file => !used.has(file.name.slice(0, -4)));
  if (!orphans.length) { note.textContent = 'Alle Fotos werden noch verwendet.'; return; }
  const old = [];
  for (const file of orphans) if (await photoIsOld(file)) old.push(file);
  const young = orphans.length - old.length;
  if (!old.length) { note.textContent = `${young} ungenutzte Fotos sind noch neu (unter 24 Stunden) und bleiben vorerst.`; return; }
  const size = old.reduce((sum, file) => sum + (file.size || 0), 0);
  if (!confirm(`${old.length} nicht mehr verwendete Fotos (${kb(size)}) endgültig löschen?${young ? `\n\n${young} neuere bleiben vorerst stehen.` : ''}\n\nNur sinnvoll, wenn beide Geräte gerade abgeglichen sind.`)) { note.textContent = ''; return; }
  // Nach der Rückfrage noch einmal abgleichen: Inzwischen kann ein Rezept auf eines der Fotos verweisen.
  await freshSync();
  const stillUnused = usedPhotos();
  const doomed = old.filter(file => !stillUnused.has(file.name.slice(0, -4)));
  let deleted = 0, freed = 0;
  for (const file of doomed) {
    const result = await timed(`${photosApi()}/${encodeURIComponent(file.name)}`, { method: 'DELETE', headers: githubHeaders({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'Einkauf & Rezepte: ungenutztes Rezeptfoto entfernt', sha: file.sha, branch: config.branch }) });
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
document.querySelectorAll('[data-tab]').forEach(node => node.addEventListener('click', () => tab(node.dataset.tab)));
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => $(`#${node.dataset.close}`).close()));
// Ein Tipp auf den Bereich außerhalb eines Fensters (oben, auf den abgedunkelten Hintergrund) schließt es wie das „×“. Das Drücken und das Loslassen müssen beide außerhalb liegen:
// Wer in einem Feld Text markiert und außerhalb loslässt, schließt nichts. Das Willkommensfenster lässt sich nicht wegtippen (es braucht den Namen).
let outsideDown = null;
const outsideOf = (dialog, event) => { const box = dialog.getBoundingClientRect(); return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom; };
const tapDialog = event => event.target instanceof HTMLDialogElement && event.target.open && event.target.id !== 'welcome' && outsideOf(event.target, event) ? event.target : null;
document.addEventListener('pointerdown', event => { outsideDown = tapDialog(event); }, true);
document.addEventListener('click', event => {
  const dialog = tapDialog(event), started = outsideDown; outsideDown = null;
  if (dialog && dialog === started) dialog.close();
}, true);
// iOS Safari meldet einen Tipp auf ein Element ohne eigenen Klick-Empfänger nicht als Klick: Der leere Empfänger macht den Hintergrund des Fensters „antippbar“.
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', () => {}));
$('#refresh').addEventListener('click', () => guard(() => sync(true)));
// Die Statuszeile oben ist zugleich ein Knopf: verbunden gleicht sie ab, sonst führt sie in die Einstellungen zum Verbinden.
$('#syncline').addEventListener('click', () => guard(() => {
  if (connected() && tokenWarning() === null) return sync(true);
  tab('settings'); $('#connection-details').open = true;   // ohne Verbindung oder bei ablaufendem Token: dorthin, wo man ihn einträgt
}));
$('#reload').addEventListener('click', () => location.reload());
for (const key of ['name', 'unit']) $('#item-form').elements[key].addEventListener('blur', rememberPriceInForm);
for (const event of ['input', 'focus']) $('#item-form').elements.name.addEventListener(event, renderItemSuggestions);
$('#item-form').elements.name.addEventListener('input', renderQuickPick);
for (const event of ['focusin', 'focusout', 'input', 'toggle']) $('#item-form').addEventListener(event, () => setTimeout(syncForm, 0), true);
$('#item-form').elements.name.addEventListener('input', () => categoryHint($('#item-form').elements.category, $('#item-form').elements.name.value));
$('#item-form').elements.name.addEventListener('keydown', event => {
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
for (const key of ['priceEuros', 'priceQuantity', 'priceUnit', 'saleEuros', 'saleQuantity', 'saleUnit']) $('#item-form').elements[key].addEventListener('input', () => { $('#item-form').dataset.manualPrice = 'yes'; });
for (const form of [$('#item-form'), $('#edit-item-form')]) form.elements.onSale.addEventListener('change', () => toggleSaleFields(form));
$('#set-offers').addEventListener('click', () => openStoresDialog(view));   // das Geschäft, dessen Link fehlt, ist gleich aufgeklappt
// Zutaten auf die Liste setzen: Gleiche Artikel werden zusammengezählt (siehe data.js).
// `unchecked`: Namen der abgewählten Zutaten; mit `remember` kommen sie in den Vorrat.
function addRows(rows, storeId, unchecked = [], remember = false) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  const result = addToList(rows, storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), itemHistory());
  const stocked = remember ? pantryAdditions(unchecked, pantryKeys(state.pantry)) : [];
  if (!result.ops.length && !stocked.length) throw new Error('Alles davon steht schon auf der Liste.');
  const pantryOps = stocked.map(name => nextOp('pantry', uid(), { name }));
  const parts = [result.added && `${result.added} neu`, result.counted.length && `${result.counted.length} dazugezählt`, result.skipped && `${result.skipped} schon vorhanden`,
    stocked.length && `${stocked.length} in den Vorrat`].filter(Boolean);
  commit([...result.ops, ...pantryOps], `Übernommen: ${parts.join(', ')}`);
}
// Das „+“ im Namensfeld: Ein Tipp darauf fügt hinzu und schließt die Tastatur. Mit der Eingabetaste der Tastatur bleibt sie offen, für den nächsten Artikel.
let plusTapped = 0;
$('#item-form .add-button').addEventListener('pointerdown', () => { plusTapped = Date.now(); });
$('#item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, closeKeyboard = Date.now() - plusTapped < 1500, typed = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  plusTapped = 0;
  if (!typed || !unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const known = active(state.aliases || []).find(alias => alias.from === aliasKey(typed)), name = known?.name || typed;
  const category = form.elements.category.value || suggestCategory(name, itemHistory());
  const item = { storeId: currentStore(form.elements.storeId.value), name, quantity: positive(form.elements.quantity.value),
    unit, checked: false, createdBy: config.actor || 'Unbekannt', ...(category ? { category } : {}), ...readPricing(form) };
  if (!item.saleUntil) delete item.saleUntil;
  // Steht derselbe Artikel schon offen auf der Liste (gleiches Geschäft, passende Einheit), wird die Menge erhöht. Wer einen Preis eingibt, will einen eigenen Eintrag.
  const same = form.dataset.manualPrice === 'yes' ? null : foldIntoList([{ name, quantity: item.quantity, unit }], item.storeId, state.items).counted[0];
  const renamed = known && productKey(known.name) !== productKey(typed) ? `„${typed}“ → „${known.name}“` : '';
  if (same) {
    commit([nextOp('items', same.id, { add: same.add })], `${renamed ? `${renamed}: ` : ''}„${same.name}“: jetzt ${format(same.after.quantity)} ${same.after.unit}`);
  } else {
    const id = uid(), ops = [nextOp('items', id, item)];
    // Erscheint der neue Artikel nicht in der gerade gewählten Ansicht (anderes oder kein Geschäft), sagt die App, wo er steht.
    commit(ops, inView(item) ? renamed : `${renamed ? `${renamed}; ` : ''}„${name}“ steht bei „${storeName(item.storeId)}“`);
  }
  // Das gewählte Geschäft bleibt stehen: Man trägt meist mehrere Artikel nacheinander für denselben Laden ein.
  const kept = form.elements.storeId.value;
  form.reset(); form.elements.storeId.value = kept; renderStorePick(); delete form.dataset.manualPrice; rememberPriceInForm(); $('#item-suggestions').hidden = true; renderQuickPick();
  if (closeKeyboard) document.activeElement?.blur?.(); else form.elements.name.focus();
}); });
$('#delete-item').addEventListener('click', () => guard(() => {
  const id = $('#edit-item-form').elements.id.value;
  if (!active(state.items).some(row => row.id === id)) { $('#item-dialog').close(); return; }
  removeRows('items', [id]); $('#item-dialog').close();
}));
// Zeile lange halten und über den Bildschirm auf ein Geschäft ziehen: oben erscheint eine Leiste mit allen Geschäften (und „Ohne Geschäft“); außerdem zählt jeder
// sichtbare Abschnitt der Gesamtliste unter „Planen“ als Ziel. Beim Loslassen über einem Ziel landet der Artikel dort (siehe moveItem).
const moveBar = {
  show(id) {
    const item = state.items.find(row => row.id === id && !row.deletedAt), bar = $('#move-bar');
    if (!item) return 0;
    bar.replaceChildren();
    const add = (storeId, label) => {
      const target = element('div', undefined, `move-target${(item.storeId || '') === storeId ? ' current' : ''}`); target.dataset.store = storeId; target.append(label); bar.append(target);
    };
    add('', document.createTextNode('Ohne Geschäft'));
    for (const store of active(state.stores)) add(store.id, storeLabel(store.name));
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
    return key === null || key === own ? null : key;
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
dragDelete($('#items'), $('#trash-zone'), id => guard(() => {
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item) return;
  removeRows('items', [id]); showNotice(`„${item.name}“ gelöscht`);
}), '.item[data-id]', { onHold: id => guard(() => openMove(id)), hint: $('#drag-hint'), target: moveBar, disabled: () => selecting });
// Lange halten und loslassen, ohne zu ziehen: „Verschieben nach …“ (ein anderes Geschäft oder kein Geschäft). Steht dort derselbe Artikel schon offen, werden die Mengen zusammengezählt.
function openMove(id) {
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item) return;
  $('#move-dialog').dataset.id = id;
  $('#move-text').textContent = `„${item.name}“ (${format(item.quantity)} ${item.unit}) steht ${item.storeId ? `bei ${storeName(item.storeId)}` : 'ohne Geschäft'}. Wohin soll er?`;
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
  const rows = selectedItems(); if (!rows.length) return;
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
function moveSelected(storeId) {
  const target = currentStore(storeId), label = target ? storeName(target) : 'ohne Geschäft', rows = selectedItems(), ops = [];
  let items = state.items, merged = 0, moved = 0;
  const stamp = new Date().toISOString();
  for (const item of rows) {
    if ((item.storeId || '') === target) continue;
    // Wie beim einzelnen Verschieben: Ein offener Artikel ohne eigenen Preis wird zu einem gleichen Artikel im Ziel dazugezählt; sonst wechselt nur das Geschäft.
    const same = !item.checked && (item.price === undefined || item.price === null) ? foldIntoList([{ name: item.name, quantity: item.quantity, unit: item.unit }], target, items).counted[0] : null;
    if (same) {
      ops.push(nextOp('items', same.id, { add: same.add }), ...deleteOps('items', [item.id])); merged++;
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
  for (const store of active(state.stores)) choice(store.id, storeLabel(store.name), store.name);
  message(); $('#move-dialog').showModal();
}
function moveItem(id, storeId) {
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const target = currentStore(storeId);
  if ((item.storeId || '') === target) { $('#move-dialog').close(); return; }
  const label = target ? storeName(target) : 'ohne Geschäft';
  // Ein offener Artikel ohne eigenen Preis wird zu einem gleichen Artikel im Ziel dazugezählt (wie beim Hinzufügen); sonst wechselt nur das Geschäft.
  const same = !item.checked && (item.price === undefined || item.price === null) ? foldIntoList([{ name: item.name, quantity: item.quantity, unit: item.unit }], target, state.items).counted[0] : null;
  if (same) commit([nextOp('items', same.id, { add: same.add }), ...deleteOps('items', [id])], `„${item.name}“ → ${label}: jetzt ${format(same.after.quantity)} ${same.after.unit}`);
  else commit([nextOp('items', id, { storeId: target })], `„${item.name}“ → ${label}`);
  $('#move-dialog').close();
}
$('#edit-item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = state.items.find(row => row.id === form.elements.id.value && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const patch = { name: form.elements.name.value.trim(), quantity: positive(form.elements.quantity.value), unit: form.elements.unit.value.trim(),
    category: form.elements.category.value || null, storeId: currentStore(form.elements.storeId.value), ...readPricing(form) };
  if (!patch.name || !patch.unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const delta = changed(patch, itemBaseline);
  const ops = Object.keys(delta).length ? [nextOp('items', item.id, delta)] : [];
  commit(ops); $('#item-dialog').close();
}); });
$('#clear-checked').addEventListener('click', () => guard(() => removeRows('items', visibleItems(true).filter(row => inView(row) && row.checked).map(row => row.id))));
$('#select-mode').addEventListener('click', () => guard(() => setSelecting(!selecting)));
window.addEventListener('resize', () => { if (selecting) renderSelectBar(); });
$('#select-done').addEventListener('click', () => guard(() => setSelecting(false)));
$('#select-all').addEventListener('click', () => guard(() => {
  const all = visibleItems(true).filter(inView), everything = all.length && selectedItems().length === all.length;
  selected.clear(); if (!everything) all.forEach(row => selected.add(row.id));
  renderItems();
}));
$('#select-move').addEventListener('click', () => guard(openMoveSelected));
$('#select-delete').addEventListener('click', () => guard(() => {
  const rows = selectedItems(); if (!rows.length) return;
  if (!confirm(`${rows.length} Artikel löschen?`)) return;
  removeRows('items', rows.map(row => row.id)); selected.clear(); renderItems(); showNotice(`${rows.length} Artikel gelöscht`);
}));
$('#manage-stores').addEventListener('click', () => openStoresDialog());
$('#store-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const name = event.currentTarget.elements.name.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
  if (active(state.stores).some(store => store.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) throw new Error('Dieses Geschäft gibt es bereits.');
  const id = uid();
  commit([nextOp('stores', id, { name, offersUrl: offerUrl(event.currentTarget.elements.offersUrl.value) })]); event.currentTarget.reset(); storeFresh = id; renderStores();
}); });
$('#recipe-search').addEventListener('input', renderRecipes);
$('#add-recipe').addEventListener('click', () => guard(() => editRecipe()));
$('#import-recipe').addEventListener('click', () => guard(() => openImport()));
$('#add-ingredient').addEventListener('click', () => ingredientRow());
$('#recipe-form').addEventListener('submit', saveRecipe);
$('#recipe-form').addEventListener('input', scheduleRecipeDraft);
$('#recipe-form').addEventListener('click', scheduleRecipeDraft);   // Zutat hinzufügen oder entfernen
$('#recipe-dialog').addEventListener('close', () => { saveRecipeDraft(); recipeDraftKey = null; });   // Schließen mit X oder Esc behält den Entwurf; nach dem Speichern ist er schon weg
document.querySelectorAll('#import-form [data-source]').forEach(node => node.addEventListener('click', () => setImportSource(node.dataset.source)));
$('#import-form').elements.publicProxy.addEventListener('change', linkHint);
$('#import-form').elements.images.addEventListener('change', event => showPreviews([...event.target.files]));
$('#import-form').addEventListener('submit', event => { event.preventDefault(); guard(runImport); });
$('#import-dialog').addEventListener('close', () => { importAbort?.abort(); releasePreviews(); importStatus(''); });
$('#week-prev').addEventListener('click', () => { planWeek = addDays(planWeek, -7); renderPlan(); });
$('#week-next').addEventListener('click', () => { planWeek = addDays(planWeek, 7); renderPlan(); });
$('#week-today').addEventListener('click', () => { planWeek = weekStart(isoDate()); renderPlan(); });
$('#plan-shopping').addEventListener('click', () => guard(openWeekShopping));
$('#meal-form').addEventListener('submit', saveMeal);
$('#week-form').elements.skipDone.addEventListener('change', renderWeekRows);
$('#week-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, selected = [...$('#week-ingredients').children].filter(label => label._row && label.querySelector('input').checked).map(label => label._row);
  if (!selected.length) throw new Error('Bitte mindestens eine Zutat auswählen.');
  const storeId = currentStore(form.elements.storeId.value);
  addRows(selected.map(row => listRow(row)), storeId, [...$('#week-ingredients').children].filter(label => label._row && !label.querySelector('input').checked).map(label => label._row.name), form.elements.rememberPantry.checked);
  view = 'all'; $('#week-dialog').close(); render(); tab('shopping');
}); });
$('#recipe-form').elements.photo.addEventListener('change', event => guard(async () => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  const blob = await resizePhoto(file);
  pendingPhoto = { id: uid(), blob }; photoRemoved = false;
  showPhotoPreview(URL.createObjectURL(blob));
}));
$('#photo-remove').addEventListener('click', () => { pendingPhoto = null; photoRemoved = true; showPhotoPreview(''); });
$('#recipe-dialog').addEventListener('close', () => { pendingPhoto = null; showPhotoPreview(''); });
$('#transfer-form').elements.servings.addEventListener('change', () => guard(updateTransfer));
// Während des Tippens still mitrechnen; bei unfertiger Eingabe („2,“) bleibt die Anzeige einfach stehen.
$('#transfer-form').elements.servings.addEventListener('input', () => { try { updateTransfer(); } catch { /* Eingabe noch unvollständig */ } });
$('#transfer-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, selected = [...$('#transfer-ingredients').children]
    .filter(label => label.querySelector('input').checked).map(label => label._ingredient);
  if (!active(state.recipes).some(row => row.id === transferRecipe.id)) throw new Error('Das Rezept wurde inzwischen gelöscht.');
  if (!selected.length) throw new Error('Bitte mindestens eine Zutat auswählen.');
  const factor = positive(form.elements.servings.value) / transferRecipe.servings;
  addRows(selected.map(row => listRow(row, factor)), currentStore(form.elements.storeId.value),
    [...$('#transfer-ingredients').children].filter(label => !label.querySelector('input').checked).map(label => label._ingredient.name), form.elements.rememberPantry.checked);
  view = 'all'; $('#transfer-dialog').close(); render(); tab('shopping');
}); });
$('#settings-form').addEventListener('submit', event => { event.preventDefault(); guard(async () => {
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  const form = event.currentTarget, next = { ...config };
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token']) next[key] = form.elements[key].value.trim();
  next.tokenExpires = form.elements.tokenExpires.value;
  if (next.token !== config.token && next.tokenExpires === (config.tokenExpires || '')) next.tokenExpires = '';   // neuer Token: das alte Datum gilt nicht mehr
  if (!/^[A-Za-z0-9-]+$/.test(next.owner) || !/^[A-Za-z0-9_.-]+$/.test(next.repo) ||
      !next.branch || !next.path.endsWith('.json') || next.path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Bitte Benutzername, Repository, Branch und einen relativen JSON-Dateinamen prüfen (keine vollständige URL).');
  if (!sameTarget(config, next) && pending.length) throw new Error('Vor einem Repository-Wechsel bitte die ausstehenden Änderungen synchronisieren. Du kannst dafür den Token des bisherigen Repositorys ersetzen.');
  delete next.savedAt;
  saveConfig(next); retryAt = 0; message(); await loadWorkspace();
  // „Gespeichert am …“ erst, wenn die Verbindung klappt; sonst bleibt der Knopf für einen neuen Versuch aktiv.
  connectFailed = $('#status').dataset.state === 'error';
  if (!connectFailed) saveConfig({ ...config, savedAt: new Date().toISOString() });
  updateSaveButtons();
}); });
$('#import-settings-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, text = form.elements.importProxy.value.trim(), proxy = workerHost(text);
  if (text && !proxy) throw new Error('Bitte die Adresse deines Cloudflare-Workers eingeben. Sie beginnt mit https:// und endet auf .workers.dev.');
  const dailyText = form.elements.dailySource.value.trim(), dailyLink = webUrl(dailyText);
  if (dailyText && !dailyLink) throw new Error('Bitte bei „Rezepte des Tages“ einen vollständigen Link mit https:// eingeben oder das Feld leeren.');
  saveConfig({ ...config, importProxy: proxy, publicProxy: form.elements.publicProxy.checked, dailySource: dailyLink, importSavedAt: new Date().toISOString() });
  form.elements.dailySource.value = dailyLink; renderDailyButton();
  form.elements.importProxy.value = proxy; updateSaveButtons(); message(); status('Import-Einstellungen gespeichert', 'ok'); setTimeout(restingStatus, 2500);
}); });
$('#test-proxy').addEventListener('click', () => guard(async () => {
  const proxy = workerHost($('#import-settings-form').elements.importProxy.value);
  if (!proxy) throw new Error('Bitte zuerst die Adresse deines Hilfsdienstes eintragen (https://…workers.dev).');
  saveConfig({ ...config, importProxy: proxy, importSavedAt: new Date().toISOString() }); updateSaveButtons();
  try { await fetchRecipePage('https://example.com/', { workerUrl: proxy, allowPublic: false }); }
  catch (error) { throw new Error(`Der Hilfsdienst antwortet nicht wie erwartet. ${error.message}`); }
  message(); status('Hilfsdienst funktioniert', 'ok'); setTimeout(restingStatus, 2500);
}));
$('#disconnect').addEventListener('click', () => guard(async () => {
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  if (!confirm('Token auf diesem Gerät entfernen? Lokale Repository-Daten und ausstehende Änderungen bleiben für eine spätere erneute Verbindung gespeichert.')) return;
  const { owner, repo, branch, path, token, tokenExpires, savedAt, ...kept } = config;   // alles andere (Name, Darstellung, Hilfsdienst …) bleibt auf diesem Gerät
  saveConfig(kept);
  fillSettings(); message(); await loadWorkspace();
}));
$('#group-items').addEventListener('change', () => guard(() => { saveConfig({ ...config, groupItems: $('#group-items').checked }); renderItems(); }));
// Gilt sofort, ohne Neuladen: Aus = keine Kacheln, die Zeile sieht aus wie früher.
$('#product-images').addEventListener('change', () => guard(() => { saveConfig({ ...config, productImages: $('#product-images').checked }); renderItems(); }));
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
holdToConfirm($('#shop-finish'), HOLD_FINISH_MS, () => { if (!isLocked()) openFinish(); }, 'Zum Beenden gedrückt halten');
$('#finish-only').addEventListener('click', () => guard(() => finishShopping()));
// Das „+“ im Feld „Was hast du bezahlt?“: beendet den Einkauf und speichert den Betrag; die Tastatur schließt sich (auch bei einem Fehler, damit die Meldung sichtbar bleibt).
let finishPlus = 0;
$('#finish-form .add-button').addEventListener('pointerdown', () => { finishPlus = Date.now(); });
$('#finish-form').addEventListener('submit', event => {
  event.preventDefault();
  if (Date.now() - finishPlus < 1500) document.activeElement?.blur?.();
  finishPlus = 0;
  guard(() => {
    const amount = event.currentTarget.elements.amount.value;
    if (!amount.trim()) throw new Error('Bitte einen Betrag eingeben oder „Nur beenden“ wählen.');
    finishShopping(amount);
  });
});
$('#add-purchase').addEventListener('click', () => guard(() => openPurchase()));
$('#spending-first').addEventListener('click', () => guard(() => openPurchase()));
$('#budget-form').addEventListener('submit', event => { event.preventDefault(); guard(saveBudget); });
$('#budget-remove').addEventListener('click', () => guard(() => { $('#budget-dialog').close(); commit([nextOp('budgets', 'monthly', { cents: 0 })], 'Monatsbudget entfernt'); }));
$('#month-prev').addEventListener('click', () => { spendMonth = shiftMonth(spendMonth, -1); renderSpending(); });
$('#month-next').addEventListener('click', () => { spendMonth = shiftMonth(spendMonth, 1); renderSpending(); });
$('#month-today').addEventListener('click', () => { spendMonth = monthOf(isoDate()); renderSpending(); });
// Das „+“ im Betragsfeld: Ein Tipp darauf fügt den Einkauf hinzu und schließt die Tastatur (auch wenn etwas fehlt, damit die Meldung nicht verdeckt wird).
let purchasePlus = 0;
$('#purchase-plus').addEventListener('pointerdown', () => { purchasePlus = Date.now(); });
$('#purchase-form').addEventListener('submit', event => {
  event.preventDefault();
  if (Date.now() - purchasePlus < 1500) document.activeElement?.blur?.();
  purchasePlus = 0; guard(savePurchase);
});
{
  const note = $('#purchase-form').elements.note, box = $('#purchase-note-picks');
  $('#purchase-note-toggle').addEventListener('click', () => {
    if (!box.hidden) { showNotePicks(false); return; }
    note.blur();   // die Tastatur würde die Liste verdecken
    renderNotePicks(); showNotePicks(true);
    box.querySelector('[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' });
  });
  // Wer ins Feld tippt, will schreiben: Die Liste klappt zu, der Text ist ausgewählt (Tippen ersetzt ihn).
  note.addEventListener('focus', () => { showNotePicks(false); setTimeout(() => { if (document.activeElement === note) note.select(); }, 0); });
  $('#purchase-form').elements.storeId.addEventListener('change', () => { if (!box.hidden) renderNotePicks(); });
}
// Einträge wie Artikel löschen: Zeile lange halten und nach rechts in den roten Mülleimer schieben (statt nachträglich zu bearbeiten).
dragDelete($('#purchase-list'), $('#trash-zone'), id => guard(() => {
  const row = purchaseRows().find(entry => entry.id === id);
  if (!row) return;
  removeRows('purchases', [id]); showNotice(`${euros(row.cents)} gelöscht`);
}), '.spend-item[data-id]');
$('#purchase-form').elements.amount.addEventListener('input', () => { purchaseSource = 'hand'; });
$('#purchase-form').elements.images.addEventListener('change', event => guard(() => readPurchasePhoto([...event.target.files])));
$('#purchase-delete').addEventListener('click', () => guard(() => {
  const id = $('#purchase-form').elements.id.value;
  if (id) removeRows('purchases', [id]);
  $('#purchase-dialog').close();
}));
$('#purchase-dialog').addEventListener('close', () => purchaseAbort?.abort());
$('#compact-now').addEventListener('click', () => guard(compactNow));
$('#clean-photos').addEventListener('click', () => guard(cleanPhotos));
$('#welcome').addEventListener('cancel', event => event.preventDefault());
$('#welcome-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const actor = event.currentTarget.elements.actor.value.trim(); if (!actor) throw new Error('Bitte einen Namen eingeben.');
  saveConfig({ ...config, actor }); fillSettings(); render(); $('#welcome').close();
  if (deferredImport) { const link = deferredImport; deferredImport = null; openImport({ url: link }); }
  if (deferredAdd) { const pending = deferredAdd; deferredAdd = null; guard(() => addFromLink(pending)); }
}); });

// Link aus dem Teilen-Dialog oder aus einem iOS-Kurzbefehl: …/?import=https://…
// …/?add=Milch, Eier und Butter&store=Lidl (z. B. aus einem iPhone-Kurzbefehl mit Siri): legt die Artikel an. Die Adresse wird danach bereinigt.
function incomingAdd() {
  const params = new URLSearchParams(location.search), text = params.get('add');
  if (text === null) return null;
  history.replaceState(null, '', location.pathname);
  return text.trim() ? { text: text.slice(0, 2000), store: (params.get('store') || '').slice(0, 80) } : null;
}
function addFromLink({ text, store }) {
  const aliases = active(state.aliases || []);
  const rows = text.split(/[\n;]+|,(?!\d)|\s+und\s+/i).map(part => part.trim()).filter(Boolean).slice(0, 30).map(part => parseIngredientLine(part)).filter(Boolean)
    .map(row => ({ name: aliases.find(alias => alias.from === aliasKey(row.name))?.name || row.name, quantity: row.unit === NO_AMOUNT ? 1 : row.quantity, unit: row.unit === NO_AMOUNT ? 'Stück' : row.unit }));
  if (!rows.length) throw new Error('Im Link stand nichts zum Hinzufügen.');
  const wanted = productKey(store), match = wanted ? active(state.stores).find(row => productKey(row.name).includes(wanted)) : null;
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  const result = addToList(rows, match?.id || '', config.actor || 'Unbekannt', new Date(lastTime).toISOString(), itemHistory());
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
    config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    if (freshStart() && (config.shopMode === true || config.shopLocked === true)) saveConfig({ ...config, shopMode: false, shopLocked: false });
    fillSettings();
    const adding = incomingAdd(), incoming = incomingLink();
    await loadWorkspace();
    prunePhotos(usedPhotos()).catch(() => {});
    if (!config.actor) { deferredImport = incoming; deferredAdd = adding; $('#welcome').showModal(); }
    else {
      if (adding && ready) guard(() => addFromLink(adding));
      if (incoming && ready) { tab('recipes'); guard(() => openImport({ url: incoming })); }
    }
    setInterval(() => { if (!document.hidden) void sync(); }, 8000);
    window.addEventListener('online', () => void sync(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
    if ('serviceWorker' in navigator) {
      // Neue App-Version: Hinweis statt stillem Wechsel mitten in einer Eingabe.
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) $('#update-banner').hidden = false; });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
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
