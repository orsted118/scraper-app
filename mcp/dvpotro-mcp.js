#!/usr/bin/env node
// Servidor MCP de DVPotro — SOLO LECTURA.
//
// Expone a un cliente MCP (Claude Code) lo que la app ya scrapeó: actividades
// con su consigna y rúbrica, horario, material por materia, asistencia, notas,
// calendario y notificaciones.
//
// POR QUÉ LEE ARCHIVOS Y NO HABLA CON LA APP
// Todo el estado de DVPotro ya vive como JSON plano en `userData`. Un puente
// IPC o un servidor HTTP no agregarían un solo dato y sí agregarían un puerto
// abierto con el nombre, la matrícula y las calificaciones del alumno detrás.
// Por stdio no hay puerto, no hay auth que administrar y no hace falta que la
// app esté corriendo.
//
// POR QUÉ EXISTE, SI EL CLIENTE PODRÍA LEER LOS JSON SOLO
// Porque `actividades-cache.json` son ~300 KB (unos 75.000 tokens). Volcarlo
// entero quema la ventana de contexto. El valor de este servidor es FILTRAR:
// las listas devuelven resúmenes y el detalle se pide de a uno.
//
// SIN DEPENDENCIAS a propósito: el transporte stdio de MCP es JSON-RPC 2.0
// delimitado por saltos de línea. Meter el SDK oficial (ESM) en un proyecto
// CommonJS costaba más que estas líneas.
//
// Uso:  node mcp/dvpotro-mcp.js
// Registro en Claude Code:
//   claude mcp add dvpotro -- node "<ruta absoluta>/mcp/dvpotro-mcp.js"
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Acceso a los datos
// ---------------------------------------------------------------------------

// Mismo directorio que `app.getPath('userData')` de Electron. Se puede pisar
// con DVPOTRO_USER_DATA para apuntar a una copia sin tocar la instalación real.
function getUserDataDir() {
  if (process.env.DVPOTRO_USER_DATA) {
    return process.env.DVPOTRO_USER_DATA;
  }

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'dvpotro');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'dvpotro');
  }

  return path.join(os.homedir(), '.config', 'dvpotro');
}

const USER_DATA = getUserDataDir();

// Versiones de esquema que este servidor sabe leer. Si la app avanza y el
// servidor no, hay que AVISARLO: devolver datos viejos como si fueran actuales
// es peor que no devolver nada.
const SCHEMA = {
  'actividades-cache.json': { campo: 'schemaVersion', esperada: 6 },
  'material.json': { campo: 'version', esperada: 3 },
  'horario-cache.json': { campo: 'schemaVersion', esperada: 2 },
  'attendance.json': { campo: 'version', esperada: 1 },
};

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// `writeJson` de la app no es atómico (escribe en el destino, no en un .tmp que
// después renombra). Si la app sincroniza justo mientras leemos, agarramos un
// JSON cortado a la mitad. Reintentar un par de veces cubre esa ventana.
function readJson(file) {
  const full = path.join(USER_DATA, file);

  for (let intento = 0; intento < 3; intento += 1) {
    let raw;

    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { falta: true, file };
      }

      return { error: `No se pudo leer ${file}: ${error.message}` };
    }

    try {
      return { data: JSON.parse(raw) };
    } catch (_parseError) {
      if (intento < 2) sleepSync(150);
    }
  }

  return { error: `${file} está a medio escribir (la app debe estar sincronizando). Reintentá en unos segundos.` };
}

function edad(timestamp) {
  const ms = Date.now() - new Date(timestamp).getTime();

  if (!Number.isFinite(ms)) return 'sin fecha';
  if (ms < 60_000) return 'recién';

  const min = Math.round(ms / 60_000);
  if (min < 60) return `hace ${min} min`;

  const horas = Math.round(min / 60);
  if (horas < 48) return `hace ${horas} h`;

  return `hace ${Math.round(horas / 24)} días`;
}

// Encabezado con la frescura y el estado del esquema. Va en TODA respuesta: sin
// esto el cliente no puede distinguir un dato de hoy de uno de la semana pasada.
function cabecera(file, data) {
  const partes = [`caché ${file}`];

  if (data?.timestamp) partes.push(edad(data.timestamp));

  const spec = SCHEMA[file];

  if (spec) {
    const actual = data?.[spec.campo];

    if (actual !== spec.esperada) {
      partes.push(
        `AVISO: esquema v${actual ?? '?'} y este servidor espera v${spec.esperada} — puede faltar información`,
      );
    }
  }

  return `[${partes.join(' · ')}]`;
}

// Carga con el manejo de faltantes ya resuelto: devuelve o los datos o un texto
// que explica qué hacer.
function cargar(file, queHacer) {
  const res = readJson(file);

  if (res.falta) {
    return { fallo: `No hay caché de ${file}. ${queHacer}` };
  }

  if (res.error) {
    return { fallo: res.error };
  }

  return { data: res.data, cabecera: cabecera(file, res.data) };
}

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------

const norm = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const incluye = (haystack, needle) => norm(haystack).includes(norm(needle));

// Recorta preservando palabras: cortar a la mitad de una palabra hace que el
// texto parezca corrupto en vez de recortado.
function extracto(texto, max) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();

  if (limpio.length <= max) return limpio;

  return `${limpio.slice(0, limpio.lastIndexOf(' ', max) || max)}…`;
}

function lista(items) {
  return items.length ? items.join('\n') : '(nada)';
}

// El portal escribe "-" o "—" en las celdas vacías de la tabla de estado. Sin
// esto, una actividad PENDIENTE mostraba la línea "ENTREGADA: -", que es
// justamente lo contrario de la verdad.
function vacio(value) {
  const limpio = String(value ?? '').trim();
  return !limpio || limpio === '-' || limpio === '—';
}

const oNada = (value) => (vacio(value) ? null : String(value).trim());

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const TOOLS = [];

function tool(name, description, inputSchema, handler) {
  TOOLS.push({ name, description, inputSchema, handler });
}

const SIN_ARGS = { type: 'object', properties: {} };

tool(
  'dvpotro_estado',
  'Qué datos tiene DVPotro cacheados y qué tan frescos están. Conviene llamarlo primero: dice qué módulos tienen información y cuáles hay que sincronizar en la app antes de poder consultarlos.',
  SIN_ARGS,
  () => {
    const archivos = [
      ['actividades-cache.json', 'actividades', (d) => `${d.actividades?.length || 0} actividades`],
      ['material.json', 'material', (d) => `${d.materias?.length || 0} materias, ${(d.materias || []).reduce((s, m) => s + (m.totalRecursos || 0), 0)} recursos`],
      ['horario-cache.json', 'horario', (d) => `${d.materias?.length || 0} materias`],
      ['attendance.json', 'asistencia', (d) => `${d.materias?.length || 0} materias`],
      ['calendario-cache.json', 'calendario', (d) => `${d.events?.length || 0} eventos`],
      ['notes.json', 'notas', (d) => `${Array.isArray(d) ? d.length : 0} notas`],
      ['notifications.json', 'notificaciones', (d) => `${d.items?.length || 0} items`],
      ['cia-cache.json', 'calificaciones', (d) => `${d.materias?.length || 0} materias`],
    ];

    const filas = archivos.map(([file, etiqueta, resumen]) => {
      const res = readJson(file);

      if (res.falta) return `  ${etiqueta.padEnd(16)} sin caché — sincronizá ese módulo en DVPotro`;
      if (res.error) return `  ${etiqueta.padEnd(16)} ERROR: ${res.error}`;

      const spec = SCHEMA[file];
      const aviso =
        spec && res.data?.[spec.campo] !== spec.esperada
          ? `  ⚠ esquema v${res.data?.[spec.campo] ?? '?'} (se espera v${spec.esperada})`
          : '';

      return `  ${etiqueta.padEnd(16)} ${resumen(res.data)} · ${res.data?.timestamp ? edad(res.data.timestamp) : 'sin fecha'}${aviso}`;
    });

    return `Datos de DVPotro en ${USER_DATA}\n\n${filas.join('\n')}`;
  },
);

tool(
  'dvpotro_materias',
  'Las materias del ciclo con su clave, periodo, profesor y contadores: cuánto material hay, cuántas actividades por estado y el resumen de asistencia. Vista de conjunto del semestre.',
  SIN_ARGS,
  () => {
    const mat = cargar('material.json', 'Sincronizá Material en DVPotro.');
    const act = readJson('actividades-cache.json');
    const asis = readJson('attendance.json');
    const hor = readJson('horario-cache.json');

    if (mat.fallo) return mat.fallo;

    const actividades = act.data?.actividades || [];
    const bloques = mat.data.materias.map((materia) => {
      const suyas = actividades.filter((a) => norm(a.materia) === norm(materia.nombre));
      const porEstado = suyas.reduce((acc, a) => ({ ...acc, [a.estado]: (acc[a.estado] || 0) + 1 }), {});
      const asistencia = (asis.data?.materias || []).find((m) => norm(m.materia) === norm(materia.nombre));
      const profesor = suyas.find((a) => a.profesor)?.profesor
        || (hor.data?.materias || []).find((m) => norm(m.nombre) === norm(materia.nombre))?.instructor
        || '—';

      const conteo = ['pendiente', 'retrasada', 'cerrada', 'entregada']
        .filter((estado) => porEstado[estado])
        .map((estado) => `${porEstado[estado]} ${estado}${porEstado[estado] > 1 && estado !== 'pendiente' ? 's' : ''}`)
        .join(', ') || 'sin actividades';

      return [
        `${materia.codigo || '—'}  ${materia.nombre}`,
        `   profesor: ${profesor}`,
        `   periodo:  ${materia.periodo || '—'}`,
        `   material: ${materia.totalRecursos} recursos en ${materia.secciones.length} secciones`,
        `   tareas:   ${conteo}`,
        asistencia ? `   asistencia: ${asistencia.resumen?.porcentaje || '—'} (${asistencia.resumen?.puntos || '—'})` : null,
        (materia.enlacesVivos || []).length
          ? `   enlaces:  ${materia.enlacesVivos.map((e) => `${e.tipo} ${e.url}`).join(' | ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
    });

    return `${mat.cabecera}\n\n${bloques.join('\n\n')}`;
  },
);

tool(
  'dvpotro_actividades',
  'Lista RESUMIDA de actividades, filtrable. No devuelve la consigna completa — para eso está dvpotro_actividad, que trae una sola. Estados: pendiente, retrasada, cerrada, entregada.',
  {
    type: 'object',
    properties: {
      estado: {
        type: 'string',
        enum: ['pendiente', 'retrasada', 'cerrada', 'entregada', 'todas'],
        description: 'Por defecto muestra las que requieren acción (pendiente y retrasada).',
      },
      materia: { type: 'string', description: 'Nombre o parte del nombre de la materia.' },
      buscar: { type: 'string', description: 'Texto en el nombre o en la consigna.' },
    },
  },
  ({ estado, materia, buscar }) => {
    const res = cargar('actividades-cache.json', 'Sincronizá Actividades en DVPotro.');
    if (res.fallo) return res.fallo;

    let items = res.data.actividades || [];

    if (!estado || estado === 'todas') {
      if (!estado) items = items.filter((a) => a.estado === 'pendiente' || a.estado === 'retrasada');
    } else {
      items = items.filter((a) => a.estado === estado);
    }

    if (materia) items = items.filter((a) => incluye(a.materia, materia));
    if (buscar) items = items.filter((a) => incluye(a.nombre, buscar) || incluye(a.instrucciones, buscar));

    const filas = items.map((a) => {
      const marcas = [
        a.rubrica ? 'rúbrica' : null,
        (a.imagenes || []).length ? `${a.imagenes.length} img` : null,
        (a.archivos || []).length ? `${a.archivos.length} adj` : null,
        (a.tablas || []).length ? `${a.tablas.length} tabla${a.tablas.length > 1 ? 's' : ''}` : null,
        a.bloqueo ? `bloqueo:${a.bloqueo}` : null,
        a.modalidad === 'equipo' ? 'en equipo' : null,
      ].filter(Boolean);

      return [
        `[${a.id}] ${a.nombre}`,
        `   ${a.materia} · ${a.estado}` + (a.estado === 'entregada' ? ` el ${oNada(a.fechaEntrega) || '?'}` : ` · vence ${oNada(a.fechaLimite) || 'sin fecha'}`),
        marcas.length ? `   tiene: ${marcas.join(', ')}` : null,
        a.instrucciones ? `   ${extracto(a.instrucciones, 180)}` : '   (sin consigna publicada)',
      ]
        .filter(Boolean)
        .join('\n');
    });

    return `${res.cabecera}\n${items.length} actividades\n\n${lista(filas)}\n\nPara la consigna completa de una: dvpotro_actividad con su id.`;
  },
);

tool(
  'dvpotro_actividad',
  'UNA actividad completa: consigna en markdown (con tablas e imágenes), rúbrica, adjuntos del profe, enlaces y datos de la entrega. Se pide de a una porque una sola rúbrica puede pasar los 7.000 caracteres.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto que devuelve dvpotro_actividades.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre de la actividad.' },
      incluir_rubrica: { type: 'boolean', description: 'Rúbrica completa. Por defecto true.' },
    },
  },
  ({ id, nombre, incluir_rubrica = true }) => {
    const res = cargar('actividades-cache.json', 'Sincronizá Actividades en DVPotro.');
    if (res.fallo) return res.fallo;

    const items = res.data.actividades || [];
    const encontradas = id
      ? items.filter((a) => String(a.id) === String(id))
      : items.filter((a) => incluye(a.nombre, nombre || ''));

    if (!nombre && !id) return 'Pasá `id` o `nombre`.';
    if (!encontradas.length) return `Sin coincidencias. Usá dvpotro_actividades para ver los ids disponibles.`;
    if (encontradas.length > 1) {
      return `Coinciden ${encontradas.length}. Especificá el id:\n${encontradas.map((a) => `  [${a.id}] ${a.nombre} (${a.materia})`).join('\n')}`;
    }

    const a = encontradas[0];
    const bloques = [
      `${res.cabecera}`,
      '',
      `# ${a.nombre}`,
      `${a.materia}${a.profesor ? ` · ${a.profesor}` : ''}`,
      `estado: ${a.estado} · modalidad: ${a.modalidad}${a.equipo ? ` (${a.equipo})` : ''} · ventana: ${a.ventana}`,
      `fecha límite: ${a.fechaLimite}`,
      oNada(a.fechaPublicacion) ? `publicada: ${a.fechaPublicacion}` : null,
      oNada(a.fechaCierre) ? `cierre: ${a.fechaCierre}` : null,
      oNada(a.fechaEntrega) ? `ENTREGADA: ${a.fechaEntrega}` : null,
      (a.entregaArchivos || []).length
        ? `archivos entregados: ${a.entregaArchivos.map((f) => f.name).join(', ')}`
        : null,
      a.bloqueo ? `bloqueo: ${a.bloqueo}` : null,
      a.url ? `url: ${a.url}` : null,
      '',
      '## Consigna',
      a.instruccionesMarkdown || a.instrucciones || '(el profesor no publicó consigna en iVirtual)',
    ];

    if ((a.imagenes || []).length) {
      bloques.push(
        '',
        '## Imágenes de la consigna',
        // Se da la URL y no el archivo: las de pluginfile necesitan la cookie de
        // sesión del alumno, que este servidor no tiene ni debería tener.
        ...a.imagenes.map((img) => `- ${img.alt || img.titulo || 'sin descripción'} → ${img.url}${img.requiereSesion ? ' (requiere sesión de iVirtual)' : ''}`),
      );
    }

    if ((a.archivos || []).length) {
      bloques.push('', '## Adjuntos del profesor', ...a.archivos.map((f) => `- ${f.name} → ${f.url}`));
    }

    if ((a.enlaces || []).length) {
      bloques.push('', '## Enlaces', ...a.enlaces.map((l) => `- [${l.tipo}] ${l.texto} → ${l.url}`));
    }

    if ((a.tablas || []).length) {
      bloques.push('', '## Tablas de la consigna', ...a.tablas.map((t) => `${t.titulo ? `**${t.titulo}**\n` : ''}${t.markdown}`));
    }

    if (a.rubrica) {
      bloques.push(
        '',
        `## ${a.rubrica.titulo || 'Rúbrica'}`,
        incluir_rubrica
          ? a.rubrica.markdown
          : `(${a.rubrica.filas.length} criterios — pedila con incluir_rubrica:true)`,
      );
    }

    return bloques.filter((b) => b !== null).join('\n');
  },
);

tool(
  'dvpotro_horario',
  'El horario semanal: materias, días, horas, aula o modalidad y el enlace de videollamada de las clases en línea.',
  {
    type: 'object',
    properties: {
      dia: {
        type: 'string',
        description: 'Filtra por día (lunes, martes…). "hoy" usa el día actual.',
      },
    },
  },
  ({ dia }) => {
    const res = cargar('horario-cache.json', 'Sincronizá Horario en DVPotro.');
    if (res.fallo) return res.fallo;

    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const objetivo = dia ? (norm(dia) === 'hoy' ? DIAS[new Date().getDay()] : dia) : null;

    const bloques = (res.data.materias || [])
      .map((m) => {
        const sesiones = (m.sesiones?.length ? m.sesiones : [m]).filter(
          (s) => !objetivo || (s.dias || []).some((d) => incluye(d, objetivo)),
        );

        if (!sesiones.length) return null;

        const lineas = sesiones.map((s) => {
          const donde = s.modalidad === 'en_linea' ? (m.meetLink || m.linkManual || 'en línea, sin enlace') : (s.ubicacion || 'sin aula');
          return `   ${(s.dias || []).join(', ')}  ${s.horaInicio}–${s.horaFin}  ${donde}`;
        });

        return [`${m.codigo || '—'}  ${m.nombre}${m.instructor ? ` · ${m.instructor}` : ''}`, ...lineas].join('\n');
      })
      .filter(Boolean);

    return `${res.cabecera}${objetivo ? `\nFiltrado por: ${objetivo}` : ''}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_material',
  'Material publicado por los profesores: presentaciones, apuntes, carpetas, enlaces de Drive y foros, agrupado por materia y sección.',
  {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Nombre o parte del nombre. Sin esto devuelve solo el conteo por materia.' },
      buscar: { type: 'string', description: 'Texto en el nombre o la descripción del recurso, en todas las materias.' },
    },
  },
  ({ materia, buscar }) => {
    const res = cargar('material.json', 'Sincronizá Material en DVPotro.');
    if (res.fallo) return res.fallo;

    let materias = res.data.materias || [];

    if (materia) materias = materias.filter((m) => incluye(m.nombre, materia) || incluye(m.codigo, materia));

    // Sin materia ni búsqueda solo se listan los conteos: volcar el material de
    // las cinco materias son decenas de miles de tokens y casi nunca se quieren
    // todas a la vez.
    if (!materia && !buscar) {
      const filas = materias.map((m) => `  ${(m.codigo || '—').padEnd(12)} ${m.nombre.padEnd(32)} ${m.totalRecursos} recursos`);
      return `${res.cabecera}\n\n${filas.join('\n')}\n\nPedí una con \`materia\`, o buscá en todas con \`buscar\`.`;
    }

    const bloques = materias
      .map((m) => {
        const secciones = m.secciones
          .map((s) => {
            const recursos = s.recursos.filter(
              (r) => !buscar || incluye(r.nombre, buscar) || incluye(r.descripcion, buscar),
            );

            if (!recursos.length) return null;

            const filas = recursos.map((r) => {
              const destino = r.destino || r.urlModulo || '';
              const archivos = (r.archivos || []).map((f) => f.nombre).join(', ');
              return `   - [${r.tipo}] ${r.nombre}${archivos ? ` → ${archivos}` : ''}${destino ? `\n     ${destino}` : ''}`;
            });

            return `  ${s.titulo}\n${filas.join('\n')}`;
          })
          .filter(Boolean);

        if (!secciones.length) return null;

        return `${m.codigo || '—'}  ${m.nombre}\n${secciones.join('\n')}`;
      })
      .filter(Boolean);

    return `${res.cabecera}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_asistencia',
  'Asistencia por materia: porcentaje, puntos y el detalle de cada sesión tomada o faltada.',
  { type: 'object', properties: { materia: { type: 'string' } } },
  ({ materia }) => {
    const res = cargar('attendance.json', 'Sincronizá Asistencia desde Horario en DVPotro.');
    if (res.fallo) return res.fallo;

    const bloques = (res.data.materias || [])
      .filter((m) => !materia || incluye(m.materia, materia))
      .map((m) => {
        const sesiones = (m.sesiones || []).map(
          (s) => `   ${s.fecha}  ${s.estado || '—'}${s.puntos ? ` (${s.puntos})` : ''}${s.observaciones ? ` · ${s.observaciones}` : ''}`,
        );

        return [
          `${m.materia}`,
          `   ${m.resumen?.porcentaje || '—'} · ${m.resumen?.tomadas || '?'} tomadas · ${m.resumen?.puntos || '—'}`,
          m.sesionAbierta ? '   HAY UNA SESIÓN ABIERTA para registrar' : null,
          ...sesiones,
        ]
          .filter(Boolean)
          .join('\n');
      });

    return `${res.cabecera}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_notas',
  'Las notas personales del alumno dentro de DVPotro (tipo Keep): texto y checklists, con etiquetas, color y estado.',
  {
    type: 'object',
    properties: {
      buscar: { type: 'string' },
      etiqueta: { type: 'string' },
      incluir_archivadas: { type: 'boolean' },
    },
  },
  ({ buscar, etiqueta, incluir_archivadas = false }) => {
    const res = cargar('notes.json', 'Creá alguna nota en DVPotro.');
    if (res.fallo) return res.fallo;

    const notas = (Array.isArray(res.data) ? res.data : [])
      .filter((n) => !n.trashed)
      .filter((n) => incluir_archivadas || !n.archived)
      .filter((n) => !etiqueta || (n.labels || []).some((l) => incluye(l, etiqueta)))
      .filter((n) => !buscar || incluye(n.title, buscar) || incluye(n.body, buscar) || (n.items || []).some((i) => incluye(i.text, buscar)));

    const bloques = notas.map((n) => {
      const cuerpo = n.type === 'checklist'
        ? (n.items || []).map((i) => `   [${i.done ? 'x' : ' '}] ${i.text}`).join('\n')
        : `   ${extracto(String(n.body || '').replace(/<[^>]+>/g, ' '), 400)}`;

      const meta = [n.status, n.color !== 'neutral' ? n.color : null, ...(n.labels || [])].filter(Boolean).join(' · ');

      return `${n.pinned ? '📌 ' : ''}${n.title || '(sin título)'}${n.archived ? ' [archivada]' : ''}\n   ${meta}\n${cuerpo}`;
    });

    return `[notes.json · ${notas.length} notas]\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_calendario',
  'Calendario escolar del ITSON: exámenes, entregas institucionales, periodos y días no laborables.',
  {
    type: 'object',
    properties: {
      dias: { type: 'number', description: 'Ventana hacia adelante en días. Por defecto 30.' },
      buscar: { type: 'string' },
    },
  },
  ({ dias = 30, buscar }) => {
    const res = cargar('calendario-cache.json', 'Sincronizá Calendario en DVPotro.');
    if (res.fallo) return res.fallo;

    const ahora = Date.now();
    const hasta = ahora + dias * 24 * 60 * 60 * 1000;

    const eventos = (res.data.events || [])
      .filter((e) => {
        const inicio = new Date(e.inicio).getTime();
        return Number.isFinite(inicio) && inicio >= ahora - 24 * 60 * 60 * 1000 && inicio <= hasta;
      })
      .filter((e) => !buscar || incluye(e.titulo, buscar) || incluye(e.descripcion, buscar))
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
      .map((e) => {
        const inicio = new Date(e.inicio);
        const fecha = inicio.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
        return `  ${fecha}  ${e.titulo}${e.categoria ? ` [${e.categoria}]` : ''}${e.ubicacion ? ` · ${e.ubicacion}` : ''}`;
      });

    return `${res.cabecera}\nPróximos ${dias} días\n\n${lista(eventos)}`;
  },
);

tool(
  'dvpotro_buscar',
  'Busca un texto a la vez en actividades, material, notas y calendario. Útil cuando no se sabe en qué módulo está lo que se busca.',
  {
    type: 'object',
    properties: { texto: { type: 'string', description: 'Qué buscar.' } },
    required: ['texto'],
  },
  ({ texto }) => {
    if (!texto) return 'Pasá `texto`.';

    const partes = [];

    const act = readJson('actividades-cache.json');
    if (act.data) {
      const hits = (act.data.actividades || []).filter(
        (a) => incluye(a.nombre, texto) || incluye(a.instrucciones, texto),
      );
      if (hits.length) {
        partes.push(`ACTIVIDADES (${hits.length})\n${hits.map((a) => `  [${a.id}] ${a.nombre} — ${a.materia} · ${a.estado}`).join('\n')}`);
      }
    }

    const mat = readJson('material.json');
    if (mat.data) {
      const hits = [];
      (mat.data.materias || []).forEach((m) =>
        (m.secciones || []).forEach((s) =>
          (s.recursos || []).forEach((r) => {
            if (incluye(r.nombre, texto) || incluye(r.descripcion, texto)) {
              hits.push(`  [${r.tipo}] ${r.nombre} — ${m.nombre} / ${s.titulo}`);
            }
          }),
        ),
      );
      if (hits.length) partes.push(`MATERIAL (${hits.length})\n${hits.join('\n')}`);
    }

    const notas = readJson('notes.json');
    if (Array.isArray(notas.data)) {
      const hits = notas.data.filter(
        (n) => !n.trashed && (incluye(n.title, texto) || incluye(n.body, texto)),
      );
      if (hits.length) partes.push(`NOTAS (${hits.length})\n${hits.map((n) => `  ${n.title || '(sin título)'}`).join('\n')}`);
    }

    const cal = readJson('calendario-cache.json');
    if (cal.data) {
      const hits = (cal.data.events || []).filter((e) => incluye(e.titulo, texto));
      if (hits.length) {
        partes.push(`CALENDARIO (${hits.length})\n${hits.slice(0, 15).map((e) => `  ${new Date(e.inicio).toLocaleDateString('es-MX')} ${e.titulo}`).join('\n')}`);
      }
    }

    return partes.length ? partes.join('\n\n') : `Sin coincidencias para "${texto}".`;
  },
);

tool(
  'dvpotro_notificaciones',
  'Avisos que DVPotro generó: cambios detectados entre sincronizaciones, recordatorios y noticias del portal.',
  {
    type: 'object',
    properties: {
      solo_no_leidas: { type: 'boolean' },
      limite: { type: 'number', description: 'Por defecto 25.' },
    },
  },
  ({ solo_no_leidas = false, limite = 25 }) => {
    const res = cargar('notifications.json', 'Usá DVPotro un rato para que genere avisos.');
    if (res.fallo) return res.fallo;

    const items = (res.data.items || [])
      .filter((n) => !solo_no_leidas || !n.read)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limite)
      .map((n) => `  [${n.source}/${n.priority}] ${n.title}${n.body ? `\n     ${extracto(n.body, 160)}` : ''}`);

    return `[notifications.json · mostrando ${items.length}]\n\n${lista(items)}`;
  },
);

// ---------------------------------------------------------------------------
// Transporte MCP (JSON-RPC 2.0 por stdio, mensajes separados por \n)
// ---------------------------------------------------------------------------

// stdout es EL CANAL DEL PROTOCOLO: cualquier console.log suelto corrompe la
// sesión y el cliente desconecta sin explicar por qué. Todo lo humano va a
// stderr.
const log = (...args) => console.error('[dvpotro-mcp]', ...args);

function enviar(mensaje) {
  process.stdout.write(`${JSON.stringify(mensaje)}\n`);
}

function responder(id, result) {
  enviar({ jsonrpc: '2.0', id, result });
}

function fallar(id, code, message) {
  enviar({ jsonrpc: '2.0', id, error: { code, message } });
}

function manejar(msg) {
  const { id, method, params } = msg;

  // Las notificaciones (sin id) no llevan respuesta. Contestarlas es un error
  // de protocolo.
  if (id === undefined || id === null) return;

  if (method === 'initialize') {
    responder(id, {
      // Se devuelve la versión que pidió el cliente cuando la manda: negociar
      // hacia abajo es más compatible que imponer una.
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'dvpotro', version: '1.0.0' },
    });
    return;
  }

  if (method === 'ping') {
    responder(id, {});
    return;
  }

  if (method === 'tools/list') {
    responder(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
    return;
  }

  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);

    if (!tool) {
      fallar(id, -32602, `Tool desconocida: ${params?.name}`);
      return;
    }

    try {
      const texto = tool.handler(params.arguments || {});
      responder(id, { content: [{ type: 'text', text: String(texto) }] });
    } catch (error) {
      // Se responde como resultado con isError y no como error de JSON-RPC: así
      // el cliente ve QUÉ falló en vez de un error de transporte opaco.
      log('fallo en', params?.name, error?.stack || error);
      responder(id, {
        content: [{ type: 'text', text: `Error ejecutando ${params?.name}: ${error?.message || error}` }],
        isError: true,
      });
    }

    return;
  }

  fallar(id, -32601, `Método no soportado: ${method}`);
}

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;

  // Un chunk puede traer varios mensajes o cortar uno por la mitad: se procesa
  // por líneas completas y lo que sobra queda para el próximo chunk.
  let corte = buffer.indexOf('\n');

  while (corte !== -1) {
    const linea = buffer.slice(0, corte).trim();
    buffer = buffer.slice(corte + 1);

    if (linea) {
      try {
        manejar(JSON.parse(linea));
      } catch (error) {
        log('mensaje ilegible:', error?.message);
      }
    }

    corte = buffer.indexOf('\n');
  }
});

process.stdin.on('end', () => process.exit(0));

log(`leyendo de ${USER_DATA}`);
