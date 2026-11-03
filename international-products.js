/* Zusätzlicher Länder-/Küchenfilter. Die normalen Gänge und Produktkennungen bleiben bestehen.
   Die Zuordnung beschreibt die Verwendung in einer Küche, keine ausschließliche Herkunft oder aktuelle Verfügbarkeit.
   2.144: um passende Katalogprodukte mit vorhandenem Bild ergänzt (z. B. Mie-Nudeln, Ghee, Mascarpone, Guacamole) sowie
   „Naher Osten & Nordafrika“ und „USA & Kanada“. Ein Produkt darf in mehreren Küchen stehen (Sojasoße: China und Japan). */
export const INTERNATIONAL_CATEGORY = 'international';
export const INTERNATIONAL_COUNTRIES = Object.freeze(
[
  {
    "id": "cn",
    "label": "China",
    "products": [
      "sojasosse",
      "glasnudeln",
      "pak-choi",
      "mie-nudeln",
      "sesamoel",
      "austernsauce"
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
      "halloumi",
      "pitabrot"
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
      "garam-masala",
      "ghee",
      "rote-linsen",
      "kichererbsen",
      "kurkuma"
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
      "mozzarella",
      "mascarpone",
      "ricotta",
      "balsamico-dunkel",
      "parmaschinken",
      "ciabatta",
      "tortellini",
      "lasagneplatten"
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
      "sojasosse",
      "teriyakisauce",
      "seidentofu",
      "wasabi-erbsen"
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
      "schwarze-bohnen",
      "guacamole",
      "salsa-dip",
      "kidneybohnen",
      "nachos"
    ]
  },
  {
    "id": "me",
    "label": "Naher Osten & Nordafrika",
    "products": [
      "hummus",
      "falafel",
      "tahin",
      "couscous",
      "harissa"
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
      "oliven-schwarz",
      "serranoschinken"
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
      "reisnudeln",
      "fischsauce",
      "suesse-chilisauce",
      "sriracha"
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
      "tahin",
      "fladenbrot"
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
  },
  {
    "id": "us",
    "label": "USA & Kanada",
    "products": [
      "erdnussbutter",
      "bbq-sauce",
      "ahornsirup",
      "bagels"
    ]
  }
].map(country=>Object.freeze({...country,products:Object.freeze(country.products)})));
const ids=new Set(INTERNATIONAL_COUNTRIES.flatMap(country=>country.products));
export const isInternationalProduct = product => ids.has(product.id);
export const internationalSearchText = product => INTERNATIONAL_COUNTRIES.filter(country=>country.products.includes(product.id)).map(country=>country.label).join(' ');
export function internationalProductGroups(products) {
  return INTERNATIONAL_COUNTRIES.map(country=>({...country,matches:products.filter(product=>country.products.includes(product.id))})).filter(country=>country.matches.length);
}
