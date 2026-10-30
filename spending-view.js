/* Ausgabenansicht: Person + Zeitraum, kompakte Einträge und freiwillige Auswertungen.
   Schreiben bleibt bei den App-Callbacks; offene Betrags-/Namensfelder werden nicht neu aufgebaut. */
import { UNASSIGNED, buyerKey, buyerNameOf, liveMembers, memberName } from './family.js';
import { compareTotals, dayLabel, filterPurchases, firstMonth, fullMonth, latestMonth, monthLabel, monthName, monthOf,
  periodBounds, possibleDuplicates, purchaseValue, recentMonths, shiftMonth, spendingCsv, storeNameOf, summarizePeriod, validMonth, DEFAULT_NOTE } from './spending.js';

const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const button = (label, click, cls = 'text-button') => { const el = node('button', label, cls); el.type = 'button'; el.addEventListener('click', click); return el; };
const euros = value => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const compactEuros = value => Math.abs(value) >= 1000000 ? `${Math.round(value / 100000)}k` : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(value / 100));
const shortDate = day => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${day}T12:00:00`));

export function mountSpending({ getData, getScope, getMonth, setMonth, today, getOwn, onEdit, onBudget, onMemberSave, onMemberArchive, onExport, onMessage }) {
  const $ = id => document.getElementById(id), rangeDialog = $('spending-period-dialog'), rangeForm = $('spending-period-form');
  const membersDialog = $('members-dialog'), memberForm = $('member-form');
  let range = null, person = 'all', scope = getScope(), editingMember = '', editingName = '', returnSelect = null;
  const period = () => range || getMonth();
  const data = () => getData(), rows = () => (data().purchases || []).filter(row => !row.deletedAt), members = () => liveMembers(data().members);
  const fail = (id, error) => { $(id).textContent = error.message; $(id).hidden = false; };
  const entriesLabel = summary => [plural(summary.purchaseCount, 'Einkauf', 'Einkäufe'), summary.refundCount ? plural(summary.refundCount, 'Rückerstattung', 'Rückerstattungen') : ''].filter(Boolean).join(' · ');
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
    if (!list.some(row => !row.archived)) active.append(node('li', 'Noch keine Personen gespeichert. Beim ersten Einkauf wird dein Name übernommen.', 'empty'));
    for (const member of list) {
      const row = node('li'), label = node('span', member.name), actions = node('div', undefined, 'member-actions');
      const edit = button('Ändern', () => {
        editingMember = member.id; editingName = member.name; memberForm.elements.name.value = member.name;
        $('member-form-label').textContent = 'Name ändern'; memberForm.querySelector('button').textContent = 'Speichern';
        $('member-cancel-edit').hidden = false; $('members-error').hidden = true; memberForm.elements.name.focus();
      }, 'secondary small'); edit.setAttribute('aria-label', `${member.name}: Name ändern`);
      const archive = button(member.archived ? 'Einblenden' : 'Ausblenden', () => {
        try { $('members-error').hidden = true; onMemberArchive(member.id, !member.archived); } catch (error) { fail('members-error', error); }
      }, 'text-button'); archive.setAttribute('aria-label', `${member.name}: ${member.archived ? 'einblenden' : 'ausblenden'}`);
      actions.append(edit, archive); row.append(label, actions); (member.archived ? archived : active).append(row);
    }
    $('members-archived').hidden = !list.some(row => row.archived);
  }
  function openMembers(select = null) {
    returnSelect = select; resetMemberForm(); $('members-error').hidden = true; renderMembers(); membersDialog.showModal(); membersDialog.scrollTop = 0;
    membersDialog.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function refresh() {
    if (getScope() !== scope) {
      scope = getScope(); person = 'all'; range = null; setMonth(monthOf(today())); resetMemberForm();
      membersDialog.close(); rangeDialog.close(); $('purchase-dialog').close(); $('finish-dialog').close(); $('budget-dialog').close(); $('spending-details').open = false;
    }
    for (const id of ['purchase-form', 'finish-form']) {
      const form = $(id); if (form.closest('dialog').open) {
        const selected = form.elements.buyerId.value, row = rows().find(row => row.id === form.elements.id?.value);
        fillBuyer(form.elements.buyerId, selected, row?.buyerName || '');
        if (id === 'purchase-form' && form.elements.id.value && !row) { form.closest('dialog').close(); onMessage('Dieser Eintrag wurde inzwischen entfernt.'); }
      }
    }
    if (membersDialog.open) renderMembers();
  }
  function renderPeopleFilters(summary) {
    const box = $('spending-person-filter'), allNames = new Map(members().filter(row => !row.archived).map(row => [row.id, row.name]));
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
  function renderStores(summary) {
    $('spending-stores-card').hidden = summary.byStore.length < 2;
    const box = $('spending-stores'); box.replaceChildren(); const max = Math.max(1, ...summary.byStore.map(row => Math.abs(row.total)));
    for (const group of summary.byStore) {
      const li = node('li', undefined, 'spend-store'), head = node('div', undefined, 'spend-store-head'), track = node('div', undefined, 'spend-share'), bar = node('span');
      head.append(node('strong', group.name), node('span', euros(group.total))); bar.style.width = `${Math.max(2, Math.round(Math.abs(group.total) / max * 100))}%`; track.append(bar);
      li.append(head, track, node('small', plural(group.count, 'Eintrag', 'Einträge'))); box.append(li);
    }
  }
  function render() {
    refresh(); if ($('spending').hidden) return;
    const allRows = rows(), shops = (data().stores || []).filter(row => !row.deletedAt), month = fullMonth(period()), now = monthOf(today());
    const family = summarizePeriod(allRows, period(), shops, members()), current = summarizePeriod(allRows, period(), shops, members(), person);
    const bounds = periodBounds(period());
    $('month-label').textContent = month ? monthLabel(month) : `${shortDate(bounds.from)} – ${shortDate(bounds.to)}`;
    $('month-prev').hidden = $('month-next').hidden = !month;
    $('month-prev').disabled = getMonth() <= firstMonth(allRows, now); $('month-next').disabled = getMonth() >= latestMonth(allRows, now);
    $('month-today').hidden = Boolean(month && month === now);
    renderPeopleFilters(family); renderPeople(family);
    const none = !allRows.length; $('spending-empty').hidden = !none;
    for (const id of ['spending-summary', 'purchase-list', 'spending-details']) $(id).hidden = none;
    $('spending-budget').hidden = person !== 'all' || !month;
    if (person === 'all' && month) onBudget(current.total);
    const summary = $('spending-summary'); summary.replaceChildren();
    const label = person === 'all' ? 'Familie insgesamt' : `${nameFor(person)} · Ausgaben`;
    summary.append(node('span', label, 'spend-label'), node('strong', euros(current.total), 'spend-total'), node('small', entriesLabel(current)));
    if (current.refundCount) summary.append(node('small', `${euros(current.refunds)} Rückerstattungen abgezogen`));
    if (month) {
      const before = shiftMonth(month, -1), previous = summarizePeriod(allRows, before, shops, members(), person);
      if (previous.count) {
        if (month === now) summary.append(node('small', `Vormonat insgesamt: ${euros(previous.total)}`));
        else { const diff = compareTotals(current.total, previous.total); summary.append(node('small', diff.diff ? `${euros(Math.abs(diff.diff))} ${diff.diff > 0 ? 'mehr' : 'weniger'} als im ${monthName(before)}` : `Genau so viel wie im ${monthName(before)}`)); }
      }
    }
    const count = $('purchase-count'); count.textContent = current.count ? plural(current.count, 'Eintrag', 'Einträge') : '';
    renderChart(allRows, month); renderStores(current);
    $('spending-breakdown').textContent = `${euros(current.gross)} Einkäufe − ${euros(current.refunds)} Rückerstattungen = ${euros(current.total)}. ${current.purchaseCount ? `Ø ${euros(current.average)} pro Einkauf.` : ''}`;
    const list = $('purchase-list'); list.replaceChildren();
    if (!current.count && !none) list.append(node('li', 'Für diese Person und diesen Zeitraum gibt es keine Einträge.', 'empty'));
    const twins = possibleDuplicates(filterPurchases(allRows, period()));
    for (const entry of current.list) {
      const li = node('li', undefined, 'spend-item'), open = button(undefined, () => onEdit(entry.id), 'spend-row'), copy = node('span', undefined, 'spend-copy');
      li.dataset.id = entry.id;
      const store = storeNameOf(entry, shops), buyer = buyerNameOf(entry, members()), date = entry.date === today() ? 'Heute' : entry.date.slice(0, 4) === today().slice(0, 4) ? dayLabel(entry.date) : shortDate(entry.date);
      copy.append(node('strong', store || (entry.kind === 'refund' ? 'Rückerstattung' : 'Einkauf')), node('small', [date, buyer, entry.kind === 'refund' ? 'Rückerstattung' : '', entry.note && entry.note !== DEFAULT_NOTE ? entry.note : '', twins.has(entry.id) ? 'Doppelt?' : ''].filter(Boolean).join(' · ')));
      const value = purchaseValue(entry), amount = node('span', euros(value), `spend-amount${entry.kind === 'refund' ? ' refund-amount' : ''}`);
      open.setAttribute('aria-label', `${date}, ${store || 'ohne Geschäft'}, ${buyer}, ${euros(value)}${twins.has(entry.id) ? ', möglicherweise doppelt erfasst' : ''}: ändern`);
      open.append(copy, amount); li.append(open); list.append(li);
    }
  }
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
