# Sattplan 2.90 – Geschäfte, Produktbilder und geheime Liste

## Sichtbare Änderungen

- **Geschäftsaktionen:** Speichern ist nur bei offenen Änderungen aktiv. Nach erfolgreichem lokalen Speichern erscheint der graue Knopf „Gespeichert um HH:MM Uhr“. Auch der erste Tipp aus einem noch fokussierten Eingabefeld funktioniert; andere offene Karten behalten ihre Entwürfe. Gangpfeile, Standardreihenfolge, Händlerauswahl, Hinzufügen und Löschen haben große, umrandete oder gefüllte Flächen mit klaren Zuständen.
- **Symbolwahl:** Native, antippbare Radiokacheln zeigen Name oder „Symbol 1“ bis „Symbol 6“ direkt mit Grafik und Bedeutung: Geschenke, Apotheke, Reisen, Haushalt, Aufgaben, Tierbedarf. In der Verwaltung bleibt der Listenname neben dem Symbol sichtbar. Alle Motive liegen lokal im SVG-Sprite, ohne Bilddienst oder laufende Kosten.
- **Eigene Listen:** Direkt beim Anlegen auswählbar. Händler, Logos, Angebote und Gangzuordnungen entfallen für eigene Listen – auch wenn ein Händlername im Listennamen steht oder alte Verknüpfungen vorhanden waren. Ihre bisherigen Ausschlüsse aus Alle, Supermärkten, Rezeptbedarf und gemeinsamen Einkaufsabläufen bleiben erhalten.
- **Produktbilder:** Bekannte eingetippte Produkte wie Milch oder Zahnpasta verwenden auch in eigenen Listen die vorhandenen Produktbilder. Andere Wünsche behalten Gruppenmotive. „Bild entfernen“ unterdrückt auch ein bekanntes Produktbild dauerhaft; die persönliche Einstellung „Produktbilder anzeigen“ bleibt wirksam.
- **Geheime Liste:** In Einstellungen → Geschäfte & Listen oder in der Geschäftsverwaltung aktivierbar. Der Schloss-Reiter „Geheim“ besitzt eigene Einträge, private Notizen, Haken und lokale Produktbilder. Ausschalten behält die Einträge; erneutes Aktivieren und Neuladen stellt sie auf demselben Gerät wieder her.

## Speicherung und Privatsphäre

Die geheime Liste verwendet ausschließlich einen eigenen Schlüssel im lokalen Browser/App-Speicher, getrennt je Haushalt. Sie wird niemals in die gemeinsamen Sammlungen `stores`, `items`, Vorlagen, Rezeptbedarf, Einkaufsverlauf oder Synchronisationsoperationen eingefügt. Es gibt keinen Aufruf der GitHub-Synchronisation aus ihrem Datenmodul. Das Partnergerät erhält weder die Aktivierung noch die Einträge.

Gemeinsame JSON-Sicherungen und ZIP-Vollsicherungen enthalten diese Liste nicht. Beim Löschen der Browserdaten gehen ihre Inhalte verloren; dies steht an der Liste. Andere Browser oder Geräte haben jeweils einen eigenen privaten Speicher. Die Initialisierung respektiert die bestehende Sperre gegen gleichzeitig schreibende App-Tabs.

Die bestehenden gemeinsamen Daten bleiben im Format v1. Zusätzliche Reitersymbole aktivieren erst bei ihrer tatsächlichen Auswahl den vorhandenen Aktualisierungsschutz mit Datenrevision 12. Unveränderte Felder einer Geschäftskarte werden nicht erneut geschrieben; parallele Änderungen am Symbol eines anderen Geräts bleiben beim Speichern eines neuen Namens erhalten.

## Genaue Code-Stellen

| Bereich | Dateien und Stellen |
| --- | --- |
| Geschäftsbuttons und Speicherstatus | [app.js](../../app.js): `storeEditorRow`, `storePatch`, `updateSave`, `syncNewStoreForm`; [styles.css](../../styles.css): Abschnitt „Geschäfte und eigene Listen“; [index.html](../../index.html): `#store-form`. |
| Symbole | [list-symbols.js](../../list-symbols.js), [brand.js](../../brand.js): `symbolOf`; [app.js](../../app.js): `storeSymbolPicker`; [index.html](../../index.html): SVG-Symbole `i-pharmacy`, `i-travel`, `i-home`, `i-checklist`, `i-pets`; [data.js](../../data.js): Validierung und Revisionsschutz. |
| Bilder und Händlertrennung | [wish-images.js](../../wish-images.js): `wishGroup`, `wishImage`; [brand.js](../../brand.js): `chainForStore`; [prices.js](../../prices.js): `storeOfferUrl`; [app.js](../../app.js): `storeLabel`, `renderWishImage`, `syncStoreKind`. |
| Geheime Daten | [private-list.js](../../private-list.js): eigene Validierung, Schlüssel, Lesen und atomisches Schreiben; [private-list-view.js](../../private-list-view.js): Aktivierung und eigene Formulare ohne gemeinsamen Datenzugriff. |
| Geheim-Reiter und Oberfläche | [app.js](../../app.js): `PRIVATE_VIEW`, `syncPrivateView`, `renderStoreChips`, Initialisierung unter `start`; [index.html](../../index.html): `#private-list-panel`, `#private-item-dialog`, `#settings-private-list`, `#stores-private-list`. |
| Offline und Anleitung | [sw.js](../../sw.js): Paket `einkauf-shell-v102` einschließlich der drei neuen Module; [README.md](../../README.md), [help.js](../../help.js). |

## Kurze Klick-Testliste

1. Geschäftsname ändern und bei noch fokussiertem Feld einmal Speichern tippen. Danach muss der Knopf grau mit Uhrzeit sein. Eine weitere Änderung aktiviert ihn; Rückkehr zum gespeicherten Wert deaktiviert ihn wieder. Eine zweite offene Geschäftskarte darf ihren ungespeicherten Text nicht verlieren.
2. Gangreihenfolge umstellen und zurückstellen. Große Pfeile, klare Standardreihenfolge-Aktion und korrekter Speicherzustand müssen erhalten bleiben.
3. Eigene Liste anlegen, „Symbol 1“ mit Geschenk und die weiteren Symbole ausprobieren. Apotheke auswählen, speichern und App neu laden. Die Grafik muss auch auf einem zweiten synchronisierten Gerät erhalten bleiben. Händler-/Angebotsfelder dürfen in eigenen Listen nicht erscheinen.
4. Milch, Zahnpasta und Orangensaft in eine eigene Liste tippen. Die bekannten Bilder müssen erscheinen, die Einträge weiter ausschließlich in dieser Liste stehen. Bild entfernen, speichern und neu laden: es darf nicht wieder auftauchen.
5. Geheime Liste auf Gerät A aktivieren und einen Eintrag mit privater Notiz hinzufügen. Gerät B darf weder den Reiter automatisch erhalten noch den Inhalt sehen. Gemeinsame JSON- und ZIP-Sicherungen dürfen den Eintrag nicht enthalten. Ausschalten und auf Gerät A wieder aktivieren muss ihn wiederherstellen.
6. Privaten Eintrag abhaken, erneut öffnen, ändern und löschen. Keine dieser Aktionen darf die gemeinsame Einkaufsliste oder Rezeptvorschläge verändern.

## Prüfungen

Die automatisierten Fälle stehen in [tests/private-list.test.mjs](../../tests/private-list.test.mjs), [tests/product-groups.test.mjs](../../tests/product-groups.test.mjs), [tests/brand.test.mjs](../../tests/brand.test.mjs), [tests/templates.test.mjs](../../tests/templates.test.mjs) und [tests/browser.test.mjs](../../tests/browser.test.mjs) unter dem Präfix `2.90:`.

Die Browserfälle prüfen echte Klicks aus fokussierten Feldern, schmale Ansichten in Hell/Dunkel, Speicherfehler ohne falsche Bestätigung, unveränderte Nachbarkarten, zwei Geräte, Produktbilder und unterdrückte Bilder. Die private Liste wird zusätzlich gegen Partneransicht, GitHub-Inhalt sowie beide gemeinsamen Backup-Arten geprüft. Die Darstellung wurde in lokalem Chromium mit iPhone-Profil untersucht; ein echtes iPhone mit Safari wurde nicht verwendet.

Prüfergebnis: **460 Logikprüfungen und 26 unterschiedliche mobile Browserfälle bestanden**. Die Browserprüfungen decken neue und bestehende Abläufe einschließlich beider gemeinsamer Sicherungen, Partnergerät, Speicherfehlern und dem ersten Speichertipp aus einem fokussierten Feld ab. Syntaxprüfungen und `git diff --check` sind erfolgreich.
