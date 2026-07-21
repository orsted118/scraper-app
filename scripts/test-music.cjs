// Harness temporal: verifica music.js con archivos de audio REALES (WAVs PCM
// generados programáticamente — sin depender de MP3s del usuario). Usa el
// userData del perfil "Electron". Correr: npx electron scripts/test-music.cjs
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, BrowserWindow } = require('electron');

// El scheme privilegiado DEBE registrarse antes de app.whenReady().
require('../electron/handlers/music').registerMusicScheme();

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

// WAV PCM 16-bit mono válido: header de 44 bytes + samples de un tono seno.
function generateWav(filePath, seconds, freq = 440) {
  const sampleRate = 22050;
  const totalSamples = Math.round(sampleRate * seconds);
  const dataSize = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < totalSamples; i += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * freq * i) / sampleRate) * 12000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

async function main() {
  const music = require('../electron/handlers/music');
  const userData = app.getPath('userData');
  console.log('userData:', userData);

  // Limpieza de corridas anteriores.
  fs.rmSync(path.join(userData, 'music-library.json'), { force: true });
  fs.rmSync(path.join(userData, 'music-state.json'), { force: true });

  // ── 1. Fixture: carpeta temporal con WAVs reales + basura ─────
  const musicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-music-'));
  const subDir = path.join(musicDir, 'album-anidado');
  fs.mkdirSync(subDir);

  generateWav(path.join(musicDir, 'cancion-alfa.wav'), 2, 440);
  generateWav(path.join(musicDir, 'cancion-beta.wav'), 3, 330);
  generateWav(path.join(subDir, 'cancion-anidada.wav'), 1.5, 550);
  fs.writeFileSync(path.join(musicDir, 'no-audio.txt'), 'esto no es música');
  fs.writeFileSync(path.join(musicDir, 'corrupto.mp3'), 'bytes que no son mp3');

  try {
    // ── 2. getLibrary sin cache ─────────────────────────────────
    check('getLibrary() sin cache → null', music.getLibrary() === null);

    // ── 3. Scan real ────────────────────────────────────────────
    const library = await music.scanFolder(musicDir);
    check('scan sin error', !library.error);
    check('scan encuentra 4 audios (3 wav + 1 mp3 corrupto), ignora .txt', library.tracks.length === 4, `tracks=${library.tracks.length}`);
    check('scan recursivo entra a subcarpeta', library.tracks.some((t) => t.path.includes('album-anidado')));

    const alfa = library.tracks.find((t) => t.title === 'cancion-alfa');
    check('título fallback = filename sin extensión', Boolean(alfa));
    check('duration real extraída del WAV (~2s)', alfa && Math.abs(alfa.duration - 2) <= 1, `duration=${alfa?.duration}`);
    check('artist fallback', alfa?.artist === 'Artista desconocido');

    const corrupto = library.tracks.find((t) => t.title === 'corrupto');
    check('archivo corrupto entra con metadata mínima, no rompe scan', Boolean(corrupto) && corrupto.duration === 0);

    // ── 4. Cache persistido + getLibrary ────────────────────────
    const cached = music.getLibrary();
    check('library cacheada en disco', cached?.folderPath === musicDir && cached.tracks.length === 4);
    check('scannedAt ISO parseable', Number.isFinite(new Date(cached.scannedAt).getTime()));

    // ── 5. Save/load state roundtrip (cross-session) ────────────
    const state = {
      queue: library.tracks,
      currentIndex: 1,
      position: 42,
      volume: 0.7,
      shuffle: false,
      repeat: 'all',
    };
    const saveResult = music.saveState(state);
    check('saveState ok', saveResult.ok === true);

    const loaded = music.loadState();
    check('loadState devuelve la pista y posición guardadas', loaded?.currentIndex === 1 && loaded?.position === 42);
    check('loadState preserva volumen y repeat', loaded?.volume === 0.7 && loaded?.repeat === 'all');
    check('savedAt estampado', Number.isFinite(new Date(loaded?.savedAt).getTime()));

    // ── 6. Scan de carpeta inexistente → error amigable ─────────
    const bad = await music.scanFolder('C:\\carpeta\\que\\no\\existe');
    check('carpeta inexistente → error sin throw', Boolean(bad.error));

    // ── 7. Protocolo dvpotro-media: <audio> REAL carga el WAV ───
    music.registerMusicProtocol();
    const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
    await win.loadURL('data:text/html,<html><body></body></html>');

    const wavPath = path.join(musicDir, 'cancion-alfa.wav').replace(/\\/g, '/');
    const mediaUrl = `dvpotro-media:///${encodeURI(wavPath)}`;
    const audioResult = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const audio = new Audio(${JSON.stringify(mediaUrl)});
        const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout sin loadedmetadata' }), 10000);
        audio.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          resolve({ ok: true, duration: audio.duration });
        });
        audio.addEventListener('error', () => {
          clearTimeout(timeout);
          resolve({ ok: false, error: audio.error?.message || 'audio error' });
        });
      })
    `);
    check('protocolo sirve el WAV a un <audio> real', audioResult.ok === true, JSON.stringify(audioResult));
    check('duration del <audio> ≈ 2s', audioResult.ok && Math.abs(audioResult.duration - 2) < 0.5, `duration=${audioResult.duration}`);

    // Extensión no-audio → 404 (no file-server genérico)
    const txtUrl = `dvpotro-media:///${encodeURI(path.join(musicDir, 'no-audio.txt').replace(/\\/g, '/'))}`;
    const blockedResult = await win.webContents.executeJavaScript(`
      fetch(${JSON.stringify(txtUrl)}).then((r) => ({ status: r.status })).catch((e) => ({ fetchError: e.message }))
    `);
    check('extensión no-audio bloqueada (404 o fetch rechazado)', blockedResult.status === 404 || Boolean(blockedResult.fetchError), JSON.stringify(blockedResult));

    win.destroy();
  } finally {
    fs.rmSync(musicDir, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) {
    console.log('FALLARON:', failed.map((f) => f.name).join(' | '));
  }
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() =>
  main().catch((error) => {
    console.error('HARNESS ERROR:', error?.message);
    app.exit(1);
  }),
);
