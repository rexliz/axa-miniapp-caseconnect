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
