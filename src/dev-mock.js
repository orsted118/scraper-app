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
];

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

const MOCK_CALENDAR_EVENTS = [
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
  };
});

let MOCK_MUSIC_LIBRARY = null;
let MOCK_MUSIC_STATE = null;

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

let mockNotificationListener = null;

if (import.meta.env.DEV && typeof window !== 'undefined' && !window.scraperApp) {
  window.scraperApp = {
    getSettings: async () => ({
      user: '00000000000',
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
    portalSistemas: {
      getProfile: async () => ({
        fullName: 'David Alvarez Aviles',
        email: 'david.alvarez279009@potros.itson.edu.mx',
        studentId: '00000000000',
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
          studentId: '00000000000',
          photoPath: null,
          acadProg: 'INSOF',
          cachedAt: new Date().toISOString(),
          isStale: false,
        };
      },
      getCredential: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        return { savedPath: 'C:/Users/mock/Documents/Credencial-00000000000.pdf' };
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
