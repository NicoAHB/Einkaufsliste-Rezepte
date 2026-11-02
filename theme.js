// Läuft vor dem ersten Anzeigen (klassisches Skript im Kopf der Seite), damit Farbe und Hell/Dunkel nicht erst nach dem Laden der App umspringen.
// Neue Geräte: Hell, Grün, Schlicht, 65 % (muss zu DISPLAY_DEFAULTS in app.js passen).
// Bei vorhandenen Einstellungen gelten weiterhin deren bisherige Vorgaben.
try {
  const stored=localStorage.getItem('einkauf-settings-v1');
  const saved = stored===null?{theme:'light',palette:'gruen',glassBg:'schlicht',glassLevel:65}:JSON.parse(stored)||{}, root = document.documentElement;
  if (saved.theme === 'light' || saved.theme === 'dark') root.dataset.theme = saved.theme;
  if (/^(blau|gruen|tuerkis|flieder|rose|pfirsich)$/.test(saved.palette)) root.dataset.palette = saved.palette;
  // Bestehende Einstellungen ohne Glas-Wahl: an, Lichter, 50 (wie applyTheme in app.js).
  if (saved.glass !== false) {
    root.dataset.glass = '';
    root.dataset.glassBg = /^(lichter|verlauf|schlicht)$/.test(saved.glassBg) ? saved.glassBg : 'lichter';
    root.style.setProperty('--gs', String((Number.isFinite(saved.glassLevel) ? Math.min(100, Math.max(0, saved.glassLevel)) : 50) / 100));
  }
} catch { /* nichts gemerkt oder Speicher gesperrt */ }
