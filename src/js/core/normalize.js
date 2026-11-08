// Normalisierung und Ähnlichkeit von Namen (Gross-/Kleinschreibung, Umlaute, Reihenfolge).

/** «Bühler-Rüegg, René» → «buehler rueegg rene» */
export function normalisiereName(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // é → e, à → a …
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

/** Klassische Levenshtein-Distanz (Einfügen, Löschen, Ersetzen kosten je 1). */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const aktuell = [i];
    for (let j = 1; j <= b.length; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      aktuell[j] = Math.min(vorher[j] + 1, aktuell[j - 1] + 1, vorher[j - 1] + kosten);
    }
    vorher = aktuell;
  }
  return vorher[b.length];
}

/** Ähnlichkeit 0–1 auf Basis der Levenshtein-Distanz. */
export function aehnlichkeit(a, b) {
  const laenge = Math.max(a.length, b.length);
  return laenge === 0 ? 0 : 1 - levenshtein(a, b) / laenge;
}

const sortiert = (s) => s.split(' ').sort().join(' ');

/**
 * Ähnlichkeit eines gefundenen Namens zu Vor- und Nachname eines Falls, unabhängig von der Reihenfolge.
 * Vergleicht «Vorname Nachname», «Nachname Vorname» und alphabetisch sortierte Teile; nimmt das Maximum.
 */
export function nameAehnlichkeit(gefunden, vorname, nachname) {
  const x = normalisiereName(gefunden);
  const v = normalisiereName(vorname);
  const n = normalisiereName(nachname);
  if (!x || (!v && !n)) return 0;
  const varianten = [`${v} ${n}`.trim(), `${n} ${v}`.trim()];
  let best = Math.max(...varianten.map((k) => aehnlichkeit(x, k)));
  best = Math.max(best, aehnlichkeit(sortiert(x), sortiert(varianten[0])));
  return best;
}

/** Text-Normalisierung für Duplikat-Hashes: Zeilenenden, Leerraum und Gross-/Kleinschreibung egal. */
export function normalisiereText(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
