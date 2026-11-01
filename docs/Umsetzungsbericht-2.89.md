# Sattplan 2.89 – Wochenplan und Rezeptaktionen

Umsetzung der beiden Aufgabenpläne zu vergangenen Tagen, Rezeptansicht, Zutatenabfrage und Navigation. Neue Elemente folgen der gewählten App-Farbe sowie Hell-/Dunkeldarstellung. Die private Datendatei und ihr Format werden nicht geändert.

## Änderungen und genaue Code-Stellen

1. **Vergangene Gerichte:** 600 ms Halten öffnet die Frage „Gericht aus der Übersicht entfernen, da nicht gekocht?“ mit Name, Tag und gleich großen Ja/Nein-Knöpfen. Ja schreibt nur die Löschmarkierung des Planeintrags, Nein schließt unverändert; Rezept, Einkaufszutaten und Kochdatum bleiben erhalten. Die vorhandene graue Darstellung und das kurze Antippen bleiben bestehen. Bewegung, Abbruch, Scrollen, zweiter Finger und Hintergrundwechsel stoppen den Timer; Loslassen nach erkanntem Halten löst keinen zusätzlichen Tipp aus. In [app.js](../app.js) betreffen die Änderungen `mealRow`, `pastMealPending`, `stopPastMealHold` und `#past-meal-yes`; [index.html](../index.html) ergänzt `#past-meal-dialog`, [styles.css](../styles.css) die gezielte iPhone-Textauswahl-/Kontextmenüsperre und `.past-meal-actions`.
2. **Rezeptaktionen:** Der separate Detailknopf „Heute gekocht“ und sein ausschließlich dort verwendeter Handler entfallen. „Bearbeiten“ und „Rezept dauerhaft aus dem Rezeptbuch löschen“ stehen gleich groß untereinander, mit gleichem Rahmen und roten Buchstaben nur für Löschen; Einplanen und Rezeptblatt erhalten Rahmen und leichte Flächen. Derselbe eindeutige Löschtext steht auch im Editor vorhandener Rezepte, mit passender Sicherheitsabfrage. Die gemeinsame Umsetzung liegt in [app.js](../app.js): `recipeCard`, `RECIPE_DELETE_LABEL`, `deleteRecipe`, `editRecipe`; [index.html](../index.html): `#delete-recipe`; [styles.css](../styles.css): `.recipe-manage-button`, `.recipe-delete`, `.recipe-outline`.
3. **Zutatenabfrage:** Bei teilweise entfernten Zuordnungen nennt die obere Aktion die restliche Anzahl, einschließlich der Einzahl „Ja, restliche Zutat auch vom Einkaufszettel entfernen“. Die Infozeile nennt den entfernten Anteil; bei vollständig fehlenden zugeordneten Mengen ist die obere Aktion ausgeblendet. Untere Aktion, Abbrechen und Schutz vorhandener manueller oder anderer Rezeptanteile bleiben erhalten. Die Zählung nutzt die bestehende Mengenprüfung in [plan-list.js](../plan-list.js), ergänzt um `planRemovalCounts`; die Darstellung erfolgt in `renderPlanAdjustment` in [app.js](../app.js) sowie `#plan-adjust-remaining` in [index.html](../index.html).
4. **Navigation:** Weiter ist als Hauptaktion gefüllt, Zurück hell umrandet, „Zur Übersicht zurück“ steht darunter über die volle Breite. Alle drei haben passende Symbole, mindestens 48 px Höhe, klare Abstände, Druckeffekt und sichtbaren Tastaturfokus; Navigation und Freigaben bleiben bestehen. Betroffen sind die drei `#daily-review-*`-Knöpfe in [index.html](../index.html) und die entsprechenden Regeln am Ende von [styles.css](../styles.css).

Versionshinweise und Anleitung stehen in [README.md](../README.md) und [help.js](../help.js). [sw.js](../sw.js) erhöht das Offline-Paket auf `einkauf-shell-v101`.

## Bewusste Abgrenzungen

- Gezählt werden tatsächlich zugeordnete Einkaufszeilen, nicht Zutaten, die wegen Vorrat oder Abwahl nie übernommen wurden. Mehrere Rezeptübernahmen in dieselbe Einkaufszeile zählen einmal.
- Bei Altdaten ohne vollständige Zuordnung werden keine genauen Mengenverhältnisse geraten; der bisherige Hinweis zur manuellen Prüfung bleibt bestehen. Bereits gekaufte, verschobene oder manuell neu gesetzte Quellen werden weiterhin nicht verändert.
- **Fertig · Heute gekocht** im Kochmodus und die Haken im Wochenplan bleiben erhalten, da sie das Kochdatum tatsächlich speichern. Entfernt wurde ausschließlich der separate Knopf in den Rezeptdetails.
- Dauerhaftes Rezeptlöschen ist von der Entfernung eines Planeintrags getrennt. Der neue Editor-Löschknopf erscheint nur bei bereits gespeicherten Rezepten, nicht bei neuen oder importierten Entwürfen.
- Wurde ein vergangenes Gericht während der Bestätigung auf einem anderen Gerät verändert, verhindert die Prüfung das Löschen eines veralteten Stands.

## Kurzer Klicktest

1. Im Wochenplan ein vergangenes Gericht kurz antippen: Rezeptansicht wie bisher. Danach ungefähr 0,6 Sekunden halten: Frage mit Name und Tag. **Nein** lässt alles unverändert; **Ja** entfernt nur den Planeintrag, auch wenn dessen Zutaten schon übernommen wurden.
2. Während des Haltens den Finger bewegen oder scrollen: keine Frage. Heute und zukünftige Gerichte weiter wie bisher bearbeiten, abhaken und verschieben. Auf dem iPhone zusätzlich prüfen, dass keine Lupe, Markierung oder native Kontextmenüs erscheinen.
3. Rezept aus Plan und Rezeptbuch öffnen: kein separater „Heute gekocht“-Knopf; Bearbeiten/Löschen gleich groß; Einplanen/Rezeptblatt umrandet. Dauerhaftes Löschen zunächst abbrechen, anschließend bei einem Testrezept bestätigen. Der normale Kochabschluss muss weiter funktionieren.
4. Ein Gericht mit fünf übernommenen Zutaten entfernen: zunächst Standardtext. Nach zwei manuell entfernten Artikeln müssen „restliche 3 Zutaten“ und „2 von 5 Zutaten …“ erscheinen. Bei einem Rest gilt die Einzahl; bei keinem Rest ist die obere Aktion weg. Gekaufte, verschobene und manuell neu gesetzte Mengen bleiben geschützt.
5. Tagesrezepte abschließen und im Rückblick Zurück/Weiter verwenden. Gleiche Größen, Symbole und klare Flächen prüfen; am Anfang/Ende bleibt die jeweilige Richtung deaktiviert. **Zur Übersicht zurück** führt zurück, ohne Fortschritt zu verändern.

## Prüfung und vollständige Dateien

Neue automatisierte Fälle stehen in [tests/plan.test.mjs](../tests/plan.test.mjs) und [tests/browser.test.mjs](../tests/browser.test.mjs) unter dem Präfix `2.89:`. Die Browserprüfung nutzt lokales Chromium mit iPhone-Profil, einschließlich echter Touch-Ereignisse, sowie schmale Ansichten in Hell und Dunkel. Ein reales iPhone mit Safari wurde in dieser Arbeitsumgebung nicht verwendet.

Das zur Veröffentlichung bereitgestellte ZIP enthält alle geänderten Dateien vollständig, einschließlich dieser Dokumentation und der Prüfungen. Die App besteht weiterhin aus statischen Dateien und benötigt keinen Build.

Prüfergebnis: **451 Logikprüfungen und 39 unterschiedliche mobile Browserfälle bestanden**. Zusätzlich wurden die neuen Rahmen und die identische Löschgestaltung im Glas-Design in Hell/Dunkel geprüft. Die Kontrolle umfasst Maus, echte Touch-Ereignisse, Abbruch beim Scrollen/Bewegen und die unveränderten heutigen/künftigen Planfunktionen. Syntaxprüfungen und `git diff --check` sind erfolgreich.
