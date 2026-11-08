// Zentrale Konfiguration: Fachregeln, Schlüsselwörter, Gewichte und Schwellwerte.
// Alles hier ist eine vereinfachte, konfigurierbare Annahme für den Prototyp.
// Wer Regeln anpassen will, ändert nur diese Datei.

/** Datensätze, zwischen denen die App umschalten kann (Pfade relativ zu index.html). */
export const DATENSAETZE = {
  demo: {
    label: 'Demo-Daten',
    faelle: 'data/faelle.xlsx',
    eingang: 'data/eingang/index.json',
  },
  volumen: {
    label: 'Volumen-Daten',
    faelle: 'data/volumen/faelle.xlsx',
    eingang: 'data/volumen/berichte.json',
  },
};

/**
 * Dokumenttypen mit Schlüsselwörtern für die regelbasierte Erkennung.
 * haupt: eindeutige Begriffe (meist der Titel), neben: typische Begriffe im Text.
 * Vergleich ohne Gross-/Kleinschreibung.
 */
export const DOKUMENTTYPEN = {
  unfallmeldung: {
    label: 'Unfallmeldung',
    haupt: ['unfallmeldung', 'schadenmeldung uvg'],
    neben: ['arbeitgeber', 'hergang', 'beschäftigungsgrad', 'unfallort'],
  },
  arztzeugnis: {
    label: 'Arztzeugnis UVG',
    haupt: ['arztzeugnis'],
    neben: ['erstbehandlung', 'arbeitsunfähigkeit', 'zeugnis'],
  },
  austrittsbericht: {
    label: 'Austrittsbericht',
    haupt: ['austrittsbericht', 'entlassungsbericht'],
    neben: ['hospitalisation', 'eintritt', 'medikation bei austritt'],
  },
  operationsbericht: {
    label: 'Operationsbericht',
    haupt: ['operationsbericht', 'op-bericht'],
    neben: ['operateur', 'anästhesie', 'lagerung', 'wundverschluss'],
  },
  radiologiebefund: {
    label: 'Radiologiebefund',
    haupt: ['radiologiebefund', 'radiologischer befund'],
    neben: ['röntgen', 'mri', 'fragestellung', 'klinische angaben', 'befundet'],
  },
  verlaufsbericht: {
    label: 'Verlaufsbericht',
    haupt: ['verlaufsbericht', 'zwischenbericht'],
    neben: ['verlaufskontrolle', 'kontrolle vom', 'bisheriger verlauf'],
  },
};

export const DOKUMENTTYP_GEWICHT = { haupt: 10, neben: 2 };

/** Beschriftungen, nach denen die Extraktion Felder sucht (ohne Doppelpunkt). */
export const EXTRAKTION = {
  nameLabels: ['Patientin', 'Patient', 'Name', 'Betrifft', 'Versicherte Person', 'Verunfallte Person'],
  geburtsdatumLabels: ['geb.', 'geboren am', 'Geburtsdatum'],
  unfalldatumLabels: ['Unfall vom', 'Unfalldatum', 'Ereignis am', 'Ereignis vom'],
  /** Wörter, die nie Teil eines Personennamens sind (z. B. «Betrifft: Arztzeugnis UVG»). */
  keinName: [
    'herr', 'frau', 'dr', 'med', 'geb', 'geboren', 'unfall', 'unfalldatum', 'schaden', 'betrifft',
    'arztzeugnis', 'austrittsbericht', 'operationsbericht', 'radiologiebefund', 'verlaufsbericht',
    'unfallmeldung', 'bericht', 'uvg', 'ihre', 'unser', 'patient', 'patientin',
  ],
};

/** Matching: Gewichte (Punkte) und Schwellwerte für den Status. */
export const MATCHING = {
  gewichte: {
    name: 35, // skaliert mit der Namensähnlichkeit (Levenshtein)
    geburtsdatum: 35, // nur exakt
    unfalldatumExakt: 20,
    unfalldatumNah: 10, // innerhalb der Toleranz
    absender: 10, // GLN oder ZSR des Absenders ist beim Fall hinterlegt
  },
  unfalldatumToleranzTage: 3,
  /** Unter dieser Namensähnlichkeit (0–1) gibt es 0 Punkte bzw. gilt der Name als widersprüchlich. */
  nameMinAehnlichkeit: 0.75,
  schwellen: {
    automatisch: 85,
    vorschlag: 50,
    mindestAbstand: 15, // Abstand zum Zweitbesten für «automatisch»
  },
  anzahlKandidaten: 3,
};

/**
 * Vollständigkeit: nötige Unterlagen je Falltyp (vereinfachte, konfigurierbare Annahme).
 * Schlüssel = Falltyp, wie er in der Excel-Liste steht.
 */
export const FALLTYPEN = {
  'Bagatellunfall': ['unfallmeldung', 'arztzeugnis'],
  'Unfall mit Arbeitsunfähigkeit': ['unfallmeldung', 'arztzeugnis', 'verlaufsbericht'],
  'Unfall mit Hospitalisation': [
    'unfallmeldung', 'arztzeugnis', 'austrittsbericht', 'operationsbericht', 'radiologiebefund',
  ],
};

/** Unterlagen, die beim Arbeitgeber statt beim Leistungserbringer nachgefordert werden. */
export const VOM_ARBEITGEBER = ['unfallmeldung'];

/** Präfix der Eingangs-IDs: EB-JJJJMMTT-0001 */
export const EINGANGS_ID_PRAEFIX = 'EB';
