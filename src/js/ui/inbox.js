// Ansicht «Posteingang»: Demo-Posteingang laden, Text einfügen, .txt per Drag & Drop, Liste mit Ergebnis.
import { aendern, aktiv, zustandLesen } from '../state.js';
import { DATENSAETZE, DOKUMENTTYPEN } from '../config.js';
import { formatChZeit, tagesSchluessel } from '../core/dates.js';
import { verarbeiteAlle } from '../core/pipeline.js';
import { zuordnungenAlsCsv } from '../core/export.js';
import { posteingangLaden, textDateienLesen } from '../io/inbox.js';
import { anzeigeStatus, h, statusBadge, toast } from './dom.js';

let filter = 'alle';
let entwurf = ''; // eingefügter, noch nicht verarbeiteter Text
let meldung = null;

/** Verarbeitet neue Eingänge im aktiven Datensatz. Gibt die neuen Dokumente zurück. */
export function eingaengeVerarbeiten(eingaenge) {
  let neu = [];
  aendern((z) => {
    const ds = z.daten[z.datensatz];
    const vorher = ds.dokumente.length;
    const r = verarbeiteAlle(eingaenge, { faelle: ds.faelle, dokumente: ds.dokumente, zaehler: ds.zaehler });
    ds.dokumente = r.dokumente;
    ds.zaehler = r.zaehler;
    neu = r.dokumente.slice(vorher);
  });
  return neu;
}

function zusammenfassung(dokumente) {
  const zaehle = (fn) => dokumente.filter(fn).length;
  const teile = [
    [zaehle((d) => d.zuordnung?.art === 'automatisch'), 'automatisch zugeordnet'],
    [zaehle((d) => d.status === 'vorschlag'), 'Vorschlag'],
    [zaehle((d) => d.status === 'triage'), 'Triage'],
    [zaehle((d) => d.status === 'widerspruch'), 'Widerspruch'],
    [zaehle((d) => d.status === 'duplikat'), 'Duplikat'],
  ].filter(([n]) => n > 0).map(([n, t]) => `${n} ${t}`);
  return `${dokumente.length} ${dokumente.length === 1 ? 'Dokument' : 'Dokumente'} verarbeitet: ${teile.join(', ')}.`;
}

/** Nach dem Verarbeiten: Einzeldokument direkt öffnen, mehrere zusammenfassen. */
function nachVerarbeitung(neu) {
  if (neu.length === 1) {
    window.location.hash = `#/dokument/${neu[0].id}`;
    toast(zusammenfassung(neu));
  } else if (neu.length) {
    meldung = { art: 'ok', text: zusammenfassung(neu) };
    toast(zusammenfassung(neu));
    aendern(() => {});
  }
}

async function mitgeliefertenPosteingangLaden() {
  const key = zustandLesen().datensatz;
  const d = aktiv();
  if (d.dokumente.some((x) => x.quelle === key)
    && !window.confirm('Dieser Posteingang wurde bereits geladen. Nochmals laden? Alle Berichte werden dann als Duplikate erkannt.')) return;
  try {
    const eingaenge = await posteingangLaden(key);
    // Demo-Berichte «gehen jetzt ein» (je 1 Sekunde Abstand), Volumen-Berichte haben eigene Eingangszeiten
    const jetzt = Date.now();
    eingaenge.forEach((e, i) => { e.eingegangen_am ??= new Date(jetzt - (eingaenge.length - 1 - i) * 1000).toISOString(); });
    nachVerarbeitung(eingaengeVerarbeiten(eingaenge));
  } catch (e) {
    meldung = { art: 'fehler', text: `Der Posteingang konnte nicht geladen werden: ${e?.message ?? e}` };
    aendern(() => {});
  }
}

/** Zuordnungen des aktiven Datensatzes als CSV herunterladen. */
function exportieren() {
  const d = aktiv();
  const blob = new Blob([zuordnungenAlsCsv(d.dokumente)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const heute = tagesSchluessel(new Date().toISOString()); // lokales Datum JJJJMMTT
  const a = h('a', { href: url, download: `caseconnect-zuordnungen-${zustandLesen().datensatz}-${heute}.csv`, class: 'visually-hidden' });
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${d.dokumente.length} Zuordnungen als CSV exportiert.`);
}

async function dateienAnnehmen(dateien) {
  const { eingaenge, abgelehnt } = await textDateienLesen(dateien);
  if (abgelehnt.length) {
    meldung = { art: 'warnung', text: `Nicht übernommen: ${abgelehnt.join('; ')}` };
    if (!eingaenge.length) aendern(() => {});
  }
  if (eingaenge.length) nachVerarbeitung(eingaengeVerarbeiten(eingaenge));
}

function eingabeBereich() {
  const textfeld = h('textarea', {
    id: 'eingabe-text', class: 'eingabe eingabe--text', rows: '7', spellcheck: 'false',
    placeholder: 'Text eines Berichts hier einfügen (z. B. aus einer E-Mail) …',
    oninput: (e) => { entwurf = e.target.value; knopf.disabled = !entwurf.trim(); },
  });
  textfeld.value = entwurf;
  const knopf = h('button', {
    type: 'button', class: 'btn', disabled: !entwurf.trim(),
    onclick: () => {
      const text = entwurf;
      entwurf = '';
      nachVerarbeitung(eingaengeVerarbeiten([{ text, dateiname: 'Eingefügter Text', quelle: 'text' }]));
    },
  }, 'Text verarbeiten');

  const dateiInput = h('input', {
    type: 'file', accept: '.txt,text/plain', multiple: true, class: 'visually-hidden', tabindex: '-1', id: 'txt-upload',
    onchange: (e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) dateienAnnehmen(f); },
  });
  const zone = h('div', {
    class: 'dropzone', role: 'button', tabindex: '0', 'aria-describedby': 'dropzone-hilfe',
    onclick: () => dateiInput.click(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dateiInput.click(); } },
    ondragover: (e) => { e.preventDefault(); zone.classList.add('is-aktiv'); },
    ondragleave: () => zone.classList.remove('is-aktiv'),
    ondrop: (e) => {
      e.preventDefault();
      zone.classList.remove('is-aktiv');
      const f = [...(e.dataTransfer?.files ?? [])];
      if (f.length) dateienAnnehmen(f);
    },
  },
  h('span', { class: 'dropzone__icon', 'aria-hidden': 'true' }, '⇩'),
  h('strong', {}, '.txt-Datei hierher ziehen'),
  h('span', { id: 'dropzone-hilfe', class: 'muted' }, 'oder klicken bzw. Enter drücken, um Dateien auszuwählen'));

  return h('section', { class: 'card eingabe-karte', 'aria-labelledby': 'h-hinzufuegen' },
    h('h2', { id: 'h-hinzufuegen' }, 'Bericht hinzufügen'),
    h('div', { class: 'eingabe-raster' },
      h('div', { class: 'eingabe-spalte' },
        h('label', { for: 'eingabe-text', class: 'feldlabel' }, 'Text einfügen'),
        textfeld,
        h('div', {}, knopf)),
      h('div', { class: 'eingabe-spalte' },
        h('span', { class: 'feldlabel' }, 'Datei ablegen'),
        zone, dateiInput)));
}

function zeile(d, faelleNachNr, dokNachId) {
  const fall = d.zuordnung ? faelleNachNr.get(d.zuordnung.schaden_nr) : null;
  const top = d.kandidaten?.[0];
  const original = d.duplikat_von ? dokNachId.get(d.duplikat_von) : null;
  const link = `#/dokument/${d.id}`;
  return h('tr', { class: 'zeile-link', dataset: { href: link } },
    h('td', { class: 'nowrap' },
      h('a', { href: link, class: d.eingangs_id ? 'mono' : 'muted' }, d.eingangs_id ?? 'keine (Duplikat)'),
      h('div', { class: 'muted klein' }, formatChZeit(d.eingegangen_am))),
    h('td', {}, h('div', {}, d.absender || '–'), h('div', { class: 'muted klein datei', title: d.dateiname }, d.dateiname)),
    h('td', {}, DOKUMENTTYPEN[d.extraktion?.dokumenttyp]?.label ?? 'unbekannt'),
    h('td', {}, statusBadge(d)),
    h('td', { class: 'nowrap' },
      fall ? [h('a', { href: `#/fall/${encodeURIComponent(fall.schaden_nr)}`, class: 'mono' }, fall.schaden_nr),
        h('div', { class: 'muted klein' }, `${fall.vorname} ${fall.nachname}`)]
        : d.status === 'duplikat' ? h('span', { class: 'muted' }, 'Duplikat von', h('br'), h('span', { class: 'mono' }, original?.eingangs_id ?? 'früherem Eingang'))
          : top ? h('span', { class: 'muted' }, `${top.schaden_nr} (${top.score})`) : h('span', { class: 'muted' }, '–')),
  );
}

/** @param {HTMLElement} container */
export function renderPosteingang(container) {
  const d = aktiv();
  const key = zustandLesen().datensatz;
  const faelleNachNr = new Map(d.faelle.map((f) => [f.schaden_nr, f]));
  const dokNachId = new Map(d.dokumente.map((x) => [x.id, x]));
  const zaehle =(k) => d.dokumente.filter((x) => k === 'alle' || anzeigeStatus(x).key === k).length;
  const knopfText = key === 'demo' ? 'Demo-Posteingang laden' : 'Volumen-Posteingang laden (300 Berichte)';

  const kopf = h('div', { class: 'view-head' },
    h('div', {},
      h('h1', {}, 'Posteingang'),
      h('p', { class: 'muted' }, `${d.dokumente.length} Dokumente · ${zaehle('offen')} offen · ${DATENSAETZE[key].label}`)),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn', onclick: mitgeliefertenPosteingangLaden }, knopfText),
      d.dokumente.length ? h('button', { type: 'button', class: 'btn btn--secondary', id: 'export-knopf', onclick: exportieren }, 'Export CSV') : null));

  const hinweis = meldung
    ? h('div', { class: `hinweis hinweis--${meldung.art}`, role: meldung.art === 'fehler' ? 'alert' : 'status' }, meldung.text, ' ',
      h('button', { type: 'button', class: 'btn-link', onclick: () => { meldung = null; aendern(() => {}); } }, 'Ausblenden'))
    : null;

  let liste;
  if (!d.dokumente.length) {
    liste = h('section', { class: 'card leer-karte' },
      h('h2', {}, 'Noch keine Dokumente'),
      h('p', {}, 'Laden Sie den mitgelieferten Posteingang mit fiktiven Arztberichten oder fügen Sie oben einen eigenen Text ein.'),
      h('button', { type: 'button', class: 'btn', onclick: mitgeliefertenPosteingangLaden }, knopfText));
  } else {
    const tabs = h('div', { class: 'filter', role: 'group', 'aria-label': 'Dokumente filtern' },
      [['alle', 'Alle'], ['offen', 'Offen'], ['zugeordnet', 'Zugeordnet'], ['duplikat', 'Duplikate']].map(([k, t]) => h('button', {
        type: 'button', class: 'filter__knopf', 'aria-pressed': String(filter === k), id: `filter-${k}`,
        onclick: () => { filter = k; aendern(() => {}); },
      }, t, h('span', { class: 'filter__zahl' }, String(zaehle(k))))));
    const sichtbar = d.dokumente.filter((x) => filter === 'alle' || anzeigeStatus(x).key === filter);
    const tabelle = h('table', { class: 'tabelle' },
      h('caption', { class: 'visually-hidden' }, 'Eingegangene Dokumente mit Zuordnungsergebnis'),
      h('thead', {}, h('tr', {}, ['Eingang', 'Absender / Datei', 'Dokumenttyp', 'Ergebnis', 'Fall'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, sichtbar.length ? sichtbar.map((x) => zeile(x, faelleNachNr, dokNachId)) : h('tr', {}, h('td', { colspan: 5, class: 'leer' }, 'Keine Dokumente in diesem Filter.'))));
    tabelle.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a, button')) window.location.hash = tr.dataset.href;
    });
    liste = h('section', { class: 'card card--flush' }, h('div', { class: 'toolbar' }, tabs), h('div', { class: 'table-wrap' }, tabelle));
  }

  container.replaceChildren(kopf, hinweis ?? '', liste, eingabeBereich());
}
