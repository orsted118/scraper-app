// Parsing de fechas en español de los portales ITSON — compartido por scraper,
// notification-center y notifications. Devuelve timestamp en ms (número) o null.
const SPANISH_MONTHS = {
  enero: 'January', febrero: 'February', marzo: 'March',
  abril: 'April', mayo: 'May', junio: 'June',
  julio: 'July', agosto: 'August', septiembre: 'September',
  octubre: 'October', noviembre: 'November', diciembre: 'December',
};

function parseDueDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  let normalized = value.replace(/\s+/g, ' ').trim();

  for (const [es, en] of Object.entries(SPANISH_MONTHS)) {
    normalized = normalized.replace(new RegExp(es, 'gi'), en);
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = { SPANISH_MONTHS, parseDueDate };
