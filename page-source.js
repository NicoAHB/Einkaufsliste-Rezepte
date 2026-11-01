/* Rezeptseiten laden. Browser dürfen fremde Webseiten nicht direkt lesen (CORS-Schutz), deshalb braucht
   die App einen Hilfsdienst. Reihenfolge:
   1. eigener Hilfsdienst (Cloudflare-Worker aus worker/recipe-proxy.js): verlässlich und privat
   2. öffentliche Hilfsdienste: nur, wenn die Person sie ausdrücklich erlaubt hat; der Link wird dann dorthin gesendet */
import { webUrl } from './recipe-import.js';

export const PUBLIC_PROXIES = [
  { name: 'allorigins.win', url: target => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
  { name: 'codetabs.com', url: target => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}` }
];
const MAX_CHARS = 2_500_000;

export const workerHost = value => {
  try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' && url.hostname.endsWith('.workers.dev') && !url.username ? url.origin : ''; }
  catch { return ''; }
};

async function download(address, timeoutMs, signal) {
  if(signal?.aborted) throw new DOMException('Abgebrochen','AbortError');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort=()=>controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(address, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const text = (await response.text()).slice(0, MAX_CHARS);
    if (text.length < 200 || !/[<{]/.test(text)) throw new Error('leere Antwort');
    return text;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
}

function pause(ms, signal) {
  if(signal?.aborted) throw new DOMException('Abgebrochen','AbortError');
  return new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Abgebrochen','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
  });
}

export function importRoutes(target, { workerUrl = '', allowPublic = false } = {}) {
  const routes = [];
  const worker = workerHost(workerUrl);
  if (worker) routes.push({ name: 'eigener Hilfsdienst', address: `${worker}/?url=${encodeURIComponent(target)}` });
  if (allowPublic) for (const proxy of PUBLIC_PROXIES) routes.push({ name: proxy.name, address: proxy.url(target) });
  return routes;
}

export async function fetchRecipePage(link, options = {}, signal) {
  let target = webUrl(link);
  if (!target) throw new Error('Bitte einen vollständigen Link eingeben, zum Beispiel https://www.chefkoch.de/rezepte/…');
  if (target.startsWith('http://')) target = `https://${target.slice(7)}`;
  const routes = importRoutes(target, options);
  if (!routes.length) {
    const error = new Error('Zum Laden einer Webseite braucht die App einen Hilfsdienst, weil Browser fremde Seiten nicht direkt lesen dürfen. Erlaube unten den öffentlichen Hilfsdienst oder richte in den Einstellungen einen eigenen ein. Alternativ: Seite öffnen, Text kopieren und unter „Text“ einfügen.');
    error.code = 'no-route'; throw error;
  }
  const failures = [];
  const attempts=5;
  for (let attempt=0;attempt<attempts;attempt++) {
    if(signal?.aborted) throw new DOMException('Abgebrochen','AbortError');
    if(attempt) await pause(options.retryDelayMs ?? Math.min(900,350*attempt),signal);
    const route=routes[attempt % routes.length];
    options.onAttempt?.(attempt+1,attempts);
    try {
      const html=await download(route.address,options.timeoutMs ?? 12000,signal);
      if(options.validate) await options.validate(html);
      return {html,via:route.name};
    }
    catch (error) {
      if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
      failures.push(`${route.name}: ${error.message}`);
    }
  }
  const error = new Error('Die Rezeptseite konnte nach 5 Versuchen nicht geladen werden. Manche Seiten blockieren den Import. Kopiere Zutaten und Zubereitung unter „Text“ hinein oder lege das Rezept über „Neu“ von Hand an.');
  error.failures=failures;
  error.code = 'failed'; throw error;
}
