import { active, clone, emptyData, ingredientItems, merge, operation, positive, suggestItemNames, uid, validate } from './data.js';
import { comparePrices, effectiveQuote, itemCost, itemQuote, offerUrl, parseCents, rememberedPrice, shoppingTotal, storeOfferUrl, unitRate, unitSpec } from './prices.js';
import { NO_AMOUNT, firstUrl, hostLabel, htmlToText, ingredientLabel, parseRecipeText, recipeFromAnyText, recipeFromHtml, webUrl } from './recipe-import.js';
import { PUBLIC_PROXIES, fetchRecipePage, workerHost } from './page-source.js';

const $ = selector => document.querySelector(selector);
const CONFIG_KEY = 'einkauf-settings-v1';
let config = {}, base = emptyData(), pending = [], state = emptyData();
let busy = false, ready = false, selectedStore = '', lastTime = 0, undoAction = null;
let recipeBaseline = null, ingredientBaseline = [], transferRecipe = null;
let itemBaseline = null;
let priceFormStore = null;
let tagFilter = '', remoteEtag = '', deferredImport = null;
let importSource = 'link', importAbort = null, previewUrls = [];
const portions = new Map(), openRecipes = new Set();
const format = number => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(number);
const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
// Für Eingabefelder: ohne Tausenderpunkt, sonst würde „1.000“ später als 1 gelesen.
const plain = number => String(Math.round(number * 1000) / 1000).replace('.', ',');
const shortDate = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(new Date(at));
const connected = () => Boolean(config.owner && config.repo && config.token);
const namespace = (value = config) => value.owner && value.repo ?
  `einkauf-data-v1:${JSON.stringify([value.owner.toLowerCase(), value.repo.toLowerCase(), value.branch, value.path])}` : 'einkauf-demo-v1';
// Wenn sich weder Zeitstempel noch Zahl der angewendeten Änderungen ändern, hat sich auch nichts Sichtbares geändert.
const signature = () => `${state.updatedAt}|${state.sync.applied.length}`;
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
function status(text, mode = 'local') { $('#status').textContent = text; $('#status').dataset.state = mode; }
function restingStatus() {
  if (!connected()) status('Nur auf diesem Gerät', 'local');
  else if (pending.length) status(`${pending.length} Änderung(en) warten`, 'pending');
  else if (ready) status('Mit GitHub abgeglichen', 'ok');
  else status('Noch nicht verbunden', 'pending');
}
function nextOp(collection, id, patch) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  return operation(collection, id, patch, config.actor || 'Unbekannt', new Date(lastTime).toISOString());
}
function commit(ops, undo = null) {
  if (!ready) throw new Error('Bitte zuerst GitHub verbinden oder den Beispielmodus öffnen.');
  if (!ops.length) return;
  const nextPending = [...pending, ...ops];
  const nextState = merge(base, nextPending);
  // Eine einzige atomare localStorage-Schreiboperation sichert Daten und Warteschlange.
  saveLocal(connected() ? base : nextState, connected() ? nextPending : []);
  if (undo) { undoAction = undo; $('#undo-label').textContent = undo.label; $('#undo-bar').hidden = false; }
  message(); render(); restingStatus();
  if (connected()) void sync();
}

function tab(name) {
  for (const id of ['shopping', 'recipes', 'settings']) $(`#${id}`).hidden = name !== id;
  document.querySelectorAll('[data-tab]').forEach(node => {
    if (node.dataset.tab === name) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}
function storeOptions(select, preferred = selectedStore) {
  select.replaceChildren();
  for (const store of active(state.stores)) {
    const option = element('option', store.name); option.value = store.id; select.append(option);
  }
  if ([...select.options].some(option => option.value === preferred)) select.value = preferred;
}
function currentStore(id) {
  if (!active(state.stores).some(store => store.id === id)) throw new Error('Dieses Geschäft wurde inzwischen gelöscht. Bitte ein anderes auswählen.');
  return id;
}
// Listenansichten werden aus dem zusammengeführten lokalen Stand aufgebaut.
// Geöffnete Eingabeformulare bleiben bei Hintergrund-Aktualisierungen bestehen.
function render() {
  $('#identity').textContent = config.actor || '';
  $('#demo-banner').hidden = connected();
  const stores = active(state.stores);
  if (!stores.some(store => store.id === selectedStore)) selectedStore = stores[0]?.id || '';
  renderStoreChips(); renderItems(); renderRecipes();
  $('#item-form').querySelector('button[type=submit]').disabled = !ready || !selectedStore;
  $('#add-recipe').disabled = !ready;
  $('#import-recipe').disabled = !ready;
  $('#manage-stores').disabled = !ready;
}
function renderStoreChips() {
  const box = $('#store-chips'); box.replaceChildren();
  for (const store of active(state.stores)) {
    const open = active(state.items).filter(item => item.storeId === store.id && !item.checked).length;
    const chip = element('button', store.name, 'chip'); chip.type = 'button';
    chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', String(store.id === selectedStore));
    if (open) chip.append(element('span', String(open), 'count'));
    chip.addEventListener('click', () => {
      selectedStore = store.id; renderStoreChips(); renderItems();
    });
    box.append(chip);
  }
  // Nur die Chip-Leiste verschieben, nie die ganze Seite.
  const selected = box.querySelector('[aria-selected=true]');
  if (selected) box.scrollLeft = Math.max(0, selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2);
}
function renderItems() {
  if (priceFormStore !== selectedStore) {
    priceFormStore = selectedStore;
    $('#item-form').elements.onSale.checked = false;
    delete $('#item-form').dataset.manualPrice; rememberPriceInForm();
  }
  renderShoppingInfo();
  const list = $('#items'); list.replaceChildren();
  const items = active(state.items).filter(item => item.storeId === selectedStore)
    .sort((a, b) => Number(Boolean(a.checked)) - Number(Boolean(b.checked)) || a.name.localeCompare(b.name, 'de'));
  const done = items.filter(item => item.checked).length;
  $('#item-count').textContent = `${items.length - done} offen · ${done} erledigt`;
  $('#clear-checked').disabled = !done;
  if (!items.length) list.append(element('li', 'Alles im Blick. Füge deinen ersten Artikel hinzu.', 'empty'));
  for (const item of items) {
    const row = element('li', undefined, `item${item.checked ? ' checked' : ''}`);
    const check = button('', () => {
      const latest = state.items.find(entry => entry.id === item.id);
      if (!latest || latest.deletedAt) return;
      commit([nextOp('items', item.id, { checked: !latest.checked })]);
    }, 'check');
    if (item.checked) check.append(icon('check'));
    check.setAttribute('aria-label', `${item.name}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
    check.setAttribute('aria-pressed', String(Boolean(item.checked)));
    const copy = element('div', undefined, 'item-copy');
    copy.append(element('strong', item.name), element('small', `${format(item.quantity)} ${item.unit} · ${item.createdBy || 'Unbekannt'}`));
    if (item.onSale) copy.append(element('span', 'Im Angebot', 'sale-badge'));
    if (item.onSale && item.salePrice) {
      copy.append(element('small', `Angebot: ${quoteLabel(item.salePrice)}`, 'price-note'));
      const normal = itemQuote(item, state.prices);
      if (normal) copy.append(element('small', `Normal: ${quoteLabel(normal)}`));
    }
    const cost = itemCost(item, state.prices);
    if (cost !== null) copy.append(element('small', `Geschätzt: ${euros(cost)}`, 'price-note'));
    const quotes = comparePrices(item, state.stores, state.prices);
    if (quotes.length) {
      const best = quotes[0], stores = quotes.filter(row => Math.abs(row.rate - best.rate) < 0.000001).map(row => row.storeName).join(', ');
      const label = quotes.length === 1 ? `Preis notiert bei ${stores}` : `Günstigster notierter Preis (${quotes.length} Geschäfte): ${stores}`;
      copy.append(element('small', `${label} · ${euros(best.rate)}/${best.unit}`, 'price-note'));
    }
    const actions = element('div', undefined, 'item-actions');
    actions.append(iconButton('edit', `${item.name} bearbeiten`, () => editItem(item.id)),
      iconButton('trash', `${item.name} löschen`, () => removeRows('items', [item.id], 'Artikel gelöscht')));
    row.append(check, copy, actions); list.append(row);
  }
  if (document.activeElement === $('#item-form').elements.name) renderItemSuggestions();
}
function renderItemSuggestions() {
  const form = $('#item-form'), box = $('#item-suggestions');
  const names = suggestItemNames(state.items, form.elements.name.value);
  box.replaceChildren(); box.hidden = !names.length;
  if (!names.length) return;
  box.append(element('span', 'Vorschläge aus euren Artikeln', 'hint'));
  const choices = element('div', undefined, 'suggestion-choices');
  for (const name of names) choices.append(button(name, () => {
    form.elements.name.value = name; box.hidden = true;
    rememberPriceInForm(); form.elements.quantity.focus(); form.elements.quantity.select();
  }));
  box.append(choices);
}
function renderShoppingInfo() {
  const store = active(state.stores).find(row => row.id === selectedStore), url = storeOfferUrl(store);
  $('#offers-link').hidden = !url; $('#set-offers').hidden = Boolean(url) || !store;
  if (url) { $('#offers-link').href = url; $('#offers-link').setAttribute('aria-label', `${store.name}: Angebote ansehen`); }
  else $('#offers-link').removeAttribute('href');
  const total = shoppingTotal(state.items.filter(row => row.storeId === selectedStore), state.prices);
  const box = $('#shopping-total'); box.replaceChildren();
  box.append(element('p', store ? `${store.name} · offen` : 'Offen', 'eyebrow'));
  box.append(element('strong', !total.count ? 'Alles erledigt' : total.priced ? `Geschätzt ${euros(total.cents)}` : 'Noch keine Preisschätzung'));
  box.append(element('p', total.missing ? `${total.missing} Artikel ohne Preis fehlen in der Summe.` : total.count ? 'Alle offenen Artikel eingerechnet.' : 'Erledigte zählen nicht mit.', 'hint'));
}
function quoteLabel(quote) { return `${euros(quote.cents)} für ${format(quote.quantity)} ${quote.unit}`; }
function setQuoteFields(form, quote, fallbackUnit, prefix = 'price') {
  form.elements[`${prefix}Euros`].value = quote ? (quote.cents / 100).toFixed(2).replace('.', ',') : '';
  form.elements[`${prefix}Quantity`].value = quote ? String(quote.quantity).replace('.', ',') : '1';
  form.elements[`${prefix}Unit`].value = quote?.unit || fallbackUnit;
}
function setSaleFields(form, quote = null) {
  form._savedSaleQuote = quote ? clone(quote) : null;
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
function rememberPriceInForm() {
  const form = $('#item-form');
  if (form.dataset.manualPrice === 'yes') return;
  const name = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  const quote = rememberedPrice(state.prices, selectedStore, name, unit);
  setQuoteFields(form, quote, unit);
  setSaleFields(form);
  form.querySelector('[data-price-hint]').textContent = quote ? `Für dieses Geschäft gemerkt: ${quoteLabel(quote)}. Du kannst den Vorschlag ändern oder leeren.` :
    'Beispiel: 1,99 € für 500 g. Ein gemerkter Preis dieses Geschäfts wird beim Eingeben vorgeschlagen.';
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
  return { price, salePrice, onSale };
}
function priceOperation(item) {
  // Jeder notierte Preis ist ein eigener Datensatz: gleichzeitige Einträge
  // verschiedener Geräte bleiben erhalten, der neueste passende wird verwendet.
  return nextOp('prices', uid(), { storeId: item.storeId, name: item.name,
    quote: clone(effectiveQuote(item, state.prices)), regularQuote: clone(itemQuote(item, state.prices) || null), onSale: Boolean(item.onSale) });
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
    line.append(element('strong', `${row.storeName}: ${euros(row.rate)}/${row.unit}`),
      element('small', `${quoteLabel(row.quote)} · ${shortDate(row.createdAt)}${row.onSale ? ' · damals im Angebot' : ''}`));
    list.append(line);
  }
  const storeCount = active(state.stores).length;
  box.append(list, element('p', `Für ${rows.length} von ${storeCount} Geschäften liegt ein passender Preis vor. Vergleich nur bei gleichem Artikelnamen und passender Einheit. Keine aktuellen Händlerpreise; Marke und Qualität bitte selbst berücksichtigen.`, 'hint'));
}
function editItem(id) {
  const item = active(state.items).find(row => row.id === id);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  itemBaseline = clone({ ...item, price: itemQuote(item, state.prices), salePrice: item.salePrice || null, onSale: Boolean(item.onSale) });
  const form = $('#edit-item-form'); form.reset();
  for (const key of ['id', 'name', 'quantity', 'unit']) form.elements[key].value = item[key];
  setQuoteFields(form, itemQuote(item, state.prices), item.unit);
  form.elements.onSale.checked = Boolean(item.onSale);
  setSaleFields(form, item.salePrice);
  form.querySelector('[data-price-hint]').textContent = 'Preise werden nur für dieses Geschäft gemerkt. Der Vergleich verwendet die zuletzt notierten Preise.';
  showComparison(item); message(); $('#item-dialog').showModal();
}
function removeRows(collection, ids, label) {
  const rows = active(state[collection]).filter(row => ids.includes(row.id));
  const at = new Date().toISOString();
  commit(rows.map(row => nextOp(collection, row.id, { deletedAt: at })),
    { label, patches: rows.map(row => ({ collection, id: row.id, patch: { deletedAt: null } })) });
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
    form.append(nameLabel, linkLabel, save);
    form.addEventListener('submit', event => { event.preventDefault(); guard(() => {
      const name = input.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
      currentStore(store.id); commit([nextOp('stores', store.id, { name, offersUrl: offerUrl(link.value) })]); renderStores();
    }); });
    const remove = button('Geschäft löschen', () => {
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      if (!confirm(`„${store.name}“ löschen? Die Artikel werden ausgeblendet. Du kannst das Löschen rückgängig machen.`)) return;
      removeRows('stores', [store.id], 'Geschäft gelöscht'); renderStores();
    }, 'danger');
    remove.setAttribute('aria-label', `${store.name} löschen`); row.append(form, remove); editor.append(row);
  }
}

function renderRecipes() {
  const search = $('#recipe-search').value.trim().toLocaleLowerCase('de');
  const recipes = active(state.recipes);
  const tags = [...new Set(recipes.flatMap(recipe => recipe.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  if (tagFilter && !tags.includes(tagFilter)) tagFilter = '';
  const chips = $('#tag-chips'); chips.replaceChildren(); chips.hidden = !tags.length;
  for (const tag of tags) {
    const chip = element('button', tag, 'chip'); chip.type = 'button'; chip.setAttribute('aria-pressed', String(tag === tagFilter));
    chip.addEventListener('click', () => { tagFilter = tagFilter === tag ? '' : tag; renderRecipes(); });
    chips.append(chip);
  }
  const grid = $('#recipe-list'); grid.replaceChildren();
  const ingredientsOf = id => active(state.ingredients).filter(row => row.recipeId === id);
  for (const recipe of recipes.filter(recipe => {
    const names = ingredientsOf(recipe.id).map(row => row.name).join(' ');
    return `${recipe.name} ${names} ${recipe.tags.join(' ')}`.toLocaleLowerCase('de').includes(search) && (!tagFilter || recipe.tags.includes(tagFilter));
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'))) grid.append(recipeCard(recipe, ingredientsOf(recipe.id)));
  if (!grid.children.length) grid.append(element('p', recipes.length ? 'Kein passendes Rezept. Ändere die Suche oder den Tag.' : 'Noch kein Rezept. Importiere eines aus einem Link oder Screenshot oder lege es von Hand an.', 'empty'));
}
function recipeCard(recipe, ingredients) {
  const card = element('article', undefined, 'card recipe-card');
  card.append(element('h3', recipe.name));
  const source = webUrl(recipe.sourceUrl);
  card.append(element('p', [`${ingredients.length} Zutaten`, `${format(recipe.servings)} Portionen`, source && hostLabel(source)].filter(Boolean).join(' · '), 'recipe-meta'));
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
  card.append(details);
  const actions = element('div', undefined, 'actions');
  actions.append(button('Auf die Liste', () => openTransfer(recipe.id, positive(servingInput.value)), 'primary-action'),
    iconButton('edit', `${recipe.name} bearbeiten`, () => editRecipe(recipe.id)),
    iconButton('trash', `${recipe.name} löschen`, () => {
      if (confirm(`Rezept „${recipe.name}“ löschen?`)) removeRows('recipes', [recipe.id], 'Rezept gelöscht');
    }, 'danger'));
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
  event.preventDefault(); guard(() => {
    const form = event.currentTarget, id = form.elements.id.value || uid();
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
    const ops = [], recipeChanges = changed(patch, recipeBaseline);
    if (Object.keys(recipeChanges).length) ops.push(nextOp('recipes', id, recipeChanges));
    for (const { id: ingredientId, ...fields } of rows) {
      const delta = changed(fields, ingredientBaseline.find(row => row.id === ingredientId));
      if (Object.keys(delta).length) ops.push(nextOp('ingredients', ingredientId, delta));
    }
    for (const row of ingredientBaseline.filter(row => !rows.some(candidate => candidate.id === row.id))) {
      ops.push(nextOp('ingredients', row.id, { deletedAt: new Date().toISOString() }));
    }
    commit(ops); $('#recipe-dialog').close();
  });
}
function openTransfer(id, servings) {
  transferRecipe = clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt));
  if (!transferRecipe) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  const form = $('#transfer-form'); form.elements.servings.value = plain(servings);
  storeOptions(form.elements.storeId); $('#transfer-ingredients').replaceChildren();
  for (const row of active(state.ingredients).filter(row => row.recipeId === id)) {
    const label = element('label', undefined, 'transfer-row'), check = element('input');
    // Salz, Pfeffer und Co. („nach Bedarf“) hat man meist da: nicht vorausgewählt.
    check.type = 'checkbox'; check.checked = row.unit !== NO_AMOUNT; check.value = row.id;
    // Die angezeigte Auswahl bleibt bis zur Bestätigung stabil, auch beim Abgleich.
    label._ingredient = clone(row); label.append(check, element('span')); $('#transfer-ingredients').append(label);
  }
  updateTransfer(); $('#transfer-dialog').showModal();
}
function updateTransfer() {
  const factor = positive($('#transfer-form').elements.servings.value) / transferRecipe.servings;
  for (const label of $('#transfer-ingredients').children) label.querySelector('span').textContent = ingredientLabel(label._ingredient, factor);
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
function encodeFile(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n');
  if (bytes.length > 900000) throw new Error('Die Daten sind größer als 900 KB. Bitte Backup erstellen. Für größere Datenbestände ist eine Erweiterung erforderlich. Nichts wurde verworfen.');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
let retryAt = 0;
async function sync(manual = false) {
  if (!connected()) { restingStatus(); return; }
  if (busy || (!manual && Date.now() < retryAt)) return;
  busy = true; $('#refresh').disabled = true;
  if (pending.length || manual || !ready) status('Gleiche ab …', 'busy');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      // Ohne eigene Änderungen genügt die Frage „hat sich etwas geändert?“ (HTTP 304).
      const file = await api('GET', undefined, !pending.length && !manual && ready && attempt === 0 ? remoteEtag : '');
      if (!file) { retryAt = 0; message(); restingStatus(); return; }
      const remote = decodeFile(file);
      const batch = pending.slice(), merged = merge(remote, batch);
      // Schon bestätigte Operationen brauchen nach einem verlorenen HTTP-Ergebnis
      // nicht erneut geschrieben zu werden.
      let written = false;
      if (batch.some(op => !remote.sync.applied.includes(op.id))) {
        try {
          await api('PUT', { message: 'Einkauf & Rezepte: Änderungen synchronisieren',
            content: encodeFile(merged), sha: file.sha, branch: config.branch });
          written = true;
        } catch (error) { if ([409, 422].includes(error.status) && attempt < 3) continue; throw error; }
      }
      const sent = new Set(batch.map(op => op.id)), wasReady = ready, before = signature();
      saveLocal(merged, pending.filter(op => !sent.has(op.id)));
      remoteEtag = written ? '' : file.etag;
      ready = true; retryAt = 0; message();
      // Nur neu zeichnen, wenn sich etwas geändert hat: So bleiben geöffnete Rezepte, Auswahllisten und Eingaben stehen.
      if (!wasReady || signature() !== before) render();
      restingStatus();
      return;
    }
  } catch (error) {
    retryAt = error.retryAt || Date.now() + ([401, 404].includes(error.status) ? 60000 : 15000);
    status(pending.length ? 'Fehler · lokal gesichert' : 'Abgleich nicht möglich', 'error'); message(error.message);
  } finally {
    busy = false; $('#refresh').disabled = false;
    if (pending.length && !retryAt) setTimeout(() => void sync(), 300);
  }
}
async function loadWorkspace() {
  ready = false; pending = []; base = emptyData(); state = base; undoAction = null; $('#undo-bar').hidden = true;
  priceFormStore = null; remoteEtag = '';
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
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token']) {
    $('#settings-form').elements[key].value = config[key] || ({ branch: 'main', path: 'daten.json' }[key] || '');
  }
  const importForm = $('#import-settings-form');
  importForm.elements.importProxy.value = config.importProxy || ''; importForm.elements.publicProxy.checked = Boolean(config.publicProxy);
  $('#theme').value = config.theme || 'system'; applyTheme();
}
function applyTheme() {
  if (!config.theme || config.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = config.theme;
  // Die Farbe der Statusleiste folgt dem gewählten Design, nicht nur dem Gerät.
  const dark = config.theme === 'dark' || (config.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-color').content = dark ? '#0f1914' : '#f4f6f2';
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

/* ---------- Ereignisse ---------- */
document.querySelectorAll('[data-tab]').forEach(node => node.addEventListener('click', () => tab(node.dataset.tab)));
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => $(`#${node.dataset.close}`).close()));
$('#refresh').addEventListener('click', () => guard(() => sync(true)));
$('#demo-setup').addEventListener('click', () => tab('settings'));
$('#reload').addEventListener('click', () => location.reload());
for (const key of ['name', 'unit']) $('#item-form').elements[key].addEventListener('blur', rememberPriceInForm);
for (const event of ['input', 'focus']) $('#item-form').elements.name.addEventListener(event, renderItemSuggestions);
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
for (const key of ['priceEuros', 'priceQuantity', 'priceUnit', 'saleEuros', 'saleQuantity', 'saleUnit']) $('#item-form').elements[key].addEventListener('input', () => { $('#item-form').dataset.manualPrice = 'yes'; });
for (const form of [$('#item-form'), $('#edit-item-form')]) form.elements.onSale.addEventListener('change', () => toggleSaleFields(form));
$('#set-offers').addEventListener('click', () => { renderStores(); $('#stores-dialog').showModal(); });
$('#item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, name = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  if (!name || !unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const item = { storeId: currentStore(selectedStore), name, quantity: positive(form.elements.quantity.value),
    unit, checked: false, createdBy: config.actor || 'Unbekannt', ...readPricing(form) };
  const ops = [nextOp('items', uid(), item)];
  if (effectiveQuote(item, state.prices) && form.dataset.manualPrice === 'yes') ops.push(priceOperation(item));
  commit(ops);
  form.reset(); delete form.dataset.manualPrice; rememberPriceInForm(); $('#item-suggestions').hidden = true; form.elements.name.focus();
}); });
$('#edit-item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = state.items.find(row => row.id === form.elements.id.value && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const patch = { name: form.elements.name.value.trim(), quantity: positive(form.elements.quantity.value), unit: form.elements.unit.value.trim(),
    ...readPricing(form) };
  if (!patch.name || !patch.unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const delta = changed(patch, itemBaseline);
  const ops = Object.keys(delta).length ? [nextOp('items', item.id, delta)] : [];
  const edited = { ...item, ...delta };
  if (effectiveQuote(edited, state.prices) && ['price', 'salePrice', 'name', 'unit', 'onSale'].some(key => key in delta)) ops.push(priceOperation(edited));
  commit(ops); $('#item-dialog').close();
}); });
$('#clear-checked').addEventListener('click', () => guard(() => removeRows('items', active(state.items).filter(row => row.storeId === selectedStore && row.checked).map(row => row.id), 'Erledigte Artikel entfernt')));
$('#manage-stores').addEventListener('click', () => { renderStores(); $('#stores-dialog').showModal(); });
$('#store-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const name = event.currentTarget.elements.name.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
  if (active(state.stores).some(store => store.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) throw new Error('Dieses Geschäft gibt es bereits.');
  commit([nextOp('stores', uid(), { name, offersUrl: offerUrl(event.currentTarget.elements.offersUrl.value) })]); event.currentTarget.reset(); renderStores();
}); });
$('#undo').addEventListener('click', () => guard(() => {
  if (!undoAction) return;
  commit(undoAction.patches.map(row => nextOp(row.collection, row.id, row.patch)));
  undoAction = null; $('#undo-bar').hidden = true;
}));
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
$('#transfer-form').elements.servings.addEventListener('change', () => guard(updateTransfer));
// Während des Tippens still mitrechnen; bei unfertiger Eingabe („2,“) bleibt die Anzeige einfach stehen.
$('#transfer-form').elements.servings.addEventListener('input', () => { try { updateTransfer(); } catch { /* Eingabe noch unvollständig */ } });
$('#transfer-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, selected = [...$('#transfer-ingredients').children]
    .filter(label => label.querySelector('input').checked).map(label => label._ingredient);
  if (!active(state.recipes).some(row => row.id === transferRecipe.id)) throw new Error('Das Rezept wurde inzwischen gelöscht.');
  if (!selected.length) throw new Error('Bitte mindestens eine Zutat auswählen.');
  const factor = positive(form.elements.servings.value) / transferRecipe.servings;
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  commit(ingredientItems(selected, transferRecipe.id, currentStore(form.elements.storeId.value), factor, config.actor, new Date(lastTime).toISOString(), state.prices));
  selectedStore = form.elements.storeId.value; $('#transfer-dialog').close(); render(); tab('shopping');
}); });
$('#settings-form').addEventListener('submit', event => { event.preventDefault(); guard(async () => {
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  const form = event.currentTarget, next = { ...config };
  for (const key of ['actor', 'owner', 'repo', 'branch', 'path', 'token']) next[key] = form.elements[key].value.trim();
  if (!/^[A-Za-z0-9-]+$/.test(next.owner) || !/^[A-Za-z0-9_.-]+$/.test(next.repo) ||
      !next.branch || !next.path.endsWith('.json') || next.path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Bitte Benutzername, Repository, Branch und einen relativen JSON-Dateinamen prüfen (keine vollständige URL).');
  if (!sameTarget(config, next) && pending.length) throw new Error('Vor einem Repository-Wechsel bitte die ausstehenden Änderungen synchronisieren. Du kannst dafür den Token des bisherigen Repositorys ersetzen.');
  saveConfig(next); retryAt = 0; message(); await loadWorkspace();
}); });
$('#import-settings-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, text = form.elements.importProxy.value.trim(), proxy = workerHost(text);
  if (text && !proxy) throw new Error('Bitte die Adresse deines Cloudflare-Workers eingeben. Sie beginnt mit https:// und endet auf .workers.dev.');
  saveConfig({ ...config, importProxy: proxy, publicProxy: form.elements.publicProxy.checked });
  form.elements.importProxy.value = proxy; message(); status('Import-Einstellungen gespeichert', 'ok'); setTimeout(restingStatus, 2500);
}); });
$('#test-proxy').addEventListener('click', () => guard(async () => {
  const proxy = workerHost($('#import-settings-form').elements.importProxy.value);
  if (!proxy) throw new Error('Bitte zuerst die Adresse deines Hilfsdienstes eintragen (https://…workers.dev).');
  saveConfig({ ...config, importProxy: proxy });
  try { await fetchRecipePage('https://example.com/', { workerUrl: proxy, allowPublic: false }); }
  catch (error) { throw new Error(`Der Hilfsdienst antwortet nicht wie erwartet. ${error.message}`); }
  message(); status('Hilfsdienst funktioniert', 'ok'); setTimeout(restingStatus, 2500);
}));
$('#disconnect').addEventListener('click', () => guard(async () => {
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  if (!confirm('Token auf diesem Gerät entfernen? Lokale Repository-Daten und ausstehende Änderungen bleiben für eine spätere erneute Verbindung gespeichert.')) return;
  saveConfig({ actor: config.actor, theme: config.theme, importProxy: config.importProxy, publicProxy: config.publicProxy });
  fillSettings(); message(); await loadWorkspace();
}));
$('#theme').addEventListener('change', () => guard(() => { saveConfig({ ...config, theme: $('#theme').value }); applyTheme(); }));
$('#export').addEventListener('click', () => guard(backup));
$('#welcome').addEventListener('cancel', event => event.preventDefault());
$('#welcome-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const actor = event.currentTarget.elements.actor.value.trim(); if (!actor) throw new Error('Bitte einen Namen eingeben.');
  saveConfig({ ...config, actor }); fillSettings(); render(); $('#welcome').close();
  if (deferredImport) { const link = deferredImport; deferredImport = null; openImport({ url: link }); }
}); });

// Link aus dem Teilen-Dialog oder aus einem iOS-Kurzbefehl: …/?import=https://…
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
    const incoming = incomingLink();
    await loadWorkspace();
    if (!config.actor) { deferredImport = incoming; $('#welcome').showModal(); }
    else if (incoming && ready) { tab('recipes'); guard(() => openImport({ url: incoming })); }
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
