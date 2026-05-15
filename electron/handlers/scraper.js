const fs = require('fs');
const path = require('path');
const { app, ipcMain, session } = require('electron');
const { chromium } = require('playwright');

const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

function mapSameSite(sameSite) {
  if (sameSite === 'Strict') {
    return 'strict';
  }

  if (sameSite === 'Lax') {
    return 'lax';
  }

  if (sameSite === 'None') {
    return 'no_restriction';
  }

  return 'unspecified';
}

function normalizeWhitespace(value) {
  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

async function processInChunks(items, chunkSize, asyncFn) {
  const results = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    const chunkResults = await Promise.all(chunk.map(asyncFn));
    results.push(...chunkResults);
  }

  return results;
}

function getActivitiesCachePath() {
  return path.join(app.getPath('userData'), 'actividades-cache.json');
}

function readActivitiesCache() {
  const cachePath = getActivitiesCachePath();

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

    if (
      !parsed ||
      typeof parsed.timestamp !== 'number' ||
      !Array.isArray(parsed.actividades)
    ) {
      return null;
    }

    return parsed;
  } catch (_error) {
    return null;
  }
}

function writeActivitiesCache(activities) {
  const cachePayload = {
    timestamp: Date.now(),
    actividades: activities,
  };

  fs.writeFileSync(
    getActivitiesCachePath(),
    JSON.stringify(cachePayload, null, 2),
    'utf8',
  );

  return cachePayload;
}

function clearActivitiesCache() {
  const cachePath = getActivitiesCachePath();

  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }

  return { success: true };
}

function parseDueDate(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value.replace(/\s+/g, ' ').trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function classifyAssignment({ dueDate, submission, grade }) {
  const lowerSubmission = (submission || '').toLowerCase();
  const normalizedGrade = (grade || '').trim();

  if (
    lowerSubmission.includes('submitted') ||
    lowerSubmission.includes('graded') ||
    (normalizedGrade && normalizedGrade !== '-' && normalizedGrade.toLowerCase() !== 'not graded')
  ) {
    return 'cerrada';
  }

  const parsedDueDate = parseDueDate(dueDate);

  if (parsedDueDate && parsedDueDate.getTime() < Date.now()) {
    return 'retrasada';
  }

  return 'pendiente';
}

async function loginToIVirtual(page, username, password) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
  ]);

  if (page.url().includes('/login/index.php')) {
    const errorText = await page.locator('#loginerrormessage').textContent().catch(() => '');
    throw new Error(errorText?.trim() || 'No fue posible iniciar sesión en iVirtual.');
  }
}

async function collectCourses(page) {
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });

  const courses = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
    const seen = new Set();
    const items = [];

    links.forEach((link) => {
      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
      const href = link.href;

      if (!name || !href) {
        return;
      }

      const match = href.match(/id=(\d+)/);

      if (!match) {
        return;
      }

      const id = match[1];

      if (seen.has(id)) {
        return;
      }

      seen.add(id);
      items.push({ id, name, url: href });
    });

    return items;
  });

  return courses;
}

async function collectAssignmentsFromCourse(page, course) {
  const indexUrl = `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=${course.id}`;
  await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

  return page.evaluate((courseName) => {
    const tableRows = Array.from(document.querySelectorAll('table.generaltable tbody tr'));
    let currentWeek = '';

    return tableRows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
          (cell.textContent || '').trim().replace(/\s+/g, ' '),
        );
        const link = row.querySelector('a[href*="/mod/assign/view.php?id="]');

        if (!link) {
          return null;
        }

        let week = currentWeek;
        let title = '';
        let dueDate = '';
        let submission = '';
        let grade = '';

        if (cells.length >= 5) {
          [week, title, dueDate, submission, grade] = cells;
          currentWeek = week || currentWeek;
        } else if (cells.length === 4) {
          [title, dueDate, submission, grade] = cells;
        }

        return {
          courseName,
          dueDate,
          grade,
          title,
          submission,
          url: link.href,
          week,
        };
      })
      .filter(Boolean);
  }, course.name);
}

async function collectAssignmentDetails(page, assignment) {
  await page.goto(assignment.url, { waitUntil: 'domcontentloaded' });

  const details = await page.evaluate((courseName) => {
    const main = document.querySelector('#region-main') || document.body;
    const intro = document.querySelector('#intro');
    const introText = (intro?.textContent || '').replace(/\r/g, '');
    const attachments = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]'))
      .map((anchor) => ({
        name: (anchor.textContent || '').trim(),
        url: anchor.href,
      }))
      .filter(
        (file) =>
          file.name &&
          file.url &&
          file.url.includes('pluginfile.php') &&
          !file.url.includes('/user/') &&
          !file.url.includes('/theme/'),
      );

    const uniqueAttachments = attachments.filter(
      (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
    );

    return {
      archivos: uniqueAttachments,
      introText,
      materia: courseName,
    };
  }, assignment.courseName);
  let instructions = normalizeWhitespace(details.introText);

  if (details.archivos.length > 0 && instructions) {
    details.archivos.forEach((file) => {
      instructions = instructions.replace(file.name, '').trim();
    });
    instructions = normalizeWhitespace(instructions);
  }

  instructions = normalizeWhitespace(
    instructions.replace(
      /\b\d{1,2} [A-Za-z]+ \d{4}, \d{1,2}:\d{2} (?:AM|PM)\b/g,
      '',
    ),
  );

  return {
    archivos: details.archivos,
    instrucciones: instructions,
    materia: details.materia,
  };
}

async function syncCookiesToElectronSession(playwrightContext) {
  const cookies = await playwrightContext.cookies();

  await Promise.all(
    cookies.map((cookie) => {
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      const url = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path || '/'}`;
      const cookiePayload = {
        domain: cookie.domain,
        httpOnly: cookie.httpOnly,
        name: cookie.name,
        path: cookie.path,
        sameSite: mapSameSite(cookie.sameSite),
        secure: cookie.secure,
        url,
        value: cookie.value,
      };

      if (typeof cookie.expires === 'number' && cookie.expires > 0) {
        cookiePayload.expirationDate = cookie.expires;
      }

      return session.defaultSession.cookies.set(cookiePayload);
    }),
  );
}

async function scrapeIVirtualActivities(event) {
  const username = process.env.IVIRTUAL_USER;
  const password = process.env.IVIRTUAL_PASS;

  if (!username || !password) {
    return { error: 'Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.' };
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    context.setDefaultTimeout(PAGE_TIMEOUT_MS);
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    await loginToIVirtual(page, username, password);
    await syncCookiesToElectronSession(context);

    const courses = await collectCourses(page);

    if (courses.length === 0) {
      return { error: 'No se encontraron cursos visibles en el dashboard de iVirtual.' };
    }

    const activities = [];
    const detailPages = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const detailPage = await context.newPage();
        detailPage.setDefaultTimeout(PAGE_TIMEOUT_MS);
        return detailPage;
      }),
    );

    if (event?.sender?.send) {
      event.sender.send('scraper:progress', {
        current: 0,
        total: courses.length,
        curso: courses[0]?.name || '',
      });
    }

    for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
      const course = courses[courseIndex];
      const courseAssignments = await collectAssignmentsFromCourse(page, course);
      const courseActivities = await processInChunks(
        courseAssignments,
        3,
        async (assignment, indexInChunk) => {
          const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
          return {
            archivos: details.archivos,
            estado: classifyAssignment(assignment),
            fechaLimite: assignment.dueDate || 'Sin fecha visible',
            instrucciones: details.instrucciones,
            materia: details.materia,
            nombre: assignment.title,
            rawGrade: assignment.grade,
            rawSubmission: assignment.submission,
            url: assignment.url,
          };
        },
      );

      courseActivities.forEach((activity, indexWithinCourse) => {
        activities.push({
          id: `${activities.length + 1}-${course.id}-${indexWithinCourse + 1}`,
          ...activity,
        });
      });

      if (event?.sender?.send) {
        event.sender.send('scraper:progress', {
          current: courseIndex + 1,
          total: courses.length,
          curso: course.name,
        });
      }
    }

    const cachePayload = writeActivitiesCache(activities);
    return {
      activities,
      timestamp: cachePayload.timestamp,
      fromCache: false,
    };
  } catch (error) {
    return {
      error:
        error && error.message
          ? `Falló la extracción de iVirtual: ${error.message}`
          : 'Falló la extracción de iVirtual por un error no identificado.',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function getActivitiesWithCache(event) {
  const cached = readActivitiesCache();

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    return {
      activities: cached.actividades,
      timestamp: cached.timestamp,
      fromCache: true,
    };
  }

  return scrapeIVirtualActivities(event);
}

function registerScraperHandlers() {
  ipcMain.handle('scraper:run', async (event) => getActivitiesWithCache(event));
  ipcMain.handle('scraper:clear-cache', async () => clearActivitiesCache());
}

module.exports = {
  clearActivitiesCache,
  getActivitiesCachePath,
  getActivitiesWithCache,
  registerScraperHandlers,
  readActivitiesCache,
  scrapeIVirtualActivities,
  writeActivitiesCache,
};
