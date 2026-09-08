// Corre la cola de Drive UNA vez contra la caché real de actividades, sin abrir
// la app. Es lo mismo que hace el scrape al terminar, pero a mano: sirve para
// poblar el store la primera vez, o después de tocar el resolvedor.
//
// Uso: npx electron scripts/resolve-drive-once.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

// Corriendo suelto con `electron scripts/...`, userData sale del name de
// package.json y no de la app instalada. Se resuelve igual que en el MCP para
// pegarle a la carpeta real, y DVPOTRO_USER_DATA la pisa para probar en un
// sandbox sin tocar la instalación.
function userDataReal() {
  if (process.env.DVPOTRO_USER_DATA) return process.env.DVPOTRO_USER_DATA;
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'dvpotro');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'dvpotro');
  }
  return path.join(os.homedir(), '.config', 'dvpotro');
}

app.setPath('userData', userDataReal());

const drive = require('../electron/handlers/drive.js');

app.whenReady().then(async () => {
  console.log(`userData: ${app.getPath('userData')}`);
  const cachePath = path.join(app.getPath('userData'), 'actividades-cache.json');

  if (!fs.existsSync(cachePath)) {
    console.error('No hay actividades-cache.json. Sincronizá Actividades en DVPotro primero.');
    app.exit(1);
    return;
  }

  const actividades = JSON.parse(fs.readFileSync(cachePath, 'utf8')).actividades || [];
  console.log(`${actividades.length} actividades en caché`);

  const resultado = await drive.resolveLinksForActivities(actividades, {
    onProgress: ({ done, total, nombre, estado }) => console.log(`  ${done}/${total} ${estado} ${nombre || ''}`),
  });

  console.log(`\n${resultado.resueltos} resueltos de ${resultado.total} links`);

  for (const [fileId, entrada] of Object.entries(drive.readIndice().archivos)) {
    console.log(`  ${entrada.estado.padEnd(16)} ${entrada.nombre || fileId}${entrada.palabras ? ` (${entrada.palabras} palabras)` : ''}`);
  }

  app.exit(0);
});
