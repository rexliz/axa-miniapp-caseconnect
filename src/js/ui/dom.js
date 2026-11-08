// Kleine DOM-Helfer. Bewusst ohne innerHTML für Daten (kein HTML-Injection-Risiko) und ohne Inline-Styles (CSP).

/**
 * Erzeugt ein Element: h('a', { href: '#/faelle', class: 'btn' }, 'Text', kindElement)
 * Attribute mit Funktionswert und Namen «on…» werden als Event-Listener registriert.
 */
export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [name, wert] of Object.entries(attrs ?? {})) {
    if (wert == null || wert === false) continue;
    if (name === 'class') el.className = String(wert);
    else if (name === 'dataset') Object.assign(el.dataset, wert);
    else if (name.startsWith('on') && typeof wert === 'function') el.addEventListener(name.slice(2).toLowerCase(), wert);
    else if (name === 'value') el.value = String(wert);
    else if (wert === true) el.setAttribute(name, '');
    else el.setAttribute(name, String(wert));
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}

let toastTimer = 0;
/** Kurze Statusmeldung unten am Bildschirm (wird auch von Screenreadern vorgelesen). */
export function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 3200);
}

/** Text in die Zwischenablage kopieren (mit Fallback, falls die Clipboard-API fehlt). */
export async function kopieren(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { class: 'visually-hidden', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

const AMPEL_TEXT = { gruen: 'vollständig', gelb: 'teilweise', rot: 'nichts erhalten', grau: 'Falltyp unbekannt' };

/** Vollständigkeits-Ampel: Farbe + Text (nicht nur Farbe, wegen Barrierefreiheit). */
export function ampel(v, { lang = false } = {}) {
  const text = v.bekannt ? `${v.erhalten}/${v.total}` : '–';
  return h('span', { class: `ampel ampel--${v.ampel}`, title: `Unterlagen ${AMPEL_TEXT[v.ampel]}` },
    h('span', { class: 'ampel__punkt', 'aria-hidden': 'true' }),
    h('span', { class: 'visually-hidden' }, `Unterlagen ${AMPEL_TEXT[v.ampel]}: `),
    lang ? `${text} ${AMPEL_TEXT[v.ampel]}` : text,
  );
}

/** Fokus nach einem Ansichtswechsel auf die Hauptüberschrift setzen (Tastatur/Screenreader). */
export function fokusAufUeberschrift(container) {
  const ueberschrift = container.querySelector('h1');
  if (ueberschrift) {
    ueberschrift.setAttribute('tabindex', '-1');
    ueberschrift.focus({ preventScroll: true });
  }
}
