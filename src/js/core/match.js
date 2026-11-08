// Zuordnung eines Dokuments zu den Fällen der Excel-Liste: Score 0–100 mit Begründung.
import { MATCHING } from '../config.js';
import { formatCh, tageZwischen } from './dates.js';
import { nameAehnlichkeit } from './normalize.js';

/** Punkte eines Falls für die extrahierten Felder, mit nachvollziehbaren Gründen. */
export function punkteFuer(felder, fall, cfg = MATCHING) {
  const g = cfg.gewichte;
  const gruende = [];
  let score = 0;
  const plus = (punkte, text) => { score += punkte; gruende.push({ punkte, text, art: 'plus' }); };
  const minus = (text) => gruende.push({ punkte: 0, text, art: 'minus' });

  if (felder.name) {
    const s = nameAehnlichkeit(felder.name, fall.vorname, fall.nachname);
    if (s >= cfg.nameMinAehnlichkeit) {
      plus(Math.round(g.name * s), s === 1 ? 'Name stimmt überein' : `Name ähnlich (${Math.round(s * 100)} %)`);
    }
  }
  if (felder.geburtsdatum && fall.geburtsdatum) {
    if (felder.geburtsdatum === fall.geburtsdatum) plus(g.geburtsdatum, 'Geburtsdatum stimmt überein');
    else minus(`Geburtsdatum abweichend (Fall: ${formatCh(fall.geburtsdatum)})`);
  }
  if (felder.unfalldatum && fall.unfalldatum) {
    const diff = Math.abs(tageZwischen(felder.unfalldatum, fall.unfalldatum));
    if (diff === 0) plus(g.unfalldatumExakt, 'Unfalldatum stimmt überein');
    else if (diff <= cfg.unfalldatumToleranzTage) plus(g.unfalldatumNah, `Unfalldatum ±${diff} ${diff === 1 ? 'Tag' : 'Tage'}`);
  }
  const glnPasst = felder.gln && felder.gln === fall.leistungserbringer_gln;
  const zsrPasst = felder.zsr && felder.zsr === fall.leistungserbringer_zsr;
  if (glnPasst || zsrPasst) plus(g.absender, `Absender (${glnPasst ? 'GLN' : 'ZSR'}) ist beim Fall hinterlegt`);

  return { schaden_nr: fall.schaden_nr, score: Math.min(100, score), gruende };
}

const nachScore = (a, b) => b.score - a.score || a.schaden_nr.localeCompare(b.schaden_nr);

/**
 * @param {{ felder: Record<string,string|null> }} extraktion  Ergebnis von extract()
 * @param {object[]} faelle  Fälle aus der Excel-Liste
 * @returns {{ status: 'automatisch'|'vorschlag'|'triage'|'widerspruch', kandidaten: Array<{schaden_nr:string,score:number,gruende:Array<{punkte:number,text:string,art:string}>}>, begruendung: string }}
 */
export function match(extraktion, faelle, cfg = MATCHING) {
  const felder = extraktion.felder;
  const { automatisch, vorschlag, mindestAbstand } = cfg.schwellen;
  const alle = faelle.map((f) => punkteFuer(felder, f, cfg)).sort(nachScore);

  // 1) Schaden-Nr. gefunden und vorhanden → Score 100, aber Widersprüche prüfen
  const perNummer = felder.schaden_nr ? faelle.find((f) => f.schaden_nr === felder.schaden_nr) : null;
  if (perNummer) {
    const widersprueche = [];
    if (felder.name && nameAehnlichkeit(felder.name, perNummer.vorname, perNummer.nachname) < cfg.nameMinAehnlichkeit) {
      widersprueche.push(`Name «${felder.name}» passt nicht zu ${perNummer.vorname} ${perNummer.nachname}`);
    }
    if (felder.geburtsdatum && perNummer.geburtsdatum && felder.geburtsdatum !== perNummer.geburtsdatum) {
      widersprueche.push(`Geburtsdatum ${formatCh(felder.geburtsdatum)} passt nicht zu ${formatCh(perNummer.geburtsdatum)}`);
    }
    const eigener = {
      schaden_nr: perNummer.schaden_nr,
      score: 100,
      gruende: [
        { punkte: 100, text: 'Schaden-Nr. stimmt überein', art: 'plus' },
        ...widersprueche.map((text) => ({ punkte: 0, text, art: 'minus' })),
      ],
    };
    const andere = alle.filter((k) => k.schaden_nr !== perNummer.schaden_nr && k.score > 0);
    const kandidaten = [eigener, ...andere].slice(0, cfg.anzahlKandidaten);
    if (widersprueche.length) {
      const alternative = andere[0]?.score >= vorschlag ? ` Name und Geburtsdatum passen eher zu ${andere[0].schaden_nr}.` : '';
      return {
        status: 'widerspruch',
        kandidaten,
        begruendung: `Die Schaden-Nr. ${perNummer.schaden_nr} gehört zu ${perNummer.vorname} ${perNummer.nachname}, aber ${widersprueche.join(' und ')}.${alternative} Nicht automatisch zuordnen: Ein falsch zugeordneter Arztbericht wäre ein Datenschutzvorfall.`,
      };
    }
    return { status: 'automatisch', kandidaten, begruendung: `Schaden-Nr. ${perNummer.schaden_nr} gefunden${felder.name ? ', Name passt' : ''}${felder.geburtsdatum ? ', Geburtsdatum passt' : ''}.` };
  }

  // 2) Sonst Punkte vergeben
  const kandidaten = alle.filter((k) => k.score > 0).slice(0, cfg.anzahlKandidaten);
  const erster = kandidaten[0]?.score ?? 0;
  const zweiter = kandidaten[1]?.score ?? 0;
  const abstand = erster - zweiter;
  const unbekannteNr = felder.schaden_nr ? ` Die Schaden-Nr. ${felder.schaden_nr} steht nicht in der Fallliste.` : '';

  if (erster >= automatisch && abstand >= mindestAbstand) {
    return { status: 'automatisch', kandidaten, begruendung: `Eindeutig: ${erster} Punkte, ${abstand} Punkte Abstand zum nächsten Fall.${unbekannteNr}` };
  }
  if (erster >= vorschlag && abstand >= mindestAbstand) {
    return { status: 'vorschlag', kandidaten, begruendung: `${erster} Punkte: wahrscheinlich, aber nicht sicher genug für eine automatische Zuordnung.${unbekannteNr}` };
  }
  if (erster >= vorschlag) {
    return { status: 'triage', kandidaten, begruendung: `Mehrdeutig: Die besten Fälle liegen nur ${abstand} Punkte auseinander.${unbekannteNr}` };
  }
  return {
    status: 'triage',
    kandidaten,
    begruendung: kandidaten.length > 1 && abstand < mindestAbstand
      ? `Mehrdeutig und zu wenig Merkmale: höchstens ${erster} Punkte, ${kandidaten.filter((k) => k.score === erster).length > 1 ? 'mehrere Fälle gleichauf' : `nur ${abstand} Punkte Abstand`}.${unbekannteNr}`
      : `Kein Fall erreicht ${vorschlag} Punkte (höchstens ${erster}).${unbekannteNr}`,
  };
}
