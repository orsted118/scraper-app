const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const contextPath = path.join(rootDir, 'CONTEXT.md');
const reportsDir = path.join(rootDir, 'reports');

const REQUIRED_ENV_VARS = [
  'IVIRTUAL_USER',
  'IVIRTUAL_PASS',
  'CIA_USER',
  'CIA_PASS',
  'NOTIF_MINUTES_BEFORE',
  'STUDENT_NAME',
];

const FIXED_PENDING_TASKS = [
  'Header duplicado en módulo Calendario (pre-existente desde 066)',
  'Tarea 071: StackedEventCards con clasificador por palabras clave (reemplazar picsum por tarjetas dinámicas de calendarData.events)',
  'Investigar portales ITSON adicionales para notificaciones personalizadas (biblioteca, pagos, servicios escolares, correo, bolsa de trabajo)',
  'Página de Notificaciones (nav item existe, sin página propia)',
  'Empaquetado Windows NSIS definitivo',
];

const MODULES_TO_INCLUDE_ALWAYS = [
  {
    module: 'Actividades iVirtual',
    status: '✅',
    note: 'Scraper principal, cards/tabla/kanban y sincronización ya forman parte del flujo diario.',
  },
  {
    module: 'Horario CIA',
    status: '⚠️',
    note: 'El módulo existe y funciona, pero sigue siendo sensible a cambios del portal y a las vistas derivadas.',
  },
  {
    module: 'Calificaciones CIA',
    status: '⚠️',
    note: 'La vista y el scraper existen; conviene seguir vigilando parsers y representación visual.',
  },
  {
    module: 'Calendario Escolar ITSON',
    status: '⚠️',
    note: 'Módulo incorporado; el historial reciente muestra hardening pendiente y widgets visuales en evolución.',
  },
  {
    module: 'Ajustes / credenciales',
    status: '✅',
    note: 'Gestión de credenciales y configuración persistida desde UI.',
  },
  {
    module: 'Sidebar + Sincronizar todo',
    status: '✅',
    note: 'Navegación lateral, sync global y estado visual ya están integrados.',
  },
  {
    module: 'Modos de vista (Actividades)',
    status: '✅',
    note: 'Cards / compact / table / kanban ya están implementados.',
  },
  {
    module: 'Widget StackedPhotos (Calendario)',
    status: '⚠️',
    note: 'Existe como placeholder; la tarea siguiente es reemplazarlo por tarjetas dinámicas reales.',
  },
  {
    module: 'Notificaciones de clases',
    status: '⚠️',
    note: 'El scheduler base está presente; falta expandir cobertura a otros portales y flujos.',
  },
];

function readText(relativePath, fallback = '') {
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
      maxBuffer: 50 * 1024 * 1024,
    }).trim();
  } catch (_error) {
    return fallback;
  }
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripWhitespace(value = '') {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeInline(value = '') {
  return stripWhitespace(value).replace(/\s+/g, ' ').trim();
}

function extractSection(markdown, heading) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const headingPattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, 'i');
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex === -1) {
    return '';
  }

  const collected = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line.trim())) {
      break;
    }
    collected.push(line);
  }

  return stripWhitespace(collected.join('\n'));
}

function firstParagraph(value = '') {
  const paragraphs = stripWhitespace(value)
    .split(/\n{2,}/)
    .map((item) => normalizeInline(item))
    .filter(Boolean);

  return paragraphs[0] || '';
}

function firstLines(value = '', count = 2) {
  return stripWhitespace(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(' ');
}

function extractBullets(value = '') {
  return stripWhitespace(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*+]\s+(?:\[[ xX]\]\s+)?/, '').trim())
    .filter((line) => line && line !== '---' && !/^sin pendientes/i.test(line) && !/^no hay pendientes/i.test(line));
}

function extractReportSummary(content) {
  const raw = extractSection(content, 'Resumen');

  if (!raw) {
    return 'Sin resumen';
  }

  const boilerplate = [
    /se registraron \d+ archivo/i,
    /el diff completo se incluye/i,
    /se generó la estructura base/i,
    /archivo creado como parte/i,
    /archivo actualizado en esta/i,
    /^```/i,
  ];

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s+/.test(line));

  const usefulLine = lines.find((line) => !boilerplate.some((re) => re.test(line)));

  if (!usefulLine) {
    return 'Sin resumen';
  }

  if (usefulLine.length <= 120) {
    return usefulLine;
  }

  return usefulLine.slice(0, 120).replace(/\s+\S*$/, '').trim() || usefulLine.slice(0, 120).trim();
}

function extractKeyFiles(content, maxFiles = 3) {
  const section = extractSection(content, 'Archivos modificados');

  if (!section) {
    return '';
  }

  const files = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('`'))
    .map((line) => {
      const match = line.match(/`([^`]+)`/);
      return match ? match[1] : line.replace(/^[-*]\s*/, '').trim();
    })
    .filter((file) =>
      file &&
      !file.includes('generate-report') &&
      !file.includes('package-lock') &&
      !file.includes('reports/report_') &&
      !file.includes('CONTEXT.md') &&
      !/^\s*N\/A\s*$/i.test(file),
    );

  return dedupe(files).slice(0, maxFiles).join(', ');
}

function extractPendingItems(content) {
  const pending = extractSection(content, 'Pendiente para Claude');

  if (!pending) {
    return [];
  }

  return extractBullets(pending)
    .filter((line) => !/^sin pendientes/i.test(line))
    .filter((line) => !/^no se encontraron/i.test(line));
}

function dedupe(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function sanitizeCell(value = '') {
  return normalizeInline(value).replace(/\|/g, '\\|');
}

function formatKeyValueTable(entries, headers) {
  if (entries.length === 0) {
    return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n| _Sin datos_ |`;
  }

  const rows = entries.map((entry) => `| ${headers.map((header) => sanitizeCell(entry[header] ?? '')).join(' | ')} |`);
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.join('\n')}`;
}

function getReportFiles() {
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs
    .readdirSync(reportsDir)
    .filter((file) => /^report_\d+\.md$/i.test(file))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));
}

function parseReport(fileName) {
  const markdown = readText(path.join('reports', fileName));
  const number = Number(fileName.match(/report_(\d+)\.md/i)?.[1] || 0);
  const date = markdown.match(/\*\*Fecha:\*\*\s*(.+)/)?.[1]?.trim() || 'sin fecha';
  const type = markdown.match(/\*\*Tipo:\*\*\s*(.+)/)?.[1]?.trim() || 'sin tipo';
  const summary = extractReportSummary(markdown);
  const keyFiles = extractKeyFiles(markdown);
  const pendingItems = extractPendingItems(markdown);
  const keyLearnings = extractBullets(extractSection(markdown, 'Key Learnings'))
    .concat(extractBullets(extractSection(markdown, 'Aprendizajes Clave')));

  return {
    number,
    numberLabel: `Report ${String(number).padStart(3, '0')}`,
    date,
    type,
    keyFiles,
    summary,
    pendingItems,
    keyLearnings,
    fileName,
  };
}

function formatHistoricalReportsTable(reports) {
  if (reports.length === 0) {
    return '_No se encontraron reportes en `reports/`._';
  }

  const rows = reports.map((report) => `| ${String(report.number).padStart(3, '0')} | ${sanitizeCell(report.date)} | ${sanitizeCell(report.summary)} |`);

  return [
    '| # | Fecha | Qué se hizo |',
    '|---|---|---|',
    ...rows,
  ].join('\n');
}

function formatRecentReportsTable(reports) {
  if (reports.length === 0) {
    return '_No hay reportes recientes para detallar._';
  }

  const rows = reports.map((report) => {
    const files = report.keyFiles || 'Sin archivos clave';
    return `| ${String(report.number).padStart(3, '0')} | ${sanitizeCell(report.date)} | ${sanitizeCell(files)} | ${sanitizeCell(report.summary)} |`;
  });

  return [
    '| # | Fecha | Archivos clave | Qué se hizo |',
    '|---|---|---|---|',
    ...rows,
  ].join('\n');
}

function formatRecentPendingItems(reports, recentCount = 10) {
  const recent = reports.slice(-recentCount);
  const items = [];

  for (const report of recent) {
    for (const item of report.pendingItems) {
      items.push(`- ${report.numberLabel}: ${item}`);
    }
  }

  const unique = dedupe(items);

  if (unique.length === 0) {
    return '- No se detectaron pendientes explícitos en los últimos 10 reportes.';
  }

  return unique.join('\n');
}

function buildSection3(reports) {
  const historical = reports.filter((report) => report.number < 60);
  const recent = reports.filter((report) => report.number >= 60);

  let historicalTable = formatHistoricalReportsTable(historical);
  const recentTable = formatRecentReportsTable(recent);
  const pendingItems = formatRecentPendingItems(reports);

  const assemble = (historyBlock) => [
    '## 3. Estado actual — historial de reportes',
    '',
    `**Reportes procesados:** ${reports.length}  `,
    `**Último reporte:** ${reports.at(-1) ? `${reports.at(-1).numberLabel} — ${reports.at(-1).date} — ${reports.at(-1).type}` : 'sin reportes'}`,
    '',
    '### ✅ Completados',
    '',
    '#### Historial compacto (reportes 001–059)',
    '',
    historyBlock,
    '',
    '#### Reportes recientes (060–070)',
    '',
    recentTable,
    '',
    '### ⚠️ Pendientes para Claude',
    '',
    pendingItems,
  ].join('\n');

  let section = assemble(historicalTable);

  if (Buffer.byteLength(section, 'utf8') > 8000 && historical.length > 30) {
    const truncatedHistorical = historical.filter((report) => report.number >= 30 && report.number < 60);
    const note = '> *Reportes 001–029 omitidos por límite de tamaño. Ver `reports/` para historial completo.*';
    historicalTable = `${note}\n\n${formatHistoricalReportsTable(truncatedHistorical)}`;
    section = assemble(historicalTable);
  }

  return section;
}

function formatKeyLearningsOpenIssues(reports) {
  const recent = reports.slice(-10);
  const items = recent.flatMap((report) =>
    report.keyLearnings
      .filter((item) => /pendiente|problema|error|fall[aá]|bug|open|falta|bloque/i.test(item))
      .map((item) => `- ${report.numberLabel}: ${item}`),
  );

  if (items.length === 0) {
    return '- No se detectaron aprendizajes abiertos o problemas explícitos en los últimos 10 reportes.';
  }

  return dedupe(items).join('\n');
}

function scanTodoFixme() {
  const output = run(
    'rg -n "\\b(TODO|FIXME)\\b" src electron scripts docs -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/reports/**"',
    '',
  );

  if (!output) {
    return '- No se encontraron comentarios TODO/FIXME relevantes en código, scripts o docs.';
  }

  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\/\/|\/\*|<!--|#/.test(line));

  return lines.length > 0
    ? lines.map((line) => `- ${line}`).join('\n')
    : '- No se encontraron comentarios TODO/FIXME relevantes en código, scripts o docs.';
}

function getWorkflowPhrases(workflowMd) {
  const section = extractSection(workflowMd, 'Frases clave activas (operación)');
  const bullets = extractBullets(section);

  if (bullets.length === 0) {
    return '- No se encontraron frases clave activas.';
  }

  return bullets.map((item) => `- ${item}`).join('\n');
}

function extractAgentsModuleTable(agentsMd) {
  const section = extractSection(agentsMd, 'Estado rápido de módulos');
  const tableLines = section
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => /^\|/.test(line));

  if (tableLines.length > 0) {
    return tableLines.join('\n');
  }

  return '_No se encontró la tabla de estado de módulos en AGENTS.md._';
}

function formatAlwaysIncludedModules() {
  const rows = MODULES_TO_INCLUDE_ALWAYS.map((entry) => `| ${sanitizeCell(entry.module)} | ${entry.status} | ${sanitizeCell(entry.note)} |`);
  return [
    '| Módulo | Estado | Nota |',
    '|---|---|---|',
    ...rows,
  ].join('\n');
}

function getGitFilesList() {
  const raw = run('git ls-files', '');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !/(?:^|\/)node_modules(?:\/|$)/i.test(file))
    .filter((file) => !/\.(png|ico|icns)$/i.test(file))
    .filter((file) => !/report_/i.test(file))
    .slice(0, 80);
}

function buildFileTree(files) {
  const root = { files: [], dirs: new Map() };

  for (const file of files) {
    const parts = file.split('/').filter(Boolean);
    let node = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      if (isLast) {
        node.files.push(part);
        return;
      }

      if (!node.dirs.has(part)) {
        node.dirs.set(part, { files: [], dirs: new Map() });
      }

      node = node.dirs.get(part);
    });
  }

  return root;
}

function renderFileTree(node, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];

  for (const file of node.files.slice().sort((a, b) => a.localeCompare(b))) {
    lines.push(`${pad}- ${file}`);
  }

  for (const [dirName, child] of [...node.dirs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${pad}- ${dirName}/`);
    lines.push(...renderFileTree(child, indent + 1));
  }

  return lines;
}

function getRecentCommits() {
  const commits = run('git log --oneline -10', '');

  if (!commits) {
    return '_No se pudo leer el historial de commits._';
  }

  const lines = commits
    .split('\n')
    .map((line, index) => (index === 0 ? `${line} ← estado actual` : line));

  return ['```text', ...lines, '```'].join('\n');
}

function getEnvSection() {
  return [
    '| Variable | Uso |',
    '|---|---|',
    '| `IVIRTUAL_USER` | Usuario de iVirtual |',
    '| `IVIRTUAL_PASS` | Contraseña de iVirtual |',
    '| `CIA_USER` | Usuario de CIA |',
    '| `CIA_PASS` | Contraseña de CIA |',
    '| `NOTIF_MINUTES_BEFORE` | Minutos de anticipación para notificaciones |',
    '| `STUDENT_NAME` | Nombre visible del alumno en la UI |',
    '',
    '- Dev: raíz del repo (`.env` en `C:\\Users\\kneko\\OneDrive\\Documentos\\scraper-app`)',
    '- Prod: `app.getPath(\'userData\')/.env`',
  ].join('\n');
}

function buildProjectDescription(agentsMd, readmeMd) {
  const readmeIntro = firstParagraph(readmeMd.replace(/^#.*(?:\r?\n)+/, ''))
    || firstParagraph(readmeMd);
  const stackSummary = [
    'Electron (shell de escritorio)',
    'React + Vite (renderer)',
    'Tailwind CSS v3',
    'Playwright',
    'dotenv',
    'electron-builder',
    'electron-updater',
  ].join(', ');

  const projectWhat = [
    '- App de escritorio Electron + React para estudiantes ITSON.',
    '- Unifica iVirtual y CIA para revisar actividades, horario, calificaciones, adjuntos y enlaces de videollamada.',
    '- Reduce el salto manual entre portales y la consolidación manual de información académica.',
  ];

  return [
    `**Nombre oficial:** DVPotro (antes ScraperApp)`,
    `**Qué hace y para quién:**`,
    ...projectWhat,
    `**Resumen del stack:** ${stackSummary}.`,
    '',
    `**Lectura rápida desde README.md:** ${readmeIntro || 'No se pudo extraer el resumen del README.'}`,
  ].join('\n\n');
}

function buildContext() {
  const agentsMd = readText('AGENTS.md');
  const readmeMd = readText('README.md');
  const workflowMd = readText(path.join('docs', 'WORKFLOW.md'));
  const packageJson = JSON.parse(readText('package.json', '{}') || '{}');
  const reports = getReportFiles().map(parseReport);
  const latestReport = reports.at(-1);

  const dependencyEntries = Object.entries(packageJson.dependencies || {});
  const devDependencyEntries = Object.entries(packageJson.devDependencies || {});
  const scriptEntries = Object.entries(packageJson.scripts || {});
  const fileTree = renderFileTree(buildFileTree(getGitFilesList())).join('\n');
  const section3 = buildSection3(reports);
  const codeIssues = scanTodoFixme();
  const keyLearningsOpenIssues = formatKeyLearningsOpenIssues(reports);

  const dependencyTable = dependencyEntries.length > 0
    ? formatKeyValueTable(
      dependencyEntries.map(([name, version]) => ({ Paquete: `\`${name}\``, Versión: `\`${version}\`` })),
      ['Paquete', 'Versión'],
    )
    : '_No registradas._';

  const devDependencyTable = devDependencyEntries.length > 0
    ? formatKeyValueTable(
      devDependencyEntries.map(([name, version]) => ({ Paquete: `\`${name}\``, Versión: `\`${version}\`` })),
      ['Paquete', 'Versión'],
    )
    : '_No registradas._';

  const scriptsTable = scriptEntries.length > 0
    ? formatKeyValueTable(
      scriptEntries.map(([name, command]) => ({ Script: `\`${name}\``, Comando: `\`${command}\`` })),
      ['Script', 'Comando'],
    )
    : '_No hay scripts definidos._';

  return `# CONTEXT.md — DVPotro

> Archivo de contexto para migrar el proyecto sin perder decisiones, estado ni pendientes.
>
> Generado automáticamente por \`scripts/generate-context.js\`.

## 1. Descripción del proyecto

${buildProjectDescription(agentsMd, readmeMd)}

## 2. Stack tecnológico completo

**Nombre:** \`${packageJson.name || 'dvpotro'}\`  
**Versión:** \`${packageJson.version || 'sin versión'}\`  
**Descripción:** ${packageJson.description || 'sin descripción'}  
**Entry principal:** \`${packageJson.main || 'electron/main.js'}\`

### Dependencias principales

${dependencyTable}

### Dependencias de desarrollo

${devDependencyTable}

### Scripts disponibles

${scriptsTable}

${section3}

## 4. Módulos y su estado actual

### Tabla base extraída de AGENTS.md

${extractAgentsModuleTable(agentsMd)}

### Módulos que siempre deben estar en el mapa de contexto

${formatAlwaysIncludedModules()}

## 5. Bugs conocidos y tareas pendientes activas

### Estado activo desde los últimos 10 reportes

${formatRecentPendingItems(reports)}

### Problemas abiertos detectados en Key Learnings

${keyLearningsOpenIssues}

### Tareas pendientes confirmadas

${FIXED_PENDING_TASKS.map((item) => `- ${item}`).join('\n')}

### Comentarios TODO/FIXME

${codeIssues}

## 6. Commits recientes

${getRecentCommits()}

## 7. Estructura de archivos principales

Salida equivalente a \`git ls-files | grep -v "node_modules\\|\\.png\\|\\.ico\\|\\.icns\\|report_" | head -80\` agrupada por carpeta:

${fileTree || '_No se pudieron leer archivos rastreados._'}

## 8. Variables de entorno requeridas

${getEnvSection()}

## 9. Workflow del equipo

\`\`\`text
WORKFLOW:
Claude (arquitectura + prompts) →
Codex (implementación + reportes) →
David (relay de reportes a Claude para revisión)

FORMATO DE PROMPTS A CODEX:
- Secciones numeradas con rutas exactas de archivos
- Instrucciones atómicas sin ambigüedad
- Comandos de verificación con output esperado
- Siempre terminar con: NO hacer commit todavía

REGLAS OPERATIVAS:
- waitUntil: 'domcontentloaded' siempre en scrapers
- gotoWithRetry en toda navegación Playwright
- npm run build antes de cualquier commit
- node generate-report.js después de cada tarea
\`\`\`

## 10. Cómo continuar desde aquí

### Para retomar el proyecto

1. Leer este \`CONTEXT.md\` completo.
2. Verificar que el build funciona: \`npm run build\`.
3. Revisar el último reporte en \`reports/\` para saber exactamente en qué punto quedó Codex.
4. El working tree debe estar limpio: \`git status\`.
5. Último commit verificado: \`f296629\`.
6. Próxima tarea sugerida: \`Tarea 071 StackedEventCards\`.

### Frase de reactivación del módulo de calificaciones CIA

\`\`\`
Claude, retomamos el módulo de calificaciones CIA —
el bloqueo ya se quitó.
\`\`\`

### Cuenta de prueba ITSON

\`00000279009\`

### Recordatorio operativo

- Leer reportes antes de asumir estado.
- Confirmar build antes de reportar como funcional.
- Actualizar \`generate-report.js\` con la verificación real antes de generar un reporte.
- No hacer commit todavía: primero revisar el contexto y el reporte más reciente.
`;
}

function main() {
  try {
    const context = buildContext();
    fs.writeFileSync(contextPath, context, 'utf8');

    const timestamp = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date());

    console.log('✅ CONTEXT.md generado — listo para migrar al nuevo chat');
    console.log(`📄 Reportes procesados: ${getReportFiles().length}`);
    console.log(`🕐 Generado: ${timestamp}`);
  } catch (error) {
    console.error('❌ No se pudo generar CONTEXT.md');
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  }
}

main();
