# SattPlan: freigegebener Name und bereitgestellte Logos

Quelle: vom Nutzer bereitgestelltes `Sattplan_AppStore-Vorbereitung.pdf`, Titelseite (29.10.2026).
Übernommen wurden ausschließlich der Name **Sattplan** und das Logo. Der restliche Dokumentinhalt wurde nicht als Arbeitsauftrag übernommen.

- `sattplan-logo.png`: eingebettetes Originalbild, 800×800 Pixel, mit der zugehörigen Transparenzmaske aus dem PDF. Keine Neugenerierung oder Änderung des Motivs.
- `sattplan-appstore-1024.png`: quadratischer PNG-Export ohne Transparenz, aus dem 800-Pixel-Bild skaliert; keine zusätzliche Bildauflösung im Ausgangsmaterial. Für eine spätere native Verpackung vorbereitet.
- `../../apple-touch-icon.png`: 180×180 Pixel, vollflächiger Hintergrund; iOS legt seine Rundung selbst darüber.
- `../../icon-192.png`, `../../icon-512.png`, `../../icon-maskable-512.png`: PNG-Exporte desselben Originals. Das Taschenmotiv liegt innerhalb des sicheren zentralen Bereichs des maskierbaren Icons.
- `../../icon.svg`: kompatibler SVG-Behälter mit eingebettetem 192-Pixel-PNG. Kein nachgezeichnetes Vektorlogo; der Browser verwendet vorrangig das PNG-Favicon.

Namensänderungen betreffen nur die sichtbare App-Identität. Repository-URL, Manifest-ID und lokale Datenspeicher wurden nicht umbenannt.
Das vollständige PDF wird nicht im öffentlichen App-Code ausgeliefert.

## Seit 2.173

- Schreibweise **SattPlan** (S und P groß), vom Nutzer per Visitenkartenentwurf vorgegeben. Unter Optionen sind S und P orange (#c65a1e, im dunklen Erscheinungsbild #f08a4b) wie auf der Karte.
- `nvf-digital-logo.png`: Logo von NvF Digital (Herausgeber), vom Nutzer als PNG mit transparentem Hintergrund bereitgestellt (2172×724). Durchsichtiger Rand abgeschnitten und auf 519×144 Pixel verkleinert; Motiv unverändert. Steht unter Optionen ganz unten („Ein Produkt von“).
- Dateinamen (`sattplan-logo.png` usw.) bleiben, damit Verweise und der Offline-Speicher stabil sind.
