// Arranca `npm start` con DVPOTRO_DEMO_ACTIVITIES=1 para probar el analizador
// contra el LLM real sin depender del scraper (portales vacíos en vacaciones).
// Sin dependencias extra: en PowerShell y bash setear la variable inline
// requiere sintaxis distinta y era el punto donde el usuario se atascaba.
const { spawn } = require('child_process');

// shell:true es necesario porque `npm.cmd` en Windows sin shell tira EINVAL en
// Node 24. La deprecación DEP0190 que aparece por pasar args con shell:true es
// cosmética; los args son constantes internas, no hay superficie de inyección.
const child = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DVPOTRO_DEMO_ACTIVITIES: '1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (error) => {
  console.error('[start-demo] falló al lanzar npm start:', error.message);
  process.exit(1);
});
