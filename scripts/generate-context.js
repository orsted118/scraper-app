const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const contextPath = path.join(rootDir, 'CONTEXT.md');
const reportsDir = path.join(rootDir, 'reports');

const REQUIRED_ENV_VARS = ['IVIRTUAL_USER', 'IVIRTUAL_PASS', 'CIA_USER', 'CIA_PASS'];

function readFile(relativePath, fallback = '') {
  const filePath = path.join(rootDir, relativePath);

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_error) {
    return fallback;
  }
}

function run(command, fallback = '') {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    }).trim();
  } catch (_error) {
    return fallback;
  }
}

function stripMarkdownNoise(value = '') {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'mi');
  const match = markdown.match(pattern);
  return stripMarkdownNoise(match?.[1] || '');
}

function takeParagraphs(value, maxParagraphs = 3) {
  return stripMarkdownNoise(value)
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxParagraphs)
    .join('\n\n');
}

function parsePackageJson() {
  try {
    return JSON.parse(readFile('package.json', '{}'));
  } catch (_error) {
    return {};
  }
}

function formatDependencies(title, dependencies = {}) {
  const entries = Object.entries(dependencies);

  if (entries.length === 0) {
    return `### ${title}\n\n_No registradas._`;
  }

  const rows = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `| \`${name}\` | \`${version}\` |`)
    .join('\n');

  return `### ${title}\n\n| Paquete | Versión |\n|---|---|\n${rows}`;
}

function getReportFiles() {
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs
    .readdirSync(reportsDir)
    .filter((file) => /^report_\d+\.md$/i.test(file))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

function extractBlock(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'mi');
  const match = markdown.match(pattern);
  return stripMarkdownNoise(match?.[1] || '');
}

function parseReport(fileName) {
  const markdown = readFile(path.join('reports', fileName));
  const number = fileName.match(/report_(\d+)\.md/i)?.[1] || '???';
  const date = markdown.match(/\*\*Fecha:\*\*\s*(.+)/)?.[1]?.trim() || 'sin fecha';
  const type = markdown.match(/\*\*Tipo:\*\*\s*(.+)/)?.[1]?.trim() || 'sin tipo';
  const filesBlock = extractBlock(markdown, 'Archivos modificados');
  const summary = takeParagraphs(extractBlock(markdown, 'Resumen'), 1) || 'Sin resumen disponible.';
  const pendingBlock = extractBlock(markdown, 'Pendiente para Claude');
  const modifiedFiles = filesBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim());
  const pendingItems = pendingBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter((line) => !/sin pendientes/i.test(line));

  return {
    number,
    date,
    type,
    modifiedFiles,
    summary,
    pendingItems,
    status: pendingItems.length > 0 ? 'pendiente' : 'completado',
  };
}

function formatReportTable(title, reports) {
  if (reports.length === 0) {
    return `### ${title}\n\n_No hay reportes en esta categoría._`;
  }

  const rows = reports
    .map((report) => {
      const files = report.modifiedFiles.length > 0
        ? report.modifiedFiles.map((file) => file.replace(/\|/g, '\\|')).join('<br>')
        : 'Sin archivos registrados';
      return `| ${report.number} | ${report.date} | ${report.type} | ${files} | ${report.summary.replace(/\n/g, ' ').replace(/\|/g, '\\|')} |`;
    })
    .join('\n');

  return `### ${title}\n\n| Reporte | Fecha | Tipo | Archivos modificados | Resumen |\n|---|---|---|---|---|\n${rows}`;
}

function extractModuleStatus(workflowMd) {
  const statusSection = extractSection(workflowMd, 'Estado actual del proyecto (snapshot)');
  const tableLines = statusSection
    .split('\n')
    .filter((line) => line.trim().startsWith('|'));

  return tableLines.length > 0
    ? tableLines.join('\n')
    : '_No se encontró tabla de estado en docs/WORKFLOW.md._';
}

function extractKeyPhrases(workflowMd) {
  const section = extractSection(workflowMd, 'Frases clave activas (operación)');
  const phrases = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- **'));

  return phrases.length > 0 ? phrases.join('\n') : '_No se encontraron frases clave activas._';
}

function getGitFilesTree() {
  const files = run('git ls-files', '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (files.length === 0) {
    return '_No se pudo leer `git ls-files`._';
  }

  return ['```text', ...files, '```'].join('\n');
}

function getRecentCommits() {
  const commits = run('git log --oneline -10', '');

  if (!commits) {
    return '_No se pudo leer el historial de commits._';
  }

  return ['```text', commits, '```'].join('\n');
}

function getEnvVariables() {
  const envText = readFile('.env', '');
  const presentKeys = new Set(
    envText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0].trim()),
  );

  return REQUIRED_ENV_VARS
    .map((key) => `- \`${key}\`${presentKeys.has(key) ? ' — presente en .env local' : ' — requerido'}`)
    .join('\n');
}

function getPendingSummary(reports) {
  const items = reports.flatMap((report) =>
    report.pendingItems.map((item) => `- Report ${report.number}: ${item}`),
  );

  if (items.length === 0) {
    return '- Sin pendientes explícitos en las secciones "Pendiente para Claude" de los reportes.';
  }

  return [...new Set(items)].join('\n');
}

function buildContext() {
  const agentsMd = readFile('AGENTS.md');
  const scrapersMd = readFile(path.join('docs', 'SCRAPERS.md'));
  const workflowMd = readFile(path.join('docs', 'WORKFLOW.md'));
  const packageJson = parsePackageJson();
  const reports = getReportFiles().map(parseReport);
  const completedReports = reports.filter((report) => report.status === 'completado');
  const pendingReports = reports.filter((report) => report.status === 'pendiente');
  const latestReport = reports.at(-1);

  const projectSummary = [
    takeParagraphs(agentsMd.split('---')[0], 3),
    '### Resumen de scrapers',
    takeParagraphs(scrapersMd, 2),
  ]
    .filter(Boolean)
    .join('\n\n');

  return `# CONTEXT.md — Migración de chat DVPotro

Este archivo fue generado automáticamente por \`scripts/generate-context.js\` para que un agente nuevo pueda retomar DVPotro sin reconstruir el contexto desde cero.

> Última generación: ${new Date().toISOString()}

## 1. Descripción del proyecto

${projectSummary}

## 2. Stack tecnológico completo

**Proyecto:** \`${packageJson.name || 'dvpotro'}\`  
**Versión:** \`${packageJson.version || 'sin versión'}\`  
**Entry Electron:** \`${packageJson.main || 'electron/main.js'}\`

${formatDependencies('Dependencias runtime', packageJson.dependencies)}

${formatDependencies('Dependencias de desarrollo', packageJson.devDependencies)}

## 3. Estado actual del proyecto desde reportes

Reportes leídos: **${reports.length}**  
Último reporte: **${latestReport ? `Report ${latestReport.number} (${latestReport.date}, ${latestReport.type})` : 'no disponible'}**

${formatReportTable('Completado ✅', completedReports)}

${formatReportTable('Pendiente ⚠️', pendingReports)}

## 4. Módulos y su estado

${extractModuleStatus(workflowMd)}

## 5. Bugs conocidos y pendientes

### Pendientes extraídos de reportes

${getPendingSummary(reports)}

### Último reporte

${latestReport ? `- Report ${latestReport.number}: ${latestReport.summary}` : '- No hay reportes.'}

## 6. Frases clave activas

${extractKeyPhrases(workflowMd)}

## 7. Estructura de carpetas y archivos principales

Equivalente a \`git ls-files | head -100\`:

${getGitFilesTree()}

## 8. Últimos 10 commits

${getRecentCommits()}

## 9. Variables de entorno requeridas

No se incluyen valores secretos. Solo nombres:

${getEnvVariables()}

## 10. Cómo continuar

### Ruta rápida para el nuevo agente

1. Leer primero \`AGENTS.md\`, luego \`docs/WORKFLOW.md\`, luego este \`CONTEXT.md\`.
2. Revisar el último reporte en \`reports/\` para entender el diff y la verificación más recientes.
3. Ejecutar \`git status --short\` antes de tocar archivos.
4. Verificar compilación con:

\`\`\`bash
npm run build
\`\`\`

5. Para cambios que toquen scrapers, ejecutar el comando de verificación real del módulo afectado y pegar el output en \`generate-report.js\`.
6. Antes de generar reporte, actualizar en \`generate-report.js\`:
   - \`VERIFICATION.buildStatus\`
   - \`VERIFICATION.testsRun\`
   - \`VERIFICATION.verificationCmd\`
   - \`VERIFICATION.verificationOutput\`
7. Ejecutar:

\`\`\`bash
node generate-report.js
\`\`\`

8. Solo después de revisión/verificación, hacer commit convencional.

### Qué estaba en progreso al migrar

- Último trabajo registrado: ${latestReport ? `Report ${latestReport.number} — ${latestReport.summary}` : 'sin reporte reciente'}.
- Si el usuario pide continuar calificaciones: revisar \`electron/handlers/cia.js\`, \`src/components/GradeCard.jsx\` y \`src/pages/Calificaciones.jsx\`.
- Si el usuario pide continuar temas/color picker: revisar \`src/components/ColorPicker.jsx\`, \`src/ThemeContext.jsx\`, \`src/themes.js\` y \`src/pages/Ajustes.jsx\`.

### Workflow Claude + Codex

- Claude diseña alcance, riesgos y criterios.
- Codex implementa, verifica con datos reales, actualiza \`generate-report.js\`, genera reporte y commitea.
- Usuario pasa el reporte a Claude.
- Claude revisa y define la siguiente iteración.

### Reglas que NO se deben romper

- No commitear \`.env\`, \`.local-data/\`, \`release/\` ni \`src/design-backups/\`.
- No declarar funcionalidad sin evidencia ejecutada.
- Usar commits convencionales sin \`Co-Authored-By\` ni atribución de IA.
- Mantener reportes como fuente de verdad para migraciones entre chats.
`;
}

function main() {
  const context = buildContext();
  fs.writeFileSync(contextPath, context, 'utf8');
  console.log('✅ CONTEXT.md generado — listo para migrar al nuevo chat');
}

main();
