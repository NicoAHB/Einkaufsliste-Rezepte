/* Zugriff auf die gemeinsame Datendatei über die GitHub Contents API. Ohne DOM und ohne App-Zustand: Die Verbindungsangaben
   (owner, repo, branch, path, token) werden jedes Mal übergeben. Ablauf in app.js (sync): erst den aktuellen Stand lesen, nur
   eigene Änderungen anwenden, dann mit genau dessen SHA schreiben. 409/422 führen zu erneutem Lesen und Zusammenführen. */
import { validate } from './data.js';
import { LIMIT_BYTES } from './compact.js';

export function contentsUrl(config) {
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${config.path.split('/').map(encodeURIComponent).join('/')}`;
}
export async function contentsRequest(config, method, body, etag = '') {
  let response;
  // AbortController funktioniert auch auf älteren iPhones, die die neuere
  // Hilfsmethode AbortSignal.timeout noch nicht anbieten.
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(`${contentsUrl(config)}${method === 'GET' ? `?ref=${encodeURIComponent(config.branch)}` : ''}`, {
      method, cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(etag ? { 'If-None-Match': etag } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch { throw new Error('Keine Verbindung zu GitHub. Deine Änderungen bleiben lokal gespeichert. Bei Empfang wird automatisch erneut gesendet; die App dafür geöffnet lassen.'); }
  finally { clearTimeout(timeout); }
  // 304: seit der letzten Abfrage unverändert. Solche Abfragen zählen nicht zum GitHub-Limit.
  if (response.status === 304) return null;
  if (!response.ok) {
    const error = new Error(response.status === 401 ?
      'Der GitHub-Token ist ungültig oder abgelaufen. Auf GitHub unter Settings → Developer settings → Personal access tokens → Fine-grained tokens einen neuen Token für das Daten-Repository erstellen (Contents: Read and write). Auf diesem Gerät unter Einstellungen ersetzen.' :
      response.status === 403 ? 'GitHub verweigert den Zugriff oder begrenzt Anfragen. Bitte Token-Rechte (Contents: Read and write), eine mögliche Freigabe und das GitHub-Limit prüfen. Details stehen in der Anleitung (Einstellungen → Anleitung). Lokale Änderungen bleiben erhalten.' :
      response.status === 404 ? 'GitHub findet Repository, Branch oder JSON-Datei nicht, oder dein Token hat keinen Zugriff. Prüfe Eigentümer, Repository, Branch, Dateiname und Token-Auswahl. Lege daten.json im privaten Repository an (siehe Anleitung).' :
      response.status === 429 ? 'Zu viele Anfragen an GitHub. Bitte kurz warten; lokale Änderungen bleiben erhalten.' :
      `GitHub meldet Fehler ${response.status}. Lokal gespeicherte Änderungen bleiben erhalten. Bitte später erneut aktualisieren.`);
    error.status = response.status;
    const retry = Number(response.headers.get('Retry-After'));
    const reset = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
    if ([403, 429].includes(response.status)) error.retryAt = Math.max(Date.now() + 60000, retry ? Date.now() + retry * 1000 : reset || 0);
    throw error;
  }
  const json = await response.json();
  if (method === 'GET') json.etag = response.headers.get('ETag') || '';
  return json;
}
export function decodeFile(file) {
  if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('GitHub liefert die Datei nicht als kleine JSON-Datei. Bitte Datei und Größe prüfen (erste Version: unter 900 KB).');
  try { return validate(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0))))); }
  catch (error) { throw new Error(`Datendatei nicht lesbar: ${error.message}`); }
}
// Ohne Einrückung: Das spart rund die Hälfte der Dateigröße. GitHub und ältere App-Versionen lesen beides.
export function encodeFile(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data) + '\n');
  if (bytes.length > LIMIT_BYTES) throw new Error('Die Daten sind größer als 900 KB, auch nach dem Aufräumen. Bitte ein Backup erstellen und Rezeptfotos, Verlauf und Wochenplan prüfen. Nichts wurde verworfen.');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
