# Demo-Skript: CaseConnect Lite in 3 Minuten

**Live:** https://rexliz.github.io/axa-miniapp-caseconnect/

Fünf Stationen, dazwischen nur kurze Wege. Alles Wichtige ist auf einem Beamer mit 1280×720 bei 125 % Zoom ohne oder mit einem kurzen Scrollen sichtbar.

## Vorbereitung (vor dem Pitch)

- [ ] Live-URL im Browser öffnen, Zoom 125 % (bei grossem Beamer reichen 110 %)
- [ ] Oben rechts **«Demo zurücksetzen»** klicken: Demo-Daten aktiv, Posteingang leer, Fallliste offen
- [ ] Optional zweiter Tab: `src/data/faelle.xlsx` in Excel (nur wenn Excel auf dem Präsentations-Laptop läuft)
- [ ] **Backup-Video** des ganzen Ablaufs aufnehmen (macOS: ⇧⌘5 → «Gesamten Bildschirm aufnehmen»), auf dem Laptop und auf einem USB-Stick
- [ ] Zwei- bis dreimal mit Stoppuhr proben, danach jeweils «Demo zurücksetzen»
- [ ] Kein WLAN? Handy-Hotspot. Oder auf einem Laptop mit Node: `npm start` und http://localhost:8080/ (läuft offline)

Kurz-Links für den Notfall: `#/eingang`, `#/dokument/D0003` (Bruner), `#/dokument/D0007` (Widerspruch), `#/fall/UV-2026-11872` (Reto Bühler)

---

## Ablauf

| Zeit | Klicken | Sagen |
|---|---|---|
| **0:00–0:20** | Startseite (Fallliste) zeigen | «Bei einem UVG-Unfall schicken Spitäler und Ärzte Berichte per Mail, oft ohne Schaden-Nr. Niemand weiss, wohin ein Bericht gehört und was noch fehlt. Weil die Spitäler keine Bestätigung bekommen, schicken sie alles mehrfach. Unsere Mini-App startet mit dem, was jedes Team hat: einer Excel-Liste. Diese 12 fiktiven Fälle kommen 1:1 aus `faelle.xlsx`. Rot heisst: Es fehlen Unterlagen.» |
| **0:20–0:40** | **Posteingang** → **«Demo-Posteingang laden»** | «Jetzt kommen 10 Berichte rein, alle mit unterschiedlichen Briefköpfen. In einer Sekunde sind 5 automatisch zugeordnet, ein Duplikat ist abgefangen, und nur 4 brauchen noch einen Menschen.» Dabei auf die Kennzahlen-Leiste zeigen. |
| **0:40–1:15** | Dritte Zeile **«Operationsbericht»** (Spital Lindenbach, Lukas Brunner) öffnen. Dann einmal kurz nach unten scrollen. | «Das Spital hat ‹Bruner› statt ‹Brunner› geschrieben, und es gibt keine Schaden-Nr. Die App findet trotzdem Name, Geburtsdatum, Unfalldatum und die GLN des Spitals, links farbig markiert. Das gibt 97 von 100 Punkten, rechts ist jeder Punkt begründet, keine Blackbox. Oben im grünen Kasten steht die Eingangs-ID: Diese Quittung kann das Spital sofort bekommen.» |
| **1:15–1:40** | **«← Zum Posteingang»**, Zeile mit dem roten Status **«Widerspruch – prüfen»** öffnen | «Hier stimmt die Schaden-Nr., aber sie gehört zu Anna Schmid, während der Bericht von Laura Widmer handelt. Ein Zahlendreher. Die App ordnet das **bewusst nicht** zu, denn ein Arztbericht im falschen Dossier wäre ein Datenschutzvorfall. Rechts zeigt sie gleich Laura Widmer als richtigen Kandidaten.» |
| **1:40–2:10** | **Fälle** → **Reto Bühler** → oben rechts **«Nachforderung erstellen»** | «Pro Fall sehen wir, welche Unterlagen der Falltyp braucht. Bei Reto Bühler fehlen noch vier. Ein Klick erzeugt die Anfragetexte: medizinische Berichte ans Spital, die Unfallmeldung an den Arbeitgeber. Sie nennen nur, was wirklich fehlt, und auch, was nicht nochmals geschickt werden muss.» |
| **2:10–2:35** | Oben **«Volumen-Daten»** → **Posteingang** → **«Volumen-Posteingang laden»** | «Und mit 300 Berichten? 89 % werden automatisch zugeordnet, 15 Duplikate abgefangen, nur 30 brauchen noch einen Menschen.» |
| **2:35–3:00** | (nichts klicken) | «Damit das sicher ist, hat die App einen Steckbrief: Mockdaten, keine Personendaten, keine Netzwerkzugriffe. Die Content-Security-Policy erzwingt das im Browser, und über 70 automatische Tests laufen bei jedem Deploy. So stellen wir uns ‹AXA LOS!› vor: Aus einer Excel-Liste wird in kurzer Zeit eine sichere, nachvollziehbare Mini-App.» |

---

## Reserve (bei Zeit oder auf Nachfrage)

| Thema | Klicken | Sagen |
|---|---|---|
| **Vorschlag bestätigen** | Im Widerspruch-Dokument **«Nächstes offenes Dokument →»**, dann oben im gelben Kasten **«Vorschlag bestätigen»** | «Nur Name und Unfalldatum ergeben 65 Punkte, also ein Vorschlag. Ein Klick, und an derselben Stelle erscheint die Empfangsbestätigung mit Eingangs-ID. Die Kennzahl ‹Offen› sinkt von 4 auf 3.» |
| **Duplikat** | Posteingang, Zeile mit dem Status **«Duplikat»** | «Das Spital Seewald hat seinen Austrittsbericht ein zweites Mal geschickt. Die App erkennt den identischen Inhalt: ‹Bereits eingegangen am …, Eingangs-ID …›.» |
| **Quittung** | Im grünen Kasten **«Quittung öffnen»** | Druckbare Empfangsbestätigung, auch als Text kopierbar für eine Antwort-Mail. |
| **Eigene Excel** | Fälle → **«Eigene Excel/CSV laden»** | Jede Liste mit den gleichen Spalten funktioniert ohne Code-Änderung. Fehlende Spalten meldet die App verständlich. |

## Antworten auf typische Fragen

- **«Ist das KI?»** Nein, regelbasiert (Regex und Schlüsselwörter), deshalb nachvollziehbar und testbar. Die Extraktion ist aber ein austauschbares Modul (`extract(text)`), ein Sprachmodell könnte es später ersetzen.
- **«Woher kommen die Daten?»** Alles ist selbst generiert und fiktiv, mit festem Seed. Jeder Bericht endet mit «FIKTIVES TESTDOKUMENT». Erfundene Spitäler, GLN mit Testpräfix 7609999.
- **«Kann ich eine andere Excel-Liste nehmen?»** Ja: «Eigene Excel/CSV laden» in der Fallliste, ohne Code-Änderung.
- **«Warum kein Backend?»** Kein Server heisst keine Angriffsfläche und keine Secrets. Gehostet wird gratis auf GitHub Pages, deployt wird nur bei grünen Tests.
- **«Was fehlt bis zur Produktion?»** PDF/OCR, Anbindung an das Kernsystem und den Mailversand, Login und Rollen, Audit-Trail, fachlich validierte Regeln. Siehe «Grenzen des Prototyps» im README.

## Falls etwas schiefgeht

- **Posteingang schon geladen** (alles erscheint als Duplikat): «Demo zurücksetzen», dann neu laden.
- **Seite lädt nicht:** Handy-Hotspot, sonst das Backup-Video abspielen und live kommentieren.
- **Browser speichert nichts** (privater Modus): Die App funktioniert trotzdem, nur ohne Gedächtnis beim Neuladen.
