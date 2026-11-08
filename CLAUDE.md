# CaseConnect Lite – Projektregeln

Hackathon-Prototyp (ZHAW-Team, AXA-Hackathon 10./11.11.2026), Teil von «AXA Mini Apps – Citizen Development Boost Factory» («AXA LOS!»). Die App ordnet medizinische UVG-Berichte Schadenfällen zu.

## Leitplanken (verbindlich)
- Statische App: HTML, CSS, Vanilla JavaScript (ES-Module). **Kein Backend, kein Framework, kein Build-Step, keine npm-Abhängigkeiten.**
- Deployment: GitHub Pages über `.github/workflows/pages.yml`. Der Ordner `src/` wird 1:1 veröffentlicht. Jeder Push auf `main` testet und deployt.
- Nur **selbst generierte Mockdaten** (`npm run generate-data`). Keine echten Personen-, Gesundheits- oder AXA-Daten, keine Secrets oder API-Keys.
- CSP per Meta-Tag (`default-src 'self'`): keine Inline-Scripts, keine Inline-Styles, keine `style`-Attribute, keine `on…`-Handler, keine externen URLs. `tests/security.test.js` prüft das.
- Alle Pfade relativ (die App läuft unter `https://<user>.github.io/<repo>/`).
- UI auf Deutsch in Schweizer Rechtschreibung (ss statt ß).
- localStorage nur in try/catch, und die App muss auch ohne localStorage funktionieren.
- Git-Identität ist nur lokal gesetzt (Noreply-Adresse von `rexliz`). Keine privaten E-Mail-Adressen ins Repo.

## Struktur
- `src/js/core/`: reine Logik ohne DOM (Extraktion, Matching, Vollständigkeit, Duplikate …), vollständig getestet
- `src/js/config.js`: Schlüsselwörter, Gewichte, Schwellwerte, Vollständigkeitsregeln (zentral)
- `src/js/io/`: Laden von Excel/CSV und Posteingang
- `src/js/ui/`: eine Datei pro Ansicht. `src/js/main.js` enthält Einstieg und Routing, `src/js/state.js` Zustand und localStorage.
- `src/data/`: generierte Mockdaten (committet). `src/vendor/`: SheetJS lokal.
- `scripts/`: Generator und lokaler Server. `tests/`: `node --test`. `docs/`: Doku, `docs/entscheidungen.md`.

## Befehle
- `npm start`: lokaler Server auf http://localhost:8080/
- `npm test`: alle Tests (müssen grün sein, sonst kein Deploy)
- `npm run generate-data`: Mockdaten neu erzeugen. Der Generator ist deterministisch: Danach muss `git status` sauber bleiben.

## Arbeitsweise
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
- Kleinere Entscheidungen in `docs/entscheidungen.md` festhalten.
- Nach jedem Push: `gh run watch` und Live-URL prüfen.
