# DVPotro

App de escritorio para estudiantes del ITSON. Unifica en una sola interfaz lo que
normalmente está repartido entre **iVirtual** (Moodle) y **CIA** (PeopleSoft):
actividades, horario, calificaciones, material, asistencia y calendario escolar.

Además expone todos esos datos a un asistente de IA mediante un **servidor MCP**
(ver más abajo).

---

## Requisitos

- **Node.js 20+** y **npm 10+**
- Windows 10/11 (el empaquetado apunta a Windows; el desarrollo corre en cualquier SO)
- Credenciales de iVirtual y de CIA — son **distintas entre sí**

---

## Puesta en marcha

```bash
npm install
```

```bash
npx playwright install chromium
```

Después, credenciales. Hay dos formas y conviene entender la diferencia:

- **Desde la app** (recomendado): Ajustes → Credenciales. Es la única forma que
  funciona en la app empaquetada, y guarda en `userData/.env`.
- **Archivo `.env` en la raíz del repo**: solo para desarrollo. Es lo que leen
  los scripts de `scripts/` y el `sync` del MCP.

```env
# Obligatorias
IVIRTUAL_USER=
IVIRTUAL_PASS=
CIA_USER=
CIA_PASS=
```

`.env` está en `.gitignore`. No lo versiones.

### Arrancar

```bash
npm start
```

Levanta Vite y Electron en paralelo. Si querés solo una mitad: `npm run dev`
(renderer) o `npm run electron` (main).

```bash
npm run start:demo
```

Arranca con datos de mentira, sin tocar el portal ni pedir credenciales. Útil
para trabajar la UI.

---

## Servidor MCP

`mcp/dvpotro-mcp.js` le da a un cliente MCP (Claude Code) acceso a todo lo que la
app scrapeó: **19 tools** de consulta más `dvpotro_sync`.

Se registra solo: el repo tiene un `.mcp.json` de proyecto, así que abriendo
Claude Code parado en esta carpeta lo levanta y pide aprobación la primera vez.
Para probarlo a mano:

```bash
npm run mcp
```

Tres cosas que conviene saber:

- **Lee los JSON de `userData` directamente**, no habla con la app. No hace falta
  que DVPotro esté abierto, y no abre ningún puerto: va por stdio.
- **Las listas resumen y el detalle se pide de a uno.** `actividades-cache.json`
  son unos 75.000 tokens; volcarlo entero quema la ventana de contexto.
- **`dvpotro_sync` es lo único que no es de solo lectura.** Solo trae del portal:
  nunca marca asistencia ni sube entregas.

---

## Módulos

| Página | Fuente | Qué hace |
|---|---|---|
| **Actividades** | iVirtual | Clasifica en `pendiente` / `retrasada` / `cerrada` / `entregada` sobre la **ventana de entrega**, que no es lo mismo que el estado de tu entrega. Renderiza la consigna con sus tablas, imágenes y rúbrica. Permite subir la entrega. |
| **Calendario** | ITSON | Calendario escolar institucional (público, sin credenciales). |
| **Horario** | CIA + iVirtual | Grilla semanal con modalidad presencial/en línea. Busca el enlace de videollamada en iVirtual con varias capas; si no lo encuentra, se puede guardar a mano. Desde acá se consulta la asistencia. |
| **Calificaciones** | CIA | Parciales, promedio y estado por materia. |
| **Material** | iVirtual | Grilla de materias al estilo del portal (portada, clave, periodo) con sus recursos por semana y las actividades ya entregadas. |
| **Notas** | local | Notas y checklists tipo Keep, con imágenes, etiquetas y recordatorios. |
| **Notificaciones** | derivado | Centro de avisos: detecta qué cambió entre sincronizaciones. |
| **Música** | local | Reproductor de la biblioteca local. |
| **Ajustes** | — | Credenciales, temas, perfil y estado de los backends LLM. |

Regla dura del proyecto: **la asistencia nunca se marca automáticamente.** Se
lee, se muestra, y la marcás vos.

---

## Dónde viven los datos

Todo en `app.getPath('userData')` — en Windows, `%APPDATA%\dvpotro\`.

| Archivo | Contenido | Versión de esquema |
|---|---|---|
| `actividades-cache.json` | actividades con consigna, rúbrica y entrega | 6 |
| `horario-cache.json` | horario semanal | 2 |
| `material.json` | material por materia | 3 |
| `attendance.json` | asistencia | 1 |
| `cia-cache.json` | calificaciones | — |
| `calendario-cache.json` | calendario escolar | — |
| `notes.json` + `notes-attachments/` | notas e imágenes | — |
| `notifications.json` + `snapshots/` | avisos y estado anterior para el diff | — |
| `activity-analysis/` | requisitos extraídos por IA y verificaciones | — |
| `prompt-cache.json` | prompts generados | 1 |
| `profile-cache/` | nombre, matrícula, programa | — |

Las cachés están **versionadas**: si el código genera una versión distinta de la
que hay en disco, se descarta entera y se vuelve a scrapear. Es a propósito —
migrar contenido reproducible no vale la pena. Si tocás la forma de un modelo,
subí la versión.

---

## Backends de IA

Ocho backends con fallback en cadena: cerebras, cloudflare, gemini, github,
groq, mistral, openrouter, scaleway. Las claves se autodescubren del `.env` con
el patrón `<PROVEEDOR>_API_KEY`, `<PROVEEDOR>_API_KEY2`, … hasta 20 por proveedor.

```bash
npm run llm:doctor
```

Prueba cada clave con una request mínima y arma una tabla con estado, latencia y
modelo, más el orden de preferencia vigente. Sale con código 1 si no queda
ninguna viva. **Gasta cuota real**: una llamada por clave. En proveedores con
cuota diaria chica (Gemini free son 20 requests por día y por clave) correrlo
seguido agota el saldo del día.

Desde la app: Ajustes → *Backends LLM*, con el uso de los últimos 7 días. El
orden se cambia editando `PREFERENCE_ORDER` en `electron/llm/selector.js`; la
variable `LLM_BACKEND` fuerza un proveedor al primer puesto sin tocar código.

El log de uso queda en `%APPDATA%\dvpotro\llm-usage.jsonl`, una línea por intento
(incluidos los fallidos). Rota a los 10 MB y conserva dos generaciones. Guarda
**nombres** de variable, nunca el valor de las claves.

### Variables opcionales

```env
LLM_BACKEND=            # fuerza un proveedor al primer puesto
LLM_TOTAL_BUDGET_MS=    # presupuesto total de una operación con IA
LLM_REQUEST_TIMEOUT_MS= # timeout por request
GEMINI_MODEL=           # y su equivalente por proveedor: GROQ_MODEL, MISTRAL_MODEL…
STUDENT_NAME=           # para portadas; si falta, se lee de CIA
NOTIF_MINUTES_BEFORE=   # antelación del aviso de clase
DVPOTRO_DEMO_ACTIVITIES=1   # datos de mentira sin tocar el portal
DVPOTRO_USER_DATA=      # apuntar a otra carpeta de datos (lo usa el MCP)
```

---

## Tests

No hay framework: son scripts de Node que imprimen `PASS`/`FAIL` y salen con
código distinto de cero si algo falla.

**Rápidos, sin red ni credenciales** — estos son los que conviene correr siempre:

```bash
npm run test:clasificacion   # estados de actividad sobre la ventana de entrega
npm run test:fechas          # fechas en español y días de calendario
npm run test:extraccion      # consignas: imágenes, tablas, rúbrica, formato
npm run test:material        # clasificación de recursos
npm run test:modalidad       # presencial vs en línea
```

**Contra el portal real** (necesitan credenciales y tardan): `test:scrape`,
`test:attendance`, `test:analyzer`, `test:drive:red`.

Los `spike:*` son de reconocimiento: entran al portal y vuelcan HTML crudo para
entender una página nueva. Su salida va a `scripts/spike-output/`, que está
gitignorada porque guarda datos personales.

---

## Build

```bash
npm run build      # solo el renderer, a dist/
npm run dist:dir   # empaqueta sin instalador
npm run dist       # NSIS + portable, a release/
```

El empaquetado incluye Chromium dentro del `.exe`: `electron-builder.config.js`
calcula la carpeta de Playwright y falla ruidosamente si no está instalado.
Actualizaciones por GitHub Releases con `electron-updater`.

---

## Estructura

```text
scraper-app/
├─ electron/
│  ├─ main.js            # ventana, IPC, autoUpdater, bundle de Playwright
│  ├─ preload.js         # expone window.scraperApp — nunca ipcRenderer directo
│  ├─ handlers/          # un módulo por dominio (26)
│  ├─ llm/               # router de backends, pool de claves, probe
│  └─ utils/             # parseo de fechas, lookup de profesores
├─ src/                  # renderer React
│  ├─ pages/             # 9 páginas
│  ├─ components/
│  ├─ contexts/          # Theme, Sidebar, MusicPlayer
│  └─ utils/
├─ mcp/dvpotro-mcp.js    # servidor MCP, sin dependencias
├─ scripts/              # tests y spikes
├─ reports/              # bitácora de cambios
└─ .mcp.json             # registro del MCP a nivel proyecto
```

---

## Convenciones

- **JavaScript, no TypeScript.** React 18, Tailwind 3, sin React Query.
- **CommonJS en el main**, ESM en el renderer.
- Toda comunicación main ↔ renderer pasa por `window.scraperApp.*`.
- Sistema visual **Swiss Noir**: tokens `var(--*)`, radius 0, sin sombras,
  hairlines, un acento. Tailwind solo para layout.
- Los detalles viven en `CLAUDE.md` y `AGENTS.md`, que mandan sobre este README.

---

## Troubleshooting

**No abre con `npm start`** — verificá que no haya un Electron colgado de una
corrida anterior, y que el puerto de Vite esté libre.

**Error de credenciales** — iVirtual y CIA son cuentas distintas. Revisá cuál de
las dos falla en el aviso; el módulo que use la otra va a seguir funcionando.

**"Frame no encontrado" en CIA** — PeopleSoft carga por frames y a veces tarda de
más. Reintentá la sincronización.

**No detecta el link de videollamada** — guardalo a mano desde Horario. La
detección tiene varias capas pero depende de dónde lo haya pegado el profe.

**Una actividad no aparece** — puede estar oculta (la ocultaste vos) o ya
entregada. Las entregadas salen de las pestañas pero se cuentan en Material.

**Las imágenes de una consigna no cargan** — son archivos de Moodle y necesitan
la cookie de sesión, que se renueva al sincronizar. Sincronizá y volvé a abrir.

**El MCP no aparece en Claude Code** — reiniciá el cliente parado en esta
carpeta. Si sigue sin salir, probá `npm run mcp`: tiene que quedarse esperando
sin imprimir nada en stdout.

**Después de actualizar, la app re-scrapea todo** — es esperado si subió la
versión de alguna caché.
