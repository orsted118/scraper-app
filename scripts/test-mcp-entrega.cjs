// `dvpotro_entregar` contra el server real, por JSON-RPC sobre stdio. No se
// hace require del archivo: eso arranca el listener de stdin y cuelga.
//
// Por default corre SOLO las defensas y el ensayo: no sube nada al portal.
// El ensayo sí sale a la red (entra a iVirtual y lee el estado de la entrega),
// así que necesita credenciales y tarda ~30 s.
//
// Uso: node scripts/test-mcp-entrega.cjs <idActividad> <rutaArchivo>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'mcp', 'dvpotro-mcp.js');

const ID = process.argv[2];
const ARCHIVO = process.argv[3];

if (!ID || !ARCHIVO) {
  console.log('Uso: node scripts/test-mcp-entrega.cjs <idActividad> <rutaArchivo>');
  process.exit(1);
}

let failures = 0;

function check(label, ok, detalle) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok && detalle) console.log(`        ${detalle}`);
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

  const pedir = (method, params, ms = 30_000) => new Promise((resolve, reject) => {
    const id = siguienteId;
    siguienteId += 1;

    const reloj = setTimeout(() => reject(new Error(`timeout en ${method}`)), ms);
    pendientes.set(id, (mensaje) => { clearTimeout(reloj); resolve(mensaje); });

    proceso.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });

  return { pedir, cerrar: () => proceso.kill() };
}

const texto = (r) => r?.result?.content?.[0]?.text || '';

(async () => {
  const { pedir, cerrar } = cliente();

  try {
    await pedir('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });

    const lista = await pedir('tools/list', {});
    const nombres = (lista.result?.tools || []).map((t) => t.name);
    const spec = (lista.result?.tools || []).find((t) => t.name === 'dvpotro_entregar');

    check('la tool está registrada', nombres.includes('dvpotro_entregar'), `tools: ${nombres.join(', ')}`);
    check('`archivo` es obligatorio', spec?.inputSchema?.required?.includes('archivo'));
    check('`confirmar` existe en el schema', !!spec?.inputSchema?.properties?.confirmar);
    check('`enviar_definitivo` existe en el schema', !!spec?.inputSchema?.properties?.enviar_definitivo);
    check('la descripción avisa que escribe', /escribe/i.test(spec?.description || ''));

    const llamar = (args, ms) => pedir('tools/call', { name: 'dvpotro_entregar', arguments: args }, ms);

    const relativa = texto(await llamar({ id: ID, archivo: 'relativo.pdf' }));
    check('rechaza ruta relativa', /ruta absoluta/i.test(relativa), relativa.slice(0, 120));

    const inexistente = texto(await llamar({ id: ID, archivo: path.join(os.tmpdir(), 'no-existe-jamas-12345.pdf') }));
    check('rechaza archivo inexistente', /No existe el archivo/i.test(inexistente), inexistente.slice(0, 120));

    const vacio = path.join(os.tmpdir(), 'dvpotro-vacio.pdf');
    fs.writeFileSync(vacio, '');
    const resVacio = texto(await llamar({ id: ID, archivo: vacio }));
    check('rechaza archivo vacío', /vac.o/i.test(resVacio), resVacio.slice(0, 120));
    fs.unlinkSync(vacio);

    const carpeta = texto(await llamar({ id: ID, archivo: os.tmpdir() }));
    check('rechaza una carpeta', /No es un archivo/i.test(carpeta), carpeta.slice(0, 120));

    const idFalso = texto(await llamar({ id: 'no-existe-9-9-9', archivo: ARCHIVO }));
    check('rechaza actividad inexistente', /Sin coincidencias/i.test(idFalso), idFalso.slice(0, 120));

    console.log('\n--- ENSAYO (sale a la red, no sube nada) ---');
    const ensayo = texto(await llamar({ id: ID, archivo: ARCHIVO }, 180_000));
    console.log(ensayo);

    check('el ensayo no sube', /ENSAYO — no se subió nada/.test(ensayo));
    check('el ensayo dice cómo confirmar', /confirmar:true/.test(ensayo));
  } finally {
    cerrar();
  }

  console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
