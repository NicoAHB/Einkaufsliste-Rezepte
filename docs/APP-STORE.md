# SattPlan als App für iPhone und Android: Fahrplan

Stand: Version 2.149. Dieses Dokument beschreibt, was für eine Veröffentlichung im **App Store** (Apple) und bei **Google Play** nötig ist, was schon vorbereitet ist und in welcher Reihenfolge es sinnvoll ist.

## Kurzfassung

- **Technisch gut machbar.** SattPlan besteht aus normalen HTML-, CSS- und JavaScript-Dateien. Mit **Capacitor** lassen sich genau diese Dateien als echte App für iOS und Android verpacken, ohne die App neu zu schreiben.
- **Die größte Hürde ist die Anmeldung und Datenspeicherung, nicht die Oberfläche.** Heute speichert jede Familie in einem eigenen GitHub-Repository und braucht einen persönlichen Token. Für fremde Nutzerinnen und Nutzer aus dem App Store ist das zu kompliziert und wird bei der Prüfung voraussichtlich abgelehnt. Eine öffentliche App braucht deshalb ein eigenes **Konto-System mit Server** („Backend“).
- **Rechtliches vor der Einreichung klären**, vor allem die **Händlerlogos**, den Datenschutz und das Löschen von Konten.
- **Zwischenschritt ohne Backend:** Für euch als Familie lässt sich die App schon vorher als Capacitor-App bauen und über **TestFlight** (iPhone) bzw. einen **internen Test** (Google Play) verteilen, mit der heutigen GitHub-Verbindung.

## Was bis 2.149 schon vorbereitet ist

| Baustein | Warum er für die App wichtig ist |
|---|---|
| `ask.js`: eigene Rückfrage-Fenster statt `window.confirm` | Die grauen Browser-Fenster sehen in einer App fremd aus und lassen sich nicht gestalten. Alle 15 Rückfragen laufen jetzt über ein eigenes Fenster. |
| `platform.js`: Dateien, Teilen, Haptik, externe Links, Service Worker | Genau diese Stellen verhalten sich in einer App anders. Seit 2.149 laufen auch das Rezeptblatt (PDF teilen und speichern) und alle Links, die in einem neuen Tab öffnen, über diese Datei. Für diese Bereiche wird in Capacitor nur `platform.js` angepasst (Plugins *Share*, *Filesystem*, *Haptics*, *Browser*). Der Service Worker wird in der App automatisch nicht verwendet. **Nicht** in `platform.js` liegen der Speicher (`localStorage`) und der Rezept-Import aus Links; dafür gibt es eigene Schritte (siehe unten). |
| Datenmodell mit Änderungen („Operationen“) und Zusammenführen | Offline arbeiten, mehrere Geräte und Konflikte sind gelöst. Das funktioniert mit jedem Server, nicht nur mit GitHub. |
| Papierkorb für alles, Löschmarken | Gelöschtes lässt sich zurückholen; dauerhaftes Löschen ist ausdrücklich und nachvollziehbar. Das hilft auch beim Datenschutz. |
| Rund 630 Browsertests und 590 Logiktests | Sie laufen im Chromium-Browser und prüfen auch kleine Bildschirme (bis 280 px), Hell/Dunkel und Bedienung per Touch. |

## Empfohlene Reihenfolge

### 1. Capacitor-Hülle (privat, ohne Backend-Umbau)

Ziel: eine installierbare App für euch, zunächst mit der heutigen GitHub-Verbindung.

- Capacitor-Projekt anlegen (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`). Die App-Dateien bleiben im Hauptordner.
- Plugins: *Share* und *Filesystem* (Sicherungen, CSV, Rezeptblatt), *Haptics* (Rückmeldung beim langen Drücken), *Browser* (Rezeptquellen, Angebote), *Preferences* (Einstellungen), *App* (Zurück-Taste unter Android), *Status Bar* und *Splash Screen*.
- In `platform.js` die jeweilige Funktion auf das Plugin umstellen (`shareFile`, `downloadFile`, `saveFile`, `vibrate`, `mountExternalLinks`). Für Teilen, Dateien, Haptik und Links bleiben die übrigen Module unverändert.
- **Rezept-Import aus Links:** In der App gilt die Browser-Sperre für fremde Seiten (CORS) nicht, wenn die Seite über *CapacitorHttp* geladen wird. Der Cloudflare-Hilfsdienst wird dann überflüssig.
- **Speicher:** Wichtige Daten (Warteschlange, Einstellungen) aus `localStorage` in *Preferences* oder SQLite verschieben. Am einfachsten: beim Start laden, dann wie bisher synchron arbeiten.
- Für iOS wird ein **Mac mit Xcode** gebraucht, oder ein Cloud-Dienst mit macOS (z. B. GitHub Actions mit macOS-Runner).
- Verteilen über **TestFlight** (Apple, bis zu 10.000 Testerinnen und Tester, Builds laufen nach 90 Tagen ab) bzw. den **internen Test** bei Google Play.

### 2. Backend mit Konten (für die öffentliche App)

Ziel: Anmelden mit E-Mail, Apple oder Google statt GitHub-Token.

- **Empfehlung: Supabase mit Rechenzentrum in Frankfurt** (Postgres, Anmeldung, Zugriffsregeln je Haushalt). Alternativen sind Firebase oder ein eigener Server.
- Haushalte als eigene Einheit: einladen per Link oder Code, Rollen (Mitglied, Verwaltung).
- **Synchronisation:** Die App sendet weiter ihre Änderungen; der Server speichert den Stand je Haushalt mit Versionsnummer (wie heute die SHA der GitHub-Datei). `github.js` und der Abgleich in `app.js` werden durch einen Server-Baustein mit derselben Aufgabe ersetzt: lesen, mit Versionsprüfung schreiben, bei Konflikt neu lesen und zusammenführen.
- **Fotos** (Rezeptfotos) in einen Speicher des Servers statt ins Repository.
- Umzug bestehender Daten: über die vorhandene Datensicherung (ZIP) in das neue Konto importieren.

### 3. Anforderungen der Stores

**Apple (App Store)**
- Apple Developer Program: 99 € pro Jahr.
- **Datenschutzerklärung** (öffentliche Adresse) und die Angaben zum Datenschutz („App-Datenschutz“) in App Store Connect.
- **Konto in der App löschen** können (Richtlinie 5.1.1(v)), samt der Daten auf dem Server.
- **„Mit Apple anmelden“**, sobald eine Anmeldung über Google oder ähnliche Dienste angeboten wird (Richtlinie 4.8).
- **Mindestfunktionalität** (Richtlinie 4.2): Mit Einkauf, Vorrat, Rezepten, Wochenplan und Ausgaben ist das erfüllt.
- **Geistiges Eigentum** (Richtlinie 5.2): siehe Logos unten.

**Google (Play Store)**
- Einmalig 25 US-Dollar für das Entwicklerkonto.
- Formular **Datensicherheit** (welche Daten wofür), Datenschutzerklärung, Kontolöschung (in der App und über eine Webadresse).
- Aktuelle Ziel-API-Stufe von Android einhalten (Google hebt sie jährlich an).

### 4. Rechtliches und Inhalte

- **Händlerlogos** (`assets/stores`: Aldi, Lidl, Rewe, Edeka …) sind Marken. Für eine öffentliche, kommerzielle App braucht es eine Erlaubnis, sonst droht die Ablehnung oder eine Abmahnung. Empfehlung für die Store-Fassung: neutrale Symbole mit dem Namen als Text (die App kann Geschäfte schon heute „als Text“ anzeigen).
- **Produktfotos:** Nutzungsrechte für alle Bildtafeln klären und festhalten, auch für selbst erzeugte Bilder.
- **Rezepte des Tages und importierte Rezepte:** Texte fremder Seiten nur für die private Nutzung speichern; Quelle sichtbar lassen (macht die App schon).
- Impressum und Kontaktadresse für die Store-Einträge.

### 5. Weitere technische Aufräumarbeiten (schrittweise)

- `app.js` (rund 4.600 Zeilen) in Bereiche aufteilen: Einkauf, Rezepte, Wochenplan, Ausgaben, Optionen und Abgleich. Jeder Schritt einzeln, mit den vorhandenen Tests als Sicherheitsnetz. Für Capacitor ist das nicht zwingend, erleichtert aber die Pflege deutlich.
- Browsertests in mehrere Dateien teilen, damit sie parallel laufen (heute rund 30 Minuten).
- Zusätzlich auf echten Geräten testen: iOS-Simulator (Xcode) und Android-Emulator, mindestens ein kleines und ein großes Telefon.

## Grobe Einschätzung des Aufwands

| Schritt | Aufwand |
|---|---|
| 1. Capacitor-Hülle für euch (TestFlight / interner Test) | wenige Tage |
| 2. Backend mit Konten, Haushalten, Synchronisation und Fotos | mehrere Wochen |
| 3. und 4. Store-Unterlagen, Datenschutz, Logos ersetzen | einige Tage, zum Teil juristisch |
| 5. Aufteilen von `app.js` und der Tests | fortlaufend, in kleinen Schritten |
