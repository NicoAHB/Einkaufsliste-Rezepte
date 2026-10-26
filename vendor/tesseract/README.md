# Mitgelieferte Texterkennung (Tesseract)

Diese Dateien werden nur geladen, wenn ein Rezept aus einem Screenshot importiert wird. Sie stammen unverändert aus
den npm-Paketen und liegen hier, damit die App keine fremden Server kontaktiert:

| Datei | Quelle | Version | Lizenz |
| --- | --- | --- | --- |
| `tesseract.esm.min.js`, `worker.min.js` | [tesseract.js](https://github.com/naptha/tesseract.js) (`dist/`) | 5.1.1 | Apache-2.0 (`LICENSE-tesseract.js.md`) |
| `core/tesseract-core-lstm.wasm.js`, `core/tesseract-core-simd-lstm.wasm.js` | [tesseract.js-core](https://github.com/naptha/tesseract.js-core) | 5.1.1 | Apache-2.0 (`LICENSE-tesseract.js-core`) |
| `lang/deu.traineddata.gz` | `@tesseract.js-data/deu` (`4.0.0_best_int`, Modell aus [tessdata_best](https://github.com/tesseract-ocr/tessdata_best)) | 4.0.0 | Apache-2.0 |

Zwei Kernvarianten, weil ältere iPhones (vor iOS 16.4) kein WebAssembly-SIMD kennen; tesseract.js wählt automatisch.
Die Zeilen `sourceMappingURL` wurden entfernt, sonst nichts.

Aktualisieren: `npm install tesseract.js@5 tesseract.js-core@5 @tesseract.js-data/deu` in einem leeren Ordner ausführen und die
genannten Dateien hierher kopieren. Danach die Cache-Version in `sw.js` erhöhen.
