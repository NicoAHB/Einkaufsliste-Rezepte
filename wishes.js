/* Wunschdetails: optionale Felder an einem Artikel. Keine Shop-Abfragen;
   geöffnet wird ausschließlich der von der Person gespeicherte HTTPS-Link. */
export const WISH_URL_LIMIT = 2000;
export const WISH_NOTE_LIMIT = 1000;

export function productLink(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > WISH_URL_LIMIT) throw new Error('Der Produktlink ist zu lang (höchstens 2000 Zeichen).');
  let url;
  try { url = new URL(text); } catch { throw new Error('Bitte einen vollständigen Produktlink mit https:// einfügen.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Produktlinks müssen mit https:// beginnen und dürfen keine Zugangsdaten enthalten.');
  return url.href;
}

export const hasWishDetails = row => Boolean(
  (typeof row?.wishUrl === 'string' && row.wishUrl.trim()) ||
  (typeof row?.wishNote === 'string' && row.wishNote.trim()));

// Ein Wunsch mit eigenem Link/Notiz ist ein konkretes Produkt. Solche Artikel
// werden nicht automatisch mit gleichnamigen Artikeln zusammengerechnet.

/* Langes Drücken auf den Produktnamen (500 ms). Scrollen, ein zweiter Finger,
   Loslassen, Abbruch oder ein Wechsel in den Hintergrund brechen das Halten ab.
   Der anschließende Klick darf nicht zusätzlich die normale Bearbeitung öffnen. */
export function bindWishHold(root, selector, open, disabled = () => false) {
  let press = null, swallowUntil = 0;
  const stop = () => { if (press) clearTimeout(press.timer); press = null; };
  root.addEventListener('pointerdown', event => {
    swallowUntil = 0;   // ein neuer Tipp ist eine eigene Geste und darf sofort wieder bearbeiten
    stop();
    const node = event.target.closest?.(selector);
    if (!node || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || disabled()) return;
    press = { x: event.clientX, y: event.clientY, pointer: event.pointerId,
      timer: setTimeout(() => {
        stop();
        if (!node.isConnected || disabled() || document.hidden) return;
        getSelection?.()?.removeAllRanges();
        swallowUntil = Date.now() + 800;
        open(node.closest('[data-id]').dataset.id);
      }, 500) };
  });
  document.addEventListener('pointerdown', event => { if (press && !event.isPrimary) stop(); }, true);
  document.addEventListener('pointermove', event => {
    if (press && event.pointerId === press.pointer && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) stop();
  }, true);
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, stop, true);
  window.addEventListener('scroll', stop, true);
  document.addEventListener('visibilitychange', stop);
  root.addEventListener('click', event => {
    if (Date.now() < swallowUntil && event.target.closest?.(selector)) {
      swallowUntil = 0; event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  root.addEventListener('contextmenu', event => { if (event.target.closest?.(selector)) event.preventDefault(); });
  root.addEventListener('keydown', event => {
    swallowUntil = 0;
    const node = event.target.closest?.(selector);
    if (node && !disabled() && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
      event.preventDefault(); stop(); open(node.closest('[data-id]').dataset.id);
    }
  });
}
