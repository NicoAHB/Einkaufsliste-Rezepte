/* Rückfragen im Stil der App statt der grauen Browser-Fenster (window.confirm), seit 2.145.
   Warum: Die Systemfenster sehen auf dem iPhone fremd aus, folgen weder Hell/Dunkel noch Farbe, lassen sich nicht beschriften
   („OK“ statt „Löschen“) und blockieren die ganze Seite. Außerdem gibt es sie in einer späteren App (iOS/Android) so nicht.

   ask({ title, message, confirmLabel, cancelLabel, danger }) → Promise<boolean>
   - true nur bei „Bestätigen“; Abbrechen, Escape, Tipp daneben oder eine neue Rückfrage ergeben false.
   - danger: roter Knopf, und der Fokus liegt zuerst auf „Abbrechen“, damit ein versehentliches Enter nichts löscht.
   - Liegt das Fenster nicht in der Seite (z. B. in einem Test ohne index.html), fällt ask auf window.confirm zurück.
   Achtung: Zwischen Frage und Antwort kann ein Abgleich Daten ändern. Aufrufer lesen den Stand nach dem await neu. */
let pending = null;

export function ask({ title = '', message = '', confirmLabel = 'OK', cancelLabel = 'Abbrechen', danger = false } = {}) {
  const dialog = typeof document !== 'undefined' && document.getElementById('ask-dialog');
  if (!dialog) return Promise.resolve(typeof confirm === 'function' ? confirm([title, message].filter(Boolean).join('\n\n')) : false);
  if (pending) { const previous = pending; pending = null; previous(false); if (dialog.open) dialog.close('cancel'); }
  const ok = dialog.querySelector('#ask-ok'), cancel = dialog.querySelector('#ask-cancel');
  dialog.querySelector('#ask-title').textContent = title;
  const text = dialog.querySelector('#ask-message'); text.textContent = message; text.hidden = !message;
  ok.textContent = confirmLabel; cancel.textContent = cancelLabel;
  ok.className = danger ? 'danger ask-ok' : 'ask-ok';
  dialog.dataset.danger = String(Boolean(danger));
  dialog.returnValue = '';
  return new Promise(resolve => {
    pending = resolve;
    const done = () => {
      dialog.removeEventListener('close', done);
      if (pending !== resolve) return;          // durch eine neuere Rückfrage ersetzt
      pending = null; resolve(dialog.returnValue === 'ok');
    };
    dialog.addEventListener('close', done);
    dialog.showModal();
    (danger ? cancel : ok).focus({ preventScroll: true });
  });
}

// Einmal verdrahten: Knöpfe schließen mit ihrem Wert, ein Tipp auf den abgedunkelten Rand zählt als Abbrechen.
export function mountAsk() {
  const dialog = typeof document !== 'undefined' && document.getElementById('ask-dialog');
  if (!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready = '1';
  dialog.querySelector('#ask-ok').addEventListener('click', () => dialog.close('ok'));
  dialog.querySelector('#ask-cancel').addEventListener('click', () => dialog.close('cancel'));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close('cancel'); });
  dialog.addEventListener('cancel', () => { dialog.returnValue = 'cancel'; });
}
