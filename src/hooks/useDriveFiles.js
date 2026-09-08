import { useCallback, useEffect, useMemo, useState } from 'react';

// Los PDFs de Drive que la cola de fondo ya resolvió. Se lee una vez por página
// y se pasa hacia abajo: un fetch por card serían trece llamadas IPC para leer
// trece veces el mismo archivo.
//
// La cola arranca sola después del scrape, así que el índice cambia mientras la
// pantalla está abierta. Por eso se escucha `drive:progress` y se relee cuando
// un archivo termina, en vez de mostrar para siempre el estado del primer load.
function useDriveFiles() {
  const [archivos, setArchivos] = useState({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const bridge = window.scraperApp?.drive;

    if (!bridge) {
      setCargando(false);
      return;
    }

    try {
      const resultado = await bridge.getCached();
      if (resultado?.ok) setArchivos(resultado.data?.archivos || {});
    } catch (_error) {
      // El índice es una mejora sobre el enlace, no un requisito: sin él la card
      // sigue mostrando el link como siempre.
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();

    const bridge = window.scraperApp?.drive;
    if (!bridge?.onProgress) return undefined;

    return bridge.onProgress(({ done, total }) => {
      if (done === total) cargar();
    });
  }, [cargar]);

  // La card casa su enlace con el archivo por URL: no puede importar el
  // normalizador, que vive en el main como CommonJS. Por eso el índice guarda
  // TODAS las URLs origen de cada archivo.
  const porUrl = useMemo(() => {
    const mapa = new Map();

    for (const entrada of Object.values(archivos)) {
      for (const url of entrada.urls || [entrada.url]) {
        if (url) mapa.set(url, entrada);
      }
    }

    return mapa;
  }, [archivos]);

  return { archivos, porUrl, cargando, recargar: cargar };
}

export default useDriveFiles;
