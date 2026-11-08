// Fiktivitäts-Regeln, Datumslogik und Determinismus der Mockdaten
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, GLN_PRAEFIX, HINWEIS } from '../scripts/generate-mockdata.mjs';
import { istGueltigeGln } from '../src/js/core/gln.js';
import { tageZwischen } from '../src/js/core/dates.js';
import { tabelleLesen } from '../src/js/io/cases.js';

const DATA = fileURLToPath(new URL('../src/data/', import.meta.url));
const index = JSON.parse(await readFile(join(DATA, 'eingang/index.json'), 'utf8'));
const volumen = JSON.parse(await readFile(join(DATA, 'volumen/berichte.json'), 'utf8'));
const demoTexte = await Promise.all(index.berichte.map((b) => readFile(join(DATA, 'eingang', b.datei), 'utf8')));
const alleTexte = [...demoTexte, ...volumen.berichte.map((b) => b.text)];
const demoFaelle = tabelleLesen(await readFile(join(DATA, 'faelle.xlsx')), 'faelle.xlsx').faelle;
const volumenFaelle = tabelleLesen(await readFile(join(DATA, 'volumen/faelle.xlsx')), 'faelle.xlsx').faelle;

test('jeder Bericht endet mit der Hinweiszeile «FIKTIVES TESTDOKUMENT – Hackathon-Prototyp»', () => {
  assert.equal(alleTexte.length, 310);
  for (const text of alleTexte) {
    const letzte = text.trimEnd().split(/\r?\n/).at(-1).trim();
    assert.equal(letzte, HINWEIS);
  }
});

test('alle GLN (Fälle und Berichte) beginnen mit 7609999 und haben eine gültige Prüfziffer', () => {
  const glns = new Set([...demoFaelle, ...volumenFaelle].map((f) => f.leistungserbringer_gln));
  for (const text of alleTexte) for (const m of text.matchAll(/\b\d{13}\b/g)) glns.add(m[0]);
  assert.ok(glns.size >= 5);
  for (const gln of glns) {
    assert.ok(gln.startsWith(GLN_PRAEFIX), `GLN ${gln} ohne Präfix ${GLN_PRAEFIX}`);
    assert.ok(istGueltigeGln(gln), `GLN ${gln} mit falscher Prüfziffer`);
  }
});

test('Schaden-Nr. im Format UV-2026-#####, ZSR als ein Buchstabe und 6 Ziffern', () => {
  for (const f of [...demoFaelle, ...volumenFaelle]) {
    assert.match(f.schaden_nr, /^UV-2026-\d{5}$/);
    assert.match(f.leistungserbringer_zsr, /^[A-Z]\d{6}$/);
  }
});

test('keine Platzhalter-Fehler im Text (undefined, NaN, null)', () => {
  for (const text of alleTexte) assert.doesNotMatch(text, /undefined|NaN|\bnull\b|\[object/);
});

test('Datumslogik: Erwerbstätige 18–65 Jahre, Eingang nach dem Unfall', () => {
  for (const f of [...demoFaelle, ...volumenFaelle]) {
    const alter = tageZwischen(f.geburtsdatum, f.unfalldatum) / 365.25;
    assert.ok(alter >= 18 && alter <= 65, `${f.schaden_nr}: Alter ${alter.toFixed(1)}`);
  }
  const nachNr = new Map(volumenFaelle.map((f) => [f.schaden_nr, f]));
  for (const b of volumen.berichte.filter((x) => x.erwartet_schaden_nr)) {
    const fall = nachNr.get(b.erwartet_schaden_nr);
    assert.ok(b.eingegangen_am.slice(0, 10) >= fall.unfalldatum, `${b.id} vor dem Unfall eingegangen`);
  }
});

test('Demo-Posteingang: 10 Szenarien mit erwartetem Ergebnis', () => {
  assert.equal(index.berichte.length, 10);
  assert.deepEqual(index.berichte.map((b) => b.szenario), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(index.berichte.map((b) => b.erwartet), [
    'automatisch', 'automatisch', 'automatisch', 'automatisch', 'triage', 'triage', 'widerspruch', 'vorschlag', 'duplikat', 'automatisch',
  ]);
  // Szenario 9 ist inhaltlich identisch mit Szenario 2 (nur andere Zeilenenden/Leerzeichen)
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  assert.equal(norm(demoTexte[8]), norm(demoTexte[1]));
  assert.notEqual(demoTexte[8], demoTexte[1]);
});

test('Volumen-Datensatz: 150 Fälle, 300 Berichte, Verteilung 60/25/10/5 %', () => {
  assert.equal(volumenFaelle.length, 150);
  assert.equal(volumen.berichte.length, 300);
  const anzahl = (pred) => volumen.berichte.filter(pred).length;
  assert.equal(anzahl((b) => b.kategorie === 'mit_schaden_nr'), 180);
  assert.equal(anzahl((b) => b.kategorie === 'ohne_schaden_nr'), 75);
  assert.equal(anzahl((b) => b.kategorie.startsWith('unklar')), 30);
  assert.equal(anzahl((b) => b.kategorie === 'duplikat'), 15);
  const sortiert = volumen.berichte.map((b) => b.eingegangen_am);
  assert.deepEqual(sortiert, sortiert.slice().sort());
});

test('Generator ist deterministisch: ein neuer Lauf erzeugt byte-identische Dateien', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'caseconnect-'));
  try {
    const pfade = await generate(tmp);
    for (const pfad of pfade) {
      const neu = await readFile(join(tmp, pfad));
      const committet = await readFile(join(DATA, pfad));
      assert.ok(neu.equals(committet), `${pfad} weicht ab – bitte «npm run generate-data» ausführen und committen`);
    }
    // keine verwaisten Dateien im Datenordner
    const vorhanden = [
      ...(await readdir(join(DATA, 'eingang'))).map((n) => `eingang/${n}`),
      ...(await readdir(join(DATA, 'volumen'))).map((n) => `volumen/${n}`),
    ];
    for (const datei of vorhanden) assert.ok(pfade.includes(datei), `${datei} stammt nicht vom Generator`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
