/* Eine gemeinsame Geschäftsreihenfolge für Dialog, Einkauf, Vorrat und Im Laden.
   Alte Geschäfte behalten ohne sortOrder ihre bisherige Reihenfolge. */
export function orderedStores(rows) {
  return rows.filter(row => !row.deletedAt).map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.sortOrder ?? Infinity) - (b.row.sortOrder ?? Infinity) ||
      (a.row.sortOrder != null && b.row.sortOrder != null ? a.row.id.localeCompare(b.row.id) : a.index - b.index))
    .map(entry => entry.row);
}

// Ausgeblendete eigene Listen behalten ihren Platz, wenn nur sichtbare Reiter verschoben werden.
export function reorderedStoreIds(rows, visibleIds) {
  const current = orderedStores(rows).map(row => row.id), known = new Set(current);
  const moving = [...new Set(visibleIds)].filter(id => known.has(id)), selected = new Set(moving);
  let index = 0;
  return current.map(id => selected.has(id) ? moving[index++] : id);
}

/* Langes Halten aktiviert die Geste; eigene Griffe können mit `immediate`
   direkt reagieren. Normales Touch-Scrollen bleibt außerhalb der Griffe nativ.
   Abbruch stellt die ursprüngliche Reihenfolge wieder her; erst Loslassen speichert. */
export function mountStoreOrder(root, { horizontal = false, itemSelector, handleSelector = itemSelector,
  getVersion, onChange, announce, onError, scrollContainer = null, immediate = false, enabled = () => true, canDrag = () => true }) {
  let press = null, frame = 0, swallowUntil = 0;
  const items = () => [...root.querySelectorAll(itemSelector)];
  const ids = () => items().map(node => node.dataset.storeId);
  const coordinate = point => horizontal ? point.clientX : point.clientY;
  const scroller = scrollContainer || (horizontal ? root : root.closest('dialog') || root);
  const scrollValue = () => horizontal ? scroller.scrollLeft : scroller.scrollTop;
  const setScroll = value => { if (horizontal) scroller.scrollLeft = value; else scroller.scrollTop = value; };
  const label = node => node.getAttribute('aria-label') || node.textContent.trim();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function restore(order, trailing) {
    const nodes = items(), sorted = order.map(id => nodes.find(node => node.dataset.storeId === id)).filter(Boolean);
    for (const node of sorted) root.insertBefore(node, trailing);
  }
  function finish(commit = false) {
    if (!press) return;
    const ended = press; press = null;
    clearTimeout(ended.timer); cancelAnimationFrame(frame); frame = 0;
    root.removeEventListener('touchmove', dragTouch);
    root.classList.remove('stores-reordering'); ended.item.classList.remove('moving-store');
    if (!ended.touch && root.hasPointerCapture(ended.pointer)) root.releasePointerCapture(ended.pointer);
    if (!ended.active) return;
    if (immediate && commit && !ended.moved) return;
    swallowUntil = Date.now() + 800;
    const order = ids();
    if (!commit || ended.version !== getVersion()) {
      restore(ended.order, ended.trailing); setScroll(ended.scroll); announce('Verschieben abgebrochen.'); return;
    }
    try {
      if (!same(order, ended.order)) onChange(order);
      announce(`${label(ended.handle)}, Position ${order.indexOf(ended.item.dataset.storeId) + 1} von ${order.length}.`);
    } catch (error) { restore(ended.order, ended.trailing); setScroll(ended.scroll); onError(error); }
  }
  function place() {
    if (!press?.active || !press.moved) return;
    const next = items().filter(node => node !== press.item).find(node => {
      const rect = node.getBoundingClientRect();
      return press.position < (horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2);
    }) || press.trailing;
    if (press.item.nextElementSibling !== next) {
      const scroll = scrollValue(); root.insertBefore(press.item, next); setScroll(scroll);
    }
  }
  function autoScroll(now) {
    if (!press?.active) return;
    if (!enabled() || press.version !== getVersion()) { finish(false); return; }
    if (press.moved) {
      const rect = scroller.getBoundingClientRect(), start = horizontal ? rect.left : rect.top,
        end = horizontal ? rect.right : rect.bottom, margin = Math.min(40, (end - start) / 5);
      const delta = press.position < start + margin ? -Math.min(12, (start + margin - press.position) / 3) :
        press.position > end - margin ? Math.min(12, (press.position - end + margin) / 3) : 0;
      const elapsed = Math.min(64, Math.max(1, now - (press.frameAt || now - 16.7))); press.frameAt = now;
      if (delta) { setScroll(scrollValue() + delta * elapsed / 16.7); place(); }
    }
    frame = requestAnimationFrame(autoScroll);
  }
  function start(handle, point, touch) {
    finish(false); swallowUntil = 0;
    const item = handle.closest(itemSelector);
    if (!item || !root.contains(item) || !canDrag(handle)) return;
    const started = { item, handle, pointer: touch ? point.identifier : point.pointerId, touch,
      x: point.clientX, y: point.clientY, position: coordinate(point), order: ids(), scroll: scrollValue(),
      version: getVersion(), trailing: items().at(-1)?.nextElementSibling || null, active: false, moved: false };
    press = started;
    const activate = () => {
      if (press !== started || !enabled() || !canDrag(handle) || document.hidden || started.version !== getVersion()) { finish(false); return; }
      started.active = true; getSelection()?.removeAllRanges();
      root.classList.add('stores-reordering'); item.classList.add('moving-store');
      if (touch) root.addEventListener('touchmove', dragTouch, { passive: false });
      else if (!immediate) root.setPointerCapture(started.pointer);
      announce(`${label(handle)} verschieben: ${horizontal ? 'nach links oder rechts' : 'nach oben oder unten'} ziehen und loslassen.`);
      frame = requestAnimationFrame(autoScroll);
    };
    if(immediate)activate();else started.timer=setTimeout(activate,500);
  }
  function dragTouch(event) {
    if (!press?.active || !press.touch) return;
    const point = [...event.touches].find(point => point.identifier === press.pointer);
    if (!point || event.touches.length !== 1 || !event.cancelable || !enabled()) { finish(false); return; }
    event.preventDefault(); move(point);
  }
  function move(point) {
    if (!press) return;
    const distance = Math.hypot(point.clientX - press.x, point.clientY - press.y);
    if (!press.active) { if (distance > 10) finish(false); return; }
    press.position = coordinate(point); press.moved ||= distance > 6; place();
  }
  root.addEventListener('touchstart', event => {
    if (!enabled() || event.touches.length !== 1) return;
    const handle = event.target.closest(handleSelector); if (handle) start(handle, event.touches[0], true);
  }, { passive: true });
  root.addEventListener('touchmove', event => {
    if (!press?.touch || press.active) return;
    const point = [...event.touches].find(point => point.identifier === press.pointer);
    if (point) move(point); else finish(false);
  }, { passive: true });
  root.addEventListener('touchend', event => {
    if (press?.touch && [...event.changedTouches].some(point => point.identifier === press.pointer)) finish(true);
  }, { passive: true });
  root.addEventListener('touchcancel', () => { if (press?.touch) finish(false); }, { passive: true });
  document.addEventListener('touchstart', event => { if (event.touches.length > 1) finish(false); }, { passive: true, capture: true });
  root.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || !enabled()) return;
    if (!event.isPrimary) { finish(false); return; }
    const handle = event.target.closest(handleSelector);
    if (handle && event.button === 0) start(handle, event, false);
  });
  document.addEventListener('pointermove', event => {
    if (press && !press.touch && event.pointerId === press.pointer) move(event);
  }, { passive: true, capture: true });
  document.addEventListener('pointerup', event => {
    if (press && !press.touch && event.pointerId === press.pointer) finish(true);
  }, true);
  document.addEventListener('pointercancel', event => {
    if (press && !press.touch && event.pointerId === press.pointer) finish(false);
  }, true);
  root.addEventListener('lostpointercapture', () => { if (!press?.touch) finish(false); });
  root.addEventListener('click', event => {
    if (Date.now() < swallowUntil) { swallowUntil = 0; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  root.addEventListener('contextmenu', event => { if (enabled() && event.target.closest(handleSelector)) event.preventDefault(); });
  root.addEventListener('keydown', event => {
    if (!enabled() || !event.altKey || !(horizontal ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']).includes(event.key)) return;
    const handle = event.target.closest(handleSelector); if (!handle) return;
    event.preventDefault(); finish(false); swallowUntil = 0;
    const item = handle.closest(itemSelector), order = ids(), index = order.indexOf(item.dataset.storeId),
      next = index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1);
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    try {
      onChange(order);
      const moved = items().find(node => node.dataset.storeId === item.dataset.storeId);
      (moved?.matches(handleSelector) ? moved : moved?.querySelector(handleSelector))?.focus({ preventScroll: true });
      moved?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      announce(`${label(handle)}, Position ${next + 1} von ${order.length}.`);
    } catch (error) { onError(error); }
  });
  document.addEventListener('keydown', event => {
    if (press?.active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(false); }
  }, true);
  root.closest('dialog')?.addEventListener('close', () => finish(false));
  window.addEventListener('blur', () => finish(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(false); });
  return { cancel: () => finish(false) };
}
