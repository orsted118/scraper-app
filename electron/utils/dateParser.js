// Parsing de fechas en español de los portales ITSON — compartido por scraper,
// notification-center y notifications. Devuelve timestamp en ms (número) o null.
const SPANISH_MONTHS = {
  enero: 'January', febrero: 'February', marzo: 'March',
  abril: 'April', mayo: 'May', junio: 'June',
  julio: 'July', agosto: 'August', septiembre: 'September',
  octubre: 'October', noviembre: 'November', diciembre: 'December',
};

const MONTH_INDEX = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8,
  octubre: 9, noviembre: 10, diciembre: 11,
};

// Moodle en español escribe "lunes, 8 de septiembre de 2026, 23:59". Sustituir
// solo el nombre del mes deja los conectores "de" en medio y `Date.parse`
// devuelve NaN, así que la fecha se perdía entera: sin fecha no hay `retrasada`
// ni detección de ventana cerrada. Este patrón la lee directo.
const SPANISH_LONG_DATE =
  /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})(?:\s*[,;]?\s*(?:a\s+las\s+)?(\d{1,2}):(\d{2}))?/i;

function stripAccents(value) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
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

function parseDueDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  let normalized = value.replace(/\s+/g, ' ').trim();

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

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayMs(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Distancia en días de CALENDARIO local: 0 = hoy, 1 = mañana, -1 = ayer.
//
// Existe porque comparar milisegundos transcurridos NO responde "¿vence hoy?".
// Una entrega mañana 17:00 vista hoy 22:00 está a 19 horas: entra en una ventana
// de 24h, pero vence mañana. La card decía "Vence hoy" arriba de la fecha
// "4 Sep" que ella misma mostraba. `Math.round` sobre los inicios de día absorbe
// los saltos de horario de verano (el día dura 23h o 25h).
function daysUntilDue(dueMs, nowMs = Date.now()) {
  const due = dueMs instanceof Date ? dueMs.getTime() : dueMs;

  // Se exige número finito en vez de castear: `Number(null)` y `Number('')` dan
  // 0, así que una fecha ausente se habría leído como el 1 de enero de 1970 y
  // devuelto un retraso de veinte mil días en lugar de "sin fecha".
  if (typeof due !== 'number' || !Number.isFinite(due)) {
    return null;
  }

  return Math.round((startOfDayMs(due) - startOfDayMs(nowMs)) / DAY_MS);
}

module.exports = { SPANISH_MONTHS, parseDueDate, daysUntilDue };
