/* Geräte- und Plattformdienste an einer Stelle (2.145), als Vorbereitung für eine spätere App für iOS und Android.
   Heute läuft Sattplan als Web-App (PWA) im Browser. Eine App im App Store / Play Store wird voraussichtlich dieselben Dateien
   in einer nativen Hülle ausliefern (z. B. Capacitor). Dort gibt es keinen Service Worker, Dateien werden über das Teilen-Menü
   gespeichert, Vibration heißt „Haptik“, und externe Links öffnen einen In-App-Browser.
   Damit dieser Umbau später eine Änderung in dieser Datei bleibt, rufen die übrigen Module diese Funktionen auf statt der
   Browser-Schnittstellen direkt. Ohne native Hülle verhalten sich alle Funktionen genau wie bisher.
   Ausführlich: docs/APP-STORE.md. */

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

/* Eine Datei weitergeben (Sicherung, CSV, Rezeptblatt): Wo möglich das Teilen-Menü (auf dem iPhone „In Dateien sichern“),
   sonst ein normaler Download. In einer nativen Hülle übernimmt das später das Teilen-Plugin. */
export async function saveFile(file) {
  const nav = globalThis.navigator;
  if (nav?.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: file.name }); return 'shared'; }
    catch (error) { if (error?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a'); link.href = url; link.download = file.name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

// Links zu fremden Seiten (Rezeptquellen, Angebote): im Browser ein neuer Tab, in der App später der In-App-Browser.
export function externalLink(link, url) {
  link.href = url;
  if (isNativeShell() && shell()?.Plugins?.Browser?.open) {
    link.addEventListener('click', event => { event.preventDefault(); void shell().Plugins.Browser.open({ url }).catch(() => {}); });
    return link;
  }
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
