# ScraperApp

ScraperApp es una aplicación de escritorio para estudiantes ITSON que unifica, en una sola interfaz, la información académica que normalmente está separada entre **iVirtual** y **CIA**.

La app está orientada a uso diario: revisar pendientes, detectar riesgos (retrasos/vencimientos), abrir enlaces de clase remota y consultar calificaciones sin navegar manualmente por múltiples sistemas.

---

## Descripción detallada del proyecto

### Problema que resuelve

El flujo habitual del estudiante implica:
- entrar a iVirtual para revisar tareas y enlaces de videollamada,
- entrar a CIA para revisar horario y calificaciones,
- y consolidar todo manualmente.

ScraperApp automatiza ese proceso para reducir tiempo y errores de seguimiento.

### Qué hace ScraperApp

1. **Actividades (iVirtual)**
   - Clasifica actividades en: `pendiente`, `retrasada`, `cerrada`.
   - Excluye entregadas cuando aplica.
   - Muestra instrucciones, fecha límite, urgencia visual y adjuntos descargables.
   - Incluye búsqueda, filtros y ordenamiento por fecha/nombre/materia.

2. **Horario (CIA + iVirtual)**
   - Extrae horario semanal real desde CIA.
   - Construye grilla por días/slots de 30 minutos.
   - Marca modalidad presencial/en línea.
   - Intenta detectar automáticamente enlaces de videollamada en cursos iVirtual
     (múltiples capas de búsqueda: DOM, recursos Moodle, foros, páginas, etc.).
   - Permite guardar enlaces manuales por materia cuando no se detectan.

3. **Calificaciones (CIA)**
   - Muestra materias del semestre con parciales, promedio y estado académico.
   - Clasifica estado en `aprobada`, `en_riesgo`, `reprobada`, `sin_calificacion`.

4. **Ajustes**
   - Gestión de credenciales desde UI (sin editar archivos manualmente).
   - Soporte para credenciales separadas de iVirtual y CIA.

5. **Notificaciones**
   - Notificaciones nativas para actividades retrasadas y próximas a vencer.

---

## Arquitectura (alto nivel)

- **Electron main process**: orquesta ventanas, handlers IPC, lectura de entorno y scraping.
- **Handlers en `electron/handlers`**:
  - `scraper.js`: actividades iVirtual.
  - `cia.js`: calificaciones CIA.
  - `horario.js`: horario CIA + links iVirtual.
  - `files.js`: descarga de adjuntos en contexto de sesión/cookies.
  - `settings.js`: lectura/guardado de credenciales.
  - `notifications.js`: notificaciones del sistema.
- **Preload**: expone API segura `window.scraperApp` al renderer.
- **Renderer (React)**: páginas funcionales (Actividades, Horario, Calificaciones, Ajustes).

---

## Stack tecnológico

- Electron
- React + Vite
- Tailwind CSS
- Playwright
- Node.js

---

## Requisitos

- Node.js 20+
- npm 10+

---

## Configuración inicial

1. Instalar dependencias:

```bash
npm install
```

2. Instalar Chromium para Playwright:

```bash
npx playwright install chromium
```

3. Crear/editar `.env` en la raíz:

```env
IVIRTUAL_USER=tu_id_ivirtual
IVIRTUAL_PASS=tu_password_ivirtual

CIA_USER=tu_id_cia
CIA_PASS=tu_password_cia
```

> Seguridad: `.env` es local y no debe versionarse.

---

## Ejecución

### Desarrollo web (solo renderer)
```bash
npm run dev
```

### Electron (app de escritorio)
```bash
npm run electron
```

### Flujo completo local (Vite + Electron)
```bash
npm run start
```

### Build
```bash
npm run build
```

---

## Estructura del proyecto

```text
scraper-app/
├── electron/                 # Main process, preload, handlers IPC
│   ├── main.js
│   ├── preload.js
│   └── handlers/
├── src/                      # UI React
│   ├── components/
│   └── pages/
├── scripts/                  # Scripts de soporte/diagnóstico
├── reports/                  # Reportes por tarea (auto-incrementales)
├── generate-report.js        # Generador de reporte obligatorio
├── README.md
├── AGENTS.md                 # Workflow del equipo (Codex + Claude)
└── package.json
```

---

## Cache y persistencia local

La app usa cache local para mejorar tiempos:
- Actividades: cache con TTL.
- Calificaciones (CIA): cache con TTL.
- Horario: cache con TTL.

Datos en runtime se guardan en `app.getPath('userData')` en producción.

---

## Workflow de desarrollo en este proyecto

Por convención del repositorio:
1. Implementar tarea.
2. Validar (`npm run build` y/o ejecución funcional según tarea).
3. Generar reporte:
   ```bash
   node generate-report.js
   ```
4. Commit (cuando se solicite explícitamente).

Cada reporte queda en `reports/report_XXX.md` con resumen + diff del working tree.

---

## Troubleshooting

- **No abre Electron con `npm run start`**  
  Verificar instalación de `electron` y procesos colgados.

- **Error de credenciales**  
  Revisar Ajustes y `.env` (iVirtual y CIA son credenciales separadas).

- **Timeout en scraping**  
  Verificar red y reintentar sincronización.

- **Frame no encontrado en CIA**  
  Reintentar sincronización; CIA puede variar estructura/latencia de carga.

- **No detecta link de videollamada**  
  Guardar enlace manual desde la sección Horario para esa materia.
