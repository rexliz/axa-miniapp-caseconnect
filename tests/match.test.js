// Matching: Punkteregeln, Status, alle 10 Demo-Szenarien aus index.json und der Volumen-Datensatz
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { match, punkteFuer } from '../src/js/core/match.js';
import { verarbeiteAlle } from '../src/js/core/pipeline.js';
import { tabelleLesen } from '../src/js/io/cases.js';
import { MATCHING } from '../src/js/config.js';

const DATA = new URL('../src/data/', import.meta.url);
const faelle = tabelleLesen(await readFile(new URL('faelle.xlsx', DATA)), 'faelle.xlsx').faelle;
const index = JSON.parse(await readFile(new URL('eingang/index.json', DATA), 'utf8'));

const FALL = {
  schaden_nr: 'UV-2026-00001', vorname: 'Lukas', nachname: 'Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12',
  leistungserbringer_gln: '7609999102233', leistungserbringer_zsr: 'Z990223',
};
const leer = { schaden_nr: null, name: null, geburtsdatum: null, unfalldatum: null, gln: null, zsr: null };
const felder = (x) => ({ ...leer, ...x });

test('Punkte: Name bis 35 (Levenshtein, Umlaute, Reihenfolge), Geburtsdatum 35, Unfalldatum 20/10, Absender 10', () => {
  assert.equal(punkteFuer(felder({ name: 'Brunner Lukas' }), FALL).score, 35);
  assert.equal(punkteFuer(felder({ name: 'LUKAS BRUNNER' }), FALL).score, 35);
  assert.equal(punkteFuer(felder({ name: 'Bruner Lukas' }), FALL).score, 32);
  assert.equal(punkteFuer(felder({ name: 'Anna Schmid' }), FALL).score, 0);
  assert.equal(punkteFuer(felder({ name: 'Simon Kaelin' }), { ...FALL, vorname: 'Simon', nachname: 'Kälin' }).score, 35);
  assert.equal(punkteFuer(felder({ geburtsdatum: '1988-06-23' }), FALL).score, 35);
  assert.equal(punkteFuer(felder({ geburtsdatum: '1988-06-24' }), FALL).score, 0);
  assert.equal(punkteFuer(felder({ unfalldatum: '2026-10-12' }), FALL).score, 20);
  assert.equal(punkteFuer(felder({ unfalldatum: '2026-10-15' }), FALL).score, 10);
  assert.equal(punkteFuer(felder({ unfalldatum: '2026-10-16' }), FALL).score, 0);
  assert.equal(punkteFuer(felder({ gln: '7609999102233' }), FALL).score, 10);
  assert.equal(punkteFuer(felder({ zsr: 'Z990223' }), FALL).score, 10);
  assert.equal(punkteFuer(felder({ name: 'Lukas Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12', gln: '7609999102233' }), FALL).score, 100);
});

test('jeder Punkt hat eine lesbare Begründung', () => {
  const { gruende } = punkteFuer(felder({ name: 'Bruner Lukas', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-14' }), FALL);
  assert.deepEqual(gruende.map((g) => g.text), ['Name ähnlich (92 %)', 'Geburtsdatum stimmt überein', 'Unfalldatum ±2 Tage']);
});

test('Status: automatisch ab 85 Punkten und 15 Punkten Abstand, sonst Vorschlag (50–84) oder Triage', () => {
  const zwei = [FALL, { ...FALL, schaden_nr: 'UV-2026-00002', geburtsdatum: '1990-01-01', unfalldatum: '2026-01-01', leistungserbringer_gln: '', leistungserbringer_zsr: '' }];
  assert.equal(match({ felder: felder({ name: 'Lukas Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12' }) }, zwei).status, 'automatisch');
  assert.equal(match({ felder: felder({ name: 'Lukas Brunner', unfalldatum: '2026-10-12' }) }, zwei).status, 'vorschlag');
  assert.equal(match({ felder: felder({ name: 'Lukas Brunner' }) }, zwei).status, 'triage');
  assert.equal(match({ felder: felder({ name: 'Anna Schmid' }) }, zwei).kandidaten.length, 0);
});

test('mehrdeutig: zwei starke Kandidaten mit weniger als 15 Punkten Abstand → Triage', () => {
  const zwillinge = [FALL, { ...FALL, schaden_nr: 'UV-2026-00002', unfalldatum: '2026-10-13' }];
  const r = match({ felder: felder({ name: 'Lukas Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12' }) }, zwillinge);
  assert.equal(r.status, 'triage');
  assert.match(r.begruendung, /Mehrdeutig/);
});

test('Schaden-Nr. vorhanden → Score 100; Widerspruch bei abweichendem Namen oder Geburtsdatum', () => {
  const ok = match({ felder: felder({ schaden_nr: 'UV-2026-00001', name: 'Brunner Lukas' }) }, [FALL]);
  assert.equal(ok.status, 'automatisch');
  assert.equal(ok.kandidaten[0].score, 100);
  const name = match({ felder: felder({ schaden_nr: 'UV-2026-00001', name: 'Anna Schmid' }) }, [FALL]);
  assert.equal(name.status, 'widerspruch');
  assert.match(name.begruendung, /Datenschutzvorfall/);
  const geb = match({ felder: felder({ schaden_nr: 'UV-2026-00001', geburtsdatum: '1990-01-01' }) }, [FALL]);
  assert.equal(geb.status, 'widerspruch');
});

test('unbekannte Schaden-Nr. → normales Punkte-Matching mit Hinweis', () => {
  const r = match({ felder: felder({ schaden_nr: 'UV-2026-99999', name: 'Lukas Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12' }) }, [FALL]);
  assert.equal(r.status, 'automatisch');
  assert.match(r.begruendung, /steht nicht in der Fallliste/);
});

test('Schwellwerte und Gewichte kommen aus config.js', () => {
  const streng = { ...MATCHING, schwellen: { ...MATCHING.schwellen, automatisch: 101 } };
  const r = match({ felder: felder({ name: 'Lukas Brunner', geburtsdatum: '1988-06-23', unfalldatum: '2026-10-12', gln: '7609999102233' }) }, [FALL], streng);
  assert.equal(r.status, 'vorschlag');
});

// --- Alle 10 Demo-Szenarien über index.json --------------------------------------------------
const texte = await Promise.all(index.berichte.map((b) => readFile(new URL(`eingang/${b.datei}`, DATA), 'utf8')));
const { dokumente } = verarbeiteAlle(
  index.berichte.map((b, i) => ({ text: texte[i], dateiname: b.datei, eingegangen_am: '2026-11-10T08:00:00Z' })),
  { faelle, dokumente: [], zaehler: {} },
);

for (const [i, b] of index.berichte.entries()) {
  test(`Szenario ${b.szenario}: ${b.titel} → ${b.erwartet}`, () => {
    const d = dokumente[i];
    assert.equal(d.status, b.erwartet, d.begruendung);
    assert.equal(d.extraktion.dokumenttyp, b.erwartet_dokumenttyp);
    if (b.erwartet_schaden_nr) assert.equal(d.kandidaten[0]?.schaden_nr, b.erwartet_schaden_nr);
    if (b.erwartet === 'automatisch') assert.equal(d.zuordnung?.schaden_nr, b.erwartet_schaden_nr);
    else assert.equal(d.zuordnung, null, 'nur «automatisch» wird ohne Mensch zugeordnet');
    if (b.korrekter_fall) assert.ok(d.kandidaten.some((k) => k.schaden_nr === b.korrekter_fall), 'richtiger Fall ist unter den Kandidaten');
    if (b.duplikat_von_szenario) assert.equal(d.duplikat_von, dokumente[b.duplikat_von_szenario - 1].id);
  });
}

// --- Volumen-Datensatz: alle 300 Berichte ----------------------------------------------------
test('Volumen-Datensatz: alle 300 Berichte liefern das erwartete Ergebnis', async () => {
  const vf = tabelleLesen(await readFile(new URL('volumen/faelle.xlsx', DATA)), 'faelle.xlsx').faelle;
  const vb = JSON.parse(await readFile(new URL('volumen/berichte.json', DATA), 'utf8')).berichte;
  const r = verarbeiteAlle(vb.map((b) => ({ text: b.text, dateiname: b.datei, eingegangen_am: b.eingegangen_am })), { faelle: vf, dokumente: [], zaehler: {} });
  const abweichungen = r.dokumente.filter((d, i) => d.status !== vb[i].erwartet
    || (vb[i].erwartet_schaden_nr && d.kandidaten[0]?.schaden_nr !== vb[i].erwartet_schaden_nr)
    || d.extraktion.dokumenttyp !== vb[i].erwartet_dokumenttyp);
  assert.deepEqual(abweichungen.map((d) => d.dateiname), []);
});
