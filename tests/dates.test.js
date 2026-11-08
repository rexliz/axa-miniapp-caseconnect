import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTage, excelSerialZuIso, formatCh, isoZuExcelSerial, parseChDatum, parseDatumWert, tageZwischen,
} from '../src/js/core/dates.js';

test('Excel-Seriennummer ↔ ISO-Datum', () => {
  assert.equal(excelSerialZuIso(25569), '1970-01-01');
  assert.equal(excelSerialZuIso(46300), '2026-10-05');
  assert.equal(isoZuExcelSerial('2026-10-05'), 46300);
  assert.equal(excelSerialZuIso(isoZuExcelSerial('1962-01-01')), '1962-01-01');
});

test('parseDatumWert versteht Seriennummer, Text TT.MM.JJJJ, ISO und Seriennummer als Text', () => {
  assert.equal(parseDatumWert(46300), '2026-10-05');
  assert.equal(parseDatumWert('04.10.2026'), '2026-10-04');
  assert.equal(parseDatumWert('4.10.2026'), '2026-10-04');
  assert.equal(parseDatumWert('2026-10-04'), '2026-10-04');
  assert.equal(parseDatumWert('2026-10-04T00:00:00Z'), '2026-10-04');
  assert.equal(parseDatumWert('46300'), '2026-10-05');
  assert.equal(parseDatumWert(''), '');
  assert.equal(parseDatumWert(null), '');
});

test('ungültige Datumswerte ergeben null', () => {
  assert.equal(parseDatumWert('31.02.2026'), null);
  assert.equal(parseDatumWert('irgendwas'), null);
  assert.equal(parseChDatum('2026-10-04'), null);
});

test('Hilfsfunktionen: formatCh, addTage, tageZwischen', () => {
  assert.equal(formatCh('2026-10-04'), '04.10.2026');
  assert.equal(addTage('2026-10-30', 3), '2026-11-02');
  assert.equal(tageZwischen('2026-10-01', '2026-10-04'), 3);
  assert.equal(tageZwischen('2026-10-04', '2026-10-01'), -3);
});
