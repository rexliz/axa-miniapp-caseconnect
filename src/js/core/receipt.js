// Eingangs-IDs und Empfangsbestätigung (Quittung).
import { DOKUMENTTYPEN, EINGANGS_ID_PRAEFIX } from '../config.js';
import { formatChZeit, tagesSchluessel } from './dates.js';

/**
 * Nächste Eingangs-ID im Format EB-JJJJMMTT-0001 (Zähler pro Tag).
 * @returns {{ id: string, zaehler: Record<string, number> }} neuer Zählerstand (unverändertes Original)
 */
export function naechsteEingangsId(zaehler, zeitstempel) {
  const tag = tagesSchluessel(zeitstempel);
  const nr = (zaehler[tag] ?? 0) + 1;
  return { id: `${EINGANGS_ID_PRAEFIX}-${tag}-${String(nr).padStart(4, '0')}`, zaehler: { ...zaehler, [tag]: nr } };
}

/** Quittung zu einem zugeordneten Dokument (null, solange keine Zuordnung besteht). */
export function quittung(dokument) {
  if (!dokument?.zuordnung || !dokument.eingangs_id) return null;
  return {
    eingangs_id: dokument.eingangs_id,
    zeitstempel: dokument.eingegangen_am,
    dokumenttyp: DOKUMENTTYPEN[dokument.extraktion?.dokumenttyp]?.label ?? 'Dokument (Typ nicht erkannt)',
    absender: dokument.absender || 'unbekannt',
    schaden_nr: dokument.zuordnung.schaden_nr,
    dateiname: dokument.dateiname,
  };
}

/** Quittung als kopierbarer Text (z. B. als Antwort-Mail an das Spital). */
export function quittungAlsText(q) {
  return [
    'EMPFANGSBESTÄTIGUNG',
    '',
    `Eingangs-ID:   ${q.eingangs_id}`,
    `Eingegangen:   ${formatChZeit(q.zeitstempel)}`,
    `Dokument:      ${q.dokumenttyp}`,
    `Absender:      ${q.absender}`,
    `Schaden-Nr.:   ${q.schaden_nr}`,
    '',
    'Ihr Dokument ist bei uns eingegangen und wurde dem Schadenfall zugeordnet.',
    'Bitte senden Sie es nicht erneut. Bei Rückfragen geben Sie bitte die Eingangs-ID an.',
    '',
    'Hackathon-Prototyp mit fiktiven Daten – keine offizielle AXA-Anwendung',
  ].join('\n');
}
