# Sattplan 2.88 – Aufgabenplan vom 01.11.2026

Die fünf Änderungen folgen dem angehängten Aufgabenplan. Neue Bedienelemente verwenden die bestehenden Farben, Rundungen und Dialogflächen; gespeicherte Haushaltsdaten und das Datenformat bleiben unverändert. Die vorbereiteten Importkorrekturen aus Version 2.87 sind ebenfalls enthalten.

| Aufgabe | Umsetzung | Genaue Code-Stellen |
| --- | --- | --- |
| 1. Import verwerfen | Unter „Rezept speichern“ steht der gleich breite, zurückhaltend umrandete Knopf „Eingelesenes Rezept verwerfen“. Er schließt ohne Rückfrage und entfernt Formularinhalt, Rohtext, Foto und lokalen Importentwurf; andere Entwürfe bleiben erhalten, verspätete Fotoverarbeitung wird ignoriert. | [index.html](../../index.html): `#recipe-form > .sheet-actions`, `#discard-imported-recipe`; [app.js](../../app.js): `editRecipe`, `offerRecipeDraft`, `discardImportedRecipe`, `photoEditVersion` und Foto-Ereignisse; [styles.css](../../styles.css): abschließender Abschnitt „Importentwürfe“. |
| 2. Ausgabenliste einklappen | Die antippbare Anzahl klappt ausschließlich die Einträge ein oder aus; ein sanft drehender Pfeil zeigt den Zustand. Summen und Personenblock bleiben sichtbar, Filter aktualisieren die Anzahl auch zugeklappt; beim neuen Laden ist die Liste offen. | [index.html](../../index.html): `#purchase-details`; [spending-view.js](../../spending-view.js): `refresh` und `render`; [styles.css](../../styles.css): `.purchase-details`. |
| 3. Rezept abwählen | Erneutes Antippen hebt Markierung, Haken und PDF-Hinweis auf; beide Speicheraktionen werden deaktiviert und die Vorratszeile ausgeblendet. Wechseln und langes Drücken bleiben erhalten, Bewegung beim Halten löst keine versehentliche Abwahl aus. | [app.js](../../app.js): `syncMealForm`, `#recipe-pick`-Ereignisse, `pickOrigin`; vorhandene Auswahlgestaltung bleibt wirksam. |
| 4. Gericht entfernen | Sind keine zugeordneten offenen Zutaten mehr vorhanden, heißt die untere Aktion „Gericht entfernen – Zutaten sind bereits vom Einkaufszettel entfernt“ und verändert nur den Plan. Beide Knöpfe verwenden dieselbe bestehende Mengenprüfung; bei teilweise vorhandenen Zutaten bleiben die bisherigen Aktionen erhalten. | [app.js](../../app.js): `renderPlanAdjustment`, `byItem.size`, `#plan-adjust-apply`, `#plan-adjust-keep`; die bestehende Verarbeitung in `finishPlanAdjustment` bleibt unverändert. |
| 5. Portionen per Pfeilen | Nur im Planungsdialog ist das Zahlenfeld schreibgeschützt, ohne Tastatureingabe oder bleibenden Fokus; rechts liegen zwei 48 × 54 Pixel große Pfeile. Sie ändern um jeweils 1, sperren Abwärts bei 1 und erhalten Startwerte sowie die Auswirkung auf Zutatenmengen. | [index.html](../../index.html): `#meal-servings`, `#meal-portions-down`, `#meal-portions-up`; [app.js](../../app.js): `syncMealForm` und Portions-Ereignisse; [styles.css](../../styles.css): `.meal-portions-control`. |

Anleitung und Versionshinweise stehen in [help.js](../../help.js) und [README.md](../../README.md). [sw.js](../../sw.js) erhöht das Offline-Paket auf `einkauf-shell-v100`.

## Getroffene Annahmen

- Der Einklappzustand gilt für die laufende Sitzung, einschließlich Reiter- und Filterwechsel; erneutes Laden startet aufgeklappt.
- Es gibt keine neue Portionsobergrenze, damit bereits vorhandene hohe Werte erhalten bleiben. Mindestwert ist 1.
- Bei alten Plänen ohne belastbare Zutatenzuordnung lautet die untere Aktion neutral „Nur das Gericht entfernen – Einkaufsliste unverändert lassen“. Die App behauptet bei diesen Altdaten keine nachgewiesene frühere Entfernung.
- Das gewöhnliche Schließen eines Rezeptfensters bewahrt weiter den Entwurf. Erst das ausdrückliche Verwerfen entfernt ihn.

## Kurze Testliste zum Durchklicken

1. **Rezepte → Import → Text:** Rezept einlesen, Felder ändern und Foto ergänzen. Unter „Rezept speichern“ auf **Eingelesenes Rezept verwerfen** tippen. Es darf kein Rezept entstehen; der nächste Import darf keine alten Inhalte enthalten. Anschließend einen frischen Import speichern.
2. **Ausgaben:** Auf die Eintragsanzahl tippen, Personenfilter wechseln, wieder aufklappen. Anzahl, Summen und angezeigte Einträge müssen zusammenpassen; der Personenblock bleibt stehen. Den letzten Eintrag bis oberhalb der unteren Navigation scrollen.
3. **Plan → Gericht planen:** Dasselbe Rezept dreimal antippen: gewählt, abgewählt, gewählt. Ohne Auswahl sind beide Speicherknöpfe grau und der Vorratshinweis weg. Langes Drücken zeigt weiterhin das Rezeptblatt, Bewegung beim Halten wählt nichts ab.
4. **Gericht entfernen:** Einmal mit vorhandenen, einmal mit teilweise entfernten und einmal mit vollständig entfernten Einkaufszutaten testen. Nur im letzten Fall ist die obere Aktion deaktiviert und die untere nennt die bereits entfernten Zutaten. Diese untere Aktion darf den Einkaufszettel nicht ändern.
5. **Portionen:** Direkt auf Zahl und Beschriftung tippen: keine Tastatur. Abwärts bis 1 tippen, danach aufwärts; pro Tipp genau 1. Für 4 Portionen speichern und zugehörige Zutaten prüfen. Hell/Dunkel und einen langen Import mit vielen Zutaten ansehen: beide unteren Importknöpfe müssen erreichbar bleiben.

## Automatische Prüfung

Die neuen Browserfälle stehen in [tests/browser.test.mjs](../../tests/browser.test.mjs) unter dem Präfix `2.88:`. Sie prüfen Verwerfen samt lokalem Entwurf und Foto, verspätete Fotoverarbeitung, Einklappen samt Filtern und Navigation, Abwahl ohne veraltetes Speichern, beide Mengenfälle beim Entfernen sowie mobile Darstellung und Portionswirkung bei 320 und 390 Pixel Breite.

Die Browserprüfung verwendet lokales Chromium mit iPhone-Profil und simulierte externe Dienste; sie ersetzt keinen Test auf einem echten iPhone mit Safari. Die bereits vorbereiteten Importprüfungen decken die sofort gültige Hilfsdienstfreigabe und den grünen Haltefortschritt beim Abbrechen ab. Direkte Abrufe echter Rezeptseiten sind durch die Netzwerkfreigaben dieser Arbeitsumgebung eingeschränkt.

Ergebnis: **449 Logikprüfungen und 39 unterschiedliche mobile Browserfälle bestanden**. Ein in der Gestenprüfung entdeckter Fall (Verschieben beim Halten darf nicht abwählen) wurde korrigiert und mit den betroffenen Maus-, Touch- und Kontextmenüfällen erneut erfolgreich geprüft. Syntaxprüfung und `git diff --check` sind ebenfalls erfolgreich.
