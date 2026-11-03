/* Zahlen- und Betragseingaben im deutschen Format. Reine Logik ohne DOM, für alle Formulare gemeinsam,
   damit dieselbe Eingabe überall dasselbe bedeutet (Mengen wie beim Rezept-Import, Preise wie bei Ausgaben). */
const VULGAR = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8, '⅕': 1 / 5 };
const FRACTION = '[½¼¾⅓⅔⅛⅜⅝⅞⅕]';

/* Menge aus einem Eingabefeld: „1,5“ und „1.5“ (Dezimalzeichen), „1.000“ (Punkt vor genau drei Ziffern = Tausender),
   „½“, „1½“, „1 ½“, „1 1/2“ und „3/4“. Ergebnis ist eine Zahl oder NaN; „1e3“, „2-3“ und Text sind keine Mengen. */
export function parseQuantity(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  let match;
  if (!text) return NaN;
  if ((match = new RegExp(`^(\\d+) ?(${FRACTION})$`).exec(text))) return Number(match[1]) + VULGAR[match[2]];
  if ((match = new RegExp(`^(${FRACTION})$`).exec(text))) return VULGAR[match[1]];
  if ((match = /^(\d+) (\d+)\/(\d+)$/.exec(text))) return Number(match[3]) ? Number(match[1]) + Number(match[2]) / Number(match[3]) : NaN;
  if ((match = /^(\d+)\/(\d+)$/.exec(text))) return Number(match[2]) ? Number(match[1]) / Number(match[2]) : NaN;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'));
  if (/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return Number(text.replace(',', '.'));
  return NaN;
}

/* Eurobetrag in Cent: „23,45“, „23.45“, „1.234,56“, „1,234.56“, „€ 12“, „12 EUR“, „7,5“. Ein Punkt vor genau drei Ziffern („1.234“) gilt
   als Tausendertrenner. Mehr als zwei Nachkommastellen, negative Zahlen und Text ergeben null: lieber nachfragen als raten. */
export function euroCents(input) {
  const text = String(input ?? '').replace(/[\s  ]/g, '').replace(/€|euro|eur/gi, '');
  let normal;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) normal = text.replace(/\./g, '').replace(',', '.');   // 1.234,56 oder 1.234
  else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text)) normal = text.replace(/,/g, '');                       // 1,234.56 (ohne Nachkommastellen wäre „1,234“ nicht von 1,23 mit Tippfehler zu unterscheiden)
  else if (/^\d{1,7}(?:[.,]\d{1,2})?$/.test(text)) normal = text.replace(',', '.');                           // 23,45 oder 23.45
  else return null;
  const [euros, cents = ''] = normal.split('.'), value = Number(euros) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(value) ? value : null;
}
