// Zustand der App und Persistenz im localStorage.
// Alle Zugriffe auf den Speicher stehen in try/catch: Die App funktioniert auch ohne localStorage
// (z. B. im privaten Modus oder bei blockierten Website-Daten), dann eben ohne Gedächtnis.
import { DATENSAETZE } from './config.js';

const SPEICHER_SCHLUESSEL = 'caseconnect-lite/v1';
const VERSION = 1;

function leererDatensatz() {
  return {
    geladen: false, // Fallliste schon geladen?
    faelle: [],
    faelleQuelle: null, // { name, art: 'standard' | 'upload', geladen_am, warnungen }
    dokumente: [],
    zaehler: {}, // Eingangs-ID-Zähler pro Tag: { '20261110': 3 }
  };
}

function ausgangszustand() {
  const daten = {};
  for (const key of Object.keys(DATENSAETZE)) daten[key] = leererDatensatz();
  return { version: VERSION, datensatz: 'demo', daten };
}

function speicherLesen() {
  try {
    const roh = globalThis.localStorage?.getItem(SPEICHER_SCHLUESSEL);
    if (!roh) return null;
    const gelesen = JSON.parse(roh);
    if (gelesen?.version !== VERSION || typeof gelesen.daten !== 'object') return null;
    const zustand = ausgangszustand();
    for (const key of Object.keys(DATENSAETZE)) zustand.daten[key] = { ...leererDatensatz(), ...gelesen.daten[key] };
    if (DATENSAETZE[gelesen.datensatz]) zustand.datensatz = gelesen.datensatz;
    return zustand;
  } catch {
    return null;
  }
}

let zustand = speicherLesen() ?? ausgangszustand();
let speicherOk = true;
const zuhoerer = new Set();

function speichern() {
  try {
    globalThis.localStorage?.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(zustand));
    speicherOk = Boolean(globalThis.localStorage);
  } catch {
    speicherOk = false; // voll oder blockiert – App läuft im Arbeitsspeicher weiter
  }
}

function benachrichtigen() {
  for (const fn of zuhoerer) fn(zustand);
}

/** Ganzer Zustand (nur lesen). */
export const zustandLesen = () => zustand;

/** Daten des aktiven Datensatzes (Demo oder Volumen). */
export const aktiv = () => zustand.daten[zustand.datensatz];

/** Ändert den Zustand, speichert ihn und informiert alle Ansichten. */
export function aendern(fn) {
  fn(zustand);
  speichern();
  benachrichtigen();
}

export function abonnieren(fn) {
  zuhoerer.add(fn);
  return () => zuhoerer.delete(fn);
}

/** Setzt alles zurück (beide Datensätze) und löscht den gespeicherten Zustand. */
export function zuruecksetzen() {
  const datensatz = zustand.datensatz;
  zustand = ausgangszustand();
  zustand.datensatz = datensatz;
  try {
    globalThis.localStorage?.removeItem(SPEICHER_SCHLUESSEL);
  } catch {
    /* ignorieren */
  }
  speichern();
  benachrichtigen();
}

/** false, wenn der Browser nichts speichern kann (Hinweis in der UI). */
export const speicherVerfuegbar = () => speicherOk;
