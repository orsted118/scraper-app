const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const reportsDir = path.join(rootDir, 'reports');

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

function collectChanges() {
  if (!isGitRepository()) {
    throw new Error('No se detecto un repositorio git en la raiz del proyecto.');
  }

  runGit('git add -N .');

  const hasHead = hasHeadCommit();
  const nameStatusCommand = hasHead ? 'git diff --name-status HEAD' : 'git diff --name-status';
  const diffCommand = hasHead ? 'git diff HEAD' : 'git diff';

  const nameStatusOutput = runGit(nameStatusCommand);
  const diffOutput = runGit(diffCommand);

  const files = nameStatusOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      const filePath = rest[rest.length - 1];
      return { status, filePath };
    });

  return { files, diffOutput };
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
  if (files.some(({ filePath }) => filePath.startsWith('src/') || filePath.startsWith('electron/'))) {
    return 'feature';
  }

  if (files.some(({ filePath }) => /config|package\.json|generate-report\.js/.test(filePath))) {
    return 'config';
  }

  return 'refactor';
}

function buildDiffMap(diffOutput) {
  const diffMap = new Map();
  const normalized = diffOutput.replace(/\r\n/g, '\n');
  const chunks = normalized.split(/^diff --git /m).filter(Boolean);

  chunks.forEach((chunk) => {
    const fullChunk = `diff --git ${chunk}`;
    const headerMatch = fullChunk.match(/^diff --git a\/(.+?) b\/(.+)$/m);

    if (!headerMatch) {
      return;
    }

    const filePath = headerMatch[2];
    diffMap.set(filePath, fullChunk.trim());
  });

  return diffMap;
}

function buildReportContent(reportNumber, files, diffOutput) {
  const diffMap = buildDiffMap(diffOutput);
  const modifiedFilesSection = files.length
    ? files
        .map(({ status, filePath }) => `- \`${filePath}\` — ${describeChange(status)}`)
        .join('\n')
    : '- `N/A` — no se detectaron cambios para reportar';

  const codeChangesSection = files.length
    ? files
        .map(({ filePath }) => {
          const diffBlock = diffMap.get(filePath) || 'No diff available.';
          return `### \`${filePath}\`\n\`\`\`diff\n${diffBlock}\n\`\`\``;
        })
        .join('\n\n')
    : '### `N/A`\n```diff\nNo changes detected.\n```';

  return `# Report ${reportNumber}
**Fecha:** ${formatTimestamp(new Date())}  
**Agente:** Codex  
**Tipo:** ${inferReportType(files)}

## Archivos modificados
${modifiedFilesSection}

## Resumen
Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de handlers y la configuracion minima para continuar el desarrollo del proyecto.

## Cambios de codigo
${codeChangesSection}

## Pendiente para Claude
- Validar la direccion visual de la UI base antes de profundizar en componentes interactivos.
- Confirmar el flujo preferido para desarrollo local Electron + Vite y el contrato de IPC definitivo.
`;
}

function main() {
  ensureReportsDir();

  const reportNumber = getNextReportNumber();
  const reportPath = path.join(reportsDir, `report_${reportNumber}.md`);
  const { files, diffOutput } = collectChanges();
  const reportContent = buildReportContent(reportNumber, files, diffOutput);

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`✅ Reporte generado: reports/report_${reportNumber}.md`);
}

main();
