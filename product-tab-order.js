/* Persönliche Reiterreihenfolge: nur auf diesem Gerät, getrennt von Vorrat und Abgleich.
   Vor dem langen Halten bleibt horizontales Wischen möglich; Abbruch verwirft das Ziehen. */
export const PANTRY_TAB_ORDER = Object.freeze(['current', 'all', 'favorites', 'frequent', 'basics', 'recent']);
const STORAGE_KEY = 'einkauf-pantry-tabs-v1';
export function pantryTabOrder(value) {
  return [...new Set([...(Array.isArray(value) ? value : []).filter(id => PANTRY_TAB_ORDER.includes(id)), ...PANTRY_TAB_ORDER])];
}

export function mountProductTabOrder(root, { enabled, announce, onError }) {
  let press = null, frame = 0, swallowUntil = 0, memoryOrder = null;
  const buttons = () => [...root.querySelectorAll('[data-product-mode]')];
  const visible = () => buttons().filter(button => !button.hidden);
  const ids = () => visible().map(button => button.dataset.productMode);
  const label = button => button.textContent.replace('★', '').trim();
  function read() {
    if (memoryOrder) return memoryOrder;
    try { return pantryTabOrder(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return [...PANTRY_TAB_ORDER]; }
  }
  function apply(order) {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const nodes = buttons(), sorted = order.map(id => nodes.find(button => button.dataset.productMode === id)).filter(Boolean);
    root.append(...sorted, ...nodes.filter(button => !sorted.includes(button)));
    focused?.focus({ preventScroll: true });
  }
  function save(order) {
    memoryOrder = pantryTabOrder(order);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryOrder)); }
    catch { onError?.(new Error('Die Reiterreihenfolge gilt für diese Sitzung. Sie konnte nicht auf diesem Gerät gespeichert werden.')); }
  }
  function finish(commit = false) {
    if (!press) return;
    const ended = press; press = null;
    clearTimeout(ended.timer); cancelAnimationFrame(frame); frame = 0;
    root.classList.remove('reordering'); ended.button.classList.remove('moving-tab');
    if (root.hasPointerCapture(ended.pointer)) root.releasePointerCapture(ended.pointer);
    if (ended.active) {
      swallowUntil = Date.now() + 800;
      if (commit) {
        const order = ids();
        if (order.join() !== ended.order.join()) save(order);
        announce(`${label(ended.button)}, Position ${order.indexOf(ended.button.dataset.productMode) + 1} von ${order.length}.`);
      } else {
        apply(ended.order); root.scrollLeft = ended.scroll;
        announce('Verschieben abgebrochen.');
      }
    } else if (ended.scrolling) swallowUntil = Date.now() + 800;
  }
  function place() {
    if (!press?.active) return;
    const next = visible().filter(button => button !== press.button).find(button => {
      const rect = button.getBoundingClientRect(); return press.x < rect.left + rect.width / 2;
    }) || null;
    if (press.button.nextElementSibling !== next) {
      const scroll = root.scrollLeft;
      const focused = document.activeElement === press.button;
      root.insertBefore(press.button, next); root.scrollLeft = scroll;
      if (focused) press.button.focus({ preventScroll: true });
    }
  }
  function autoScroll(now) {
    if (!press?.active) return;
    if (!enabled()) { finish(false); return; }
    if (!press.moved) { frame = requestAnimationFrame(autoScroll); return; }
    const rect = root.getBoundingClientRect(), margin = Math.min(32, rect.width / 5);
    const delta = press.x < rect.left + margin ? -Math.min(12, (rect.left + margin - press.x) / 3) :
      press.x > rect.right - margin ? Math.min(12, (press.x - rect.right + margin) / 3) : 0;
    const elapsed = Math.min(64, Math.max(1, now - (press.frameAt || now - 16.7))); press.frameAt = now;
    if (delta) { root.scrollLeft += delta * elapsed / 16.7; place(); }
    frame = requestAnimationFrame(autoScroll);
  }
  root.addEventListener('pointerdown', event => {
    if (!enabled()) return;
    if (!event.isPrimary) { finish(false); return; }
    if (press) finish(false);
    swallowUntil = 0;
    const button = event.target.closest('[data-product-mode]');
    if (!button || button.hidden || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const started = { button, pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, scroll: root.scrollLeft, order: ids(), active: false, scrolling: false, moved: false };
    press = started;
    started.timer = setTimeout(() => {
      if (press !== started || !enabled() || document.hidden) { finish(false); return; }
      started.active = true;
      getSelection()?.removeAllRanges(); root.classList.add('reordering'); button.classList.add('moving-tab');
      root.setPointerCapture(started.pointer);
      announce(`${label(button)} verschieben: nach links oder rechts ziehen.`);
      frame = requestAnimationFrame(autoScroll);
    }, 500);
  });
  document.addEventListener('pointermove', event => {
    if (!press || event.pointerId !== press.pointer) return;
    if (!enabled()) { finish(false); return; }
    press.x = event.clientX;
    if (press.active) {
      event.preventDefault();
      press.moved ||= Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > 6;
      if (press.moved) place();
      return;
    }
    const dx = event.clientX - press.startX, dy = event.clientY - press.startY;
    if (!press.scrolling && Math.hypot(dx, dy) <= 10) return;
    clearTimeout(press.timer);
    if (!press.scrolling && Math.abs(dy) >= Math.abs(dx)) { finish(false); return; }
    press.scrolling = true; root.scrollLeft = press.scroll - dx; event.preventDefault();
  }, { capture: true, passive: false });
  document.addEventListener('pointerup', event => { if (press && event.pointerId === press.pointer) finish(true); }, true);
  document.addEventListener('pointercancel', event => { if (press && event.pointerId === press.pointer) finish(false); }, true);
  document.addEventListener('pointerdown', event => { if (press && !event.isPrimary) finish(false); }, true);
  root.addEventListener('lostpointercapture', () => finish(false));
  root.addEventListener('click', event => {
    if (enabled() && Date.now() < swallowUntil) { swallowUntil = 0; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  root.addEventListener('contextmenu', event => { if (enabled()) event.preventDefault(); });
  root.addEventListener('keydown', event => {
    if (!enabled()) return;
    swallowUntil = 0;
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const button = event.target.closest('[data-product-mode]'); if (!button) return;
    event.preventDefault(); finish(false);
    const order = ids(), index = order.indexOf(button.dataset.productMode), next = index + (event.key === 'ArrowLeft' ? -1 : 1);
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    apply(order); save(order); button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    announce(`${label(button)}, Position ${next + 1} von ${order.length}.`);
  });
  document.addEventListener('keydown', event => {
    if (press?.active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(false); }
  }, true);
  window.addEventListener('scroll', event => { if (press && event.target !== root) finish(false); }, true);
  window.addEventListener('blur', () => finish(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(false); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) { memoryOrder = null; if (enabled() && !press) apply(read()); }
  });
  return {
    cancel: () => finish(false),
    arrange(target) {
      finish(false); swallowUntil = 0;
      apply(target === 'pantry' ? read() : ['all', 'favorites', 'frequent', 'own']);
      for (const button of buttons()) {
        if (target === 'pantry' && PANTRY_TAB_ORDER.includes(button.dataset.productMode)) {
          button.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');
          button.setAttribute('aria-description', 'Lange halten und ziehen, um die Reihenfolge zu ändern. Mit der Tastatur: Alt und Pfeil links oder rechts.');
        } else { button.removeAttribute('aria-keyshortcuts'); button.removeAttribute('aria-description'); }
      }
      announce('');
    }
  };
}
