// Investigación del Portal de Sistemas ITSON (Correo Potros + Credencial Alumno).
// Script exploratorio — NO productivo. Correr: node scripts/investigate-portal-sistemas.cjs
// Credenciales desde .env (IVIRTUAL_USER / IVIRTUAL_PASS). El password jamás se loggea.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const LANDING_URL = 'https://apps9.itson.edu.mx/PortalSistemas';
const APP_URL = 'https://apps9.itson.edu.mx/PortalSistemas/PortalSistemas';
const SCRATCH_DIR = path.resolve(__dirname, '..', 'scratch');
const SETTLE_MS = 3500;

const report = { phases: {} };

function log(...args) {
  console.log(...args);
}

function normalize(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sniffImageFormat(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  if (buffer.length > 12 && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buffer.length > 6 && buffer.slice(0, 6).toString().startsWith('GIF8')) return 'gif';
  if (buffer.slice(0, 200).toString().toLowerCase().includes('<svg')) return 'svg';
  return 'unknown';
}

function imageDimensions(buffer, format) {
  try {
    if (format === 'png') {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (format === 'jpeg') {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const size = buffer.readUInt16BE(offset + 2);
        // SOF0-SOF15 (excepto DHT/DAC/RST) llevan dimensiones.
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + size;
      }
    }
  } catch (_error) {
    // Dimensiones no críticas.
  }
  return null;
}

async function settle(page, ms = SETTLE_MS) {
  await page.waitForTimeout(ms);
}

function cssPath(info) {
  if (info.id) return `#${info.id}`;
  const classes = (info.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return `${info.tag}${classes.length ? `.${classes.join('.')}` : ''}`;
}

async function dumpInteractive(page) {
  return page.evaluate(() => {
    const grab = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className : '',
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
      title: el.getAttribute('title') || '',
      href: el.getAttribute('href') || '',
      src: (el.getAttribute('src') || '').slice(0, 120),
      alt: el.getAttribute('alt') || '',
    });
    const clickables = [...document.querySelectorAll('a, button, [role="button"], [onclick], input[type="submit"], input[type="button"]')]
      .filter((el) => el.offsetParent !== null)
      .map(grab);
    const inputs = [...document.querySelectorAll('input, select')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      id: el.id || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      visible: el.offsetParent !== null,
    }));
    const images = [...document.querySelectorAll('img')].map((el) => ({
      ...grab(el),
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      srcKind: (el.src || '').startsWith('data:')
        ? 'data-url'
        : (el.src || '').startsWith('blob:')
          ? 'blob'
          : (el.src || '').startsWith('http')
            ? 'http'
            : 'other',
    }));
    return {
      url: window.location.href,
      title: document.title,
      bodyText: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 2500),
      clickables,
      inputs,
      images,
      frames: [...document.querySelectorAll('iframe, object, embed')].map((el) => ({
        tag: el.tagName.toLowerCase(),
        src: (el.getAttribute('src') || el.getAttribute('data') || '').slice(0, 200),
        id: el.id || '',
      })),
      canvases: document.querySelectorAll('canvas').length,
    };
  });
}

async function main() {
  const user = process.env.IVIRTUAL_USER?.trim();
  const pass = process.env.IVIRTUAL_PASS?.trim();

  if (!user || !pass) {
    console.error('Faltan IVIRTUAL_USER / IVIRTUAL_PASS en .env');
    process.exit(1);
  }

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  try {
    // ── FASE 1: landing + detección del form de login ────────────
    const t0 = Date.now();
    await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await settle(page);
    const landing = await dumpInteractive(page);
    report.phases.landing = {
      finalUrl: landing.url,
      title: landing.title,
      inputs: landing.inputs,
      clickables: landing.clickables.slice(0, 25),
      bodyTextSample: landing.bodyText.slice(0, 800),
    };
    log('\n== LANDING ==');
    log('URL final:', landing.url);
    log('Título:', landing.title);
    log('Inputs:', JSON.stringify(landing.inputs, null, 1));
    log('Clickables:', JSON.stringify(landing.clickables.slice(0, 20), null, 1));

    // ── FASE 2: login heurístico ─────────────────────────────────
    const passwordInput = landing.inputs.find((i) => i.type === 'password' && i.visible);
    const loginAttempt = { strategy: null, ok: false };

    if (passwordInput) {
      // Form directo user+pass en la misma vista.
      const userInput = landing.inputs.find(
        (i) => i.visible && i.type !== 'password' && ['text', 'email', ''].includes(i.type),
      );
      loginAttempt.strategy = `form directo — user: ${userInput ? cssPath(userInput) || userInput.name : 'NO DETECTADO'}, pass: ${cssPath(passwordInput) || passwordInput.name}`;

      if (userInput) {
        const userSel = userInput.id ? `#${userInput.id}` : `input[name="${userInput.name}"]`;
        const passSel = passwordInput.id ? `#${passwordInput.id}` : 'input[type="password"]';
        await page.fill(userSel, user);
        await page.fill(passSel, pass);
        await Promise.all([
          page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {}),
          page.keyboard.press('Enter'),
        ]);
        await settle(page);
        loginAttempt.ok = true;
      }
    } else {
      // Flujo tipo CIA: campo ITSONET primero → Continuar → user/pass.
      const itsonetField = landing.inputs.find((i) => /itsonet/i.test(i.id) || /itsonet/i.test(i.name));
      if (itsonetField) {
        loginAttempt.strategy = `flujo tipo CIA vía #${itsonetField.id || itsonetField.name}`;
        await page.fill(`#${itsonetField.id}`, user);
        const continueBtn = page.getByRole('button', { name: /continuar|conectar|entrar/i }).first();
        await continueBtn.click().catch(() => {});
        await page.locator('#userid').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
        if (await page.locator('#userid').count()) {
          await page.locator('#userid').fill(user);
          await page.locator('#pwd').fill(pass);
          await page.getByRole('button', { name: /iniciar/i }).click();
          await settle(page);
          loginAttempt.ok = true;
        }
      } else {
        loginAttempt.strategy = 'NINGÚN form detectado en landing — ¿sesión anónima o botón de entrada previo?';
      }
    }

    const postLogin = await dumpInteractive(page);
    report.phases.login = {
      ...loginAttempt,
      elapsedMs: Date.now() - t0,
      postLoginUrl: postLogin.url,
      postLoginTitle: postLogin.title,
      postLoginText: postLogin.bodyText.slice(0, 600),
    };
    log('\n== LOGIN ==');
    log('Estrategia:', loginAttempt.strategy);
    log('URL post-login:', postLogin.url, '· elapsed:', Date.now() - t0, 'ms');

    // ── FASE 3: app interna (SPA) ────────────────────────────────
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await settle(page, 5000);
    const app = await dumpInteractive(page);
    const loginElapsedTotal = Date.now() - t0;
    report.phases.app = {
      finalUrl: app.url,
      title: app.title,
      totalElapsedMs: loginElapsedTotal,
      bodyText: app.bodyText,
      clickables: app.clickables,
      images: app.images,
      frames: app.frames,
      canvases: app.canvases,
      inputs: app.inputs.filter((i) => i.visible),
    };
    log('\n== APP INTERNA ==');
    log('URL:', app.url, '· total desde inicio:', loginElapsedTotal, 'ms');
    log('Texto:', app.bodyText.slice(0, 1200));
    log('Clickables:', JSON.stringify(app.clickables, null, 1));
    log('Imágenes:', JSON.stringify(app.images, null, 1));
    log('Frames:', JSON.stringify(app.frames, null, 1), '· canvases:', app.canvases);

    await page.screenshot({ path: path.join(SCRATCH_DIR, 'app-inicial.png'), fullPage: false }).catch(() => {});

    // ── FASE 4: localizar secciones ──────────────────────────────
    const findClickable = (needle) =>
      app.clickables.find((c) => normalize(`${c.text} ${c.title} ${c.alt}`).includes(needle));
    const correoTab = findClickable('correo');
    const credencialTab = findClickable('credencial');
    report.phases.sections = { correoTab, credencialTab };
    log('\n== SECCIONES ==');
    log('Correo Potros tab:', JSON.stringify(correoTab));
    log('Credencial tab:', JSON.stringify(credencialTab));

    // Header del home: contenedor de la foto + nombre (selector exacto).
    report.phases.homeHeader = await page.evaluate(() => {
      const photo = document.querySelector('#PhotoEmplid');
      if (!photo) return null;
      const container = photo.closest('div, header, section');
      return {
        photoSelector: '#PhotoEmplid',
        photoClass: photo.className,
        containerTag: container?.tagName.toLowerCase(),
        containerClass: container?.className || '',
        containerText: (container?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        siblingsHtml: (container?.innerHTML || '').replace(/\s+/g, ' ').slice(0, 600),
      };
    });
    log('\n== HOME HEADER ==', JSON.stringify(report.phases.homeHeader, null, 1));

    // Nombre del alumno: buscar el nodo exacto que lo contiene en el shell.
    report.phases.nameNode = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('span, p, h1, h2, h3, h4, div, a')]
        .filter((el) => {
          const t = (el.innerText || '').trim();
          return t.length > 4 && t.length < 60 && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [A-ZÁÉÍÓÚÑ]/.test(t) && el.children.length === 0;
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className : '',
          text: el.innerText.trim(),
        }));
      return candidates.slice(0, 6);
    });
    log('\n== NOMBRE candidatos ==', JSON.stringify(report.phases.nameNode, null, 1));

    // Foto del alumno: vive en el HOME como #PhotoEmplid (data URL) — capturar acá.
    const homePhotoDataUrl = await page.evaluate(() => {
      const el = document.querySelector('#PhotoEmplid');
      return el && el.src.startsWith('data:') ? el.src : null;
    });
    if (homePhotoDataUrl) {
      const base64 = homePhotoDataUrl.split(',')[1] || '';
      const buffer = Buffer.from(base64, 'base64');
      const format = sniffImageFormat(buffer);
      const dims = imageDimensions(buffer, format);
      fs.writeFileSync(path.join(SCRATCH_DIR, `photo-test.${format === 'unknown' ? 'bin' : format}`), buffer);
      report.phases.photo = {
        selector: '#PhotoEmplid (home header, siempre presente post-login)',
        via: 'data-url',
        bytes: buffer.length,
        format,
        dims,
      };
      log('Foto del home:', buffer.length, 'bytes', format, JSON.stringify(dims));
    }

    // Los module-item tienen id numérico ("1128") — #1128 es CSS inválido:
    // usar [id="..."] o :has-text.
    const moduleLocator = (tab, fallbackText) =>
      tab?.id
        ? page.locator(`a.module-item[id="${tab.id}"]`)
        : page.locator(`a.module-item:has-text("${fallbackText}")`);

    // Los módulos pueden abrir popup (window.open) — capturar páginas nuevas.
    const newPages = [];
    context.on('page', (p) => newPages.push(p));

    // Los módulos cargan dentro de iframe#ContenidoIframe: hay que leer ADENTRO
    // del frame, no el shell exterior.
    const readContenidoIframe = async () => {
      await page.waitForSelector('#ContenidoIframe', { timeout: 15_000 }).catch(() => {});
      await settle(page, 2000);
      const frame = page
        .frames()
        .find((f) => f.name() === 'ContenidoIframe' || /modulosadicionales/i.test(f.url()));
      const iframeSrc = await page.locator('#ContenidoIframe').getAttribute('src').catch(() => null);

      if (!frame) {
        return { frameUrl: iframeSrc, frameText: '', emailsFound: [], institutionalEmail: null, studentIds: [], fields: [], images: [] };
      }

      const data = await frame.evaluate(() => {
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
        // Pares label→valor de tablas y listas de definición.
        const fields = [];
        for (const row of document.querySelectorAll('tr')) {
          const cells = [...row.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
          if (cells.length >= 2 && cells[0] && cells[1]) fields.push({ label: cells[0].slice(0, 40), value: cells[1].slice(0, 80) });
        }
        for (const el of document.querySelectorAll('label, .form-group, .field')) {
          const t = el.innerText.replace(/\s+/g, ' ').trim();
          if (t.includes(':') && t.length < 90) fields.push({ label: t.split(':')[0].slice(0, 40), value: t.split(':').slice(1).join(':').trim().slice(0, 80) });
        }
        const inputs = [...document.querySelectorAll('input')]
          .filter((i) => i.value && i.type !== 'password' && i.type !== 'hidden')
          .map((i) => ({ id: i.id || '', name: i.name || '', value: (i.value || '').slice(0, 80) }));
        const images = [...document.querySelectorAll('img')].map((i) => ({
          id: i.id || '',
          className: typeof i.className === 'string' ? i.className : '',
          srcKind: (i.src || '').startsWith('data:') ? 'data-url' : (i.src || '').startsWith('http') ? 'http' : 'other',
          naturalWidth: i.naturalWidth,
          naturalHeight: i.naturalHeight,
        }));
        return { text, fields, inputs, images, objects: [...document.querySelectorAll('object, embed, iframe')].map((o) => (o.getAttribute('data') || o.getAttribute('src') || '').slice(0, 200)) };
      });

      const allText = `${data.text} ${data.inputs.map((i) => i.value).join(' ')} ${data.fields.map((f) => f.value).join(' ')}`;
      const emails = allText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
      const institutional = emails.find((e) => /@potros\.itson\.edu\.mx$/i.test(e));
      const ids = allText.match(/\b\d{11}\b/g) || [];

      return {
        frameUrl: frame.url(),
        iframeSrcAttr: iframeSrc,
        frameText: data.text,
        fields: data.fields.slice(0, 20),
        inputs: data.inputs,
        images: data.images,
        objects: data.objects,
        emailsFound: [...new Set(emails)],
        institutionalEmail: institutional || null,
        studentIds: [...new Set(ids)],
      };
    };

    // ── FASE 5: Correo Potros ────────────────────────────────────
    if (correoTab) {
      await moduleLocator(correoTab, 'Correo Potros').first().click({ timeout: 10_000 })
        .catch((e) => log('click correo falló:', e.message));
      await settle(page, 3000);

      const iframeInfo = await readContenidoIframe();
      report.phases.correoPotros = iframeInfo;
      log('\n== CORREO POTROS (iframe) ==');
      log('iframe src:', iframeInfo.iframeSrcAttr, '→', iframeInfo.frameUrl);
      log('Emails:', JSON.stringify(iframeInfo.emailsFound), '| inst:', iframeInfo.institutionalEmail);
      log('IDs:', JSON.stringify(iframeInfo.studentIds));
      log('Fields:', JSON.stringify(iframeInfo.fields, null, 1));
      log('Inputs con valor:', JSON.stringify(iframeInfo.inputs, null, 1));
      log('Texto iframe:', (iframeInfo.frameText || '').slice(0, 1200));
      await page.screenshot({ path: path.join(SCRATCH_DIR, 'correo-potros.png'), fullPage: false }).catch(() => {});

      // Volver al home para dejar el iframe limpio antes de la credencial.
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await settle(page, 3000);
    }

    // ── FASE 6: Credencial Alumno ────────────────────────────────
    if (credencialTab) {
      const downloads = [];
      page.on('download', (d) => downloads.push({ url: d.url(), filename: d.suggestedFilename() }));

      await moduleLocator(credencialTab, 'Credencial Alumno').first().click({ timeout: 10_000 })
        .catch((e) => log('click credencial falló:', e.message));
      await settle(page, 5000);

      const iframeInfo = await readContenidoIframe();
      report.phases.credencial = {
        iframeSrcAttr: iframeInfo.iframeSrcAttr,
        frameUrl: iframeInfo.frameUrl,
        frameText: (iframeInfo.frameText || '').slice(0, 1500),
        fields: iframeInfo.fields,
        images: iframeInfo.images,
        objects: iframeInfo.objects,
        downloadsTriggered: downloads,
      };
      log('\n== CREDENCIAL ALUMNO (iframe) ==');
      log('iframe src:', iframeInfo.iframeSrcAttr, '→', iframeInfo.frameUrl);
      log('objects/embeds:', JSON.stringify(iframeInfo.objects, null, 1));
      log('images:', JSON.stringify(iframeInfo.images, null, 1));
      log('downloads:', JSON.stringify(downloads, null, 1));
      log('Texto:', (iframeInfo.frameText || '').slice(0, 1000));
      await page.screenshot({ path: path.join(SCRATCH_DIR, 'credencial-alumno.png'), fullPage: false }).catch(() => {});

      // Endpoint del PDF ya identificado en run previo. Probar fetch con las
      // cookies del context (sin el download, directo GET del recurso).
      const pdfUrl = downloads[0]?.url
        || (iframeInfo.objects.find((o) => /\.aspx|\.pdf|Credencial/i.test(o)) || null);
      if (pdfUrl) {
        const resp = await context.request.get(pdfUrl).catch((e) => ({ __err: e.message }));
        if (resp && !resp.__err) {
          const buffer = Buffer.from(await resp.body());
          const ct = resp.headers()['content-type'] || '';
          const isPdf = buffer.slice(0, 5).toString() === '%PDF-';
          fs.writeFileSync(path.join(SCRATCH_DIR, `credencial.${isPdf ? 'pdf' : 'bin'}`), buffer);
          report.phases.credencial.pdfFetch = {
            url: pdfUrl,
            status: resp.status(),
            contentType: ct,
            bytes: buffer.length,
            isPdf,
          };
          log('PDF fetch:', resp.status(), ct, buffer.length, 'bytes', isPdf ? 'PDF válido' : 'NO-PDF');
        } else {
          report.phases.credencial.pdfFetch = { url: pdfUrl, error: resp?.__err || 'sin respuesta' };
          log('PDF fetch falló:', resp?.__err);
        }
      }
    }

    // ── FASE 7: cookies (nombres y flags — jamás values) ─────────
    const cookies = await context.cookies();
    report.phases.cookies = cookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      httpOnly: c.httpOnly,
      secure: c.secure,
      path: c.path,
    }));
    log('\n== COOKIES ==');
    log(JSON.stringify(report.phases.cookies, null, 1));
  } catch (error) {
    report.error = error?.message;
    console.error('ERROR:', error?.message);
  } finally {
    fs.writeFileSync(path.join(SCRATCH_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    log('\nReporte completo en scratch/report.json');
    await browser.close().catch(() => {});
  }
}

main();
