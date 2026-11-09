// Kennzahlen für die Leiste oben: rein aus Fällen und Dokumenten berechnet.
import { vollstaendigkeit } from './completeness.js';

/** Offen = noch keinem Fall zugeordnet und kein Duplikat (Vorschlag, Widerspruch, Triage). */
export const istOffen = (d) => !d.zuordnung && d.status !== 'duplikat';

/**
 * Arbeitsliste: nächstes offenes Dokument nach dem aktuellen (in Eingangsreihenfolge, am Ende wieder von vorne).
 * @returns {{ dokument: object|null, anzahl: number }} anzahl = offene Dokumente ausser dem aktuellen
 */
export function naechstesOffenes(dokumente, aktuelleId) {
  const offen = dokumente.filter((d) => istOffen(d) && d.id !== aktuelleId);
  const pos = dokumente.findIndex((d) => d.id === aktuelleId);
  const danach = offen.find((d) => dokumente.indexOf(d) > pos);
  return { dokument: danach ?? offen[0] ?? null, anzahl: offen.length };
}

export function kennzahlen(faelle, dokumente) {
  const total = dokumente.length;
  const duplikate = dokumente.filter((d) => d.status === 'duplikat').length;
  const eindeutig = total - duplikate;
  const automatisch = dokumente.filter((d) => d.zuordnung?.art === 'automatisch').length;
  const zugeordnet = dokumente.filter((d) => d.zuordnung).length;
  const offen = dokumente.filter(istOffen).length;
  const pruefbar = faelle.map((f) => vollstaendigkeit(f, dokumente)).filter((v) => v.bekannt);
  return {
    total,
    duplikate,
    eindeutig,
    automatisch,
    zugeordnet,
    anteilAutomatisch: eindeutig ? automatisch / eindeutig : 0,
    offen,
    faelle: faelle.length,
    faelleMitCheckliste: pruefbar.length,
    unvollstaendig: pruefbar.filter((v) => !v.vollstaendig).length,
    vollstaendig: pruefbar.filter((v) => v.vollstaendig).length,
  };
}
