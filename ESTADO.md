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
```

Todos en verde al cierre de la sesión.

---

## 🔜 Backlog

### Entrega a iVirtual — falta más data
Con **una sola actividad abierta** no se pudo observar:
- Entrega con restricción de extensión (`acceptedTypes` no vacío)
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

- **`submissiondrafts` de Moodle** decide si guardar deja borrador o entrega
  final. No se puede saber de antemano sin guardar.
- **El filemanager de Moodle se monta por JavaScript.** No hay
  `<input type="file">` en el HTML estático, y los límites viven en el JSON de
  configuración del filepicker, no en atributos `data-*`.
- **`accepted_types: []`** significa *cualquier extensión*, no *ninguna*.
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
