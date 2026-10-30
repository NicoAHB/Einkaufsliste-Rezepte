# Eigene Beispielbilder für Produktauswahl, Planen und Im Laden

Erstellt am 29.10.2026 mit dem Bildgenerator für diese App, ohne Händlerlogos und ohne fremde Produktfotos.
Die Bilder zeigen generische Produkte und dienen der Orientierung, nicht der Darstellung einer konkreten Marke oder Verpackungsgröße.
Die Originale liegen außerhalb des App-Repositorys; die App enthält nur komprimierte WebP-Dateien.
Beim Optimieren wurde ausschließlich das Dateiformat kodiert, nichts zugeschnitten oder umgeordnet.


Jede Bildtafel hat **8 Spalten und 4 Zeilen**, von links nach rechts und oben nach unten.

**Version 2.65:** 1.024 individuelle Produktmotive (einschließlich ausdrücklich benannter Sorten) und 32 Gruppenmotive, zusammen 1.056 Motive in 33 lokalen WebP-Dateien. Die ursprünglichen 192 IDs und Bildzellen bleiben unverändert.

Alle Bilder zusammen: **6.160.366 Bytes** (rund 6,16 MB). Es gibt keine Bildsuche und keine KI-/Händlerabfrage während der App-Nutzung. Alle Tafeln stehen im Offline-Paket.

| Datei | Katalogpositionen (ab 0) | Inhalt |
| --- | --- | --- |
| `produce.webp` | 0–31 | Obst und Gemüse |
| `fresh.webp` | 32–63 | Brot, Kühlung, Fleisch/Fisch |
| `everyday.webp` | 64–95 | Grundvorräte, Getränke und Haushalt |
| `household.webp` | 96–127 | Weitere Grundprodukte |
| `produce-more.webp` | 128–159 | Weitere Grundprodukte, Gemüse und Kräuter |
| `pantry-more.webp` | 160–191 | Vorräte, Reiniger, Pflege und Blumenerde |
| `fruit-varieties.webp` | 192–223 | Obstsorten & exotische Früchte |
| `vegetable-varieties.webp` | 224–255 | Gemüse für den Alltag |
| `greens-herbs.webp` | 256–287 | Kohl, Salate, Pilze & Kräuter |
| `bakery-selection.webp` | 288–319 | Brot, Gebäck & Teig |
| `cheese-selection.webp` | 320–351 | Käse & Aufstriche aus der Kühlung |
| `dairy-selection.webp` | 352–383 | Milchprodukte, Desserts & Eier |
| `plant-based-selection.webp` | 384–415 | Pflanzlich & vegetarisch |
| `meat-deli-selection.webp` | 416–447 | Fleisch & Aufschnitt |
| `meat-fish-selection.webp` | 448–479 | Fleisch, Geflügel & Fisch |
| `frozen-selection.webp` | 480–511 | Tiefkühlkost & Eis |
| `pasta-grains-selection.webp` | 512–543 | Nudeln, Reis & Getreide |
| `canned-selection.webp` | 544–575 | Konserven & Eingemachtes |
| `sauces-selection.webp` | 576–607 | Öle, Soßen & Würzmittel |
| `spices-selection.webp` | 608–639 | Gewürze & Würzpasten |
| `baking-nuts-selection.webp` | 640–671 | Backzutaten, Kerne & Trockenfrüchte |
| `breakfast-selection.webp` | 672–703 | Frühstück & süße Vorräte |
| `sweets-selection.webp` | 704–735 | Süßigkeiten & Gebäck |
| `savoury-selection.webp` | 736–767 | Salzige Snacks & schnelle Mahlzeiten |
| `drinks-selection.webp` | 768–799 | Getränke & Säfte |
| `coffee-tea-selection.webp` | 800–831 | Kaffee, Tee & Heißgetränke |
| `cleaning-selection.webp` | 832–863 | Reinigen & Haushalt |
| `laundry-kitchen-selection.webp` | 864–895 | Waschen, Spülen & Küchenbedarf |
| `body-care-selection.webp` | 896–927 | Körperpflege & Kosmetik |
| `hygiene-selection.webp` | 928–959 | Hygiene & Hausbedarf |
| `baby-pets-selection.webp` | 960–991 | Baby, Familie & Haustiere |
| `home-garden-selection.webp` | 992–1023 | Zuhause, Garten & unterwegs |
| `groups.webp` | kein Katalogprodukt | 32 Produktgruppen, Reihenfolge in `product-images.js` |

Die Zuordnung steht in `../../product-catalog-data.js`; `product-catalog.js` ergänzt `sheet` und `cell`. Fotos werden ohne Zuschnitt/Umsortierung aus dem erzeugten Original nur als WebP kodiert. Die Keks-Tafel wurde mit dem Bildgenerator geprüft und so angepasst, dass die Doppelkekse keine eingeprägte Markenbeschriftung zeigen.

`../../product-images.js` ist die gemeinsame Bildquelle für Produktauswahl, Planen, Im Laden und Vorrat. Es ordnet nur vollständige Namen und geprüfte Schreibweisen zu; unbekannte Varianten erhalten ein Gruppenbild. Eine manuell gewählte lokale Kennung (`imageKey`) hat Vorrang. Sie bleibt beim Nachkaufen und beim Speichern erhalten.

Keine unendliche Produktdatenbank: Neue frei eingegebene Artikel dürfen weiterhin ein Gruppenbild haben. Bilder sind illustrative Beispiele und treffen keine Aussagen über Marke, Allergene, Zusammensetzung oder Verpackungsgröße.

Der alte Satz von 82 Emojis stammte aus der Geräteschrift. Er ist keine externe Fotoquelle und wird für diese Ansichten nicht mehr verwendet.
