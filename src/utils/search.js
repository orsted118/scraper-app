// usage:'search' + sensitivity:'base' ignora mayúsculas y diacríticos, así que
// "cancion" encuentra "Canción".
const SEARCH_COLLATOR = new Intl.Collator('es', { sensitivity: 'base', usage: 'search' });

// Substring insensible a acentos. El Collator no expone "contiene", así que se
// compara ventana por ventana: es O(n·m) pero sobre títulos de pista el largo
// es despreciable y evita normalizar toda la biblioteca en cada tecla.
export function matchesQuery(haystack, needle) {
  const text = String(haystack || '');
  const size = needle.length;

  if (size === 0) return true;

  for (let start = 0; start + size <= text.length; start += 1) {
    if (SEARCH_COLLATOR.compare(text.slice(start, start + size), needle) === 0) {
      return true;
    }
  }

  return false;
}

// Filtro estándar de pistas: título, artista o álbum.
export function trackMatches(track, needle) {
  return (
    matchesQuery(track.title, needle) ||
    matchesQuery(track.artist, needle) ||
    matchesQuery(track.album, needle)
  );
}
