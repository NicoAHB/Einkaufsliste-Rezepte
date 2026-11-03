/* Sichtbare Bedienhilfen und Speicherhinweise, ohne Änderung am Datenmodell. */
const byId = id => document.getElementById(id);
const clock = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
let feedbackScope = null;

export function resetSaveFeedback(scope) {
  if (scope === feedbackScope) return;
  feedbackScope = scope;
  document.querySelectorAll('[data-save-feedback]').forEach(node => { node.hidden = true; node.textContent = ''; });
}

export function confirmDataSave(ops) {
  const changed = new Set(ops.map(op => op.collection));
  for (const [id, collections, label] of [
    ['shopping-save-note', ['items', 'stores'], 'Einkaufsliste gespeichert'],
    ['shop-save-note', ['items'], 'Einkaufsliste gespeichert'],
    ['recipes-save-note', ['recipes', 'ingredients'], 'Rezepte gespeichert'],
    ['plan-save-note', ['meals'], 'Wochenplan gespeichert'],
    ['spending-save-note', ['purchases', 'budgets', 'members'], 'Ausgaben gespeichert']
  ]) {
    if (!collections.some(collection => changed.has(collection))) continue;
    const node = byId(id); node.textContent = `${label} · auf diesem Gerät um ${clock()} Uhr`; node.hidden = false;
  }
}

export function confirmFormSave(form, label = 'Änderungen übernommen') {
  const node = form?.querySelector('[data-form-feedback]');
  if (node) { node.textContent = `${label} · ${clock()}`; node.hidden = false; node.dataset.state = 'saved'; }
}

export function watchSaveForms() {
  for (const form of document.querySelectorAll('form[data-explicit-save]')) {
    const node = document.createElement('p'); node.className = 'form-feedback'; node.dataset.formFeedback = '';
    node.setAttribute('role', 'status'); node.hidden = true;
    const actions = form.querySelector('.meal-actions,.sheet-actions,.recipe-editor-actions,.edit-actions');
    (actions || form).append(node);
    const changed = () => {
      node.dataset.state = 'pending'; node.hidden = false;
      node.textContent = form.id === 'recipe-form' ? 'Entwurf – mit Speichern in die Rezepte übernehmen.' : 'Änderungen noch nicht übernommen.';
    };
    form.addEventListener('input', changed); form.addEventListener('change', changed);
    form.addEventListener('reset', () => { node.hidden = true; node.textContent = ''; });
  }
}

export function confirmAutoSave(source) {
  const card = source?.closest?.('[data-auto-save]');
  if (!card) return;
  const node = card.querySelector('[data-auto-feedback]');
  if (node) node.textContent = `Auf diesem Gerät gespeichert · ${clock()}`;
}

// Beim Wechsel bleibt die angetippte Überschrift an ihrer Bildschirmposition.
export function singleOpenAccordion(root, selector, onChange = () => {}) {
  let changing = false, restore = null;
  function apply(details, open) {
    if (changing) return;
    changing = true; restore?.();
    const summary = details.querySelector(':scope > summary');
    let scroller = summary.parentElement;
    while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    scroller ||= document.scrollingElement;
    const positions = new Map([...root.children].map(node => [node, node.getBoundingClientRect().top]));
    const before = summary.getBoundingClientRect().top, anchor = scroller.style.overflowAnchor, behavior = scroller.style.scrollBehavior;
    scroller.style.overflowAnchor = 'none'; scroller.style.scrollBehavior = 'auto';
    if (open) for (const other of root.querySelectorAll(selector)) if (other !== details) other.open = false;
    details.open = open;
    if (root.getClientRects().length) scroller.scrollTop += summary.getBoundingClientRect().top - before;
    // Am Seitenanfang lässt sich nicht weiter nach oben scrollen. Dort gleiten
    // die Überschriften an ihren neuen Platz, statt ruckartig zu verspringen.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for (const [node, top] of positions) {
      const delta = top - node.getBoundingClientRect().top;
      if (Math.abs(delta) > 1 && Math.abs(delta) < innerHeight * 3) node.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
    }
    onChange(); changing = false;
    let done = false;
    restore = () => { if (done) return; done = true; scroller.style.overflowAnchor = anchor; scroller.style.scrollBehavior = behavior; };
    const restoreForThisChange = restore;
    requestAnimationFrame(() => requestAnimationFrame(restoreForThisChange));
  }
  root.addEventListener('click', event => {
    const summary = event.target.closest('summary'), details = summary?.parentElement;
    if (!details?.matches(selector) || !root.contains(details)) return;
    if (event.target.closest('a,button,input,select,textarea')) return;
    event.preventDefault(); apply(details, !details.open);
  });
  root.addEventListener('toggle', event => {
    const details = event.target; if (!details.matches?.(selector) || changing) return;
    if (details.open && [...root.querySelectorAll(selector)].some(other => other !== details && other.open)) apply(details, true);
    else onChange();
  }, true);
}

let ordering = null;
export function openOrderControls(options) {
  ordering = options; byId('order-title').textContent = options.title;
  byId('order-feedback').textContent = ''; byId('order-error').hidden = true;
  drawOrder(); byId('order-dialog').showModal();
}
function drawOrder() {
  const list = byId('order-list'); list.replaceChildren();
  const rows = ordering.getRows();
  rows.forEach((row, index) => {
    const li = document.createElement('li'), name = document.createElement('span'); name.textContent = row.name; li.append(name);
    for (const [direction, symbol, label] of [[-1, '↑', 'nach oben'], [1, '↓', 'nach unten']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary order-arrow';
      button.textContent = symbol; button.setAttribute('aria-label', `${row.name} ${label}`);
      button.disabled = index + direction < 0 || index + direction >= rows.length;
      button.addEventListener('click', async () => {
        const session = ordering;
        try {
          if (!session || session.scope !== session.getScope()) throw new Error('Die Liste hat sich geändert. Bitte erneut öffnen.');
          const fresh = session.getRows(), at = fresh.findIndex(entry => entry.id === row.id), to = at + direction;
          if (at < 0 || to < 0 || to >= fresh.length) return;
          [fresh[at], fresh[to]] = [fresh[to], fresh[at]];
          await session.onChange(fresh.map(entry => entry.id));
          if (ordering !== session || !byId('order-dialog').open) return;
          drawOrder(); byId('order-feedback').textContent = `${row.name}: Position ${to + 1} von ${fresh.length}. Reihenfolge geändert.`;
          const moved = list.children[to]?.querySelectorAll('button')[direction < 0 ? 0 : 1];
          (moved?.disabled ? list.children[to]?.querySelector('button:not(:disabled)') : moved)?.focus({ preventScroll: true });
        } catch (error) { byId('order-error').textContent = error.message; byId('order-error').hidden = false; }
      });
      li.append(button);
    }
    list.append(li);
  });
}

/* Waagerecht scrollende Leisten (Geschäfte, Filter, Produktsammlungen): Ein weicher Rand zeigt, dass es links oder
   rechts weitergeht. Er erscheint nur, solange dort wirklich etwas verdeckt ist. */
export function scrollHints(selector = '.chips, .product-modes') {
  const update = node => {
    const hidden = node.scrollWidth - node.clientWidth > 1;
    node.classList.toggle('more-right', hidden && node.scrollLeft + node.clientWidth < node.scrollWidth - 1);
    node.classList.toggle('more-left', hidden && node.scrollLeft > 1);
  };
  const watched = new WeakSet(), resize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => update(entry.target))) : null;
  let queued = false;
  const attach = () => {
    queued = false;
    document.querySelectorAll(selector).forEach(node => {
      if (!watched.has(node)) { watched.add(node); node.addEventListener('scroll', () => update(node), { passive: true }); resize?.observe(node); }
      update(node);
    });
  };
  attach();
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(attach); } }).observe(document.body, { childList: true, subtree: true });
}
