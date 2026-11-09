# Bedienungsanleitung CaseConnect Lite

> Hackathon-Prototyp mit fiktiven Daten – keine offizielle AXA-Anwendung.

CaseConnect Lite hilft der UVG-Sachbearbeitung, eingehende Arztberichte dem richtigen Schadenfall zuzuordnen. Die App liest jeden Bericht, schlägt den passenden Fall mit einer Punktzahl vor und erstellt eine Empfangsbestätigung. Pro Fall zeigt sie, welche Unterlagen noch fehlen, und schreibt auf Wunsch die Nachforderung.

**Öffnen:** https://rexliz.github.io/axa-miniapp-caseconnect/

Es braucht keine Installation und kein Login. Die App läuft in jedem aktuellen Browser (Chrome, Edge, Firefox, Safari). Alle Personen, Fälle, Spitäler und Firmen sind frei erfunden.

---

## Inhalt

1. [In 2 Minuten ausprobieren](#in-2-minuten-ausprobieren)
2. [Der Bildschirm im Überblick](#der-bildschirm-im-überblick)
3. [Fälle](#fälle)
4. [Posteingang](#posteingang)
5. [Dokument prüfen und zuordnen](#dokument-prüfen-und-zuordnen)
6. [Empfangsbestätigung](#empfangsbestätigung)
7. [Falldetail und Nachforderung](#falldetail-und-nachforderung)
8. [Demo-Daten und Volumen-Daten](#demo-daten-und-volumen-daten)
9. [Speichern und Zurücksetzen](#speichern-und-zurücksetzen)
10. [Eigene Excel-Liste verwenden](#eigene-excel-liste-verwenden)
11. [Eigenen Bericht testen](#eigenen-bericht-testen)
12. [Häufige Fragen](#häufige-fragen)

---

## In 2 Minuten ausprobieren

1. **App öffnen.** Es erscheint die Fallliste mit 12 fiktiven Fällen. Alle Ampeln sind rot, weil noch keine Unterlagen da sind.
2. **Posteingang → «Demo-Posteingang laden».** 10 Berichte gehen ein und werden sofort verarbeitet. Die Kennzahlen oben zeigen das Ergebnis.
3. **Zeile «Operationsbericht» anklicken.** Links steht der Originaltext mit farbig markierten Fundstellen, rechts der erkannte Fall mit 97 von 100 Punkten und der Begründung.
4. **«← Zum Posteingang»**, dann die Zeile mit dem Status **«Vorschlag prüfen»** öffnen und oben im gelben Kasten **«Vorschlag bestätigen»** klicken. An derselben Stelle erscheint die Empfangsbestätigung mit Eingangs-ID.
5. **Fälle → «Bühler Reto» → «Nachforderung erstellen».** Die App schreibt die Anfragetexte ans Spital und an den Arbeitgeber.
6. Zum Schluss oben rechts **«Demo zurücksetzen»**. Dann ist alles wieder im Ausgangszustand.

---

## Der Bildschirm im Überblick

| Bereich | Was er zeigt |
|---|---|
| **Gelbes Banner** | Hinweis, dass es ein Prototyp mit fiktiven Daten ist |
| **Kopfzeile, links** | Logo (führt zur Fallliste), **Fälle** (Zahl = Anzahl Fälle), **Posteingang** (Zahl = Dokumente, die noch auf einen Entscheid warten) |
| **Kopfzeile, rechts** | Umschalter **Demo-Daten / Volumen-Daten** und **Demo zurücksetzen** |
| **Kennzahlen-Leiste** | Fünf Zahlen zum aktuellen Stand (siehe unten), auf jeder Seite sichtbar |
| **Inhalt** | Die gewählte Ansicht: Fälle, Posteingang, Dokument, Falldetail oder Quittung |

**Die fünf Kennzahlen:**

| Kennzahl | Bedeutung |
|---|---|
| **Dokumente total** | Alle eingegangenen Berichte, darunter in Klein: wie viele ohne Duplikate |
| **Automatisch zugeordnet** | Anteil der Berichte (ohne Duplikate), die die App ohne Menschen zugeordnet hat. Manuelle Bestätigungen zählen bewusst nicht dazu. |
| **Offen in Triage** | Berichte ohne Zuordnung, also Vorschläge, Widersprüche und Triage. Sie warten auf einen Entscheid. |
| **Abgefangene Duplikate** | Berichte, die mit gleichem Inhalt schon einmal eingegangen sind |
| **Unvollständige Fälle** | Fälle, bei denen laut Checkliste noch Unterlagen fehlen |

---

## Fälle

Die Startseite zeigt die Fälle aus der Excel-Liste `faelle.xlsx`.

**Spalte «Unterlagen» (Ampel):** Die Zahl bedeutet *erhalten / nötig*.

| Ampel | Bedeutung |
|---|---|
| 🔴 rot, z. B. `0/2` | Noch keine der nötigen Unterlagen erhalten |
| 🟡 gelb, z. B. `1/5` | Ein Teil ist da, es fehlt noch etwas |
| 🟢 grün, z. B. `3/3` | Alle nötigen Unterlagen sind eingegangen |
| ⚪ grau, `–` | Der Falltyp ist unbekannt, deshalb gibt es keine Checkliste |

**Bedienen:**
- **Suchen:** Name, Schaden-Nr., Arbeitgeber, Leistungserbringer, Sachbearbeitung oder Falltyp eintippen. Gross-/Kleinschreibung und Umlaute spielen keine Rolle. Bei mehreren Wörtern müssen alle passen, z. B. `keller lindenplatz` (Name und Praxis).
- **Zeile anklicken** öffnet das [Falldetail](#falldetail-und-nachforderung).
- **«Eigene Excel/CSV laden»:** siehe [Eigene Excel-Liste verwenden](#eigene-excel-liste-verwenden).
- Auf schmalen Bildschirmen sind die Spalten «Arbeitgeber» und «Sachbearbeitung» ausgeblendet. Im Falldetail stehen sie immer.

---

## Posteingang

Hier landen alle eingehenden Berichte mit dem Ergebnis der automatischen Zuordnung.

**Berichte hereinholen, auf drei Wegen:**

| Weg | So geht's |
|---|---|
| **Mitgelieferte Berichte** | «Demo-Posteingang laden» (10 Berichte) bzw. bei Volumen-Daten «Volumen-Posteingang laden» (300 Berichte). Ein zweites Laden fragt nach, weil dann alle Berichte als Duplikate erkannt werden. |
| **Text einfügen** | Unten im Bereich «Bericht hinzufügen» den Text eines Berichts einfügen (z. B. aus einer E-Mail) und «Text verarbeiten» klicken. Das Dokument öffnet sich direkt. |
| **Datei ablegen** | Eine oder mehrere `.txt`-Dateien auf das Feld «Datei ablegen» ziehen oder das Feld anklicken. Bis 1 MB pro Datei. PDF und Word gehen (noch) nicht. |

**Die Tabelle:**

| Spalte | Inhalt |
|---|---|
| **Eingang** | Eingangs-ID (`EB-…`) und Zeitpunkt. Duplikate bekommen keine neue ID. |
| **Absender / Datei** | Erkannter Absender und Dateiname. Bei einem langen Namen zeigt das Darüberfahren mit der Maus den ganzen Namen. |
| **Dokumenttyp** | Arztzeugnis UVG, Austrittsbericht, Operationsbericht, Radiologiebefund, Verlaufsbericht oder Unfallmeldung |
| **Ergebnis** | Status, siehe [Status-Übersicht](#status-übersicht) |
| **Fall** | Schaden-Nr. und Name, wenn zugeordnet. Bei offenen Berichten: bester Kandidat mit Punktzahl in Klammern. Bei Duplikaten: die Eingangs-ID des Originals. |

- **Filter** über der Tabelle: Alle, Offen, Zugeordnet, Duplikate (die Zahl zeigt jeweils die Anzahl)
- **Zeile anklicken** öffnet das Dokument
- **«Export CSV»** lädt alle Dokumente mit Zuordnung als CSV-Datei herunter (eine Zeile pro Dokument, öffnet sich in Excel). Enthalten sind Eingangs-ID, Eingangszeit, Datei, Absender, Dokumenttyp, Ergebnis der Maschine, Punktzahl, Schaden-Nr., Art der Zuordnung, Zeitpunkt, manuelle Triage und gegebenenfalls «Duplikat von».

---

## Dokument prüfen und zuordnen

### Aufbau der Seite

- **Ganz oben:** «← Zum Posteingang» und **«Nächstes offenes Dokument (N offen) →»**. Damit lassen sich alle offenen Berichte der Reihe nach abarbeiten, ohne zurück in den Posteingang zu gehen.
- **Titel:** der erkannte Dokumenttyp mit Status. Darunter stehen Absender, Datei, Eingangszeit und Eingangs-ID.
- **Farbiger Kasten:** sagt, was passiert ist und was zu tun ist (grün = zugeordnet, gelb = bitte prüfen, rot = Widerspruch, blau = Duplikat).
- **Links «Originaltext»:** der Bericht, wie er eingegangen ist. Farbig markiert ist, was die App erkannt hat. Die Legende darüber nennt die Farben: Name, Geburtsdatum, Unfalldatum, Schaden-Nr., GLN, ZSR, Dokumenttyp, Absender.
- **Rechts «Kandidaten»:** bis zu drei passende Fälle mit Balken und Punktzahl (0–100). Darunter steht jeder Grund einzeln: `+35 Geburtsdatum stimmt überein` oder `✗ Name passt nicht` (rot = Widerspruch).
- **Rechts «Empfangsbestätigung»:** erscheint, sobald das Dokument einem Fall zugeordnet ist.
- **Rechts «Erkannte Merkmale»:** alle ausgelesenen Felder als Liste. «nicht gefunden» heisst, der Bericht enthielt diese Angabe nicht in erkennbarer Form.
- **Rechts unten «Anderer Fall oder Triage» bzw. «Zuordnung ändern»:** für Korrekturen.

### Status-Übersicht

| Status | Was das heisst | Was zu tun ist |
|---|---|---|
| **Automatisch zugeordnet** | Die App ist sicher: 85 Punkte oder mehr und klarer Abstand zum Zweitbesten, oder eine passende Schaden-Nr. | Nichts. Bei Bedarf kontrollieren. |
| **Vorschlag prüfen** | Wahrscheinlich, aber nicht sicher genug (50–84 Punkte) | Gründe ansehen, dann **«Vorschlag bestätigen»** im gelben Kasten oder einen anderen Fall wählen |
| **Widerspruch – prüfen** | Die Schaden-Nr. im Bericht gehört zu einer anderen Person als Name oder Geburtsdatum | Den richtigen Kandidaten mit **«Diesem Fall zuordnen»** wählen. «Trotzdem zuordnen» (mit Rückfrage) nur, wenn die Nummer sicher stimmt. |
| **Manuelle Triage** | Kein eindeutiger Fall: zu wenig Angaben oder zwei Fälle fast gleich gut | Fall aus der Liste wählen und «Zuordnen», sonst liegen lassen |
| **Bestätigt** | Ein Mensch hat den Vorschlag bestätigt | – |
| **Manuell zugeordnet** | Ein Mensch hat einen Fall gewählt | – |
| **Duplikat** | Derselbe Inhalt ist schon eingegangen (Leerzeichen und Zeilenumbrüche spielen keine Rolle) | Nichts. Der blaue Kasten nennt Datum und Eingangs-ID des Originals. |

### Aktionen

| Knopf | Wirkung |
|---|---|
| **Vorschlag bestätigen** (gelber Kasten) | Ordnet dem vorgeschlagenen Fall zu, Status «Bestätigt» |
| **Diesem Fall zuordnen** (bei einem Kandidaten) | Ordnet genau diesem Fall zu |
| **Trotzdem zuordnen** (bei Widerspruch) | Ordnet trotz Widerspruch zu, nach einer Sicherheitsfrage |
| **Anderen Fall wählen → Zuordnen** | Für den Fall, dass keiner der Kandidaten stimmt. Die Liste ist nach Nachnamen sortiert und zeigt Geburtsdatum und Schaden-Nr. |
| **An manuelle Triage geben** | Markiert das Dokument für eine spätere Bearbeitung und hebt eine bestehende Zuordnung auf |
| **Zuordnung aufheben** | Macht eine Zuordnung rückgängig, das Dokument ist wieder offen |

### So entstehen die Punkte

| Merkmal im Bericht | Punkte |
|---|---|
| Name stimmt mit dem Fall überein (auch mit Tippfehler, z. B. «Bruner» statt «Brunner»; Vor- und Nachname dürfen vertauscht sein) | bis 35, je nach Ähnlichkeit |
| Geburtsdatum stimmt exakt | 35 |
| Unfalldatum stimmt exakt | 20 |
| Unfalldatum weicht höchstens 3 Tage ab | 10 |
| GLN oder ZSR des Absenders ist beim Fall als Leistungserbringer hinterlegt | 10 |

- **85 Punkte oder mehr** und mindestens 15 Punkte Abstand zum Zweitbesten: automatisch zugeordnet
- **50 bis 84 Punkte** mit diesem Abstand: Vorschlag
- **Weniger** oder zu knapper Abstand: Triage
- **Schaden-Nr. im Bericht:** Passt sie zu einem Fall und widerspricht nichts, wird direkt zugeordnet (100 Punkte). Passen Name oder Geburtsdatum nicht dazu, meldet die App einen Widerspruch und ordnet bewusst nicht zu: Ein Arztbericht im falschen Dossier wäre ein Datenschutzvorfall.

---

## Empfangsbestätigung

Jeder neue Bericht (kein Duplikat) bekommt beim Eingang eine **Eingangs-ID** im Format `EB-JJJJMMTT-0001`, z. B. `EB-20261110-0003`. Die Nummer zählt pro Tag hoch.

Sobald der Bericht einem Fall zugeordnet ist, gibt es die **Empfangsbestätigung**:
- Im grünen Kasten des Dokuments **«Quittung öffnen»** klicken, oder in der Karte «Empfangsbestätigung» auf **«Quittung öffnen und drucken»**.
- **«Drucken»** druckt die Quittung oder speichert sie als PDF (im Druckdialog «Als PDF speichern» wählen). Gedruckt werden nur die Quittung und der Prototyp-Hinweis.
- **«Als Text kopieren»** legt den Text in die Zwischenablage, z. B. für eine Antwort-Mail ans Spital.

Die Quittung nennt Eingangs-ID, Zeitpunkt, Dokumenttyp, Absender, Schaden-Nr. und Datei sowie den Satz «Bitte senden Sie es nicht erneut».

---

## Falldetail und Nachforderung

Ein Klick auf einen Fall (in der Fallliste, bei einem Kandidaten oder in der Spalte «Fall») öffnet das Falldetail.

- **Oben rechts:** Ampel mit Text (z. B. «1/5 teilweise») und der Knopf **«Nachforderung erstellen»**, wenn etwas fehlt
- **Falldaten:** alle Angaben aus der Excel-Liste, auch Arbeitgeber, GLN, ZSR und Sachbearbeitung
- **Nötige Unterlagen:** die Checkliste für den Falltyp. ✓ heisst erhalten, mit Datum und Link zum Dokument. ○ heisst «fehlt».
- **Zugeordnete Dokumente:** alle Berichte zu diesem Fall, je mit Link zum Dokument und zur Quittung

**Welche Unterlagen ein Falltyp braucht:**

| Falltyp | Nötige Unterlagen |
|---|---|
| Bagatellunfall | Unfallmeldung, Arztzeugnis UVG |
| Unfall mit Arbeitsunfähigkeit | Unfallmeldung, Arztzeugnis UVG, Verlaufsbericht |
| Unfall mit Hospitalisation | Unfallmeldung, Arztzeugnis UVG, Austrittsbericht, Operationsbericht, Radiologiebefund |

**Nachforderung:** Nach einem Klick auf «Nachforderung erstellen» erscheinen direkt darunter die Anfragetexte:
- **An den Leistungserbringer** (Spital oder Praxis): die fehlenden medizinischen Berichte
- **An den Arbeitgeber:** eine fehlende Unfallmeldung
- Die Texte nennen nur, was wirklich fehlt, und zählen auf, was schon da ist und nicht erneut geschickt werden muss.
- **«Text kopieren»** unter jedem Text legt ihn in die Zwischenablage. Verschickt wird nichts automatisch.
- Ist ein Fall vollständig, zeigt die Checkliste «Keine Nachforderung nötig».

---

## Demo-Daten und Volumen-Daten

Oben rechts lässt sich zwischen zwei Datensätzen wechseln:

| Datensatz | Inhalt | Wofür |
|---|---|---|
| **Demo-Daten** | 12 Fälle, 10 Berichte mit je einem typischen Szenario (Tippfehler, Duplikat, Widerspruch, gleichnamige Personen …) | Zeigen und Verstehen |
| **Volumen-Daten** | 150 Fälle, 300 Berichte | Zeigen, dass es auch in der Menge funktioniert (rund 89 % automatisch) |

Die beiden Datensätze sind getrennt: Was im einen zugeordnet wird, ändert den anderen nicht. Wer beim Wechsel gerade ein Dokument oder einen Fall offen hat, landet in der passenden Liste.

---

## Speichern und Zurücksetzen

- **Automatisch gespeichert:** Zuordnungen, geladene Berichte und eine eigene Fallliste bleiben auch nach dem Neuladen der Seite erhalten.
- **Nur auf diesem Gerät:** Gespeichert wird im Browser (localStorage). Nichts wird an einen Server geschickt. Andere sehen deine Änderungen nicht, und in einem anderen Browser beginnt alles von vorne.
- **«Demo zurücksetzen»** (oben rechts, mit Rückfrage) löscht den Stand beider Datensätze und lädt die mitgelieferten Falllisten neu.
- **Privater Modus:** Ein gelber Hinweis meldet, dass nichts gespeichert wird. Die App funktioniert trotzdem, vergisst aber alles beim Neuladen.

---

## Eigene Excel-Liste verwenden

Die App ist nicht an die mitgelieferten Fälle gebunden. Jede Liste mit passenden Spalten funktioniert, ohne Änderung am Code.

1. **Vorlage holen:** https://rexliz.github.io/axa-miniapp-caseconnect/data/faelle.xlsx herunterladen und in Excel bearbeiten (Zeilen ändern, löschen oder ergänzen)
2. In der Fallliste **«Eigene Excel/CSV laden»** klicken und die Datei wählen (`.xlsx`, `.xls` oder `.csv`)
3. Die App zeigt die neuen Fälle. Hinweise zu einzelnen Zeilen erscheinen in einem gelben Kasten, z. B. «Zeile 5: Geburtsdatum ist kein gültiges Datum».

**Spalten** (die Reihenfolge ist egal; Schreibweisen wie «Schaden-Nr.» oder «Leistungserbringer GLN» werden erkannt):

| Spalte | Pflicht | Hinweis |
|---|---|---|
| `schaden_nr` | ja | Zeilen ohne Schaden-Nr. oder mit doppelter Schaden-Nr. werden übersprungen |
| `vorname`, `nachname` | ja | |
| `geburtsdatum`, `unfalldatum` | nein | Excel-Datum oder Text im Format `TT.MM.JJJJ` |
| `falltyp` | nein | Für die Checkliste genau einer der drei Falltypen oben, sonst graue Ampel |
| `arbeitgeber` | nein | Empfänger der Nachforderung für die Unfallmeldung |
| `leistungserbringer` | nein | Empfänger der Nachforderung für medizinische Berichte |
| `leistungserbringer_gln`, `leistungserbringer_zsr` | nein | Bringen 10 Punkte, wenn der Bericht vom hinterlegten Absender kommt. Die GLN-Prüfziffer wird kontrolliert. |
| `sachbearbeitung` | nein | Nur zur Anzeige |

**Gut zu wissen:**
- Fehlen Pflichtspalten, wird die Datei nicht übernommen, und die App sagt, welche Spalten fehlen.
- Eine neue Liste setzt den Posteingang dieses Datensatzes zurück (mit Rückfrage), weil die alten Zuordnungen nicht mehr passen.
- **«Standardliste wiederherstellen»** holt die mitgelieferte Liste zurück.
- Die Datei bleibt im Browser und wird nirgends hochgeladen. Trotzdem gilt: **nur fiktive Daten verwenden.** Der Prototyp ist nicht für echte Personen- oder Gesundheitsdaten gedacht.

---

## Eigenen Bericht testen

Unter Posteingang → «Bericht hinzufügen» lässt sich jeder Text testen. Die App erkennt:

| Merkmal | Woran sie es erkennt |
|---|---|
| **Schaden-Nr.** | Format `UV-JJJJ-NNNNN`, z. B. `UV-2026-13018`, irgendwo im Text |
| **Name** | Nach `Patient:`, `Patientin:`, `Name:`, `Betrifft:`, `Versicherte Person:` oder `Verunfallte Person:`; «Herr» und «Frau» werden ignoriert, auch «Nachname, Vorname» geht |
| **Geburtsdatum** | Nach `geb.`, `geboren am` oder `Geburtsdatum`, gefolgt von `TT.MM.JJJJ` |
| **Unfalldatum** | Nach `Unfall vom`, `Unfalldatum`, `Ereignis am` oder `Ereignis vom`, gefolgt von `TT.MM.JJJJ` |
| **GLN** | 13-stellige Nummer, die mit `760` beginnt |
| **ZSR** | Ein Grossbuchstabe und 6 Ziffern, z. B. `Z990331` |
| **Dokumenttyp** | Schlüsselwörter, vor allem im Titel: «Arztzeugnis», «Austrittsbericht», «Operationsbericht», «Radiologiebefund», «Verlaufsbericht», «Unfallmeldung» |
| **Absender** | Ein bekannter Leistungserbringer über GLN oder ZSR, sonst die erste Zeile des Briefkopfs |

**Beispiel zum Kopieren** (nach «Demo-Posteingang laden»):

```text
Hausarztpraxis Beispielweg · Dr. med. Test
Beispielweg 1 · 9995 Musterlingen

VERLAUFSBERICHT

Patientin: Anna Schmid
Geburtsdatum: 28.03.1985
Unfalldatum: 08.10.2026

Bisheriger Verlauf: Kontrolle vom 05.11.2026, Beschwerden rückläufig.
Arbeitsunfähigkeit 50 % bis 20.11.2026.

FIKTIVES TESTDOKUMENT – Hackathon-Prototyp
```

Ergebnis: **automatisch zugeordnet** zu Anna Schmid (UV-2026-13018) mit 90 Punkten. Ihre Ampel in der Fallliste wechselt von `0/3` auf `1/3`.

Zum Ausprobieren:
- Die Zeile mit dem Geburtsdatum löschen: Es gibt nur noch 55 Punkte, also einen **Vorschlag**.
- Denselben Text ein zweites Mal einfügen: Die App meldet ein **Duplikat**.

---

## Häufige Fragen

**Alle Berichte erscheinen als Duplikat.**
Der Posteingang wurde schon einmal geladen. «Demo zurücksetzen» klicken und neu laden.

**Meine Zuordnungen sind weg.**
Wahrscheinlich ein anderer Browser, der private Modus oder «Demo zurücksetzen». Der Stand liegt nur im Browser, in dem gearbeitet wurde.

**Ein Bericht ist falsch zugeordnet.**
Dokument öffnen, unten «Anderen Fall wählen» und «Zuordnen» klicken, oder «Zuordnung aufheben».

**Warum steigt «Automatisch zugeordnet» nicht, wenn ich einen Vorschlag bestätige?**
Die Kennzahl zählt nur, was die Maschine allein geschafft hat. So bleibt sie ehrlich.

**Kann ich ein PDF hochladen?**
Noch nicht. Text aus dem PDF kopieren und unter «Text einfügen» einfügen.

**Ist das künstliche Intelligenz?**
Nein. Die App arbeitet mit festen Regeln (Muster und Schlüsselwörter) und ist deshalb nachvollziehbar: Jeder Punkt ist begründet.

**Sieht jemand anderes, was ich mache?**
Nein. Alles bleibt im eigenen Browser, es gibt keinen Server und kein Konto.

**Die Seite lädt nicht (kein Internet).**
Mit dem Code-Repository und Node.js lässt sich die App lokal starten: `npm start`, dann http://localhost:8080/ öffnen. Siehe README.

---

Weitere Informationen: [README](../README.md) (Technik, Grenzen des Prototyps) · [Demo-Skript](demo-skript.md) (3-Minuten-Präsentation) · [Mockdaten](mockdaten.md) (wie die fiktiven Daten entstehen)
