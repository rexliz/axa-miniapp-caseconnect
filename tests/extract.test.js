// Extraktion: jedes Feld, GLN-Prüfziffer, Dokumenttypen, Fundstellen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extract, dokumenttypErkennen } from '../src/js/core/extract.js';
import { glnMitPruefziffer } from '../src/js/core/gln.js';

const GLN = glnMitPruefziffer('760999910117');
const GLN_FALSCH = GLN.slice(0, 12) + ((Number(GLN[12]) + 5) % 10);

test('Schaden-Nr. im Format UV-2026-12345 (auch klein geschrieben)', () => {
  assert.equal(extract('Ihre Referenz: UV-2026-12304').felder.schaden_nr, 'UV-2026-12304');
  assert.equal(extract('ref uv-2026-00042.').felder.schaden_nr, 'UV-2026-00042');
  assert.equal(extract('UV-2026-1234 und UV-26-12345').felder.schaden_nr, null);
});

test('Name nach Patient/Patientin/Name/Betrifft, in beliebiger Reihenfolge und Schreibweise', () => {
  const f = (t) => extract(t).felder.name;
  assert.equal(f('Patient:        Herr Reto Buehler, geb. 07.05.1971'), 'Reto Buehler');
  assert.equal(f('Patientin: Frau Laura Widmer'), 'Laura Widmer');
  assert.equal(f('Name:          Keller Sarah\nGeburtsdatum: 14.02.1990'), 'Keller Sarah');
  assert.equal(f('Betrifft: Meier, Daniel, geb. 14.11.1979'), 'Meier Daniel');
  assert.equal(f('Betrifft: Daniel Meier, Unfall vom 01.10.2026'), 'Daniel Meier');
  assert.equal(f('Patientin:          Widmer Laura          geb. 30.11.1984'), 'Widmer Laura');
  assert.equal(f('Name: Meier-Müller Anna Maria'), 'Meier-Müller Anna Maria');
  assert.equal(f('Patientin: Céline Brändli'), 'Céline Brändli');
});

test('keine Fehltreffer beim Namen (Dokumenttitel, Vorname-Label, Einzelwort)', () => {
  assert.equal(extract('Betrifft: Arztzeugnis UVG\nPatient: Marco Huber').felder.name, 'Marco Huber');
  assert.equal(extract('Vorname: Lukas').felder.name, null);
  assert.equal(extract('Name: Brunner').felder.name, null);
  assert.equal(extract('Betrifft: Ihre Anfrage vom 3.10.').felder.name, null);
});

test('Geburtsdatum nach «geb.» oder «Geburtsdatum», Format TT.MM.JJJJ', () => {
  assert.equal(extract('Reto Buehler, geb. 07.05.1971').felder.geburtsdatum, '1971-05-07');
  assert.equal(extract('Geburtsdatum:  14.02.1990').felder.geburtsdatum, '1990-02-14');
  assert.equal(extract('geboren am 3.9.1992').felder.geburtsdatum, '1992-09-03');
  assert.equal(extract('abgegeben. 07.05.1971').felder.geburtsdatum, null, 'kein Treffer mitten im Wort');
  assert.equal(extract('geb. 31.02.1990').felder.geburtsdatum, null, 'ungültiges Datum wird ignoriert');
});

test('Unfalldatum nach «Unfall vom», «Unfalldatum», «Ereignis am»', () => {
  assert.equal(extract('nach dem Unfall vom 06.10.2026').felder.unfalldatum, '2026-10-06');
  assert.equal(extract('Unfalldatum:   05.10.2026, ca. 16:20 Uhr').felder.unfalldatum, '2026-10-05');
  assert.equal(extract('Ereignis am:      12.10.2026').felder.unfalldatum, '2026-10-12');
  assert.equal(extract('Unfall vom:\n02.10.2026').felder.unfalldatum, '2026-10-02', 'Zeilenumbruch nach Label');
  assert.equal(extract('Kontrolle vom 25.10.2026').felder.unfalldatum, null);
});

test('GLN: 13 Ziffern mit Präfix 760, nur mit gültiger GS1-Prüfziffer', () => {
  assert.equal(extract(`GLN ${GLN} · ZSR Z990117`).felder.gln, GLN);
  const falsch = extract(`GLN ${GLN_FALSCH}`);
  assert.equal(falsch.felder.gln, null);
  assert.match(falsch.hinweise[0], /ungültige Prüfziffer/);
  assert.equal(extract(`GLN ${GLN_FALSCH} / GLN ${GLN}`).felder.gln, GLN, 'erste gültige GLN gewinnt');
  assert.equal(extract('Tel 4006381333931').felder.gln, null, 'andere 13-stellige Zahlen sind keine Schweizer GLN');
  assert.equal(extract(`${GLN}9`).felder.gln, null, 'nicht Teil einer längeren Zahl');
});

test('ZSR: ein Buchstabe und 6 Ziffern', () => {
  assert.equal(extract('ZSR Z990331 / GLN …').felder.zsr, 'Z990331');
  assert.equal(extract('ZSR-Nr. H123456').felder.zsr, 'H123456');
  assert.equal(extract('AB123456 und Z12345').felder.zsr, null);
});

test('Absender aus dem Briefkopf (Grossbuchstaben werden lesbar gemacht)', () => {
  assert.equal(extract('SPITAL SEEWALD\nKlinik …').felder.absender, 'Spital Seewald');
  assert.equal(extract('Spital Lindenbach | Chirurgische Klinik').felder.absender, 'Spital Lindenbach');
  assert.equal(extract('Hausarztpraxis Sonnenrain · Dr. med. Urs Stalder').felder.absender, 'Hausarztpraxis Sonnenrain');
  assert.equal(extract('\n\n  Muster Logistik AG\nPersonaldienst').felder.absender, 'Muster Logistik AG');
});

test('Dokumenttyp über Schlüsselwörter aus config.js', () => {
  assert.equal(dokumenttypErkennen('ARZTZEUGNIS UVG\nErstbehandlung am …')?.typ, 'arztzeugnis');
  assert.equal(dokumenttypErkennen('AUSTRITTSBERICHT\nHospitalisation …\nArbeitsunfähigkeit 100 %')?.typ, 'austrittsbericht');
  assert.equal(dokumenttypErkennen('OPERATIONSBERICHT\nOperateur: …')?.typ, 'operationsbericht');
  assert.equal(dokumenttypErkennen('Radiologiebefund\nRöntgen OSG')?.typ, 'radiologiebefund');
  assert.equal(dokumenttypErkennen('Verlaufsbericht\nKontrolle vom …')?.typ, 'verlaufsbericht');
  assert.equal(dokumenttypErkennen('UNFALLMELDUNG UVG\nArbeitgeber …')?.typ, 'unfallmeldung');
  assert.equal(extract('Guten Tag, anbei die Unterlagen.').dokumenttyp, null);
});

test('Fundstellen zeigen exakt auf die Werte im Originaltext', async () => {
  const text = await readFile(new URL('../src/data/eingang/02_spital-seewald_austrittsbericht.txt', import.meta.url), 'utf8');
  const { fundstellen, felder } = extract(text);
  const ausschnitt = (feld) => { const f = fundstellen.find((x) => x.feld === feld); return text.slice(f.start, f.ende); };
  assert.equal(ausschnitt('name'), 'Reto Buehler');
  assert.equal(ausschnitt('geburtsdatum'), '07.05.1971');
  assert.equal(ausschnitt('unfalldatum'), '02.10.2026');
  assert.equal(ausschnitt('gln'), felder.gln);
  assert.equal(ausschnitt('dokumenttyp').toLowerCase(), 'austrittsbericht');
  for (let i = 1; i < fundstellen.length; i++) assert.ok(fundstellen[i - 1].start <= fundstellen[i].start, 'sortiert');
});

test('Schnittstelle: immer dasselbe Objekt, auch bei leerem Text', () => {
  const r = extract('');
  assert.deepEqual(Object.keys(r), ['dokumenttyp', 'felder', 'fundstellen', 'hinweise']);
  assert.deepEqual(Object.keys(r.felder), ['schaden_nr', 'name', 'geburtsdatum', 'unfalldatum', 'gln', 'zsr', 'absender']);
  assert.deepEqual(r.fundstellen, []);
});
