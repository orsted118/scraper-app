const { ipcMain, session } = require('electron');
const { chromium } = require('playwright');

const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';

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
  await page.goto(indexUrl, { waitUntil: 'networkidle' });

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
  await page.goto(assignment.url, { waitUntil: 'networkidle' });

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

async function scrapeIVirtualActivities() {
  const username = process.env.IVIRTUAL_USER;
  const password = process.env.IVIRTUAL_PASS;

  if (!username || !password) {
    return { error: 'Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.' };
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    await loginToIVirtual(page, username, password);
    await syncCookiesToElectronSession(context);

    const courses = await collectCourses(page);

    if (courses.length === 0) {
      return { error: 'No se encontraron cursos visibles en el dashboard de iVirtual.' };
    }

    const assignments = [];

    for (const course of courses) {
      const courseAssignments = await collectAssignmentsFromCourse(page, course);
      assignments.push(...courseAssignments);
    }

    const detailPage = await context.newPage();
    detailPage.setDefaultTimeout(45000);
    const activities = [];

    for (let index = 0; index < assignments.length; index += 1) {
      const assignment = assignments[index];
      const details = await collectAssignmentDetails(detailPage, assignment);

      activities.push({
        id: `${index + 1}-${assignment.url.split('id=').pop()}`,
        archivos: details.archivos,
        estado: classifyAssignment(assignment),
        fechaLimite: assignment.dueDate || 'Sin fecha visible',
        instrucciones: details.instrucciones,
        materia: details.materia,
        nombre: assignment.title,
        rawGrade: assignment.grade,
        rawSubmission: assignment.submission,
        url: assignment.url,
      });
    }

    return { activities };
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

function registerScraperHandlers() {
  ipcMain.handle('scraper:run', async () => scrapeIVirtualActivities());
}

module.exports = {
  registerScraperHandlers,
  scrapeIVirtualActivities,
};
