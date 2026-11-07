# Mitgelieferter QR-Code-Erzeuger

Erzeugt den QR-Code im Fuß des Rezeptblatts („In SattPlan öffnen“, seit Version 2.190) direkt in der App, ohne Anfrage an einen fremden Server.

| Datei | Quelle | Version | Lizenz |
| --- | --- | --- | --- |
| `qrcode-generator.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) von Kazuhiko Arase (npm, `dist/qrcode.mjs`, hier mit der Endung `.js`, damit jeder Webserver sie als JavaScript ausliefert) | 2.0.4 | MIT (`LICENSE`) |

Die Datei ist unverändert. „QR Code“ ist eine eingetragene Marke der DENSO WAVE INCORPORATED.

Anders als die Texterkennung gehört diese kleine Datei (rund 50 KB) zum Offline-Paket (`FILES` in `sw.js`), damit das PDF auch ohne Netz den QR-Code bekommt.

Aktualisieren: `npm pack qrcode-generator` in einem leeren Ordner ausführen, `dist/qrcode.mjs` als `qrcode-generator.js` hierher kopieren und die Cache-Version in `sw.js` erhöhen.
