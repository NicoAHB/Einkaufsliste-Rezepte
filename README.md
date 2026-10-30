# Sattplan – Version 2.74

Eine deutsche Web-App für Haushalte und Familien: auf dem iPhone große Bedienelemente, fünf Bereiche (Einkauf, Rezepte, Wochenplan, Ausgaben, Einstellungen), Rezept-Import aus Links, Screenshots und Text und Speicherung in einem privaten GitHub-Repository. Die App besteht aus normalen HTML-, CSS- und JavaScript-Dateien. **Für die Nutzung brauchst du keinen Server, kein Terminal und keine Installation.** GitHub Pages liefert die öffentlichen App-Dateien aus; private Daten werden mit deinem persönlichen Token direkt über die GitHub-API gelesen und geschrieben.

## 1. Was diese Version kann

- Einkaufsliste für **alle Geschäfte zusammen** (Startseite) oder je Geschäft (Edeka, Lidl, Rewe; weitere anlegen, umbenennen, löschen). Ein Geschäft ist beim Hinzufügen mit einem Tipp wählbar, aber nicht nötig.
- Artikel mit Menge, Einheit und dem Namen der Person hinzufügen und bearbeiten; abhaken, löschen und erledigte Artikel gemeinsam entfernen. Erledigtes steht unten.
- Pro Geschäft einstellbare Angebotslinks, eigene Preise am Artikel mit Bezugsmenge, Angebotsmarkierungen und geschätzte Summe der noch offenen Artikel. Einen Preisverlauf oder Preisvergleich gibt es nicht (Version 2.44).
- Keine Rückgängig-Leiste: Ein Artikel, Geschäft, Rezept oder Gericht wird mit dem Mülleimer entfernt, versehentlich Entferntes legt man neu an. Kurze Hinweise (z. B. wo ein neuer Artikel steht) verschwinden nach wenigen Sekunden von selbst. Häkchen werden durch erneutes Antippen geändert.
- Beim Tippen passende Artikelnamen aus eurem bisherigen Einkaufsverlauf übernehmen, auch nach dem Löschen und offline.
- Rezepte mit einzelnen Zutaten, Zubereitung, Portionen, Tags und optionaler Quelle anlegen, bearbeiten, löschen; nach Rezept/Zutat/Tag suchen und nach Tag filtern. **Neu:** Import aus Link, Screenshot und Text (Abschnitt „Neu in Version 1.3“).
- Portionen umrechnen. Beim Übernehmen Zutaten einzeln abwählen, Geschäft auswählen und nur die gewählten Zutaten hinzufügen.
- Beispielmodus ohne GitHub, drei Beispielrezepte und eine über drei Geschäfte verteilte Beispielliste.
- GitHub-Abgleich per Button und alle acht Sekunden bei sichtbarer App; lokale Offline-Warteschlange; Backup-Export; heller und dunkler Modus; Homescreen und Offline-Start nach dem ersten erfolgreichen Online-Aufruf.

**Bewusst so gelassen:** Es gibt keinen Papierkorb und keinen Rückgängig-Knopf (Gelöschtes legt man neu an; alte Stände liegen im Verlauf des privaten Daten-Repositorys), und die Wiederherstellung aus einem Backup ist Handarbeit (Abschnitt 10). Beides wurde bei der Abschlussprüfung bedacht und von dir abgelehnt. Namen wie „Plan“ (Wochenplan, Reiter unten) und „Planen“ (Einkaufsliste) bleiben, wie sie sind.

## Neu in Version 2.74: persönliche Mengen, Stückpackungen und gleich breite Felder

**Zuletzt eingetragene Menge merken:** Ab dem nächsten manuellen Speichern merkt sich die App die Einzelmenge pro Produkt – z. B. **450 g Hackfleisch**. Zweimal 450 g ergibt 900 g auf der Liste; der nächste Vorschlag bleibt 450 g. Rezeptübernahmen, Summen, Abhaken und reines Ändern der Einheit verdrängen die Menge nicht. Eine bewusst geänderte und gespeicherte Menge ersetzt sie. Auch nach Neustart, Löschen, Aufräumen und dem GitHub-Abgleich auf dem zweiten Gerät. Das Namensgedächtnis hat jetzt Platz für bis zu 1500 Produkte; bewusste Vorgaben werden bevorzugt behalten. Alte Daten enthalten noch keine verlässliche Einzelmenge; daraus wird keine möglicherweise aufsummierte Rezeptmenge geraten.

**Passender Start und Pfeile:** Hackfleisch, auch „Hackfleisch gemischt“, startet ohne eigenen Verlauf mit **100 g**. Bei üblichen freien g-/ml-Eingaben ebenfalls 100, bei Gewürzen in g mit 10. Bekannte Packungen bleiben bei einer Packung. Beispiel: **100 g hoch → 150 g**, **100 g runter → 90 g**, **450 g hoch → 500 g**. Unter 100 sind die Schritte 10, von 100 bis einschließlich 1000 beim Erhöhen 50 und oberhalb von 1000 dann 100. Beim Verringern bis 100 in 10er-Schritten; Übergänge landen zuerst auf 100 bzw. 1000. Für ml gilt das Gleiche, kg/l werden entsprechend umgerechnet. Mindestmenge ist 1 g/ml bzw. 0,001 kg/l; Stück und Packungen bleiben bei ganzen Einerschritten ab 1. Freie bewusste Zahleneingaben bleiben möglich.

**Stückpackungen:** Bei Eiern **Packungsgröße wählen**: 4, 6, 10, 12, 15, 20 oder 30 Eier, oder eine eigene ganze Stückzahl. Die Auswahl wird pro Produkt gemerkt. **7 Eier Bedarf → 2 Packungen à 6 Eier** oder **1 Packung à 12 Eier**. Beim Wechseln bleibt der tatsächliche Bedarf 7; die Anzeige rundet erst dessen Summe auf. Im Bearbeiten-Fenster stehen Bedarf und Einkaufsinhalt zur Kontrolle. Solange keine Größe bekannt ist, bleiben Rezeptmengen in Stück. Eine alte einfache „Packung“ fragt beim Bearbeiten/erneuten manuellen Eintragen nach ihrem Inhalt, statt ihn zu erfinden.

Auch für Wraps/Tortillas, Brötchen, Croissants, Würstchen, Fischstäbchen, Spülmaschinentabs, Kaffeekapseln, Schwämme, Spültücher und Teelichter gibt es auswählbare Beispielgrößen. Es sind **änderbare Vorschläge**, keine Herstellerdatenbank. Bei bekannter Größe lassen sich Rezeptangaben wie eine halbe Packung Wraps mit weiteren Stückangaben zusammenzählen. Ohne bekannte Zuordnung bleiben g/Stück und fremde Verpackungen getrennt.

**Layout korrigiert:** Das Hinzufügen-Formular hatte noch ein altes Raster aus 5,5 rem, einer flexiblen Spalte und 52 px; „Einheit“ belegte dabei die beiden letzten Spalten. Jetzt erhalten **Menge und Einheit jeweils eine gleich große Spalte** mit `repeat(2, minmax(0, 1fr))`, wie beim Bearbeiten. Die Menge behält große Pfeiltasten; kein automatischer Mengenfokus und keine automatische Tastatur beim Einheitenmenü.

JSON bleibt **version 1**. Neu sind die optionalen Felder **purchaseAmount: {quantity, unit}** und **purchaseAmountAt** am Artikel sowie im Namensgedächtnis. Sie halten den letzten manuellen Einzelbedarf getrennt von `quantity/unit` der Einkaufsliste. Die beiden Angaben werden zusammen nach dem tatsächlichen Auswahlzeitpunkt abgeglichen, unabhängig von älteren Offline-Vorgaben. Gemerkte kg/g bzw. l/ml werden passend zur gewählten Einheit umgerechnet; bei Packungen entsprechend zum bekannten Inhalt. Keine neue Datei oder Sammlung. Sobald diese Angaben verwendet werden, gilt **minRev 9**. **Beide Geräte brauchen Version 2.74**, Offline-Paket **einkauf-shell-v86**; bitte schließen und neu öffnen, keine Browserdaten löschen. Ältere Dateien bleiben gültig, die private Daten-ZIP muss nicht vorab geändert werden.

- [ ] Hackfleisch gemischt eintippen: zuerst 100 g, Menge/Einheit gleich breit. Hoch → 150, Runter → 100 → 90.
- [ ] 450 g speichern, erneut eintippen: wieder 450 g. Noch einmal speichern: Liste 900 g, nächster Vorschlag weiterhin 450 g. Neustart und zweites Gerät prüfen.
- [ ] Vorhandenen Artikel auf 700 g ändern und speichern: nächster Vorschlag 700 g. Nur Einheit zu kg ändern: 0,7 kg. Abbrechen übernimmt keine Änderung.
- [ ] Zwei Rezepte mit 2 + 5 Eiern übernehmen. 6er-Packung wählen: 2 Packungen, Bedarf 7 Eier. Auf 12er wechseln: 1 Packung, weiterhin Bedarf 7 Eier.
- [ ] Eigene Eiergröße (z. B. 8) speichern; beim nächsten Eintragen angeboten. Wraps in der Bildauswahl ohne bekannte Größe hinzufügen: einmalige Auswahl, danach gemerkt.

## Neu in Version 2.73: zuletzt gewählte Maßeinheit zuverlässig merken

Eine **manuell geänderte Einheit** wird beim Speichern für das Produkt gemerkt und beim nächsten Hinzufügen automatisch vorbelegt. Sie bleibt jederzeit im Einheitenmenü änderbar. Das gilt auch für eigene Einheiten und Packungsgrößen, für Bildauswahl/Nachkaufen und für gleichartige Schreibweisen wie Banane/Bananen. Reines Auswählen ohne Bestätigen verändert die gespeicherte Vorgabe nicht.

Die bewusste Wahl bleibt unabhängig von Rechenmengen: Werden 600 g + 800 g intern als 1,4 kg summiert, bleibt **g** als gewählte Einheit erhalten. Rezeptübernahmen, Abhaken, Mengenänderungen und ältere Offline-Entwürfe verdrängen keine jüngere manuelle Wahl. Beim normalen Eintragen wird deren ursprünglicher Zeitpunkt weitergegeben. Unverändertes Bearbeiten erhält weiterhin den exakten Bedarf und parallele Mengenänderungen.

Die Information bleibt nach Neustart, Löschen und Aufräumen in der gemeinsamen Historie sowie im Backup erhalten. Neu ist das optionale Artikelfeld **purchaseMeasure** (String, höchstens 30 Zeichen), zusammen mit **purchaseAt** und **purchaseUnit**. Gemerkte Namen behalten es ebenfalls. JSON bleibt version 1. Bei Verwendung gilt **minRev 8**; beide Geräte brauchen Version **2.73**, Offline-Paket **einkauf-shell-v85**. Keine Browserdaten löschen.

- [ ] Einheit für ein Produkt ändern und speichern. Dasselbe Produkt neu eintippen: geänderte Einheit voreingestellt; erneut änderbar.
- [ ] Grammwahl durch Dazuzählen über 1 kg bringen, neu eintippen und nach Neustart/auf dem zweiten Gerät prüfen: weiterhin Gramm.
- [ ] Einheit erneut bewusst ändern: neue Auswahl wird gemerkt. Rezeptübernahme und Abhaken ändern die Vorgabe nicht.

## Neu in Version 2.72: einfache Mengen und Einkaufspackungen

Produkt tippen oder einen Vorschlag wählen, **Fertig/Enter** schließt die Tastatur und lässt Menge/Einheit zum Prüfen stehen. Erst **+** legt den Artikel an. Große **Hoch-/Runter-Pfeile** ändern die Menge; bei 1 ist Runter deaktiviert. Eine Zahl lässt sich bei Bedarf weiterhin bewusst direkt eintippen. Das gilt für neue Artikel, **Planen → Artikel antippen**, die Bildauswahl und Nachkaufen aus dem Vorrat. Einheiten antippen öffnet ein Menü mit üblichen Einheiten sowie einer freiwilligen eigenen Einheit/Packungsgröße.

**Bedarf und Packungszahl sind getrennt:** Rezepte behalten ihre Mengen. 500 ml Milch + 900 ml Milch ergeben einen gemeinsamen Bedarf von 1,4 l und auf dem Einkaufszettel **2 Packungen à 1 l**. 250 ml + 250 ml ergeben **1 Packung**, nicht zwei. Erst die Summe wird aufgerundet, auch bei zwei Geräten/offline und mehreren einzelnen Übernahmen. Bereits abgehakte Artikel, andere Geschäfte und unterschiedliche Produkte bleiben getrennt. Unterschiedliche ausdrücklich gewählte Packungsgrößen werden nicht blind vermischt.

Für Milch, passende Pflanzendrinks und übliche Säfte ist 1 l vorbelegt. Einige häufige abgepackte Kochzutaten wie Butter, Mehl und Nudeln haben einen sichtbaren üblichen Packungsinhalt. Das ist eine änderbare Einkaufsvorgabe, keine Erkennung aller realen Herstellerpackungen. **Eigene Einheit oder Packungsgröße** im Menü erlaubt z. B. Flasche/500 ml. Bei unklaren Produkten und nicht umrechenbaren Einheiten wie EL gegenüber g wird nichts geraten. Die zuletzt verwendete ausdrückliche Einheit bleibt aus der eigenen Historie auch nach dem Aufräumen erhalten. Rezeptportionen, PDF-Zutaten und Wochenplan-Übernahmemarken rechnen weiterhin mit dem exakten Bedarf.

**Speicherung:** Das JSON bleibt `version: 1`. Artikel haben optional `purchaseUnit: {label, quantity, unit}` (Packungsinhalt) oder `null` (bewusst ohne Packungsumrechnung), außerdem optional `purchaseAt`. `quantity`/`unit` am Artikel bleiben der exakte Bedarf in kompatiblen Maßeinheiten. `names` kann die gewählte Einkaufseinheit samt Zeitpunkt behalten. Bei Verwendung setzt die Datei **minRev 7**: beide Geräte brauchen dieses Update. Unverändertes Speichern eines Artikels mit 1,4 l Bedarf darf daraus keine 2 l machen. Verbindungsabgleich, Export und Sicherung übernehmen die Felder. Keine neue Sammlung, kein Serverdienst.

**Version 2.72**, Offline-Paket **einkauf-shell-v84**. Neue Module: `buying.js` und `quantity-controls.js`. Nach Veröffentlichung beide Handys schließen und neu öffnen, keine Browserdaten löschen.

- [ ] Milch tippen, Vorschlag wählen/Fertig: keine Mengentastatur. Hoch auf 2, runter auf 1; Runter ist dann deaktiviert. Mit + hinzufügen.
- [ ] Artikel antippen: Pfeile und Einheitenmenü funktionieren ebenfalls. Unverändert speichern erhält den exakten Bedarf.
- [ ] Rezepte mit 500 und 900 ml Milch übernehmen: zusammen 2 Packungen à 1 l. Zweimal 250 ml ergeben eine Packung. Auch separat und auf zwei Geräten prüfen.
- [ ] Packungsgröße auf Flasche/500 ml ändern: 1,4 l benötigen drei Flaschen. Wahl später erneut verwenden, Export und Offline-Abgleich prüfen.
- [ ] Lose Zutaten, Eier, andere Geschäfte, Wunschlisten, nicht kompatible Einheiten und abgehakte Artikel bleiben nachvollziehbar getrennt.

## Neu in Version 2.71: Vorrat ohne untere Leiste

In **Einkauf → Vorrat** ist die untere Hauptnavigation ausgeblendet. Auch ihr bisher reservierter Platz entfällt; der sichere Abstand zum unteren Displayrand bleibt erhalten. **Zur Liste** oben führt zurück zum Einkauf und blendet die Leiste wieder ein. Geschäftsfilter und angefangene Eingaben bleiben erhalten. Bildauswahl, Nachkaufen und andere Vorratsdialoge bleiben ohne Leiste. Die anderen Hauptbereiche behalten ihre bisherige Navigation; Im Laden bleibt wie bisher ohne Leiste.

**Version 2.71**, Offline-Paket **einkauf-shell-v83**. Keine Änderung am Datenmodell oder den persönlichen Daten. Nach Veröffentlichung App schließen und neu öffnen; keine Browserdaten löschen.

- [ ] Vorrat öffnen, scrollen, Produkt ergänzen und Bildauswahl/Nachkaufen öffnen: unten keine Hauptleiste und kein unnötiger Leerraum.
- [ ] **Zur Liste**: Hauptleiste wieder sichtbar, Einkauf/Rezepte/Plan/Ausgaben/Einstellungen erreichbar. Noch einmal Vorrat öffnen und den Rückweg prüfen.

## Neu in Version 2.70: eigener Vorrat und lokale Tippfehlerhilfe

**Einkauf → Vorrat** öffnet eine eigene, flache Ansicht mit Überschrift und **Zur Liste**. Einkauf bleibt unten aktiv; der Vorrat steht nicht mehr zwischen den Einstellungen. Einkaufsliste, Geschäftsfilter und noch nicht abgeschickte Eingaben bleiben beim Wechsel erhalten. Suche, Status, Bilder, Favoriten, Grundvorrat und Nachkaufen sind direkt erreichbar. Nur zusätzliche ältere Vorschläge ohne Bilder bleiben freiwillig eingeklappt. Ein erneutes Öffnen startet mit allen Vorräten; Neuladen startet wie bisher beim Einkauf.

**Kleine eindeutige Tippfehler** werden beim manuellen Hinzufügen zur Einkaufsliste und zum Vorrat automatisch berichtigt, z. B. `Tmoaten → Tomaten`, `Spagetti → Spaghetti`, `Joguhrt → Joghurt`. Die Hilfe läuft vollständig lokal, auch offline. Sie nutzt den Katalog und eigene bekannte Produktnamen; sie braucht weder KI-Dienst noch Einrichtung. Vorab steht **Beim Hinzufügen: …** mit **Original behalten**; beim Einkauf zeigt auch der Speicherhinweis die Änderung. Mehrere ähnlich passende Produkte werden als Vorschläge angeboten. Kurze Namen, exakte eigene Namen und normale Ein-/Mehrzahl bleiben erhalten. Sorten, Marken, Zahlen und Zusätze werden nicht entfernt. Die Automatik ändert keine alten Artikel, importierten Rezeptzutaten oder Wünsche und erzeugt keine dauerhaften Zuordnungen. Die vorsichtigen bestehenden Regeln zum Zusammenzählen bleiben unverändert.

Auch Bildauswahl und Vorratssuche finden kleine Tippfehler, wenn die normale Suche nichts findet. Kategorie, Favoriten und Vorratsstatus werden dabei weiterhin beachtet. **Gemerkte Schreibweisen** bleibt als eingeklappte Hilfe für früher ausdrücklich bestätigte Zuordnungen unter Einstellungen erhalten. Hier ist für den Alltag nichts zu pflegen; falsche alte Zuordnungen können entfernt werden.

Neue lokale Logik: `product-names.js`. Datenmodell und Mindestrevision bleiben unverändert. **Version 2.70**, Offline-Paket **einkauf-shell-v82**. Nach Veröffentlichung beide Handys vollständig schließen und neu öffnen, **keine Browserdaten löschen**.

- [ ] Einkauf → Vorrat: eigene Überschrift, Einkauf unten aktiv, keine Einstellungen im Weg. Zur Liste und andere Reiter testen; Geschäftsfilter und Eingabe bleiben erhalten.
- [ ] Grundvorrat, Sterne, Nachkaufen, Bilder und Status testen; Einstellungen enthält Automatisch sperren und Gemerkte Schreibweisen, den Vorrat dort nicht mehr.
- [ ] `Tmoaten` beim Einkauf hinzufügen: Hinweis, korrektes Produkt, Menge ggf. ergänzt. Einmal **Original behalten** testen; den ursprünglichen Namen anschließend beim Bearbeiten prüfen.
- [ ] `Zuchini` im Vorrat eingeben; richtiges Bild/Name. Tippfehler auch in den beiden Suchfeldern prüfen. `Ei`, `Eis`, `Reis`, `Apfeltasche`, `Gala Apfel`, eigene Marken und Wünsche bleiben unverändert.
- [ ] Offline hinzufügen, neu öffnen und später gemeinsam abgleichen: Namen/Mengen bleiben erhalten. Kein neuer Eintrag unter Gemerkte Schreibweisen durch automatische Korrektur.

## Neu in Version 2.69: Vorrat, Tagesrückblick und Rezeptnotizen

- **Vorratsauswahl → Produkt lange drücken:** öffnet **Auf die Einkaufsliste** mit Bild, Menge, Einheit und Geschäft. Bestätigen setzt nur dieses Produkt auf den Zettel. Vorhandene passende Mengen werden zusammengezählt. Der Vorratsstatus, Sterne und eine schon markierte Vorratsauswahl bleiben unverändert. Auch bereits vorhandene Produkte unterstützen die Geste. Tastatur: Produkt fokussieren und **Umschalt + F10**. Wischen, Abbruch und ein zweiter Finger lösen nichts aus; Textmarkierung und das native Bild-/Textmenü sind für diese Karten unterdrückt.
- **Grundvorrat** ist jetzt ein direkter Einstieg mit **28 wichtigen Kochzutaten** und passenden Bildern: Salz/Pfeffer/Gewürze, Mehl/Zucker/Backpulver, Nudeln/Reis/Haferflocken, Hülsenfrüchte, Tomatenkonserven/-mark, Öl/Essig/Brühe, Zwiebeln/Knoblauch/Kartoffeln und Milch/Eier/Butter. Vorschläge sind freiwillig; erst auswählen und bestätigen übernimmt sie. Auch hier funktionieren Sterne und langes Drücken.
- **Vorratsauswahl auf passende Produkte begrenzt:** Lebensmittel, Drogerie- und Haushaltsverbrauchsartikel. Technik, Garten-/Einrichtungsartikel, langlebiger Zubehör- und Tierbedarf werden nicht aus dem allgemeinen Katalog, der Kaufhistorie oder gemeinsamen Favoriten in diese Auswahl gemischt. **TV** wird auch bei der manuellen Eingabe als unpassend erkannt. Eigene Kochmischungen und andere eigene Vorräte samt Bild bleiben möglich. Die allgemeine Einkaufs-/Wunschauswahl behält ihr Sortiment, vorhandene persönliche Datensätze werden nicht automatisch gelöscht.
- **Tagesrezepte erneut ansehen:** unter „Für heute geschafft“ stehen **Rezepte von gestern erneut anschauen** und **Rezepte von heute erneut anschauen**. Sie öffnen genau die tatsächlich gespeicherte Auswahl, einschließlich übersprungener oder schon hinzugefügter Rezepte. Zurück/Weiter blättert, **Zur Übersicht** beendet den Rückblick. Vollständige Zutaten und Zubereitung bleiben lesbar; die Navigation bleibt beim Scrollen erreichbar. Noch nicht vorhandene Rezepte können nachträglich hinzugefügt werden; vorhandene werden nicht doppelt angelegt. Der normale Tagesfortschritt wird beim Anschauen nicht zurückgesetzt.
- Der Tagesverlauf speichert **heute und gestern lokal auf diesem Gerät**, einschließlich bereits geladener Rezepttexte. So funktioniert das Wiederansehen nach Neustart und offline. Wenn gestern noch keine Auswahl gespeichert wurde, bleibt der gestrige Knopf ausgegraut mit verständlichem Hinweis; es werden keine vermeintlich früher gesehenen Rezepte erfunden. Nach dem Update ist auch ein noch vorhandener alter Tages-Merkzettel verwendbar. Bereits geladene externe Rezepttexte werden für den Rückblick nicht erneut von der Ursprungsseite angefordert.
- **Rezept bearbeiten → Meine Notizen:** freiwilliges Textfeld mit bis zu **10.000 Zeichen**. Die Notizen werden am gemeinsamen Rezept gespeichert, offline abgeglichen, im lokalen Rezeptentwurf und in JSON-/ZIP-Sicherungen erhalten. Beim Bearbeiten werden nur geänderte Felder gesendet; ein unverändertes leeres Notizfeld überschreibt keine zwischenzeitliche Partner-Notiz. Unter Zutaten & Zubereitung sind gespeicherte Notizen ebenfalls lesbar.
- **Rezeptblatt und PDF** zeigen den eingetragenen Text im Bereich **Meine Notizen**. Lange Texte werden vollständig und mit korrekten Seitenzahlen fortgesetzt, ohne Zutaten/Zubereitung zu überdecken. Ein leeres Feld behält die bisherigen freien Schreiblinien. Beide Ausgaben verwenden dieselben Zeichenbefehle.
- **Im Laden startet mit Alle:** beim Öffnen über „Im Laden“, beim Neuladen in diesem Modus sowie nach Wegfall des gewählten Geschäfts. Die Einkaufsliste ist sofort sichtbar; ein einzelnes Geschäft bleibt anschließend auswählbar. Eigene Wunschlisten bleiben aus Alle ausgeschlossen.
- **Verschieben nach → Artikel löschen:** ganz unten unter den Geschäften, mit Mülleimer-Symbol und dezenter Trennlinie. Ein einzelner Artikel wird direkt entfernt; bei mehreren ausgewählten Artikeln gibt es eine Rückfrage. Die vorhandene Offline-Sicherung und der gemeinsame Abgleich gelten auch hier.
- **Bündige Vorratszeilen:** feste Spalten halten Haken, Bild, Namen und Entfernen an derselben Position. Lange Namen wie Knoblauchzehen werden innerhalb einer gut lesbaren Mindestgröße in eine Zeile eingepasst. Besonders lange eigene Namen dürfen zweizeilig sein; der vollständige Name bleibt beim Bearbeiten erhalten.

JSON bleibt `version: 1`; neu ist ausschließlich das optionale Rezeptfeld `notes` (String). Die Mindestrevision bleibt **6**. Tagesrückblicke und Produktauswahl sind lokale Ansichten. Version **2.69**, Offline-Paket **einkauf-shell-v81**. Beide Handys nach Veröffentlichung schließen und neu öffnen; **keine Browserdaten löschen**.

Kurze Prüfung auf euren Handys:

- [ ] Im Vorrat ein Produkt lange drücken: keine blaue Markierung, Menge/Geschäft wählen, auf der Einkaufsliste wiederfinden; Vorrat unverändert.
- [ ] Beim Scrollen über Produktbilder öffnet sich nichts. Bereits vorhandene Produkte und selbst angelegte Produkte mit Bild ebenfalls prüfen.
- [ ] Grundvorrat öffnen: nichts wird automatisch als vorhanden markiert. Sterne, Auswahl und Übernahme testen. TV/Garten-/Technikartikel erscheinen dort nicht.
- [ ] Tagesrezepte durchsehen, heute erneut öffnen, später gestern erneut öffnen; gleiche Titel und keine doppelten Rezepte. Auch nach Neustart/offline testen.
- [ ] Rezeptnotizen mehrzeilig speichern, auf dem zweiten Gerät und in PDF/Backup prüfen; längere Notizen stehen vollständig auf Folgeseiten.
- [ ] Im Laden öffnen: Alle ist aktiv und die Artikel erscheinen sofort. Einzelnes Geschäft auswählen, über Planen zurück und erneut öffnen: wieder Alle.
- [ ] Artikel lange halten und loslassen: ganz unten im Verschieben-Menü den getrennten Mülleimer prüfen. Mehrere Artikel auswählen: Löschen einmal abbrechen und einmal bestätigen.
- [ ] Im Vorrat Knoblauchzehen, Thymian, Zwiebel und Tomatenmark auf schmalem Display prüfen: Bilder bündig, Namen lesbar. Auch Drehung, Dunkelmodus und ausgeschaltete Bilder prüfen.

## Bisher in Version 2.68: kompakter Einkauf ohne Preisschätzung

Die Einkaufsliste beginnt wieder früher: Die frühere Summenkarte entfällt. **Produkte**, **Vorrat** und die **Angebotsseite** des gewählten Geschäfts teilen sich direkt unter dem Namensfeld eine kompakte Zeile. Alle Ziele bleiben mit einem Tipp erreichbar; nichts muss zunächst aufgeklappt werden. **Vorlagen**, Menge/Einheit und weitere Angaben erscheinen weiterhin erst beim Tippen ins Namensfeld. Auf den geprüften Breiten 280, 314, 360, 390 und 430 Pixel beginnt der erste Artikel bei rund **408 Pixeln** statt zuvor etwa 504 Pixeln. Die Bedienelemente behalten mindestens 44 Pixel große Tippflächen.

**Keine Preisschätzung mehr:** weder Summenkarte/fehlende Preise unter Planen noch ungefähre Eurobeträge unter Im Laden. Auch beim Einkauf-Abschluss wird keine Schätzung mehr erzeugt; in Ausgaben gibt es keinen Vergleich mit geschätzten Beträgen. Dort zählen ausschließlich tatsächlich eingetragene Einkäufe und Rückerstattungen. Freiwillige manuelle Preis-/Angebotsnotizen bleiben editierbar und werden nicht zu einer Summe hochgerechnet. Bereits gespeicherte Notizen oder alte `purchases.estimate` werden nicht gelöscht und bleiben in Backups erhalten.

Die zwei gemeldeten Wochenplantests verwenden jetzt feste Montage, Freitage und Sonntage. Der Überschriftentest plant bewusst in der nächsten Woche, damit Donnerstag immer in der Zukunft liegt. Der Zieh-Test bringt das Gericht vor der Pointer-Bedienung in die Bildschirmmitte, statt unsichtbar unter der unteren Leiste zu drücken. Der App-Code für vergangene Tage bleibt unverändert.

Bei der Gesamtprüfung wurde außerdem das Schließen eines unveränderten Formulars mit angebotenem Rezeptentwurf abgesichert: Der vorhandene Entwurf bleibt erhalten, bis er zurückgeholt oder ausdrücklich verworfen wird. Der Test wartet auf das vollständig abgearbeitete Schließen und prüft den lokalen Entwurf vor dem Neuladen.

Versionsanzeige **2.68**, Offline-Paket **einkauf-shell-v80**. Datenmodell bleibt `version: 1`, Mindestrevision bleibt **6**. Beide Geräte nach Veröffentlichung ganz schließen und erneut öffnen; keine Browserdaten löschen.

- [ ] Auf 280–430 Pixeln: Produkte/Vorrat sofort erreichbar, Angebotslink beim ausgewählten Geschäft, keine Überlappung/seitlicher Seitenüberlauf.
- [ ] Die Liste zeigt keine Schätzsumme oder Hinweise auf Artikel ohne Preis. Im Laden steht nur die Zahl offener Artikel.
- [ ] Einkauf beenden und tatsächlichen Betrag eintragen; in Ausgaben prüfen, Person/Zeitraum/Retouren weiter verwenden.
- [ ] Alte Preisnotizen bleiben beim Bearbeiten und im Backup erhalten, erzeugen keine Summe oder Vergleich.

## Bisher in Version 2.67: einfache Ausgaben für die Familie

**Betrag eingeben → speichern.** Unter **Ausgaben → Einkauf** sind heute und dein Name vorbelegt. Geschäft und Notiz bleiben freiwillig. Auch wenn du gerade einen alten Monat ansiehst, startet ein neuer Einkauf mit **heute**. Kassenbon-Erkennung und **Im Laden → Einkauf beenden** verwenden dieselbe Personenauswahl. Die Erkennung liest weiterhin nur Betrag, Datum und Geschäft als prüfbaren Vorschlag; keine automatische Produkt- oder Preiszuordnung.

- **Eingekauft von:** den eigenen Namen übernehmen oder eine andere Person wählen. Über **+** direkt im Formular eine Person ergänzen, ohne den eingegebenen Betrag zu verlieren. Diese Auswahl gilt für den einzelnen Einkauf.
- **Personen verwalten:** Namen ergänzen, umbenennen und aus-/einblenden. Feste IDs erhalten die Zuordnung und Personensummen beim Umbenennen. Ausblenden entfernt weder Einkäufe noch die frühere Personenzuordnung. Der gespeicherte Gerätename bleibt die Vorgabe für neue Käufe; die Person eines bearbeiteten Einkaufs bleibt erhalten.
- **Übersicht:** zuerst Familiensumme, dann Beträge je Person und Einträge mit Geschäft, Datum, Person und Betrag. Eine Person antippen filtert die Anzeige; **Alle** kehrt zur Familie zurück. Ältere Einträge ohne gespeicherte Person heißen **Nicht zugeordnet**. Eintrag antippen und die Person ausdrücklich wählen; die App rät sie nicht aus Notizen oder alten Bearbeitern.
- **Zeitraum wählen:** diesen Monat, letzten Monat, dieses Jahr oder frei **Von → Bis einschließlich**. Personen- und Zeitraumfilter wirken zusammen. Das gemeinsame Monatsbudget erscheint ausschließlich für **Alle** und einen vollständigen Kalendermonat. Im laufenden Monat heißt der Vergleich ausdrücklich **Vormonat insgesamt**, damit ein angefangener Monat nicht wie ein vollständiger Vergleich wirkt.
- **Weitere Auswertungen** ist zunächst zugeklappt: letzte sechs Monate (bei Monatsauswahl), Geschäfte, Durchschnitt sowie **CSV herunterladen** für genau die angezeigte Person und den Zeitraum. Die CSV enthält Datum, Art, Person, Geschäft, Eurobetrag und Notiz. Auf unterstützten iPhones öffnet der Export den Teilen-Dialog; sonst wird die Datei heruntergeladen. Die JSON-/ZIP-Gesamtsicherung bleibt unter Einstellungen verfügbar.
- **Rückerstattung / Retoure:** freiwillig unter **Weitere Angaben** beim Eintragen. Einen positiven Betrag eingeben; die App zieht ihn von der Summe ab und kennzeichnet ihn in der Liste und CSV mit Minus. Keine neue Preisverwaltung und kein automatischer Kostenausgleich zwischen Personen.
- **Doppelt?** wird auch zwischen verschiedenen Personen geprüft. Erster Speicherversuch warnt, ein bewusst zweiter Versuch erlaubt einen zweiten gleich teuren Einkauf. Eine Rückerstattung gilt nicht als derselbe Einkauf.
- **Dauerhafte Historie:** Ausgaben werden nicht mehr nach 36 Monaten entfernt. Auch ihre Löschmarken bleiben gegen verspätete Offline-Änderungen erhalten; gelöschte Ausgaben zählen nicht in Summen oder Berichten.
- **Gemeinsam/offline:** neue Mitglieder und Käufe werden lokal gesichert und später feldweise abgeglichen. Beim Bearbeiten werden nur geänderte Felder gesendet. Eine reine Betragsänderung überschreibt daher keine zwischenzeitlich auf einem anderen Gerät korrigierte Person. Reicht der Gerätespeicher nicht, bleiben Betrag und Formular zur Korrektur offen.

**Daten:** JSON bleibt `version: 1`. Neu ist die optionale Sammlung `members` mit `id`, `name`, `archived` und den üblichen Zeitstempeln/`_clock`. `purchases` hat optional `buyerId` (fehlend/null = nicht zugeordnet), `buyerName` (Namens-Snapshot), `kind` (`purchase`/`refund`; fehlend = Einkauf). Beträge bleiben positive ganze Cent; `kind` bestimmt die Wirkung auf Summen. Ein Name wird beim Anzeigen aus der festen Personenzuordnung aufgelöst, andernfalls aus dem Snapshot. Öffnen einer alten Datei erzeugt keine geratenen Personen. Bei Änderungen oder Aufräumen einer Datei mit Ausgaben/Personen wird **`sync.minRev: 6`** gesetzt; **beide Geräte auf 2.67 aktualisieren**. Unterstützende ältere Apps stoppen dann, statt Rückerstattungen zu addieren oder alte Einkäufe zu entfernen. Offline-Paket: **einkauf-shell-v79**. Keine neue Einrichtung nötig; Browserdaten nicht löschen.

Kurze Prüfung auf euren Handys:

- [ ] Nico und die Partnerin tragen je einen Betrag ein; Familiensumme und Personensummen stimmen nach Abgleich auf beiden Geräten.
- [ ] Nur Betrag eintragen: heute/eigener Name; beim Bearbeiten eines fremden Einkaufs bleibt dessen Person ausgewählt.
- [ ] Personenfilter und eigenen Zeitraum einschließlich beider Grenztage prüfen; Budget nur bei Alle + ganzem Monat.
- [ ] Eine alte, nicht zugeordnete Ausgabe von Hand zuordnen. Person umbenennen/ausblenden: ihre alten Beträge bleiben erhalten.
- [ ] Einkauf beenden und Kassenbon-Erkennung behalten die ausgewählte Person; nur beenden erzeugt keinen Betrag.
- [ ] Unter Weitere Angaben eine Retoure erfassen: Minus in Liste/CSV, Gesamtsumme sinkt.
- [ ] Offline je einen Einkauf erfassen, App neu öffnen und später abgleichen: beide Einträge und Personen bleiben erhalten.
- [ ] CSV für eine Person und einen Zeitraum sowie JSON-Backup speichern; kein Token enthalten.

## Bisher in Version 2.66: Favoriten im Vorrat schneller finden

Unter **Vorrat** steht neben **Mit Bildern auswählen** jetzt ein direkter **★ Favoriten**-Knopf mit der Zahl gemerkter Produkte. Er öffnet sofort die Favoriten zum Übernehmen. Die Bildauswahl erklärt die schon vorhandenen Sterne ausdrücklich: Stern antippen merkt ein Produkt, ein zweiter Tipp entfernt nur den Favoriten. Ein Stern fügt nichts in den Vorrat oder auf die Einkaufsliste ein und verändert keinen Vorratsstatus.

Markierte Produkte erscheinen beim nächsten normalen Öffnen der Vorratsauswahl automatisch zuerst. Auch Produkte, die schon vorhanden sind, lassen sich mit dem Stern merken; der Stern bleibt neben der ausgegrauten Übernahme bedienbar. Eigene manuell eingetragene Produkte findet ihr über Suche oder **Eigene** und könnt sie samt ihrem gewählten Bild als Favoriten behalten. Noch leere Favoriten erklären den Weg über **Alle → Stern**.

Einkauf und Vorrat verwenden dieselben gemeinsamen Produktfavoriten. Sie bleiben nach Neustart erhalten, funktionieren offline und werden auf dem zweiten Gerät abgeglichen. Es gibt keine zusätzliche Einrichtung und keine Änderung am JSON-Modell. Das Offline-Paket heißt **einkauf-shell-v78**.

- [ ] **Vorrat → ★ Favoriten** öffnet direkt die Favoriten; eine leere Auswahl zeigt die kurze Anleitung.
- [ ] Unter **Alle** einen Stern setzen. Es wird noch kein Vorrat eingetragen; die Zahl am Favoriten-Knopf steigt.
- [ ] Favorit auswählen und in den Vorrat übernehmen; beim nächsten Öffnen erscheint er zuerst und ist als vorhanden gekennzeichnet.
- [ ] Auch bei einem vorhandenen Produkt den Stern setzen oder entfernen; der Vorrat bleibt bestehen.
- [ ] Eigenen Artikel mit Bild offline merken, App neu öffnen und später auf dem zweiten Gerät wiederfinden.

## Bisher in Version 2.65: 1.024 Produktbilder und ein einfacher bebilderter Vorrat

Der Katalog enthält jetzt **1.024 einzelne Produktmotive** und weiterhin **32 Gruppenmotive**. Dazu kamen 832 eigene Bilder in 26 Tafeln: Obstsorten, Gemüse/Salate/Pilze/Kräuter, Brot/Teige/Gebäck, Käse/Milch/Eier, pflanzliche Alternativen, Fleisch/Aufschnitt/Fisch, Tiefkühl, Nudeln/Reis/Getreide, Konserven, Soßen/Gewürze, Backen/Nüsse, Frühstück, Süßigkeiten/Snacks, Getränke/Kaffee/Tee sowie Reinigung/Wäsche/Pflege/Hygiene, Baby/Tiere und Garten/Alltagsbedarf. Es sind allgemeine Beispielmotive, keine Datenbank aller Markenartikel. Für weitere eigene Produkte bleiben die 32 passenden Gruppenbilder verfügbar. Alle 1.056 Motive benötigen zusammen **rund 6,16 MB**, liegen lokal und funktionieren offline.

`product-catalog-data.js` hält Namen, Startmengen, Kategorien und stabile Bildpositionen. Die bisherigen 192 Kennungen und alle Favoriten bleiben erhalten. Die Produktauswahl zeigt anfangs **96 Produkte**; **Weitere Produkte anzeigen** lädt die nächsten 96 in die Ansicht. Die Suche durchsucht sofort den gesamten Katalog, auch nicht angezeigte Produkte. Kategorie, Favoriten und häufige Käufe bleiben verfügbar. Auch die Vorschläge beim Tippen kennen die zusätzlichen Namen. Vollständige Katalognamen haben eine geprüfte Kategorie; unklare Teilwörter werden dadurch nicht gleichgesetzt. Frischer und getrockneter Oregano sowie verzehrfertiger Milchreis heißen ausdrücklich unterschiedlich.

**Vorrat bedienen:**

1. Unter **Einkauf → Planen** auf **Vorrat** tippen oder **Einstellungen → Vorrat** öffnen. Es gibt keinen zusätzlichen Tab.
2. **Mit Bildern auswählen** öffnet denselben Katalog. Mehrere Produkte markieren und **… in den Vorrat** drücken; Mengen und Geschäft sind dabei nicht nötig. Bereits Vorhandenes ist gekennzeichnet.
3. Alternativ im Feld **Oder selbst eingeben** einen Produktnamen schreiben und **+** drücken. Das Produkt bekommt automatisch ein passendes Einzel- oder Gruppenbild. Namen bleiben genau eure Eingabe, auch zusammengesetzte Namen.
4. Das Produkt antippen: Name/Kategorie ändern, **Bild auswählen** (Einzel- oder Gruppenmotiv) oder **Automatisch zuordnen**. Ein bewusst gewähltes Bild wird mit dem Eintrag gespeichert und mit dem anderen Gerät geteilt.
5. Links auf den Kreis tippen: **Vorhanden** ↔ **Aufgebraucht**. Es gibt keine Pflichtmengen, Haltbarkeitsdaten oder automatische Verbrauchsschätzung. Suche, Kategorien und Statusfilter halten große Listen übersichtlich; der Vorrat-Knopf zeigt die Zahl aufgebrauchter Produkte.
6. Bei Aufgebrauchtem auf **Nachkaufen** tippen, Menge/Einheit und optional Geschäft wählen, dann bestätigen. Das eigene Bild kommt auf die Einkaufsliste mit. Steht derselbe Artikel dort im Zielgeschäft schon offen, wird er nicht versehentlich ein zweites Mal hinzugefügt oder erhöht. Nachkaufen markiert den Vorrat noch nicht als vorhanden: Das bestätigt ihr, wenn das Produkt wieder zu Hause ist.

Nur **vorhandener** Vorrat wird bei der Rezeptübernahme und beim Wocheneinkauf vorab abgewählt. **Aufgebraucht** zählt auch bei „Was kann ich kochen?“ nicht als vorhanden; die ausdrückliche Markierung hat Vorrang vor einer alten Einkaufserinnerung. Die bereits vorhandenen Grundvorrat-Vorschläge stehen nun in einem aufklappbaren Bereich.

Eine eigene Vorratskategorie wird beim Nachkaufen übernommen; eine zuvor bewusst verwendete Einkaufskategorie desselben Produkts behält Vorrang. Produktauswahl- und Vorratsfenster beginnen beim erneuten Öffnen oben. Artikelvorschläge stehen direkt unter dem Namensfeld; die Tab-Beschriftung passt auch bei 375 Pixeln Breite vollständig in die schwebende Leiste.

Technisch bleibt die JSON-Datei bei `version: 1`. `pantry` ist weiterhin eine optionale Sammlung. Neu sind die freiwilligen Felder `available` (fehlt = vorhanden), `category` und `imageKey` (fehlt/null = automatisch). `imageKey` enthält ausschließlich eine lokale Produkt- oder Gruppenkennung, keine URL. Auch Listenartikel und Favoriten können diese Kennung erhalten. Neue Vorräte haben pro Produkt eine feste ID, damit dieselbe gleichzeitige Anlage nicht doppelt erscheint; alte IDs werden weiterverwendet. Status-, Namens- und Bildänderungen werden feldweise zusammengeführt; geöffnete Entwürfe senden nur geänderte Felder. Vorrats-Löschmarkierungen bleiben beim Aufräumen als Schutz vor späten Offline-Änderungen erhalten.

Sobald „Aufgebraucht“ genutzt wird, trägt die Datei **`sync.minRev: 5`**. Beide Geräte brauchen dann diese neue App-Version; eine ältere unterstützende App stoppt verständlich, statt den leeren Vorrat weiter als vorhanden zu behandeln. Keine Daten werden gelöscht. Das Offline-Paket heißt jetzt **`einkauf-shell-v77`**.

Kurze Prüfung:

- [ ] Im Katalog nach einem neuen Produkt wie „Kühlakku“, „Kichererbsen“, „Säuglingsnahrung“ oder „Roggenmehl“ suchen; Suche findet auch Produkte außerhalb der ersten 96 Karten.
- [ ] Mehrere Produkte per Bild in den Vorrat übernehmen; erneutes Hinzufügen erzeugt keine Dubletten.
- [ ] Einen eigenen Namen eintippen, passendes Bild wählen, App schließen/neu öffnen: Name und Bild bleiben erhalten.
- [ ] Einen vorhandenen Vorrat als aufgebraucht markieren; die Rezeptübernahme wählt ihn wieder zum Einkaufen aus.
- [ ] Nachkaufen: eigenes Bild, Menge und Zielgeschäft prüfen; erneuter Versuch zeigt „Steht schon auf der Liste“.
- [ ] Flugmodus: App neu öffnen, Bildauswahl/Vorrat bearbeiten; nach Rückkehr ins Netz auf dem zweiten Gerät kontrollieren.
- [ ] Auf zwei Geräten gleichzeitig Status und Bild desselben Vorrats ändern: beide Änderungen bleiben erhalten.

## Bisher in Version 2.64: Eigene Bilder unter Planen, Im Laden und in der Produktauswahl

Die **grün markierten Bilder aus den Screenshots waren Emojis**: `app.js` setzte sie über `emoji.js` in die Kacheln. Ihre Darstellung kam aus den Schriften **Apple Color Emoji**, **Segoe UI Emoji** bzw. **Noto Color Emoji** des Geräts. Die App verwendete 82 unterschiedliche Zeichen; dahinter stand kein Bilddienst mit über 1.000 Produktfotos. Der frühere Versuch mit Internet-Produktfotos (Version 2.13) ist seit 2.14 entfernt.

Jetzt verwenden **Planen**, **Im Laden**, die Zeilen **Neu von …** und die **Produktauswahl** denselben eigenen Bildbestand:

- **192 einzelne Produktmotive**: die bisherigen 128 Bilder plus 64 neue. Alle 159 schon im Programm hinterlegten Vorschlagsnamen haben damit ein eigenes passendes Motiv bzw. eine ausdrücklich geprüfte Zuordnung. Neu sind unter anderem Blumenerde, Feinwaschmittel, weitere Reiniger, Gemüse, Kräuter und Vorräte. Die Schnellauswahl ist auf 192 Produkte erweitert; vorhandene Favoriten-Kennungen bleiben gültig.
- **32 eigene Gruppenmotive** für Produkte ohne individuelles Bild: etwa Obst, Gemüse, Brot, Milchprodukte, Tiefkühl, Gebäck, Reinigung, Körperpflege, Garten, Baby, Tierbedarf, Technik, Sport und Werkzeuge. Unbekannte Namen bleiben dadurch bebildert. Dies ist ein erweiterbarer Bildbestand, keine Behauptung, dass für jeden künftig frei eingegebenen Produktnamen bereits ein Einzelbild existiert.
- Die **quadratischen, abgerundeten Kästchen mit dünnem Rahmen** bleiben an derselben Stelle rechts: 56×56 Pixel, auf sehr schmalen Geräten 44×44. Name/Menge, Abhaken und Bearbeiten behalten ihre Bedienung. Die Bilder sind dekorativ und selbst nicht antippbar.
- `product-images.js` löst die Bildzuordnung zentral auf: vollständige Namen und geprüfte Schreibweisen zuerst; bekannte Marken-/Mengen-Zusätze nur dann entfernen, wenn ein vollständiger bekannter Produktname übrig bleibt. So findet „Domol Feinwaschmittel“ das neue Waschmittelmotiv. **Keine unscharfe Teilwortsuche:** „Apfeltasche“/„Apfelkuchen“ bekommen Gebäck, „Milchreis“ ein Dessert-Gruppenbild, „Birnensaft“ Getränke und „Zwiebelmett“ Fleisch. Namen, Preise und Mengen werden durch die Bildauswahl niemals verändert.
- Fehlende Bilddateien wechseln auf das passende Gruppenmotiv; ist auch das technisch nicht verfügbar, bleibt eine neutrale Kachel erhalten. Es gibt keine externe Ersatz-Bildsuche und keine KI-Aufrufe beim Benutzen der App.
- Alle **224 Motive zusammen benötigen rund 1,53 MB**. Sie liegen in sieben lokalen WebP-Bildtafeln und sind im Offline-Paket. Der Schalter **Produktbilder anzeigen** wirkt weiterhin auf beide Listenansichten und wird auf dem Gerät gespeichert.
- Bei einem neuen Katalogprodukt mit eindeutig hinterlegter Kategorie, für dessen Namen die bisherige Schätzung nichts findet (z. B. Rote Bete), bleibt die Katalog-Kategorie bei der Übernahme erhalten. Eure zuletzt gelernte Kategorie hat weiter Vorrang.
- Neu eingegebene Apfel-/Quarktaschen werden ausdrücklich als Backwaren eingeordnet, statt das Wort „Apfel“ als Obst zu deuten. Bereits ausdrücklich gemerkte Kategorien bleiben eure Entscheidung.
- Neues Offline-Paket: `einkauf-shell-v76`. Nach dem Hochladen die App ganz schließen und neu öffnen. Die Erweiterung ändert weder die privaten Daten-Dateiversion noch vorhandene Listen und Favoriten.

Kurze Prüfung:

- [ ] Unter Planen und Im Laden dieselben Motive für Butter, Eier, Milch, Blumenerde, Honig, Domol Feinwaschmittel und Zahnpasta.
- [ ] In der Produktauswahl sind bei denselben Namen genau dieselben Bilder zu sehen.
- [ ] „Apfeltasche“ und ein unbekanntes Produkt erhalten passende Gruppenbilder, keine falsch zugeordneten Obst-/Einzelbilder.
- [ ] Schalter aus/an, heller/dunkler Modus und kleine iPhone-Breite: Kacheln bleiben korrekt; kein Text läuft darunter.
- [ ] Nach dem ersten vollständigen Laden offline neu starten: Produkt- und Gruppenbilder sind weiter sichtbar.

## Neu in Version 2.63: Name und Logo „Sattplan“

Die App heißt jetzt **Sattplan**. Verwendet wird genau das Logo der Titelseite aus dem bereitgestellten **Sattplan_AppStore-Vorbereitung.pdf**: grüne Fläche, weiße Einkaufstasche, orange-/gelbfarbene Henkel und grüner Haken mit Blatt. Das eingebettete 800×800-Pixel-Bild wurde samt Transparenzmaske direkt aus dem PDF übernommen; das Motiv wurde nicht neu erzeugt. Andere Inhalte oder Empfehlungen des PDFs wurden nicht umgesetzt.

- Neuer Name im Browser, auf dem Homescreen, im App-Manifest, in der Anleitung, auf Rezeptblättern/PDF-Metadaten und in Backup-Beschreibungen. Die Einstellungen zeigen Name und Logo als kompakten Kopf.
- Erneuerte iPhone-/Android-/Browser-Symbole. `assets/branding/sattplan-logo.png` enthält das Original mit Transparenz; `assets/branding/sattplan-appstore-1024.png` ist ein quadratischer 1024-Pixel-Export für eine spätere App-Store-Verpackung. Das PDF enthält nur 800 Pixel; der größere Export fügt keine Bilddetails hinzu.
- Die bestehende GitHub-Adresse, Manifest-Kennung, Verbindungsdaten und Browserspeicher-Schlüssel bleiben erhalten. Listen, Rezepte, Favoriten und noch nicht gesendete Änderungen werden durch die Umbenennung nicht zurückgesetzt.
- Neues Offline-Paket: `einkauf-shell-v75`. App nach dem Hochladen vollständig schließen und erneut öffnen. Ein bereits vorhandenes iPhone-Homescreen-Symbol kann seinen alten Namen behalten: Den Titel dort gegebenenfalls bearbeiten. Für ein altes Bild erst die aktualisierte Seite in Safari prüfen; bei Bedarf eine neue Verknüpfung anlegen. Die App-Daten und Browserdaten dabei erhalten.

Prüfung: Browser-Titel und Manifest heißen Sattplan, alle Icons zeigen das PDF-Logo, unter Einstellungen steht Sattplan, Rezeptblätter tragen SATTPLAN, bestehende Daten und die schnelle Produktauswahl sind weiter vorhanden.

## Neu in Version 2.62: Alltagsprodukte mit Bildern und Favoriten

Direkt unter **„Was brauchst du?“** steht jetzt der kompakte Knopf **Produkte auswählen**. Er ist auch bei zugeklapptem Eingabefeld sichtbar und öffnet ein eigenes Fenster mit **128 Alltagsprodukten und passenden lokalen Beispielbildern**, nach Gängen geordnet. Die Einkaufsliste selbst bleibt kompakt; bei eigenen Wunschlisten wird der Knopf ausgeblendet.

1. **Alle**, **★ Favoriten**, **Häufig gekauft** oder **Eigene** auswählen; mit Suche und Kategorie eingrenzen. Die Suche versteht auch „Aepfel“ und „Mueller“-artige Umlautschreibweisen.
2. Auf Produktkarten tippen, um mehrere Produkte auszuwählen. Ein erneuter Tipp nimmt die Auswahl zurück. Der **Stern** merkt einen Favoriten, ohne einen Einkaufsartikel anzulegen.
3. Bei **Auswahl (…) · Mengen ändern** bei Bedarf Mengen und Einheiten anpassen. Unten das **Geschäft** wählen (oder **Kein Geschäft**). **… Produkte hinzufügen** übernimmt die Auswahl gesammelt. Sinnvolle Anfangsmengen stehen auf jeder Karte, etwa Milch 1 l, Butter 250 g, Eier 6 Stück.

- Sobald Favoriten vorhanden sind, öffnet die Auswahl beim nächsten Mal direkt dort. Beide Personen sehen dieselben Favoriten; Sterne funktionieren offline und sind nach dem Abgleich auf dem zweiten Gerät sowie im JSON-/ZIP-Backup enthalten. Jeder Favorit hat seine eigene Kennung und Änderungsuhren. Das Entfernen eines Sterns ändert die Einkaufsliste nicht. Ein leerer Favoritenbereich erklärt, wie man Sterne setzt.
- **Häufig gekauft** nutzt euren bisherigen Einkaufsverlauf, unabhängig von den manuell gesetzten Sternen. **Eigene** bietet eure selbst eingetragenen Artikel an. Ein gesuchter neuer Name lässt sich ausdrücklich auswählen und als Favorit merken. Eigene Namen erhalten ein neutrales Symbol, niemals das Foto eines nur ähnlich benannten Produkts (z. B. Apfeltasche/Äpfel).
- Bereits offene Artikel werden an der Produktkarte für das gewählte Geschäft vermerkt. Bewusst zusätzlich übernommene Mengen werden mit der bisherigen sicheren Mengen-/Einheitenlogik dazugezählt; andere Geschäfte und unklare Fälle bleiben getrennt. Die Übernahme legt keine geschätzten Preise an.
- Die Auswahl ist ein Entwurf: Schließen verwirft die Markierungen, während bewusst gesetzte Sterne gespeichert bleiben. Ein zwischenzeitlich gelöschtes Geschäft muss ausdrücklich ersetzt werden. Ein Wechsel des Daten-Repositorys schließt eine geöffnete Auswahl, damit keine Produkte in der falschen Liste landen.
- Datenmodell v1 ergänzt die optionale Sammlung `productFavorites`: `id`, `name`, `productId` (Katalogkennung oder `null` bei eigenen Artikeln), `quantity`, `unit`, `category`, `createdAt`, `updatedAt`, `deletedAt`, `_clock`. Alte Daten bleiben ohne Migration lesbar. Favoriten-Löschmarken bleiben erhalten, damit ein altes Offline-Gerät gelöschte Sterne nicht zurückbringt.
- `product-catalog.js` enthält Sortiment und reine Logik; `product-picker.js` enthält die Oberfläche. Vier lokale Bildtafeln in `assets/products` zeigen je 32 Motive und brauchen zusammen weniger als 1 MB. Keine Foto- oder Händlerabfragen, auch die Bilder funktionieren offline. Herkunft und Anordnung: [`assets/products/README.md`](assets/products/README.md).
- Neues Offline-Paket: `einkauf-shell-v74`. Nach dem Hochladen die App ganz schließen und neu öffnen (bei Bedarf zweimal).

Kurze Prüfung auf dem iPhone:

- [ ] Produktauswahl öffnen, „aepfel“ suchen, Milch und Butter auswählen, Zielgeschäft prüfen und gesammelt hinzufügen.
- [ ] Eine Menge unter **Auswahl → Mengen ändern** auf `0,5 kg` setzen; ungültige/fehlende Mengen und Einheiten werden mit verständlichem Hinweis abgelehnt, die Auswahl bleibt erhalten.
- [ ] Einen Stern setzen, Fenster schließen und neu öffnen: Favoritenansicht; Stern entfernen, ohne den Einkaufsartikel zu verändern.
- [ ] Eigenen Artikel suchen und merken. „Apfeltasche“ erhält kein Apfelfoto. Häufig eingetragene Artikel erscheinen unter **Häufig gekauft**.
- [ ] Offline neu öffnen: Fotos und Sterne sind da; Produkte hinzufügen. Später abgleichen und auf dem zweiten Gerät prüfen.

## Neu in Version 2.61: Geschäfte aus dem Händlerkatalog auswählen

Unter **Einkauf → Geschäfte-Symbol → Neues Geschäft → Supermarkt oder Drogerie auswählen** stehen **30 Händler in Deutschland** bereit: große Supermärkte und Discounter, regionale Ketten, Biomärkte sowie dm, ROSSMANN, Müller und BUDNI. Suche und Bereichsfilter helfen bei der Auswahl. Bereits vorhandene Händler sind gekennzeichnet. ALDI Nord/SÜD, Netto Marken-Discount/Netto mit dem Hund sowie famila Nordost/Nordwest sind getrennt.

1. Händler antippen: Name, lokales Logo und Händlerseite werden vorbereitet. Es wird noch kein Geschäft gespeichert.
2. Bei Bedarf einen Filialnamen oder einen eigenen Angebotslink eintragen.
3. **Geschäft hinzufügen** speichert die Auswahl für eure gemeinsame Liste, auch offline.

**Eigene Geschäfte bleiben möglich:** Statt der Auswahl einfach einen Namen wie „Baumarkt“, „Technik“ oder „Sonstiges“ eintragen; ein Link ist freiwillig. **Auswahl aufheben** verwirft die Vorlage. Im vorhandenen Geschäftsformular kann **Händler / Logo** auch nachträglich zugeordnet werden. Eine ausdrückliche Zuordnung bleibt beim Umbenennen erhalten; eigene Angebotslinks haben Vorrang. Unter **Einstellungen → Darstellung → Geschäfte anzeigen als → Händlerlogo** erscheinen die lokalen Logos auch an den Geschäftsreitern. Die Textansicht bleibt wählbar.

- Keine Händlerabfragen beim Anzeigen: Alle Logos liegen im Ordner `assets/stores`, funktionieren offline und sind im Service-Worker-Paket enthalten. Erst **Angebote** öffnet die Händlerseite. Dort kann eine Filial-/PLZ-Auswahl nötig sein. dm hat statt eines Wochenprospekts den Bereich Neuheiten & Aktionen; nah & gut nutzt die EDEKA-Angebotssuche.
- `store-catalog.js` ist der wiederverwendbare Katalog für die jetzige Auswahl und einen späteren Einrichtungsmodus. **Ein neuer Einrichtungsmodus wurde noch nicht eingebaut.**
- Optionale Daten-Erweiterung: `stores.chainKey` verweist auf den Katalog. Bestehende Geschäfte werden anhand ihrer Namen erkannt; Namen, eigene Links, Einstellungen und Artikel werden nicht umgeschrieben. Ein mehrdeutiges „ALDI“, „Netto“ oder „famila“ erhält keinen geratenen Link; die passende Kette im Formular zuordnen.
- Quellen und Hinweise zu den Markenabbildungen: [`assets/stores/README.md`](assets/stores/README.md). Vor einem kommerziellen App-Store-Angebot die Nutzungsrechte der Markenabbildungen klären.
- App aktualisieren: ganz schließen und neu öffnen (bei Bedarf zweimal). Das neue Offline-Paket heißt `einkauf-shell-v73`.

Kurze Prüfung:

- [ ] Händler suchen, nach Drogerien filtern, Auswahl abbrechen: kein neues Geschäft.
- [ ] dm auswählen, „dm Innenstadt“ nennen, hinzufügen: Logo und Händlerlink bleiben passend; Artikel ohne Geschäft werden dort wie bisher nicht angezeigt.
- [ ] ALDI Nord/SÜD und die beiden Netto-Ketten haben unterschiedliche Links. Bereits hinzugefügte Händler werden gekennzeichnet.
- [ ] „Mein Baumarkt“ mit eigenem Link anlegen und nachträglich bearbeiten; eine weitere Filiale lässt sich weiterhin per eigenem Namen anlegen.
- [ ] Offline neu öffnen: Auswahl und Logos sind da. Ein neues Geschäft wird später mit dem zweiten Gerät abgeglichen. JSON-/ZIP-Backup behält die Händlerzuordnung.

## Neu in Version 2.60: Keine Kategorie-Anzahl unter „Planen“, Menge immer unter dem Namen

- **Planen:** Auch in der Einkaufsliste unter „Planen“ (Gesamtliste „Alle“ und jedes einzelne Geschäft) steht die Zahl nur noch **beim Geschäft**, nicht mehr bei den Kategorien. **„Erledigt“** behält seine Zahl.
- **Menge unter dem Namen:** Bei jedem Artikel steht die Menge jetzt **immer in einer eigenen Zeile unter dem Namen**, bündig mit ihm, darunter die Person („Nico“). Vorher stand sie bei kurzen Namen **daneben** („Honig 1 Stück“) und bei langen **leicht eingerückt** darunter („Domol Feinwaschmittel“, „Blumenerde“). So sieht es auch unter „Im Laden“ aus.
- **Aktualisieren:** Die App ein Mal ganz schließen und neu öffnen (bei Bedarf zweimal), damit das neue Offline-Paket `einkauf-shell-v72` geladen wird.
- Test: In „Alle“ steht bei kurzen und sehr langen Namen auf 320, 390 und 430 px die Menge unter dem Namen und links bündig, die Person darunter, ohne seitlichen Überlauf; keine Kategorie hat eine Zahl, „Erledigt“ schon, das Geschäft behält seine.

## Neu in Version 2.59: Im Laden keine Anzahl bei den Kategorien

In der Ansicht **Im Laden** (**Alle** und ein einzelnes Geschäft) steht die Zahl der Artikel nur noch **beim Geschäft** („Lidl 1“), nicht mehr bei jeder **Kategorie** (z. B. „Sonstiges“, „Vorrat & Konserven“, „Haushalt & Drogerie“): Der Kategoriename steht allein in seiner Zeile. Die Zahl am Geschäft und „Noch … offen“ oben bleiben.
- Unter „Planen“ gilt seit Version 2.60 dasselbe (siehe oben).
- Test: In „Alle“ und in der Ansicht eines Geschäfts hat keine Kategorie eine Zahl, jedes Geschäft behält seine (sie stimmt mit den offenen Artikeln darunter überein), unter „Planen“ bleiben die Zähler.

## Neu in Version 2.58: Wünsche öffnen direkt „Produktlink & Notiz“

Bei **Wünschen** (Artikel in einer **eigenen Liste** wie „Wünsche“, **nur dort**) öffnet ein **Tipp** auf den Wunsch jetzt direkt das Wunsch-Fenster, nicht mehr das große Artikel-Fenster:
- Es zeigt nur **Name**, **Produktlink**, **Notiz** und **Liste** (zum Verschieben in eine andere Liste) sowie **Wunsch löschen**. **Menge, Einheit, Kategorie (Gang im Laden) und „Preis & Angebot“ fehlen** dort. Eine vorhandene Menge bleibt unverändert gespeichert; neue Wünsche legst du weiter mit Menge und Einheit an.
- **Langes Drücken** (und die Tastatur-Entsprechung) öffnet dasselbe Fenster. Der Knopf „Produktlink & Notiz“ im Artikel-Fenster entfällt, weil dort für Wünsche nichts mehr zu öffnen ist.
- Wird ein Wunsch in eine normale Liste verschoben (z. B. Edeka), ist er dort ein **normaler Artikel** mit dem vollen Fenster; Link und Notiz bleiben gespeichert und erscheinen wieder, wenn er zurück in eine eigene Liste kommt. **Normale Einkaufsartikel bleiben unverändert.**
- Test: Tipp öffnet nur das Wunsch-Fenster (die sichtbaren Felder werden einzeln geprüft), umbenennen, verschieben (mit Rückweg) und löschen, ein leerer Name wird abgelehnt, und ein normaler Artikel öffnet weiter sein volles Fenster.

## Neu in Version 2.57: Produktlink und Notiz bei Wünschen

In einer **eigenen Liste** wie „Wünsche“ den **Produktnamen eine halbe Sekunde gedrückt halten**: Ein kleines Fenster zeigt den optionalen **Produktlink** und die **Notiz** (z. B. Farbe, Größe, Modell). **Wunschdetails speichern** übernimmt die Angaben. Ein vorhandener Link öffnet sich mit **Produkt ansehen** erst nach einem bewussten Tipp; es gibt keine Shop-Abfrage und keine automatische Preisermittlung.

- Die Liste zeigt weiter nur den Namen, die Menge und die Person; ein kleines Link-/Notizsymbol weist auf hinterlegte Details hin. Normale Supermarktartikel erhalten keine zusätzlichen Felder.
- Ein **kurzer Tipp** öffnet bei Wünschen seit Version 2.58 ebenfalls dieses Fenster (siehe oben); dort lässt sich der Wunsch auch in eine andere Liste verschieben und löschen. Das lange Ziehen bleibt bei normalen Einkaufsartikeln unverändert.
- Scrollen, Wischen und ein zweiter Finger öffnen kein Detailfenster. Der Haken bleibt zum Abhaken. Unter „Im Laden“ funktioniert langes Drücken auf einen Wunsch ebenfalls, solange die Ansicht entsperrt ist.
- Beide Personen sehen die gespeicherten Angaben nach dem Abgleich. Änderungen funktionieren offline; Link und Notiz werden getrennt zusammengeführt. Beim Verschieben bleiben sie erhalten. Wünsche mit Angaben werden zum Schutz verschiedener Modelle nicht mit gleichnamigen Artikeln zusammengelegt.
- Datenmodell v1 ergänzt optional `items.wishUrl` (HTTPS-Link, höchstens 2000 Zeichen) und `items.wishNote` (höchstens 1000 Zeichen). Beim ersten Speichern solcher Angaben setzt die Datei `sync.minRev: 4`: **Beide Geräte aktualisieren**, bevor ihr Wunschdetails verwendet. Ältere Apps bitten dann um ein Update, damit sie Wünsche nicht versehentlich zusammenlegen. Bestehende Daten bleiben erhalten. JSON- und ZIP-Sicherungen enthalten die Angaben automatisch.
- Neues Modul `wishes.js`; Offline-Paket `einkauf-shell-v69`.

Kurze Prüfung auf dem iPhone:

- [ ] „Wünsche“ auswählen (als **Eigene Liste** eingestellt), „Springseil“ hinzufügen und auf den Namen tippen (oder lange drücken): Es öffnet sich nur Name, Produktlink, Notiz und Liste.
- [ ] Produktlink und Notiz eintragen, speichern, erneut öffnen und „Produkt ansehen“ prüfen.
- [ ] Auf dem zweiten Gerät aktualisieren: beide Angaben sind vorhanden.
- [ ] Ohne Empfang eine Notiz ändern, App erneut öffnen und später abgleichen: die Notiz bleibt erhalten.
- [ ] Bei Edeka einen normalen Artikel öffnen: das volle Artikel-Fenster mit Menge, Einheit, Kategorie und Preis, ohne Link und Notiz. Abhaken, Scrollen und die Mehrfachauswahl funktionieren weiter.

## Neu in Version 2.56: Lange Arbeitsschritte im PDF vollständig, Wochenübernahme genau einmal

**Rezeptblatt (PDF und Vorschau):** Kochanweisungen werden **nie mehr gekürzt** (kein „…“ am Ende).
- Passt ein Schritt auf die Seite, bleibt er ganz zusammen (wie bisher). Ist er länger als der Rest der Seite und passt auch auf die nächste nicht ganz, **läuft er auf den Folgeseiten weiter**: Die Seite bekommt seine **Nummer im Kreis** und darunter **„Fortsetzung“**; auf jeder Seite bleiben mindestens zwei Zeilen des Schritts.
- Der **Notizbereich** („Meine Notizen“, nur auf der letzten Seite) bleibt **frei**: Kein Schritttext läuft hinein, und nichts ragt unten oder über den rechten Rand hinaus. Wird es mehr Text, kommt eine weitere Seite dazu.
- Geprüft wird in den Tests: Jedes Wort jedes Schritts steht in der richtigen Reihenfolge in Vorschau **und** PDF-Datei, auch der letzte Satz; der Text liegt oberhalb der Notizen und innerhalb der Seite.

**Wochenübernahme („Einkauf“ im Plan) zählt genau einmal.** Bestätigen zwei Geräte **fast gleichzeitig** dieselbe Übernahme, bevor sie voneinander wissen, entstehen nicht mehr 800 g statt 400 g Nudeln.
- Beide Geräte geben jeder Zeile der Übernahme **dieselbe feste Kennung** (aus den übernommenen Gerichten mit ihren Portionen, ihrem bisherigen Übernahme-Stand und Name/Einheit der Zutat). Der Abgleich wendet jede Kennung nur **einmal** an; das gilt auch für den **erneuten Speicherversuch nach einer Schreibkollision** und gleich, ob ein Gerät die Zeile neu anlegt und das andere sie zu einem vorhandenen Artikel zählt. Das gilt auch für die Vorrats-Einträge der Übernahme.
- Bewusst **zusätzlich eingetragene Mengen addieren sich weiter**: von Hand eingetragene Artikel, der Knopf „Auf die Liste“ an einer Rezeptkarte und eine **zweite, ausdrücklich gewollte Übernahme** (Haken „Schon übernommene Gerichte auslassen“ abgewählt, anderer Übernahme-Stand) haben andere Kennungen.
- Test: zwei Geräte bestätigen gleichzeitig (der Abgleich von Gerät B wird absichtlich bis nach dem von Gerät A verzögert und endet mit „409“ und erneutem Speichern) – am Ende stehen die Nudeln genau einmal mehr da; danach zählen zweimal 100 g von Hand einzeln.

## Neu in Version 2.55: Vergangene Tage im Wochenplan sind nur noch zu sehen

Im **Wochenplan** lassen sich nur noch **heute und spätere Tage** bearbeiten.
- **Vergangene Tage** (vor heute) sind blasser dargestellt und **gesperrt**: kein **＋**, kein **Stift**, kein **Papierkorb**, der **Haken „gekocht“** ist nicht antippbar (der Stand bleibt sichtbar), und ein Gericht lässt sich **nicht ziehen**. Der Rezeptname öffnet weiter das Rezept.
- **Ziehen und Tauschen:** Ein vergangener Tag ist kein Ziel; aus einem vergangenen Tag lässt sich nichts verschieben.
- **Neue Gerichte** (auch über „Im Wochenplan einplanen“ an der Rezeptkarte mit der Tagesauswahl): Das Datumsfeld beginnt **heute**; ein vergangener Tag wird zusätzlich von der App abgelehnt („Vergangene Tage lassen sich nicht mehr planen.“).
- **Vergangene Wochen** sind komplett nur zu sehen. Mit dem Tageswechsel (nach Mitternacht) wird „heute“ von selbst neu bestimmt.
- Unverändert: Der **Einkauf für die Woche** berücksichtigt weiter alle Gerichte der Woche, auch vergangene, die nicht als „gekocht“ markiert sind (mit dem Haken „Schon gekochte Gerichte auslassen“ lässt sich das steuern).

**Tests:** Browser: vergangene Tage ohne ＋/Stift/Papierkorb mit gesperrtem Haken und ohne Ziehen, heute und spätere Tage bearbeitbar, vergangener Tag als Ziel, Datumsfeld und Prüfung beim Speichern.

Testpunkt (iPhone): Im Plan sind die Tage vor heute blass und ohne Knöpfe; heute und die nächsten Tage wie bisher.

## Neu in Version 2.54: Neues Rezeptblatt nach dem Entwurf („Rezeptblatt-Entwurf.pdf“)

Das Rezeptblatt (Vorschau, „PDF speichern“, „Teilen“) hat für **alle Rezepte** das Aussehen des angehängten Entwurfs: größere Schrift, weniger Linien, klar getrennte Arbeitsschritte.
- **Kopf:** klein „REZEPTSAMMLUNG“ (links, rostrot) und „EINKAUF & REZEPTE“ (rechts), der **Titel groß** in einer Schrift mit Serifen, darunter (bei importierten Rezepten) „Gesamtzeit: 25 Min.“. Ein **Foto** steht klein oben rechts (der Titel läuft nicht hinein).
- **Eckdaten** zwischen zwei Linien: **Portionen**, **Zutaten** (Zahl), **Gesamtzeit** (wenn bekannt), **Stichworte** („Schnell · vegetarisch“, ohne: „–“), **Quelle** (wenn bekannt).
- **Zutaten** links in einem hellen **Kasten** („Für 2 Portionen“): je Zutat ein **Kästchen zum Abhaken**, die **Menge hervorgehoben** (fett, rechtsbündig), der Name; „nach Bedarf“ steht klein und ohne Zahl.
- **Zubereitung** rechts in **nummerierten Schritten** (Zahl im Kreis). Der **erste Satz** jedes Schritts steht **fett** als Überschrift, der Rest darunter (`stepParts` in `recipe-sheet.js`; „5 Min. köcheln“, „ca. 1½ Std.“ und „z. B.“ beenden keinen Satz; ein langer Satz ohne kurzen Anfang ist nur Text).
- **Meine Notizen** unten mit drei Linien („Für Ideen, Änderungen und das nächste Mal.“), bei mehreren Seiten auf der **letzten**. Fußzeile: „Eigenes Rezept“ oder „Quelle: …“ und „Seite 1 / 1“.
- **Lange Rezepte** gehen auf weiteren Seiten weiter („REZEPTSAMMLUNG · FORTSETZUNG“, „Zutaten · Fortsetzung“, „Zubereitung · Fortsetzung“); ein Schritt und eine Zutat bleiben ganz auf einer Seite.
- **Schriften:** Der Entwurf nutzt eingebettete Schriften (DejaVu Sans, Noto Serif). Die App schreibt die PDF-Datei selbst, ohne Schriftdateien: Sie verwendet die Standardschriften jedes PDF-Programms (Helvetica, Times). Aufbau, Größen, Abstände und Farben folgen dem Entwurf; die Buchstabenformen weichen leicht ab.

**Tests:** `tests/recipe-sheet.test.mjs` (neues Layout, Schritte, Eckdaten, Titel und Foto, Kasten und Ränder, mehrere Seiten, Notizen nur auf der letzten, leere Rezepte, Fußzeile) und die Browser-Tests zum Rezeptblatt.

Testpunkt: Rezeptkarte → Dokument-Symbol: Vorschau wie im Entwurf; „PDF speichern“ öffnet dieselbe Seite im PDF-Programm.

## Neu in Version 2.53: Beim Ziehen eines Gerichts wird nichts mehr blau markiert

Beim langen Halten und Ziehen eines Gerichts im Wochenplan markierte iOS Text blau (Tagesnamen, Teile des Gerichts), auch nach dem Loslassen. Jetzt ist die Textauswahl im Plan aus (`user-select:none` und `-webkit-touch-callout:none` für `#plan-days` und das abgehobene Gericht, wie bei den Artikeln der Einkaufsliste), und beim Abheben wird eine eventuell vorhandene Markierung entfernt (`dragdelete.js`). Ein Tipp auf Gericht, Stift, Papierkorb und Haken geht wie bisher.

**Test:** Browser: Auswahl ist im Plan aus; eine vorhandene Markierung ist nach dem Abheben weg. Das blaue Markieren selbst tritt auf dem iPhone (Safari) auf und lässt sich in Chromium nicht erzeugen; bitte auf dem iPhone prüfen: Gericht lange drücken und ziehen, nichts wird blau.

## Neu in Version 2.52: Ausgaben gegen doppelte Erfassung geschützt

**Wann die App warnt.** Steht am **gleichen Tag** schon ein Einkauf mit **gleichem Betrag im gleichen Geschäft** (oder beide ohne Geschäft), warnt sie, bevor sie speichert. Das trifft den **erneut übernommenen Kassenbon** ebenso wie **beide Personen, die denselben Einkauf eintragen**. Ein Hinweis, kein Verbot: Zwei gleich teure Einkäufe am selben Tag sind möglich.
- **Einkauf eintragen** (von Hand oder aus dem Kassenbon): Beim ersten „Speichern“ erscheint im Fenster „Möglicherweise doppelt: Am Di. 27.10. steht schon ein Einkauf über 40,00 € bei Edeka. War es ein zweiter Einkauf, tippe auf „Speichern“ noch einmal.“ Nichts wird gespeichert. Tippt man noch einmal, wird gespeichert. Ändert man vorher Betrag, Tag oder Geschäft, gilt die Warnung nicht mehr.
- **„Einkauf beenden“ mit Betrag:** derselbe Schutz („…tippe auf „+“ noch einmal“); der Einkauf wird erst beim zweiten Tippen beendet.
- **Einen Eintrag ändern:** Er zählt nicht als sein eigenes Doppel. Gelöschte Einträge zählen nicht.
- **In der Liste:** Haben zwei Einträge denselben Tag, dasselbe Geschäft und denselben Betrag (z. B. weil beide Personen **ohne Netz** gleichzeitig dasselbe eingetragen haben), steht an beiden „Doppelt?“; ein Tipp öffnet den Eintrag, der sich dann löschen lässt.
- Logik: `duplicatePurchase`, `possibleDuplicates` in `spending.js`.

**Tests:** `tests/spending.test.mjs` und im Browser (Warnung, zweites Speichern, andere Angaben ohne Warnung, Ändern, „Einkauf beenden“, Hinweis in der Liste).

Testpunkt (iPhone): Denselben Betrag am selben Tag im selben Geschäft zweimal eintragen: der erste Versuch warnt, der zweite speichert; in der Liste steht „Doppelt?“.

## Neu in Version 2.51: Gerichte im Wochenplan auf einen anderen Tag ziehen

**So geht es.** Im **Plan** ein Gericht **lange gedrückt halten** (es „hebt ab“), auf einen anderen Tag **ziehen** (der Tag bekommt einen gestrichelten Rand) und **loslassen**.
- **Der Tag ist frei:** Das Gericht zieht um („„Tomaten-Pasta“ auf Freitag verschoben“).
- **Am Tag steht schon ein Gericht:** Ein Fenster fragt **„Tauschen?“** mit **Ja** und **Nein**. **Ja**: Beide Gerichte tauschen die Tage. **Nein**: Nichts ändert sich. Hat der Tag mehrere Gerichte, wird mit dem ersten getauscht (das Fenster sagt es).
- Es ändert sich nur der **Tag**. Portionen, „gekocht“ und die **Übernahme auf die Einkaufsliste** bleiben am Gericht: Ein verschobenes Gericht gilt nicht als „aus dem Plan entfernt“ und nimmt beim nächsten Einkauf nichts doppelt auf.
- Auf den eigenen Tag fallen lassen, loslassen vor Ablauf der Haltezeit (ein Tipp) oder Escape tun nichts. Ein roter Mülleimer zum Löschen erscheint hier **nicht** (löschen geht mit dem Papierkorb am Gericht). Gezogen wird innerhalb der sichtbaren Woche.
- Technik: `dragdelete.js` (wie das Ziehen von Artikeln zu Geschäften) mit neuer Option `noZone`; `dropMeal` in `app.js`.

**Tests:** Browser: Verschieben auf einen freien Tag (Übernahme bleibt, kein „entfernt“-Hinweis), belegter Tag mit „Nein“ (nichts ändert sich) und „Ja“ (getauscht). Mit der Maus geprüft; das Ziehen mit dem Finger nutzt dieselbe Technik wie das Ziehen von Artikeln, ist hier aber nicht eigens geprüft.

Testpunkt (iPhone): Im Plan ein Gericht lange drücken und auf einen anderen Tag ziehen; auf einen belegten Tag: „Tauschen?“ mit Ja/Nein.

## Neu in Version 2.50: Nach der Übernahme geändert – was auf der Einkaufsliste zu prüfen ist

Ist die Woche übernommen und ändert sich danach etwas, bleibt die Einkaufsliste, wie sie ist (die App ändert sie nie von selbst), aber sie **zeigt, was zu prüfen ist**:
- **Rezept geändert** (Zutat dazu, entfernt, andere Menge): Das Gericht merkt sich bei der Übernahme die Zutaten seines Rezepts (`meals.listedRows`, „Name|Menge|Einheit“). Im **Plan** steht am Gericht rot „Rezept seitdem geändert (neu: 50 g Parmesan, Nudeln: 200 g → 300 g): Liste prüfen“.
- **Rezept gelöscht** oder **Gericht aus dem Plan entfernt**, obwohl seine Zutaten schon übernommen waren: Die Zutaten stehen noch auf der Liste, auch das sagt der Hinweis.
- Alle Hinweise stehen gesammelt im **Einkauf für die Woche** („Seit der Übernahme geändert, bitte die Einkaufsliste prüfen: …“, rot); ändert sich der Stand bei offenem Fenster, aktualisiert er sich von selbst.
- **Verschieben:** Seit Version 2.51 lässt sich ein Gericht auf einen anderen Tag ziehen (lange halten, ziehen, loslassen); es bleibt dabei übernommen. Wer es stattdessen löscht und neu plant, sieht beim alten den Hinweis „aus dem Plan entfernt, die Zutaten stehen noch auf der Liste“ und beim Wiederaufnehmen die Warnung.
- Wird das Rezept an einem Gericht gewechselt, vergisst es die Übernahme samt Zutaten (es gilt als neu).

**Tests:** `tests/plan.test.mjs` (`recipeChanges`, `snapshotRows`) und im Browser (Rezept geändert, Rezept gelöscht, Gericht entfernt; die Liste bleibt unverändert).

Testpunkt: Woche übernehmen, danach eine Zutat im Rezept ändern: Im Plan steht der rote Hinweis am Gericht, im „Einkauf“-Fenster die Zusammenfassung.

## Neu in Version 2.49: Offenes Fenster „Einkauf für die Woche“ addiert nichts doppelt

**Der Fehler (mit zwei Geräten nachgestellt).** Beide Personen öffnen den „Einkauf für die Woche“ für dieselbe Woche. A übernimmt 400 g Nudeln. B gleicht erfolgreich ab und kennt die Übernahme, aber das noch offene Fenster arbeitete mit seinem alten Stand: Bestätigte B, standen 800 g statt 400 g auf der Liste, auch mit Internetverbindung.

**Die Korrektur.**
- Ändert sich der Stand, während das Fenster offen ist (Abgleich, Änderung der anderen Person), baut sich die **Vorschau von selbst neu auf** und eine Meldung sagt es („Der Wochenplan hat sich geändert: Die Vorschau ist aktualisiert.“). Abgewählte Zutaten bleiben abgewählt.
- **Unmittelbar vor dem Übernehmen** wird der aktuelle Wochenplan samt den schon übernommenen Portionen noch einmal berechnet. Weicht er von der Vorschau ab, wird **nichts addiert**: Die Vorschau wird aktualisiert, die Meldung bittet, sie zu prüfen und noch einmal zu bestätigen. Eine schon bestätigte Übernahme wird so nie ein zweites Mal addiert.

**Tests:** Browser: zwei Geräte mit offenen Fenstern (A übernimmt, B wird aktualisiert, B addiert nichts; eine absichtlich überholte Vorschau wird vor dem Übernehmen erkannt). Beide Schutzstufen wurden einzeln ausgeschaltet geprüft: Der Test schlägt dann fehl.

Testpunkt (zwei iPhones): Beide öffnen „Einkauf“ im Plan, eine Person übernimmt; beim anderen Gerät ändert sich das offene Fenster von selbst („schon übernommen“), Bestätigen fügt nichts hinzu.

## Neu in Version 2.48: „Zwiebel“ und „Zwiebeln“ sind dasselbe Produkt

Bisher waren „Zwiebel“ im einen Rezept und „Zwiebeln“ im anderen zwei Zeilen im Wochen-Einkauf und zwei Artikel auf der Liste. Jetzt führt die App Namen zusammen, die **dasselbe Produkt** meinen (`sameProduct` in `data.js`).

**Die Regel.** Verglichen wird die **Grundform** jedes Wortes: Groß-/Kleinschreibung, Umlaute und Mehrzahlendungen sind egal („Äpfel“ = „Apfel“, „Tomate“ = „Tomaten“, „Ei“ = „Eier“). Eine reine Buchstabenprozentzahl allein würde „Zwiebel“ und „Zwiebeln“ nicht erkennen (1 von 8 Buchstaben fehlt: 87,5 %); die Grundform ist dieselbe (100 %). Zusätzlich gilt die **95-%-Regel** für **lange Wörter** (ab 20 Buchstaben): Dort verzeiht sie einen Tippfehler. Bei kurzen Wörtern kann ein Buchstabe das Produkt ändern („Ei“ und „Eis“), deshalb gilt dort nur die gleiche Grundform.
- Zwei Namen müssen **gleich viele Wörter** haben, und jedes Wort muss passen. „Rote Zwiebel“, „Zwiebelmett“, „Hafermilch“ (zu „Milch“) bleiben getrennt.
- Steht **eine Zahl** im Namen („Cola 1 l“, „Cola 2 l“), werden nur genau gleiche Namen zusammengeführt.
- Ein Name ohne Buchstaben ist nur mit sich selbst gleich.
- Die **Einheiten** entscheiden weiter getrennt: „1 Stück Zwiebel“ und „200 g Zwiebeln“ bleiben zwei Zeilen; g und kg, ml und l, Stück und Stk. werden wie bisher addiert.

**Wo es wirkt.**
- **Einkauf für die Woche:** ein Eintrag je Produkt. Angezeigt wird die Schreibweise, die in den Rezepten am häufigsten vorkommt, bei Gleichstand die längere (meist die Mehrzahl): „Zwiebel“ (1) + „Zwiebeln“ (2) = „3 Stück Zwiebeln“.
- **Auf die Liste setzen** (Rezept, Woche, Vorlage, Link `?add=`, Eingabefeld, Verschieben): Steht „Zwiebeln“ schon auf der Liste, zählt „Zwiebel“ dort dazu. Der Artikel behält seinen Namen. Auch innerhalb einer Übernahme werden Schreibweisen zusammengezählt.
- **Vorrat:** „Zwiebeln“ im Vorrat deckt das Rezept „Zwiebel“ ab (vorab abgewählt, Hinweis „Vorrat“); beim Hinzufügen zum Vorrat wird eine vorhandene Schreibweise erkannt. Die Vorschläge für den Vorrat berücksichtigen das ebenso.
- **Nicht** verändert: Artikel, die schon getrennt auf der Liste stehen, werden nicht nachträglich zusammengelegt. Das Zusammenlegen gleichzeitig angelegter Doppelter bleibt bei genau gleichen Namen. Die Vorschläge „Meinst du dasselbe wie …?“ und „Gemerkte Namen“ bleiben, wie sie sind.

**Tests:** `tests/list.test.mjs` (Regel mit Beispielen dafür und dagegen, 87,5 % gegen Grundform, Zählen zu vorhandenen Artikeln, Vorrat), `tests/plan.test.mjs` (Wochen-Einkauf, angezeigte Schreibweise, getrennte Fälle) und im Browser: Zwiebel/Zwiebeln über Rezept, Woche, Eingabefeld und Vorrat.

Testpunkte für Version 2.48 (iPhone):

- [ ] Zwei Rezepte, eines mit „Zwiebel“, eines mit „Zwiebeln“, im Wochenplan: Der Einkauf zeigt **eine** Zeile mit der Summe.
- [ ] „Zwiebeln“ steht auf der Liste: Ein Rezept mit „Zwiebel“ übernehmen zählt zur vorhandenen Menge dazu.
- [ ] „Zwiebeln“ im Vorrat: Ein Rezept mit „Zwiebel“ steht beim Übernehmen vorab abgewählt mit „Vorrat“.

## Neu in Version 2.47: Drei nachgestellte Fehler behoben, Wochen-Einkauf ohne Verdoppeln

Drei Fälle wurden mit einer leeren Liste, zwei Geschäften und einem Altbestand nachgestellt, mit Tests abgesichert und behoben. Danach wurde die gesamte Übernahme von Rezepten und Wochenplan durchgeprüft.

**1. Rezeptübernahme: „Salz nach Bedarf“ fehlte.** Beim Übernehmen prüft die App, was „schon auf der Liste steht“. Dafür nahm sie auch das **Namensgedächtnis** (Namen aus früheren Einkäufen, die die App für Kategorie und Einheit merkt) wie Artikel auf der Liste. Stand „Salz“ nur dort, hieß es „Alles davon steht schon auf der Liste.“, und Salz wurde nicht hinzugefügt. Jetzt zählt **nur die tatsächliche Einkaufsliste** (`addToList` bekommt die Artikel der Liste und getrennt den Verlauf; `foldIntoList` ignoriert Einträge ohne Kennung). Gelernte Namen helfen weiter nur beim Raten der Kategorie. Das gilt für „Auf die Liste“ am Rezept, „Einkauf für die Woche“, Vorlagen und den Link `?add=`. Mit Menge war der Fehler gefährlicher: „200 ml Milch“ konnte als „Dazuzählen“ zu einem Namen ohne Artikel gebucht werden (eine Änderung ohne Ziel).

**2. „Einkauf beenden“ betraf auch andere Geschäfte.** Waren Tomaten bei Edeka und Milch bei Lidl abgehakt, entfernte das Beenden des Edeka-Einkaufs beide, und die gespeicherte Schätzung enthielt beide. Jetzt gilt bei einem **gewählten Geschäft** nur dessen Einkauf (`finishable` in `shop.js`):
- die **eigenen Artikel** des Geschäfts, die abgehakt sind,
- **Artikel ohne Geschäft**, die in diesem Geschäft abgehakt wurden (die Sitzung merkt sich das) oder deren Ort unbekannt ist (die Ansicht wurde zwischendurch neu geladen). Ein bei Lidl abgehakter Artikel ohne Geschäft bleibt beim Abschluss von Edeka stehen. Zeigt ein Geschäft keine Artikel ohne Geschäft (Drogerie, eigene Liste), betrifft der Abschluss nur seine eigenen.
- Unter **„Alle“** schließt der Abschluss wie bisher alles Abgehakte ein.
- Das Fenster nennt, was bleibt („Ein abgehakter Artikel eines anderen Geschäfts bleibt bis zum jeweiligen Abschluss stehen.“), und die gespeicherte **Schätzung** enthält nur den beendeten Einkauf. Der Ort eines Artikels wird nur für beendete Artikel vergessen, nicht für alle (vorher löschte `clear()` alles).

**3. Altlasten der Preisfunktion.**
- **Gemerkte Namen:** Eine alte Zuordnung „apfeltasche → Apfel“ (Text vom Kassenbon aus den Versionen 2.40 bis 2.43) benannte beim erneuten Hinzufügen die Apfeltasche in Apfel um. Jetzt werden **bestätigte Schreibweisen** („Zwiebel“ → „Zwiebeln“: beide Seiten lassen sich gleich schreiben, siehe `aliasKind` in `data.js`) von **fragwürdigen** Zuordnungen unterschieden. Fragwürdige (anderes Wort, oder mit „Sorte“, die nur vom Kassenbon kam) **wirken nicht mehr**: nicht beim Eintippen, nicht im Link, nicht in der Liste. Sie bleiben in der Datei, bis jemand sie prüft.
- **Einstellungen → Gemerkte Namen** zeigt oben die wirksamen, darunter „Alte Zuordnungen prüfen“ mit **Behalten** (die Zuordnung gilt ab dann; gespeichert als `confirmed: true` an der Zuordnung, ältere Apps ignorieren das Feld) und **Entfernen**. Die Überschrift nennt die Zahl („Gemerkte Namen (1) · 3 prüfen“).
- **Veraltete Hinweise** im Artikelfenster („Frühere Kaufpreise siehst du im Modus ‚Im Laden‘, wenn du den Artikelnamen antippst“, „Ein bereits gemerkter Preis dieses Geschäfts wird vorgeschlagen“) sind entfernt: Beide Funktionen gibt es seit 2.44 nicht mehr.

**Wochenplan → Einkauf: nichts mehr doppelt.** Vorher setzte ein zweiter „Einkauf für die Woche“ alles noch einmal auf die Liste: 400 g Nudeln wurden 800 g. Jetzt merkt sich **jedes Gericht** (`meals.listedServings` und `listedAt`), für wie viele Portionen seine Zutaten übernommen wurden (zusammen mit den Artikeln in einer Änderung):
- Im **Plan** steht am Gericht „Zutaten übernommen“ (bei geänderten Portionen: „Zutaten für 2 Portionen übernommen“).
- Der Wochen-Einkauf hat den Haken **„Schon übernommene Gerichte auslassen“** (gesetzt, bei jedem Öffnen). Der Hinweis nennt, was schon übernommen ist.
- **Portionen erhöht** (2 → 5): Es kommen nur die **zusätzlichen** 3 Portionen dazu (Rezept mit 150 g Reis für 2: 225 g). **Verringert**: nichts ändert sich.
- Wer ein anderes **Rezept** an das Gericht setzt, löscht den Merker: Es zählt wieder als neu.
- **Ausdrücklich noch einmal:** Haken heraus. Der Hinweis warnt rot, dass sich Mengen verdoppeln, wenn die Zutaten noch auf der Liste stehen.
- **Zwei Personen:** Der Merker ist ein normales Feld des Gerichts und wird wie alles abgeglichen: Hat Nico übernommen, steht es bei Anna als übernommen da. Eine Übernahme ohne Netz kommt beim nächsten Abgleich an; ändert die andere Person zwischendurch die Portionen, kommt nur das Zusätzliche.
- **Bekannte Grenze:** Übernehmen beide Personen **gleichzeitig ohne Netz** dieselbe Woche, kann niemand das vorher wissen: Beide Zuwächse zählen (100 + 400 + 400 g), die Mengen sind dann doppelt. Danach stehen die Gerichte bei beiden als übernommen da; falsche Mengen lassen sich am Artikel ändern.
- Der einzelne **Rezept-Weg** („Auf die Liste“ an der Karte) bleibt eine ausdrückliche Einzelaktion ohne Merker.

**Durchgeprüft (ohne Befund):** Umrechnung auf Portionen (Bruchteile wie 66,667 g statt 66,66666666666667; sehr kleine Mengen werden nie 0), Zusammenzählen mehrerer Gerichte (g + kg, ml + l, Stück/Stk.; verschiedene Einheiten wie EL und TL bleiben getrennt), „nach Bedarf“ bleibt 1 Stück und wird nicht doppelt aufgeschrieben. Eine Zufallsprüfung mit 3000 Wochenplänen verglich die Summen mit einer unabhängigen Rechnung: keine Abweichung.

**Tests:** `tests/list.test.mjs` (Salz auf leerer Liste, Eintrag ohne Kennung, Rundung, zwei Geräte, Merker am Gericht), `tests/shop.test.mjs` (`finishable`), `tests/aliases.test.mjs` (`aliasKind`, `confirmed`), `tests/plan.test.mjs` (`weekBasket`) und im Browser: Salz auf leerer Liste mit Namensgedächtnis, Einkauf beenden mit Edeka/Lidl und Artikel ohne Geschäft (mit Schätzung), alte Zuordnungen (Eintippen, Link, Prüfen, Behalten, Entfernen), Hinweise im Artikelfenster, Wochen-Einkauf zweimal, nach Portionsänderung, mit zwei Personen und ohne Netz.

Testpunkte für Version 2.47 (iPhone):

- [ ] Leere Liste, Rezept mit „Salz nach Bedarf“ → „Auf die Liste“ → nur Salz anhaken → Salz steht auf der Liste.
- [ ] Im Laden Tomaten bei Edeka und Milch bei Lidl abhaken, bei Edeka „Einkauf beenden“: nur die Tomaten verschwinden; das Fenster nennt die Milch. Danach bei Lidl beenden.
- [ ] Einstellungen → Gemerkte Namen: alte Zuordnungen stehen unter „Alte Zuordnungen prüfen“; „Apfeltasche“ hinzufügen bleibt Apfeltasche.
- [ ] Plan: Gerichte planen, „Einkauf“ → übernehmen. Im Plan steht „Zutaten übernommen“. Noch einmal „Einkauf“: nichts mehr zu tun. Portionen eines Gerichts erhöhen: nur das Zusätzliche kommt.

## Neu in Version 2.46: Rezepte im Plan filtern, Zähler in der Einkaufsliste entfernt

**Rezepte filtern im Fenster „Gericht planen“.** Rechts neben „Rezept“ steht ein **Auswahlfeld** („Rezepte filtern“). Es bietet
- **Alle Rezepte** (so steht es beim Öffnen immer da),
- **★ Favoriten** (nur wenn es welche gibt),
- **Lange nicht gekocht** (nur wenn es welche gibt): Rezepte, die **seit mindestens 28 Tagen nicht** gekocht wurden oder **noch nie**. Das am längsten her ist, steht zuerst, noch nie Gekochtes ganz oben; unter dem Namen steht „noch nie gekocht“ oder „zuletzt vor 3 Monaten“. „Gekocht“ heißt: mit „Heute gekocht“, im Kochmodus oder über das Abhaken im Plan festgehalten.
- **jedes Stichwort** (Schnell, Einfach, Suppe, Süß, Vegan, Vegetarisch …), das mindestens ein Rezept trägt, **mit Zahl** („Suppe (8)“). Groß- und Kleinschreibung ist egal: „vegan“ und „Vegan“ sind ein Eintrag.

Die Stichworte sind die der Rezepte (Feld „Stichworte“ am Rezept; die eingebauten Rezepte des Tages bringen Schnell, Suppe, Süß, Vegan, Vegetarisch, Pasta, Fleisch … mit). Ein Stichwort, das kein Rezept trägt, erscheint nicht. Wer ein Rezept „einfach“ oder „schnell“ nennen will, trägt das Stichwort am Rezept ein.

**So verhält sich die Liste**
- Ein **Tipp** wählt wie bisher, **langes Drücken** zeigt das Rezeptblatt (auch in der gefilterten Liste). „Eigenes Gericht“ steht bei jedem Filter am Ende.
- Das **gewählte Rezept bleibt in der Liste**, auch wenn der Filter es ausschließt: So sieht man im Fenster immer, was gespeichert würde. Ein Filterwechsel ändert die Wahl nie. Ein Tipp baut die Liste nicht um (nichts springt unter dem Finger); erst ein neuer Filter tut das.
- Die Reihenfolge: Favoriten zuerst, dann nach Namen; bei „Lange nicht gekocht“ das am längsten her zuerst.
- Beim nächsten Öffnen steht wieder „Alle Rezepte“. Gibt es nichts zu filtern (keine Favoriten, keine Stichworte, nichts lange nicht gekocht), ist das Feld **nicht da**.
- Nichts davon verändert Daten; es ist nur eine Ansicht.

**Einkaufsliste: „n offen · n erledigt“ ist weg.** Die Zeile über der Liste entfällt. „Auswählen“ steht links, „Erledigte entfernen“ rechts auf einer Zeile. Die Zahlen an den Geschäfts-Reitern und im Laden („Noch 7 offen“) bleiben.

**Technik.** Die Logik steht in `recipe-filter.js` (ohne Oberfläche, mit Tests): `filterOptions`, `pickRecipes`, `cookedLongAgo`. Dienstdatei im Offline-Paket, Cache `einkauf-shell-v58`.

**Tests:** `tests/recipe-filter.test.mjs` (Einträge und Zahlen, Schreibweisen, 28-Tage-Grenze, Reihenfolge, gewähltes Rezept bleibt, Eingabe unverändert) und im Browser: Auswahlfeld neben „Rezept“ auf einer Zeile (280/320/390 px), alle Filter, Wahl bleibt, Wiederöffnen, Ändern eines Gerichts, langes Drücken in der gefilterten Liste, kein Feld ohne Auswahl, Zeile „offen · erledigt“ weg.

Testpunkte für Version 2.46 (iPhone):

- [ ] Einkauf: über der Liste steht nur „Auswählen“ (links) und „Erledigte entfernen“ (rechts), keine Zeile „n offen · n erledigt“.
- [ ] Plan → ein Tag → ＋: rechts neben „Rezept“ das Auswahlfeld. „Suppe“ zeigt nur Suppen, „Lange nicht gekocht“ die am längsten nicht gekochten (mit „zuletzt vor …“), „Favoriten“ nur die Sterne.
- [ ] Rezept wählen, dann einen anderen Filter einstellen: das gewählte bleibt in der Liste und markiert. Speichern übernimmt das gewählte.
- [ ] In der gefilterten Liste ein Rezept lange drücken: das Rezeptblatt erscheint.

## Neu in Version 2.45: Rezeptblatt als PDF (Vorschau, Speichern, Teilen) und Rezeptauswahl mit langem Drücken

**Das Rezeptblatt.** Jedes Rezept lässt sich als schön gestaltete **DIN-A4-Seite** zeigen, speichern und teilen, nach dem Vorbild einer Rezeptkarte: oben „REZEPT“, der **Titel** in einer Serifenschrift mit orangem Strich darunter, **vier Kästchen** mit den Eckdaten (Portionen, Zahl der Zutaten – oder die **Gesamtzeit**, wenn der Import eine liefert –, Stichworte, Quelle), das **Foto als aufgeklebtes Sofortbild** (leicht schief, mit Klebestreifen und Schatten), darunter links die **Zutaten** (Menge | Zutat) und rechts die **Zubereitung** (nummerierte Schritte), beides auf **Linien wie auf liniertem Papier**. Die Linien laufen bis zum Seitenende: Unten bleibt Platz für eigene Notizen. Ist das Rezept lang, geht es auf einer **zweiten (dritten …) Seite** weiter („Rezept · Fortsetzung“, „Seite 2 von 3“); eine Spalte, die früher fertig ist, heißt dort „Notizen“. Ein Schritt bleibt zusammen, nur sehr lange werden getrennt, nie mit einer einzelnen Zeile allein.

**Wo man es findet**
- **Rezepte:** Das **Dokument-Symbol** in der Reihe unter jeder Rezeptkarte (neben dem Kalender). Das Blatt zeigt die **Portionen**, die an der Karte eingestellt sind: Bei vier statt zwei Portionen stehen die doppelten Mengen darauf.
- **Plan → Gericht planen:** Die Rezeptauswahl ist jetzt eine **Liste** (Favoriten zuerst) statt einer Auswahlbox. Ein **Tipp wählt** das Rezept (die Portionen des Rezepts werden übernommen), ein Rezept **lange drücken** (0,5 Sekunden) **zeigt das Blatt**, ohne es auszuwählen. Gilt das Rezept schon als gewählt, zeigt das Blatt die eingestellten Portionen, sonst die des Rezepts. Auch das **Kontextmenü** (rechte Maustaste, Menü-Taste, langes Drücken unter Android) öffnet es.

**Die Vorschau.** Ein Vollbild-Fenster mit der Seite auf neutralem Grund, gezeichnet aus denselben Befehlen wie die Datei, also **genau das, was im PDF steht**, scharf in jeder Größe. Oben rechts das **×** (bleibt beim Scrollen stehen), daneben die **Lupe** (Seite größer zum Lesen, dreimal tippen wechselt 1 → 2 → 3 → 1; **Doppeltippen** wechselt 1 ↔ 2; das Blatt lässt sich dann seitlich und nach unten verschieben, mit zwei Fingern lässt sich auch frei zoomen). **Zum Schließen: ×, Escape oder irgendwo auf dem Blatt lange drücken** (0,6 Sekunden; Bewegen, Scrollen oder ein zweiter Finger brechen ab). Das Fenster „Gericht planen“ dahinter bleibt unverändert.

**Speichern und Teilen** (Knöpfe unten in der Vorschau)
- **PDF speichern** lädt die Datei herunter (`<Rezeptname>.pdf`). In einer **Homescreen-App auf dem iPhone** führt ein Download oft in eine Seite ohne Rückweg; dort öffnet der Knopf stattdessen den **Teilen-Dialog** („In Dateien sichern“).
- **Teilen** öffnet den Teilen-Dialog des Geräts mit der PDF-Datei (Nachrichten, Mail, AirDrop, WhatsApp …). Wo der Browser keine Dateien teilen kann (z. B. Firefox am Computer), gibt es den Knopf nicht. „Abbrechen“ im Teilen-Dialog ist kein Fehler; echte Fehler stehen im Fenster.

**Wie die Datei entsteht.** Alles geschieht **auf dem Gerät**, nichts wird hochgeladen oder gespeichert; in den Daten ändert sich nichts. `pdf.js` ist ein kleiner **PDF-Schreiber ohne Fremdbibliothek** (wie `zip.js`): Text bleibt echter Text (kopierbar, durchsuchbar), Formen sind Vektoren (scharf beim Drucken), das **Foto kommt unverändert als JPEG** hinein (zugeschnitten auf sein Feld), die Datei ist meist **20 bis 60 KB** klein. Verwendet werden die vier **Standardschriften eines PDFs** (Helvetica, Helvetica-Bold, Times-Roman, Times-Bold): Sie müssen nicht in die Datei, jeder Betrachter hat sie. Umlaute, ß, €, „Anführungszeichen“, Gedankenstriche, ½ ¼ ¾ und Gradzeichen stehen korrekt; **Emoji fallen weg**, seltene Zeichen werden ersetzt („ł“ → „?“), ⅓ wird „1/3“. `recipe-sheet.js` legt die Seite aus (Textumbruch mit den echten Schriftbreiten aus `pdf-fonts.js`), `sheet-view.js` zeichnet die Vorschau als SVG. Das Foto wird vom Gerät gelesen; liegt es nur im Daten-Repository, holt die App es bei bestehender Verbindung, sonst steht das Blatt ohne Foto da.

**Tests:** `tests/pdf.test.mjs` (Zeichensatz, Textbreiten, JPEG-Kopf, gültiger Dateiaufbau mit Kreuzverzeichnis, Foto, Drehung, Transparenz) und `tests/recipe-sheet.test.mjs` (Umbruch, Titelgröße, Eckdaten, Spalten und Linien, mehrere Seiten ohne Verlust, leere Rezepte, Quelle); `tests/browser.test.mjs`: Vorschau, „×“ oben rechts, Portionen, Foto, Download einer gültigen Datei, Teilen (nur wo möglich, Abbrechen, Fehler, iPhone-Homescreen), Auswahlliste, langes Drücken mit Maus und Finger (Öffnen ohne Auswahl, Schließen durch langes Drücken, kurzer Tipp/Wischen/zwei Finger schließen nicht), Kontextmenü, 280/320/390 px, Zoom, mehrseitige Rezepte. Beispielblätter (mit und ohne Foto, langer Titel, drei Seiten) wurden außerdem mit `pdfinfo`, `pdftotext` und `pdftoppm` geprüft und als Bilder angesehen.

Testpunkte für Version 2.45 (iPhone):

- [ ] Rezepte: Dokument-Symbol unter einem Rezept antippen: die Seite erscheint (mit Foto, falls vorhanden), „×“ oben rechts schließt. Lupe antippen: größer lesbar; Doppeltippen ebenso.
- [ ] Plan → ein Tag → ＋: Liste der Rezepte. Antippen wählt aus; ein Rezept **lange drücken**: Rezeptblatt erscheint, das Rezept ist danach **nicht** gewählt. Auf dem Blatt **lange drücken**: es schließt sich; das Fenster „Gericht planen“ steht noch da.
- [ ] Im Rezeptblatt **Teilen**: der Teilen-Dialog zeigt eine PDF-Datei (z. B. an „Nachrichten“ oder „In Dateien sichern“). **PDF speichern** in der Homescreen-App ebenso. Die Datei in „Dateien“ öffnen: Titel, Zutaten, Schritte, Foto stimmen, Linien bis unten.
- [ ] Ein langes Rezept (viele Zutaten oder Schritte): zweite Seite mit „Fortsetzung“ und „Seite 2 von 2“.

## Neu in Version 2.44: Preiserkennung entfernt, Schrift im Laden wie in der Einkaufsliste

**Warum die Preiserkennung wieder entfernt wurde.** Die Funktion aus den Versionen 2.41 bis 2.43 („Zuletzt bezahlt“ im Laden, Bonzeilen den Artikeln der Liste zuordnen) hat sich im Alltag nicht bewährt: Auf dem Bon steht „G&G Champignons“, „Naturjoghurt“ oder „Herz.Naturjoghurt“, auf der Liste „Champignons“ oder „Joghurt“. Ob zwei Namen dasselbe Produkt meinen, ist **Bedeutungswissen**: „Naturjoghurt“ ist ein Joghurt, „Hafermilch“ ist keine Milch, „Apfeltasche“ ist kein Apfel. Mit festen Regeln lässt sich das nicht für Tausende Produkte zuverlässig entscheiden; dafür bräuchte man eine Produktdatenbank oder eine laufende Rückfrage bei jedem Einkauf, und beides ist nicht gewollt. Ein **falscher Preis ist schlimmer als gar keiner**. Deshalb gibt es die Funktion nicht mehr, statt sie halb zuverlässig anzubieten.

**Was entfernt ist**
- Im Laden: die Preisinfo „Zuletzt bezahlt“ (Pfeil am Namen, Gedrückthalten des Namens gesperrt). Name und Menge sind nur noch Anzeige; abgehakt wird wie immer über den Kreis links.
- Der Kassenbon-Dialog für Artikelpreise („Kassenbon einfügen“, „Beenden und Kassenbon einfügen“, „Danach die Artikelpreise prüfen und übernehmen“), die automatische und die vorgeschlagene Namenszuordnung, „Bon-Namen den Artikeln zuordnen“ und „Alle zu prüfenden als bezahlt bestätigen“.
- Unter Einstellungen: der Bereich „Bezahlte Preise“.
- Im Code: `history.js` und die Namenslogik in `receipt.js` (`suggestName`, Sorten, Marken).

**Was bleibt**
- Eigene Preise am Artikel (Schätzung), die **geschätzte Summe**, Angebotsmarkierungen und die Angebotsseite je Geschäft.
- **Ausgaben:** Betrag von Hand oder aus einem Kassenbon-Foto/Screenshot (Summe, Datum und Geschäft als Vorschlag), Monatsübersicht und Budget. `receipt.js` liest dafür weiter Summe, Datum und Kette aus dem Bontext.
- **Gemerkte Namen** (Einstellungen): bestätigte Schreibweisen („Zwiebel“ → „Zwiebeln“) für Vorschläge und Zusammenzählen.

**Daten:** Nichts wird gelöscht oder verändert. Die Sammlungen `prices` und `aliases` in der Datei bleiben, wie sie sind (auch die Felder `src`, `variant`, `receipt`, `receiptKey`); die App liest und prüft sie weiter, zeigt sie aber nicht mehr an und schreibt keine neuen Preisnotizen. Das **Aufräumen** (Datenumfang) behandelt sie wie bisher. Wer die Funktion zurückhaben will: Version 2.43 steht im Verlauf des Repositorys (Commit `f10a576`).

**Schrift im Laden.** Name und Menge sind jetzt so groß wie in der Einkaufsliste unter „Planen“ (vorher 1,3-fach und 1,05-fach). Lange Namen brechen dadurch seltener um.

**Produktsymbol im Laden.** Das farbige Symbol rechts in der Zeile ist dieselbe Kachel wie in der Einkaufsliste (gleiche Größe, gleiches Symbol) und gilt auch auf **schmalen Bildschirmen**. Vorher war es bei 340 px Breite und weniger ausgeblendet; das trifft z. B. ein iPhone mit „Vergrößerter Darstellung“. Dort steht die Menge unter dem Namen (wie in der Einkaufsliste) und das Symbol rechts über beide Zeilen. Der Schalter „Produktbilder anzeigen“ in den Einstellungen gilt für beide Ansichten.

**Tests:** `tests/browser.test.mjs`: Schriftgröße im Laden gleich der unter „Planen“, Produktsymbol im Laden gleich groß wie in der Einkaufsliste (390, 320 und 280 px, innerhalb der Zeile), kein Pfeil und keine Preisinfo, ein Tipp auf den Namen tut nichts; kein Kassenbon-Weg und kein Bereich „Bezahlte Preise“; vorhandene Preisnotizen und Zuordnungen bleiben nach neuen Änderungen unverändert in der Datei; Gemerkte Namen. `tests/receipt.test.mjs` prüft nur noch das Lesen von Summe, Datum, Kette und Zeilen. Die Tests für die Preisinfo, die Bon-Zuordnung und `history.js` entfallen.

Testpunkte für Version 2.44 (iPhone):

- [ ] Im Laden: Name und Menge der Artikel sind so groß wie in der Einkaufsliste; lange Namen („Blumenerde“, „Domol Feinwaschmittel“) brechen seltener um. Ein Tipp auf den Namen bewirkt nichts, der Kreis hakt ab.
- [ ] Im Laden: Jeder Artikel hat sein Produktsymbol rechts wie in der Einkaufsliste, auch mit „Vergrößerter Darstellung“ (iPhone-Einstellungen → Anzeige & Helligkeit → Anzeige). Dort steht die Menge unter dem Namen. „Produktbilder anzeigen“ aus: keine Symbole, in keiner Ansicht.
- [ ] Einkauf beenden: nur „Was hast du bezahlt?“ mit „+“ und „Nur beenden“, kein Kassenbon-Knopf. Einkauf/„Preisschild“: Angebote wie bisher, kein „Kassenbon“-Knopf mehr.
- [ ] Einstellungen: kein Bereich „Bezahlte Preise“; „Gemerkte Namen“ zeigt „Text → Name“.
- [ ] Ausgaben → Einkauf eintragen: Kassenbon-Foto/Screenshot liest Summe, Datum und Geschäft; es gibt keinen Haken für Artikelpreise.

## Neu in Version 2.43: Bon-Zeilen ordnen sich selbst den Artikeln zu

> **In Version 2.44 wieder entfernt** (siehe oben). Der Abschnitt bleibt als Geschichte stehen.

Auf dem Bon steht „G&G Champignons“, „Farm.Sn.Aprikosen“ oder „G&G Senf mittels.“, auf deiner Liste „Champignons“, „Aprikosen“, „Senf“. Niemand tippt den Bon-Text ab, und jede Zeile einzeln zu bestätigen ist zu aufwendig. Deshalb gilt jetzt:

- **Dein Listenname ist der Anker.** Kommt der Name eines Artikels als ganzes Wort in der Bonzeile vor (Einzahl und Mehrzahl sind egal: Apfel/Äpfel, Aprikose/Aprikosen), ordnet die App die Zeile **selbst** diesem Artikel zu. Der Name ist dann „Champignons“, die **Sorte oder genaue Bezeichnung** ist die Bonzeile („G&G Champignons“). Im Laden steht der Preis deshalb beim Artikel „Champignons“.
- **Nur, wenn alles Übrige ungefährlich ist:** Beigaben („Bio“, „frisch“), bekannte Handelsmarken („G&G“, „Gut & Günstig“, „Ja!“, Eigenmarken der Ketten), Marken aus früheren Zuordnungen und Abkürzungen (ein Wort mit Punkt dahinter wie „Farm.Sn.“ oder ein einzelner Buchstabe). Steht ein weiteres Produktwort dabei („Saft“, „Mus“, „Tasche“, „Joghurt“, „Milch“ …), ist es ein **anderes Produkt** und bekommt nie den Preis des Artikels: „Apfeltasche“, „Apfel Saft“, „Hafermilch“ und „Tomaten Mark“ bleiben eigene Produkte.
- **Rest ohne Tippen:** In jeder Zeile des Kassenbon-Dialogs gibt es das Auswahlfeld **„Gehört zu (von deiner Liste wählen)“**. Ein Tipp auf den Artikel genügt; die Bonzeile bleibt als Bezeichnung erhalten. Ein unsicherer Vorschlag („Als „Tomaten“ eintragen“) wird weiterhin nur angeboten, nie von selbst eingesetzt.
- **Einmal zuordnen reicht:** Was du zugeordnet hast, merkt sich die App (mit der Bezeichnung) und erkennt es beim nächsten Bon wieder („Zuordnung gemerkt“). Eine so gelernte Marke gilt auch für andere Artikel derselben Marke.
- **Schon vorhandene Preise (Einstellungen → Bezahlte Preise):** **„Bon-Namen den Artikeln zuordnen (n)“** macht aus bisherigen Einträgen wie „G&G Champignons“ den Artikel „Champignons“ (mit Rückfrage und Liste der Änderungen, die Bonzeile bleibt als Bezeichnung). **„Alle zu prüfenden als bezahlt bestätigen“** bestätigt alle Notizen aus früheren Versionen auf einmal (mit Rückfrage); einzeln geht weiterhin „Stimmt“, „Ändern“, „Vergessen“.
- **Hinweis im Laden:** Gibt es zu einem Artikel noch unbestätigte ältere Notizen, steht im Preisfeld ein kurzer Satz dazu (statt nur „Noch keine bestätigten Kaufpreise vorhanden“).

Daten: keine neuen Felder, keine Migration. Zuordnungen schreiben dieselben Felder wie bisher (`prices.name`, `prices.variant`, `aliases.variant`), Apps ab 2.41 lesen sie weiter.

Testpunkte für Version 2.43 (iPhone):

- [ ] Kassenbon einfügen mit „G&G Champignons“, „Farm.Sn.Aprikosen“ (Artikel „Champignons“, „Aprikosen“ stehen auf der Liste): Die Zeilen heißen schon „Champignons“ bzw. „Aprikosen“, darunter „Automatisch … zugeordnet“. Speichern, im Laden bei „Champignons“ auf den Namen tippen: „G&G Champignons … laut Bon“.
- [ ] Eine Zeile wie „Apfeltasche“ bleibt eigener Name und bekommt keinen Preis von „Äpfel“. Im Feld „Gehört zu“ lässt sich ein Artikel ohne Tippen wählen.
- [ ] Einstellungen → Bezahlte Preise: „Bon-Namen den Artikeln zuordnen“ zeigt die Änderungen und fragt nach; „Alle zu prüfenden als bezahlt bestätigen“ fragt nach, danach ist „Zu prüfen“ leer.

## Neu in Version 2.42: Preisinfo auch gesperrt, per Gedrückthalten

> **In Version 2.44 wieder entfernt** (siehe oben). Der Abschnitt bleibt als Geschichte stehen.

Im Modus „Im Laden“ lässt sich die Preisinfo „Zuletzt bezahlt“ jetzt auch **bei gesperrter Ansicht** öffnen: den **Namen** (mit Menge, Symbol und Pfeil) eines Artikels **gedrückt halten**. Noch einmal gedrückt halten schließt sie wieder. Ein einfacher Tipp bewirkt gesperrt weiter nichts (der Knopf zum Entsperren leuchtet auf). Der Name ist damit die vierte Fläche, die gesperrt per Gedrückthalten reagiert (neben Kreis, Geschäft und „Erledigt“); während des Haltens färbt sich die Zeile und der Pfeil wächst. Zu früh loslassen oder Wegziehen (Scrollen) öffnet nichts; die Sperre bleibt bestehen. Ungesperrt öffnet wie bisher ein Tipp.

Testpunkt für Version 2.42:

- [ ] Gesperrt (Schloss): Namen eines Artikels kurz antippen: nichts, Entsperren-Knopf leuchtet. Namen halten: Preisinfo klappt auf; noch einmal halten: sie schließt. Der Artikel wird dabei nicht abgehakt, die Ansicht bleibt gesperrt.

## Neu in Version 2.41: Verlauf bezahlter Preise („Zuletzt bezahlt“) nur im Modus „Im Laden“

> **In Version 2.44 wieder entfernt** (siehe oben). Der Abschnitt bleibt als Geschichte stehen.

Die Preisfunktion wurde umgebaut. Ziel ist ein zuverlässiger Verlauf **tatsächlich bezahlter** Preise, der nur im Laden und nur auf Wunsch sichtbar wird. Er **ersetzt** Preisvergleich, Preisentwicklung („▲ Teurer / ▼ Günstiger“) und die selbst eingetragenen gemerkten Preise aus den Versionen 1.5 bis 1.9. Architektur, Offline-Nutzung und gemeinsame Synchronisierung sind unverändert (Sammlung `prices`, neues Modul `history.js`).

**Darstellung**
- **Planen:** In der Artikelzeile stehen nur Name, Menge, Person (und Symbol). Keine Preisangabe, kein Preisvergleich, keine Preisentwicklung, kein Angebotshinweis. Die geschätzte Summe oben bleibt (sie rechnet nur mit Preisen, die du selbst am Artikel eingetragen hast).
- **Im Laden:** Haken, Name, Menge, vorhandenes Produktsymbol und ein kleiner Pfeil. Ein Tipp auf **Namen oder Pfeil** (eine große Tippfläche, `aria-expanded`/`aria-controls`) öffnet direkt unter dem Artikel das Feld **„Zuletzt bezahlt“**, ein zweiter Tipp schließt es. Es ist **höchstens eins** offen. Der **Haken links** hakt nur ab und öffnet nichts; beim Abhaken schließt sich das Feld. **Gesperrt** öffnet ein Tipp nichts (die Sperre fängt ihn ab, der Knopf zum Entsperren leuchtet auf), das Halten am Kreis, am Geschäft und an „Erledigt“ geht weiter. Beim automatischen Abgleich bleibt das Feld offen (gemerkt wird der Artikel, nicht das Element), Scrollposition und Fokus springen nicht; verschwindet der Artikel, schließt es. Beim Wechsel des Geschäfts und beim Verlassen von „Im Laden“ ist es zu.
- **Inhalt:** je **Sorte, Geschäft und Packung** der neueste bestätigte Kauf mit Bezeichnung, Preis („0,59 € pro Stück“, „3,98 € pro kg“, „1,29 € für 500 g“), Geschäft, Datum und „Damals im Angebot“; **Frühere Käufe** klappst du bei Bedarf auf. Das gewählte Geschäft steht zuerst („Bei Rewe“), andere Geschäfte darunter („In anderen Geschäften“). Ohne Einträge: „Noch keine bestätigten Kaufpreise vorhanden.“ Abschluss: „Vergangene Kaufpreise. Der heutige Preis kann abweichen.“ Aus alten Preisen wird nie „hier am günstigsten“ abgeleitet. Alles kommt aus den gespeicherten Daten, es ist kein Netz nötig.

**Zuordnung (Produktgruppe, Sorte, Produkt)**
- „Äpfel“ ist eine Produktgruppe, „Gala“ und „Pink Lady“ sind **Sorten** davon (`prices.variant`). „Apfeltasche“, „Apfelsaft“, „Hafermilch“ sind eigene Produkte; zugeordnet wird nur über den **gleichen Namen**, nie über ein Wortstück.
- Eine **Sorte wird nur erkannt**, wenn der Bon auch das Wort der Gruppe nennt („Gala Äpfel“, „Äpfel Pink Lady Bio“, Äpfel und Birnen, `receipt.js`); „Gala“ allein, „Apfel Saft“ oder „Apfeltasche“ bleiben, wie sie sind. Gemerkte Zuordnungen (`aliases`) tragen die Sorte mit.
- Ein **unsicherer Vorschlag** („Bio Apfel“ → „Apfel“) wird **nicht** ins Feld gesetzt: Dort steht, was auf dem Bon steht; der Knopf „Als „Apfel“ eintragen“ übernimmt ihn ausdrücklich. Steht auf dem Bon nur „Äpfel“, zeigt der Verlauf „Äpfel – Sorte unbekannt“.
- **Packungen:** verschiedene Mengen und Einheiten werden nicht gleichgesetzt (500 g, 1 kg, 6 Stück sind eigene Einträge); ein Preis je kg bleibt ein Preis je kg (nie ein Stückpreis).

**Kassenbon**
- Jede Zeile zeigt den **Originaltext vom Bon** und lässt **Name, Sorte, Preis, Menge und Einheit** korrigieren. Gespeichert werden `src: 'bon'` (von dir geprüft), `variant`, `receipt` (Originaltext) und `receiptKey` (Geschäft, Tag, Text, Betrag).
- **Doppelt übernehmen geht nicht:** dieselbe Bonposition (gleicher Schlüssel) wird abgewählt und beim Speichern übersprungen („schon eingetragen“).
- **Menge:** Steht auf dem Bon keine Stückzahl, kein Gewicht und keine Packungsgröße, ist sie **unbekannt** (Einheit „Position“, Anzeige „laut Bon (Menge unbekannt)“) statt „1 Stück“.
- **Rabatt:** nur ein Rabatt **direkt unter der Zeile** und ohne Coupon-, Gutschein-, Bonus-, Payback- oder Kundenkarten-Wort wird eingerechnet (bezahlter Preis, der Normalpreis bleibt erhalten, „Damals im Angebot“, mit Hinweis zur Kontrolle). Alles andere steht in „Nicht als Artikel erkannt“ und wird nicht eingerechnet. **Pfand** ist nie ein Artikel.

**Bestehende Daten und Schätzungen (Datenmigration)**
- Die Datei bleibt lesbar; neue Felder sind optional. Sobald ein bezahlter Preis mit Sorte gespeichert wird, setzt die App `sync.minRev` auf **3** (`SCHEMA_REV = 3`): Eine ältere App liest die Datei dann nicht mehr und verweist auf „App ganz schließen und neu öffnen“. Sie würde Sorten beim Aufräumen zusammenwerfen.
- **Alte Preisnotizen** (ohne `src`) werden **nicht gelöscht, aber nie als bezahlt gezeigt.** Unter **Einstellungen → Bezahlte Preise → Zu prüfen** bestätigst du sie mit **Stimmt**, korrigierst sie mit **Ändern** (Name, Sorte, Preis, Menge, Einheit, Geschäft) oder vergisst sie (einzeln oder alle). Bestätigte Preise lassen sich dort ebenfalls ändern und vergessen.
- **Schätzung:** Ein Artikel hat nur noch den Preis, den du **selbst** am Artikel eingetragen hast. Früher notierte oder bezahlte Preise werden **nie** automatisch übernommen oder in die Summe eingerechnet (auch nicht, wenn das Feld `price` fehlt, und nicht mehr bei neuen Artikeln aus Rezepten, Vorlagen und Siri-Links). Wer seine Summe früher aus gemerkten Preisen bekam, sieht „ohne Preis, nicht eingerechnet“, bis er den Preis am Artikel einträgt. Beim Eintragen eines Artikelpreises entsteht keine Preisnotiz mehr.
- **Ausgaben** und Bon-Gesamtbeträge laufen unabhängig vom Artikelpreisverlauf weiter. Es gibt keine Händlerabfragen.
- **Aufräumen:** je Geschäft, Produkt, **Sorte** und Einheitengruppe bleiben die neuesten **vier** (vorher zwei); bestätigte und ungeprüfte Notizen zählen getrennt.
- Die Beispieldaten tragen die Preise der vier Beispielartikel jetzt am Artikel; ihre acht Preisnotizen sind „zu prüfen“.

**Tests:** `tests/history.test.mjs` (Gala, Pink Lady, Apfeltasche, Apfelsaft, Hafermilch, Milch, verschiedene Einheiten, Doppelimport, Datenmodell), `tests/receipt.test.mjs` (Menge, Rabatt, Pfand, Sorten), `tests/compact.test.mjs` (Sorten bleiben getrennt, minRev) und im Browser: Auf- und Zuklappen, getrenntes Abhaken, höchstens ein Feld, Sperrzustand, automatischer Abgleich (Scrollposition, Fokus), Offline ohne Netzwerkzugriff, Prüfliste, Layout in 390/320/280 px hell und dunkel mit Kontrastprüfung. Elf eingebaute Fehler wurden erkannt. Nicht getestet: das Verhalten auf einem echten iPhone (geprüft im Chromium-Browser mit iPhone-13-Emulation).

Testpunkte für Version 2.41 (iPhone):

- [ ] Planen: keine Preise in den Artikelzeilen (kein „ca. …“, kein Angebot, kein „Teurer“).
- [ ] Im Laden: Name oder Pfeil antippen öffnet unter dem Artikel „Zuletzt bezahlt“; erneut antippen schließt; ein zweiter Artikel schließt den ersten.
- [ ] Der Haken links hakt nur ab (öffnet nichts); nach dem Abhaken ist das Feld zu.
- [ ] Gesperrt: Tipp auf den Namen öffnet nichts (Entsperren-Knopf leuchtet); Halten am Kreis hakt weiter ab.
- [ ] Feld offen lassen, in der anderen App kurz etwas ändern lassen: Das Feld bleibt, die Liste springt nicht.
- [ ] Flugmodus: Das Feld lässt sich weiter öffnen.
- [ ] Kassenbon: Originaltext, Sorte, Menge/Einheit sichtbar und änderbar; derselbe Bon ein zweites Mal wird abgewählt („Schon eingetragen“); „Gala Äpfel“ erkennt die Sorte, „Apfeltasche“ bleibt eigen.
- [ ] Einstellungen → Bezahlte Preise: alte Notizen mit „Stimmt“ bestätigen, mit „Ändern“ korrigieren, mit „Vergessen“ entfernen.

## Neu in Version 2.40: Überschrift scrollt mit, Tipp außerhalb schließt das Fenster

Meine Korrektur aus 2.38 war falsch verstanden: Die Überschrift mit dem „×“ sollte nicht deckend stehen bleiben, sondern **mitscrollen**. Das gilt jetzt überall.

- **Die Überschrift** (`.sheet-head`, im Kochmodus `.cook-head`) steht am Anfang des Fensters und scrollt mit dem Inhalt weg. Beim Hochscrollen ist sie mit dem „×“ wieder da. Das gilt in jedem Fenster: Geschäfte & Angebote, Anleitung, Einkauf eintragen, Rezepte des Tages, Was kann ich kochen?, Artikel und Rezept bearbeiten, Gericht planen und im Kochmodus. Die Deckfläche aus 2.38 entfällt, weil nichts mehr darunter durchläuft.
- **Nur die Knopfleiste unten** (z. B. „Speichern“ im Bearbeiten-Fenster) bleibt stehen und ist weiter undurchsichtig.
- **Schließen durch Tippen außerhalb:** Ein Tipp auf den abgedunkelten Bereich oberhalb des Fensters schließt es wie das „×“ (`app.js`). Es zählt nur, wenn Drücken **und** Loslassen außerhalb liegen; wer in einem Feld Text markiert und außerhalb loslässt, schließt nichts. Das Willkommensfenster lässt sich nicht wegtippen (es braucht den Namen), der Kochmodus füllt den ganzen Bildschirm und hat keinen Bereich außerhalb (dort: hochscrollen, „×“). Ein angefangenes Rezept bleibt auch dabei als Entwurf erhalten.
- **Tests:** Ein Browser-Test prüft in 10 Fenstern (Glas und ohne, hell und dunkel), dass die Überschrift mit dem Inhalt wegscrollt, beim Hochscrollen wieder da ist und das „×“ schließt, dass keine Überschrift festgesetzt ist und dass die Knopfleiste unten bleibt. Ein zweiter prüft das Schließen durch Tippen außerhalb, auch das Nichtschließen beim Markieren und im Willkommensfenster. Fünf eingebaute Fehler wurden erkannt.
- **Nicht getestet:** das Verhalten auf einem echten iPhone (geprüft im Chromium-Browser mit iPhone-13-Emulation). Auf iOS bekommt jedes Fenster einen leeren Klick-Empfänger, damit der Tipp auf den Hintergrund dort als Klick ankommt.

Testpunkte für Version 2.40:

- [ ] In „Rezept bearbeiten“, „Geschäfte & Angebote“, „Anleitung“, „Einkauf eintragen“ nach unten scrollen: Die Überschrift **verschwindet**, beim Hochscrollen ist sie mit dem „×“ wieder da.
- [ ] Auf den dunklen Bereich oberhalb eines Fensters tippen: Das Fenster schließt sich. Im Willkommensfenster und beim Textmarkieren in einem Feld passiert nichts.

## Neu in Version 2.39: „Gericht planen“ fragt den Tag nicht noch einmal

Wer im Wochenplan am Montag auf **＋** tippt, musste im Fenster „Gericht planen“ noch einmal den Tag wählen. Das war doppelt.

- **Vom Tag aus (＋ am Tag) und beim Ändern** gibt es keine Tagesauswahl mehr. Der Tag steht in der Überschrift: „Gericht planen – Montag 26.10.“ (beim Ändern „Gericht ändern – Montag 26.10.“). Der Tag ist etwas kleiner geschrieben wie auf den Tageskarten; in sehr schmalen Fenstern rutscht er in die zweite Zeile, bricht aber nie mitten im Datum um.
- **Von der Rezeptkarte aus** (Kalender-Symbol) ist noch kein Tag gewählt. Dort bleibt die Tagesauswahl, sonst ließe sich das Rezept nur auf heute legen.
- **Folge:** Ein geplantes Gericht auf einen anderen Tag zu legen geht nicht mehr im Ändern-Fenster; dafür das Gericht entfernen und am anderen Tag neu planen (oder von der Rezeptkarte aus mit Tagesauswahl).
- **Test:** Ein Browser-Test prüft Überschrift und fehlende Tagesauswahl vom Tag aus und beim Ändern (auch in schmalen Fenstern bei 390, 320 und 280 px), dass das Gericht am richtigen Tag landet, und dass die Rezeptkarte weiter die Tagesauswahl hat und das Gericht auf den gewählten Tag legt. Vier eingebaute Fehler wurden erkannt.
- **Nicht getestet:** das Aussehen auf einem echten iPhone (geprüft im Chromium-Browser mit iPhone-13-Emulation).

Weiterer Testpunkt für Version 2.39:

- [ ] Wochenplan: ＋ am Donnerstag tippen: Überschrift „Gericht planen – Donnerstag …“, **keine** Tagesauswahl; speichern legt das Gericht auf Donnerstag. Von einer Rezeptkarte aus (Kalender-Symbol) gibt es weiter die Tagesauswahl.

## Neu in Version 2.38: Überschriften in Fenstern schimmern nicht mehr durch

Fehler (auf dem iPhone gefunden): Beim Scrollen in einem Fenster (Geschäfte & Angebote, Anleitung, Einkauf eintragen, Rezepte des Tages, Was kann ich kochen?) blieb die Überschrift oben stehen, hatte aber im Glas-Design keinen eigenen Hintergrund. Der Text darunter schimmerte durch und lag über dem Titel. Das war schon seit dem Glas-Design (2.22) so; es fiel in den eigenen Aufnahmen auf und wurde fälschlich als bekannte Eigenheit stehen gelassen.

- **Die feste Überschrift** (`.sheet-head`) und **die feste Knopfleiste unten** (`.sheet-actions`, seit 2.37 im Bearbeiten-Fenster von Artikel und Rezept) liegen im Glas-Design auf einer deckenden Fläche in der Glasfarbe (Glasfarbe über der Kartenfarbe). Ohne Glas waren sie schon deckend.
- **Test:** Ein Browser-Test scrollt Anleitung, Einkauf eintragen, Rezepte des Tages, Was kann ich kochen? und Geschäfte & Angebote (mit Glas und ohne, hell und dunkel) und misst per Pixel, dass neben und am Rand der Überschrift nur Hintergrund zu sehen ist; ein zweiter Teil prüft in allen Fenstern, dass die Grundfläche jeder festen Überschrift deckend ist. Vor der Korrektur scheiterte der Test im Glas-Design, danach nicht mehr.
- **Nicht getestet:** das Aussehen auf einem echten iPhone (geprüft im Chromium-Browser mit iPhone-13-Emulation).

Weiterer Testpunkt für Version 2.38:

- [ ] In „Geschäfte & Angebote“, „Anleitung“, „Einkauf eintragen“ und „Rezepte des Tages“ nach unten scrollen: Die Überschrift bleibt oben stehen, **nichts schimmert durch**, der Text läuft sauber unter ihr weg.

## Neu in Version 2.37: Daten abgesichert, ruhigere Optik, Mehrfachauswahl, Entwürfe, Vollsicherung, Tests auf GitHub

Anlass: eine Durchsicht mit Verbesserungsvorschlägen. Die beiden Datenfehler daraus wurden zuerst mit einem eigenen Test nachgestellt (Menge 3 wurde nach dem Aufräumen zu 4; ein endgültig entfernter Artikel kam wieder), dann behoben.

**Daten**
- **Angewendete Änderungen bleiben nach Alter** (`sync.marks`): Das Aufräumen behielt nur die letzten 600 Kennungen. Sendete ein Gerät, dessen Schreiben gelang, dessen Antwort aber verloren ging, dieselben Änderungen erst nach über 600 weiteren und einem Aufräumen erneut, wirkten sie ein zweites Mal. Jetzt merkt sich jedes Aufräumen eine Marke „die ersten *n* Einträge waren vor *Zeitpunkt* angewendet“; alles, was jünger als **45 Tage** ist, bleibt (mindestens 600, höchstens 2500 Einträge, etwa 100 KB). Unlesbare Marken werden ignoriert. Nicht abgedeckt bleibt ein Gerät, das länger als 45 Tage nach dem Schreiben keinen Abgleich geschafft hat.
- **Mindestversion** (`sync.minRev`, jetzt 2): Eine App, die eine höhere Mindestversion in der Datei sieht, liest sie nicht und schreibt nichts, sondern bittet, die App zu aktualisieren. Apps bis Version 2.36 kennen das Feld nicht; es schützt also erst vor künftigen Änderungen.
- **Foto-Bereinigung vorsichtiger:** ein ausdrücklich geglückter Abgleich vorher und noch einmal nach der Rückfrage; Fotos, die jünger als 24 Stunden sind (Commit-Datum) oder deren Alter GitHub nicht verrät, bleiben stehen. Das zweite Gerät lädt ein Foto vor seiner Rezeptänderung hoch; dieses Fenster ist damit geschlossen.

**Optik**
- Karten ohne farbigen Rahmenverlauf, dezentere Schatten und Knopf-Leuchten; Farbe bleibt der Auswahl (Reiter, Umschalter, gewähltes Geschäft) und der wichtigsten Aktion vorbehalten. Geschäftsüberschriften getönt statt kräftigem Band. Emoji-Kacheln im Dunkelmodus dunkel.
- **Artikelzeile kompakt:** Name und Menge in einer Zeile, darunter klein Person und geschätzter Preis (`ca. 2,49 €`). Der Preisvergleich mit Datum steht im Bearbeiten-Fenster.
- **Bearbeiten-Fenster:** Name, Menge, Einheit, Geschäft und Kategorie oben; **Preis & Angebot** zugeklappt (die Zeile nennt den Stand, z. B. „2,49 € für 500 g · Im Angebot“); **Speichern** bleibt am unteren Rand erreichbar, auch bei einem Rezept mit vielen Zutaten.
- **Rezepte:** Suche zuerst, darunter „Rezepte des Tages“ und „Was kann ich kochen?“ nebeneinander.
- **Ausgaben ohne Einträge:** kurze Erklärung mit **Ersten Einkauf eintragen**; Monatswahl, Summe, Diagramm und Liste erscheinen nach dem ersten Eintrag.

**Neue Funktionen**
- **Rezeptentwürfe:** Was im Rezeptfenster getippt ist, wird laufend auf diesem Gerät gesichert (`einkauf-recipe-drafts-v1`, ohne Foto, 30 Tage, höchstens 10). Nach dem Schließen oder Neuladen bietet das nächste Öffnen **Entwurf zurückholen** oder **Verwerfen** an. Je Rezept ein Entwurf; ein importiertes Rezept ist sofort ein Entwurf und wird beim nächsten „Neu“ angeboten. Nach dem Speichern ist der Entwurf weg.
- **Reihenfolge der Gänge je Geschäft** (`aisles` am Geschäft): im Geschäfte-Fenster unter **Reihenfolge der Gänge** mit Pfeilen ordnen; gilt unter „Planen“ (Geschäft und Abschnitte unter „Alle“) und „Im Laden“. **Standardreihenfolge** stellt zurück.
- **Mehrere Artikel gemeinsam bearbeiten:** **Auswählen** über der Liste (nur „Planen“). Ein Tipp wählt aus oder ab, **Alle**/**Keine**, **Geschäft zuordnen** (eine Änderung für alle; gleiche offene Artikel im Ziel werden zusammengezählt, auch untereinander) und **Löschen** (mit Rückfrage). Im Auswahlmodus hakt der Kreis nicht ab und das lange Halten hebt keine Zeile ab.
- **Vollsicherung mit Fotos (ZIP):** Einstellungen → **Vollsicherung mit Fotos (ZIP)**: `daten.json`, `fotos/<Kennung>.jpg` und `lies-mich.txt` (nennt auch Fotos, die sich nicht holen ließen). Neue Datei `zip.js` (unkomprimierter ZIP-Schreiber, mit Tests; die Ausgabe wurde zusätzlich mit Pythons `zipfile` geprüft). Die Wiederherstellung bleibt Handarbeit.

**Tests**
- `.github/workflows/tests.yml` führt bei jedem Push und Pull Request die Logiktests und die Browsertests (Chromium, Playwright 1.63.0) auf GitHub aus.
- Nicht möglich in dieser Umgebung: Tests mit WebKit/Safari (es gibt nur Chromium). Ob Tastatur, langes Drücken, Bildschirm-Wachhalten und der Betrieb als Homescreen-App auf dem iPhone funktionieren, bleibt ein Test auf dem Gerät.

**Nicht getestet:** das Aussehen und Verhalten auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation, 280 bis 390 px, hell und dunkel).

Weitere Testpunkte für Version 2.37:

- [ ] Einkauf → Planen: Die Zeilen sind niedriger (Name und Menge, darunter klein Person und `ca.`-Preis); Antippen öffnet das Bearbeiten-Fenster mit **Preis & Angebot** zugeklappt und **Speichern** am unteren Rand.
- [ ] **Auswählen**: zwei Artikel antippen, **Geschäft zuordnen**; dann **Löschen** (Rückfrage).
- [ ] Rezepte → **Neu**: etwas tippen, die App ganz schließen und neu öffnen, wieder **Neu**: **Entwurf zurückholen**.
- [ ] Geschäfte (Symbol neben „Planen | Im Laden“) → ein Geschäft aufklappen → **Reihenfolge der Gänge** ändern, **Speichern**: Die Liste unter Planen und Im Laden folgt.
- [ ] Einstellungen → **Vollsicherung mit Fotos (ZIP)**: Die Datei lässt sich im iPhone-Dateien-Programm entpacken und enthält die Fotos.
- [ ] Ausgaben ohne Einträge: Erklärung statt leerem Diagramm.

## Neu in Version 2.36: „Bildschirm anlassen“ sicher an, gesperrt ohne Haken und ohne „Einkauf beenden“

- **Gesperrt sind „Bildschirm anlassen“ (Haken samt Fehlerzeile) und „Einkauf beenden“ ausgeblendet.** Beide gibt es nur im entsperrten Zustand: nach dem Schloss, nach der automatischen Sperre, beim Zurückkehren aus dem Hintergrund und nach einem Neuladen (die Sperre wird gemerkt). Entsperren (Knopf unten gedrückt halten) bringt beide zurück. Der Bildschirm bleibt dabei an: Das Ausblenden gibt den Bildschirm **nicht** frei.
- **„Bildschirm anlassen“ ist unter „Im Laden“ von Anfang an an** und dort abwählbar. Ein früher gespeichertes „Aus“ (das Feld `shopAwake` aus Version 1.9 bis 2.35, als der Standard noch „aus“ war) wird nicht mehr gelesen; gemerkt wird jetzt im Feld `shopScreenOn`, und nur ein ausdrückliches Abwählen gilt.
- **Neuer Versuch statt dauerhaft abgewählt:** Lehnt das Gerät die Anforderung einmal ab (z. B. Stromsparmodus), versucht die App es beim erneuten Öffnen von „Im Laden“ und beim Zurückkehren in die App wieder, statt den Haken für den Rest der Sitzung abgewählt zu lassen. Die Fehlermeldung erscheint weiter nur, wenn der Haken selbst gesetzt wurde.
- **Nicht getestet:** das Verhalten auf einem echten iPhone. Ob iOS die Anforderung in einer zum Home-Bildschirm hinzugefügten App erlaubt, hängt von der iOS-Version ab; lehnt das Gerät sie ab, bleibt der Haken abgewählt, und der Bildschirm geht nach der am Handy eingestellten Zeit aus (geprüft nur im Chromium-Browser mit iPhone-13-Emulation und einer nachgebauten Schnittstelle).

Weitere Testpunkte für Version 2.36:

- [ ] „Im Laden“ öffnen: „Bildschirm anlassen“ ist angehakt und „Einkauf beenden“ steht da. Schloss tippen: **beides ist weg**, nur die Liste und der Knopf zum Entsperren bleiben. Der Bildschirm wird nicht dunkel. Entsperren: beides ist wieder da.
- [ ] Haken abwählen, App neu laden: bleibt abgewählt.

## Neu in Version 2.35: Vorschläge für den Vorrat

- **Einstellungen → Vorrat** bietet unter der Liste **Vorschläge häufiger Vorräte** zum Übernehmen an: Würzen (Salz, Pfeffer, Paprikapulver, Zimt, Muskat, Oregano, Thymian, Currypulver), Backen (Mehl, Zucker, Vanillezucker, Puderzucker, Backpulver), Öl, Essig & Soßen (Öl, Olivenöl, Essig, Senf, Sojasauce, Tomatenmark, Gemüsebrühe), Haltbares (Nudeln, Reis, Haferflocken) und Gemüse, meist da (Zwiebel, Knoblauchzehen). Die Namen sind so geschrieben, wie sie in Rezepten meistens stehen, denn der Vorrat vergleicht Namen genau (Groß- und Kleinschreibung egal).
- **Ein Tipp auf einen Namen** (Chip mit Plus) nimmt ihn in den Vorrat; er erscheint oben in der Liste, der Vorschlag verschwindet. **„Alle übernehmen“** nimmt alle noch fehlenden auf einmal. Was schon im Vorrat steht, auch selbst eingetippt in anderer Schreibweise (`pfeffer` für „Pfeffer“), wird nicht mehr angeboten; entfernt man einen Eintrag (✕), kommt der Vorschlag zurück. Stehen alle im Vorrat, sagt eine Zeile „Alle Vorschläge stehen schon im Vorrat.“
- Wirkung wie bei selbst eingetragenen Vorräten: Beim Übernehmen von Rezepten und beim Wocheneinkauf sind diese Zutaten vorab abgewählt und mit „Vorrat“ gekennzeichnet; sie zählen bei „Was kann ich kochen?“ als vorhanden. Der Vorrat gilt für beide Personen (gemeinsame Datei).
- Neue Datei `pantry-suggestions.js` (Liste und Auswahl, mit Tests); im Offline-Paket und in der Upload-Liste.
- **Nicht getestet:** das Aussehen auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation, bei 280 und 390 px, hell und dunkel).

Weiterer Testpunkt für Version 2.35:

- [ ] Einstellungen → Vorrat aufklappen: Unter der Liste stehen die Vorschläge in Gruppen. Ein paar antippen (sie wandern in die Liste), dann **Alle übernehmen**. Einen Eintrag mit ✕ entfernen: Der Vorschlag kommt zurück.

## Neu in Version 2.34: im Laden keine Leiste unten

- **Unter „Im Laden“ ist die Leiste mit Einkauf, Rezepte, Plan, Ausgaben, Einstellungen ausgeblendet** (auch mit Glas-Design). Zurück zu den anderen Bereichen geht es mit **Planen** oben rechts.
- **Der Knopf „Zum Entsperren gedrückt halten“ sitzt dafür ganz unten**, dort, wo die Leiste war. Meldungen (z. B. „abgehakt · Rückgängig“) und der Platz unter der Liste richten sich danach aus; ohne Sperre endet die Seite unten direkt unter „Einkauf beenden“.
- Technisch: `body.in-store` setzt `--tabs-h` auf 0 und blendet die Leiste aus; alles, was sich an der Leiste ausrichtet, rutscht von selbst nach unten. Unter „Planen“ und in allen anderen Bereichen steht die Leiste wie bisher.
- **Nicht getestet:** das Aussehen auf einem echten iPhone (Sicherheitsabstand unten, Home-Balken) oder Android-Gerät; geprüft nur im Chromium-Browser mit iPhone-13-Emulation, mit und ohne Glas-Design.

Weiterer Testpunkt für Version 2.34:

- [ ] „Im Laden“ öffnen: Unten steht keine Leiste. Sperren: Der Knopf „Zum Entsperren gedrückt halten“ sitzt am unteren Rand des Bildschirms, nicht darüber, und die Liste lässt sich bis „Einkauf beenden“ scrollen, ohne dass etwas verdeckt wird.

## Neu in Version 2.33: Sperre nach 10 Sekunden, Bildschirm anlassen an, Geschäfte aufklappbar, Start unter „Planen“

- **Automatisch sperren: Standard 10 Sekunden** (vorher 30). Die Auswahl steht **nicht mehr unter „Im Laden“**, sondern unter **Einstellungen → Im Laden** (Nie, 10, 20, 30 Sekunden, 1 oder 2 Minuten; gilt nur auf diesem Gerät). Wer früher eine Zeit gewählt hat, behält sie.
- **„Bildschirm anlassen“ ist unter „Im Laden“ standardmäßig an** (der Haken unter der Liste bleibt dort und lässt sich abwählen; die Wahl wird gemerkt). Klappt die Anforderung nicht (z. B. weil das Gerät sie ablehnt), erscheint nur dann eine Fehlermeldung, wenn der Haken selbst gesetzt wurde; sonst ist er still abgewählt.
- **Geschäfte & Angebote:** Jedes vorhandene Geschäft ist eine **zugeklappte Karte** mit dem Namen (oder Logo/Symbol, bei einer eigenen Liste mit der Marke „Eigene Liste“) und einem Pfeil rechts. Ein Tipp klappt sie auf (Name, Angebotslink, Anzeige, Eigene Liste, Speichern, Löschen), ein zweiter zu; mehrere dürfen offen sein, ein Speichern lässt die Karte offen. **„Neues Geschäft“ unten ist immer sichtbar und nicht klappbar.** Ein neu angelegtes Geschäft erscheint **zugeklappt** in der Liste und leuchtet kurz auf. Beim nächsten Öffnen des Fensters sind alle wieder zu; „Angebotslink festlegen“ öffnet das Fenster mit genau diesem Geschäft aufgeklappt.
- **Start nach vollständigem Schließen:** Die App öffnet wieder unter **Einkauf → Planen** (nicht unter „Im Laden“, nicht gesperrt). Ein Neuladen in derselben Sitzung (etwa wenn das Handy die Seite im Hintergrund verworfen hat) bleibt, wie es war. Die Sitzung merkt sich der Browser bis zum vollständigen Schließen (`sessionStorage`).
- **Nicht getestet:** das Verhalten auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation). Ob iOS beim Zurückholen aus dem Hintergrund dieselbe Sitzung behält, hängt vom Gerät ab: Im Zweifel startet die App dann unter „Planen“.

Weitere Testpunkte für Version 2.33:

- [ ] App ganz schließen (im App-Wechsler wegwischen) und neu öffnen, nachdem zuletzt „Im Laden“ offen war: Es steht **Einkauf → Planen** da.
- [ ] „Im Laden“ öffnen und nichts berühren: Nach etwa 10 Sekunden sperrt sich die Ansicht. Unter Einstellungen → Im Laden eine andere Zeit wählen.
- [ ] Unter „Geschäfte“ (kleines Symbol neben „Planen | Im Laden“): Alle Geschäfte sind zu, ein Tipp klappt auf, „Neues Geschäft“ steht unten fest.

## Neu in Version 2.32: gesperrt leuchtet der Entsperren-Knopf auf statt eines Hinweistextes

- **Kein Hinweistext mehr** bei einer Berührung im gesperrten Zustand („Gesperrt · unten gedrückt halten zum Entsperren“ und die Hinweise zu Kreis, Geschäft und „Erledigt“ entfallen).
- **Stattdessen leuchtet der Knopf „Zum Entsperren gedrückt halten“ kurz farbig auf:** zweimal pulsierend, mit Leuchtrand und Glühen in der gewählten Akzentfarbe, der Knopf wird dabei etwas heller und leicht größer; auch die Leiste bekommt kurz einen Rand in der Farbe (1,2 Sekunden). Jede weitere Berührung startet das Aufleuchten neu.
- Gilt für jede verschluckte Berührung: leere Fläche, Name, Menge, Reiter unten, „Planen“, „Einkauf beenden“, Kreis, Geschäft und „Erledigt“. Nach einem gelungenen Halten (abhaken, Geschäft wechseln, „Erledigt“ öffnen) leuchtet nichts auf.
- **Bildschirmleser** bekommen weiter die Ansage „Gesperrt. Zum Entsperren unten gedrückt halten.“ (unsichtbar, höchstens alle vier Sekunden).
- **Bewegung reduzieren** (Einstellung des Geräts): Der Knopf pulsiert nicht und wird nicht größer, er behält kurz einen Leuchtrand.
- **Farben geprüft:** hell und dunkel, alle sechs Farben, Glas aus und alle drei Glas-Hintergründe; mitten im Aufleuchten hebt sich der Rand neben dem Knopf um mindestens 145 (Farbabstand von 441) vom Grund ab, der Knopf wird um mindestens 27 heller.
- **Nicht getestet:** das Aussehen auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation).

Weiterer Testpunkt für Version 2.32:

- [ ] Im Laden sperren und irgendwo tippen (Fläche, Name, Reiter unten): Es erscheint **kein Text**, der grüne (bzw. in deiner Farbe) Knopf „Zum Entsperren gedrückt halten“ leuchtet zweimal auf. Kreis halten hakt weiter ab, ohne dass etwas aufleuchtet.

## Neu in Version 2.31: Geschenk-Symbol statt „Wünsche“

- **Das Geschäft „Wünsche“ erscheint als kleines Geschenk-Bild** (Geschenk in gedecktem Altrosa mit sandfarbener Schleife, mattem Gold-Stern und weißem Herz; bewusst nicht knallig) statt als Text: im Reiter unter „Planen“, in der Geschäftsauswahl beim Anlegen eines Artikels, in der Leiste „Im Laden“ und als Ziel beim Verschieben. Der Name bleibt als Beschriftung für Bildschirmleser und als Hinweis beim Berühren erhalten; Meldungen und Dialoge nennen ihn weiter als Text.
- **Einstellbar pro Geschäft:** In „Geschäfte“ gibt es **Anzeige im Reiter** (Name oder Geschenk-Symbol). Voreinstellung: „Wünsche“ (auch Wunschliste, Wunschzettel) zeigt das Geschenk, alle anderen den Namen. Wer die Voreinstellung wählt, schreibt nichts fest (Feld `symbol` bleibt leer); eine ausdrückliche Wahl (`gift` oder `none`) bleibt auch nach dem Umbenennen. Gilt auf beiden Handys. Das Geschenk lässt sich so auch einem anderen Geschäft geben.
- **Farben für jeden Hintergrund:** Das Bild trägt einen weißen Außenrand und eine dunkle Kontur (tiefes Weinrot) um Geschenk, Schleife und Stern. Auf hellem Grund trägt die dunkle Kontur, auf dunklem oder farbigem Grund der weiße Rand, auch auf einem gewählten Reiter (gefüllt mit der Farbe). Geprüft: hell und dunkel, alle sechs Farben, Glas aus sowie alle drei Glas-Hintergründe, gewählt und nicht gewählt; der Rand ist überall mindestens 3 : 1 vom Grund abgehoben (schwächster Fall 4,2 : 1).
- Die Einstellung „Geschäfte anzeigen als Text oder Logo“ gilt nur für Geschäfte ohne Symbol.
- **Nicht getestet:** das Aussehen auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation, per Pixelmessung des Grundes neben dem Bild).

Weiterer Testpunkt für Version 2.31:

- [ ] Reiter „Wünsche“ ansehen: Es steht nur das Geschenk mit der Zahl da, auch wenn der Reiter gewählt ist, im hellen und im dunklen Modus und bei anderen Farben und Glas-Hintergründen. Unter „Geschäfte“ → „Anzeige im Reiter“ auf „Name“ stellen: Der Text ist zurück.

## Neu in Version 2.30: eigene Liste (z. B. „Wünsche“)

Anlass: Du möchtest ein eigenes Geschäft „Wünsche“ anlegen, dessen Artikel **nirgends sonst** auftauchen. Rossmann bleibt unverändert: Dort steht „Im Laden“ weiter nichts ohne Geschäft, und unter „Alle“ erscheinen die Rossmann-Artikel wie gewünscht.

- **Neuer Schalter pro Geschäft:** In „Geschäfte“ gibt es das Häkchen **Eigene Liste: Artikel nur zeigen, wenn dieses Geschäft gewählt ist**. Ist es gesetzt, entfällt „Im Laden auch Artikel ohne Geschäft anzeigen“ (die eigene Liste nimmt nie Artikel ohne Geschäft auf). Der Schalter gilt für beide Personen (gemeinsame Datei, Feld `separate`, optional).
- **Planen:** Die Artikel stehen nicht unter „Alle“, nicht in der Summe und nicht in den Zählern („Alle“, „Ohne Geschäft“, „n offen“); nur unter dem Reiter der Liste, mit eigener Summe und eigenem Zähler am Reiter. Wird unter „Alle“ ein Artikel für die eigene Liste angelegt, sagt die Meldung, wo er steht („„Buch“ steht bei „Wünsche““). Kehrt man von der eigenen Liste zu „Alle“ zurück, ist das Geschäft im Eingabefeld nicht mehr vorgewählt (sonst verschwänden neue Artikel unbemerkt).
- **Im Laden:** Die Auswahl „Alle“ und die Hinweise „n Artikel für andere Geschäfte“ zählen sie nicht mit; nur wer oben „Wünsche“ wählt, sieht sie (ohne „Überall möglich“ und ohne Hinweise auf Artikel anderswo). Der Zähler am Reiter „Wünsche“ zählt die eigenen offenen Artikel.
- **Einkauf beenden:** Bei einem anderen Geschäft oder bei „Alle“ bleibt Abgehaktes aus einer eigenen Liste unberührt; ist die eigene Liste selbst gewählt, wird nur sie beendet (die Tomaten bei Edeka bleiben stehen).
- **Was kann ich kochen? / Vorlagen:** Artikel einer eigenen Liste zählen nicht als „kommt noch“ und nicht in „Liste als Vorlage speichern“ unter „Alle“.
- Verschieben (Zeile ziehen) in die eigene Liste und zurück geht wie bei jedem Geschäft; die Leiste oben zeigt sie als Ziel.
- **Nicht getestet:** das Verhalten auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation, mit simuliertem GitHub).

Weiterer Testpunkt für Version 2.30:

- [ ] Geschäft „Wünsche“ anlegen, unter „Geschäfte“ **Eigene Liste** ankreuzen und speichern. Zwei Wünsche eintragen: Sie stehen unter „Alle“ nicht, nicht im Zähler und nicht „Im Laden“ unter „Alle“; nur der Reiter „Wünsche“ zeigt sie. Auf dem zweiten Handy erscheint dasselbe nach dem Abgleich.

## Neu in Version 2.29: die App steht immer hochkant

- **Keine Einstellung dafür:** Die App ist immer im Hochformat; es gibt keinen Schalter.
- **Android (als App installiert):** Das Manifest legt `"orientation": "portrait"` fest, zusätzlich sperrt die App die Drehung mit `screen.orientation.lock('portrait')`, wo der Browser es erlaubt. Das Querformat kommt dann gar nicht vor.
- **iPhone:** iOS kennt weder die Manifest-Angabe noch das Sperren aus einer Web-App. Deshalb zeigt die App im **Querformat auf Handys** nur den Hinweis „Bitte das Handy hochkant halten“. Fenster, Eingaben und Listen bleiben dabei unverändert erhalten und sind beim Zurückdrehen sofort wieder da. Zusätzlich hilft die Hochformatsperre im Kontrollzentrum des iPhones.
- Erkannt wird die **Drehung des Geräts**, nicht die Fenstergröße: Eine offene Tastatur macht das Fenster nicht zum Querformat. **Tablets und Computer** drehen frei (der Hinweis gilt nur für Touch-Geräte mit einer kurzen Bildschirmseite unter 600 px).
- **Nicht getestet:** das Verhalten auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation, einschließlich simulierter Drehung).

Weiterer Testpunkt für Version 2.29:

- [ ] Handy im geöffneten App-Fenster ins **Querformat** drehen (ohne Hochformatsperre): Es erscheint nur „Bitte das Handy hochkant halten“. Zurückdrehen: alles wie vorher, auch ein geöffnetes Fenster. Auf Android sollte sich die installierte App gar nicht erst drehen.

## Neu in Version 2.28: gesperrt „Erledigt“ öffnen

- **Gesperrt: „Erledigt (n)“ gedrückt halten (0,5 s) öffnet oder schließt die Liste** der abgehakten Artikel. Die Zeile füllt sich beim Halten wie ein Kreis oder ein Geschäft; ein kurzer Tipp bewirkt weiter nichts (Hinweis „Gesperrt · „Erledigt“ gedrückt halten zum Öffnen“, beim offenen Bereich „… zum Schließen“); wer beim Halten wegzieht (Scrollen), öffnet nichts. Die Ansicht bleibt gesperrt.
- Geöffnet lässt sich ein versehentlich abgehakter Artikel gesperrt über seinen Kreis (gedrückt halten) wieder zurücknehmen.
- Das Loslassen nach einem gelungenen Halten zeigt keinen zusätzlichen Sperr-Hinweis mehr.
- **Nicht getestet:** das Halten auf einem echten iPhone oder Android-Gerät (geprüft nur im Chromium-Browser mit iPhone-13-Emulation).

Weiterer Testpunkt für Version 2.28:

- [ ] Im Laden sperren (Schloss), dann **„Erledigt“** unter der Liste etwa eine halbe Sekunde halten: Der Bereich klappt auf (und beim nächsten Halten wieder zu), ohne dass etwas blau markiert wird. Kurzer Tipp: nichts.

## Neu in Version 2.27: keine Textauswahl im Laden

Fehler aus Version 2.26: Beim langen Drücken auf einen Kreis (gesperrt zum Abhaken) markierte iOS zusätzlich Text in der Nähe blau (mit Auswahlgriffen), etwa den Kreis selbst und die Zahl in der Überschrift.

- **Im Laden gibt es keine Textauswahl und kein Kontextmenü mehr** (`user-select: none`, `-webkit-touch-callout: none` für die ganze Ansicht; Eingabefelder und die Auswahl der Sperrzeit sind ausgenommen). Unter „Planen“ und in anderen Bereichen bleibt Text auswählbar.
- Zusätzlich wird der Beginn einer Auswahl (`selectstart`) in der Laden-Ansicht abgebrochen, und eine vorhandene Auswahl wird gelöscht, sobald ein Kreis, ein Geschäft oder „Einkauf beenden“ durch Halten ausgelöst wird.
- Lange Artikelnamen werden im Laden, wo es geht, mit Silbentrennung umbrochen („Feinwasch-mittel“ statt „Feinwaschm-ittel“).
- **Nicht getestet:** das Verhalten der Textauswahl auf einem echten iPhone (der Test prüft die Einstellung und das Abbrechen des Auswahlbeginns, nicht die iOS-Lupe selbst).

Weiterer Testpunkt für Version 2.27:

- [ ] Im Laden gesperrt einen **Kreis** halten, bis er sich füllt: Der Artikel ist abgehakt, und **nichts** wird blau markiert (keine Auswahlgriffe, keine Lupe). Dasselbe bei einem Geschäft in der Leiste und beim langen Drücken auf Überschriften oder Namen.

## Neu in Version 2.26: weniger Text im Laden, gesperrt per Gedrückthalten abhaken und Geschäft wechseln

- **Weniger Erklärtext.** Im Laden stehen die Einkaufsliste und der Beenden-Knopf im Mittelpunkt: Die Erklärabsätze zu Sperre, Beenden und „Bildschirm anlassen“ sind weg (die Hinweise erscheinen bei Bedarf als kurze Meldung, z. B. nach einem kurzen Tipp auf „Einkauf beenden“). „Automatisch sperren“ steht in **einer Zeile** (Name links, Auswahl rechts). Eine Fehlermeldung zu „Bildschirm anlassen“ bleibt sichtbar, wenn die Funktion auf dem Gerät nicht geht.
- **Gesperrt: Kreis gedrückt halten (0,5 s) hakt ab.** Der Kreis füllt sich beim Halten. Ein kurzer Tipp bewirkt weiter nichts (Hinweis „Gesperrt · Kreis gedrückt halten zum Abhaken“); wer beim Halten wegzieht (Scrollen), hakt nichts ab. Die Ansicht bleibt gesperrt. **Rückgängig** in der Meldung geht auch gesperrt.
- **Gesperrt: Geschäft gedrückt halten (0,5 s) wechselt das Geschäft** (auch „Alle“).
- Alles andere bleibt gesperrt: Reiter unten, „Planen“, „Einkauf beenden“, Schloss, Meldungen außer „Rückgängig“.

Weitere Testpunkte für Version 2.26:

- [ ] Im Laden sperren (Schloss): Den **Kreis** eines Artikels etwa eine halbe Sekunde halten: Er füllt sich und der Artikel ist abgehakt, die Ansicht bleibt gesperrt. Kurzer Tipp: nichts.
- [ ] Gesperrt ein **Geschäft** in der Leiste oben halten: Das Geschäft wechselt.
- [ ] Unter der Liste stehen nur noch „Bildschirm anlassen“, „Automatisch sperren“ (eine Zeile) und „Einkauf beenden“, ohne Erklärabsätze.

## Neu in Version 2.25: Schutz vor versehentlichen Berührungen im Laden

Anlass: Das Handy mit eingeschaltetem Bildschirm in der Hosentasche löst leicht „Einkauf beenden“ aus oder hakt Artikel ab. Alles gilt nur in der Ansicht **Im Laden**.

- **Abhaken nur über den Kreis.** In der Zeile ist nur noch der **Kreis links** antippbar (Tippfläche 76 × 68 px, der Kreis selbst 42 px). Tippen auf Name, Menge oder den Rest der Zeile bewirkt nichts. Das gilt auch zum Wieder-Öffnen unter „Erledigt“.
- **Rückgängig.** Nach dem Abhaken steht unten sechs Sekunden lang „„Tomaten“ abgehakt · **Rückgängig**“. Ein versehentlich abgehakter Artikel verschwindet sonst aus der offenen Liste und wird leicht vergessen.
- **„Einkauf beenden“ gedrückt halten (0,7 s).** Der Knopf füllt sich beim Halten. Ein kurzer Tipp zeigt nur den Hinweis „Zum Beenden gedrückt halten“; Loslassen oder Wegziehen vor der Zeit bricht ab. Mit Tastatur und Bedienhilfen (VoiceOver) geht es weiter mit einem normalen Aktivieren. Das Beenden-Fenster selbst hat wie bisher seine eigenen Knöpfe.
- **Sperre.** Das **Schloss** rechts neben „Noch … offen“ sperrt die Ansicht: Tippen auf Artikel, Geschäfte, „Planen“, die Reiter unten und „Einkauf beenden“ bewirkt **nichts** (ein kurzer Hinweis „Gesperrt · unten gedrückt halten zum Entsperren“ erscheint). **Scrollen geht weiter**, damit man die Liste trotzdem lesen kann. Zum **Entsperren** den Knopf **„Zum Entsperren gedrückt halten“** (0,6 s, 56 px hoch) unten halten.
- **Automatisch sperren.** Unten in der Ansicht steht **Automatisch sperren** (Nie, 10, 20, **30 Sekunden (Standard)**, 1 oder 2 Minuten ohne Berührung). Jede Berührung, jeder Tastendruck und jedes Scrollen setzt die Zeit zurück. Mitten in einem offenen Fenster (z. B. Beenden) wird nicht gesperrt. Außerdem ist die App **gesperrt, wenn man aus dem Hintergrund zurückkommt** (Bildschirm aus, andere App), solange die Einstellung nicht „Nie“ ist.
- **Gemerkt pro Gerät** (`shopLock` in Sekunden, `shopLocked` für den Zustand): Nach einem Neuladen bleibt es gesperrt; außerhalb von „Im Laden“ gibt es keine Sperre.
- **Was es nicht gibt:** Ob das Handy in der Tasche steckt, kann eine Web-App nicht erkennen (kein Zugriff auf den Näherungssensor). Deshalb hilft die Zeit bis zur Sperre; die ersten Sekunden nach der letzten Berührung sind nicht geschützt. Wer das stört, stellt eine kürzere Zeit ein.

Weitere Testpunkte für Version 2.25:

- [ ] Im Laden: Auf den **Namen** eines Artikels tippen: nichts. Auf den **Kreis** tippen: abgehakt, unten steht **Rückgängig** (antippen nimmt es zurück).
- [ ] **Einkauf beenden** kurz antippen: nur der Hinweis. **Gedrückt halten**: Der Knopf füllt sich, nach etwa einer Dreiviertelsekunde öffnet sich das Fenster; Loslassen ändert nichts.
- [ ] **Schloss** tippen: Alles ist gesperrt. Tippen auf Artikel, „Planen“, Reiter: nichts. Entsperren-Knopf gedrückt halten: wieder bedienbar.
- [ ] Im Laden eine Weile nichts berühren (30 Sekunden): Die Ansicht sperrt sich. Bildschirm sperren, wieder einschalten: gesperrt. Mit **Nie** passiert das nicht.

## Neu in Version 2.24: Kassenbon-Namen vorsichtiger, falsche Preise und Zuordnungen entfernbar

Anlass: Eine „Apfeltasche“ (Gebäck, 0,69 €) bekam den Preis des Obstes „Apfel“. Ursache war der Namensvorschlag beim Kassenbon: Er hielt ein Wort, das mit einem bekannten Namen beginnt („Apfeltasche“ beginnt mit „Apfel“), für dasselbe Produkt, und die App merkte sich die Zuordnung auch noch.

- **Strenger Namensvorschlag (`suggestName` in `receipt.js`).** Eine Bonzeile bekommt nur dann den Namen aus deiner Liste, wenn sie **sicher dasselbe Produkt** ist: Alle Wörter des bekannten Namens kommen vor (gleich oder **abgekürzt**, z. B. „Tom“ → „Tomaten“) **und die Zeile enthält nichts anderes** außer Beigaben wie „Bio“, „frisch“, „lose“ (Größen und Prozentangaben zählen nicht). **Zusammengesetzte Wörter zählen nie:** „Apfeltasche“, „Apfelmus“, „Apfel Saft“, „Hafermilch“, „Milchreis“, „Kirschtomaten“, „Tom Cherry“ bleiben eigene Namen. Im Zweifel gibt es **keinen Vorschlag**, und damit auch keinen Preis, der zu einem anderen Produkt gehört. Eine Zeile, die nur anders geschrieben ist („MILCH“), ist kein Vorschlag mehr, den man prüfen müsste.
- **Preis vergessen.** Im Artikel (Stift) steht unter **Zuletzt notierte Preise** hinter jedem Geschäft **Vergessen** (mit Rückfrage). Es entfernt alle notierten Preise dieses Geschäfts zu diesem Namen und, wenn der Artikel den Preis als eigenen Preis übernommen hatte, auch diesen. Das Preisfeld und die Schätzung zeigen ihn danach nicht mehr; ein selbst eingegebener anderer Preis bleibt.
- **Gemerkte Namen.** Unter **Einstellungen → Gemerkte Namen (n)** steht jede gemerkte Zuordnung („Text auf dem Bon → Name in der App“) und lässt sich mit dem **x** entfernen. Beim nächsten Bon ist die Zuordnung dann weg. Ohne diese Liste wären falsche Zuordnungen unsichtbar gewesen und hätten bei jedem Bon wieder den falschen Namen eingesetzt.
- **Wer schon einen falschen Preis hat** (wie bei der Apfeltasche): 1. in Einstellungen → Gemerkte Namen die falsche Zuordnung entfernen („apfeltasche → Apfel“), 2. im Artikel „Apfel“ unter Zuletzt notierte Preise **Vergessen** tippen.

Weitere Testpunkte für Version 2.24:

- [ ] Kassenbon einfügen mit einer Zeile „Apfeltasche 0,69“, während „Apfel“ in der App bekannt ist: Der Name bleibt **Apfeltasche**, die Zeile sagt „neu in der Preisliste“, es gibt keinen Preisvergleich mit Apfel. Eine Zeile „Bio Apfel“ schlägt dagegen „Apfel“ vor („Vorschlag aus deiner Liste, bitte prüfen“).
- [ ] Einstellungen → Gemerkte Namen: Eine falsche Zuordnung entfernen. Im Artikel mit dem falschen Preis: **Vergessen** tippen, bestätigen: Der Preis ist weg (Preisfeld leer, keine Schätzung mehr).

## Neu in Version 2.23: „Alle“ im Laden und Artikel in ein anderes Geschäft verschieben

- **Im Laden: „Alle“.** Ganz links neben den Geschäften steht eine Auswahl **Alle** mit der Zahl aller offenen Artikel. Sie zeigt alles, was in irgendeinem Geschäft oder **ohne Geschäft** noch offen ist: zuerst **Ohne Geschäft**, dann ein Abschnitt je Geschäft (wie die Gesamtliste unter „Planen“), darin nach Gängen geordnet. Abhaken geht wie sonst; Abgehaktes steht unter **Erledigt**, egal bei welchem Geschäft. Die Auswahl gibt es nur, solange mindestens ein Geschäft existiert; ein gelöschtes Geschäft setzt die Auswahl zurück. **Einkauf beenden** aus „Alle“ speichert den Betrag **ohne Geschäft** (die App kann nicht wissen, wo man war); beim Kassenbon wählt man das Geschäft im Dialog.
- **Verschieben unter „Planen“ per Ziehen.** Zeile **lange gedrückt halten** (wie zum Löschen, 0,45 Sekunden): Die Zeile hebt ab und folgt dem Finger **frei über den Bildschirm**. Oben erscheint eine **Leiste mit allen Geschäften und „Ohne Geschäft“** (sie steht immer ganz oben, auch wenn man weit unten in der Liste ist und das Geschäft dort nicht sieht). Zeile auf ein Feld der Leiste schieben und loslassen: Der Artikel landet in diesem Geschäft. In der **Gesamtliste** zählt außerdem **jeder sichtbare Abschnitt** (Geschäftsüberschrift mit seinen Artikeln) als Ziel; er leuchtet auf, und das passende Feld oben auch. Das jetzige Geschäft ist blass und kein Ziel. Steht dort derselbe Artikel schon offen (gleicher Name, passende Einheit, kein eigener Preis), werden die **Mengen zusammengezählt** und der Doppeleintrag verschwindet („„Äpfel“ → Rewe: jetzt 6 Stück“); sonst wechselt nur das Geschäft.
- **Löschen bleibt:** ganz **nach rechts in die rote Fläche** schieben und loslassen. Die rote Fläche gilt beim freien Ziehen nur in **ihrer Höhe** (± 24 px), damit man auf dem Weg zu einem Geschäft am Rand nichts löscht. Loslassen irgendwo anders bricht ab; **Escape** auch.
- **Nur halten und loslassen** (höchstens 24 px bewegt): Es öffnet sich **Verschieben nach** mit allen Geschäften zum Antippen. Das ist der Weg ohne Ziehen, für Tastatur- und Hilfsbedienung.
- **Technik:** `shop.js` (`shopAllView`, `ALL_STORES`), `renderShopAll()` in `app.js`; `dragdelete.js` kennt nun `target` (Ablageziele; die Zeile folgt dem Finger frei, `overBand` begrenzt die rote Fläche auf ihre Höhe), `onHold` (Loslassen mit höchstens 24 px Bewegung, `heldStill`) und eine Hinweisfläche; `moveBar` in `app.js` baut die Leiste und findet das Ziel unter dem Finger. Verschieben ist eine einzelne Änderung `storeId` (oder `add` + Löschmarkierung beim Zusammenzählen), die beim Abgleich wie jede andere zusammengeführt wird. In den Ausgaben und im Laden gibt es kein Verschieben.

Weitere Testpunkte für Version 2.23:

- [ ] Im Laden → **Alle**: Alle offenen Artikel stehen da, auch die ohne Geschäft (Abschnitt **Ohne Geschäft** ganz oben). Etwas abhaken, **Einkauf beenden**, Betrag eintippen und **+**: Der Eintrag steht unter Ausgaben ohne Geschäft.
- [ ] Unter Planen einen Artikel **lange halten** und **nach oben auf ein Geschäft in der Leiste ziehen**, loslassen: Der Artikel steht dort, die Meldung sagt wohin. Dasselbe bei einem Artikel weit unten in einer langen Liste, auf einen sichtbaren Abschnitt der Gesamtliste und auf „Ohne Geschäft“.
- [ ] Artikel **nur lange halten und loslassen**: **Verschieben nach** öffnet sich (nicht die Bearbeitung).
- [ ] Dieselbe Zeile lange halten und **nach rechts in die rote Fläche** schieben: wird weiterhin gelöscht. Halten und etwas nach rechts ziehen, loslassen: nichts passiert.
- [ ] Zwei Geräte: Auf einem Gerät verschieben, auf dem anderen abgleichen: Der Artikel steht auch dort im neuen Geschäft.

## Neu in Version 2.22: Glas-Design mit Schalter, Hintergrund und Transparenz

Die App kann jetzt wie „Milchglas“ aussehen. Alles liegt unter **Einstellungen → Darstellung & Sicherung** und gilt, wie Farbe und Hell/Dunkel, **nur auf dem jeweiligen Gerät** (`einkauf-settings-v1`: `glass`, `glassBg`, `glassLevel`).

- **Schalter „Glas-Design“** (Standard: an). Aus = die App sieht exakt so aus wie in Version 2.21: kein Attribut am `<html>`, keine Variable, volle Leiste, deckende Karten.
- **Hintergrund:** **Lichter** (weiche Farbflecken in den Ecken, aus der gewählten Farbe abgeleitet), **Verlauf** (diagonal von der Farbe zur Grundfarbe) oder **Schlicht** (nur die Grundfarbe, die Karten sind dann sanft getönt).
- **Transparenz** (Regler 0 bis 100, Standard 50): weniger = Karten fast deckend, mehr = Karten scheinen stärker durch, die Unschärfe wächst mit. Der Regler wirkt schon beim Ziehen, gemerkt wird beim Loslassen.
- **Was sich ändert (nur mit Glas):** Karten, Listen, Wochentage und Umschalter sind milchig durchscheinend mit hellem Innenrand und **farbigem Verlaufsrahmen** (in den Farben der gewählten Farbe); die Tab-Leiste schwebt als **Glaspille** mit Abstand zum Rand; Dialoge sind Glas-Sheets, dahinter wird die Seite unscharf; Akzentknöpfe bekommen einen leichten Verlauf und Schein; Geschäftsüberschriften einen Farbverlauf; Eingabefelder einen Leuchtring beim Antippen. Texte, Anordnung und Größen der Tippflächen bleiben.
- **Technik (Details für Eingeweihte):** `theme.js` setzt `data-glass`, `data-glass-bg` und `--gs` (Transparenz 0 bis 1) vor dem ersten Anzeigen, `applyTheme()` in `app.js` hält sie aktuell. Der Hintergrund ist ein fest stehendes `body::before` (funktioniert auch auf iOS, wo `background-attachment: fixed` ignoriert wird); der Körper selbst ist mit Glas durchsichtig, die Statusleistenfarbe wird deshalb von der Seite (`html`) gelesen. Der Verlaufsrahmen nutzt eine Maske und steht hinter `@supports`; ohne Unterstützung für Unschärfe oder mit der iOS-Einstellung **„Transparenz reduzieren“** bleiben alle Flächen deckend wie bisher. Mit eingeschalteter Tastatur (`body.typing`) fährt die schwebende Leiste ganz aus dem Bild.
- **Lesbarkeit geprüft:** Für 2.448 Textstellen in neun Ansichten (Einkauf, „Alle“ im Laden, Rezepte, Plan, Ausgaben, Einstellungen, drei Dialoge) wurde der Kontrast **pixelgenau** aus dem fertigen Bild gemessen, bei Transparenz 0, 50 und 100, mit Lichtern und Verlauf, hell und dunkel: durchgehend mindestens 4,5 : 1 (Großschrift 3 : 1). Dafür ist der Grautext im hellen Glas-Modus etwas dunkler als ohne Glas und die Karten bleiben im Dunkeln auch bei 100 nie ganz durchsichtig.
- **Nicht getestet:** das Aussehen und die Flüssigkeit auf echten iPhones und Android-Geräten (nur Chromium mit iPhone-Emulation) und auf älteren Geräten mit schwacher Grafik. Wenn es ruckelt: Glas-Design ausschalten oder Transparenz auf 0 stellen.

Weitere Testpunkte für Version 2.22:

- [ ] Einstellungen → Darstellung & Sicherung → **Glas-Design** ausschalten: Die Karten sind sofort deckend, die Leiste unten füllt wieder die Breite, die Hintergrund-Auswahl und der Regler verschwinden. Wieder einschalten: Alles ist sofort zurück, mit den zuletzt gewählten Werten.
- [ ] **Hintergrund** durchschalten (Lichter, Verlauf, Schlicht): Der Hintergrund ändert sich sofort; die Karten bleiben lesbar.
- [ ] **Transparenz** auf 0 und auf 100 ziehen: Bei 0 sind die Karten fast deckend, bei 100 scheint der Hintergrund deutlich durch, die Schrift bleibt gut lesbar (hell und dunkel).
- [ ] App schließen und neu öffnen: Die Wahl gilt schon beim Start (kein kurzes Aufblitzen der alten Darstellung).
- [ ] Ins Namensfeld tippen: Die schwebende Leiste verschwindet mit der Tastatur und kommt danach zurück.

## Bisher in Version 2.21: nach jedem Beenden zur Liste, Punkt „geschätzt gegen bezahlt“, Monatsbudget

Dies sind die Wünsche nach der Abschlussprüfung (Version 2.20). Abgelehnt hast du: Papierkorb, Backup-Import und Umbenennung von „Plan/Planen“.

- **Nach jedem Beenden zurück zur Liste:** „Nur beenden“, „Beenden und Kassenbon einfügen“ und das **+** im Betragsfeld führen alle zurück in die Ansicht **Planen** (die Liste mit dem Eingabefeld). Beim Kassenbon steht die Liste schon hinter dem Kassenbon-Fenster. Bei einem ungültigen Betrag bleibt alles, wie es ist.
- **Kleiner Punkt „geschätzt gegen bezahlt“:** Beim Beenden mit Betrag merkt sich der Eintrag die **geschätzte Summe der abgehakten Artikel** (ihre gemerkten Preise, Feld `estimate`), aber nur, wenn für mindestens **70 %** der Artikel ein Preis bekannt war (sonst wäre der Vergleich unfair). In der Liste der Ausgaben steht hinter dem Betrag ein **8-Pixel-Punkt**: **grün** = im Rahmen oder günstiger, **rot** = mehr als 5 % und mindestens 0,50 € darüber. Er ist bewusst unauffällig; was er bedeutet, steht unter der Liste, im Änderungsfenster („Zum Vergleich: geschätzt 20,00 €, 3,45 € mehr bezahlt“) und für Bildschirmleser im Eintrag. Einträge von Hand, aus dem Kassenbon oder mit zu wenigen Preisen haben keinen Punkt.
- **Monatsbudget:** Unter der Summe steht **Monatsbudget festlegen** (Betrag, z. B. `400`). Danach zeigt eine Karte **Budget 400,00 €**, wie viel davon verbraucht ist („87 % verbraucht · noch 52,00 €“) und einen **Balken**: normal bis 79 %, **gelb ab 80 %**, **rot über 100 %** („15,00 € über dem Budget (115 %)“). Das Budget gilt für **jeden Monat**, auch beim Blättern in andere Monate. Beim Speichern eines Betrags (Einkauf eintragen, Einkauf beenden, Kassenbon) steht ab 80 % ein Hinweis in der Meldung („… · 85 % des Budgets verbraucht“, „… · Budget um 15,00 € überschritten“). Der Stift ändert das Budget, **Budget entfernen** nimmt es zurück. Es liegt in der gemeinsamen Datei (`budgets`, Zeile `monthly`), beide Personen sehen und ändern dasselbe.

Weitere Testpunkte für Version 2.21:

- [ ] Im Laden etwas abhaken → **Einkauf beenden** → **Nur beenden**: Die App ist danach wieder in der Liste (nicht mehr in der großen Laden-Ansicht). Dasselbe nach dem **+** und nach „Kassenbon einfügen“.
- [ ] **Einkauf beenden** mit Betrag, der deutlich über der Schätzung liegt: unter Ausgaben steht hinter dem Betrag ein kleiner **roter** Punkt, bei einem günstigeren Einkauf ein **grüner**.
- [ ] Ausgaben → **Monatsbudget festlegen** → `100`: Balken erscheint; mit Einträgen über 80 % wird er gelb, über 100 % rot. Auf dem zweiten Gerät erscheint dasselbe Budget nach dem Abgleich.

## Neu in Version 2.20: klügere Artikelvorschläge beim Eintippen

**Warum:** Beim Eintippen von „Ap“ erschien kein Vorschlag, obwohl „Apfel“ schon einmal auf der Liste stand. Die Vorschläge standen unter Menge und Einheit und lagen damit hinter der Tastatur; außerdem fand „ap“ keine „Äpfel“.

- **Direkt unter dem Namensfeld:** Die Vorschläge stehen jetzt in **einer Zeile gleich unter dem Feld**, über der Geschäftsauswahl (also oberhalb der Tastatur), und lassen sich seitlich wischen. Die Überschrift „Vorschläge aus euren Artikeln“ entfällt; „Meinst du dasselbe wie …?“ bleibt. Ein Tipp übernimmt den Vorschlag und springt zur Menge.
- **Passender gefunden** (`suggestItemNames` in `data.js`): Der Name beginnt mit dem Getippten („ap“ → Apfel), danach beginnt ein späteres Wort so („ba“ → Bio Bananen), zuletzt steht es irgendwo im Namen. **Umlaute zählen wie ihr Grundbuchstabe** („ap“ findet „Äpfel“, „fuss“ findet „Fußmatte“). Innerhalb davon kommt vor, was häufiger oder zuletzt benutzt wurde. **Schreibweisen desselben Wortes** („Apfel“/„Äpfel“, „Banane“/„Bananen“) erscheinen nur einmal. Höchstens sechs Vorschläge.
- **Woher die Namen kommen, in dieser Reihenfolge:** (1) eure eigenen Artikel einschließlich Gelöschter und dem Namensgedächtnis aus dem Aufräumen, (2) Zutaten eurer Rezepte („Kichererbsen, abgetropft“ → „Kichererbsen“), Namen aus Kassenbons und bestätigte Zuordnungen, (3) rund 160 **fest eingebaute häufige Artikel** (`grocery-names.js`: Milch, Brot, Bananen, Basilikum …), damit „ba“ auch ohne eigenen Verlauf „Bananen“ vorschlägt. Bei gleichem Anfang steht Häufigeres weiter vorn. Nichts davon verlässt das Gerät.
- **Ehrlich dazu:** Die eingebaute Liste ist eine Auswahl, kein vollständiger Lebensmittel-Katalog. Eigene Artikel stehen immer davor und sind damit nach kurzer Zeit die wichtigsten Vorschläge. Die Vorschläge der iPhone-Tastatur („Ap“, „So“, „App“ über den Tasten) kommen vom Betriebssystem und lassen sich von der App nicht beeinflussen.

Weitere Testpunkte für Version 2.20:

- [ ] In das Namensfeld **ap** tippen: Gleich unter dem Feld (über der Tastatur) stehen die Vorschläge, ein früherer Artikel wie „Apfel“ oder „Äpfel“ zuerst. Ein Tipp übernimmt ihn und springt zur Menge.
- [ ] **ba** tippen: „Bananen“ erscheint, auch wenn du nie Bananen eingegeben hast.
- [ ] Die Zeile der Vorschläge lässt sich seitlich wischen, die Seite selbst wackelt nicht.

## Neu in Version 2.19: Notiz mit Aufklapp-Knopf

- **Rechts im Notiz-Feld steht jetzt ein Pfeil-Knopf.** Ein Tipp darauf klappt eine **Liste mit Vorschlägen** unter dem Feld auf (Pfeil dreht sich, `aria-expanded`). Die Liste ist **scrollbar** (etwa vier bis fünf Zeilen sichtbar, eine angeschnittene Zeile zeigt, dass es weitergeht) und enthält bis zu **zwölf** Vorschläge: zuerst „Wocheneinkauf“, bei Drogerien „Drogerie“, dann deine häufigsten eigenen Notizen (bis zu vier), dann feste Ideen (Großeinkauf, Zwischendurch, Getränke, Drogerie, Obst & Gemüse, Grillen, Besuch, Wochenmarkt, Frühstück, Haushalt, Geschenk). Die aktuelle Notiz ist markiert.
- Ein Tipp auf einen Eintrag **übernimmt** ihn und klappt die Liste zu. Ein zweiter Tipp auf den Knopf klappt sie ebenfalls zu. Beim Aufklappen schließt sich die Tastatur (sie würde die Liste verdecken); ein Tipp **ins Feld** klappt die Liste zu und wählt den Text aus, damit Tippen ihn ersetzt.
- Das **ersetzt** die Vorschläge, die in Version 2.16 beim Tippen ins Feld unter dem Feld erschienen. Der Standard „Wocheneinkauf“ bei neuen Einträgen, das Mitlernen eigener Notizen und „beim Ändern kein Standard“ bleiben.

Weiterer Testpunkt für Version 2.19:

- [ ] Ausgaben → **Einkauf**: Rechts in der Notiz steht ein Pfeil. Ein Tipp klappt die Liste auf, du scrollst bis „Geschenk“ und tippst es an: Es steht in der Notiz, die Liste ist zu.

## Neu in Version 2.18: nach dem Betrag zurück zu „Planen“

- Wer im Fenster „Einkauf beenden“ den bezahlten Betrag eingibt und auf das **+** tippt, landet danach wieder in der Ansicht **Planen** (statt in „Im Laden“ zu bleiben): Der Einkauf ist beendet, der Betrag steht unter Ausgaben, die Einkaufsliste ist wieder die Planungsliste. Die Einstellung „Im Laden“ wird dabei wie beim Tipp auf „Planen“ auf diesem Gerät zurückgesetzt. Bei einem ungültigen Betrag bleibt alles, wie es ist (auch die Ansicht). „Nur beenden“ und „Beenden und Kassenbon einfügen“ bleiben in „Im Laden“, wie bisher.

Weiterer Testpunkt für Version 2.18:

- [ ] Im Laden → **Einkauf beenden** → Betrag → **+**: Die Ansicht wechselt zu **Planen** (Einkaufsliste mit Eingabefeld, nicht die große Laden-Ansicht), der Hinweis „… unter Ausgaben gespeichert“ erscheint.

## Neu in Version 2.17: Betrag beim Einkauf beenden, „Was kann ich kochen?“

- **Einkauf beenden → „Was hast du bezahlt?“:** Im Fenster steht ein Feld für den Betrag (z. B. `23,45`). Sobald etwas drinsteht, erscheint rechts das **+** (wie im Namensfeld). Ein Tipp darauf **beendet den Einkauf** (Abgehaktes verschwindet von der Liste) **und speichert den Betrag unter Ausgaben**: für das im Laden gewählte Geschäft, mit dem heutigen Datum und der Notiz „Wocheneinkauf“; beides lässt sich unter Ausgaben nachträglich ändern. Beides geschieht in **einer** Änderung. Ist der Betrag ungültig (z. B. `abc`), bleibt alles unverändert, die Meldung steht im Fenster und die Tastatur ist zu. Die Eingabetaste ohne Betrag erinnert an „Nur beenden“. „Beenden und Kassenbon einfügen“ und „Nur beenden“ bleiben; sie ignorieren das Feld, das bei jedem Öffnen leer ist. Der Kassenbon-Dialog zählt einen schon eingetragenen Betrag nicht doppelt (Abschnitt 2.15).
- **Rezepte → „Was kann ich kochen?“** (`cookable.js`): Ordnet die Rezepte danach, wie viele Zutaten schon da sind.
  - **Da:** Vorrat (Einstellungen → Vorrat), abgehakte Artikel und Artikel, die in den **letzten 7 Tagen** abgehakt und danach von der Liste entfernt wurden (sonst wäre nach „Einkauf beenden“ alles wieder weg). Wer einen Artikel nur löscht, ohne ihn abzuhaken, hat ihn nicht gekauft.
  - **Kommt noch:** offene Artikel der Einkaufsliste (Geschäfte, die es nicht mehr gibt, zählen nicht).
  - **Fehlt:** alles andere. Salz, Pfeffer und alle Zutaten „nach Bedarf“ sowie Wasser werden nicht verlangt. Es wird nur geprüft, **ob** etwas da ist, nicht die **Menge**.
  - **Namen:** Einzahl/Mehrzahl und Zusätze sind egal („Zwiebel“ = „Zwiebeln“ = „rote Zwiebel (klein)“); einige Namen gelten als gleich (Öl = Olivenöl = Rapsöl, Sahne = Schlagsahne, Hack = Hackfleisch, Mehl = Weizenmehl, Milch = Vollmilch). Sonst wird nichts geraten: Tomatenmark ist keine Tomate, Reisnudeln sind kein Reis, Kokosmilch ist keine Milch, Frühlingszwiebeln sind keine Zwiebeln. Das kann auch zu Fehlern führen (Cherrytomaten zählen nicht für „Tomaten“), deshalb steht bei jedem Vorschlag genau, was als da, kommend oder fehlend gilt.
  - **Reihenfolge:** „Alles da“, dann „Alles da, sobald ihr einkauft“, dann Rezepte mit den wenigsten fehlenden Zutaten (mindestens die Hälfte der Zutaten muss da sein oder kommen); bei Gleichstand zuerst, was am längsten nicht gekocht wurde (nie gekocht ganz vorn), dann Favoriten. Höchstens 15 Vorschläge.
  - **Aktionen:** **Kochen**, **Fehlendes auf die Liste** (öffnet das Übernehmen-Fenster, vorausgewählt sind nur die Zutaten, die nirgends sind) und **Einplanen**. Das Vorschlagsfenster schließt sich dabei; solange es offen ist, aktualisiert es sich bei jedem Abgleich.

Weitere Testpunkte für Version 2.17:

- [ ] Im Laden etwas abhaken → **Einkauf beenden** → Betrag eintippen: Rechts im Feld erscheint ein **+**. Ein Tipp darauf: Der Einkauf ist beendet, die Tastatur ist zu, unter Ausgaben steht der Betrag (Geschäft, heute, „Wocheneinkauf“).
- [ ] Im selben Fenster `abc` eintippen und auf das **+** tippen: Meldung, nichts wurde beendet oder gespeichert.
- [ ] Rezepte → **Was kann ich kochen?**: Rezepte, die zu Vorrat und Liste passen, stehen oben; jeder Vorschlag zeigt Da / Kommt noch / Fehlt.
- [ ] Einen Vorschlag mit fehlenden Zutaten: **Fehlendes auf die Liste** öffnet das Fenster mit nur den fehlenden Zutaten angehakt.
- [ ] Nach dem Einkaufen und **Einkauf beenden** zählen die Zutaten noch als „da“ (7 Tage).

## Neu in Version 2.16: Ausgaben schneller bedienen

- **Grünes „+“ im Betragsfeld:** Sobald ein Betrag im Feld steht, erscheint rechts im Feld ein **+** (wie im Namensfeld der Einkaufsliste; rein per CSS über `:placeholder-shown`, es nutzt dieselbe Formatierung `.name-field`/`.add-button`). Ein Tipp darauf **fügt den Einkauf hinzu und schließt die Tastatur**. Fehlt etwas (z. B. Betrag 0), wird die Tastatur trotzdem geschlossen, damit die Meldung nicht verdeckt wird. Das ausdrückliche Schließen ist nötig, weil iOS-Safari Knöpfen beim Antippen keinen Fokus gibt (das Feld und die Tastatur blieben sonst offen). Die Eingabetaste speichert weiterhin.
- **Löschen per Ziehen:** Einträge in der Liste lassen sich wie Artikel **lange halten (etwa eine halbe Sekunde) und nach rechts in den roten Mülleimer ziehen**; Loslassen dort löscht („22,22 € gelöscht“), Loslassen daneben, Escape oder ein früheres Bewegen (Scrollen) löschen nichts, ein kurzer Tipp öffnet weiter das Ändern. Gelöscht wird wie sonst mit einer Löschmarkierung, sie kommt auf dem zweiten Gerät an. Es gibt dafür keine Rückfrage (wie bei Artikeln).
- **Notiz mit Vorschlägen:** Neue Einträge beginnen mit **Wocheneinkauf** in der Notiz. (Seit Version 2.19 erscheinen die Vorschläge in einer Aufklappliste hinter dem Pfeil im Feld, siehe oben.) Ein **Tipp ins Feld** wählt den Text aus (Tippen ersetzt ihn) und zeigt **Vorschläge zum Antippen**: zuerst Wocheneinkauf, bei Drogerien (Rossmann, dm, Müller, Douglas, Budni) gleich danach **Drogerie**, dann die bisher **am häufigsten benutzten eigenen Notizen** (bis zu vier, bei Gleichstand die zuletzt benutzte; Schreibweisen wie „grillabend“ und „Grillabend“ zählen zusammen), zuletzt feste Ideen (Großeinkauf, Zwischendurch, Getränke, Drogerie, Obst & Gemüse, Grillen, Besuch); höchstens acht, keine Doppelten, keine Notizen über 30 Zeichen. Ein Tipp auf einen Vorschlag übernimmt ihn und schließt die Tastatur; ein Tipp daneben blendet die Vorschläge aus. **Beim Ändern** eines Eintrags bleibt die Notiz, wie sie ist (leer bleibt leer, es gibt keinen Standard). Einträge, die aus einem Kassenbon-Text entstehen, bekommen keine Notiz.

Weitere Testpunkte für Version 2.16:

- [ ] Ausgaben → **Einkauf** → Betrag tippen: Rechts im Feld erscheint ein **+**. Ein Tipp darauf speichert den Einkauf, die Tastatur ist zu. Mit leerem Feld ist kein **+** zu sehen.
- [ ] Betrag `0` tippen und auf das **+** tippen: Meldung erscheint, die Tastatur ist zu; ein Tipp ins Feld öffnet sie wieder.
- [ ] Die Notiz steht auf **Wocheneinkauf**. Ein Tipp ins Feld zeigt die Vorschläge; ein Tipp auf „Getränke“ übernimmt ihn, die Tastatur schließt sich.
- [ ] Eine eigene Notiz („Grillabend“) zweimal verwenden: Sie erscheint beim nächsten Mal gleich nach „Wocheneinkauf“.
- [ ] Einen Eintrag **lange halten** und nach **rechts in den roten Mülleimer** ziehen: Er ist weg, die Summe stimmt. Auf dem zweiten Gerät verschwindet er nach dem Abgleich.
- [ ] Einen Eintrag halten, aber nicht in den Mülleimer ziehen: nichts wird gelöscht. Ein kurzer Tipp öffnet das Ändern.

## Neu in Version 2.15: Ausgaben (neuer Bereich in der Leiste unten)

**Wozu:** Du siehst, wie viel ihr **im aktuellen oder im letzten Monat** eingekauft habt, und kannst die Beträge entweder **von Hand eingeben** oder **aus einem Foto oder Screenshot des Kassenbons** lesen lassen.

- **Neuer Bereich „Ausgaben“** (fünfter Reiter, Säulen-Symbol). Oben der Monat mit Pfeilen (zurück bis zum ersten Eintrag, vor bis zum aktuellen Monat) und **Dieser Monat**. Darunter: die **Summe** („Bisher ausgegeben“ im laufenden Monat), die Zahl der Einkäufe mit Durchschnitt und der **Vergleich mit dem Vormonat** (▲ rot = mehr, ▼ grün = weniger, mit Prozent). Danach ein Säulendiagramm der **letzten sechs Monate** (Tipp auf eine Säule öffnet den Monat), die **Aufteilung nach Geschäft** (erscheint, sobald mindestens zwei Geschäfte oder „Ohne Geschäft“ Einträge haben) und die Liste der Einträge des Monats, neueste zuerst.
- **Einkauf eintragen** (Knopf oben rechts): Betrag (z. B. `23,45`, `1.234,56` oder `€ 12`), Datum (heute), Geschäft (zuletzt benutztes) und optionale Notiz. Ungültiges wird verständlich abgelehnt: kein Betrag, 0, negativ, zu groß (über 99.999,99 €), mehr als zwei Nachkommastellen, Datum in der Zukunft (morgen ist erlaubt). `12,345` wird bewusst **nicht** geraten, sondern abgelehnt. Ein Eintrag lässt sich antippen, **ändern** und **löschen**.
- **Foto oder Screenshot des Kassenbons:** im selben Fenster **Kassenbon fotografieren oder Screenshot wählen**. Die Texterkennung (`ocr.js`, wie beim Rezept-Import) läuft **auf dem Gerät**, das Bild wird nirgends hochgeladen. Aus dem erkannten Text liest `receipt.js` die **Summe** (sonst die Summe der erkannten Zeilen), das **Datum** und, falls der Markt erkannt wird, das **Geschäft**. Alles steht nur als **Vorschlag in den Feldern**; gespeichert wird erst mit **Speichern**, nachdem du den Betrag geprüft hast. **Ehrlich:** Fotos von Thermo-Kassenzetteln werden oft ungenau gelesen (Falten, Schatten, verblasste Schrift). Screenshots digitaler Bons aus der Markt-App sind viel zuverlässiger. Wird kein Betrag gefunden, sagt die App das und du gibst ihn von Hand ein.
- **Artikelpreise gleich mit übernehmen:** Hat die App im Foto Artikelzeilen erkannt, erscheint **Danach die Artikelpreise prüfen und übernehmen**. Nach dem Speichern öffnet sich der bekannte Kassenbon-Dialog mit diesen Zeilen (Preise, Namen, Preisentwicklung).
- **Kassenbon-Dialog (Einkauf → Kassenbon):** Neu ist **Gesamtbetrag unter Ausgaben speichern** (vorab angehakt). Ein Betrag, der für **denselben Tag, dasselbe Geschäft und dieselbe Summe** schon eingetragen ist, wird nicht doppelt gezählt (das Häkchen ist dann nicht gesetzt, und beim Speichern wird ebenfalls nichts doppelt angelegt). Auch „Einkauf beenden → Beenden und Kassenbon einfügen“ nutzt das.
- **Beide sehen dasselbe:** Die Einträge liegen in der gemeinsamen Datei (Sammlung `purchases`, siehe Abschnitt 9). Wer ohne GitHub arbeitet (Beispielmodus), speichert sie nur auf dem Gerät. Seit 2.67 bleiben auch Ausgaben über 36 Monate dauerhaft erhalten; die frühere Altersbereinigung entfällt.
- **Ältere App-Fassung auf dem zweiten Gerät:** Sie ignoriert die Ausgaben, löscht sie aber nicht (unbekannte Felder bleiben erhalten); sie sieht den neuen Bereich erst nach dem Update.
- **Leiste unten:** Mit fünf Reitern ist sie auf kleinen Telefonen enger; Schrift und Symbole werden unter 421 und unter 361 Pixel Breite etwas kleiner. Beschriftungen werden nicht abgeschnitten.

Weitere Testpunkte für Version 2.15:

- [ ] Reiter **Ausgaben** erscheint als fünfter Reiter, die Beschriftungen passen auf dem iPhone (auch kleinem) ohne Abschneiden, keine seitliche Scrollleiste.
- [ ] **Einkauf** → `23,45` → Speichern: Summe zeigt 23,45 €, der Eintrag steht in der Liste, auf dem zweiten Gerät erscheint er nach dem Abgleich.
- [ ] Ungültige Eingaben (leer, `0`, `abc`, `12,345`, Datum in der Zukunft) zeigen eine verständliche Meldung und speichern nichts.
- [ ] Mit den Pfeilen zum letzten Monat: Summe, Vergleich (▲/▼ mit Prozent) und Säulendiagramm stimmen; **Dieser Monat** springt zurück.
- [ ] Eintrag antippen: ändern (Betrag, Geschäft entfernen) und **Eintrag löschen** funktionieren.
- [ ] **Screenshot** eines digitalen Kassenbons wählen: Fortschritt, dann stehen Summe, Datum und Geschäft als Vorschlag in den Feldern. Foto eines Papier-Kassenbons: Der Betrag wird gegebenenfalls korrigiert (das ist normal).
- [ ] Kassenbon-Text einfügen → **Gesamtbetrag unter Ausgaben speichern** angehakt → Speichern: Der Betrag steht unter Ausgaben. Denselben Bon noch einmal: Das Häkchen ist nicht gesetzt, nichts wird doppelt gezählt.

## Neu in Version 2.14: farbige Symbole statt Internet-Fotos

> Seit Version 2.64 verwenden alle Listen dieselben eigenen Produkt- und Gruppenbilder wie die Schnellauswahl. Die folgende Beschreibung dokumentiert den früheren Emoji-Stand.

**Warum:** In Version 2.13 holte die App Produktfotos von Open Food Facts. Der erste Treffer der Suche war oft falsch (für „Birne“ ein Foto von Birnensaft, für „Reis“ Reiswaffeln). Du wolltest stattdessen die farbigen Symbole, und echte Bilder auch nicht als Option. Deshalb ist die Foto-Suche **vollständig entfernt**:

- **Rechts in jeder Artikelzeile steht ein farbiges Symbol (Emoji) passend zum Artikel**, sofort da und ohne Internet (`emoji.js`): „Birne“ 🍐, „Reis“ 🍚, „Milch“ 🥛, „Eier“ 🥚, „Spülmittel“ 🧼 usw. Rund 100 Stichwörter sind hinterlegt (auch Mehrzahl und Zusammensetzungen: „Cocktailtomaten“ 🍅). Ohne Treffer zeigt die Kachel das Symbol der Kategorie (Obst 🍎, Brot 🍞, Fleisch 🥩, Milch 🥛, Tiefkühl 🧊, Vorrat 🥫, Gewürze 🧂, Süßes 🍪, Getränke 🥤, Haushalt 🧼), sonst ein Paket 📦. Verwechslungen sind ausgeschlossen: „Birnensaft“ 🧃 ist kein Obst, „Reiswaffeln“ 🍘 kein Reis, „Kokosmilch“ 🥥 keine Milch, „Zahnpasta“ 🪥 keine Pasta, „Alkohol“ kein Kohl.
- **Aussehen:** abgerundete Kachel (56 px, unter 341 px Breite 44 px) rechts in der Zeile mit hellem Hintergrund und dünnem Rahmen, auch im Dunkelmodus. Name und Menge bleiben links, lange Namen brechen um und werden nicht gequetscht. Die Kachel ist rein dekorativ: nicht antippbar, nicht fokussierbar, für Bildschirmleser versteckt. Auch die Zeilen unter „Neu von …“ haben sie; dort rutscht „Übernehmen“ in eine zweite Zeile. Die Ansicht „Im Laden“ ist unverändert.
- **Schalter: Einstellungen → Darstellung & Sicherung → „Produktbilder anzeigen“** (Standard an). Er gilt sofort ohne Neuladen und ist wie die anderen Schalter in den Geräteeinstellungen gespeichert (`productImages`). Aus = keine Kacheln, die Zeile sieht aus wie früher.
- **Keine Verbindung zu fremden Diensten mehr:** Die App sendet keine Artikelnamen irgendwohin. Die Sicherheitsrichtlinie in `index.html` erlaubt keine Adressen von Open Food Facts oder Wikipedia mehr. Der Bild-Speicher aus Version 2.13 (`einkauf-images-v1`) wird beim Start gelöscht.
- **Ehrlich dazu:** Emoji kommen vom Gerät und sehen auf iPhone und Android etwas verschieden aus. Auf sehr alten Geräten können neuere Emoji (z. B. 🧈 🫑 🫘) als Kästchen erscheinen. Die Zuordnung ist eine feste Stichwortliste: Für sehr seltene Artikel zeigt die Kachel das Symbol der Kategorie. Neue Stichwörter lassen sich in `emoji.js` ergänzen.

Weitere Testpunkte für Version 2.14:

- [ ] Einkauf: Jede Zeile zeigt rechts ein farbiges Symbol passend zum Artikel (Birne 🍐, Milch 🥛, Reis 🍚), sofort und ohne Wartezeit. Unbekannte Namen zeigen das Symbol der Kategorie oder 📦.
- [ ] Ein langer Name („Domol Feinwaschmittel …“) bricht um, die Kachel bleibt rechts und ganz.
- [ ] Einstellungen → Darstellung & Sicherung → „Produktbilder anzeigen“ ausschalten: Die Kacheln verschwinden sofort, die Zeile sieht aus wie früher. Wieder einschalten: sofort wieder da.

## Neu in Version 2.13: Produktbilder in der Einkaufsliste

> **Überholt durch Version 2.14:** Die Internet-Fotos (Open Food Facts) gab es nur in dieser Fassung; sie waren zu ungenau und sind entfernt. Geblieben sind die Kachel rechts in jeder Zeile und der Schalter „Produktbilder anzeigen“, jetzt mit farbigen Symbolen (siehe oben).

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
- **Namen:** „TOM CHERRY 250G“ ist nicht „Tomaten“. Die App schlägt einen bekannten Namen nur bei **sicherem Treffer** vor („Vorschlag aus deiner Liste, bitte prüfen“, siehe Version 2.24), oder nimmt eine **gemerkte Zuordnung** („Zuordnung gemerkt“). Ändert ihr einen Namen und speichert, merkt sich die App die Zuordnung (Sammlung `aliases`, wenige KB) und wendet sie beim nächsten Bon automatisch an. Der Preis gehört zu dem Namen, den ihr wählt: Wer immer laktosefreie H-Milch kauft, ordnet sie „Milch“ zu, und die Schätzung rechnet mit dem, was ihr wirklich bezahlt. Wer Cherry- und Rispentomaten unterscheiden will, gibt ihnen verschiedene Namen.
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
- **Vorschläge und gelernte Kategorien bleiben:** Aus entfernten Artikeln merkt sich die App Name, Kategorie und Häufigkeit (ab Version 2.74 höchstens 1500 Namen, Feld `names`). Wer „Kochschinken“ einmal in „Fleisch & Fisch“ eingeordnet hat, behält das auch nach dem Aufräumen.
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
- **Gericht planen:** mit **＋** am Tag (der Tag steht dann in der Überschrift, z. B. „Gericht planen – Montag 26.10.“, und wird nicht noch einmal gefragt) oder mit dem Kalender-Symbol auf einer Rezeptkarte (dort wählst du den Tag). Wähle ein Rezept (Favoriten stehen oben) und die Portionen, oder ein **eigenes Gericht** ohne Rezept („Pizza bestellen“).
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
6. Im Repo **Code → Add file → Upload files** wählen. `index.html`, `styles.css`, `app.js`, `data.js`, `prices.js`, `wishes.js`, `recipe-import.js`, `page-source.js`, `ocr.js`, `categories.js`, `plan.js`, `photos.js`, `compact.js`, `receipt.js`, `cook.js`, `news.js`, `shop.js`, `brand.js`, `store-catalog.js`, `product-catalog.js`, `product-catalog-data.js`, `product-picker.js`, `product-images.js`, `daily.js`, `recipe-maker.js`, `emoji.js`, `spending.js`, `family.js`, `spending-view.js`, `cookable.js`, `grocery-names.js`, `product-names.js`, `buying.js`, `quantity-controls.js`, `pantry-suggestions.js`, `pantry.js`, `pantry-view.js`, `zip.js`, `pdf.js`, `pdf-fonts.js`, `recipe-sheet.js`, `sheet-view.js`, `recipe-filter.js`, `help.js`, `dragdelete.js`, `theme.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `beispieldaten.json`, `rezepte-des-tages.json`, `.nojekyll` und `README.md` sowie den **Ordner `assets`** (Händlerlogos und Produktbilder; mit den Unterordnern `stores`, `products` und `branding` hochladen) und den **Ordner `vendor`** (Texterkennung, ca. 9 MB; den Ordner per Drag & Drop auf die Upload-Seite ziehen) gemeinsam hochladen. Alles muss so liegen wie im Repository, die Dateien **direkt im Hauptordner**. Die Ordner `tests` und `worker` sowie `package.json` sind für die App nicht erforderlich (`worker/recipe-proxy.js` brauchst du nur für Abschnitt 13, und zwar bei Cloudflare, nicht auf GitHub).
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
- **Versehentlich gelöscht:** Seit Version 1.7 gibt es keinen Rückgängig-Knopf mehr. Ein Häkchen setzt man durch erneutes Antippen zurück; Gelöschtes legt man neu an. Gelöschte Einkaufsartikel bleiben noch 14 Tage in der Datei (danach räumt die App auf); Ausgaben behalten ihre Löschmarken dauerhaft, die App zeigt sie aber nicht mehr an. Ältere Stände findet man im Verlauf des privaten Daten-Repositorys auf GitHub.
- **Zweiter Tab:** pro Browser-Ursprung darf nur ein App-Tab aktiv sein, damit zwei Tabs nicht dieselbe lokale Warteschlange überschreiben. Den ersten Tab schließen und den zweiten neu laden. Zwei Geräte sind ausdrücklich unterstützt.

Token und private Daten liegen unverschlüsselt im `localStorage` dieses Browsers. Es werden keine externen Skripte, Analysewerkzeuge oder Schriften geladen. Trotzdem nur auf vertrauenswürdigen Geräten verwenden und Browserdaten nicht löschen, solange Änderungen ausstehen. Andere Seiten unter demselben Pages-Ursprung gehören ebenfalls zu dieser Vertrauensgrenze. **Token entfernen** entfernt die Zugangsdaten; lokale Daten und Warteschlangen bleiben für die spätere erneute Verbindung erhalten. Für vollständiges Entfernen erst synchronisieren und sichern, dann die Website-Daten in den Geräteeinstellungen löschen. Safari im privaten Modus ist für dauerhafte Daten ungeeignet.

## 9. Datenmodell v1 und Zusammenführen

`recipes.notes` (optional, seit 2.69) enthält gemeinsame Rezeptnotizen als String mit höchstens 10.000 Zeichen. Fehlend bedeutet leer; ältere Dateien bleiben gültig. PDF, Entwurf und Sicherung übernehmen das Feld.

`beispieldaten.json` zeigt das vollständige Modell. Oben steht `version: 1`. Bei unbekannten Versionen verweigert diese App das Schreiben. Erweiterungen innerhalb v1 dürfen optionale Felder ergänzen; unbekannte Felder werden erhalten. Änderungen an Bedeutung oder Pflichtfeldern benötigen eine ausdrücklich getestete Migration, nicht nur eine andere Versionsnummer.

| Bereich | Inhalt |
| --- | --- |
| `stores` | `id`, `name`, Zeitstempel und Löschmarkierung |
| `items` | zusätzlich `storeId`, `name`, `quantity`, `unit`, `checked`, `createdBy`; optional `price`, `salePrice`, `onSale`, `category` (Gang im Laden, z. B. `obst`; `null` oder fehlend = automatisch) |
| `recipes` | zusätzlich `name`, `servings`, `tags`, `instructions`; optional `sourceUrl` (Quelle eines importierten Rezepts), `favorite` (Wahrheitswert), `lastCookedAt` (Datum `JJJJ-MM-TT`), `photoId` (Kennung der Datei `photos/<photoId>.jpg` im Daten-Repo; `null` = kein Foto) |
| `meals` (optional) | Wochenplan: `date` (`JJJJ-MM-TT`), `servings`, entweder `recipeId` oder `title` (eigenes Gericht), optional `done` |
| `ingredients` | zusätzlich `recipeId`, `name`, `quantity`, `unit`; die Einheit `nach Bedarf` (Menge 1) steht für Zutaten ohne Mengenangabe |
| `prices` (optional) | Einzelne Preisnotizen mit ID, `storeId`, `name`, `quote`, optional `regularQuote`, `onSale` und denselben Zeitstempeln; seit Version 2.41 auch `src`, `variant`, `receipt`, `receiptKey`. Seit Version 2.44 liest und prüft die App sie weiter, zeigt sie aber nicht mehr an und schreibt keine neuen |
| `pantry` (optional) | Vorrat (Version 1.6): `name` und die üblichen Zeitstempel |
| `names` (optional) | Namensgedächtnis aus aufgeräumten Artikeln (Version 1.6): `name`, `count`, `at`, optional `category`, `unit` |
| `templates` (optional) | Einkaufsvorlagen (Version 2.5): `name` (höchstens 60 Zeichen) und `items`: bis zu 80 Artikel `{ name, quantity, unit, storeId? }`; die ganze Artikelliste wird als ein Feld zusammengeführt (die neuere Fassung gewinnt) |
| `purchases` (optional) | Ausgaben (Version 2.15): `date` (`JJJJ-MM-TT`), `cents` (ganze Cent, 1 bis 99.999.999), optional `storeId`, `storeName` (der beim Erfassen gemerkte Name, bleibt nach dem Löschen des Geschäfts lesbar), `note` (höchstens 200 Zeichen), `source` (`bon` = aus Kassenbon-Foto/-Screenshot oder Kassenbon-Text, `hand`), `estimate` (Altbestand aus Version 2.21–2.67; seit 2.68 weder berechnet noch angezeigt); jeder Eintrag ist ein eigener Datensatz, zwei gleichzeitig erfasste Einkäufe bleiben also beide erhalten. Seit 2.67 optional `buyerId`, `buyerName`, `kind` (Einkauf/Rückerstattung). Historie und Löschmarken bleiben dauerhaft erhalten |
| `members` (optional, 2.67) | Gemeinsame Personen: `id` (fest beim Umbenennen), `name` (1–30 Zeichen), `archived` (optional); normale Zeitstempel, Löschmarkierung und Feld-Uhren. `purchases.buyerId` verweist darauf. Alte Käufe bleiben unzugeordnet, bis jemand die Person auswählt |
| `budgets` (optional) | Monatsbudget (Version 2.21): eine Zeile mit der festen Kennung `monthly` und `cents` (ganze Cent, 0 = kein Budget); beide Geräte setzen dieselbe Zeile, der jüngere Wert gewinnt |
| `aliases` (optional) | Bestätigte Namenszuordnungen (Version 1.8), heute nur noch Schreibweisen („Zwiebel“ → „Zwiebeln“): `from` (normalisierter Text), `name` (Name in der App), optional `variant` (nur von Version 2.41 bis 2.43 geschrieben, wird nicht mehr angezeigt) |
| `sync.applied` | IDs bereits angewendeter Änderungen; verhindert Doppelübertragung (wird beim Aufräumen auf die letzten 600 gekürzt); `sync.compactedAt` nennt den Zeitpunkt des letzten Aufräumens |

Ein Preis ist ein zusammengehöriges Objekt `{ "cents": 199, "quantity": 500, "unit": "g" }`: 199 Cent für 500 g. Dieses Objekt wird als ein Feld zusammengeführt, damit bei gleichzeitiger Bearbeitung Preis und Bezugsmenge nicht vermischt werden. Jede ausdrücklich geänderte Preisnotiz erhält eine eigene ID; der neueste passende Eintrag je Geschäft wird anhand von `createdAt` und ID bestimmt. Wiederholtes Senden derselben Operation erzeugt keine doppelte Preisnotiz. `stores.offersUrl` ist optional; ein leerer String deaktiviert den Link. `items.price` enthält den normalen Preis, `items.salePrice` optional den Angebotspreis mit eigener Bezugsmenge. `onSale` kennzeichnet die freiwillige Angebotsnotiz; seit 2.68 wird daraus keine Schätzsumme berechnet. Preisnotizen enthalten in `quote` den verwendeten Preis und optional in `regularQuote` den bekannten Normalpreis. Alte Dateien ohne `prices` werden als leere Preisliste gelesen, ohne andere Daten zu verändern. Artikelvorschläge werden aus den bestehenden Artikeln abgeleitet; dafür gibt es keine neue Collection. Die Schema-Version bleibt 1, weil nur optionale Felder ergänzt wurden. Version 1.8 ergänzt optional: `items._base`/`items._adds` (Mengenzuwächse, siehe oben), `items.saleUntil` und `prices.saleUntil` (letzter Tag eines Angebots), `prices.trend` (`{ was, at }`, Preisentwicklung) und die Sammlung `aliases`. Auch `recipes.sourceUrl` (Version 1.3), `items.category`, `recipes.favorite`, `recipes.lastCookedAt`, `recipes.photoId` und die ganze Liste `meals` (Version 1.4) sowie `pantry`, `names` und `sync.compactedAt` (Version 1.6) sind optional; ältere App-Versionen auf einem zweiten Gerät ignorieren diese Felder, löschen sie aber nicht. Wer zwischen den Versionen wechselt, sieht dort lediglich Wochenplan, Kategorien und Fotos nicht.

Jeder Datensatz hat `createdAt`, `updatedAt`, `deletedAt` und `_clock`. `deletedAt: null` bedeutet nicht gelöscht. `_clock` speichert je geändertem Feld dessen Zeitstempel und Operations-ID. Eine Operation enthält `id`, `collection`, `entityId`, `patch`, `actor` und `at`.

Die App liest die aktuelle Datei samt GitHub-SHA, wendet nur ihre eigenen ausstehenden Operationen an und schreibt mit dieser SHA zurück. Ändert ein anderes Gerät die Datei dazwischen, lehnt GitHub den alten Stand ab; die App liest und mischt erneut. **GitHub speichert technisch die vollständige JSON-Datei pro Commit, nicht einzelne JSON-Felder.** Es gibt keinen blinden Ersatz durch einen veralteten Gerätestand.

Unterschiedliche Datensätze und Felder bleiben erhalten. Ändern beide dasselbe Feld, gewinnt der jüngere Zeitstempel; bei Gleichstand die Operations-ID. Dies ist kein gemeinsamer Texteditor: zwei gleichzeitige Änderungen derselben Zubereitung lassen sich nicht sinnvoll automatisch addieren. Gerätezeit automatisch einstellen. Löschen bleibt durch eine Markierung erhalten und wird durch normales Bearbeiten nicht aufgehoben. Gelöschte Rezepte verbergen ihre Zutaten; gelöschte Geschäfte verbergen ihre Artikel. Die letzte Löschaktion kann beides wieder sichtbar machen.

Diese Version ist für einen kleinen gemeinsamen Haushalt gedacht: **maximal 900 KB JSON** (Fotos liegen in eigenen Dateien). Damit die Grenze nie erreicht wird, räumt die App auf (Abschnitt „Neu in Version 1.6“): automatisch ab 250 KB, auf Wunsch jederzeit. Beim Aufräumen werden Löschmarkierungen nach 14 Tagen entfernt; Änderungen, die ein sehr lange offline gewesenes Gerät an inzwischen entfernten Einträgen vornimmt, werden beim Abgleich verworfen (die Zeile trägt dazu eine Sammelmarke `_clock["*"]`, damit auch spät eintreffende ältere Änderungen keine neueren überschreiben). Durch fortlaufendes Speichern entstehen Commits im privaten Repo. Daten aus alten Git-Ständen verschwinden nicht durch Löschen oder Aufräumen in der App und lassen sich dort wiederherstellen.

## 10. Backup und Wiederherstellung

Unter **Einstellungen → Alle Daten als JSON sichern** wird der aktuelle sichtbare Datenstand einschließlich ausstehender lokaler Änderungen und interner Löschmarkierungen heruntergeladen. **Kein Token und keine Verbindungseinstellungen** sind enthalten. Die Datei vertraulich aufbewahren.

Es gibt in dieser Version noch keinen Import-Knopf. Für eine vollständige Wiederherstellung: auf **beiden Geräten** zunächst offene Änderungen synchronisieren oder separat sichern, alle App-Fenster schließen, im **privaten** Repo die `daten.json` durch das gewünschte Backup ersetzen und speichern. Auf beiden Geräten die Website-Daten nach der Sicherung löschen, App erneut öffnen und Verbindung neu eingeben. Dadurch können alte lokale Warteschlangen das wiederhergestellte Backup nicht versehentlich ändern. Das ist eine bewusste Wiederherstellung des gesamten Stands, kein normaler Abgleich.

## 11. Kurze Testcheckliste für euch

- [ ] App auf iPhone in Hochformat öffnen: alle fünf Bereiche erreichbar, keine seitliche Scrollleiste; hellen und dunklen Modus testen.
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
- [ ] **Einkauf beenden → Nur beenden:** Abgehaktes ist von der Liste entfernt, die App steht wieder in der Liste.

Weitere Testpunkte für Version 1.8 (auf beiden Geräten aktualisieren):

- [ ] **Gleichzeitig dazuzählen:** Auf der Liste steht „Milch 1“. Ein Gerät in den Flugmodus, auf beiden Geräten je „Milch“ hinzufügen, Flugmodus aus: Ergebnis „3“.
- [ ] **Neu von …:** Auf einem Gerät einen Artikel anlegen und ein zweites Mal „Milch“ dazuzählen. Auf dem anderen Gerät stehen beide gelb oben („neu von …“, „+1 von …“); „Übernehmen“ reiht sie ein, nach Neuladen bleiben sie übernommen.
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
- `tests/receipt.test.mjs`: Kassenbons im Stil von Rewe, Lidl, Edeka und PDF-Text (Gewicht, Stückzahl, Größen, Rabatt, Pfand, Summenprobe, Datum, Geschäft), Summe, Datum und Kette (seit Version 2.44 keine Namensvorschläge mehr). `tests/aliases.test.mjs`: Schreibweisen und Zuordnungen. `tests/offers.test.mjs`: Gültigkeit von Angeboten, Alter von Preisen. `tests/concurrent.test.mjs`: Mengen bei gleichzeitigem Zusammenzählen (alle Reihenfolgen, Einheiten, Zusammenführen von Doppeln, Aufräumen). `tests/names.test.mjs`: Schreibweisen, Schnellwahl. `tests/cook.test.mjs`: Schritte. `tests/news.test.mjs`: „Neu von …“. `tests/browser.test.mjs` prüft zusätzlich das zugeklappte Formular, das Antippen von Zeilen, die Einstellungen und den `?add=`-Link. `tests/shop.test.mjs`: Modus „Im Laden“ (Geschäft wählen, Artikel ohne Geschäft, erst Edeka dann Lidl).
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

