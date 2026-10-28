/* Vorschau des Rezeptblatts (Version 2.45): zeichnet dieselben Befehle wie die PDF-Datei (recipe-sheet.js, pdf.js) als SVG. So sieht man vorab genau das, was in der Datei steht,
   scharf in jeder Größe. Nur die Darstellung; Layout und PDF liegen in recipe-sheet.js und pdf.js. */
import { FONTS, displayText, textWidth } from './pdf.js';

const SVG = 'http://www.w3.org/2000/svg';
const node = (name, attributes = {}) => {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) if (value !== undefined && value !== null && value !== false) element.setAttribute(key, String(value));
  return element;
};
const round = value => Math.round(value * 100) / 100;
const turn = item => item.rotate ? { transform: `rotate(${item.rotate.deg} ${round(item.rotate.cx)} ${round(item.rotate.cy)})` } : {};

// Eine Seite als <svg>. `imageUrl(photo)` liefert die Adresse des Fotos (blob: oder data:).
export function pageSvg(page, index, count, title, imageUrl) {
  const svg = node('svg', { viewBox: `0 0 ${page.width} ${page.height}`, class: 'sheet-page', role: 'img', 'aria-label': `Rezeptblatt ${title}, Seite ${index + 1} von ${count}` });
  svg.append(node('rect', { x: 0, y: 0, width: page.width, height: page.height, fill: '#ffffff' }));
  for (const item of page.items) {
    const common = { ...turn(item), opacity: item.alpha < 1 ? item.alpha : undefined };
    if (item.type === 'rect') {
      svg.append(node('rect', { x: round(item.x), y: round(item.y), width: round(item.w), height: round(item.h), rx: item.r || undefined, ry: item.r || undefined, fill: item.fill || 'none', stroke: item.stroke, 'stroke-width': item.stroke ? item.lineWidth ?? 1 : undefined, ...common }));
    } else if (item.type === 'line') {
      svg.append(node('line', { x1: round(item.x1), y1: round(item.y1), x2: round(item.x2), y2: round(item.y2), stroke: item.color, 'stroke-width': item.width ?? 1, 'stroke-dasharray': item.dash?.join(' '), ...common }));
    } else if (item.type === 'text') {
      const text = displayText(item.text);
      if (!text) continue;
      const element = node('text', { x: round(item.x), y: round(item.y), fill: item.color, 'font-family': FONTS[item.font].css, 'font-weight': FONTS[item.font].weight, 'font-size': item.size,
        'letter-spacing': item.charSpace || undefined, 'text-anchor': item.align === 'center' ? 'middle' : item.align === 'right' ? 'end' : undefined, ...common });
      // Gleiche Breite wie im PDF, auch wenn ein Gerät die Schrift etwas anders misst
      if (!item.charSpace) { element.setAttribute('textLength', round(textWidth(item.text, item.font, item.size))); element.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      element.textContent = text;
      svg.append(element);
    } else if (item.type === 'image') {
      svg.append(node('image', { x: round(item.x), y: round(item.y), width: round(item.w), height: round(item.h), href: imageUrl(item.photo), preserveAspectRatio: 'xMidYMid slice', ...common }));
    }
  }
  return svg;
}
// Alle Seiten in einen Behälter zeichnen; die Fotoadressen werden zurückgegeben, damit sie beim Schließen freigegeben werden können
export function renderSheet(layout, container) {
  const urls = new Map();
  const imageUrl = photo => {
    if (!urls.has(photo)) urls.set(photo, URL.createObjectURL(new Blob([photo.bytes], { type: 'image/jpeg' })));
    return urls.get(photo);
  };
  container.replaceChildren(...layout.pages.map((page, index) => pageSvg(page, index, layout.pages.length, layout.title, imageUrl)));
  return () => { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); };
}
