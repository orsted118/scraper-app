// electron-builder config: casi todo sigue viniendo de package.json.build para
// no partir el config, pero `extraResources` necesita resolver el path del
// Chromium de Playwright en runtime porque:
//   1. Vive en %LOCALAPPDATA%\ms-playwright\ — user-specific, no relativo al
//      repo, así que no puede ir hardcoded para otra máquina que clone.
//   2. Playwright bumpea la versión del browser cada release menor. Hardcodear
//      `chromium_headless_shell-1223` rompe silenciosamente cuando actualizás
//      la dependencia.
// Preguntándoselo al propio módulo (`chromium.executablePath()`) nos da el path
// correcto sin depender de convención ni de quién compila.
const path = require('path');
const packageJson = require('./package.json');

// `chromium.executablePath()` devuelve el chromium regular (chromium-<v>). Los
// handlers de la app usan `chromium.launch({ headless: true })`, que en
// Playwright 1.55+ apunta al chromium_headless_shell — mismo número de versión,
// carpeta hermana. Derivamos el nombre reemplazando el prefijo.
const chromiumBinary = require('playwright').chromium.executablePath();
// .../ms-playwright/chromium-1223/chrome-win64/chrome.exe → carpeta 'chromium-1223'.
const browsersRoot = path.dirname(path.dirname(path.dirname(chromiumBinary)));
const chromiumFolder = path.basename(path.dirname(path.dirname(chromiumBinary)));
const headlessShellFolder = chromiumFolder.replace(/^chromium-/, 'chromium_headless_shell-');
const headlessShellDir = path.join(browsersRoot, headlessShellFolder);

if (!require('fs').existsSync(headlessShellDir)) {
  throw new Error(
    `No se encontró ${headlessShellDir}. Corré 'npx playwright install chromium' antes de empaquetar.`,
  );
}

module.exports = {
  ...packageJson.build,
  extraResources: [
    {
      from: headlessShellDir,
      to: path.posix.join('ms-playwright', headlessShellFolder),
    },
  ],
};
