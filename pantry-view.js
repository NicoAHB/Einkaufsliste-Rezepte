/* Vorratsoberfläche. Keine eigenen Speicherwege: Änderungen gehen über die App-Warteschlange.
   Geöffnete Formulare bleiben bei Abgleich erhalten und senden nur tatsächlich geänderte Felder. */
import { pantryKey, pantryKeys, pantryRows, positive } from './data.js';
import { CATEGORIES, categoryLabel, groupByCategory, itemCategory } from './categories.js';
import { GROCERY_PRODUCTS } from './product-catalog.js';
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

export function mountPantry({ getData, getScope, getStores, getPreferredStore, imagesOn, onChange, onRemove, onBuy, onProducts, onImages, onCancelImages, onShopping }) {
  const $ = id => document.getElementById(id), form = $('pantry-form'), search = $('pantry-search'), category = $('pantry-category');
  const edit = $('pantry-edit-dialog'), editor = $('pantry-edit-form'), buy = $('pantry-buy-dialog'), buyer = $('pantry-buy-form');
  let status = 'all', scope = getScope(), baseline = null, imageKey = null, buyingId = '', sending = false;
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
    const row = { name: form.elements.name.value }, preview = row.name.trim() ? picture(row) : node('span', undefined, 'pantry-photo pantry-photo-empty');
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
    const row = liveRow(buyingId); if (!row) { buy.close(); return; }
    $('pantry-buy-name').replaceChildren(picture(row), node('strong', row.name));
    const storeId = buyer.elements.storeId.value, missing = storeId && !getStores().some(store => store.id === storeId);
    const exists = pantryOnList(row, getData().items || [], storeId);
    $('pantry-buy-add').disabled = Boolean(exists || missing || sending);
    $('pantry-buy-add').textContent = exists ? 'Steht schon auf der Liste' : 'Auf die Einkaufsliste';
    if (missing) failure('pantry-buy-error', new Error('Dieses Geschäft wurde gelöscht. Bitte ein anderes wählen.'));
  }
  function buyRow(row) {
    scope = getScope(); buyingId = row.id; $('pantry-buy-error').hidden = true;
    const product = GROCERY_PRODUCTS.find(product => pantryKey(product.name) === pantryKey(row.name));
    buyer.elements.quantity.value = String(product?.quantity || 1).replace('.', ','); buyer.elements.unit.value = product?.unit || 'Stück';
    renderBuyStores(); buyer.elements.storeId.value = getStores().some(store => store.id === getPreferredStore()) ? getPreferredStore() : '';
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
  function render() {
    const inventory = pantryRows(rows()), available = inventory.filter(row => row.available !== false).length, out = inventory.length - available;
    const favorites = (getData().favorites || []).filter(row => !row.deletedAt).length;
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
        if (imagesOn()) main.append(picture(row));
        const text = node('span', undefined, 'pantry-entry-text'); text.append(node('span', row.name, 'pantry-name'), node('small', stocked ? 'Vorhanden' : 'Aufgebraucht', 'pantry-state')); main.append(text);
        const remove = button(undefined, `${row.name} aus dem Vorrat entfernen`, () => safe(() => onRemove(row.ids)), 'icon-button pantry-remove'); remove.append(icon('x'));
        entry.append(toggle, main, remove);
        if (!stocked) entry.append(button('Nachkaufen', `${row.name}: nachkaufen`, () => safe(() => buyRow(row)), 'secondary small pantry-restock'));
        list.append(entry);
      }
    }
    renderSuggestions();
  }
  for (const group of CATEGORIES) category.add(new Option(group.label, group.id));
  search.addEventListener('input', render); category.addEventListener('change', render);
  for (const tab of document.querySelectorAll('[data-pantry-filter]')) tab.addEventListener('click', () => { status = tab.dataset.pantryFilter; render(); });
  form.elements.name.addEventListener('input', manualPreview);
  form.addEventListener('submit', event => { event.preventDefault(); safe(() => { changes([form.elements.name.value]); form.reset(); manualPreview(); form.elements.name.focus(); }); });
  $('pantry-products').addEventListener('click', () => safe(onProducts));
  $('pantry-favorites').addEventListener('click', () => safe(() => onProducts('favorites')));
  $('pantry-to-list').addEventListener('click', onShopping);
  editor.elements.name.addEventListener('input', editPreview); editor.elements.category.addEventListener('change', editPreview);
  $('pantry-change-image').addEventListener('click', () => safe(() => onImages(imageKey || imageForProduct({ name: editor.elements.name.value, category: editor.elements.category.value }).key, key => { imageKey = key; editPreview(); })));
  $('pantry-auto-image').addEventListener('click', () => { imageKey = null; editPreview(); });
  editor.addEventListener('submit', event => {
    event.preventDefault(); if (!baseline || !edit.open) return;
    try {
      $('pantry-edit-error').hidden = true;
      const name = editor.elements.name.value.trim().replace(/\s+/g, ' '); if (!name || name.length > 120) throw new Error('Bitte einen Produktnamen mit 1 bis 120 Zeichen eingeben.');
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
      const row = liveRow(buyingId); if (!row) throw new Error('Dieser Vorrat wurde inzwischen entfernt.');
      const storeId = buyer.elements.storeId.value, quantity = positive(buyer.elements.quantity.value), unit = buyer.elements.unit.value.trim();
      if (quantity > 1000000 || !unit || unit.length > 30) throw new Error('Bitte Menge und Einheit prüfen.');
      if (storeId && !getStores().some(store => store.id === storeId)) throw new Error('Bitte ein verfügbares Geschäft wählen.');
      if (pantryOnList(row, getData().items || [], storeId)) { updateBuy(); return; }
      sending = true; updateBuy(); onBuy([{ name: row.name, quantity, unit, category: itemCategory(row), imageKey: row.imageKey || null }], storeId); buy.close();
    } catch (error) { failure('pantry-buy-error', error); }
    finally { sending = false; updateBuy(); }
  });
  edit.addEventListener('close', () => { if (!edit.open) { baseline = null; onCancelImages(); } });
  manualPreview();
  return {
    refresh() {
      if (getScope() !== scope) { scope = getScope(); baseline = null; buyingId = ''; edit.close(); buy.close(); search.value = ''; category.value = ''; status = 'all'; form.reset(); manualPreview(); }
      if (edit.open && !liveRow(baseline?.id)) { onCancelImages(); edit.close(); }
      render(); if (buy.open) { renderBuyStores(); updateBuy(); }
    },
    open() {
      search.value = ''; category.value = ''; status = 'all'; $('pantry-details').open = true; render();
      $('pantry-card').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };
}
