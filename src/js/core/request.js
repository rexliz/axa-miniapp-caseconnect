// Nachforderung fehlender Unterlagen: höflicher, kopierbarer Anfragetext – nur für tatsächlich Fehlendes.
// Medizinische Berichte gehen an den Leistungserbringer, die Unfallmeldung an den Arbeitgeber.
import { DOKUMENTTYPEN, VOM_ARBEITGEBER } from '../config.js';
import { formatCh, formatChZeit } from './dates.js';

const label = (typ) => DOKUMENTTYPEN[typ]?.label ?? typ;
const eingangsDatum = (zeitstempel) => formatChZeit(zeitstempel).slice(0, 10);

function bereitsErhalten(positionen) {
  if (!positionen.length) return [];
  return [
    'Bereits erhalten haben wir:',
    ...positionen.map((p) => `– ${p.label} (Eingang ${eingangsDatum(p.eingegangen_am)}${p.eingangs_id ? `, ${p.eingangs_id}` : ''})`),
    'Diese Unterlagen müssen Sie nicht erneut senden.',
    '',
  ];
}

function gruss(fall) {
  return ['Freundliche Grüsse', '', fall.sachbearbeitung || 'Sachbearbeitung', 'UVG-Fallführung'];
}

/**
 * @param {object} fall  Fall aus der Excel-Liste
 * @param {ReturnType<import('./completeness.js').vollstaendigkeit>} v  Ergebnis von vollstaendigkeit()
 * @returns {Array<{ rolle: 'leistungserbringer'|'arbeitgeber', empfaenger: string, betreff: string, text: string, fehlend: string[] }>}
 *          leer, wenn nichts fehlt
 */
export function nachforderungen(fall, v) {
  if (!v?.bekannt || v.vollstaendig) return [];
  const person = `${fall.vorname} ${fall.nachname}`;
  const geb = fall.geburtsdatum ? ` (geb. ${formatCh(fall.geburtsdatum)})` : '';
  const unfall = fall.unfalldatum ? `vom ${formatCh(fall.unfalldatum)}` : '';
  const fehlendMedizin = v.fehlend.filter((t) => !VOM_ARBEITGEBER.includes(t));
  const fehlendArbeitgeber = v.fehlend.filter((t) => VOM_ARBEITGEBER.includes(t));
  const briefe = [];

  if (fehlendMedizin.length) {
    const erhalten = v.positionen.filter((p) => p.erhalten && !VOM_ARBEITGEBER.includes(p.typ));
    briefe.push({
      rolle: 'leistungserbringer',
      empfaenger: fall.leistungserbringer || 'Leistungserbringer',
      betreff: `Nachforderung medizinischer Unterlagen – Schaden-Nr. ${fall.schaden_nr}, ${person}${geb}`,
      fehlend: fehlendMedizin,
      text: [
        'Sehr geehrte Damen und Herren',
        '',
        `Für die Beurteilung des Unfalls ${unfall} von ${person}${geb} benötigen wir noch folgende Unterlagen:`.replace('  ', ' '),
        '',
        ...fehlendMedizin.map((t) => `– ${label(t)}`),
        '',
        ...bereitsErhalten(erhalten),
        `Bitte geben Sie bei Ihrer Antwort die Schaden-Nr. ${fall.schaden_nr} an. So können wir die Unterlagen sofort dem Fall zuordnen und die Leistungen rasch prüfen.`,
        '',
        'Vielen Dank für Ihre Unterstützung.',
        '',
        ...gruss(fall),
      ].join('\n'),
    });
  }

  if (fehlendArbeitgeber.length) {
    briefe.push({
      rolle: 'arbeitgeber',
      empfaenger: fall.arbeitgeber || 'Arbeitgeber',
      betreff: `Unfallmeldung – Schaden-Nr. ${fall.schaden_nr}, ${person}`,
      fehlend: fehlendArbeitgeber,
      text: [
        'Sehr geehrte Damen und Herren',
        '',
        `Zum Unfall ${unfall} Ihrer mitarbeitenden Person ${person}${geb} liegt uns noch keine ${fehlendArbeitgeber.map(label).join(' und ')} vor.`.replace('  ', ' '),
        `Bitte senden Sie uns diese mit Angabe der Schaden-Nr. ${fall.schaden_nr}, damit wir den Fall vollständig beurteilen können.`,
        '',
        'Vielen Dank für Ihre Mithilfe.',
        '',
        ...gruss(fall),
      ].join('\n'),
    });
  }
  return briefe;
}

/** Brief als kopierbarer Text inkl. Empfänger und Betreff. */
export const briefAlsText = (b) => `An: ${b.empfaenger}\nBetreff: ${b.betreff}\n\n${b.text}`;
