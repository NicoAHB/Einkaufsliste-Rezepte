// Läuft vor dem ersten Anzeigen (klassisches Skript im Kopf der Seite), damit Farbe und Hell/Dunkel nicht erst nach dem Laden der App umspringen.
// Die Namen der Farben müssen zu index.html und styles.css passen; ohne gemerkte Wahl gilt Blau und „wie auf dem Gerät“.
try {
  const saved = JSON.parse(localStorage.getItem('einkauf-settings-v1')) || {}, root = document.documentElement;
  if (saved.theme === 'light' || saved.theme === 'dark') root.dataset.theme = saved.theme;
  if (/^(blau|gruen|tuerkis|flieder|rose|pfirsich)$/.test(saved.palette)) root.dataset.palette = saved.palette;
} catch { /* nichts gemerkt oder Speicher gesperrt */ }
