# CaseConnect Lite – Projektregeln

Hackathon-Prototyp (ZHAW-Team, AXA-Hackathon 10./11.11.2026), Teil von «AXA Mini Apps – Citizen Development Boost Factory» («AXA LOS!»). Die App ordnet medizinische UVG-Berichte Schadenfällen zu (Extraktion → Matching → Quittung → Vollständigkeit → Nachforderung).

- **Live:** https://rexliz.github.io/axa-miniapp-caseconnect/
- **Repo:** https://github.com/rexliz/axa-miniapp-caseconnect (öffentlich)

## Leitplanken (verbindlich)
- Statische App: HTML, CSS, Vanilla JavaScript (ES-Module). **Kein Backend, kein Framework, kein Build-Step, keine npm-Abhängigkeiten.**
- Deployment: GitHub Pages über `.github/workflows/pages.yml`. `src/` wird 1:1 veröffentlicht, und jeder Push auf `main` testet und deployt.
- Nur **selbst generierte Mockdaten** (`npm run generate-data`). Keine echten Personen-, Gesundheits- oder AXA-Daten, keine Secrets oder API-Keys.
- CSP per Meta-Tag (`default-src 'self'`): keine Inline-Scripts, keine `<style>`-Blöcke, keine `style`-Attribute, keine `on…`-Handler, keine externen URLs im App-Code. `tests/security.test.js` prüft das. Dynamische Breiten nur per CSSOM (`el.style.width = …`).
- DOM nur über den Helfer `h()` aus `src/js/ui/dom.js`, nie `innerHTML` mit Daten.
- Alle Pfade relativ (die App läuft unter `https://<user>.github.io/<repo>/`).
- UI auf Deutsch in Schweizer Rechtschreibung (ss statt ß), Personen ohne Herr/Frau ansprechen, wenn das Geschlecht unbekannt ist.
- localStorage nur in try/catch, und die App muss auch ohne localStorage funktionieren.
- Git-Identität ist nur lokal gesetzt (Noreply-Adresse von `rexliz`). Keine privaten E-Mail-Adressen ins Repo.

## Struktur und Datenfluss
- `src/js/config.js`: **alle Fachregeln** (Dokumenttypen und Schlüsselwörter, Matching-Gewichte und -Schwellen, Checklisten je Falltyp, Datensatz-Pfade)
- `src/js/core/`: reine Logik ohne DOM, vollständig getestet
  - `extract.js`: `extract(text) → { dokumenttyp, felder, fundstellen, hinweise }`. **Austauschbar**, Schnittstelle nicht ändern.
  - `match.js`: Score und Status (`automatisch | vorschlag | triage | widerspruch`) mit Begründung
  - `pipeline.js`: `verarbeite(text, stand)` → Duplikat? → Extraktion → Matching → Dokument mit Eingangs-ID
  - `duplicate.js` (SHA-256), `completeness.js`, `request.js`, `receipt.js`, `kpis.js`, `export.js`, `cases.js`, `dates.js`, `gln.js`, `normalize.js`
- `src/js/io/`: Excel/CSV über SheetJS (`src/vendor/xlsx.mjs`), Posteingang (`index.json` + `.txt` bzw. `berichte.json`)
- `src/js/ui/`: eine Datei pro Ansicht. `main.js` enthält das Hash-Routing (`#/faelle`, `#/fall/…`, `#/eingang`, `#/dokument/…`, `#/quittung/…`), `state.js` den Zustand pro Datensatz.
- Dokument-Status: `status` = Ergebnis der Maschine, `zuordnung.art` = automatisch/bestätigt/manuell, `manuelleTriage` = Entscheid eines Menschen
- `scripts/generate-mockdata.mjs`: deterministischer Generator (Seed 20261110). Er nutzt die Core-Module mit.
- `docs/`: `bedienung.md` (Bedienungsanleitung, bei UI-Änderungen nachführen), `mockdaten.md`, `demo-skript.md`, `entscheidungen.md` (neue Entscheidungen unten anhängen)

## Befehle
- `npm start`: lokaler Server auf http://localhost:8080/ (`PORT=… npm start` für einen anderen Port)
- `npm test`: alle Tests (müssen grün sein, sonst kein Deploy)
- `npm run generate-data`: Mockdaten neu erzeugen. Danach muss `git status` sauber bleiben, ein Test vergleicht die Bytes.

## Typische Änderungen
- **Regel anpassen** (Schwelle, Gewicht, Schlüsselwort, Checkliste): nur `config.js`, dann `npm test`. Die Szenario-Tests zeigen, ob die Demo noch stimmt.
- **Neuer Dokumenttyp:** Eintrag in `DOKUMENTTYPEN` und gegebenenfalls in `FALLTYPEN`. Für Demo-Daten auch den Generator erweitern und neu generieren.
- **Generator geändert:** `npm run generate-data` ausführen, die Erwartungen in `index.json` prüfen und `docs/mockdaten.md` nachführen.

## Arbeitsweise
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
- Kleinere Entscheidungen in `docs/entscheidungen.md` festhalten.
- Nach jedem Push: `gh run watch` und die Live-URL prüfen (Seite, `data/faelle.xlsx`, `data/eingang/index.json` mit HTTP 200).
