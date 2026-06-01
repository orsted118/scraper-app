# Documentación de Scrapers

Este documento describe el comportamiento real de los scrapers actuales en DVPotro.

---

## iVirtual — Actividades (`electron/handlers/scraper.js`)

### URL y flujo principal

1. Login: `https://ivirtual.itson.edu.mx/login/index.php`
2. Dashboard: `https://ivirtual.itson.edu.mx/my/`
3. Por curso: `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=<courseId>`
4. Por actividad: `mod/assign/view.php?id=<activityId>`

### Datos extraídos por actividad

- `id`
- `nombre`
- `materia`
- `estado` (`pendiente`, `retrasada`, `cerrada`)
- `fechaLimite`
- `fechaPublicacion` (si existe)
- `modalidad` (`individual` / `equipo`)
- `instrucciones`
- `archivos[]` (`name`, `url`)
- `rawSubmission`, `rawGrade`, `url`

### Lógica de clasificación

- **Entregada** (submitted): se excluye del resultado.
- **Cerrada**: no entregada + no acepta más envíos.
- **Retrasada**: no entregada + fecha vencida + sigue abierta.
- **Pendiente**: no entregada + no vencida + abierta.

### Caché

- Ruta: `app.getPath('userData')/actividades-cache.json`
- TTL: `1 hora`
- Limpieza:
  - `scraper:clear-cache`
  - invalidación automática si JSON corrupto/inválido
  - limpieza al devolver error (`buildScrapeError`)

### Errores y códigos comunes

- `NO_CREDENTIALS`
- `NO_USER`
- `NO_PASSWORD`
- `SESSION_EXPIRED`
- `NO_INTERNET`
- mensajes timeout/global timeout (`El escaneo tardó demasiado...`)

### Optimizaciones de rendimiento

- `gotoWithRetry` con reintentos de timeout.
- Bloqueo de recursos pesados (`image`, `media`, `font`, `stylesheet`).
- `waitUntil: 'domcontentloaded'` en navegación.
- Extracción de detalles por chunks (`CHUNK_SIZE = 3`).
- Timeout por chunk y timeout global total (`5 min`).

---

## CIA — Horario (`electron/handlers/horario.js`)

### URL y flujo base

1. Entrada CIA: `https://apps9.itson.edu.mx/CIA/index.aspx`
2. Navegación PeopleSoft a horario de clases.
3. Vista listado para identificadores.
4. Vista semanal para bloques de horario.

### Parsing horario semanal

- Reconoce estructura PeopleSoft/Banner.
- Construye materias con:
  - `codigo`, `nombre`, `seccion`, `numeroClase`
  - `dias[]`
  - `horaInicio`, `horaFin`
  - `modalidad` (`presencial`/`en_linea`)
  - `ubicacion`, `instructor`
- Soporta `sesiones[]` para materias con horarios distintos por día.

### Match de videollamadas (materias en línea)

`findMeetLinkInCourse` aplica búsqueda por capas:

1. `CAPA_1_DOM` — links/texto en DOM completo + frames
2. `CAPA_2_MOD_URL` — recursos `mod/url`
3. `CAPA_3_MOD_PAGE` — recursos `mod/page`
4. `CAPA_4_FORUM` — primer hilo de foros
5. `CAPA_5_INTRO` — intro/descripción del curso
6. `CAPA_6_MOD_ASSIGN` — instrucciones de tareas
7. `CAPA_7_FORUM_THREADS` — posts adicionales en foros
8. `CAPA_8_MOD_BOOK` — recursos tipo libro/capítulos
9. `CAPA_9_SHORT_URL` — acortadores y resolución
10. `CAPA_10_QUIZ_LESSON` — quiz/lesson/scorm

Si no encuentra, `meetLink = null`.

### Caché

- Ruta: `app.getPath('userData')/horario-cache.json`
- TTL: `6 horas`
- Links manuales:
  - archivo: `app.getPath('userData')/horario-links-manuales.json`
  - canal: `horario:save-link`
  - se combinan al retornar respuesta

### Errores conocidos

- `CIA_SCHEDULE_UNAVAILABLE` (sin acceso al horario en CIA)
- `NO_INTERNET`
- errores de frame si CIA cambia estructura/latencia

### Rendimiento

- `gotoWithRetry`
- `domcontentloaded`
- bloqueo de recursos pesados
- timeout global `4 minutos`
- procesamiento paralelo de links en línea por chunks (`2`)

---

## CIA — Calificaciones (`electron/handlers/cia.js`)

### Flujo actual

1. Login CIA con `CIA_USER` / `CIA_PASS`
2. Abrir “Boleta de Calificación”
3. Ejecutar consulta con selects configurados en flujo actual
4. Abrir Report Manager y ubicar PDF
5. Descargar PDF
6. Parsear texto y reconstruir materias/calificaciones

### Campos devueltos

- `clave`
- `nombre`
- `profesor` (puede venir vacío)
- `calificaciones[]` (parciales/final)
- `promedio`
- `estado` (`aprobada`, `en_riesgo`, `reprobada`, `sin_calificacion`)

### Caché

- Ruta: `app.getPath('userData')/cia-cache.json`
- TTL: `30 minutos`
- invalidación automática si caché corrupto

### Códigos de credenciales

- `CIA_NO_CREDENTIALS`
- `CIA_NO_USER`
- `CIA_NO_PASSWORD`

### Estado actual

- ⚠️ Funcional, pero sensible a cambios del flujo CIA/Report Manager.
- ⚠️ Si el PDF no aparece o cambia layout, el parser puede requerir ajustes.

---

## Patrones comunes entre scrapers

| Patrón | Uso actual |
|---|---|
| `gotoWithRetry` | Reintentos por timeout y detección de red |
| Bloqueo de recursos | `image/media/font/stylesheet` |
| `waitUntil: 'domcontentloaded'` | Navegación robusta en portales pesados |
| Caché local por módulo | Actividades/CIA/Horario con TTL independientes |
| Limpieza de caché en error | Evita reusar datos incompletos/corruptos |
| Error mapping a UI | App muestra mensajes amigables en renderer |

