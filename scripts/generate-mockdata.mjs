// Deterministischer Mockdaten-Generator für CaseConnect Lite.
// Aufruf: npm run generate-data
//
// Erzeugt ausschliesslich FIKTIVE Daten: erfundene Spitäler, Praxen und Firmen, frei kombinierte
// Schweizer Vor- und Nachnamen, erfundene Strassen und Orte, GLN mit Präfix 7609999.
// Fester Seed + eigener Zufallsgenerator (mulberry32): Jeder Lauf erzeugt exakt dieselben Dateien.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as XLSX from '../src/vendor/xlsx.mjs';
import { glnMitPruefziffer } from '../src/js/core/gln.js';
import { addTage, formatCh, formatChLang, isoZuExcelSerial, tageZwischen } from '../src/js/core/dates.js';
import { FALL_SPALTEN } from '../src/js/core/cases.js';
import { nameAehnlichkeit } from '../src/js/core/normalize.js';
import { FALLTYPEN, MATCHING } from '../src/js/config.js';

export const SEED = 20261110;
export const HINWEIS = 'FIKTIVES TESTDOKUMENT – Hackathon-Prototyp';
export const GLN_PRAEFIX = '7609999';
const STICHTAG = '2026-11-09'; // spätestes Berichts- und Eingangsdatum
const FIXES_DATUM = new Date('2026-11-01T00:00:00Z'); // Metadaten der Excel-Datei (für identische Bytes)

// ---------------------------------------------------------------------------------------------
// Eigener kleiner Zufallsgenerator (mulberry32) – deterministisch, ohne Abhängigkeiten
// ---------------------------------------------------------------------------------------------
class Zufall {
  constructor(seed) { this.zustand = seed >>> 0; }
  naechste() {
    this.zustand = (this.zustand + 0x6d2b79f5) >>> 0;
    let t = this.zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  ganz(min, max) { return min + Math.floor(this.naechste() * (max - min + 1)); }
  wahl(liste) { return liste[Math.floor(this.naechste() * liste.length)]; }
  chance(p) { return this.naechste() < p; }
  mischen(liste) {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.naechste() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  datum(vonIso, bisIso) { return addTage(vonIso, this.ganz(0, tageZwischen(vonIso, bisIso))); }
}

// ---------------------------------------------------------------------------------------------
// Stammdaten (alle frei erfunden)
// ---------------------------------------------------------------------------------------------
const gln = (nr) => glnMitPruefziffer(GLN_PRAEFIX + String(nr).padStart(5, '0'));
const slug = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Leistungserbringer – jeder mit eigenem Briefkopf-Layout. */
const LE = {
  seewald: {
    name: 'Spital Seewald', zusatz: 'Klinik für Orthopädie und Traumatologie',
    strasse: 'Seewaldstrasse 1', ort: '9991 Seewald', ortsname: 'Seewald',
    gln: gln(10117), zsr: 'Z990117', layout: 'spital', art: 'spital',
    aerzte: [
      { name: 'Dr. med. Andrea Seiler', funktion: 'Leitende Ärztin' },
      { name: 'Dr. med. Jonas Kunz', funktion: 'Oberarzt' },
      { name: 'med. pract. Lea Hofer', funktion: 'Assistenzärztin' },
    ],
  },
  lindenbach: {
    name: 'Spital Lindenbach', zusatz: 'Chirurgische Klinik',
    strasse: 'Spitalweg 5', ort: '9992 Lindenbach', ortsname: 'Lindenbach',
    gln: gln(10223), zsr: 'Z990223', layout: 'spital2', art: 'spital',
    aerzte: [
      { name: 'Dr. med. Martin Vogt', funktion: 'Chefarzt Chirurgie' },
      { name: 'Dr. med. Nicole Amrein', funktion: 'Oberärztin' },
    ],
  },
  lindenplatz: {
    name: 'Praxis am Lindenplatz', zusatz: 'Hausarztmedizin',
    strasse: 'Lindenplatz 3', ort: '9993 Musterhausen', ortsname: 'Musterhausen',
    gln: gln(10331), zsr: 'Z990331', layout: 'praxis', art: 'praxis',
    aerzte: [{ name: 'Dr. med. Claudia Frei', funktion: 'Fachärztin für Allgemeine Innere Medizin' }],
  },
  sonnenrain: {
    name: 'Hausarztpraxis Sonnenrain', zusatz: 'Allgemeinmedizin',
    strasse: 'Sonnenrain 14', ort: '9994 Hügelwil', ortsname: 'Hügelwil',
    gln: gln(10446), zsr: 'Z990446', layout: 'praxis2', art: 'praxis',
    aerzte: [{ name: 'Dr. med. Urs Stalder', funktion: 'Facharzt für Allgemeine Innere Medizin' }],
  },
  musterpark: {
    name: 'Radiologie Musterpark', zusatz: 'Institut für bildgebende Diagnostik',
    strasse: 'Musterparkstrasse 8', ort: '9993 Musterhausen', ortsname: 'Musterhausen',
    gln: gln(10552), zsr: 'Z990552', layout: 'radiologie', art: 'radiologie',
    aerzte: [{ name: 'Dr. med. Petra Lanz', funktion: 'Fachärztin für Radiologie' }],
  },
  permanence: {
    name: 'Permanence Musterhausen Bahnhof', zusatz: 'Notfallpraxis ohne Voranmeldung',
    strasse: 'Bahnhofplatz 2', ort: '9993 Musterhausen', ortsname: 'Musterhausen',
    gln: gln(10668), zsr: 'Z990668', layout: 'permanence', art: 'praxis',
    aerzte: [
      { name: 'Dr. med. Reto Imhof', funktion: 'Facharzt für Allgemeine Innere Medizin' },
      { name: 'Dr. med. Sandra Hug', funktion: 'Fachärztin für Chirurgie' },
    ],
  },
};
for (const [key, le] of Object.entries(LE)) Object.assign(le, { key, slug: slug(le.name) });

/** Arbeitgeber (erkennbar erfundene Firmennamen). */
const AG = {
  logistik: {
    name: 'Muster Logistik AG', strasse: 'Beispielweg 20', ort: '9993 Musterhausen', ortsname: 'Musterhausen',
    kontakt: 'Karin Bachmann', berufe: [['Lagermitarbeiter', 'Lagermitarbeiterin'], ['Disponent', 'Disponentin'], ['Chauffeur', 'Chauffeuse']],
    unfallorte: ['Lager, Rampe 3', 'Hochregallager', 'Verladezone'],
  },
  bau: {
    name: 'Beispiel Bau GmbH', strasse: 'Probestrasse 5', ort: '9995 Beispielfingen', ortsname: 'Beispielfingen',
    kontakt: 'Peter Wyss', berufe: [['Maurer', 'Maurerin'], ['Polier', 'Polierin']],
    unfallorte: ['Baustelle Musterstrasse', 'Werkhof'],
  },
  gastro: {
    name: 'Fiktiva Gastro AG', strasse: 'Demogasse 9', ort: '9991 Seewald', ortsname: 'Seewald',
    kontakt: 'Sabine Moser', berufe: [['Koch', 'Köchin'], ['Servicemitarbeiter', 'Servicemitarbeiterin']],
    unfallorte: ['Küche', 'Restaurant, Lagerraum'],
  },
  elektro: {
    name: 'Seewald Elektro AG', strasse: 'Fiktivgasse 4', ort: '9991 Seewald', ortsname: 'Seewald',
    kontakt: 'Ruth Studer', berufe: [['Elektroinstallateur', 'Elektroinstallateurin']],
    unfallorte: ['Kundenbaustelle', 'Werkstatt'],
  },
  treuhand: {
    name: 'Lindenbach Treuhand GmbH', strasse: 'Platzhalterstrasse 11', ort: '9992 Lindenbach', ortsname: 'Lindenbach',
    kontakt: 'Beat Zimmermann', berufe: [['Sachbearbeiter Buchhaltung', 'Sachbearbeiterin Buchhaltung']],
    unfallorte: ['Büro, Treppenhaus', 'Firmenparkplatz'],
  },
  maschinen: {
    name: 'Testwerk Maschinen AG', strasse: 'Erfundenweg 30', ort: '9996 Fiktivikon', ortsname: 'Fiktivikon',
    kontakt: 'Esther Baumann', berufe: [['Polymechaniker', 'Polymechanikerin'], ['Logistiker', 'Logistikerin']],
    unfallorte: ['Produktionshalle', 'Montagehalle'],
  },
  detailhandel: {
    name: 'Demo Detailhandel AG', strasse: 'Musterstrasse 40', ort: '9993 Musterhausen', ortsname: 'Musterhausen',
    kontakt: 'Hans Suter', berufe: [['Detailhandelsfachmann', 'Detailhandelsfachfrau']],
    unfallorte: ['Verkaufsfläche', 'Warenannahme'],
  },
  reinigung: {
    name: 'Platzhalter Reinigung GmbH', strasse: 'Testweg 2', ort: '9994 Hügelwil', ortsname: 'Hügelwil',
    kontakt: 'Silvia Marti', berufe: [['Reinigungsfachmann', 'Reinigungsfachfrau']],
    unfallorte: ['Kundenobjekt', 'Treppenhaus Kundenobjekt'],
  },
};
for (const [key, ag] of Object.entries(AG)) Object.assign(ag, { key, slug: slug(ag.name) });

const SACHBEARBEITUNG = ['A. Graber', 'L. Gerber', 'M. Roth', 'S. Ammann'];
const STRASSEN = ['Musterstrasse', 'Beispielweg', 'Fiktivgasse', 'Probestrasse', 'Testweg', 'Platzhalterstrasse', 'Demogasse', 'Erfundenweg'];
const ORTE = ['9991 Seewald', '9992 Lindenbach', '9993 Musterhausen', '9994 Hügelwil', '9995 Beispielfingen', '9996 Fiktivikon'];
const VORNAMEN_W = ['Anna', 'Laura', 'Sarah', 'Lea', 'Julia', 'Nina', 'Sandra', 'Monika', 'Claudia', 'Andrea', 'Nicole', 'Fabienne',
  'Elena', 'Chiara', 'Céline', 'Ursula', 'Barbara', 'Martina', 'Jasmin', 'Michelle', 'Selina', 'Tanja', 'Corinne', 'Daniela'];
const VORNAMEN_M = ['Daniel', 'Thomas', 'Marco', 'Lukas', 'David', 'Simon', 'Patrick', 'Stefan', 'Michael', 'Reto', 'Beat', 'Urs',
  'Martin', 'Jonas', 'Luca', 'Noah', 'Sven', 'Fabian', 'Adrian', 'Kevin', 'Pascal', 'Roman', 'Samuel', 'Matthias'];
const NACHNAMEN = ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber',
  'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Graf', 'Roth', 'Bühler', 'Suter', 'Kälin', 'Lüthi',
  'Marti', 'Bachmann', 'Hofmann', 'Kaufmann', 'Studer', 'Bieri', 'Rüegg', 'Vogel', 'Zürcher', 'Schärer', 'Hess', 'Sutter',
  'Ammann', 'Egli', 'Zbinden', 'Brändli'];
const NEBENDIAGNOSEN = ['Arterielle Hypertonie, medikamentös behandelt', 'Nikotinkonsum', 'Status nach Appendektomie', 'Leichtes Asthma bronchiale'];

// ---------------------------------------------------------------------------------------------
// Verletzungen (einfach, medizinisch plausibel) je Falltyp
// ---------------------------------------------------------------------------------------------
const VERLETZUNGEN = {
  // Bagatellunfall
  schnitt_finger: {
    falltyp: 'Bagatellunfall', art: 'BU', koerperteil: 'Zeigefinger links',
    diagnose: 'Schnittverletzung Zeigefinger links ohne Sehnen- oder Nervenbeteiligung',
    hergang: 'Beim Öffnen eines Kartons mit dem Teppichmesser abgerutscht und in den linken Zeigefinger geschnitten.',
    befund: 'Ca. 2 cm lange, glattrandige Schnittwunde palmar am linken Zeigefinger. Sensibilität und Durchblutung intakt, Beuge- und Strecksehnen klinisch intakt.',
    therapie: 'Wundreinigung, Naht mit drei Einzelknopfnähten, Tetanusschutz aufgefrischt.',
    procedere: 'Wundkontrolle nach 2 Tagen, Fadenentfernung nach 10 Tagen.',
  },
  distorsion_osg_leicht: {
    falltyp: 'Bagatellunfall', art: 'NBU', ort: 'Treppenhaus der eigenen Wohnliegenschaft', koerperteil: 'Sprunggelenk rechts',
    diagnose: 'Leichte Distorsion des oberen Sprunggelenks (OSG) rechts',
    hergang: 'Beim Hinuntergehen einer Treppe misstreten und mit dem rechten Fuss nach aussen umgeknickt.',
    befund: 'Leichte Schwellung und Druckdolenz über dem Aussenband, keine Instabilität, Belastung möglich. Ottawa-Kriterien negativ, daher keine Bildgebung.',
    therapie: 'Kühlen, Hochlagern, elastische Bandage, Ibuprofen bei Bedarf.',
    procedere: 'Schmerzadaptierte Vollbelastung, Kontrolle nur bei anhaltenden Beschwerden.',
  },
  kontusion_knie: {
    falltyp: 'Bagatellunfall', art: 'BU', koerperteil: 'Knie links',
    diagnose: 'Kniekontusion links',
    hergang: 'Beim Aussteigen aus dem Lieferwagen ausgerutscht und auf das linke Knie gestürzt.',
    befund: 'Prellmarke und Druckdolenz präpatellar, kein Erguss, Bandapparat stabil, Beweglichkeit frei.',
    therapie: 'Kühlen, Schonung, Schmerzmittel bei Bedarf.',
    procedere: 'Keine Verlaufskontrolle nötig, Wiedervorstellung bei Zunahme der Beschwerden.',
  },
  // Unfall mit Arbeitsunfähigkeit
  distorsion_osg_band: {
    falltyp: 'Unfall mit Arbeitsunfähigkeit', art: 'NBU', ort: 'Sportplatz', koerperteil: 'Sprunggelenk links',
    diagnose: 'Distorsion OSG links mit Teilruptur des Ligamentum fibulotalare anterius',
    hergang: 'Beim Fussballspielen nach einem Zweikampf mit dem linken Fuss umgeknickt.',
    befund: 'Deutliche Schwellung und Hämatom lateral am linken Sprunggelenk, Druckdolenz über dem vorderen Aussenband, Belastung nur eingeschränkt möglich.',
    therapie: 'Stabilisierende Sprunggelenksschiene, Teilbelastung an Gehstöcken, Thromboseprophylaxe, Kühlen und Hochlagern.',
    procedere: 'Physiotherapie, klinische Kontrolle in 2 Wochen.',
    untersuchung: 'Röntgen OSG links in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Keine Fraktur, regelrechte Gelenkstellung. Ausgeprägte Weichteilschwellung lateral.',
    radioBeurteilung: 'Kein Frakturnachweis. Weichteilbefund passend zu einer Bandverletzung.',
    verlaufBefund: 'Schwellung deutlich rückläufig, Gangbild mit Schiene flüssig, Vollbelastung schmerzarm möglich.',
    verlaufBeurteilung: 'Erfreulicher Verlauf, die Bandheilung ist im Gang.',
    verlaufProcedere: 'Physiotherapie weiterführen, Schiene bei Belastung noch für 3 Wochen, Abschlusskontrolle in 4 Wochen.',
  },
  bone_bruise_knie: {
    falltyp: 'Unfall mit Arbeitsunfähigkeit', art: 'NBU', ort: 'Arbeitsweg, Musterstrasse', koerperteil: 'Knie rechts',
    diagnose: 'Kniekontusion rechts mit Knochenmarködem am lateralen Femurkondylus',
    hergang: 'Auf dem Arbeitsweg mit dem Velo auf nasser Fahrbahn gestürzt und auf das rechte Knie gefallen.',
    befund: 'Erguss im rechten Knie, Druckdolenz lateral, Flexion bis 90° schmerzhaft, Bandapparat stabil.',
    therapie: 'Entlastung an Gehstöcken, Schmerzmittel, Kühlen.',
    procedere: 'MRI zur weiteren Abklärung, Kontrolle nach Vorliegen des Befundes.',
    untersuchung: 'MRI Knie rechts', radioFrage: 'Frage nach Meniskus- oder Bandläsion.',
    radioBefund: 'Flächiges Knochenmarködem im lateralen Femurkondylus. Menisken und Kreuzbänder intakt. Mässiger Gelenkerguss.',
    radioBeurteilung: 'Bone bruise lateraler Femurkondylus ohne strukturelle Binnenläsion.',
    verlaufBefund: 'Erguss resorbiert, Flexion bis 120°, nur noch leichte Belastungsschmerzen lateral.',
    verlaufBeurteilung: 'Langsam abklingendes Knochenmarködem, keine strukturelle Läsion.',
    verlaufProcedere: 'Belastung steigern, Physiotherapie zur Kräftigung, Kontrolle in 3 Wochen.',
  },
  schnitt_hand_tief: {
    falltyp: 'Unfall mit Arbeitsunfähigkeit', art: 'BU', koerperteil: 'Hand rechts',
    diagnose: 'Tiefe Schnittverletzung Handballen rechts ohne Sehnenbeteiligung',
    hergang: 'Beim Zuschneiden von Verpackungsmaterial ist das Messer abgerutscht und hat den rechten Handballen verletzt.',
    befund: 'Ca. 4 cm lange, klaffende Schnittwunde am Daumenballen rechts. Sensibilität der Finger intakt, Sehnenfunktion erhalten.',
    therapie: 'Wundrevision in Lokalanästhesie, zweischichtige Naht, Tetanusschutz aufgefrischt, Ruhigstellung.',
    procedere: 'Wundkontrollen alle 2 bis 3 Tage, Fadenentfernung nach 14 Tagen.',
    verlaufBefund: 'Wunde reizlos verheilt, Fäden entfernt, Faustschluss vollständig, Kraft noch leicht vermindert.',
    verlaufBeurteilung: 'Unkomplizierte Wundheilung.',
    verlaufProcedere: 'Narbenpflege, Ergotherapie für die Greifkraft, schrittweise Wiederaufnahme der Arbeit.',
  },
  schulter_kontusion: {
    falltyp: 'Unfall mit Arbeitsunfähigkeit', art: 'BU', koerperteil: 'Schulter rechts',
    diagnose: 'Schulterkontusion rechts mit schmerzhafter Bewegungseinschränkung',
    hergang: 'Bei Arbeiten an einem Regal von einer Leiter (ca. 1 Meter) gestürzt und auf die rechte Schulter gefallen.',
    befund: 'Druckdolenz über dem Deltamuskel, Abduktion bis 80° schmerzhaft eingeschränkt, Durchblutung, Motorik und Sensibilität intakt.',
    therapie: 'Schmerzmittel, Armschlinge für wenige Tage, Kühlen.',
    procedere: 'Frühfunktionelle Physiotherapie, Kontrolle in 2 Wochen.',
    untersuchung: 'Röntgen Schulter rechts in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Keine Fraktur, keine Luxation. Regelrechte Stellung im Schultergelenk.',
    radioBeurteilung: 'Kein Hinweis auf eine ossäre Verletzung.',
    verlaufBefund: 'Abduktion bis 150°, Schmerzen nur noch bei Überkopfarbeiten.',
    verlaufBeurteilung: 'Gute Erholung, keine Hinweise auf eine Verletzung der Rotatorenmanschette.',
    verlaufProcedere: 'Physiotherapie fortsetzen, Belastung schrittweise steigern.',
  },
  lws_kontusion: {
    falltyp: 'Unfall mit Arbeitsunfähigkeit', art: 'BU', koerperteil: 'Rücken (Lendenwirbelsäule)',
    diagnose: 'Kontusion der Lendenwirbelsäule',
    hergang: 'Auf nassem Boden ausgerutscht und auf den Rücken gestürzt.',
    befund: 'Muskelverspannung lumbal, Druckdolenz über L3 bis L5, keine neurologischen Ausfälle.',
    therapie: 'Entzündungshemmende Schmerzmittel, Wärme, Bewegung im schmerzfreien Bereich.',
    procedere: 'Physiotherapie, Kontrolle in 2 Wochen.',
    untersuchung: 'Röntgen LWS in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Keine Fraktur, Wirbelkörperhöhen erhalten, regelrechtes Alignement.',
    radioBeurteilung: 'Kein Frakturnachweis.',
    verlaufBefund: 'Deutlich weniger Schmerzen, Beweglichkeit nahezu frei.',
    verlaufBeurteilung: 'Rückläufige Beschwerden.',
    verlaufProcedere: 'Rumpfkräftigung in der Physiotherapie, Arbeitsversuch.',
  },
  // Unfall mit Hospitalisation
  radius: {
    falltyp: 'Unfall mit Hospitalisation', art: 'NBU', ort: 'Waldweg', koerperteil: 'Handgelenk links', aufWochen: [6, 8],
    diagnose: 'Distale Radiusfraktur links, extraartikulär, mit dorsaler Abkippung',
    hergang: 'Beim Joggen auf nassem Laub ausgerutscht und auf die ausgestreckte linke Hand gestürzt.',
    befund: 'Schwellung und Fehlstellung am distalen Vorderarm links, Druckdolenz über dem distalen Radius, Durchblutung, Motorik und Sensibilität intakt.',
    therapie: 'Ruhigstellung in Gipsschiene, Schmerzmittel, stationäre Aufnahme zur Operation.',
    procedere: 'Operative Versorgung geplant.',
    untersuchung: 'Röntgen Handgelenk links in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Querverlaufende Fraktur des distalen Radius ca. 2 cm proximal der Gelenkfläche mit dorsaler Abkippung von ca. 25°. Keine Gelenkbeteiligung, Ulna intakt.',
    radioBeurteilung: 'Dislozierte distale Radiusfraktur links (extraartikulär).',
    op: 'Offene Reposition und palmare Plattenosteosynthese des distalen Radius links',
    anaesthesie: 'Plexusanästhesie',
    indikation: 'Dislozierte Fraktur mit dorsaler Abkippung, operative Stabilisierung angezeigt.',
    vorgehen: 'Rückenlage, Arm auf dem Armtisch. Palmarer Zugang, Darstellung und Reposition der Fraktur unter Bildwandlerkontrolle, Fixation mit winkelstabiler Platte. Stellungskontrolle im Bildwandler, schichtweiser Wundverschluss, steriler Verband und Gipsschiene.',
    procedereOp: 'Hochlagern, Fingermobilisation ab sofort, Röntgenkontrolle nach 6 Wochen.',
  },
  osg_fraktur: {
    falltyp: 'Unfall mit Hospitalisation', art: 'BU', koerperteil: 'Sprunggelenk rechts', aufWochen: [8, 10], thrombose: true,
    diagnose: 'Bimalleoläre OSG-Fraktur rechts (Typ Weber B)',
    hergang: 'Beim Abladen von einer Laderampe misstreten und mit dem rechten Fuss umgeknickt.',
    befund: 'Starke Schwellung und Hämatom am rechten Sprunggelenk medial und lateral, Belastung nicht möglich, Durchblutung und Sensibilität intakt.',
    therapie: 'Reposition und Ruhigstellung in Unterschenkelschiene, Schmerzmittel, stationäre Aufnahme zur Operation.',
    procedere: 'Operative Versorgung nach Abschwellung geplant.',
    untersuchung: 'Röntgen OSG rechts in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Schräge Fraktur der distalen Fibula auf Höhe der Syndesmose sowie Fraktur des Innenknöchels. Leichte Subluxation des Talus nach lateral.',
    radioBeurteilung: 'Bimalleoläre Sprunggelenksfraktur rechts, Typ Weber B.',
    op: 'Offene Reposition und Plattenosteosynthese der Fibula sowie Zugschraubenosteosynthese des Innenknöchels rechts',
    anaesthesie: 'Spinalanästhesie',
    indikation: 'Instabile, dislozierte Sprunggelenksfraktur.',
    vorgehen: 'Rückenlage, Blutsperre. Lateraler Zugang zur Fibula, Reposition und Fixation mit Drittelrohrplatte. Medialer Zugang, Reposition des Innenknöchels und Fixation mit zwei Zugschrauben. Stabilitätsprüfung der Syndesmose unauffällig. Schichtweiser Wundverschluss, Unterschenkelschiene.',
    procedereOp: 'Teilbelastung mit 15 kg an Gehstöcken für 6 Wochen, Thromboseprophylaxe, Röntgenkontrolle nach 6 Wochen.',
  },
  clavicula: {
    falltyp: 'Unfall mit Hospitalisation', art: 'NBU', ort: 'Heimweg, Velostreifen', koerperteil: 'Schulter links', aufWochen: [6, 8],
    diagnose: 'Dislozierte Claviculaschaftfraktur links',
    hergang: 'Auf dem Heimweg mit dem Velo gestürzt und auf die linke Schulter gefallen.',
    befund: 'Stufenbildung und Druckdolenz über dem linken Schlüsselbein, Haut intakt, Neurologie und Durchblutung des Arms unauffällig.',
    therapie: 'Armschlinge, Schmerzmittel, stationäre Aufnahme zur Operation.',
    procedere: 'Operative Versorgung geplant.',
    untersuchung: 'Röntgen Clavicula links', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Mehrfragmentäre Fraktur im mittleren Drittel der Clavicula mit Verkürzung um ca. 2 cm und Verschiebung um Schaftbreite.',
    radioBeurteilung: 'Dislozierte Claviculaschaftfraktur links.',
    op: 'Offene Reposition und Plattenosteosynthese der Clavicula links',
    anaesthesie: 'Allgemeinanästhesie',
    indikation: 'Verkürzte, dislozierte Fraktur bei körperlich beanspruchender Tätigkeit.',
    vorgehen: 'Beach-Chair-Lagerung. Zugang über der Clavicula, Reposition und Fixation mit anatomisch vorgeformter Platte. Bildwandlerkontrolle, schichtweiser Wundverschluss.',
    procedereOp: 'Armschlinge für 2 Wochen, Physiotherapie mit Bewegungen bis 90°, Röntgenkontrolle nach 6 Wochen.',
  },
  patella: {
    falltyp: 'Unfall mit Hospitalisation', art: 'BU', koerperteil: 'Knie rechts', aufWochen: [8, 12], thrombose: true,
    diagnose: 'Patellaquerfraktur rechts',
    hergang: 'Bei der Arbeit über eine Kante gestolpert und auf das gebeugte rechte Knie gestürzt.',
    befund: 'Ausgeprägter Kniegelenkserguss rechts, tastbare Delle über der Kniescheibe, aktive Streckung nicht möglich.',
    therapie: 'Ruhigstellung in Streckschiene, Schmerzmittel, stationäre Aufnahme zur Operation.',
    procedere: 'Operative Versorgung geplant.',
    untersuchung: 'Röntgen Knie rechts in 2 Ebenen', radioFrage: 'Frage nach Fraktur.',
    radioBefund: 'Querverlaufende Fraktur der Patella mit einem Spalt von ca. 4 mm. Gelenkerguss.',
    radioBeurteilung: 'Dislozierte Patellaquerfraktur rechts.',
    op: 'Zuggurtungsosteosynthese der Patella rechts',
    anaesthesie: 'Spinalanästhesie',
    indikation: 'Dislozierte Fraktur mit aufgehobener Streckfunktion.',
    vorgehen: 'Rückenlage. Längsschnitt über der Patella, Ausräumen des Hämatoms, Reposition und Fixation mit zwei Kirschnerdrähten und Drahtcerclage. Bildwandlerkontrolle, schichtweiser Wundverschluss.',
    procedereOp: 'Vollbelastung in Streckschiene, Flexion schrittweise bis 90° nach 6 Wochen, Thromboseprophylaxe.',
  },
};
for (const [key, v] of Object.entries(VERLETZUNGEN)) v.key = key;
const verletzungenFuer = (falltyp) => Object.values(VERLETZUNGEN).filter((v) => v.falltyp === falltyp);

// ---------------------------------------------------------------------------------------------
// Fall-Details: Termine, Arbeitsunfähigkeit, Adresse
// ---------------------------------------------------------------------------------------------
const bisStichtag = (iso) => (iso > STICHTAG ? STICHTAG : iso);

function ergaenzeFall(z, fall) {
  const U = fall.unfalldatum;
  const v = VERLETZUNGEN[fall.verletzung];
  const t = {};
  t.erstbehandlung = z.chance(0.75) ? U : addTage(U, 1);
  t.unfallmeldung = bisStichtag(addTage(U, z.ganz(1, 4)));
  t.arztzeugnis = bisStichtag(addTage(t.erstbehandlung, z.ganz(0, 2)));
  t.radiologie = t.erstbehandlung;
  t.eintritt = U;
  t.op = bisStichtag(addTage(U, z.ganz(1, 3)));
  t.austritt = bisStichtag(addTage(t.op, z.ganz(3, 6)));
  t.austrittsbericht = bisStichtag(addTage(t.austritt, z.ganz(0, 2)));
  t.operationsbericht = t.op;
  t.radiologiebefund = t.radiologie;
  t.kontrolle = bisStichtag(addTage(U, z.ganz(14, 24)));
  t.verlaufsbericht = bisStichtag(addTage(t.kontrolle, z.ganz(0, 1)));

  let auf = null;
  if (fall.falltyp === 'Bagatellunfall') {
    if (z.chance(0.5)) auf = [{ prozent: 100, von: U, bis: addTage(U, z.ganz(1, 3)) }];
  } else if (fall.falltyp === 'Unfall mit Arbeitsunfähigkeit') {
    const a = z.ganz(7, 21), b = z.ganz(7, 14);
    auf = [{ prozent: 100, von: U, bis: addTage(U, a) }, { prozent: 50, von: addTage(U, a + 1), bis: addTage(U, a + b) }];
  } else {
    const [w0, w1] = v.aufWochen ?? [6, 8];
    auf = [{ prozent: 100, von: U, bis: addTage(U, z.ganz(w0, w1) * 7), voraussichtlich: true }];
  }
  const ag = AG[fall.arbeitgeber];
  const idx = fall.geschlecht === 'w' ? 1 : 0;
  Object.assign(fall, {
    termine: t,
    auf,
    adresse: `${z.wahl(STRASSEN)} ${z.ganz(1, 80)}, ${z.wahl(ORTE)}`,
    beruf: z.wahl(ag.berufe)[idx],
    pensum: z.wahl([100, 100, 100, 80, 60]),
    uhrzeit: `${String(z.ganz(6, 18)).padStart(2, '0')}:${z.wahl(['00', '10', '15', '20', '30', '40', '45', '50'])}`,
    unfallort: v.art === 'BU' ? z.wahl(ag.unfallorte) : v.ort,
    nebendiagnose: z.chance(0.4) ? z.wahl(NEBENDIAGNOSEN) : null,
    arztIndex: z.ganz(0, 5),
  });
  return fall;
}

function aufText(auf) {
  if (!auf) return 'Keine Arbeitsunfähigkeit.';
  const teile = auf.map((s, i) => {
    const bis = s.voraussichtlich ? `voraussichtlich ${formatCh(s.bis)}` : formatCh(s.bis);
    return `${i === 0 ? '' : 'anschliessend '}${s.prozent} % vom ${formatCh(s.von)} bis ${bis}`;
  });
  return `${teile.join(', ')}.${auf.length === 1 && !auf[0].voraussichtlich ? ' Danach volle Arbeitsfähigkeit.' : ''}`;
}

// ---------------------------------------------------------------------------------------------
// Berichtsinhalte je Dokumenttyp
// ---------------------------------------------------------------------------------------------
const INHALT = {
  arztzeugnis(s) {
    const f = s.fall, v = VERLETZUNGEN[f.verletzung];
    return {
      titel: 'Arztzeugnis UVG',
      kopf: [],
      abschnitte: [
        ['Erstbehandlung', `am ${formatCh(f.termine.erstbehandlung)}`],
        ['Angaben zum Unfallhergang', v.hergang],
        ['Befund', v.befund],
        ['Diagnose', v.diagnose],
        ['Behandlung', v.therapie],
        ['Arbeitsunfähigkeit', aufText(f.auf)],
        ['Weiteres Vorgehen', v.procedere],
      ],
    };
  },
  austrittsbericht(s) {
    const f = s.fall, v = VERLETZUNGEN[f.verletzung], t = f.termine;
    const diagnosen = [`1. ${v.diagnose}`];
    if (f.nebendiagnose) diagnosen.push(`2. ${f.nebendiagnose}`);
    const medikation = ['Paracetamol 1 g bis 4× täglich', 'Ibuprofen 400 mg bei Bedarf bis 3× täglich'];
    if (v.thrombose) medikation.push('Enoxaparin 40 mg s.c. 1× täglich während der Teilbelastung');
    return {
      titel: 'Austrittsbericht',
      kopf: [['Hospitalisation', `${formatCh(t.eintritt)} bis ${formatCh(t.austritt)}`]],
      abschnitte: [
        ['Diagnosen', diagnosen.join('\n')],
        ['Operation', `${formatCh(t.op)}: ${v.op}`],
        ['Anamnese', `${v.hergang} Notfallmässige Vorstellung am Unfalltag.`],
        ['Befund bei Eintritt', v.befund],
        ['Verlauf', 'Der Eingriff verlief komplikationslos. Postoperativ reizlose Wundverhältnisse, Schmerzen unter oraler Schmerztherapie gut kontrolliert. Mobilisation unter physiotherapeutischer Anleitung. Austritt in gutem Allgemeinzustand nach Hause.'],
        ['Procedere', `${v.procedereOp} Fadenentfernung 14 Tage postoperativ beim Hausarzt.`],
        ['Medikation bei Austritt', medikation.join(', ')],
        ['Arbeitsunfähigkeit', aufText(f.auf)],
      ],
    };
  },
  operationsbericht(s) {
    const f = s.fall, v = VERLETZUNGEN[f.verletzung], le = s.absender;
    const assistenz = le.aerzte[le.aerzte.length - 1];
    return {
      titel: 'Operationsbericht',
      kopf: [
        ['Operationsdatum', formatCh(f.termine.op)],
        ['Operateur', le.aerzte[0].name],
        ['Assistenz', assistenz.name],
        ['Anästhesie', v.anaesthesie],
      ],
      abschnitte: [
        ['Diagnose', v.diagnose],
        ['Eingriff', v.op],
        ['Indikation', v.indikation],
        ['Lagerung und Vorgehen', v.vorgehen],
        ['Procedere', v.procedereOp],
      ],
    };
  },
  radiologiebefund(s) {
    const f = s.fall, v = VERLETZUNGEN[f.verletzung];
    const angaben = s.zeige.unfalldatum
      ? `Unfall vom ${formatCh(f.unfalldatum)}. ${v.hergang} ${v.radioFrage}`
      : `Status nach Unfall, Schmerzen ${v.koerperteil}. ${v.radioFrage}`;
    return {
      titel: 'Radiologiebefund',
      kopf: [['Untersuchung vom', formatCh(s.datum)], ['Untersuchung', v.untersuchung]],
      abschnitte: [
        ['Klinische Angaben', angaben],
        ['Befund', v.radioBefund],
        ['Beurteilung', v.radioBeurteilung],
      ],
    };
  },
  verlaufsbericht(s) {
    const f = s.fall, v = VERLETZUNGEN[f.verletzung], erst = f.termine.erstbehandlung;
    const konsultation = !s.zeige.unfalldatum
      ? `Erstkonsultation am ${formatCh(erst)} nach einem Unfall.`
      : `Erstkonsultation ${erst === f.unfalldatum ? 'am Unfalltag' : `am ${formatCh(erst)}`} nach dem Unfall vom ${formatCh(f.unfalldatum)}.`;
    return {
      titel: 'Verlaufsbericht',
      kopf: [['Kontrolle vom', formatCh(f.termine.kontrolle)]],
      abschnitte: [
        ['Bisheriger Verlauf', `${konsultation} Diagnose: ${v.diagnose}. Behandlung: ${v.therapie}`],
        ['Aktueller Befund', v.verlaufBefund],
        ['Beurteilung', v.verlaufBeurteilung],
        ['Procedere', v.verlaufProcedere],
        ['Arbeitsunfähigkeit', aufText(f.auf)],
      ],
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Layouts: jeder Absender hat einen eigenen Briefkopf und Aufbau
// ---------------------------------------------------------------------------------------------
function umbrechen(text, breite = 78) {
  const zeilen = [];
  for (const absatz of String(text).split('\n')) {
    let zeile = '';
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      if (zeile && zeile.length + 1 + wort.length > breite) {
        zeilen.push(zeile);
        zeile = wort;
      } else {
        zeile = zeile ? `${zeile} ${wort}` : wort;
      }
    }
    zeilen.push(zeile);
  }
  return zeilen.join('\n');
}
const feld = (label, wert, breite = 16) => {
  const k = `${label}:`;
  return k.length >= breite ? `${k} ${wert}` : `${k.padEnd(breite)}${wert}`;
};
/** Feld mit hängendem Einzug für lange Werte. */
const feldUmbrochen = (label, wert, breite, zeilenbreite = 78) => umbrechen(wert, zeilenbreite - breite)
  .split('\n').map((z, i) => (i === 0 ? feld(label, z, breite) : ' '.repeat(breite) + z)).join('\n');
const anrede = (p) => (p.geschlecht === 'w' ? 'Frau' : 'Herr');
const patientLabel = (p) => (p.geschlecht === 'w' ? 'Patientin' : 'Patient');
const ohneUmlaute = (s) => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue');

function nameText(s, standard) {
  let vorname = s.person.vorname;
  let nachname = s.name?.nachname ?? s.person.nachname;
  if (s.name?.ersatz) { vorname = ohneUmlaute(vorname); nachname = ohneUmlaute(nachname); }
  const reihenfolge = s.name?.reihenfolge ?? standard;
  if (reihenfolge === 'nv') return `${nachname} ${vorname}`;
  if (reihenfolge === 'n,v') return `${nachname}, ${vorname}`;
  return `${vorname} ${nachname}`;
}

const LAYOUTS = {
  spital(s, inh) {
    const le = s.absender, p = s.person;
    const z = [le.name.toUpperCase(), le.zusatz, `${le.strasse} · ${le.ort}`, `GLN ${le.gln} · ZSR ${le.zsr}`, ''];
    z.push('Unfallversicherer', 'Leistungsabteilung UVG', 'Postfach', '9990 Musterhausen', '');
    z.push(`${le.ortsname}, ${formatChLang(s.datum)}`, '', inh.titel.toUpperCase(), '');
    const mitAnrede = s.name?.reihenfolge !== 'n,v' ? `${anrede(p)} ` : '';
    z.push(feld(patientLabel(p), `${mitAnrede}${nameText(s, 'vn')}${s.zeige.geburtsdatum ? `, geb. ${formatCh(p.geburtsdatum)}` : ''}`));
    if (s.zeige.adresse) z.push(feld('Adresse', p.adresse));
    if (s.zeige.unfalldatum) z.push(feld('Unfall vom', formatCh(s.fall.unfalldatum)));
    if (s.zeige.schadenNr) z.push(feld('Schaden-Nr.', s.schadenNr));
    for (const [l, w] of inh.kopf) z.push(feld(l, w));
    z.push('', 'Sehr geehrte Damen und Herren', '');
    z.push(`Wir berichten Ihnen über ${p.geschlecht === 'w' ? 'die oben genannte Patientin' : 'den oben genannten Patienten'}.`, '');
    for (const [titel, text] of inh.abschnitte) z.push(titel, umbrechen(text), '');
    const a1 = le.aerzte[0], a2 = le.aerzte[le.aerzte.length - 1];
    z.push('Freundliche Grüsse', '', '', `${a1.name.padEnd(36)}${a2.name}`, `${a1.funktion.padEnd(36)}${a2.funktion}`);
    return z.join('\n');
  },

  spital2(s, inh) {
    const le = s.absender, p = s.person;
    const z = [`${le.name} | ${le.zusatz}`, `${le.strasse} | ${le.ort}`, `GLN ${le.gln} | ZSR ${le.zsr}`, '='.repeat(60), ''];
    z.push(`${le.ortsname}, ${formatCh(s.datum)}`, '', inh.titel.toUpperCase(), '');
    z.push(feld('Betrifft', `${nameText(s, 'nv')}${s.zeige.geburtsdatum ? `, geb. ${formatCh(p.geburtsdatum)}` : ''}`, 18));
    if (s.zeige.unfalldatum) z.push(feld('Ereignis am', formatCh(s.fall.unfalldatum), 18));
    if (s.zeige.schadenNr) z.push(feld('Ihre Referenz', s.schadenNr, 18));
    for (const [l, w] of inh.kopf) z.push(feld(l, w, 18));
    z.push('');
    for (const [titel, text] of inh.abschnitte) z.push(`-- ${titel} --`, umbrechen(text), '');
    const a = le.aerzte[0];
    z.push(`${a.name}, ${a.funktion}`, '(elektronisch visiert)');
    return z.join('\n');
  },

  praxis(s, inh) {
    const le = s.absender, p = s.person, a = le.aerzte[0];
    const z = [le.name, `${a.name} · ${a.funktion}`, `${le.strasse}, ${le.ort}`, `ZSR ${le.zsr} / GLN ${le.gln}`, '', inh.titel.toUpperCase(), ''];
    z.push(feld('Name', nameText(s, 'nv'), 15));
    if (s.zeige.geburtsdatum) z.push(feld('Geburtsdatum', formatCh(p.geburtsdatum), 15));
    if (s.zeige.adresse) z.push(feld('Adresse', p.adresse, 15));
    if (s.zeige.unfalldatum) z.push(feld('Unfalldatum', formatCh(s.fall.unfalldatum), 15));
    if (s.zeige.schadenNr) z.push(feld('Schaden-Nr.', s.schadenNr, 15));
    for (const [l, w] of inh.kopf) z.push(feld(l, w, 15));
    z.push('');
    for (const [titel, text] of inh.abschnitte) z.push(titel.toUpperCase(), umbrechen(text), '');
    z.push(`${le.ortsname}, ${formatCh(s.datum)}`, '', a.name);
    return z.join('\n');
  },

  praxis2(s, inh) {
    const le = s.absender, p = s.person, a = le.aerzte[0];
    const einzug = ' '.repeat(44);
    const z = [`${le.name} · ${a.name} · ${le.strasse} · ${le.ort}`, `GLN ${le.gln}`, ''];
    z.push(`${einzug}Unfallversicherer`, `${einzug}Leistungsabteilung UVG`, `${einzug}Postfach, 9990 Musterhausen`, '');
    z.push(`${le.ortsname}, ${formatChLang(s.datum)}`, '', inh.titel, '');
    const betrifft = [nameText(s, 'vn')];
    if (s.zeige.geburtsdatum) betrifft.push(`geb. ${formatCh(p.geburtsdatum)}`);
    if (s.zeige.unfalldatum) betrifft.push(`Unfall vom ${formatCh(s.fall.unfalldatum)}`);
    z.push(`Betrifft: ${betrifft.join(', ')}`);
    if (s.zeige.schadenNr) z.push(`Ihre Schaden-Nr.: ${s.schadenNr}`);
    for (const [l, w] of inh.kopf) z.push(`${l}: ${w}`);
    z.push('', 'Sehr geehrte Damen und Herren', '');
    z.push(`Gerne berichte ich Ihnen über ${p.geschlecht === 'w' ? 'meine Patientin' : 'meinen Patienten'}.`, '');
    for (const [titel, text] of inh.abschnitte) z.push(umbrechen(`${titel}: ${text}`), '');
    z.push('Für Rückfragen stehe ich Ihnen gerne zur Verfügung.', '', 'Freundliche Grüsse', '', a.name, a.funktion);
    return z.join('\n');
  },

  radiologie(s, inh) {
    const le = s.absender, p = s.person, a = le.aerzte[0];
    const z = [le.name.toUpperCase(), le.zusatz, `${le.strasse} · ${le.ort} · GLN ${le.gln} · ZSR ${le.zsr}`, '', inh.titel.toUpperCase(), ''];
    let patient = feld(patientLabel(p), nameText(s, 'nv'), 20);
    if (s.zeige.geburtsdatum) patient += `${' '.repeat(Math.max(3, 46 - patient.length))}geb. ${formatCh(p.geburtsdatum)}`;
    z.push(patient);
    if (s.zuweiser) z.push(feld('Zuweisung', s.zuweiser, 20));
    for (const [l, w] of inh.kopf) z.push(feld(l, w, 20));
    if (s.zeige.schadenNr) z.push(feld('Schaden-Nr.', s.schadenNr, 20));
    z.push('');
    for (const [titel, text] of inh.abschnitte) z.push(`${titel}:`, umbrechen(text), '');
    z.push(`Befundet durch: ${a.name}, ${a.funktion}`, `${le.ortsname}, ${formatCh(s.datum)}`);
    return z.join('\n');
  },

  permanence(s, inh) {
    const le = s.absender, p = s.person, a = le.aerzte[s.fall.arztIndex % le.aerzte.length];
    const linie = '-'.repeat(64);
    const gross = (l, w) => `${l.toUpperCase().padEnd(15)}${w}`;
    const z = [le.name, `${le.zusatz} · ${le.strasse} · ${le.ort}`, `GLN: ${le.gln}   ZSR: ${le.zsr}`, linie];
    z.push(gross('Dokument', inh.titel), gross('Datum', formatCh(s.datum)), linie);
    z.push(feld('Name', nameText(s, 'nv'), 15));
    if (s.zeige.geburtsdatum) z.push(feld('Geburtsdatum', formatCh(p.geburtsdatum), 15));
    if (s.zeige.unfalldatum) z.push(feld('Unfalldatum', formatCh(s.fall.unfalldatum), 15));
    if (s.zeige.schadenNr) z.push(feld('Schaden-Nr.', s.schadenNr, 15));
    for (const [l, w] of inh.kopf) z.push(feld(l, w, 15));
    z.push(linie);
    for (const [titel, text] of inh.abschnitte) z.push(umbrechen(`${titel.toUpperCase()}: ${text}`, 64), '');
    z.push(linie, `${a.funktion.includes('ärztin') ? 'Behandelnde Ärztin' : 'Behandelnder Arzt'}: ${a.name}`);
    return z.join('\n');
  },
};

/** Unfallmeldung des Arbeitgebers (einheitliches Formular, wie in der Praxis üblich). */
function unfallmeldung(s) {
  const ag = s.absender, p = s.person, f = s.fall, v = VERLETZUNGEN[f.verletzung];
  const b = 24;
  const z = [ag.name, 'Personaldienst', `${ag.strasse}, ${ag.ort}`, '', 'An: Unfallversicherer, Leistungsabteilung UVG', ''];
  z.push(`${ag.ortsname}, ${formatCh(s.datum)}`, '', 'UNFALLMELDUNG UVG', '');
  if (s.zeige.schadenNr) z.push(feld('Ihre Schaden-Nr.', s.schadenNr, b), '');
  z.push('Arbeitgeber', feld('Firma', ag.name, b), feld('Adresse', `${ag.strasse}, ${ag.ort}`, b), '');
  z.push('Versicherte Person', feld('Name', nameText(s, 'nv'), b));
  if (s.zeige.geburtsdatum) z.push(feld('Geburtsdatum', formatCh(p.geburtsdatum), b));
  z.push(feld('Adresse', p.adresse, b), feld('Funktion', f.beruf, b), feld('Beschäftigungsgrad', `${f.pensum} %`, b), '');
  z.push('Angaben zum Unfall', feld('Art', v.art === 'BU' ? 'Berufsunfall' : 'Nichtberufsunfall', b));
  if (s.zeige.unfalldatum) z.push(feld('Unfalldatum', `${formatCh(f.unfalldatum)}, ca. ${f.uhrzeit} Uhr`, b));
  z.push(feld('Unfallort', f.unfallort, b));
  z.push(feldUmbrochen('Hergang', v.hergang, b));
  z.push(feld('Verletzter Körperteil', v.koerperteil, b));
  z.push(feld('Erstbehandlung', LE[f.le].name, b));
  z.push(feld('Arbeit ausgesetzt', f.auf ? `ja, seit ${formatCh(f.unfalldatum)}` : 'nein', b), '');
  z.push(feld('Kontaktperson', `${ag.kontakt}, Personaldienst`, b), feld('E-Mail', `personal@${ag.slug}.example`, b));
  return z.join('\n');
}

/** Ganzer Bericht inkl. Hinweiszeile am Ende. */
function render(s) {
  const text = s.typ === 'unfallmeldung' ? unfallmeldung(s) : LAYOUTS[s.absender.layout](s, INHALT[s.typ](s));
  return `${text.replace(/[ \t]+$/gm, '')}\n\n${HINWEIS}\n`;
}

/** Wer schickt welchen Dokumenttyp? */
function absenderFuer(typ, fall) {
  if (typ === 'unfallmeldung') return AG[fall.arbeitgeber];
  if (typ === 'radiologiebefund') return LE.musterpark;
  return LE[fall.le];
}

function berichtSpec(fall, typ, optionen = {}) {
  const absender = optionen.absender ?? absenderFuer(typ, fall);
  return {
    typ,
    fall,
    person: optionen.person ?? fall,
    absender,
    schadenNr: optionen.schadenNr ?? fall.schaden_nr,
    zeige: { schadenNr: false, geburtsdatum: false, unfalldatum: false, adresse: false, ...optionen.zeige },
    name: optionen.name ?? null,
    datum: optionen.datum ?? fall.termine[typ],
    zuweiser: optionen.zuweiser === undefined ? (typ === 'radiologiebefund' ? LE[fall.le].name : null) : optionen.zuweiser,
  };
}

// ---------------------------------------------------------------------------------------------
// Datensatz 1: Demo (12 Fälle, 10 Berichte = 10 Szenarien)
// ---------------------------------------------------------------------------------------------
const DEMO_FAELLE = [
  // key, schaden_nr, vorname, nachname, g, geburtsdatum, unfalldatum, falltyp, arbeitgeber, le, sachbearbeitung, verletzung
  ['C01', 'UV-2026-10417', 'Sarah', 'Keller', 'w', '1990-02-14', '2026-10-05', 'Bagatellunfall', 'logistik', 'lindenplatz', 'A. Graber', 'schnitt_finger'],
  ['C02', 'UV-2026-11872', 'Reto', 'Bühler', 'm', '1971-05-07', '2026-10-02', 'Unfall mit Hospitalisation', 'bau', 'seewald', 'L. Gerber', 'osg_fraktur'],
  ['C03', 'UV-2026-12304', 'Lukas', 'Brunner', 'm', '1988-06-23', '2026-10-12', 'Unfall mit Hospitalisation', 'elektro', 'lindenbach', 'A. Graber', 'radius'],
  ['C04', 'UV-2026-12093', 'Daniel', 'Meier', 'm', '1979-11-14', '2026-10-01', 'Unfall mit Arbeitsunfähigkeit', 'gastro', 'sonnenrain', 'M. Roth', 'distorsion_osg_band'],
  ['C05', 'UV-2026-12650', 'Daniel', 'Meier', 'm', '1992-09-03', '2026-10-19', 'Bagatellunfall', 'maschinen', 'permanence', 'M. Roth', 'kontusion_knie'],
  ['C06', 'UV-2026-13018', 'Anna', 'Schmid', 'w', '1985-03-28', '2026-10-08', 'Unfall mit Arbeitsunfähigkeit', 'treuhand', 'lindenplatz', 'L. Gerber', 'lws_kontusion'],
  ['C07', 'UV-2026-13181', 'Laura', 'Widmer', 'w', '1984-11-30', '2026-10-15', 'Unfall mit Arbeitsunfähigkeit', 'detailhandel', 'sonnenrain', 'A. Graber', 'schulter_kontusion'],
  ['C08', 'UV-2026-13455', 'Simon', 'Kälin', 'm', '1996-08-09', '2026-10-06', 'Unfall mit Arbeitsunfähigkeit', 'logistik', 'sonnenrain', 'M. Roth', 'bone_bruise_knie'],
  ['C09', 'UV-2026-13702', 'Monika', 'Zürcher', 'w', '1968-01-17', '2026-10-21', 'Unfall mit Hospitalisation', 'reinigung', 'seewald', 'S. Ammann', 'patella'],
  ['C10', 'UV-2026-14026', 'Marco', 'Huber', 'm', '2001-12-02', '2026-10-26', 'Bagatellunfall', 'bau', 'permanence', 'S. Ammann', 'distorsion_osg_leicht'],
  ['C11', 'UV-2026-14239', 'Fabienne', 'Lüthi', 'w', '1977-04-11', '2026-10-13', 'Unfall mit Arbeitsunfähigkeit', 'gastro', 'lindenplatz', 'S. Ammann', 'schnitt_hand_tief'],
  ['C12', 'UV-2026-14517', 'Stefan', 'Graf', 'm', '1963-07-25', '2026-09-29', 'Unfall mit Hospitalisation', 'maschinen', 'lindenbach', 'L. Gerber', 'clavicula'],
];

function erzeugeDemo() {
  const z = new Zufall(SEED);
  const faelle = DEMO_FAELLE.map(([key, schaden_nr, vorname, nachname, geschlecht, geburtsdatum, unfalldatum, falltyp, arbeitgeber, le, sachbearbeitung, verletzung]) =>
    ergaenzeFall(z, { key, schaden_nr, vorname, nachname, geschlecht, geburtsdatum, unfalldatum, falltyp, arbeitgeber, le, sachbearbeitung, verletzung }));
  const F = Object.fromEntries(faelle.map((f) => [f.key, f]));

  // Szenario 6: Person, die in keinem Fall vorkommt
  const unbekannt = ergaenzeFall(z, {
    key: 'X01', schaden_nr: '', vorname: 'Chiara', nachname: 'Bieri', geschlecht: 'w', geburtsdatum: '1993-06-21',
    unfalldatum: '2026-10-07', falltyp: 'Bagatellunfall', arbeitgeber: 'detailhandel', le: 'lindenplatz', sachbearbeitung: '', verletzung: 'schnitt_finger',
  });
  const alles = { schadenNr: true, geburtsdatum: true, unfalldatum: true };
  const ohneNr = { geburtsdatum: true, unfalldatum: true };

  const szenarien = [
    { nr: 1, titel: 'Arztzeugnis mit Schaden-Nr.', erwartet: 'automatisch', fall: F.C01,
      spec: berichtSpec(F.C01, 'arztzeugnis', { zeige: alles }) },
    { nr: 2, titel: 'Austrittsbericht ohne Schaden-Nr., mit Name, Geburtsdatum und Unfalldatum', erwartet: 'automatisch', fall: F.C02,
      spec: berichtSpec(F.C02, 'austrittsbericht', { zeige: { ...ohneNr, adresse: true }, name: { ersatz: true } }) },
    { nr: 3, titel: 'Operationsbericht mit Tippfehler im Namen («Bruner» statt «Brunner»)', erwartet: 'automatisch', fall: F.C03,
      spec: berichtSpec(F.C03, 'operationsbericht', { zeige: ohneNr, name: { nachname: 'Bruner' } }) },
    { nr: 4, titel: 'Bericht zu einer von zwei gleichnamigen Personen (Daniel Meier), mit Geburtsdatum', erwartet: 'automatisch', fall: F.C04,
      spec: berichtSpec(F.C04, 'arztzeugnis', { zeige: ohneNr }) },
    { nr: 5, titel: 'Bericht zum gleichen Namen ohne Geburtsdatum und ohne Unfalldatum', erwartet: 'triage', fall: null, korrekt: F.C04,
      spec: berichtSpec(F.C04, 'radiologiebefund', { zeige: {}, zuweiser: null, datum: '2026-10-20' }) },
    { nr: 6, titel: 'Bericht zu einer unbekannten Person', erwartet: 'triage', fall: null,
      spec: berichtSpec(unbekannt, 'arztzeugnis', { zeige: ohneNr, schadenNr: '' }) },
    { nr: 7, titel: 'Schaden-Nr. passt nicht zum Namen (Nummer von Anna Schmid, Bericht zu Laura Widmer)', erwartet: 'widerspruch', fall: null, korrekt: F.C07,
      spec: berichtSpec(F.C07, 'verlaufsbericht', { zeige: alles, schadenNr: F.C06.schaden_nr }) },
    { nr: 8, titel: 'Verlaufsbericht nur mit Name und Unfalldatum', erwartet: 'vorschlag', fall: F.C08,
      spec: berichtSpec(F.C08, 'verlaufsbericht', { zeige: { unfalldatum: true }, name: { reihenfolge: 'nv', ersatz: true } }) },
    { nr: 9, titel: 'Exaktes Duplikat von Bericht 2 (erneut gesendet)', erwartet: 'duplikat', fall: F.C02, duplikatVon: 2 },
    { nr: 10, titel: 'Unfallmeldung vom Arbeitgeber', erwartet: 'automatisch', fall: F.C01,
      spec: berichtSpec(F.C01, 'unfallmeldung', { zeige: ohneNr }) },
  ];

  const dateien = {};
  const index = [];
  for (const sz of szenarien) {
    let text, typ, absender;
    if (sz.duplikatVon) {
      const original = szenarien.find((x) => x.nr === sz.duplikatVon);
      // Inhaltlich identisch, aber mit Windows-Zeilenenden und Leerzeichen am Zeilenende (wie bei erneutem Mailversand)
      text = original.text.split('\n').map((zeile, i) => (i % 7 === 3 && zeile ? `${zeile}  ` : zeile)).join('\r\n');
      typ = original.spec.typ;
      absender = original.spec.absender;
    } else {
      text = render(sz.spec);
      typ = sz.spec.typ;
      absender = sz.spec.absender;
    }
    sz.text = text;
    const datei = `${String(sz.nr).padStart(2, '0')}_${absender.slug}_${typ}${sz.duplikatVon ? '_erneut' : ''}.txt`;
    dateien[datei] = text;
    index.push({
      szenario: sz.nr,
      datei,
      titel: sz.titel,
      erwartet: sz.erwartet,
      erwartet_schaden_nr: sz.erwartet === 'automatisch' || sz.erwartet === 'vorschlag' ? sz.fall.schaden_nr : null,
      erwartet_dokumenttyp: typ,
      ...(sz.korrekt ? { korrekter_fall: sz.korrekt.schaden_nr } : {}),
      ...(sz.duplikatVon ? { duplikat_von_szenario: sz.duplikatVon } : {}),
    });
  }
  return {
    faelle,
    dateien,
    index: {
      beschreibung: 'Demo-Posteingang: 10 fiktive Berichte, je ein Szenario. Erwartete Ergebnisse dienen den automatischen Tests.',
      hinweis: HINWEIS,
      berichte: index,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Datensatz 2: Volumen (150 Fälle, 300 Berichte)
// ---------------------------------------------------------------------------------------------
const VOLUMEN = { faelle: 150, mitNr: 180, ohneNr: 75, vorschlag: 8, nurName: 8, unbekannt: 10, widerspruch: 4, duplikate: 15 };
const FALLTYP_GEWICHTE = [['Bagatellunfall', 0.4], ['Unfall mit Arbeitsunfähigkeit', 0.4], ['Unfall mit Hospitalisation', 0.2]];

function zufallsPerson(z) {
  const geschlecht = z.chance(0.5) ? 'w' : 'm';
  return {
    geschlecht,
    vorname: z.wahl(geschlecht === 'w' ? VORNAMEN_W : VORNAMEN_M),
    nachname: z.wahl(NACHNAMEN),
    // Erwerbstätige zwischen 18 und 65 Jahren (Unfälle 2026)
    geburtsdatum: z.datum('1962-01-01', '2007-12-31'),
  };
}

function falltypZiehen(z) {
  let r = z.naechste();
  for (const [typ, p] of FALLTYP_GEWICHTE) { if ((r -= p) < 0) return typ; }
  return FALLTYP_GEWICHTE[0][0];
}

const nameAehnlich = (a, b) => nameAehnlichkeit(`${a.vorname} ${a.nachname}`, b.vorname, b.nachname) >= MATCHING.nameMinAehnlichkeit;

function zeitstempel(z, iso) {
  return `${iso}T${String(z.ganz(6, 15)).padStart(2, '0')}:${String(z.ganz(0, 59)).padStart(2, '0')}:00Z`;
}

function erzeugeVolumen() {
  const z = new Zufall(SEED + 1);
  const nummern = new Set();
  const faelle = [];
  while (faelle.length < VOLUMEN.faelle) {
    const person = zufallsPerson(z);
    if (faelle.some((f) => f.vorname === person.vorname && f.nachname === person.nachname && f.geburtsdatum === person.geburtsdatum)) continue;
    let nr;
    do { nr = `UV-2026-${z.ganz(20000, 69999)}`; } while (nummern.has(nr));
    nummern.add(nr);
    const falltyp = falltypZiehen(z);
    const le = falltyp === 'Unfall mit Hospitalisation' ? z.wahl(['seewald', 'lindenbach']) : z.wahl(['lindenplatz', 'sonnenrain', 'permanence']);
    faelle.push(ergaenzeFall(z, {
      key: nr, schaden_nr: nr, ...person,
      unfalldatum: z.datum('2026-08-17', '2026-10-25'),
      falltyp, arbeitgeber: z.wahl(Object.keys(AG)), le,
      sachbearbeitung: z.wahl(SACHBEARBEITUNG),
      verletzung: z.wahl(verletzungenFuer(falltyp)).key,
    }));
  }
  faelle.sort((a, b) => a.schaden_nr.localeCompare(b.schaden_nr));
  const eindeutigerName = (f) => !faelle.some((g) => g !== f && nameAehnlich(f, g));

  // Alle nötigen Unterlagen aller Fälle als «Slots», zufällig gemischt
  const slots = z.mischen(faelle.flatMap((f) => FALLTYPEN[f.falltyp].map((typ) => ({ fall: f, typ }))));
  const nimm = (anzahl, filter = () => true) => {
    const gewaehlt = [];
    for (let i = 0; i < slots.length && gewaehlt.length < anzahl; i++) {
      if (filter(slots[i])) gewaehlt.push(...slots.splice(i--, 1));
    }
    return gewaehlt;
  };
  const namensVariante = () => ({ reihenfolge: z.wahl(['vn', 'nv', 'n,v', undefined]), ersatz: z.chance(0.15) });
  const berichte = [];
  const neu = (kategorie, erwartet, spec, nr) => {
    const eingang = bisStichtag(addTage(spec.datum, z.ganz(0, 2)));
    berichte.push({ kategorie, erwartet, erwartet_schaden_nr: nr, spec, text: render(spec), eingegangen_am: zeitstempel(z, eingang) });
  };

  for (const { fall, typ } of nimm(VOLUMEN.mitNr)) {
    neu('mit_schaden_nr', 'automatisch', berichtSpec(fall, typ, {
      zeige: { schadenNr: true, geburtsdatum: z.chance(0.8), unfalldatum: z.chance(0.9), adresse: z.chance(0.3) }, name: namensVariante(),
    }), fall.schaden_nr);
  }
  for (const { fall, typ } of nimm(VOLUMEN.ohneNr)) {
    neu('ohne_schaden_nr', 'automatisch', berichtSpec(fall, typ, {
      zeige: { geburtsdatum: true, unfalldatum: true, adresse: z.chance(0.3) }, name: namensVariante(),
    }), fall.schaden_nr);
  }
  // Unklar: nur Name + Unfalldatum (→ Vorschlag), nur Name (→ Triage), unbekannte Person, Widerspruch
  for (const { fall, typ } of nimm(VOLUMEN.vorschlag, (s) => eindeutigerName(s.fall))) {
    neu('unklar_vorschlag', 'vorschlag', berichtSpec(fall, typ, { zeige: { unfalldatum: true }, name: namensVariante() }), fall.schaden_nr);
  }
  for (const { fall, typ } of nimm(VOLUMEN.nurName)) {
    neu('unklar_nur_name', 'triage', berichtSpec(fall, typ, { zeige: {}, name: namensVariante() }), null);
  }
  for (let i = 0; i < VOLUMEN.unbekannt; i++) {
    let person;
    do { person = zufallsPerson(z); } while (faelle.some((f) => nameAehnlich(person, f) || f.geburtsdatum === person.geburtsdatum));
    const falltyp = z.wahl(['Bagatellunfall', 'Unfall mit Arbeitsunfähigkeit']);
    const pseudo = ergaenzeFall(z, {
      key: `X${i}`, schaden_nr: '', ...person, unfalldatum: z.datum('2026-08-17', '2026-10-25'), falltyp,
      arbeitgeber: z.wahl(Object.keys(AG)), le: z.wahl(['lindenplatz', 'sonnenrain', 'permanence']), sachbearbeitung: '',
      verletzung: z.wahl(verletzungenFuer(falltyp)).key,
    });
    const typ = falltyp === 'Bagatellunfall' ? 'arztzeugnis' : z.wahl(['arztzeugnis', 'verlaufsbericht']);
    neu('unklar_unbekannt', 'triage', berichtSpec(pseudo, typ, {
      zeige: { geburtsdatum: true, unfalldatum: true }, schadenNr: '',
    }), null);
  }
  for (let i = 0; i < VOLUMEN.widerspruch; i++) {
    const [{ fall: person, typ }] = nimm(1);
    let nummerVon;
    do { nummerVon = z.wahl(faelle); } while (nummerVon === person || nameAehnlich(person, nummerVon) || nummerVon.geburtsdatum === person.geburtsdatum);
    neu('unklar_widerspruch', 'widerspruch', berichtSpec(person, typ, {
      zeige: { schadenNr: true, geburtsdatum: true, unfalldatum: true }, schadenNr: nummerVon.schaden_nr,
    }), null);
  }
  // Duplikate: exakte Kopien früherer Berichte, später erneut eingegangen
  const originale = z.mischen(berichte.filter((b) => b.kategorie === 'mit_schaden_nr' || b.kategorie === 'ohne_schaden_nr')).slice(0, VOLUMEN.duplikate);
  for (const original of originale) {
    const spaeter = new Date(Date.parse(original.eingegangen_am) + z.ganz(1, 10) * 86_400_000 + z.ganz(1, 5) * 3_600_000);
    const grenze = new Date(`${STICHTAG}T16:00:00Z`);
    const eingang = spaeter > grenze ? new Date(Date.parse(original.eingegangen_am) + 3_600_000) : spaeter;
    berichte.push({ kategorie: 'duplikat', erwartet: 'duplikat', erwartet_schaden_nr: null, spec: original.spec, text: original.text, eingegangen_am: eingang.toISOString().replace('.000Z', 'Z'), original });
  }

  berichte.sort((a, b) => a.eingegangen_am.localeCompare(b.eingegangen_am));
  berichte.forEach((b, i) => {
    b.id = `V${String(i + 1).padStart(4, '0')}`;
    b.datei = `${b.id.toLowerCase()}_${b.spec.absender.slug}_${b.spec.typ}.txt`;
  });
  return {
    faelle,
    berichte: {
      beschreibung: 'Volumen-Datensatz: 300 fiktive Berichte zu 150 fiktiven Fällen, sortiert nach Eingang.',
      hinweis: HINWEIS,
      verteilung: VOLUMEN,
      berichte: berichte.map((b) => ({
        id: b.id,
        datei: b.datei,
        eingegangen_am: b.eingegangen_am,
        kategorie: b.kategorie,
        erwartet: b.erwartet,
        erwartet_schaden_nr: b.erwartet_schaden_nr,
        erwartet_dokumenttyp: b.spec.typ,
        ...(b.original ? { duplikat_von: b.original.id } : {}),
        text: b.text,
      })),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Ausgabe: Excel, CSV, JSON, TXT
// ---------------------------------------------------------------------------------------------
const zeile = (f) => FALL_SPALTEN.map((s) => (s === 'leistungserbringer' ? LE[f.le].name
  : s === 'leistungserbringer_gln' ? LE[f.le].gln
    : s === 'leistungserbringer_zsr' ? LE[f.le].zsr
      : s === 'arbeitgeber' ? AG[f.arbeitgeber].name
        : f[s]));

function excel(faelle, titel) {
  const ws = {};
  const daten = [FALL_SPALTEN, ...faelle.map(zeile)];
  daten.forEach((reihe, r) => reihe.forEach((wert, c) => {
    const spalte = FALL_SPALTEN[c];
    const adresse = XLSX.utils.encode_cell({ r, c });
    if (r > 0 && (spalte === 'geburtsdatum' || spalte === 'unfalldatum')) {
      ws[adresse] = { t: 'n', v: isoZuExcelSerial(wert), z: 'dd.mm.yyyy' }; // echtes Excel-Datum
    } else {
      ws[adresse] = { t: 's', v: String(wert) }; // GLN als Text, damit Excel keine 7.61E+12 anzeigt
    }
  }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: daten.length - 1, c: FALL_SPALTEN.length - 1 } });
  ws['!cols'] = FALL_SPALTEN.map((s) => ({ wch: Math.max(12, s.length + 2, ...daten.slice(1).map((d) => String(d[FALL_SPALTEN.indexOf(s)]).length + 2)) }));
  ws['!autofilter'] = { ref: ws['!ref'] };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faelle');
  wb.Props = { Title: titel, Subject: HINWEIS, Author: 'CaseConnect Lite Mockdaten-Generator', CreatedDate: FIXES_DATUM, ModifiedDate: FIXES_DATUM };
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
}

/** CSV mit Semikolon (Schweizer Excel-Standard), UTF-8 mit BOM, Datum als TT.MM.JJJJ. */
function csv(faelle) {
  const zelle = (w) => (/[;"\r\n]/.test(w) ? `"${w.replace(/"/g, '""')}"` : w);
  const reihen = [FALL_SPALTEN, ...faelle.map((f) => zeile(f).map((w, c) => (
    FALL_SPALTEN[c] === 'geburtsdatum' || FALL_SPALTEN[c] === 'unfalldatum' ? formatCh(w) : String(w))))];
  return `﻿${reihen.map((r) => r.map(zelle).join(';')).join('\r\n')}\r\n`;
}

const json = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

/** Erzeugt alle Mockdaten in `zielordner` (Standard: src/data). Gibt die geschriebenen Pfade zurück. */
export async function generate(zielordner) {
  const demo = erzeugeDemo();
  const volumen = erzeugeVolumen();
  const demoFaelle = demo.faelle.slice().sort((a, b) => a.schaden_nr.localeCompare(b.schaden_nr));

  const dateien = {
    'faelle.xlsx': excel(demoFaelle, 'CaseConnect Lite – Demo-Fälle (fiktiv)'),
    'faelle.csv': csv(demoFaelle),
    'eingang/index.json': json(demo.index),
    ...Object.fromEntries(Object.entries(demo.dateien).map(([name, text]) => [`eingang/${name}`, text])),
    'volumen/faelle.xlsx': excel(volumen.faelle, 'CaseConnect Lite – Volumen-Fälle (fiktiv)'),
    'volumen/faelle.csv': csv(volumen.faelle),
    'volumen/berichte.json': json(volumen.berichte),
  };

  await rm(join(zielordner, 'eingang'), { recursive: true, force: true });
  await rm(join(zielordner, 'volumen'), { recursive: true, force: true });
  await mkdir(join(zielordner, 'eingang'), { recursive: true });
  await mkdir(join(zielordner, 'volumen'), { recursive: true });
  for (const [pfad, inhalt] of Object.entries(dateien)) await writeFile(join(zielordner, pfad), inhalt);
  return Object.keys(dateien);
}

// Direkt aufgerufen (npm run generate-data)?
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ziel = fileURLToPath(new URL('../src/data/', import.meta.url));
  const pfade = await generate(ziel);
  console.log(`Mockdaten erzeugt (Seed ${SEED}): ${pfade.length} Dateien in src/data/`);
}
