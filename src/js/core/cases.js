// Wandelt Tabellenzeilen (aus Excel oder CSV) in Fall-Objekte um. Reine Logik ohne DOM.
import { parseDatumWert } from './dates.js';
import { istGueltigeGln } from './gln.js';
import { FALLTYPEN } from '../config.js';

export const FALL_SPALTEN = [
  'schaden_nr', 'vorname', 'nachname', 'geburtsdatum', 'unfalldatum', 'falltyp', 'arbeitgeber',
  'leistungserbringer', 'leistungserbringer_gln', 'leistungserbringer_zsr', 'sachbearbeitung',
];
const PFLICHT = ['schaden_nr', 'vorname', 'nachname'];
const DATUMS_SPALTEN = ['geburtsdatum', 'unfalldatum'];

/** «Schaden-Nr.» → «schaden_nr», «Leistungserbringer GLN» → «leistungserbringer_gln» */
export function normalisiereSpaltenname(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_nr_?$/, '_nr');
}

/** Falltyp unabhängig von Schreibweise auf den Schlüssel in FALLTYPEN abbilden. */
export function falltypSchluessel(falltyp, regeln = FALLTYPEN) {
  const n = normalisiereSpaltenname(falltyp);
  return Object.keys(regeln).find((k) => normalisiereSpaltenname(k) === n) ?? null;
}

function zellText(wert) {
  if (wert == null) return '';
  if (typeof wert === 'number') return Number.isInteger(wert) ? String(wert) : String(wert);
  return String(wert).trim();
}

/**
 * @param {Array<Record<string, unknown>>} zeilen  Objekte mit Spaltennamen als Schlüssel
 * @returns {{ faelle: object[], fehler: string[], warnungen: string[] }}
 */
export function zeilenZuFaellen(zeilen) {
  const fehler = [];
  const warnungen = [];
  if (!Array.isArray(zeilen) || zeilen.length === 0) {
    return { faelle: [], fehler: ['Die Tabelle enthält keine Datenzeilen.'], warnungen };
  }

  const vorhandene = new Set(zeilen.flatMap((z) => Object.keys(z).map(normalisiereSpaltenname)));
  const fehlend = PFLICHT.filter((s) => !vorhandene.has(s));
  if (fehlend.length) {
    fehler.push(`Pflichtspalten fehlen: ${fehlend.join(', ')}. Erwartet werden: ${FALL_SPALTEN.join(', ')}.`);
    return { faelle: [], fehler, warnungen };
  }
  const optionalFehlend = FALL_SPALTEN.filter((s) => !vorhandene.has(s) && !PFLICHT.includes(s));
  if (optionalFehlend.length) warnungen.push(`Spalten nicht gefunden (bleiben leer): ${optionalFehlend.join(', ')}.`);

  const faelle = [];
  const gesehen = new Set();
  zeilen.forEach((zeile, index) => {
    const zeilenNr = index + 2; // Zeile 1 = Kopfzeile
    const roh = {};
    for (const [k, v] of Object.entries(zeile)) roh[normalisiereSpaltenname(k)] = v;
    if (FALL_SPALTEN.every((s) => zellText(roh[s]) === '')) return; // leere Zeile

    const fall = {};
    for (const spalte of FALL_SPALTEN) {
      if (DATUMS_SPALTEN.includes(spalte)) {
        const iso = parseDatumWert(roh[spalte]);
        if (iso === null) warnungen.push(`Zeile ${zeilenNr}: ${spalte} «${zellText(roh[spalte])}» ist kein gültiges Datum.`);
        fall[spalte] = iso ?? '';
      } else {
        fall[spalte] = zellText(roh[spalte]);
      }
    }
    fall.schaden_nr = fall.schaden_nr.toUpperCase();

    if (!fall.schaden_nr) {
      warnungen.push(`Zeile ${zeilenNr}: ohne Schaden-Nr. übersprungen.`);
      return;
    }
    if (gesehen.has(fall.schaden_nr)) {
      warnungen.push(`Zeile ${zeilenNr}: Schaden-Nr. ${fall.schaden_nr} doppelt – übersprungen.`);
      return;
    }
    if (fall.leistungserbringer_gln && !istGueltigeGln(fall.leistungserbringer_gln)) {
      warnungen.push(`Zeile ${zeilenNr}: GLN ${fall.leistungserbringer_gln} hat keine gültige Prüfziffer.`);
    }
    if (fall.falltyp && !falltypSchluessel(fall.falltyp)) {
      warnungen.push(`Zeile ${zeilenNr}: Falltyp «${fall.falltyp}» ist unbekannt (keine Checkliste).`);
    }
    gesehen.add(fall.schaden_nr);
    faelle.push(fall);
  });

  if (faelle.length === 0) fehler.push('Keine gültigen Fälle gefunden.');
  return { faelle, fehler, warnungen };
}
