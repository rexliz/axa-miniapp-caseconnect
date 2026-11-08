// Ansicht «Dokument»: Originaltext mit Markierungen, erkannte Merkmale, Kandidaten mit Score und Aktionen.
import { aendern, aktiv } from '../state.js';
import { DOKUMENTTYPEN } from '../config.js';
import { formatCh, formatChZeit } from '../core/dates.js';
import { h, statusBadge, toast } from './dom.js';

export const FELD_LABEL = {
  dokumenttyp: 'Dokumenttyp',
  schaden_nr: 'Schaden-Nr.',
  name: 'Name',
  geburtsdatum: 'Geburtsdatum',
  unfalldatum: 'Unfalldatum',
  gln: 'GLN',
  zsr: 'ZSR',
  absender: 'Absender',
};
const ART_TEXT = { automatisch: 'automatisch', bestaetigt: 'bestätigt', manuell: 'manuell' };

// --- Aktionen ----------------------------------------------------------------------------------
function dokAendern(id, fn) {
  aendern((z) => {
    const d = z.daten[z.datensatz].dokumente.find((x) => x.id === id);
    if (d) fn(d);
  });
}

export function zuordnen(id, schadenNr, art) {
  dokAendern(id, (d) => {
    d.zuordnung = { schaden_nr: schadenNr, art, zeitpunkt: new Date().toISOString() };
    d.manuelleTriage = false;
  });
  const d = aktiv().dokumente.find((x) => x.id === id);
  toast(`Zugeordnet zu ${schadenNr}. Empfangsbestätigung ${d?.eingangs_id ?? ''} erstellt.`);
}

function zurTriage(id) {
  dokAendern(id, (d) => { d.zuordnung = null; d.manuelleTriage = true; });
  toast('An die manuelle Triage übergeben.');
}

function aufheben(id) {
  dokAendern(id, (d) => { d.zuordnung = null; });
  toast('Zuordnung aufgehoben.');
}

// --- Bausteine ---------------------------------------------------------------------------------
/** Originaltext mit farbigen Markierungen der Fundstellen (nur Textknoten, kein innerHTML). */
function markierterText(text, fundstellen) {
  const pre = h('pre', { class: 'originaltext', tabindex: '0', 'aria-label': 'Originaltext mit markierten Fundstellen' });
  let pos = 0;
  for (const f of fundstellen) {
    if (f.start < pos) continue; // Überlappung: erste Fundstelle gewinnt
    if (f.start > pos) pre.append(text.slice(pos, f.start));
    pre.append(h('mark', { class: `fs fs--${f.feld}`, title: FELD_LABEL[f.feld] ?? f.feld }, text.slice(f.start, f.ende)));
    pos = f.ende;
  }
  pre.append(text.slice(pos));
  return pre;
}

function legende(fundstellen) {
  const felder = [...new Set(fundstellen.map((f) => f.feld))];
  return h('ul', { class: 'legende', 'aria-label': 'Legende der Markierungen' },
    felder.map((f) => h('li', {}, h('span', { class: `fs fs--${f} legende__chip`, 'aria-hidden': 'true' }), FELD_LABEL[f] ?? f)));
}

function merkmale(d) {
  const f = d.extraktion.felder;
  const wert = (feld, v) => (v ? h('span', { class: `fs fs--${feld}` }, v) : h('span', { class: 'muted' }, 'nicht gefunden'));
  const zeilen = [
    ['dokumenttyp', DOKUMENTTYPEN[d.extraktion.dokumenttyp]?.label],
    ['schaden_nr', f.schaden_nr],
    ['name', f.name],
    ['geburtsdatum', formatCh(f.geburtsdatum)],
    ['unfalldatum', formatCh(f.unfalldatum)],
    ['gln', f.gln],
    ['zsr', f.zsr],
    ['absender', d.absender],
  ];
  return h('section', { class: 'card', 'aria-labelledby': 'h-merkmale' },
    h('h2', { id: 'h-merkmale' }, 'Erkannte Merkmale'),
    h('dl', { class: 'daten' }, zeilen.flatMap(([feld, v]) => [h('dt', {}, FELD_LABEL[feld]), h('dd', {}, wert(feld, v))])),
    d.extraktion.hinweise.length ? h('ul', { class: 'hinweisliste' }, d.extraktion.hinweise.map((x) => h('li', {}, x))) : null,
    h('p', { class: 'muted klein' }, 'Regelbasierte Extraktion (Regex und Schlüsselwörter). Das Modul ist austauschbar, z. B. gegen ein Sprachmodell.'));
}

function scoreBalken(score, widerspruch = false) {
  const stufe = widerspruch ? 'is-tief' : score >= 85 ? 'is-hoch' : score >= 50 ? 'is-mittel' : 'is-tief';
  const fuellung = h('span', { class: `score__fuellung ${stufe}` });
  fuellung.style.width = `${score}%`; // CSSOM ist mit der CSP erlaubt (kein Inline-Style-Attribut)
  return h('span', { class: 'score', role: 'img', 'aria-label': `Score ${score} von 100` },
    h('span', { class: 'score__balken', 'aria-hidden': 'true' }, fuellung),
    h('span', { class: 'score__zahl' }, String(score)));
}

function kandidatenKarte(d, faelleNachNr) {
  const offen = !d.zuordnung && d.status !== 'duplikat';
  const karten = d.kandidaten.map((k, i) => {
    const fall = faelleNachNr.get(k.schaden_nr);
    const istZugeordnet = d.zuordnung?.schaden_nr === k.schaden_nr;
    const widerspruch = d.status === 'widerspruch' && k.gruende.some((g) => g.art === 'minus') && k.score === 100;
    let aktion = null;
    if (offen) {
      aktion = h('button', {
        type: 'button',
        class: i === 0 && d.status === 'vorschlag' ? 'btn' : 'btn btn--secondary',
        onclick: () => {
          if (widerspruch && !window.confirm('Name oder Geburtsdatum widersprechen diesem Fall. Wirklich zuordnen?')) return;
          zuordnen(d.id, k.schaden_nr, i === 0 && d.status === 'vorschlag' ? 'bestaetigt' : 'manuell');
        },
      }, i === 0 && d.status === 'vorschlag' ? 'Vorschlag bestätigen' : widerspruch ? 'Trotzdem zuordnen' : 'Diesem Fall zuordnen');
    }
    return h('li', { class: `kandidat${istZugeordnet ? ' is-zugeordnet' : ''}` },
      h('div', { class: 'kandidat__kopf' },
        h('div', {},
          h('a', { href: `#/fall/${encodeURIComponent(k.schaden_nr)}`, class: 'kandidat__name' }, fall ? `${fall.vorname} ${fall.nachname}` : k.schaden_nr),
          h('div', { class: 'muted klein' }, h('span', { class: 'mono' }, k.schaden_nr), fall ? ` · geb. ${formatCh(fall.geburtsdatum)} · Unfall ${formatCh(fall.unfalldatum)}` : '')),
        scoreBalken(k.score, widerspruch)),
      h('ul', { class: 'gruende' }, k.gruende.map((g) => h('li', { class: `grund grund--${g.art}` },
        h('span', { class: 'grund__punkte' }, g.art === 'plus' ? `+${g.punkte}` : '✗'), g.text))),
      istZugeordnet ? h('p', { class: 'kandidat__status' }, '✓ zugeordnet') : aktion);
  });
  return h('section', { class: 'card', 'aria-labelledby': 'h-kandidaten' },
    h('h2', { id: 'h-kandidaten' }, 'Kandidaten'),
    h('p', { class: 'begruendung' }, d.begruendung),
    karten.length ? h('ol', { class: 'kandidaten' }, karten) : h('p', { class: 'muted' }, 'Kein Fall hat übereinstimmende Merkmale.'));
}

function weitereAktionen(d, faelle) {
  if (d.status === 'duplikat') return null;
  const auswahl = h('select', { id: 'fall-auswahl', class: 'eingabe' },
    h('option', { value: '' }, 'Fall auswählen …'),
    faelle.slice().sort((a, b) => a.nachname.localeCompare(b.nachname, 'de-CH') || a.vorname.localeCompare(b.vorname, 'de-CH'))
      .map((f) => h('option', { value: f.schaden_nr }, `${f.nachname} ${f.vorname} · geb. ${formatCh(f.geburtsdatum)} · ${f.schaden_nr}`)));
  return h('section', { class: 'card', 'aria-labelledby': 'h-aktionen' },
    h('h2', { id: 'h-aktionen' }, d.zuordnung ? 'Zuordnung ändern' : 'Anderer Fall oder Triage'),
    h('label', { for: 'fall-auswahl', class: 'feldlabel' }, 'Anderen Fall wählen'),
    h('div', { class: 'reihe' }, auswahl,
      h('button', {
        type: 'button', class: 'btn btn--secondary',
        onclick: () => {
          if (!auswahl.value) { auswahl.focus(); toast('Bitte zuerst einen Fall auswählen.'); return; }
          zuordnen(d.id, auswahl.value, 'manuell');
        },
      }, 'Zuordnen')),
    h('div', { class: 'reihe reihe--abstand' },
      !d.manuelleTriage ? h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => zurTriage(d.id) }, 'An manuelle Triage geben') : h('span', { class: 'muted' }, 'Liegt in der manuellen Triage.'),
      d.zuordnung ? h('button', { type: 'button', class: 'btn-link', onclick: () => aufheben(d.id) }, 'Zuordnung aufheben') : null));
}

// --- Ansicht -------------------------------------------------------------------------------------
/** @param {HTMLElement} container @param {string} id */
export function renderDokument(container, id) {
  const ds = aktiv();
  const d = ds.dokumente.find((x) => x.id === id);
  const zurueck = h('p', { class: 'zurueck' }, h('a', { href: '#/eingang' }, '← Zum Posteingang'));
  if (!d) {
    container.replaceChildren(zurueck, h('h1', {}, 'Dokument nicht gefunden'), h('p', {}, 'Im aktiven Datensatz gibt es dieses Dokument nicht (mehr).'));
    return;
  }
  const faelleNachNr = new Map(ds.faelle.map((f) => [f.schaden_nr, f]));
  const original = d.duplikat_von ? ds.dokumente.find((x) => x.id === d.duplikat_von) : null;
  const fall = d.zuordnung ? faelleNachNr.get(d.zuordnung.schaden_nr) : null;

  const hinweise = [];
  if (original) {
    hinweise.push(h('div', { class: 'hinweis hinweis--info', role: 'status' },
      h('strong', {}, `Bereits eingegangen am ${formatChZeit(original.eingegangen_am)}, Eingangs-ID ${original.eingangs_id ?? original.id}. `),
      'Das Dokument ist inhaltlich identisch und wird nicht erneut verarbeitet. ',
      h('a', { href: `#/dokument/${original.id}` }, 'Original anzeigen')));
  } else if (d.zuordnung) {
    hinweise.push(h('div', { class: 'hinweis hinweis--ok', role: 'status' },
      h('strong', {}, `Zugeordnet zu ${d.zuordnung.schaden_nr}${fall ? ` (${fall.vorname} ${fall.nachname})` : ''}`),
      ` – ${ART_TEXT[d.zuordnung.art]} am ${formatChZeit(d.zuordnung.zeitpunkt)}.`));
  } else if (d.status === 'widerspruch') {
    hinweise.push(h('div', { class: 'hinweis hinweis--fehler', role: 'status' }, h('strong', {}, 'Widerspruch – bitte prüfen. '), d.begruendung));
  }

  container.replaceChildren(
    zurueck,
    h('div', { class: 'view-head' },
      h('div', {},
        h('h1', {}, DOKUMENTTYPEN[d.extraktion.dokumenttyp]?.label ?? 'Dokument (Typ nicht erkannt)'),
        h('p', { class: 'muted' }, `${d.absender || 'Absender unbekannt'} · ${d.dateiname} · eingegangen ${formatChZeit(d.eingegangen_am)}${d.eingangs_id ? ` · ${d.eingangs_id}` : ''}`)),
      h('div', { class: 'actions' }, statusBadge(d))),
    ...hinweise,
    h('div', { class: 'dok-raster' },
      h('section', { class: 'card dok-text', 'aria-labelledby': 'h-original' },
        h('h2', { id: 'h-original' }, 'Originaltext'),
        legende(d.extraktion.fundstellen),
        markierterText(d.text, d.extraktion.fundstellen)),
      h('div', { class: 'dok-seite' },
        merkmale(d),
        d.status !== 'duplikat' ? kandidatenKarte(d, faelleNachNr) : null,
        weitereAktionen(d, ds.faelle))),
  );
}
