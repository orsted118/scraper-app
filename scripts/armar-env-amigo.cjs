// Arma un .env para pasarle a otra persona: conserva las claves de IA y la
// configuración, y saca todo lo que identifica al dueño.
//
// ALLOWLIST y no denylist: borrar las líneas que uno se acuerda deja pasar
// cualquier variable personal que se agregue después. Lo que no está en la
// lista no sale, y al final se imprime QUÉ se descartó para poder revisarlo.
//
// Nunca imprime valores, solo nombres de variable.
//
// Uso: node scripts/armar-env-amigo.cjs
const fs = require('fs');
const path = require('path');

const ORIGEN = path.join(__dirname, '..', '.env');
const DESTINO_DIR = path.join(__dirname, '..', 'release', 'para-amigo');

// Se conserva: claves de los proveedores de IA, el modelo elegido por proveedor
// y los presupuestos del router. Nada de esto identifica a nadie.
const PERMITIDAS = [
  /_API_KEY\d*$/,        // GEMINI_API_KEY, GROQ_API_KEY2, ...
  /^GITHUB_TOKEN\d*$/,   // GitHub Models usa token, no "API_KEY"
  /_MODEL$/,             // GEMINI_MODEL, MISTRAL_MODEL, ...
  /^LLM_/,               // LLM_BACKEND, LLM_TOTAL_BUDGET_MS, ...
  /^SCW_API_BASE_URL$/,
  // Estas dos no matchean ningún patrón de "key" pero sin ellas el backend no
  // arranca: Cloudflare Workers AI pide cuenta ADEMÁS de la clave, y Scaleway
  // llama "secret" a la suya.
  /^CLOUDFLARE_ACCOUNT_ID$/,
  /^SCW_SECRET_KEY$/,
  /^NOTIF_MINUTES_BEFORE$/,
];

// Se cuelan por el patrón `_API_KEY` pero no las usa DVPotro: son de otros
// proyectos del dueño y compartirlas no le sirve a nadie.
const EXCLUIDAS = [/^ORCHESTRATOR_/];

if (!fs.existsSync(ORIGEN)) {
  console.error(`No existe ${ORIGEN}`);
  process.exit(1);
}

const lineas = fs.readFileSync(ORIGEN, 'utf8').split(/\r?\n/);
const conservadas = [];
const descartadas = [];

for (const linea of lineas) {
  const limpia = linea.trim();

  // Comentarios y vacías no se arrastran: el archivo que sale es solo variables.
  if (!limpia || limpia.startsWith('#')) continue;

  const nombre = limpia.split('=')[0].trim();

  if (PERMITIDAS.some((patron) => patron.test(nombre)) && !EXCLUIDAS.some((patron) => patron.test(nombre))) {
    conservadas.push({ nombre, linea: limpia });
  } else {
    descartadas.push(nombre);
  }
}

fs.mkdirSync(DESTINO_DIR, { recursive: true });

const cabecera = [
  '# Configuración de IA para DVPotro.',
  '# Copiá este archivo a  %APPDATA%\\dvpotro\\.env',
  '#',
  '# Tus credenciales de iVirtual y CIA NO van acá: esas se cargan desde',
  '# Ajustes dentro de la app, y son tuyas.',
  '',
].join('\r\n');

fs.writeFileSync(
  path.join(DESTINO_DIR, '.env'),
  cabecera + conservadas.map((c) => c.linea).join('\r\n') + '\r\n',
  'utf8',
);

console.log(`Escrito: ${path.join(DESTINO_DIR, '.env')}`);
console.log('');
console.log(`CONSERVADAS (${conservadas.length}) — solo nombres:`);
conservadas.forEach((c) => console.log(`  ${c.nombre}`));
console.log('');
console.log(`DESCARTADAS (${descartadas.length}) — revisá que no falte nada que él necesite:`);
descartadas.forEach((n) => console.log(`  ${n}`));
