# Sattplan 2.91 – Listenverwaltung und Geheim-Haken

## Sichtbare Änderungen

- Nach der letzten vorhandenen Geschäftskarte steht **+ Liste oder Geschäft hinzufügen**. Erst Antippen öffnet das Formular. Beim erneuten Öffnen der Verwaltung ist es wieder geschlossen; nach erfolgreichem Anlegen ebenfalls. Die bisherigen Wünsche-/Geheim-Aktivierungskarten entfallen dort.
- Zusätzliche Reitersymbole sind ausschließlich bei eigenen Listen verfügbar. Supermärkte erhalten keine Symbolauswahl und zeigen auch keine früher gespeicherten Extrasymbole mehr. Ihre gespeicherten Daten werden dafür nicht gelöscht.
- **Symbol 7 · Geheim** zeigt ein Schloss. Nur hier steht der Haken **Diese Liste ist geheim**, sowohl beim Anlegen als auch beim Bearbeiten. Neue Listen mit diesem Symbol sind zunächst geheim. Ohne Haken ist das Schloss offen; tatsächlich geheime Listen haben ein geschlossenes Schloss.
- Mehrere benannte geheime Listen sind möglich. Die Verwaltung bietet Name, Symbol, Geheim-Haken, Speicherstatus, **Liste öffnen** und bewusst beschriftetes lokales Löschen. Der Speicherknopf zeigt nach Erfolg die Uhrzeit und wird bei unveränderten Eingaben deaktiviert.

## Speicherung und Wechsel der Sichtbarkeit

Neue geheime Listen werden ausschließlich lokal im Browser/App-Speicher des anlegenden Geräts geführt, getrennt je Haushalt. Ihre Inhalte gelangen nicht in gemeinsame Geschäfte, Artikel, Vorlagen, Einkaufsverlauf, GitHub oder JSON-/ZIP-Sicherungen. Das Partnergerät sieht weder Liste noch Einträge. Vorhandene Produktbilder können lokal verwendet werden, ohne Händlerverknüpfung.

Der bisherige lokale Speicher im Format v1 bleibt lesbar. Auch eine früher deaktivierte Geheim-Liste mit Einträgen bleibt erhalten und lässt sich in der Verwaltung öffnen. Mehrere Listen erhalten ergänzende lokale Metadaten; das gemeinsame Datenformat bleibt v1. Das gemeinsame, offene Schloss-Symbol aktiviert erst bei tatsächlicher Verwendung den vorhandenen Aktualisierungsschutz mit Revision 13.

**Gemeinsam → geheim:** Vor der Umstellung erklärt eine Bestätigung, dass eine lokale Kopie entsteht und die bisher gemeinsame Liste ausgeblendet wird. Bereits geteilte Artikel, frühere gemeinsame Daten und Sicherungen bleiben bestehen. Eine solche Umstellung kann frühere Kenntnis nicht rückgängig machen. Neue private Änderungen bleiben anschließend ausschließlich lokal. Schlägt das Ausblenden fehl, wird die neue lokale Kopie zurückgenommen.

**Geheim → gemeinsam:** Haken entfernen oder anderes Symbol wählen bereitet die Freigabe nur vor. Erst Speichern und eine ausdrückliche Bestätigung erzeugen die gemeinsame eigene Liste. Namen, Notizen, Haken und vorhandene Mengen/Einheiten bleiben erhalten. Bei fehlgeschlagenem gemeinsamen Speichern bleibt das lokale Original erhalten. Vorab lokal gespeicherte Ziel-IDs verhindern doppelte Listen und Artikel bei einem erneuten Versuch. Eine fehlgeschlagene lokale Bereinigung nach erfolgreicher Freigabe meldet ausdrücklich, dass bereits geteilt wurde.

Browserdaten löschen entfernt geheime Listen dauerhaft; gemeinsame Sicherungen enthalten sie nicht. Die geheime Liste schützt vor der Familienfreigabe innerhalb der App und verwendet den lokalen Speicher des jeweiligen Browsers.

## Code-Stellen

| Bereich | Dateien |
| --- | --- |
| Plus-Formular, SVG-Schlösser, entfallene Aktivierungskarten | [index.html](../index.html), [styles.css](../styles.css) |
| Eigene Symbole, Geheim-Haken, Umstellung und lokale Geschäftskarten | [app.js](../app.js): `storeLabel`, `listPrivacyField`, `makeSharedListPrivate`, `sharePrivateList`, `privateStoreEditorRow`, `syncNewStoreForm` |
| Lokale Mehrfachlisten und Kompatibilität | [private-list.js](../private-list.js), [private-list-view.js](../private-list-view.js) |
| Symbolkatalog und Revisionsschutz | [list-symbols.js](../list-symbols.js), [data.js](../data.js) |
| Offline-Paket und Anleitung | [sw.js](../sw.js): `einkauf-shell-v103`, [help.js](../help.js), [README.md](../README.md) |

## Kurze Klick-Testliste

1. Verwaltung öffnen: keine Aktivierungskarten und kein offenes Anlegeformular. Bis zum letzten Eintrag scrollen, Plus antippen und Formular schließen/erneut öffnen.
2. Supermarkt öffnen: keine Extrasymbole. Eigene Liste wählen: Name und Symbol 1–7 erscheinen. Nur Symbol 7 zeigt den Geheim-Haken.
3. Zwei benannte geheime Listen anlegen, verschiedene Einträge/Notizen/Haken speichern, neu laden und einzeln öffnen. Das Partnergerät sowie gemeinsame JSON-/ZIP-Sicherungen dürfen die neuen privaten Inhalte nicht enthalten.
4. Geheim-Haken entfernen und Freigabe abbrechen: Liste bleibt privat, auch nach Neuladen. Danach bewusst bestätigen: Liste erscheint gemeinsam mit unveränderten Einträgen, Mengen und Notizen.
5. Vorhandene gemeinsame eigene Liste geheim stellen: Erklärung bestätigen, bisherige gemeinsame Liste wird ausgeblendet. Künftige private Änderungen dürfen nicht im gemeinsamen Stand erscheinen.
6. Ältere lokale Geheim-Liste öffnen und vorhandene Einträge erhalten. Einen fehlgeschlagenen gemeinsamen Speicherversuch wiederholen: lokaler Inhalt bleibt erhalten, keine doppelten Zielartikel.

## Prüfungen

**463 Logikprüfungen und 19 gezielte Browserfälle bestanden.** Die Browserfälle umfassen die neuen Abläufe sowie bestehende Speicherbuttons, Produktbilder, Händlerauswahl und Gangreihenfolge. Die neuen Fälle prüfen zwei getrennte Geräte, beide gemeinsamen Sicherungen, mehrere lokale Listen, alte lokale Daten, bestätigte/abgebrochene Sichtbarkeitswechsel und Wiederholungen nach Speicherfehlern.

Die mobile Darstellung wurde in Chromium mit iPhone-Profil in Hell/Dunkel und bei 320/390 Pixel Breite geprüft. Ein physisches iPhone mit Safari wurde nicht verwendet.
