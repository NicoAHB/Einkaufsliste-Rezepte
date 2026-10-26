/* Kochmodus: Zubereitung in einzelne, große Schritte zerlegen. Reine Logik ohne DOM. */

// Schritte aus dem Zubereitungstext: eine Zeile je Schritt; steht alles in einem Absatz, wird an Satzenden geteilt.
// Nummerierungen am Zeilenanfang („1.“, „2)“, „Schritt 3:“) fallen weg, die App nummeriert selbst.
export function splitSteps(text) {
  const raw = String(text || '').replace(/\r/g, '').trim();
  if (!raw) return [];
  let parts = raw.split(/\n+/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 1) parts = raw.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u).map(part => part.trim()).filter(Boolean);
  return parts.map(part => part.replace(/^(?:schritt\s*)?\d{1,2}\s*[.):\-–]\s*/iu, '').trim()).filter(Boolean);
}
