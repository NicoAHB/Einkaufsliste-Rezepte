# Einkauf & Rezepte – Version 1.3

Eine deutsche Web-App für zwei Personen: auf dem iPhone große Bedienelemente, drei Bereiche, Rezept-Import aus Links, Screenshots und Text und Speicherung in einem privaten GitHub-Repository. Die App besteht aus normalen HTML-, CSS- und JavaScript-Dateien. **Für die Nutzung brauchst du keinen Server, kein Terminal und keine Installation.** GitHub Pages liefert die öffentlichen App-Dateien aus; private Daten werden mit deinem persönlichen Token direkt über die GitHub-API gelesen und geschrieben.

## 1. Was diese Version kann

- Einkaufsliste je Geschäft: Edeka, Lidl, Rewe; weitere Geschäfte anlegen, umbenennen und löschen.
- Artikel mit Menge, Einheit und dem Namen der Person hinzufügen und bearbeiten; abhaken, löschen und erledigte Artikel gemeinsam entfernen. Erledigtes steht unten.
- Pro Geschäft einstellbare Angebotslinks, manuell notierte Preise mit Bezugsmenge, Angebotsmarkierungen, letzter Preisvergleich und geschätzte Summe der noch offenen Artikel.
- Die letzte Löschaktion rückgängig machen, solange die Seite geöffnet bleibt. Häkchen werden durch erneutes Antippen geändert, ohne Rückgängig-Meldung.
- Beim Tippen passende Artikelnamen aus eurem bisherigen Einkaufsverlauf übernehmen, auch nach dem Löschen und offline.
- Rezepte mit einzelnen Zutaten, Zubereitung, Portionen, Tags und optionaler Quelle anlegen, bearbeiten, löschen; nach Rezept/Zutat/Tag suchen und nach Tag filtern. **Neu:** Import aus Link, Screenshot und Text (Abschnitt „Neu in Version 1.3“).
- Portionen umrechnen. Beim Übernehmen Zutaten einzeln abwählen, Geschäft auswählen und nur die gewählten Zutaten hinzufügen.
- Beispielmodus ohne GitHub, drei Beispielrezepte und eine über drei Geschäfte verteilte Beispielliste.
- GitHub-Abgleich per Button und alle acht Sekunden bei sichtbarer App; lokale Offline-Warteschlange; Backup-Export; heller und dunkler Modus; Homescreen und Offline-Start nach dem ersten erfolgreichen Online-Aufruf.

**Absichtlich erst in einem nächsten Schritt:** Kategorien und gemerkte Kategorie, Schnellauswahl häufiger Artikel, Zusammenzählen gleicher Artikel, Zwiebel/Zwiebeln-Erkennung, Rezeptfotos, Wochenplan und Vorratsliste. Die Preisberechnung rechnet bereits g/kg und ml/l um; Artikel selbst werden noch nicht automatisch zusammengelegt. Gleiche Artikel bleiben in dieser Version getrennt. Es gibt keine Vorratsliste. Rezepte und Zutaten liegen bereits einzeln vor, damit Erweiterungen darauf aufbauen können.

## Neu in Version 1.3: Rezept-Import, überarbeitete Oberfläche, technische Korrekturen

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
- **Gemeinsam lernen:** Die Namen stammen aus den vorhandenen Artikeldaten, einschließlich interner Löschmarkierungen. Deshalb sind keine zusätzliche Datei und kein externer Dienst nötig. Im verbundenen Modus bekommen beide Geräte die Vorschläge nach dem GitHub-Abgleich; im Beispielmodus bleiben sie auf dem jeweiligen Gerät. Bereits geladene Namen funktionieren auch offline.
- **Abhaken ohne Meldung:** Ein Häkchen erneut antippen, um den Artikel wieder zu öffnen. Dabei erscheint kein Rückgängig-Balken. Für gelöschte Artikel, erledigte Artikel und gelöschte Rezepte/Geschäfte bleibt die Lösch-Rückgängig-Funktion erhalten.
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

**Bestehende App aktualisieren:** Die neuen App-Dateien (siehe Dateiliste in Abschnitt 3, ab Version 1.3 zusätzlich `recipe-import.js`, `page-source.js`, `ocr.js`, die Symbole `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` und der Ordner `vendor`) im öffentlichen App-Repository ersetzen bzw. hinzufügen. Beim ersten Öffnen nach einem Update zeigt die App „Neue Version bereit“; auf **Neu laden** tippen. Die private `daten.json` unverändert lassen. Nach erfolgreicher Pages-Veröffentlichung die App online öffnen und einmal neu laden, damit das neue Offline-Paket aktiv wird. Namen, Verbindungseinstellungen und noch nicht gesendete Änderungen bleiben im selben Browserspeicher erhalten; Browserdaten dafür nicht löschen. Neue und alte v1-Datendateien sind kompatibel. Geräte mit älterer App sollten ebenfalls aktualisiert werden, damit beide Personen Preise und Angebotslinks bearbeiten können.

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
6. Im Repo **Code → Add file → Upload files** wählen. `index.html`, `styles.css`, `app.js`, `data.js`, `prices.js`, `recipe-import.js`, `page-source.js`, `ocr.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `beispieldaten.json`, `.nojekyll` und `README.md` sowie den **Ordner `vendor`** (Texterkennung, ca. 9 MB; den Ordner per Drag & Drop auf die Upload-Seite ziehen) gemeinsam hochladen. Alles muss so liegen wie im Repository, die Dateien **direkt im Hauptordner**. Die Ordner `tests` und `worker` sowie `package.json` sind für die App nicht erforderlich (`worker/recipe-proxy.js` brauchst du nur für Abschnitt 13, und zwar bei Cloudflare, nicht auf GitHub).
7. Unten **Commit changes** wählen. Wenn du nach dem Branch gefragt wirst: `main`.

Du kannst Textdateien auch einzeln über **Add file → Create new file** anlegen: Dateinamen eingeben, vollständigen Inhalt hineinkopieren, speichern. Das PNG-Bild bitte als Datei hochladen. **Keine persönlichen Daten und niemals einen Token öffentlich hochladen.** Die Beispielrezepte sind bewusst öffentlich und erfunden.

## 4. GitHub Pages einschalten

1. Im **öffentlichen App-Repo** auf **Settings** klicken.
2. Links **Pages** wählen.
3. Bei **Build and deployment → Source**: **Deploy from a branch**.
4. Branch **main**, Ordner **/ (root)** auswählen und **Save** drücken.
5. Warten, bis unter **Actions** der Pages-Lauf erfolgreich ist; das kann einige Minuten dauern.
6. Unter **Settings → Pages** den angezeigten Link öffnen. Für das persönliche Repo lautet er normalerweise `https://nicoahb.github.io/Einkaufsliste-Rezepte/`.
7. Deinen Namen auswählen. Zunächst läuft die App im deutlich markierten **Beispielmodus**. Hier kannst du gefahrlos ausprobieren. Diese Änderungen werden beim Verbinden **nicht** automatisch ins private Repo kopiert.

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
7. Warten, bis oben **Mit GitHub abgeglichen** (grüner Punkt) erscheint und der Beispielmodus-Hinweis verschwindet.
8. Auf dem zweiten Gerät dasselbe mit dem **eigenen** Token wiederholen. Beide Geräte müssen denselben Eigentümer, Repository-Namen, Branch und Dateinamen benutzen.
9. Als Probe einen Artikel hinzufügen und auf dem zweiten Gerät **Aktualisieren** drücken. Nach spätestens dem nächsten erfolgreichen Abgleich sollte er erscheinen.

**Homescreen auf dem iPhone:** Den Link in Safari öffnen → Teilen-Symbol → **Zum Home-Bildschirm** → bei angebotener Option **Als Web-App öffnen** aktivieren → **Hinzufügen**. Anschließend die App über das neue Symbol öffnen. Falls Safari und die Homescreen-App getrennte Speicher nutzen, dort den eigenen Token und Namen noch einmal eingeben. Es wird keine native App aus dem App Store installiert.

## 8. Speichern, offline arbeiten und Fehler verstehen

- Jede Änderung wird **zuerst lokal gespeichert**. Im GitHub-Modus werden ausstehende Änderungen zusätzlich in einer dauerhaften Warteschlange gespeichert. Bei vollem oder gesperrtem Browserspeicher erscheint ein Fehler; die Änderung wird dann nicht als übernommen dargestellt.
- Der Status steht oben unter dem Titel, mit farbigem Punkt: **Gleiche ab …** (blinkend): ein GitHub-Abgleich läuft. **Mit GitHub abgeglichen** (grün): keine ausstehenden lokalen Änderungen. **n Änderung(en) warten** (orange) oder **Fehler · lokal gesichert** (rot): GitHub hat die Änderung noch nicht bestätigt. **Nur auf diesem Gerät**: Beispielmodus.
- Ohne Empfang kannst du nach einem vorherigen erfolgreichen Laden weiterarbeiten. Lass die App bei wiederhergestelltem Empfang geöffnet oder öffne sie erneut. **iOS synchronisiert diese App nicht zuverlässig im Hintergrund.**
- Die App lädt bei sichtbarer Seite alle acht Sekunden neu. Bei Fehlern wartet sie länger; GitHubs Wartezeit und API-Limits werden berücksichtigt. Manuelles Aktualisieren löst einen erneuten Versuch aus.
- **Ungültiger/abgelaufener Token (401):** über die Anleitung in Abschnitt 6 einen neuen erstellen und auf dem Gerät unter Einstellungen ersetzen. Die Datenadresse dabei unverändert lassen; dann bleibt die Warteschlange erhalten. Nicht den Browser-Speicher löschen.
- **Kein Zugriff (403):** Mitgliedschaft, Write-Rolle, Contents-Berechtigung und Token-Freigabe prüfen. GitHub kann auch wegen eines API-Limits 403 melden. Dann abwarten. Beim Daten-Repo keine erzwungenen Pull Requests für App-Schreibzugriffe voraussetzen.
- **Nicht gefunden (404):** Eigentümer, Repo, `main` und `daten.json` einschließlich Groß-/Kleinschreibung prüfen. GitHub versteckt private Repos auch bei fehlenden Token-Rechten hinter 404; es ist nicht automatisch eine fehlende Datei.
- **Schreibkonflikt (409/422):** Die App lädt und mischt bis zu viermal erneut. Bleibt der Fehler, später aktualisieren und Branch-Regeln prüfen. Lokale Änderungen bleiben erhalten.
- **Rückgängig:** stellt die letzte Löschaktion wieder her. Häkchen werden ohne Meldung durch erneutes Antippen zurückgesetzt. Ein späteres Rückgängig ist selbst eine neue gemeinsame Änderung und kann daher eine zwischenzeitliche Änderung am selben Feld ersetzen. Nach Neuladen ist der Rückgängig-Knopf weg; die Daten und Warteschlange bleiben.
- **Zweiter Tab:** pro Browser-Ursprung darf nur ein App-Tab aktiv sein, damit zwei Tabs nicht dieselbe lokale Warteschlange überschreiben. Den ersten Tab schließen und den zweiten neu laden. Zwei Geräte sind ausdrücklich unterstützt.

Token und private Daten liegen unverschlüsselt im `localStorage` dieses Browsers. Es werden keine externen Skripte, Analysewerkzeuge oder Schriften geladen. Trotzdem nur auf vertrauenswürdigen Geräten verwenden und Browserdaten nicht löschen, solange Änderungen ausstehen. Andere Seiten unter demselben Pages-Ursprung gehören ebenfalls zu dieser Vertrauensgrenze. **Token entfernen** entfernt die Zugangsdaten; lokale Daten und Warteschlangen bleiben für die spätere erneute Verbindung erhalten. Für vollständiges Entfernen erst synchronisieren und sichern, dann die Website-Daten in den Geräteeinstellungen löschen. Safari im privaten Modus ist für dauerhafte Daten ungeeignet.

## 9. Datenmodell v1 und Zusammenführen

`beispieldaten.json` zeigt das vollständige Modell. Oben steht `version: 1`. Bei unbekannten Versionen verweigert diese App das Schreiben. Erweiterungen innerhalb v1 dürfen optionale Felder ergänzen; unbekannte Felder werden erhalten. Änderungen an Bedeutung oder Pflichtfeldern benötigen eine ausdrücklich getestete Migration, nicht nur eine andere Versionsnummer.

| Bereich | Inhalt |
| --- | --- |
| `stores` | `id`, `name`, Zeitstempel und Löschmarkierung |
| `items` | zusätzlich `storeId`, `name`, `quantity`, `unit`, `checked`, `createdBy`; optional `price`, `salePrice`, `onSale` |
| `recipes` | zusätzlich `name`, `servings`, `tags`, `instructions`; optional `sourceUrl` (Quelle eines importierten Rezepts) |
| `ingredients` | zusätzlich `recipeId`, `name`, `quantity`, `unit`; die Einheit `nach Bedarf` (Menge 1) steht für Zutaten ohne Mengenangabe |
| `prices` (optional) | Einzelne Preisnotizen mit ID, `storeId`, `name`, `quote`, optional `regularQuote`, `onSale` und denselben Zeitstempeln |
| `sync.applied` | IDs bereits angewendeter Änderungen; verhindert Doppelübertragung |

Ein Preis ist ein zusammengehöriges Objekt `{ "cents": 199, "quantity": 500, "unit": "g" }`: 199 Cent für 500 g. Dieses Objekt wird als ein Feld zusammengeführt, damit bei gleichzeitiger Bearbeitung Preis und Bezugsmenge nicht vermischt werden. Jede ausdrücklich geänderte Preisnotiz erhält eine eigene ID; der neueste passende Eintrag je Geschäft wird anhand von `createdAt` und ID bestimmt. Wiederholtes Senden derselben Operation erzeugt keine doppelte Preisnotiz. `stores.offersUrl` ist optional; ein leerer String deaktiviert den Link. `items.price` enthält den normalen Preis, `items.salePrice` optional den Angebotspreis mit eigener Bezugsmenge. `onSale` bestimmt, welcher Preis zur Schätzung verwendet wird. Preisnotizen enthalten in `quote` den verwendeten Preis und optional in `regularQuote` den bekannten Normalpreis. Alte Dateien ohne `prices` werden als leere Preisliste gelesen, ohne andere Daten zu verändern. Artikelvorschläge werden aus den bestehenden Artikeln abgeleitet; dafür gibt es keine neue Collection. Die Schema-Version bleibt 1, weil nur optionale Felder ergänzt wurden. Auch `recipes.sourceUrl` (Version 1.3) ist optional; ältere App-Versionen auf einem zweiten Gerät ignorieren das Feld, löschen es aber nicht.

Jeder Datensatz hat `createdAt`, `updatedAt`, `deletedAt` und `_clock`. `deletedAt: null` bedeutet nicht gelöscht. `_clock` speichert je geändertem Feld dessen Zeitstempel und Operations-ID. Eine Operation enthält `id`, `collection`, `entityId`, `patch`, `actor` und `at`.

Die App liest die aktuelle Datei samt GitHub-SHA, wendet nur ihre eigenen ausstehenden Operationen an und schreibt mit dieser SHA zurück. Ändert ein anderes Gerät die Datei dazwischen, lehnt GitHub den alten Stand ab; die App liest und mischt erneut. **GitHub speichert technisch die vollständige JSON-Datei pro Commit, nicht einzelne JSON-Felder.** Es gibt keinen blinden Ersatz durch einen veralteten Gerätestand.

Unterschiedliche Datensätze und Felder bleiben erhalten. Ändern beide dasselbe Feld, gewinnt der jüngere Zeitstempel; bei Gleichstand die Operations-ID. Dies ist kein gemeinsamer Texteditor: zwei gleichzeitige Änderungen derselben Zubereitung lassen sich nicht sinnvoll automatisch addieren. Gerätezeit automatisch einstellen. Löschen bleibt durch eine Markierung erhalten und wird durch normales Bearbeiten nicht aufgehoben. Gelöschte Rezepte verbergen ihre Zutaten; gelöschte Geschäfte verbergen ihre Artikel. Die letzte Löschaktion kann beides wieder sichtbar machen.

Diese Version ist für einen kleinen gemeinsamen Haushalt gedacht: **maximal 900 KB JSON**, noch keine Fotos. Preisnotizen sind im Backup enthalten und vergrößern die Datei ebenfalls. Löschmarkierungen und bestätigte Operations-IDs werden bewusst nicht automatisch gekürzt. Bei sehr langer Nutzung ist eine abgestimmte Kompaktierung oder Aufteilung erforderlich. Ein einseitiges Aufräumen könnte alte Offline-Änderungen doppelt anwenden; deshalb wird das hier nicht stillschweigend getan. Durch fortlaufendes Speichern entstehen Commits im privaten Repo. Daten aus alten Git-Ständen verschwinden nicht durch Löschen in der App.

## 10. Backup und Wiederherstellung

Unter **Einstellungen → Alle Daten als JSON sichern** wird der aktuelle sichtbare Datenstand einschließlich ausstehender lokaler Änderungen und interner Löschmarkierungen heruntergeladen. **Kein Token und keine Verbindungseinstellungen** sind enthalten. Die Datei vertraulich aufbewahren.

Es gibt in dieser Version noch keinen Import-Knopf. Für eine vollständige Wiederherstellung: auf **beiden Geräten** zunächst offene Änderungen synchronisieren oder separat sichern, alle App-Fenster schließen, im **privaten** Repo die `daten.json` durch das gewünschte Backup ersetzen und speichern. Auf beiden Geräten die Website-Daten nach der Sicherung löschen, App erneut öffnen und Verbindung neu eingeben. Dadurch können alte lokale Warteschlangen das wiederhergestellte Backup nicht versehentlich ändern. Das ist eine bewusste Wiederherstellung des gesamten Stands, kein normaler Abgleich.

## 11. Kurze Testcheckliste für euch

- [ ] App auf iPhone in Hochformat öffnen: alle drei Bereiche erreichbar, keine seitliche Scrollleiste; hellen und dunklen Modus testen.
- [ ] Als Nico und Partnerin verbinden. Auf beiden Geräten muss der gemeinsame GitHub-Status erscheinen.
- [ ] In Edeka einen Artikel mit `1,5 kg` hinzufügen; im zweiten Gerät aktualisieren und Namen/Menge/Person prüfen.
- [ ] Beide Geräte fügen gleichzeitig unterschiedliche Artikel hinzu: nach Abgleich müssen beide Artikel vorhanden sein.
- [ ] Auf einem Gerät Artikel abhaken; auf dem anderen abwarten. Erledigtes steht unten. Erneut antippen öffnet den Artikel, ohne Rückgängig-Meldung.
- [ ] Erledigte entfernen, danach Rückgängig; einen einzelnen Artikel löschen und wiederherstellen.
- [ ] Geschäft hinzufügen, umbenennen und mit einem Artikel löschen; direkt Rückgängig testen.
- [ ] Eigenes Rezept mit zwei Zutaten, Tags und Zubereitung anlegen; Suche, Tagfilter, Bearbeiten und Löschen/Rückgängig testen.
- [ ] Beispiel-Pasta von 2 auf 4 Portionen stellen: Nudeln 400 g, Tomaten 800 g. „Zutaten auf die Liste“ öffnen, eine Zutat abwählen, Lidl wählen, bestätigen. Nur die ausgewählten Mengen sollen dort stehen.
- [ ] Nach erfolgreichem Online-Aufruf Flugmodus aktivieren, Artikel anlegen und die App neu öffnen. Er muss lokal bleiben. Flugmodus aus, App geöffnet lassen, zweiten Geräteabgleich prüfen.
- [ ] Vorübergehend einen ungültigen Token eingeben. Verständliche Meldung muss erscheinen; danach korrekten eigenen Token einsetzen, ohne die Datenadresse zu ändern. Wartende Änderungen dürfen nicht verschwinden.
- [ ] Backup herunterladen: `version`, Listen, Rezepte und Zutaten vorhanden; kein Token enthalten.
- [ ] Homescreen-Symbol hinzufügen und darüber öffnen. Gegebenenfalls erneut verbinden, danach offline öffnen.

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

- `tests/data.test.mjs`, `tests/prices.test.mjs`: Beispielmodell, feldweises Zusammenführen, Reihenfolgeunabhängigkeit, doppelte Übertragung, Löschmarkierungen, Portionsübernahme, Versionsschutz, deutsche Mengeneingaben, Preisrechnung.
- `tests/recipe-import.test.mjs`: Zutatenzeilen (Brüche, Bereiche, Einheiten, ohne Menge), schema.org-Rezepte, kaputtes JSON-LD, Freitext mit und ohne Überschriften.
- `tests/page-source.test.mjs`: Hilfsdienst-Auswahl und der Cloudflare-Worker (nur eigene App, nur öffentliche https-Adressen, Größenlimit, Zeichensatz).
- `tests/browser.test.mjs`: mobile Ansicht mit 390 und 320 px (kein seitlicher Überlauf, Schrift mindestens 16 px, Leiste am unteren Rand), Tastatur-Verhalten, alle Import-Wege einschließlich echter Texterkennung, `?import=`, simulierter GitHub-Server mit 304-Antworten und Fehlern, Offline-Start, Dunkelmodus. Echte Konten und ein echtes iPhone ersetzt das nicht: Den abschließenden Zwei-Geräte-Test führt ihr anhand der Checkliste aus.

Nicht getestet werden konnten: echte Rezeptseiten und die öffentlichen Hilfsdienste (in der Entwicklungsumgebung gesperrt; stattdessen realistische Beispiel-Seiten), echte GitHub-Abfragen sowie Safari/iOS. Die Hinweise zu iOS beruhen auf dem bekannten Verhalten von Safari.

Weitere Testpunkte für Version 1.1:

- [ ] Edeka wählen, Angebotsseite öffnen und eigenen Link unter „Geschäfte“ speichern.
- [ ] Artikel mit 2 kg und einem Preis von 1,99 € je 500 g anlegen: geschätzt 7,96 €.
- [ ] Beim selben Artikel einen passenden anderen Geschäftspreis notieren; Vergleich je kg und Datum kontrollieren.
- [ ] Artikel abhaken: geschätzte Summe sinkt; Rückgängig stellt sie wieder her.
- [ ] Preis leeren: fehlender Preis wird angezeigt, nicht als kostenlos gerechnet. Preis 0: wird ausdrücklich als kostenlos mitgerechnet.
- [ ] App erneut öffnen, denselben Namen im selben Geschäft eingeben und gemerkten Preis prüfen; Geschäft wechseln und anderen Vorschlag prüfen.
- [ ] Gleicher Name mit „Packung“: kein Vergleich mit unbekannter Packungsgröße; g und l werden nicht ineinander umgerechnet.
- [ ] Vorhandene Artikel und Einstellungen nach dem Update prüfen; die private Datendatei dafür nicht ersetzen.

Weitere Testpunkte für Version 1.2:

- [ ] Artikel abhaken und wieder öffnen: keine neue Rückgängig-Benachrichtigung. Löschen und Lösch-Rückgängig funktionieren weiter.
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

