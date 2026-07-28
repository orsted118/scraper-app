import { useEffect, useState } from 'react';

// Un timestamp LRC: [mm:ss] o [mm:ss.xx] / [mm:ss.xxx]. El resto de la línea es
// la letra. Las etiquetas de cabecera ([ar:], [ti:], [by:]) no matchean porque
// exigen dígitos, así que se descartan solas.
const LRC_LINE = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
// Formato repetido [00:12.34][00:24.56] letra: el parser se queda con el primer
// tiempo, pero los sobrantes quedarían impresos como texto.
const LEADING_STAMPS = /^(?:\[\d{2}:\d{2}(?:\.\d{2,3})?\])+/;

export function parseLRC(text) {
  const lines = [];

  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(LRC_LINE);
    if (!match) continue;

    const [, mm, ss, fraction, content] = match;
    // Dos dígitos son centésimas, tres son milésimas.
    const decimals = fraction ? Number(fraction) / (fraction.length === 2 ? 100 : 1000) : 0;

    lines.push({
      time: Number(mm) * 60 + Number(ss) + decimals,
      text: content.replace(LEADING_STAMPS, '').trim(),
    });
  }

  return lines.sort((a, b) => a.time - b.time);
}

// null mientras carga, [] cuando no hay sidecar. Distinguirlos evita mostrar
// "sin letra" durante el parpadeo inicial de cada cambio de pista.
function useLyrics(trackPath) {
  const [lines, setLines] = useState(null);

  useEffect(() => {
    if (!trackPath) {
      setLines([]);
      return undefined;
    }

    const read = window.scraperApp?.music?.readLyrics;

    if (!read) {
      setLines([]);
      return undefined;
    }

    let cancelled = false;
    setLines(null);

    read(trackPath)
      .then((raw) => {
        if (cancelled) return;
        setLines(raw ? parseLRC(raw) : []);
      })
      .catch(() => {
        if (!cancelled) setLines([]);
      });

    return () => {
      cancelled = true;
    };
  }, [trackPath]);

  return lines;
}

export default useLyrics;
