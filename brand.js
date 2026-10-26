// Erkennung bekannter Ketten für die Anzeige als „Logo“ (Schriftzug in den Farben der Kette). Es sind keine Original-Logos, nur Name und Farben.
// Die Namen müssen zu den Klassen `.brand-<schluessel>` in styles.css passen.
const BRANDS = [
  ['rossmann', /^ro(ss|ß)mann\b/i], ['edeka', /^edeka\b/i], ['rewe', /^rewe\b/i], ['lidl', /^lidl\b/i],
  ['aldi', /^aldi\b/i], ['kaufland', /^kaufland\b/i], ['penny', /^penny\b/i]
];
// Schlüssel der Kette („rewe“) oder '' bei einem unbekannten Geschäft.
export function brandOf(name) {
  const text = String(name || '').trim();
  return BRANDS.find(([, pattern]) => pattern.test(text))?.[0] || '';
}
