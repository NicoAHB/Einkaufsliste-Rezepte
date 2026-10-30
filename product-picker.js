/* Produktauswahl als eigenes Fenster. Keine Händler-/Bilddienste: Fotos und Katalog liegen in der App.
   Änderungen gehen ausschließlich über die vorhandenen Speicher-Callbacks der App. */
import { CATEGORIES } from './categories.js';
import { GROCERY_PRODUCTS, filterProducts, ownProduct, productLibrary, selectedProducts } from './product-catalog.js';
import { PRODUCT_GROUP_IMAGES, groupImageFor, imageForProduct, paintProductImage } from './product-images.js';
import { productKey } from './prices.js';
import { pantryKey, pantryKeys } from './data.js';

const number = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3, useGrouping: false }).format(value);
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
const svg = name => {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = document.createElementNS(icon.namespaceURI, 'use');
  icon.classList.add('icon'); icon.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#i-${name}`); icon.append(use); return icon;
};

export function mountProductPicker({ getData, getStores, getScope, onAdd, onPantry, onFavorite }) {
  const $ = id => document.getElementById(id), dialog = $('product-picker-dialog'), form = $('product-picker-form');
  const search = $('product-picker-search'), category = $('product-picker-category'), store = $('product-picker-store'), grid = $('product-picker-list');
  const selection = new Map();
  const PAGE_SIZE = 96;
  let mode = 'all', scope = '', submitting = false, target = 'list', visibleLimit = PAGE_SIZE, chooseImage = null;
  const fail = error => { $('product-picker-error').textContent = error.message; $('product-picker-error').hidden = false; $('product-picker-error').scrollIntoView({ block: 'nearest' }); };
  const clearError = () => { $('product-picker-error').hidden = true; };
  const library = () => { const data = getData(); return productLibrary(data.history, data.favorites, data.pantry); };

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
    $('product-picker-add').textContent = count ? `${count} ${count === 1 ? 'Produkt' : 'Produkte'} ${target === 'pantry' ? 'in den Vorrat' : 'hinzufügen'}` : 'Produkte auswählen';
    $('product-picker-clear').hidden = !count;
    $('product-picker-selected').textContent = `Auswahl (${count})${target === 'list' ? ' · Mengen ändern' : ' ansehen'}`;
    $('product-picker-cart').hidden = !count;
    $('product-picker-count').disabled = !count;
    $('product-picker-count').setAttribute('aria-label', `${count} ausgewählt: ${target === 'list' ? 'Mengen ändern' : 'Auswahl ansehen'}`);
  }
  function renderCart() {
    const box = $('product-picker-cart-rows'); box.replaceChildren();
    for (const product of selection.values()) {
      const row = node('div', undefined, 'product-cart-row'), label = node('span', product.name);
      const qtyLabel = node('label'), qty = node('input'), unitLabel = node('label'), unit = node('input');
      qtyLabel.append(node('span', 'Menge', 'sr-only')); qty.value = product.quantity; qty.inputMode = 'decimal'; qty.maxLength = 16;
      qty.setAttribute('aria-label', `${product.name}: Menge`); qty.addEventListener('input', () => { product.quantity = qty.value; clearError(); updateAmount(product); }); qtyLabel.append(qty);
      unitLabel.append(node('span', 'Einheit', 'sr-only')); unit.value = product.unit; unit.maxLength = 30; unit.setAttribute('list', 'units');
      unit.setAttribute('aria-label', `${product.name}: Einheit`); unit.addEventListener('input', () => { product.unit = unit.value; clearError(); updateAmount(product); }); unitLabel.append(unit);
      const remove = node('button', undefined, 'icon-button product-cart-remove'); remove.type = 'button'; remove.setAttribute('aria-label', `${product.name}: Auswahl entfernen`); remove.append(svg('x'));
      remove.addEventListener('click', () => { selection.delete(product.id); renderCart(); renderProducts(); });
      if (target === 'list') row.append(label, qtyLabel, unitLabel, remove);
      else { row.classList.add('product-cart-simple'); row.append(label, remove); }
      box.append(row);
    }
    updateFooter();
  }
  function updateAmount(product) {
    const label = grid.querySelector(`.product-card[data-product="${CSS.escape(product.id)}"] .product-amount`);
    if (label) label.textContent = `${product.quantity} ${product.unit}`;
  }
  function renderProducts() {
    const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.dataset.productAction, focusId = focused?.dataset.product;
    // Die Bildauswahl zeigt immer die originalen Katalogmotive; eigene Bildänderungen dürfen
    // nicht die zur Auswahl stehenden Originale desselben Produkts ersetzen.
    const products = mode === 'groups' && target === 'image' ? PRODUCT_GROUP_IMAGES.map(image => ({ id: image.key, name: image.label, image, category: 'sonstiges', quantity: 1, unit: 'Stück', count: 0 })) : target === 'image' ? GROCERY_PRODUCTS : library();
    const visible = filterProducts(products, { mode: mode === 'groups' ? 'all' : mode, query: search.value, category: mode === 'groups' ? '' : category.value });
    const data = getData(), allItems = data.items || [], selectedStore = store.value;
    const available = pantryKeys(data.pantry), stockNames = new Set((data.pantry || []).filter(row => !row.deletedAt).map(row => pantryKey(row.name)));
    const exactOnList = new Map();
    for (const item of allItems) if (!item.deletedAt && !item.checked && item.storeId === selectedStore) exactOnList.set(productKey(item.name), item);
    // Neuer eigener Name ist ausdrücklich möglich, ohne eine unklare Schreibweise in ein bekanntes Produkt umzudeuten.
    if (target !== 'image' && !visible.length && ['all', 'own'].includes(mode) && search.value.trim().length >= 2) {
      const own = products.find(product => productKey(product.name) === productKey(search.value)) || ownProduct(search.value);
      if (!category.value || category.value === own.category) visible.push(own);
    }
    grid.replaceChildren();
    // Favoriten und häufige Käufe bleiben ein kompaktes Raster, auch wenn sie aus vielen Gängen stammen.
    const shown = visible.slice(0, visibleLimit);
    const groups = ['favorites', 'frequent', 'groups'].includes(mode) ? [{ label: mode === 'favorites' ? 'Deine Favoriten' : mode === 'groups' ? 'Passende Produktgruppen' : 'Oft auf deiner Liste' }] : CATEGORIES;
    for (const group of groups) {
      const matches = group.id ? shown.filter(product => product.category === group.id) : shown; if (!matches.length) continue;
      const section = node('section', undefined, 'product-group'), heading = node('h3', group.label), cards = node('div', undefined, 'product-grid');
      section.append(heading, cards); grid.append(section);
      for (const product of matches) {
        const chosen = selection.get(product.id), picked = target === 'image' ? product.image?.key === dialog.dataset.imageKey || product.id === dialog.dataset.imageKey : Boolean(chosen);
        const amount = chosen ? `${chosen.quantity} ${chosen.unit}` : `${number(product.quantity)} ${product.unit}`;
        const stocked = available.has(pantryKey(product.name));
        const card = node('div', undefined, `product-card${picked ? ' picked' : ''}`);
        card.dataset.product = product.id;
        const pick = node('button', undefined, 'product-pick'); pick.type = 'button'; pick.dataset.productAction = 'pick'; pick.dataset.product = product.id;
        pick.setAttribute('aria-pressed', String(picked)); pick.setAttribute('aria-label', target === 'image' ? `${product.name}: Bild auswählen` :
          target === 'pantry' ? `${product.name}: ${stocked ? 'bereits vorhanden' : picked ? 'Auswahl aufheben' : 'für Vorrat auswählen'}` : `${product.name}, ${amount}: ${picked ? 'Auswahl aufheben' : 'auswählen'}`);
        pick.disabled = target === 'pantry' && stocked;
        const check = node('span', undefined, 'product-picked'); check.append(svg('check')); check.hidden = !picked; check.setAttribute('aria-hidden', 'true');
        pick.append(photo(product), node('span', product.name, 'product-name'));
        if (target === 'list') pick.append(node('small', amount, 'product-amount'));
        pick.append(check);
        const inList = exactOnList.get(productKey(product.name));
        if (target === 'pantry' && stockNames.has(pantryKey(product.name))) pick.append(node('small', stocked ? 'Schon vorhanden' : 'Aufgebraucht', 'product-on-list'));
        else if (target === 'list' && inList) pick.append(node('small', `Auf Liste: ${number(inList.quantity)} ${inList.unit}`, 'product-on-list'));
        else if (product.own) pick.append(node('small', 'Eigener Artikel', 'product-on-list'));
        pick.addEventListener('click', () => {
          clearError();
          if (target === 'image') { try { chooseImage?.((product.image || imageForProduct(product)).key); dialog.close(); } catch (error) { fail(error); } return; }
          if (selection.has(product.id)) selection.delete(product.id); else selection.set(product.id, { ...product, quantity: number(product.quantity) });
          renderCart(); renderProducts();
        });
        const star = node('button', undefined, 'product-star'); star.type = 'button'; star.dataset.productAction = 'star'; star.dataset.product = product.id;
        star.setAttribute('aria-label', `${product.name}: ${product.favorite ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}`);
        star.setAttribute('aria-pressed', String(Boolean(product.favorite))); star.append(svg('star'));
        star.addEventListener('click', () => { try { clearError(); onFavorite(product); renderProducts(); } catch (error) { fail(error); } });
        card.append(pick); if (target !== 'image') card.append(star); cards.append(card);
      }
    }
    const count = visible.length;
    $('product-picker-status').textContent = count ? `${count} ${count === 1 ? 'Produkt' : 'Produkte'}${mode === 'favorites' ? ' in Favoriten' : mode === 'frequent' ? ' häufig gekauft' : ''}${count > visibleLimit ? ` · ${shown.length} angezeigt` : ''}` :
      search.value.trim() ? 'Keine passenden Produkte in dieser Auswahl.' : mode === 'favorites' ? target === 'pantry' ? 'Noch keine Favoriten. Tippe auf „Alle“ und merke Produkte mit dem Stern – auch was schon im Vorrat steht.' : 'Deine Favoriten sind noch leer. Merke Produkte mit dem Stern.' :
        mode === 'frequent' ? 'Hier erscheinen Produkte, die du mindestens zweimal eingetragen hast.' : mode === 'own' ? 'Hier findest du eure eigenen Artikel. Oder suche einen neuen Namen.' : 'Keine Produkte in dieser Kategorie.';
    $('product-picker-count').textContent = `${selection.size} ausgewählt`;
    $('product-picker-more').hidden = count <= visibleLimit;
    $('product-picker-more').textContent = `Weitere ${Math.min(PAGE_SIZE, Math.max(0, count - visibleLimit))} Produkte anzeigen`;
    category.hidden = mode === 'groups';
    for (const tab of dialog.querySelectorAll('[data-product-mode]')) tab.setAttribute('aria-pressed', String(tab.dataset.productMode === mode));
    updateFooter();
    if (focusId && focusKey) grid.querySelector(`[data-product-action="${focusKey}"][data-product="${CSS.escape(focusId)}"]`)?.focus({ preventScroll: true });
  }
  for (const group of CATEGORIES) category.add(new Option(group.label, group.id));
  search.addEventListener('input', () => { visibleLimit = PAGE_SIZE; clearError(); renderProducts(); });
  category.addEventListener('change', () => { visibleLimit = PAGE_SIZE; renderProducts(); });
  store.addEventListener('change', () => { clearError(); renderProducts(); });
  for (const tab of dialog.querySelectorAll('[data-product-mode]')) tab.addEventListener('click', () => { mode = tab.dataset.productMode; visibleLimit = PAGE_SIZE; clearError(); renderProducts(); });
  $('product-picker-more').addEventListener('click', () => { const firstNew = visibleLimit; visibleLimit += PAGE_SIZE; renderProducts(); grid.querySelectorAll('.product-pick')[firstNew]?.focus({ preventScroll: true }); });
  $('product-picker-clear').addEventListener('click', () => { selection.clear(); renderCart(); renderProducts(); });
  $('product-picker-count').addEventListener('click', () => { if (selection.size) { $('product-picker-cart').open = true; $('product-picker-cart').scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!dialog.open || submitting || !selection.size) return;
    try {
      clearError(); const selected = target === 'pantry' ? [...selection.values()] : selectedProducts(selection);
      if (target === 'list' && store.value && !getStores().some(shop => shop.id === store.value)) throw new Error('Dieses Geschäft wurde gelöscht. Bitte wähle ein anderes.');
      submitting = true; updateFooter();
      if (target === 'pantry') onPantry(selected); else onAdd(selected, store.value);
      selection.clear(); dialog.close();
    } catch (error) { fail(error); }
    finally { submitting = false; updateFooter(); }
  });
  dialog.addEventListener('close', () => { if (!dialog.open) { selection.clear(); chooseImage = null; renderCart(); clearError(); } });
  return {
    open(storeId = '', options = {}) {
      target = options.target || 'list'; chooseImage = options.onImage || null;
      dialog.dataset.target = target; dialog.dataset.imageKey = options.imageKey || '';
      scope = getScope(); selection.clear(); search.value = ''; category.value = ''; clearError(); visibleLimit = PAGE_SIZE;
      mode = target === 'image' ? (String(options.imageKey || '').startsWith('group-') ? 'groups' : 'all') : library().some(product => product.favorite) ? 'favorites' : 'all';
      if (target !== 'image' && ['all', 'favorites', 'frequent', 'own'].includes(options.mode)) mode = options.mode;
      $('product-picker-title').textContent = target === 'pantry' ? 'Vorrat auswählen' : target === 'image' ? 'Produktbild auswählen' : 'Produkte auswählen';
      $('product-picker-hint').textContent = target === 'pantry' ? 'Wähle aus, was ihr zu Hause habt. Mit dem Stern Favoriten merken; sie erscheinen beim nächsten Öffnen zuerst. Vorhandene Produkte sind gekennzeichnet.' :
        target === 'image' ? 'Ein Bild antippen. Für eigene Produkte passen auch die Gruppenbilder.' : 'Antippen zum Auswählen · Mit dem Stern als Favorit merken.';
      dialog.querySelector('.product-target').hidden = target !== 'list';
      dialog.querySelector('.product-picker-footer').hidden = target === 'image';
      for (const tab of dialog.querySelectorAll('[data-product-mode]')) tab.hidden = target === 'image' ? !['all', 'groups'].includes(tab.dataset.productMode) : tab.dataset.productMode === 'groups';
      renderStores(); store.value = getStores().some(shop => shop.id === storeId) ? storeId : '';
      renderCart(); renderProducts(); dialog.showModal(); dialog.scrollTop = 0;
      // Auf dem iPhone keine Tastatur beim Öffnen: Erst bewusst in die Suche tippen.
      dialog.querySelector('[data-close]')?.focus({ preventScroll: true });
    },
    refresh() {
      if (!dialog.open) return;
      if (getScope() !== scope) { dialog.close(); return; }
      renderStores(); renderProducts();
    },
    cancelImage() {
      if (dialog.open && target === 'image') dialog.close();
    }
  };
}
