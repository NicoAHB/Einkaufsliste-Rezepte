# Sattplan

Eine deutsche Web-App für Haushalte und Familien: auf dem iPhone große Bedienelemente, fünf Bereiche (Einkauf, Rezepte, Wochenplan, Ausgaben, Einstellungen), Rezept-Import aus Links, Screenshots und Text und Speicherung in einem privaten GitHub-Repository. Die App besteht aus normalen HTML-, CSS- und JavaScript-Dateien. **Für die Nutzung brauchst du keinen Server, kein Terminal und keine Installation.** GitHub Pages liefert die öffentlichen App-Dateien aus; private Daten werden mit deinem persönlichen Token direkt über die GitHub-API gelesen und geschrieben.

Was sich in den einzelnen Versionen geändert hat, steht im [Änderungsprotokoll](CHANGELOG.md). Die Versionsnummer steht in der App oben unter **Einstellungen**.

## 1. Was die App kann

- **Einkaufsliste** für alle Geschäfte zusammen oder je Geschäft, nach Gängen im Laden sortiert, mit Produktbildern, Mengen und Packungsgrößen, Vorlagen und häufig gekauften Artikeln. Gleiche Artikel werden zusammengezählt, auch wenn zwei Personen gleichzeitig etwas hinzufügen.
- **Im Laden:** große Ansicht zum Abhaken mit Sperre gegen versehentliches Tippen, „Bildschirm anlassen“ und **Einkauf beenden** mit Betrag; gekaufte Lebensmittel können automatisch in den Vorrat wandern.
- **Vorrat** mit Bildauswahl, Grundvorrat und „Letzte 7 Tage gekauft“. **Was kann ich kochen?** zeigt, welche Rezepte mit dem Vorrat (und dem Einkaufszettel) möglich sind.
- **Rezepte** von Hand oder per Import aus **Link**, **Screenshot** (Texterkennung auf dem Gerät) und **Text**; Rezeptgruppen, Portionen umrechnen, Kochmodus, Rezeptblatt als PDF, Fotos, Favoriten, eigene Notizen und **Rezepte des Tages**.
- **Wochenplan:** Gerichte einplanen und die Zutaten der Woche gesammelt übernehmen. Was schon da ist oder auf dem Zettel steht, wird erkannt.
- **Ausgaben** nach Person, Geschäft, Kategorie und Zeitraum, Monatsbudget, Kassenbon-Erkennung und CSV-Export.
- **Wunschlisten**, eigene Listen und **geheime Listen** (nur auf diesem Gerät).
- **Gemeinsam und offline:** Abgleich über ein privates GitHub-Repository alle acht Sekunden bei geöffneter App. Ohne Netz werden Änderungen gemerkt und später gesendet. Hell oder dunkel, sechs Farben, Glas-Design, Home-Bildschirm-App.
- **Beispielmodus** ohne GitHub zum gefahrlosen Ausprobieren.

**Bewusst so gelassen:** Es gibt keinen dauerhaften Papierkorb; ältere Stände bleiben im Verlauf des privaten Daten-Repositorys. Ein gerade abgehakter Artikel lässt sich kurz über **Rückgängig** wieder öffnen. Eine Sicherung lässt sich direkt in der App wiederherstellen (Abschnitt 10). Namen wie „Plan“ (Wochenplan, Reiter unten) und „Planen“ (Einkaufsliste) bleiben, wie sie sind.

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
6. Im Repo **Code → Add file → Upload files** wählen. `index.html`, `styles.css`, `app.js`, `ui-controls.js`, `version.js`, `drafts.js`, `restore-state.js`, `backup-restore.js`, `data.js`, `pending-guard.js`, `prices.js`, `numbers.js`, `wishes.js`, `recipe-import.js`, `page-source.js`, `ocr.js`, `categories.js`, `plan.js`, `plan-list.js`, `photos.js`, `compact.js`, `receipt.js`, `cook.js`, `news.js`, `shop.js`, `brand.js`, `list-symbols.js`, `private-list.js`, `private-list-view.js`, `store-catalog.js`, `product-catalog.js`, `product-groups.js`, `wish-images.js`, `product-catalog-data.js`, `product-picker.js`, `product-tab-order.js`, `store-order.js`, `product-images.js`, `daily.js`, `recipe-maker.js`, `emoji.js`, `spending.js`, `expense-categories.js`, `expense-category-view.js`, `recipe-stock-view.js`, `family.js`, `spending-view.js`, `cookable.js`, `recent-purchases.js`, `smart-stock.js`, `grocery-names.js`, `product-names.js`, `buying.js`, `quantity-controls.js`, `pantry.js`, `pantry-view.js`, `zip.js`, `pdf.js`, `pdf-fonts.js`, `recipe-sheet.js`, `sheet-view.js`, `recipe-filter.js`, `recipe-tags.js`, `recipe-tag-picker.js`, `help.js`, `dragdelete.js`, `theme.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `beispieldaten.json`, `rezepte-des-tages.json`, `.nojekyll` und `README.md` sowie den **Ordner `assets`** (Händlerlogos und Produktbilder; mit den Unterordnern `stores`, `products`, `wishes` und `branding` hochladen) und den **Ordner `vendor`** (Texterkennung, ca. 9 MB; den Ordner per Drag & Drop auf die Upload-Seite ziehen) gemeinsam hochladen. Alles muss so liegen wie im Repository, die Dateien **direkt im Hauptordner**. Die Ordner `tests` und `worker` sowie `package.json` sind für die App nicht erforderlich (`worker/recipe-proxy.js` brauchst du nur für Abschnitt 13, und zwar bei Cloudflare, nicht auf GitHub).
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

**Sicherheit: eine eigene Adresse für die App.** Alle GitHub-Pages-Seiten eines Kontos laufen unter derselben Adresse `https://<konto>.github.io`. Der Pfad dahinter (`/Einkaufsliste-Rezepte/`) trennt den Browserspeicher nicht. Jede andere Pages-Seite unter demselben Konto könnte deshalb den GitHub-Token und die Familiendaten lesen, die die App im Browser speichert. Veröffentliche unter diesem Konto keine weiteren Pages-Seiten. Am sichersten ist eine eigene GitHub-Organisation nur für die App (z. B. `sattplan-familie`, Adresse `https://sattplan-familie.github.io/…`) oder eine eigene Domain unter **Settings → Pages → Custom domain**. Nach einem Umzug ändert sich die Adresse: Die App auf jedem Gerät neu zum Home-Bildschirm hinzufügen, einmal verbinden und im eigenen Hilfsdienst (`worker/recipe-proxy.js`) `ALLOWED_ORIGINS` anpassen. Die App zeigt diesen Hinweis auch unter **Einstellungen → Gemeinsame Liste**, solange sie unter einer `github.io`-Adresse läuft.

**Veröffentlichen erst nach grünen Tests (optional, empfohlen).** Der Workflow `.github/workflows/pages.yml` veröffentlicht die App nur, wenn der Workflow „Tests“ auf `main` erfolgreich war. Zum Einschalten unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ wählen und unter **Settings → Secrets and variables → Actions → Variables** die Variable `PAGES_VIA_ACTIONS` mit dem Wert `true` anlegen. Ohne die Variable bleibt alles wie in Schritt 3 und 4 beschrieben.

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

Diese Version ist für einen kleinen gemeinsamen Haushalt gedacht: **maximal 900 KB JSON** (Fotos liegen in eigenen Dateien). Damit die Grenze nie erreicht wird, räumt die App auf (Änderungsprotokoll, Version 1.6): automatisch ab 250 KB, auf Wunsch jederzeit. Beim Aufräumen werden Löschmarkierungen nach 14 Tagen entfernt; Änderungen, die ein sehr lange offline gewesenes Gerät an inzwischen entfernten Einträgen vornimmt, werden beim Abgleich verworfen (die Zeile trägt dazu eine Sammelmarke `_clock["*"]`, damit auch spät eintreffende ältere Änderungen keine neueren überschreiben). Durch fortlaufendes Speichern entstehen Commits im privaten Repo. Daten aus alten Git-Ständen verschwinden nicht durch Löschen oder Aufräumen in der App und lassen sich dort wiederherstellen.

## 10. Backup und Wiederherstellung

Unter **Einstellungen → Datensicherung** sichert **Datensicherung erstellen (JSON)** den aktuellen sichtbaren Stand einschließlich ausstehender Änderungen. **Mit Fotos sichern (ZIP)** enthält zusätzlich erreichbare Rezeptfotos. Fehlende Fotos werden genannt. Backups vertraulich und möglichst außerhalb des Geräts aufbewahren. Token, Verbindungseinstellungen, Rezeptentwürfe und geheime Listen sind nicht enthalten.

**Datensicherung wiederherstellen** öffnet eine Datei aus „Dateien“. Die Vorschau zeigt das Ziel und die Zahlen **Aktuell → Sicherung**. Erst nach ausdrücklicher Bestätigung wird der gesamte gemeinsame Stand ersetzt. JSON-Dateien enthalten keine Fotos; bereits auf dem Gerät oder im aktuellen Repository erreichbare Fotos können weiterverwendet werden. Ohne fehlende Fotos fortzufahren braucht eine zusätzliche Bestätigung. Unveränderte ZIP-Dateien aus Sattplan werden unterstützt, neu komprimierte Archive nicht.

Der aktuelle Stand wird vor dem Ersetzen automatisch auf diesem Gerät gespeichert. **Vorherigen Stand zurückholen** macht ihn nach Vorschau und Bestätigung wieder verfügbar, solange die Browserdaten erhalten bleiben. Dies ersetzt keine externe Sicherung. Der gemeinsame Stand wird mit GitHub abgeglichen; ältere wartende Änderungen vor der Wiederherstellung werden verworfen. Deshalb vorab beide Geräte aktualisieren und offene Änderungen abgleichen oder separat sichern. Neuere Änderungen werden feldweise übernommen.

Die Wiederherstellungslogik und das JSON-/ZIP-Format sind unabhängig vom Speicheranbieter. Ein späterer Backend-Wechsel oder eine iOS-App können dasselbe portable Format nutzen; dies ist noch keine App-Store-Freigabe oder native iOS-Implementierung.

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

- [ ] Link der Tagesrezepte-Seite in den Einstellungen eintragen und speichern. Rezepte → „Rezepte des Tages“: Karten erscheinen, **Hinzufügen** legt ein Rezept an, **Weiter** zeigt den nächsten Vorschlag. (Wenn „keine Rezept-Links gefunden“ erscheint: siehe README, 2.8.)
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

7. **Empfohlen: Schlüssel einrichten.** Die Prüfung des Absenders allein schützt nur vor fremden Webseiten, nicht vor Programmen, die die Adresse kennen. Bei Cloudflare unter **Worker → Settings → Variables and Secrets** eine Variable `ACCESS_KEY` mit einer langen Zufallszeichenfolge anlegen (z. B. 30 Buchstaben und Ziffern) und **Deploy**. In der App die Adresse dann mit Schlüssel eintragen: `https://rezepte.dein-name.workers.dev/?key=DEINE-ZEICHENFOLGE`. Ohne passenden Schlüssel antwortet der Dienst mit „403“. Weiterleitungen prüft der Dienst einzeln (nur `https`, keine privaten Adressen, höchstens drei Sprünge).

Die App erlaubt nur Adressen auf `*.workers.dev` (Sicherheitsrichtlinie `connect-src` in `index.html`). Wer eine eigene Domain verwenden möchte, ergänzt diese dort.

Grenzen: Einige Seiten blockieren automatische Abrufe (Anmeldung, Bot-Schutz) oder laden Rezepte erst per JavaScript nach. Dann hilft „Text“ oder „Screenshot“.

## 14. Drittanbieter-Komponenten

- [Tesseract.js](https://github.com/naptha/tesseract.js) und tesseract.js-core 5.1.1 (Apache-2.0) sowie das deutsche Modell `deu` aus tessdata_best (Apache-2.0): Texterkennung, Dateien unter `vendor/tesseract/` mit Lizenztexten und Herkunft.
- [Feather Icons](https://feathericons.com/) (MIT-Lizenz): Symbole, direkt in `index.html`.

