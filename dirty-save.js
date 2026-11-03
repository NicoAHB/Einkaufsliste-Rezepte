/* Speichern erst nach einer Änderung (2.147).
   Bearbeiten-Fenster für vorhandene Einträge (Artikel, Wunsch, privater Eintrag, Rezept, Ausgabe) öffnen mit einem grauen Knopf
   „Gespeichert um 14:05 Uhr“ (Zeit der letzten Änderung des Eintrags). Sobald sich etwas vom Öffnungsstand unterscheidet, wird er
   grün und heißt „Änderungen speichern“. Wer die Änderung zurücknimmt, sieht wieder den grauen Knopf.

   armDirty(form, { savedAt, extra, buttons }) nach dem Befüllen aufrufen:
   - savedAt: Zeitpunkt der letzten Speicherung (ISO), für die Beschriftung im Ruhezustand
   - extra(): weiterer Zustand außerhalb benannter Felder (z. B. ein entferntes Bild, Zutatenzeilen ohne name)
   - buttons: die Speichern-Knöpfe (Vorgabe: alle Absende-Knöpfe des Formulars); nur der erste bekommt die Beschriftung
   disarmDirty(form): für neue Einträge; die Knöpfe sind wie gewohnt aktiv und tragen ihren ursprünglichen Text.
   refreshDirty(form): nach Änderungen, die kein input/change/click im Dokument auslösen.
   Ein deaktivierter Absende-Knopf verhindert auch das Absenden mit der Eingabetaste. */
const forms = new Map();
const pad = value => String(value).padStart(2, '0');

export function savedLabel(at, now = new Date()) {
  const date = new Date(at);
  if (!at || !Number.isFinite(date.getTime())) return 'Keine Änderungen';
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())} Uhr`;
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? `Gespeichert um ${time}` : `Gespeichert am ${pad(date.getDate())}.${pad(date.getMonth() + 1)}. um ${time}`;
}

// Alle benannten Felder des Formulars (ohne Knöpfe und Dateiauswahl) plus der zusätzliche Zustand.
export function formSnapshot(form, extra = null) {
  const values = [];
  for (const field of form.elements) {
    if (!field.name || field.disabled || ['submit', 'button', 'reset', 'file'].includes(field.type)) continue;
    values.push([field.name, field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value]);
  }
  return JSON.stringify([values, extra ? extra() : null]);
}

function paint(entry, dirty) {
  entry.form.dataset.dirty = String(dirty);
  entry.buttons.forEach((button, index) => {
    button.disabled = !dirty;
    if (index) return;
    const text = dirty ? 'Änderungen speichern' : savedLabel(entry.savedAt);
    if (button.textContent !== text) button.textContent = text;
  });
}

export function refreshDirty(form) {
  const entry = forms.get(form);
  if (entry?.armed) paint(entry, formSnapshot(form, entry.extra) !== entry.base);
}
const visible = form => form.isConnected && (form.closest('dialog')?.open ?? true);
const refreshAll = () => { for (const entry of forms.values()) if (entry.armed && visible(entry.form)) refreshDirty(entry.form); };
let listening = false;
function listen() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  // Erst nach allen übrigen Reaktionen prüfen: Knöpfe im Formular (Bild entfernen, Zutat hinzufügen, + und −) und Auswahlfenster
  // ändern Werte in ihrem eigenen Ereignis.
  const later = () => setTimeout(refreshAll);
  for (const type of ['input', 'change', 'click']) document.addEventListener(type, later, true);
}

export function armDirty(form, { savedAt = '', extra = null, buttons = null } = {}) {
  if (!form) return;
  listen();
  let entry = forms.get(form);
  const list = buttons || [...form.querySelectorAll('button[type=submit]')];
  if (!entry) { entry = { form, buttons: list, labels: list.map(button => [...button.childNodes].map(node => node.cloneNode(true))) }; forms.set(form, entry); }
  entry.buttons = list; entry.armed = true; entry.savedAt = savedAt; entry.extra = extra;
  entry.base = formSnapshot(form, extra);
  paint(entry, false);
}

export function disarmDirty(form) {
  const entry = forms.get(form);
  if (!entry) return;
  entry.armed = false; delete form.dataset.dirty;
  entry.buttons.forEach((button, index) => { button.disabled = false; button.replaceChildren(...entry.labels[index].map(node => node.cloneNode(true))); });
}

export const isDirty = form => forms.get(form)?.armed ? form.dataset.dirty === 'true' : true;
