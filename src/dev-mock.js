// Mock del bridge window.scraperApp para trabajar la UI en navegador (sin Electron).
// Solo se importa en dev y solo se activa si el bridge real no existe.
// No afecta la app empaquetada: main.jsx lo importa detrás de import.meta.env.DEV.

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(offsetDays, hour = 23, minute = 59) {
  const date = new Date(Date.now() + offsetDays * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const MOCK_ACTIVITIES = [
  // Las "demo-*" son consignas para ejercitar el analizador con distintos
  // perfiles (densa, ejecutiva, minimalista, multimedia). Están replicadas en
  // electron/handlers/demo-activities.js, que es la versión que ve Electron con
  // DVPOTRO_DEMO_ACTIVITIES=1 (main es CJS, esto es ESM: no se puede compartir
  // el módulo).
  {
    id: 'demo-1',
    nombre: 'Reporte de práctica 6: análisis de complejidad algorítmica',
    materia: 'Estructuras de Datos',
    profesor: 'Dr. Peralta Villanueva',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: iso(4, 23, 59),
    fechaPublicacion: iso(-6),
    instrucciones:
      'Elabora un reporte que compare empíricamente el rendimiento de tres algoritmos de ordenamiento: quicksort, mergesort e ' +
      'insertion sort. El reporte debe contener: portada con tu nombre completo y número de control; una introducción de máximo ' +
      'una cuartilla explicando la notación Big-O; una tabla comparativa con los tiempos de ejecución medidos sobre arreglos de ' +
      '1000, 10000 y 100000 elementos; al menos dos gráficas que muestren el crecimiento del tiempo respecto al tamaño de entrada; ' +
      'el código fuente comentado en un anexo; y una conclusión que justifique cuál algoritmo conviene en cada escenario. ' +
      'Extensión máxima de 12 páginas sin contar anexos. Entrega en PDF, letra Times New Roman 12, interlineado 1.5. ' +
      'Cita al menos 4 fuentes en formato IEEE.',
    archivos: [
      { name: 'rubrica-practica-6.pdf', url: 'https://example.test/rubrica6.pdf' },
      { name: 'datasets-prueba.zip', url: 'https://example.test/datasets.zip' },
    ],
  },
  {
    id: 'demo-2',
    nombre: 'Entrega 2: prototipo funcional y documentación técnica',
    materia: 'Ingeniería de Software II',
    profesor: 'Mtra. Cárdenas Ibarra',
    estado: 'pendiente',
    modalidad: 'equipo',
    fechaLimite: iso(9, 18, 0),
    fechaPublicacion: iso(-3),
    instrucciones:
      'En equipos de 4 integrantes, entreguen el prototipo funcional del sistema propuesto en la Entrega 1. Deben subir un único ' +
      'documento PDF que incluya: 1) el diagrama de casos de uso actualizado en UML; 2) el modelo entidad-relación de la base de ' +
      'datos con al menos 6 entidades; 3) capturas de pantalla de las 3 funcionalidades principales ya implementadas; ' +
      '4) el enlace público al repositorio de GitHub con historial de commits de todos los integrantes; 5) la matriz de ' +
      'trazabilidad entre requisitos y módulos implementados; y 6) un apartado de pruebas con mínimo 10 casos de prueba ' +
      'documentados en formato tabla (entrada esperada, salida obtenida, resultado). ' +
      'El documento no debe exceder 25 páginas. Nombren el archivo Equipo{N}_Entrega2.pdf',
    archivos: [
      { name: 'plantilla-matriz-trazabilidad.docx', url: 'https://example.test/matriz.docx' },
      { name: 'ejemplo-casos-prueba.pdf', url: 'https://example.test/casos.pdf' },
      { name: 'lineamientos-entrega2.pdf', url: 'https://example.test/lineamientos2.pdf' },
    ],
  },
  {
    // Perfil minimalista: consigna corta, restricciones puntuales. Verifica que
    // el analizador saque requisitos con instrucciones escuetas.
    id: 'demo-3',
    nombre: 'Cuestionario unidad 4 — derivadas parciales',
    materia: 'Cálculo Multivariable',
    profesor: 'Mtra. Osuna Rangel',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: iso(2, 22, 0),
    fechaPublicacion: iso(-1),
    instrucciones:
      'Resuelve el cuestionario en línea entre el 25 y el 27 de julio. Tienes 60 minutos y un solo intento. ' +
      'Se permite calculadora científica no programable; queda prohibido consultar formularios, apuntes o internet.',
    archivos: [],
  },
  {
    // Perfil multimedia: entrega no textual (audio + guion + fuentes). Verifica
    // que el analizador distingue requisitos técnicos (kbps, ZIP) de contenido.
    id: 'demo-4',
    nombre: 'Podcast educativo: temas sociales contemporáneos',
    materia: 'Comunicación Oral y Escrita',
    profesor: 'Lic. Robles Munguía',
    estado: 'pendiente',
    modalidad: 'equipo',
    fechaLimite: iso(14, 23, 59),
    fechaPublicacion: iso(-2),
    instrucciones:
      'En parejas, produzcan un podcast educativo de entre 8 y 12 minutos sobre un tema social contemporáneo elegido por el equipo. ' +
      'Deben entregar tres artefactos: 1) el archivo de audio en formato MP3 con calidad mínima de 128 kbps; ' +
      '2) un guion escrito en PDF de máximo 3 páginas con las intervenciones marcadas por hablante; ' +
      '3) una lista de fuentes consultadas con al menos 5 referencias, cada una con enlace verificable. ' +
      'Suban un único archivo ZIP que contenga los tres artefactos, nombrando el audio principal como PodcastEquipo{N}.mp3.',
    archivos: [
      { name: 'guia-produccion-podcast.pdf', url: 'https://example.test/guia-podcast.pdf' },
    ],
  },
  {
    id: 'mock-1',
    nombre: 'Proyecto final: API REST con autenticación',
    materia: 'Desarrollo de Aplicaciones Web',
    profesor: 'Dra. Martínez López',
    estado: 'pendiente',
    modalidad: 'equipo',
    fechaLimite: iso(0, 21, 0),
    fechaPublicacion: iso(-14),
    instrucciones:
      'Desarrollar una API REST con autenticación JWT, al menos 5 endpoints documentados y pruebas de integración. Entregar el repositorio con README, colección de Postman y un video de demostración de máximo 5 minutos explicando la arquitectura elegida y las decisiones técnicas del equipo.',
    archivos: [
      { name: 'rubrica-proyecto.pdf', url: 'https://example.test/rubrica.pdf' },
      { name: 'plantilla-readme.docx', url: 'https://example.test/plantilla.docx' },
      { name: 'datos-prueba.xlsx', url: 'https://example.test/datos.xlsx' },
      { name: 'diagrama-referencia.png', url: 'https://example.test/diagrama.png' },
    ],
  },
  {
    id: 'mock-2',
    nombre: 'Ensayo: ética en sistemas de IA',
    materia: 'Ética Profesional',
    profesor: 'Mtro. Hernández',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: iso(2, 18, 30),
    fechaPublicacion: iso(-7),
    instrucciones: 'Ensayo de 1500 palabras con al menos 5 referencias en formato APA.',
    archivos: [{ name: 'guia-apa.pdf', url: 'https://example.test/apa.pdf' }],
  },
  {
    id: 'mock-3',
    nombre: 'Práctica 8: consultas SQL avanzadas',
    materia: 'Bases de Datos',
    profesor: 'Ing. Rodríguez',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: iso(6, 23, 59),
    fechaPublicacion: iso(-3),
    instrucciones: 'Resolver los 12 ejercicios del cuadernillo usando la base de datos Northwind.',
    archivos: [],
  },
  {
    id: 'mock-4',
    nombre: 'Cuestionario unidad 4',
    materia: 'Redes de Computadoras',
    profesor: 'Dr. García Torres',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: iso(11),
    fechaPublicacion: iso(-2),
    instrucciones: '',
    archivos: [],
  },
  {
    id: 'mock-5',
    nombre: 'Reporte de laboratorio: capa de transporte',
    materia: 'Redes de Computadoras',
    profesor: 'Dr. García Torres',
    estado: 'retrasada',
    modalidad: 'individual',
    fechaLimite: iso(-3, 23, 59),
    fechaPublicacion: iso(-17),
    instrucciones: 'Analizar la captura de Wireshark adjunta e identificar los flujos TCP con retransmisiones.',
    archivos: [{ name: 'captura-sesion.pdf', url: 'https://example.test/captura.pdf' }],
  },
  {
    id: 'mock-6',
    nombre: 'Mapa conceptual: normalización',
    materia: 'Bases de Datos',
    profesor: 'Ing. Rodríguez',
    estado: 'retrasada',
    modalidad: 'equipo',
    fechaLimite: iso(-8),
    fechaPublicacion: iso(-20),
    instrucciones: 'Mapa conceptual de 1FN a 4FN con ejemplos propios.',
    archivos: [],
  },
  {
    id: 'mock-7',
    nombre: 'Exposición: patrones de diseño',
    materia: 'Ingeniería de Software',
    profesor: 'Dra. Sánchez',
    estado: 'cerrada',
    modalidad: 'equipo',
    fechaLimite: iso(-25, 12, 0),
    fechaPublicacion: iso(-40),
    instrucciones: 'Presentación de 15 minutos sobre un patrón estructural.',
    archivos: [{ name: 'lineamientos.pptx', url: 'https://example.test/lineamientos.pptx' }],
  },
  {
    id: 'mock-8',
    nombre: 'Tarea 2: diagramas UML',
    materia: 'Ingeniería de Software',
    profesor: 'Dra. Sánchez',
    estado: 'cerrada',
    modalidad: 'individual',
    fechaLimite: iso(-30),
    fechaPublicacion: iso(-45),
    instrucciones: '',
    archivos: [],
  },
// El scraper real trae url por actividad y el menú de la card la necesita para
// "ver en el portal" y "copiar link". Se deriva del id en vez de repetirla en
// cada entrada; una url explícita en la entrada pisa la derivada.
].map((activity) => ({
  url: `https://ivirtual.itson.mx/mod/assign/view.php?id=${activity.id}`,
  ...activity,
}));

// import.meta.env.DEV es reemplazado por `false` en build: Vite elimina todo el bloque.
const MOCK_HORARIO_MATERIAS = [
  {
    numeroClase: '1001',
    codigo: 'DAW-401',
    seccion: 'A',
    nombre: 'Desarrollo de Aplicaciones Web con React y Node',
    instructor: 'Dra. Martínez López',
    modalidad: 'presencial',
    sesiones: [
      { dias: ['Lunes', 'Miércoles'], horaInicio: '07:00', horaFin: '09:00', ubicacion: 'LV-402' },
    ],
  },
  {
    numeroClase: '1002',
    codigo: 'BD-301',
    seccion: 'B',
    nombre: 'Bases de Datos',
    instructor: 'Ing. Rodríguez',
    modalidad: 'presencial',
    sesiones: [
      { dias: ['Lunes', 'Miércoles', 'Viernes'], horaInicio: '09:00', horaFin: '10:00', ubicacion: 'AV-217' },
    ],
  },
  {
    numeroClase: '1003',
    codigo: 'RC-302',
    seccion: 'A',
    nombre: 'Redes de Computadoras',
    instructor: 'Dr. García Torres',
    modalidad: 'presencial',
    sesiones: [
      { dias: ['Martes', 'Jueves'], horaInicio: '10:30', horaFin: '12:00', ubicacion: 'LV-105' },
    ],
  },
  {
    numeroClase: '1004',
    codigo: 'ET-201',
    seccion: 'C',
    nombre: 'Ética Profesional',
    instructor: 'Mtro. Hernández',
    modalidad: 'en_linea',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    sesiones: [
      { dias: ['Martes', 'Jueves'], horaInicio: '13:00', horaFin: '14:00' },
    ],
  },
  {
    numeroClase: '1005',
    codigo: 'IS-402',
    seccion: 'A',
    nombre: 'Ingeniería de Software',
    instructor: 'Dra. Sánchez',
    modalidad: 'en_linea',
    meetLink: '',
    sesiones: [
      { dias: ['Viernes'], horaInicio: '11:00', horaFin: '12:30' },
    ],
  },
  {
    numeroClase: '1006',
    codigo: 'MAT-105',
    seccion: 'S1',
    nombre: 'Matemáticas para Ingeniería',
    instructor: 'Mtra. Valenzuela',
    modalidad: 'presencial',
    sesiones: [
      { dias: ['Sábado'], horaInicio: '08:00', horaFin: '13:00', ubicacion: 'CB-021' },
    ],
  },
];

MOCK_HORARIO_MATERIAS.push({
  numeroClase: '1007',
  codigo: 'API-001',
  seccion: 'T1',
  nombre: 'Asesoría de Proyecto Integrador y Titulación Profesional',
  instructor: 'Dr. Peralta',
  modalidad: 'presencial',
  // Sesión de 30 min con nombre largo: caso de prueba del bloque mínimo.
  sesiones: [{ dias: ['Viernes'], horaInicio: '07:30', horaFin: '08:00', ubicacion: 'CUB-3' }],
});

const MOCK_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MOCK_CALENDAR_TYPES = ['Profesional Asociado y Licenciatura', 'Posgrado', 'Medicina'];

function calEvent(titulo, inicio, fin, categoria, extra = {}) {
  return { titulo, inicio, fin: fin || undefined, categoria, ...extra };
}

// Los eventos del calendario se guardan sin zona horaria ('...T00:00:00') porque
// la UI trata la medianoche local como "evento de día completo".
function calStamp(date, hour = 0, minute = 0) {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(hour)}:${pad(minute)}:00`;
}

const offsetDay = (offset) => new Date(Date.now() + offset * DAY_MS);
const dayOfThisMonth = (day) => {
  const date = new Date();
  date.setDate(day);
  return date;
};

// Fijos relativos a hoy: el set del semestre de abajo tiene fechas duras de 2026
// y deja el mes en curso vacío, que es justo el que abre la vista Grid.
const MOCK_CALENDAR_RELATIVE = [
  calEvent('Asesoría de titulación', calStamp(dayOfThisMonth(5), 11, 0), null, 'Académico', {
    descripcion: 'Sesión con el asesor asignado. Llevar avance del capítulo 3.',
    ubicacion: 'Cubículo 12, edificio de Ingeniería',
  }),
  calEvent('Entrega de reporte de residencia', calStamp(dayOfThisMonth(18), 23, 59), null, 'Avisos'),
  calEvent('Semana de evaluación docente', calStamp(offsetDay(-2)), calStamp(offsetDay(6)), 'Académico', {
    descripcion: 'Rango que cruza semanas: caso de prueba de la barra multi-día del grid.',
  }),
  calEvent('Cierre del ciclo escolar 2027-1', calStamp(offsetDay(240)), null, 'Académico'),
  calEvent('Reunión informativa de intercambio', calStamp(offsetDay(-45), 17, 0), null, 'General'),
];

const MOCK_CALENDAR_EVENTS = [
  ...MOCK_CALENDAR_RELATIVE,
  calEvent('Exámenes finales de primavera', '2026-05-25T00:00:00', '2026-06-05T00:00:00', 'Examen'),
  calEvent('Entrega de calificaciones finales', '2026-06-12T00:00:00', null, 'Académico'),
  calEvent('Vacaciones de verano', '2026-06-29T00:00:00', '2026-07-08T00:00:00', 'Vacaciones'),
  calEvent('Publicación de horarios del semestre', '2026-08-04T00:00:00', null, 'General'),
  calEvent('Altas, bajas y cambios de grupo', '2026-08-10T00:00:00', '2026-08-14T00:00:00', 'Inscripción', {
    descripcion: 'Periodo único para movimientos de carga académica vía CIA. No hay prórroga.',
  }),
  calEvent('Inicio de clases', '2026-08-17T00:00:00', null, 'Académico'),
  calEvent('Límite de pago de colegiatura sin recargo', '2026-08-28T00:00:00', null, 'Avisos'),
  calEvent('Suspensión de labores — Independencia', '2026-09-16T00:00:00', null, 'Vacaciones'),
  calEvent('Primer examen parcial', '2026-09-21T00:00:00', '2026-09-25T00:00:00', 'Examen'),
  calEvent('Cierre de trámite de titulación', '2026-10-02T00:00:00', null, 'Avisos', {
    descripcion: 'Última fecha para entregar expediente completo en Registro Escolar.',
    ubicacion: 'Edificio de Registro Escolar, planta baja',
  }),
  calEvent('Suspensión de labores académicas', '2026-10-12T00:00:00', null, 'Vacaciones'),
  calEvent('Segundo examen parcial', '2026-10-26T00:00:00', '2026-10-30T00:00:00', 'Examen'),
  calEvent('Suspensión — Día de Muertos', '2026-11-02T00:00:00', null, 'Vacaciones'),
  calEvent('Suspensión — Revolución Mexicana', '2026-11-16T00:00:00', null, 'Vacaciones'),
  calEvent('Límite de baja definitiva de materias', '2026-11-20T00:00:00', null, 'Inscripción'),
  calEvent('Exámenes finales', '2026-11-30T00:00:00', '2026-12-04T00:00:00', 'Examen', {
    descripcion: 'Rango que cruza de noviembre a diciembre: caso de prueba de fecha compuesta.',
  }),
  calEvent('Exámenes extraordinarios', '2026-12-07T00:00:00', '2026-12-11T00:00:00', 'Examen'),
  calEvent('Ceremonia de graduación', '2026-12-14T17:00:00', '2026-12-14T20:00:00', 'Académico', {
    descripcion: 'Ceremonia de fin de carrera para egresados de todas las unidades.',
    ubicacion: 'Auditorio ITSON Centro',
  }),
  calEvent('Fin del semestre y entrega de actas', '2026-12-18T00:00:00', null, 'Académico'),
];

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

const MOCK_NOTIFICATION_SETTINGS = {
  noticesEnabled: true,
  remindersEnabled: true,
  lastSyncAt: hoursAgo(2),
};

let MOCK_NOTIFICATIONS = [
  {
    id: 'n1', key: 'sys-error-actividades-SESSION_EXPIRED', source: 'sistema', category: 'error',
    priority: 'critica', title: 'Error al sincronizar iVirtual',
    body: 'La sesión de iVirtual expiró o la contraseña cambió. Revísala en Ajustes.',
    timestamp: hoursAgo(0.5), read: false, actionUrl: 'app://ajustes', meta: {},
  },
  {
    id: 'n-notes', key: 'notes-reminder-note-ideas', source: 'notes', category: 'proximidad',
    priority: 'normal', title: 'Ideas para el proyecto final',
    body: 'Recordatorio', timestamp: hoursAgo(1), read: false,
    actionUrl: 'app://notas?note=note-ideas', meta: {},
  },
  {
    id: 'n2', key: 'rem-act-hoy-mock-1', source: 'actividades', category: 'proximidad',
    priority: 'critica', title: 'Vence hoy: Proyecto final API REST con autenticación',
    body: 'Desarrollo de Aplicaciones Web · hoy 9:00 PM',
    timestamp: hoursAgo(2), read: false, actionUrl: null, meta: {},
  },
  {
    id: 'n3', key: 'hor-link-1004', source: 'horario', category: 'cambio',
    priority: 'normal', title: 'Se actualizó el link de videollamada: Ética Profesional',
    body: 'https://meet.google.com/abc-defg-hij',
    timestamp: hoursAgo(5), read: false, actionUrl: 'https://meet.google.com/abc-defg-hij', meta: {},
  },
  {
    id: 'n4', key: 'cal-nueva-bd-p2', source: 'calificaciones', category: 'nueva',
    priority: 'normal', title: 'Calificación publicada: Bases de Datos',
    body: 'Parcial 2: 95',
    timestamp: hoursAgo(26), read: false, actionUrl: null, meta: {},
  },
  {
    id: 'n5', key: 'rem-clase-1003-mock', source: 'horario', category: 'proximidad',
    priority: 'critica', title: 'Clase en 12 min: Redes de Computadoras',
    body: 'LV-105',
    timestamp: hoursAgo(30), read: true, actionUrl: null, meta: {},
  },
  {
    id: 'n6', key: 'act-nueva-ensayo', source: 'actividades', category: 'nueva',
    priority: 'normal', title: 'Nueva actividad: Ensayo de ética en sistemas de IA',
    body: 'Ética Profesional · Vence: 13 jul 2026',
    timestamp: hoursAgo(32), read: true, actionUrl: null, meta: {},
  },
  {
    id: 'n7', key: 'cal-evento-graduacion', source: 'calendario', category: 'nueva',
    priority: 'info', title: 'Nuevo evento en el calendario: Ceremonia de graduación',
    body: '14 de diciembre de 2026',
    timestamp: hoursAgo(3 * 24), read: true, actionUrl: null, meta: {},
  },
  {
    id: 'n8', key: 'news-becas-2027', source: 'itson-news', category: 'info',
    priority: 'info', title: 'Convocatoria de becas de excelencia académica 2027',
    body: 'Noticias para alumnos · 8 de julio de 2026',
    timestamp: hoursAgo(4 * 24), read: false,
    actionUrl: 'https://www.itson.mx/alumnos/Paginas/noticias-alumnos.aspx', meta: {},
  },
  {
    id: 'n9', key: 'hor-aula-mat', source: 'horario', category: 'cambio',
    priority: 'normal', title: 'Cambio de aula: Matemáticas para Ingeniería',
    body: 'Antes: CB-021 · Ahora: CB-104',
    timestamp: hoursAgo(5 * 24), read: true, actionUrl: null, meta: {},
  },
  {
    id: 'n10', key: 'sys-syncall', source: 'sistema', category: 'info',
    priority: 'info', title: 'Sincronización completa',
    body: '8 actividades · 7 materias · 64 eventos del calendario',
    timestamp: hoursAgo(6 * 24), read: true, actionUrl: null, meta: {},
  },
  {
    id: 'n11', key: 'cal-prom-redes', source: 'calificaciones', category: 'cambio',
    priority: 'normal', title: 'Tu promedio cambió: Redes de Computadoras',
    body: 'De 88.5 a 91.2',
    timestamp: hoursAgo(9 * 24), read: true, actionUrl: null, meta: {},
  },
];

const MOCK_MUSIC_ARTISTS = [
  ['Caloncho', 'Bálsamo'],
  ['Zoé', 'Aztlán'],
  ['Little Jesus', 'Disco de Oro'],
  ['Café Tacvba', 'Re'],
  ['Ed Maverick', 'Mix pa llorar en tu cuarto'],
];

const MOCK_MUSIC_TRACKS = Array.from({ length: 20 }, (_, index) => {
  const [artist, album] = MOCK_MUSIC_ARTISTS[index % MOCK_MUSIC_ARTISTS.length];
  return {
    path: `C:/Users/mock/Music/track-${String(index + 1).padStart(2, '0')}.mp3`,
    title: `Pista de prueba ${index + 1}`,
    artist,
    album,
    duration: 95 + index * 17,
    bitrate: 320000,
    // Sin fs real no hay portadas que extraer: el placeholder de TrackCover es
    // justamente el camino que conviene ejercitar en navegador.
    coverPath: null,
  };
});

let MOCK_MUSIC_LIBRARY = null;
let MOCK_MUSIC_STATE = null;
let MOCK_FAVORITE_PATHS = [MOCK_MUSIC_TRACKS[1].path, MOCK_MUSIC_TRACKS[4].path];

const MOCK_COVER_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mNkYPhfz0AEYBxVSF+FgxWMcnBFAADg8wX7l6q3JgAAAABJRU5ErkJggg==';

// Una con pistas y otra vacía: alcanzan para ejercitar grid, expand, reorder y
// el empty state de playlist sin pistas.
let MOCK_PLAYLISTS = [
  {
    id: 'pl_mock-tarde',
    name: 'Para la tarde',
    coverPath: null,
    tracks: [MOCK_MUSIC_TRACKS[0].path, MOCK_MUSIC_TRACKS[2].path, MOCK_MUSIC_TRACKS[5].path],
    createdAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    updatedAt: new Date(Date.now() - DAY_MS).toISOString(),
  },
  {
    id: 'pl_mock-vacia',
    name: 'Sin nada todavía',
    coverPath: null,
    tracks: [],
    createdAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    updatedAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  },
];

function mockMutatePlaylist(id, mutator) {
  const index = MOCK_PLAYLISTS.findIndex((p) => p.id === id);
  if (index === -1) return { ok: false, error: 'La playlist no existe.' };
  const updated = { ...mutator(MOCK_PLAYLISTS[index]), updatedAt: new Date().toISOString() };
  MOCK_PLAYLISTS[index] = updated;
  return { ok: true, playlist: { ...updated, tracks: [...updated.tracks] } };
}
// Historial sembrado: sin él la vista arranca vacía y no hay forma de ver el
// orden por recientes ni el conteo de más escuchadas sin esperar reproducciones.
let MOCK_HISTORY_ENTRIES = [
  { path: MOCK_MUSIC_TRACKS[2].path, playedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { path: MOCK_MUSIC_TRACKS[0].path, playedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
  { path: MOCK_MUSIC_TRACKS[2].path, playedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
  { path: MOCK_MUSIC_TRACKS[7].path, playedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString() },
  { path: MOCK_MUSIC_TRACKS[2].path, playedAt: new Date(Date.now() - 3 * DAY_MS).toISOString() },
  { path: MOCK_MUSIC_TRACKS[0].path, playedAt: new Date(Date.now() - 9 * DAY_MS).toISOString() },
];

const mockNoteId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

let MOCK_NOTES = (() => {
  const daysAgo = (d) => new Date(Date.now() - d * DAY_MS).toISOString();
  const base = (over) => ({
    id: mockNoteId(),
    type: 'text',
    title: '',
    body: '',
    items: [],
    color: 'neutral',
    labels: [],
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    deletedAt: null,
    reminder: null,
    attachments: [],
    ...over,
  });
  // PNG raster chico (data URL) para simular adjuntos sin fs real.
  const MOCK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mNkYPhfz0AEYBxVSF+FgxWMcnBFAADg8wX7l6q3JgAAAABJRU5ErkJggg==';
  return [
    base({ title: 'Entregar reporte de Redes', body: 'Subir el PDF a iVirtual antes del viernes. Revisar la sección de topologías.', color: 'vermillion', labels: ['Escuela'], pinned: true, updatedAt: new Date().toISOString(), reminder: { at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), fired: false, snoozedFrom: null } }),
    base({ title: 'Compras de la semana', type: 'checklist', color: 'green', items: [
      { id: mockNoteId(), text: 'Café', done: true },
      { id: mockNoteId(), text: 'Leche de avena', done: false },
      { id: mockNoteId(), text: 'Pan integral', done: false },
      { id: mockNoteId(), text: 'Fruta', done: true },
      { id: mockNoteId(), text: 'Detergente', done: false },
    ], pinned: true }),
    base({ id: 'note-ideas', title: 'Ideas para el proyecto final', body: `App de gestión académica. <b>Explorar integración</b> con calendario ITSON y <span style="color: #FF3D00">notificaciones push</span>.<img src="${MOCK_PNG}" alt="boceto.png">`, color: 'purple', labels: ['Personal', 'Proyecto'], attachments: [{ id: 'mock-att-1', filename: 'boceto.png', mime: 'image/png', size: 128, path: MOCK_PNG, createdAt: new Date().toISOString() }] }),
    base({ title: 'Configurar entorno Electron', type: 'checklist', color: 'cyan', labels: ['Proyecto'], items: [
      { id: mockNoteId(), text: 'Instalar dependencias', done: true },
      { id: mockNoteId(), text: 'Configurar Vite', done: true },
      { id: mockNoteId(), text: 'Playwright chromium', done: false },
    ] }),
    base({ title: 'Preguntas para asesoría', body: '¿Cómo optimizar el scraper de horario? Revisar timeouts.', color: 'amber', labels: ['Escuela'] }),
    base({ title: 'Recordatorio de pago', body: 'Reinscripción abre el 4 de agosto.', color: 'vermillion', reminder: { at: new Date(Date.now() + 26 * 3600 * 1000).toISOString(), fired: false, snoozedFrom: null } }),
    base({ title: 'Libros por leer', type: 'checklist', items: [
      { id: mockNoteId(), text: 'Clean Code', done: false },
      { id: mockNoteId(), text: 'The Pragmatic Programmer', done: false },
      { id: mockNoteId(), text: 'Refactoring', done: true },
    ] }),
    base({ title: 'Notas de la clase de BD', body: 'Normalización: 1FN elimina grupos repetidos, 2FN dependencias parciales, 3FN dependencias transitivas.', color: 'cyan', labels: ['Escuela'] }),
    base({ title: 'Playlist para estudiar', body: 'Lo-fi, ambient, post-rock instrumental.', color: 'purple', labels: ['Personal'] }),
    base({ title: 'Bug del calendario', body: 'Los eventos de rango cruzan mal el mes. Revisar formatGutterDate.', color: 'amber', labels: ['Proyecto'], attachments: [
      { id: 'mock-att-2', filename: 'screenshot1.png', mime: 'image/png', size: 128, path: MOCK_PNG, createdAt: new Date().toISOString() },
      { id: 'mock-att-3', filename: 'screenshot2.png', mime: 'image/png', size: 128, path: MOCK_PNG, createdAt: new Date().toISOString() },
    ] }),
    base({ title: 'Metas del semestre', type: 'checklist', color: 'green', items: [
      { id: mockNoteId(), text: 'Promedio arriba de 90', done: false },
      { id: mockNoteId(), text: 'Terminar el orquestador', done: false },
      { id: mockNoteId(), text: 'Servicio social', done: true },
    ] }),
    base({ title: 'Comandos git útiles', body: 'git reflog para recuperar commits. git worktree para ramas paralelas.', labels: ['Proyecto'] }),
    base({ title: 'Contactos de equipo', body: 'David (backend), coordinar reunión semanal los martes.', color: 'cyan' }),
    // Archivadas
    base({ title: 'Apuntes del parcial pasado', body: 'Ya presenté, archivado como referencia.', color: 'neutral', archived: true, updatedAt: daysAgo(20) }),
    base({ title: 'Lista de tareas de junio', type: 'checklist', archived: true, items: [
      { id: mockNoteId(), text: 'Cerrar proyecto de Web', done: true },
    ], updatedAt: daysAgo(25) }),
    // Papelera
    base({ title: 'Borrador viejo', body: 'Nota de prueba que ya no sirve.', trashed: true, deletedAt: daysAgo(3), updatedAt: daysAgo(3) }),
  ];
})();

let MOCK_NOTE_LABELS = ['Escuela', 'Personal', 'Proyecto', 'Ideas'];
let MOCK_NOTES_SETTINGS = { view: 'grid', sortBy: 'updatedAt' };

function mockNoteMatchesFilters(note, filters = {}) {
  const { colors, labels, search } = filters;
  if (Array.isArray(colors) && colors.length && !colors.includes(note.color)) return false;
  if (Array.isArray(labels) && labels.length && !labels.some((l) => note.labels.includes(l))) return false;
  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    const hay = [note.title, note.body, ...note.items.map((i) => i.text), ...note.labels].join(' ').toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

// En memoria a propósito: reiniciar el dev server debe devolver el set completo
// de actividades, no arrastrar lo que se ocultó probando la UI.
let MOCK_HIDDEN_ACTIVITY_IDS = [];

let mockNotificationListener = null;

if (import.meta.env.DEV && typeof window !== 'undefined' && !window.scraperApp) {
  window.scraperApp = {
    getSettings: async () => ({
      user: '00000279009',
      hasPassword: true,
      ciaUser: '',
      hasCIAPassword: false,
      notifMinutesBefore: 10,
      appVersion: '0.0.0-dev',
    }),
    saveSettings: async () => ({ success: true }),
    testConnection: async ({ portal, user } = {}) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (!user) {
        return { ok: false, error: 'Falta el usuario.' };
      }
      return portal === 'cia'
        ? { ok: false, error: 'El CIA rechazó las credenciales.' }
        : { ok: true };
    },
    clearCredentials: async () => ({ success: true }),
    runScraper: async () => ({ activities: MOCK_ACTIVITIES, timestamp: Date.now(), fromCache: true }),
    clearCache: async () => ({ success: true }),
    runHorario: async () => ({
      materias: MOCK_HORARIO_MATERIAS,
      diasConClases: MOCK_DIAS,
      timestamp: Date.now(),
      fromCache: true,
    }),
    saveHorarioLink: async (numeroClase, link) => {
      const materia = MOCK_HORARIO_MATERIAS.find((item) => item.numeroClase === numeroClase);
      if (materia) {
        materia.meetLink = link;
      }
      return { success: true };
    },
    clearHorarioCache: async () => ({ success: true }),
    runCIA: async () => ({ materias: [], timestamp: Date.now(), fromCache: true }),
    clearCIACache: async () => ({ success: true }),
    runCalendario: async (options = {}) => ({
      events: MOCK_CALENDAR_EVENTS,
      calendarTypes: MOCK_CALENDAR_TYPES,
      calendarType: options.calendarType || MOCK_CALENDAR_TYPES[0],
      timestamp: Date.now(),
      fromCache: true,
    }),
    clearCalendarioCache: async () => ({ success: true }),
    checkNotifications: async () => ({ success: true, supported: false, delayedCount: 0, expiringCount: 0 }),
    downloadFile: async () => ({ success: true, path: 'mock://descarga' }),
    openExternal: async () => {},
    onProgress: () => {},
    removeProgress: () => {},
    notifications: {
      list: async () => ({ ok: true, notifications: [...MOCK_NOTIFICATIONS] }),
      markRead: async (id) => {
        MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        );
        return { ok: true };
      },
      markAllRead: async () => {
        MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.map((item) => ({ ...item, read: true }));
        return { ok: true };
      },
      dismiss: async (id) => {
        MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.filter((item) => item.id !== id);
        return { ok: true };
      },
      clear: async () => {
        MOCK_NOTIFICATIONS = [];
        return { ok: true };
      },
      getSettings: async () => ({ ok: true, settings: { ...MOCK_NOTIFICATION_SETTINGS } }),
      setSettings: async (patch = {}) => {
        Object.assign(MOCK_NOTIFICATION_SETTINGS, patch);
        return { ok: true, settings: { ...MOCK_NOTIFICATION_SETTINGS } };
      },
      onNew: (callback) => {
        mockNotificationListener = callback;
      },
      removeNew: () => {
        mockNotificationListener = null;
      },
    },
    music: {
      pickFolder: async () => 'C:/Users/mock/Music',
      scanFolder: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        MOCK_MUSIC_LIBRARY = {
          folderPath: 'C:/Users/mock/Music',
          tracks: MOCK_MUSIC_TRACKS,
          scannedAt: new Date().toISOString(),
        };
        return MOCK_MUSIC_LIBRARY;
      },
      getLibrary: async () => MOCK_MUSIC_LIBRARY,
      refresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return MOCK_MUSIC_LIBRARY || { error: 'No hay carpeta configurada para re-escanear.' };
      },
      saveState: async (state) => {
        MOCK_MUSIC_STATE = { ...state, savedAt: new Date().toISOString() };
        // localStorage para que el mock sobreviva reloads — permite probar la
        // hidratación cross-session del player también en browser dev.
        try {
          localStorage.setItem('dvpotro-mock-music-state', JSON.stringify(MOCK_MUSIC_STATE));
        } catch (_error) { /* storage lleno: irrelevante en dev */ }
        return { ok: true };
      },
      loadState: async () => {
        if (MOCK_MUSIC_STATE) return MOCK_MUSIC_STATE;
        try {
          return JSON.parse(localStorage.getItem('dvpotro-mock-music-state')) || null;
        } catch (_error) {
          return null;
        }
      },
      // Las teclas multimedia las captura globalShortcut en el main process, que
      // en navegador no existe: se devuelve el unsubscribe y nada más.
      onMediaKey: () => () => {},
      showInFolder: async () => ({ ok: true }),
    },
    favorites: {
      list: async () => ({ paths: [...MOCK_FAVORITE_PATHS] }),
      add: async (filePath) => {
        if (!MOCK_FAVORITE_PATHS.includes(filePath)) MOCK_FAVORITE_PATHS.push(filePath);
        return { ok: true, paths: [...MOCK_FAVORITE_PATHS] };
      },
      remove: async (filePath) => {
        MOCK_FAVORITE_PATHS = MOCK_FAVORITE_PATHS.filter((entry) => entry !== filePath);
        return { ok: true, paths: [...MOCK_FAVORITE_PATHS] };
      },
    },
    playlists: {
      list: async () => ({ playlists: MOCK_PLAYLISTS.map((p) => ({ ...p, tracks: [...p.tracks] })) }),
      create: async (name) => {
        const trimmed = String(name || '').trim();
        if (!trimmed) return { ok: false, error: 'La playlist necesita un nombre.' };
        const now = new Date().toISOString();
        const playlist = { id: `pl_${mockNoteId()}`, name: trimmed, coverPath: null, tracks: [], createdAt: now, updatedAt: now };
        MOCK_PLAYLISTS.push(playlist);
        return { ok: true, playlist: { ...playlist } };
      },
      rename: async (id, name) => mockMutatePlaylist(id, (p) => ({ ...p, name: String(name || '').trim() || p.name })),
      delete: async (id) => {
        const before = MOCK_PLAYLISTS.length;
        MOCK_PLAYLISTS = MOCK_PLAYLISTS.filter((p) => p.id !== id);
        return MOCK_PLAYLISTS.length < before ? { ok: true } : { ok: false, error: 'La playlist no existe.' };
      },
      addTrack: async (playlistId, trackPath) =>
        mockMutatePlaylist(playlistId, (p) =>
          (p.tracks.includes(trackPath) ? p : { ...p, tracks: [...p.tracks, trackPath] })),
      removeTrack: async (playlistId, trackPath) =>
        mockMutatePlaylist(playlistId, (p) => ({ ...p, tracks: p.tracks.filter((t) => t !== trackPath) })),
      reorder: async (playlistId, fromIndex, toIndex) =>
        mockMutatePlaylist(playlistId, (p) => {
          const size = p.tracks.length;
          const valid = (i) => Number.isInteger(i) && i >= 0 && i < size;
          if (!valid(fromIndex) || !valid(toIndex) || fromIndex === toIndex) return p;
          const tracks = [...p.tracks];
          const [moved] = tracks.splice(fromIndex, 1);
          tracks.splice(toIndex, 0, moved);
          return { ...p, tracks };
        }),
      // Sin fs real: se guarda el data URL del PNG de prueba como coverPath, que
      // es lo que buildCoverUrl termina pasando al <img>.
      setCover: async (playlistId) =>
        mockMutatePlaylist(playlistId, (p) => ({ ...p, coverPath: MOCK_COVER_DATA_URL })),
      removeCover: async (playlistId) => mockMutatePlaylist(playlistId, (p) => ({ ...p, coverPath: null })),
      importM3u: async () => {
        const now = new Date().toISOString();
        const playlist = {
          id: `pl_${mockNoteId()}`,
          name: 'Lista importada',
          coverPath: null,
          tracks: [MOCK_MUSIC_TRACKS[0].path, MOCK_MUSIC_TRACKS[3].path, 'C:/Users/mock/Music/borrada.mp3'],
          createdAt: now,
          updatedAt: now,
        };
        MOCK_PLAYLISTS.push(playlist);
        return { ok: true, playlist: { ...playlist }, matchedCount: 2, unmatchedCount: 2 };
      },
      pickM3u: async () => 'C:/Users/mock/Music/Lista importada.m3u',
      pickImage: async () => 'C:/Users/mock/Pictures/portada.png',
      readImage: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    },
    history: {
      list: async () => ({ entries: [...MOCK_HISTORY_ENTRIES] }),
      add: async (filePath, playedAt) => {
        MOCK_HISTORY_ENTRIES = [{ path: filePath, playedAt }, ...MOCK_HISTORY_ENTRIES].slice(0, 500);
        return { ok: true };
      },
      clear: async () => {
        MOCK_HISTORY_ENTRIES = [];
        return { ok: true };
      },
    },
    notes: {
      list: async ({ view = 'active', filters = {} } = {}) => {
        const matchView = (n) => (n.trashed ? view === 'trashed' : n.archived ? view === 'archived' : view === 'active');
        const sortBy = MOCK_NOTES_SETTINGS.sortBy || 'updatedAt';
        const cmp = (a, b) => (sortBy === 'title'
          ? (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' })
          : new Date(b[sortBy]) - new Date(a[sortBy]));
        return MOCK_NOTES
          .filter(matchView)
          .filter((n) => mockNoteMatchesFilters(n, filters))
          .sort((a, b) => {
            if (view === 'active' && Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
            return cmp(a, b);
          })
          .map((n) => ({ ...n }));
      },
      get: async (id) => MOCK_NOTES.find((n) => n.id === id) || null,
      create: async (note) => {
        const now = new Date().toISOString();
        const created = { ...note, id: mockNoteId(), createdAt: now, updatedAt: now, deletedAt: null };
        MOCK_NOTES.push(created);
        return created;
      },
      update: async (id, patch) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (!note) return null;
        Object.assign(note, patch, { updatedAt: new Date().toISOString() });
        return { ...note };
      },
      archive: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) Object.assign(note, { archived: true, pinned: false, updatedAt: new Date().toISOString() });
        return note ? { ...note } : null;
      },
      unarchive: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) Object.assign(note, { archived: false, updatedAt: new Date().toISOString() });
        return note ? { ...note } : null;
      },
      trash: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) Object.assign(note, { trashed: true, archived: false, pinned: false, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return note ? { ...note } : null;
      },
      restore: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) Object.assign(note, { trashed: false, deletedAt: null, updatedAt: new Date().toISOString() });
        return note ? { ...note } : null;
      },
      permanentDelete: async (id) => {
        const before = MOCK_NOTES.length;
        MOCK_NOTES = MOCK_NOTES.filter((n) => n.id !== id);
        return { ok: MOCK_NOTES.length < before };
      },
      emptyTrash: async () => {
        const before = MOCK_NOTES.length;
        MOCK_NOTES = MOCK_NOTES.filter((n) => !n.trashed);
        return { ok: true, removed: before - MOCK_NOTES.length };
      },
      labelsList: async () => [...MOCK_NOTE_LABELS],
      labelsCreate: async (name) => {
        const normalized = String(name || '').trim();
        if (!normalized || MOCK_NOTE_LABELS.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
          return { error: 'Etiqueta inválida o duplicada.' };
        }
        MOCK_NOTE_LABELS.push(normalized);
        return { ok: true, labels: [...MOCK_NOTE_LABELS] };
      },
      labelsRename: async (from, to) => {
        const idx = MOCK_NOTE_LABELS.indexOf(from);
        if (idx >= 0) MOCK_NOTE_LABELS[idx] = to;
        MOCK_NOTES.forEach((n) => { n.labels = n.labels.map((l) => (l === from ? to : l)); });
        return { ok: true, labels: [...MOCK_NOTE_LABELS] };
      },
      labelsDelete: async (name) => {
        MOCK_NOTE_LABELS = MOCK_NOTE_LABELS.filter((l) => l !== name);
        MOCK_NOTES.forEach((n) => { n.labels = n.labels.filter((l) => l !== name); });
        return { ok: true, labels: [...MOCK_NOTE_LABELS] };
      },
      settingsGet: async () => ({ ...MOCK_NOTES_SETTINGS }),
      settingsUpdate: async (patch) => {
        Object.assign(MOCK_NOTES_SETTINGS, patch);
        return { ...MOCK_NOTES_SETTINGS };
      },
      setReminder: async (id, at) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) { note.reminder = { at, fired: false, snoozedFrom: null }; note.updatedAt = new Date().toISOString(); }
        return note ? { ...note } : null;
      },
      clearReminder: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note) { note.reminder = null; note.updatedAt = new Date().toISOString(); }
        return note ? { ...note } : null;
      },
      snoozeReminder: async (id, minutes) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (note?.reminder) {
          note.reminder = { at: new Date(Date.now() + (minutes || 10) * 60000).toISOString(), fired: false, snoozedFrom: note.reminder.snoozedFrom || note.reminder.at };
        }
        return note ? { ...note } : null;
      },
      duplicate: async (id) => {
        const src = MOCK_NOTES.find((n) => n.id === id);
        if (!src) return null;
        const copy = { ...src, id: mockNoteId(), title: `${src.title || 'Nota'} (Copia)`, pinned: false, reminder: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        MOCK_NOTES.push(copy);
        return copy;
      },
      exportMarkdown: async (id) => {
        const note = MOCK_NOTES.find((n) => n.id === id);
        if (!note) return { error: 'La nota no existe.' };
        const bodyBlock = note.type === 'checklist'
          ? note.items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n')
          : note.body;
        const meta = `Color: ${note.color} · Etiquetas: ${note.labels.length ? note.labels.join(', ') : '—'} · Creada: ${new Date(note.createdAt).toLocaleString('es-MX')} · Actualizada: ${new Date(note.updatedAt).toLocaleString('es-MX')}`;
        return { ok: true, markdown: `# ${note.title || 'Sin título'}\n\n${bodyBlock}\n\n---\n${meta}\n` };
      },
      attachImage: async (noteId, arrayBuffer, filename, mime) => {
        const note = MOCK_NOTES.find((n) => n.id === noteId);
        if (!note) return { error: 'La nota no existe.' };
        if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) return { error: 'Formato no soportado.' };
        const size = arrayBuffer?.byteLength || 0;
        if (size > 15 * 1024 * 1024) return { error: 'La imagen excede 15MB.' };
        if ((note.attachments || []).length >= 10) return { error: 'Máximo 10 imágenes por nota.' };
        // Sin fs real: un PNG raster fijo (data URL) que el sanitizer permite.
        const attachment = { id: mockNoteId(), filename, mime, size, path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mNkYPhfz0AEYBxVSF+FgxWMcnBFAADg8wX7l6q3JgAAAABJRU5ErkJggg==', createdAt: new Date().toISOString() };
        note.attachments = [...(note.attachments || []), attachment];
        return { ok: true, attachment };
      },
      removeAttachment: async (noteId, attachmentId) => {
        const note = MOCK_NOTES.find((n) => n.id === noteId);
        if (!note) return { error: 'La nota no existe.' };
        note.attachments = (note.attachments || []).filter((a) => a.id !== attachmentId);
        return { ok: true, attachments: note.attachments };
      },
      bulkAction: async (ids, action, payload = {}) => {
        const idSet = new Set(ids || []);
        const now = new Date().toISOString();
        let affected = 0;
        MOCK_NOTES.forEach((note) => {
          if (!idSet.has(note.id)) return;
          affected += 1;
          if (action === 'archive') { note.archived = true; note.pinned = false; }
          else if (action === 'unarchive') { note.archived = false; }
          else if (action === 'trash') { note.trashed = true; note.archived = false; note.pinned = false; note.deletedAt = now; }
          else if (action === 'color') { note.color = payload.color; }
          else if (action === 'label-add') { if (!note.labels.includes(payload.label)) note.labels.push(payload.label); }
          else if (action === 'label-remove') { note.labels = note.labels.filter((l) => l !== payload.label); }
          note.updatedAt = now;
        });
        return { ok: true, affected };
      },
    },
    // Analizador sin LLM: deriva requisitos de la propia consigna con reglas
    // simples. No busca imitar al modelo, solo darle datos a la UI en navegador.
    analyzer: {
      extractRequirements: async (activity) => {
        await new Promise((resolve) => setTimeout(resolve, 600));

        const text = String(activity?.instrucciones || '');
        const requirements = [];
        const add = (type, description, criteria) =>
          requirements.push({ id: `req-${requirements.length + 1}`, type, description, criteria });

        const words = text.match(/(\d{3,4})\s*palabras/i);
        if (words) add('length', `Extensión de ${words[1]} palabras`, 'Contar las palabras del documento');

        const refs = text.match(/(\d+)\s*(?:referencias|fuentes)/i);
        if (refs) add('content', `Incluir al menos ${refs[1]} referencias`, 'Revisar la sección de referencias');

        if (/apa/i.test(text)) add('format', 'Usar formato APA', 'Verificar citas y bibliografía');
        if (/pdf/i.test(text)) add('format', 'Entregar en formato PDF', 'Comprobar la extensión del archivo');
        if (/equipo|grupal/i.test(`${text} ${activity?.modalidad || ''}`)) {
          add('other', 'Trabajo en equipo', 'Verificar que figuren los integrantes');
        }

        if (requirements.length === 0) {
          add('content', `Cumplir con lo pedido en "${activity?.nombre || 'la actividad'}"`, 'Revisar la consigna completa');
        }

        return { ok: true, requirements, fromCache: false, model: 'mock-rules' };
      },
      parseFile: async ({ filename }) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const extension = String(filename || '').slice(String(filename).lastIndexOf('.')).toLowerCase();

        if (!['.pdf', '.docx'].includes(extension)) {
          return { ok: false, error: `Formato no soportado en Fase 1: ${extension || 'sin extensión'}` };
        }

        return {
          ok: true,
          submission: {
            text: 'Texto simulado de la entrega.',
            pageCount: extension === '.pdf' ? 7 : null,
            wordCount: 1487,
            extension,
            mime: extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            sizeBytes: 240000,
          },
        };
      },
      verifySubmission: async (requirements = []) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        // Rota los cuatro estados para que la UI muestre todos los colores.
        const cycle = ['yes', 'partial', 'no', 'unclear'];
        return {
          ok: true,
          model: 'mock-rules',
          results: requirements.map((requirement, index) => ({
            requirementId: requirement.id,
            met: cycle[index % cycle.length],
            confidence: [0.94, 0.61, 0.88, 0.42][index % 4],
            notes: `Resultado simulado para "${requirement.description}".`,
          })),
        };
      },
    },
    hiddenActivities: {
      get: async () => ({ ok: true, ids: [...MOCK_HIDDEN_ACTIVITY_IDS] }),
      add: async (id) => {
        if (!MOCK_HIDDEN_ACTIVITY_IDS.includes(id)) {
          MOCK_HIDDEN_ACTIVITY_IDS.push(id);
        }
        return { ok: true, ids: [...MOCK_HIDDEN_ACTIVITY_IDS] };
      },
      remove: async (id) => {
        MOCK_HIDDEN_ACTIVITY_IDS = MOCK_HIDDEN_ACTIVITY_IDS.filter((entry) => entry !== id);
        return { ok: true, ids: [...MOCK_HIDDEN_ACTIVITY_IDS] };
      },
    },
    portalSistemas: {
      getProfile: async () => ({
        fullName: 'David Alvarez Aviles',
        email: 'david.alvarez279009@potros.itson.edu.mx',
        studentId: '00000279009',
        photoPath: null, // Sin foto real en mock — cae a iniciales, mismo camino que producción.
        acadProg: 'INSOF',
        cachedAt: hoursAgo(20),
        isStale: false,
      }),
      refreshProfile: async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return {
          fullName: 'David Alvarez Aviles',
          email: 'david.alvarez279009@potros.itson.edu.mx',
          studentId: '00000279009',
          photoPath: null,
          acadProg: 'INSOF',
          cachedAt: new Date().toISOString(),
          isStale: false,
        };
      },
      getCredential: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        return { savedPath: 'C:/Users/mock/Documents/Credencial-00000279009.pdf' };
      },
    },
    notices: {
      // Simula la llegada de una noticia nueva para probar el push en vivo.
      sync: async () => {
        if (!MOCK_NOTIFICATION_SETTINGS.noticesEnabled) {
          return { ok: false, error: 'Las noticias de ITSON están deshabilitadas en Ajustes.' };
        }
        const notification = {
          id: `push-${Date.now()}`,
          key: `news-push-${Date.now()}`,
          source: 'itson-news',
          category: 'info',
          priority: 'info',
          title: 'Reinscripción: fechas y pasos para el semestre 2026-2',
          body: 'Comunicados · hoy',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: 'https://www.itson.mx/portalinstitucional/noticias',
          meta: {},
        };
        MOCK_NOTIFICATIONS = [notification, ...MOCK_NOTIFICATIONS];
        MOCK_NOTIFICATION_SETTINGS.lastSyncAt = new Date().toISOString();
        mockNotificationListener?.({ notification });
        return { ok: true, added: 1 };
      },
    },
  };
}
