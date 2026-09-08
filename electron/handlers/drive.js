// Resuelve los links de Google Drive que el profe deja en la consigna hacia el
// archivo real, para que la app tenga el PDF y su texto en vez de una URL.
//
// LEER ANTES DE TOCAR NADA — lo que la medición contra la caché real dejó claro:
//
//   Los archivos compartidos como "cualquiera con el enlace" bajan SIN ninguna
//   sesión de Google. No hace falta OAuth, ni API key, ni login: el permiso ya
//   está en el archivo. De los 41 ids que había en las cachés, 32 bajaron
//   anónimos, 8 pidieron sesión (los 8 de Redes: compartir es política por
//   profesor, no azar por archivo) y 1 estaba borrado.
//
//   Por eso NO hay rung de login acá. Cuando un archivo no se puede resolver, el
//   link se queda como está y se abre en el navegador del alumno, donde ya tiene
//   su sesión. El fallback es no perder nada, nunca prometer una cobertura.
//
// Dos reglas duras:
//
//   1. La URL de descarga se CONSTRUYE a partir del id, nunca se pide el href
//      scrapeado. En material.json ya hay un recurso cuyo `destino` es un login
//      de accounts.google.com con el Drive real enterrado en `continue=`; pedir
//      ese href sería seguir a Google hasta una pantalla de sesión creyendo que
//      es un PDF. Construyendo la URL, el allowlist de hosts es una línea que no
//      se puede esquivar.
//
//   2. Un archivo restringido se ve DISTINTO según quién lo pida. curl sigue el
//      redirect y termina en 200 con ~900 KB de HTML de accounts.google.com: ahí
//      un `if (res.ok) writeFile(...)` guarda la pantalla de login como
//      "Asignación 03.pdf". El net stack de Electron NO sigue ese redirect y
//      devuelve 401 con ~1.7 KB. Se contemplan los dos, porque quién pide cambia
//      entre la app, un test y un sync desde el MCP.
//
//      Ojo con el host final: MEDIDO en Electron 42, `respuesta.url` viene
//      SIEMPRE vacío y `redirected` siempre false, tanto en session.fetch como en
//      net.fetch. Por eso el chequeo de host cae a la URL que se pidió —que la
//      construimos nosotros desde el allowlist— y el peso real de la detección lo
//      llevan el status, el content-type y los magic bytes.
//
// Este módulo no corre nunca adentro del scrape: ver resolveLinksForActivities.

const fs = require('fs');
const path = require('path');

// Todo lo que Google nos puede cambiar, junto. `confirm=t` es lo único que hace
// falta para saltar el interstitial de virus scan de los archivos grandes, y es
// byte-idéntico en los chicos: un solo template, sin rama por tamaño.
const GOOGLE = {
  HOST_BINARIO: 'drive.usercontent.google.com',
  HOST_DRIVE: 'drive.google.com',
  HOST_DOCS: 'docs.google.com',
  HOST_LOGIN: 'accounts.google.com',
  RE_HOST_EXPORT: /^doc-[0-9a-z-]+\.googleusercontent\.com$/,
  DESCARGA: 'https://drive.usercontent.google.com/download',
  CONFIRM: 't',
};

const HOSTS_ACEPTADOS = new Set([GOOGLE.HOST_DRIVE, GOOGLE.HOST_DOCS, GOOGLE.HOST_BINARIO]);

// Los ids de Drive van de 28 (los viejos "0B...") a 44 caracteres.
const RE_ID = '([A-Za-z0-9_-]{20,})';

const PATRONES_ID = [
  { re: new RegExp('/file/d/' + RE_ID), kind: 'binario' },
  { re: new RegExp('/document/d/' + RE_ID), kind: 'documento', docType: 'document' },
  { re: new RegExp('/spreadsheets/d/' + RE_ID), kind: 'documento', docType: 'spreadsheets' },
  { re: new RegExp('/presentation/d/' + RE_ID), kind: 'documento', docType: 'presentation' },
  { re: new RegExp('/drawings/d/' + RE_ID), kind: 'documento', docType: 'drawings' },
  { re: new RegExp('/folders/' + RE_ID), kind: 'no_es_archivo', motivo: 'carpeta' },
  { re: new RegExp('[?&]docid=' + RE_ID), kind: 'binario' },
  { re: new RegExp('[?&]id=' + RE_ID), kind: 'binario' },
];

// Un export por tipo. Los Sheets salen en csv porque es lo que se puede leer sin
// intermediarios; el resto en pdf, que es lo que el alumno abre.
const FORMATO_POR_TIPO = {
  document: 'pdf',
  spreadsheets: 'csv',
  presentation: 'pdf',
  drawings: 'pdf',
};

// Firmas de los tipos que el portal reparte de verdad. No es una validación
// exhaustiva: es la diferencia entre un PDF y una página de Google.
const MAGIC = [
  [0x25, 0x50, 0x44, 0x46],         // %PDF
  [0x50, 0x4b, 0x03, 0x04],         // PK.. zip, docx, xlsx, pptx
  [0xff, 0xd8, 0xff],               // jpeg
  [0x89, 0x50, 0x4e, 0x47],         // png
  [0xd0, 0xcf, 0x11, 0xe0],         // doc, xls, ppt viejos
  [0x7b, 0x5c, 0x72, 0x74, 0x66],   // {\rtf
];

const INDICE_VERSION = 1;
const PARTICION = 'drive-anon';
const TIMEOUT_MS = 30_000;
const CONCURRENCIA = 3;
const MAX_INTENTOS = 3;

// El corpus real no pasa de 2.2 MB por archivo. El techo está para que un link
// mal clasificado no se traiga un video entero, no porque haga falta.
const LIMITE_BYTES = 25 * 1024 * 1024;

// Sólo estos dos tienen texto extraíble sin OCR. Mismo criterio que el
// analizador de entregas y que el generador de prompts.
const EXTENSIONES_CON_TEXTO = new Set(['.pdf', '.docx']);

// Estados de los que no se vuelve. Reintentarlos cada sync llenaría el índice de
// errores y le pegaría a Google para nada: un archivo restringido sigue
// restringido, y uno borrado sigue borrado.
const ESTADOS_TERMINALES = new Set([
  'requiere_sesion',
  'no_existe',
  'no_es_archivo',
  'tipo_rechazado',
  'muy_grande',
]);

// Un fallo de descarga se traduce a un estado del índice. Los terminales van tal
// cual; `tipo_incorrecto` significa que el id es real pero se pidió por el
// endpoint equivocado, y todo lo demás vale reintentarlo la próxima sync.
function estadoDeFallo(motivo) {
  if (ESTADOS_TERMINALES.has(motivo)) return motivo;
  if (motivo === 'tipo_incorrecto') return 'tipo_rechazado';
  return 'error_red';
}

function log(...args) {
  console.log('[drive]', ...args);
}

function noEsArchivo(motivo) {
  return { kind: 'no_es_archivo', motivo };
}

// Los links que salen de instruccionesMarkdown llegan pegados a la puntuación
// del markdown ("...view?usp=sharing)**"). Los de enlaces[] vienen limpios
// porque salen de a[href], pero limpiar de más no cuesta nada.
function limpiarCola(url) {
  return String(url || '').trim().replace(/[)*,.;:]+$/, '');
}

function normalizeDriveLink(url, opciones = {}) {
  const limpio = limpiarCola(url);
  if (!limpio) return noEsArchivo('sin_url');

  let parsed;
  try {
    parsed = new URL(limpio);
  } catch (_error) {
    return noEsArchivo('url_invalida');
  }

  const host = parsed.hostname.toLowerCase();

  // El guard va contra el hostname real, no contra un test sobre el string
  // entero: una URL de login lleva el Drive adentro de `continue=` y un regex
  // suelto le saca el id igual.
  if (host === GOOGLE.HOST_LOGIN) return noEsArchivo('login');
  if (!HOSTS_ACEPTADOS.has(host)) return noEsArchivo('host_no_permitido');
  if (parsed.pathname.startsWith('/forms/')) return noEsArchivo('formulario');

  const encontrado = PATRONES_ID
    .map((patron) => ({ patron, match: parsed.href.match(patron.re) }))
    .find((x) => x.match);

  if (!encontrado) return noEsArchivo('sin_id');

  const { patron } = encontrado;
  const fileId = encontrado.match[1];

  if (patron.kind === 'no_es_archivo') return noEsArchivo(patron.motivo);

  // Un id de doc nativo contra el endpoint binario devuelve 500, y uno de
  // archivo subido contra /export devuelve 400. Se elige por la forma del path,
  // que es lo único que se sabe sin pedir metadata.
  if (patron.kind === 'documento') {
    const formato = opciones.formato || FORMATO_POR_TIPO[patron.docType] || 'pdf';

    return {
      kind: 'documento',
      fileId,
      docType: patron.docType,
      formato,
      // La forma de query, no la de path: /export/pdf devuelve el HTML del editor.
      fetchUrl: `https://${GOOGLE.HOST_DOCS}/${patron.docType}/d/${fileId}/export?format=${formato}`,
    };
  }

  const resourcekey = parsed.searchParams.get('resourcekey') || null;
  const params = new URLSearchParams({ id: fileId, export: 'download', confirm: GOOGLE.CONFIRM });
  if (resourcekey) params.set('resourcekey', resourcekey);

  return {
    kind: 'binario',
    fileId,
    resourcekey,
    fetchUrl: `${GOOGLE.DESCARGA}?${params.toString()}`,
  };
}

function leerHeader(respuesta, nombre) {
  if (respuesta?.headers?.get) return respuesta.headers.get(nombre);
  return respuesta?.headers?.[nombre] ?? null;
}

function empiezaCon(buffer, firma) {
  return firma.every((byte, index) => buffer[index] === byte);
}

// El orden importa: primero de DÓNDE vino, después qué status trae, y recién al
// final los bytes. Un cliente que sigue redirects recibe la pantalla de login con
// status 200, así que quedarse en el status guarda el HTML de Google como si
// fuera el PDF.
//
// `urlPedida` no está por comodidad: en Electron `respuesta.url` viene vacío, y
// como la URL la construimos nosotros desde el allowlist, usarla de fallback es
// correcto. Lo único que se pierde es enterarse de un redirect, que es justo lo
// que cubren el 401/403 y el sniff de HTML.
function classifyDriveResponse(respuesta, head, { urlPedida = null } = {}) {
  let host;
  try {
    host = new URL(respuesta.url || urlPedida || '').hostname.toLowerCase();
  } catch (_error) {
    return { ok: false, motivo: 'url_invalida' };
  }

  if (host === GOOGLE.HOST_LOGIN) return { ok: false, motivo: 'requiere_sesion' };

  if (host !== GOOGLE.HOST_BINARIO && host !== GOOGLE.HOST_DOCS && !GOOGLE.RE_HOST_EXPORT.test(host)) {
    return { ok: false, motivo: 'host_inesperado' };
  }

  const status = respuesta.status;
  // Lo que devuelve Electron para un restringido, sin seguir el redirect al login.
  if (status === 401 || status === 403) return { ok: false, motivo: 'requiere_sesion' };
  if (status === 404 || status === 410) return { ok: false, motivo: 'no_existe' };
  // 400 = id de archivo subido contra /export. 500 y 416 = id de doc nativo
  // contra el endpoint binario. En los tres casos el id es real: lo que está mal
  // es el endpoint elegido.
  if (status === 400 || status === 416 || status === 500) return { ok: false, motivo: 'tipo_incorrecto' };
  if (status !== 200 && status !== 206) return { ok: false, motivo: `http_${status}` };

  const contentType = String(leerHeader(respuesta, 'content-type') || '').toLowerCase();
  if (contentType.startsWith('text/html')) return { ok: false, motivo: 'html' };

  const buffer = head || Buffer.alloc(0);
  const asomo = buffer.slice(0, 64).toString('latin1').trimStart().toLowerCase();
  if (asomo.startsWith('<!doctype') || asomo.startsWith('<html')) return { ok: false, motivo: 'html' };

  // Los export de texto (csv, markdown, txt) no tienen firma, así que
  // magicConocido informa pero no decide: lo mira quien esperaba un binario.
  return { ok: true, magicConocido: MAGIC.some((firma) => empiezaCon(buffer, firma)) };
}

// Drive manda el nombre en UTF-8 crudo dentro de comillas y SIN el filename* de
// la RFC 5987. Node pelado decodifica los headers como latin1 y el nombre llega
// como "AsignaciÃ³n 02.pdf"; Electron los decodifica bien y llega limpio. Por eso
// la reparación es CONDICIONAL: aplicarla siempre rompe el nombre que ya venía
// bien. El endpoint de docs sí manda filename*, y ese gana cuando está.
// UTF-8 leído como latin1 deja siempre una Ã o Â seguida de un byte de
// continuación. Sin esa marca no hay nada que reparar, y si al reparar aparece un
// carácter de reemplazo es que el texto ya estaba bien.
function repararMojibake(texto) {
  if (!/[\u00c2-\u00c3][\u0080-\u00bf]/.test(texto)) return texto;
  const reparado = Buffer.from(texto, 'latin1').toString('utf8');
  return reparado.includes('\ufffd') ? texto : reparado;
}

function parseContentDisposition(header) {
  const crudo = String(header || '');
  if (!crudo) return '';

  const extendido = crudo.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (extendido) {
    try {
      return decodeURIComponent(extendido[1].trim());
    } catch (_error) {
      return extendido[1].trim();
    }
  }

  const reparado = repararMojibake(crudo);
  const simple = reparado.match(/filename\s*=\s*"([^"]*)"/i) || reparado.match(/filename\s*=\s*([^;]+)/i);

  return simple ? simple[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

// Sesión propia y sin caché. No se usa defaultSession a propósito: ahí viven las
// cookies de iVirtual y CIA, y este pedido tiene que salir anónimo. Mandarle
// cookies a Google no mejora nada y le cuenta al alumno.
function getSesionAnonima() {
  const { session } = require('electron');
  return session.fromPartition(PARTICION, { cache: false });
}

// Baja el archivo en streaming y corta apenas la clasificación dice que no es un
// archivo: una pantalla de login son ~900 KB que no vale la pena terminar de
// bajar, y un link mal clasificado podría ser un video.
async function fetchDrive(fetchUrl, { limiteBytes = LIMITE_BYTES, timeoutMs = TIMEOUT_MS } = {}) {
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const respuesta = await getSesionAnonima().fetch(fetchUrl, {
      signal: controlador.signal,
      // Sin credenciales y sin referer: el endpoint no los pide y mandarlos sólo
      // le da a Google más de lo que necesita.
      credentials: 'omit',
    });

    const lector = respuesta.body?.getReader?.();

    if (!lector) {
      const buffer = Buffer.from(await respuesta.arrayBuffer());
      return terminar(respuesta, buffer, classifyDriveResponse(respuesta, buffer, { urlPedida: fetchUrl }), fetchUrl);
    }

    const trozos = [];
    let total = 0;
    let veredicto = null;

    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;

      const trozo = Buffer.from(value);
      trozos.push(trozo);
      total += trozo.length;

      // La clasificación necesita los primeros bytes; con eso ya se sabe si vale
      // la pena seguir.
      if (!veredicto) {
        veredicto = classifyDriveResponse(respuesta, Buffer.concat(trozos), { urlPedida: fetchUrl });
        if (!veredicto.ok) {
          await lector.cancel().catch(() => {});
          break;
        }
      }

      if (total > limiteBytes) {
        await lector.cancel().catch(() => {});
        return { ok: false, motivo: 'muy_grande', bytes: total, url: respuesta.url || fetchUrl };
      }
    }

    const buffer = Buffer.concat(trozos);
    // Un cuerpo vacío (el 500 de un doc nativo) nunca entra al loop.
    return terminar(respuesta, buffer, veredicto || classifyDriveResponse(respuesta, buffer, { urlPedida: fetchUrl }), fetchUrl);
  } catch (error) {
    const abortado = error?.name === 'AbortError';
    return { ok: false, motivo: abortado ? 'timeout' : 'error_red', mensaje: error?.message || String(error) };
  } finally {
    clearTimeout(reloj);
  }
}

function terminar(respuesta, buffer, veredicto, urlPedida) {
  const url = respuesta.url || urlPedida;

  if (!veredicto.ok) {
    return { ok: false, motivo: veredicto.motivo, bytes: buffer.length, url };
  }

  return {
    ok: true,
    buffer,
    bytes: buffer.length,
    url,
    magicConocido: veredicto.magicConocido,
    nombre: parseContentDisposition(leerHeader(respuesta, 'content-disposition')),
    contentType: String(leerHeader(respuesta, 'content-type') || ''),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function getStoreDir() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'drive-files');
}

function getIndicePath() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'drive-files.json');
}

function indiceVacio() {
  return { schemaVersion: INDICE_VERSION, actualizado: null, archivos: {} };
}

function readIndice() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getIndicePath(), 'utf8'));
    if (parsed?.schemaVersion !== INDICE_VERSION) {
      log(`índice v${parsed?.schemaVersion} descartado (actual v${INDICE_VERSION})`);
      return indiceVacio();
    }
    return parsed;
  } catch (error) {
    if (error?.code !== 'ENOENT') log('error leyendo el índice:', error?.message || error);
    return indiceVacio();
  }
}

// Temp y rename. El MCP lee este archivo desde otro proceso mientras la cola
// escribe, y las otras cachés de la app se bancan lecturas cortadas a fuerza de
// reintentos; acá sale gratis no tener el problema.
function writeIndice(indice) {
  const destino = getIndicePath();
  const parcial = `${destino}.tmp`;

  try {
    fs.writeFileSync(parcial, JSON.stringify(indice, null, 2), 'utf8');
    fs.renameSync(parcial, destino);
  } catch (error) {
    log('no se pudo escribir el índice:', error?.message || error);
  }
}

function safeFileName(nombre) {
  const limpio = String(nombre || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 120);
  return limpio || 'archivo';
}

// El id de Drive es el nombre de la carpeta, así que hay que asegurarse de que
// sea un id y no algo que venga con separadores adentro.
function esFileIdValido(fileId) {
  return /^[A-Za-z0-9_-]{20,}$/.test(String(fileId || ''));
}

// Se escribe a .part y recién se renombra con los bytes ya verificados: si la app
// muere a mitad de la descarga, lo que queda es un .part y no un PDF truncado
// que la próxima corrida daría por bueno.
function guardarArchivo(fileId, nombre, buffer) {
  if (!esFileIdValido(fileId)) throw new Error('fileId inválido');

  const dir = path.join(getStoreDir(), fileId);
  fs.mkdirSync(dir, { recursive: true });

  const destino = path.join(dir, safeFileName(nombre));
  const parcial = `${destino}.part`;

  fs.writeFileSync(parcial, buffer);

  if (fs.statSync(parcial).size !== buffer.length) {
    fs.rmSync(parcial, { force: true });
    throw new Error('el archivo quedó incompleto en disco');
  }

  fs.renameSync(parcial, destino);
  return destino;
}

// El texto va a un sidecar y no al índice: el índice lo lee el MCP entero en cada
// consulta, y dos PDFs de clase ya son ~170.000 caracteres.
async function extraerTexto(fileId, rutaArchivo) {
  const extension = path.extname(rutaArchivo).toLowerCase();
  if (!EXTENSIONES_CON_TEXTO.has(extension)) return null;

  try {
    const { parseSubmission } = require('./activity-analyzer');
    const parsed = await parseSubmission(rutaArchivo);
    const texto = String(parsed?.text || '').trim();
    if (!texto) return null;

    const destino = path.join(getStoreDir(), fileId, 'texto.txt');
    fs.writeFileSync(destino, texto, 'utf8');

    return { ruta: destino, palabras: parsed?.wordCount ?? texto.split(/\s+/).filter(Boolean).length };
  } catch (error) {
    // Un PDF escaneado no tiene texto extraíble. El archivo sigue siendo bueno:
    // el alumno lo abre igual, sólo que el modelo no lo puede leer.
    log(`sin texto extraíble para ${fileId}:`, error?.message || error);
    return null;
  }
}

function leerTexto(entrada) {
  if (!entrada?.textoRuta) return '';

  try {
    return fs.readFileSync(entrada.textoRuta, 'utf8');
  } catch (_error) {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Resolución
// ---------------------------------------------------------------------------

function ahora() {
  return new Date().toISOString();
}

async function resolverUno(url, { formato } = {}) {
  const normalizado = normalizeDriveLink(url, { formato });

  if (normalizado.kind === 'no_es_archivo') {
    return { estado: 'no_es_archivo', motivo: normalizado.motivo, url, fileId: null };
  }

  const { fileId, fetchUrl, kind } = normalizado;
  const bajada = await fetchDrive(fetchUrl);

  if (!bajada.ok) {
    const estado = estadoDeFallo(bajada.motivo);

    return { estado, motivo: bajada.motivo, mensaje: bajada.mensaje || null, url, fileId, fetchUrl, kind };
  }

  // Un binario sin firma conocida no es lo que el portal reparte. Se rechaza en
  // vez de guardarlo: lo que sigue lo abre el alumno con doble click.
  if (kind === 'binario' && !bajada.magicConocido) {
    return { estado: 'tipo_rechazado', motivo: 'sin_firma_conocida', url, fileId, fetchUrl, kind };
  }

  const nombre = bajada.nombre || `${fileId}${kind === 'documento' ? '.pdf' : ''}`;
  const ruta = guardarArchivo(fileId, nombre, bajada.buffer);
  const texto = await extraerTexto(fileId, ruta);

  return {
    estado: 'ok',
    url,
    fileId,
    fetchUrl,
    kind,
    nombre: path.basename(ruta),
    ruta,
    bytes: bajada.bytes,
    contentType: bajada.contentType,
    textoRuta: texto?.ruta || null,
    palabras: texto?.palabras || 0,
  };
}

// Cola con concurrencia acotada. No usa Promise.all sobre todo el lote: 40
// descargas en paralelo no las agradece nadie, y la app tiene que seguir usable
// mientras corre.
async function correrCola(tareas, { concurrencia = CONCURRENCIA, onProgress = null } = {}) {
  const resultados = new Array(tareas.length);
  let proxima = 0;
  let hechas = 0;

  const obrero = async () => {
    for (;;) {
      const indice = proxima;
      proxima += 1;
      if (indice >= tareas.length) return;

      try {
        resultados[indice] = await tareas[indice]();
      } catch (error) {
        resultados[indice] = { estado: 'error_red', motivo: 'excepcion', mensaje: error?.message || String(error) };
      }

      hechas += 1;
      onProgress?.({ done: hechas, total: tareas.length, resultado: resultados[indice] });
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrencia, tareas.length) }, obrero));
  return resultados;
}

// Progreso a todas las ventanas: esto sale de una cola de fondo que arranca sola
// después del scrape, así que no hay un `event` del que colgarse.
function emitirProgreso(payload) {
  try {
    const { BrowserWindow } = require('electron');
    for (const ventana of BrowserWindow.getAllWindows()) {
      if (!ventana.isDestroyed()) ventana.webContents.send('drive:progress', payload);
    }
  } catch (_error) {
    // Sin ventanas (tests, sync desde el MCP) el progreso no le importa a nadie.
  }
}

function juntarLinks(actividades) {
  const porFileId = new Map();

  for (const actividad of actividades || []) {
    for (const enlace of actividad.enlaces || []) {
      if (enlace?.tipo !== 'google') continue;

      const normalizado = normalizeDriveLink(enlace.url);
      if (normalizado.kind === 'no_es_archivo') continue;

      // El mismo PDF puede estar linkeado desde dos actividades. El id de Drive
      // es la clave, no el id de la actividad: los ids de actividad son
      // posicionales y se renumeran cuando el profe agrega una tarea.
      const previo = porFileId.get(normalizado.fileId);
      if (previo) {
        if (!previo.actividades.includes(actividad.id)) previo.actividades.push(actividad.id);
        // Dos actividades pueden linkear el mismo PDF con URLs distintas (una con
        // ?usp=sharing y otra con ?usp=drive_link). Se guardan las dos: la UI casa
        // enlace con archivo por string porque no puede importar este módulo.
        if (!previo.urls.includes(enlace.url)) previo.urls.push(enlace.url);
        continue;
      }

      porFileId.set(normalizado.fileId, {
        fileId: normalizado.fileId,
        url: enlace.url,
        urls: [enlace.url],
        etiqueta: enlace.texto || '',
        actividades: [actividad.id],
      });
    }
  }

  return [...porFileId.values()];
}

function hayQueResolver(entrada, { forzar = false } = {}) {
  if (forzar) return true;
  if (!entrada) return true;
  // Ya resuelto: sólo se vuelve a pedir si el archivo se borró del disco.
  if (entrada.estado === 'ok') return !fs.existsSync(entrada.ruta || '');
  if (ESTADOS_TERMINALES.has(entrada.estado)) return false;
  return (entrada.intentos || 0) < MAX_INTENTOS;
}

// Arranca DESPUÉS de que el scrape resolvió y escribió su caché. Nunca adentro.
//
// No es preferencia: el pool de páginas de detalle se crea una vez y se cierra al
// final sin reparación entre chunks, y el re-throw que debería hacer explotar un
// error ahí adentro es inoperativo porque withTimeout hace resolve(null) para
// todo lo que no sea un timeout. Un fetch lento adentro de un chunk no pierde una
// actividad: envenena un slot del pool y tira en silencio una de cada cinco
// actividades restantes. Además runScrape corre contra un timeout global que, al
// vencer, devuelve error SIN escribir la caché.
async function resolveLinksForActivities(actividades, { forzar = false, onProgress = null } = {}) {
  const pendientes = juntarLinks(actividades);
  if (pendientes.length === 0) return { ok: true, resueltos: 0, total: 0 };

  const indice = readIndice();
  const aResolver = pendientes.filter((link) => hayQueResolver(indice.archivos[link.fileId], { forzar }));

  if (aResolver.length === 0) return { ok: true, resueltos: 0, total: pendientes.length };

  log(`${aResolver.length} de ${pendientes.length} links por resolver`);

  const avisar = (payload) => {
    emitirProgreso(payload);
    onProgress?.(payload);
  };

  const resultados = await correrCola(
    aResolver.map((link) => async () => {
      const resultado = await resolverUno(link.url);
      return { ...resultado, actividades: link.actividades, urls: link.urls, etiqueta: link.etiqueta };
    }),
    {
      onProgress: ({ done, total, resultado }) => avisar({
        done,
        total,
        fileId: resultado?.fileId || null,
        nombre: resultado?.nombre || null,
        estado: resultado?.estado || 'error_red',
      }),
    },
  );

  // Una sola escritura del índice, al final y atómica: la cola es el único
  // escritor de este archivo y no tiene sentido pelearse consigo misma.
  const fresco = readIndice();

  for (const resultado of resultados) {
    if (!resultado?.fileId) continue;

    const previo = fresco.archivos[resultado.fileId];
    fresco.archivos[resultado.fileId] = {
      ...resultado,
      actividades: resultado.actividades || previo?.actividades || [],
      urls: [...new Set([...(previo?.urls || []), ...(resultado.urls || [resultado.url])])].filter(Boolean),
      intentos: resultado.estado === 'ok' ? 0 : (previo?.intentos || 0) + 1,
      actualizado: ahora(),
    };
  }

  fresco.actualizado = ahora();
  writeIndice(fresco);

  const resueltos = resultados.filter((r) => r?.estado === 'ok').length;
  log(`${resueltos} de ${aResolver.length} resueltos`);

  return { ok: true, resueltos, total: pendientes.length };
}

function getCachedDriveFiles() {
  return readIndice();
}

// Lo que la UI y el MCP necesitan de una actividad, sin releer el índice por
// cada enlace.
function getDriveFilesForActivity(actividad, indice = null) {
  const datos = indice || readIndice();

  return (actividad?.enlaces || [])
    .filter((enlace) => enlace?.tipo === 'google')
    .map((enlace) => {
      const normalizado = normalizeDriveLink(enlace.url);
      if (normalizado.kind === 'no_es_archivo') {
        return { url: enlace.url, etiqueta: enlace.texto || '', estado: 'no_es_archivo', motivo: normalizado.motivo };
      }

      const entrada = datos.archivos[normalizado.fileId];
      if (!entrada) return { url: enlace.url, etiqueta: enlace.texto || '', fileId: normalizado.fileId, estado: 'pendiente' };

      return { ...entrada, url: enlace.url, etiqueta: enlace.texto || entrada.etiqueta || '' };
    });
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerDriveHandlers() {
  const { ipcMain } = require('electron');

  ipcMain.handle('drive:get-cached', async () => ({ ok: true, data: readIndice() }));

  // Promoción por click: el alumno abre una actividad y sus archivos se van al
  // frente de la cola en vez de esperar el turno del lote.
  ipcMain.handle('drive:resolve', async (_event, payload = {}) => {
    const urls = Array.isArray(payload.urls) ? payload.urls : [];
    if (urls.length === 0) return { ok: false, error: 'NO_URLS' };

    const actividades = [{ id: payload.actividadId || null, enlaces: urls.map((url) => ({ url, tipo: 'google' })) }];
    const resultado = await resolveLinksForActivities(actividades, { forzar: Boolean(payload.forzar) });

    return { ...resultado, data: readIndice() };
  });

  ipcMain.handle('drive:read-text', async (_event, fileId) => {
    const entrada = readIndice().archivos[String(fileId || '')];
    if (!entrada) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, texto: leerTexto(entrada), nombre: entrada.nombre || null };
  });
}

module.exports = {
  ESTADOS_TERMINALES,
  GOOGLE,
  classifyDriveResponse,
  fetchDrive,
  getCachedDriveFiles,
  getDriveFilesForActivity,
  getIndicePath,
  getStoreDir,
  juntarLinks,
  hayQueResolver,
  leerTexto,
  normalizeDriveLink,
  parseContentDisposition,
  readIndice,
  registerDriveHandlers,
  resolveLinksForActivities,
  safeFileName,
};
