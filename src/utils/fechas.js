// Gemelo ESM de `electron/utils/dateParser.js` para el renderer.
//
// El main es CommonJS y el renderer es ESM via Vite, así que el módulo no se
// puede compartir. `scripts/test-fechas.cjs` carga los dos y exige que
// devuelvan lo mismo para que no se separen con el tiempo.
//
// Existe porque el renderer usaba `Date.parse` pelado y el portal escribe
// "lunes, 8 de septiembre de 2026, 23:59": `Date.parse` devuelve NaN con ese
// formato, así que la card mostraba la fecha en crudo y nunca marcaba urgencia.

const MONTH_INDEX = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8,
  octubre: 9, noviembre: 10, diciembre: 11,
};

const SPANISH_MONTHS = {
  enero: 'January', febrero: 'February', marzo: 'March',
  abril: 'April', mayo: 'May', junio: 'June',
  julio: 'July', agosto: 'August', septiembre: 'September',
  octubre: 'October', noviembre: 'November', diciembre: 'December',
};

const SPANISH_LONG_DATE =
  /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})(?:\s*[,;]?\s*(?:a\s+las\s+)?(\d{1,2}):(\d{2}))?/i;

const NON_DATES = new Set(['', '-', '—', 'sin fecha visible', 'sin fecha']);

function stripAccents(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseSpanishLongDate(value) {
  const match = value.match(SPANISH_LONG_DATE);

  if (!match) {
    return null;
  }

  const month = MONTH_INDEX[stripAccents(match[2]).toLowerCase()];

  if (month === undefined) {
    return null;
  }

  const day = Number(match[1]);
  const year = Number(match[3]);
  const hours = match[4] === undefined ? 0 : Number(match[4]);
  const minutes = match[5] === undefined ? 0 : Number(match[5]);

  if (day < 1 || day > 31 || hours > 23 || minutes > 59) {
    return null;
  }

  return new Date(year, month, day, hours, minutes, 0, 0).getTime();
}

export function parseFechaPortal(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  let normalized = value.replace(/\s+/g, ' ').trim();

  if (NON_DATES.has(normalized.toLowerCase())) {
    return null;
  }

  const spanishLong = parseSpanishLongDate(normalized);

  if (spanishLong !== null) {
    return spanishLong;
  }

  for (const [es, en] of Object.entries(SPANISH_MONTHS)) {
    normalized = normalized.replace(new RegExp(es, 'gi'), en);
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseFechaPortalDate(value) {
  const timestamp = parseFechaPortal(value);
  return timestamp === null ? null : new Date(timestamp);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayMs(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Gemelo de `daysUntilDue` en electron/utils/dateParser.js — ver ahí el porqué.
// Distancia en días de CALENDARIO local: 0 = hoy, 1 = mañana, -1 = ayer.
export function diasHastaVencimiento(deadline, now = Date.now()) {
  const due = deadline instanceof Date ? deadline.getTime() : deadline;

  // Número finito exigido, no casteado: `Number(null)` es 0 y una fecha ausente
  // se habría leído como el 1 de enero de 1970.
  if (typeof due !== 'number' || !Number.isFinite(due)) {
    return null;
  }

  return Math.round((startOfDayMs(due) - startOfDayMs(now)) / DAY_MS);
}
