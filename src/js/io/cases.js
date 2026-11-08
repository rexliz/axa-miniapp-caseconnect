// Lädt die Fallliste aus Excel (.xlsx) oder CSV mit SheetJS (lokal unter vendor/, kein CDN).
import * as XLSX from '../../vendor/xlsx.mjs';
import { zeilenZuFaellen } from '../core/cases.js';

/** Bytes → Text: UTF-8 (mit oder ohne BOM), sonst Windows-1252 (ältere Excel-CSV-Exporte). */
function bytesZuText(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Liest eine Tabelle (xlsx oder csv) und wandelt sie in Fälle um.
 * @param {ArrayBuffer|Uint8Array|string} daten
 * @param {string} dateiname  entscheidet über das Format (.csv oder .xlsx/.xls)
 */
export function tabelleLesen(daten, dateiname = '') {
  const istCsv = typeof daten === 'string' || /\.(csv|txt)$/i.test(dateiname);
  let mappe;
  if (istCsv) {
    const text = typeof daten === 'string' ? daten.replace(/^﻿/, '') : bytesZuText(new Uint8Array(daten));
    // raw: Werte bleiben Text (z. B. «14.02.1990», GLN ohne Zahlenformat)
    mappe = XLSX.read(text, { type: 'string', raw: true });
  } else {
    mappe = XLSX.read(daten instanceof Uint8Array ? daten : new Uint8Array(daten), { type: 'array' });
  }
  const blatt = mappe.Sheets[mappe.SheetNames[0]];
  if (!blatt) return { faelle: [], fehler: ['Die Datei enthält kein Tabellenblatt.'], warnungen: [] };
  // raw: true → Excel-Datumszellen kommen als Seriennummer, Textzellen als Text
  const zeilen = XLSX.utils.sheet_to_json(blatt, { raw: true, defval: '' });
  return zeilenZuFaellen(zeilen);
}

/** Lädt die Standard-Fallliste von der eigenen Seite (relativer Pfad). */
export async function faelleVonUrl(url) {
  const antwort = await fetch(url, { cache: 'no-cache' });
  if (!antwort.ok) throw new Error(`${url} konnte nicht geladen werden (HTTP ${antwort.status}).`);
  return tabelleLesen(await antwort.arrayBuffer(), url);
}

/** Liest eine vom Benutzer gewählte Datei (Upload). */
export async function faelleAusDatei(datei) {
  if (!/\.(xlsx|xls|csv)$/i.test(datei.name)) {
    return { faelle: [], fehler: [`«${datei.name}» ist keine .xlsx- oder .csv-Datei.`], warnungen: [] };
  }
  return tabelleLesen(await datei.arrayBuffer(), datei.name);
}
