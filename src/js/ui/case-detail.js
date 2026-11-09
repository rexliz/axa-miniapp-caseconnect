// Ansicht «Falldetail»: Stammdaten, Checkliste der Unterlagen, zugeordnete Dokumente und Nachforderung.
import { aendern, aktiv } from '../state.js';
import { DOKUMENTTYPEN } from '../config.js';
import { formatCh, formatChZeit } from '../core/dates.js';
import { dokumenteZumFall, vollstaendigkeit } from '../core/completeness.js';
import { briefAlsText, nachforderungen } from '../core/request.js';
import { ampel, h, kopieren, toast } from './dom.js';

let nachforderungOffen = null; // Schaden-Nr., für die die Nachforderung angezeigt wird
const ART_TEXT = { automatisch: 'automatisch', bestaetigt: 'bestätigt', manuell: 'manuell' };

function dl(paare) {
  return h('dl', { class: 'daten' }, paare.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v || '–')]));
}

function checkliste(fall, v) {
  if (!v.bekannt) return h('p', { class: 'muted' }, `Für den Falltyp «${fall.falltyp || '–'}» ist keine Checkliste hinterlegt (siehe config.js).`);
  return h('ul', { class: 'checkliste' }, v.positionen.map((p) => h('li', { class: p.erhalten ? 'is-ok' : 'is-fehlt' },
    h('span', { class: 'checkliste__symbol', 'aria-hidden': 'true' }, p.erhalten ? '✓' : '○'),
    h('span', { class: 'checkliste__typ' }, p.label),
    h('span', { class: 'checkliste__status' },
      p.erhalten
        ? ['erhalten am ', formatChZeit(p.eingegangen_am), ' · ', h('a', { href: `#/dokument/${p.dokument_id}`, class: 'mono' }, p.eingangs_id)]
        : 'fehlt'))));
}

/** Knopf oben rechts im Fall (nur wenn etwas fehlt). Die Texte erscheinen direkt darunter, gut sichtbar. */
function nachforderungKnopf(fall, v) {
  if (!v.bekannt || v.vollstaendig) return null;
  const offen = nachforderungOffen === fall.schaden_nr;
  return h('button', {
    type: 'button', class: offen ? 'btn btn--secondary' : 'btn', 'aria-expanded': String(offen), 'aria-controls': offen ? 'nachforderung' : null, id: 'nachforderung-knopf',
    onclick: () => { nachforderungOffen = offen ? null : fall.schaden_nr; aendern(() => {}); },
  }, offen ? 'Nachforderung ausblenden' : 'Nachforderung erstellen');
}

function nachforderungsBereich(fall, v) {
  if (!v.bekannt || v.vollstaendig || nachforderungOffen !== fall.schaden_nr) return null;
  const briefe = nachforderungen(fall, v);
  return h('section', { class: 'card nachforderung', id: 'nachforderung', 'aria-labelledby': 'h-nachforderung' },
    h('h2', { id: 'h-nachforderung' }, 'Nachforderung'),
    h('p', { class: 'muted klein' }, 'Entwürfe zum Kopieren. Sie nennen nur, was fehlt, und werden nicht automatisch verschickt.'),
    h('div', { class: 'briefe' }, briefe.map((b) => h('article', { class: 'brief' },
      h('div', { class: 'brief__kopf' },
        h('div', {},
          h('div', {}, h('strong', {}, 'An: '), b.empfaenger, b.rolle === 'arbeitgeber' ? h('span', { class: 'muted' }, ' (Arbeitgeber)') : h('span', { class: 'muted' }, ' (Leistungserbringer)')),
          h('div', {}, h('strong', {}, 'Betreff: '), b.betreff))),
      h('pre', { class: 'brief__text', tabindex: '0' }, b.text),
      h('button', {
        type: 'button', class: 'btn btn--secondary abstand-oben',
        onclick: async () => toast((await kopieren(briefAlsText(b))) ? 'Anfragetext kopiert.' : 'Kopieren nicht möglich – bitte Text manuell markieren.'),
      }, 'Text kopieren')))));
}

function dokumentListe(fall, dokumente) {
  const docs = dokumenteZumFall(fall.schaden_nr, dokumente);
  if (!docs.length) return h('p', { class: 'muted' }, 'Noch keine Dokumente zugeordnet.');
  return h('div', { class: 'table-wrap' }, h('table', { class: 'tabelle tabelle--kompakt' },
    h('thead', {}, h('tr', {}, ['Eingang', 'Eingangs-ID', 'Dokumenttyp', 'Absender', 'Zuordnung', 'Quittung'].map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, docs.map((d) => h('tr', {},
      h('td', { class: 'nowrap' }, formatChZeit(d.eingegangen_am)),
      h('td', { class: 'nowrap' }, h('a', { href: `#/dokument/${d.id}`, class: 'mono' }, d.eingangs_id)),
      h('td', {}, DOKUMENTTYPEN[d.extraktion?.dokumenttyp]?.label ?? 'unbekannt'),
      h('td', {}, d.absender),
      h('td', {}, ART_TEXT[d.zuordnung.art]),
      h('td', {}, h('a', { href: `#/quittung/${d.id}` }, 'anzeigen')))))));
}

/** @param {HTMLElement} container @param {string} schadenNr */
export function renderFalldetail(container, schadenNr) {
  const d = aktiv();
  const fall = d.faelle.find((f) => f.schaden_nr === schadenNr);
  const zurueck = h('p', { class: 'zurueck' }, h('a', { href: '#/faelle' }, '← Zur Fallliste'));
  if (!fall) {
    container.replaceChildren(zurueck, h('h1', {}, 'Fall nicht gefunden'),
      h('p', {}, `Die Schaden-Nr. ${schadenNr} gibt es im aktiven Datensatz nicht.`));
    return;
  }
  const v = vollstaendigkeit(fall, d.dokumente);

  container.replaceChildren(
    zurueck,
    h('div', { class: 'view-head' },
      h('div', {},
        h('h1', {}, `${fall.vorname} ${fall.nachname}`),
        h('p', { class: 'muted' }, h('span', { class: 'mono' }, fall.schaden_nr), ` · ${fall.falltyp}`)),
      h('div', { class: 'actions' }, ampel(v, { lang: true }), nachforderungKnopf(fall, v))),
    nachforderungsBereich(fall, v),
    h('div', { class: 'grid-2' },
      h('section', { class: 'card', 'aria-labelledby': 'h-falldaten' },
        h('h2', { id: 'h-falldaten' }, 'Falldaten'),
        dl([
          ['Schaden-Nr.', fall.schaden_nr],
          ['Name', `${fall.vorname} ${fall.nachname}`],
          ['Geburtsdatum', formatCh(fall.geburtsdatum)],
          ['Unfalldatum', formatCh(fall.unfalldatum)],
          ['Falltyp', fall.falltyp],
          ['Arbeitgeber', fall.arbeitgeber],
          ['Leistungserbringer', fall.leistungserbringer],
          ['GLN', fall.leistungserbringer_gln],
          ['ZSR', fall.leistungserbringer_zsr],
          ['Sachbearbeitung', fall.sachbearbeitung],
        ])),
      h('section', { class: 'card', 'aria-labelledby': 'h-unterlagen' },
        h('h2', { id: 'h-unterlagen' }, 'Nötige Unterlagen'),
        checkliste(fall, v),
        v.bekannt && v.vollstaendig ? h('p', { class: 'hinweis hinweis--ok abstand-oben' }, 'Alle nötigen Unterlagen sind eingegangen. Keine Nachforderung nötig.') : null)),
    h('section', { class: 'card abstand-oben', 'aria-labelledby': 'h-dokumente' },
      h('h2', { id: 'h-dokumente' }, 'Zugeordnete Dokumente'),
      dokumentListe(fall, d.dokumente)),
  );
}
