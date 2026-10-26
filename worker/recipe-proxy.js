/* Optionaler Hilfsdienst für den Rezept-Import aus Links (Cloudflare Workers, kostenloser Tarif reicht).
   Er lädt eine öffentliche Webseite und gibt sie mit CORS-Freigabe nur an eure App zurück.
   Er speichert nichts und kennt weder euren GitHub-Token noch eure Daten.
   Einrichtung: README, Abschnitt „Rezepte aus Links importieren“. */

// Hier den Ursprung eurer App eintragen (nur Protokoll und Domain, ohne Pfad und ohne Schrägstrich am Ende).
const ALLOWED_ORIGINS = ['https://nicoahb.github.io'];
const MAX_BYTES = 2_500_000;
const TIMEOUT_MS = 12_000;

const text = (body, status, headers) => new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
const privateHost = host => /^(localhost|.*\.(local|internal|localhost))$/i.test(host) || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.');

function charsetOf(contentType, head) {
  const label = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '')?.[1] || /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] || 'utf-8';
  try { new TextDecoder(label); return label; } catch { return 'utf-8'; }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0], Vary: 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return text('Nur GET ist erlaubt.', 405, cors);
    if (!allowed) return text('Dieser Hilfsdienst ist nur für die eigene App freigegeben.', 403, cors);

    let target;
    try { target = new URL(new URL(request.url).searchParams.get('url') || ''); } catch { return text('Parameter url fehlt oder ist ungültig.', 400, cors); }
    if (target.protocol !== 'https:' || target.username || target.password || target.port || privateHost(target.hostname)) {
      return text('Nur öffentliche https-Adressen sind erlaubt.', 400, cors);
    }
    let upstream;
    try {
      upstream = await fetch(target.href, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5' } });
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
