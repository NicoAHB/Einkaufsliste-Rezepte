import { active, clone, emptyData, ingredientItems, merge, operation, positive, uid, validate } from './data.js';
import { comparePrices, itemCost, itemQuote, offerUrl, parseCents, rememberedPrice, shoppingTotal, storeOfferUrl, unitRate, unitSpec } from './prices.js';

const $ = selector => document.querySelector(selector);
const CONFIG_KEY = 'einkauf-settings-v1';
let config = {}, base = emptyData(), pending = [], state = emptyData();
let busy = false, ready = false, selectedStore = '', lastTime = 0, undoAction = null;
let recipeBaseline = null, ingredientBaseline = [], transferRecipe = null;
let itemBaseline = null;
let priceFormStore = null;
const portions = new Map();
const format = number => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(number);
const euros = cents => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const shortDate = at => new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(new Date(at));
const connected = () => Boolean(config.owner && config.repo && config.token);
const namespace = (value = config) => value.owner && value.repo ?
  `einkauf-data-v1:${JSON.stringify([value.owner.toLowerCase(), value.repo.toLowerCase(), value.branch, value.path])}` : 'einkauf-demo-v1';

// Ausschließlich Textknoten für Nutzereingaben: Rezeptnamen können kein HTML ausführen.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, className = 'secondary') {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', () => guard(action));
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
function saveLocal(nextBase, nextPending) {
  storageWrite(namespace(), { base: nextBase, pending: nextPending });
  base = nextBase; pending = nextPending; state = merge(base, pending);
}
function status(text) { $('#status').textContent = text; }
function restingStatus() {
  status(!connected() ? 'Gespeichert · nur auf diesem Gerät' :
    pending.length ? `Lokal gespeichert · ${pending.length} Änderung(en) warten` :
    ready ? 'Gespeichert · mit GitHub abgeglichen' : 'Noch nicht mit GitHub verbunden');
}
function nextOp(collection, id, patch) {
  lastTime = Math.max(Date.now(), lastTime + 1, Date.parse(state.updatedAt) + 1);
  return operation(collection, id, patch, config.actor || 'Nico', new Date(lastTime).toISOString());
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
  storeOptions($('#store-select'));
  selectedStore = $('#store-select').value;
  renderItems(); renderRecipes();
  $('#item-form').querySelector('button').disabled = !ready || !selectedStore;
  $('#add-recipe').disabled = !ready;
  $('#manage-stores').disabled = !ready;
}
function renderItems() {
  if (priceFormStore !== selectedStore) {
    priceFormStore = selectedStore;
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
    const check = button(item.checked ? '✓' : '', () => {
      const latest = state.items.find(entry => entry.id === item.id);
      if (!latest || latest.deletedAt) return;
      commit([nextOp('items', item.id, { checked: !latest.checked })],
        { label: 'Häkchen geändert', patches: [{ collection: 'items', id: item.id, patch: { checked: latest.checked } }] });
    }, 'check');
    check.setAttribute('aria-label', `${item.name}: ${item.checked ? 'wieder öffnen' : 'abhaken'}`);
    check.setAttribute('aria-pressed', String(Boolean(item.checked)));
    const copy = element('div', undefined, 'item-copy');
    copy.append(element('strong', item.name), element('small', `${format(item.quantity)} ${item.unit} · ${item.createdBy || 'Unbekannt'}`));
    if (item.onSale) copy.append(element('span', 'Im Angebot', 'sale-badge'));
    const cost = itemCost(item, state.prices);
    if (cost !== null) copy.append(element('small', `Geschätzt: ${euros(cost)}`, 'price-note'));
    const quotes = comparePrices(item, state.stores, state.prices);
    if (quotes.length) {
      const best = quotes[0], stores = quotes.filter(row => Math.abs(row.rate - best.rate) < 0.000001).map(row => row.storeName).join(', ');
      const label = quotes.length === 1 ? `Preis notiert bei ${stores}` : `Günstigster notierter Preis (${quotes.length} Geschäfte): ${stores}`;
      copy.append(element('small', `${label} · ${euros(best.rate)}/${best.unit}`, 'price-note'));
    }
    const edit = button('✎', () => editItem(item.id), 'icon-button');
    edit.setAttribute('aria-label', `${item.name} bearbeiten`);
    const remove = button('✕', () => removeRows('items', [item.id], 'Artikel gelöscht'), 'icon-button');
    const actions = element('div', undefined, 'item-actions'); actions.append(edit, remove);
    remove.setAttribute('aria-label', `${item.name} löschen`); row.append(check, copy, actions); list.append(row);
  }
}
function renderShoppingInfo() {
  const store = active(state.stores).find(row => row.id === selectedStore), url = storeOfferUrl(store);
  $('#offers-link').hidden = !url; $('#set-offers').hidden = Boolean(url) || !store;
  if (url) { $('#offers-link').href = url; $('#offers-link').setAttribute('aria-label', `${store.name}: Angebote ansehen`); }
  else $('#offers-link').removeAttribute('href');
  const total = shoppingTotal(state.items.filter(row => row.storeId === selectedStore), state.prices);
  const box = $('#shopping-total'); box.replaceChildren();
  box.append(element('p', store ? `${store.name} · noch einzukaufen` : 'Noch einzukaufen', 'eyebrow'));
  box.append(element('strong', !total.count ? 'Alles erledigt' : total.priced ? `Geschätzt ${euros(total.cents)}` : 'Noch keine Preisschätzung'));
  box.append(element('p', total.missing ? `${total.missing} Artikel ohne passenden Preis fehlen in der Summe.` : total.count ? 'Alle offenen Artikel berücksichtigt. Preise können sich ändern.' : 'Erledigte Artikel werden nicht mitgerechnet.', 'hint'));
}
function quoteLabel(quote) { return `${euros(quote.cents)} für ${format(quote.quantity)} ${quote.unit}`; }
function setQuoteFields(form, quote, fallbackUnit) {
  form.elements.priceEuros.value = quote ? (quote.cents / 100).toFixed(2).replace('.', ',') : '';
  form.elements.priceQuantity.value = quote ? String(quote.quantity).replace('.', ',') : '1';
  form.elements.priceUnit.value = quote?.unit || fallbackUnit;
}
function rememberPriceInForm() {
  const form = $('#item-form');
  if (form.dataset.manualPrice === 'yes') return;
  const name = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  const quote = rememberedPrice(state.prices, selectedStore, name, unit);
  setQuoteFields(form, quote, unit);
  form.querySelector('[data-price-hint]').textContent = quote ? `Für dieses Geschäft gemerkt: ${quoteLabel(quote)}. Du kannst den Vorschlag ändern oder leeren.` :
    'Beispiel: 1,99 € für 500 g. Ein gemerkter Preis dieses Geschäfts wird beim Eingeben vorgeschlagen.';
}
function readQuote(form) {
  const value = form.elements.priceEuros.value.trim();
  if (!value) return null;
  const quote = { cents: parseCents(value), quantity: positive(form.elements.priceQuantity.value), unit: form.elements.priceUnit.value.trim() };
  if (!quote.unit) throw new Error('Bitte die Einheit des Preises eingeben.');
  if (unitRate(quote, form.elements.unit.value.trim()) === null) throw new Error('Artikeleinheit und Preiseinheit passen nicht zusammen. Verwende zum Beispiel kg und g oder l und ml. Bei Packungen muss der Preis ebenfalls je Packung angegeben sein.');
  return quote;
}
function priceOperation(item) {
  // Jeder notierte Preis ist ein eigener Datensatz: gleichzeitige Einträge
  // verschiedener Geräte bleiben erhalten, der neueste passende wird verwendet.
  return nextOp('prices', uid(), { storeId: item.storeId, name: item.name,
    quote: clone(item.price), onSale: Boolean(item.onSale) });
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
  itemBaseline = clone({ ...item, price: itemQuote(item, state.prices), onSale: Boolean(item.onSale) });
  const form = $('#edit-item-form'); form.reset();
  for (const key of ['id', 'name', 'quantity', 'unit']) form.elements[key].value = item[key];
  setQuoteFields(form, itemQuote(item, state.prices), item.unit);
  form.elements.onSale.checked = Boolean(item.onSale);
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
    link.name = 'offersUrl'; link.type = 'url'; link.value = storeOfferUrl(store); link.maxLength = 2000; link.placeholder = 'https://…';
    linkLabel.append(link);
    const save = element('button', '✓', 'secondary'); save.setAttribute('aria-label', `${store.name} umbenennen`);
    const nameLabel = element('label', 'Geschäftsname'); nameLabel.append(input);
    form.append(nameLabel, linkLabel, save);
    form.addEventListener('submit', event => { event.preventDefault(); guard(() => {
      const name = input.value.trim(); if (!name) throw new Error('Bitte einen Namen eingeben.');
      currentStore(store.id); commit([nextOp('stores', store.id, { name, offersUrl: offerUrl(link.value) })]); renderStores();
    }); });
    const remove = button('✕', () => {
      if (active(state.stores).length <= 1) throw new Error('Mindestens ein Geschäft muss bleiben.');
      if (!confirm(`„${store.name}“ löschen? Die Artikel werden ausgeblendet. Du kannst das Löschen rückgängig machen.`)) return;
      removeRows('stores', [store.id], 'Geschäft gelöscht'); renderStores();
    }, 'danger');
    remove.setAttribute('aria-label', `${store.name} löschen`); row.append(form, remove); editor.append(row);
  }
}

function renderRecipes() {
  const search = $('#recipe-search').value.toLocaleLowerCase('de');
  const filter = $('#tag-filter'), previous = filter.value;
  filter.replaceChildren(new Option('Alle Tags', ''));
  const recipes = active(state.recipes);
  for (const tag of [...new Set(recipes.flatMap(recipe => recipe.tags))].sort()) filter.add(new Option(tag, tag));
  filter.value = [...filter.options].some(option => option.value === previous) ? previous : '';
  const grid = $('#recipe-list'); grid.replaceChildren();
  for (const recipe of recipes.filter(recipe => {
    const names = active(state.ingredients).filter(row => row.recipeId === recipe.id).map(row => row.name).join(' ');
    return `${recipe.name} ${names}`.toLocaleLowerCase('de').includes(search) && (!filter.value || recipe.tags.includes(filter.value));
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
    const card = element('article', undefined, 'card recipe-card');
    card.append(element('h3', recipe.name));
    const tags = element('div', undefined, 'tags');
    recipe.tags.forEach(tag => tags.append(element('span', tag, 'tag'))); card.append(tags);
    const label = element('label', 'Portionen'), servingInput = element('input');
    servingInput.className = 'servings'; servingInput.inputMode = 'decimal'; servingInput.value = portions.get(recipe.id) || recipe.servings;
    servingInput.setAttribute('aria-label', `Portionen für ${recipe.name}`); label.append(servingInput); card.append(label);
    const ingredients = active(state.ingredients).filter(row => row.recipeId === recipe.id);
    const list = element('ul', undefined, 'recipe-ingredients');
    const updateAmounts = () => {
      const count = positive(servingInput.value); portions.set(recipe.id, count);
      list.replaceChildren(...ingredients.map(row => element('li', `${format(row.quantity * count / recipe.servings)} ${row.unit} ${row.name}`)));
    };
    updateAmounts(); servingInput.addEventListener('change', () => guard(updateAmounts)); card.append(list);
    const details = element('details'), summary = element('summary', 'Zubereitung');
    details.append(summary, element('p', recipe.instructions, 'preview')); card.append(details);
    const actions = element('div', undefined, 'actions');
    actions.append(button('Zutaten auf die Liste', () => openTransfer(recipe.id, positive(servingInput.value)), ''),
      button('Bearbeiten', () => editRecipe(recipe.id)), button('Löschen', () => {
        if (confirm(`Rezept „${recipe.name}“ löschen?`)) removeRows('recipes', [recipe.id], 'Rezept gelöscht');
      }, 'danger'));
    card.append(actions); grid.append(card);
  }
  if (!grid.children.length) grid.append(element('p', 'Noch kein passendes Rezept. Lege eines an oder ändere die Suche.', 'empty'));
}
function ingredientRow(value = {}) {
  const row = element('div', undefined, 'ingredient-row'); row.dataset.id = value.id || uid();
  for (const [key, caption, fallback] of [['name', 'Zutat', ''], ['quantity', 'Menge', '1'], ['unit', 'Einheit', 'Stück']]) {
    const label = element('label', caption, key === 'name' ? 'wide' : '');
    const input = element('input'); input.dataset.field = key; input.value = value[key] ?? fallback;
    input.required = true; input.maxLength = key === 'name' ? 120 : 30;
    if (key === 'quantity') input.inputMode = 'decimal';
    if (key === 'unit') input.setAttribute('list', 'units');
    label.append(input); row.append(label);
  }
  row.append(button('Zutat entfernen', () => row.remove(), 'text-button'));
  $('#ingredient-editor').append(row);
}
function editRecipe(id = '') {
  const form = $('#recipe-form'); form.reset();
  recipeBaseline = id ? clone(state.recipes.find(recipe => recipe.id === id && !recipe.deletedAt)) : null;
  if (id && !recipeBaseline) throw new Error('Dieses Rezept wurde inzwischen gelöscht.');
  ingredientBaseline = id ? clone(active(state.ingredients).filter(row => row.recipeId === id)) : [];
  form.elements.id.value = id;
  $('#recipe-editor-title').textContent = id ? 'Rezept bearbeiten' : 'Neues Rezept';
  if (recipeBaseline) for (const field of ['name', 'servings', 'instructions', 'tags']) {
    form.elements[field].value = field === 'tags' ? recipeBaseline.tags.join(', ') : recipeBaseline[field];
  }
  $('#ingredient-editor').replaceChildren();
  (ingredientBaseline.length ? ingredientBaseline : [{}]).forEach(ingredientRow);
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
    const patch = { name: form.elements.name.value.trim(), servings: positive(form.elements.servings.value),
      instructions: form.elements.instructions.value.trim(), tags: [...new Set(form.elements.tags.value.split(',').map(tag => tag.trim()).filter(Boolean))] };
    if (!patch.name || !patch.instructions) throw new Error('Bitte Namen und Zubereitung ausfüllen.');
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
  const form = $('#transfer-form'); form.elements.servings.value = servings;
  storeOptions(form.elements.storeId); $('#transfer-ingredients').replaceChildren();
  for (const row of active(state.ingredients).filter(row => row.recipeId === id)) {
    const label = element('label', undefined, 'transfer-row'), check = element('input');
    check.type = 'checkbox'; check.checked = true; check.value = row.id;
    // Die angezeigte Auswahl bleibt bis zur Bestätigung stabil, auch beim Abgleich.
    label._ingredient = clone(row); label.append(check, element('span')); $('#transfer-ingredients').append(label);
  }
  updateTransfer(); $('#transfer-dialog').showModal();
}
function updateTransfer() {
  const factor = positive($('#transfer-form').elements.servings.value) / transferRecipe.servings;
  for (const label of $('#transfer-ingredients').children) {
    const row = label._ingredient; label.querySelector('span').textContent = `${format(row.quantity * factor)} ${row.unit} ${row.name}`;
  }
}

// GitHub Contents API: erst aktuellen Stand lesen, nur eigene Operationen anwenden,
// dann mit genau dessen SHA schreiben. 409/422 führen zu erneutem Lesen und Mischen.
function apiPath() {
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${config.path.split('/').map(encodeURIComponent).join('/')}`;
}
async function api(method, body) {
  let response;
  // AbortController funktioniert auch auf älteren iPhones, die die neuere
  // Hilfsmethode AbortSignal.timeout noch nicht anbieten.
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(`${apiPath()}${method === 'GET' ? `?ref=${encodeURIComponent(config.branch)}` : ''}`, {
      method, cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch { throw new Error('Keine Verbindung zu GitHub. Deine Änderungen bleiben lokal gespeichert. Bei Empfang wird automatisch erneut gesendet; die App dafür geöffnet lassen.'); }
  finally { clearTimeout(timeout); }
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
  return response.json();
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
  busy = true; $('#refresh').disabled = true; status('Wird gesendet / aktualisiert …');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const file = await api('GET'), remote = decodeFile(file);
      const batch = pending.slice(), merged = merge(remote, batch);
      // Schon bestätigte Operationen brauchen nach einem verlorenen HTTP-Ergebnis
      // nicht erneut geschrieben zu werden.
      if (batch.some(op => !remote.sync.applied.includes(op.id))) {
        try {
          await api('PUT', { message: 'Einkauf & Rezepte: Änderungen synchronisieren',
            content: encodeFile(merged), sha: file.sha, branch: config.branch });
        } catch (error) { if ([409, 422].includes(error.status) && attempt < 3) continue; throw error; }
      }
      const sent = new Set(batch.map(op => op.id));
      saveLocal(merged, pending.filter(op => !sent.has(op.id)));
      ready = true; retryAt = 0; message(); render(); restingStatus();
      return;
    }
  } catch (error) {
    retryAt = error.retryAt || Date.now() + ([401, 404].includes(error.status) ? 60000 : 15000);
    status(`Fehler · ${pending.length ? 'Änderungen lokal gesichert' : 'Abgleich nicht möglich'}`); message(error.message);
  } finally {
    busy = false; $('#refresh').disabled = false;
    if (pending.length && !retryAt) setTimeout(() => void sync(), 300);
  }
}
async function loadWorkspace() {
  ready = false; pending = []; base = emptyData(); state = base; undoAction = null; $('#undo-bar').hidden = true;
  priceFormStore = null;
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
    $('#settings-form').elements[key].value = config[key] || ({ actor: 'Nico', branch: 'main', path: 'daten.json' }[key] || '');
  }
  $('#theme').value = config.theme || 'system'; applyTheme();
}
function applyTheme() {
  if (!config.theme || config.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = config.theme;
}
function sameTarget(left, right) { return namespace(left) === namespace(right); }

document.querySelectorAll('[data-tab]').forEach(node => node.addEventListener('click', () => tab(node.dataset.tab)));
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => $(`#${node.dataset.close}`).close()));
$('#refresh').addEventListener('click', () => guard(() => sync(true)));
$('#store-select').addEventListener('change', () => {
  selectedStore = $('#store-select').value;
  renderItems();
});
for (const key of ['name', 'unit']) $('#item-form').elements[key].addEventListener('blur', rememberPriceInForm);
for (const key of ['priceEuros', 'priceQuantity', 'priceUnit']) $('#item-form').elements[key].addEventListener('input', () => { $('#item-form').dataset.manualPrice = 'yes'; });
$('#set-offers').addEventListener('click', () => { renderStores(); $('#stores-dialog').showModal(); });
$('#item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, name = form.elements.name.value.trim(), unit = form.elements.unit.value.trim();
  if (!name || !unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const item = { storeId: currentStore(selectedStore), name, quantity: positive(form.elements.quantity.value),
    unit, checked: false, createdBy: config.actor || 'Nico', price: readQuote(form), onSale: form.elements.onSale.checked };
  const ops = [nextOp('items', uid(), item)];
  if (item.price && form.dataset.manualPrice === 'yes') ops.push(priceOperation(item));
  commit(ops);
  form.reset(); delete form.dataset.manualPrice; rememberPriceInForm(); form.elements.name.focus();
}); });
$('#edit-item-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const form = event.currentTarget, item = state.items.find(row => row.id === form.elements.id.value && !row.deletedAt);
  if (!item) throw new Error('Dieser Artikel wurde inzwischen gelöscht.');
  const patch = { name: form.elements.name.value.trim(), quantity: positive(form.elements.quantity.value), unit: form.elements.unit.value.trim(),
    price: readQuote(form), onSale: form.elements.onSale.checked };
  if (!patch.name || !patch.unit) throw new Error('Bitte Artikelname und Einheit eingeben.');
  const delta = changed(patch, itemBaseline);
  const ops = Object.keys(delta).length ? [nextOp('items', item.id, delta)] : [];
  if (patch.price && ['price', 'name', 'unit', 'onSale'].some(key => key in delta)) ops.push(priceOperation({ ...item, ...patch }));
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
$('#tag-filter').addEventListener('change', renderRecipes);
$('#add-recipe').addEventListener('click', () => guard(() => editRecipe()));
$('#add-ingredient').addEventListener('click', () => ingredientRow());
$('#recipe-form').addEventListener('submit', saveRecipe);
$('#transfer-form').elements.servings.addEventListener('change', () => guard(updateTransfer));
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
  storageWrite(CONFIG_KEY, next); config = next; retryAt = 0; message(); await loadWorkspace();
}); });
$('#disconnect').addEventListener('click', () => guard(async () => {
  if (busy) throw new Error('Bitte den laufenden Abgleich kurz abwarten.');
  if (!confirm('Token auf diesem Gerät entfernen? Lokale Repository-Daten und ausstehende Änderungen bleiben für eine spätere erneute Verbindung gespeichert.')) return;
  const next = { actor: config.actor, theme: config.theme }; storageWrite(CONFIG_KEY, next); config = next;
  fillSettings(); message(); await loadWorkspace();
}));
$('#theme').addEventListener('change', () => guard(() => {
  const next = { ...config, theme: $('#theme').value }; storageWrite(CONFIG_KEY, next); config = next; applyTheme();
}));
$('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = `einkauf-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#welcome').addEventListener('cancel', event => event.preventDefault());
$('#welcome-form').addEventListener('submit', event => { event.preventDefault(); guard(() => {
  const next = { ...config, actor: event.currentTarget.elements.actor.value };
  storageWrite(CONFIG_KEY, next); config = next; fillSettings(); render(); $('#welcome').close();
}); });
// Andere Tabs dürfen ihre Warteschlangen nicht gegenseitig überschreiben.
// Ein zweiter Tab bleibt deshalb vollständig inaktiv, bis der erste geschlossen ist.
async function start() {
  try {
    config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); fillSettings();
    await loadWorkspace(); if (!config.actor) $('#welcome').showModal();
    setInterval(() => { if (!document.hidden) void sync(); }, 8000);
    window.addEventListener('online', () => void sync(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => message('Offline-Start konnte nicht vorbereitet werden. Online funktioniert die App weiter. Bitte HTTPS und alle App-Dateien prüfen.'));
  } catch (error) { message(error.message); status('Fehler · Einrichtung prüfen'); }
}
if (navigator.locks) {
  navigator.locks.request('einkauf-app-v1', { ifAvailable: true }, async lock => {
    if (!lock) {
      document.querySelectorAll('button,input,select,textarea').forEach(node => { node.disabled = true; });
      message('Die App ist bereits in einem anderen Tab oder Fenster geöffnet. Schließe es und lade diese Seite neu.');
      status('Zweiter Tab pausiert'); return;
    }
    await start(); await new Promise(() => {});
  });
} else {
  document.querySelectorAll('button,input,select,textarea').forEach(node => { node.disabled = true; });
  message('Bitte Safari/iOS 15.4 oder neuer bzw. einen aktuellen Browser verwenden. Sichere gleichzeitige Tabs benötigen die Web Locks API.');
}
