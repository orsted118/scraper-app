import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Renderiza el subconjunto de markdown que produce el extractor de consignas
// (`instruccionesMarkdown` en electron/handlers/scraper.js).
//
// Existe porque la card mostraba `instrucciones`, que es `textContent` plano:
// una tabla llegaba como una tira de celdas sueltas con huecos donde estaban
// las filas vacías, y las imágenes no llegaban de ninguna forma. El markdown
// estructurado ya se extraía, pero solo lo consumían el analizador y el
// generador de prompts — en pantalla no se veía nunca.
//
// Se arman nodos de React a mano, nunca `dangerouslySetInnerHTML`: el markdown
// viene de un portal externo y no hay razón para darle una vía a HTML arbitrario.

// Solo esquemas que no ejecutan nada. `javascript:` y demás quedan como texto.
const SAFE_URL = /^(https?:\/\/|mailto:|data:image\/(png|jpe?g|gif|webp);)/i;

const isSafeUrl = (url) => SAFE_URL.test((url || '').trim());

const openExternal = (url) => {
  if (typeof window === 'undefined' || !window.scraperApp?.openExternal) {
    return;
  }

  window.scraperApp.openExternal(url);
};

// --- Inline ----------------------------------------------------------------

// Un solo recorrido con alternancia: imagen, enlace, negrita, itálica, tachado
// y código. El orden importa — `![...]()` tiene que probarse antes que `[...]()`.
const INLINE = /(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)|(`[^`]+`)/g;

function renderInline(text, keyPrefix) {
  const nodes = [];
  let lastIndex = 0;
  let match = INLINE.exec(text);
  let index = 0;

  INLINE.lastIndex = 0;
  match = INLINE.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-i${index}`;
    index += 1;

    if (token.startsWith('![')) {
      const alt = token.slice(2, token.indexOf(']'));
      const url = token.slice(token.indexOf('](') + 2, -1);
      nodes.push(<InlineImage key={key} alt={alt} url={url} />);
    } else if (token.startsWith('[')) {
      const label = token.slice(1, token.indexOf(']'));
      const url = token.slice(token.indexOf('](') + 2, -1);
      nodes.push(
        isSafeUrl(url) ? (
          <button
            key={key}
            type="button"
            onClick={() => openExternal(url)}
            className="link-accent text-left underline"
          >
            {label}
          </button>
        ) : (
          label
        ),
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} style={{ color: 'var(--text-strong)' }}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('~~')) {
      nodes.push(
        <s key={key} style={{ color: 'var(--text-muted)' }}>
          {token.slice(2, -2)}
        </s>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(
        <code key={key} style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = match.index + token.length;
    match = INLINE.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

// Un pluginfile de Moodle solo carga con la cookie de sesión, que el main
// sincroniza con la sesión de Electron al scrapear. Si la sesión venció, la
// imagen falla en silencio y queda un hueco: el fallback dice qué había ahí y
// deja abrirla en el navegador, donde el alumno sí tiene sesión.
function InlineImage({ alt, url }) {
  const [failed, setFailed] = useState(false);

  if (!isSafeUrl(url)) {
    return <span style={{ color: 'var(--text-muted)' }}>{alt || 'imagen'}</span>;
  }

  if (failed) {
    return (
      <button
        type="button"
        onClick={() => openExternal(url)}
        className="my-1 inline-flex items-center gap-2 border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <ImageOff className="h-3.5 w-3.5" strokeWidth={1.5} />
        {alt ? `Ver "${alt}" en el portal` : 'Ver imagen en el portal'}
      </button>
    );
  }

  return (
    // Sin `loading="lazy"` a propósito: una imagen todavía sin cargar no tiene
    // tamaño intrínseco y su caja mide un par de píxeles, así que nunca cuenta
    // como visible y la carga diferida no se dispara jamás. Además no haría
    // falta — estas imágenes solo se montan cuando la card ya está expandida.
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      onClick={() => openExternal(url)}
      className="my-2 block h-auto max-w-full cursor-zoom-in border"
      style={{ borderColor: 'var(--border-subtle)' }}
    />
  );
}

// --- Bloques ---------------------------------------------------------------

function parseBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;

  const isTableLine = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isListLine = (line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const code = [];
      i += 1;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }

      i += 1; // cierre de la valla
      blocks.push({ type: 'code', code: code.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);

    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (isTableLine(line)) {
      const rows = [];

      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }

      blocks.push({ type: 'table', rows });
      continue;
    }

    if (line.trimStart().startsWith('> ')) {
      const quote = [];

      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i].trimStart().replace(/^>\s?/, ''));
        i += 1;
      }

      blocks.push({ type: 'quote', text: quote.join('\n') });
      continue;
    }

    if (isListLine(line)) {
      const items = [];
      const ordered = /^\s*\d+\.\s+/.test(line);

      while (i < lines.length && isListLine(lines[i])) {
        const raw = lines[i];
        const indent = (raw.match(/^\s*/) || [''])[0].length;
        items.push({ text: raw.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''), depth: Math.floor(indent / 2) });
        i += 1;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Párrafo: renglones seguidos hasta una línea en blanco o el arranque de
    // otro bloque. Los saltos internos se conservan (vienen de <br>, que en una
    // consigna separan datos de entrega: nombre de archivo, formato, fecha).
    const paragraph = [];

    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableLine(lines[i]) &&
      !isListLine(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trimStart().startsWith('>')
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }

  return blocks;
}

function splitRow(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function Table({ rows }) {
  const parsed = rows.map(splitRow);
  const hasSeparator = parsed.length > 1 && parsed[1].every((cell) => /^:?-{3,}:?$/.test(cell));
  // Una tabla sin cabecera real llega con la primera fila vacía: es markdown
  // válido pero pintar una franja en blanco arriba la hace ver rota.
  const headerIsEmpty = hasSeparator && parsed[0].every((cell) => !cell);
  const header = hasSeparator && !headerIsEmpty ? parsed[0] : null;
  const body = hasSeparator ? parsed.slice(2) : parsed;

  if (!body.length) {
    return null;
  }

  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {header ? (
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th
                  key={index}
                  className="border px-2 py-1.5 align-top text-xs font-semibold uppercase tracking-[0.1em]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  {renderInline(cell, `th${index}`)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border px-2 py-1.5 align-top"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-normal)' }}
                >
                  {cell ? (
                    renderInline(cell, `td${rowIndex}-${cellIndex}`)
                  ) : (
                    // La celda vacía es intencional (la completa el alumno). Sin
                    // marca queda un hueco que se lee como dato faltante.
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block, index }) {
  if (block.type === 'heading') {
    return (
      <h5
        className="mt-3 text-sm font-semibold first:mt-0"
        style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, inherit)' }}
      >
        {renderInline(block.text, `h${index}`)}
      </h5>
    );
  }

  if (block.type === 'hr') {
    return <hr className="my-3 border-t" style={{ borderColor: 'var(--border-subtle)' }} />;
  }

  if (block.type === 'code') {
    return (
      <pre
        className="my-2 overflow-x-auto border px-3 py-2 text-xs leading-relaxed"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-subtle, transparent)',
          color: 'var(--text-normal)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {block.code}
      </pre>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote
        className="my-2 py-0.5 pl-3 text-sm"
        style={{ borderLeft: '3px solid var(--accent)', color: 'var(--text-normal)' }}
      >
        {renderInline(block.text, `q${index}`)}
      </blockquote>
    );
  }

  if (block.type === 'table') {
    return <Table rows={block.rows} />;
  }

  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';

    return (
      <ListTag
        className={`my-2 space-y-1 text-sm ${block.ordered ? 'list-decimal' : 'list-disc'} pl-5`}
        style={{ color: 'var(--text-normal)' }}
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex} style={{ marginLeft: `${item.depth * 1.1}rem` }}>
            {renderInline(item.text, `l${index}-${itemIndex}`)}
          </li>
        ))}
      </ListTag>
    );
  }

  // Las definiciones de un <dl> llegan como renglones que empiezan con ": ".
  if (block.text.startsWith(': ')) {
    return (
      <p className="my-1 pl-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        {renderInline(block.text.slice(2), `d${index}`)}
      </p>
    );
  }

  return (
    <p className="my-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-normal)' }}>
      {renderInline(block.text, `p${index}`)}
    </p>
  );
}

function ActivityInstructions({ markdown }) {
  const blocks = parseBlocks(markdown);

  if (!blocks.length) {
    return null;
  }

  return (
    <div className="mt-2">
      {blocks.map((block, index) => (
        <Block key={index} block={block} index={index} />
      ))}
    </div>
  );
}

export default ActivityInstructions;
