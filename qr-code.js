/* QR-Code für den App-Hinweis im Rezeptblatt (2.190). Erzeugt lokal mit qrcode-generator (MIT, vendor/qrcode), ohne Anfrage an einen Server.
   Ergebnis sind die dunklen Module als waagerechte Läufe je Zeile, damit PDF und Vorschau sie als eine kleine Vektorfläche zeichnen (scharf beim Drucken). */
import qrcode from './vendor/qrcode/qrcode-generator.js';

// `text`: der Inhalt (eine Adresse). Fehlerkorrektur M (15 %): robust genug für Druck und leichte Knicke, ohne den Code unnötig fein zu machen.
// Ergebnis: { size: Kantenlänge in Modulen, runs: [[x, y, Länge], …] }
export function qrRuns(text, level = 'M') {
  const value = String(text ?? '');
  if (!value) throw new Error('Für den QR-Code fehlt die Adresse.');
  const qr = qrcode(0, level);
  qr.addData(value, 'Byte');
  qr.make();
  const size = qr.getModuleCount(), runs = [];
  for (let y = 0; y < size; y++) {
    let start = -1;
    for (let x = 0; x <= size; x++) {
      const dark = x < size && qr.isDark(y, x);
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) { runs.push([start, y, x - start]); start = -1; }
    }
  }
  return { size, runs };
}
