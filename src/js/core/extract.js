// Regelbasierte Extraktion (Regex + Schlüsselwörter) – austauschbares Modul.
//
// Schnittstelle:
//   extract(text) → { dokumenttyp, felder: {…}, fundstellen: [{ feld, start, ende }], hinweise: [] }
//
// Ein LLM-basierter Extraktor könnte diese Funktion später ersetzen: Er muss nur dasselbe Objekt
// zurückgeben. Matching, Duplikaterkennung und UI bleiben unverändert.
import { DOKUMENTTYPEN, DOKUMENTTYP_GEWICHT, EXTRAKTION } from '../config.js';
import { isoAusTeilen } from './dates.js';
import { istGueltigeGln } from './gln.js';
import { normalisiereName } from './normalize.js';

/** Felder, die extrahiert werden (Reihenfolge = Anzeige). */
export const FELDER = ['schaden_nr', 'name', 'geburtsdatum', 'unfalldatum', 'gln', 'zsr', 'absender'];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
/** Labels als Regex-Alternative, längste zuerst («Patientin» vor «Patient»). */
const alternativen = (labels) => labels.slice().sort((a, b) => b.length - a.length).map(escape).join('|');

const DATUM = String.raw`(\d{1,2})\.(\d{1,2})\.(\d{4})`;
const RE_SCHADEN = /\bUV-(\d{4})-(\d{5})\b/gi;
const RE_GEB = new RegExp(String.raw`(?<!\p{L})(?:${alternativen(EXTRAKTION.geburtsdatumLabels)})\s*:?\s*${DATUM}`, 'giud');
const RE_UNFALL = new RegExp(String.raw`(?<!\p{L})(?:${alternativen(EXTRAKTION.unfalldatumLabels)})\s*:?\s*${DATUM}`, 'giud');
const RE_NAME = new RegExp(String.raw`(?<!\p{L})(?:${alternativen(EXTRAKTION.nameLabels)})[ \t]*:[ \t]*([^\n\r]*)`, 'giud');
const RE_GLN = /(?<!\d)760\d{10}(?!\d)/g;
const RE_ZSR = /(?<![\p{L}\d])[A-Z]\d{6}(?!\d)/gu;
const KEIN_NAME = new Set(EXTRAKTION.keinName);

function datumAusTreffer(m) {
  const iso = isoAusTeilen(m[3], m[2], m[1]);
  return iso ? { wert: iso, start: m.indices[1][0], ende: m.indices[3][1] } : null;
}

function ersterTreffer(text, regex, auswerten) {
  for (const m of text.matchAll(regex)) {
    const r = auswerten(m);
    if (r) return r;
  }
  return null;
}

// --- Name ------------------------------------------------------------------------------------
const TRENNER = /\s{2,}|[,;()|\t]/u;
const istNamenswort = (w) => /^\p{Lu}\p{Ll}[\p{L}'’-]*$/u.test(w) && !KEIN_NAME.has(normalisiereName(w));

function segment(zeile, ab) {
  const m = TRENNER.exec(zeile.slice(ab));
  const ende = m ? ab + m.index : zeile.length;
  return { start: ab, ende, trenner: m?.[0] ?? '', weiter: m ? ende + m[0].length : zeile.length };
}

function woerter(zeile, seg) {
  return [...zeile.slice(seg.start, seg.ende).matchAll(/\S+/g)]
    .map((m) => ({ wort: m[0], start: seg.start + m.index, ende: seg.start + m.index + m[0].length }));
}

/**
 * Sucht in der Zeile nach dem Label einen Personennamen mit 2–3 Teilen.
 * Erkennt «Vorname Nachname», «Nachname Vorname» und «Nachname, Vorname», mit oder ohne «Herr/Frau».
 */
function nameAusZeile(zeile) {
  const anrede = /^\s*(?:(?:Herrn?|Frau|Hr\.|Fr\.)\s+)?/u.exec(zeile);
  const s1 = segment(zeile, anrede[0].length);
  let teile = woerter(zeile, s1);
  if (teile.length === 1 && s1.trenner === ',') {
    const zweiter = woerter(zeile, segment(zeile, s1.weiter));
    if (zweiter.length === 1) teile = teile.concat(zweiter); // «Brunner, Lukas»
  }
  const gueltig = [];
  for (const t of teile) {
    if (!istNamenswort(t.wort)) break;
    gueltig.push(t);
  }
  if (gueltig.length < 2 || gueltig.length > 3) return null;
  return { wert: gueltig.map((t) => t.wort).join(' '), start: gueltig[0].start, ende: gueltig.at(-1).ende };
}

// --- Absender --------------------------------------------------------------------------------
function titelSchreibweise(s) {
  return s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, vor, b) => vor + b.toUpperCase())
    .replace(/\b(Ag|Gmbh|Uvg)\b/g, (w) => ({ Ag: 'AG', Gmbh: 'GmbH', Uvg: 'UVG' })[w]);
}

function absenderAusKopf(text) {
  const m = /^[ \t]*(\S[^\n\r]*)/m.exec(text);
  if (!m) return null;
  const zeile = m[1];
  const teil = zeile.split(/\s[·|–]\s|\s\|\s|,\s/u)[0].trim();
  if (teil.length < 3) return null;
  const start = m.index + m[0].indexOf(teil);
  const istGross = /\p{L}/u.test(teil) && teil === teil.toUpperCase();
  return { wert: istGross ? titelSchreibweise(teil) : teil, start, ende: start + teil.length };
}

// --- Dokumenttyp -----------------------------------------------------------------------------
/** Typ mit der höchsten Punktzahl aus Haupt- und Nebenwörtern; bei Gleichstand gewinnt der frühere Treffer. */
export function dokumenttypErkennen(text) {
  const klein = text.toLowerCase();
  let best = null;
  for (const [typ, def] of Object.entries(DOKUMENTTYPEN)) {
    let punkte = 0;
    let treffer = null;
    for (const [liste, gewicht] of [[def.haupt, DOKUMENTTYP_GEWICHT.haupt], [def.neben, DOKUMENTTYP_GEWICHT.neben]]) {
      for (const wort of liste) {
        const i = klein.indexOf(wort);
        if (i < 0) continue;
        punkte += gewicht;
        if (gewicht === DOKUMENTTYP_GEWICHT.haupt && (!treffer || i < treffer.start)) treffer = { start: i, ende: i + wort.length };
      }
    }
    const frueher = (treffer?.start ?? Infinity) < (best?.treffer?.start ?? Infinity);
    if (punkte > 0 && (!best || punkte > best.punkte || (punkte === best.punkte && frueher))) best = { typ, punkte, treffer };
  }
  return best;
}

// --- Hauptfunktion ---------------------------------------------------------------------------
/**
 * @param {string} text  Originaltext des Dokuments
 * @returns {{ dokumenttyp: string|null, felder: Record<string, string|null>, fundstellen: Array<{feld:string,start:number,ende:number}>, hinweise: string[] }}
 */
export function extract(text) {
  const t = String(text ?? '');
  const felder = Object.fromEntries(FELDER.map((f) => [f, null]));
  const fundstellen = [];
  const hinweise = [];
  const merken = (feld, r) => {
    if (!r) return;
    felder[feld] = r.wert;
    fundstellen.push({ feld, start: r.start, ende: r.ende });
  };

  merken('schaden_nr', ersterTreffer(t, RE_SCHADEN, (m) => ({ wert: m[0].toUpperCase(), start: m.index, ende: m.index + m[0].length })));
  merken('name', ersterTreffer(t, RE_NAME, (m) => {
    const r = nameAusZeile(m[1]);
    return r && { wert: r.wert, start: m.indices[1][0] + r.start, ende: m.indices[1][0] + r.ende };
  }));
  merken('geburtsdatum', ersterTreffer(t, RE_GEB, datumAusTreffer));
  merken('unfalldatum', ersterTreffer(t, RE_UNFALL, datumAusTreffer));
  merken('gln', ersterTreffer(t, RE_GLN, (m) => {
    if (istGueltigeGln(m[0])) return { wert: m[0], start: m.index, ende: m.index + m[0].length };
    hinweise.push(`GLN ${m[0]} hat eine ungültige Prüfziffer und wurde ignoriert.`);
    return null;
  }));
  merken('zsr', ersterTreffer(t, RE_ZSR, (m) => ({ wert: m[0], start: m.index, ende: m.index + m[0].length })));
  merken('absender', absenderAusKopf(t));

  const typ = dokumenttypErkennen(t);
  if (typ?.treffer) fundstellen.push({ feld: 'dokumenttyp', start: typ.treffer.start, ende: typ.treffer.ende });
  if (!typ) hinweise.push('Dokumenttyp nicht erkannt.');

  fundstellen.sort((a, b) => a.start - b.start);
  return { dokumenttyp: typ?.typ ?? null, felder, fundstellen, hinweise };
}
