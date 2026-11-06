/* Geräte- und Plattformdienste an einer Stelle (2.145), als Vorbereitung für eine spätere App für iOS und Android.
   Heute läuft SattPlan als Web-App (PWA) im Browser. Eine App im App Store / Play Store wird voraussichtlich dieselben Dateien
   in einer nativen Hülle ausliefern (z. B. Capacitor). Dort gibt es keinen Service Worker, Dateien werden über das Teilen-Menü
   gespeichert, Vibration heißt „Haptik“, und externe Links öffnen einen In-App-Browser.
   Für Teilen, Dateien speichern, Haptik, externe Links und den Service Worker rufen die übrigen Module diese Funktionen auf statt der
   Browser-Schnittstellen direkt (seit 2.149 auch das Rezeptblatt und alle Links, die in einem neuen Tab öffnen). Für diese Bereiche bleibt
   der Umbau damit eine Änderung in dieser Datei. Speicher (localStorage) und der Rezept-Import aus Links brauchen in einer App eigene
   Schritte. Ohne native Hülle verhalten sich alle Funktionen genau wie bisher. Ausführlich: docs/APP-STORE.md. */

// Läuft die App in einer nativen Hülle? Capacitor stellt globalThis.Capacitor bereit; im Browser fehlt es.
const shell = () => globalThis.Capacitor;
export const isNativeShell = () => Boolean(shell()?.isNativePlatform?.());
export const platformName = () => (isNativeShell() ? shell().getPlatform?.() || 'native' : 'web');

// Offline-Paket über den Service Worker nur im Browser. In der nativen Hülle liegen die Dateien ohnehin im App-Paket.
export const usesServiceWorker = () => !isNativeShell() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

// Kurze Rückmeldung beim langen Drücken. Später: Capacitor Haptics. Fehlt beides, passiert einfach nichts.
export function vibrate(pattern = 15) {
  try {
    const haptics = shell()?.Plugins?.Haptics;
    if (haptics?.impact) { void haptics.impact({ style: 'LIGHT' }).catch(() => {}); return; }
    globalThis.navigator?.vibrate?.(pattern);
  } catch { /* keine Haptik verfügbar */ }
}

// Kann das Gerät Dateien über das Teilen-Menü weitergeben? (iPhone, Android; viele Desktop-Browser nicht)
export function canShareFiles(sample = new File(['%PDF'], 'datei.pdf', { type: 'application/pdf' })) {
  try { return Boolean(globalThis.navigator?.canShare?.({ files: [sample] })); } catch { return false; }
}
// Als Homescreen-App auf dem iPhone geöffnet? Dort führt ein Download oft in eine Seite ohne Rückweg.
export const isStandaloneApp = () => globalThis.navigator?.standalone === true;
// Über das Teilen-Menü weitergeben: 'shared' oder 'cancelled' (abgebrochen); andere Fehler werden weitergereicht.
export async function shareFile(file, title = file.name) {
  try { await globalThis.navigator.share({ files: [file], title }); return 'shared'; }
  catch (error) { if (error?.name === 'AbortError') return 'cancelled'; throw error; }
}
// Als Download speichern.
export function downloadFile(file, keepMs = 1000) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a'); link.href = url; link.download = file.name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), keepMs);
  return 'downloaded';
}

/* Eine Datei weitergeben (Sicherung, CSV): Wo möglich das Teilen-Menü (auf dem iPhone „In Dateien sichern“),
   sonst ein normaler Download. In einer nativen Hülle übernimmt das später das Teilen-Plugin. */
export async function saveFile(file) {
  if (canShareFiles(file)) {
    try { return await shareFile(file); }
    catch { /* Teilen nicht möglich: herunterladen */ }
  }
  return downloadFile(file);
}

// Links zu fremden Seiten (Rezeptquellen, Angebote, Produktlinks): im Browser ein neuer Tab, in der App der In-App-Browser (siehe mountExternalLinks).
export function externalLink(link, url) {
  link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
/* Einmal beim Start: In einer nativen Hülle öffnet jeder Link mit target="_blank" (auch feste Links in index.html) den In-App-Browser.
   Im Browser passiert nichts; dort öffnet der neue Tab wie gewohnt. */
export function mountExternalLinks(root = globalThis.document) {
  if (!root || !isNativeShell() || !shell()?.Plugins?.Browser?.open) return false;
  root.addEventListener('click', event => {
    const link = event.target.closest?.('a[target="_blank"][href]');
    if (!link) return;
    event.preventDefault(); void shell().Plugins.Browser.open({ url: link.href }).catch(() => {});
  });
  return true;
}
