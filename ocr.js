/* Texterkennung auf dem Gerät. Screenshots verlassen das Gerät nicht: Tesseract läuft als
   WebAssembly im Browser, alle Dateien liegen unter vendor/tesseract/ und werden erst beim ersten
   Screenshot-Import geladen (ca. 5 MB, danach im Offline-Speicher). */
const BASE = new URL('./vendor/tesseract/', import.meta.url);
const MAX_WIDTH = 2400;   // breiter bringt bei Handy-Screenshots nichts und kostet iPhone-Arbeitsspeicher
const BAND = 2400;        // höhere Bilder werden in Streifen erkannt
const SEARCH = 220;       // so weit oben darf eine ruhige Schnittzeile gesucht werden

const userError = text => Object.assign(new Error(text), { user: true });

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch { throw userError('Das Bild konnte nicht gelesen werden. Bitte einen Screenshot oder ein Foto (JPG, PNG, HEIC) wählen.'); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

// Helle Schrift auf dunklem Grund (Dark-Mode-Screenshots) erkennt Tesseract schlecht: dann invertieren.
function darkBackground(canvas) {
  const size = 48, small = document.createElement('canvas');
  small.width = size; small.height = size;
  const context = small.getContext('2d', { willReadFrequently: true });
  context.drawImage(canvas, 0, 0, size, size);
  const data = context.getImageData(0, 0, size, size).data, values = [];
  for (let i = 0; i < data.length; i += 4) values.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] < 110;   // Median: die Schrift selbst zählt kaum
}

// Zeile mit der geringsten Schwankung nahe der Zielhöhe: dort liegt zwischen zwei Textzeilen nur Hintergrund.
function quietRow(canvas, target) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const from = Math.max(1, target - SEARCH);
  let best = target, bestScore = Infinity;
  const rows = context.getImageData(0, from, canvas.width, target - from + 1).data;
  for (let y = 0; y <= target - from; y++) {
    let sum = 0, square = 0, count = 0;
    for (let x = 0; x < canvas.width; x += 3) {
      const at = (y * canvas.width + x) * 4, value = rows[at] + rows[at + 1] + rows[at + 2];
      sum += value; square += value * value; count++;
    }
    const score = square / count - (sum / count) ** 2;
    if (score <= bestScore) { bestScore = score; best = from + y; }
  }
  return best;
}

async function prepare(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (darkBackground(canvas)) {
    context.globalCompositeOperation = 'difference'; context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height); context.globalCompositeOperation = 'source-over';
  }
  const bands = [];
  for (let top = 0; top < canvas.height;) {
    const bottom = canvas.height - top > BAND * 1.1 ? quietRow(canvas, top + BAND) : canvas.height;
    const part = document.createElement('canvas');
    part.width = canvas.width; part.height = bottom - top;
    part.getContext('2d').drawImage(canvas, 0, top, canvas.width, bottom - top, 0, 0, canvas.width, bottom - top);
    bands.push(part); top = bottom;
  }
  return bands;
}

/* Liest den Text aus einem oder mehreren Bildern. `progress(0…1, Text)` meldet den Fortschritt.
   Mehrere Bilder werden hintereinander gelesen und mit einer Leerzeile verbunden. */
export async function recognizeImages(files, progress = () => {}, signal) {
  if (!('WebAssembly' in window) || !window.Worker) throw userError('Dieser Browser kann keine Texterkennung ausführen. Bitte den Rezepttext stattdessen einfügen.');
  const aborted = () => { if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError'); };
  let worker, current = 0, total = 1;
  try {
    progress(0, 'Bild wird vorbereitet …');
    const prepared = [];
    for (const file of files) { aborted(); prepared.push(await prepare(file)); }
    total = prepared.reduce((sum, bands) => sum + bands.length, 0) || 1;
    aborted();
    progress(0.02, 'Texterkennung wird geladen …');
    const { default: Tesseract } = await import('./vendor/tesseract/tesseract.esm.min.js');
    worker = await Tesseract.createWorker('deu', 1, {
      workerPath: new URL('worker.min.js', BASE).href, corePath: new URL('core/', BASE).href, langPath: new URL('lang/', BASE).href,
      workerBlobURL: false, cacheMethod: 'none', gzip: true,
      logger: info => { if (info.status === 'recognizing text') progress(0.05 + 0.95 * (current + info.progress) / total, `Text wird erkannt … ${Math.round(100 * (current + info.progress) / total)} %`); }
    });
    signal?.addEventListener('abort', () => worker?.terminate(), { once: true });
    const texts = [];
    for (const bands of prepared) {
      const parts = [];
      for (const band of bands) {
        aborted();
        const { data } = await worker.recognize(band);
        parts.push(data.text); current++;
      }
      texts.push(parts.join('\n'));
    }
    progress(1, 'Fertig');
    return texts.join('\n\n').replace(/\r/g, '').trim();
  } catch (error) {
    if (error?.name === 'AbortError' || error?.user) throw error;
    throw userError('Die Texterkennung konnte nicht gestartet werden. Bitte die App einmal online öffnen und neu laden oder den Rezepttext einfügen.');
  } finally { try { await worker?.terminate(); } catch { /* bereits beendet */ } }
}
