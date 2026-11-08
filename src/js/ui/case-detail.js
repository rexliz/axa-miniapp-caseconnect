// Ansicht «Falldetail»: Stammdaten aus der Excel-Liste und Checkliste der nötigen Unterlagen.
import { aktiv } from '../state.js';
import { formatCh, formatChZeit } from '../core/dates.js';
import { vollstaendigkeit } from '../core/completeness.js';
import { ampel, h } from './dom.js';

function dl(paare) {
  return h('dl', { class: 'daten' }, paare.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v || '–')]));
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
  const checkliste = v.bekannt
    ? h('ul', { class: 'checkliste' }, v.positionen.map((p) => h('li', { class: p.erhalten ? 'is-ok' : 'is-fehlt' },
      h('span', { class: 'checkliste__symbol', 'aria-hidden': 'true' }, p.erhalten ? '✓' : '○'),
      h('span', { class: 'checkliste__typ' }, p.label),
      h('span', { class: 'checkliste__status' },
        p.erhalten ? `erhalten am ${formatChZeit(p.eingegangen_am)}${p.eingangs_id ? ` · ${p.eingangs_id}` : ''}` : 'fehlt'),
    )))
    : h('p', { class: 'muted' }, `Für den Falltyp «${fall.falltyp || '–'}» ist keine Checkliste hinterlegt (siehe config.js).`);

  container.replaceChildren(
    zurueck,
    h('div', { class: 'view-head' },
      h('div', {},
        h('h1', {}, `${fall.vorname} ${fall.nachname}`),
        h('p', { class: 'muted' }, h('span', { class: 'mono' }, fall.schaden_nr), ` · ${fall.falltyp}`)),
      h('div', { class: 'actions' }, ampel(v, { lang: true })),
    ),
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
        checkliste),
    ),
  );
}
