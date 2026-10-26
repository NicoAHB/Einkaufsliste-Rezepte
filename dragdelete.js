// Artikel zum Löschen in den Mülleimer ziehen: Zeile lange gedrückt halten, dann nach rechts in die rote Fläche schieben und loslassen.
// Ein kurzer Tipp (Bearbeiten) und das Scrollen bleiben unberührt: Wer sich vor Ablauf der Haltezeit bewegt, scrollt nur.
export const HOLD_MS = 450;     // so lange gedrückt halten, bis die Zeile „abhebt“
export const SLOP = 10;         // so weit darf sich der Finger beim Halten bewegen (px)
export const ZONE_WIDTH = 96;   // Breite der roten Fläche am rechten Rand (px)
export const ZONE_REACH = 16;   // so weit vor der Fläche zählt sie schon als getroffen (px)

// Liegt der Finger (x) über der roten Fläche am rechten Rand?
export function overZone(x, width, zoneWidth = ZONE_WIDTH, reach = ZONE_REACH) {
  return x >= width - zoneWidth - reach;
}
// Hat sich der Finger beim Halten so weit bewegt, dass es ein Scrollen ist?
export function moved(dx, dy, slop = SLOP) {
  return Math.hypot(dx, dy) > slop;
}
// Die Zeile folgt dem Finger nur nach rechts und höchstens bis zum Rand.
export function shift(dx, left, width, keep = 40) {
  return Math.max(0, Math.min(dx, width - left - keep));
}

/**
 * @param list      Liste (ul), deren Zeilen gezogen werden dürfen
 * @param zone      die rote Fläche (wird ein- und ausgeblendet)
 * @param onDelete  wird mit dem Wert von `data-id` der Zeile aufgerufen, wenn sie in der Fläche losgelassen wurde
 * @param selector  Zeilen, die gezogen werden dürfen
 */
export function dragDelete(list, zone, onDelete, selector = '.item[data-id]') {
  let hold = null, drag = null, swallow = false;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cancelHold = () => { if (hold) { clearTimeout(hold.timer); hold = null; } };

  function lift(row, point) {
    const box = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.classList.add('drag-ghost'); ghost.removeAttribute('data-id'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    document.body.append(ghost);
    row.classList.add('drag-origin');
    const middle = Math.min(Math.max(box.top + box.height / 2, 60), innerHeight - 60);
    zone.style.top = `${middle - zone.offsetHeight / 2}px`;
    zone.classList.add('show');
    navigator.vibrate?.(12);
    drag = { row, ghost, id: row.dataset.id, startX: point.x, left: box.left, dx: 0, hot: false };
    swallow = true;
  }
  function follow(x) {
    drag.dx = shift(x - drag.startX, drag.left, innerWidth);
    drag.ghost.style.transform = `translateX(${drag.dx}px)`;
    const hot = overZone(x, innerWidth);
    if (hot !== drag.hot) { drag.hot = hot; zone.classList.toggle('hot', hot); if (hot) navigator.vibrate?.(8); }
  }
  function finish(drop) {
    const { row, ghost, id, hot, dx } = drag; drag = null;
    zone.classList.remove('show', 'hot');
    const done = () => { ghost.remove(); row.classList.remove('drag-origin'); };
    if (drop && hot) {
      if (still()) { done(); onDelete(id); } else {
        ghost.classList.add('away'); ghost.style.transform = `translateX(${dx + 40}px) scale(.2)`;
        setTimeout(() => { done(); onDelete(id); }, 190);
      }
    } else if (still()) done(); else {
      ghost.classList.add('back'); ghost.style.transform = 'translateX(0)';
      setTimeout(done, 190);
    }
    setTimeout(() => { swallow = false; }, 400);
  }

  list.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || drag) return;
    const row = event.target.closest?.(selector);
    if (!row) return;
    const point = { x: event.clientX, y: event.clientY };
    cancelHold();
    hold = { x: point.x, y: point.y, id: event.pointerId, timer: setTimeout(() => { hold = null; lift(row, point); }, HOLD_MS) };
  });
  document.addEventListener('pointermove', event => {
    if (drag) { if (event.isPrimary) { event.preventDefault(); follow(event.clientX); } return; }
    if (hold && event.pointerId === hold.id && moved(event.clientX - hold.x, event.clientY - hold.y)) cancelHold();
  });
  document.addEventListener('pointerup', event => { cancelHold(); if (drag && event.isPrimary) finish(true); });
  document.addEventListener('pointercancel', event => { cancelHold(); if (drag && event.isPrimary) finish(false); });
  document.addEventListener('keydown', event => { if (drag && event.key === 'Escape') finish(false); });
  // Solange eine Zeile gezogen wird, darf die Seite nicht mitscrollen (iOS entscheidet das beim ersten Verschieben des Fingers).
  document.addEventListener('touchmove', event => { if (drag) event.preventDefault(); }, { passive: false });
  // Lange Zeit auf einer Zeile ist kein Tipp: Das „click“ nach dem Loslassen soll weder bearbeiten noch abhaken.
  list.addEventListener('click', event => { if (swallow) { event.preventDefault(); event.stopPropagation(); } }, true);
  // Kein Kontextmenü / keine Textauswahl beim langen Drücken.
  list.addEventListener('contextmenu', event => { if (event.target.closest?.(selector)) event.preventDefault(); });
  // Scrollt die Seite doch (z. B. per Mausrad), wird das Halten abgebrochen.
  window.addEventListener('scroll', cancelHold, { passive: true });
}
