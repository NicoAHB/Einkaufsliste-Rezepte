import { active, addToList, clone, duplicateFolds, emptyData, foldIntoList, frequentItems, inPantry, listRow, merge, operation, pantryAdditions, pantryKeys, positive, spellingVariants, suggestItemNames, uid, validDay, validate } from './data.js';
import { activeTrend, comparePrices, defaultOfferUrl, effectiveQuote, itemCost, itemQuote, localDay, offerUrl, parseCents, productKey, rememberedPrice, saleExpired, shoppingTotal, storeOfferUrl, trendFor, unitRate, unitSpec } from './prices.js';
import { splitSteps } from './cook.js';
import { shopCount, shopView, takesAnywhere } from './shop.js';
import { brandOf } from './brand.js';
import { BUILTIN_SOURCE, DAILY_MAX, builtinKey, draftFromBuiltin, extractRecipeLinks, planBuiltin, planDay, recipeKey, validBuiltin } from './daily.js';
import { dragDelete } from './dragdelete.js';
import { currentIds, newFromOthers } from './news.js';
import { aliasKey, parseReceipt, storeForChain, suggestName } from './receipt.js';
import { NO_AMOUNT, firstUrl, hostLabel, htmlToText, ingredientLabel, parseIngredientLine, parseRecipeText, recipeFromAnyText, recipeFromHtml, webUrl } from './recipe-import.js';
import { PUBLIC_PROXIES, fetchRecipePage, workerHost } from './page-source.js';
import { CATEGORIES, categoryLabel, groupByCategory, isCategory, suggestCategory } from './categories.js';
import { addDays, aggregateIngredients, dayMonthLabel, dayName, isoDate, relativeDay, weekDays, weekLabel, weekStart } from './plan.js';
import { isJpeg, localPhotoUrl, photoPath, photosDir, prunePhotos, queued, queuePhoto, readPhoto, resizePhoto, storePhoto, toBase64, unqueuePhoto } from './photos.js';
import { LIMIT_BYTES, POLICY, compact, due, sizeOf } from './compact.js';

const $ = selector => document.querySelector(selector);
const CONFIG_KEY = 'einkauf-settings-v1';
let config = {}, base = emptyData(), pending = [], state = emptyData();
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
// Kurzer Hinweis ohne Knopf; verschwindet von selbst.
function showNotice(text) {
  $('#notice-text').textContent = text; $('#notice').hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 4000);
}
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
  for (const id of ['shopping', 'recipes', 'plan', 'settings']) $(`#${id}`).hidden = name !== id;
  document.querySelectorAll('[data-tab]').forEach(node => {
    if (node.dataset.tab === name) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (name === 'settings') renderStorage();
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
const visibleItems = () => {
  const live = new Set(active(state.stores).map(store => store.id));
  return active(state.items).filter(item => !item.storeId || live.has(item.storeId));
};
const inView = item => view === 'all' || (view === 'none' ? !item.storeId : item.storeId === view);
const viewStore = () => active(state.stores).find(store => store.id === view);
const storeName = id => active(state.stores).find(store => store.id === id)?.name || 'Ohne Geschäft';
// Welches Geschäft ein neuer Artikel bekommt: das der gewählten Ansicht, sonst keines.
const defaultStore = () => viewStore()?.id || '';
function showView(next) {
  view = next;
  const form = $('#item-form');
  // Wer ein einzelnes Geschäft ansieht, legt neue Artikel meist dort an (sonst verschwänden sie aus der Liste).
  // In „Alle“ bleibt die letzte Auswahl stehen; „Ohne Geschäft“ wählt keines.
  if (viewStore()) form.elements.storeId.value = view; else if (view === 'none') form.elements.storeId.value = '';
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
  renderStoreChips(); renderItems(); renderRecipes(); renderPlan(); renderPantry(); renderStorage(); applyMode(); syncForm();
  if ($('#template-dialog').open) renderTemplates();
  renderDailyButton();
  form.querySelector('button[type=submit]').disabled = !ready;
  $('#add-recipe').disabled = !ready;
  $('#import-recipe').disabled = !ready;
  $('#manage-stores').disabled = !ready;
}
function renderStoreChips() {
  const box = $('#store-chips'); box.replaceChildren();
  const items = visibleItems(), open = id => items.filter(item => !item.checked && (id === 'all' || (id === 'none' ? !item.storeId : item.storeId === id))).length;
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
  row.append(copy, actions);
  return row;
}
function groupHead(label, count) {
  const row = element('li', undefined, 'group-head');
  row.append(element('span', label), element('span', String(count), 'count'));
  return row;
}
// Name eines Geschäfts: als Text oder (Einstellung „Geschäfte anzeigen als“) als Schriftzug in den Farben der Kette; unbekannte Geschäfte bleiben Text.
function storeLabel(name) {
  const key = config.storeStyle === 'logo' ? brandOf(name) : '';
  return key ? element('span', name, `brand brand-${key}`) : document.createTextNode(name);
}
function storeHead(label, count, none) {
  const row = element('li', undefined, `store-head${none ? ' none' : ''}`), name = element('span');
  name.append(none ? document.createTextNode(label) : storeLabel(label));
  row.append(icon('store'), name, element('span', String(count), 'count'));
  return row;
}
function itemRow(item, withStore = false) {
  const row = element('li', undefined, `item${item.checked ? ' checked' : ''}`); row.dataset.id = item.id;
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
  copy.append(element('strong', item.name), element('small', `${format(item.quantity)} ${item.unit} · ${item.createdBy || 'Unbekannt'}${withStore ? ` · ${storeName(item.storeId)}` : ''}`));
  const expired = saleExpired(item);
  if (item.onSale) copy.append(element('span', expired ? `Angebot abgelaufen (${dayLabel(item.saleUntil)})` : item.saleUntil ? `Im Angebot bis ${dayLabel(item.saleUntil)}` : 'Im Angebot', `sale-badge${expired ? ' expired' : ''}`));
  if (item.onSale && item.salePrice) {
    copy.append(element('small', expired ? `Angebot war ${quoteLabel(item.salePrice)}. Es gilt der normale Preis.` : `Angebot: ${quoteLabel(item.salePrice)}`, 'price-note'));
    const normal = itemQuote(item, state.prices);
    if (normal) copy.append(element('small', `Normal: ${quoteLabel(normal)}`));
  }
  const cost = itemCost(item, state.prices);
  if (cost !== null) copy.append(element('small', `Geschätzt: ${euros(cost)}`, 'price-note'));
  const trend = activeTrend(item, state.prices);
  if (trend) copy.append(element('small', trendLabel(trend), `trend ${trend.direction}`));
  const quotes = comparePrices(item, state.stores, state.prices);
  if (quotes.length) {
    const best = quotes[0], stores = quotes.filter(row => Math.abs(row.rate - best.rate) < 0.000001).map(row => row.storeName).join(', ');
    // Eine kurze Zeile; die ausführliche Fassung („zuletzt eingetragen am …“ je Geschäft) steht im Preisvergleich des Bearbeiten-Dialogs.
    copy.append(element('small', `${quotes.length === 1 ? 'Preis' : 'Am günstigsten'}: ${stores} ${euros(best.rate)}/${best.unit} · ${shortDate(best.at)}${best.old ? ' (alt)' : ''}`, 'price-note'));
  }
  row.append(check, copy);
  return row;
}
function renderItems() {
  renderShoppingInfo();
  const list = $('#items'); list.replaceChildren();
  const rows = visibleItems().filter(inView);
  ensureSeen();
  const news = seen ? newFromOthers(rows, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  const open = rows.filter(item => !item.checked && !newIds.has(item.id)), done = rows.filter(item => item.checked).sort(byName);
  $('#item-count').textContent = `${open.length + news.length} offen · ${done.length} erledigt`;
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
  const addOpen = (items, nested) => {
    if (!grouped) { items.sort(byName).forEach(item => list.append(itemRow(item))); return; }
    for (const group of groupByCategory(items, itemHistory())) {
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
      list.append(storeHead(section.label, items.length, !section.id)); addOpen(items, true);
    }
  } else addOpen(open, false);
  if (done.length) {
    if (grouped || view === 'all') list.append(groupHead('Erledigt', done.length));
    done.forEach(item => list.append(itemRow(item, view === 'all')));
  }
  if (document.activeElement === $('#item-form').elements.name) renderItemSuggestions();
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
  const names = suggestItemNames(history, typed).filter(name => !variants.includes(name));
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
    box.append(element('span', 'Vorschläge aus euren Artikeln', 'hint'));
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
  const total = shoppingTotal(visibleItems().filter(inView), state.prices);
  const box = $('#shopping-total'); box.replaceChildren();
  // Eine Zeile, die Geschäftsauswahl darüber sagt schon, wofür die Summe gilt.
  if (!total.count) box.append(element('strong', 'Alles erledigt'));
  else if (!total.priced) box.append(element('small', 'Noch keine Preise notiert'));
  else {
    box.append(element('strong', `Geschätzt ${euros(total.cents)}`));
    if (total.missing) box.append(element('small', `${total.missing} ohne Preis, nicht eingerechnet`));
  }
}
const perLabel = quote => quote.quantity === 1 ? `je ${quote.unit}` : `je ${format(quote.quantity)} ${quote.unit}`;
// „▲ Teurer: 1,29 € → 1,39 € je Stück (+8 %)“: Pfeil und Wort, nicht nur die Farbe.
function trendLabel(trend) {
  const percent = `${trend.percent > 0 ? '+' : '−'}${format(Math.round(Math.abs(trend.percent)))} %`;
  return `${trend.direction === 'up' ? '▲ Teurer' : '▼ Günstiger'}: ${euros(trend.before)} → ${euros(trend.now.cents)} ${perLabel(trend.now)} (${percent}) seit ${shortDate(trend.since)}`;
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
  const name = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  const store = form.elements.storeId.value, quote = store ? rememberedPrice(state.prices, store, name, unit) : null;
  setQuoteFields(form, quote, unit);
  setSaleFields(form);
  form.querySelector('[data-price-hint]').textContent = quote ? `Für dieses Geschäft gemerkt: ${quoteLabel(quote)}. Du kannst den Vorschlag ändern oder leeren.` :
    store ? 'Beispiel: 1,99 € für 500 g. Ein gemerkter Preis dieses Geschäfts wird beim Eingeben vorgeschlagen.' :
    'Beispiel: 1,99 € für 500 g. Gemerkte Preise gibt es erst, wenn ein Geschäft gewählt ist.';
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
function priceOperation(item) {
  // Jeder notierte Preis ist ein eigener Datensatz: gleichzeitige Einträge
  // verschiedener Geräte bleiben erhalten, der neueste passende wird verwendet.
  const sale = Boolean(item.onSale) && !saleExpired(item);
  const row = { storeId: item.storeId, name: item.name,
    quote: clone(effectiveQuote(item, state.prices)), regularQuote: clone(itemQuote(item, state.prices) || null), onSale: sale, ...(sale && item.saleUntil ? { saleUntil: item.saleUntil } : {}) };
  const trend = trendFor(state.prices, row);
  return nextOp('prices', uid(), trend ? { ...row, trend } : row);
}
function showComparison(item) {
  const box = $('#price-comparison'); box.replaceChildren();
  const rows = comparePrices(item, state.stores, state.prices);
  if (!unitSpec(item.unit).comparable) {
    box.append(element('p', 'Für einen fairen Geschäftsvergleich bitte g/kg, ml/l oder Stück verwenden. Bei Packungen ist die Größe unbekannt.', 'hint')); return;
  }
  if (!rows.length) { box.append(element('p', 'Noch keine vergleichbaren Preise für diesen Artikelnamen notiert.', 'hint')); return; }
  box.append(element('h3', 'Zuletzt notierte Preise'));
  const list = element('ul', undefined, 'comparison-list');
  for (const row of rows) {
    const line = element('li');
    const sale = row.expired ? ` · Angebot abgelaufen${row.saleUntil ? ` (${dayLabel(row.saleUntil)})` : ''}, es gilt der Normalpreis` : row.onSale ? (row.saleUntil ? ` · Angebot bis ${dayLabel(row.saleUntil)}` : ' · damals im Angebot') : '';
    line.append(element('strong', `${row.storeName}: ${euros(row.rate)}/${row.unit}`),
      element('small', `${quoteLabel(row.quote)} · zuletzt eingetragen am ${shortDate(row.at)}${row.old ? ' (über zwei Monate her)' : ''}${sale}`, row.old || row.expired ? 'stale' : undefined));
    list.append(line);
  }
  const storeCount = active(state.stores).length;
  box.append(list, element('p', `Für ${rows.length} von ${storeCount} Geschäften liegt ein passender Preis vor. Vergleich nur bei gleichem Artikelnamen und passender Einheit. Keine aktuellen Händlerpreise; Marke und Qualität bitte selbst berücksichtigen.`, 'hint'));
}
function editItem(id) {
  const item = active(state.items).find(row => row.id === id);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  itemBaseline = clone({ ...item, price: itemQuote(item, state.prices), salePrice: item.salePrice || null, onSale: Boolean(item.onSale), saleUntil: item.saleUntil || null,
    category: isCategory(item.category) ? item.category : null });
  const form = $('#edit-item-form'); form.reset();
  for (const key of ['id', 'name', 'quantity', 'unit']) form.elements[key].value = item[key];
  categoryHint(form.elements.category, item.name); form.elements.category.value = itemBaseline.category || '';
  storeOptions(form.elements.storeId, item.storeId || '', true);
  setQuoteFields(form, itemQuote(item, state.prices), item.unit);
  form.elements.onSale.checked = Boolean(item.onSale);
  setSaleFields(form, item.salePrice, item.saleUntil);
  form.querySelector('[data-price-hint]').textContent = 'Preise werden nur für dieses Geschäft gemerkt. Der Vergleich verwendet die zuletzt notierten Preise.';
  showComparison(item); message(); $('#item-dialog').showModal();
}
function removeRows(collection, ids) {
  const rows = active(state[collection]).filter(row => ids.includes(row.id));
  const at = new Date().toISOString();
  commit(rows.map(row => nextOp(collection, row.id, { deletedAt: at })));
}
function renderStores() {
  const editor = $('#store-editor'); editor.replaceChildren();
  for (const store of active(state.stores)) {
    const row = element('div', undefined, 'store-row');
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
    form.append(nameLabel, linkLabel, anywhereLabel, save);
    form.addEventListener('submit', event => { event.preventDefault(); guard(() => {
      const name = input.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
      currentStore(store.id); const typed = offerUrl(link.value);
      // Der Standardlink der Kette und die Voreinstellung nach dem Namen werden nicht festgeschrieben, damit spätere Änderungen daran wirken.
      commit([nextOp('stores', store.id, { name, offersUrl: typed === defaultOfferUrl({ name }) ? '' : typed, anywhere: anywhere.checked === takesAnywhere({ name }) ? null : anywhere.checked })]); renderStores();
    }); });
    const remove = button('Geschäft löschen', () => {
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      if (!confirm(`„${store.name}“ löschen? Die Artikel werden ausgeblendet. Du kannst das Löschen rückgängig machen.`)) return;
      removeRows('stores', [store.id]); renderStores();
    }, 'danger');
    remove.setAttribute('aria-label', `${store.name} löschen`); row.append(form, remove); editor.append(row);
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
    iconButton('calendar', `${recipe.name} im Wochenplan einplanen`, () => openMeal({ recipeId: recipe.id, servings: positive(servingInput.value) })));
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
    $('#recipe-dialog').close();
  });
}
function openTransfer(id, servings) {
  transferRecipe = clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt));
  if (!transferRecipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const form = $('#transfer-form'); form.elements.servings.value = plain(servings);
  storeOptions(form.elements.storeId, defaultStore(), true); $('#transfer-ingredients').replaceChildren(); form.elements.rememberPantry.checked = false;
  const keys = pantryKeys(state.pantry);
  for (const row of active(state.ingredients).filter(row => row.recipeId === id)) {
    const label = element('label', undefined, 'transfer-row'), check = element('input'), stocked = inPantry(keys, row.name);
    // Salz, Pfeffer und Co. („nach Bedarf“) und der Vorrat: hat man meist da, nicht vorausgewählt.
    check.type = 'checkbox'; check.checked = row.unit !== NO_AMOUNT && !stocked; check.value = row.id;
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
  const select = form.elements.recipeId; select.replaceChildren(new Option('Rezept wählen …', ''));
  const recipes = active(state.recipes).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name, 'de'));
  for (const recipe of recipes) select.add(new Option(`${recipe.favorite ? '★ ' : ''}${recipe.name}`, recipe.id));
  select.add(new Option('Eigenes Gericht (ohne Rezept) …', '__custom'));
  form.elements.id.value = options.id || '';
  form.elements.date.value = meal?.date || options.date || isoDate();
  select.value = meal ? (meal.recipeId || '__custom') : options.recipeId || '';
  if (!select.value && meal) select.value = '__custom';
  form.elements.title.value = meal?.title || '';
  form.elements.servings.value = plain(meal?.servings || options.servings || recipes.find(recipe => recipe.id === select.value)?.servings || 2);
  syncMealForm(false);
  $('#meal-title').textContent = meal ? 'Gericht ändern' : 'Gericht planen';
  $('#meal-dialog').showModal();
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

/* ---------- Rezepte des Tages ---------- */
// Ohne Einstellung kommen jeden Tag drei Rezepte aus der eingebauten Sammlung (rezepte-des-tages.json, kein Hilfsdienst nötig).
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
const dailyLeft = () => { const d = loadDaily(); return d.day === localDay() && d.source === dailySourceKey() ? Math.max(0, d.queue.length - d.index) : null; };
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
  if (old.day === localDay() && old.source === key) return old;
  if (!source) {
    const collection = await loadBuiltin();
    daily = { day: localDay(), source: key, queue: planBuiltin(collection, localDay(), new Set(old.decided), knownRecipeKeys()), index: 0, outcome: {}, decided: old.decided, found: collection.length, builtin: true };
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
    if (item.builtin) {
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
function dailyButtons({ add = false, skip = false, retry = false, reset = false } = {}) {
  $('#daily-add').hidden = !add; $('#daily-skip').hidden = !skip; $('#daily-retry').hidden = !retry; $('#daily-reset').hidden = !reset;
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
  } else card.append(element('p', 'Aus der eingebauten Sammlung', 'hint'));
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
      if (d.builtin) { card.replaceChildren(element('p', `Du hast alle ${d.found} Rezepte der Sammlung gesehen oder schon bei deinen Rezepten.`)); dailyButtons({ reset: true }); return; }
      card.replaceChildren(element('p', d.found ? 'Alle Rezepte dieser Seite hast du schon gesehen oder in deinen Rezepten. Morgen gibt es neue.' : 'Auf der Seite wurden keine Rezept-Links gefunden. Prüfe den Link in den Einstellungen. Seiten, die ihre Rezepte erst per JavaScript nachladen, kann die App nicht lesen.'));
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
  if (!d.decided.includes(item.key)) d.decided.push(item.key);
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
$('#daily-reset').addEventListener('click', () => guard(() => {
  const d = loadDaily(); d.decided = d.decided.filter(key => !key.startsWith('eigene:')); d.day = ''; saveDaily();
  return showDaily();
}));
$('#daily-add').addEventListener('click', () => guard(() => { addDailyRecipe(); return decideDaily('added'); }));
$('#daily-skip').addEventListener('click', () => guard(() => decideDaily('skipped')));
$('#daily-retry').addEventListener('click', () => guard(() => showDaily()));
$('#daily-dialog').addEventListener('close', () => { dailyTicket += 1; });

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
      response.status === 403 ? 'GitHub verweigert den Zugriff oder begrenzt Anfragen. Bitte Token-Rechte (Contents: Read and write), eine mögliche Freigabe und das GitHub-Limit prüfen. Details stehen in der README. Lokale Änderungen bleiben erhalten.' :
      response.status === 404 ? 'GitHub findet Repository, Branch oder JSON-Datei nicht, oder dein Token hat keinen Zugriff. Prüfe Eigentümer, Repository, Branch, Dateiname und Token-Auswahl. Lege daten.json im privaten Repository an (siehe README).' :
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
let retryAt = 0, compactRequested = false;
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
      if (!file) { retryAt = 0; message(); restingStatus(); hydratePhotos(); return; }
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
      ready = true; retryAt = 0; message();
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
  $('#theme').value = config.theme || 'system'; $('#store-style').value = config.storeStyle === 'logo' ? 'logo' : 'text'; $('#group-items').checked = config.groupItems !== false; applyTheme();
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
function applyTheme() {
  const root = document.documentElement, palette = PALETTES.includes(config.palette) ? config.palette : 'blau';
  if (!config.theme || config.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = config.theme;
  root.dataset.palette = palette;
  document.querySelectorAll('#palette button').forEach(node => node.setAttribute('aria-checked', String(node.dataset.palette === palette)));
  // Die Farbe der Statusleiste folgt der gewählten Hintergrundfarbe, nicht nur dem Gerät.
  const channels = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
  if (channels.length < 3 || channels[3] === 0) return;   // noch keine Farbe berechnet: Statusleiste unverändert lassen
  const [red, green, blue] = channels;
  $('#theme-color').content = `#${[red, green, blue].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}
function sameTarget(left, right) { return namespace(left) === namespace(right); }
async function backup() {
  const name = `einkauf-backup-${new Date().toISOString().slice(0, 10)}.json`, json = JSON.stringify(state, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  // Auf dem iPhone öffnet ein Download aus einer Homescreen-App oft eine Seite ohne Rückweg: besser den Teilen-Dialog nehmen.
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = name;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Im Laden ---------- */
// Umschalter „Planen | Im Laden“ (gilt für dieses Gerät). Im Laden: Geschäft oben wählen, nur das Wichtige sehen, abhaken.
let shopStore = '', shopDoneOpen = false;
const shopChecked = new Map();   // Artikel ohne Geschäft, die in dieser Sitzung in einem Geschäft abgehakt wurden: Kennung → Geschäft
const shopOn = () => config.shopMode === true;
function setShopMode(on) { saveConfig({ ...config, shopMode: on }); applyMode(); window.scrollTo(0, 0); }
function applyMode() {
  const on = shopOn();
  $('#plan-view').hidden = on; $('#shop-view').hidden = !on; $('#mode-row').hidden = on;
  $('#mode-plan').setAttribute('aria-selected', String(!on)); $('#mode-shop').setAttribute('aria-selected', String(on));
  if (on) renderShop();
  syncShopAwake(); syncChrome();
}
// Im Laden steht ganz oben die Geschäftsauswahl: Kopfzeile und Umschalter verschwinden, solange diese Ansicht offen ist.
function syncChrome() { document.body.classList.toggle('in-store', shopOn() && !$('#shopping').hidden); }
function syncShopAwake() {
  const supported = 'wakeLock' in navigator;
  $('#shop-awake-label').hidden = !supported; $('#shop-awake').checked = supported && config.shopAwake === true && !awake.shop.failed;
  const want = supported && config.shopAwake === true && shopOn() && !$('#shopping').hidden && !document.hidden;
  void keepAwake('shop', want);
}
function shopRow(item) {
  const row = element('li', undefined, `shop-item${item.checked ? ' checked' : ''}`);
  const tap = element('button', undefined, 'shop-tap'); tap.type = 'button';
  const mark = element('span', undefined, 'shop-mark'); if (item.checked) mark.append(icon('check'));
  tap.append(mark, element('span', item.name, 'shop-name'), element('span', `${format(item.quantity)} ${item.unit}`, 'shop-qty'));
  tap.setAttribute('aria-pressed', String(Boolean(item.checked)));
  tap.setAttribute('aria-label', `${item.name}, ${format(item.quantity)} ${item.unit}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
  tap.addEventListener('click', () => guard(() => {
    const latest = state.items.find(entry => entry.id === item.id);
    if (!latest || latest.deletedAt) return;
    // Ein Artikel ohne Geschäft, der hier abgehakt wird, steht in den anderen Geschäften nicht mehr auf der Liste.
    if (!latest.checked && !latest.storeId) shopChecked.set(latest.id, shopStore); else shopChecked.delete(latest.id);
    commit([nextOp('items', item.id, { checked: !latest.checked })]);
  }));
  row.append(tap);
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
  const stores = active(state.stores), items = visibleItems();
  if (shopStore && !stores.some(store => store.id === shopStore)) shopStore = '';
  const chips = $('#shop-chips'); chips.replaceChildren();
  for (const store of stores) {
    const chip = element('button', undefined, 'chip'); chip.type = 'button'; chip.append(storeLabel(store.name));
    chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', String(store.id === shopStore));
    const count = shopCount(items, store.id, takesAnywhere(store)); if (count) chip.append(element('span', String(count), 'count'));
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
  const shop = shopView(items, shopStore, shopChecked, takesAnywhere(stores.find(store => store.id === shopStore))), here = [...shop.open, ...shop.anywhere];
  const news = seen ? newFromOthers(here, config.actor || '', seen) : [], newIds = new Set(news.map(entry => entry.item.id));
  const groups = rows => groupByCategory(rows.filter(item => !newIds.has(item.id)), itemHistory());
  const total = shoppingTotal(here, state.prices);
  $('#shop-status').textContent = here.length ? `Noch ${here.length} offen${total.cents > 0 ? ` · ca. ${euros(total.cents)}` : ''}` : `Alles erledigt bei ${storeName(shopStore)}.`;
  news.forEach(entry => list.append(shopNewsRow(entry)));
  for (const group of groups(shop.open)) { list.append(groupHead(group.label, group.items.length)); group.items.forEach(item => list.append(shopRow(item))); }
  const anywhere = groups(shop.anywhere);
  if (anywhere.length) {
    list.append(element('li', 'Überall möglich', 'store-head none'));
    for (const group of anywhere) { list.append(groupHead(group.label, group.items.length)); group.items.forEach(item => list.append(shopRow(item))); }
  }
  if (shop.elsewhere) list.append(element('li', `${shop.elsewhere} Artikel für andere Geschäfte`, 'shop-note'));
  if (shop.hidden) list.append(element('li', `${shop.hidden} Artikel ohne Geschäft stehen hier nicht (einstellbar unter „Geschäfte“)`, 'shop-note'));
  if (shop.done.length) {
    const done = element('li', undefined, 'shop-done'), details = element('details'), inner = element('ul');
    details.open = shopDoneOpen; details.addEventListener('toggle', () => { shopDoneOpen = details.open; });
    details.append(element('summary', `Erledigt (${shop.done.length})`), inner);
    shop.done.sort((a, b) => a.name.localeCompare(b.name, 'de')).forEach(item => inner.append(shopRow(item)));
    done.append(details); list.append(done);
  }
}
function openFinish() {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  const checked = visibleItems().filter(item => item.checked).length;
  $('#finish-text').textContent = checked ? `${checked} abgehakte ${checked === 1 ? 'Artikel wird' : 'Artikel werden'} von der Liste entfernt.` : 'Es ist noch nichts abgehakt.';
  $('#finish-dialog').showModal();
}
function finishShopping(withReceipt) {
  const ids = visibleItems().filter(item => item.checked).map(item => item.id);
  if (ids.length) removeRows('items', ids);
  shopChecked.clear();
  $('#finish-dialog').close();
  if (withReceipt) openReceipt(shopStore);
}

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
    hint.textContent = 'Der Bildschirm bleibt an, solange diese Ansicht offen ist.';
  } catch {
    entry.lock = null; entry.failed = true; $(entry.box).checked = false; entry.wanted = false;
    hint.textContent = 'Das lässt sich auf diesem Gerät gerade nicht einschalten. Du kannst unter Einstellungen → Anzeige & Helligkeit → Automatische Sperre eine längere Zeit wählen.';
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

/* ---------- Kassenbon ---------- */
let receiptLines = [], receiptParsed = null;
// Namen, die die App schon kennt: Artikel, Namensgedächtnis, notierte Preise und bestätigte Zuordnungen.
function knownNames() {
  const names = new Map();
  for (const row of [...itemHistory(), ...state.prices, ...active(state.aliases || []).map(alias => ({ name: alias.name }))]) {
    if (typeof row.name === 'string' && row.name.trim() && !names.has(productKey(row.name))) names.set(productKey(row.name), row.name.trim());
  }
  return [...names.values()];
}
let receiptStore = '';
function openReceipt(storeId = '') {
  receiptStore = typeof storeId === 'string' ? storeId : '';
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (!active(state.stores).length) throw new Error('Bitte zuerst ein Geschäft anlegen.');
  const form = $('#receipt-form'); form.reset();
  $('#receipt-input').hidden = false; $('#receipt-review').hidden = true; message();
  $('#receipt-dialog').showModal(); form.elements.text.focus();
}
const receiptCents = text => parseCents(String(text).replace(/\s*(?:€|EUR)\s*$/i, ''));
function receiptQuote(line) {
  const euros = line.inputs.price.value.trim(), quantity = line.inputs.quantity.value.trim(), unit = line.inputs.unit.value.trim();
  if (!euros || !quantity || !unit) throw new Error(`Bitte Preis, Menge und Einheit für „${line.inputs.name.value.trim() || line.item.name}“ ausfüllen.`);
  return { cents: receiptCents(euros), quantity: positive(quantity), unit };
}
// Vorschau je Zeile: gemerkt/Vorschlag, schon eingetragen, Aktion, Entwicklung gegenüber dem letzten Preis.
function refreshReceiptLine(line) {
  const note = line.note; note.className = 'receipt-note hint'; note.textContent = '';
  const parts = [];
  if (line.how) parts.push(line.how === 'gemerkt' ? 'Zuordnung gemerkt' : 'Vorschlag, bitte prüfen');
  try {
    const form = $('#receipt-form'), storeId = form.elements.storeId.value, name = line.inputs.name.value.trim();
    const quote = receiptQuote(line);
    if (line.item.onSale) parts.push(`Aktion: bezahlt ${euros(line.item.quote.cents)} ${perLabel(line.item.quote)}`);
    if (name) {
      const at = receiptTime(form), fresh = { storeId, name, quote: line.item.onSale ? line.item.quote : quote, regularQuote: quote, onSale: line.item.onSale };
      const trend = trendFor(state.prices, fresh, at);
      const before = trend && activeTrend({ storeId, name, unit: quote.unit }, [{ ...fresh, id: 'vorschau', createdAt: at, trend }], new Date(at));
      if (before) { note.classList.add('trend', before.direction); parts.unshift(trendLabel(before)); }
      else if (!state.prices.some(row => !row.deletedAt && row.storeId === storeId && productKey(row.name) === productKey(name))) parts.push('neu in der Preisliste');
    }
  } catch (error) { parts.push(error.message); }
  note.textContent = parts.join(' · ');
}
function receiptTime(form) {
  const day = form.elements.date.value;
  if (!day) return new Date().toISOString();
  if (!validDay(day)) throw new Error('Bitte ein gültiges Datum angeben.');
  const stamp = new Date(`${day}T12:00:00`);
  if (stamp.getTime() > Date.now() + 86400000) throw new Error('Das Datum liegt in der Zukunft.');
  return stamp.toISOString();
}
function parseReceiptText() {
  const form = $('#receipt-form'), parsed = parseReceipt(form.elements.text.value);
  if (!parsed.items.length) throw new Error('Auf dem Text wurden keine Artikelzeilen erkannt. Bitte den ganzen Text des Kassenbons einfügen (Artikel mit Preis, je Zeile).');
  receiptParsed = parsed;
  storeOptions(form.elements.storeId, storeForChain(parsed.chain, state.stores) || receiptStore || viewStore()?.id || '', false);
  form.elements.date.value = parsed.date || isoDate();
  const list = $('#receipt-lines'); list.replaceChildren(); receiptLines = [];
  const names = $('#receipt-names'); names.replaceChildren(); const known = knownNames();
  for (const name of known.slice(0, 400)) names.append(new Option(name));
  const aliases = active(state.aliases || []);
  for (const item of parsed.items) {
    const guess = suggestName(item, aliases, known);
    const box = element('div', undefined, 'receipt-line'), use = element('label', undefined, 'receipt-use'), check = element('input');
    check.type = 'checkbox'; check.checked = true; use.append(check, element('span', item.text));
    const label = (text, input) => { const node = element('label', text); node.append(input); return node; };
    const input = (name, value, extra = {}) => { const node = element('input'); node.name = name; node.value = value; Object.assign(node, extra); return node; };
    const inputs = { name: input('name', guess.name, { maxLength: 120, autocomplete: 'off' }), price: input('price', (((item.regularQuote || item.quote).cents) / 100).toFixed(2).replace('.', ','), { inputMode: 'decimal', maxLength: 10 }),
      quantity: input('quantity', plain((item.regularQuote || item.quote).quantity), { inputMode: 'decimal', maxLength: 16 }), unit: input('unit', (item.regularQuote || item.quote).unit, { maxLength: 30 }) };
    inputs.name.setAttribute('list', 'receipt-names'); inputs.unit.setAttribute('list', 'units');
    const grid = element('div', undefined, 'price-grid unit-grid'); grid.append(label('Preis (€)', inputs.price), label('Menge', inputs.quantity), label('Einheit', inputs.unit));
    const note = element('p', undefined, 'receipt-note hint');
    box.append(use, label('Name in der App', inputs.name), grid, note);
    const line = { item, inputs, check, box, note, how: guess.how, key: guess.key, suggested: guess.name };
    for (const node of Object.values(inputs)) node.addEventListener('input', () => { line.how = ''; refreshReceiptLine(line); });
    check.addEventListener('change', () => box.classList.toggle('off', !check.checked));
    // Schon eingetragen (gleicher Tag, gleiche Zeile): nicht noch einmal vorschlagen.
    const done = state.prices.some(row => !row.deletedAt && row.storeId === form.elements.storeId.value && productKey(row.name) === productKey(guess.name) &&
      row.createdAt.slice(0, 10) === form.elements.date.value && (row.regularQuote || row.quote)?.cents === (item.regularQuote || item.quote).cents);
    if (done) { check.checked = false; box.classList.add('off'); line.how = ''; }
    receiptLines.push(line); list.append(box); refreshReceiptLine(line);
    if (done) line.note.textContent = `Schon eingetragen · ${line.note.textContent}`;
  }
  $('#receipt-check').textContent = parsed.total === null ? `${parsed.items.length} Zeilen erkannt. Eine Summe wurde im Text nicht gefunden.` :
    parsed.sum === parsed.total ? `${parsed.items.length} Zeilen erkannt. Die Summe stimmt mit dem Bon überein (${euros(parsed.total)}).` :
      `Achtung: Die erkannten Zeilen ergeben ${euros(parsed.sum)}, der Bon nennt ${euros(parsed.total)}. Möglicherweise fehlen Zeilen.`;
  const skipped = $('#receipt-skipped'); skipped.hidden = !parsed.skipped.length;
  skipped.querySelector('summary').textContent = `Nicht als Artikel erkannt (${parsed.skipped.length})`;
  skipped.querySelector('ul').replaceChildren(...parsed.skipped.map(entry => element('li', `${entry.text} · ${entry.why}`)));
  $('#receipt-input').hidden = true; $('#receipt-review').hidden = false;
  form.elements.storeId.onchange = form.elements.date.onchange = () => receiptLines.forEach(refreshReceiptLine);
}
function saveReceipt() {
  const form = $('#receipt-form'), storeId = currentStore(form.elements.storeId.value);
  if (!storeId) throw new Error('Bitte ein Geschäft wählen.');
  const base = Date.parse(receiptTime(form)), chosen = new Map();
  receiptLines.forEach((line, index) => {
    if (!line.check.checked) return;
    const name = line.inputs.name.value.trim().replace(/\s+/g, ' ');
    if (!name) throw new Error('Bitte für jede ausgewählte Zeile einen Namen angeben.');
    const quote = receiptQuote(line), sale = line.item.onSale;
    // Bei einer Aktion bleibt das Verhältnis von bezahltem Preis zu Normalpreis erhalten, auch wenn Menge oder Einheit korrigiert wurden.
    const paid = sale ? { ...quote, cents: Math.round(quote.cents * line.item.quote.cents / line.item.regularQuote.cents) } : quote;
    const entry = { line, name, storeId, quote: paid, regularQuote: quote, onSale: sale, at: new Date(base + index).toISOString() };
    chosen.set(`${productKey(name)}|${unitSpec(quote.unit).group}`, entry);   // gleicher Artikel zweimal auf dem Bon: die letzte Zeile gilt
  });
  const entries = [...chosen.values()].sort((a, b) => a.at.localeCompare(b.at));
  if (!entries.length) throw new Error('Bitte mindestens eine Zeile auswählen.');
  const ops = [], fresh = [], aliases = active(state.aliases || []), actor = config.actor || 'Unbekannt';
  let up = 0, down = 0;
  for (const entry of entries) {
    const row = { storeId, name: entry.name, quote: clone(entry.quote), regularQuote: clone(entry.regularQuote), onSale: entry.onSale };
    const trend = trendFor([...state.prices, ...fresh], row, entry.at);
    if (trend) row.trend = trend;
    const op = operation('prices', uid(), row, actor, entry.at);
    ops.push(op); fresh.push({ ...row, id: op.id, createdAt: entry.at });
    const shown = trend && activeTrend({ storeId, name: entry.name, unit: entry.quote.unit }, [fresh.at(-1)], new Date(entry.at));
    if (shown?.direction === 'up' && trend.at === entry.at) up++; else if (shown?.direction === 'down' && trend.at === entry.at) down++;
    // Zuordnung merken, wenn der Name von dem abweicht, was die App aus dem Bon gemacht hätte
    if (entry.line.key && productKey(entry.name) !== productKey(entry.line.item.name)) {
      const known = aliases.find(alias => alias.from === entry.line.key);
      if (!known) ops.push(operation('aliases', uid(), { from: entry.line.key, name: entry.name }, actor, entry.at));
      else if (known.name !== entry.name) ops.push(operation('aliases', known.id, { name: entry.name }, actor, entry.at));
    }
  }
  const parts = [`${entries.length} Preise gemerkt`, up && `${up} teurer`, down && `${down} günstiger`].filter(Boolean);
  commit(ops, parts.join(' · '));
  $('#receipt-dialog').close();
}

/* ---------- Vorrat ---------- */
function renderPantry() {
  const list = $('#pantry-list'); list.replaceChildren();
  const rows = active(state.pantry || []).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  if (!rows.length) list.append(element('li', 'Noch nichts im Vorrat.', 'empty'));
  for (const row of rows) {
    const entry = element('li'); entry.append(element('span', row.name), iconButton('x', `${row.name} aus dem Vorrat entfernen`, () => removeRows('pantry', [row.id])));
    list.append(entry);
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
const templateSource = () => visibleItems().filter(item => inView(item) && !item.checked);
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
    const result = addToList(rows, storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), state.prices, itemHistory(), state.items);
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
const entries = removed => removed.items + removed.recipes + removed.ingredients + removed.stores + removed.prices + removed.meals + removed.pantry + removed.aliases + removed.templates;
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
async function cleanPhotos() {
  if (!connected()) return;
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  await sync(true);
  if (pending.length) throw new Error('Es warten noch Änderungen. Bitte zuerst abgleichen (grüner Punkt oben).');
  const note = $('#storage-note'); note.textContent = 'Prüfe Fotos …';
  const response = await timed(`${photosApi()}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders({ Accept: 'application/vnd.github+json' }) });
  if (response.status === 404) { note.textContent = 'Es gibt keine Fotos im Daten-Repository.'; return; }
  if (!response.ok) throw new Error(`GitHub meldet Fehler ${response.status}. Bitte später erneut versuchen.`);
  const used = usedPhotos(), files = (await response.json()).filter(file => file.type === 'file' && /^[A-Za-z0-9-]{8,64}\.jpg$/.test(file.name));
  const orphans = files.filter(file => !used.has(file.name.slice(0, -4)));
  if (!orphans.length) { note.textContent = 'Alle Fotos werden noch verwendet.'; return; }
  const size = orphans.reduce((sum, file) => sum + (file.size || 0), 0);
  if (!confirm(`${orphans.length} nicht mehr verwendete Fotos (${kb(size)}) endgültig löschen?\n\nNur sinnvoll, wenn beide Geräte gerade abgeglichen sind.`)) { note.textContent = ''; return; }
  let deleted = 0;
  for (const file of orphans) {
    const result = await timed(`${photosApi()}/${encodeURIComponent(file.name)}`, { method: 'DELETE', headers: githubHeaders({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'Einkauf & Rezepte: ungenutztes Rezeptfoto entfernt', sha: file.sha, branch: config.branch }) });
    if (!result.ok) { note.textContent = `${deleted} Fotos gelöscht, dann Fehler ${result.status}.`; return; }
    deleted++;
  }
  note.textContent = `${deleted} Fotos gelöscht, ${kb(size)} frei.`;
}
// Fotos, auf die irgendein Rezept (auch ein gerade gelöschtes) oder die Upload-Warteschlange verweist.
const usedPhotos = () => new Set([...state.recipes.map(row => row.photoId), ...queued(queueKey())].filter(Boolean));
const photosApi = () => `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${photosDir(config.path).split('/').map(encodeURIComponent).join('/')}`;

/* ---------- Ereignisse ---------- */
fillCategorySelects();
document.querySelectorAll('[data-tab]').forEach(node => node.addEventListener('click', () => tab(node.dataset.tab)));
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => $(`#${node.dataset.close}`).close()));
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
$('#set-offers').addEventListener('click', () => { renderStores(); $('#stores-dialog').showModal(); });
// Zutaten auf die Liste setzen: Gleiche Artikel werden zusammengezählt (siehe data.js).
// `unchecked`: Namen der abgewählten Zutaten; mit `remember` kommen sie in den Vorrat.
function addRows(rows, storeId, unchecked = [], remember = false) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  const result = addToList(rows, storeId, config.actor || 'Unbekannt', new Date(lastTime).toISOString(), state.prices, itemHistory(), state.items);
  const stocked = remember ? pantryAdditions(unchecked, pantryKeys(state.pantry)) : [];
  if (!result.ops.length && !stocked.length) throw new Error('Alles davon steht schon auf der Liste.');
  const pantryOps = stocked.map(name => nextOp('pantry', uid(), { name }));
  const parts = [result.added && `${result.added} neu`, result.counted.length && `${result.counted.length} dazugezählt`, result.skipped && `${result.skipped} schon vorhanden`,
    stocked.length && `${stocked.length} in den Vorrat`].filter(Boolean);
  commit([...result.ops, ...pantryOps], `Übernommen: ${parts.join(', ')}`);
}
$('#item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, typed = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
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
    if (item.storeId && effectiveQuote(item, state.prices) && form.dataset.manualPrice === 'yes') ops.push(priceOperation(item));
    // Erscheint der neue Artikel nicht in der gerade gewählten Ansicht (anderes oder kein Geschäft), sagt die App, wo er steht.
    commit(ops, inView(item) ? renamed : `${renamed ? `${renamed}; ` : ''}„${name}“ steht bei „${storeName(item.storeId)}“`);
  }
  // Das gewählte Geschäft bleibt stehen: Man trägt meist mehrere Artikel nacheinander für denselben Laden ein.
  const kept = form.elements.storeId.value;
  form.reset(); form.elements.storeId.value = kept; renderStorePick(); delete form.dataset.manualPrice; rememberPriceInForm(); $('#item-suggestions').hidden = true; renderQuickPick(); form.elements.name.focus();
}); });
$('#delete-item').addEventListener('click', () => guard(() => {
  const id = $('#edit-item-form').elements.id.value;
  if (!active(state.items).some(row => row.id === id)) { $('#item-dialog').close(); return; }
  removeRows('items', [id]); $('#item-dialog').close();
}));
// Zeile lange halten und nach rechts in den roten Mülleimer schieben löscht den Artikel (nur in der Planungsansicht, nicht „Im Laden“).
dragDelete($('#items'), $('#trash-zone'), id => guard(() => {
  const item = state.items.find(row => row.id === id && !row.deletedAt);
  if (!item) return;
  removeRows('items', [id]); showNotice(`„${item.name}“ gelöscht`);
}));
$('#edit-item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = state.items.find(row => row.id === form.elements.id.value && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const patch = { name: form.elements.name.value.trim(), quantity: positive(form.elements.quantity.value), unit: form.elements.unit.value.trim(),
    category: form.elements.category.value || null, storeId: currentStore(form.elements.storeId.value), ...readPricing(form) };
  if (!patch.name || !patch.unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const delta = changed(patch, itemBaseline);
  const ops = Object.keys(delta).length ? [nextOp('items', item.id, delta)] : [];
  const edited = { ...item, ...delta };
  if (edited.storeId && effectiveQuote(edited, state.prices) && ['price', 'salePrice', 'name', 'unit', 'onSale'].some(key => key in delta)) ops.push(priceOperation(edited));
  commit(ops); $('#item-dialog').close();
}); });
$('#clear-checked').addEventListener('click', () => guard(() => removeRows('items', visibleItems().filter(row => inView(row) && row.checked).map(row => row.id))));
$('#manage-stores').addEventListener('click', () => { renderStores(); $('#stores-dialog').showModal(); });
$('#store-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const name = event.currentTarget.elements.name.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
  if (active(state.stores).some(store => store.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) throw new Error('Dieses Geschäft gibt es bereits.');
  commit([nextOp('stores', uid(), { name, offersUrl: offerUrl(event.currentTarget.elements.offersUrl.value) })]); event.currentTarget.reset(); renderStores();
}); });
$('#recipe-search').addEventListener('input', renderRecipes);
$('#add-recipe').addEventListener('click', () => guard(() => editRecipe()));
$('#import-recipe').addEventListener('click', () => guard(() => openImport()));
$('#add-ingredient').addEventListener('click', () => ingredientRow());
$('#recipe-form').addEventListener('submit', saveRecipe);
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
$('#meal-form').elements.recipeId.addEventListener('change', () => syncMealForm(true));
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
$('#store-style').addEventListener('change', () => guard(() => { saveConfig({ ...config, storeStyle: $('#store-style').value }); render(); renderShop(); renderStores(); }));
$('#theme').addEventListener('change', () => guard(() => { saveConfig({ ...config, theme: $('#theme').value }); applyTheme(); }));
$('#palette').addEventListener('click', event => guard(() => {
  const choice = event.target.closest('button[data-palette]')?.dataset.palette;
  if (choice) { saveConfig({ ...config, palette: choice }); applyTheme(); }
}));
$('#export').addEventListener('click', () => guard(backup));
$('#open-receipt').addEventListener('click', () => guard(() => openReceipt()));
$('#cook-awake').addEventListener('change', event => guard(async () => { awake.cook.failed = false; saveConfig({ ...config, cookAwake: event.target.checked }); await keepAwake('cook', event.target.checked); }));
$('#cook-dialog').addEventListener('close', () => { void keepAwake('cook', false); });
// iOS gibt die Sperre frei, sobald die App in den Hintergrund geht; beim Zurückkehren wird sie neu angefordert.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (awake.cook.wanted && !awake.cook.lock && $('#cook-dialog').open) void keepAwake('cook', true);
  syncShopAwake();
});
$('#mode-plan').addEventListener('click', () => guard(() => setShopMode(false)));
$('#shop-back').addEventListener('click', () => guard(() => setShopMode(false)));
$('#mode-shop').addEventListener('click', () => guard(() => setShopMode(true)));
$('#shop-awake').addEventListener('change', event => guard(() => { awake.shop.failed = false; saveConfig({ ...config, shopAwake: event.target.checked }); syncShopAwake(); }));
$('#shop-finish').addEventListener('click', () => guard(openFinish));
$('#finish-only').addEventListener('click', () => guard(() => finishShopping(false)));
$('#finish-receipt').addEventListener('click', () => guard(() => finishShopping(true)));
$('#receipt-parse').addEventListener('click', () => guard(parseReceiptText));
$('#receipt-back').addEventListener('click', () => { $('#receipt-input').hidden = false; $('#receipt-review').hidden = true; message(); });
$('#receipt-form').addEventListener('submit', event => { event.preventDefault(); guard(saveReceipt); });
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
  const result = addToList(rows, match?.id || '', config.actor || 'Unbekannt', new Date(lastTime).toISOString(), state.prices, itemHistory(), state.items);
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
async function start() {
  try {
    config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); fillSettings();
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
