const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function expandTerms(terms = []) {
  const variants = [];

  for (const term of terms) {
    const normalized = normalizeText(term);
    if (!normalized) continue;

    variants.push(normalized);

    if (normalized.includes(' ')) {
      variants.push(normalized.replace(/\s+/g, ' '));
      variants.push(normalized.replace(/\s+/g, '\\s+'));
    }

    if (normalized.includes('admision')) variants.push(normalized.replace(/admision/g, 'admisiones'));
    if (normalized.includes('examen')) variants.push(normalized.replace(/examen/g, 'examenes'));
    if (normalized.includes('clase')) variants.push(normalized.replace(/clase/g, 'clases'));
    if (normalized.includes('document')) variants.push(normalized.replace(/document/gi, 'documentos'));
    if (normalized.includes('pago')) variants.push(normalized.replace(/pago/g, 'pagos'));
    if (normalized.includes('carga')) variants.push(normalized.replace(/carga/g, 'cargas'));
    if (normalized.includes('periodo')) variants.push(normalized.replace(/periodo/g, 'periodos'));
    if (normalized.includes('vacacion')) variants.push(normalized.replace(/vacacion/g, 'vacaciones'));
    if (normalized.includes('calificacion')) variants.push(normalized.replace(/calificacion/g, 'calificaciones'));
    if (normalized.includes('evaluacion')) variants.push(normalized.replace(/evaluacion/g, 'evaluaciones'));
  }

  while (variants.length < 8 && terms.length > 0) {
    variants.push(normalizeText(terms[variants.length % terms.length]));
  }

  return [...new Set(variants.filter(Boolean))];
}

function buildKeywords(terms) {
  const variants = expandTerms(terms);
  return new RegExp(variants.map(escapeRegex).join('|'), 'i');
}

function defineCategory({ id, label, color, icon, terms }) {
  return {
    id,
    label,
    color,
    icon,
    keywords: buildKeywords(terms),
  };
}

const CATEGORY_DEFS = [
  // Current calendar titles — exact coverage first.
  { id: 'no_ordinary_exam_application', label: 'Examen no ordinario', color: '#ef4444', icon: 'ClipboardList', terms: ['aplicacion de examenes no ordinarios', 'aplicacion examenes no ordinarios', 'examenes no ordinarios', 'periodo no ordinario'] },
  { id: 'no_ordinary_exam_grades_capture', label: 'Captura no ordinario', color: '#f97316', icon: 'PenTool', terms: ['captura de calificaciones de examenes no ordinarios', 'captura calificaciones no ordinarios', 'captura no ordinarios', 'calificaciones no ordinarias'] },
  { id: 'operations_resume', label: 'Reanudación', color: '#10b981', icon: 'PlayCircle', terms: ['reanudacion de labores', 'reanudacion labores', 'reanudar labores', 'vuelta a labores'] },
  { id: 'imss_new_entry_affiliation', label: 'IMSS nuevo ingreso', color: '#38bdf8', icon: 'ShieldCheck', terms: ['solicitud para afiliacion de nuevo ingreso seguro facultativo imss', 'afiliacion nuevo ingreso imss', 'seguro facultativo nuevo ingreso', 'imss nuevo ingreso'] },
  { id: 'course_load_selection_jan_may', label: 'Carga Ene-Mayo', color: '#8b5cf6', icon: 'BookMarked', terms: ['seleccion de carga academica enero mayo 2026', 'seleccion carga academica enero mayo', 'carga academica enero mayo', 'inscripcion enero mayo'] },
  { id: 'new_entry_induction', label: 'Inducción', color: '#14b8a6', icon: 'Sparkles', terms: ['induccion para alumnos de nuevo ingreso', 'induccion alumnos nuevo ingreso', 'induccion nuevo ingreso', 'bienvenida nuevo ingreso'] },
  { id: 'first_day_classes', label: 'Inicio de clases', color: '#22c55e', icon: 'CalendarCheck2', terms: ['primer dia de clases', 'inicio de clases', 'comienzo de clases', 'arranque de semestre'] },
  { id: 'imss_student_affiliation', label: 'IMSS estudiantes', color: '#0ea5e9', icon: 'Shield', terms: ['solicitud para afiliacion de estudiantes seguro facultativo imss', 'afiliacion de estudiantes imss', 'seguro facultativo estudiantes', 'imss estudiantes'] },
  { id: 'labor_suspension', label: 'Suspensión', color: '#fb7185', icon: 'PauseCircle', terms: ['suspension de labores', 'suspension labores', 'dia sin labores', 'suspension administrativa'] },
  { id: 'admission_request', label: 'Admisión', color: '#38bdf8', icon: 'FilePlus2', terms: ['solicitud de admision', 'solicitud admision', 'admision', 'aspirantes'] },
  { id: 'withdrawal_partial_total', label: 'Baja', color: '#f97316', icon: 'CircleSlash2', terms: ['solicitud de baja parcial o total de clases', 'baja parcial total clases', 'baja de clases', 'retiro de clases'] },
  { id: 'change_program_plan', label: 'Cambio de plan', color: '#a855f7', icon: 'Route', terms: ['solicitud de cambio de programa o plan', 'cambio de programa', 'cambio de plan', 'cambio de carrera'] },
  { id: 'vacation_period', label: 'Vacaciones', color: '#14b8a6', icon: 'Umbrella', terms: ['periodo vacacional', 'vacaciones', 'receso vacacional', 'periodo de vacaciones'] },
  { id: 'teacher_evaluation', label: 'Evaluación docente', color: '#f59e0b', icon: 'Star', terms: ['evaluacion desempeño docente', 'evaluacion docente', 'desempeno docente', 'encuesta docente'] },
  { id: 'docs_pickup_new_entry', label: 'Documentación nuevo ingreso', color: '#64748b', icon: 'FileDown', terms: ['retiro de documentacion escolar de alumnos de nuevo ingreso', 'retiro documentacion nuevo ingreso', 'documentacion nuevo ingreso', 'entrega de documentos'] },
  { id: 'debt_clearance_week', label: 'Liberación de adeudos', color: '#22c55e', icon: 'BadgeCheck', terms: ['semana de liberacion de adeudos', 'liberacion de adeudos', 'adeudos', 'regularizacion de adeudos'] },
  { id: 'last_day_classes', label: 'Fin de clases', color: '#ef4444', icon: 'CalendarX2', terms: ['ultimo dia de clases', 'fin de clases', 'cierre de clases', 'termino de clases'] },
  { id: 'final_exams', label: 'Exámenes finales', color: '#dc2626', icon: 'GraduationCap', terms: ['evaluaciones finales', 'examenes finales', 'finales', 'periodo final'] },
  { id: 'final_grades_capture', label: 'Captura final', color: '#0ea5e9', icon: 'ClipboardCheck', terms: ['captura de calificaciones finales', 'captura final', 'calificaciones finales', 'registro de notas finales'] },
  { id: 'no_ordinary_exam_payment', label: 'Pago no ordinario', color: '#f59e0b', icon: 'Banknote', terms: ['solicitud y pago de examen no ordinario', 'pago examen no ordinario', 'pago no ordinario', 'examen extraordinario pago'] },
  { id: 'no_ordinary_exam_schedule', label: 'Horario no ordinario', color: '#8b5cf6', icon: 'Clock3', terms: ['publicacion de horarios de examenes no ordinarios', 'horarios examenes no ordinarios', 'horario no ordinario', 'publicacion horario examenes'] },
  { id: 'course_load_selection_summer', label: 'Carga Verano', color: '#06b6d4', icon: 'SunMedium', terms: ['seleccion de carga academica verano', 'carga academica verano', 'inscripcion verano', 'verano carga academica'] },
  { id: 'first_day_classes_summer', label: 'Inicio Verano', color: '#22c55e', icon: 'Sunrise', terms: ['primer dia de clases verano', 'inicio clases verano', 'primer dia verano', 'arranque verano'] },
  { id: 'new_entry_registration_info', label: 'Info inscripción', color: '#3b82f6', icon: 'Info', terms: ['publicacion de informacion inscripcion alumnos de nuevo ingreso', 'informacion inscripcion nuevo ingreso', 'inscripcion nuevo ingreso informacion', 'convocatoria nuevo ingreso'] },
  { id: 'admitted_docs_receipt', label: 'Recepción admitidos', color: '#06b6d4', icon: 'Inbox', terms: ['recepcion de documentacion de aspirantes admitidos', 'recepcion documentacion admitidos', 'documentacion aspirantes admitidos', 'entrega documentos admitidos'] },
  { id: 'last_day_classes_summer', label: 'Fin Verano', color: '#ef4444', icon: 'CalendarOff', terms: ['ultimo dia de clases verano', 'fin clases verano', 'cierre verano', 'termino verano'] },
  { id: 'last_work_day', label: 'Último día de labores', color: '#64748b', icon: 'CalendarMinus2', terms: ['ultimo dia de labores', 'fin de labores', 'cierre de labores', 'ultimo dia laboral'] },
  { id: 'new_entry_induction_alt', label: 'Inducción N. ingreso', color: '#14b8a6', icon: 'Sparkles', terms: ['induccion alumnos de nuevo ingreso', 'induccion nuevo ingreso', 'bienvenida alumnos nuevo ingreso', 'induccion itson'] },
  { id: 'new_entry_course_load_selection', label: 'Carga nuevo ingreso', color: '#8b5cf6', icon: 'BookOpenCheck', terms: ['seleccion de carga academica alumnos de nuevo ingreso', 'carga academica nuevo ingreso', 'seleccion carga nuevo ingreso', 'inscripcion nuevo ingreso carga'] },
  { id: 'advanced_student_course_load_selection', label: 'Carga semestres avanzados', color: '#0ea5e9', icon: 'Layers3', terms: ['seleccion de carga academica alumnos de segundo semestre en adelante', 'carga academica semestres avanzados', 'alumnos segundo semestre adelante', 'seleccion carga avanzada'] },
  { id: 'imss_student_affiliation_general', label: 'IMSS estudiantes', color: '#0284c7', icon: 'Shield', terms: ['solicitud para afiliacion de estudiantes seguro facultativo', 'afiliacion estudiantes imss', 'seguro facultativo estudiantes', 'imss seguro facultativo'] },
  { id: 'change_program_plan_start', label: 'Inicio cambio plan', color: '#a855f7', icon: 'Route', terms: ['inicia solicitud de cambio de programa o plan', 'inicio cambio programa plan', 'cambio programa plan inicio', 'solicitud cambio plan inicio'] },
  { id: 'school_docs_withdrawal', label: 'Retiro documentos', color: '#64748b', icon: 'FolderMinus', terms: ['retiro de documentacion escolar', 'retiro documentacion escolar', 'retirar documentos escolares', 'documentacion escolar retiro'] },
  { id: 'new_entry_registration_info_alt', label: 'Info nuevo ingreso', color: '#3b82f6', icon: 'Megaphone', terms: ['publicacion de informacion inscripcion de alumnos de nuevo ingreso', 'publicacion informacion alumnos nuevo ingreso', 'info inscripcion nuevo ingreso', 'convocatoria alumnos nuevo ingreso'] },
  { id: 'school_docs_receipt', label: 'Recepción documentos', color: '#06b6d4', icon: 'Inbox', terms: ['recepcion de documentacion escolar', 'recepcion documentacion escolar', 'entrega documentacion escolar', 'documentacion escolar recibo'] },

  // Supplemental categories for future ITSON calendar patterns.
  { id: 'semester_start', label: 'Inicio semestre', color: '#22c55e', icon: 'CalendarCheck2', terms: ['inicio de semestre', 'arranque de semestre', 'comienzo de semestre', 'apertura de semestre'] },
  { id: 'semester_end', label: 'Fin semestre', color: '#ef4444', icon: 'CalendarX2', terms: ['fin de semestre', 'cierre de semestre', 'termino de semestre', 'ultimo dia de semestre'] },
  { id: 'winter_break', label: 'Receso invierno', color: '#0ea5e9', icon: 'Snowflake', terms: ['receso invernal', 'vacaciones de invierno', 'periodo invernal', 'descanso invernal'] },
  { id: 'summer_break', label: 'Receso verano', color: '#06b6d4', icon: 'SunMedium', terms: ['receso de verano', 'vacaciones de verano', 'periodo veraniego', 'descanso de verano'] },
  { id: 'holiday_national_independence', label: 'Independencia', color: '#ef4444', icon: 'Flag', terms: ['independencia de mexico', '16 de septiembre', 'grito de independencia', 'fiesta patria'] },
  { id: 'holiday_national_revolution', label: 'Revolución', color: '#f97316', icon: 'FlagTriangleRight', terms: ['revolucion mexicana', '20 de noviembre', 'aniversario revolucion', 'fiesta revolucion'] },
  { id: 'holiday_national_constitution', label: 'Constitución', color: '#8b5cf6', icon: 'ScrollText', terms: ['constitucion mexicana', '5 de febrero', 'aniversario constitucion', 'fiesta constitucional'] },
  { id: 'holiday_national_benito', label: 'Benito Juárez', color: '#22c55e', icon: 'Landmark', terms: ['natalicio benito juarez', '21 de marzo', 'benito juarez', 'natalicio juarez'] },
  { id: 'holiday_national_labor', label: 'Día del trabajo', color: '#f59e0b', icon: 'BriefcaseBusiness', terms: ['dia del trabajo', '1 de mayo', 'labor day', 'dia del trabajador'] },
  { id: 'holiday_national_dead', label: 'Día de Muertos', color: '#a855f7', icon: 'CandlestickChart', terms: ['dia de muertos', '2 de noviembre', 'muertos', 'animas'] },
  { id: 'holiday_national_christmas', label: 'Navidad', color: '#dc2626', icon: 'Gift', terms: ['navidad', '25 de diciembre', 'navideno', 'nochebuena'] },
  { id: 'holiday_national_new_year', label: 'Año nuevo', color: '#0ea5e9', icon: 'PartyPopper', terms: ['ano nuevo', '1 de enero', 'ano nuevo laboral', 'inicio de ano'] },
  { id: 'holiday_institutional_itson', label: 'Festivo ITSON', color: '#3b82f6', icon: 'School', terms: ['dia institucional itson', 'festivo itson', 'suspension itson', 'aniversario itson'] },
  { id: 'bridge_holiday', label: 'Puente', color: '#64748b', icon: 'Bridge', terms: ['puente', 'dia puente', 'suspension por puente', 'fin de semana largo'] },
  { id: 'academic_counseling', label: 'Asesoría', color: '#14b8a6', icon: 'Users', terms: ['asesoria academica', 'asesorias', 'tutoria', 'acompanamiento academico'] },
  { id: 'tutoring_period', label: 'Tutorías', color: '#0ea5e9', icon: 'HeartHandshake', terms: ['periodo de tutorias', 'tutorias', 'asesoria de tutor', 'tutoria academica'] },
  { id: 'withdrawal_request', label: 'Baja parcial', color: '#fb7185', icon: 'Scissors', terms: ['solicitud de baja parcial', 'baja parcial', 'retiro parcial', 'cancelacion de clase'] },
  { id: 'change_program_plan_mobility', label: 'Cambio de plan', color: '#8b5cf6', icon: 'Route', terms: ['solicitud de cambio de programa o plan', 'cambio de plan', 'cambio de programa', 'movilidad interna'] },
  { id: 'imss_new_entry_docs', label: 'Docs IMSS nuevo', color: '#38bdf8', icon: 'FileLock2', terms: ['afiliacion imss nuevo ingreso', 'documentacion imss', 'seguro facultativo nuevo ingreso', 'tramite imss'] },
  { id: 'payment_tuition', label: 'Colegiatura', color: '#f59e0b', icon: 'ReceiptText', terms: ['colegiatura', 'pago de colegiatura', 'aranceles', 'pago de cuotas'] },
  { id: 'payment_enrollment', label: 'Inscripción pago', color: '#f97316', icon: 'CreditCard', terms: ['pago de inscripcion', 'inscripcion pago', 'pago de reinscripcion', 'cuota de inscripcion'] },
  { id: 'scholarship_deadlines', label: 'Becas', color: '#22c55e', icon: 'Award', terms: ['becas', 'convocatoria beca', 'apoyo economico', 'beca y manutencion'] },
  { id: 'student_services', label: 'Servicios escolares', color: '#3b82f6', icon: 'Inbox', terms: ['servicios escolares', 'tramites escolares', 'atencion escolar', 'gestion escolar'] },
  { id: 'records_request', label: 'Constancias', color: '#64748b', icon: 'FileBadge2', terms: ['constancia', 'constancias', 'certificado', 'tramite de documentos'] },
  { id: 'transcript_request', label: 'Kárdex', color: '#0ea5e9', icon: 'ClipboardList', terms: ['kardex', 'cardex', 'historial academico', 'reporte academico'] },
  { id: 'credential_pickup', label: 'Credencial', color: '#14b8a6', icon: 'IdCard', terms: ['credencial', 'reposicion de credencial', 'entrega de credenciales', 'tramite de credencial'] },
  { id: 'service_social', label: 'Servicio social', color: '#10b981', icon: 'Handshake', terms: ['servicio social', 'liberacion de servicio', 'registro servicio social', 'inicia servicio social'] },
  { id: 'professional_practice', label: 'Prácticas', color: '#06b6d4', icon: 'Briefcase', terms: ['practicas profesionales', 'estancias', 'practica profesional', 'registro de practicas'] },
  { id: 'internship_registration', label: 'Residencias', color: '#8b5cf6', icon: 'FolderKanban', terms: ['residencias profesionales', 'internado', 'estadia', 'registro de residencia'] },
  { id: 'internship_report', label: 'Informe práctica', color: '#a855f7', icon: 'FileText', terms: ['informe de practicas', 'reporte de practicas', 'bitacora de practicas', 'entrega de informe'] },
  { id: 'titling', label: 'Titulación', color: '#f97316', icon: 'GraduationCap', terms: ['titulacion', 'tramite de titulacion', 'proceso de titulacion', 'liberacion de titulo'] },
  { id: 'professional_exam', label: 'Examen profesional', color: '#ef4444', icon: 'ScrollText', terms: ['examen profesional', 'examen de grado', 'defensa de tesis', 'acto de titulacion'] },
  { id: 'graduation', label: 'Graduación', color: '#22c55e', icon: 'PartyPopper', terms: ['graduacion', 'ceremonia de graduacion', 'acto academico', 'entrega de diplomas'] },
  { id: 'academic_congress', label: 'Congreso', color: '#0ea5e9', icon: 'Microscope', terms: ['congreso academico', 'simposio', 'foro academico', 'jornadas academicas'] },
  { id: 'research_event', label: 'Investigación', color: '#14b8a6', icon: 'Search', terms: ['investigacion', 'seminario de investigacion', 'coloquio', 'presentacion de proyectos'] },
  { id: 'seminar', label: 'Seminario', color: '#8b5cf6', icon: 'Presentation', terms: ['seminario', 'charla', 'conferencia', 'ponencia'] },
  { id: 'workshop', label: 'Taller', color: '#f59e0b', icon: 'Wrench', terms: ['taller', 'laboratorio', 'sesion practica', 'curso taller'] },
  { id: 'sports_week', label: 'Deportiva', color: '#22c55e', icon: 'Trophy', terms: ['semana deportiva', 'torneo', 'juegos universitarios', 'deportes'] },
  { id: 'cultural_week', label: 'Cultural', color: '#ec4899', icon: 'Music2', terms: ['semana cultural', 'festival cultural', 'arte y cultura', 'evento cultural'] },
  { id: 'welcome_week', label: 'Bienvenida', color: '#06b6d4', icon: 'PartyPopper', terms: ['semana de bienvenida', 'bienvenida', 'inicio de curso', 'actividades de bienvenida'] },
  { id: 'orientation', label: 'Orientación', color: '#3b82f6', icon: 'Compass', terms: ['orientacion', 'orientacion academica', 'nuevo alumno', 'ingreso universitario'] },
  { id: 'employment_fair', label: 'Bolsa de trabajo', color: '#14b8a6', icon: 'BriefcaseBusiness', terms: ['bolsa de trabajo', 'feria de empleo', 'vacantes', 'reclutamiento'] },
  { id: 'mobility_exchange', label: 'Movilidad', color: '#8b5cf6', icon: 'Plane', terms: ['movilidad academica', 'intercambio', 'estancia academica', 'movilidad internacional'] },
  { id: 'continuing_education', label: 'Educación continua', color: '#0ea5e9', icon: 'BookOpenText', terms: ['educacion continua', 'extension universitaria', 'diplomado', 'curso de extension'] },
  { id: 'library_event', label: 'Biblioteca', color: '#64748b', icon: 'LibraryBig', terms: ['biblioteca', 'recursos bibliograficos', 'lectura', 'capacitacion bibliotecaria'] },
  { id: 'health_campaign', label: 'Salud', color: '#ef4444', icon: 'HeartPulse', terms: ['campana de salud', 'salud estudiantil', 'brigada de salud', 'servicios medicos'] },
  { id: 'platform_maintenance', label: 'Mantenimiento plataforma', color: '#64748b', icon: 'MonitorCog', terms: ['mantenimiento de plataforma', 'mantenimiento del sistema', 'plataforma', 'sistema fuera de servicio'] },
  { id: 'portal_maintenance', label: 'Mantenimiento portal', color: '#64748b', icon: 'Globe', terms: ['mantenimiento del portal', 'portal institucional', 'sitio web', 'ventana de mantenimiento'] },
  { id: 'administrative_closure', label: 'Cierre administrativo', color: '#f97316', icon: 'FolderCog', terms: ['cierre administrativo', 'cierre de sistema', 'bloqueo administrativo', 'cierre de periodo'] },
  { id: 'audit_accreditation', label: 'Acreditación', color: '#22c55e', icon: 'BadgeCheck', terms: ['acreditacion', 'auditoria', 'evaluacion institucional', 'certificacion'] },
  { id: 'exam_schedule_release', label: 'Calendario exámenes', color: '#8b5cf6', icon: 'CalendarRange', terms: ['publicacion horarios examenes', 'horario de examenes', 'calendario de examenes', 'programacion de examenes'] },
  { id: 'extraordinary_results', label: 'Resultados extra', color: '#ef4444', icon: 'ScrollText', terms: ['resultados extraordinarios', 'publicacion de resultados', 'calificaciones extraordinarias', 'resultados no ordinarios'] },
  { id: 'final_grades_release', label: 'Liberación finales', color: '#0ea5e9', icon: 'ClipboardCheck', terms: ['publicacion de calificaciones finales', 'liberacion de calificaciones', 'calificaciones finales', 'publicacion final'] },
  { id: 'grade_review', label: 'Revisión de calificación', color: '#f59e0b', icon: 'SearchCheck', terms: ['revision de calificacion', 'rectificacion de calificacion', 'revision de notas', 'revision academica'] },
  { id: 'grade_submission', label: 'Entrega de calificaciones', color: '#10b981', icon: 'FileCheck2', terms: ['entrega de calificaciones', 'captura de notas', 'registro de calificaciones', 'entrega de evaluaciones'] },
  { id: 'extraordinary_request', label: 'Solicitud extraordinario', color: '#f97316', icon: 'Ticket', terms: ['solicitud de examen extraordinario', 'tramite extraordinario', 'examen no ordinario solicitud', 'registro extraordinario'] },
  { id: 'grade_capture', label: 'Captura de evaluación', color: '#3b82f6', icon: 'PencilLine', terms: ['captura de evaluaciones', 'registro de evaluaciones', 'captura parcial', 'captura de notas'] },
  { id: 'general_academic_event', label: 'Académico general', color: '#94a3b8', icon: 'CalendarDays', terms: ['evento academico', 'actividad academica', 'aviso academico', 'comunicado academico'] },
];

const FALLBACK_CATEGORY = {
  id: 'general',
  label: 'General',
  color: '#9CA4AF',
  icon: 'CalendarDays',
  keywords: null,
};

const CATEGORY_ORDER = [];
const CATEGORIES = {};

for (const def of CATEGORY_DEFS) {
  const category = defineCategory(def);
  CATEGORY_ORDER.push(category.id);
  CATEGORIES[category.id] = category;
}

CATEGORIES.general = FALLBACK_CATEGORY;
CATEGORY_ORDER.push('general');

export function classifyEvent(title) {
  const normalized = normalizeText(title);

  for (const categoryId of CATEGORY_ORDER) {
    const category = CATEGORIES[categoryId];
    if (category?.keywords && category.keywords.test(normalized)) {
      return category;
    }
  }

  return CATEGORIES.general;
}

export { CATEGORIES };
