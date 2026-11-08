// Posteingang laden: Demo-Berichte (index.json + .txt), Volumen-Berichte (berichte.json) und .txt-Dateien per Drag & Drop.
import { DATENSAETZE } from '../config.js';
import { bytesZuText } from './cases.js';

/**
 * Lädt den mitgelieferten Posteingang des Datensatzes.
 * Einträge mit «text» werden direkt übernommen, sonst wird «datei» relativ zur index.json geladen.
 * @returns {Promise<Array<{ text: string, dateiname: string, eingegangen_am?: string, quelle: string }>>}
 */
export async function posteingangLaden(datensatz) {
  const url = DATENSAETZE[datensatz].eingang;
  const antwort = await fetch(url, { cache: 'no-cache' });
  if (!antwort.ok) throw new Error(`${url} konnte nicht geladen werden (HTTP ${antwort.status}).`);
  const { berichte } = await antwort.json();
  const ordner = url.slice(0, url.lastIndexOf('/') + 1);
  return Promise.all(berichte.map(async (b) => {
    if (typeof b.text === 'string') return { text: b.text, dateiname: b.datei, eingegangen_am: b.eingegangen_am, quelle: datensatz };
    const r = await fetch(ordner + encodeURIComponent(b.datei), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${b.datei} konnte nicht geladen werden (HTTP ${r.status}).`);
    return { text: bytesZuText(new Uint8Array(await r.arrayBuffer())), dateiname: b.datei, quelle: datensatz };
  }));
}

/** Liest abgelegte oder gewählte .txt-Dateien. Andere Formate werden mit Begründung abgelehnt. */
export async function textDateienLesen(dateien) {
  const ok = [];
  const abgelehnt = [];
  for (const datei of dateien) {
    if (!/\.txt$/i.test(datei.name) && datei.type !== 'text/plain') {
      abgelehnt.push(`${datei.name}: nur .txt-Dateien (PDF folgt in einer späteren Version)`);
      continue;
    }
    if (datei.size > 1_000_000) {
      abgelehnt.push(`${datei.name}: grösser als 1 MB`);
      continue;
    }
    ok.push({ text: bytesZuText(new Uint8Array(await datei.arrayBuffer())), dateiname: datei.name, quelle: 'datei' });
  }
  return { eingaenge: ok, abgelehnt };
}
