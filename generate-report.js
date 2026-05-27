/*
 * INSTRUCCIONES PARA CODEX:
 * Antes de ejecutar este script, actualiza las constantes
 * de verificación al inicio del archivo:
 *   VERIFICATION.buildStatus = 'PASS' o 'FAIL'
 *   VERIFICATION.verificationCmd = 'el comando que ejecutaste'
 *   VERIFICATION.verificationOutput = 'el output del comando'
 * Luego ejecuta: node generate-report.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const reportsDir = path.join(rootDir, 'reports');
const GIT_MAX_BUFFER = 200 * 1024 * 1024;
const MAX_DIFF_BYTES = 150 * 1024;

const VERIFICATION = {
  buildStatus: 'PASS',
  testsRun: 'ninguno',
  verificationCmd: 'npm run build',
  verificationOutput: `> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1764 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-BMP17a7U.css        22.76 kB | gzip: 5.24 kB
dist/assets/index-D6_SpU8j.js        220.98 kB | gzip: 64.86 kB
✓ built in 4.00s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
};

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getNextReportNumber() {
  const reportFiles = fs
    .readdirSync(reportsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^report_\d{3}\.md$/.test(entry.name))
    .map((entry) => Number(entry.name.match(/^report_(\d{3})\.md$/)[1]));

  const nextNumber = reportFiles.length === 0 ? 1 : Math.max(...reportFiles) + 1;
  return String(nextNumber).padStart(3, '0');
}

function runGit(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: GIT_MAX_BUFFER,
  }).trimEnd();
}

function isGitRepository() {
  try {
    return runGit('git rev-parse --is-inside-work-tree') === 'true';
  } catch (_error) {
    return false;
  }
}

function hasHeadCommit() {
  try {
    runGit('git rev-parse --verify HEAD');
    return true;
  } catch (_error) {
    return false;
  }
}

function getGitContext() {
  try {
    const branch = runGit('git rev-parse --abbrev-ref HEAD');
    const lastCommit = runGit('git log -1 --format="%h — %s"');
    return { branch, lastCommit };
  } catch (_error) {
    return { branch: 'desconocida', lastCommit: 'sin commits' };
  }
}

function collectChanges() {
  if (!isGitRepository()) {
    throw new Error('No se detecto un repositorio git en la raiz del proyecto.');
  }

  runGit('git add -N .');

  const hasHead = hasHeadCommit();
  const nameStatusCommand = hasHead ? 'git diff --name-status HEAD' : 'git diff --name-status';

  const nameStatusOutput = runGit(nameStatusCommand);

  const files = nameStatusOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      const filePath = rest[rest.length - 1];
      return { status, filePath };
    });

  return { files, hasHead };
}

function describeChange(statusCode) {
  if (statusCode.startsWith('A')) {
    return 'archivo creado como parte de la base inicial';
  }

  if (statusCode.startsWith('M')) {
    return 'archivo actualizado en esta tarea';
  }

  if (statusCode.startsWith('D')) {
    return 'archivo eliminado en esta tarea';
  }

  if (statusCode.startsWith('R')) {
    return 'archivo renombrado durante esta tarea';
  }

  return 'archivo ajustado en esta tarea';
}

function inferReportType(files) {
  const paths = files.map((file) => file.filePath);

  const isFix = paths.some((filePath) => /fix|bug|error|repair|patch/i.test(filePath));
  const isConfig = paths.length > 0 && paths.every((filePath) => /config|package\.json|\.gitignore|generate-report/i.test(filePath));
  const isDocs = paths.length > 0 && paths.every((filePath) => /\.md$|docs\//i.test(filePath));
  const isElectronOnly = paths.length > 0 && paths.every((filePath) => filePath.startsWith('electron/'));
  const isFrontendOnly = paths.length > 0 && paths.every((filePath) => filePath.startsWith('src/'));
  const isMixed = paths.some((filePath) => filePath.startsWith('electron/')) && paths.some((filePath) => filePath.startsWith('src/'));

  if (isConfig) return 'config';
  if (isDocs) return 'docs';
  if (isFix) return 'fix';
  if (isMixed) return 'feature';
  if (isElectronOnly) return 'backend';
  if (isFrontendOnly) return 'frontend';
  return 'refactor';
}

function truncateDiffIfNeeded(diff) {
  if (!diff) {
    return diff;
  }

  if (Buffer.byteLength(diff, 'utf8') <= MAX_DIFF_BYTES) {
    return diff;
  }

  const truncated = diff.substring(0, MAX_DIFF_BYTES);
  const lastNewline = truncated.lastIndexOf('\n');
  const safeChunk = lastNewline >= 0 ? truncated.substring(0, lastNewline) : truncated;
  return `${safeChunk}\n\n... [DIFF TRUNCADO — archivo muy grande, ver git diff completo] ...`;
}

function getDiffForFile(filePath, hasHead) {
  try {
    const cmd = hasHead ? `git diff HEAD -- "${filePath}"` : `git diff -- "${filePath}"`;
    const diff = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: GIT_MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();

    return truncateDiffIfNeeded(diff);
  } catch (_error) {
    return null;
  }
}

function getDiffStats(files, hasHead) {
  return files.map(({ filePath }) => {
    try {
      const cmd = hasHead ? `git diff HEAD --numstat -- "${filePath}"` : `git diff --numstat -- "${filePath}"`;
      const output = execSync(cmd, {
        cwd: rootDir,
        encoding: 'utf8',
        maxBuffer: GIT_MAX_BUFFER,
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();

      const firstLine = output.split(/\r?\n/).find(Boolean) || '';
      const match = firstLine.match(/^(\d+|-)\s+(\d+|-)/);
      return {
        filePath,
        added: match && match[1] !== '-' ? parseInt(match[1], 10) : 0,
        removed: match && match[2] !== '-' ? parseInt(match[2], 10) : 0,
      };
    } catch (_error) {
      return { filePath, added: 0, removed: 0 };
    }
  });
}

function buildSummary(files, collectionError) {
  if (collectionError) {
    return `No se pudieron recolectar todos los cambios de git (${collectionError}). Se generó un reporte parcial con la información disponible.`;
  }

  if (files.length === 0) {
    return 'No se detectaron cambios pendientes en el working tree para esta tarea.';
  }

  return `Se registraron ${files.length} archivo(s) modificados en esta tarea. El diff completo se incluye abajo.`;
}

function buildPendingSection(pendingItems = []) {
  if (pendingItems.length === 0) {
    return '- Sin pendientes registrados en esta tarea.';
  }

  return pendingItems.map((item) => `- ${item}`).join('\n');
}

function buildStatsTable(stats) {
  if (!stats.length) {
    return '| Archivo | + líneas | - líneas |\n|---------|----------|----------|\n| N/A | 0 | 0 |';
  }

  const rows = stats
    .map(({ filePath, added, removed }) => `| ${filePath} | ${added} | ${removed} |`)
    .join('\n');

  return `| Archivo | + líneas | - líneas |\n|---------|----------|----------|\n${rows}`;
}

function buildCodeChangesSection(files, hasHead) {
  if (!files.length) {
    return '### `N/A`\n```diff\nNo changes detected.\n```';
  }

  return files
    .map(({ filePath }) => {
      const diffBlock = getDiffForFile(filePath, hasHead) || 'diff no disponible para este archivo.';
      return `### \`${filePath}\`\n\`\`\`diff\n${diffBlock}\n\`\`\``;
    })
    .join('\n\n');
}

function buildVerificationSection() {
  const commandValue = VERIFICATION.verificationCmd || 'pendiente de completar';
  const outputValue = VERIFICATION.verificationOutput || 'pendiente de completar';

  return `**npm run build:** ${VERIFICATION.buildStatus}\n**Tests ejecutados:** ${VERIFICATION.testsRun}\n**Comando de verificación:** ${commandValue}\n**Output de verificación:**\n\`\`\`\n${outputValue}\n\`\`\``;
}

function buildReportContent(reportNumber, payload) {
  const {
    files = [],
    hasHead = false,
    gitContext = { branch: 'desconocida', lastCommit: 'sin commits' },
    stats = [],
    collectionError = '',
  } = payload;

  const pendingItems = [];
  const modifiedFilesSection = files.length
    ? files.map(({ status, filePath }) => `- \`${filePath}\` — ${describeChange(status)}`).join('\n')
    : '- `N/A` — no se detectaron cambios para reportar';

  return `# Report ${reportNumber}
**Fecha:** ${formatTimestamp(new Date())}  
**Agente:** Codex  
**Tipo:** ${inferReportType(files)}

## Contexto Git
**Rama:** ${gitContext.branch}
**Último commit:** ${gitContext.lastCommit}
**Archivos modificados:** ${files.length}

## Archivos modificados
${modifiedFilesSection}

## Estadísticas
${buildStatsTable(stats)}

## Resumen
${buildSummary(files, collectionError)}

## Cambios de codigo
${buildCodeChangesSection(files, hasHead)}

## Verificación
${buildVerificationSection()}

## Pendiente para Claude
${buildPendingSection(pendingItems)}
`;
}

function buildPartialReport(reportNumber, reportError, gitContext) {
  return `# Report ${reportNumber}
**Fecha:** ${formatTimestamp(new Date())}  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** ${gitContext.branch}
**Último commit:** ${gitContext.lastCommit}
**Archivos modificados:** 0

## Archivos modificados
- \`N/A\` — no se pudieron recolectar cambios

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| N/A | 0 | 0 |

## Resumen
No se pudo recolectar información completa de git: ${reportError}

## Cambios de codigo
### \`N/A\`
\`\`\`diff
No changes detected.
\`\`\`

## Verificación
${buildVerificationSection()}

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
`;
}

function main() {
  ensureReportsDir();

  const reportNumber = getNextReportNumber();
  const reportPath = path.join(reportsDir, `report_${reportNumber}.md`);

  try {
    const gitContext = getGitContext();
    let files = [];
    let hasHead = false;
    let collectionError = '';

    try {
      const collected = collectChanges();
      files = collected.files;
      hasHead = collected.hasHead;
    } catch (error) {
      collectionError = error?.message || 'Error desconocido al recolectar cambios.';
    }

    const stats = getDiffStats(files, hasHead);
    const reportContent = buildReportContent(reportNumber, {
      files,
      hasHead,
      gitContext,
      stats,
      collectionError,
    });

    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`✅ Reporte generado: reports/report_${reportNumber}.md`);
  } catch (error) {
    const gitContext = getGitContext();
    const partialContent = buildPartialReport(
      reportNumber,
      error?.message || 'Error desconocido al generar reporte.',
      gitContext
    );

    fs.writeFileSync(reportPath, partialContent, 'utf8');
    console.log(`⚠️ Reporte parcial generado: reports/report_${reportNumber}.md`);
  }
}

main();
