// Excel/CSV-Import der Fallliste
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tabelleLesen } from '../src/js/io/cases.js';
import { FALL_SPALTEN, normalisiereSpaltenname, zeilenZuFaellen } from '../src/js/core/cases.js';

const DATA = new URL('../src/data/', import.meta.url);
const xlsx = tabelleLesen(await readFile(new URL('faelle.xlsx', DATA)), 'faelle.xlsx');
const csv = tabelleLesen(await readFile(new URL('faelle.csv', DATA)), 'faelle.csv');

test('faelle.xlsx enthält 12 Fälle mit allen Spalten, ohne Fehler und Warnungen', () => {
  assert.deepEqual(xlsx.fehler, []);
  assert.deepEqual(xlsx.warnungen, []);
  assert.equal(xlsx.faelle.length, 12);
  for (const fall of xlsx.faelle) assert.deepEqual(Object.keys(fall), FALL_SPALTEN);
});

test('faelle.csv (Datum als Text) ergibt exakt dieselben Fälle wie faelle.xlsx (Datum als Seriennummer)', () => {
  assert.deepEqual(csv.faelle, xlsx.faelle);
});

test('zwei Fälle haben den gleichen Namen, aber unterschiedliche Geburtsdaten', () => {
  const gruppen = Map.groupBy(xlsx.faelle, (f) => `${f.vorname} ${f.nachname}`);
  const doppelt = [...gruppen.values()].filter((g) => g.length === 2);
  assert.equal(doppelt.length, 1);
  assert.notEqual(doppelt[0][0].geburtsdatum, doppelt[0][1].geburtsdatum);
});

test('Spaltennamen werden tolerant erkannt (Gross/klein, Leerzeichen, Bindestriche, Umlaute)', () => {
  assert.equal(normalisiereSpaltenname('Schaden-Nr.'), 'schaden_nr');
  assert.equal(normalisiereSpaltenname(' Leistungserbringer GLN '), 'leistungserbringer_gln');
  assert.equal(normalisiereSpaltenname('Geburtsdatum'), 'geburtsdatum');
  const { faelle } = zeilenZuFaellen([{ 'Schaden-Nr.': 'uv-2026-00001', Vorname: 'Anna', Nachname: 'Muster', Geburtsdatum: 32874 }]);
  assert.equal(faelle[0].schaden_nr, 'UV-2026-00001');
  assert.equal(faelle[0].geburtsdatum, '1990-01-01');
});

test('fehlende Pflichtspalten ergeben eine verständliche Fehlermeldung', () => {
  const { faelle, fehler } = zeilenZuFaellen([{ name: 'Anna Muster' }]);
  assert.equal(faelle.length, 0);
  assert.match(fehler[0], /Pflichtspalten fehlen: schaden_nr, vorname, nachname/);
});

test('ungültige Werte führen zu Warnungen statt zum Abbruch', () => {
  const { faelle, warnungen } = zeilenZuFaellen([
    { schaden_nr: 'UV-2026-00001', vorname: 'A', nachname: 'B', geburtsdatum: '31.02.1990', leistungserbringer_gln: '7609999000000', falltyp: 'Unbekannt' },
    { schaden_nr: 'UV-2026-00001', vorname: 'C', nachname: 'D' },
    { schaden_nr: '', vorname: '', nachname: '' },
  ]);
  assert.equal(faelle.length, 1);
  assert.ok(warnungen.some((w) => /kein gültiges Datum/.test(w)));
  assert.ok(warnungen.some((w) => /Prüfziffer/.test(w)));
  assert.ok(warnungen.some((w) => /Falltyp/.test(w)));
  assert.ok(warnungen.some((w) => /doppelt/.test(w)));
});

test('Volumen-Fallliste: 150 Fälle ohne Fehler', async () => {
  const v = tabelleLesen(await readFile(new URL('volumen/faelle.xlsx', DATA)), 'faelle.xlsx');
  assert.deepEqual(v.fehler, []);
  assert.deepEqual(v.warnungen, []);
  assert.equal(v.faelle.length, 150);
});
