import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glnMitPruefziffer, glnPruefziffer, istGueltigeGln } from '../src/js/core/gln.js';

test('GS1-Prüfziffer: bekanntes Beispiel (GTIN-13 4006381333931)', () => {
  assert.equal(glnPruefziffer('400638133393'), 1);
  assert.equal(istGueltigeGln('4006381333931'), true);
});

test('GLN mit Präfix 7609999 erhält eine gültige Prüfziffer', () => {
  const gln = glnMitPruefziffer('760999910117');
  assert.equal(gln.length, 13);
  assert.equal(istGueltigeGln(gln), true);
});

test('falsche Prüfziffer, falsche Länge und Buchstaben werden abgelehnt', () => {
  const gln = glnMitPruefziffer('760999910117');
  const falsch = gln.slice(0, 12) + ((Number(gln[12]) + 1) % 10);
  assert.equal(istGueltigeGln(falsch), false);
  assert.equal(istGueltigeGln('760999910117'), false);
  assert.equal(istGueltigeGln('76099991011a5'), false);
  assert.equal(istGueltigeGln(''), false);
  assert.equal(istGueltigeGln(null), false);
});

test('glnPruefziffer verlangt genau 12 Ziffern', () => {
  assert.throws(() => glnPruefziffer('123'));
});
