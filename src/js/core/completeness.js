// Vollständigkeit: Welche Unterlagen braucht ein Fall laut Falltyp, und welche sind eingegangen?
import { DOKUMENTTYPEN, FALLTYPEN } from '../config.js';
import { falltypSchluessel } from './cases.js';

/** Dokumente, die einem Fall zugeordnet sind (ohne Duplikate). */
export function dokumenteZumFall(schadenNr, dokumente) {
  return dokumente.filter((d) => d.zuordnung?.schaden_nr === schadenNr && d.status !== 'duplikat');
}

/**
 * @returns {{
 *   bekannt: boolean, positionen: Array<{typ:string,label:string,erhalten:boolean,eingegangen_am:string|null,eingangs_id:string|null,dokument_id:string|null}>,
 *   fehlend: string[], erhalten: number, total: number, vollstaendig: boolean, ampel: 'gruen'|'gelb'|'rot'|'grau'
 * }}
 */
export function vollstaendigkeit(fall, dokumente = [], regeln = FALLTYPEN) {
  const schluessel = falltypSchluessel(fall?.falltyp, regeln);
  if (!schluessel) {
    return { bekannt: false, positionen: [], fehlend: [], erhalten: 0, total: 0, vollstaendig: false, ampel: 'grau' };
  }
  const zugeordnet = dokumenteZumFall(fall.schaden_nr, dokumente)
    .slice()
    .sort((a, b) => String(a.eingegangen_am).localeCompare(String(b.eingegangen_am)));

  const positionen = regeln[schluessel].map((typ) => {
    const erstes = zugeordnet.find((d) => d.extraktion?.dokumenttyp === typ);
    return {
      typ,
      label: DOKUMENTTYPEN[typ]?.label ?? typ,
      erhalten: Boolean(erstes),
      eingegangen_am: erstes?.eingegangen_am ?? null,
      eingangs_id: erstes?.eingangs_id ?? null,
      dokument_id: erstes?.id ?? null,
    };
  });
  const erhalten = positionen.filter((p) => p.erhalten).length;
  const total = positionen.length;
  return {
    bekannt: true,
    positionen,
    fehlend: positionen.filter((p) => !p.erhalten).map((p) => p.typ),
    erhalten,
    total,
    vollstaendig: erhalten === total,
    ampel: erhalten === total ? 'gruen' : erhalten > 0 ? 'gelb' : 'rot',
  };
}
