// Duplikaterkennung und Eingangs-IDs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { findeOriginal, sha256, textHash } from '../src/js/core/duplicate.js';
import { verarbeite } from '../src/js/core/pipeline.js';
import { naechsteEingangsId } from '../src/js/core/receipt.js';

test('eigene SHA-256-Implementierung stimmt mit node:crypto überein', () => {
  const proben = ['', 'abc', 'Bühler – Unfall vom 02.10.2026', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), 'ä'.repeat(1000)];
  for (const p of proben) assert.equal(sha256(p), createHash('sha256').update(p, 'utf8').digest('hex'));
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('Hash über normalisierten Text: Zeilenenden, Leerraum und Gross-/Kleinschreibung egal', () => {
  const a = 'AUSTRITTSBERICHT\nPatient: Herr Reto Buehler\n\nDiagnosen';
  assert.equal(textHash(a), textHash('AUSTRITTSBERICHT\r\nPatient:   Herr Reto Buehler  \r\n\r\nDiagnosen\r\n'));
  assert.equal(textHash(a), textHash(a.toLowerCase()));
  assert.notEqual(textHash(a), textHash(a.replace('Reto', 'Rita')));
});

test('Duplikat verweist auf das Original und erhält keine eigene Eingangs-ID', () => {
  const faelle = [];
  const text = 'Verlaufsbericht\nPatient: Marco Huber';
  const eins = verarbeite(text, { faelle, dokumente: [], zaehler: {}, eingegangen_am: '2026-11-10T08:00:00Z' });
  const zwei = verarbeite(`${text}\r\n`, { faelle, dokumente: [eins.dokument], zaehler: eins.zaehler, eingegangen_am: '2026-11-12T09:30:00Z' });
  assert.equal(zwei.dokument.status, 'duplikat');
  assert.equal(zwei.dokument.duplikat_von, eins.dokument.id);
  assert.equal(zwei.dokument.eingangs_id, null);
  assert.deepEqual(zwei.zaehler, eins.zaehler, 'Zähler bleibt unverändert');
  assert.equal(findeOriginal(eins.dokument.hash, [eins.dokument, zwei.dokument]), eins.dokument);
});

test('Eingangs-ID im Format EB-JJJJMMTT-0001, fortlaufend pro Tag', () => {
  const a = naechsteEingangsId({}, '2026-11-10T08:00:00Z');
  assert.equal(a.id, 'EB-20261110-0001');
  const b = naechsteEingangsId(a.zaehler, '2026-11-10T09:00:00Z');
  assert.equal(b.id, 'EB-20261110-0002');
  const c = naechsteEingangsId(b.zaehler, '2026-11-11T08:00:00Z');
  assert.equal(c.id, 'EB-20261111-0001');
  assert.deepEqual(a.zaehler, { 20261110: 1 }, 'Original-Zähler wird nicht verändert');
});
