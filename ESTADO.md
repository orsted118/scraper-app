# DVPotro — dónde quedamos

Última actualización: **2026-08-25, 20:20**
`master` @ `f011a9a` — pusheado a `origin`.

---

## ⚡ Lo primero al retomar

1. **Instalá el build de las 20:18.** Todo lo de abajo está en el código pero
   los `.exe` viejos no lo tienen.
   ```
   release/DVPotro Setup 0.1.0.exe
   ```
2. **Subí A01 - TOPOLOGIAS.** No lo hice yo a propósito (ver más abajo).
3. **Decidí lo del historial de git** (ver "Pendiente que necesita tu decisión").

---

## 🔴 Pendiente que necesita tu decisión

### Datos personales en un repo público

`scripts/spike-output/` guardó HTML crudo del portal —tu nombre, materias,
enunciados, tokens de sesión ya expirados— y **se commiteó y pusheó** a
`orsted118/scraper-app`, que es **público**.

La regla del `.gitignore` vivía solo en la rama del spike y no llegó a master
cuando traje el script.

- ✅ Ya no está en el HEAD (commit `4dab296`) y el `.gitignore` está corregido.
- ❌ **Sigue en el historial de git.**

Para sacarlo de verdad hay que reescribir el historial y hacer force-push. Es
destructivo, así que no lo hice sin tu OK.

---

## 📌 Tarea pendiente tuya: entregar A01

**A01 - TOPOLOGIAS** (Redes) vence **jueves 27 ago, 3:30 PM**.
Estado actual: `No submissions have been made yet` — limpia, sin entregar.

El PDF está listo en `C:\Users\kneko\Downloads\Topologias_de_Red_David_Alvarez.pdf`
(237 KB, dentro del límite de 5 MB).

**No lo subí yo a propósito**: esta actividad no tiene borrador, guardar la deja
*enviada para calificar*. Es tu tarea real y quiero que la mandes vos cuando
estés conforme.

Desde la app: card de A01 → **Entregar archivos** → elegir el PDF → confirmar.

---

## ✅ Lo que se hizo en esta sesión

### 1. Historial de credenciales con cifrado — `4594fe6`
Autocompletado del usuario por portal en Ajustes. Estaba guardando las
contraseñas **en texto plano en localStorage**; se movió al proceso main con
`safeStorage` (DPAPI, atado a tu cuenta de Windows).

El problema concreto no era teórico: la "Zona de riesgo" borra credenciales
llamando al main, así que con el historial del otro lado del puente ese botón
dejaba copias atrás y **mentía**.

### 2. Fix de persistencia de posición en Música — `621a27b`
El hotfix que estaba pusheado desde el 28-jul sin mergear. Verificado en
Electron real: archivo 0→9 mientras sonaba, 15 al pausar, 18 al cerrar ventana.

### 3. Notas: estados y menú contextual — `059fe28`, `857a119`
- Estados: `pendiente` / `en-progreso` / `terminada` / `idea`. Badge en la
  card, filtro en la barra, selector en el modal.
- Botón copiar ahora **copia el texto plano**, ya no duplica. Ctrl+D sigue
  duplicando.
- **Click derecho** sobre una card: copiar, fijar, cambiar estado, duplicar,
  archivar, papelera.
- Bug arreglado: `patchFields` no incluía `status`, así que el cambio de estado
  en el modal no se guardaba al cerrar.

### 4. Profesor propagado a otros módulos — `dd6fc62`
El scraper del horario es la única fuente con instructor real (PeopleSoft).
Ahora actividades y calificaciones se enriquecen contra ese cache, por código
exacto y con fallback por nombre normalizado.

### 5. Ícono y empaquetado — `de5e396`, `b5978c1`
- `build/icon.ico` regenerado con 4 tamaños (tenía solo 16/32, por eso Windows
  caía al ícono de Electron) + `setAppUserModelId`.
- **Playwright y Chromium bundleados** en el `.exe`. Antes tiraba
  `Cannot find module 'playwright'` porque estaba en devDependencies y el
  binario del browser ni siquiera viaja con el paquete npm.
  `electron-builder.config.js` resuelve la carpeta del browser dinámicamente.

### 6. Horario: modalidad por día — `7826296`, `9cdbdbc`, `9d8e872`
El bug que encontraste el primer día de clases. **Bases de Datos** es
presencial Lun/Mié en LM0712 y remota el viernes; la app la marcaba entera
como remota.

Fueron **dos** causas:
- La identidad de una sesión era solo su horario. Los tres días son 3-4PM, así
  que se fusionaban y el flag remoto del viernes pisaba a los otros.
- Al arreglar eso apareció una segunda: PeopleSoft emite **copias de la misma
  celda sin texto de ubicación**. En esas `esEnLinea` sale `false` por falta de
  texto, no porque sea presencial. Marcaban modalidad falsa y creaban sesiones
  fantasma. Ahora esas filas aportan días pero no votan.

Detección de "remoto" ampliada en dos niveles: patrones verificados del portal
siempre aplican; indicios más flojos (`virtual`, `online`, `remoto`) solo
cuentan si **no** hay código de salón — porque "Aula Virtual LM0301" es un aula
física. Un falso positivo te deja en casa faltando a clase; ante la duda,
presencial.

### 7. Caches versionadas — `9faa5d0`, `544bd66`
Los arreglos no se veían al abrir la app: el TTL mantenía viva una cache con
datos del código anterior, y solo el botón de la página de Horario limpiaba.

Ahora horario y actividades llevan `schemaVersion`. Si no coincide con la del
código, se descarta y re-scrapea una vez sin esperar el TTL.

> **Regla:** subir la versión cada vez que cambie **cómo se derivan** los datos.
> Si no, el arreglo queda invisible hasta 24 h y parece que no funciona.

### 8. Entrega de archivos a iVirtual — `6faa36e`, `f011a9a`
Panel "Entregar archivos" en las cards que aceptan entrega.

**El error que cometí y cómo quedó resuelto:** el diseño original prometía
"nunca enviar a calificar, solo dejar borrador". **Ese supuesto era falso.**
Moodle tiene un ajuste por actividad, `submissiondrafts`; cuando está en No
—como en A01— no existe borrador y "Save changes" **es** la entrega final.

Durante el test autorizado tu tarea quedó enviada a calificar con un archivo de
prueba. Lo revertí con "Remove submission" y verifiqué que volvió a limpio.

El diseño ya no adivina la configuración:
1. La UI **avisa antes** con confirmación explícita.
2. Después de guardar **relee el estado real** del portal y reporta ese.
3. **"Quitar la entrega"** deshace desde la card.

Después arreglé una falla intermitente ("No fue posible subir los archivos"):
el flujo esperaba **tiempos fijos** en vez de condiciones. El peor caso era
esperar a que cerrara el modal + 800 ms, cuando el modal cierra *antes* de que
el archivo aparezca. Ahora cada paso espera la condición real, hay un reintento
con recarga, y al final **contrasta contra el portal**: si el archivo no
figura, devuelve error en vez de decir "éxito".

Verificado: **6/6** adjuntos alternando `.txt` mínimo y tu PDF (3.9–8.0 s,
promedio 4.7 s), y end-to-end en el **`.exe` empaquetado** en 5.2 s.

---

## 🧪 Tests

```bash
npm run test:horario     # 26 checks — merge de modalidad por día
npm run test:modalidad   # 27 checks — detección remoto/presencial
npm run test:cache       # 9 checks  — versionado de cache
npm run test:upload      # 18 checks — validación local y URLs
npm run test:accepted-types  # 22 checks — extensiones aceptadas, contra HTML real
npm run test:material    # 24 checks — clasificación de recursos y novedades
npm run test:force-resync  # 13 checks — el botón de sync re-escanea siempre
npm run test:attendance  # 26 checks — parseo de sesiones y guardas del registro
npm run test:prompt      # 27 checks — contexto y presupuesto del generador de prompts
```

Todos en verde al cierre de la sesión.

---

## 🔜 Backlog

### Entrega a iVirtual — falta más data
Con **una sola actividad abierta** no se pudo observar:
- ~~Entrega con restricción de extensión (`acceptedTypes` no vacío)~~ —
  observado el 2026-08-28 en "Asignación 01 - Tipos de Datos Abstractos"
  (`[.pdf, .doc, .docx]`). Destapó el bug de los múltiples `accepted_types`.
- Assignment con declaración obligatoria (`submissionstatement`)
- **Entrega grupal**
- Entrega de texto en línea (`onlinetext`)

Cuando suban más trabajos:
```bash
node scripts/spike-upload-recon.cjs --limit 5
```
El spike ya extrae todo lo necesario. Rama `spike/ivirtual-upload-recon` sigue
viva sin mergear.

### Módulo Música — pausado desde 2026-07-28
Orden acordado al retomar:
1. Falta `withLock` en `music:save-state`
2. `writeJson` no atómico en `electron/handlers/music.js`
3. Bug `setQueue(-1)` deja audio huérfano
4. **Fase 4c** — EQ 10 bandas + gapless + crossfade
5. **Fase 4b** — Mini player (va *después* de 4c: cambia el shape del state
   que su IPC consume)

### Pasarle la app a tu amigo
El instalador está listo. Se le olvidó traer la laptop; queda para cuando la
traiga.

Advertencias para él:
- SmartScreen: "Más información" → "Ejecutar de todas formas". El `.exe` no
  está firmado.
- El antivirus puede ponerlo en cuarentena (falso positivo típico de Electron
  sin firmar).
- Primera sync: 30-60 s.
- Solo necesita el `Setup`. Nada de Node, Git ni tu `.env`.
- Primero: **Ajustes → Credenciales** con sus datos.

---

## 🧠 Cosas no obvias del proyecto

- **El material NO son archivos subidos a Moodle.** En los 5 cursos medidos hubo
  CERO módulos `resource`. Lo que hay son cuatro formas: `folder` (PDFs en
  `pluginfile.php`, descargables), `url`→Drive (Redes publica TODOS sus temas
  así), `page` (HTML dentro de Moodle) y `url`→Meet/WhatsApp (no es material,
  son las herramientas de la materia).
- **El generador de prompts vive o muere por el presupuesto de tokens.** La
  consigna (8k), los adjuntos (40k c/u) y el material juntos no entran en el
  contexto del modelo más chico del pool. El recorte es por PRIORIDAD, no por
  concat: consigna entera > adjuntos recortados y repartidos entre sí > material
  sólo por TÍTULO. Y todo lo que se recorta o no se pudo leer se declara en el
  contexto, para que el modelo no escriba un prompt apoyado en algo que nunca
  vio.
- **Asistencia (`mod_attendance`) sólo se puede marcar mientras el profe tiene
  la sesión abierta.** El link `attendance.php?sessid=…` no existe fuera de esa
  ventana, y ése es el estado normal. Una sesión futura aparece con estado `?`.
  El remark **"Self-recorded"** es la prueba de que el curso permite
  auto-registro (2 de 3 materias lo tienen).
- **El registro de asistencia NUNCA se automatiza.** Marcar es afirmar que
  estuviste en clase. No hay auto-marcado por timer, ni en la sync, ni al abrir
  la app: el único camino a `markAttendance` es el botón + confirmación. El test
  `test:attendance` verifica que ningún camino automático lo alcance.
- **El registro clickea el form real, no arma un POST.** Los nombres de campo de
  `mod_attendance` cambian entre versiones del plugin, y un POST inventado
  contra un registro académico es peor que no hacer nada. Si el form no está
  donde se espera, se aborta y se reporta.
- **La URL del form se valida contra el host.** Sale de scrapear la página del
  curso, o sea contenido que no controlamos: un link plantado hacia otro dominio
  se llevaría la cookie de sesión de Moodle. `isSessionUrl` exige https + host
  exacto + path exacto + `sessid`.
- **Ojo con `startsWith` en el parseo de totales.** "Percentage over taken
  sessions" contiene "taken sessions": un test suelto metía el porcentaje en el
  contador de sesiones. Los patrones van anclados al inicio.
- **Mucho material NO es un módulo con página propia.** El profe lo pega dentro
  de un `mod_label` — HTML suelto que Moodle renderiza en la portada. Un label
  no tiene link a `/mod/`, así que un scraper que filtre por "módulo con
  nombre" lo descarta y se lleva TODO su contenido. Estructuras de Datos tenía
  6 PDFs de Drive así. Por eso el barrido de links es sobre la sección entera.
- **Word parte un link en varios `<a>`.** "Fundamentos de las Estructuras de
  Datos" quedó como dos anchors a archivos DISTINTOS, el segundo con el texto
  `s`. Y "Enlace a la" tenía el resto del nombre fuera del `<a>`.
- **Cuidado al derivar ids de una URL por prefijo.** La primera versión de
  `resourceId` recortaba un base64 del href a 20 chars — sólo ~15 bytes — y
  todos los Drive empiezan con `https://drive.g`: colisionaban en el mismo id y
  el dedup se comía 5 de 6. Se hashea la URL completa.
- **`force` en los scrapers cacheados.** Actividades cachea 6 h, horario y
  calendario 24 h. Sin `force`, apretar "Sincronizar todo" una segunda vez
  devolvía la caché y no se re-escaneaba nada. Las cargas automáticas (`silent`)
  sí usan caché; las que pide el usuario, no.
- **Los Drive del portal NO se pueden bajar automáticamente.** Verificado: sin
  la sesión de Google del alumno redirigen a `accounts.google.com`. Por eso el
  módulo los abre en el navegador del sistema en vez de prometer una descarga.
- **Moodle repite el foro de avisos en varios contenedores** de la portada del
  curso: el mismo módulo aparece hasta 4 veces. Se deduplica por cmid, no por
  nombre (dos foros distintos pueden llamarse "Avisos").
- **`submissiondrafts` de Moodle** decide si guardar deja borrador o entrega
  final. No se puede saber de antemano sin guardar.
- **El filemanager de Moodle se monta por JavaScript.** No hay
  `<input type="file">` en el HTML estático, y los límites viven en el JSON de
  configuración del filepicker, no en atributos `data-*`.
- **`accepted_types: []`** significa *cualquier extensión*, no *ninguna*.
- **La página de entrega trae VARIOS bloques `accepted_types`.** Medido en
  "Asignación 01": 14 bloques, y 12 son del editor de texto enriquecido (sus
  pickers de imagen, media y subtítulos), que además aparecen *antes* en el
  documento. Sólo el bloque de `M.form_filemanager.init` es el de la entrega.
  Buscar el primero del HTML leía `web_image` y la app rechazaba PDFs que el
  portal sí acepta. Lo mismo aplica a `maxbytes` y `maxfiles`.
- **`accepted_types` mezcla cuatro sintaxis**: extensiones (`.pdf` o `pdf`),
  grupos (`document`, `image`), mimetypes (`application/pdf`) y `*`. ITSON manda
  los grupos ya expandidos, pero las otras formas son válidas en Moodle.
- **La validación local es una conveniencia, no una autoridad.** Ante un token
  que no se sabe interpretar NO se bloquea: contesta el portal con el motivo
  real. Bloquear de más impide una entrega válida; dejar pasar de más sólo
  cuesta un viaje al portal.
- **`isPlaying` de MusicPlayerContext** es state de React seteado a mano, **no**
  derivado de eventos del `<audio>`. Un harness que manipula el `<audio>`
  directo no dispara la persistencia y da falsos negativos.
- **`app.evaluate` de Playwright** corre en el main pero `require` relativo
  resuelve contra el módulo `electron`: hay que pasar path absoluto y usar
  `process.mainModule.require(abs)`.
- **Monkeypatchear un export desde `app.evaluate` no intercepta** las llamadas
  internas del módulo (son léxicas). Usar env var + guard en el source.
- **Lanzar Electron para tests:** `env: { VITE_DEV_SERVER_URL: '' }` fuerza que
  cargue `dist/` en vez del dev server de Vite.
- **Regla de oro de los harnesses:** tocan datos REALES. Backup antes, cleanup
  en `finally`, y verificar la restauración.
- **Los fixtures sintéticos no alcanzan** para bugs de scraping: el unit test
  pasó con el primer fix de modalidad y solo el scrape real destapó las filas
  fantasma.
