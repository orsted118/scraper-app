const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const blocked = ['image', 'media', 'font', 'stylesheet'];
    blocked.includes(route.request().resourceType()) ? route.abort() : route.continue();
  });

  // Usa el mismo flujo de login que horario.js
  const { scrapeHorario } = require('../electron/handlers/horario');

  // Intercepta la tabla antes de parsearla
  // Navega manualmente con el mismo flujo del scraper
  await page.goto('https://apps9.itson.edu.mx/CIA/index.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForTimeout(2000);

  // Login
  const allFrames = page.frames();
  let loginFrame =
    allFrames.find((f) => f.name() === 'TargetContent') ||
    allFrames.find((f) => f.url().includes('CIA')) ||
    page.mainFrame();

  const user = process.env.CIA_USER || '';
  const pass = process.env.CIA_PASS || '';

  // Intenta múltiples selectores de login
  const userSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
  const passSelectors = ['#pwd', 'input[name="pwd"]', 'input[type="password"]'];
  const submitSelectors = ['#Submit_btn', 'input[type="submit"]', 'button[type="submit"]'];

  for (const sel of userSelectors) {
    try {
      await loginFrame.fill(sel, user);
      break;
    } catch (e) {}
  }
  for (const sel of passSelectors) {
    try {
      await loginFrame.fill(sel, pass);
      break;
    } catch (e) {}
  }
  for (const sel of submitSelectors) {
    try {
      await loginFrame.click(sel);
      break;
    } catch (e) {}
  }

  await page.waitForTimeout(5000);
  console.log('URL post-login:', page.url());

  // Navega al horario usando los mismos clicks que horario.js
  // Busca link de horario en todos los frames
  let horarioClicked = false;
  for (const frame of page.frames()) {
    if (horarioClicked) break;
    try {
      const clicked = await frame.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(
          (l) =>
            /mi horario/i.test(l.textContent) ||
            /horario de clases/i.test(l.textContent) ||
            /SSR_SSENRL_LIST/i.test(l.href),
        );
        if (link) {
          link.click();
          return true;
        }
        return false;
      });
      if (clicked) {
        horarioClicked = true;
        console.log('Click en horario desde frame:', frame.url());
      }
    } catch (e) {}
  }

  await page.waitForTimeout(4000);

  // Activa Vista Semanal
  for (const frame of page.frames()) {
    try {
      await frame.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const semanal = inputs.find(
          (i) => /semanal/i.test(i.value) || /semanal/i.test(i.nextSibling?.textContent || ''),
        );
        if (semanal) semanal.click();
      });
    } catch (e) {}
  }

  await page.waitForTimeout(3000);

  // Guarda HTML de cada frame con contenido
  let savedCount = 0;
  for (const frame of page.frames()) {
    try {
      const html = await frame.content();
      if (html.length > 2000) {
        const safeName = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const fname = `scripts/debug-frame-${savedCount}-${safeName}.html`;
        fs.writeFileSync(fname, html);
        console.log('Guardado:', fname, '| tamaño:', html.length, 'chars');
        savedCount++;
      }
    } catch (e) {}
  }

  // Busca específicamente la tabla del horario y guárdala
  for (const frame of page.frames()) {
    try {
      const tablaHtml = await frame.evaluate(() => {
        // Busca tabla con contenido de horario
        const tables = Array.from(document.querySelectorAll('table'));
        const horarioTable = tables.find((t) => {
          const text = t.innerText || '';
          return /lunes|martes|mi[eé]rcoles|jueves|viernes/i.test(text) && /AM|PM|\d+:\d+/.test(text);
        });
        if (!horarioTable) return null;

        // También extrae los datos raw de cada celda
        const cells = Array.from(horarioTable.querySelectorAll('td')).map((td) => ({
          rowspan: td.getAttribute('rowspan') || '1',
          colspan: td.getAttribute('colspan') || '1',
          id: td.id || '',
          className: td.className || '',
          text: (td.innerText || '').trim().substring(0, 200),
          childCount: td.children.length,
        }));

        return {
          tableHtml: horarioTable.outerHTML,
          cellData: cells,
        };
      });

      if (tablaHtml) {
        fs.writeFileSync('scripts/tabla-horario.html', tablaHtml.tableHtml);
        fs.writeFileSync('scripts/tabla-celdas.json', JSON.stringify(tablaHtml.cellData, null, 2));
        console.log('✅ Tabla del horario guardada en scripts/tabla-horario.html');
        console.log('✅ Datos de celdas en scripts/tabla-celdas.json');
        console.log('Primeras 5 celdas:');
        tablaHtml.cellData.slice(0, 10).forEach((c, i) =>
          console.log(`  Celda ${i}: rowspan=${c.rowspan} | "${c.text.substring(0, 80)}"`),
        );
      }
    } catch (e) {}
  }

  await browser.close();
  console.log('Done.');
})();
