# CLAUDE.md — DVPotro (scraper-app)

@AGENTS.md

---

## Overrides sobre `~/.claude/CLAUDE.md` global

Este proyecto **no sigue** el stack default de mi CLAUDE.md global. Tenerlo presente
antes de escribir código:

- **JavaScript (JSX), no TypeScript.** No inventar `.ts`/`.tsx` ni tipos — mantener `.jsx` y `.js` como está.
- **React 18** (no 19). Sin `use()`, sin Server Components, sin `"use client"`.
- **Tailwind 3** (no 4). Sintaxis clásica `@tailwind base/components/utilities`, no `@import "tailwindcss"`.
- **Sin React Query.** State propio en `App.jsx` + `SidebarContext` / `ThemeContext`.
- **CommonJS en Electron main** (`"type": "commonjs"` en `package.json`). Renderer es ESM via Vite.

Lo que **sí aplica** del global:
- Early returns, `error → loading → empty → data` en componentes con datos.
- Try/catch en async handlers (scrapers, IPC calls) con toast/notificación en el catch.
- No emojis en UI. Iconos vía `lucide-react`.
- No comentarios de "qué" — solo "por qué" no-obvio.

---

## Comandos exactos

```bash
npm install                            # Deps
npx playwright install chromium        # Chromium para Playwright (una vez)
npm start                              # Vite + Electron en paralelo (dev)
npm run dev                            # Solo Vite renderer
npm run electron                       # Solo Electron main
npm run build                          # Build Vite (dist/)
npm run dist                           # Build + electron-builder (NSIS + portable → release/)
npm run dist:dir                       # Build sin empaquetar instalador (dir/)
npm run report                         # Genera reporte incremental en reports/

npm run test:clasificacion             # Estados pendiente/retrasada/cerrada (ventana de entrega)
npm run test:fechas                    # Parseo de fechas ES/EN, main y renderer en sincronía
npm run test:extraccion                # Enlaces, tablas y rúbrica contra un DOM real (Playwright)

npm run test:drive                     # Normalización y clasificación de links de Drive (sin red)
npm run test:drive:red                 # Descarga real contra ids reales, DENTRO de Electron (con red)
npm run test:drive:llm                 # El texto del PDF llegando al prompt y al extractor de requisitos
npm run test:mcp-drive                 # El MCP sirviendo lo resuelto (JSON-RPC contra el server real)
npm run test:clase                     # Grabación de clase punta a punta DENTRO de Electron.
                                       # Con AUDIO_PRUEBA=<mp4> reproduce audio real y verifica la transcripción
npm run test:mcp-entrega               # Defensas y ensayo de dvpotro_entregar (no sube nada)
npm run drive:resolve                  # Corre la cola de Drive una vez contra la caché real
```

Node **20+**, npm **10+**.

---

## Servidor MCP (`mcp/dvpotro-mcp.js`)

Expone la caché de la app a Claude Code. Registrado en dos lados: en `.mcp.json` del repo
(para quien lo clone) y a **nivel usuario** en `~/.claude.json`, que es lo que lo hace
cargar desde cualquier carpeta. `REPO` se resuelve con `__dirname`, así que el `cwd` de la
sesión no importa.

**Cuando la pregunta es sobre datos académicos —qué actividades hay, qué vence, horario,
calificaciones, material, asistencia— usar las tools `mcp__dvpotro__*`, no leer los JSON
a mano.** Para eso existe el server: `actividades-cache.json` son ~300 KB (unos 75.000
tokens) y volcarlo entero quema la ventana de contexto. El valor del server es FILTRAR.

### Arquitectura

- **Sin dependencias.** Habla JSON-RPC 2.0 por stdio a mano, delimitado por `\n`. Meter el SDK oficial (ESM) en un proyecto CommonJS costaba más que las ~60 líneas de transporte.
- **Lee los JSON de `userData` directo**, no habla con la app por IPC ni HTTP. Un puerto abierto con la matrícula y las calificaciones del alumno detrás no agrega ningún dato y sí agrega superficie. Por stdio no hace falta que la app esté corriendo.
- **`stdout` está secuestrado** al arrancar: es el canal del protocolo y un solo `console.log` ajeno corrompe la sesión. El `write` real se guarda para `enviar()` y todo lo demás se redirige a stderr. Si agregás código que loguea, ya está cubierto — pero no escribas a stdout a propósito.
- **`readJson` reintenta 3 veces.** El `writeJson` de la app no es atómico; si sincroniza justo mientras leemos agarramos un JSON cortado.
- **`SCHEMA`** declara qué versión de cada caché sabe leer. Si bumpeás `schemaVersion`/`version` en un handler, **actualizá también `SCHEMA`** o el server empieza a avisar que puede faltar información.
- **`DVPOTRO_USER_DATA`** pisa la ruta de `userData` — sirve para probar contra un sandbox sin tocar la instalación real.

### Qué escribe cada tool

La mayoría solo lee caché. Las que hacen algo más, en orden de qué tan lejos llegan:

- **Caché local**: `dvpotro_nota_crear`, `dvpotro_ocultar` y `dvpotro_marcar_leidas`
  escriben JSON en `userData` y no salen a la red. `dvpotro_marcar_leidas` es la única
  escritura EN LOTE del server — un filtro toca decenas de items de una llamada — así
  que exige criterio y `confirmar:true`, y se niega a marcar todo.
- **Bajan archivos**: `dvpotro_adjuntos` y `dvpotro_material_leer`.
- **Refrescan caché saliendo al portal**: `dvpotro_sync`.
- **Escriben en el PORTAL**: `dvpotro_entregar` y `dvpotro_quitar_archivo`, y nada más.

Las que salen a la red cargan los handlers de Electron en Node pelado con un `electron`
de mentira:

- **`dvpotro_sync`** corre el scrape y refresca la caché. Tiene lista blanca de módulos —
  **nunca** se arma un nombre de función con lo que mandó el cliente.
- **`dvpotro_adjuntos`** inicia sesión en iVirtual y baja los adjuntos de una actividad —y
  las imágenes de la consigna, a `imagenes/`— a `userData/adjuntos/<idActividad>/`. Las
  URLs salen de la caché, nunca del cliente: la tool recibe un id de actividad, no una URL.
  Moodle contesta la pantalla de login con **200**, así que se verifica que el cuerpo no
  empiece con HTML antes de guardarlo, o el login se archivaría con extensión `.docx`.
  Las imágenes se numeran al guardarlas: Moodle llama `blobid0.png` a todas las que se
  pegan en el editor, así que sin el índice la segunda pisa a la primera.

- **`dvpotro_entregar`** consulta qué pide una actividad y, con permiso explícito, sube
  el archivo. Es la **única tool que escribe en el portal** y está aislada al final del
  archivo, fuera de `SINCRONIZABLES`, para que ningún sync pueda terminar entregando.
  **No reimplementa la subida**: delega en `electron/handlers/assignment-upload.js`, el
  mismo camino que usa la card de Actividades. Es un wrapper a propósito — dos
  implementaciones del mismo POST contra un portal frágil divergen apenas Moodle cambia
  algo. Sus defensas: sin `archivo` solo informa (formatos, tope, cantidad, ventana);
  con `archivo` valida contra el formulario REAL y no sube; `confirmar:true` es lo único
  que escribe; y el cmid sale de la caché por id de actividad, nunca del cliente.
  **Se serializa con `enFila()`**: el transporte despacha los `tools/call` en paralelo a
  propósito, pero el handler guarda una sola `page` a nivel módulo porque lo pensaron
  para los clicks secuenciales de la UI. Dos entregas simultáneas manejarían la misma
  pestaña, y el `closeSession` de la que termina primero le cierra el navegador a la otra
  en pleno guardado.

- **`dvpotro_material_leer`** abre un recurso de material. Son tres caminos y no una
  abstracción porque cada tipo se lee distinto: la `pagina` ya trajo su texto en el
  scrape, la `carpeta` cuelga de `pluginfile.php` y necesita la cookie, y el `drive` pasa
  por la cola de `drive.js`. Medido sobre la caché real: de 34 recursos, 19 son Drive,
  1 es la carpeta con los PDF de clase y 3 son páginas.

- **`dvpotro_quitar_archivo`** saca un archivo de una entrega. Va en la MISMA cola
  `enFila()` que `dvpotro_entregar` — no una propia — porque comparten la única `page`
  de `assignment-upload.js`. Se niega si la actividad ya tiene nota, y si es el único
  archivo avisa que la entrega queda VACÍA pero marcada como enviada, que es peor que
  no haber entregado.

Todas llaman `prepararHandlers()` **antes** de chequear credenciales: esa función es la
que carga el `.env`, y al revés las credenciales siempre parecen faltar.

Regla dura: **la asistencia jamás se marca sola.** `markAttendance` no se referencia en
ningún lado de ese archivo, a propósito. Sincronizar sigue siendo traer, nunca mandar:
lo único que sale hacia el portal es `dvpotro_entregar`, y solo cuando se lo pide
explícitamente con `confirmar:true`.

#### Un error de acceso no es evidencia de que la caché esté mal

`buildScrapeError()` en `scraper.js` borraba `actividades-cache.json` en TODOS sus
caminos — `NO_INTERNET`, `LOGIN_FAILED`, `NO_CREDENTIALS`, `NO_USER`, `NO_PASSWORD`, el
timeout global — y ninguno de esos dice "lo cacheado es falso": dicen "no pude entrar".
Un sync fallido dejaba al alumno sin el archivo del que viven actividades, agenda,
materias, búsqueda y novedades. En la app el daño se disimulaba porque hay alguien
mirando que vuelve a sincronizar; por MCP la sesión se queda ciega, en silencio y sin la
app abierta para recuperarse. Para limpiar a propósito está `scraper:clear-cache`.

#### El `electron` de mentira miente de más

El fake de `prepararHandlers()` hay que ampliarlo cada vez que un handler nuevo toca una
API de Electron que no está. Dos casos ya encontrados, los dos silenciosos:

- **`session.fromPartition`**: `drive.js` baja los PDF de Drive con
  `session.fromPartition(...).fetch()`. Sin ventana esa API no existe, la llamada tiraba
  y la cola archivaba TODO Drive como `error_red`: el MCP nunca pudo resolver un enlace
  de Drive, ni para material ni para consignas. De esa sesión solo se usa `fetch`, y el
  global de Node cumple el mismo contrato.
- **`nativeImage`**: `portal-sistemas.js` lo usa para achicar la foto del alumno ANTES de
  guardar el perfil, así que sin el doble el scrape tiraba justo antes de
  `writeProfileCache` y se perdían también nombre, matrícula y correo. El doble devuelve
  un JPEG vacío y el guard propio del handler deja la foto en null y sigue.

El patrón común: el handler falla en una línea cosmética y se lleva puesto el dato útil
que ya tenía leído. Cuando un módulo nuevo no anda por MCP, mirar primero qué destructura
de `require('electron')`.

#### Trampas del DOM de Moodle que ya costaron caro

Ninguna se ve sin probar contra el portal real, y las tres daban **falsos resultados
sobre entregas válidas**:

- **La página trae ~14 bloques `M.form_filemanager.init` y 12 son del editor de texto.**
  Quedarse con el primero hace creer que la entrega solo acepta imágenes
  (`.gif/.jpg/.png/.svg`) y rechaza PDFs que el portal sí acepta. `readSubmissionForm`
  recorre las llaves con conciencia de strings para agarrar el bloque correcto.
- **El filemanager se monta por JS y esperar un tiempo fijo no alcanza.** Con 1500 ms
  la PRIMERA actividad del proceso seguía en `fm-loading` y `archivosEnBorrador` salía
  vacío aunque la entrega tuviera archivos; `validateFiles` concluía que había lugar con
  `maxfiles=1` ya ocupado. Por eso existe `waitForSubmissionForm()`: espera
  `.filemanager:not(.fm-loading)`. Una actividad cerrada no monta filemanager, así que
  ahí el timeout es el camino normal y no un error.
- **No todo `pluginfile.php` de la página es del alumno.** Los adjuntos que el profesor
  colgó de la consigna viven en `/mod_assign/introattachment/`; la entrega vive en
  `/assignsubmission_file/submission_files/`. `readSubmissionStatus` usa esa lista como
  ÚNICA prueba de que la subida entró, así que barrer toda la página hacía pasar por
  entrega buena un "Save changes" que no persistió — con la plantilla del profe y la
  entrega llamándose parecido, que es el flujo normal. Se filtra por el componente de la
  URL y **no** por el rótulo de la fila: el rótulo es traducible y un filtro por texto
  contra un portal en otro idioma devuelve vacío y frena una entrega válida.
- **Subir un archivo con un nombre que ya está entregado lo PISA.** `attachSingleFile`
  confirma el diálogo de Moodle con Overwrite, y ahí el archivo anterior no se recupera.
  Nombre nuevo suma, nombre repetido destruye: son dos operaciones distintas y la tool
  las distingue antes de pedir confirmación.
- **"Add submission" no es un enlace.** Es el botón de un `<form method=get>` con
  `action=editsubmission` en un hidden; `a[href*=editsubmission]` devuelve siempre vacío.
  La señal de que se puede entregar es que el formulario rinda — `puedeEntregar` se
  resuelve mirando si hay un botón "Save changes", no comparando contra la fecha límite,
  que no contempla prórrogas del profesor.

`isPackaged: true` en el `app` falso **no es cosmético**: `settings.js:getEnvFilePath()`
lo consulta, y con `undefined` el scrape de horario termina reescribiendo el `.env` del
repo — el archivo con todas las claves.

### Cómo testearlo

Spawneá el proceso y hablale JSON-RPC (`initialize` → `tools/list` → `tools/call`).
**No hagas `require()` del archivo**: arranca el listener de stdin y cuelga el proceso.

---

## Clase en vivo (`electron/handlers/clase.js` + `electron/clase/daemon.py`)

Graba lo que suena en la máquina durante una clase y lo deja transcrito en
`userData/clase/<sesion>/`. Existe por un caso real: el 2026-09-14 la profesora dictó la
consigna completa de viva voz y la actividad quedó en iVirtual **sin consigna publicada**.
El scraper no puede leer lo que nadie escribió.

El reparto es: Electron maneja el ciclo de vida de la sesión y las capturas de pantalla;
Python hace la captura de audio y la transcripción, porque faster-whisper es ctranslate2
y el único equivalente en Node implicaría mandar el audio de la clase a un servicio ajeno.
La transcripción **no pasa por IPC**: el daemon la escribe a `transcript.jsonl` y todos
—handler, UI y servidor MCP— la leen de ahí. Si la app se cierra en medio de la clase el
daemon sigue grabando; si el daemon muere, lo transcrito ya está en disco.

### No se empaqueta un Python

ctranslate2 y los modelos son cientos de MB y la mayoría no va a usar este módulo. El
handler busca un intérprete que ya tenga `faster_whisper`, `pyaudiowpatch` y `numpy`, en
este orden: `DVPOTRO_PYTHON`, lo guardado en `clase/config.json`, `~/.dvpotro/whisper-venv`,
`~/.claude/tools/whisper-venv`, y `python` del PATH. Si no encuentra ninguno, la UI explica
qué instalar en vez de tirar un ImportError. **Python 3.12**: ctranslate2 no publica wheels
para las versiones más nuevas.

### Elegir modelo es LA decisión de rendimiento del módulo

Todo lo demás es ruido al lado de whisper. Medido sobre 120 s de clase real en el
Ryzen 5 7520U (4 físicos / 8 lógicos), con `vad_filter` activo:

| modelo | 4 hilos | 8 hilos |
|---|---|---|
| tiny | RTF 0.04 | 0.04 |
| small | **0.20** | 0.22 |
| base | 0.21 | 0.36 |
| medium | 0.59 | 0.63 |

Tres cosas que salen de ahí y que están cableadas en el código:

- **`small` en vivo, no `medium`.** Con 1.7x de margen, `medium` se atrasa apenas
  Teams y la app aprietan el CPU, y desde ahí no se recupera: la cola crece sola.
  `small` da 4.9x. La diferencia de calidad entre los dos es modesta —los dos
  fallan con los nombres propios— y no justifica perder el margen.
- **Más hilos es MÁS LENTO.** `cpu_threads` va a los núcleos físicos: ctranslate2
  se pelea consigo mismo con los hilos SMT, y de paso los deja libres para la
  captura, que es lo único que no puede esperar. Ver `hilos_por_defecto()`.
- **La calidad se recupera después, no en vivo.** `--retranscribir` vuelve a pasar
  el `audio.wav` con el modelo que se quiera, archivando la versión en vivo como
  `transcript-vivo.jsonl`. Ahí el reloj no importa.

No hace falta saltear el silencio a mano: `vad_filter` ya lo descarta casi gratis
(RTF 0.031 sobre silencio puro, 0.003 sobre ruido de sala).

### Lo que NO vale la pena optimizar

Medido, para no volver a intentarlo:

- **La conversión de audio cuesta 1.5 ms por segundo de audio** — 0.15% de un
  núcleo. Ya está en numpy y con `CHUNK=4096`; más allá de eso no hay nada.
- **`wave.writeframes` vs `writeframesraw`**: 0.238 contra 0.069 ms por segundo de
  audio. Ahorra 0.017% de un núcleo y obliga a usar API privada para parchear la
  cabecera a mano. No se hace.

### Lo que sí crecía con la duración de la clase

Era el único costo que empeoraba cuanto más larga la clase, y se notaba justo al
final, que es cuando dictan la tarea:

- **`leerTranscript` acepta `desdeByte`** y devuelve `siguienteByte`. La UI
  refresca cada 5 s: sin offset, una clase de 2 h releía y re-parseaba ~1.750
  líneas / 210 KB unas 1.440 veces. El corte se hace en el último salto de línea
  completo, porque el daemon puede estar escribiendo justo ahí.
- **`estado()` ya no cuenta líneas leyendo el archivo.** La cuenta se acumula de
  los eventos `tramo`, que ya la traen.
- **Las capturas de pantalla se deduplican** contra una firma de 32x18 en gris
  (`firmaDe` / `bastanteDistinta`). Una pantalla quieta no deja archivo: en la
  prueba, 5 de 6 tics se descartaron. Sin esto, 2 h dejaban ~600 JPEG y 28 MB de
  la misma lámina.
- **`dvpotro_clase` sin filtros y con la clase en curso devuelve los últimos 10
  minutos**, no todo. La pregunta en ese momento es siempre "qué acaba de decir":
  medido sobre una clase de 2 h simulada, 3.100 tokens en vez de 9.700.

### Los bugs que ya costaron caro

Los tres terminaban igual — **audio faltante y CERO errores**. El wav salía corto y no se
notaba hasta escucharlo, que en una clase significa perder minutos enteros.

- **Convertir el audio en Python puro no le gana al tiempo real.** A 48 kHz estéreo son
  96.000 iteraciones por segundo de audio: el proceso tardaba más en convertir un bloque
  que lo que ese bloque duraba, PyAudio descartaba lo que no se leía a tiempo y 70 s
  entraban como 15. Por eso `a_mono_16k` es numpy y no un bucle.
- **`import numpy` perezoso pelea el lock de módulo con `faster_whisper`.** El hilo
  principal quedaba esperando a que el hilo del transcriptor terminara de importar, y
  entre `iniciado` y la primera lectura de audio pasaban entre 8 y 20 segundos — justo los
  segundos en que el profesor dice de qué se trata la clase. numpy va importado **arriba
  del archivo**, y el stream se abre **antes** de arrancar el transcriptor.
- **Un cliente de loopback invalidado sigue contestando `is_active() == True`.** Cuando el
  endpoint queda ocioso y otra app lo engancha, Windows lo reinicializa y el loopback deja
  de entregar sin excepción ni aviso. De ahí salen dos defensas: el stream de silencio de
  `_mantener_despierto()` (que parece no hacer nada y no es opcional) y `mudo()`, que
  decide por ausencia de bloques y **no** por `is_active()`.

El daemon se auto-vigila: cada 5 s compara audio capturado contra reloj y emite
`audio_faltante` si se quedó atrás. Es la única señal que agarra a toda esa familia de bugs.

### Se para por stdin, no con kill

En Windows `proceso.kill()` es `TerminateProcess` y el daemon no llega a transcribir el
último tramo — justo donde el profesor dicta la tarea. El handler le escribe `parar` por
stdin y espera hasta 90 s; el kill queda de último recurso. `detenerAlSalir()` cuelga de
`will-quit` porque un daemon huérfano sigue grabando sin forma de pararlo desde la UI.

### Unir sesiones (`fusionar`)

Una clase cortada por un receso deja dos carpetas. `fusionar` pega la de después a la
de antes: corre `inicio`/`fin` del transcript por el desfasaje de reloj entre las dos,
copia las capturas renombradas con ese offset, guarda el wav como `audio_parteN.wav`
(sin reencodear) y anota todo en `meta.partes`. Recién con eso escrito borra la extra.
Tres cosas que parecen detalles y no lo son:

- **`reloj` NO se desplaza.** Es la hora de pared absoluta (epoch) en que se dijo la
  frase; sumarle el offset la corría la duración entera de la primera parte, y el
  "último audio" del MCP mentía por una hora.
- **Una sesión unida no se re-transcribe.** El daemon rehace `transcript.jsonl` desde
  `audio.wav` solo, y borraría en silencio el texto de las otras partes. `retranscribir`
  se niega; hay que re-transcribir cada parte ANTES de unirlas.
- **"Grabando" no es `activo`.** Si la app se reinicia a mitad de clase, el daemon sigue
  escribiendo y `activo` es null. `sigueGrabando()` decide por la frescura del wav y del
  transcript (120 s), que además deja borrar o unir una sesión que murió sucia y quedó
  en "grabando" para siempre.

### La UI (`src/pages/ClaseEnVivo.jsx` + `src/pages/clase/`)

`ClaseEnVivo.jsx` tiene el estado y las acciones; cada pieza visual vive en `clase/`, un
componente por archivo, y `clase/formato.js` concentra lo que no es React (agrupar por
día, sugerir uniones, buscar sin acentos). Para trabajarla en el navegador, `dev-mock.js`
trae un `clase` falso con la clase cortada en tres partes que motivó la organización.

- **La lista se organiza sola:** por día, con filtro por materia (tabs con subrayado) y
  buscador cuando pasa de 6 grabaciones. Dos grabaciones del mismo día con menos de 45 min
  de pausa y sin materias que se contradigan muestran "¿Es la misma clase? Unir".
- **Todo overlay pasa por `clase/Dialogo.jsx`:** foco adentro al abrir, Tab atrapado, Esc
  cierra, y el foco vuelve a quien lo abrió. Un `<div>` suelto con `onClick` en el fondo no
  cumple con nada de eso.
- **El profesor de CIA viene en `instructor`, no en `profesor`.** Leer solo `profesor`
  dejaba vacío al profe en `claseActual()` y en el selector de materia.
- **`divide-y` no sirve en este repo:** no hay color de borde por defecto en
  `tailwind.config.js` y pinta un gris fijo que no sigue el tema. Los separadores van con
  `border-t` + `borderColor: var(--border-subtle)`.

### Al testear

`npm run test:clase` corre **dentro de Electron** (`desktopCapturer`, `screen` y
`app.getPath` no existen fuera). Dos trampas que ya mandaron a buscar el bug al lugar
equivocado, las dos del banco de pruebas y no del código:

- **`ffplay` spawneado se cierra a los ~1.2 s** sin importar qué se haga con su stdio. El
  test extrae un wav con ffmpeg y lo reproduce con `SoundPlayer.PlaySync()`, que sí bloquea.
- **El offset de extracción sale de la duración real del archivo**, medida con ffprobe.
  Estaba fijo en 300 s contra una grabación de 136: ffmpeg escribía un wav de 78 bytes, no
  sonaba nada, y la cobertura de audio fallaba por falta de audio que reproducir.

La cobertura se mide contra el reloj de la grabación tomado **antes** de `detener()`:
`meta.fin` se sella recién cuando termina de volcarse el último tramo, hasta 40 s después
de que la captura paró.

---

## Puntos de dolor específicos del proyecto

### Scraping (Playwright)
- iVirtual (Moodle) y CIA (PeopleSoft) son **portales legacy con DOM frágil**. Cualquier scraper (`electron/handlers/scraper.js`, `horario.js`, `cia.js`) debe:
  - Manejar timeouts explícitos (no confiar en defaults de Playwright).
  - Loggear en consola cuando un selector falla — no morir silencioso.
  - Devolver estructura consistente al renderer aunque falte data (`{ ok: false, error, data: null }`).
- El scraper de horario (`horario.js`) tiene **múltiples capas de búsqueda** para detectar enlaces de videollamada (DOM, recursos Moodle, foros). Preservar todas las capas al modificar.

### IPC + preload bridge
- `electron/preload.js` expone `window.scraperApp` — **nunca** llamar `ipcRenderer` directamente desde React. Toda comunicación main ↔ renderer pasa por `window.scraperApp.*`.
- Handlers en `electron/handlers/` se registran en `electron/main.js`. Agregar handler nuevo = registrar en main + exponer en preload.

### Credenciales
- `.env` local con `IVIRTUAL_USER`, `IVIRTUAL_PASS`, `CIA_USER`, `CIA_PASS`.
- En prod (empaquetado) las credenciales las gestiona `settings.js` desde la UI de Ajustes — no `.env`.
- **Nunca** commitear `.env`, nunca imprimir credenciales en logs.

### Distribución
- appId `mx.itson.dvpotro`, productName `DVPotro`.
- GitHub Releases: `orsted118/Scrap-Its` (repo remoto ≠ nombre local `scraper-app`).
- `electron-updater` chequea auto-updates. Si toco `main.js`, verificar que el flow de updater sigue registrado.

---

## Convenciones del proyecto

### Componentes React (`src/components/`, `src/pages/`)
- Un componente por archivo, `PascalCase.jsx`.
- Estado local → `useState`. Estado compartido cross-page → contextos (`SidebarContext`, `ThemeContext`) o lift a `App.jsx`.
- Loading/error/empty **por página**, no en `App.jsx`.

### Estilos
- **Design system con tokens `var(--*)`** para structural (radius, fonts, shadow, border-width) y color (theme-dependent). Ver "Diseño visual" abajo. Usar SIEMPRE tokens — cero hardcoded, cero `rounded-*`/`shadow-*`/`font-mono` de Tailwind.
- Tailwind 3 utility-first **solo para layout** (flex, grid, spacing, sizing, positioning). NO para radius/shadow/font/color.
- Structural tokens definidos en `:root` de `src/index.css`. Color tokens seteados por `ThemeContext.jsx` por tema.

### Reports (`reports/`)
- `npm run report` genera diff por archivo del cambio actual. Correr **antes** de commits grandes para tener historial de cambios visuales/estructurales.
- No borrar reports viejos; son bitácora del proyecto.

---

## Diseño visual

DVPotro adoptó **Swiss Noir** como sistema visual (post-rediseño Julio 2026). Los principios del md global (`~/.claude/design-preferences.md`) **sí aplican** — tipografía como diseño, alto contraste sin punto medio, geometría honesta con hairlines, un acento único (vermillion `#FF3D00`), restricción deliberada.

Sigue siendo app utilitaria para estudiantes, no landing: priorizar densidad de información sobre statement typographic. Hero display solo donde comunica jerarquía (empty states, section titles, "ahora suena"). Mono tabular en cualquier data tabular (durations, IDs, timestamps).

### Arquitectura de tokens

Structural (invariantes, `:root` global): `--font-display`, `--font-body`, `--font-mono`, `--radius-card`/`--radius-button`/`--radius-badge` (todos `0px`), `--shadow-card` (`none`), `--border-width-card` (`1px`).

Color (por tema, `ThemeContext.jsx`): `--bg*`, `--border*`, `--accent*`, `--text*`, palettes por estado.

### Lenguaje semántico establecido

- `border-left 3px` = estado/categoría (playing track, critical notification, color de note, activity state)
- Línea horizontal `1px var(--accent)` = tiempo (now line en Horario/Calendario)
- `layoutId` shared underline = tab activo
- `.field` select = server-side action con latencia
- Tabs con underline = client-side instant filter
- Dashed border = modalidad alterna (clase online, drop-zone)
- Hairline solid = separador editorial

### Anti-patrones (del md global, aplicados como regla)

Prohibido: `backdrop-filter: blur()` en superficies primarias, gradientes de IA genéricos (purple→blue, pink→orange), pasteles suaves como base, mid-tones lavados (`#e5e5e5` sobre `#f5f5f5`), neumorphism, `border-radius: 12px` por default, emoji como icono estructural (usar SVG Lucide via `lucide-react`), stack `shadow-lg + rounded-lg + border + bg-white`.

### Módulos con design system aplicado

Actividades, Horario, Calendario, Notificaciones, Ajustes, Portal Sistemas (Sidebar credencial + Ajustes Perfil), Música (Fase 1 pausada), Notas (Fases 1+2+fix imágenes), Onboarding, shells de carga en `App.jsx`, GradeCard/Calificaciones.

`ResultsTable.jsx` y `StackedEventCards.jsx` se eliminaron en el pass de auditoría UI (eran código muerto, cero imports).

### Tinta sobre acento

`--on-accent` es la tinta legible sobre cualquier fondo `var(--accent)`: se declara por tema en `themes.js` y se deriva con `pickOnAccent()` cuando el acento lo elige el usuario (tema `custom`). Usar SIEMPRE `var(--on-accent)` en texto/iconos sobre acento — nunca `#fff` hardcodeado, que queda ilegible en los temas de acento claro (rose-gold, cyber, terminal).

---

## Antes de commitear

- Correr manualmente `npm start`, verificar que Vite renderer + Electron main levantan sin errores.
- Si toqué scrapers, probar con credenciales reales que las 3 páginas (Actividades, Horario, Calificaciones) siguen extrayendo data.
- Si toqué `main.js` o preload, verificar que `window.scraperApp.*` sigue existiendo en devtools del renderer.
- Correr `npm run report` si el cambio es significativo — deja bitácora en `reports/`.
