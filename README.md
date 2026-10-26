# Einkauf & Rezepte – erste Version

Eine deutsche Web-App für zwei Personen: auf dem iPhone große Bedienelemente, drei Bereiche und Speicherung in einem privaten GitHub-Repository. Die App besteht aus normalen HTML-, CSS- und JavaScript-Dateien. **Für die Nutzung brauchst du keinen Server, kein Terminal und keine Installation.** GitHub Pages liefert die öffentlichen App-Dateien aus; private Daten werden mit deinem persönlichen Token direkt über die GitHub-API gelesen und geschrieben.

## 1. Was diese Version kann

- Einkaufsliste je Geschäft: Edeka, Lidl, Rewe; weitere Geschäfte anlegen, umbenennen und löschen.
- Artikel mit Menge, Einheit und dem Namen der Person hinzufügen; abhaken, löschen und erledigte Artikel gemeinsam entfernen. Erledigtes steht unten.
- Die letzte Lösch- oder Abhakaktion rückgängig machen, solange die Seite geöffnet bleibt.
- Rezepte mit einzelnen Zutaten, Zubereitung, Portionen und Tags anlegen, bearbeiten, löschen; nach Rezept/Zutat suchen und nach Tag filtern.
- Portionen umrechnen. Beim Übernehmen Zutaten einzeln abwählen, Geschäft auswählen und nur die gewählten Zutaten hinzufügen.
- Beispielmodus ohne GitHub, drei Beispielrezepte und eine über drei Geschäfte verteilte Beispielliste.
- GitHub-Abgleich per Button und alle acht Sekunden bei sichtbarer App; lokale Offline-Warteschlange; Backup-Export; heller und dunkler Modus; Homescreen und Offline-Start nach dem ersten erfolgreichen Online-Aufruf.

**Absichtlich erst in einem nächsten Schritt:** Kategorien und gemerkte Kategorie, Schnellauswahl häufiger Artikel, Zusammenzählen gleicher Artikel, Zwiebel/Zwiebeln-Erkennung, Einheitenumrechnung, Fotos mit Verkleinerung, Angebotslinks, Preise, Angebotsmarkierungen, Preisvergleich und Summen. Gleiche Artikel bleiben in dieser Version getrennt. Es gibt keine Vorratsliste. Rezepte und Zutaten liegen bereits einzeln vor, damit Erweiterungen darauf aufbauen können.

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
6. Im Repo **Code → Add file → Upload files** wählen. `index.html`, `styles.css`, `data.js`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, `beispieldaten.json`, `.nojekyll` und `README.md` gemeinsam hochladen. Sie müssen **direkt im Hauptordner** liegen, nicht in einem zusätzlichen Unterordner. Die Tests sind für die App nicht erforderlich.
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
2. Eigenen Namen auswählen: **Nico** bzw. **Partnerin**.
3. Eigentümer: der **Organisationsname**, z. B. `eure-kueche`, nicht automatisch Nico.
4. Daten-Repository: `einkauf-daten` (ohne URL).
5. Branch: `main`; JSON-Datei: `daten.json`.
6. Den eigenen Token in das Passwortfeld einfügen und **Speichern & verbinden** wählen.
7. Warten, bis **Gespeichert · mit GitHub abgeglichen** erscheint und der Beispielmodus-Hinweis verschwindet.
8. Auf dem zweiten Gerät dasselbe mit dem **eigenen** Token wiederholen. Beide Geräte müssen denselben Eigentümer, Repository-Namen, Branch und Dateinamen benutzen.
9. Als Probe einen Artikel hinzufügen und auf dem zweiten Gerät **Aktualisieren** drücken. Nach spätestens dem nächsten erfolgreichen Abgleich sollte er erscheinen.

**Homescreen auf dem iPhone:** Den Link in Safari öffnen → Teilen-Symbol → **Zum Home-Bildschirm** → bei angebotener Option **Als Web-App öffnen** aktivieren → **Hinzufügen**. Anschließend die App über das neue Symbol öffnen. Falls Safari und die Homescreen-App getrennte Speicher nutzen, dort den eigenen Token und Namen noch einmal eingeben. Es wird keine native App aus dem App Store installiert.

## 8. Speichern, offline arbeiten und Fehler verstehen

- Jede Änderung wird **zuerst lokal gespeichert**. Im GitHub-Modus werden ausstehende Änderungen zusätzlich in einer dauerhaften Warteschlange gespeichert. Bei vollem oder gesperrtem Browserspeicher erscheint ein Fehler; die Änderung wird dann nicht als übernommen dargestellt.
- **Wird gesendet / aktualisiert**: ein GitHub-Abgleich läuft. **Gespeichert · mit GitHub abgeglichen**: keine ausstehenden lokalen Änderungen. **Lokal gespeichert** oder **Fehler · Änderungen lokal gesichert**: GitHub hat die Änderung noch nicht bestätigt.
- Ohne Empfang kannst du nach einem vorherigen erfolgreichen Laden weiterarbeiten. Lass die App bei wiederhergestelltem Empfang geöffnet oder öffne sie erneut. **iOS synchronisiert diese App nicht zuverlässig im Hintergrund.**
- Die App lädt bei sichtbarer Seite alle acht Sekunden neu. Bei Fehlern wartet sie länger; GitHubs Wartezeit und API-Limits werden berücksichtigt. Manuelles Aktualisieren löst einen erneuten Versuch aus.
- **Ungültiger/abgelaufener Token (401):** über die Anleitung in Abschnitt 6 einen neuen erstellen und auf dem Gerät unter Einstellungen ersetzen. Die Datenadresse dabei unverändert lassen; dann bleibt die Warteschlange erhalten. Nicht den Browser-Speicher löschen.
- **Kein Zugriff (403):** Mitgliedschaft, Write-Rolle, Contents-Berechtigung und Token-Freigabe prüfen. GitHub kann auch wegen eines API-Limits 403 melden. Dann abwarten. Beim Daten-Repo keine erzwungenen Pull Requests für App-Schreibzugriffe voraussetzen.
- **Nicht gefunden (404):** Eigentümer, Repo, `main` und `daten.json` einschließlich Groß-/Kleinschreibung prüfen. GitHub versteckt private Repos auch bei fehlenden Token-Rechten hinter 404; es ist nicht automatisch eine fehlende Datei.
- **Schreibkonflikt (409/422):** Die App lädt und mischt bis zu viermal erneut. Bleibt der Fehler, später aktualisieren und Branch-Regeln prüfen. Lokale Änderungen bleiben erhalten.
- **Rückgängig:** stellt die letzte Lösch- oder Häkchenänderung wieder her. Ein späteres Rückgängig ist selbst eine neue gemeinsame Änderung und kann daher eine zwischenzeitliche Änderung am selben Feld ersetzen. Nach Neuladen ist der Rückgängig-Knopf weg; die Daten und Warteschlange bleiben.
- **Zweiter Tab:** pro Browser-Ursprung darf nur ein App-Tab aktiv sein, damit zwei Tabs nicht dieselbe lokale Warteschlange überschreiben. Den ersten Tab schließen und den zweiten neu laden. Zwei Geräte sind ausdrücklich unterstützt.

Token und private Daten liegen unverschlüsselt im `localStorage` dieses Browsers. Es werden keine externen Skripte, Analysewerkzeuge oder Schriften geladen. Trotzdem nur auf vertrauenswürdigen Geräten verwenden und Browserdaten nicht löschen, solange Änderungen ausstehen. Andere Seiten unter demselben Pages-Ursprung gehören ebenfalls zu dieser Vertrauensgrenze. **Token entfernen** entfernt die Zugangsdaten; lokale Daten und Warteschlangen bleiben für die spätere erneute Verbindung erhalten. Für vollständiges Entfernen erst synchronisieren und sichern, dann die Website-Daten in den Geräteeinstellungen löschen. Safari im privaten Modus ist für dauerhafte Daten ungeeignet.

## 9. Datenmodell v1 und Zusammenführen

`beispieldaten.json` zeigt das vollständige Modell. Oben steht `version: 1`. Bei unbekannten Versionen verweigert diese App das Schreiben. Erweiterungen innerhalb v1 dürfen optionale Felder ergänzen; unbekannte Felder werden erhalten. Änderungen an Bedeutung oder Pflichtfeldern benötigen eine ausdrücklich getestete Migration, nicht nur eine andere Versionsnummer.

| Bereich | Inhalt |
| --- | --- |
| `stores` | `id`, `name`, Zeitstempel und Löschmarkierung |
| `items` | zusätzlich `storeId`, `name`, `quantity`, `unit`, `checked`, `createdBy` |
| `recipes` | zusätzlich `name`, `servings`, `tags`, `instructions` |
| `ingredients` | zusätzlich `recipeId`, `name`, `quantity`, `unit` |
| `sync.applied` | IDs bereits angewendeter Änderungen; verhindert Doppelübertragung |

Jeder Datensatz hat `createdAt`, `updatedAt`, `deletedAt` und `_clock`. `deletedAt: null` bedeutet nicht gelöscht. `_clock` speichert je geändertem Feld dessen Zeitstempel und Operations-ID. Eine Operation enthält `id`, `collection`, `entityId`, `patch`, `actor` und `at`.

Die App liest die aktuelle Datei samt GitHub-SHA, wendet nur ihre eigenen ausstehenden Operationen an und schreibt mit dieser SHA zurück. Ändert ein anderes Gerät die Datei dazwischen, lehnt GitHub den alten Stand ab; die App liest und mischt erneut. **GitHub speichert technisch die vollständige JSON-Datei pro Commit, nicht einzelne JSON-Felder.** Es gibt keinen blinden Ersatz durch einen veralteten Gerätestand.

Unterschiedliche Datensätze und Felder bleiben erhalten. Ändern beide dasselbe Feld, gewinnt der jüngere Zeitstempel; bei Gleichstand die Operations-ID. Dies ist kein gemeinsamer Texteditor: zwei gleichzeitige Änderungen derselben Zubereitung lassen sich nicht sinnvoll automatisch addieren. Gerätezeit automatisch einstellen. Löschen bleibt durch eine Markierung erhalten und wird durch normales Bearbeiten nicht aufgehoben. Gelöschte Rezepte verbergen ihre Zutaten; gelöschte Geschäfte verbergen ihre Artikel. Die letzte Löschaktion kann beides wieder sichtbar machen.

Diese erste Version ist für einen kleinen gemeinsamen Haushalt gedacht: **maximal 900 KB JSON**, noch keine Fotos. Löschmarkierungen und bestätigte Operations-IDs werden bewusst nicht automatisch gekürzt. Bei sehr langer Nutzung ist eine abgestimmte Kompaktierung oder Aufteilung erforderlich. Ein einseitiges Aufräumen könnte alte Offline-Änderungen doppelt anwenden; deshalb wird das hier nicht stillschweigend getan. Durch fortlaufendes Speichern entstehen Commits im privaten Repo. Daten aus alten Git-Ständen verschwinden nicht durch Löschen in der App.

## 10. Backup und Wiederherstellung

Unter **Einstellungen → Alle Daten als JSON sichern** wird der aktuelle sichtbare Datenstand einschließlich ausstehender lokaler Änderungen und interner Löschmarkierungen heruntergeladen. **Kein Token und keine Verbindungseinstellungen** sind enthalten. Die Datei vertraulich aufbewahren.

Es gibt in dieser Version noch keinen Import-Knopf. Für eine vollständige Wiederherstellung: auf **beiden Geräten** zunächst offene Änderungen synchronisieren oder separat sichern, alle App-Fenster schließen, im **privaten** Repo die `daten.json` durch das gewünschte Backup ersetzen und speichern. Auf beiden Geräten die Website-Daten nach der Sicherung löschen, App erneut öffnen und Verbindung neu eingeben. Dadurch können alte lokale Warteschlangen das wiederhergestellte Backup nicht versehentlich ändern. Das ist eine bewusste Wiederherstellung des gesamten Stands, kein normaler Abgleich.

## 11. Kurze Testcheckliste für euch

- [ ] App auf iPhone in Hochformat öffnen: alle drei Bereiche erreichbar, keine seitliche Scrollleiste; hellen und dunklen Modus testen.
- [ ] Als Nico und Partnerin verbinden. Auf beiden Geräten muss der gemeinsame GitHub-Status erscheinen.
- [ ] In Edeka einen Artikel mit `1,5 kg` hinzufügen; im zweiten Gerät aktualisieren und Namen/Menge/Person prüfen.
- [ ] Beide Geräte fügen gleichzeitig unterschiedliche Artikel hinzu: nach Abgleich müssen beide Artikel vorhanden sein.
- [ ] Auf einem Gerät Artikel abhaken; auf dem anderen abwarten. Erledigtes steht unten. Rückgängig testen.
- [ ] Erledigte entfernen, danach Rückgängig; einen einzelnen Artikel löschen und wiederherstellen.
- [ ] Geschäft hinzufügen, umbenennen und mit einem Artikel löschen; direkt Rückgängig testen.
- [ ] Eigenes Rezept mit zwei Zutaten, Tags und Zubereitung anlegen; Suche, Tagfilter, Bearbeiten und Löschen/Rückgängig testen.
- [ ] Beispiel-Pasta von 2 auf 4 Portionen stellen: Nudeln 400 g, Tomaten 800 g. „Zutaten auf die Liste“ öffnen, eine Zutat abwählen, Lidl wählen, bestätigen. Nur die ausgewählten Mengen sollen dort stehen.
- [ ] Nach erfolgreichem Online-Aufruf Flugmodus aktivieren, Artikel anlegen und die App neu öffnen. Er muss lokal bleiben. Flugmodus aus, App geöffnet lassen, zweiten Geräteabgleich prüfen.
- [ ] Vorübergehend einen ungültigen Token eingeben. Verständliche Meldung muss erscheinen; danach korrekten eigenen Token einsetzen, ohne die Datenadresse zu ändern. Wartende Änderungen dürfen nicht verschwinden.
- [ ] Backup herunterladen: `version`, Listen, Rezepte und Zutaten vorhanden; kein Token enthalten.
- [ ] Homescreen-Symbol hinzufügen und darüber öffnen. Gegebenenfalls erneut verbinden, danach offline öffnen.

## 12. Für die Weiterentwicklung

Keine Laufzeitabhängigkeiten, kein Build-Schritt. Eine lokale HTTP-Vorschau ist nur für Entwickler optional: `python3 -m http.server 8000` im Projektordner; im Browser den lokalen Port öffnen. Produktionsbetrieb läuft über HTTPS bei Pages. Moderne Browser und Safari/iOS ab 15.4 mit Web Locks werden vorausgesetzt.

Die reinen Datenprüfungen laufen mit einer aktuellen Node-Version (getestet mit Node 24):

```sh
node --test tests/data.test.mjs
```

Sie prüfen Beispielmodell, feldweises Zusammenführen, Reihenfolgeunabhängigkeit, doppelte Übertragung, Löschmarkierungen, Rückgängig, Portionsübernahme, Versionsschutz und deutsche Mengeneingaben. Browserprüfungen mit simulierten GitHub-Antworten ersetzen keinen echten Abgleich mit euren Tokens; den abschließenden Zwei-Geräte-Test führt ihr nach der Einrichtung anhand der Checkliste aus.

Wenn Python-Playwright und Chromium bereits für die Entwicklung verfügbar sind, kann bei laufender lokaler Vorschau außerdem `python3 tests/browser_smoke.py` ausgeführt werden. Diese Prüfung testet die Bedienung in mobiler Chromium-Ansicht, Offline-Start, zwei simulierte Geräte, SHA-Konflikte, Änderungen während eines laufenden Schreibvorgangs, verlorene Bestätigungen und GitHub-Fehlermeldungen. Der Pfad zu Chromium steht im Testskript. Auf einem echten iPhone und gegen ein echtes privates Daten-Repository ist anschließend noch die obige Checkliste auszuführen. Die App selbst benötigt diese Testwerkzeuge nicht.
