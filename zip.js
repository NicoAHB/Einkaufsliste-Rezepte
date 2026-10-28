/* Minimaler ZIP-Schreiber für die Vollsicherung (Daten und Rezeptfotos in einer Datei). Reine Logik ohne DOM.
   Es wird nicht komprimiert („stored“): JPEG-Fotos sind schon komprimiert, die JSON-Datei ist klein. Das hält den Schreiber winzig und prüfbar.
   Dateinamen sind UTF-8 (Bit 11), Zeitstempel im DOS-Format, Prüfsumme CRC-32. Grenzen des klassischen ZIP-Formats (4 GB, 65.535 Dateien) werden geprüft. */

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// DOS-Datum und -Uhrzeit (Ortszeit; Jahre vor 1980 gibt es nicht)
export function dosStamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1), date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() };
}

const encoder = new TextEncoder();
const LIMIT = 0xffffffff;

/* files: [{ name, data: Uint8Array }]; Namen mit „/“ als Ordner (z. B. „fotos/abc.jpg“). Gibt die ZIP-Datei als Uint8Array zurück. */
export function makeZip(files, now = new Date()) {
  if (files.length > 0xffff) throw new Error('Zu viele Dateien für eine ZIP-Datei.');
  const { time, date } = dosStamp(now), locals = [], centrals = [], seen = new Set();
  let offset = 0;
  for (const file of files) {
    if (typeof file.name !== 'string' || !file.name || file.name.startsWith('/') || file.name.includes('\\') || file.name.split('/').includes('..')) throw new Error(`Ungültiger Dateiname: ${file.name}`);
    if (seen.has(file.name)) throw new Error(`Doppelter Dateiname: ${file.name}`);
    seen.add(file.name);
    const name = encoder.encode(file.name), data = file.data, crc = crc32(data);
    if (data.length > LIMIT || offset > LIMIT) throw new Error('Die Datei ist zu groß für eine ZIP-Datei.');
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint16(8, 0x0800, true); central.setUint16(10, 0, true);
    central.setUint16(12, time, true); central.setUint16(14, date, true); central.setUint32(16, crc, true); central.setUint32(20, data.length, true); central.setUint32(24, data.length, true);
    central.setUint16(28, name.length, true); central.setUint32(42, offset, true);
    locals.push(new Uint8Array(local.buffer), name, data); centrals.push(new Uint8Array(central.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  if (offset + centralSize > LIMIT) throw new Error('Die Sicherung ist zu groß für eine ZIP-Datei.');
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)], result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) { result.set(part, at); at += part.length; }
  return result;
}

// Zum Prüfen: liest eine mit makeZip erzeugte (oder jede unkomprimierte) ZIP-Datei und prüft Prüfsummen. Gibt [{ name, data }] zurück.
export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), decoder = new TextDecoder();
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Keine ZIP-Datei.');
  const count = view.getUint16(end + 10, true), result = [];
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('Beschädigtes Verzeichnis.');
    const method = view.getUint16(at + 10, true), crc = view.getUint32(at + 16, true), size = view.getUint32(at + 24, true), nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true), offset = view.getUint32(at + 42, true);
    if (method !== 0) throw new Error('Nur unkomprimierte Einträge werden gelesen.');
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error('Beschädigter Eintrag.');
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true), data = bytes.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`Prüfsumme stimmt nicht: ${name}`);
    result.push({ name, data });
    at += 46 + nameLength + extra + comment;
  }
  return result;
}
