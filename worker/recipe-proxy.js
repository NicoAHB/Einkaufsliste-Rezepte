/* Optionaler Hilfsdienst für den Rezept-Import aus Links (Cloudflare Workers, kostenloser Tarif reicht).
   Er lädt eine öffentliche Webseite und gibt sie mit CORS-Freigabe nur an eure App zurück.
   Er speichert nichts und kennt weder euren GitHub-Token noch eure Daten.
   Einrichtung: README, Abschnitt „Rezepte aus Links importieren“.

   Schutz vor Missbrauch (2.137):
   - Weiterleitungen werden einzeln geprüft (nur https, keine privaten Adressen, höchstens 3 Sprünge).
   - Optionaler Schlüssel: Unter Cloudflare → Worker → Settings → Variables eine Variable ACCESS_KEY anlegen
     (z. B. eine lange Zufallszeichenfolge). In der App die Adresse dann mit ?key=… eintragen,
     z. B. https://rezepte.dein-name.workers.dev/?key=… . Ohne passenden Schlüssel antwortet der Dienst mit 403.
     Die Kopfzeile „Origin“ allein schützt nicht: Programme außerhalb des Browsers können sie frei setzen. */

// Hier den Ursprung eurer App eintragen (nur Protokoll und Domain, ohne Pfad und ohne Schrägstrich am Ende).
const ALLOWED_ORIGINS = ['https://nicoahb.github.io'];
const MAX_BYTES = 2_500_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

const text = (body, status, headers) => new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
const privateHost = host => /^(localhost|.*\.(local|internal|localhost))$/i.test(host) || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[') || !host.includes('.');
export const publicTarget = url => url.protocol === 'https:' && !url.username && !url.password && !url.port && !privateHost(url.hostname);

function charsetOf(contentType, head) {
  const label = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '')?.[1] || /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] || 'utf-8';
  try { new TextDecoder(label); return label; } catch { return 'utf-8'; }
}

// Vergleich in konstanter Zeit, damit die Antwortdauer nichts über den Schlüssel verrät.
function sameKey(given, expected) {
  const a = new TextEncoder().encode(String(given || '')), b = new TextEncoder().encode(String(expected || ''));
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) diff |= (a[index] || 0) ^ (b[index] || 0);
  return diff === 0;
}

async function follow(start, signal) {
  let target = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!publicTarget(target)) return { error: text('Nur öffentliche https-Adressen sind erlaubt.', 400) };
    const response = await fetch(target.href, { redirect: 'manual', signal, headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5' } });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response };
    const location = response.headers.get('Location');
    response.body?.cancel?.().catch?.(() => {});
    if (!location) return { error: text('Die Seite leitet ohne Ziel weiter.', 502) };
    try { target = new URL(location, target); } catch { return { error: text('Die Seite leitet auf eine ungültige Adresse weiter.', 502) }; }
  }
  return { error: text('Zu viele Weiterleitungen.', 508) };
}

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0], Vary: 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return text('Nur GET ist erlaubt.', 405, cors);
    if (!allowed) return text('Dieser Hilfsdienst ist nur für die eigene App freigegeben.', 403, cors);
    const params = new URL(request.url).searchParams;
    if (env.ACCESS_KEY && !sameKey(params.get('key'), env.ACCESS_KEY)) return text('Der Schlüssel für diesen Hilfsdienst fehlt oder stimmt nicht.', 403, cors);

    let target;
    try { target = new URL(params.get('url') || ''); } catch { return text('Parameter url fehlt oder ist ungültig.', 400, cors); }
    if (!publicTarget(target)) return text('Nur öffentliche https-Adressen sind erlaubt.', 400, cors);
    let upstream;
    try {
      const result = await follow(target, AbortSignal.timeout(TIMEOUT_MS));
      if (result.error) return new Response(result.error.body, { status: result.error.status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
      upstream = result.response;
    } catch { return text('Die Seite hat nicht rechtzeitig geantwortet.', 504, cors); }
    if (!upstream.ok) return text(`Die Seite meldet Status ${upstream.status}.`, 502, cors);
    const type = upstream.headers.get('Content-Type') || '';
    if (!/html|xml/i.test(type)) return text('Die Adresse liefert keine Webseite.', 415, cors);

    const chunks = []; let size = 0;
    const reader = upstream.body.getReader();
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
    }
    reader.cancel().catch(() => {});
    const bytes = new Uint8Array(Math.min(size, MAX_BYTES)); let at = 0;
    for (const chunk of chunks) { const part = chunk.subarray(0, bytes.length - at); bytes.set(part, at); at += part.length; if (at >= bytes.length) break; }
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048));
    const html = new TextDecoder(charsetOf(type, head)).decode(bytes);
    return new Response(html, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=300' } });
  }
};
