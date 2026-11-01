/* Rezeptfotos. Ein Foto wird auf dem Gerät verkleinert (JPEG) und im Browser gespeichert. Im verbundenen Modus
   lädt die App es zusätzlich als eigene Datei `photos/<Kennung>.jpg` ins private Daten-Repository: Die Rezeptdaten
   (daten.json) enthalten nur die Kennung. Sonst wäre die 900-KB-Grenze nach wenigen Fotos erreicht. Fotos werden nie
   verändert: Ein neues Foto bekommt eine neue Kennung, so gibt es keine Schreibkonflikte zwischen zwei Geräten. */
import { validPhotoId } from './data.js';

const CACHE = 'einkauf-photos-v1';
const MAX_SIDE = 1200;
const QUALITY = 0.82;
const urls = new Map();

export const userError = text => Object.assign(new Error(text), { user: true });

// Pfad im Daten-Repository: neben der Datendatei, z. B. photos/<Kennung>.jpg oder familie/photos/<Kennung>.jpg.
export function photoPath(dataPath, id) {
  if (!validPhotoId(id)) throw userError('Ungültige Foto-Kennung.');
  return [...String(dataPath).split('/').slice(0, -1), 'photos', `${id}.jpg`].join('/');
}

export async function resizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);   // PNG mit Transparenz → weißer Grund
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('leer');
    return blob;
  } catch { throw userError('Das Foto konnte nicht gelesen werden. Bitte ein anderes Bild (JPG, PNG, HEIC) wählen.'); }
  finally { URL.revokeObjectURL(url); }
}

const request = id => new Request(new URL(`./photo/${id}`, location.href));
export async function storePhoto(id, blob) {
  if (!validPhotoId(id)) throw userError('Ungültige Foto-Kennung.');
  if (!('caches' in window)) throw userError('Dieser Browser kann Fotos nicht lokal speichern.');
  await (await caches.open(CACHE)).put(request(id), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
}
export async function readPhoto(id) {
  if (!validPhotoId(id) || !('caches' in window)) return null;
  const hit = await (await caches.open(CACHE)).match(request(id));
  return hit ? hit.blob() : null;
}
// Anzeigeadresse (blob:) eines lokal vorhandenen Fotos, sonst null.
export async function localPhotoUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await readPhoto(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

// Ein heruntergeladenes Foto muss wirklich ein JPEG sein (Dateianfang FF D8 FF), bevor es gespeichert und angezeigt wird.
export const isJpeg = bytes => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
export function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Verzeichnis der Fotos im Daten-Repository (neben der Datendatei).
export const photosDir = dataPath => [...String(dataPath).split('/').slice(0, -1), 'photos'].join('/');

// Der Fotospeicher gehört allen Datenbereichen dieses Geräts. Auch getrennte
// Verbindungen, offene Uploads und der Stand vor einer Wiederherstellung zählen.
export function retainedPhotoIds(storage, current = []) {
  const keep = new Set(current);
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key === 'einkauf-demo-v1' || key?.startsWith('einkauf-data-v1:')) {
        const saved = JSON.parse(storage.getItem(key));
        if (!saved?.base || !Array.isArray(saved.base.recipes) || !Array.isArray(saved.pending)) return null;
        for (const row of saved.base.recipes) if (validPhotoId(row.photoId)) keep.add(row.photoId);
        for (const op of saved.pending) {
          if (op.collection === 'recipes' && validPhotoId(op.patch?.photoId)) keep.add(op.patch.photoId);
          if (op.collection === 'restore') {
            if (!Array.isArray(op.snapshot?.recipes)) return null;
            for (const row of op.snapshot.recipes) if (validPhotoId(row.photoId)) keep.add(row.photoId);
          }
        }
      } else if (key?.startsWith('einkauf-photo-queue:')) {
        const ids = JSON.parse(storage.getItem(key)); if (!Array.isArray(ids)) return null;
        ids.filter(validPhotoId).forEach(id => keep.add(id));
      } else if (key?.startsWith('einkauf-restore-recovery-v1:')) {
        const saved = JSON.parse(storage.getItem(key)); if (!Array.isArray(saved?.data?.recipes)) return null;
        for (const row of saved.data.recipes) if (validPhotoId(row.photoId)) keep.add(row.photoId);
      }
    }
  } catch { return null; } // Unlesbarer Speicher darf niemals Fotos kosten.
  return keep;
}
export async function prunePhotos(keep, storage = localStorage) {
  if (!('caches' in window)) return;
  keep = retainedPhotoIds(storage, keep); if (!keep) return;
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    const id = new URL(request.url).pathname.split('/').pop();
    if (keep.has(id)) continue;
    await cache.delete(request);
    if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
  }
}

export async function removePhoto(id) {
  if (!validPhotoId(id) || !('caches' in window)) return;
  await (await caches.open(CACHE)).delete(request(id));
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
}

// Warteschlange der noch nicht hochgeladenen Fotos (je Datenspeicher), damit Offline-Fotos nicht verloren gehen.
export const queued = key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(validPhotoId) : []; } catch { return []; } };
export function queuePhoto(key, id) {
  const list = queued(key);
  if (!list.includes(id)) list.push(id);
  try { localStorage.setItem(key, JSON.stringify(list)); }
  catch { throw userError('Der Browser kann nichts mehr lokal speichern. Das Foto wurde nicht übernommen.'); }
}
export function unqueuePhoto(key, id) {
  try { localStorage.setItem(key, JSON.stringify(queued(key).filter(entry => entry !== id))); } catch { /* nächster Versuch beim nächsten Abgleich */ }
}
