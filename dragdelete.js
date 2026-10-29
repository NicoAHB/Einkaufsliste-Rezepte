// Zeilen ziehen: Zeile lange gedrückt halten, bis sie „abhebt“. Dann
//  - nach rechts in die rote Fläche schieben und loslassen: löschen,
//  - (nur wenn `options.target` gesetzt ist) frei über den Bildschirm auf ein Ziel schieben, z. B. ein Geschäft, und loslassen: dorthin verschieben,
//  - (nur mit `options.onHold`) loslassen, ohne zu ziehen: z. B. eine Auswahl öffnen.
// Ein kurzer Tipp (Bearbeiten) und das Scrollen bleiben unberührt: Wer sich vor Ablauf der Haltezeit bewegt, scrollt nur.
export const HOLD_MS = 450;     // so lange gedrückt halten, bis die Zeile „abhebt“
export const SLOP = 10;         // so weit darf sich der Finger beim Halten bewegen (px)
export const ZONE_WIDTH = 96;   // Breite der roten Fläche am rechten Rand (px)
export const ZONE_REACH = 16;   // so weit vor der Fläche zählt sie schon als getroffen (px)
export const BAND_REACH = 24;   // so weit über oder unter der roten Fläche zählt sie noch als getroffen (px, nur beim freien Ziehen)
export const HOLD_RELEASE = 24; // wer die lange gedrückte Zeile kaum bewegt und loslässt, will sie „halten“ (z. B. verschieben), nicht löschen (px)

// Liegt der Finger (x) über der roten Fläche am rechten Rand?
export function overZone(x, width, zoneWidth = ZONE_WIDTH, reach = ZONE_REACH) {
  return x >= width - zoneWidth - reach;
}
// Beim freien Ziehen zählt die rote Fläche nur in ihrer Höhe (y), damit man auf dem Weg zu einem Geschäft am Rand nicht versehentlich löscht.
export function overBand(y, top, bottom, reach = BAND_REACH) {
  return y >= top - reach && y <= bottom + reach;
}
// Wurde die abgehobene Zeile beim Loslassen kaum bewegt? Dann gilt das Loslassen als „Halten und Loslassen“.
export function heldStill(dx, dy = 0, limit = HOLD_RELEASE) {
  return Math.hypot(dx, dy) <= limit;
}
// Hat sich der Finger beim Halten so weit bewegt, dass es ein Scrollen ist?
export function moved(dx, dy, slop = SLOP) {
  return Math.hypot(dx, dy) > slop;
}
// Die Zeile folgt dem Finger nur nach rechts und höchstens bis zum Rand.
export function shift(dx, left, width, keep = 40) {
  return Math.max(0, Math.min(dx, width - left - keep));
}
export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/**
 * @param list      Liste (ul), deren Zeilen gezogen werden dürfen
 * @param zone      die rote Fläche (wird ein- und ausgeblendet)
 * @param onDelete  wird mit dem Wert von `data-id` der Zeile aufgerufen, wenn sie in der Fläche losgelassen wurde
 * @param selector  Zeilen, die gezogen werden dürfen
 * @param options   `onHold(id)`: Loslassen mit höchstens 24 px Bewegung (z. B. „Verschieben nach“ öffnen);
 *                  `hint`: Hinweisfläche, die beim Abheben ein- und beim Loslassen ausgeblendet wird;
 *                  `noZone`: ohne rote Fläche (Löschen durch Ziehen gibt es dort nicht; `zone` und `onDelete` werden nicht gebraucht), z. B. beim Verschieben eines Gerichts auf einen anderen Tag;
 *                  `target`: Ziele zum Ablegen. Die Zeile folgt dann dem Finger frei in alle Richtungen.
 *                    `show(id)` blendet die Ziele ein und gibt die Höhe zurück, die oben belegt ist (px);
 *                    `at(x, y, id)` liefert das Ziel unter dem Finger oder null; `mark(ziel|null)` hebt es hervor;
 *                    `hide()` blendet alles wieder aus; `drop(id, ziel)` führt das Ablegen aus
 */
export function dragDelete(list, zone, onDelete, selector = '.item[data-id]', options = {}) {
  const target = options.target;
  let hold = null, drag = null, swallow = false, armed = false;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cancelHold = () => { if (hold) { clearTimeout(hold.timer); hold = null; } if (!drag) disarm(); };
  // Solange eine Zeile gezogen wird, darf die Seite nicht mitscrollen. iOS und Chrome entscheiden das beim Auflegen des Fingers: Der Blocker steht deshalb
  // schon ab dem Drücken bereit und wird nach dem Loslassen wieder entfernt (ein dauerhafter Blocker bremst jedes Scrollen).
  const block = event => { if (drag) event.preventDefault(); };
  const arm = () => { if (!armed) { document.addEventListener('touchmove', block, { passive: false }); armed = true; } };
  function disarm() { if (armed) { document.removeEventListener('touchmove', block); armed = false; } }

  function lift(row, point) {
    const box = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.classList.add('drag-ghost'); ghost.removeAttribute('data-id'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    document.body.append(ghost);
    row.classList.add('drag-origin');
    const reserved = target?.show(row.dataset.id) ?? 0;   // oben belegt (Leiste mit den Geschäften): die rote Fläche rückt darunter
    const middle = Math.min(Math.max(box.top + box.height / 2, 60 + reserved), innerHeight - 60), half = ((!options.noZone && zone?.offsetHeight) || 84) / 2;
    if (!options.noZone) { zone.style.top = `${middle - half}px`; zone.classList.add('show'); }
    options.hint?.classList.add('show');
    navigator.vibrate?.(12);
    drag = { row, ghost, id: row.dataset.id, startX: point.x, startY: point.y, left: box.left, top: box.top, height: box.height, dx: 0, dy: 0, hot: false, goal: null, band: [middle - half, middle + half] };
    swallow = true;
  }
  function follow(x, y) {
    if (target) {
      // Frei in alle Richtungen, aber die Zeile bleibt ganz auf dem Bildschirm.
      drag.dx = clamp(x - drag.startX, -drag.left, innerWidth - drag.left - 40);
      drag.dy = clamp(y - drag.startY, -drag.top, innerHeight - drag.top - drag.height);
    } else { drag.dx = shift(x - drag.startX, drag.left, innerWidth); drag.dy = 0; }
    drag.ghost.style.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
    const hot = !options.noZone && overZone(x, innerWidth) && (!target || overBand(y, drag.band[0], drag.band[1]));
    if (hot !== drag.hot) { drag.hot = hot; zone?.classList.toggle('hot', hot); if (hot) navigator.vibrate?.(8); }
    if (target) {
      const goal = hot ? null : target.at(x, y, drag.id) ?? null;   // ein Ziel kann auch '' heißen („ohne Geschäft“)
      if (goal !== drag.goal) { drag.goal = goal; target.mark(goal); if (goal !== null) navigator.vibrate?.(8); }
    }
  }
  function finish(drop) {
    const { row, ghost, id, hot, dx, dy, goal } = drag; drag = null;
    zone?.classList.remove('show', 'hot'); options.hint?.classList.remove('show'); target?.hide();
    const done = () => { ghost.remove(); row.classList.remove('drag-origin'); };
    // Die Zeile „verschwindet“ an der Stelle des Fingers und das Ergebnis wird ausgeführt.
    const away = (extra, then) => {
      if (still()) { done(); then(); return; }
      ghost.classList.add('away'); ghost.style.transform = `translate(${dx + extra}px, ${dy}px) scale(.2)`;
      setTimeout(() => { done(); then(); }, 190);
    };
    if (drop && hot) away(40, () => onDelete(id));
    else if (drop && goal !== null) away(0, () => target.drop(id, goal));
    else if (drop && options.onHold && heldStill(dx, dy)) { done(); options.onHold(id); }
    else if (still()) done(); else {
      ghost.classList.add('back'); ghost.style.transform = 'translate(0, 0)';
      setTimeout(done, 190);
    }
  }

  list.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || drag || options.disabled?.()) return;   // `options.disabled()`: z. B. im Auswahlmodus
    const row = event.target.closest?.(selector);
    if (!row) return;
    const point = { x: event.clientX, y: event.clientY };
    cancelHold(); swallow = false; arm();
    hold = { x: point.x, y: point.y, id: event.pointerId, timer: setTimeout(() => { hold = null; lift(row, point); }, HOLD_MS) };
  });
  document.addEventListener('pointermove', event => {
    if (drag) { if (event.isPrimary) { event.preventDefault(); follow(event.clientX, event.clientY); } return; }
    if (hold && event.pointerId === hold.id && moved(event.clientX - hold.x, event.clientY - hold.y)) cancelHold();
  });
  // Das „click“ nach dem Loslassen kommt unmittelbar danach: Erst kurz später gilt wieder ein Tipp.
  const release = () => { disarm(); if (swallow) setTimeout(() => { if (!drag) swallow = false; }, 400); };
  document.addEventListener('pointerup', event => { cancelHold(); if (drag && event.isPrimary) finish(true); release(); });
  document.addEventListener('pointercancel', event => { cancelHold(); if (drag && event.isPrimary) finish(false); release(); });
  document.addEventListener('keydown', event => { if (drag && event.key === 'Escape') finish(false); });
  // Lange Zeit auf einer Zeile ist kein Tipp: Das „click“ nach dem Loslassen soll weder bearbeiten noch abhaken.
  list.addEventListener('click', event => { if (swallow) { event.preventDefault(); event.stopPropagation(); } }, true);
  // Kein Kontextmenü / keine Textauswahl beim langen Drücken.
  list.addEventListener('contextmenu', event => { if (event.target.closest?.(selector)) event.preventDefault(); });
  // Scrollt die Seite doch (z. B. per Mausrad), wird das Halten abgebrochen.
  window.addEventListener('scroll', cancelHold, { passive: true });
}
