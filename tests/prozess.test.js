// Prozess: Quittung, Nachforderung, Kennzahlen, Export
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verarbeiteAlle } from '../src/js/core/pipeline.js';
import { vollstaendigkeit } from '../src/js/core/completeness.js';
import { quittung, quittungAlsText } from '../src/js/core/receipt.js';
import { nachforderungen, briefAlsText } from '../src/js/core/request.js';
import { kennzahlen, naechstesOffenes } from '../src/js/core/kpis.js';
import { zuordnungenAlsCsv, EXPORT_SPALTEN } from '../src/js/core/export.js';
import { tabelleLesen } from '../src/js/io/cases.js';

const DATA = new URL('../src/data/', import.meta.url);
const faelle = tabelleLesen(await readFile(new URL('faelle.xlsx', DATA)), 'faelle.xlsx').faelle;
const index = JSON.parse(await readFile(new URL('eingang/index.json', DATA), 'utf8'));
const eingaenge = await Promise.all(index.berichte.map(async (b) => ({
  text: await readFile(new URL(`eingang/${b.datei}`, DATA), 'utf8'), dateiname: b.datei, eingegangen_am: '2026-11-10T08:00:00Z',
})));
const { dokumente } = verarbeiteAlle(eingaenge, { faelle, dokumente: [], zaehler: {} });
const fall = (nr) => faelle.find((f) => f.schaden_nr === nr);

test('Quittung: Eingangs-ID, Zeitstempel, Dokumenttyp, Absender, Schaden-Nr. – erst nach Zuordnung', () => {
  const q = quittung(dokumente[1]);
  assert.deepEqual(
    { id: q.eingangs_id, typ: q.dokumenttyp, absender: q.absender, nr: q.schaden_nr },
    { id: 'EB-20261110-0002', typ: 'Austrittsbericht', absender: 'Spital Seewald', nr: 'UV-2026-11872' },
  );
  assert.equal(q.zeitstempel, '2026-11-10T08:00:00Z');
  const text = quittungAlsText(q);
  for (const teil of ['EMPFANGSBESTÄTIGUNG', 'EB-20261110-0002', 'Austrittsbericht', 'Spital Seewald', 'UV-2026-11872', 'nicht erneut']) {
    assert.ok(text.includes(teil), `Quittungstext enthält «${teil}»`);
  }
  assert.equal(quittung(dokumente[7]), null, 'Vorschlag ohne Bestätigung → noch keine Quittung');
  assert.equal(quittung(dokumente[8]), null, 'Duplikat → keine eigene Quittung');
});

test('Nachforderung nur für tatsächlich fehlende Unterlagen, an den Leistungserbringer', () => {
  const f = fall('UV-2026-11872'); // Reto Bühler, Hospitalisation, Austrittsbericht erhalten
  const briefe = nachforderungen(f, vollstaendigkeit(f, dokumente));
  const le = briefe.find((b) => b.rolle === 'leistungserbringer');
  assert.equal(le.empfaenger, 'Spital Seewald');
  assert.deepEqual(le.fehlend, ['arztzeugnis', 'operationsbericht', 'radiologiebefund']);
  assert.match(le.text, /– Arztzeugnis UVG\n– Operationsbericht\n– Radiologiebefund/);
  assert.match(le.text, /Bereits erhalten haben wir:\n– Austrittsbericht \(Eingang \d\d\.\d\d\.2026, EB-20261110-0002\)/);
  assert.doesNotMatch(le.text, /– Austrittsbericht\n/, 'Erhaltenes wird nicht nachgefordert');
  assert.match(le.text, /Sehr geehrte Damen und Herren/);
  assert.match(le.text, /Schaden-Nr\. UV-2026-11872/);
  assert.match(briefAlsText(le), /^An: Spital Seewald\nBetreff: Nachforderung/);
});

test('fehlende Unfallmeldung wird beim Arbeitgeber nachgefordert', () => {
  const f = fall('UV-2026-11872');
  const ag = nachforderungen(f, vollstaendigkeit(f, dokumente)).find((b) => b.rolle === 'arbeitgeber');
  assert.equal(ag.empfaenger, 'Beispiel Bau GmbH');
  assert.deepEqual(ag.fehlend, ['unfallmeldung']);
  assert.match(ag.text, /noch keine Unfallmeldung vor/);
});

test('vollständiger Fall → keine Nachforderung', () => {
  const f = fall('UV-2026-10417');
  assert.deepEqual(nachforderungen(f, vollstaendigkeit(f, dokumente)), []);
});

test('Kennzahlen nach dem Demo-Posteingang', () => {
  const k = kennzahlen(faelle, dokumente);
  assert.deepEqual(
    { total: k.total, duplikate: k.duplikate, automatisch: k.automatisch, offen: k.offen, unvollstaendig: k.unvollstaendig },
    { total: 10, duplikate: 1, automatisch: 5, offen: 4, unvollstaendig: 11 },
  );
  assert.equal(Math.round(k.anteilAutomatisch * 100), 56);
});

test('Arbeitsliste: nächstes offenes Dokument (Vorschlag, Widerspruch, Triage), am Ende wieder von vorne', () => {
  const offeneIds = dokumente.filter((d) => !d.zuordnung && d.status !== 'duplikat').map((d) => d.id);
  assert.deepEqual(offeneIds, ['D0005', 'D0006', 'D0007', 'D0008']);
  assert.deepEqual(naechstesOffenes(dokumente, 'D0007').dokument.id, 'D0008'); // Widerspruch → Vorschlag (Demo-Ablauf)
  assert.equal(naechstesOffenes(dokumente, 'D0007').anzahl, 3);
  assert.equal(naechstesOffenes(dokumente, 'D0003').dokument.id, 'D0005'); // von einem zugeordneten Dokument aus
  assert.equal(naechstesOffenes(dokumente, 'D0008').dokument.id, 'D0005'); // nach dem letzten wieder von vorne
  const nurEins = dokumente.map((d) => (d.id === 'D0005' ? d : { ...d, zuordnung: d.zuordnung ?? { schaden_nr: 'X', art: 'manuell' } }));
  assert.deepEqual(naechstesOffenes(nurEins, 'D0005'), { dokument: null, anzahl: 0 });
});

test('Kennzahlen Volumen-Datensatz: realistische Werte', async () => {
  const vf = tabelleLesen(await readFile(new URL('volumen/faelle.xlsx', DATA)), 'faelle.xlsx').faelle;
  const vb = JSON.parse(await readFile(new URL('volumen/berichte.json', DATA), 'utf8')).berichte;
  const r = verarbeiteAlle(vb.map((b) => ({ text: b.text, dateiname: b.datei, eingegangen_am: b.eingegangen_am })), { faelle: vf, dokumente: [], zaehler: {} });
  const k = kennzahlen(vf, r.dokumente);
  assert.equal(k.total, 300);
  assert.equal(k.duplikate, 15);
  assert.equal(k.automatisch, 255);
  assert.equal(k.offen, 30);
  assert.ok(k.anteilAutomatisch > 0.85 && k.anteilAutomatisch < 0.95);
  assert.ok(k.vollstaendig > 0 && k.unvollstaendig > 0);
});

test('CSV-Export: Kopfzeile, eine Zeile pro Dokument, Semikolon, BOM', () => {
  const csv = zuordnungenAlsCsv(dokumente);
  assert.ok(csv.startsWith('﻿'));
  const zeilen = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(zeilen.length, 11);
  assert.equal(zeilen[0], EXPORT_SPALTEN.join(';'));
  assert.match(zeilen[1], /^EB-20261110-0001;2026-11-10T08:00:00Z;01_praxis-am-lindenplatz_arztzeugnis\.txt;Praxis am Lindenplatz;Arztzeugnis UVG;automatisch zugeordnet;100;UV-2026-10417;automatisch;/);
  assert.match(zeilen[9], /;Duplikat;;;;;;EB-20261110-0002$/);
});
