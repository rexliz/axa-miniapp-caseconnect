// Export der Zuordnungen als CSV (Semikolon, UTF-8 mit BOM → öffnet sich in Schweizer Excel korrekt).
import { DOKUMENTTYPEN } from '../config.js';

export const EXPORT_SPALTEN = [
  'eingangs_id', 'eingegangen_am', 'dateiname', 'absender', 'dokumenttyp', 'ergebnis_maschine', 'score',
  'schaden_nr', 'zuordnung_art', 'zugeordnet_am', 'manuelle_triage', 'duplikat_von',
];

const ERGEBNIS = {
  automatisch: 'automatisch zugeordnet', vorschlag: 'Vorschlag prüfen', triage: 'manuelle Triage',
  widerspruch: 'Widerspruch – prüfen', duplikat: 'Duplikat',
};

const zelle = (wert) => {
  const s = String(wert ?? '');
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function zuordnungenAlsCsv(dokumente) {
  const nachId = new Map(dokumente.map((d) => [d.id, d]));
  const zeilen = dokumente.map((d) => {
    const top = d.zuordnung ? d.kandidaten?.find((k) => k.schaden_nr === d.zuordnung.schaden_nr) : d.kandidaten?.[0];
    return [
      d.eingangs_id,
      d.eingegangen_am,
      d.dateiname,
      d.absender,
      DOKUMENTTYPEN[d.extraktion?.dokumenttyp]?.label ?? 'unbekannt',
      ERGEBNIS[d.status] ?? d.status,
      top?.score ?? '',
      d.zuordnung?.schaden_nr ?? '',
      d.zuordnung?.art ?? '',
      d.zuordnung?.zeitpunkt ?? '',
      d.manuelleTriage ? 'ja' : '',
      d.duplikat_von ? (nachId.get(d.duplikat_von)?.eingangs_id ?? d.duplikat_von) : '',
    ];
  });
  return `﻿${[EXPORT_SPALTEN, ...zeilen].map((z) => z.map(zelle).join(';')).join('\r\n')}\r\n`;
}
