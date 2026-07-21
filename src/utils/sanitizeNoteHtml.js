// Sanitizador de HTML enriquecido de notas, basado en DOM (no regex): parsea a
// un árbol desprendido y reconstruye solo con lo permitido. Robusto contra XSS
// pegado desde el portapapeles o importado — se corre al guardar Y al renderar.
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'IMG']);
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color', 'font-weight', 'font-style', 'text-decoration']);
// Las imágenes inline solo pueden apuntar al protocolo propio de la app o a un
// data URL RASTER (png/jpeg/gif/webp — nunca svg, que sí ejecuta script). Bloquea
// http/svg externo (evita exfiltración/tracking/XSS desde una nota importada).
const SAFE_IMG_SRC = /^(dvpotro-note-img:\/\/|data:image\/(png|jpeg|gif|webp);)/i;

function sanitizeStyle(value) {
  return String(value || '')
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const [prop, ...rest] = decl.split(':');
      const name = prop.trim().toLowerCase();
      const val = rest.join(':').trim();
      if (!ALLOWED_STYLE_PROPS.has(name)) return null;
      // Ningún valor con url()/expression()/javascript: entra.
      if (/url\(|expression\(|javascript:/i.test(val)) return null;
      return `${name}: ${val}`;
    })
    .filter(Boolean)
    .join('; ');
}

function walk(node, doc) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === 3) return; // texto: se conserva tal cual
    if (child.nodeType !== 1) { child.remove(); return; } // comentarios y demás: fuera

    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Tag no permitido: aplanar a su texto (no perder el contenido escrito).
      child.replaceWith(doc.createTextNode(child.textContent || ''));
      return;
    }

    // <img>: solo se conserva si el src apunta al protocolo seguro; alt limpio.
    if (child.tagName === 'IMG') {
      const src = child.getAttribute('src') || '';
      const alt = child.getAttribute('alt') || '';
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
      if (!SAFE_IMG_SRC.test(src)) {
        child.remove();
        return;
      }
      child.setAttribute('src', src);
      if (alt) child.setAttribute('alt', alt.replace(/[<>"]/g, ''));
      return; // <img> no tiene hijos que recorrer
    }

    [...child.attributes].forEach((attr) => {
      if (attr.name.toLowerCase() === 'style') {
        const clean = sanitizeStyle(attr.value);
        if (clean) child.setAttribute('style', clean);
        else child.removeAttribute('style');
        return;
      }
      // Cualquier otro atributo (on*, href, src, class, etc.) se descarta.
      child.removeAttribute(attr.name);
    });

    walk(child, doc);
  });
}

export function sanitizeNoteHtml(html) {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root');
  if (!root) return '';
  walk(root, doc);
  return root.innerHTML;
}

// Texto plano de un HTML — para previews de card sin tags.
export function stripNoteHtml(html) {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
