/* Häufige Artikel für die Vorschläge beim Eintippen („ba“ → Bananen), auch wenn man sie noch nie eingegeben hat. Die Reihenfolge zählt: Was weiter oben steht,
   wird bei gleichem Anfang zuerst vorgeschlagen. Eigene Artikel, Rezeptzutaten und Preisnamen kommen immer davor. Reine Daten ohne Logik. */
export const GROCERY_NAMES = [
  // Die Allerhäufigsten zuerst
  'Milch', 'Brot', 'Eier', 'Butter', 'Äpfel', 'Bananen', 'Tomaten', 'Kartoffeln', 'Zwiebeln', 'Gurke', 'Paprika', 'Käse', 'Joghurt', 'Nudeln', 'Reis', 'Mehl', 'Zucker', 'Salz', 'Pfeffer', 'Wasser',
  'Kaffee', 'Tee', 'Hähnchen', 'Hackfleisch', 'Schinken', 'Wurst', 'Zitronen', 'Orangen', 'Karotten', 'Salat', 'Sahne', 'Quark', 'Toilettenpapier', 'Spülmittel', 'Brötchen', 'Müsli',
  // Obst und Gemüse
  'Birnen', 'Trauben', 'Erdbeeren', 'Knoblauch', 'Brokkoli', 'Zucchini',
  'Champignons', 'Avocado', 'Blumenkohl', 'Spinat', 'Lauch', 'Himbeeren', 'Heidelbeeren', 'Kiwi', 'Mango', 'Ananas', 'Melone', 'Pfirsiche', 'Kirschen', 'Mandarinen', 'Limetten', 'Aprikosen',
  'Radieschen', 'Kürbis', 'Aubergine', 'Mais', 'Süßkartoffeln', 'Rote Bete', 'Fenchel', 'Sellerie', 'Kohlrabi', 'Rosenkohl', 'Rucola', 'Frühlingszwiebeln', 'Ingwer', 'Chili',
  'Petersilie', 'Basilikum', 'Schnittlauch', 'Dill', 'Koriander', 'Minze', 'Rosmarin', 'Thymian',
  // Brot, Backen, Frühstück
  'Toast', 'Baguette', 'Croissants', 'Haferflocken', 'Cornflakes', 'Backpulver', 'Hefe', 'Vanillezucker', 'Backpapier', 'Marmelade', 'Honig', 'Nutella',
  // Milch und Eier
  'Mozzarella', 'Parmesan', 'Frischkäse', 'Schmand', 'Skyr', 'Feta', 'Gouda', 'Margarine', 'Pudding',
  // Fleisch, Fisch, Wurst
  'Salami', 'Lachs', 'Thunfisch', 'Bacon', 'Rindfleisch', 'Putenbrust', 'Würstchen', 'Garnelen', 'Schnitzel',
  // Vorrat
  'Spaghetti', 'Linsen', 'Kichererbsen', 'Bohnen', 'Tomatenmark', 'Passierte Tomaten', 'Gehackte Tomaten', 'Olivenöl', 'Rapsöl', 'Essig', 'Ketchup', 'Senf',
  'Mayonnaise', 'Kokosmilch', 'Brühe', 'Couscous', 'Erdnussbutter', 'Sojasoße', 'Curry', 'Paprikapulver', 'Zimt',
  // Getränke
  'Mineralwasser', 'Saft', 'Orangensaft', 'Apfelsaft', 'Cola', 'Bier', 'Wein', 'Haferdrink', 'Sprudel',
  // Snacks
  'Schokolade', 'Chips', 'Kekse', 'Nüsse', 'Gummibärchen', 'Eis', 'Popcorn',
  // Haushalt und Drogerie
  'Waschmittel', 'Küchenrolle', 'Müllbeutel', 'Zahnpasta', 'Shampoo', 'Duschgel', 'Seife', 'Taschentücher', 'Spülmaschinentabs', 'Batterien', 'Alufolie', 'Frischhaltefolie'
];
