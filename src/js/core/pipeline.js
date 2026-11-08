// Verarbeitung eines eingehenden Dokuments: Duplikat? → Extraktion → Matching → Status.
// Reine Funktion: bekommt den bisherigen Stand und gibt das neue Dokument und den neuen Zählerstand zurück.
import { extract } from './extract.js';
import { match } from './match.js';
import { findeOriginal, textHash } from './duplicate.js';
import { naechsteEingangsId } from './receipt.js';

/** Absendername: bevorzugt der Leistungserbringer aus der Fallliste (per GLN/ZSR), sonst der Briefkopf. */
export function absenderName(felder, faelle) {
  const fall = faelle.find((f) => (felder.gln && f.leistungserbringer_gln === felder.gln) || (felder.zsr && f.leistungserbringer_zsr === felder.zsr));
  return fall?.leistungserbringer || felder.absender || '';
}

/**
 * @param {string} text
 * @param {{ faelle: object[], dokumente: object[], zaehler: Record<string,number>, eingegangen_am?: string, dateiname?: string, quelle?: string }} stand
 * @returns {{ dokument: object, zaehler: Record<string,number> }}
 */
export function verarbeite(text, { faelle, dokumente, zaehler, eingegangen_am, dateiname = 'Eingefügter Text', quelle = 'text' }) {
  const zeit = eingegangen_am ?? new Date().toISOString();
  const hash = textHash(text);
  const extraktion = extract(text);
  const id = `D${String(dokumente.length + 1).padStart(4, '0')}`;
  const basis = {
    id, dateiname, quelle, text, hash, eingegangen_am: zeit, extraktion,
    absender: absenderName(extraktion.felder, faelle),
    zuordnung: null, manuelleTriage: false,
  };

  const original = findeOriginal(hash, dokumente);
  if (original) {
    return {
      dokument: {
        ...basis, eingangs_id: null, status: 'duplikat', duplikat_von: original.id, kandidaten: [],
        begruendung: `Inhaltlich identisch mit ${original.eingangs_id ?? original.id} vom ${zeit === original.eingegangen_am ? 'selben Zeitpunkt' : 'früheren Eingang'}.`,
      },
      zaehler,
    };
  }

  const { id: eingangsId, zaehler: neuerZaehler } = naechsteEingangsId(zaehler, zeit);
  const ergebnis = match(extraktion, faelle);
  return {
    dokument: {
      ...basis,
      eingangs_id: eingangsId,
      status: ergebnis.status,
      begruendung: ergebnis.begruendung,
      kandidaten: ergebnis.kandidaten,
      duplikat_von: null,
      zuordnung: ergebnis.status === 'automatisch'
        ? { schaden_nr: ergebnis.kandidaten[0].schaden_nr, art: 'automatisch', zeitpunkt: zeit }
        : null,
    },
    zaehler: neuerZaehler,
  };
}

/** Mehrere Dokumente nacheinander verarbeiten (Reihenfolge = Eingang). */
export function verarbeiteAlle(eingaenge, stand) {
  let dokumente = stand.dokumente.slice();
  let zaehler = { ...stand.zaehler };
  for (const e of eingaenge) {
    const r = verarbeite(e.text, { ...stand, ...e, dokumente, zaehler });
    dokumente.push(r.dokument);
    zaehler = r.zaehler;
  }
  return { dokumente, zaehler };
}
