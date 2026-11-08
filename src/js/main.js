// Einstieg der App. Phase 1: Grundgerüst – Ansichten folgen in den nächsten Phasen.

const main = document.getElementById('main');

if (main) {
  const card = document.createElement('section');
  card.className = 'card';

  const h1 = document.createElement('h1');
  h1.textContent = 'CaseConnect Lite';

  const p = document.createElement('p');
  p.textContent =
    'Medizinische UVG-Berichte automatisch dem richtigen Schadenfall zuordnen, ' +
    'Duplikate abfangen, Empfang bestätigen und fehlende Unterlagen nachfordern.';

  const status = document.createElement('p');
  status.className = 'muted';
  status.textContent = 'Grundgerüst live. Fallliste, Posteingang und Kennzahlen folgen.';

  card.append(h1, p, status);
  main.replaceChildren(card);
}
