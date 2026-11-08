// GLN (Global Location Number, 13 Ziffern) mit GS1-Prüfziffer (Modulo 10).
// Gewichtung von rechts nach links über die ersten 12 Ziffern: 3, 1, 3, 1, …

/** Prüfziffer zu einem 12-stelligen Ziffern-String. */
export function glnPruefziffer(body12) {
  if (!/^\d{12}$/.test(body12)) throw new Error(`GLN-Basis muss 12 Ziffern haben: ${body12}`);
  let summe = 0;
  for (let i = 0; i < 12; i++) {
    const ziffer = body12.charCodeAt(11 - i) - 48;
    summe += ziffer * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (summe % 10)) % 10;
}

/** Ergänzt 12 Ziffern um die passende Prüfziffer. */
export function glnMitPruefziffer(body12) {
  return body12 + glnPruefziffer(body12);
}

/** true, wenn der Wert eine 13-stellige GLN mit korrekter Prüfziffer ist. */
export function istGueltigeGln(gln) {
  const s = String(gln ?? '');
  return /^\d{13}$/.test(s) && glnPruefziffer(s.slice(0, 12)) === s.charCodeAt(12) - 48;
}
