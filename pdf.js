/* Ein kleiner PDF-Schreiber ohne Abhängigkeiten (Version 2.45). Reine Logik ohne DOM.
   Er schreibt, was recipe-sheet.js beschreibt: Seiten aus Rechtecken (auch abgerundet), Linien, Text und JPEG-Fotos. Gearbeitet wird mit den vier Standardschriften
   eines PDFs (Helvetica, Helvetica-Bold, Times-Roman, Times-Bold): Sie müssen nicht in die Datei, jeder Betrachter hat sie, und die Datei bleibt klein.
   Text ist echter Text (zum Kopieren und Suchen), Fotos kommen unverändert als JPEG hinein, alles Übrige ist Vektorgrafik und bleibt beim Drucken scharf.
   Koordinaten der Seiten: Punkt (1/72 Zoll), Ursprung oben links, y wächst nach unten; erst beim Schreiben wird in die PDF-Richtung (y nach oben) umgerechnet. */
import { FONT_WIDTHS } from './pdf-fonts.js';

export const FONTS = {
  sans: { base: 'Helvetica', css: 'Helvetica, Arial, sans-serif', weight: 400 },
  sansBold: { base: 'Helvetica-Bold', css: 'Helvetica, Arial, sans-serif', weight: 700 },
  serif: { base: 'Times-Roman', css: '"Times New Roman", Times, serif', weight: 400 },
  serifBold: { base: 'Times-Bold', css: '"Times New Roman", Times, serif', weight: 700 }
};

/* ---------- Zeichensatz: Unicode → WinAnsi (Windows-1252) ---------- */
const CP1252 = new Map([[0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98],
  [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]]);
// Zeichen, die es in WinAnsi nicht gibt, aber einen sinnvollen Ersatz haben
const REPLACE = new Map([['−', '-'], ['‐', '-'], ['‑', '-'], ['‒', '–'], ['―', '—'], [' ', ' '], [' ', ' '], [' ', ' '], [' ', ' '],
  [' ', ' '], [' ', ' '], ['　', ' '], ['→', '->'], ['←', '<-'], ['↔', '<->'], ['≈', '~'], ['≤', '<='], ['≥', '>='], ['℃', '°C'],
  ['℉', '°F'], ['⅓', '1/3'], ['⅔', '2/3'], ['⅕', '1/5'], ['⅖', '2/5'], ['⅗', '3/5'], ['⅘', '4/5'], ['⅙', '1/6'], ['⅚', '5/6'],
  ['⅛', '1/8'], ['⅜', '3/8'], ['⅝', '5/8'], ['⅞', '7/8'], ['⁄', '/'], ['∗', '*'], ['­', ''], ['​', ''], ['‌', ''], ['‍', ''],
  ['⁠', ''], ['﻿', ''], ['️', ''], [' ', ' '], [' ', ' '], ['\t', ' '], ['\n', ' '], ['\r', ' ']]);
const PICTOGRAPH = /\p{Extended_Pictographic}/u;

function codeOf(char) {
  const point = char.codePointAt(0);
  if (point >= 32 && point <= 126) return point;
  if (point >= 160 && point <= 255) return point;
  return CP1252.get(point);
}
// Text als WinAnsi-Codes. Was sich nicht darstellen lässt (Emoji, seltene Zeichen), fällt weg oder wird durch das Grundzeichen ersetzt („ł“ → „l“), sonst „?“.
export function winAnsi(text) {
  const codes = [];
  for (const char of String(text ?? '').normalize('NFC')) {
    if (REPLACE.has(char)) { for (const part of REPLACE.get(char)) codes.push(codeOf(part)); continue; }
    const code = codeOf(char);
    if (code !== undefined) { codes.push(code); continue; }
    if (PICTOGRAPH.test(char)) continue;
    const base = [...char.normalize('NFD')].filter(part => !/\p{M}/u.test(part)).map(codeOf);
    if (base.length && base.every(code => code !== undefined)) codes.push(...base); else if (!/\p{C}/u.test(char)) codes.push(0x3f);
  }
  return codes;
}
// Der Text so, wie er im PDF steht (nach dem Umsetzen): Die Vorschau zeigt damit dasselbe wie die Datei.
const FROM_CP1252 = new Map([...CP1252].map(([unicode, code]) => [code, String.fromCodePoint(unicode)]));
export const displayText = text => winAnsi(text).map(code => FROM_CP1252.get(code) ?? String.fromCharCode(code)).join('');

export function textWidth(text, font, size, charSpace = 0) {
  const widths = FONT_WIDTHS[font];
  const codes = winAnsi(text);
  let total = 0;
  for (const code of codes) total += widths[code - 32] ?? widths[0];
  return (total * size) / 1000 + Math.max(0, codes.length - 1) * charSpace;
}

/* ---------- JPEG ---------- */
// Breite, Höhe und Farbkanäle aus dem JPEG-Kopf (ohne Dekodieren), oder null
export function jpegInfo(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let index = 2;
  while (index + 9 < bytes.length) {
    if (bytes[index] !== 0xff) { index++; continue; }
    const marker = bytes[index + 1];
    if (marker === 0xff) { index++; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { index += 2; continue; }
    const length = (bytes[index + 2] << 8) | bytes[index + 3];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[index + 5] << 8) | bytes[index + 6], width = (bytes[index + 7] << 8) | bytes[index + 8], components = bytes[index + 9];
      return width > 0 && height > 0 && [1, 3].includes(components) && bytes[index + 4] === 8 ? { width, height, components } : null;
    }
    index += 2 + length;
  }
  return null;
}

/* ---------- Seiten schreiben ---------- */
const num = value => { const text = (Math.round(value * 1000) / 1000).toString(); return text === '-0' ? '0' : text; };
function color(hex) {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1] ?? '000000';
  return [0, 2, 4].map(start => num(parseInt(value.slice(start, start + 2), 16) / 255)).join(' ');
}
const hex = codes => codes.map(code => code.toString(16).padStart(2, '0')).join('');
const KAPPA = 0.5522847498;
function roundedRect(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!radius) return `${num(x)} ${num(y)} ${num(w)} ${num(h)} re`;
  const k = radius * KAPPA, right = x + w, top = y + h;
  return [`${num(x + radius)} ${num(y)} m`, `${num(right - radius)} ${num(y)} l`, `${num(right - radius + k)} ${num(y)} ${num(right)} ${num(y + radius - k)} ${num(right)} ${num(y + radius)} c`,
    `${num(right)} ${num(top - radius)} l`, `${num(right)} ${num(top - radius + k)} ${num(right - radius + k)} ${num(top)} ${num(right - radius)} ${num(top)} c`,
    `${num(x + radius)} ${num(top)} l`, `${num(x + radius - k)} ${num(top)} ${num(x)} ${num(top - radius + k)} ${num(x)} ${num(top - radius)} c`,
    `${num(x)} ${num(y + radius)} l`, `${num(x)} ${num(y + radius - k)} ${num(x + radius - k)} ${num(y)} ${num(x + radius)} ${num(y)} c`, 'h'].join('\n');
}

function pageContent(page, fonts, images, alphas) {
  const height = page.height, out = [];
  const flip = y => height - y;
  const alpha = value => { if (!(value < 1)) return ''; if (!alphas.has(value)) alphas.set(value, `GS${alphas.size + 1}`); return `/${alphas.get(value)} gs\n`; };
  const rotate = item => {
    if (!item.rotate) return ['', ''];
    const { deg, cx, cy } = item.rotate, angle = (-deg * Math.PI) / 180, cos = Math.cos(angle), sin = Math.sin(angle), y = flip(cy);
    return [`q\n1 0 0 1 ${num(cx)} ${num(y)} cm\n${num(cos)} ${num(sin)} ${num(-sin)} ${num(cos)} 0 0 cm\n1 0 0 1 ${num(-cx)} ${num(-y)} cm\n`, 'Q\n'];
  };
  for (const item of page.items) {
    const [open, close] = rotate(item);
    if (item.type === 'rect') {
      const paint = item.fill && item.stroke ? 'B' : item.fill ? 'f' : 'S';
      out.push(`q\n${open}${alpha(item.alpha)}${item.fill ? `${color(item.fill)} rg\n` : ''}${item.stroke ? `${color(item.stroke)} RG\n${num(item.lineWidth ?? 1)} w\n` : ''}${roundedRect(item.x, flip(item.y + item.h), item.w, item.h, item.r ?? 0)}\n${paint}\n${close}Q`);
    } else if (item.type === 'line') {
      out.push(`q\n${open}${alpha(item.alpha)}${color(item.color)} RG\n${num(item.width ?? 1)} w\n${item.dash ? `[${item.dash.map(num).join(' ')}] 0 d\n` : ''}${item.cap === 'round' ? '1 J\n' : ''}${num(item.x1)} ${num(flip(item.y1))} m ${num(item.x2)} ${num(flip(item.y2))} l S\n${close}Q`);
    } else if (item.type === 'text') {
      const codes = winAnsi(item.text);
      if (!codes.length) continue;
      const width = textWidth(item.text, item.font, item.size, item.charSpace ?? 0);
      const x = item.align === 'center' ? item.x - width / 2 : item.align === 'right' ? item.x - width : item.x;
      out.push(`q\n${open}${alpha(item.alpha)}BT\n/${fonts.get(item.font)} ${num(item.size)} Tf\n${color(item.color)} rg\n${item.charSpace ? `${num(item.charSpace)} Tc\n` : ''}${num(x)} ${num(flip(item.y))} Td\n<${hex(codes)}> Tj\nET\n${close}Q`);
    } else if (item.type === 'image') {
      const photo = item.photo, name = images.get(photo), scale = Math.max(item.w / photo.width, item.h / photo.height), drawW = photo.width * scale, drawH = photo.height * scale;
      const left = item.x - (drawW - item.w) / 2, bottom = flip(item.y + item.h) - (drawH - item.h) / 2;
      out.push(`q\n${open}${roundedRect(item.x, flip(item.y + item.h), item.w, item.h, 0)}\nW n\n${num(drawW)} 0 0 ${num(drawH)} ${num(left)} ${num(bottom)} cm\n/${name} Do\n${close}Q`);
    }
  }
  return out.join('\n');
}

const dateText = date => `D:${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`;
// Ein Text für das Infofeld: reines ASCII als (…), sonst UTF-16 mit Kennung
function pdfString(text) {
  const value = String(text ?? '');
  if (/^[\x20-\x7e]*$/.test(value)) return `(${value.replace(/[\\()]/g, '\\$&')})`;
  let out = 'FEFF';
  for (let index = 0; index < value.length; index++) out += value.charCodeAt(index).toString(16).padStart(4, '0');
  return `<${out}>`;
}

// pages: [{ width, height, items }]; Ergebnis: die Bytes der PDF-Datei
export function makePdf(pages, { title = '', author = '', subject = '', created = new Date() } = {}) {
  const encoder = new TextEncoder();
  const chunks = [], offsets = [];
  let length = 0;
  const push = chunk => { const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk; chunks.push(bytes); length += bytes.length; };
  // Nummern vorab: 1 Katalog, 2 Seitenliste, 3 bis 6 Schriften, danach je Seite Inhalt und Seite, dann Fotos, Transparenzen, Info
  const fonts = new Map(Object.keys(FONTS).map((key, index) => [key, `F${index + 1}`]));
  const images = new Map(), alphas = new Map();
  for (const page of pages) for (const item of page.items) if (item.type === 'image' && !images.has(item.photo)) images.set(item.photo, `Im${images.size + 1}`);
  const contents = pages.map(page => pageContent(page, fonts, images, alphas));
  const firstPage = 7, pageId = index => firstPage + index * 2, contentId = index => firstPage + index * 2 + 1;
  const imageBase = firstPage + pages.length * 2, imageId = name => imageBase + Number(name.slice(2)) - 1;
  const alphaBase = imageBase + images.size, alphaId = name => alphaBase + Number(name.slice(2)) - 1, infoId = alphaBase + alphas.size, total = infoId + 1;
  const object = (id, body) => { offsets[id] = length; push(`${id} 0 obj\n${body}\nendobj\n`); };
  const stream = (id, dictionary, content) => {
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    offsets[id] = length;
    push(`${id} 0 obj\n<< ${dictionary} /Length ${data.length} >>\nstream\n`);
    push(data); push('\nendstream\nendobj\n');
  };
  push('%PDF-1.4\n'); push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  object(1, '<< /Type /Catalog /Pages 2 0 R /Lang (de-DE) /ViewerPreferences << /DisplayDocTitle true >> >>');
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(' ')}] >>`);
  [...fonts].forEach(([key], index) => object(3 + index, `<< /Type /Font /Subtype /Type1 /BaseFont /${FONTS[key].base} /Encoding /WinAnsiEncoding >>`));
  const fontResources = [...fonts].map(([, name], index) => `/${name} ${3 + index} 0 R`).join(' ');
  const imageResources = [...images].map(([, name]) => `/${name} ${imageId(name)} 0 R`).join(' ');
  const alphaResources = [...alphas].map(([, name]) => `/${name} ${alphaId(name)} 0 R`).join(' ');
  pages.forEach((page, index) => {
    object(pageId(index), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] /Contents ${contentId(index)} 0 R /Resources << /Font << ${fontResources} >>${imageResources ? ` /XObject << ${imageResources} >>` : ''}${alphaResources ? ` /ExtGState << ${alphaResources} >>` : ''} >> >>`);
    stream(contentId(index), '', contents[index]);
  });
  for (const [photo, name] of images) {
    stream(imageId(name), `/Type /XObject /Subtype /Image /Width ${photo.width} /Height ${photo.height} /ColorSpace /${photo.components === 1 ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode`, photo.bytes);
  }
  for (const [value, name] of alphas) object(alphaId(name), `<< /Type /ExtGState /ca ${num(value)} /CA ${num(value)} >>`);
  object(infoId, `<< /Title ${pdfString(title)} /Author ${pdfString(author)} /Subject ${pdfString(subject)} /Creator ${pdfString('Einkauf & Rezepte')} /Producer ${pdfString('Einkauf & Rezepte')} /CreationDate (${dateText(created)}) >>`);
  const xref = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let id = 1; id < total; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) { result.set(chunk, at); at += chunk.length; }
  return result;
}
