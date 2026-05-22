# Report 032
**Fecha:** 2026-05-22 16:59  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/horario.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 184ea9b..538ea3b 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -498,6 +498,67 @@ function parsePeopleSoftDays(value) {
   return extractDayTokens(normalized);
 }
 
+function parseDays(raw = '') {
+  const normalized = normalizeWhitespace(raw);
+  const DAY_PATTERNS = [
+    { pattern: /\bLunes\b/i, day: 'Lunes' },
+    { pattern: /\bMartes\b/i, day: 'Martes' },
+    { pattern: /\bMi[eé]rcoles\b/i, day: 'Miércoles' },
+    { pattern: /\bJueves\b/i, day: 'Jueves' },
+    { pattern: /\bViernes\b/i, day: 'Viernes' },
+    { pattern: /\bS[aá]bado\b/i, day: 'Sábado' },
+    { pattern: /\bDomingo\b/i, day: 'Domingo' },
+  ];
+
+  const fromWords = DAY_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(
+    ({ day }) => day,
+  );
+
+  if (fromWords.length > 0) {
+    return [...new Set(fromWords)];
+  }
+
+  const compact = normalized.toUpperCase().replace(/[^A-Z]/g, '');
+  const days = [];
+  let index = 0;
+
+  while (index < compact.length) {
+    if (compact.startsWith('MI', index)) {
+      days.push('Miércoles');
+      index += 2;
+    } else if (compact.startsWith('MA', index)) {
+      days.push('Martes');
+      index += 2;
+    } else if (compact[index] === 'L') {
+      days.push('Lunes');
+      index += 1;
+    } else if (compact[index] === 'M') {
+      if (days.includes('Martes')) {
+        days.push('Miércoles');
+      } else {
+        days.push('Martes');
+      }
+      index += 1;
+    } else if (compact[index] === 'J') {
+      days.push('Jueves');
+      index += 1;
+    } else if (compact[index] === 'V') {
+      days.push('Viernes');
+      index += 1;
+    } else if (compact[index] === 'S') {
+      days.push('Sábado');
+      index += 1;
+    } else if (compact[index] === 'D') {
+      days.push('Domingo');
+      index += 1;
+    } else {
+      index += 1;
+    }
+  }
+
+  return [...new Set(days)];
+}
+
 function getFriendlyDayOrder(days) {
   const normalizedDays = Array.isArray(days) ? days : [];
   return DAY_ORDER.filter((day) => normalizedDays.includes(day));
@@ -542,16 +603,25 @@ function extractCourseFromContext(value) {
   const fallbackCode = extractCode(text);
 
   if (!fallbackCode) {
+    const looseMatch = text.match(/\b(\d{4}[A-Z])\b/i);
+    if (looseMatch) {
+      return { codigo: looseMatch[1].toUpperCase(), nombre: '' };
+    }
     return { codigo: '', nombre: '' };
   }
 
-  const fallbackName = normalizeWhitespace(
+  let fallbackName = normalizeWhitespace(
     text
       .replace(new RegExp(`.*?${fallbackCode}\\s*-\\s*`, 'i'), '')
       .replace(/\s+Estado\b.*/i, '')
       .replace(/\s+N[ºo]\s*Clase\b.*/i, ''),
   );
 
+  if (!fallbackName || fallbackName.length < 4) {
+    const secondary = text.match(new RegExp(`${fallbackCode}\\s*-\\s*([^\\n]+)`, 'i'));
+    fallbackName = normalizeWhitespace(secondary?.[1] || '');
+  }
+
   return {
     codigo: fallbackCode,
     nombre: fallbackName,
@@ -856,25 +926,34 @@ async function collectIdentifiersFromListView(scheduleFrame) {
         }
 
         const containerText = normalize(container?.textContent || '');
-        const rows = Array.from(table.querySelectorAll('tr'))
-          .slice(1)
+        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
+
+        return rows
           .map((row) =>
-            Array.from(row.querySelectorAll('td'))
-              .map((cell) => normalize(cell.textContent || ''))
-              .filter((cell) => cell.length > 0),
+            Array.from(row.querySelectorAll('td')).map((cell) => normalize(cell.textContent || '')),
           )
-          .filter((cells) => cells.length >= 6);
-
-        return rows.map((cells) => ({
-          containerText,
-          numeroClase: cells[0] || '',
-          seccion: cells[1] || '',
-          componente: cells[2] || '',
-          diasHoras: cells[3] || '',
-          ubicacion: cells[4] || '',
-          instructor: cells[5] || '',
-          fechaRango: cells[6] || '',
-        }));
+          .filter((cells) => cells.some(Boolean))
+          .map((cells) => ({
+            containerText,
+            numeroClase: cells[0] || '',
+            seccion: cells[1] || '',
+            componente: cells[2] || '',
+            diasHoras: cells[3] || '',
+            ubicacion: cells[4] || cells.find((value) => /[A-Z]{2,3}\d{3,4}/.test(value)) || '',
+            instructor:
+              cells[5] ||
+              cells
+                .slice(4)
+                .find(
+                  (value) =>
+                    value &&
+                    !/\d{1,2}:\d{2}/i.test(value) &&
+                    !/curso a distancia|aulas?|centro integral|edificio/i.test(value) &&
+                    !/[A-Z]{2,3}\d{3,4}/.test(value),
+                ) ||
+              '',
+            fechaRango: cells[6] || '',
+          }));
       });
     })
     .catch(() => []);
@@ -882,22 +961,29 @@ async function collectIdentifiersFromListView(scheduleFrame) {
   const entries = rawEntries.map((entry) => {
     const { codigo, nombre } = extractCourseFromContext(entry.containerText);
     const hora = parseTimeRange(entry.diasHoras);
-    const days = parsePeopleSoftDays(entry.diasHoras);
+    const days = parseDays(entry.diasHoras);
     const modalidad = inferModalidad(
       `${entry.ubicacion} ${entry.componente} ${entry.containerText}`,
     );
 
+    let horaInicio = hora.horaInicio;
+    let horaFin = hora.horaFin;
+
+    if (horaInicio && horaFin && horaFin <= horaInicio) {
+      [horaInicio, horaFin] = [horaFin, horaInicio];
+    }
+
     return {
       codigo,
       nombre: nombre || codigo || 'Materia sin nombre',
       seccion: entry.seccion || '',
       numeroClase: entry.numeroClase || '',
       dias: days,
-      horaInicio: hora.horaInicio,
-      horaFin: hora.horaFin,
+      horaInicio,
+      horaFin,
       modalidad,
       ubicacion: entry.ubicacion || (modalidad === 'en_linea' ? 'Remoto' : ''),
-      instructor: entry.instructor || '',
+      instructor: normalizeWhitespace(entry.instructor || ''),
       meetLink: null,
       linkManual: false,
     };
@@ -997,6 +1083,71 @@ function combineScheduleRows(rows, identifiers) {
   return [...merged.values()];
 }
 
+function convertTo24h(timeStr) {
+  const normalized = normalizeWhitespace(timeStr).toUpperCase();
+  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
+  if (!match) {
+    return parseTimeTo24h(normalized) || null;
+  }
+
+  let hours = Number.parseInt(match[1], 10);
+  const minutes = match[2];
+  const period = match[3].toUpperCase();
+
+  if (period === 'PM' && hours !== 12) {
+    hours += 12;
+  }
+
+  if (period === 'AM' && hours === 12) {
+    hours = 0;
+  }
+
+  return `${String(hours).padStart(2, '0')}:${minutes}`;
+}
+
+function normalizeWeeklyCode(raw = '') {
+  const cleaned = normalizeWhitespace(raw)
+    .replace(/^[A-Z]\s+/, '')
+    .replace(/\s+/g, '')
+    .toUpperCase();
+
+  const compactPrefixMatch = cleaned.match(/^[A-Z](\d{4}[A-Z])$/);
+  if (compactPrefixMatch) {
+    return compactPrefixMatch[1];
+  }
+
+  return cleaned;
+}
+
+function pickBetterLocation(current, next, modal = 'presencial') {
+  if (modal === 'en_linea') {
+    return 'Remoto';
+  }
+
+  const currentNormalized = normalizeWhitespace(current);
+  const nextNormalized = normalizeWhitespace(next);
+  const currentRoom = currentNormalized.match(/[A-Z]{2,3}\d{3,4}/)?.[0] || '';
+  const nextRoom = nextNormalized.match(/[A-Z]{2,3}\d{3,4}/)?.[0] || '';
+
+  if (nextRoom) {
+    return nextRoom;
+  }
+
+  if (currentRoom) {
+    return currentRoom;
+  }
+
+  if (nextNormalized && !/^(aulas?|remoto)$/i.test(nextNormalized)) {
+    return nextNormalized;
+  }
+
+  if (currentNormalized) {
+    return currentNormalized;
+  }
+
+  return 'Aulas';
+}
+
 async function collectWeeklySchedule(scheduleFrame, identifiers) {
   if (!Array.isArray(identifiers) || identifiers.length === 0) {
     return [];
@@ -1010,10 +1161,10 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
   ]);
   await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);
 
-  const rawRows = await scheduleFrame
+  const parsed = await scheduleFrame
     .evaluate(() => {
       const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
-
+      const DAY_ORDER_INTERNAL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
       const table =
         document.getElementById('STDNT_CLASS_TIM$scroll$0') ||
         document.querySelector('table[id*="STDNT_CLASS_TIM"]') ||
@@ -1022,140 +1173,341 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
         document.querySelector('table');
 
       if (!table) {
-        return [];
+        return { entries: [], daysConClases: [] };
       }
 
-      const rows = Array.from(table.querySelectorAll('tr'));
-      const matrix = [];
-
-      rows.forEach((row, rowIndex) => {
-        if (!matrix[rowIndex]) {
-          matrix[rowIndex] = [];
-        }
+      const buildTableMatrix = (tableElement) => {
+        const rows = Array.from(tableElement.querySelectorAll('tr'));
+        const matrix = [];
 
-        let colIndex = 0;
-        Array.from(row.querySelectorAll('td, th')).forEach((cell) => {
-          while (matrix[rowIndex][colIndex]) {
-            colIndex += 1;
+        rows.forEach((row, rowIdx) => {
+          if (!matrix[rowIdx]) {
+            matrix[rowIdx] = [];
           }
 
-          const rowspan = Math.max(Number.parseInt(cell.getAttribute('rowspan') || '1', 10), 1);
-          const colspan = Math.max(Number.parseInt(cell.getAttribute('colspan') || '1', 10), 1);
-          const content = normalize(cell.textContent || '');
-
-          for (let r = 0; r < rowspan; r += 1) {
-            if (!matrix[rowIndex + r]) {
-              matrix[rowIndex + r] = [];
+          let colIdx = 0;
+          Array.from(row.querySelectorAll('td, th')).forEach((cell) => {
+            while (matrix[rowIdx][colIdx] !== undefined) {
+              colIdx += 1;
             }
 
-            for (let c = 0; c < colspan; c += 1) {
-              matrix[rowIndex + r][colIndex + c] = {
-                content,
-                isOrigin: r === 0 && c === 0,
-              };
+            const rowspan = Number.parseInt(cell.getAttribute('rowspan') || '1', 10) || 1;
+            const colspan = Number.parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
+            const content = cell.innerText?.trim() || '';
+
+            for (let r = 0; r < rowspan; r += 1) {
+              if (!matrix[rowIdx + r]) {
+                matrix[rowIdx + r] = [];
+              }
+              for (let c = 0; c < colspan; c += 1) {
+                matrix[rowIdx + r][colIdx + c] = {
+                  content,
+                  isOrigin: r === 0 && c === 0,
+                  rowspan,
+                };
+              }
             }
+            colIdx += colspan;
+          });
+        });
+
+        return matrix;
+      };
+
+      const parseDaysLocal = (raw = '') => {
+        const normalized = normalize(raw);
+        const DAY_PATTERNS = [
+          { pattern: /\bLunes\b/i, day: 'Lunes' },
+          { pattern: /\bMartes\b/i, day: 'Martes' },
+          { pattern: /\bMi[eé]rcoles\b/i, day: 'Miércoles' },
+          { pattern: /\bJueves\b/i, day: 'Jueves' },
+          { pattern: /\bViernes\b/i, day: 'Viernes' },
+          { pattern: /\bS[aá]bado\b/i, day: 'Sábado' },
+          { pattern: /\bDomingo\b/i, day: 'Domingo' },
+        ];
+
+        const fromWords = DAY_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(
+          ({ day }) => day,
+        );
+        if (fromWords.length > 0) {
+          return [...new Set(fromWords)];
+        }
+
+        const compact = normalized.toUpperCase().replace(/[^A-Z]/g, '');
+        const days = [];
+        let i = 0;
+        while (i < compact.length) {
+          if (compact.startsWith('MI', i)) {
+            days.push('Miércoles'); i += 2;
+          } else if (compact.startsWith('MA', i)) {
+            days.push('Martes'); i += 2;
+          } else if (compact[i] === 'L') {
+            days.push('Lunes'); i += 1;
+          } else if (compact[i] === 'M') {
+            days.includes('Martes') ? days.push('Miércoles') : days.push('Martes'); i += 1;
+          } else if (compact[i] === 'J') {
+            days.push('Jueves'); i += 1;
+          } else if (compact[i] === 'V') {
+            days.push('Viernes'); i += 1;
+          } else if (compact[i] === 'S') {
+            days.push('Sábado'); i += 1;
+          } else if (compact[i] === 'D') {
+            days.push('Domingo'); i += 1;
+          } else {
+            i += 1;
           }
+        }
+        return [...new Set(days)];
+      };
 
-          colIndex += colspan;
-        });
-      });
+      const convertTo24hLocal = (timeStr) => {
+        const match = (timeStr || '').trim().match(/(\d+):(\d+)(AM|PM)/i);
+        if (!match) return null;
+        let hours = Number.parseInt(match[1], 10);
+        const minutes = match[2];
+        const period = match[3].toUpperCase();
+        if (period === 'PM' && hours !== 12) hours += 12;
+        if (period === 'AM' && hours === 12) hours = 0;
+        return `${String(hours).padStart(2, '0')}:${minutes}`;
+      };
+
+      const parseCellContent = (content, diaNombre) => {
+        const lines = String(content || '')
+          .split('\n')
+          .map((line) => line.trim())
+          .filter(Boolean);
+
+        if (lines.length < 3) return null;
+
+        const firstLine = lines[0].replace(/\s+/g, ' ');
+        const codigoMatch = firstLine.match(/^([A-Z]\s+[\w]+)\s*-\s*(\d+)$/i);
+        if (!codigoMatch) return null;
+
+        const codigoRaw = codigoMatch[1].replace(/\s+/g, '').toUpperCase();
+        const seccion = codigoMatch[2];
+        const componente = lines[1] || 'Teoria';
+        const horaMatch = (lines[2] || '').match(/(\d+:\d+(?:AM|PM))\s*-\s*(\d+:\d+(?:AM|PM))/i);
+        if (!horaMatch) return null;
 
+        let horaInicio = convertTo24hLocal(horaMatch[1]);
+        let horaFin = convertTo24hLocal(horaMatch[2]);
+        if (!horaInicio || !horaFin) return null;
+
+        if (horaFin <= horaInicio) {
+          [horaInicio, horaFin] = [horaFin, horaInicio];
+        }
+        if (horaFin === horaInicio) return null;
+
+        const ubicacionText = lines.slice(3).join(' ');
+        const esEnLinea = /curso a distancia|herramientas de internet/i.test(lines.slice(2).join(' '));
+        const salonMatch = ubicacionText.match(/[A-Z]{2,3}\d{3,4}/);
+        const ubicacion = salonMatch ? salonMatch[0] : (esEnLinea ? 'Remoto' : (ubicacionText.trim() || 'Aulas'));
+        const dias = parseDaysLocal(diaNombre);
+
+        if (dias.length === 0) return null;
+
+        return {
+          codigoRaw,
+          seccion,
+          componente,
+          horaInicio,
+          horaFin,
+          dias,
+          ubicacion,
+          esEnLinea,
+        };
+      };
+
+      const matrix = buildTableMatrix(table);
       const headerRowIndex = matrix.findIndex((row) =>
-        row?.some((cell) => normalize(cell?.content || '').toLowerCase() === 'hora'),
+        Array.isArray(row) && row.some((cell) => /^hora$/i.test(normalize(cell?.content || ''))),
       );
 
-      if (headerRowIndex < 0 || !matrix[headerRowIndex]) {
-        return [];
+      if (headerRowIndex < 0) {
+        return { entries: [], daysConClases: [] };
       }
 
-      const headerRow = matrix[headerRowIndex];
-      const dayHeaders = headerRow.slice(1).map((cell) => normalize(cell?.content || ''));
-      const output = [];
+      const headerRow = matrix[headerRowIndex] || [];
+      const dayHeaders = headerRow.map((cell) => normalize(cell?.content || ''));
+      const entries = [];
+      const daySet = new Set();
 
       for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
         const row = matrix[rowIndex];
-        if (!row || row.length < 2) {
-          continue;
-        }
-
-        const timeLabel = normalize(row[0]?.content || '');
-        if (!timeLabel || !/\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(timeLabel)) {
-          continue;
-        }
+        if (!Array.isArray(row)) continue;
 
-        for (let colIndex = 1; colIndex < row.length && colIndex <= dayHeaders.length; colIndex += 1) {
-          const dayHeader = dayHeaders[colIndex - 1];
+        for (let colIndex = 1; colIndex < row.length; colIndex += 1) {
           const cell = row[colIndex];
-          const cellText = normalize(cell?.content || '');
+          if (!cell || !cell.isOrigin) continue;
 
-          if (!dayHeader || !cellText || /^-+$/.test(cellText)) {
-            continue;
-          }
+          const dayName = dayHeaders[colIndex] || '';
+          if (!dayName) continue;
 
-          if (!/\b\d{4}[A-Z]\b/i.test(cellText) && !/[A-Z]\s*\d{4}[A-Z]\s*-\s*\d{2,4}/i.test(cellText)) {
-            continue;
-          }
+          const parsedCell = parseCellContent(cell.content, dayName);
+          if (!parsedCell) continue;
 
-          output.push({
-            dayHeader,
-            timeLabel,
-            rawText: cellText,
-            isOrigin: Boolean(cell?.isOrigin),
-            rowIndex,
-            colIndex,
-          });
+          parsedCell.dias.forEach((day) => daySet.add(day));
+          entries.push(parsedCell);
         }
       }
 
-      return output;
+      return {
+        entries,
+        daysConClases: DAY_ORDER_INTERNAL.filter((day) => daySet.has(day)),
+      };
     })
-    .catch(() => []);
+    .catch(() => ({ entries: [], daysConClases: [] }));
 
-  if (!Array.isArray(rawRows) || rawRows.length === 0) {
+  const rawRows = Array.isArray(parsed?.entries) ? parsed.entries : [];
+  if (rawRows.length === 0) {
     return identifiers;
   }
 
-  const parsedRows = rawRows.map((item) => {
-    const combinedText = `${item.dayHeader} ${item.rawText}`;
-    const rawTextNormalized = normalizeWhitespace(item.rawText).replace(
-      /(\d{3,4})(\d{1,2}:\d{2}\s*(?:AM|PM))/gi,
-      '$1 $2',
+  const byCode = new Map();
+  rawRows.forEach((row) => {
+    const key = normalizeWeeklyCode(row.codigoRaw);
+    if (!key) return;
+
+    if (!byCode.has(key)) {
+      byCode.set(key, {
+        codigoRaw: row.codigoRaw,
+        codigo: key,
+        secciones: new Set(),
+        componentes: new Set(),
+        dias: new Set(),
+        horaInicio: row.horaInicio,
+        horaFin: row.horaFin,
+        ubicacion: row.ubicacion,
+        modalidad: row.esEnLinea ? 'en_linea' : 'presencial',
+      });
+    }
+
+    const current = byCode.get(key);
+    current.secciones.add(row.seccion);
+    current.componentes.add(normalizeWhitespace(row.componente));
+    row.dias.forEach((day) => current.dias.add(day));
+
+    if (row.horaInicio && (!current.horaInicio || row.horaInicio < current.horaInicio)) {
+      current.horaInicio = row.horaInicio;
+    }
+    if (row.horaFin && (!current.horaFin || row.horaFin > current.horaFin)) {
+      current.horaFin = row.horaFin;
+    }
+
+    if (row.esEnLinea) {
+      current.modalidad = 'en_linea';
+    }
+
+    current.ubicacion = pickBetterLocation(current.ubicacion, row.ubicacion, current.modalidad);
+  });
+
+  const identifierByCode = new Map();
+  identifiers.forEach((item) => {
+    const key = normalizeWeeklyCode(item.codigo || '');
+    if (!key) return;
+    if (!identifierByCode.has(key)) {
+      identifierByCode.set(key, []);
+    }
+    identifierByCode.get(key).push(item);
+  });
+
+  const merged = [...byCode.values()].map((item) => {
+    const matches = identifierByCode.get(item.codigo) || [];
+    const byComponent = matches.find(
+      (entry) =>
+        entry.componente &&
+        [...item.componentes].some((comp) =>
+          normalizeForCompare(entry.componente).includes(normalizeForCompare(comp)),
+        ),
     );
-    const range = parseTimeRange(`${rawTextNormalized} ${item.timeLabel}`);
-    const sectionMatch = normalizeWhitespace(item.rawText).match(/-\s*(\d{2,4})(?=[A-Za-z]|\s|$)/i);
-    const modalValue = inferModalidad(item.rawText);
-    const parsedDays = extractDayTokens(item.dayHeader);
+    const main = byComponent || matches[0] || {};
+    const fallbackName = main.nombre || main.codigo || `Materia ${item.codigo}`;
+    const mainInstructor =
+      matches.find((entry) => normalizeWhitespace(entry.instructor || ''))?.instructor ||
+      main.instructor ||
+      '';
+    const modalidad = item.modalidad === 'en_linea' ? 'en_linea' : inferModalidad(`${item.ubicacion} ${fallbackName}`);
+    const ubicacion =
+      modalidad === 'en_linea'
+        ? 'Remoto'
+        : pickBetterLocation(main.ubicacion || '', item.ubicacion || '', modalidad);
+
+    const allDaysFromList = new Set(item.dias);
+    let start = item.horaInicio;
+    let end = item.horaFin;
+    matches.forEach((entry) => {
+      if (allDaysFromList.size === 0) {
+        (entry.dias || []).forEach((day) => allDaysFromList.add(day));
+      }
+      if (entry.horaInicio && (!start || entry.horaInicio < start)) {
+        start = entry.horaInicio;
+      }
+      if (entry.horaFin && (!end || entry.horaFin > end)) {
+        end = entry.horaFin;
+      }
+    });
+
+    if (start && end && end <= start) {
+      [start, end] = [end, start];
+    }
 
     return {
-      codigo: extractCode(item.rawText),
-      nombre: '',
-      dias: parsedDays.length > 0 ? parsedDays : parsePeopleSoftDays(item.dayHeader || combinedText),
-      horaInicio: range.horaInicio,
-      horaFin: range.horaFin,
-      modalidad: modalValue,
-      ubicacion:
-        modalValue === 'en_linea'
-          ? 'Remoto'
-          : normalizeWhitespace(
-              item.rawText.match(/(?:aulas?|edificio|room|lm\d{3,4}|am\d{3,4})[^ ]*/i)?.[0] || '',
-            ),
-      instructor: '',
-      seccion: normalizeWhitespace(sectionMatch?.[1] || ''),
-      numeroClase: '',
-      rawText: rawTextNormalized,
+      codigo: item.codigo,
+      nombre: fallbackName,
+      seccion: main.seccion || [...item.secciones][0] || '',
+      numeroClase: main.numeroClase || '',
+      dias: DAY_ORDER.filter((day) => allDaysFromList.has(day)),
+      horaInicio: start,
+      horaFin: end,
+      modalidad,
+      ubicacion,
+      instructor: normalizeWhitespace(mainInstructor),
+      meetLink: null,
+      linkManual: false,
     };
   });
 
-  const completedRows = parsedRows.filter(
-    (row) => row.horaInicio && row.horaFin && Array.isArray(row.dias) && row.dias.length > 0,
+  const mergedByCode = new Map(
+    merged.map((entry) => [normalizeWeeklyCode(entry.codigo), entry]),
   );
 
-  if (completedRows.length === 0) {
-    return identifiers;
-  }
+  identifiers.forEach((entry) => {
+    const key = normalizeWeeklyCode(entry.codigo || '');
+    if (!key || mergedByCode.has(key)) {
+      return;
+    }
+
+    const modalidad = entry.modalidad || inferModalidad(`${entry.ubicacion} ${entry.nombre}`);
+    const ubicacion = modalidad === 'en_linea' ? 'Remoto' : pickBetterLocation('', entry.ubicacion || '', modalidad);
+    if (!entry.horaInicio || !entry.horaFin || entry.horaFin <= entry.horaInicio) {
+      return;
+    }
+
+    mergedByCode.set(key, {
+      codigo: key,
+      nombre: entry.nombre || `Materia ${key}`,
+      seccion: entry.seccion || '',
+      numeroClase: entry.numeroClase || '',
+      dias: DAY_ORDER.filter((day) => new Set(entry.dias || []).has(day)),
+      horaInicio: entry.horaInicio,
+      horaFin: entry.horaFin,
+      modalidad,
+      ubicacion,
+      instructor: normalizeWhitespace(entry.instructor || ''),
+      meetLink: null,
+      linkManual: false,
+    });
+  });
 
-  const merged = combineScheduleRows(completedRows, identifiers);
-  return merged.length > 0 ? merged : identifiers;
+  return [...mergedByCode.values()].filter(
+    (row) =>
+      row.codigo &&
+      row.horaInicio &&
+      row.horaFin &&
+      row.horaFin > row.horaInicio &&
+      Array.isArray(row.dias) &&
+      row.dias.length > 0,
+  );
 }
 
 function chunkArray(items, chunkSize) {
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
