// Prüft die Security-Leitplanken der statischen Seite:
// CSP per Meta-Tag, keine Inline-Scripts/-Styles, nur relative Pfade, keine externen URLs im App-Code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url);
const html = await readFile(new URL('index.html', SRC), 'utf8');

async function listFiles(dirUrl, ext) {
  const entries = await readdir(dirUrl, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

test('index.html setzt eine Content-Security-Policy mit default-src \'self\'', () => {
  const m = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(m, 'CSP-Meta-Tag fehlt');
  assert.match(m[1], /default-src 'self'/);
  assert.doesNotMatch(m[1], /unsafe-inline|unsafe-eval/);
});

test('index.html enthält keine Inline-Scripts, Inline-Styles oder Event-Handler-Attribute', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, attrs, body] of scripts) {
    assert.match(attrs, /\bsrc=/, 'Script ohne src gefunden');
    assert.equal(body.trim(), '', 'Script mit Inline-Inhalt gefunden');
  }
  assert.doesNotMatch(html, /<style\b/i, '<style>-Block gefunden');
  assert.doesNotMatch(html, /\sstyle\s*=/i, 'style-Attribut gefunden');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'Inline-Event-Handler gefunden');
});

test('index.html verwendet nur relative Pfade (läuft unter /<repo>/ auf GitHub Pages)', () => {
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(!ref.startsWith('/'), `absoluter Pfad: ${ref}`);
    assert.ok(!/^[a-z]+:\/\//i.test(ref), `externe URL: ${ref}`);
  }
});

test('Hinweis-Banner «Hackathon-Prototyp mit fiktiven Daten» ist vorhanden', () => {
  assert.match(html, /Hackathon-Prototyp mit fiktiven Daten – keine offizielle AXA-Anwendung/);
});

test('App-Code enthält keine externen URLs (keine Netzwerkzugriffe ausser auf die eigene Seite)', async () => {
  const files = await listFiles(new URL('js/', SRC), '.js');
  assert.ok(files.length > 0);
  for (const file of files) {
    const code = await readFile(file, 'utf8');
    assert.doesNotMatch(code, /https?:\/\//, `externe URL in ${file}`);
  }
});
