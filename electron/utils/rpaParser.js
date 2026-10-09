// Parseo del Reporte de Progreso Académico (RPA) del ITSON — el SQR ITSR0003.
//
// El texto que sale del PDF trae los números de las CONDICIONES ACADÉMICAS
// concatenados sin separador: "Asignaturas Plan55946" son 55 obligatorias, 9
// acreditadas y 46 faltantes, y "Créditos Totales378.4773.09305.38" son 378.47,
// 73.09 y 305.38. Las filas de las tablas vienen pegadas todas en un renglón.

// Los créditos sí se pueden partir por forma: siempre son N.NN.
function tresDecimales(texto) {
  const nums = String(texto || '').match(/\d+\.\d{2}/g);
  if (!nums || nums.length < 3) return null;

  const [obligatorios, acreditados, faltan] = nums.map(Number);
  return { obligatorios, acreditados, faltan };
}

// Los enteros NO se pueden partir por forma ("55946" es 55/9/46 o 5/59/46 o
// 559/4/6). Lo que desambigua es la relación del propio reporte:
// obligatorias = acreditadas + faltantes. Se prueban las particiones y se
// devuelve la que cierra.
function tresEnteros(digitos) {
  const s = String(digitos || '').trim();
  if (!/^\d+$/.test(s)) return null;

  for (let a = 1; a < s.length - 1; a += 1) {
    for (let b = a + 1; b < s.length; b += 1) {
      const oblig = Number(s.slice(0, a));
      const acred = Number(s.slice(a, b));
      const faltan = Number(s.slice(b));

      if (oblig === acred + faltan) return { obligatorias: oblig, acreditadas: acred, faltantes: faltan };
    }
  }

  return null;
}

const SECCIONES = [
  { clave: 'aprobadas', titulo: 'ASIGNATURAS APROBADAS' },
  { clave: 'reprobadas', titulo: 'ASIGNATURAS REPROBADAS' },
  { clave: 'adicionales', titulo: 'CURSOS ADICIONALES' },
];

// "Ago-Dic 25011030F     Analisis Información y Com    8  5.62"
//  ciclo     ^^ año
//              ^^ período (01/02/OC)
//                ^^^^^ catálogo
//                                                      ^ calificación
//                                                         ^^^^ créditos
// El separador es `\s+` y NO `\s{2,}`: el reporte alinea por columnas, así que
// el nombre más largo de la tabla ("Sist Operativos y Arq de Comp") queda
// pegado a su calificación con un solo espacio y exigir dos lo perdía en
// silencio. El backtracking resuelve los nombres que traen números adentro
// ("Programacion II c/Lab", "Tutoria 2 (INSOF)"), porque después de la
// calificación tienen que venir sí o sí los créditos en formato N.NN.
const FILA = /(Ago-Dic|Ene-May|May-Jul|May-Jun)\s*(\d{2})([0-9A-Z]{2})([0-9A-Z]{4}[A-Z])\s+(.+?)\s+(\d{1,2}|[A-Z]{1,2})\s+(\d+\.\d{2})/g;

function filasDeSeccion(texto, titulo, siguienteTitulo) {
  const inicio = texto.indexOf(titulo);
  if (inicio === -1) return [];

  const fin = siguienteTitulo ? texto.indexOf(siguienteTitulo, inicio) : -1;
  const bloque = texto.slice(inicio, fin === -1 ? undefined : fin);

  const filas = [];
  let match;
  FILA.lastIndex = 0;

  while ((match = FILA.exec(bloque)) !== null) {
    const [, ciclo, anio, periodo, catalogo, nombre, calificacion, creditos] = match;
    const numero = Number(calificacion);

    filas.push({
      ciclo: `${ciclo} ${anio}`,
      periodo,
      codigo: catalogo,
      nombre: nombre.trim(),
      calificacion: Number.isFinite(numero) ? numero : null,
      literal: Number.isFinite(numero) ? null : calificacion.toUpperCase(),
      creditos: Number(creditos),
    });
  }

  return filas;
}

function parseRPA(texto) {
  const plano = String(texto || '').replace(/ /g, ' ');
  if (!/REPORTE PROGRESO ACAD|CONDICIONES ACAD/i.test(plano)) return null;

  const buscar = (patron) => plano.match(patron)?.[1] ?? null;

  const promedio = Number(buscar(/Promedio:\s*([\d.]+)/i));
  const avance = Number(buscar(/%\s*Avance:\s*(\d+)/i));
  const reprobadas = Number(buscar(/Total de Reprobadas\s*(\d+)/i));
  const indice = Number(buscar(/[IÍ]ndice de Reprobaci[oó]n\s*([\d.]+)/i));

  const materias = {};
  SECCIONES.forEach((seccion, i) => {
    materias[seccion.clave] = filasDeSeccion(plano, seccion.titulo, SECCIONES[i + 1]?.titulo);
  });

  return {
    promedioGlobal: Number.isFinite(promedio) ? promedio : null,
    avance: Number.isFinite(avance) ? avance : null,
    reprobadas: Number.isFinite(reprobadas) ? reprobadas : null,
    indiceReprobacion: Number.isFinite(indice) ? indice : null,
    creditos: tresDecimales(buscar(/Cr[eé]ditos Totales\s*([\d.]+)/i)),
    asignaturas: tresEnteros(buscar(/Asignaturas Plan\s*(\d+)/i)),
    materias,
    origen: 'RPA',
  };
}

module.exports = { parseRPA, tresEnteros, tresDecimales };
