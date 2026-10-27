# Einkauf & Rezepte – Version 2.14

Eine deutsche Web-App für zwei Personen: auf dem iPhone große Bedienelemente, vier Bereiche (Einkauf, Rezepte, Wochenplan, Einstellungen), Rezept-Import aus Links, Screenshots und Text und Speicherung in einem privaten GitHub-Repository. Die App besteht aus normalen HTML-, CSS- und JavaScript-Dateien. **Für die Nutzung brauchst du keinen Server, kein Terminal und keine Installation.** GitHub Pages liefert die öffentlichen App-Dateien aus; private Daten werden mit deinem persönlichen Token direkt über die GitHub-API gelesen und geschrieben.

## 1. Was diese Version kann

- Einkaufsliste für **alle Geschäfte zusammen** (Startseite) oder je Geschäft (Edeka, Lidl, Rewe; weitere anlegen, umbenennen, löschen). Ein Geschäft ist beim Hinzufügen mit einem Tipp wählbar, aber nicht nötig.
- Artikel mit Menge, Einheit und dem Namen der Person hinzufügen und bearbeiten; abhaken, löschen und erledigte Artikel gemeinsam entfernen. Erledigtes steht unten.
- Pro Geschäft einstellbare Angebotslinks, manuell notierte Preise mit Bezugsmenge, Angebotsmarkierungen, letzter Preisvergleich und geschätzte Summe der noch offenen Artikel.
- Keine Rückgängig-Leiste: Ein Artikel, Geschäft, Rezept oder Gericht wird mit dem Mülleimer entfernt, versehentlich Entferntes legt man neu an. Kurze Hinweise (z. B. wo ein neuer Artikel steht) verschwinden nach wenigen Sekunden von selbst. Häkchen werden durch erneutes Antippen geändert.
- Beim Tippen passende Artikelnamen aus eurem bisherigen Einkaufsverlauf übernehmen, auch nach dem Löschen und offline.
- Rezepte mit einzelnen Zutaten, Zubereitung, Portionen, Tags und optionaler Quelle anlegen, bearbeiten, löschen; nach Rezept/Zutat/Tag suchen und nach Tag filtern. **Neu:** Import aus Link, Screenshot und Text (Abschnitt „Neu in Version 1.3“).
- Portionen umrechnen. Beim Übernehmen Zutaten einzeln abwählen, Geschäft auswählen und nur die gewählten Zutaten hinzufügen.
- Beispielmodus ohne GitHub, drei Beispielrezepte und eine über drei Geschäfte verteilte Beispielliste.
- GitHub-Abgleich per Button und alle acht Sekunden bei sichtbarer App; lokale Offline-Warteschlange; Backup-Export; heller und dunkler Modus; Homescreen und Offline-Start nach dem ersten erfolgreichen Online-Aufruf.

**Absichtlich noch nicht enthalten:** Schnellauswahl häufiger Artikel und die Erkennung von Zwiebel/Zwiebeln (Einzahl und Mehrzahl sind für die App verschiedene Namen; es wird nichts geraten).

## Neu in Version 2.14: Standard sind farbige Symbole, Fotos nur noch auf Wunsch (und besser)

**Warum:** In Version 2.13 zeigte die Suche bei Open Food Facts oft Falsches, z. B. für „Birne“ ein Foto von Birnensaft und für „Reis“ Reiswaffeln. Der erste Treffer der Suche war zu ungenau. Deshalb gilt jetzt:

- **Standard: ein farbiges Symbol (Emoji) passend zum Artikel**, sofort da und ohne Internet (`emoji.js`): „Birne“ 🍐, „Reis“ 🍚, „Milch“ 🥛, „Eier“ 🥚, „Spülmittel“ 🧼 usw. (rund 100 Stichwörter). Ohne Treffer zeigt die Kachel das Symbol der Kategorie (Obst 🍎, Brot 🍞, Fleisch 🥩, Milch 🥛, Tiefkühl 🧊, Vorrat 🥫, Gewürze 🧂, Süßes 🍪, Getränke 🥤, Haushalt 🧼), sonst ein Paket 📦. Verwechslungen sind ausgeschlossen: „Birnensaft“ 🧃 ist kein Obst, „Reiswaffeln“ 🍘 kein Reis, „Kokosmilch“ 🥥 keine Milch, „Zahnpasta“ 🪥 keine Pasta. Emoji kommen vom Gerät und sehen auf iPhone und Android scharf und bunt aus. Die Kachel bleibt dieselbe (56 px, rechts in der Zeile, nicht antippbar, hell auch im Dunkelmodus).
- **Standardmäßig werden keine Artikelnamen mehr ins Internet gesendet.** Es gibt keine Abfragen, bis du es einschaltest.
- **Fotos sind eine Einstellung, Standard aus:** Einstellungen → Darstellung & Sicherung → **„Fotos aus dem Internet suchen (experimentell)“**. Dann sucht die App pro Artikelname einmal, und ein Foto ersetzt das Symbol, sobald es geladen ist. Ohne Treffer oder bei Fehlern bleibt das Symbol. **Produktbilder anzeigen** (an/aus) bleibt der Hauptschalter: Aus = keine Kacheln und keine Abfragen.
- **Die Foto-Suche wurde verbessert** (`images.js`): Zuerst **Wikipedia/Wikimedia** (Foto der Sache selbst, z. B. der Artikel „Birnen“). Ein Artikel zählt nur, wenn sein **Titel zum Namen passt** (Wortstamm: „Äpfel“ = „Apfel“, aber „Birne“ ≠ „Birnensaft“), seine Kurzbeschreibung nach Lebensmittel, Pflanze, Getränk oder Ähnlichem klingt (keine Personen, Orte, Marken, Begriffsklärungen) und das Bild ein Foto ist (keine Zeichnung, kein Logo). Danach **Open Food Facts** (erst Deutschland, dann weltweit) mit **Wortabgleich**: Der Produktname muss alle bedeutsamen Wörter des Artikels als ganze Wörter enthalten, und unter den passenden gewinnt der mit den **wenigsten Zusatzwörtern** („Reis“ vor „Reis-Pfanne mit Gemüse“). Der erste Treffer der Suche gilt nicht mehr blind.
- **Der alte Bild-Speicher (Version 2.13) wird verworfen**, damit falsche Treffer wie „Reiswaffeln“ nicht hängen bleiben (neuer Speicher `einkauf-images-v2`). Gemerkt wird weiter pro Name: Adresse oder „kein Treffer“ (erst nach 7 Tagen neu); Fehler werden nicht gemerkt. Wikipedia wird im Abstand von 0,4 s abgefragt, Open Food Facts höchstens alle 6,5 s (Limit rund 10 Suchen pro Minute); jede Quelle hat ihren eigenen Takt.
- **Datenschutz:** Nur mit eingeschalteten Fotos gehen die Artikelnamen an `de.wikipedia.org` und `world.openfoodfacts.org`, die Bilder kommen von `upload.wikimedia.org` bzw. `images.openfoodfacts.org`. Die Sicherheitsrichtlinie in `index.html` erlaubt genau diese Adressen. Wikimedia-Bilder stehen unter freien Lizenzen (Wikimedia Commons).
- **Ehrlich dazu:** Weder Wikipedia noch Open Food Facts sind aus der Entwicklungsumgebung erreichbar. Die Foto-Suche ist deshalb **nur gegen nachgebaute Antworten geprüft**, und die Auswahlregeln sind sorgfältig, aber **nicht mit echten Treffern abgeglichen**. Darum ist sie „experimentell“ und aus. Die Symbole sind dagegen vollständig geprüft (Zuordnungstabelle in `tests/emoji.test.mjs`). Auf sehr alten Geräten können neuere Emoji (z. B. 🧈 🫑 🫘) als Kästchen erscheinen.

Weitere Testpunkte für Version 2.14:

- [ ] Einkauf: Jede Zeile zeigt rechts ein farbiges Symbol passend zum Artikel (Birne 🍐, Milch 🥛, Reis 🍚), sofort und ohne Wartezeit. Unbekannte Namen zeigen das Symbol der Kategorie oder 📦.
- [ ] Einstellungen → Darstellung & Sicherung: „Fotos aus dem Internet suchen (experimentell)“ ist **aus**. Einschalten: Nach und nach (Wikipedia schnell, Open Food Facts etwa alle 6 Sekunden) ersetzen Fotos die Symbole; kein Foto von Birnensaft bei „Birne“, keine Reiswaffeln bei „Reis“. Ausschalten: Die Symbole bleiben.
- [ ] „Produktbilder anzeigen“ ausschalten: Die Kacheln verschwinden sofort, die Zeile sieht aus wie früher.

## Neu in Version 2.13: Produktbilder in der Einkaufsliste

> **Überholt durch Version 2.14:** Standard sind jetzt farbige Symbole statt Fotos; die Foto-Suche ist eine Einstellung (Standard aus) und wurde überarbeitet. Die folgenden Punkte beschreiben die erste Fassung.

- **Rechts in jeder Artikelzeile** der Einkaufsliste (Ansicht „Planen“) steht jetzt eine kleine, abgerundete **Kachel (56 × 56 px)** mit einem Beispielbild des Produkts. Name, Menge und Preise bleiben links, lange Namen („Domol Feinwaschmittel …“) brechen weiter um und werden nicht von der Kachel gequetscht (unter 341 px Breite ist die Kachel 44 px). Die Kachel ist rein dekorativ: nicht antippbar, nicht fokussierbar, für Bildschirmleser versteckt. Die Ansicht „Im Laden“ ist unverändert.
- **Alles vollautomatisch.** Es gibt keine Bildauswahl, kein Hochladen und kein Antippen zum Wechseln.
- **Quelle: Open Food Facts** (kostenlos, ohne Schlüssel, direkt aus dem Browser). Die App sucht mit dem Artikelnamen, **zuerst unter Produkten aus Deutschland**, findet sich dort nichts, **einmal weltweit**. Genommen wird der erste Treffer mit einem brauchbaren Vorderseiten-Bild (kleine Größe). Nur Bilder von `images.openfoodfacts.org` bzw. `static.openfoodfacts.org` werden angezeigt.
- **Gemerkt wird auf dem Gerät** (`einkauf-images-v1`, nicht in der gemeinsamen Datei): die Bild-Adresse oder „kein Treffer“. Ein Name wird nur **einmal** gesucht; „kein Treffer“ wird erst nach **7 Tagen** erneut versucht. Gleiche Namen (Groß-/Kleinschreibung und Leerzeichen egal) **teilen sich ein Bild**. Ein Netzfehler wird nicht gemerkt, sondern beim nächsten Öffnen (frühestens nach zehn Minuten) neu versucht. Lässt sich ein gemerktes Bild nicht mehr laden, gilt es als „kein Treffer“.
- **Rücksicht auf die Schnittstelle:** Open Food Facts erlaubt rund 10 Suchen pro Minute. Die App fragt deshalb **nacheinander im Abstand von 6,5 Sekunden** ab (bei „Zu viele Abfragen“ eine Minute Pause). Eine lange Liste füllt sich beim ersten Mal also **nach und nach** (rund 10 Artikel pro Minute); bis dahin zeigt die Kachel einen ruhigen Platzhalter. Danach kommen die Bilder sofort aus dem Speicher.
- **Ersatzsymbol:** Ohne Treffer oder bei einem Fehler zeigt die Kachel ein Symbol zur **Kategorie** des Artikels (Obst & Gemüse, Brot, Fleisch & Fisch, Milch & Käse, Tiefkühl, Vorrat, Gewürze & Öl, Süßes, Getränke, Haushalt), sonst ein neutrales Paket. Alle Zeilen bleiben so gleich hoch, mit oder ohne Bild.
- **Schalter: Einstellungen → Darstellung & Sicherung → „Produktbilder anzeigen“**, Standard **an**, mit dem Hinweis „Zeigt zu jedem Artikel automatisch ein Beispielbild.“ Er gilt **sofort** (ohne Neuladen) und wird wie die anderen Schalter in den Geräteeinstellungen gespeichert (`productImages`). **Aus** heißt: keine Kacheln, **keine Abfragen** (Wartendes entfällt, Laufendes wird abgebrochen), die Zeile sieht aus wie vorher.
- **Datenschutz:** Solange die Bilder an sind, wird der **Artikelname** an `world.openfoodfacts.org` gesendet und die Bilder werden von `images.openfoodfacts.org` geladen. Es werden keine Namen von Personen, kein Token und keine Preise gesendet. Dafür wurde die Sicherheitsrichtlinie in `index.html` um genau diese Adressen erweitert (`connect-src` und `img-src`).
- **Ehrlich dazu:** Die echte Schnittstelle ist aus der Entwicklungsumgebung **nicht erreichbar**; die Tests laufen gegen **simulierte Antworten** im Format der Open-Food-Facts-Suche (`/cgi/search.pl`). Ob die Suche mit deinen Artikelnamen gute Treffer liefert, zeigt erst der Alltag. Der erste Treffer ist nicht immer das typischste Produkt (es wird nach Beliebtheit sortiert), und **Haushaltswaren** (z. B. Waschmittel) sind bei Open Food Facts selten, dort erscheint dann das Symbol. Falsche Bilder lassen sich bewusst nicht von Hand korrigieren.

## Neu in Version 2.12: grünes „+“ im Namensfeld

- **Das „+“ sitzt jetzt im Namensfeld**, ganz rechts, und erscheint erst, sobald etwas getippt ist. Vorher stand es als eigener Knopf neben Menge und Einheit, bei leerem Feld sinnlos sichtbar. Der Knopf ist in der Farbe der gewählten Palette gehalten (in der grünen Palette also grün).
- **Ein Tipp auf das „+“ fügt den Artikel hinzu und schließt die Tastatur.** Ein Tipp ins Feld öffnet sie wieder. Das Formular klappt nach dem Hinzufügen wieder zu (nur das Namensfeld bleibt stehen), das gewählte Geschäft bleibt.
- **Mit der Eingabetaste der Tastatur („Fertig“)** wird ebenfalls hinzugefügt, aber die Tastatur bleibt offen, damit man mehrere Artikel nacheinander eintippen kann. Wer die Tastatur nach jedem Artikel zu haben möchte, sagt Bescheid; das ist eine Zeile.
- Der Text im Feld läuft nicht unter das „+“ (Platz rechts im Feld), und Einheit nutzt den frei gewordenen Platz in der Zeile.
- Geprüft über 280, 314 und 390 px Breite mit Fingertipp: „+“ nur mit Text, liegt im Feld, fügt hinzu, das Feld verliert den Fokus (die Tastatur geht zu), ein Tipp ins Feld gibt ihn zurück. **Nicht geprüft:** das echte Verhalten der iPhone-Tastatur; getestet ist nur, dass das Feld den Fokus abgibt, was auf dem iPhone die Tastatur schließt.

## Neu in Version 2.11: Rezepte des Tages lassen sich nicht mehr zur Seite schieben, neue Rezepte nach der Sammlung

- **Das Fenster „Rezepte des Tages“ ließ sich nach links und rechts verschieben.** Ursache: Die Knöpfe unten („Überspringen“, „Hinzufügen“) durften nicht schmaler werden als ihre Schrift. Auf schmalen Handys oder bei vergrößerter Schrift (iOS „Textgröße“, Android „Schriftgröße“) wurden sie breiter als das Fenster und schoben es zur Seite. Jetzt brechen die Knöpfe in eine zweite Zeile um, lange Wörter in der Karte brechen um, und das Fenster lässt sich nur noch auf und ab bewegen (`overflow-x: hidden` plus `touch-action: pan-y`). Die Prüfung läuft über 280, 314 und 390 px Breite und Schriftgrößen von 100, 150 und 200 %; ohne die Korrektur schlägt sie fehl.
- **Nach den 69 Rezepten der Sammlung kommen automatisch neue Rezepte.** Der Knopf „Von vorn beginnen“ entfällt. Die neuen Rezepte stellt die App selbst zusammen (`recipe-maker.js`, wird erst dann geladen): 19 Rezeptarten (Nudel-, Reis- und Gnocchi-Pfanne, Kokos-Curry, Wraps, Couscous-Bowl, Ofenblech, Kartoffelauflauf, Frittata, Flammkuchen, Tortilla-Pizza, Cremesuppen, Eintopf, Risotto, Crumble, Pfannkuchen, Milchreis, Quarkspeise, Overnight Oats) mit je passendem Gemüse bzw. Obst und passender Beilage bzw. Belag. Daraus ergeben sich **über 2.700 verschiedene Rezepte** (bei drei pro Tag rund zweieinhalb Jahre), jeweils mit Zutaten und Mengen für vier Portionen, nummerierten Schritten und Zeitangabe. Welche Bausteine zusammenpassen, ist im Code festgelegt (zum Beispiel kein Fisch im Gratin, kein Thunfisch im Curry, Käse erst zum Schluss).
- **Gespeichert wird nur, was du hinzufügst.** Die neuen Rezepte werden nirgends abgelegt: Sie entstehen aus der Tageszahl (Tag × 3 + Platz) in fester Reihenfolge. Übersprungene Vorschläge tauchen weder in den Daten noch im Merkzettel des Geräts auf; das Gerät merkt sich nur noch, welche Rezepte der **eingebauten Sammlung** schon dran waren. Wer ein Rezept hinzufügt, hat es bei seinen Rezepten und bekommt es nicht noch einmal vorgeschlagen. Beide Handys sehen am selben Tag dieselben drei Rezepte.
- Bleiben von der Sammlung nur noch ein oder zwei Rezepte, füllen neue die freien Plätze des Tages. Auf der Karte steht bei neuen Rezepten „Neu zusammengestellt. Gespeichert wird nur, was du hinzufügst.“
- **Ehrlich dazu:** Die Rezepte sind nach festen Regeln zusammengesetzt, nicht frei geschrieben. Sie sind alltagstauglich und in sich stimmig (Tests prüfen Zutaten, Sätze, Kategorien und Zeiten aller 2.700 Rezepte), aber nicht jede Kombination ist ein Geheimtipp. Was nicht gefällt, wird mit **Überspringen** übergangen; mit der Zeit lassen sich Bausteine und Rezeptarten in `recipe-maker.js` ergänzen.

## Neu in Version 2.10: Anleitung in der App

Die Anleitung war ein Link auf diese README-Datei: Auf dem iPhone öffnete er sie als **Rohtext** (Markdown-Zeichen sichtbar) in der App, und es gab **keinen Weg zurück**, weil eine Datei in der Home-Bildschirm-App weder Zurück- noch Schließen-Knopf hat. Jetzt:

- **Einstellungen → Anleitung** (Knopf oben neben „Einstellungen“) öffnet ein **eigenes Fenster in der App** mit **Schließen-Knopf** (oben rechts und unten) und lässt sich auch mit Wischen nach unten bzw. Esc schließen.
- Die Anleitung ist **in Abschnitte gegliedert**, die man einzeln auf- und zuklappt: Kurz erklärt, Zu zweit nutzen, Einkaufsliste, Im Laden, Preise/Angebote/Kassenbon, Rezepte, Rezepte des Tages, Wochenplan, Einstellungen, Tipps, Wenn etwas nicht klappt. Wichtiges ist **fett**, Eingaben stehen als `Code`.
- Der Text steht in `help.js` und wird erst beim ersten Öffnen geladen (die App wächst dadurch nicht beim Start). Er ist bewusst kurz und für den Alltag geschrieben; die **technische Anleitung und Testliste** (diese README) liegt weiter auf GitHub, der Link steht ganz unten im Fenster (öffnet im Browser).
- Fehlermeldungen verweisen jetzt auf die Anleitung in der App statt auf die README. Die README-Datei ist nicht mehr im Offline-Paket.

## Neu in Version 2.9: Rezepte des Tages ohne Hilfsdienst, Einstellungen wackeln nicht mehr

- **Rezepte des Tages brauchen keinen Hilfsdienst mehr.** Browser dürfen fremde Webseiten (z. B. Chefkoch) nicht direkt lesen. Ohne Hilfsdienst geht das nicht, und von hier aus konnte ich keine solche Seite prüfen. Deshalb bringt die App jetzt **ihre eigene Sammlung mit**: `rezepte-des-tages.json` mit **69 klassischen Hausrezepten** (Suppen, Pasta, Fleisch, Aufläufe, Kuchen, vegetarisch und vegan, jeweils mit Zutaten und Zubereitung). Sie sind eigene Texte, kein Auszug von einer fremden Seite, und funktionieren auch offline.
- **Drei neue Rezepte pro Tag.** Im Bereich Rezepte steht oben **„Rezepte des Tages · 3 offen“**. Karten wie bisher: **Hinzufügen** legt das Rezept samt Zutaten in deinen Rezepten an, **Überspringen** geht weiter; 0 bis alle 3 sind möglich. **Beide Geräte sehen am selben Tag dieselben drei Rezepte** (feste Reihenfolge, der Tag bestimmt die Stelle). Was du hinzugefügt oder übersprungen hast, kommt nicht wieder; ebenso nichts, was schon unter demselben Namen in deinen Rezepten steht. Sind alle 69 durch, bietet die App **„Von vorn beginnen“** an.
- **Eigene Seite bleibt möglich:** Unter Einstellungen → „Rezepte aus Links laden“ → **„Rezepte des Tages: eigene Seite (optional)“** lässt sich wie in Version 2.8 der Link einer Seite eintragen (braucht dann den Hilfsdienst, bis zu zehn Rezepte, nicht gegen die echte Chefkoch-Seite getestet). Leer lassen = eingebaute Sammlung.
- **Einstellungen ließen sich seitlich verschieben** (auf manchen iPhones): Der lange Hinweis in der Überschrift eines Bereichs („✓ haushalt/daten · Nico · Token läuft …“) durfte nicht umbrechen; ältere iOS-Versionen können `<summary>` nicht als Flex-Zeile darstellen und machten die Seite dadurch breiter als den Bildschirm. Der Hinweis bricht jetzt um, und die Seite lässt sich grundsätzlich nicht mehr seitlich verschieben. Ein Test erzwingt das alte Verhalten (kein Flex in `<summary>`) und prüft bei 280, 314 und 390 px, dass nichts überhängt.

## Neu in Version 2.8: Rezepte des Tages zum Durchklicken

**Wichtig vorab:** Diese Funktion wurde **nicht gegen die echte Chefkoch-Seite getestet**. Aus der Entwicklungsumgebung war chefkoch.de nicht erreichbar, und ich konnte nicht bestätigen, welche Seite genau „Rezepte des Tages“ zeigt oder wie sie aufgebaut ist. Getestet ist der Ablauf mit einer nachgebauten Seite. Ob es bei Chefkoch klappt, zeigt sich bei dir: Siehe „Wenn nichts gefunden wird“.

- **Einrichten:** Öffne im Browser die Seite, auf der du die Tagesrezepte siehst, und kopiere ihren Link. In der App: **Einstellungen → Rezepte aus Links laden → „Rezepte des Tages: Link zur Seite“**, einfügen, **Import-Einstellungen speichern**. Du brauchst dafür wie beim Link-Import einen **Hilfsdienst** (eigener Cloudflare-Worker oder die erlaubten öffentlichen Dienste).
- **Benutzen:** Im Bereich **Rezepte** steht oben **„Rezepte des Tages · 10 offen“**. Ein Tipp öffnet die Karten: Name, Zeit, Portionen, die ersten Zutaten, ein Stück der Zubereitung und ein Link zur Originalseite. **Hinzufügen** legt das Rezept samt Zutaten in deinen Rezepten an (mit Quelle), **Überspringen** geht weiter. Du kannst **0 bis alle 10** hinzufügen; beim Schließen merkt sich die App, wo du warst.
- **Täglich neu:** Die Seite wird einmal am Tag geladen (still beim ersten Öffnen des Rezepte-Bereichs). Es kommen die ersten **zehn noch nicht entschiedenen** Rezepte: Was du schon hinzugefügt, übersprungen oder anderweitig in deinen Rezepten hast (gleiche Quelle), erscheint nicht wieder. Der Merkzettel liegt nur auf diesem Gerät.
- **Wenn nichts gefunden wird:** Die App sucht auf der Seite nach Rezept-Links der Form `…/rezepte/<Nummer>/<Name>` (Chefkoch) und nach einer strukturierten Liste (`ItemList`). Meldet sie „keine Rezept-Links gefunden“, lädt die Seite ihre Rezepte vermutlich erst per JavaScript nach (das kann der Hilfsdienst nicht lesen) oder der Link zeigt auf eine andere Seite. Probiere dann einen anderen Link, z. B. eine Rezepte-Übersicht, die die Rezepte schon im Seitentext enthält, oder schick mir einen Screenshot der Meldung.
- **Fairer Umgang:** Die App ruft die Seite höchstens einmal am Tag ab und die Rezepte nur, wenn du sie ansiehst. Beachte die Nutzungsbedingungen der jeweiligen Seite; Rezepte bleiben mit Quelle gekennzeichnet.

## Neu in Version 2.7: Speichern-Knöpfe und Fehlerbehebungen nach gründlicher Prüfung

- **Speichern-Knopf der Einstellungen.** „Speichern & verbinden“ (Gemeinsame Liste) und „Import-Einstellungen speichern“ sind **grau** und zeigen **„Gespeichert am 26.10.2026, 21:21“**, solange nichts geändert ist. Sobald du ein Feld änderst, ist der Knopf wieder aktiv und heißt **„Speichern“** (ohne Verbindung „Speichern & verbinden“). Scheitert das Verbinden (z. B. falscher Token), bleibt der Knopf aktiv für einen neuen Versuch. „Gespeichert am …“ erscheint erst, wenn die Verbindung klappt. „Token entfernen“ ist kürzer benannt; es entfernt nur die Verbindungsdaten, Name, Farbe und andere Geräteeinstellungen bleiben.
- **Ketten an einer Stelle** (`brand.js`): Erkennung am Namen, Angebotsseite, Drogerie-Verhalten und Logo kommen aus einer Tabelle. „Rossmann Drogerie“ und „ROẞMANN“ werden erkannt, „Müller Bäckerei“ ist **keine** Drogerie mehr. Das Geschäfte-Formular schreibt den Standardlink und die Voreinstellung nicht mehr fest, wenn man nur umbenennt; die Einstellung `anywhere` wird geprüft (Wahrheitswert oder leer).
- **Ziehen zum Löschen:** Nach Escape oder spätem Loslassen öffnet sich nichts mehr (der Klick wird bis kurz nach dem Loslassen unterdrückt). Der Scroll-Blocker steht nur noch zwischen Drücken und Loslassen bereit, nicht mehr dauerhaft.
- **Statuszeile oben** ist wieder Text statt Knopf (Bildschirmleser lesen sie als Status vor); antippen geht weiter.
- **Aufräumen** zählt auch Namenszuordnungen und Vorlagen. Das Offline-Paket enthält jetzt auch das Maskable-Symbol; ein Test prüft, dass jede Datei, die die App braucht, im Paket steckt, jede `id` eindeutig ist und die README alle Skriptdateien nennt.
- Symbole und Zeilen oben wieder mindestens 44 px hoch (Statuszeile, Abgleichen-Knopf, „Angebote“/„Kassenbon“), die Reiterleiste im Laden blendet den letzten Reiter nicht mehr aus.

## Neu in Version 2.6: Rossmann, Geschäfte als Logo

- **Artikel ohne Geschäft stehen bei Drogerien nicht.** Im Modus „Im Laden“ erscheinen Artikel ohne Geschäft sonst unter „Überall möglich“. Bei **Rossmann** (auch „Roßmann“), **dm**, **Müller**, **Douglas** und **Budni** stehen sie standardmäßig **nicht** dort, und auch der Zähler am Reiter zählt sie nicht. Unten steht ein Hinweis („1 Artikel ohne Geschäft stehen hier nicht“). Pro Geschäft einstellbar: **Geschäfte** (Symbol neben „Planen | Im Laden“) → beim Geschäft **„Im Laden“ auch Artikel ohne Geschäft anzeigen**. Die Einstellung liegt in der gemeinsamen Datei (Feld `anywhere` am Geschäft), beide sehen dasselbe.
- **Angebotsseite für Rossmann:** `https://www.rossmann.de/de/angebote` ist als Standardlink hinterlegt (wie bei Edeka, Lidl und Rewe). Ein **leeres Feld im Dialog „Geschäfte“ heißt jetzt „Standardlink der Kette“**, sonst keiner; so bekommt auch ein früher ohne Link angelegtes Rossmann den Link. Ein eigener Link gewinnt immer.
- **Geschäfte als Text oder Logo:** Einstellungen → Darstellung & Sicherung → **Geschäfte anzeigen als**. „Logo“ zeigt Edeka, Lidl, Rewe, Rossmann, Aldi, Kaufland und Penny als **Schriftzug in den Farben der Kette** (Reiter, Schnellwahl beim Hinzufügen, Überschriften in der Liste, Im Laden). Es sind **keine Original-Logos** (Markenzeichen, Bilddateien), nur Name und Farben. Unbekannte Geschäfte bleiben Text. Die Wahl gilt pro Gerät.

## Neu in Version 2.5: Vorlagen, kürzere Preiszeilen, Token-Warnung

- **Vorlagen.** Eine Vorlage ist eine gespeicherte Liste, z. B. „Wocheneinkauf“. In der Einkaufsliste ins Namensfeld tippen: Unter der Schnellwahl erscheint **Vorlagen**. Im Dialog steht oben, was schon gespeichert ist (**Auf die Liste** trägt alle Artikel ein, schon offene werden zusammengezählt, jeder Artikel bleibt bei seinem Geschäft; Mülleimer löscht die Vorlage). Unten speichert **Als Vorlage speichern** die **offenen** Artikel der gerade gewählten Ansicht (Alle Geschäfte oder ein Geschäft) mit Menge und Geschäft. Gleicher Name (Groß-/Kleinschreibung egal) ersetzt die Vorlage. Höchstens 80 Artikel je Vorlage. Vorlagen liegen in der gemeinsamen Datei (`templates`), beide sehen sie.
- **Kürzere Preiszeile.** Unter einem Artikel steht statt des langen Satzes nur noch **„Am günstigsten: Lidl 3,98 €/kg · 25.10.26“** (bei einem einzigen Geschäft „Preis: …“), mit „(alt)“, wenn die Notiz über zwei Monate alt ist. Die ausführliche Fassung („zuletzt eingetragen am …“ je Geschäft) steht im Preisvergleich im Bearbeiten-Dialog.
- **Token-Warnung.** Seit Version 2.7 trägst du das **Ablaufdatum** des Tokens unter „Gemeinsame Liste“ von Hand ein („Token gültig bis“, optional; bei „No expiration“ leer lassen). Sieben Tage vorher steht oben in der Statuszeile **„Token läuft in 3 Tagen ab · neuen anlegen“** (orange), danach **„Token abgelaufen · neuen anlegen“** (rot); ein Tipp darauf öffnet die Eingabe. Die Version 2.5 wollte das Datum aus einem Antwortkopf von GitHub lesen; GitHub gibt ihn dem Browser aber nicht heraus, deshalb die Handeingabe. Ein neuer Token ohne neues Datum löscht das alte Datum.
- **Einstellungen merken die offenen Bereiche** (pro Gerät). „Gemeinsame Liste“ steht offen, solange nicht verbunden ist; das wird nicht gemerkt.
- **Android.** Ziehen zum Löschen, Layout, Im Laden und die Unterdrückung des Kontextmenüs beim langen Drücken sind mit einem emulierten Pixel 7 (Chrome) geprüft, **nicht** auf einem echten Android-Gerät.

## Neu in Version 2.4: Einstellungen zum Auf- und Zuklappen

Jeder Bereich der Einstellungen (Gemeinsame Liste, Rezepte aus Links laden, Vorrat, Datenumfang, Darstellung & Sicherung) ist ein Abschnitt, den man mit einem Tipp auf die Überschrift (Pfeil rechts) auf- und zuklappt. Sie stehen zunächst zu; nur „Gemeinsame Liste“ ist offen, solange noch nicht verbunden ist. Seit Version 2.5 merkt sich jedes Gerät, welche Bereiche offen waren.

## Neu in Version 2.3: weniger Platz oben, Geschäfte zuerst im Laden

Keine neuen Datenfelder, nur Bedienung. Alles, was oben Platz kostete, ist kleiner geworden; die ersten Artikel stehen auf dem iPhone ohne Scrollen im Bild (gemessen bei 390 px Breite: Planen 416 statt 582 px, Im Laden 133 statt 356 px).

- **Kein Beispielmodus-Banner mehr.** Die Zeile „Beispielmodus · erfundene Daten · Verbinden“ ist weg. Die Statuszeile oben zeigt weiter „Nur auf diesem Gerät“, solange nichts verbunden ist; **ein Tipp darauf öffnet die Einstellungen** zum Verbinden. Ist verbunden, gleicht ein Tipp darauf ab (wie der Knopf rechts daneben).
- **Schmale Kopfzeile:** Statuszeile und Abgleichen-Knopf stehen in einer Zeile. Das Symbol und der Titel „Einkauf & Rezepte“ entfallen (der Titel bleibt für Screenreader).
- **Planen | Im Laden** bricht nicht mehr um; „Geschäfte“ ist ein Symbol-Knopf (Geschäft-Symbol, „Geschäfte verwalten“).
- **Summe kompakt:** Eine Zeile „Geschätzt 6,76 €“ (darunter klein, was ohne Preis ist) statt der großen Karte. Die Knöpfe „Angebote“ (Preisschild-Symbol) und „Kassenbon“ (Blatt-Symbol) sind auf dem Handy reine Symbole, damit der Text nie überlappt oder verrutscht; erst ab etwa 480 px Breite steht die Beschriftung dabei. Ein Test prüft das für jedes Geschäft (mit und ohne Angebotslink) bei 280 bis 430 px. „Noch keine Preise notiert“ steht klein statt groß.
- **Im Laden: Geschäfte ganz oben, darunter gleich die Artikel.** Kopfzeile und Umschalter sind in dieser Ansicht ausgeblendet. Ganz oben stehen die Geschäfte als große Reiter und rechts daneben **Planen** (der Weg zurück). Darunter steht die Zeile „Noch 3 offen · ca. 6,76 €“ mit dem Abgleichpunkt (grün: abgeglichen, orange: wartet, rot: Fehler), dann die Liste.
- Eingabefeld, Zeile „n offen · n erledigt / Erledigte entfernen“ und Reiter sind enger gesetzt.

## Neu in Version 2.2: Farbwahl, Standard ist dunkles Blau

Das bisherige Dunkelgrün ist ersetzt: **Standard ist jetzt Blau** (im Dunkelmodus ein tiefes Marineblau, im Hellmodus ein zartes Pastellblau). Unter **Einstellungen → Darstellung & Sicherung → Farbe** stehen sechs Farben zur Wahl: **Blau, Grün, Türkis, Flieder, Rosé, Pfirsich**. Die Wahl wirkt sofort, bleibt auf diesem Gerät gespeichert (jedes Gerät kann seine eigene Farbe haben) und ändert die Hintergrundfarbe, die Karten, Linien, Knöpfe und die Farbe der Statusleiste.

- **Hell = Pastell, Dunkel = tiefer Ton.** Die Farbe ist unabhängig von „Darstellung“ (Wie auf dem Gerät / Hell / Dunkel). Wer Grün mag, wählt es einfach wieder aus.
- Alle Farben leiten sich in `styles.css` aus einem einzigen Farbton (`--h`) ab; eine weitere Farbe braucht nur eine Zeile dort, einen Knopf in `index.html` und den Namen in `theme.js` und `app.js` (`PALETTES`).
- `theme.js` setzt Farbe und Hell/Dunkel vor dem ersten Anzeigen, damit beim Start nicht kurz die Standardfarbe aufblitzt.
- Ein Test prüft für jede Farbe in Hell und Dunkel, dass Text, Zweittext, Akzent und Knopfbeschriftung mindestens 4,5 : 1 Kontrast haben. Rot für Warnungen und das Gelb von „Neu von …“ bleiben in jeder Farbe gleich.
- Das App-Symbol (grüner Einkaufskorb) ist unverändert.

## Neu in Version 2.1: Artikel in den Mülleimer ziehen

Keine neuen Datenfelder, nur Bedienung. In der Einkaufsliste (Ansicht **Planen**) löscht man einen Artikel auch per Geste: **Zeile lange gedrückt halten** (knapp eine halbe Sekunde, bis sie „abhebt“), dann **nach rechts** schieben. Am rechten Rand erscheint ein **roter Mülleimer**; er färbt sich dunkler und wird größer, sobald der Finger darüber ist. **Loslassen löscht** den Artikel (kurzer Hinweis „„Milch“ gelöscht“, wie beim Löschen im Dialog ohne Rückgängig-Knopf). Anderswo loslassen bricht ab, die Zeile gleitet zurück; auch **Esc** bricht ab (Tastatur am Rechner).

- Wer sich vor Ablauf der Haltezeit bewegt, **scrollt** nur; ein kurzer Tipp öffnet wie bisher die Bearbeitung. Nach langem Halten ohne Löschen öffnet sich nichts und nichts wird abgehakt.
- Gilt für offene, abgehakte und „neu von …“-Zeilen. Im Modus **Im Laden** gibt es die Geste absichtlich nicht (dort wird nur abgehakt).
- Der Browser darf die Seite während des Ziehens nicht mitscrollen, und der Text einer Zeile soll sich beim langen Drücken nicht markieren lassen. Beides ist abgefangen, wurde aber nur in Chromium mit simulierten Berührungen geprüft, nicht auf einem echten iPhone.
- Die Logik steht in `dragdelete.js` (Offline-Paket v12, seit Version 2.2 v13).

## Neu in Version 2.0: aufgeräumt und per Siri hinzufügen

Keine neuen Datenfelder, nur Bedienung. Beide Geräte können unabhängig voneinander aktualisieren.

- **Eingabeformular klappt zu.** Im Ruhezustand sieht man nur das Namensfeld mit „+“ (Menge 1 Stück). Sobald man hineintippt, erscheinen Geschäft, Menge, Einheit, die Schnellwahl und „Kategorie, Preis & Angebot“. Es bleibt offen, solange der Cursor im Formular steht oder im Namensfeld Text steht; ein Tipp auf freie Fläche (ohne Text) klappt es wieder zu. Das gewählte Geschäft steht als Hinweis im Namensfeld („Was brauchst du? → Lidl“). Die erste Artikelzeile steht dadurch deutlich höher, auf dem iPhone ohne Scrollen im Bild.
- **Titel und Umschalter in einer Zeile:** „Planen | Im Laden“ und „Geschäfte“ stehen nebeneinander, die Überschrift „Einkaufsliste“ ist nur noch für Screenreader da. Die Summenkarte nennt nur noch etwas, wenn Preise fehlen.
- **Zeile antippen = bearbeiten.** Die Artikelzeilen haben nur noch den Haken links; ein Tipp auf den Namen öffnet „Artikel & Preis“. Der Stift und der Mülleimer in der Zeile entfallen. **Löschen** steht ganz unten im Dialog („Artikel löschen“). Das ist ruhiger und schützt vor Fehltipps, denn es gibt seit Version 1.7 kein Rückgängig. In „Neu von …“ steht nur noch „Übernehmen“; zum Bearbeiten oder Löschen die Zeile antippen.
- **Einstellungen:** Sobald GitHub verbunden ist, steht **Gemeinsame Liste** (Name, Repository, Token) **ganz unten und eingeklappt** („✓ haushalt/daten · Nico“). Oben stehen Vorrat und Darstellung, danach Datenumfang und die Link-Einstellungen. Solange nichts verbunden ist, steht die Verbindung wie bisher oben und offen.
- **Artikel per Siri oder Kurzbefehl hinzufügen:** Die App versteht Links der Form `https://nicoahb.github.io/Einkaufsliste-Rezepte/?add=Milch, Eier und 500 g Butter`. Mehrere Artikel trennt man mit Komma, „und“, Semikolon oder Zeilenumbruch; Mengen und Einheiten werden erkannt („2 Eier“, „500 g Butter“, „1,5 l Hafermilch“), ohne Menge gilt 1 Stück. Optional wählt `&store=Lidl` das Geschäft (Teil des Namens genügt). Gleiche Artikel zählen zu vorhandenen dazu, gemerkte Schreibweisen werden angewendet. Die Adresse wird danach bereinigt, ein Neuladen fügt nichts doppelt hinzu. Ein kurzer Hinweis nennt, was hinzugefügt wurde.

  Einmalig einen Kurzbefehl anlegen (nicht getestet, da hier kein iPhone zur Verfügung stand):
  1. App **Kurzbefehle** → **+** → Name „Einkaufsliste“.
  2. Aktion **Text diktieren** (Sprache Deutsch) hinzufügen.
  3. Aktion **URL-codieren**, Eingabe: *Diktierter Text*.
  4. Aktion **Text**: `https://nicoahb.github.io/Einkaufsliste-Rezepte/?add=` und dahinter die Variable *URL-codierter Text*. Für einen festen Laden `&store=Lidl` anhängen.
  5. Aktion **URLs öffnen**, Eingabe: das Ergebnis der Text-Aktion.

  Dann: „Hey Siri, Einkaufsliste“ und den Artikel sagen. **Wichtig:** Der Link öffnet sich in Safari. Auf dem iPhone speichern Safari und die Homescreen-App getrennt. Wer die App nur über das Homescreen-Symbol nutzt, muss in Safari einmal Name und Token eintragen (Einstellungen), sonst landen die Artikel nur lokal in Safari und die App zeigt den Hinweis „nur auf diesem Gerät: hier ist GitHub nicht verbunden“. Am einfachsten ist es, die App dann auch in Safari zu nutzen.

## Neu in Version 1.9: Modus „Im Laden“

Oben in der Einkaufsliste schaltet **Planen | Im Laden** um (die Wahl bleibt auf diesem Gerät gespeichert). **Planen** ist die bisherige Ansicht mit Eingabeformular, Preisen und Bearbeiten. **Im Laden** zeigt nur das Wichtige:

- **Geschäft oben wählen:** große Schalter für Edeka, Lidl, Rewe … mit der Zahl der offenen Artikel. Es ist nichts vorgewählt, bis ihr tippt; ein Tipp wechselt das Geschäft jederzeit.
- **Eine Zeile je Artikel:** Name und Menge in großer Schrift, ein Tipp hakt ab. Kein Eingabefeld, kein Stift, kein Mülleimer, damit im Gedränge nichts versehentlich gelöscht wird. Nach Gängen im Laden geordnet (Obst & Gemüse, Brot, Kühlregal …), wie in der Planen-Ansicht.
- **Kopfzeile:** „Noch 7 offen · ca. 23,40 €“ (die Schätzung nur, wenn Preise bekannt sind) und „3 Artikel für andere Geschäfte“ am Listenende.
- **Artikel ohne Geschäft stehen überall,** in jedem Geschäft unter **„Überall möglich“**, bis sie abgehakt sind. Wer sie bei Edeka abhakt, findet sie bei Lidl nicht mehr (auch nicht unter „Erledigt“). Nur bei Edeka steht der Artikel in dieser Sitzung unter „Erledigt“, falls ihr euch vertippt habt: ein Tipp öffnet ihn wieder, dann ist er auch bei Lidl wieder da. Nach einem Neustart der App ist diese Merkhilfe weg; der abgehakte Artikel bleibt trotzdem in allen Läden verschwunden (er ist ja erledigt).
- **Erledigt (n)** ist eingeklappt und lässt sich aufklappen; ein Tipp auf eine erledigte Zeile öffnet sie wieder.
- **„Neu von Anna“** steht auch im Laden, schmal und gelb ganz oben, mit „Übernehmen“. So seht ihr, was die Partnerin unterwegs ergänzt hat.
- **Bildschirm anlassen** (nur wo das Gerät es anbietet) hält das Display wach, solange die Ladenansicht offen ist. Beim Wechsel auf einen anderen Bereich oder in den Hintergrund wird die Sperre freigegeben.
- **Einkauf beenden:** entfernt alle abgehakten Artikel von der Liste (eine Rückfrage nennt die Zahl) und bietet an, gleich den **Kassenbon** einzufügen. Das Geschäft, in dem ihr zuletzt wart, ist dort vorgewählt, falls der Bon den Markt nicht selbst nennt.
- Neue Artikel legt ihr unter **Planen** an. Es ändert sich nichts am Datenmodell; beide Geräte können unabhängig voneinander aktualisieren.

## Neu in Version 1.8: Kassenbons, Mengen ohne Verlust, Kochmodus, „Neu von …“

### Kassenbon einfügen (Einkauf → **Kassenbon**)

Für die Preisliste kann man gelegentlich den Text eines **digitalen Kassenbons** einfügen (aus der App oder dem PDF des Marktes kopiert, im PDF-Betrachter den Text markieren). Die App zerlegt ihn in Zeilen und zeigt jede Zeile zur Prüfung: Name in der App, Preis, Menge, Einheit. Erst nach „Preise speichern“ landen die Preise in eurer GitHub-Datei (Sammlung `prices`, wie bisher); der Bon selbst wird nicht gespeichert.

- **Erkannt werden** Artikelzeilen mit Preis, „2 x 0,79“, „0,432 kg x 3,99 EUR/kg“, Packungsgrößen im Namen („250g“, „1L“, „10 St“, „6x1,5L“), Rabatt-/Coupon-Zeilen (negativ), Pfand/Leergut (wird übersprungen), die Summe und das Datum. Der Markt wird aus dem Kopf des Bons einem eurer Geschäfte zugeordnet („Rewe“), sonst wählt ihr es.
- **Summenprobe:** Die App vergleicht die Summe der erkannten Zeilen mit der Summe auf dem Bon. Weicht sie ab, steht eine Warnung dort („Möglicherweise fehlen Zeilen“), und nicht erkannte Zeilen sind aufklappbar.
- **Namen:** „TOM CHERRY 250G“ ist nicht „Tomaten“. Die App schlägt den Namen vor, den sie schon kennt („Vorschlag, bitte prüfen“), oder nimmt eine **gemerkte Zuordnung** („Zuordnung gemerkt“). Ändert ihr einen Namen und speichert, merkt sich die App die Zuordnung (Sammlung `aliases`, wenige KB) und wendet sie beim nächsten Bon automatisch an. Der Preis gehört zu dem Namen, den ihr wählt: Wer immer laktosefreie H-Milch kauft, ordnet sie „Milch“ zu, und die Schätzung rechnet mit dem, was ihr wirklich bezahlt. Wer Cherry- und Rispentomaten unterscheiden will, gibt ihnen verschiedene Namen.
- **Aktionen sind keine Preisänderung:** Eine Zeile mit Rabatt wird als Aktion gespeichert (bezahlter Preis plus bekannter Normalpreis).
- **Schon eingetragen:** Dieselbe Zeile am selben Tag ist vorab abgewählt, falls ihr einen Bon zweimal einfügt.
- **Ältere Bons:** Das Datum bestimmt, wann ein Preis gilt. Ein später eingefügter älterer Bon überschreibt keinen neueren Preis.

### Preisänderungen grün und rot

Wenn sich der **Normalpreis** eines Produkts im selben Geschäft **deutlich** ändert (mindestens 3 % und 2 Cent, umgerechnet auf dieselbe Menge, nur bei vergleichbaren Einheiten), erscheint am Artikel auf der Liste ein Hinweis: **▲ Teurer: 1,29 € → 1,39 € je Stück (+8 %) seit 12.03.** (rot) oder **▼ Günstiger …** (grün). Pfeil und Wort stehen dabei, die Farbe ist nicht das Einzige. Aktionspreise zählen nie als Änderung, ebenso nicht Preise in einer anderen Einheitengruppe oder in einem anderen Geschäft. Der Hinweis bleibt **60 Tage** sichtbar, auch wenn ihr danach weitere Male zum neuen Preis einkauft (er steht als Feld `trend` an der Preisnotiz). Dieselbe Vorschau zeigt der Kassenbon-Dialog je Zeile. Das gilt auch für von Hand notierte Preise.

### Alter von Preisen und Angebote mit „gültig bis“

- Im **Preisvergleich** (Stift-Dialog eines Artikels) steht bei jedem Geschäft **„zuletzt eingetragen am …“**; Notizen über zwei Monate Alter sind rot markiert („über zwei Monate her“). Auf der Liste steht beim günstigsten Preis das Eintragsdatum.
- Angebote haben ein optionales **„Angebot gültig bis“**. Am letzten Tag gilt das Angebot noch, danach ist es **abgelaufen**: Der Artikel zeigt „Angebot abgelaufen (12.03.)“, die Summe und der Vergleich rechnen wieder mit dem normalen Preis. Ohne Datum gilt ein Angebot, bis ihr es ausschaltet (wie bisher). Das Datum wird auch in der Preisliste mitgespeichert (`saleUntil`).

### Gleichzeitiges Zusammenzählen: nichts geht verloren

Stand auf der Liste „1 Milch“ und beide legen unabhängig je „+1“ darauf, ergab das bisher 2 statt 3, weil die später eintreffende Änderung die frühere überschrieb. Jetzt wird nicht mehr die neue Gesamtmenge gespeichert, sondern der **Zuwachs** (`add`). Die Menge ergibt sich aus dem zuletzt ausdrücklich gesetzten Wert (z. B. im Stift-Dialog) plus allen jüngeren Zuwächsen, **unabhängig von der Reihenfolge und von der Zeit des Abgleichs**: 1 + 1 + 1 = 3, auch wenn ein Gerät tagelang offline war. g und kg, ml und l werden umgerechnet (500 g + 0,7 kg = 1,2 kg).

- Setzt jemand die Menge ausdrücklich (Stift-Dialog), gilt das, und nur jüngere Zuwächse kommen hinzu; ältere Zuwächse werden davon überschrieben.
- **Gleichzeitig neu angelegte Doppel** („Milch“ auf beiden Geräten, die Liste hatte noch keine) werden beim Abgleich zusammengeführt: Der zuerst angelegte Eintrag bleibt, der zweite wird gelöscht und seine Menge dazugezählt. Beide Geräte erzeugen dieselben Änderungen, deshalb zählt nichts doppelt. Einträge mit eigenem Preis, in anderen Geschäften, erledigte oder mit unpassender Einheit bleiben getrennt.
- Intern führt der Artikel die Felder `_base` (gesetzter Wert) und `_adds` (Zuwächse mit Zeit und Person). Das Aufräumen übernimmt Zuwächse, die älter als 14 Tage sind, in den Wert.
- Grenze: Ein Gerät, das **länger als 14 Tage** offline war, hat seine Zuwächse trotzdem nicht verloren, solange der Artikel noch existiert. Wurde der Artikel inzwischen aufgeräumt, entfällt seine Änderung (siehe Version 1.6).

### Schreibweisen lernen und Schnellwahl

- **Zwiebel / Zwiebeln, Tomate / Tomaten, Apfel / Äpfel:** Tippt ihr einen Namen, der wie ein bekannter Name klingt, aber anders geschrieben ist, erscheint **„Meinst du dasselbe wie …?“**. Das ist nur ein Vorschlag, die App ändert nichts von selbst. **Antippen bestätigt** die Zuordnung: Sie wird gemerkt (Sammlung `aliases`), und künftig wird „Zwiebel“ beim Hinzufügen automatisch zu „Zwiebeln“ (ein kurzer Hinweis nennt es). Die Verläufe beider Schreibweisen zählen dann zusammen (Vorschläge, Kategorien). „Ei“ und „Eis“ werden nicht verwechselt.
- **Schnellwahl:** Unter der Geschäftsauswahl stehen bis zu sechs **häufig gekaufte Artikel** (mindestens zweimal vorgekommen und gerade nicht auf der Liste), zum Beispiel Kochschinken, Milch, Eier. Ein Tipp legt den Artikel (Menge 1, zuletzt verwendete Einheit) im gewählten Geschäft an. Sie verschwinden beim Tippen und wenn der Artikel schon offen ist. Das Namensgedächtnis aus dem Aufräumen (Version 1.6) merkt sich dafür auch die Einheit.

### Kochmodus

Auf jeder Rezeptkarte öffnet **Kochen** eine Vollbildansicht: die Zutaten (für die gewählte Portionszahl) als große, einzeln abhakbare Zeilen und die Zubereitung in **großen, nummerierten Schritten**, die man beim Kochen antippt, um sie abzuhaken. Steht die Zubereitung in einem Absatz, teilt die App sie an den Satzenden. Haken gelten nur für diese Sitzung und werden nicht abgeglichen. **„Bildschirm anlassen“** (erscheint nur, wo das Gerät es anbietet: Safari ab iOS 16.4; als Homescreen-App hängt es von der iOS-Version ab, das konnte ich nicht prüfen) hält das Display wach; die Wahl wird auf diesem Gerät gemerkt, und beim Verlassen der App oder Schließen der Ansicht wird die Sperre freigegeben. Klappt es nicht, zeigt die App den Hinweis, in den iPhone-Einstellungen die automatische Sperre zu verlängern. **„Fertig · Heute gekocht“** trägt das Rezept als heute gekocht ein.

### Tastatur schließt sich beim Tippen auf leere Fläche

Ein Tipp auf leere Fläche (nicht auf ein Eingabefeld, einen Knopf, einen Link oder eine Beschriftung) nimmt dem Eingabefeld den Fokus, die Tastatur klappt weg. Das gilt in der Einkaufsliste und in allen Dialogen, auch beim Eintragen neuer Zutaten im Rezept. Wischen und Scrollen zählen nicht (höchstens 10 px Bewegung). Nach dem Hinzufügen eines Artikels bleibt der Cursor im Namensfeld, damit man mehrere Artikel nacheinander eintragen kann; ein Tipp daneben schließt die Tastatur.

### Neu von der Partnerin

Was eine **andere Person** auf die Liste gesetzt hat, steht jetzt **farbig (gelb) oben** unter „Neu von Anna“, bis ihr es mit **Übernehmen** bestätigt; dann reiht es sich in die Liste ein. **Alle übernehmen** bestätigt alles auf einmal. Das gilt auch, wenn die andere Person die **Menge** eines vorhandenen Artikels erhöht hat („+100 g von Anna“), denn durch das Zusammenzählen würde es sonst unbemerkt in einem vorhandenen Eintrag verschwinden. Eigene Artikel, erledigte und gelöschte erscheinen dort nie. Welche Einträge ihr schon gesehen habt, merkt sich nur dieses Gerät (nicht in GitHub); beim ersten Start mit Version 1.8 und auf einem neuen Gerät gilt alles Vorhandene als gesehen, damit nicht die ganze Liste als neu erscheint.

## Neu in Version 1.7: keine Rückgängig-Leiste mehr

Die Leiste „Rückgängig“ über der unteren Leiste ist entfernt. Wer etwas zurücknehmen will, nimmt den Mülleimer (neu hinzugefügte Artikel) oder legt Gelöschtes neu an. Geblieben sind kurze Hinweise ohne Knopf, die nach vier Sekunden von selbst verschwinden: wo ein neuer Artikel steht, wenn er in der gewählten Ansicht nicht erscheint, auf welche Menge ein Artikel erhöht wurde und was bei „Auf die Liste“ übernommen wurde. Die Daten ändern sich dadurch nicht; beide Geräte können unabhängig voneinander aktualisiert werden.

## Neu in Version 1.6: Datei bleibt klein, gleiche Artikel zählen zusammen, Vorrat

### Die App darf nicht zu groß werden: Aufräumen und Datenumfang

Bisher löschte die App nie wirklich, sondern markierte nur („Löschmarkierung“), damit der Abgleich zweier Geräte funktioniert. Ohne Aufräumen wächst die Datei dadurch um knapp 2 KB je Artikel, bei 20 Artikeln pro Woche wäre die Grenze von 900 KB in etwa einem halben Jahr erreicht. Jetzt gilt:

- **Automatisch:** Sobald die gemeinsame Datei 250 KB überschreitet, räumt die App beim nächsten Abgleich selbst auf. Bei normaler Nutzung (rund 20 Artikel pro Woche) pendelt sich die Datei bei etwa 150 KB ein, dauerhaft und ohne dass jemand daran denken muss.
- **Von Hand:** Einstellungen → **Datenumfang** zeigt den Füllstand („9 KB von 879 KB belegt“), was aufräumbar wäre, und den Knopf **Jetzt aufräumen**.
- **Was entfernt wird:** gelöschte Einträge nach **14 Tagen**; erledigte, aber nie entfernte Artikel nach **21 Tagen**; vergangene Gerichte im Wochenplan nach 120 Tagen; alte Preisnotizen (je Geschäft, Produkt und Einheit bleiben die zwei neuesten); die Zeitstempel je Feld bei Einträgen, die seit 14 Tagen unverändert sind; ältere Einträge der Liste bereits übertragener Änderungen (es bleiben die letzten 600). Alles, was nicht gelöscht ist, bleibt: offene Artikel, Rezepte, Zutaten, Geschäfte und der Vorrat.
- **Vorschläge und gelernte Kategorien bleiben:** Aus entfernten Artikeln merkt sich die App Name, Kategorie und Häufigkeit (höchstens 300 Namen, Feld `names`). Wer „Kochschinken“ einmal in „Fleisch & Fisch“ eingeordnet hat, behält das auch nach dem Aufräumen.
- **Sicher für zwei Geräte:** Aufgeräumt wird auf dem gerade gelesenen gemeinsamen Stand und mit derselben Prüfung geschrieben wie jede andere Änderung. Ändert das andere Gerät gleichzeitig, wird neu gelesen und neu aufgeräumt. Nichts wird einseitig auf einem Gerät gelöscht.
- **Grenze für Offline-Geräte:** Ein Gerät, das **länger als 14 Tage** offline war, kann Änderungen an Einträgen enthalten, die inzwischen aufgeräumt wurden. Diese Änderungen werden beim Abgleich verworfen (statt halbe Einträge anzulegen). Neu angelegte Einträge sind nicht betroffen.
- **Das Backup liegt in Git:** Alles, was aufgeräumt wird, steht weiter im Verlauf (Commits) des privaten Daten-Repositorys auf GitHub und lässt sich dort wiederherstellen. Die Datei selbst wird ohne Einrückung geschrieben (etwa halb so groß wie vorher).
- **Rezeptfotos** liegen als eigene Dateien im Daten-Repository und zählen nicht zur Datenmenge. Ersetzte oder entfernte Fotos bleiben dort zurück. Unter **Datenumfang → Nicht mehr genutzte Fotos löschen** (nur verbunden) werden Fotodateien gelöscht, auf die kein Rezept mehr verweist; vorher fragt die App nach. **Nur sinnvoll, wenn beide Geräte gerade abgeglichen sind:** Ein Foto, das ein anderes Gerät eben hochgeladen und noch nicht an ein Rezept gehängt hat, würde sonst als ungenutzt gelten. Fotos im lokalen Speicher, auf die nichts mehr verweist, räumt die App beim Start selbst weg.

### Gleiche Artikel zählen zusammen

Beim Hinzufügen, bei **Auf die Liste** (Rezept) und bei **Einkauf für die Woche** erhöht die App die Menge eines **offenen** Artikels mit demselben Namen im **selben Geschäft** (oder „Ohne Geschäft“), statt einen zweiten Eintrag anzulegen: „Bananen 2 Stück“ + „bananen 3 Stk.“ = 5 Stück.

- Eingerechnet wird nur, was sicher passt: g und kg (ab 1000 g wird kg angezeigt), ml und l, Stück, oder dieselbe Einheit (Bund, EL …). **500 g Tomaten und 2 Stück Tomaten bleiben getrennte Einträge**, ebenso Einträge in verschiedenen Geschäften oder erledigte Artikel.
- Zutaten **„nach Bedarf“** (Salz, Pfeffer) werden nicht noch einmal aufgeschrieben, wenn der Artikel schon offen auf der Liste steht.
- Ein kurzer Hinweis nennt, was passiert ist („Übernommen: 3 neu, 2 dazugezählt“). Eine falsch erhöhte Menge ändert man im Stift-Dialog, einen falschen Eintrag löscht man mit dem Mülleimer. Wer beim Hinzufügen einen Preis eingibt, bekommt immer einen eigenen Eintrag.

### Vorrat

Einstellungen → **Vorrat**: Zutaten, die ihr immer zu Hause habt (Salz, Mehl, Öl). Sie sind beim Übernehmen von Rezepten und beim Wocheneinkauf **vorab abgewählt** und mit „Vorrat“ gekennzeichnet; man kann sie trotzdem wieder anwählen. „Salz, Pfeffer“ oder „Salz und Pfeffer“ zählt als Vorrat, wenn jeder Teil im Vorrat steht. Beim Übernehmen gibt es außerdem **„Abgewählte Zutaten als Vorrat merken“** (standardmäßig aus). Der Vorrat gilt für beide Geräte. Auf einem Gerät mit Version 1.5 oder älter ist er unsichtbar, geht aber nicht verloren.

## Neu in Version 1.5: Gesamtliste und optionales Geschäft

- **Startseite = Gesamtliste.** Die Einkaufsliste öffnet mit dem Filter **Alle**: Alles, was ihr für den nächsten Einkauf braucht, in einer Liste. Darin steht zuerst der Abschnitt **Ohne Geschäft**, danach ein Abschnitt je Geschäft; innerhalb der Abschnitte bleiben die Gänge (Kategorien) erhalten. Die Summe oben gilt für alle offenen Artikel zusammen.
- **Filter bleiben.** Neben „Alle“ gibt es einen Filter je Geschäft und **Ohne Geschäft** (erscheint, sobald es solche Artikel gibt). Die Angebote-Schaltfläche steht nur in der Ansicht eines einzelnen Geschäfts.
- **Geschäft beim Hinzufügen mit einem Tipp wählen.** Direkt unter dem Namensfeld stehen die Schnellwahl-Knöpfe **Kein Geschäft**, **Edeka**, **Lidl** … Ein Tipp wählt das Geschäft, ein zweiter Tipp auf dasselbe nimmt die Auswahl zurück. **Ohne Auswahl bekommt der Artikel kein Geschäft** (es ist nichts vorausgewählt). Wer in der Ansicht eines einzelnen Geschäfts hinzufügt, bekommt dieses Geschäft vorgewählt, sonst verschwände der neue Artikel aus der Liste. Die Auswahl bleibt nach dem Hinzufügen stehen, damit man mehrere Artikel nacheinander für denselben Laden eintragen kann. Erscheint ein neuer Artikel nicht in der gerade gewählten Ansicht, meldet die App kurz, wo er steht („‚Joghurt‘ steht bei ‚Lidl‘“). Der Hinweis verschwindet nach wenigen Sekunden.
- **Später zuordnen oder ändern:** im Stift-Dialog des Artikels (Feld „Geschäft“). So wandert ein Artikel aus „Ohne Geschäft“ in den Abschnitt des Ladens, in dem ihr ihn dann doch kauft.
- **Rezepte und Wochenplan** übernehmen Zutaten jetzt wahlweise **ohne Geschäft**; danach zeigt die App die Gesamtliste.
- **Erledigtes** steht in der Gesamtliste gesammelt unten und nennt sein Geschäft. „Erledigte entfernen“ gilt für die gerade gewählte Ansicht.
- Preise werden weiterhin je Geschäft gemerkt; ohne Geschäft kann man einen Preis eintragen, er wird aber erst nach Zuordnung eines Geschäfts für Vorschläge und Vergleiche gemerkt.
- **Daten:** Ein Artikel ohne Geschäft hat `storeId: ""`. Auf einem Gerät mit Version 1.4 oder älter bleiben solche Artikel unsichtbar (sie gehen nicht verloren). Deshalb **auf beiden Geräten aktualisieren**, bevor ihr Artikel ohne Geschäft anlegt. Artikel eines **gelöschten** Geschäfts bleiben wie bisher überall verborgen.

## Seit Version 1.4: Wochenplan, Gänge im Laden, Rezeptfotos, Favoriten

### Einkaufsliste nach Gängen (Kategorien)

Die Einkaufsliste ist nach Gängen im Laden geordnet: Obst & Gemüse, Brot & Backwaren, Fleisch & Fisch, Milch/Käse/Eier, Tiefkühl, Vorrat & Konserven, Gewürze/Öl/Soßen, Süßes & Snacks, Getränke, Haushalt & Drogerie, Sonstiges. Erledigtes steht unten unter „Erledigt“.

- **Woher die Kategorie kommt:** (1) was ihr für den Artikel eingestellt habt, (2) sonst die zuletzt für **denselben Namen** verwendete Kategorie (die App lernt aus euren Artikeln, auch nach dem Löschen und auf beiden Geräten), (3) sonst eine Schätzung nach Stichwörtern („Kochschinken“ → Fleisch & Fisch, „Kokosmilch“ → Vorrat, nicht Milch). Findet sich nichts, steht der Artikel unter „Sonstiges“; es wird nichts geraten.
- **Ändern:** Beim Hinzufügen unter „Kategorie, Preis & Angebot“ (dort steht, was die App vorschlagen würde, z. B. „Automatisch (Obst & Gemüse)“) oder später im Stift-Dialog. Die Änderung gilt künftig für jeden Artikel mit diesem Namen.
- **Abschalten:** Einstellungen → „Einkaufsliste nach Kategorien ordnen“ (gilt nur für dieses Gerät).
- Die Stichwortliste kennt viele, aber nicht alle Produkte. Fehlzuordnungen einmal korrigieren genügt.

### Wochenplan (neuer Tab „Plan“)

- Sieben Tage, Montag bis Sonntag, mit Wochen-Blättern („KW 44 · 26.10.–01.11.“) und „Heute“. Der heutige Tag ist hervorgehoben.
- **Gericht planen:** mit **＋** am Tag oder mit dem Kalender-Symbol auf einer Rezeptkarte. Wähle ein Rezept (Favoriten stehen oben) und die Portionen, oder ein **eigenes Gericht** ohne Rezept („Pizza bestellen“).
- **Gekocht abhaken:** Der Haken merkt sich am Rezept das Kochdatum („gekocht vor 3 Tagen“).
- **Einkauf für die Woche:** zählt die Zutaten aller geplanten Gerichte **zusammen** und rechnet auf die geplanten Portionen um. 800 g + 400 g Tomaten werden 1,2 kg, g und kg bzw. ml und l werden zusammengerechnet. Unterschiedliche Einheiten wie „2 EL Öl“ und „100 ml Öl“ bleiben getrennt, weil sich ein Esslöffel nicht ehrlich umrechnen lässt; „Zwiebel“ und „Zwiebeln“ gelten als verschiedene Namen. Unter jeder Zeile steht, aus welchem Rezept sie stammt. Schon gekochte Gerichte lassen sich auslassen; „nach Bedarf“-Zutaten sind abgewählt. Danach wählst du das Geschäft und übernimmst die Auswahl auf die Einkaufsliste.
- Tippen auf den Namen eines Gerichts springt zum Rezept. Entfernen geht mit dem Mülleimer.

### Favoriten, „zuletzt gekocht“ und Rezeptfotos

- **Favoriten:** Stern oben rechts auf der Rezeptkarte. Favoriten stehen zuerst; der Filter „★ Favoriten“ zeigt nur sie.
- **Zuletzt gekocht:** „Heute gekocht“ in der aufgeklappten Rezeptkarte, oder der Haken im Wochenplan. Der Filter „Lange nicht gekocht“ zeigt zuerst, was noch nie oder am längsten nicht auf dem Tisch stand.
- **Fotos:** Im Rezept-Editor „Foto hinzufügen“ (iPhone: Kamera oder Fotos). Das Foto wird auf dem Gerät auf höchstens 1200 Pixel verkleinert (JPEG, meist 100–250 KB). **Speicherort:** Es liegt nicht in `daten.json` (sonst wäre die 900-KB-Grenze schnell erreicht), sondern als eigene Datei `photos/<Kennung>.jpg` im **privaten Daten-Repository**, neben `daten.json`. Dasselbe Token wie bisher genügt (Contents: Read and write). Das zweite Gerät lädt das Foto beim Anzeigen nach und merkt es sich. Ohne Empfang bleibt ein neues Foto lokal in einer Warteschlange und wird beim nächsten Abgleich hochgeladen; das Rezept selbst wird in der Zwischenzeit schon abgeglichen. Im Beispielmodus bleiben Fotos nur auf dem Gerät.
- **Grenzen:** Wird ein Foto ersetzt oder entfernt, bleibt die alte Datei im Daten-Repository liegen (Fotos werden nie überschrieben, deshalb gibt es keine Schreibkonflikte). Sie lässt sich bei Bedarf auf GitHub unter `photos/` löschen. Das JSON-Backup enthält die Rezeptdaten, aber nicht die Fotodateien. Fotos wachsen im Daten-Repo mit; bei 100 Fotos sind das etwa 15–25 MB, weit unter dem Limit von GitHub.

## Seit Version 1.3: Rezept-Import, überarbeitete Oberfläche, technische Korrekturen

### Rezepte importieren (Rezepte → **Import**)

Immer gilt: Der Import liefert einen **Vorschlag**. Er öffnet den Rezept-Editor mit allen erkannten Feldern; erst nach deinem Tippen auf „Rezept speichern“ wird etwas gespeichert. Der Rohtext bleibt im Editor unter „Erkannten Rohtext anzeigen“ sichtbar, falls etwas fehlt.

| Quelle | Wie es funktioniert | Braucht |
| --- | --- | --- |
| **Screenshot oder Foto** | Texterkennung (Tesseract, Deutsch) läuft **auf dem Gerät**. Das Bild wird nirgends hochgeladen. Helle und dunkle Screenshots, mehrere Bilder nacheinander und sehr lange Screenshots (werden in Streifen gelesen) funktionieren. Beim ersten Mal lädt die App einmalig ca. 5 MB nach, danach geht es auch offline. | nichts |
| **Text** | Zutaten und Zubereitung aus Instagram, Notizen oder einer Webseite einfügen. Auch ein eingefügter Link, JSON-LD oder Seitenquelltext wird erkannt. | nichts |
| **Link** | Liest die strukturierten Rezeptdaten der Seite (schema.org/Recipe, wie sie Chefkoch, Lecker, Rewe, Kitchen Stories und die meisten Rezeptseiten bereitstellen) inklusive Portionen, Zeit und Tags. Ohne solche Daten wird der Seitentext wie bei „Text“ ausgewertet. | einen **Hilfsdienst** (siehe unten) |

**Warum ein Hilfsdienst für Links?** Browser dürfen fremde Webseiten aus Sicherheitsgründen nicht direkt lesen (CORS). Deshalb gibt es zwei Wege, die du in den Einstellungen unter „Rezepte aus Links laden“ wählst:

1. **Eigener Hilfsdienst (empfohlen, kostenlos, verlässlich):** ein 60-Zeilen-Skript bei Cloudflare, das nur für eure App freigegeben ist. Einrichtung in **Abschnitt 13**, ca. 10 Minuten, einmalig.
2. **Öffentliche Hilfsdienste (ohne Einrichtung):** allorigins.win und codetabs.com. Es wird dann **nur der Link der Rezeptseite** dorthin gesendet, nie dein Token oder deine Listen. Das ist standardmäßig **aus** und muss ausdrücklich erlaubt werden. Diese Dienste sind fremd: Sie können ausfallen, und manche Rezeptseiten blockieren sie. Sie wurden bei der Entwicklung nicht gegen echte Seiten getestet.

Wenn ein Link sich nicht laden lässt, bleibt immer der Weg über **Text** (Seite öffnen, Zutaten und Zubereitung kopieren, einfügen) oder **Screenshot**.

Was erkannt wird: Mengen wie `200 g`, `1,5 kg`, `1/2 TL`, `½ Bund`, `2–3 Zwiebeln`, `50 cl` (wird zu 500 ml), `eine halbe Zitrone`, `1 Dose à 400 g Tomaten`, Zutaten ohne Menge („Salz“, „etwas Zitronensaft“) als **„nach Bedarf“**. Eine erfundene Menge gibt es nie. Zutaten „nach Bedarf“ werden auf der Übernahme-Liste nicht vorausgewählt und landen sonst als „1 Stück“ auf der Einkaufsliste.

Rezepte haben jetzt eine optionale **Quelle** (Link). Sie wird auf der Rezeptkarte angezeigt.

### Link direkt aus Safari an die App senden

Die App nimmt Links über `…/Einkaufsliste-Rezepte/?import=https://…` entgegen und öffnet dann sofort den Import. So geht es vom iPhone-Teilen-Menü aus (Kurzbefehl, einmalig anlegen; nicht getestet, da hier kein iPhone zur Verfügung stand):

1. App **Kurzbefehle** → **+** → Namen „Rezept importieren“.
2. Aktion **URL-codieren** hinzufügen, Eingabe: *Kurzbefehl-Eingabe*.
3. Aktion **Text** hinzufügen: `https://nicoahb.github.io/Einkaufsliste-Rezepte/?import=` gefolgt von der Variablen *URL-codierter Text*.
4. Aktion **URLs öffnen** hinzufügen (Eingabe: der Text aus Schritt 3).
5. Oben auf **ⓘ** tippen → **Im Share Sheet anzeigen** einschalten, Eingabetypen nur **URLs** und **Safari-Webseiten**.

Danach: Rezeptseite in Safari → Teilen → **Rezept importieren**. (Android: Wer die App über Chrome installiert, findet sie nach der Installation direkt im Teilen-Menü; dafür sorgt `share_target` im Manifest.)

### Oberfläche

Kompakter Kopf, Geschäfte als Reiter mit Anzahl offener Artikel, Summe und Angebote in einer Zeile, Eingabezeile direkt sichtbar, ausklappbare Rezeptkarten mit Portionen-Schalter, Dialoge als „Bottom-Sheet“, Symbole als SVG, überarbeitete Farben in Hell und Dunkel. Der Name der Person ist jetzt frei wählbar (nicht mehr nur „Nico“ oder „Partnerin“).

### Technische Korrekturen

- **Leiste unten „verrutscht“:** Ursache waren Eingabefelder mit nur 14,7 px Schrift. Unter 16 px zoomt iOS Safari beim Antippen automatisch in die Seite hinein; die fixierte Leiste verschiebt sich dann. Alle Felder haben jetzt mindestens 16 px. Zusätzlich weicht die Leiste aus, solange die Tastatur offen ist (erkannt über die sichtbare Höhe, nicht über den Fokus), sitzt auf `100dvh`/`env(safe-area-inset-*)` und kann die Seite nicht seitlich verbreitern. Auf 320 px breiten Geräten gab es einen 16 px großen seitlichen Überlauf im Rezepte-Kopf; behoben.
- **Neuzeichnen alle 8 Sekunden:** Jeder Abgleich baute bisher die ganze Oberfläche neu auf. Das klappte geöffnete Rezepte zu und konnte geöffnete Auswahllisten schließen. Jetzt wird nur bei echten Änderungen neu gezeichnet, und geöffnete Rezepte bleiben offen.
- **Weniger Datenverkehr:** Ohne eigene Änderungen fragt die App GitHub nur noch „hat sich etwas geändert?“ (ETag, HTTP 304). Solche Abfragen zählen nicht zum GitHub-Limit.
- **Zusammenführen:** Änderungen werden vor dem Anwenden nach Zeitstempel sortiert. Vorher gingen die Pflichtfelder eines Artikels verloren, wenn eine spätere Änderung vor seiner Anlage-Änderung ankam; die Datei wäre dann ungültig gewesen. Wer gewinnt, hat sich nicht geändert.
- **Backup:** Auf dem iPhone öffnet ein Download aus einer Homescreen-App oft eine Seite ohne Rückweg. Die App nutzt jetzt den Teilen-Dialog („In Dateien sichern“) und fällt sonst auf den Download zurück.
- **Neue App-Version:** Statt still mitten in einer Eingabe zu wechseln, zeigt die App „Neue Version bereit“ mit Knopf „Neu laden“. Die Texterkennung liegt in einem eigenen Speicher und wird bei App-Updates nicht neu geladen.
- **Aufgeräumt:** leere Datei `download` entfernt, `.nojekyll` ergänzt, vollständige PNG-Symbole (192/512 px, maskierbar) für Android, Statusleistenfarbe folgt dem gewählten Design.
- **Tests:** Die in dieser README erwähnten Testdateien fehlten im Repository. Sie sind jetzt vorhanden (siehe Abschnitt 12).

## Seit Version 1.2: Lernende Vorschläge und eigene Angebotspreise

- **Artikelvorschläge:** „Kochschinken“ einmal eintragen. Beim nächsten Mal beispielsweise `kochs` eintippen und den Vorschlag antippen. Die App übernimmt den vollständigen Namen; danach kannst du Menge und Einheit ergänzen. Der Vorschlag fügt noch keinen Artikel zur Liste hinzu. Auch abgehakte und gelöschte Artikel werden als bekannte Namen berücksichtigt. Doppelte Namen mit anderer Großschreibung oder zusätzlichen Leerzeichen erscheinen nur einmal. Wortanfänge und häufig verwendete Namen stehen oben; höchstens sechs Vorschläge werden angezeigt.
- **Gemeinsam lernen:** Die Namen stammen aus den vorhandenen Artikeldaten und dem Namensgedächtnis, das beim Aufräumen aus entfernten Artikeln entsteht (Version 1.6). Deshalb sind keine zusätzliche Datei und kein externer Dienst nötig. Im verbundenen Modus bekommen beide Geräte die Vorschläge nach dem GitHub-Abgleich; im Beispielmodus bleiben sie auf dem jeweiligen Gerät. Bereits geladene Namen funktionieren auch offline.
- **Abhaken ohne Meldung:** Ein Häkchen erneut antippen, um den Artikel wieder zu öffnen.
- **Getrennter Angebotspreis:** Im Artikel- oder Hinzufügen-Formular „Im Angebot“ aktivieren. Darunter erscheint ein eigenes Feld für den **Angebotspreis**, einschließlich Menge und Einheit. Standardmäßig wird die Bezugsmenge des normalen Preises vorgeschlagen. Beispiel: normal **2,49 € je Packung**, Angebot **1,79 € je Packung**, zwei Packungen: **3,58 €** in der Summe.
- **Normalpreis bleibt erhalten:** Wird „Im Angebot“ ausgeschaltet, gilt wieder der normale Preis. Ein bereits gespeicherter Angebotspreis bleibt zum erneuten Aktivieren erhalten. Ohne eingetragenen Angebotspreis wird vorsichtig mit dem normalen Preis geschätzt. Ein Angebotspreis darf auch allein eingetragen werden, wenn der Normalpreis unbekannt ist; nach dem Ausschalten fehlt dann ein Preis, statt einen zu erfinden. Wenn beide Preise bekannt sind, prüft das Formular, ob das Angebot für dieselbe Menge günstiger ist.
- **Preisgedächtnis:** Die Preisnotiz speichert den verwendeten Preis und den bekannten Normalpreis getrennt. Der Geschäftsvergleich berücksichtigt die zuletzt eingetragene Preisnotiz; neue Artikel erhalten den letzten bekannten Normalpreis als Vorschlag. Alte Angebote werden dadurch nicht automatisch auf neue Einkäufe angewendet. Alte Preise und Angebotsmarkierungen bleiben beim Update unverändert; einen separaten Angebotspreis kannst du nachtragen.

## Seit Version 1.1: Angebote und Preise

- **Angebote öffnen:** In der Einkaufsliste das Geschäft auswählen und „Angebote ansehen“ antippen. Für die drei ursprünglichen Geschäfte sind Händlerlinks hinterlegt. Die Händlerseite kann zunächst nach deinem Markt oder deiner Postleitzahl fragen. Unter **Geschäfte** kannst du jeden Link ändern oder durch ein leeres Feld entfernen. Es gibt keine automatische Angebotsabfrage.
- **Preis hinzufügen:** Beim Hinzufügen „Preis & Angebot (optional)“ öffnen. Beispiel: Artikel `Tomaten`, Menge `2`, Einheit `kg`; normaler Preis `1,99`, für Menge `500`, Preiseinheit `g`. Die geschätzten Kosten dafür sind **7,96 €**. Preise enthalten höchstens zwei Nachkommastellen und können auch `0` sein.
- **Später bearbeiten:** Neben einem Artikel das Stiftsymbol antippen. Name, Menge, Einheit, Normalpreis, Angebotspreis und „Im Angebot“ lassen sich dort ändern. Der Preis wird für dieses Geschäft gemerkt. Ein leerer Preis entfernt ihn von diesem Artikel; die früheren Preisnotizen bleiben für spätere Einkäufe erhalten.
- **Gemerkte Preise:** Beim Eingeben eines bekannten Artikelnamens und einer passenden Einheit wird der letzte Preis dieses Geschäfts vorgeschlagen. Beim Wechsel des Geschäfts wird der Vorschlag ersetzt. Vorschläge kannst du ändern oder leeren. Auch aus Rezepten übernommene Zutaten bekommen einen vorhandenen passenden Preis des gewählten Geschäfts.
- **Vergleich:** Die App vergleicht den zuletzt notierten passenden Preis je Geschäft, umgerechnet auf kg, l oder Stück. Sie zeigt zusätzlich im Artikeldialog Datum und ursprüngliche Bezugsmenge. Das sind eure Eingaben, keine aktuellen Händlerpreise. Gleiche Schreibweise, Marke und Qualität bitte selbst berücksichtigen; unterschiedliche Namen bleiben vorsichtig getrennt. Alte günstige Preise werden nicht als aktueller Tiefstpreis dargestellt, wenn für dasselbe Geschäft bereits ein neuerer passender Preis notiert wurde.
- **Packungen:** Zwei Packungen können unterschiedlich groß sein. Daher gibt es bei unbekannten Packungsgrößen keinen Vergleich zwischen Geschäften. Ein Preis je Packung kann trotzdem die Kosten eines in Packungen geführten Artikels schätzen. Für einen Größenvergleich beide Artikel in g/kg oder ml/l führen.
- **Summe:** Pro ausgewähltem Geschäft werden die offenen Artikel addiert; erledigte Artikel zählen nicht mit. Fehlende oder nicht umrechenbare Preise werden ausdrücklich als fehlend genannt. Bei aktivem Angebot zählt der eingetragene Angebotspreis; ohne Angebotspreis der normale Preis. Es wird kein zusätzlicher pauschaler Rabatt abgezogen.
- **Beispielmodus:** Die neuen Beispielpreise sind frei erfunden. Sie werden nur bei einem frischen Beispielmodus geladen. Bereits vorhandene Browserdaten und eure private Datendatei werden niemals durch neue Beispiele ersetzt.

**Bestehende App aktualisieren:** Die neuen App-Dateien (siehe Dateiliste in Abschnitt 3, ab Version 1.3 zusätzlich `recipe-import.js`, `page-source.js`, `ocr.js`, ab Version 1.4 `categories.js`, `plan.js`, `photos.js`, ab Version 1.6 `compact.js`, ab Version 1.8 `receipt.js`, `cook.js`, `news.js`, ab Version 1.9 `shop.js`, die Symbole `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` und der Ordner `vendor`) im öffentlichen App-Repository ersetzen bzw. hinzufügen. Beim ersten Öffnen nach einem Update zeigt die App „Neue Version bereit“; auf **Neu laden** tippen. Die private `daten.json` unverändert lassen. Nach erfolgreicher Pages-Veröffentlichung die App online öffnen und einmal neu laden, damit das neue Offline-Paket aktiv wird. Namen, Verbindungseinstellungen und noch nicht gesendete Änderungen bleiben im selben Browserspeicher erhalten; Browserdaten dafür nicht löschen. Neue und alte v1-Datendateien sind kompatibel. Geräte mit älterer App sollten ebenfalls aktualisiert werden, damit beide Personen Preise und Angebotslinks bearbeiten können.

## 2. Zuerst verstehen: zwei Repositories

Ein **Repository** (kurz „Repo“) ist ein Projektordner auf GitHub. Ein **Commit** ist ein gespeicherter Stand. Ein **Branch** ist eine Reihe solcher Stände; wir verwenden `main`.

| Repository | Sichtbarkeit | Inhalt |
| --- | --- | --- |
| `NicoAHB/Einkaufsliste-Rezepte` | **Public** | Die App-Dateien und erfundene Beispieldaten; GitHub Pages |
| z. B. `eure-kueche/einkauf-daten` | **Private** | Eure tatsächliche `daten.json`; keine GitHub Pages |

**Wichtige GitHub-Einschränkung:** Fine-grained Tokens unterstützen derzeit keine fremden privaten Repositorys, bei denen man nur als „Repository collaborator“ oder „Outside collaborator“ eingeladen ist. Ein privates Repo in Nicos persönlichem Konto plus Einladung der Partnerin erfüllt deshalb die Token-Anforderung nicht. Nutzt für das private Daten-Repo eine **kostenlose GitHub-Organisation**, in der ihr **beide Mitglieder** seid. Das öffentliche App-Repo darf bei Nico bleiben. Ihr braucht insgesamt weiterhin nur zwei Repositories, nicht zwei zusätzliche.

Quelle: [GitHub: Grenzen fein eingestellter Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens-limitations). Die Organisation ist ein gemeinsamer GitHub-Bereich, keine Serverinstallation. Teilt keinen Token miteinander und verwendet keinen breiter berechtigten Classic-Token als Ausweichlösung.

## 3. Öffentliches App-Repo anlegen und Dateien hochladen

1. Melde dich auf [github.com](https://github.com/) mit deinem Konto an.
2. Wenn `NicoAHB/Einkaufsliste-Rezepte` bereits existiert, öffne es. Sonst rechts oben **+ → New repository** wählen.
3. Name: `Einkaufsliste-Rezepte`; Sichtbarkeit **Public**. Falls du es neu erstellst, **Add a README file** aktivieren und **Create repository** drücken.
4. Falls das vorhandene Repo privat ist: Nur wenn dort keine privaten Daten oder Tokens einschließlich älterer Stände liegen, unter **Settings → General → Danger Zone → Change repository visibility** auf Public wechseln. Bei diesem Projekt gehören ausschließlich Code und erfundene Beispieldaten hinein.
5. Lade die bereitgestellten Dateien herunter. Falls du das ZIP verwendest, entpacke es zuerst. Ein ZIP einfach hochzuladen reicht nicht.
6. Im Repo **Code → Add file → Upload files** wählen. `index.html`, `styles.css`, `app.js`, `data.js`, `prices.js`, `recipe-import.js`, `page-source.js`, `ocr.js`, `categories.js`, `plan.js`, `photos.js`, `compact.js`, `receipt.js`, `cook.js`, `news.js`, `shop.js`, `brand.js`, `daily.js`, `recipe-maker.js`, `images.js`, `emoji.js`, `help.js`, `dragdelete.js`, `theme.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `beispieldaten.json`, `rezepte-des-tages.json`, `.nojekyll` und `README.md` sowie den **Ordner `vendor`** (Texterkennung, ca. 9 MB; den Ordner per Drag & Drop auf die Upload-Seite ziehen) gemeinsam hochladen. Alles muss so liegen wie im Repository, die Dateien **direkt im Hauptordner**. Die Ordner `tests` und `worker` sowie `package.json` sind für die App nicht erforderlich (`worker/recipe-proxy.js` brauchst du nur für Abschnitt 13, und zwar bei Cloudflare, nicht auf GitHub).
7. Unten **Commit changes** wählen. Wenn du nach dem Branch gefragt wirst: `main`.

Du kannst Textdateien auch einzeln über **Add file → Create new file** anlegen: Dateinamen eingeben, vollständigen Inhalt hineinkopieren, speichern. Das PNG-Bild bitte als Datei hochladen. **Keine persönlichen Daten und niemals einen Token öffentlich hochladen.** Die Beispielrezepte sind bewusst öffentlich und erfunden.

## 4. GitHub Pages einschalten

1. Im **öffentlichen App-Repo** auf **Settings** klicken.
2. Links **Pages** wählen.
3. Bei **Build and deployment → Source**: **Deploy from a branch**.
4. Branch **main**, Ordner **/ (root)** auswählen und **Save** drücken.
5. Warten, bis unter **Actions** der Pages-Lauf erfolgreich ist; das kann einige Minuten dauern.
6. Unter **Settings → Pages** den angezeigten Link öffnen. Für das persönliche Repo lautet er normalerweise `https://nicoahb.github.io/Einkaufsliste-Rezepte/`.
7. Deinen Namen auswählen. Zunächst läuft die App im **Beispielmodus** (oben steht dann „Nur auf diesem Gerät“; ein Tipp darauf öffnet die Einstellungen zum Verbinden). Hier kannst du gefahrlos ausprobieren. Diese Änderungen werden beim Verbinden **nicht** automatisch ins private Repo kopiert.

Ein Doppelklick auf `index.html` ist kein Ersatz für Pages: JavaScript-Module und Offline-Funktionen brauchen einen Web-Ursprung. Nutze den Pages-Link. Wenn du später den Code änderst, wieder **Commit changes** drücken und den Pages-Lauf abwarten. Bei Änderungen an App-Dateien auch die Cache-Version in `sw.js` erhöhen.

## 5. Gemeinsame Organisation und privates Daten-Repo einrichten

1. Deine Partnerin erstellt, falls nötig, ein eigenes kostenloses GitHub-Konto.
2. Nico wählt rechts oben **+ → New organization**. Alternativ über das Profilbild **Your organizations → New organization** gehen.
3. Den kostenlosen Tarif **Free** wählen. Als Organisationsnamen z. B. `eure-kueche` verwenden; er muss auf GitHub noch frei sein. Den tatsächlichen Namen merken.
4. In der Organisation **People → Invite member** wählen und den GitHub-Benutzernamen der Partnerin eingeben. Rolle **Member** ist ausreichend. Sie muss die Einladung annehmen. Sie soll unter **People** als Mitglied erscheinen, **nicht** als Outside collaborator.
5. In der Organisation **Repositories → New repository** wählen. Eigentümer ist die Organisation, Name z. B. `einkauf-daten`, Sichtbarkeit unbedingt **Private**. **Add a README file** aktivieren und erstellen. Dadurch existiert der Branch `main` bereits.
6. Im Daten-Repo unter **Settings → Collaborators and teams / Manage access → Add people** die Partnerin mit Rolle **Write** hinzufügen. Eine eventuelle weitere Einladung muss sie ebenfalls annehmen. Nico hat als Organisationsinhaber bereits Zugriff.
7. Falls das Daten-Repo bereits in Nicos persönlichem Konto angelegt wurde, braucht es kein drittes Repo: nach Sicherung unter **Settings → General → Danger Zone → Transfer ownership** in die Organisation übertragen und den Zugriff dort erneut prüfen.
8. Öffne die mitgelieferte `beispieldaten.json` auf deinem Computer in einem Texteditor und kopiere ihren **vollständigen** Inhalt.
9. Im **privaten Daten-Repo** **Add file → Create new file** wählen, als Namen **`daten.json`** eingeben und den Inhalt einfügen. **Commit changes** auf `main` drücken.
10. Für dieses Daten-Repo **keine Pages aktivieren**. Die Datei darf nur im privaten Repo stehen. Nach dem Ausprobieren kannst du die Beispielartikel und -rezepte in der App löschen.

Einfachere Alternative zu Schritt 8–9: `beispieldaten.json` herunterladen, auf deinem Computer in `daten.json` umbenennen und über **Upload files** ins private Repo hochladen. Nicht den bisherigen Inhalt durch eine neue leere Datei ersetzen, sobald echte Daten darin stehen.

## 6. Jede Person erstellt ihren eigenen fein eingestellten Token

Ein Token ist wie ein beschränkter Schlüssel. Nico erstellt seinen im eigenen Konto, die Partnerin ihren in ihrem Konto. Für ein weiteres Gerät kann dieselbe Person ihren noch vorhandenen eigenen Token verwenden oder einen separaten Token erstellen, um Geräte getrennt sperren zu können.

1. Auf GitHub rechts oben Profilbild → **Settings** (persönliche Kontoeinstellungen, nicht Repo-Einstellungen).
2. Unten **Developer settings → Personal access tokens → Fine-grained tokens**.
3. **Generate new token** wählen. GitHub fragt eventuell erneut nach dem Passwort.
4. Name z. B. `Einkauf Nico iPhone` bzw. `Einkauf Partnerin iPhone`.
5. **Expiration** auf einen passenden Zeitraum stellen, z. B. 90 Tage, und eine Erinnerung vor Ablauf setzen.
6. Bei **Resource owner** die gemeinsame **Organisation** auswählen. Fehlt sie, zuerst Mitgliedschaft und angenommene Einladung prüfen. In den Organisationseinstellungen müssen Fine-grained Tokens zugelassen sein.
7. Unter **Repository access → Only select repositories** ausschließlich das private **`einkauf-daten`** wählen. Nicht das öffentliche App-Repo und nicht „All repositories“ auswählen.
8. Unter **Repository permissions** nur **Contents → Read and write** setzen. **Metadata → Read-only** ist automatisch erforderlich. Keine weiteren Berechtigungen vergeben.
9. **Generate token** drücken und den Token kopieren. Er wird nur einmal vollständig angezeigt. Nicht in Nachrichten, Screenshots, JSON-Dateien oder GitHub-Dateien einfügen.
10. Falls der Token **Pending** ist, muss Nico ihn als Organisationsinhaber freigeben: Organisation → **Settings → Personal access tokens → Pending requests** → passenden Token prüfen und genehmigen. Bei einer abweichenden GitHub-Oberfläche nach „Personal access tokens“ in den Organisationseinstellungen suchen.

Die Repo-Rolle und der Token müssen beide Schreiben erlauben. Geschützte Branches oder Regeln mit Pull-Request-Pflicht können direkte API-Schreibvorgänge verhindern; für das kleine Daten-Repo ist ein normal beschreibbarer `main` vorgesehen. Eine organisationsweite Schutzregel nicht ohne Prüfung abschalten.

## 7. App auf jedem Gerät verbinden

1. Auf dem iPhone den Pages-Link öffnen, **Einstellungen** wählen.
2. Den eigenen Namen eintragen (frei wählbar, z. B. **Nico** bzw. den Namen deiner Partnerin). Er erscheint bei deinen Artikeln.
3. Eigentümer: der **Organisationsname**, z. B. `eure-kueche`, nicht automatisch Nico.
4. Daten-Repository: `einkauf-daten` (ohne URL).
5. Branch: `main`; JSON-Datei: `daten.json`.
6. Den eigenen Token in das Passwortfeld einfügen und **Speichern & verbinden** wählen.
7. Warten, bis oben **Mit GitHub abgeglichen** (grüner Punkt) erscheint statt „Nur auf diesem Gerät“.
8. Auf dem zweiten Gerät dasselbe mit dem **eigenen** Token wiederholen. Beide Geräte müssen denselben Eigentümer, Repository-Namen, Branch und Dateinamen benutzen.
9. Als Probe einen Artikel hinzufügen und auf dem zweiten Gerät **Aktualisieren** drücken. Nach spätestens dem nächsten erfolgreichen Abgleich sollte er erscheinen.

**Homescreen auf dem iPhone:** Den Link in Safari öffnen → Teilen-Symbol → **Zum Home-Bildschirm** → bei angebotener Option **Als Web-App öffnen** aktivieren → **Hinzufügen**. Anschließend die App über das neue Symbol öffnen. Falls Safari und die Homescreen-App getrennte Speicher nutzen, dort den eigenen Token und Namen noch einmal eingeben. Es wird keine native App aus dem App Store installiert.

## 8. Speichern, offline arbeiten und Fehler verstehen

- Jede Änderung wird **zuerst lokal gespeichert**. Im GitHub-Modus werden ausstehende Änderungen zusätzlich in einer dauerhaften Warteschlange gespeichert. Bei vollem oder gesperrtem Browserspeicher erscheint ein Fehler; die Änderung wird dann nicht als übernommen dargestellt.
- Der Status steht oben in einer schmalen Zeile (ein Tipp darauf gleicht ab oder, ohne Verbindung, öffnet die Einstellungen), mit farbigem Punkt: **Gleiche ab …** (blinkend): ein GitHub-Abgleich läuft. **Mit GitHub abgeglichen** (grün): keine ausstehenden lokalen Änderungen. **n Änderung(en) warten** (orange) oder **Fehler · lokal gesichert** (rot): GitHub hat die Änderung noch nicht bestätigt. **Nur auf diesem Gerät**: Beispielmodus.
- Ohne Empfang kannst du nach einem vorherigen erfolgreichen Laden weiterarbeiten. Lass die App bei wiederhergestelltem Empfang geöffnet oder öffne sie erneut. **iOS synchronisiert diese App nicht zuverlässig im Hintergrund.**
- Die App lädt bei sichtbarer Seite alle acht Sekunden neu. Bei Fehlern wartet sie länger; GitHubs Wartezeit und API-Limits werden berücksichtigt. Manuelles Aktualisieren löst einen erneuten Versuch aus.
- **Ungültiger/abgelaufener Token (401):** über die Anleitung in Abschnitt 6 einen neuen erstellen und auf dem Gerät unter Einstellungen ersetzen. Die Datenadresse dabei unverändert lassen; dann bleibt die Warteschlange erhalten. Nicht den Browser-Speicher löschen.
- **Kein Zugriff (403):** Mitgliedschaft, Write-Rolle, Contents-Berechtigung und Token-Freigabe prüfen. GitHub kann auch wegen eines API-Limits 403 melden. Dann abwarten. Beim Daten-Repo keine erzwungenen Pull Requests für App-Schreibzugriffe voraussetzen.
- **Nicht gefunden (404):** Eigentümer, Repo, `main` und `daten.json` einschließlich Groß-/Kleinschreibung prüfen. GitHub versteckt private Repos auch bei fehlenden Token-Rechten hinter 404; es ist nicht automatisch eine fehlende Datei.
- **Schreibkonflikt (409/422):** Die App lädt und mischt bis zu viermal erneut. Bleibt der Fehler, später aktualisieren und Branch-Regeln prüfen. Lokale Änderungen bleiben erhalten.
- **Versehentlich gelöscht:** Seit Version 1.7 gibt es keinen Rückgängig-Knopf mehr. Ein Häkchen setzt man durch erneutes Antippen zurück; Gelöschtes legt man neu an. Gelöschte Einträge bleiben noch 14 Tage in der Datei (danach räumt die App auf), die App zeigt sie aber nicht mehr an. Ältere Stände findet man im Verlauf des privaten Daten-Repositorys auf GitHub.
- **Zweiter Tab:** pro Browser-Ursprung darf nur ein App-Tab aktiv sein, damit zwei Tabs nicht dieselbe lokale Warteschlange überschreiben. Den ersten Tab schließen und den zweiten neu laden. Zwei Geräte sind ausdrücklich unterstützt.

Token und private Daten liegen unverschlüsselt im `localStorage` dieses Browsers. Es werden keine externen Skripte, Analysewerkzeuge oder Schriften geladen. Trotzdem nur auf vertrauenswürdigen Geräten verwenden und Browserdaten nicht löschen, solange Änderungen ausstehen. Andere Seiten unter demselben Pages-Ursprung gehören ebenfalls zu dieser Vertrauensgrenze. **Token entfernen** entfernt die Zugangsdaten; lokale Daten und Warteschlangen bleiben für die spätere erneute Verbindung erhalten. Für vollständiges Entfernen erst synchronisieren und sichern, dann die Website-Daten in den Geräteeinstellungen löschen. Safari im privaten Modus ist für dauerhafte Daten ungeeignet.

## 9. Datenmodell v1 und Zusammenführen

`beispieldaten.json` zeigt das vollständige Modell. Oben steht `version: 1`. Bei unbekannten Versionen verweigert diese App das Schreiben. Erweiterungen innerhalb v1 dürfen optionale Felder ergänzen; unbekannte Felder werden erhalten. Änderungen an Bedeutung oder Pflichtfeldern benötigen eine ausdrücklich getestete Migration, nicht nur eine andere Versionsnummer.

| Bereich | Inhalt |
| --- | --- |
| `stores` | `id`, `name`, Zeitstempel und Löschmarkierung |
| `items` | zusätzlich `storeId`, `name`, `quantity`, `unit`, `checked`, `createdBy`; optional `price`, `salePrice`, `onSale`, `category` (Gang im Laden, z. B. `obst`; `null` oder fehlend = automatisch) |
| `recipes` | zusätzlich `name`, `servings`, `tags`, `instructions`; optional `sourceUrl` (Quelle eines importierten Rezepts), `favorite` (Wahrheitswert), `lastCookedAt` (Datum `JJJJ-MM-TT`), `photoId` (Kennung der Datei `photos/<photoId>.jpg` im Daten-Repo; `null` = kein Foto) |
| `meals` (optional) | Wochenplan: `date` (`JJJJ-MM-TT`), `servings`, entweder `recipeId` oder `title` (eigenes Gericht), optional `done` |
| `ingredients` | zusätzlich `recipeId`, `name`, `quantity`, `unit`; die Einheit `nach Bedarf` (Menge 1) steht für Zutaten ohne Mengenangabe |
| `prices` (optional) | Einzelne Preisnotizen mit ID, `storeId`, `name`, `quote`, optional `regularQuote`, `onSale` und denselben Zeitstempeln |
| `pantry` (optional) | Vorrat (Version 1.6): `name` und die üblichen Zeitstempel |
| `names` (optional) | Namensgedächtnis aus aufgeräumten Artikeln (Version 1.6): `name`, `count`, `at`, optional `category`, `unit` |
| `templates` (optional) | Einkaufsvorlagen (Version 2.5): `name` (höchstens 60 Zeichen) und `items`: bis zu 80 Artikel `{ name, quantity, unit, storeId? }`; die ganze Artikelliste wird als ein Feld zusammengeführt (die neuere Fassung gewinnt) |
| `aliases` (optional) | Bestätigte Namenszuordnungen (Version 1.8), z. B. aus Kassenbons und Schreibweisen: `from` (normalisierter Text, z. B. `tom cherry`), `name` (Name in der App) |
| `sync.applied` | IDs bereits angewendeter Änderungen; verhindert Doppelübertragung (wird beim Aufräumen auf die letzten 600 gekürzt); `sync.compactedAt` nennt den Zeitpunkt des letzten Aufräumens |

Ein Preis ist ein zusammengehöriges Objekt `{ "cents": 199, "quantity": 500, "unit": "g" }`: 199 Cent für 500 g. Dieses Objekt wird als ein Feld zusammengeführt, damit bei gleichzeitiger Bearbeitung Preis und Bezugsmenge nicht vermischt werden. Jede ausdrücklich geänderte Preisnotiz erhält eine eigene ID; der neueste passende Eintrag je Geschäft wird anhand von `createdAt` und ID bestimmt. Wiederholtes Senden derselben Operation erzeugt keine doppelte Preisnotiz. `stores.offersUrl` ist optional; ein leerer String deaktiviert den Link. `items.price` enthält den normalen Preis, `items.salePrice` optional den Angebotspreis mit eigener Bezugsmenge. `onSale` bestimmt, welcher Preis zur Schätzung verwendet wird. Preisnotizen enthalten in `quote` den verwendeten Preis und optional in `regularQuote` den bekannten Normalpreis. Alte Dateien ohne `prices` werden als leere Preisliste gelesen, ohne andere Daten zu verändern. Artikelvorschläge werden aus den bestehenden Artikeln abgeleitet; dafür gibt es keine neue Collection. Die Schema-Version bleibt 1, weil nur optionale Felder ergänzt wurden. Version 1.8 ergänzt optional: `items._base`/`items._adds` (Mengenzuwächse, siehe oben), `items.saleUntil` und `prices.saleUntil` (letzter Tag eines Angebots), `prices.trend` (`{ was, at }`, Preisentwicklung) und die Sammlung `aliases`. Auch `recipes.sourceUrl` (Version 1.3), `items.category`, `recipes.favorite`, `recipes.lastCookedAt`, `recipes.photoId` und die ganze Liste `meals` (Version 1.4) sowie `pantry`, `names` und `sync.compactedAt` (Version 1.6) sind optional; ältere App-Versionen auf einem zweiten Gerät ignorieren diese Felder, löschen sie aber nicht. Wer zwischen den Versionen wechselt, sieht dort lediglich Wochenplan, Kategorien und Fotos nicht.

Jeder Datensatz hat `createdAt`, `updatedAt`, `deletedAt` und `_clock`. `deletedAt: null` bedeutet nicht gelöscht. `_clock` speichert je geändertem Feld dessen Zeitstempel und Operations-ID. Eine Operation enthält `id`, `collection`, `entityId`, `patch`, `actor` und `at`.

Die App liest die aktuelle Datei samt GitHub-SHA, wendet nur ihre eigenen ausstehenden Operationen an und schreibt mit dieser SHA zurück. Ändert ein anderes Gerät die Datei dazwischen, lehnt GitHub den alten Stand ab; die App liest und mischt erneut. **GitHub speichert technisch die vollständige JSON-Datei pro Commit, nicht einzelne JSON-Felder.** Es gibt keinen blinden Ersatz durch einen veralteten Gerätestand.

Unterschiedliche Datensätze und Felder bleiben erhalten. Ändern beide dasselbe Feld, gewinnt der jüngere Zeitstempel; bei Gleichstand die Operations-ID. Dies ist kein gemeinsamer Texteditor: zwei gleichzeitige Änderungen derselben Zubereitung lassen sich nicht sinnvoll automatisch addieren. Gerätezeit automatisch einstellen. Löschen bleibt durch eine Markierung erhalten und wird durch normales Bearbeiten nicht aufgehoben. Gelöschte Rezepte verbergen ihre Zutaten; gelöschte Geschäfte verbergen ihre Artikel. Die letzte Löschaktion kann beides wieder sichtbar machen.

Diese Version ist für einen kleinen gemeinsamen Haushalt gedacht: **maximal 900 KB JSON** (Fotos liegen in eigenen Dateien). Damit die Grenze nie erreicht wird, räumt die App auf (Abschnitt „Neu in Version 1.6“): automatisch ab 250 KB, auf Wunsch jederzeit. Beim Aufräumen werden Löschmarkierungen nach 14 Tagen entfernt; Änderungen, die ein sehr lange offline gewesenes Gerät an inzwischen entfernten Einträgen vornimmt, werden beim Abgleich verworfen (die Zeile trägt dazu eine Sammelmarke `_clock["*"]`, damit auch spät eintreffende ältere Änderungen keine neueren überschreiben). Durch fortlaufendes Speichern entstehen Commits im privaten Repo. Daten aus alten Git-Ständen verschwinden nicht durch Löschen oder Aufräumen in der App und lassen sich dort wiederherstellen.

## 10. Backup und Wiederherstellung

Unter **Einstellungen → Alle Daten als JSON sichern** wird der aktuelle sichtbare Datenstand einschließlich ausstehender lokaler Änderungen und interner Löschmarkierungen heruntergeladen. **Kein Token und keine Verbindungseinstellungen** sind enthalten. Die Datei vertraulich aufbewahren.

Es gibt in dieser Version noch keinen Import-Knopf. Für eine vollständige Wiederherstellung: auf **beiden Geräten** zunächst offene Änderungen synchronisieren oder separat sichern, alle App-Fenster schließen, im **privaten** Repo die `daten.json` durch das gewünschte Backup ersetzen und speichern. Auf beiden Geräten die Website-Daten nach der Sicherung löschen, App erneut öffnen und Verbindung neu eingeben. Dadurch können alte lokale Warteschlangen das wiederhergestellte Backup nicht versehentlich ändern. Das ist eine bewusste Wiederherstellung des gesamten Stands, kein normaler Abgleich.

## 11. Kurze Testcheckliste für euch

- [ ] App auf iPhone in Hochformat öffnen: alle drei Bereiche erreichbar, keine seitliche Scrollleiste; hellen und dunklen Modus testen.
- [ ] Als Nico und Partnerin verbinden. Auf beiden Geräten muss der gemeinsame GitHub-Status erscheinen.
- [ ] In Edeka einen Artikel mit `1,5 kg` hinzufügen; im zweiten Gerät aktualisieren und Namen/Menge/Person prüfen.
- [ ] Beide Geräte fügen gleichzeitig unterschiedliche Artikel hinzu: nach Abgleich müssen beide Artikel vorhanden sein.
- [ ] Auf einem Gerät Artikel abhaken; auf dem anderen abwarten. Erledigtes steht unten. Erneut antippen öffnet den Artikel, ohne Meldung.
- [ ] Erledigte entfernen; einen einzelnen Artikel mit dem Mülleimer löschen.
- [ ] Geschäft hinzufügen, umbenennen und mit einem Artikel löschen.
- [ ] Eigenes Rezept mit zwei Zutaten, Tags und Zubereitung anlegen; Suche, Tagfilter, Bearbeiten und Löschen testen.
- [ ] Beispiel-Pasta von 2 auf 4 Portionen stellen: Nudeln 400 g, Tomaten 800 g. „Zutaten auf die Liste“ öffnen, eine Zutat abwählen, Lidl wählen, bestätigen. Nur die ausgewählten Mengen sollen dort stehen.
- [ ] Nach erfolgreichem Online-Aufruf Flugmodus aktivieren, Artikel anlegen und die App neu öffnen. Er muss lokal bleiben. Flugmodus aus, App geöffnet lassen, zweiten Geräteabgleich prüfen.
- [ ] Vorübergehend einen ungültigen Token eingeben. Verständliche Meldung muss erscheinen; danach korrekten eigenen Token einsetzen, ohne die Datenadresse zu ändern. Wartende Änderungen dürfen nicht verschwinden.
- [ ] Backup herunterladen: `version`, Listen, Rezepte und Zutaten vorhanden; kein Token enthalten.
- [ ] Homescreen-Symbol hinzufügen und darüber öffnen. Gegebenenfalls erneut verbinden, danach offline öffnen.

Weitere Testpunkte für Version 2.13 (Fotos: siehe 2.14):

- [ ] Einkauf (Planen): Rechts in jeder Zeile steht eine Kachel. Erst ein Platzhalter, nach und nach (etwa alle 6 Sekunden eine Zeile) Bild oder Symbol. Name und Menge stehen links, ein langer Name bricht um.
- [ ] Ein bekannter Artikel („Milch“, „Nudeln“) zeigt ein Produktbild; ein Haushaltsartikel („Domol Feinwaschmittel“) zeigt ein Symbol.
- [ ] Die App schließen und neu öffnen: Die Bilder sind sofort da, es wird nicht neu gesucht.
- [ ] Hell und Dunkel: Die Kachel ist hell, Bild und Symbol gut zu erkennen.
- [ ] Einstellungen → Darstellung & Sicherung → „Produktbilder anzeigen“ ausschalten: Die Kacheln verschwinden sofort, die Liste sieht aus wie vorher. Wieder einschalten: Sie sind sofort wieder da.

Weitere Testpunkte für Version 2.12:

- [ ] Einkauf: Etwas ins Namensfeld tippen → rechts im Feld erscheint ein „+“. Darauf tippen: Der Artikel steht auf der Liste, das Feld ist leer und **die Tastatur geht zu**. Wieder ins Feld tippen: Die Tastatur öffnet sich.
- [ ] Mit der Taste „Fertig“ der Tastatur: Der Artikel wird hinzugefügt, die Tastatur bleibt offen.
- [ ] Langer Text im Feld läuft nicht unter das „+“.

Weitere Testpunkte für Version 2.11:

- [ ] Rezepte → „Rezepte des Tages“ öffnen: Das Fenster lässt sich nicht nach links oder rechts schieben, auch nicht bei großer Schrift (Einstellungen des Handys) und auch nicht, wenn man mit dem Finger seitlich wischt.
- [ ] Alle 69 Rezepte der Sammlung durchgehen (oder zum Prüfen die Daten dieses Geräts löschen und dreiundzwanzig Tage lang je drei entscheiden): Danach erscheinen weiter drei Vorschläge pro Tag mit dem Hinweis „Neu zusammengestellt“, ohne Knopf „Von vorn beginnen“.
- [ ] Ein neu zusammengestelltes Rezept **hinzufügen**: Es steht mit Zutaten und Zubereitung bei den Rezepten. Ein **übersprungenes** steht nirgends und kommt nicht wieder.

Weitere Testpunkte für Version 2.9:

- [ ] Rezepte → „Rezepte des Tages · 3 offen“: ohne weitere Einstellung erscheinen drei Rezepte; **Hinzufügen** übernimmt eins mit Zutaten, am zweiten Handy stehen am selben Tag dieselben drei.
- [ ] Einstellungen: Die Seite lässt sich nicht nach links oder rechts schieben (auch mit verbundener Liste und eingeklappten oder offenen Bereichen).

Weitere Testpunkte für Version 2.8:

- [ ] Link der Tagesrezepte-Seite in den Einstellungen eintragen und speichern. Rezepte → „Rezepte des Tages“: Karten erscheinen, **Hinzufügen** legt ein Rezept an, **Überspringen** geht weiter. (Wenn „keine Rezept-Links gefunden“ erscheint: siehe README, 2.8.)
- [ ] Am nächsten Tag erscheinen andere Rezepte; schon entschiedene kommen nicht wieder.

Weitere Testpunkte für Version 2.7:

- [ ] Einstellungen → Gemeinsame Liste: Der Knopf ist grau mit „Gespeichert am …“. Ein Feld ändern: Der Knopf heißt „Speichern“. Mit falschem Token speichern: Fehler, Knopf bleibt aktiv.
- [ ] Token-Datum auf übermorgen stellen: oben steht „Token läuft in 2 Tagen ab · neuen anlegen“.

Weitere Testpunkte für Version 2.6:

- [ ] Im Laden bei Rossmann: Ein Artikel ohne Geschäft steht dort nicht, bei Edeka schon. Unter „Geschäfte“ lässt es sich pro Geschäft umstellen. Planen → Rossmann: „Angebote“ öffnet die Rossmann-Angebotsseite.
- [ ] Einstellungen → „Geschäfte anzeigen als“ → Logo: Reiter und Überschriften zeigen die Schriftzüge in Kettenfarben; zurück auf Text.

Weitere Testpunkte für Version 2.5:

- [ ] Ins Namensfeld tippen → **Vorlagen**: Liste als Vorlage speichern, einen Artikel löschen, Vorlage auf die Liste setzen. Auf dem zweiten Handy erscheint die Vorlage ebenfalls.
- [ ] Einstellungen: Bereich aufklappen, App schließen und neu öffnen: derselbe Bereich ist offen.
- [ ] Android: Zeile lange halten und in den roten Mülleimer ziehen; die Seite scrollt dabei nicht, es erscheint kein Kontextmenü.

Weitere Testpunkte für Version 2.3:

- [ ] Einkauf → Planen: oben nur eine schmale Statuszeile, keine Banner; ohne Verbindung öffnet ein Tipp auf „Nur auf diesem Gerät“ die Einstellungen. „Im Laden“ und die Summe brechen nicht um, nichts überlappt (auch bei großer Schrift oder „Zoom“-Anzeige des iPhones).
- [ ] Im Laden: ganz oben die Geschäfte und „Planen“, direkt darunter die Artikel; „Planen“ bringt die Planungsansicht zurück. In „Rezepte“ und „Plan“ ist die Kopfzeile wieder da.

Weitere Testpunkte für Version 2.2:

- [ ] Einstellungen → Farbe: Rosé antippen. Alles färbt sich sofort um, auch die Statusleiste oben (iPhone: Hell- und Dunkelmodus prüfen). App schließen und neu öffnen: Die Farbe ist von Anfang an da.
- [ ] Dunkelmodus auf Blau: Text auf Karten, Knöpfen und in den Reitern ist gut lesbar; „Neu von …“ bleibt gelb, der Mülleimer beim Ziehen bleibt rot.

Weitere Testpunkte für Version 2.1:

- [ ] Einkauf → Planen: Einen Artikel lange gedrückt halten, bis er abhebt, nach rechts in den roten Mülleimer schieben und loslassen: Er ist weg, die anderen bleiben. Prüfen, dass die Seite dabei nicht mitscrollt und kein Text markiert wird (iPhone!).
- [ ] Nur kurz tippen öffnet die Bearbeitung; auf der Liste nach oben und unten wischen scrollt, ohne dass etwas abhebt.
- [ ] Zeile ziehen, aber außerhalb des Mülleimers loslassen: nichts ist gelöscht, die Bearbeitung öffnet sich nicht.

Weitere Testpunkte für Version 2.0:

- [ ] Einkauf → Planen: Es steht nur das Namensfeld (das „+“ erscheint rechts im Feld, sobald etwas getippt ist). Hineintippen klappt Geschäft, Menge und Einheit auf; ein Tipp daneben klappt wieder zu. Die erste Artikelzeile ist ohne Scrollen sichtbar.
- [ ] Einen Artikel antippen: „Artikel & Preis“ öffnet sich; unten „Artikel löschen“ entfernt ihn.
- [ ] Einstellungen: Nach dem Verbinden steht „Gemeinsame Liste“ unten und eingeklappt; Vorrat und Darstellung stehen oben.
- [ ] Optional: Siri-Kurzbefehl „Einkaufsliste“ (siehe oben): „Hey Siri, Einkaufsliste“, „Milch und Eier“. Danach sind beide in der App (in Safari und, falls dort verbunden, auch in GitHub).

Weitere Testpunkte für Version 1.9:

- [ ] Einkauf → **Im Laden**: Edeka antippen, Artikel abhaken, zu Lidl wechseln. Ein Artikel ohne Geschäft, den ihr bei Edeka abgehakt habt, steht bei Lidl nicht mehr.
- [ ] „Bildschirm anlassen“ einschalten: Der Bildschirm bleibt an, solange die Ladenansicht offen ist, und wird beim Wechsel zu „Rezepte“ wieder freigegeben.
- [ ] Die Partnerin ergänzt unterwegs einen Artikel: Er steht gelb oben („neu von …“), „Übernehmen“ reiht ihn ein.
- [ ] **Einkauf beenden → Beenden und Kassenbon einfügen:** Abgehaktes ist von der Liste entfernt, der Kassenbon-Dialog öffnet sich.

Weitere Testpunkte für Version 1.8 (auf beiden Geräten aktualisieren):

- [ ] **Gleichzeitig dazuzählen:** Auf der Liste steht „Milch 1“. Ein Gerät in den Flugmodus, auf beiden Geräten je „Milch“ hinzufügen, Flugmodus aus: Ergebnis „3“.
- [ ] **Neu von …:** Auf einem Gerät einen Artikel anlegen und ein zweites Mal „Milch“ dazuzählen. Auf dem anderen Gerät stehen beide gelb oben („neu von …“, „+1 von …“); „Übernehmen“ reiht sie ein, nach Neuladen bleiben sie übernommen.
- [ ] **Kassenbon:** Den Text eines digitalen Bons einfügen, „Auswerten“: Summe stimmt? Namen prüfen, einen abweichenden Namen von Hand ändern, speichern. Beim nächsten Bon erscheint „Zuordnung gemerkt“.
- [ ] **Preisänderung:** Einen Bon einfügen, bei dem ein bekanntes Produkt teurer oder günstiger geworden ist: roter oder grüner Hinweis in der Vorschau und danach am Artikel auf der Liste. Ein Aktionsartikel (mit Rabattzeile) löst keinen Hinweis aus.
- [ ] **Angebot mit Datum:** An einem Artikel „Im Angebot“ mit „gültig bis“ gestern speichern: „Angebot abgelaufen“, die Schätzung nimmt den normalen Preis. Preisvergleich im Stift-Dialog: „zuletzt eingetragen am …“.
- [ ] **Schreibweise:** „Zwiebel“ tippen: Vorschlag „Zwiebeln“ antippen, später wieder „Zwiebel“ tippen und hinzufügen: es erscheint „Zwiebeln“.
- [ ] **Tastatur:** In „Was brauchst du?“ tippen, dann auf freie Fläche neben der Liste tippen: die Tastatur klappt weg. Dasselbe beim Eintragen einer neuen Zutat im Rezept.
- [ ] **Kochmodus:** Ein Rezept mit „Kochen“ öffnen, Schritte und Zutaten abhaken; „Bildschirm anlassen“ (falls angeboten) einschalten und prüfen, dass der Bildschirm nicht dunkel wird; „Fertig · Heute gekocht“.

Weitere Testpunkte für Version 1.6 (auf beiden Geräten aktualisieren):

- [ ] Einstellungen → Datenumfang zeigt einen kleinen Prozentwert. **Jetzt aufräumen** meldet „nichts aufzuräumen“ oder die Zahl entfernter Einträge; die Liste bleibt unverändert, Vorschläge funktionieren weiter (z. B. einen vor Wochen gelöschten Artikel eintippen).
- [ ] „Bananen 2 Stück“ und noch einmal „Bananen 3 Stück“ hinzufügen: ein Eintrag mit 5 Stück. Ein Hinweis nennt die neue Menge. „Bananen 1 kg“ ergibt einen zweiten Eintrag.
- [ ] Ein Rezept auf die Liste übernehmen, dessen Zutat schon auf der Liste steht: Die Menge wird addiert („dazugezählt“).
- [ ] Einstellungen → Vorrat: „Salz“ und „Olivenöl“ eintragen. Rezept „Auf die Liste“: diese Zutaten sind abgewählt und mit „Vorrat“ gekennzeichnet. Auf dem zweiten Gerät erscheint der Vorrat nach dem Abgleich.
- [ ] Optional im verbundenen Modus: Ein Rezeptfoto ersetzen, dann Einstellungen → „Nicht mehr genutzte Fotos löschen“ (beide Geräte vorher abgleichen).

Weitere Testpunkte für Version 1.5 (auf beiden Geräten):

- [ ] App öffnen: Startseite zeigt **Alle** mit Abschnitten je Geschäft. Auf einem Gerät einen Artikel **ohne Geschäft** anlegen; auf dem zweiten Gerät (ebenfalls Version 1.5) erscheint er nach dem Abgleich unter „Ohne Geschäft“.
- [ ] Einen Artikel mit Geschäft anlegen (Schnellwahl unter dem Namensfeld), danach Geschäfts-Filter antippen: nur dessen Artikel; neue Artikel sind dort vorgewählt.
- [ ] Artikel ohne Geschäft im Stift-Dialog einem Geschäft zuordnen: Er wechselt den Abschnitt.
- [ ] Rezept „Auf die Liste“ ohne Geschäft übernehmen.

Weitere Testpunkte für Version 1.4 (auf beiden Geräten):

- [ ] Einkaufsliste: ein paar Artikel hinzufügen („Butter“, „Äpfel“, „Spülmittel“). Sie stehen unter den richtigen Gängen; unter „Kategorie, Preis & Angebot“ steht der Vorschlag. Einen falsch einsortierten Artikel im Stift-Dialog korrigieren und denselben Namen noch einmal hinzufügen: er landet im korrigierten Gang, auch auf dem zweiten Gerät.
- [ ] Wochenplan: ein Rezept über das Kalender-Symbol einplanen, ein eigenes Gericht eintragen, zwei Rezepte mit gleicher Zutat planen: „Einkauf für die Woche“ zählt die Zutat zusammen. Auf dem zweiten Gerät erscheint der Plan nach dem Abgleich.
- [ ] Gericht abhaken: das Rezept zeigt „gekocht heute“. „Lange nicht gekocht“ sortiert es nach hinten.
- [ ] Rezept mit Foto speichern. Auf dem zweiten Gerät erscheint das Foto kurz nach dem Abgleich. Im privaten Daten-Repo liegt es unter `photos/`.
- [ ] Foto im Flugmodus hinzufügen, Flugmodus aus: Das Foto wird beim nächsten Abgleich hochgeladen.

Weitere Testpunkte für Version 1.3 (auf dem iPhone):

- [ ] Ins Feld „Was brauchst du?“ tippen: die Seite zoomt **nicht** heran, die Leiste unten bleibt, solange die Tastatur zu ist, am unteren Rand; bei offener Tastatur ist sie ausgeblendet und kommt danach zurück. Auch im Querformat und nach Wechsel zwischen Safari und Homescreen-App prüfen.
- [ ] Rezepte → Import → **Screenshot**: einen Screenshot eines Rezepts (z. B. aus Instagram, helles und dunkles Design) wählen. Titel, Portionen, Zutaten und Zubereitung sollen im Editor erscheinen; Fehler dort korrigieren und speichern.
- [ ] Rezepte → Import → **Text**: Zutaten und Zubereitung einer Webseite einfügen.
- [ ] Rezepte → Import → **Link** mit erlaubten öffentlichen Hilfsdiensten oder mit eurem eigenen Hilfsdienst (Abschnitt 13). Wenn eine Seite sich nicht laden lässt, muss ein verständlicher Hinweis auf „Text“ erscheinen.
- [ ] Importiertes Rezept auf die Liste übernehmen: „nach Bedarf“-Zutaten sind abgewählt, Mengen folgen den Portionen.
- [ ] Ein Rezept aufklappen und 20 Sekunden stehen lassen: es darf sich nicht von selbst schließen.
- [ ] Einstellungen → „Alle Daten als JSON sichern“: der Teilen-Dialog erscheint; „In Dateien sichern“ funktioniert.
- [ ] Optional: Kurzbefehl „Rezept importieren“ aus dem Teilen-Menü von Safari.

## 12. Für die Weiterentwicklung

Keine Laufzeitabhängigkeiten, kein Build-Schritt. Eine lokale HTTP-Vorschau ist nur für Entwickler optional: `python3 -m http.server 8000` im Projektordner; im Browser den lokalen Port öffnen. Produktionsbetrieb läuft über HTTPS bei Pages. Moderne Browser und Safari/iOS ab 15.4 mit Web Locks werden vorausgesetzt.

Tests (Node 22 oder neuer, keine Abhängigkeiten für die Logik):

```sh
npm test                 # alles; die Browserprüfung wird ohne Playwright übersprungen
npm run test:logic       # nur Logik: Daten, Preise, Import, Hilfsdienst
npm run test:browser     # mobiles Chromium (npm i -D playwright; npx playwright install chromium)
```

- `tests/compact.test.mjs`: Aufräumen (Fristen für gelöschte und erledigte Artikel, Folgen für Zutaten/Preise/Artikel entfernter Rezepte und Geschäfte, Zeitstempel und Sammelmarke, verwaiste Änderungen eines alten Geräts, Namensgedächtnis, Simulation von einem Jahr Nutzung mit rund 20 Artikeln pro Woche). `tests/list.test.mjs`: Zusammenzählen gleicher Artikel (Einheiten, Geschäfte, „nach Bedarf“) und Vorrat.
- `tests/receipt.test.mjs`: Kassenbons im Stil von Rewe, Lidl, Edeka und PDF-Text (Gewicht, Stückzahl, Größen, Rabatt, Pfand, Summenprobe, Datum, Geschäft), Namensvorschläge. `tests/trend.test.mjs`: sichere Preisänderungen, Aktionen, Umrechnung, 60-Tage-Frist, Zuordnungen, Aufräumen. `tests/offers.test.mjs`: Gültigkeit von Angeboten, Alter von Preisen. `tests/concurrent.test.mjs`: Mengen bei gleichzeitigem Zusammenzählen (alle Reihenfolgen, Einheiten, Zusammenführen von Doppeln, Aufräumen). `tests/names.test.mjs`: Schreibweisen, Schnellwahl. `tests/cook.test.mjs`: Schritte. `tests/news.test.mjs`: „Neu von …“. `tests/browser.test.mjs` prüft zusätzlich das zugeklappte Formular, das Antippen von Zeilen, die Einstellungen und den `?add=`-Link. `tests/shop.test.mjs`: Modus „Im Laden“ (Geschäft wählen, Artikel ohne Geschäft, erst Edeka dann Lidl).
- `tests/data.test.mjs`, `tests/prices.test.mjs`: Beispielmodell, feldweises Zusammenführen, Reihenfolgeunabhängigkeit, doppelte Übertragung, Löschmarkierungen, Portionsübernahme, Versionsschutz, deutsche Mengeneingaben, Preisrechnung.
- `tests/recipe-import.test.mjs`: Zutatenzeilen (Brüche, Bereiche, Einheiten, ohne Menge), schema.org-Rezepte, kaputtes JSON-LD, Freitext mit und ohne Überschriften.
- `tests/page-source.test.mjs`: Hilfsdienst-Auswahl und der Cloudflare-Worker (nur eigene App, nur öffentliche https-Adressen, Größenlimit, Zeichensatz).
- `tests/categories.test.mjs`: rund 230 typische Einkäufe müssen im richtigen Gang landen (dort steht auch, was bewusst anders ist: „Kokosmilch“ ist Vorrat, „Preiselbeeren“ kein Reis), gelernte Kategorien, Gruppierung. `tests/plan.test.mjs`: Wochen, Kalenderwochen, Zeitumstellung, Zutaten zusammenzählen. `tests/photos.test.mjs`: Foto-Kennungen und Dateipfade, JPEG-Prüfung, Upload-Warteschlange.
- `tests/browser.test.mjs`: mobile Ansicht mit 390 und 320 px (kein seitlicher Überlauf, Schrift mindestens 16 px, Leiste am unteren Rand), Tastatur-Verhalten, alle Import-Wege einschließlich echter Texterkennung, `?import=`, simulierter GitHub-Server mit 304-Antworten und Fehlern, Offline-Start, Dunkelmodus, Kategorien, Favoriten, Wochenplan und Rezeptfotos zwischen zwei simulierten Geräten (Upload, Nachladen, Warteschlange ohne Verbindung). Echte Konten und ein echtes iPhone ersetzt das nicht: Den abschließenden Zwei-Geräte-Test führt ihr anhand der Checkliste aus.

Nicht getestet werden konnten: echte Rezeptseiten und die öffentlichen Hilfsdienste (in der Entwicklungsumgebung gesperrt; stattdessen realistische Beispiel-Seiten), echte GitHub-Abfragen sowie Safari/iOS. Die Hinweise zu iOS beruhen auf dem bekannten Verhalten von Safari.

Weitere Testpunkte für Version 1.1:

- [ ] Edeka wählen, Angebotsseite öffnen und eigenen Link unter „Geschäfte“ speichern.
- [ ] Artikel mit 2 kg und einem Preis von 1,99 € je 500 g anlegen: geschätzt 7,96 €.
- [ ] Beim selben Artikel einen passenden anderen Geschäftspreis notieren; Vergleich je kg und Datum kontrollieren.
- [ ] Artikel abhaken: geschätzte Summe sinkt; erneut antippen stellt sie wieder her.
- [ ] Preis leeren: fehlender Preis wird angezeigt, nicht als kostenlos gerechnet. Preis 0: wird ausdrücklich als kostenlos mitgerechnet.
- [ ] App erneut öffnen, denselben Namen im selben Geschäft eingeben und gemerkten Preis prüfen; Geschäft wechseln und anderen Vorschlag prüfen.
- [ ] Gleicher Name mit „Packung“: kein Vergleich mit unbekannter Packungsgröße; g und l werden nicht ineinander umgerechnet.
- [ ] Vorhandene Artikel und Einstellungen nach dem Update prüfen; die private Datendatei dafür nicht ersetzen.

Weitere Testpunkte für Version 1.2:

- [ ] Artikel abhaken und wieder öffnen: keine Benachrichtigung. Löschen funktioniert wie gewohnt.
- [ ] Normalpreis 2,49 €, Angebotspreis 1,79 €, jeweils je Packung, Menge 2: Summe 3,58 €. Angebot ausschalten: Summe 4,98 €, beide Preise bleiben gespeichert.
- [ ] Unterschiedliche Bezugsmengen (z. B. normal je 500 g, Angebot je kg) und ein Angebot ohne bekannten Normalpreis prüfen.
- [ ] Kochschinken eintragen und löschen, dann `kochs` eintippen: Vorschlag antippen und vollständigen Namen übernehmen. Nach Neuladen und offline wiederholen.
- [ ] Auf dem zweiten verbundenen Gerät nach dem Abgleich einen Namen vorschlagen lassen, der auf dem ersten Gerät eingegeben wurde.


## 13. Link-Import einrichten (optional, empfohlen)

Mit einem eigenen Hilfsdienst lädt der Link-Import zuverlässig und ohne öffentliche Fremddienste. Er läuft bei Cloudflare Workers (kostenloser Tarif: 100.000 Aufrufe pro Tag, ihr braucht einige). Der Dienst speichert nichts, kennt weder Token noch Daten und antwortet **nur eurer App** (Prüfung des Absenders). Einmalig, ca. 10 Minuten; die Menüs bei Cloudflare ändern sich gelegentlich.

1. Auf [cloudflare.com](https://www.cloudflare.com/) ein kostenloses Konto anlegen (E-Mail bestätigen).
2. Im Menü **Workers & Pages** → **Create** → **Create Worker** (die Vorlage „Hello World“ genügt). Namen vergeben, z. B. `rezepte`, **Deploy**.
3. **Edit code** wählen, den gesamten Beispielcode löschen und den Inhalt der Datei `worker/recipe-proxy.js` aus diesem Repository einfügen.
4. Oben im Code die Zeile `const ALLOWED_ORIGINS = ['https://nicoahb.github.io'];` prüfen: dort muss der Ursprung eurer App stehen, also der Pages-Link **ohne Pfad** (bei `https://nicoahb.github.io/Einkaufsliste-Rezepte/` ist es `https://nicoahb.github.io`). Bei einem anderen Konto entsprechend ändern.
5. **Deploy**. Die Adresse des Dienstes endet auf `.workers.dev`, z. B. `https://rezepte.dein-name.workers.dev`.
6. In der App: **Einstellungen → Rezepte aus Links laden**, die Adresse bei „Eigener Hilfsdienst“ eintragen, **Import-Einstellungen speichern**, dann **Eigenen Hilfsdienst testen**. Es muss „Hilfsdienst funktioniert“ erscheinen.

Die App erlaubt nur Adressen auf `*.workers.dev` (Sicherheitsrichtlinie `connect-src` in `index.html`). Wer eine eigene Domain verwenden möchte, ergänzt diese dort.

Grenzen: Einige Seiten blockieren automatische Abrufe (Anmeldung, Bot-Schutz) oder laden Rezepte erst per JavaScript nach. Dann hilft „Text“ oder „Screenshot“.

## 14. Drittanbieter-Komponenten

- [Tesseract.js](https://github.com/naptha/tesseract.js) und tesseract.js-core 5.1.1 (Apache-2.0) sowie das deutsche Modell `deu` aus tessdata_best (Apache-2.0): Texterkennung, Dateien unter `vendor/tesseract/` mit Lizenztexten und Herkunft.
- [Feather Icons](https://feathericons.com/) (MIT-Lizenz): Symbole, direkt in `index.html`.

