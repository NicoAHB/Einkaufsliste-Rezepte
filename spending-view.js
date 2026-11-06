/* Ausgabenansicht: Person + Zeitraum, kompakte Einträge und freiwillige Auswertungen.
   Schreiben bleibt bei den App-Callbacks; offene Betrags-/Namensfelder werden nicht neu aufgebaut. */
import { UNASSIGNED, buyerKey, buyerNameOf, liveMembers, memberName } from './family.js';
import { compareTotals, dayLabel, filterPurchases, firstMonth, fullMonth, latestMonth, monthLabel, monthName, monthOf,
  periodBounds, possibleDuplicates, purchaseFrequency, purchaseValue, recentMonths, shiftMonth, spendingCsv, storeNameOf, summarizePeriod, validMonth, DEFAULT_NOTE,
  budgetSpent, diningKind, hasRating, isDining, RATING_MEANING } from './spending.js';
import { groupImageFor, imageByKey, imageForProduct, paintProductImage } from './product-images.js';
import { hasProductPrice, productPriceCents } from './product-prices.js';

const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const button = (label, click, cls = 'text-button') => { const el = node('button', label, cls); el.type = 'button'; el.addEventListener('click', click); return el; };
const euros = value => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const compactEuros = value => Math.abs(value) >= 1000000 ? `${Math.round(value / 100000)}k` : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(value / 100));
const shortDate = day => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${day}T12:00:00`));
// Produktbild eines Einkaufs (2.160): dieselbe Kachel wie in der Einkaufsliste (.item-thumb). Gespeichert ist die Bildkennung von damals;
// fehlt sie (Wünsche, sehr frühe Einträge), entscheidet wie in der Liste der Name. Lädt das Bild nicht, springt die Gruppe ein.
const productThumb = product => {
  const box = node('span', undefined, 'item-thumb spend-product-thumb'), picture = node('span'); box.setAttribute('aria-hidden', 'true'); picture.setAttribute('aria-hidden', 'true');
  const image = imageByKey(product.imageKey) || imageForProduct({ name: product.name, category: product.category });
  if (image) box.append(paintProductImage(picture, image, groupImageFor(product.name, product.category))); else { box.classList.add('wish-no-image'); box.append(svgIcon('box')); }
  return box;
};
const svgIcon = name => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#i-${name}`); svg.append(use); return svg; };

export function mountSpending({ getData, getScope, getMonth, setMonth, today, getOwn, onEdit, onBudget, onMemberSave, onMemberArchive, onMemberDelete, onProductPrice, onExport, onMessage, productImages, getDiningCounts = () => true }) {
  // Aufgeklappter Einkauf (2.160): höchstens einer; ein zweiter Tipp oder das Aufklappen eines anderen schließt ihn
  let expanded = '';
  // Preis nachtragen (2.163): höchstens ein Produkt hat seinen Preisbereich offen; die Eingabe überlebt ein Neuzeichnen (Abgleich im Hintergrund)
  let priceOpen = '', priceDraft = null, pendingRender = false;
  const typingPrice = () => Boolean(document.activeElement?.closest?.('#purchase-list .spend-price-form'));
  const closePrice = () => {
    if (!priceOpen) return;
    priceOpen = ''; priceDraft = null;
    for (const form of document.querySelectorAll('#purchase-list .spend-price-form')) {
      const row = form.closest('.spend-product'); row?.classList.remove('price-open'); row?.querySelector('.spend-price-toggle')?.setAttribute('aria-expanded', 'false'); form.remove();
    }
  };
  const setOpen = (li, open) => { li.classList.toggle('open', open); li.querySelector('.spend-row').setAttribute('aria-expanded', String(open)); li.querySelector('.spend-products').hidden = !open; };
  const toggle = li => {
    const open = !li.classList.contains('open');
    closePrice();
    for (const other of li.parentElement.querySelectorAll('.spend-item.open')) if (other !== li) setOpen(other, false);
    setOpen(li, open); expanded = open ? li.dataset.id : '';
    if (open) li.scrollIntoView({ block: 'nearest' });
  };
  const $ = id => document.getElementById(id), rangeDialog = $('spending-period-dialog'), rangeForm = $('spending-period-form');
  const membersDialog = $('members-dialog'), memberForm = $('member-form');
  let range = null, person = 'all', analysis = 'expenses', scope = getScope(), editingMember = '', editingName = '', returnSelect = null;
  const period = () => range || getMonth();
  const data = () => getData(), rows = () => (data().purchases || []).filter(row => !row.deletedAt), members = () => liveMembers(data().members);
  const fail = (id, error) => { $(id).textContent = error.message; $(id).hidden = false; };
  const entriesLabel = summary => [summary.purchaseCount || !summary.dining.count ? plural(summary.purchaseCount, 'Einkauf', 'Einkäufe') : '', summary.dining.count ? `${summary.dining.count}× auswärts` : '',
    summary.refundCount ? plural(summary.refundCount, 'Rückerstattung', 'Rückerstattungen') : ''].filter(Boolean).join(' · ');
  const dateText = day => day === today() ? 'Heute' : day.slice(0, 4) === today().slice(0, 4) ? dayLabel(day) : shortDate(day);
  const nameFor = id => id === UNASSIGNED ? 'Nicht zugeordnet' : members().find(row => row.id === id)?.name || buyerNameOf(rows().find(row => row.buyerId === id) || { buyerId: id }, members());
  function chooseMonth(month) { if (!validMonth(month)) return; setMonth(month); range = null; render(); }
  function choosePeriod(value) {
    const bounds = periodBounds(value), month = fullMonth(bounds);
    if (month) { setMonth(month); range = null; } else { range = bounds; setMonth(monthOf(bounds.to)); }
    render();
  }
  function choosePerson(id) { person = id; render(); }
  function resetMemberForm() {
    editingMember = ''; editingName = ''; memberForm.reset(); $('member-form-label').textContent = 'Person hinzufügen';
    memberForm.querySelector('button').textContent = 'Hinzufügen'; $('member-cancel-edit').hidden = true;
  }
  function fillBuyer(select, value = select.value, fallbackName = '') {
    const own = getOwn(), list = members().filter(row => !row.archived || row.id === value || row.id === own?.id).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (own && !list.some(row => row.id === own.id)) list.unshift(own);
    select.replaceChildren(new Option('Nicht zugeordnet', ''));
    for (const member of list) select.add(new Option(`${member.name}${member.archived ? ' (ausgeblendet)' : ''}`, member.id));
    if (value && !list.some(row => row.id === value)) select.add(new Option(fallbackName || 'Unbekannte Person', value));
    select.value = value || '';
  }
  function renderMembers() {
    const active = $('members-list'), archived = $('members-archived-list'); active.replaceChildren(); archived.replaceChildren();
    const list = members().sort((a, b) => a.name.localeCompare(b.name, 'de'));
    // Löschen (2.162): nur Personen ohne einen einzigen Einkauf (auch keinen gelöschten) und nicht die eigene Person; wer Einträge hat, wird ausgeblendet
    const used = new Set((data().purchases || []).map(row => row.buyerId).filter(Boolean)), ownId = getOwn()?.id;
    if (!list.some(row => !row.archived)) active.append(node('li', 'Noch keine Personen gespeichert. Beim ersten Einkauf wird dein Name übernommen.', 'empty'));
    for (const member of list) {
      const row = node('li'), label = node('span', member.name), actions = node('div', undefined, 'member-actions');
      const edit = button(undefined, () => {
        editingMember = member.id; editingName = member.name; memberForm.elements.name.value = member.name;
        $('member-form-label').textContent = 'Name ändern'; memberForm.querySelector('button').textContent = 'Speichern';
        $('member-cancel-edit').hidden = false; $('members-error').hidden = true; memberForm.elements.name.focus();
      }, 'icon-button member-edit'); edit.append(svgIcon('edit')); edit.setAttribute('aria-label', `${member.name}: Name ändern`); edit.title = 'Name ändern';   // Stift wie bei den Einkäufen (2.163): alle Knöpfe passen neben den Namen
      const archive = button(member.archived ? 'Einblenden' : 'Ausblenden', () => {
        try { $('members-error').hidden = true; onMemberArchive(member.id, !member.archived); } catch (error) { fail('members-error', error); }
      }, 'text-button'); archive.setAttribute('aria-label', `${member.name}: ${member.archived ? 'einblenden' : 'ausblenden'}`);
      actions.append(edit, archive);
      if (!used.has(member.id) && member.id !== ownId) {
        const remove = button(undefined, () => {
          $('members-error').hidden = true;
          Promise.resolve().then(() => onMemberDelete(member.id)).catch(error => fail('members-error', error));
        }, 'icon-button member-delete'); remove.append(svgIcon('trash')); remove.setAttribute('aria-label', `${member.name} löschen`);
        actions.append(remove);
      }
      row.append(label, actions); (member.archived ? archived : active).append(row);
    }
    $('members-archived').hidden = !list.some(row => row.archived);
  }
  /* Ein Produkt eines Einkaufs (2.160): wie in der Einkaufsliste der Name, darunter klein die Menge, das Bild rechts. Seit 2.163 steht ganz rechts
     ein Pfeil: Er klappt darunter „Preis nachtragen“ auf (nochmals tippen schließt). Ein gespeicherter Preis steht unter der Menge, mit „Angebot“. */
  const priceKey = (purchaseId, index) => `${purchaseId}:${index}`;
  function productRow(entry, product, index, pictures) {
    const key = priceKey(entry.id, index), open = priceOpen === key, priced = hasProductPrice(product);
    const row = node('li', undefined, `spend-product${open ? ' price-open' : ''}${priced ? ' priced' : ''}`), line = node('div', undefined, 'spend-product-line'), text = node('span', undefined, 'spend-product-text');
    text.append(node('span', product.name, 'spend-product-name'));
    if (product.amount) text.append(node('span', product.amount, 'spend-product-amount'));
    if (priced) {
      const price = node('span', undefined, 'spend-product-price'); price.append(node('strong', euros(product.cents)));
      if (product.offer) price.append(node('span', 'Angebot', 'offer-tag'));
      text.append(price);
    }
    line.append(text); if (pictures) line.append(productThumb(product));
    const toggle = button(undefined, () => {
      const opening = priceOpen !== key; closePrice();
      if (opening) { priceOpen = key; row.classList.add('price-open'); toggle.setAttribute('aria-expanded', 'true'); row.append(priceForm(entry, product, index)); }
    }, 'icon-button spend-price-toggle');
    toggle.append(svgIcon('down')); toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', priced ? `${product.name}: Preis ${euros(product.cents)}${product.offer ? ', Angebot' : ''} ändern oder löschen` : `${product.name}: Preis nachtragen`);
    line.append(toggle); row.append(line);
    if (open) row.append(priceForm(entry, product, index));
    return row;
  }
  // Preisbereich: Betrag in Euro (Zahlentastatur, Komma erlaubt), Häkchen „Angebot“, „Speichern“; mit gespeichertem Preis auch „Preis löschen“.
  // Geschäft, Datum und Produkt stehen schon am Einkauf und werden nicht abgefragt.
  function priceForm(entry, product, index) {
    const key = priceKey(entry.id, index), draft = priceDraft?.key === key ? priceDraft : null, priced = hasProductPrice(product), id = `spend-price-${entry.id}-${index}`;
    const form = node('form', undefined, 'spend-price-form'); form.noValidate = true; form.id = id; form.setAttribute('aria-label', `Preis für ${product.name}`);
    const input = node('input'); input.name = 'price'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.enterKeyHint = 'done'; input.maxLength = 12; input.placeholder = '0,00';
    input.value = draft ? draft.value : priced ? (product.cents / 100).toFixed(2).replace('.', ',') : '';
    const field = node('label', undefined, 'spend-price-field'), money = node('span', undefined, 'spend-price-money');
    money.append(input, node('span', '€', 'spend-price-euro'));
    field.append(node('span', product.amount ? `Bezahlt für ${product.amount}` : 'Bezahlter Preis', 'spend-price-label'), money);
    const offer = node('label', undefined, 'checkbox-label spend-price-offer'), box = node('input'); box.type = 'checkbox'; box.name = 'offer';
    box.checked = draft ? draft.offer : product.offer === true; offer.append(box, document.createTextNode('Angebot'));
    const fields = node('div', undefined, 'spend-price-fields'); fields.append(field, offer);
    const error = node('p', undefined, 'dialog-error spend-price-error'); error.id = `${id}-error`; error.hidden = true; error.setAttribute('role', 'alert'); input.setAttribute('aria-describedby', error.id);
    const save = node('button', 'Speichern', 'spend-price-save'); save.type = 'submit';
    const actions = node('div', undefined, 'spend-price-actions'); actions.append(save);
    const store = (price) => {
      try {
        onProductPrice(entry.id, index, product.name, price);
        priceOpen = ''; priceDraft = null; document.activeElement?.blur?.(); render(true);
      } catch (problem) { error.textContent = problem.message; error.hidden = false; }
    };
    if (priced) actions.append(button('Preis löschen', () => store(null), 'text-button spend-price-remove'));
    const remember = () => { priceDraft = { key, value: input.value, offer: box.checked }; error.hidden = true; };
    input.addEventListener('input', remember); box.addEventListener('change', remember);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try { store({ cents: productPriceCents(input.value), offer: box.checked }); } catch (problem) { error.textContent = problem.message; error.hidden = false; input.focus({ preventScroll: true }); }
    });
    form.append(node('p', priced ? 'Preis ändern' : 'Preis nachtragen', 'spend-price-title'), fields, error, actions);
    return form;
  }
  function openMembers(select = null) {
    returnSelect = select; resetMemberForm(); $('members-error').hidden = true; renderMembers(); membersDialog.showModal(); membersDialog.scrollTop = 0;
    membersDialog.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function refresh() {
    if (getScope() !== scope) {
      scope = getScope(); person = 'all'; analysis = 'expenses'; range = null; setMonth(monthOf(today())); resetMemberForm();
      membersDialog.close(); rangeDialog.close(); $('purchase-dialog').close(); $('dining-dialog').close(); $('finish-dialog').close(); $('budget-dialog').close(); $('spending-details').open = false; $('purchase-details').open = true;
    }
    for (const id of ['purchase-form', 'dining-form', 'finish-form']) {
      const form = $(id); if (form.closest('dialog').open) {
        const selected = form.elements.buyerId.value, row = rows().find(row => row.id === form.elements.rowId?.value);
        fillBuyer(form.elements.buyerId, selected, row?.buyerName || '');
        if (id !== 'finish-form' && form.elements.rowId.value && !row) { form.closest('dialog').close(); onMessage('Dieser Eintrag wurde inzwischen entfernt.'); }
      }
    }
    if (membersDialog.open) renderMembers();
  }
  function renderPeopleFilters(summary) {
    const box = $('spending-person-filter'), allNames = new Map(members().filter(row => !row.archived).map(row => [row.id, row.name]));
    box.setAttribute('aria-label', analysis === 'frequency' ? 'Einkäufe nach Person filtern' : 'Ausgaben nach Person filtern');
    const own = getOwn(); if (own) allNames.set(own.id, own.name);
    for (const entry of summary.byPerson) allNames.set(entry.id, entry.name);
    if (person !== 'all' && !allNames.has(person)) allNames.set(person, nameFor(person));
    box.replaceChildren();
    const add = (id, name) => { const el = button(name, () => choosePerson(id), 'chip'); el.setAttribute('aria-pressed', String(person === id)); el.dataset.person = id; box.append(el); };
    add('all', 'Alle');
    for (const [id, name] of [...allNames].sort((a, b) => (a[0] === own?.id ? -1 : b[0] === own?.id ? 1 : a[1].localeCompare(b[1], 'de')))) add(id, name);
  }
  function renderPeople(summary) {
    $('spending-people-card').hidden = person !== 'all' || !summary.count;
    const list = $('spending-people'); list.replaceChildren();
    for (const member of summary.byPerson) {
      const li = node('li'), row = button(undefined, () => choosePerson(member.id), 'spend-person-row'), avatar = node('span', member.id === UNASSIGNED ? '?' : member.name.split(/\s+/).map(part => [...part][0]).slice(0, 2).join('').toUpperCase(), 'person-avatar');
      avatar.setAttribute('aria-hidden', 'true');
      const text = node('span', undefined, 'person-copy'); text.append(node('strong', member.name), node('small', plural(member.count, 'Eintrag', 'Einträge')));
      row.dataset.person = member.id; row.setAttribute('aria-label', `${member.name}: ${euros(member.total)}, Einträge anzeigen`);
      row.append(avatar, text, node('span', euros(member.total), 'person-amount')); li.append(row); list.append(li);
    }
  }
  function renderChart(allRows, month) {
    const box = $('spending-chart'); box.replaceChildren(); $('spending-chart-card').hidden = !month;
    if (!month) return;
    const selected = allRows.filter(row => person === 'all' || buyerKey(row) === person), months = recentMonths(selected, month, 6), top = Math.max(1, ...months.map(row => Math.abs(row.total))), negatives = months.some(row => row.total < 0);
    box.classList.toggle('has-negative', negatives);
    for (const entry of months) {
      const li = node('li'), column = button(undefined, () => chooseMonth(entry.month)), track = node('span', undefined, 'track'), bar = node('span', undefined, 'bar');
      column.title = `${monthLabel(entry.month)}: ${euros(entry.total)}`; column.setAttribute('aria-label', column.title);
      if (entry.month === month) column.setAttribute('aria-current', 'true');
      column.classList.toggle('negative', entry.total < 0);
      bar.style.height = `${entry.total ? Math.max(3, Math.round(Math.abs(entry.total) / top * (negatives ? 38 : 80))) : 2}px`; track.append(bar);
      column.append(node('span', entry.total ? compactEuros(entry.total) : '', 'value'), track, node('span', entry.label)); li.append(column); box.append(li);
    }
  }
  function renderStores(summary, type='stores', groups=summary.byStore) {
    $( `spending-${type}-card` ).hidden = type==='stores' ? groups.length<2 : !groups.length;
    const box = $(`spending-${type}`); box.replaceChildren(); const max = Math.max(1, ...groups.map(row => Math.abs(row.total)));
    for (const group of groups) {
      const li = node('li', undefined, 'spend-store'), head = node('div', undefined, 'spend-store-head'), track = node('div', undefined, 'spend-share'), bar = node('span');
      head.append(node('strong', type==='notes'&&group.name==='Ohne Notiz'?'Ohne Kategorie':group.name), node('span', euros(group.total))); bar.style.width = `${Math.max(2, Math.round(Math.abs(group.total) / max * 100))}%`; track.append(bar);
      li.append(head, track, node('small', plural(group.count, 'Eintrag', 'Einträge'))); box.append(li);
    }
  }
  function renderFrequency(allRows) {
    const result = purchaseFrequency(allRows, period(), data().stores || [], person), list = $('spending-frequency-stores');
    $('spending-frequency-summary').textContent = `${plural(result.count, 'Einkauf', 'Einkäufe')} im gewählten Zeitraum`;
    list.replaceChildren();
    const max = Math.max(1, ...result.byStore.map(store => store.count));
    for (const store of result.byStore) {
      const li = node('li', undefined, 'spend-store'), head = node('div', undefined, 'spend-store-head');
      const track = node('div', undefined, 'spend-share'), bar = node('span');
      li.dataset.storeId = store.id; track.setAttribute('aria-hidden', 'true');
      head.append(node('strong', store.name), node('span', plural(store.count, 'Einkauf', 'Einkäufe')));
      bar.style.width = `${store.count * 100 / max}%`; track.append(bar); li.append(head, track); list.append(li);
    }
    if (!result.byStore.length) list.append(node('li', 'Noch keine Geschäfte oder Einkäufe vorhanden.', 'empty'));
  }
  /* Restaurant/Café/Bar (2.170): eigene Karte, ob die Beträge zum Budget zählen oder nicht. Oben Summe, Zahl der Besuche und Durchschnitt,
     darunter der Anteil an allen Ausgaben des Zeitraums und je Art (nur bei mehr als einer). Die Liste zeigt auf einen Blick Wann, Wo und
     Wie teuer; ein Tipp öffnet den Eintrag zum Ändern oder Löschen, lange halten und in den Mülleimer ziehen löscht wie bei Einkäufen. */
  function renderDining(summary, counts, twins) {
    const dining = summary.dining, card = $('spending-dining'), list = $('spending-dining-list');
    card.hidden = !dining.count; list.replaceChildren(); $('spending-dining-kinds').replaceChildren(); $('spending-dining-share').replaceChildren();
    if (!dining.count) return;
    $('spending-dining-total').textContent = euros(dining.total);
    $('spending-dining-meta').textContent = `${plural(dining.count, 'Besuch', 'Besuche')} · Ø ${euros(dining.average)}`;
    const note = $('spending-dining-budget'); note.dataset.counts = String(counts);
    note.textContent = counts ? 'Zählt zum Monatsbudget' : 'Zählt nicht zum Monatsbudget';
    if (dining.total < summary.total && summary.total > 0) {
      const percent = Math.round(dining.share * 100), track = node('div', undefined, 'spend-share'), bar = node('span');
      bar.style.width = `${Math.max(2, Math.min(100, percent))}%`; track.append(bar); track.setAttribute('aria-hidden', 'true');
      $('spending-dining-share').append(node('small', `${percent} % ${person === 'all' ? 'eurer' : 'der'} Ausgaben in diesem Zeitraum`), track);
    }
    if (dining.byKind.length > 1) {
      const max = Math.max(1, ...dining.byKind.map(kind => kind.total));
      for (const kind of dining.byKind) {
        const li = node('li', undefined, 'spend-store'), head = node('div', undefined, 'spend-store-head'), track = node('div', undefined, 'spend-share'), bar = node('span');
        head.append(node('strong', `${kind.emoji} ${kind.label}`), node('span', euros(kind.total))); bar.style.width = `${Math.max(2, Math.round(kind.total / max * 100))}%`; track.append(bar);
        li.append(head, track, node('small', plural(kind.count, 'Besuch', 'Besuche'))); $('spending-dining-kinds').append(li);
      }
    }
    for (const entry of dining.list) {
      const kind = diningKind(entry), place = entry.storeName?.trim() || '', buyer = buyerNameOf(entry, members()), when = [dateText(entry.date), entry.time ? `${entry.time} Uhr` : ''].filter(Boolean).join(', ');
      const li = node('li', undefined, 'dining-item'), row = button(undefined, () => onEdit(entry.id), 'dining-row'), copy = node('span', undefined, 'dining-copy');
      li.dataset.id = entry.id;
      const badge = node('span', kind.emoji, `dining-badge dining-${kind.id}`); badge.setAttribute('aria-hidden', 'true');
      // Bewertung (2.174): klein neben dem Lokalnamen
      const name = node('strong', place || kind.label);
      if (hasRating(entry)) { const stars = node('span', undefined, 'dining-stars-small'); stars.append(node('span', '★'.repeat(entry.rating), 'stars-on'), node('span', '☆'.repeat(5 - entry.rating), 'stars-off')); stars.setAttribute('aria-hidden', 'true'); name.append(' ', stars); }
      copy.append(name, node('small', [when, place ? kind.label : '', buyer, twins.has(entry.id) ? 'Doppelt?' : ''].filter(Boolean).join(' · ')));
      const edit = svgIcon('edit'); edit.classList.add('dining-edit');
      row.append(badge, copy, node('span', euros(entry.cents), 'spend-amount'), edit);
      row.setAttribute('aria-label', `${when}, ${place || kind.label}${place ? ` (${kind.label})` : ''}${hasRating(entry) ? `, ${entry.rating} von 5 Sternen (${RATING_MEANING[entry.rating]})` : ''}, ${buyer}, ${euros(entry.cents)}${twins.has(entry.id) ? ', möglicherweise doppelt erfasst' : ''}: bearbeiten`);
      li.append(row); list.append(li);
    }
  }
  /* Neu zeichnen. Während jemand einen Produktpreis eintippt (Fokus im Preisbereich), wartet die Liste, damit Tastatur und Eingabe bleiben;
     sie wird nachgeholt, sobald der Fokus den Bereich verlässt. `force`: nach dem eigenen Speichern sofort. */
  function render(force = false) {
    if (!force && getScope() === scope && typingPrice()) { pendingRender = true; return; }
    pendingRender = false;
    refresh(); if ($('spending').hidden) return;
    const frequency = analysis === 'frequency'; $('spending-analysis').value = analysis;
    const allRows = rows(), shops = (data().stores || []).filter(row => !row.deletedAt), month = fullMonth(period()), now = monthOf(today());
    const family = summarizePeriod(allRows, period(), shops, members()), current = summarizePeriod(allRows, period(), shops, members(), person);
    const bounds = periodBounds(period());
    $('month-label').textContent = month ? monthLabel(month) : `${shortDate(bounds.from)} – ${shortDate(bounds.to)}`;
    $('month-prev').hidden = $('month-next').hidden = !month;
    $('month-prev').disabled = getMonth() <= firstMonth(allRows, now); $('month-next').disabled = getMonth() >= latestMonth(allRows, now);
    $('month-today').hidden = Boolean(month && month === now);
    renderPeopleFilters(family); renderPeople(family);
    if (frequency) $('spending-people-card').hidden = true;
    const none = !allRows.length; $('spending-empty').hidden = frequency || !none;
    for (const id of ['spending-summary', 'purchase-details', 'spending-details']) $(id).hidden = frequency || none;
    $('spending-budget').hidden = frequency || person !== 'all' || !month;
    $('spending-frequency').hidden = !frequency;
    if (frequency) renderFrequency(allRows);
    const diningOn = getDiningCounts();
    if (person === 'all' && month) onBudget(budgetSpent(current, diningOn), { total: current.dining.total, counts: diningOn });
    const summary = $('spending-summary'); summary.replaceChildren();
    const label = person === 'all' ? 'Familie insgesamt' : `${nameFor(person)} · Ausgaben`;
    summary.append(node('span', label, 'spend-label'), node('strong', euros(current.total), 'spend-total'), node('small', entriesLabel(current)));
    if (current.dining.count) summary.append(node('small', `davon Restaurant/Café/Bar: ${euros(current.dining.total)}`, 'spend-summary-dining'));
    if (current.refundCount) summary.append(node('small', `${euros(current.refunds)} Rückerstattungen abgezogen`));
    if (month) {
      const before = shiftMonth(month, -1), previous = summarizePeriod(allRows, before, shops, members(), person);
      if (previous.count) {
        if (month === now) summary.append(node('small', `Vormonat insgesamt: ${euros(previous.total)}`));
        else { const diff = compareTotals(current.total, previous.total); summary.append(node('small', diff.diff ? `${euros(Math.abs(diff.diff))} ${diff.diff > 0 ? 'mehr' : 'weniger'} als im ${monthName(before)}` : `Genau so viel wie im ${monthName(before)}`)); }
      }
    }
    // Restaurant/Café/Bar steht in der eigenen Karte, nicht noch einmal in der Liste der Einkäufe (2.170)
    const shopping = current.list.filter(entry => !isDining(entry)), twins = possibleDuplicates(filterPurchases(allRows, period()));
    const count = $('purchase-count'); count.textContent = plural(shopping.length, 'Eintrag', 'Einträge');
    $('spending-dining').hidden = true; if (!frequency) renderDining(current, diningOn, twins);
    renderChart(allRows, month); renderStores(current); renderStores(current,'notes',current.byNote);
    $('spending-breakdown').textContent = `${euros(current.gross)} Einkäufe${current.dining.count ? ` + ${euros(current.dining.total)} Restaurant/Café/Bar` : ''} − ${euros(current.refunds)} Rückerstattungen = ${euros(current.total)}. ${current.purchaseCount ? `Ø ${euros(current.average)} pro Einkauf.` : ''}`;
    const list = $('purchase-list'); list.replaceChildren();
    if (!shopping.length && !none) list.append(node('li', current.dining.count ? 'Keine Einkäufe in diesem Zeitraum. Restaurant, Café und Bar stehen in der eigenen Übersicht.' : 'Für diese Person und diesen Zeitraum gibt es keine Einträge.', 'empty'));
    /* Jede Zeile (2.160): oben Betrag und Kaufdatum wie bisher. Ein Tipp auf die Zeile oder den Pfeil klappt darunter die Produkte dieses
       Einkaufs auf (die bei „Einkauf beenden“ abgehakten Artikel); es ist immer nur ein Einkauf aufgeklappt. „Bearbeiten“ öffnet die Maske. */
    if (expanded && !shopping.some(entry => entry.id === expanded)) expanded = '';
    for (const entry of shopping) {
      const li = node('li', undefined, 'spend-item'), line = node('div', undefined, 'spend-line'), open = button(undefined, () => toggle(li), 'spend-row'), copy = node('span', undefined, 'spend-copy');
      li.dataset.id = entry.id;
      const products = Array.isArray(entry.items) ? entry.items : [];
      const store = storeNameOf(entry, shops), buyer = buyerNameOf(entry, members()), date = dateText(entry.date);
      copy.append(node('strong', store || (entry.kind === 'refund' ? 'Rückerstattung' : 'Einkauf')), node('small', [date, buyer, entry.kind === 'refund' ? 'Rückerstattung' : '', entry.note && entry.note !== DEFAULT_NOTE ? entry.note : '', products.length ? plural(products.length, 'Produkt', 'Produkte').replace(' ', '\u00a0') : '', twins.has(entry.id) ? 'Doppelt?' : ''].filter(Boolean).join(' · ')));
      const value = purchaseValue(entry), amount = node('span', euros(value), `spend-amount${entry.kind === 'refund' ? ' refund-amount' : ''}`), arrow = svgIcon('down');
      arrow.classList.add('spend-arrow');
      const panel = node('div', undefined, 'spend-products'); panel.id = `spend-products-${entry.id}`;
      if (products.length) {
        panel.append(node('p', `${plural(products.length, 'Produkt', 'Produkte')} aus diesem Einkauf`, 'spend-products-head'));
        const items = node('ul', undefined, 'spend-product-list');
        const pictures = productImages?.() !== false;
        products.forEach((product, index) => items.append(productRow(entry, product, index, pictures)));
        panel.append(items);
      } else panel.append(node('p', 'Zu diesem Einkauf sind keine Produkte gespeichert. Sie werden zugeordnet, wenn du sie „Im Laden“ abhakst und bei „Einkauf beenden“ den Betrag speicherst.', 'hint spend-products-empty'));
      open.setAttribute('aria-label', `${date}, ${store || 'ohne Geschäft'}, ${buyer}, ${euros(value)}${twins.has(entry.id) ? ', möglicherweise doppelt erfasst' : ''}: Produkte ${products.length ? `(${products.length}) ` : ''}anzeigen`);
      open.setAttribute('aria-controls', panel.id);
      open.append(copy, amount, arrow);
      const edit = button(undefined, () => onEdit(entry.id), 'icon-button spend-edit'); edit.append(svgIcon('edit'));
      edit.setAttribute('aria-label', `${store || (entry.kind === 'refund' ? 'Rückerstattung' : 'Einkauf')} ${date} über ${euros(value)} bearbeiten`); edit.title = 'Bearbeiten';
      line.append(open, edit); li.append(line, panel); list.append(li);
      setOpen(li, entry.id === expanded);
    }
  }
  $('spending-analysis').addEventListener('change', event => { analysis = event.target.value === 'frequency' ? 'frequency' : 'expenses'; render(); });
  $('month-prev').addEventListener('click', () => chooseMonth(shiftMonth(getMonth(), -1)));
  $('month-next').addEventListener('click', () => chooseMonth(shiftMonth(getMonth(), 1)));
  $('month-today').addEventListener('click', () => chooseMonth(monthOf(today())));
  $('spending-period').addEventListener('click', () => {
    const bounds = periodBounds(period()); rangeForm.elements.from.value = bounds.from; rangeForm.elements.to.value = bounds.to;
    $('spending-period-error').hidden = true; rangeDialog.showModal(); rangeDialog.scrollTop = 0;
  });
  rangeForm.addEventListener('submit', event => { event.preventDefault(); try { choosePeriod({ from: rangeForm.elements.from.value, to: rangeForm.elements.to.value }); rangeDialog.close(); } catch (error) { fail('spending-period-error', error); } });
  for (const preset of rangeDialog.querySelectorAll('[data-spend-preset]')) preset.addEventListener('click', () => {
    const kind = preset.dataset.spendPreset;
    if (kind === 'year') choosePeriod({ from: `${today().slice(0, 4)}-01-01`, to: today() }); else chooseMonth(kind === 'last' ? shiftMonth(monthOf(today()), -1) : monthOf(today()));
    rangeDialog.close();
  });
  $('purchase-list').addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !typingPrice()) render(); }, 0));
  $('spending-members').addEventListener('click', () => openMembers());
  $('purchase-person-add').addEventListener('click', () => openMembers($('purchase-form').elements.buyerId));
  $('finish-person-add').addEventListener('click', () => openMembers($('finish-form').elements.buyerId));
  $('member-cancel-edit').addEventListener('click', resetMemberForm);
  memberForm.addEventListener('submit', event => {
    event.preventDefault(); try {
      $('members-error').hidden = true;
      const name = memberName(memberForm.elements.name.value);
      if (editingMember && name === editingName) { resetMemberForm(); return; }
      const id = onMemberSave(editingMember, name); resetMemberForm();
      if (returnSelect) { fillBuyer(returnSelect, id); membersDialog.close(); }
    } catch (error) { fail('members-error', error); }
  });
  membersDialog.addEventListener('close', () => { if (!membersDialog.open) { returnSelect = null; resetMemberForm(); } });
  $('spending-export').addEventListener('click', async () => {
    try {
      const csv = spendingCsv(filterPurchases(rows(), period(), person), (data().stores || []).filter(row => !row.deletedAt), members()), bounds = periodBounds(period());
      await onExport(csv, `sattplan-ausgaben-${bounds.from}-${bounds.to}.csv`);
    } catch (error) { onMessage(`Export nicht möglich: ${error.message}`); }
  });
  return { render, refresh, fillBuyer, defaultBuyer: () => getOwn()?.id || '', openMembers,
    reveal(fields) { setMonth(monthOf(fields.date)); range = null; if (person !== 'all') person = buyerKey(fields); },
    month: () => fullMonth(period()), selectMonth: chooseMonth };
}
