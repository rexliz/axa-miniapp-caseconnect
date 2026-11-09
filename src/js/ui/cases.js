// Ansicht «Fälle»: Tabelle aus der Excel-Liste mit Suche, Vollständigkeits-Ampel und eigenem Upload.
import { aktiv, aendern, zustandLesen } from '../state.js';
import { DATENSAETZE } from '../config.js';
import { formatCh, formatChZeit } from '../core/dates.js';
import { normalisiereName } from '../core/normalize.js';
import { vollstaendigkeit } from '../core/completeness.js';
import { faelleAusDatei } from '../io/cases.js';
import { ampel, h, toast } from './dom.js';

let suchbegriff = '';
let meldungen = null; // { art: 'fehler'|'warnung', titel, zeilen[] } nach einem Upload

function passt(fall, begriff) {
  if (!begriff) return true;
  const heuhaufen = normalisiereName([
    fall.schaden_nr, fall.vorname, fall.nachname, fall.arbeitgeber, fall.leistungserbringer, fall.sachbearbeitung, fall.falltyp,
  ].join(' ')) + ' ' + fall.schaden_nr.toLowerCase();
  return normalisiereName(begriff).split(' ').every((teil) => heuhaufen.includes(teil))
    || fall.schaden_nr.toLowerCase().includes(begriff.toLowerCase().trim());
}

function zeile(fall, dokumente) {
  const v = vollstaendigkeit(fall, dokumente);
  const link = `#/fall/${encodeURIComponent(fall.schaden_nr)}`;
  return h('tr', { class: 'zeile-link', dataset: { href: link } },
    h('td', {}, ampel(v)),
    h('td', { class: 'nowrap' }, h('a', { href: link, class: 'mono' }, fall.schaden_nr)),
    h('td', { class: 'nowrap' }, `${fall.nachname} ${fall.vorname}`),
    h('td', { class: 'nowrap' }, formatCh(fall.geburtsdatum)),
    h('td', { class: 'nowrap' }, formatCh(fall.unfalldatum)),
    h('td', {}, fall.falltyp),
    h('td', {}, fall.leistungserbringer),
    h('td', { class: 'spalte-optional' }, fall.arbeitgeber),
    h('td', { class: 'nowrap spalte-optional' }, fall.sachbearbeitung),
  );
}

function tabellenKoerper(faelle, dokumente) {
  const treffer = faelle.filter((f) => passt(f, suchbegriff));
  const tbody = h('tbody', {}, treffer.map((f) => zeile(f, dokumente)));
  if (treffer.length === 0) {
    tbody.append(h('tr', {}, h('td', { colspan: 9, class: 'leer' }, 'Keine Fälle gefunden.')));
  }
  return { tbody, anzahl: treffer.length };
}

async function dateiGewaehlt(datei) {
  const ergebnis = await faelleAusDatei(datei).catch((e) => ({ faelle: [], fehler: [String(e.message ?? e)], warnungen: [] }));
  if (ergebnis.fehler.length) {
    meldungen = { art: 'fehler', titel: `«${datei.name}» konnte nicht übernommen werden`, zeilen: ergebnis.fehler };
    aendern(() => {}); // neu zeichnen
    return;
  }
  const d = aktiv();
  if (d.dokumente.length && !window.confirm('Neue Fallliste laden? Der Posteingang dieses Datensatzes wird dabei zurückgesetzt.')) return;
  meldungen = ergebnis.warnungen.length
    ? { art: 'warnung', titel: `${ergebnis.faelle.length} Fälle übernommen – mit Hinweisen`, zeilen: ergebnis.warnungen }
    : null;
  aendern((z) => {
    const ds = z.daten[z.datensatz];
    ds.faelle = ergebnis.faelle;
    ds.faelleQuelle = { name: datei.name, art: 'upload', geladen_am: new Date().toISOString(), warnungen: ergebnis.warnungen.length };
    ds.dokumente = [];
    ds.zaehler = {};
    ds.geladen = true;
  });
  toast(`${ergebnis.faelle.length} Fälle aus «${datei.name}» geladen.`);
}

/** @param {HTMLElement} container @param {{ standardLaden: () => Promise<void> }} ctx */
export function renderFallliste(container, ctx) {
  const d = aktiv();
  const datensatz = DATENSAETZE[zustandLesen().datensatz];
  const quelle = d.faelleQuelle;

  const dateiInput = h('input', {
    type: 'file', accept: '.xlsx,.xls,.csv', class: 'visually-hidden', id: 'fall-upload', tabindex: '-1',
    onchange: (e) => {
      const datei = e.target.files?.[0];
      e.target.value = '';
      if (datei) dateiGewaehlt(datei);
    },
  });

  const kopf = h('div', { class: 'view-head' },
    h('div', {},
      h('h1', {}, 'Fälle'),
      h('p', { class: 'muted' },
        quelle
          ? `Quelle: ${quelle.name}${quelle.art === 'upload' ? ' (eigene Datei' + (quelle.geladen_am ? `, ${formatChZeit(quelle.geladen_am)}` : '') + ')' : ''} · ${d.faelle.length} Fälle · ${datensatz.label}`
          : 'Noch keine Fallliste geladen.'),
    ),
    h('div', { class: 'actions' },
      dateiInput,
      h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => dateiInput.click() }, 'Eigene Excel/CSV laden'),
      quelle?.art === 'upload'
        ? h('button', {
          type: 'button', class: 'btn btn--secondary',
          onclick: async () => {
            if (d.dokumente.length && !window.confirm('Standardliste wiederherstellen? Der Posteingang dieses Datensatzes wird zurückgesetzt.')) return;
            meldungen = null;
            await ctx.standardLaden();
          },
        }, 'Standardliste wiederherstellen')
        : null,
    ),
  );

  const meldungsBox = meldungen
    ? h('div', { class: `hinweis hinweis--${meldungen.art}`, role: meldungen.art === 'fehler' ? 'alert' : 'status' },
      h('strong', {}, meldungen.titel),
      h('ul', {}, meldungen.zeilen.slice(0, 8).map((z) => h('li', {}, z))),
      meldungen.zeilen.length > 8 ? h('p', {}, `… und ${meldungen.zeilen.length - 8} weitere.`) : null,
      h('button', { type: 'button', class: 'btn-link', onclick: () => { meldungen = null; aendern(() => {}); } }, 'Ausblenden'))
    : null;

  const zaehler = h('span', { class: 'muted', 'aria-live': 'polite' });
  const tabelle = h('table', { class: 'tabelle' },
    h('caption', { class: 'visually-hidden' }, 'Fallliste mit Vollständigkeit der Unterlagen'),
    h('thead', {}, h('tr', {},
      ['Unterlagen', 'Schaden-Nr.', 'Name', 'Geburtsdatum', 'Unfalldatum', 'Falltyp', 'Leistungserbringer', 'Arbeitgeber', 'Sachbearbeitung']
        .map((t, i) => h('th', { scope: 'col', class: i >= 7 ? 'spalte-optional' : null }, t)))), // optional: auf schmalen Bildschirmen ausgeblendet, im Falldetail sichtbar
  );
  const aktualisieren = () => {
    const { tbody, anzahl } = tabellenKoerper(d.faelle, d.dokumente);
    tabelle.querySelector('tbody')?.remove();
    tabelle.append(tbody);
    zaehler.textContent = `${anzahl} von ${d.faelle.length} Fällen`;
  };

  const suche = h('input', {
    type: 'search', id: 'fall-suche', class: 'eingabe', value: suchbegriff, autocomplete: 'off',
    placeholder: 'Name, Schaden-Nr., Arbeitgeber, Leistungserbringer …',
    oninput: (e) => { suchbegriff = e.target.value; aktualisieren(); },
  });

  // Klick auf eine Zeile öffnet den Fall (Tastatur: über den Link in der Zeile)
  tabelle.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button')) window.location.hash = tr.dataset.href;
  });

  const einstieg = !d.dokumente.length && !meldungsBox
    ? h('div', { class: 'hinweis hinweis--info' },
      h('strong', {}, 'So geht’s: '),
      'Fälle aus ', h('span', { class: 'mono' }, quelle?.name ?? 'faelle.xlsx'), '. ',
      'Im ', h('a', { href: '#/eingang' }, 'Posteingang'), ' Berichte laden – die App ordnet sie zu und zeigt hier, was fehlt.')
    : null;

  aktualisieren();
  container.replaceChildren(
    kopf,
    meldungsBox ?? '',
    einstieg ?? '',
    h('section', { class: 'card card--flush' },
      h('div', { class: 'toolbar' },
        h('label', { for: 'fall-suche', class: 'toolbar__label' }, 'Suchen'),
        suche,
        zaehler),
      h('div', { class: 'table-wrap' }, tabelle)),
  );
}
