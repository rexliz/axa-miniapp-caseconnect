// Ansicht «Quittung»: druckfreundliche Empfangsbestätigung, als Text kopierbar.
import { aktiv } from '../state.js';
import { formatChZeit } from '../core/dates.js';
import { quittung, quittungAlsText } from '../core/receipt.js';
import { h, kopieren, toast } from './dom.js';

export async function quittungKopieren(q) {
  toast((await kopieren(quittungAlsText(q))) ? 'Quittung als Text kopiert.' : 'Kopieren nicht möglich – bitte Text manuell markieren.');
}

/** Kompakte Quittungs-Karte für die Dokumentdetailansicht. */
export function quittungsKarte(d) {
  const q = quittung(d);
  if (!q) return null;
  return h('section', { class: 'card quittung-kurz', 'aria-labelledby': 'h-quittung' },
    h('h2', { id: 'h-quittung' }, 'Empfangsbestätigung'),
    h('p', {}, h('span', { class: 'mono gross' }, q.eingangs_id), h('br'), `${q.dokumenttyp} von ${q.absender}, eingegangen ${formatChZeit(q.zeitstempel)}, zugeordnet zu `, h('span', { class: 'mono' }, q.schaden_nr), '.'),
    h('div', { class: 'reihe' },
      h('a', { class: 'btn', href: `#/quittung/${d.id}` }, 'Quittung öffnen und drucken'),
      h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => quittungKopieren(q) }, 'Als Text kopieren')));
}

/** @param {HTMLElement} container @param {string} id */
export function renderQuittung(container, id) {
  const d = aktiv().dokumente.find((x) => x.id === id);
  const q = quittung(d);
  const zurueck = h('p', { class: 'zurueck no-print' }, h('a', { href: d ? `#/dokument/${d.id}` : '#/eingang' }, '← Zum Dokument'));
  if (!q) {
    container.replaceChildren(zurueck, h('h1', {}, 'Keine Quittung'),
      h('p', {}, 'Eine Empfangsbestätigung entsteht, sobald das Dokument einem Fall zugeordnet ist.'));
    return;
  }
  container.replaceChildren(
    zurueck,
    h('article', { class: 'card quittung', 'aria-labelledby': 'h-quittung-titel' },
      h('header', { class: 'quittung__kopf' },
        h('span', { class: 'brand__mark', 'aria-hidden': 'true' }, 'CC'),
        h('div', {}, h('h1', { id: 'h-quittung-titel' }, 'Empfangsbestätigung'), h('p', { class: 'muted' }, 'CaseConnect Lite · UVG-Fallführung'))),
      h('dl', { class: 'daten quittung__daten' },
        h('dt', {}, 'Eingangs-ID'), h('dd', { class: 'mono gross' }, q.eingangs_id),
        h('dt', {}, 'Eingegangen'), h('dd', {}, formatChZeit(q.zeitstempel)),
        h('dt', {}, 'Dokument'), h('dd', {}, q.dokumenttyp),
        h('dt', {}, 'Absender'), h('dd', {}, q.absender),
        h('dt', {}, 'Schaden-Nr.'), h('dd', { class: 'mono' }, q.schaden_nr),
        h('dt', {}, 'Datei'), h('dd', {}, q.dateiname)),
      h('p', {}, 'Ihr Dokument ist bei uns eingegangen und wurde dem Schadenfall zugeordnet. Bitte senden Sie es nicht erneut. Bei Rückfragen geben Sie bitte die Eingangs-ID an.'),
      h('p', { class: 'muted klein' }, 'Hackathon-Prototyp mit fiktiven Daten – keine offizielle AXA-Anwendung.')),
    h('div', { class: 'reihe no-print' },
      h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, 'Drucken'),
      h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => quittungKopieren(q) }, 'Als Text kopieren')),
  );
}
