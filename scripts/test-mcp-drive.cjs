// El MCP sirviendo lo que la cola de Drive resolvió. Habla JSON-RPC por stdio
// contra el server real: no se hace require del archivo porque eso arranca el
// listener de stdin y cuelga el proceso.
//
// Lee la caché real y espera que `npm run drive:resolve` (o un scrape) ya haya
// corrido. Si el store está vacío, avisa y no falla.
//
// Uso: node scripts/test-mcp-drive.cjs
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'mcp', 'dvpotro-mcp.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

function cliente() {
  const proceso = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] });
  const pendientes = new Map();
  let buffer = '';
  let siguienteId = 1;

  proceso.stdout.on('data', (trozo) => {
    buffer += trozo.toString('utf8');

    let corte = buffer.indexOf('\n');
    while (corte !== -1) {
      const linea = buffer.slice(0, corte).trim();
      buffer = buffer.slice(corte + 1);

      if (linea) {
        try {
          const mensaje = JSON.parse(linea);
          pendientes.get(mensaje.id)?.(mensaje);
          pendientes.delete(mensaje.id);
        } catch (_error) {
          // Ruido que no es del protocolo: se ignora.
        }
      }

      corte = buffer.indexOf('\n');
    }
  });

  const pedir = (method, params) => new Promise((resolve, reject) => {
    const id = siguienteId;
    siguienteId += 1;

    const reloj = setTimeout(() => reject(new Error(`timeout en ${method}`)), 30_000);
    pendientes.set(id, (mensaje) => { clearTimeout(reloj); resolve(mensaje); });

    proceso.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });

  return { pedir, cerrar: () => proceso.kill() };
}

const texto = (respuesta) => respuesta?.result?.content?.[0]?.text || '';

(async () => {
  const { pedir, cerrar } = cliente();

  try {
    await pedir('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });

    const tools = await pedir('tools/list', {});
    const actividad = (tools.result?.tools || []).find((t) => t.name === 'dvpotro_actividad');
    check('dvpotro_actividad declara incluir_documentos', Boolean(actividad?.inputSchema?.properties?.incluir_documentos), true);

    const estado = texto(await pedir('tools/call', { name: 'dvpotro_estado', arguments: {} }));
    const filaDrive = estado.split('\n').find((l) => l.trim().startsWith('drive'));

    if (!filaDrive) {
      console.log('SKIP  el store de Drive está vacío — corré: npm run drive:resolve');
      cerrar();
      process.exit(0);
    }

    console.log(`      ${filaDrive.trim()}`);
    check('dvpotro_estado muestra la fila de drive', /\d+ resueltos/.test(filaDrive), true);

    // El prefijo del id es POSICIONAL: se corre solo en cuanto aparece una
    // actividad nueva antes en la lista, y este test se ponía rojo sin que nadie
    // tocara el código. Se resuelve por nombre, que sí es estable.
    const listado = texto(await pedir('tools/call', {
      name: 'dvpotro_actividades',
      arguments: { estado: 'todas', buscar: 'Implementación de Tipos de Datos Abstractos' },
    }));
    const ID = (listado.match(/\[([\w-]+)\]/) || [])[1];

    if (!ID) {
      console.log('SKIP  la Asignación 02 de Estructuras de Datos no está en la caché');
      cerrar();
      process.exit(0);
    }

    console.log('');
    console.log(`== La actividad ya no ofrece un link: ofrece el archivo ==  [${ID}]`);
    const corta = texto(await pedir('tools/call', { name: 'dvpotro_actividad', arguments: { id: ID } }));

    check('aparece el bloque de archivos', corta.includes('## Archivos enlazados'), true);
    check('con el nombre real del PDF', corta.includes('Asignación 02 - Implementación de Tipos de Datos Abstractos.pdf'), true);
    check('y la ruta local', corta.includes('drive-files'), true);
    // Ofrecer el mismo Drive como archivo Y como enlace suelto es decirle dos
    // veces lo mismo a quien lee.
    check('el enlace resuelto ya no se repite en Enlaces', corta.includes('## Enlaces'), false);
    check('sin el texto, avisa cómo pedirlo', corta.includes('incluir_documentos:true'), true);
    check('y no vuelca el PDF entero por default', corta.includes('BolsaException'), false);

    console.log('');
    console.log('== Con incluir_documentos:true viene la consigna de verdad ==');
    const larga = texto(await pedir('tools/call', { name: 'dvpotro_actividad', arguments: { id: ID, incluir_documentos: true } }));

    check('ahora sí trae el texto del PDF', larga.includes('BolsaException'), true);
    check('con los métodos que pide el profe', larga.includes('obtenNumObjetos'), true);
    check('y el entregable real', larga.includes('Asignacion02'), true);
    check('el documento agrega contenido, no lo reemplaza', larga.length > corta.length, true);
    console.log(`      ${corta.length} caracteres sin el documento, ${larga.length} con él`);

    console.log('');
    console.log('== Buscar adentro del PDF: lo que antes era imposible ==');
    // La consigna en Moodle es SOLO un enlace a Drive. Sin el texto del PDF,
    // buscar la palabra que define la tarea no encontraba la tarea.
    // VERIFICADO contra la caché: 'BolsaException', 'obtenNumObjetos' y 'JUnit5' no
    // aparecen en NINGÚN campo de Moodle — ni en el nombre, ni en la consigna, ni en
    // la rúbrica, ni en las tablas. Viven sólo adentro del PDF de Drive. Que estas
    // búsquedas encuentren la actividad es la prueba de que el texto entró al índice.
    const busqueda = texto(await pedir('tools/call', { name: 'dvpotro_buscar', arguments: { texto: 'BolsaException' } }));
    check('dvpotro_buscar encuentra la actividad por una palabra del PDF', busqueda.includes(ID), true);

    // `estado: todas` porque la actividad pasa a `entregada` en cuanto se sube, y el
    // filtro por defecto sólo trae pendientes y retrasadas.
    const porNombre = texto(await pedir('tools/call', { name: 'dvpotro_actividades', arguments: { estado: 'todas', buscar: 'obtenNumObjetos' } }));
    check('dvpotro_actividades también filtra por el contenido del PDF', porNombre.includes(ID), true);

    const sinEco = texto(await pedir('tools/call', { name: 'dvpotro_actividades', arguments: { estado: 'todas', buscar: 'palabraQueNoExisteEnNingunLado' } }));
    check('y no encuentra cualquier cosa', sinEco.includes(ID), false);

    console.log('');
    console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  } finally {
    cerrar();
  }

  process.exit(failures === 0 ? 0 : 1);
})();
