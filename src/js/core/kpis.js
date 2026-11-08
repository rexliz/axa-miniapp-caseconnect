// Kennzahlen für die Leiste oben: rein aus Fällen und Dokumenten berechnet.
import { vollstaendigkeit } from './completeness.js';

/** Offen = noch keinem Fall zugeordnet und kein Duplikat (Vorschlag, Widerspruch, Triage). */
export const istOffen = (d) => !d.zuordnung && d.status !== 'duplikat';

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
