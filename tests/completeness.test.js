// Vollständigkeit je Falltyp
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { vollstaendigkeit } from '../src/js/core/completeness.js';
import { verarbeiteAlle } from '../src/js/core/pipeline.js';
import { tabelleLesen } from '../src/js/io/cases.js';
import { FALLTYPEN } from '../src/js/config.js';

const doc = (id, schaden_nr, typ, extra = {}) => ({
  id, eingangs_id: `EB-20261110-${id}`, eingegangen_am: `2026-11-10T0${id.length}:00:00Z`, status: 'automatisch',
  extraktion: { dokumenttyp: typ }, zuordnung: { schaden_nr, art: 'automatisch' }, ...extra,
});
const fall = (falltyp) => ({ schaden_nr: 'UV-2026-00001', falltyp });

test('nötige Unterlagen je Falltyp kommen aus config.js', () => {
  assert.deepEqual(vollstaendigkeit(fall('Bagatellunfall')).positionen.map((p) => p.typ), FALLTYPEN.Bagatellunfall);
  assert.equal(vollstaendigkeit(fall('Unfall mit Arbeitsunfähigkeit')).total, 3);
  assert.equal(vollstaendigkeit(fall('Unfall mit Hospitalisation')).total, 5);
  assert.equal(vollstaendigkeit(fall('unfall mit hospitalisation')).total, 5, 'Schreibweise egal');
});

test('Ampel: rot (nichts), gelb (teilweise), grün (vollständig)', () => {
  const f = fall('Bagatellunfall');
  assert.equal(vollstaendigkeit(f, []).ampel, 'rot');
  const teil = vollstaendigkeit(f, [doc('1', f.schaden_nr, 'arztzeugnis')]);
  assert.equal(teil.ampel, 'gelb');
  assert.deepEqual(teil.fehlend, ['unfallmeldung']);
  const voll = vollstaendigkeit(f, [doc('1', f.schaden_nr, 'arztzeugnis'), doc('22', f.schaden_nr, 'unfallmeldung')]);
  assert.equal(voll.ampel, 'gruen');
  assert.equal(voll.vollstaendig, true);
  assert.equal(voll.positionen.find((p) => p.typ === 'arztzeugnis').eingangs_id, 'EB-20261110-1');
});

test('Duplikate, fremde und nicht zugeordnete Dokumente zählen nicht', () => {
  const f = fall('Bagatellunfall');
  const v = vollstaendigkeit(f, [
    doc('1', f.schaden_nr, 'arztzeugnis', { status: 'duplikat' }),
    doc('2', 'UV-2026-99999', 'arztzeugnis'),
    doc('3', f.schaden_nr, 'unfallmeldung', { zuordnung: null }),
  ]);
  assert.equal(v.erhalten, 0);
});

test('unbekannter Falltyp → keine Checkliste, graue Ampel', () => {
  const v = vollstaendigkeit(fall('Berufskrankheit'));
  assert.equal(v.bekannt, false);
  assert.equal(v.ampel, 'grau');
});

test('nach dem Demo-Posteingang: mindestens ein Fall vollständig und mindestens einer unvollständig', async () => {
  const DATA = new URL('../src/data/', import.meta.url);
  const faelle = tabelleLesen(await readFile(new URL('faelle.xlsx', DATA)), 'faelle.xlsx').faelle;
  const index = JSON.parse(await readFile(new URL('eingang/index.json', DATA), 'utf8'));
  const eingaenge = await Promise.all(index.berichte.map(async (b) => ({ text: await readFile(new URL(`eingang/${b.datei}`, DATA), 'utf8'), dateiname: b.datei })));
  const { dokumente } = verarbeiteAlle(eingaenge, { faelle, dokumente: [], zaehler: {} });
  const ergebnisse = faelle.map((f) => vollstaendigkeit(f, dokumente));
  assert.ok(ergebnisse.some((v) => v.vollstaendig), 'mindestens ein Fall vollständig');
  assert.ok(ergebnisse.some((v) => !v.vollstaendig && v.erhalten > 0), 'mindestens ein Fall teilweise');
  assert.equal(vollstaendigkeit(faelle.find((f) => f.schaden_nr === 'UV-2026-10417'), dokumente).vollstaendig, true);
});
