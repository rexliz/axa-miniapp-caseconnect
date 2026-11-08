# Entscheidungen

Kleinere technische und fachliche Entscheidungen, die während der Umsetzung getroffen wurden. Neueste unten.

| # | Datum | Entscheidung | Begründung |
|---|---|---|---|
| 1 | 2026-11-08 | **Keine npm-Abhängigkeiten.** SheetJS liegt einmal als `src/vendor/xlsx.mjs` im Repo und wird von App, Mockdaten-Generator und Tests gemeinsam genutzt. | Kein `npm install` lokal oder in der CI, keine Supply-Chain-Fläche, läuft offline. Passt zur Leitplanke «kein Build-Step». |
| 2 | 2026-11-08 | **`npm start` nutzt `scripts/serve.mjs`** (eigener Mini-Server mit `node:http`) statt `npx serve`. | `npx serve` lädt beim ersten Start ein Paket aus dem Internet. Der eigene Server funktioniert auch ohne Netz am Hackathon. |
| 3 | 2026-11-08 | **JavaScript-Prüfung über VS Code (`jsconfig.json` mit `checkJs`)** statt ESLint. | ESLint bräuchte eine npm-Abhängigkeit plus Konfiguration. Die eingebaute Typprüfung von VS Code findet die meisten Fehler ohne Zusatzaufwand. |
| 4 | 2026-11-08 | **Workflow mit zwei Jobs** (`test` → `deploy`), Node 26 (aktuelle LTS), Actions in der aktuellen Major-Version: checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5. | Ein Deploy passiert nur, wenn `npm test` grün ist. `package-manager-cache: false`, weil es keine Lock-Datei gibt. |
| 5 | 2026-11-08 | **CSP:** `default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'`. Ein Test prüft, dass `index.html` weder Inline-Scripts noch Inline-Styles enthält und nur relative Pfade nutzt. | Teil der Security-Story: Die Seite lädt nichts von fremden Servern, und eingeschleuster Code würde vom Browser blockiert. |
| 6 | 2026-11-08 | **Sechster Dokumenttyp «Unfallmeldung»** zusätzlich zu den fünf medizinischen Berichten. | Die Vollständigkeitsregeln und Szenario 10 verlangen eine Unfallmeldung vom Arbeitgeber. |
| 7 | 2026-11-08 | **Szenario 4** enthält neben dem Geburtsdatum auch das Unfalldatum. | Name und Geburtsdatum allein ergeben 70 Punkte («Vorschlag prüfen»). Mit dem Unfalldatum wird der Bericht automatisch dem richtigen der zwei Fälle mit gleichem Namen zugeordnet. |
| 8 | 2026-11-08 | **`faelle.xlsx` mit echten Excel-Datumszellen, `faelle.csv` mit Semikolon, UTF-8-BOM und Datum als Text.** Der CSV-Import erkennt auch Windows-1252. | So öffnet ein Schweizer Excel die CSV korrekt, und der Loader ist mit beiden Datumsvarianten getestet (Seriennummer und Text). |
| 9 | 2026-11-08 | **Volumen-Berichte als eine `berichte.json`** statt 300 einzelner `.txt`-Dateien. | Ein Request statt 300. Die Demo bleibt bei einzelnen `.txt`-Dateien mit `index.json`, weil man die in der Präsentation öffnen und zeigen kann. |
| 10 | 2026-11-08 | **Upload einer eigenen Fallliste ersetzt die Liste des aktiven Datensatzes und leert dessen Posteingang** (mit Rückfrage). | Zuordnungen zu Schaden-Nummern einer alten Liste wären sonst verwaist oder falsch. |
| 11 | 2026-11-08 | **«Demo zurücksetzen» setzt beide Datensätze zurück** und lädt die Standardlisten neu. | Ein Knopf, ein klarer Ausgangszustand vor jeder Präsentation. |
| 12 | 2026-11-08 | **Fiktive Kennungen erkennbar machen:** ZSR immer `Z99…`, Postleitzahlen 9991–9996 mit erfundenen Orten, E-Mail-Domains `.example` (für Beispiele reserviert, RFC 2606), keine Telefonnummern. | Das Format einer ZSR lässt sich nicht von echten unterscheiden. Das feste Präfix macht die Fiktivität sichtbar. |
| 13 | 2026-11-08 | **Hash-Routing** (`#/faelle`, `#/fall/UV-…`). | Funktioniert auf GitHub Pages ohne Server-Konfiguration und mit relativen Pfaden. |
| 14 | 2026-11-08 | **`.gitattributes`: `src/data/**` und `src/vendor/**` byte-genau.** | Szenario 9 enthält absichtlich Windows-Zeilenenden, und der Determinismus-Test vergleicht Bytes. Ohne diese Regel würde Git bei Teammitgliedern unter Windows die Dateien umschreiben. |
