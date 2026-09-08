// Cobertura de la clasificación de actividades (pendiente / retrasada / cerrada).
//
// Regla de diseño que estos casos protegen: `cerrada` significa "el portal ya no
// acepta entregas". No significa "no puedo entregar ahora mismo". Antes se
// mezclaban, y cualquier actividad sin botón de entrega cuya columna
// "Submission" dijera "No submission" caía en cerradas — enterrando tareas que
// todavía no abren y grupales sin equipo asignado, que el alumno sí debe hacer.
//
// Uso: node scripts/test-clasificacion.cjs
const { classifyAssignment, resolveSubmissionWindow } = require('../electron/handlers/scraper.js');

let failures = 0;

const DIA = 24 * 60 * 60 * 1000;
const enFechaMoodle = (offsetMs) => {
  const date = new Date(Date.now() + offsetMs);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}, 23:59`;
};

function expect(nombre, entrada, esperado, nota) {
  const actual = classifyAssignment(entrada);
  const ok = actual === esperado;
  if (!ok) failures += 1;
  const marca = ok ? 'PASS' : 'FAIL';
  console.log(`${marca}  ${String(esperado).padEnd(10)} <- ${nombre}${nota ? '   // ' + nota : ''}`);
  if (!ok) console.log(`        obtenido: ${actual}`);
}

function expectVentana(nombre, submissionState, esperado, nota) {
  const actual = resolveSubmissionWindow(submissionState);
  const ok = actual === esperado;
  if (!ok) failures += 1;
  const marca = ok ? 'PASS' : 'FAIL';
  console.log(`${marca}  ${esperado.padEnd(10)} <- ${nombre}${nota ? '   // ' + nota : ''}`);
  if (!ok) console.log(`        obtenido: ${actual}`);
}

console.log('== Regresión: el caso que originó el fix ==');
// Asignación 02 - Implementación de Tipos de Datos Abstractos (Estructuras de
// Datos). Grupal, sin fecha límite publicada, sin botón de entrega porque el
// profesor todavía no asigna equipos. El portal NO dice que esté cerrada.
expect(
  'grupal sin equipo asignado, sin fecha, sin botón',
  {
    dueDate: '',
    submission: 'No submission',
    submissionState: {
      hasSubmitAction: false,
      sinEquipo: true,
      statusSummary: 'Estado de la entrega No entregado Estado de la calificación No calificado',
    },
  },
  'pendiente',
  'antes daba cerrada',
);

console.log('');
console.log('== "No submission" describe MI entrega, no la ventana ==');
expect(
  'sin botón + "No submission" + sin fecha',
  { dueDate: '', submission: 'No submission', submissionState: { hasSubmitAction: false } },
  'pendiente',
  'falso positivo histórico',
);
expect(
  'sin botón + "Sin entrega" + fecha futura',
  {
    dueDate: enFechaMoodle(5 * DIA),
    submission: 'Sin entrega',
    submissionState: { hasSubmitAction: false },
  },
  'pendiente',
);

console.log('');
console.log('== Todavía no abre -> pendiente, nunca cerrada ==');
expect(
  'aviso "aceptará entregas desde"',
  { dueDate: '', submission: 'No submission', submissionState: { notOpenYet: true } },
  'pendiente',
);
expect(
  'fecha de apertura futura',
  {
    dueDate: enFechaMoodle(10 * DIA),
    submission: 'No submission',
    submissionState: { fechaApertura: enFechaMoodle(3 * DIA) },
  },
  'pendiente',
);

console.log('');
console.log('== Cerrada de verdad ==');
expect(
  'fecha de corte ya vencida',
  {
    dueDate: enFechaMoodle(-10 * DIA),
    submission: 'No submission',
    submissionState: { fechaCierre: enFechaMoodle(-2 * DIA) },
  },
  'cerrada',
  'prueba estructural',
);
expect(
  'texto explícito de cierre',
  { dueDate: '', submission: 'No submission', submissionState: { closedByText: true } },
  'cerrada',
);
expect(
  'ventana ya resuelta por el scraper',
  { dueDate: '', submission: 'No submission', submissionState: { ventana: 'cerrada' } },
  'cerrada',
);

console.log('');
console.log('== Retrasada: venció pero la ventana sigue abierta ==');
expect(
  'fecha límite pasada, sin corte',
  { dueDate: enFechaMoodle(-3 * DIA), submission: 'No submission', submissionState: {} },
  'retrasada',
);
expect(
  'fecha límite pasada pero aún no abre',
  {
    dueDate: enFechaMoodle(-3 * DIA),
    submission: 'No submission',
    submissionState: { notOpenYet: true },
  },
  'pendiente',
  'la ventana manda sobre la fecha',
);

console.log('');
// Cambio de contrato (2026-09): entregada dejo de ser `null`. Antes la
// actividad se descartaba y el dato desaparecia; ahora se conserva con estado
// propio porque es el insumo del conteo de entregas por materia en Material.
// Las paginas de pendientes filtran por estado explicito, asi que no se cuela.
console.log('== Entregada -> estado propio, no se descarta ==');
expect(
  'submissionstatussubmitted',
  { dueDate: '', submission: 'Submitted for grading', submissionState: {} },
  'entregada',
);
expect(
  'clase CSS de entregado',
  { dueDate: '', submission: '', submissionState: { deliveredByClass: true } },
  'entregada',
);
expect(
  'entregada aunque la ventana esté cerrada',
  { dueDate: '', submission: '', submissionState: { deliveredByClass: true, ventana: 'cerrada' } },
  'entregada',
  'entregar gana sobre cerrar',
);
expect(
  'entregada aunque la fecha límite ya pasó',
  { dueDate: enFechaMoodle(-3 * DIA), submission: 'Submitted for grading', submissionState: {} },
  'entregada',
  'no es retrasada: ya se entrego',
);
// Guardarraíl del cambio: `entregada` NO puede ser ninguno de los tres estados
// que las pestañas de Actividades muestran, o apareceria entre las pendientes.
const ESTADOS_VISIBLES = ['pendiente', 'retrasada', 'cerrada'];
const entregadaEsVisible = ESTADOS_VISIBLES.includes(
  classifyAssignment({ dueDate: '', submission: '', submissionState: { deliveredByClass: true } }),
);
console.log(`${entregadaEsVisible ? 'FAIL' : 'PASS'}  entregada no cae en las pestañas de Actividades`);
if (entregadaEsVisible) failures += 1;

console.log('');
console.log('== resolveSubmissionWindow aislado ==');
expectVentana('sin señales', {}, 'abierta', 'default optimista');
expectVentana('corte vencido gana sobre apertura futura', {
  fechaApertura: enFechaMoodle(2 * DIA),
  fechaCierre: enFechaMoodle(-1 * DIA),
}, 'cerrada');
expectVentana('apertura futura', { fechaApertura: enFechaMoodle(2 * DIA) }, 'no_abierta');
expectVentana('corte futuro no cierra', { fechaCierre: enFechaMoodle(2 * DIA) }, 'abierta');
expectVentana('fecha basura se ignora', { fechaCierre: '-' }, 'abierta');
expectVentana('undefined no truena', undefined, 'abierta');

console.log('');
console.log('== Vencida: el BOTON de entrega decide retrasada vs cerrada ==');
// El caso real que motivo esto: ACT01 llevaba 8 dias vencida, el portal ya no
// mostraba boton de entrega, y la app la ponia en RETRASADAS. La mayoria de las
// actividades del ITSON no publica fecha de corte, asi que mirar solo `cierre`
// dejaba en retrasada cosas cerradas hace semanas.
expectVentana('vencida SIN boton = cerrada', {
  fechaLimite: enFechaMoodle(-8 * DIA),
  hasSubmitAction: false,
}, 'cerrada', 'ACT01 real: 8 dias vencida, portal sin boton');

// El contraejemplo, medido el mismo dia: "Clase 26" tambien esta vencida pero
// CONSERVA el boton, o sea el profe acepta entrega tardia.
expectVentana('vencida CON boton = abierta', {
  fechaLimite: enFechaMoodle(-7 * DIA),
  hasSubmitAction: true,
}, 'abierta', 'Clase 26 real: acepta entrega tardia');

// Sin el dato del boton no se puede concluir cierre: quedarse en abierta hace
// que caiga en retrasada, que es el error barato.
expectVentana('vencida sin saber del boton', {
  fechaLimite: enFechaMoodle(-3 * DIA),
}, 'abierta', 'undefined no es prueba de cierre');

expectVentana('no vencida sin boton no cierra', {
  fechaLimite: enFechaMoodle(3 * DIA),
  hasSubmitAction: false,
}, 'abierta');

// Una grupal sin equipo tampoco tiene boton, pero eso NO es cierre: es el profe
// que todavia no armo los equipos. Sin esta excepcion, una grupal vencida
// mientras esperas equipo se enterraria en cerradas.
expectVentana('grupal sin equipo y vencida NO cierra por el boton', {
  fechaLimite: enFechaMoodle(-2 * DIA),
  hasSubmitAction: false,
  sinEquipo: true,
}, 'abierta', 'el bloqueo explica la ausencia del boton');

// Pero una fecha de corte explicita SI cierra, aunque haya bloqueo.
expectVentana('corte vencido cierra aun con bloqueo', {
  fechaLimite: enFechaMoodle(-2 * DIA),
  fechaCierre: enFechaMoodle(-1 * DIA),
  hasSubmitAction: false,
  sinEquipo: true,
}, 'cerrada');

console.log('');
console.log('== Los tres casos reales del portal, punta a punta ==');
expect(
  'ACT01 - CISCO PACKET TRACER',
  {
    dueDate: enFechaMoodle(-8 * DIA),
    submission: 'No submission',
    submissionState: { hasSubmitAction: false, sinEquipo: false, fechaLimite: enFechaMoodle(-8 * DIA) },
  },
  'cerrada',
  'vencida y el portal ya no acepta',
);
expect(
  'Clase 26 Ejercicio Compuertas',
  {
    dueDate: enFechaMoodle(-7 * DIA),
    submission: 'No submission',
    submissionState: { hasSubmitAction: true, sinEquipo: false, fechaLimite: enFechaMoodle(-7 * DIA) },
  },
  'retrasada',
  'vencida pero todavia se puede entregar',
);
expect(
  'Asignacion 02 (grupal sin equipo)',
  {
    dueDate: enFechaMoodle(2 * DIA),
    submission: 'No submission',
    submissionState: { hasSubmitAction: false, sinEquipo: true, fechaLimite: enFechaMoodle(2 * DIA) },
  },
  'pendiente',
  'sin equipo no es cierre',
);

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
