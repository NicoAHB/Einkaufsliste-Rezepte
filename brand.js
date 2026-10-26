// Bekannte Ketten an einer Stelle: Erkennung am Namen, Angebotsseite, Drogerie (keine „Artikel ohne Geschäft“ im Laden) und Anzeige als „Logo“
// (Schriftzug in den Farben der Kette, keine Original-Logos). `key` muss zu `.brand-<key>` in styles.css passen.
// Die Muster prüfen den ganzen Namen oder den Anfang mit Wortgrenze: „Edeka Müller“ ist Edeka, „Müller Bäckerei“ nicht die Drogerie Müller.
const CHAINS = [
  { key: 'rossmann', pattern: /^rossmann\b/, logo: true, drugstore: true, offers: 'https://www.rossmann.de/de/angebote' },
  { key: 'edeka', pattern: /^edeka\b/, logo: true, offers: 'https://www.edeka.de/angebote/' },
  { key: 'rewe', pattern: /^rewe\b/, logo: true, offers: 'https://www.rewe.de/angebote/nationale-angebote/' },
  { key: 'lidl', pattern: /^lidl\b/, logo: true, offers: 'https://www.lidl.de/c/online-prospekte/s10005610' },
  { key: 'aldi', pattern: /^aldi\b/, logo: true },
  { key: 'kaufland', pattern: /^kaufland\b/, logo: true },
  { key: 'penny', pattern: /^penny\b/, logo: true },
  { key: 'dm', pattern: /^dm(?:[ -]drogerie(?:[ -]?markt)?)?$/, drugstore: true },
  { key: 'mueller', pattern: /^m(?:ü|ue)ller(?: drogerie(?:[ -]?markt)?)?$/, drugstore: true },
  { key: 'douglas', pattern: /^douglas\b/, drugstore: true },
  { key: 'budni', pattern: /^budni\b/, drugstore: true }
];
const normalise = name => String(name || '').trim().toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ');
// Die Kette zu einem Geschäftsnamen oder null.
export const chainOf = name => CHAINS.find(chain => chain.pattern.test(normalise(name))) || null;
// Schlüssel für die Anzeige als Logo („rewe“) oder '' bei Geschäften ohne Logo.
export const brandOf = name => { const chain = chainOf(name); return chain?.logo ? chain.key : ''; };
