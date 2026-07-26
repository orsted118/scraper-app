// Actividades de demostración para probar el analizador con el LLM real cuando
// los portales están vacíos (vacaciones). Se sirven en lugar del scraper solo
// si DVPOTRO_DEMO_ACTIVITIES=1; sin esa variable este módulo no se usa.
//
// Las mismas consignas están replicadas en src/dev-mock.js para el navegador.
// Es fixture duplicada a propósito: main es CommonJS y el renderer es ESM
// bundleado por Vite, así que no pueden compartir el módulo.

const DAY_MS = 24 * 60 * 60 * 1000;

function inDays(offset, hour = 23, minute = 59) {
  const date = new Date(Date.now() + offset * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const DEMO_ACTIVITIES = [
  {
    id: 'demo-1',
    nombre: 'Reporte de práctica 6: análisis de complejidad algorítmica',
    materia: 'Estructuras de Datos',
    profesor: 'Dr. Peralta Villanueva',
    estado: 'pendiente',
    modalidad: 'individual',
    fechaLimite: inDays(4, 23, 59),
    fechaPublicacion: inDays(-6),
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
    rawGrade: null,
    rawSubmission: null,
    url: 'https://ivirtual.itson.mx/mod/assign/view.php?id=demo1',
  },
  {
    id: 'demo-2',
    nombre: 'Entrega 2: prototipo funcional y documentación técnica',
    materia: 'Ingeniería de Software II',
    profesor: 'Mtra. Cárdenas Ibarra',
    estado: 'pendiente',
    modalidad: 'equipo',
    fechaLimite: inDays(9, 18, 0),
    fechaPublicacion: inDays(-3),
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
    rawGrade: null,
    rawSubmission: null,
    url: 'https://ivirtual.itson.mx/mod/assign/view.php?id=demo2',
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
    fechaLimite: inDays(2, 22, 0),
    fechaPublicacion: inDays(-1),
    instrucciones:
      'Resuelve el cuestionario en línea entre el 25 y el 27 de julio. Tienes 60 minutos y un solo intento. ' +
      'Se permite calculadora científica no programable; queda prohibido consultar formularios, apuntes o internet.',
    archivos: [],
    rawGrade: null,
    rawSubmission: null,
    url: 'https://ivirtual.itson.mx/mod/quiz/view.php?id=demo3',
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
    fechaLimite: inDays(14, 23, 59),
    fechaPublicacion: inDays(-2),
    instrucciones:
      'En parejas, produzcan un podcast educativo de entre 8 y 12 minutos sobre un tema social contemporáneo elegido por el equipo. ' +
      'Deben entregar tres artefactos: 1) el archivo de audio en formato MP3 con calidad mínima de 128 kbps; ' +
      '2) un guion escrito en PDF de máximo 3 páginas con las intervenciones marcadas por hablante; ' +
      '3) una lista de fuentes consultadas con al menos 5 referencias, cada una con enlace verificable. ' +
      'Suban un único archivo ZIP que contenga los tres artefactos, nombrando el audio principal como PodcastEquipo{N}.mp3.',
    archivos: [
      { name: 'guia-produccion-podcast.pdf', url: 'https://example.test/guia-podcast.pdf' },
    ],
    rawGrade: null,
    rawSubmission: null,
    url: 'https://ivirtual.itson.mx/mod/assign/view.php?id=demo4',
  },
];

function isDemoModeEnabled() {
  return String(process.env.DVPOTRO_DEMO_ACTIVITIES || '').trim() === '1';
}

function getDemoActivities() {
  return {
    activities: DEMO_ACTIVITIES.map((activity) => ({ ...activity })),
    timestamp: Date.now(),
    fromCache: false,
  };
}

module.exports = { DEMO_ACTIVITIES, getDemoActivities, isDemoModeEnabled };
