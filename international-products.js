/* Zusätzlicher Länder-/Küchenfilter. Die normalen Gänge und Produktkennungen bleiben bestehen.
   Die Zuordnung beschreibt die Verwendung in einer Küche, keine ausschließliche Herkunft oder aktuelle Verfügbarkeit. */
export const INTERNATIONAL_CATEGORY = 'international';
export const INTERNATIONAL_COUNTRIES = Object.freeze(
[
  {
    "id": "cn",
    "label": "China",
    "products": [
      "sojasosse",
      "glasnudeln",
      "pak-choi"
    ]
  },
  {
    "id": "gr",
    "label": "Griechenland",
    "products": [
      "tzatziki",
      "kalamata-oliven",
      "kritharaki",
      "dolmadakia",
      "feta",
      "halloumi"
    ]
  },
  {
    "id": "in",
    "label": "Indien",
    "products": [
      "paneer",
      "tamarindenpaste",
      "papadam",
      "chapati",
      "basmati-reis",
      "naanbrot",
      "garam-masala"
    ]
  },
  {
    "id": "it",
    "label": "Italien",
    "products": [
      "gnocchi",
      "parmesan",
      "risotto-reis",
      "pesto-gruen",
      "pesto-rot",
      "polenta",
      "mozzarella"
    ]
  },
  {
    "id": "jp",
    "label": "Japan",
    "products": [
      "nori-algen",
      "misopaste",
      "soba-nudeln",
      "mirin",
      "sushi-reis",
      "udon-nudeln",
      "sojasosse"
    ]
  },
  {
    "id": "kr",
    "label": "Korea",
    "products": [
      "kimchi",
      "gochujang",
      "gochugaru",
      "dangmyeon"
    ]
  },
  {
    "id": "mx",
    "label": "Mexiko",
    "products": [
      "jalapenos-eingelegt",
      "chipotle-adobo",
      "masa-harina",
      "taco-gewuerzmischung",
      "tortillas",
      "tortilla-chips",
      "schwarze-bohnen"
    ]
  },
  {
    "id": "pl",
    "label": "Polen",
    "products": [
      "pierogi",
      "kabanossi",
      "polnische-salzgurken",
      "makowiec"
    ]
  },
  {
    "id": "es",
    "label": "Spanien",
    "products": [
      "chorizo",
      "oliven-gruen",
      "oliven-schwarz"
    ]
  },
  {
    "id": "th",
    "label": "Thailand",
    "products": [
      "currypaste-rot",
      "currypaste-gruen",
      "kokosmilch",
      "jasmin-reis",
      "reisnudeln"
    ]
  },
  {
    "id": "tr",
    "label": "Türkei",
    "products": [
      "yufkateig",
      "sucuk",
      "ayran",
      "pekmez",
      "bulgur",
      "tahin"
    ]
  },
  {
    "id": "ua",
    "label": "Ukraine",
    "products": [
      "buchweizen",
      "wareniki",
      "borschtsch",
      "smetana"
    ]
  }
].map(country=>Object.freeze({...country,products:Object.freeze(country.products)})));
const ids=new Set(INTERNATIONAL_COUNTRIES.flatMap(country=>country.products));
export const isInternationalProduct = product => ids.has(product.id);
export const internationalSearchText = product => INTERNATIONAL_COUNTRIES.filter(country=>country.products.includes(product.id)).map(country=>country.label).join(' ');
export function internationalProductGroups(products) {
  return INTERNATIONAL_COUNTRIES.map(country=>({...country,matches:products.filter(product=>country.products.includes(product.id))})).filter(country=>country.matches.length);
}
