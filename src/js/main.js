// Einstieg der App: Navigation zwischen den Ansichten (Hash-Routing), Kopfzeile, Laden der Daten.
import { DATENSAETZE } from './config.js';
import { abonnieren, aendern, aktiv, speicherVerfuegbar, zuruecksetzen, zustandLesen } from './state.js';
import { faelleVonUrl } from './io/cases.js';
import { fokusAufUeberschrift, h, toast } from './ui/dom.js';
import { renderFallliste } from './ui/cases.js';
import { renderFalldetail } from './ui/case-detail.js';
import { renderPosteingang } from './ui/inbox.js';
import { renderDokument } from './ui/document.js';
import { anzeigeStatus } from './ui/dom.js';
import { renderQuittung } from './ui/receipt.js';
import { renderKennzahlen } from './ui/kpis.js';
import { zuordnungenAlsCsv } from './core/export.js';
import { tagesSchluessel } from './core/dates.js';

const main = /** @type {HTMLElement} */ (document.getElementById('main'));
const nav = /** @type {HTMLElement} */ (document.getElementById('main-nav'));
const werkzeuge = /** @type {HTMLElement} */ (document.getElementById('header-tools'));
const kpiLeiste = /** @type {HTMLElement} */ (document.getElementById('kpi-bar'));

let ladeFehler = null;
let laedt = false;

/** Standard-Fallliste des aktiven Datensatzes laden (data/faelle.xlsx bzw. data/volumen/faelle.xlsx). */
async function standardLaden() {
  const key = zustandLesen().datensatz;
  const url = DATENSAETZE[key].faelle;
  laedt = true;
  ladeFehler = null;
  render();
  try {
    const ergebnis = await faelleVonUrl(url);
    if (ergebnis.fehler.length) throw new Error(ergebnis.fehler.join(' '));
    aendern((z) => {
      const ds = z.daten[key];
      ds.faelle = ergebnis.faelle;
      ds.faelleQuelle = { name: url.split('/').pop(), art: 'standard', geladen_am: null, warnungen: ergebnis.warnungen.length };
      ds.dokumente = [];
      ds.zaehler = {};
      ds.geladen = true;
    });
  } catch (e) {
    ladeFehler = String(e?.message ?? e);
  } finally {
    laedt = false;
    render();
  }
}

const ctx = { standardLaden };

// --- Routing -------------------------------------------------------------------------------
const ROUTEN = [
  { muster: /^#\/faelle$/, nav: 'faelle', ansicht: (c) => renderFallliste(c, ctx) },
  { muster: /^#\/fall\/(.+)$/, nav: 'faelle', ansicht: (c, m) => renderFalldetail(c, decodeURIComponent(m[1])) },
  { muster: /^#\/eingang$/, nav: 'eingang', ansicht: (c) => renderPosteingang(c) },
  { muster: /^#\/dokument\/(.+)$/, nav: 'eingang', ansicht: (c, m) => renderDokument(c, decodeURIComponent(m[1])) },
  { muster: /^#\/quittung\/(.+)$/, nav: 'eingang', ansicht: (c, m) => renderQuittung(c, decodeURIComponent(m[1])) },
];

/** Zuordnungen des aktiven Datensatzes als CSV herunterladen. */
function exportieren() {
  const d = aktiv();
  if (!d.dokumente.length) {
    toast('Noch keine Dokumente – zuerst den Posteingang laden.');
    return;
  }
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

function aktuelleRoute() {
  const hash = window.location.hash || '#/faelle';
  for (const r of ROUTEN) {
    const m = hash.match(r.muster);
    if (m) return { ...r, m };
  }
  return { ...ROUTEN[0], m: [] };
}

// --- Kopfzeile -------------------------------------------------------------------------------
function renderNav(aktivNav) {
  const d = aktiv();
  const link = (id, href, text, anzahl, zusatz = '') => h('a', { href, 'aria-current': aktivNav === id ? 'page' : null },
    text, anzahl != null ? h('span', { class: 'count', title: `${anzahl}${zusatz}` }, String(anzahl),
      zusatz ? h('span', { class: 'visually-hidden' }, zusatz) : null) : null);
  const offen = d.dokumente.filter((x) => anzeigeStatus(x).key === 'offen').length;
  nav.replaceChildren(
    link('faelle', '#/faelle', 'Fälle', d.faelle.length),
    link('eingang', '#/eingang', 'Posteingang', d.dokumente.length ? offen : null, ' offen'),
  );
}

function renderWerkzeuge() {
  if (werkzeuge.childElementCount) {
    // Nur Auswahl aktualisieren, damit der Tastaturfokus erhalten bleibt
    for (const r of werkzeuge.querySelectorAll('input[name="datensatz"]')) {
      /** @type {HTMLInputElement} */ (r).checked = r.getAttribute('value') === zustandLesen().datensatz;
    }
    return;
  }
  const auswahl = h('fieldset', { class: 'segmented' },
    h('legend', { class: 'visually-hidden' }, 'Datensatz'),
    Object.entries(DATENSAETZE).flatMap(([key, ds]) => [
      h('input', {
        type: 'radio', name: 'datensatz', id: `ds-${key}`, value: key, checked: zustandLesen().datensatz === key,
        onchange: () => wechsleDatensatz(key),
      }),
      h('label', { for: `ds-${key}` }, ds.label),
    ]),
  );
  const reset = h('button', {
    type: 'button', class: 'btn btn--ghost',
    onclick: async () => {
      if (!window.confirm('Demo zurücksetzen? Alle Zuordnungen und hochgeladenen Daten werden gelöscht.')) return;
      zuruecksetzen();
      await standardLaden();
      window.location.hash = '#/faelle';
      toast('Demo zurückgesetzt.');
    },
  }, 'Demo zurücksetzen');
  const exportKnopf = h('button', { type: 'button', class: 'btn btn--ghost', onclick: exportieren }, 'Export CSV');
  werkzeuge.replaceChildren(auswahl, exportKnopf, reset);
}

async function wechsleDatensatz(key) {
  aendern((z) => { z.datensatz = key; });
  if (!aktiv().geladen) await standardLaden();
  // Detailansichten gehören zum alten Datensatz → zurück zur jeweiligen Liste
  if (window.location.hash.startsWith('#/fall/')) window.location.hash = '#/faelle';
  if (window.location.hash.startsWith('#/dokument/')) window.location.hash = '#/eingang';
  toast(`${DATENSAETZE[key].label} aktiv.`);
}

// --- Rendern ---------------------------------------------------------------------------------
let letzterHash = null;

function render() {
  const route = aktuelleRoute();
  renderNav(route.nav);
  renderWerkzeuge();
  renderKennzahlen(kpiLeiste, aktiv().faelle, aktiv().dokumente);

  const hinweise = [];
  if (!speicherVerfuegbar()) {
    hinweise.push(h('div', { class: 'hinweis hinweis--warnung', role: 'status' },
      'Ihr Browser speichert keine Daten (z. B. privater Modus). Die App funktioniert, vergisst aber alles beim Neuladen.'));
  }
  if (ladeFehler) {
    hinweise.push(h('div', { class: 'hinweis hinweis--fehler', role: 'alert' },
      h('strong', {}, 'Die Fallliste konnte nicht geladen werden. '), ladeFehler, ' ',
      h('button', { type: 'button', class: 'btn-link', onclick: () => standardLaden() }, 'Erneut versuchen')));
  }
  if (laedt && !aktiv().geladen) {
    main.replaceChildren(...hinweise, h('p', { class: 'muted', role: 'status' }, 'Fallliste wird geladen …'));
    return;
  }
  // Fokus merken, damit Tastatur-Nutzende nach einer Aktion nicht auf <body> landen
  const fokus = document.activeElement;
  const fokusImInhalt = fokus instanceof HTMLElement && main.contains(fokus);
  const fokusId = fokusImInhalt ? fokus.id : '';

  const inhalt = h('div', { class: 'view' });
  route.ansicht(inhalt, route.m);
  main.replaceChildren(...hinweise, inhalt);

  const hash = window.location.hash || '#/faelle';
  if (letzterHash !== null && hash !== letzterHash) {
    fokusAufUeberschrift(inhalt); // echter Ansichtswechsel
  } else if (fokusImInhalt) {
    // gleiche Ansicht neu gezeichnet: gleiches Element wieder fokussieren, sonst die Überschrift
    const ziel = fokusId ? document.getElementById(fokusId) : null;
    if (ziel) ziel.focus({ preventScroll: true });
    else fokusAufUeberschrift(inhalt);
  }
  letzterHash = hash;
}

// --- Start -----------------------------------------------------------------------------------
window.addEventListener('hashchange', () => {
  // Skip-Link (#main) ist keine Route
  if (!window.location.hash.startsWith('#/') && window.location.hash !== '') return;
  render();
  window.scrollTo(0, 0);
});

document.querySelector('.skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
});

abonnieren(() => render());
render();
if (!aktiv().geladen) standardLaden();
