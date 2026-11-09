# Demo-Skript: CaseConnect Lite in 3 Minuten

**Live:** https://rexliz.github.io/axa-miniapp-caseconnect/

## Vorbereitung (vor dem Pitch)

- [ ] Live-URL im Browser öffnen, Zoom 110–125 %, damit es im Saal lesbar ist
- [ ] Oben rechts **«Demo zurücksetzen»** klicken, dann sind **Demo-Daten** aktiv und der Posteingang ist leer
- [ ] Zweiter Tab: `src/data/faelle.xlsx` in Excel geöffnet (für den Satz «aus dieser Liste wird die App»)
- [ ] Optional dritter Tab: `miniapp.json` auf GitHub
- [ ] Ohne WLAN: `npm start` und http://localhost:8080/ (läuft komplett offline)

Kurz-Links für den Notfall: `#/eingang`, `#/dokument/D0007`, `#/fall/UV-2026-11872`

---

## Ablauf

| Zeit | Klicken | Sagen |
|---|---|---|
| **0:00–0:20** | Startseite (Fallliste) zeigen | «Bei einem UVG-Unfall schicken Spitäler und Ärzte Berichte per Mail, oft ohne Schaden-Nr. Niemand weiss, wohin ein Bericht gehört und was noch fehlt. Weil die Spitäler keine Bestätigung bekommen, schicken sie alles mehrfach. Die verunfallte Person wartet auf ihr Geld.» |
| **0:20–0:35** | Kurz in den Excel-Tab wechseln, dann zurück | «Unsere Mini-App startet mit dem, was jedes Team hat: einer Excel-Liste. Diese 12 fiktiven Fälle kommen 1:1 aus `faelle.xlsx`. Ampel rot heisst: Es fehlen Unterlagen.» |
| **0:35–0:50** | **Posteingang** → **«Demo-Posteingang laden»** | «Jetzt kommen 10 Berichte rein, alle mit unterschiedlichen Briefköpfen. In einer Sekunde sind 5 automatisch zugeordnet, einer ist ein Duplikat, und nur 4 brauchen noch einen Menschen.» Auf die Kennzahlen-Leiste zeigen. |
| **0:50–1:10** | Zeile **EB-…0003** (Operationsbericht) öffnen | «Hier hat das Spital ‹Bruner› statt ‹Brunner› geschrieben, und es gibt keine Schaden-Nr. Die App findet Name, Geburtsdatum, Unfalldatum und die GLN des Spitals, farbig markiert. Das gibt 97 von 100 Punkten, also eine automatische Zuordnung. Und jeder Punkt ist begründet, keine Blackbox.» |
| **1:10–1:30** | Zurück, Zeile **EB-…0007** (Widerspruch) öffnen | «Und hier stimmt die Schaden-Nr., aber sie gehört zu Anna Schmid, während der Bericht von Laura Widmer handelt. Ein Zahlendreher. Die App ordnet das **bewusst nicht** zu, denn ein Arztbericht im falschen Dossier wäre ein Datenschutzvorfall. Sie zeigt aber gleich den richtigen Fall als Kandidaten.» |
| **1:30–1:45** | Zurück, Zeile **EB-…0008** (Vorschlag) öffnen → **«Vorschlag bestätigen»** | «Nur Name und Unfalldatum ergeben 65 Punkte, also einen Vorschlag. Ein Klick zum Bestätigen, und schon entsteht die Empfangsbestätigung mit Eingangs-ID.» Auf die Karte «Empfangsbestätigung» zeigen. |
| **1:45–1:55** | Zurück, Zeile **Duplikat** öffnen | «Das Spital Seewald hat seinen Austrittsbericht ein zweites Mal geschickt. Die App erkennt den identischen Inhalt und meldet: ‹Bereits eingegangen am …, Eingangs-ID …›. Diese Antwort hätte das Spital sofort bekommen können, ohne dass jemand suchen muss.» |
| **1:55–2:20** | **Fälle** → **Reto Bühler** → **«Nachforderung erstellen»** | «Pro Fall sehen wir, welche Unterlagen der Falltyp braucht. Bei Reto Bühler fehlen noch vier. Ein Klick erzeugt einen höflichen Anfragetext: medizinische Berichte ans Spital, die Unfallmeldung an den Arbeitgeber. Er enthält nur, was wirklich fehlt, und auch, was nicht nochmals geschickt werden muss.» |
| **2:20–2:35** | Oben **«Volumen-Daten»** → Posteingang → **«Volumen-Posteingang laden»** | «Und mit 300 Berichten? 89 % werden automatisch zugeordnet, 15 Duplikate abgefangen, nur 30 brauchen noch einen Menschen.» |
| **2:35–3:00** | Optional `miniapp.json` zeigen | «Damit das sicher ist, hat die App einen Steckbrief: Mockdaten, keine Personendaten, keine Netzwerkzugriffe. Die Content-Security-Policy erzwingt das im Browser, und über 70 automatische Tests laufen bei jedem Deploy. So stellen wir uns ‹AXA LOS!› vor: Aus einer Excel-Liste wird in kurzer Zeit eine sichere, nachvollziehbare Mini-App.» |

---

## Antworten auf typische Fragen

- **«Ist das KI?»** Nein, regelbasiert (Regex und Schlüsselwörter), deshalb nachvollziehbar und testbar. Die Extraktion ist aber ein austauschbares Modul (`extract(text)`), ein Sprachmodell könnte es später ersetzen.
- **«Woher kommen die Daten?»** Alles ist selbst generiert und fiktiv, mit festem Seed. Jeder Bericht endet mit «FIKTIVES TESTDOKUMENT». Erfundene Spitäler, GLN mit Testpräfix 7609999.
- **«Kann ich eine andere Excel-Liste nehmen?»** Ja: «Eigene Excel/CSV laden» in der Fallliste, ohne Code-Änderung. Fehlende Spalten meldet die App verständlich.
- **«Warum kein Backend?»** Kein Server heisst keine Angriffsfläche und keine Secrets. Gehostet wird gratis auf GitHub Pages, deployt wird nur bei grünen Tests.
- **«Was fehlt bis zur Produktion?»** PDF/OCR, Anbindung an das Kernsystem und den Mailversand, Login und Rollen, Audit-Trail, fachlich validierte Regeln. Siehe «Grenzen des Prototyps» im README.

## Falls etwas schiefgeht

- **Posteingang schon geladen** (alles erscheint als Duplikat): «Demo zurücksetzen», dann neu laden.
- **Seite lädt nicht:** lokal mit `npm start` und http://localhost:8080/.
- **Browser speichert nichts** (privater Modus): Die App funktioniert trotzdem, nur ohne Gedächtnis beim Neuladen.
