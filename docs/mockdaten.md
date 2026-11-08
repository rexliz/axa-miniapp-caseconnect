# Mockdaten

Die App ist öffentlich erreichbar. Deshalb arbeitet sie **ausschliesslich mit Mockdaten, die wir selbst generieren**. Nichts stammt aus dem Internet, aus echten Registern oder aus Dokumenten echter Spitäler.

## So entstehen die Daten

- **Generator:** [`scripts/generate-mockdata.mjs`](../scripts/generate-mockdata.mjs), Aufruf mit `npm run generate-data`
- **Deterministisch:** fester Seed `20261110` und ein eigener kleiner Zufallsgenerator (mulberry32, 10 Zeilen Code). Jeder Lauf erzeugt **byte-identische** Dateien. Auch die Excel-Metadaten haben ein festes Datum.
- **Committet:** Die erzeugten Dateien liegen im Repo, damit die App ohne Generator-Lauf funktioniert.
- **Getestet:** [`tests/mockdaten.test.js`](../tests/mockdaten.test.js) erzeugt die Daten in einen Temp-Ordner und vergleicht sie Byte für Byte mit den committeten Dateien. Hat jemand den Generator geändert, ohne neu zu generieren, wird der Test rot.
- **Gleiche Regeln wie die App:** Der Generator nutzt die App-Module für die GLN-Prüfziffer, die Datumslogik und die Namensähnlichkeit.

| Datei | Inhalt |
|---|---|
| `src/data/faelle.xlsx` | 12 Demo-Fälle. Datumswerte sind echte Excel-Daten (Seriennummern). |
| `src/data/faelle.csv` | dieselben 12 Fälle als CSV (Semikolon, UTF-8 mit BOM, Datum als Text `TT.MM.JJJJ`) |
| `src/data/eingang/*.txt` | 10 Demo-Berichte, je ein Szenario |
| `src/data/eingang/index.json` | Liste der Demo-Berichte mit erwartetem Ergebnis. Nötig, weil eine statische Seite keine Ordner auflisten kann. |
| `src/data/volumen/faelle.xlsx`, `.csv` | 150 Fälle für den Volumen-Datensatz |
| `src/data/volumen/berichte.json` | 300 Berichte in einer Datei (statt 300 einzelner Requests), sortiert nach Eingang |

## Fiktivitäts-Regeln

| Regel | Umsetzung | Geprüft durch Test |
|---|---|---|
| Erfundene Spitäler, Praxen, Firmen | «Spital Seewald», «Praxis am Lindenplatz», «Muster Logistik AG», «Fiktiva Gastro AG» … | – (Liste im Generator) |
| Erfundene Orte und Strassen | Orte «Musterhausen», «Seewald», «Fiktivikon» … mit Postleitzahlen 9991–9996. Strassen wie «Musterstrasse 12», «Beispielweg 20». E-Mail-Domains nur mit `.example`. | – |
| Personen | gängige Schweizer Vor- und Nachnamen, frei kombiniert, keine Prominenten | – |
| Schaden-Nr. | Format `UV-2026-#####` | ✓ |
| GLN | Präfix `7609999` mit gültiger GS1-Prüfziffer | ✓ |
| ZSR | ein Buchstabe und 6 Ziffern, immer `Z99…` | ✓ |
| Hinweiszeile | Jeder Bericht endet mit «FIKTIVES TESTDOKUMENT – Hackathon-Prototyp». | ✓ |
| Datumslogik | Unfall vor Bericht und Eingang. Alle Personen sind beim Unfall zwischen 18 und 65 Jahre alt. Die Arbeitsunfähigkeit passt zum Falltyp. | ✓ |
| Keine Platzhalterfehler | Kein `undefined`, `NaN` oder `null` im Text | ✓ |
| Eingangs-IDs | vergibt die App selbst (`EB-JJJJMMTT-0001`) | – |

## Absender und Layouts

Jeder Leistungserbringer hat einen eigenen Briefkopf und Aufbau. Die Extraktion muss mit unterschiedlichen Formaten zurechtkommen, genau wie im echten Posteingang.

| Absender | Art | Layout-Merkmale |
|---|---|---|
| Spital Seewald | Spital | Briefkopf in Grossbuchstaben, Adressfeld, «Patient: Herr …, geb. …», Fliesstext mit Abschnitten, zwei Unterschriften |
| Spital Lindenbach | Spital | Kopfzeile mit senkrechten Trennstrichen, «Betrifft: Nachname Vorname», «Ereignis am:», Abschnitte als «-- Titel --» |
| Praxis am Lindenplatz | Hausarztpraxis | kompakter Feldblock «Name: / Geburtsdatum: / Unfalldatum:», Abschnitte in Grossbuchstaben |
| Hausarztpraxis Sonnenrain | Hausarztpraxis | klassischer Brief, alles in einer «Betrifft:»-Zeile, Abschnitte als «Titel: Text» |
| Radiologie Musterpark | Radiologie | «Patient(in):» mit Geburtsdatum in derselben Zeile, Untersuchung, Klinische Angaben, Befund, Beurteilung |
| Permanence Musterhausen Bahnhof | Notfallpraxis | Formular mit Trennlinien, Feldnamen in Grossbuchstaben |
| Arbeitgeber (8 Firmen) | Unfallmeldung | einheitliches Formular (wie in der Praxis), ohne GLN |

Inhaltlich lesen sich die Berichte wie echte Schweizer Arztberichte (Anamnese, Befund, Diagnose, Procedere, Arbeitsunfähigkeit in Prozent). Medizinisch bleiben sie einfach und plausibel: Distorsion OSG, Radiusfraktur, Kniekontusion, Schnittverletzung, Claviculafraktur, Patellafraktur …

## Datensatz 1: Demo

12 Fälle. Daniel Meier kommt zweimal vor, mit unterschiedlichen Geburtsdaten (UV-2026-12093 und UV-2026-12650).

| Schaden-Nr. | Name | Falltyp | Leistungserbringer |
|---|---|---|---|
| UV-2026-10417 | Sarah Keller | Bagatellunfall | Praxis am Lindenplatz |
| UV-2026-11872 | Reto Bühler | Unfall mit Hospitalisation | Spital Seewald |
| UV-2026-12093 | Daniel Meier (14.11.1979) | Unfall mit Arbeitsunfähigkeit | Hausarztpraxis Sonnenrain |
| UV-2026-12304 | Lukas Brunner | Unfall mit Hospitalisation | Spital Lindenbach |
| UV-2026-12650 | Daniel Meier (03.09.1992) | Bagatellunfall | Permanence Musterhausen Bahnhof |
| UV-2026-13018 | Anna Schmid | Unfall mit Arbeitsunfähigkeit | Praxis am Lindenplatz |
| UV-2026-13181 | Laura Widmer | Unfall mit Arbeitsunfähigkeit | Hausarztpraxis Sonnenrain |
| UV-2026-13455 | Simon Kälin | Unfall mit Arbeitsunfähigkeit | Hausarztpraxis Sonnenrain |
| UV-2026-13702 | Monika Zürcher | Unfall mit Hospitalisation | Spital Seewald |
| UV-2026-14026 | Marco Huber | Bagatellunfall | Permanence Musterhausen Bahnhof |
| UV-2026-14239 | Fabienne Lüthi | Unfall mit Arbeitsunfähigkeit | Praxis am Lindenplatz |
| UV-2026-14517 | Stefan Graf | Unfall mit Hospitalisation | Spital Lindenbach |

### Die 10 Szenarien

Punkte nach den Regeln in `src/js/config.js`: Name bis 35, Geburtsdatum 35, Unfalldatum 20 (±3 Tage: 10), GLN/ZSR des Absenders beim Fall 10. «Automatisch» ab 85 Punkten mit mindestens 15 Punkten Abstand zum Zweitbesten, «Vorschlag prüfen» bei 50–84, «manuelle Triage» darunter oder bei mehrdeutigem Ergebnis.

| # | Bericht | Erwartet | Warum |
|---|---|---|---|
| 1 | Arztzeugnis, Praxis am Lindenplatz, **mit Schaden-Nr.** | automatisch → UV-2026-10417 | Die Schaden-Nr. existiert, Name und Geburtsdatum passen: Score 100. |
| 2 | Austrittsbericht, Spital Seewald, **ohne Schaden-Nr.**, Name als «Buehler» geschrieben | automatisch → UV-2026-11872 | Name 35 (Umlaut-Normalisierung ü = ue) + Geb. 35 + Unfall 20 + GLN 10 = 100 |
| 3 | Operationsbericht, Spital Lindenbach, **«Bruner» statt «Brunner»** | automatisch → UV-2026-12304 | Name ≈ 0,92 × 35 = 32 + Geb. 35 + Unfall 20 + GLN 10 = 97 |
| 4 | Arztzeugnis zu **Daniel Meier** mit Geburtsdatum und Unfalldatum | automatisch → UV-2026-12093 | richtiger Daniel Meier 100 Punkte, der andere nur 35 (Abstand 65) |
| 5 | Radiologiebefund zu **Daniel Meier**, ohne Geburtsdatum und Unfalldatum | manuelle Triage | Beide Daniel Meier erhalten je 35 Punkte: unter 50 und mehrdeutig. |
| 6 | Arztzeugnis zu **Chiara Bieri** (gibt es nicht) | manuelle Triage | Höchstens GLN 10 + Unfalldatum ±3 Tage 10 = 20 Punkte |
| 7 | Verlaufsbericht zu **Laura Widmer** mit der Schaden-Nr. von **Anna Schmid** | Widerspruch – prüfen | Die Nummer existiert, aber Name und Geburtsdatum widersprechen. Eine Falschzuordnung wäre ein Datenschutzvorfall. Richtig wäre UV-2026-13181. |
| 8 | Verlaufsbericht, **nur Name («Kaelin Simon») und Unfalldatum** | Vorschlag prüfen → UV-2026-13455 | Name 35 + Unfall 20 + GLN 10 = 65 |
| 9 | Austrittsbericht von Szenario 2 **erneut gesendet** (Windows-Zeilenenden, Leerzeichen am Zeilenende) | Duplikat | Der Hash über den normalisierten Text ist identisch mit Bericht 2. |
| 10 | **Unfallmeldung** vom Arbeitgeber Muster Logistik AG | automatisch → UV-2026-10417 | Name 35 + Geb. 35 + Unfall 20 = 90. Der Arbeitgeber hat keine GLN. |

Nach dem Laden des Demo-Posteingangs ist **Sarah Keller (UV-2026-10417) vollständig**: Unfallmeldung und Arztzeugnis sind da. Alle anderen Fälle bleiben unvollständig, zum Beispiel Reto Bühler mit 1 von 5 Unterlagen.

## Datensatz 2: Volumen

150 Fälle (40 % Bagatell, 40 % Arbeitsunfähigkeit, 20 % Hospitalisation) und 300 Berichte aus demselben Generator, eingegangen zwischen August und November 2026.

| Kategorie | Anzahl | Anteil | Aufbau |
|---|---:|---:|---|
| mit Schaden-Nr. | 180 | 60 % | Schaden-Nr. + Name, meist mit Geburtsdatum und Unfalldatum |
| ohne Schaden-Nr., eindeutig | 75 | 25 % | Name + Geburtsdatum + Unfalldatum (≥ 90 Punkte) |
| unklar / mehrdeutig | 30 | 10 % | 8 × nur Name + Unfalldatum (Vorschlag), 8 × nur Name (Triage), 10 × unbekannte Person (Triage), 4 × Widerspruch |
| Duplikate | 15 | 5 % | exakte Kopien früherer Berichte, 1–10 Tage später erneut eingegangen |

Namen werden im Volumen-Datensatz frei kombiniert. Dadurch gibt es auch dort zufällig gleichnamige Personen, wie im echten Leben.
