/* Vorratsoberfläche. Keine eigenen Speicherwege: Änderungen gehen über die App-Warteschlange.
   Geöffnete Formulare bleiben bei Abgleich erhalten und senden nur tatsächlich geänderte Felder. */
import { pantryKey, pantryKeys, pantryRows, positive } from './data.js';
import { CATEGORIES, categoryLabel, groupByCategory, itemCategory } from './categories.js';
import { GROCERY_PRODUCTS, pantryProductAllowed, pantryProductLibrary } from './product-catalog.js';
import { groupImageFor, imageForProduct, paintProductImage } from './product-images.js';
import { pantrySuggestions } from './pantry-suggestions.js';
import { filterPantry, pantryChanges, pantryOnList } from './pantry.js';

const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const icon = name => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = document.createElementNS(svg.namespaceURI, 'use');
  svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#i-${name}`); svg.append(use); return svg;
};
const button = (text, label, callback, cls = 'secondary small') => {
  const el = node('button', text, cls); el.type = 'button'; if (label) el.setAttribute('aria-label', label); el.addEventListener('click', callback); return el;
};

export function mountPantry({ getData, getScope, getStores, getPreferredStore, imagesOn, recognizeName, onChange, onRemove, onBuy, onProducts, onImages, onCancelImages, onShopping }) {
  const $ = id => document.getElementById(id), form = $('pantry-form'), search = $('pantry-search'), category = $('pantry-category');
  const edit = $('pantry-edit-dialog'), editor = $('pantry-edit-form'), buy = $('pantry-buy-dialog'), buyer = $('pantry-buy-form');
  let keepName = '';
  let status = 'all', scope = getScope(), baseline = null, imageKey = null, buyingId = '', buyingProduct = null, lastBuyStore = '', sending = false;
  const failure = (id, error) => { $(id).textContent = error.message; $(id).hidden = false; };
  const safe = action => { try { $('pantry-error').hidden = true; action(); } catch (error) { failure('pantry-error', error); } };
  const rows = () => getData().pantry || [];
  const liveRow = id => pantryRows(rows()).find(row => row.ids.includes(id));
  const changes = products => { const next = pantryChanges(products, rows()); if (next.length) onChange(next); };
  function picture(row, cls = 'pantry-photo') {
    const el = node('span', undefined, cls); el.setAttribute('aria-hidden', 'true');
    return paintProductImage(el, imageForProduct(row), groupImageFor(row.name, itemCategory(row)));
  }
  function manualPreview() {
    const typed = form.elements.name.value.trim(), correction = keepName === typed ? null : recognizeName?.(typed).correction;
    const hint = $('pantry-name-hint'); hint.hidden = !correction; hint.querySelector('span').textContent = correction ? `Beim Hinzufügen: „${correction}“` : '';
    const row = { name: correction || typed }, preview = row.name.trim() ? picture(row) : node('span', undefined, 'pantry-photo pantry-photo-empty');
    if (!row.name.trim()) { preview.append(icon('box')); preview.setAttribute('aria-hidden', 'true'); }
    $('pantry-manual-photo').replaceWith(Object.assign(preview, { id: 'pantry-manual-photo' }));
  }
  function editPreview() {
    const row = { name: editor.elements.name.value, category: editor.elements.category.value, imageKey };
    const image = imageForProduct(row); $('pantry-edit-photo').replaceWith(Object.assign(picture(row), { id: 'pantry-edit-photo' }));
    $('pantry-image-label').textContent = `${imageKey ? 'Gewählt' : 'Automatisch'}: ${image.label}`;
    $('pantry-auto-image').disabled = !imageKey;
  }
  function editRow(row) {
    scope = getScope(); baseline = { ...row, ids: [...row.ids] }; imageKey = row.imageKey || null;
    editor.elements.name.value = row.name; editor.elements.category.value = row.category || '';
    editor.elements.available.checked = row.available !== false; $('pantry-edit-error').hidden = true;
    editPreview(); edit.showModal(); edit.scrollTop = 0; edit.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function renderBuyStores() {
    const select = buyer.elements.storeId, previous = select.value;
    select.replaceChildren(new Option('Kein Geschäft', ''));
    for (const store of getStores()) select.add(new Option(store.name, store.id));
    if (previous && !getStores().some(store => store.id === previous)) { const missing = new Option('Geschäft gelöscht – bitte wählen', previous); missing.disabled = true; select.add(missing); }
    select.value = previous;
  }
  function updateBuy() {
    if (!buy.open) return;
    const row = buyingProduct || liveRow(buyingId); if (!row) { buy.close(); return; }
    $('pantry-buy-name').replaceChildren(picture(row), node('strong', row.name));
    const storeId = buyer.elements.storeId.value, missing = storeId && !getStores().some(store => store.id === storeId);
    const exists = pantryOnList(row, getData().items || [], storeId);
    $('pantry-buy-add').disabled = Boolean((exists && !buyingProduct) || missing || sending);
    $('pantry-buy-add').textContent = exists && !buyingProduct ? 'Steht schon auf der Liste' : 'Auf die Einkaufsliste';
    if (missing) failure('pantry-buy-error', new Error('Dieses Geschäft wurde gelöscht. Bitte ein anderes wählen.'));
  }
  function buyRow(row, direct = false) {
    scope = getScope(); buyingId = row.id; buyingProduct = direct ? { ...row } : null;
    $('pantry-buy-title').textContent = direct ? 'Auf die Einkaufsliste' : 'Nachkaufen';
    $('pantry-buy-hint').textContent = direct ? 'Wähle Menge und Geschäft. Ein passendes Produkt auf der Liste wird um diese Menge ergänzt.' : 'Setzt das Produkt auf die Einkaufsliste. Wenn es wieder zu Hause ist, markiere es im Vorrat als vorhanden.'; $('pantry-buy-error').hidden = true;
    const product = GROCERY_PRODUCTS.find(product => pantryKey(product.name) === pantryKey(row.name));
    buyer.elements.quantity.value = String((direct ? row.quantity : product?.quantity) || 1).replace('.', ','); buyer.elements.unit.value = (direct ? row.unit : product?.unit) || 'Stück';
    renderBuyStores(); const preferred = direct && lastBuyStore ? lastBuyStore : getPreferredStore(); buyer.elements.storeId.value = getStores().some(store => store.id === preferred) ? preferred : '';
    buy.showModal(); buy.scrollTop = 0; updateBuy(); buy.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function renderSuggestions() {
    const box = $('pantry-suggestions'); box.replaceChildren();
    const groups = pantrySuggestions(pantryKeys(rows()));
    const head = node('div', undefined, 'suggest-head'); head.append(node('h4', 'Vorschläge zum Übernehmen')); box.append(head);
    if (!groups.length) { box.append(node('p', 'Alle Vorschläge stehen schon im Vorrat.', 'hint')); return; }
    head.append(button('Alle übernehmen', '', () => safe(() => changes(groups.flatMap(group => group.names)))));
    for (const group of groups) {
      const section = node('div', undefined, 'suggest-group'), chips = node('div', undefined, 'suggest-chips');
      for (const name of group.names) {
        const chip = button(undefined, `${name} in den Vorrat übernehmen`, () => safe(() => changes([name])), 'chip');
        chip.append(icon('plus'), document.createTextNode(name)); chips.append(chip);
      }
      section.append(node('span', group.title, 'suggest-title'), chips); box.append(section);
    }
  }
  let fitFrame = 0;
  function fitNames() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      for (const name of $('pantry-list').querySelectorAll('.pantry-name')) {
        const width = name.parentElement.clientWidth; if (!width) continue;
        name.style.fontSize = ''; name.classList.remove('pantry-name-wrap');
        const original = parseFloat(getComputedStyle(name).fontSize), minimum = Math.min(original, Math.max(12, rootSize * .75));
        let low = minimum, high = original;
        if (name.scrollWidth > width) {
          for (let i = 0; i < 7; i++) { const size = (low + high) / 2; name.style.fontSize = `${size}px`; if (name.scrollWidth <= width) low = size; else high = size; }
          name.style.fontSize = `${low}px`;
          if (name.scrollWidth > width) name.classList.add('pantry-name-wrap');
        }
      }
    });
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitNames) : null;
  observer?.observe($('pantry-list')); window.addEventListener('resize', fitNames);
  document.fonts?.ready.then(fitNames);
  function render() {
    const inventory = pantryRows(rows()), available = inventory.filter(row => row.available !== false).length, out = inventory.length - available;
    const favorites = pantryProductLibrary([], getData().favorites || [], rows()).filter(row => row.favorite).length;
    $('pantry-favorite-count').textContent = String(favorites); $('pantry-favorite-count').hidden = !favorites;
    $('pantry-summary-count').textContent = inventory.length ? `(${available} da${out ? ` · ${out} leer` : ''})` : '';
    $('pantry-shortcut-count').textContent = out ? String(out) : '';
    $('open-pantry').setAttribute('aria-label', out ? `Vorrat öffnen, ${out} aufgebraucht` : 'Vorrat öffnen');
    for (const tab of document.querySelectorAll('[data-pantry-filter]')) {
      const filter = tab.dataset.pantryFilter;
      tab.textContent = filter === 'all' ? 'Alle' : filter === 'out' ? 'Aufgebraucht' : 'Vorhanden';
      tab.setAttribute('aria-pressed', String(filter === status));
    }
    const list = $('pantry-list'), visible = filterPantry(rows(), { query: search.value, status, category: category.value }); list.replaceChildren();
    $('pantry-status').textContent = `${visible.length} ${visible.length === 1 ? 'Produkt' : 'Produkte'}${visible.length !== inventory.length ? ` von ${inventory.length}` : ''}`;
    if (!visible.length) list.append(node('li', inventory.length ? 'Keine passenden Produkte in dieser Auswahl.' : 'Noch nichts im Vorrat. Wähle Bilder aus oder gib ein Produkt ein.', 'empty'));
    for (const group of groupByCategory(visible)) {
      if (!group.items.length) continue;
      const heading = node('li', categoryLabel(group.id), 'pantry-category'); heading.setAttribute('role', 'presentation'); list.append(heading);
      for (const row of group.items) {
        const stocked = row.available !== false, entry = node('li', undefined, `pantry-entry${stocked ? '' : ' pantry-out'}`); entry.dataset.pantryId = row.id;
        const toggle = button(undefined, `${row.name}: als ${stocked ? 'aufgebraucht' : 'vorhanden'} markieren`, () => safe(() => onChange(row.ids.map(id => ({ id, patch: { available: !stocked } })))), 'pantry-toggle');
        toggle.setAttribute('aria-pressed', String(stocked)); if (stocked) toggle.append(icon('check'));
        const main = button(undefined, `${row.name}: Vorrat bearbeiten`, () => safe(() => editRow(row)), 'pantry-entry-main');
        if (imagesOn()) { main.classList.add('has-photo'); main.append(picture(row)); }
        const text = node('span', undefined, 'pantry-entry-text'); text.append(Object.assign(node('span', row.name, 'pantry-name'), { title: row.name }), node('small', stocked ? 'Vorhanden' : 'Aufgebraucht', 'pantry-state')); main.append(text);
        const remove = button(undefined, `${row.name} aus dem Vorrat entfernen`, () => safe(() => onRemove(row.ids)), 'icon-button pantry-remove'); remove.append(icon('x'));
        entry.append(toggle, main, remove);
        if (!stocked) entry.append(button('Nachkaufen', `${row.name}: nachkaufen`, () => safe(() => buyRow(row)), 'secondary small pantry-restock'));
        list.append(entry);
      }
    }
    renderSuggestions(); fitNames();
  }
  for (const group of CATEGORIES) category.add(new Option(group.label, group.id));
  search.addEventListener('input', render); category.addEventListener('change', render);
  for (const tab of document.querySelectorAll('[data-pantry-filter]')) tab.addEventListener('click', () => { status = tab.dataset.pantryFilter; render(); });
  form.elements.name.addEventListener('input', () => { keepName = ''; manualPreview(); });
  $('pantry-keep-name').addEventListener('click', () => { keepName = form.elements.name.value.trim(); manualPreview(); form.elements.name.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); safe(() => { const typed = form.elements.name.value.trim(), name = keepName === typed ? typed : recognizeName?.(typed).name || typed; changes([name]); form.reset(); keepName = ''; manualPreview(); form.elements.name.focus(); }); });
  $('pantry-products').addEventListener('click', () => safe(onProducts));
  $('pantry-favorites').addEventListener('click', () => safe(() => onProducts('favorites')));
  $('pantry-basics').addEventListener('click', () => safe(() => onProducts('basics')));
  $('pantry-to-list').addEventListener('click', onShopping);
  editor.elements.name.addEventListener('input', editPreview); editor.elements.category.addEventListener('change', editPreview);
  $('pantry-change-image').addEventListener('click', () => safe(() => onImages(imageKey || imageForProduct({ name: editor.elements.name.value, category: editor.elements.category.value }).key, key => { imageKey = key; editPreview(); })));
  $('pantry-auto-image').addEventListener('click', () => { imageKey = null; editPreview(); });
  editor.addEventListener('submit', event => {
    event.preventDefault(); if (!baseline || !edit.open) return;
    try {
      $('pantry-edit-error').hidden = true;
      const name = editor.elements.name.value.trim().replace(/\s+/g, ' '); if (!name || name.length > 120) throw new Error('Bitte einen Produktnamen mit 1 bis 120 Zeichen eingeben.');
      if (name !== baseline.name && !pantryProductAllowed({ name })) throw new Error('Der Vorrat ist für Lebensmittel und Drogerieprodukte gedacht.');
      const current = liveRow(baseline.id); if (!current) throw new Error('Dieser Vorrat wurde inzwischen entfernt.');
      if (pantryRows(rows()).some(row => !current.ids.some(id => row.ids.includes(id)) && pantryKey(row.name) === pantryKey(name))) throw new Error('Dieses Produkt steht schon im Vorrat. Bitte dort ergänzen.');
      const values = { name, category: editor.elements.category.value || null, available: editor.elements.available.checked, imageKey };
      const before = { name: baseline.name, category: baseline.category || null, available: baseline.available !== false, imageKey: baseline.imageKey || null };
      const patch = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== before[key]));
      if (Object.keys(patch).length) onChange(current.ids.map(id => ({ id, patch })));
      edit.close();
    } catch (error) { failure('pantry-edit-error', error); }
  });
  buyer.elements.storeId.addEventListener('change', () => { $('pantry-buy-error').hidden = true; updateBuy(); });
  buyer.addEventListener('submit', event => {
    event.preventDefault(); if (!buy.open || sending) return;
    try {
      $('pantry-buy-error').hidden = true;
      const row = buyingProduct || liveRow(buyingId); if (!row) throw new Error('Dieser Vorrat wurde inzwischen entfernt.');
      const storeId = buyer.elements.storeId.value, quantity = positive(buyer.elements.quantity.value), unit = buyer.elements.unit.value.trim();
      if (quantity > 1000000 || !unit || unit.length > 30) throw new Error('Bitte Menge und Einheit prüfen.');
      if (storeId && !getStores().some(store => store.id === storeId)) throw new Error('Bitte ein verfügbares Geschäft wählen.');
      if (!buyingProduct && pantryOnList(row, getData().items || [], storeId)) { updateBuy(); return; }
      if (scope !== getScope()) throw new Error('Die Datenverbindung hat sich geändert. Bitte erneut öffnen.');
      sending = true; updateBuy(); onBuy([{ name: row.name, quantity, unit, category: itemCategory(row), imageKey: row.imageKey || null }], storeId); lastBuyStore = storeId; buy.close();
      if (buyingProduct) { $('product-picker-feedback').textContent = `${row.name}: ${quantity} ${unit} auf die Einkaufsliste gesetzt.`; $('product-picker-feedback').hidden = false; }
    } catch (error) { failure('pantry-buy-error', error); }
    finally { sending = false; updateBuy(); }
  });
  edit.addEventListener('close', () => { if (!edit.open) { baseline = null; onCancelImages(); } });
  manualPreview();
  return {
    buyProduct(product) { buyRow(product, true); },
    refresh() {
      if (getScope() !== scope) { scope = getScope(); baseline = null; buyingId = ''; buyingProduct = null; lastBuyStore = ''; edit.close(); buy.close(); search.value = ''; category.value = ''; status = 'all'; keepName = ''; form.reset(); manualPreview(); }
      if (edit.open && !liveRow(baseline?.id)) { onCancelImages(); edit.close(); }
      render(); if (buy.open) { renderBuyStores(); updateBuy(); }
    },
    open() {
      search.value = ''; category.value = ''; status = 'all'; render();
      $('pantry-title').focus({ preventScroll: true });
    }
  };
}
