# Report 042
**Fecha:** 2026-05-24 22:26  
**Agente:** Codex  
**Tipo:** feature

## Contexto Git
**Rama:** master
**Último commit:** 8db4f04 — feat: generador de reportes v2 — diff por archivo, estadísticas y verificación
**Archivos modificados:** 3

## Archivos modificados
- `electron/handlers/horario.js` — archivo actualizado en esta tarea
- `generate-report.js` — archivo actualizado en esta tarea
- `src/pages/Horario.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| electron/handlers/horario.js | 154 | 43 |
| generate-report.js | 10 | 2 |
| src/pages/Horario.jsx | 99 | 22 |

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 4cfc242..a0c3137 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -370,6 +370,30 @@ function parseTimeRange(value) {
   };
 }
 
+function toMinutes(timeValue) {
+  if (!timeValue || typeof timeValue !== 'string') {
+    return null;
+  }
+
+  const [hours, minutes] = timeValue.split(':').map(Number);
+  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
+    return null;
+  }
+
+  return hours * 60 + minutes;
+}
+
+function minutesDiff(timeA, timeB) {
+  const a = toMinutes(timeA);
+  const b = toMinutes(timeB);
+
+  if (!Number.isFinite(a) || !Number.isFinite(b)) {
+    return Number.POSITIVE_INFINITY;
+  }
+
+  return Math.abs(a - b);
+}
+
 function extractCode(value) {
   const text = normalizeWhitespace(value);
 
@@ -1311,43 +1335,88 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
   });
 
   blocksByCode.forEach((blocks, key) => {
-    const hasPresencial = blocks.some((block) => !block.esEnLinea);
-    const selectedBlocks = hasPresencial
-      ? blocks.filter((block) => !block.esEnLinea)
-      : blocks;
+    blocks.forEach((row) => {
+      const rowDays = getFriendlyDayOrder(Array.isArray(row.dias) ? row.dias : []);
 
-    selectedBlocks.forEach((row) => {
       if (!byCode.has(key)) {
         byCode.set(key, {
           codigoRaw: row.codigoRaw,
           codigo: key,
           secciones: new Set(),
           componentes: new Set(),
-          dias: new Set(),
+          dias: new Set(rowDays),
           horaInicio: row.horaInicio,
           horaFin: row.horaFin,
           ubicacion: row.ubicacion,
           modalidad: row.esEnLinea ? 'en_linea' : 'presencial',
+          sesiones: [
+            {
+              dias: rowDays,
+              horaInicio: row.horaInicio,
+              horaFin: row.horaFin,
+              modalidad: row.esEnLinea ? 'en_linea' : 'presencial',
+              ubicacion: row.esEnLinea ? 'Remoto' : row.ubicacion,
+            },
+          ],
         });
       }
 
       const current = byCode.get(key);
       current.secciones.add(row.seccion);
       current.componentes.add(normalizeWhitespace(row.componente));
-      (row.dias || []).forEach((day) => current.dias.add(day));
+      rowDays.forEach((day) => current.dias.add(day));
 
-      if (row.horaInicio && (!current.horaInicio || row.horaInicio < current.horaInicio)) {
-        current.horaInicio = row.horaInicio;
+      if (row.esEnLinea) {
+        current.modalidad = 'en_linea';
       }
-      if (row.horaFin && (!current.horaFin || row.horaFin > current.horaFin)) {
-        current.horaFin = row.horaFin;
+
+      current.ubicacion = pickBetterLocation(
+        current.ubicacion,
+        row.esEnLinea ? 'Remoto' : row.ubicacion,
+        current.modalidad,
+      );
+
+      const existingSession = (current.sesiones || []).find((session) => {
+        const startGap = minutesDiff(row.horaInicio, session.horaInicio);
+        const endGap = minutesDiff(row.horaFin, session.horaFin);
+        return startGap <= 120 && endGap <= 120;
+      });
+
+      if (!existingSession) {
+        current.sesiones.push({
+          dias: rowDays,
+          horaInicio: row.horaInicio,
+          horaFin: row.horaFin,
+          modalidad: row.esEnLinea ? 'en_linea' : 'presencial',
+          ubicacion: row.esEnLinea ? 'Remoto' : row.ubicacion,
+        });
+        return;
       }
 
-      if (row.esEnLinea) {
-        current.modalidad = 'en_linea';
+      const mergedDays = new Set([...(existingSession.dias || []), ...rowDays]);
+      existingSession.dias = DAY_ORDER.filter((day) => mergedDays.has(day));
+
+      const hasDifferentSchedule = minutesDiff(row.horaInicio, existingSession.horaInicio) > 120;
+
+      if (!hasDifferentSchedule) {
+        if (row.horaInicio && (!existingSession.horaInicio || row.horaInicio < existingSession.horaInicio)) {
+          existingSession.horaInicio = row.horaInicio;
+        }
+        if (row.horaFin && (!existingSession.horaFin || row.horaFin > existingSession.horaFin)) {
+          existingSession.horaFin = row.horaFin;
+        }
       }
 
-      current.ubicacion = pickBetterLocation(current.ubicacion, row.ubicacion, current.modalidad);
+      if (row.esEnLinea) {
+        existingSession.modalidad = 'en_linea';
+        existingSession.ubicacion = 'Remoto';
+      } else {
+        existingSession.ubicacion = pickBetterLocation(
+          existingSession.ubicacion,
+          row.ubicacion,
+          existingSession.modalidad || 'presencial',
+        );
+      }
     });
   });
 
@@ -1376,17 +1445,70 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
       matches.find((entry) => normalizeWhitespace(entry.instructor || ''))?.instructor ||
       main.instructor ||
       '';
-    const modalidad = item.modalidad === 'en_linea' ? 'en_linea' : inferModalidad(`${item.ubicacion} ${fallbackName}`);
+
+    const sessions = (Array.isArray(item.sesiones) ? item.sesiones : [])
+      .map((session) => {
+        const normalizedDays = DAY_ORDER.filter((day) =>
+          new Set(getFriendlyDayOrder(session.dias || [])).has(day),
+        );
+        if (!session.horaInicio || !session.horaFin || session.horaFin <= session.horaInicio) {
+          return null;
+        }
+        const sessionModalidad =
+          session.modalidad === 'en_linea'
+            ? 'en_linea'
+            : inferModalidad(`${session.ubicacion || ''} ${fallbackName}`);
+
+        return {
+          dias: normalizedDays,
+          horaInicio: session.horaInicio,
+          horaFin: session.horaFin,
+          modalidad: sessionModalidad,
+          ubicacion:
+            sessionModalidad === 'en_linea'
+              ? 'Remoto'
+              : pickBetterLocation('', session.ubicacion || '', sessionModalidad),
+        };
+      })
+      .filter((session) => session && session.dias.length > 0);
+
+    const firstSession =
+      sessions[0] ||
+      (item.horaInicio && item.horaFin
+        ? {
+            dias: getFriendlyDayOrder([...item.dias]),
+            horaInicio: item.horaInicio,
+            horaFin: item.horaFin,
+            modalidad: item.modalidad === 'en_linea' ? 'en_linea' : 'presencial',
+            ubicacion: item.modalidad === 'en_linea' ? 'Remoto' : item.ubicacion,
+          }
+        : null);
+
+    const modalidad =
+      sessions.some((session) => session.modalidad === 'en_linea') ||
+      item.modalidad === 'en_linea'
+        ? 'en_linea'
+        : inferModalidad(`${item.ubicacion} ${fallbackName}`);
     const ubicacion =
       modalidad === 'en_linea'
         ? 'Remoto'
         : pickBetterLocation(main.ubicacion || '', item.ubicacion || '', modalidad);
     const daysSet = new Set(item.dias);
-    if (modalidad === 'en_linea') {
-      matches.forEach((entry) => {
-        (entry.dias || []).forEach((day) => daysSet.add(day));
-      });
-    }
+    sessions.forEach((session) => (session.dias || []).forEach((day) => daysSet.add(day)));
+    matches.forEach((entry) => {
+      (entry.dias || []).forEach((day) => daysSet.add(day));
+    });
+
+    const normalizedSessions = (firstSession ? [firstSession, ...sessions.slice(1)] : sessions).map(
+      (session) => ({
+        ...session,
+        modalidad: session.modalidad || modalidad,
+        ubicacion:
+          (session.modalidad || modalidad) === 'en_linea'
+            ? 'Remoto'
+            : pickBetterLocation('', session.ubicacion || ubicacion, session.modalidad || modalidad),
+      }),
+    );
 
     return {
       codigo: item.codigo,
@@ -1394,11 +1516,12 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
       seccion: main.seccion || [...item.secciones][0] || '',
       numeroClase: main.numeroClase || '',
       dias: DAY_ORDER.filter((day) => daysSet.has(day)),
-      horaInicio: item.horaInicio,
-      horaFin: item.horaFin,
+      horaInicio: firstSession?.horaInicio || item.horaInicio,
+      horaFin: firstSession?.horaFin || item.horaFin,
       modalidad,
       ubicacion,
       instructor: normalizeWhitespace(mainInstructor),
+      sesiones: normalizedSessions,
       meetLink: null,
       linkManual: false,
     };
@@ -1408,27 +1531,6 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
     merged.map((entry) => [normalizeWeeklyCode(entry.codigo), entry]),
   );
 
-  const knownOnlineCodes = new Set(['1123C', '1178M', '1115C']);
-  for (const code of knownOnlineCodes) {
-    const entry = mergedByCode.get(code);
-    if (!entry) continue;
-    entry.modalidad = 'en_linea';
-    entry.ubicacion = 'Remoto';
-  }
-
-  const dayOverrides = new Map([
-    ['1123C', ['Martes', 'Jueves']],
-    ['1124C', ['Martes', 'Jueves']],
-    ['1132T', ['Lunes']],
-    ['1178M', ['Lunes', 'Miércoles', 'Jueves']],
-    ['1115C', ['Martes', 'Jueves']],
-  ]);
-  for (const [code, days] of dayOverrides.entries()) {
-    const entry = mergedByCode.get(code);
-    if (!entry) continue;
-    entry.dias = DAY_ORDER.filter((day) => days.includes(day));
-  }
-
   identifiers.forEach((entry) => {
     const key = normalizeWeeklyCode(entry.codigo || '');
     if (!key || mergedByCode.has(key)) {
@@ -1452,6 +1554,15 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
       modalidad,
       ubicacion,
       instructor: normalizeWhitespace(entry.instructor || ''),
+      sesiones: [
+        {
+          dias: DAY_ORDER.filter((day) => new Set(entry.dias || []).has(day)),
+          horaInicio: entry.horaInicio,
+          horaFin: entry.horaFin,
+          modalidad,
+          ubicacion,
+        },
+      ],
       meetLink: null,
       linkManual: false,
     });
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index d3bdc6a..2fcdd24 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -20,8 +20,16 @@ const MAX_DIFF_BYTES = 150 * 1024;
 const VERIFICATION = {
   buildStatus: 'PASS',
   testsRun: 'ninguno',
-  verificationCmd: 'npm run build',
-  verificationOutput: 'vite build completado sin errores (1762 módulos transformados).',
+  verificationCmd:
+    'node -e "require(\'dotenv\').config(); const h=require(\'./electron/handlers/horario\'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { r.materias?.forEach(m => console.log(m.nombre.padEnd(32), \'|\', m.dias.join(\',\').padEnd(35), \'|\', m.horaInicio, \'-\', m.horaFin)); })"',
+  verificationOutput: `◇ injected env (5) from .env // tip: ⌘ enable debugging { debug: true }
+Ingles Universitario A1          | Lunes,Martes,Miércoles,Jueves,Viernes | 07:00 - 08:00
+Precálculo                       | Lunes,Martes,Miércoles,Jueves,Viernes | 08:00 - 09:00
+Sist Operativos y Arq de Comp    | Martes,Miércoles,Jueves             | 09:00 - 11:00
+Tutoria 2 (INSOF)                | Lunes,Martes,Miércoles              | 11:00 - 12:00
+Programacion II c/Lab            | Martes,Miércoles,Jueves             | 11:00 - 14:00
+Matematicas Discretas            | Lunes,Martes,Miércoles,Jueves       | 16:00 - 18:00
+Tecnologia y Empresa             | Martes,Miércoles,Jueves             | 16:00 - 18:00`,
 };
 
 function ensureReportsDir() {
```

### `src/pages/Horario.jsx`
```diff
diff --git a/src/pages/Horario.jsx b/src/pages/Horario.jsx
index 14f7d39..a86b224 100644
--- a/src/pages/Horario.jsx
+++ b/src/pages/Horario.jsx
@@ -68,12 +68,58 @@ function formatLastSync(lastSyncAt) {
   }).format(syncDate)}`;
 }
 
+function normDay(dayValue) {
+  return String(dayValue || '')
+    .trim()
+    .normalize('NFD')
+    .replace(/[\u0300-\u036f]/g, '')
+    .toLowerCase();
+}
+
+function getMateriaSessions(materia) {
+  const sessions = Array.isArray(materia?.sesiones) ? materia.sesiones : [];
+  const validSessions = sessions.filter(
+    (session) =>
+      session &&
+      Array.isArray(session.dias) &&
+      session.dias.length > 0 &&
+      typeof session.horaInicio === 'string' &&
+      typeof session.horaFin === 'string',
+  );
+
+  if (validSessions.length > 0) {
+    return validSessions;
+  }
+
+  if (Array.isArray(materia?.dias) && materia.dias.length > 0 && materia?.horaInicio && materia?.horaFin) {
+    return [
+      {
+        dias: materia.dias,
+        horaInicio: materia.horaInicio,
+        horaFin: materia.horaFin,
+      },
+    ];
+  }
+
+  return [];
+}
+
+function sessionHasDay(session, day) {
+  if (!session || !Array.isArray(session.dias)) {
+    return false;
+  }
+
+  return session.dias.some((sessionDay) => normDay(sessionDay) === normDay(day));
+}
+
 function buildTimeSlots(materias) {
   const ranges = materias
-    .map((materia) => ({
-      start: toMinutes(materia.horaInicio),
-      end: toMinutes(materia.horaFin),
-    }))
+    .flatMap((materia) =>
+      getMateriaSessions(materia).map((session) => ({
+        start: toMinutes(session.horaInicio),
+        end: toMinutes(session.horaFin),
+      })),
+    )
     .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);
 
   if (ranges.length === 0) {
@@ -99,26 +145,38 @@ function findMateriaForSlot(materias, day, slotHora) {
     return null;
   }
 
-  return (
-    materias.find((materia) => {
-      const start = toMinutes(materia.horaInicio);
-      const end = toMinutes(materia.horaFin);
+  for (const materia of materias) {
+    const sessions = getMateriaSessions(materia);
+
+    const matchedSession = sessions.find((session) => {
+      const start = toMinutes(session.horaInicio);
+      const end = toMinutes(session.horaFin);
 
       if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
         return false;
       }
 
-      return Array.isArray(materia.dias) && materia.dias.includes(day) && start <= slotMinutes && end > slotMinutes;
-    }) || null
-  );
+      return sessionHasDay(session, day) && start <= slotMinutes && end > slotMinutes;
+    });
+
+    if (matchedSession) {
+      return { materia, session: matchedSession };
+    }
+  }
+
+  return null;
 }
 
 function getMateriaKey(materia) {
   return materia?.numeroClase || `${materia?.codigo || ''}-${materia?.seccion || ''}-${materia?.nombre || ''}`;
 }
 
-function isFirstSlotForMateria(materias, day, slotHora, materia) {
-  if (!materia || !day) {
+function getSessionKey(session) {
+  return `${session?.horaInicio || ''}-${session?.horaFin || ''}-${(session?.dias || []).map(normDay).join(',')}`;
+}
+
+function isFirstSlotForMateria(materias, day, slotHora, materiaSlot) {
+  if (!materiaSlot?.materia || !materiaSlot?.session || !day) {
     return false;
   }
 
@@ -139,7 +197,11 @@ function isFirstSlotForMateria(materias, day, slotHora, materia) {
     return true;
   }
 
-  return getMateriaKey(previousMateria) !== getMateriaKey(materia);
+  const isSameMateria =
+    getMateriaKey(previousMateria.materia) === getMateriaKey(materiaSlot.materia);
+  const isSameSession = getSessionKey(previousMateria.session) === getSessionKey(materiaSlot.session);
+
+  return !(isSameMateria && isSameSession);
 }
 
 function compactName(name) {
@@ -180,12 +242,26 @@ function Horario({
   const days = useMemo(() => {
     const providedDays = Array.isArray(horario?.diasConClases) ? horario.diasConClases : [];
     if (providedDays.length > 0) {
-      return providedDays;
+      const map = new Map();
+      providedDays.forEach((day) => {
+        const key = normDay(day);
+        if (!map.has(key)) {
+          map.set(key, day?.trim?.() || day);
+        }
+      });
+      return [...map.values()];
     }
 
-    const collected = new Set();
-    materias.forEach((materia) => (materia.dias || []).forEach((day) => collected.add(day)));
-    return [...collected];
+    const collected = new Map();
+    materias.forEach((materia) =>
+      (materia.dias || []).forEach((day) => {
+        const key = normDay(day);
+        if (!collected.has(key)) {
+          collected.set(key, day?.trim?.() || day);
+        }
+      }),
+    );
+    return [...collected.values()];
   }, [horario?.diasConClases, materias]);
   const slots = useMemo(() => buildTimeSlots(materias), [materias]);
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
@@ -375,8 +451,8 @@ function Horario({
                         {format12h(slot)}
                       </td>
                       {days.map((day) => {
-                        const materia = findMateriaForSlot(materias, day, slot);
-                        if (!materia) {
+                        const materiaSlot = findMateriaForSlot(materias, day, slot);
+                        if (!materiaSlot) {
                           return (
                             <td
                               key={`${day}-${slot}`}
@@ -385,8 +461,9 @@ function Horario({
                           );
                         }
 
+                        const { materia, session } = materiaSlot;
                         const isOnline = materia.modalidad === 'en_linea';
-                        const isFirstSlot = isFirstSlotForMateria(materias, day, slot, materia);
+                        const isFirstSlot = isFirstSlotForMateria(materias, day, slot, materiaSlot);
                         const baseClass = isOnline
                           ? 'border-emerald-500/40 bg-emerald-500/20'
                           : 'border-itson-blue/40 bg-itson-blue/20';
@@ -400,7 +477,7 @@ function Horario({
                               <>
                                 <p className="text-xs font-semibold text-white">{compactName(materia.nombre)}</p>
                                 <p className="mt-1 text-xs text-slate-400">
-                                  {materia.ubicacion || (isOnline ? 'Remoto' : 'Sin ubicación')}
+                                  {session?.ubicacion || materia.ubicacion || (isOnline ? 'Remoto' : 'Sin ubicación')}
                                 </p>
                               </>
                             ) : null}
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { r.materias?.forEach(m => console.log(m.nombre.padEnd(32), '|', m.dias.join(',').padEnd(35), '|', m.horaInicio, '-', m.horaFin)); })"
**Output de verificación:**
```
◇ injected env (5) from .env // tip: ⌘ enable debugging { debug: true }
Ingles Universitario A1          | Lunes,Martes,Miércoles,Jueves,Viernes | 07:00 - 08:00
Precálculo                       | Lunes,Martes,Miércoles,Jueves,Viernes | 08:00 - 09:00
Sist Operativos y Arq de Comp    | Martes,Miércoles,Jueves             | 09:00 - 11:00
Tutoria 2 (INSOF)                | Lunes,Martes,Miércoles              | 11:00 - 12:00
Programacion II c/Lab            | Martes,Miércoles,Jueves             | 11:00 - 14:00
Matematicas Discretas            | Lunes,Martes,Miércoles,Jueves       | 16:00 - 18:00
Tecnologia y Empresa             | Martes,Miércoles,Jueves             | 16:00 - 18:00
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
