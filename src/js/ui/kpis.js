// Kennzahlen-Leiste: fünf Stat-Tiles unter dem Header.
import { kennzahlen } from '../core/kpis.js';
import { h } from './dom.js';

const zahl = (n) => n.toLocaleString('de-CH');

function kachel(label, wert, zusatz, extra = null) {
  return h('div', { class: 'kpi' },
    h('dt', { class: 'kpi__label' }, label),
    h('dd', { class: 'kpi__wert' }, wert),
    h('dd', { class: 'kpi__zusatz' }, zusatz),
    extra ? h('dd', { class: 'kpi__extra', 'aria-hidden': 'true' }, extra) : null);
}

/** @param {HTMLElement} ziel @param {object[]} faelle @param {object[]} dokumente */
export function renderKennzahlen(ziel, faelle, dokumente) {
  const k = kennzahlen(faelle, dokumente);
  const prozent = Math.round(k.anteilAutomatisch * 100);
  const fuellung = h('span', { class: 'kpi__meter-fuellung' });
  fuellung.style.width = `${prozent}%`; // CSSOM, mit CSP erlaubt
  ziel.replaceChildren(h('dl', { class: 'kpis' },
    kachel('Dokumente total', zahl(k.total), k.duplikate ? `${zahl(k.eindeutig)} ohne Duplikate` : 'im Posteingang'),
    kachel('Automatisch zugeordnet', k.eindeutig ? `${prozent} %` : '–', `${zahl(k.automatisch)} von ${zahl(k.eindeutig)} Dokumenten`,
      h('span', { class: 'kpi__meter' }, fuellung)),
    kachel('Offen in Triage', zahl(k.offen), 'warten auf Entscheid'),
    kachel('Abgefangene Duplikate', zahl(k.duplikate), 'mehrfach gesendet'),
    kachel('Unvollständige Fälle', zahl(k.unvollstaendig), `von ${zahl(k.faelleMitCheckliste)} Fällen`),
  ));
}
