// Datumshilfen. Intern werden Kalenderdaten als ISO-String «JJJJ-MM-TT» geführt (zeitzonenfrei).

const pad = (n, len = 2) => String(n).padStart(len, '0');
const TAG_MS = 86_400_000;
/** Excel-Seriennummer 25569 = 01.01.1970 (Excel-Epoche 30.12.1899, inkl. Schaltjahr-Fehler 1900). */
const EXCEL_EPOCHE_1970 = 25569;

/** Baut ein ISO-Datum aus Teilen und prüft, ob es den Tag wirklich gibt. */
export function isoAusTeilen(jahr, monat, tag) {
  const j = Number(jahr), m = Number(monat), t = Number(tag);
  if (!Number.isInteger(j) || !Number.isInteger(m) || !Number.isInteger(t)) return null;
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null;
  return `${pad(j, 4)}-${pad(m)}-${pad(t)}`;
}

/** «TT.MM.JJJJ» → ISO oder null. */
export function parseChDatum(text) {
  const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(text ?? ''));
  return m ? isoAusTeilen(m[3], m[2], m[1]) : null;
}

/** Excel-Seriennummer → ISO. */
export function excelSerialZuIso(serial) {
  const d = new Date(Math.round((Number(serial) - EXCEL_EPOCHE_1970) * TAG_MS));
  return isoAusTeilen(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** ISO → Excel-Seriennummer (ganze Tage). */
export function isoZuExcelSerial(iso) {
  return Math.round(isoZuUtcMs(iso) / TAG_MS) + EXCEL_EPOCHE_1970;
}

/**
 * Wandelt einen Zellwert aus Excel/CSV in ein ISO-Datum um.
 * Unterstützt: Excel-Seriennummer (Zahl), Date-Objekt, «TT.MM.JJJJ», «JJJJ-MM-TT», «TT/MM/JJJJ».
 * Leere Werte → ''. Ungültige Werte → null.
 */
export function parseDatumWert(wert) {
  if (wert == null || wert === '') return '';
  if (typeof wert === 'number') return wert > 0 && wert < 2958466 ? excelSerialZuIso(wert) : null;
  if (wert instanceof Date) {
    return isNaN(wert.getTime()) ? null : isoAusTeilen(wert.getFullYear(), wert.getMonth() + 1, wert.getDate());
  }
  const s = String(wert).trim();
  if (s === '') return '';
  let m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return isoAusTeilen(m[3], m[2], m[1]);
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
  if (m) return isoAusTeilen(m[1], m[2], m[3]);
  // Seriennummer als Text (z. B. aus CSV-Export ohne Formatierung)
  if (/^\d{4,6}(?:\.\d+)?$/.test(s)) return excelSerialZuIso(Number(s));
  return null;
}

export function isoZuUtcMs(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return Date.UTC(j, m - 1, t);
}

/** ISO → «TT.MM.JJJJ» (leer bei fehlendem Wert). */
export function formatCh(iso) {
  if (!iso) return '';
  const [j, m, t] = iso.slice(0, 10).split('-');
  return `${t}.${m}.${j}`;
}

/** Ganzzahlige Differenz in Tagen (b − a). */
export function tageZwischen(isoA, isoB) {
  return Math.round((isoZuUtcMs(isoB) - isoZuUtcMs(isoA)) / TAG_MS);
}

export function addTage(iso, tage) {
  const d = new Date(isoZuUtcMs(iso) + tage * TAG_MS);
  return isoAusTeilen(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** ISO → «15. Oktober 2026» */
export function formatChLang(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return `${t}. ${MONATE[m - 1]} ${j}`;
}

/** Zeitstempel (ISO mit Zeit) → «TT.MM.JJJJ, HH:MM» in Ortszeit. */
export function formatChZeit(zeitstempel) {
  const d = new Date(zeitstempel);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Zeitstempel → «JJJJMMTT» in Ortszeit (für Eingangs-IDs). */
export function tagesSchluessel(zeitstempel) {
  const d = new Date(zeitstempel);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
