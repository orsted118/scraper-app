// Cobertura de la extracción de contenido de una actividad de iVirtual:
// enlaces, tablas y rúbrica.
//
// Regla de diseño que estos casos protegen: `textContent` destruye información
// que el alumno necesita. Un <a> aplanado deja el nombre del enlace y tira la
// URL — y la consigna real suele vivir detrás de ese enlace. Una <table>
// aplanada queda como una tira de palabras sin separadores, y la rúbrica (que
// dice exactamente qué puntos dan por qué) ni siquiera se buscaba.
//
// El extractor corre dentro del navegador, así que aquí se le da un DOM real
// con `page.setContent` en vez de simular el HTML con regex.
//
// Uso: node scripts/test-extraccion-contenido.cjs
const { chromium } = require('playwright');
const { extractActivityDetailsFromPage } = require('../electron/handlers/scraper.js');

let failures = 0;

function check(nombre, condicion, detalle) {
  if (!condicion) failures += 1;
  console.log(`${condicion ? 'PASS' : 'FAIL'}  ${nombre}`);
  if (!condicion && detalle !== undefined) {
    console.log(`        obtenido: ${JSON.stringify(detalle)}`);
  }
}

// Réplica reducida de la página real de "Asignación 02 - Implementación de
// Tipos de Datos Abstractos": la consigna es un enlace a Drive y la rúbrica es
// una tabla fuera de #intro.
const FIXTURE = `
<div id="region-main">
  <div id="intro" class="box generalbox">
    <p><a href="https://drive.google.com/file/d/1AbCdEf/view?usp=sharing">Enlace a la Asignación 02 - Implementación de Tipos de Datos Abstractos</a></p>
    <p>Construya los programas de la asignación, teniendo en cuenta los criterios establecidos en la rúbrica de la asignación.</p>
    <p>Subir el archivo comprimido a la plataforma de <a href="/mod/resource/view.php?id=99">IVirtual</a>.</p>
    <ul>
      <li>Proyecto <strong>geometria_ID</strong></li>
      <li>Proyecto <strong>bolsa_ID</strong></li>
    </ul>
    <table>
      <thead><tr><th>Clase</th><th>Métodos</th></tr></thead>
      <tbody>
        <tr><td>Cilindro</td><td>radio, altura, superficie</td></tr>
        <tr><td>Bolsa</td><td>agrega, remueve, limpia</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Criterios de calificación</h3>
  <p>La asignación 2 será evaluada siguiendo la siguiente rúbrica:</p>
  <table class="generaltable">
    <tbody>
      <tr><td>Entrega de la asignación</td><td>0 puntos</td><td>3 puntos</td><td>7 puntos</td><td>10 puntos</td></tr>
      <tr><td>Carrera</td><td>0 puntos</td><td>10 puntos</td><td>20 puntos</td><td>30 puntos</td></tr>
      <tr><td>Codificación</td><td>0 puntos</td><td>15 puntos</td><td>25 puntos</td><td>40 puntos</td></tr>
    </tbody>
  </table>

  <table class="submissionstatustable">
    <tbody>
      <tr><th>Estado de la entrega</th><td>No entregado</td></tr>
      <tr><th>Estado de la calificación</th><td>No calificado</td></tr>
      <tr><th>Grupo de la entrega</th><td>Equipo 4</td></tr>
    </tbody>
  </table>

  <div class="alert alert-warning">Esta es una entrega en grupo. You are not a member of any group, please contact your teacher.</div>
</div>
`;


// Segunda pagina: una consigna VISUAL y con formato, del estilo del ACT04 real
// de Redes. Cubre lo que `textContent` y el extractor anterior tiraban entero:
// imagenes, cabeceras de tabla pegadas desde Word, celdas combinadas, codigo,
// citas y listas de definicion.
const PF = 'https://ivirtual.itson.edu.mx/pluginfile.php/98765/mod_assign/intro';

const FIXTURE_RICO = `
<div id="region-main">
  <div id="intro" class="box generalbox">
    <p><img src="/theme/image.php/boost/core/1/f/pdf-24" width="16" height="16"> Decoracion de Moodle</p>
    <p>
      <img src="${PF}/red1.png" alt="Red 1 - Sin enlace" width="420" height="180">
      <a href="${PF}/red2-full.png"><img src="${PF}/red2-thumb.png" alt="Red 2"></a>
    </p>

    <ol start="3">
      <li>Tercer paso
        <ul><li>Sub-punto anidado</li></ul>
      </li>
      <li>Cuarto paso</li>
    </ol>

    <table border="1">
      <tbody>
        <tr><td><strong>Red</strong></td><td><strong>Que falla?</strong></td><td><strong>Como se arregla?</strong></td></tr>
        <tr><td>1</td><td>Sin enlace fisico</td><td>Cambiar el cable</td></tr>
        <tr><td>2</td><td></td><td></td></tr>
      </tbody>
    </table>

    <table>
      <caption>Direccionamiento del laboratorio</caption>
      <thead>
        <tr><th rowspan="2">Equipo</th><th colspan="2">Configuracion</th></tr>
        <tr><th>IP</th><th>Mascara</th></tr>
      </thead>
      <tbody>
        <tr><td>PC1</td><td>192.168.1.10</td><td>255.255.255.0</td></tr>
      </tbody>
    </table>

    <pre><code>ping 192.168.1.20
ipconfig /all</code></pre>

    <blockquote>Si te traba mas de 15 minutos, pasa a la siguiente.</blockquote>

    <dl>
      <dt>Enlace fisico</dt><dd>La luz del puerto encendida.</dd>
    </dl>

    <p>Una red de 2<sup>32</sup> direcciones. <del>Ignorar el paso 2.</del></p>

    <hr>

    <p><a href="${PF}/ACT04.docx"><img src="${PF}/icono.png" alt=""></a></p>

    <p><iframe src="https://www.youtube.com/embed/abc123" title="Repaso de subneteo"></iframe></p>
  </div>
</div>
`;


// Tercera pagina: la rubrica NATIVA de Moodle, copiada del markup real del
// portal (Asignacion 02 de Estructuras de Datos), no inventada.
//
// Este fixture existe por un fallo concreto: el fixture original ponia la
// rubrica como <table class="generaltable"> suelta, el test pasaba en verde, y
// contra el portal real `rubrica` salia null. Dos motivos, los dos visibles
// solo con el markup autentico:
//   1. La rubrica vive DENTRO de div.submissionstatustable, y el guard que
//      excluia la tabla de estado la descartaba con `closest`.
//   2. Cada criterio guarda sus niveles en una TABLA ANIDADA con la definicion
//      y el puntaje en divs separados; aplanarla da una celda ilegible.
const FIXTURE_RUBRICA_MOODLE = `
<div id="region-main">
  <div id="intro" class="activity-description">
    <div class="box generalbox"><div class="no-overflow">
      <h5><a href="https://drive.google.com/file/d/16kys/view">Enlace a la Asignacion 02</a></h5>
      <h5><strong>Construya los programas de la asignacion.</strong></h5>
    </div></div>
  </div>

  <div class="submissionstatustable">
    <table class="generaltable table-bordered">
      <tbody>
        <tr><th>Estado de la entrega</th><td>No entregado</td></tr>
        <tr><th>Estado de la calificacion</th><td>Sin calificar</td></tr>
      </tbody>
    </table>

    <h4>Grading criteria</h4>
    <div id="rubric-rubric" class="clearfix gradingform_rubric editor preview">
      <table id="rubric-criteria" class="criteria">
        <caption>Rubric</caption>
        <tbody>
          <tr class="criterion odd" id="rubric-criteria-1">
            <td class="description">Entrega de la asignacion</td>
            <td class="levels">
              <table role="none"><tbody><tr>
                <td class="level first even"><div class="level-wrapper">
                  <div class="definition">No cumple con ninguno de los siguientes criterios:

a) Archivo comprimido como se especifico
b) El archivo contiene los dos proyectos</div>
                  <div class="score"><span class="scorevalue">0</span> points</div>
                </div></td>
                <td class="level odd"><div class="level-wrapper">
                  <div class="definition">Cumple con todos los siguientes criterios:

a) Archivo comprimido como se especifico
b) El archivo contiene los dos proyectos</div>
                  <div class="score"><span class="scorevalue">10</span> points</div>
                </div></td>
              </tr></tbody></table>
            </td>
          </tr>
          <tr class="criterion even" id="rubric-criteria-2">
            <td class="description">Codificacion</td>
            <td class="levels">
              <table role="none"><tbody><tr>
                <td class="level first even"><div class="level-wrapper">
                  <div class="definition">No cumple</div>
                  <div class="score"><span class="scorevalue">0</span> points</div>
                </div></td>
                <td class="level odd"><div class="level-wrapper">
                  <div class="definition">Cumple con todos</div>
                  <div class="score"><span class="scorevalue">40</span> points</div>
                </div></td>
              </tr></tbody></table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`;

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    // La base real importa: los enlaces del portal son relativos y sin ella no
    // se pueden absolutizar.
    await page.setContent(
      `<!doctype html><html><head><base href="https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1693675"></head><body>${FIXTURE}</body></html>`,
    );

    const details = await page.evaluate(extractActivityDetailsFromPage, 'Estructuras de Datos');

    console.log('== Enlaces: la URL sobrevive al scraping ==');
    const drive = details.enlaces.find((link) => link.url.includes('drive.google.com'));
    check('encuentra el enlace de Drive de la consigna', Boolean(drive), details.enlaces);
    check(
      'conserva el texto visible del enlace',
      drive?.texto === 'Enlace a la Asignación 02 - Implementación de Tipos de Datos Abstractos',
      drive?.texto,
    );
    check('clasifica Drive como google', drive?.tipo === 'google', drive?.tipo);
    check(
      'resuelve enlaces relativos a URL absoluta',
      details.enlaces.some((link) => link.url.startsWith('http') && link.url.includes('/mod/resource/view.php')),
      details.enlaces.map((link) => link.url),
    );
    check(
      'no inventa enlaces fuera de #intro',
      details.enlaces.length === 2,
      details.enlaces.length,
    );

    console.log('');
    console.log('== Markdown: enlaces y estructura preservados ==');
    check(
      'el markdown mantiene destino del enlace',
      details.introMarkdown.includes('](https://drive.google.com/file/d/1AbCdEf/view?usp=sharing)'),
      details.introMarkdown.slice(0, 200),
    );
    check('el markdown conserva la lista', details.introMarkdown.includes('- Proyecto **geometria_ID**'));
    check('el markdown serializa la tabla de #intro', details.introMarkdown.includes('| Clase | Métodos |'));

    console.log('');
    console.log('== Tablas dentro de #intro ==');
    check('extrae 1 tabla de la consigna', details.tablas.length === 1, details.tablas.length);
    check(
      'detecta el thead como encabezado',
      JSON.stringify(details.tablas[0]?.encabezados) === JSON.stringify(['Clase', 'Métodos']),
      details.tablas[0]?.encabezados,
    );
    check('separa las filas', details.tablas[0]?.filas.length === 2, details.tablas[0]?.filas);

    console.log('');
    console.log('== Rúbrica: vive fuera de #intro y antes no se extraía ==');
    check('encuentra la rúbrica', Boolean(details.rubrica), details.rubrica);
    check(
      'usa el encabezado real como título',
      details.rubrica?.titulo === 'Criterios de calificación',
      details.rubrica?.titulo,
    );
    check('captura los 3 criterios', details.rubrica?.filas.length === 3, details.rubrica?.filas.length);
    check(
      'conserva los puntajes por nivel',
      details.rubrica?.filas[1]?.includes('30 puntos'),
      details.rubrica?.filas[1],
    );
    check(
      'no confunde la rúbrica con la tabla de estado de entrega',
      !details.rubrica?.markdown.includes('Estado de la calificación'),
      details.rubrica?.markdown,
    );

    console.log('');
    console.log('== Señales de estado ==');
    check('detecta modalidad en equipo', details.modalidad === 'equipo', details.modalidad);
    check('detecta que no hay equipo asignado', details.sinEquipo === true, details.sinEquipo);
    check('no marca la ventana como cerrada', details.closedByText === false, details.closedByText);
    check('no marca la actividad como no abierta', details.notOpenYet === false, details.notOpenYet);
    check('lee el grupo de la entrega', details.equipo === 'Equipo 4', details.equipo);

    console.log('');
    console.log('############################################################');
    console.log('# Rubrica nativa de Moodle (markup real del portal)');
    console.log('############################################################');

    const rub = await browser.newPage();
    await rub.setContent(
      `<!doctype html><html><head><base href="https://ivirtual.itson.edu.mx/mod/assign/view.php?id=99"></head><body>${FIXTURE_RUBRICA_MOODLE}</body></html>`,
    );
    const rr = await rub.evaluate(extractActivityDetailsFromPage, 'Estructuras de Datos');

    console.log('');
    console.log('== La rubrica dentro de .submissionstatustable no se descarta ==');
    check('encuentra la rubrica nativa', Boolean(rr.rubrica), rr.rubrica);
    check('no la confunde con la tabla de estado',
      !JSON.stringify(rr.rubrica || {}).includes('No entregado'), rr.rubrica?.filas);

    console.log('');
    console.log('== Los niveles anidados se leen como columnas, no aplanados ==');
    check('un criterio por fila', rr.rubrica?.filas.length === 2, rr.rubrica?.filas.length);
    check('la descripcion del criterio es la primera celda',
      rr.rubrica?.filas[0]?.[0] === 'Entrega de la asignacion', rr.rubrica?.filas[0]?.[0]);
    check('una columna por nivel',
      JSON.stringify(rr.rubrica?.encabezados) === JSON.stringify(['Criterio', 'Nivel 1', 'Nivel 2']),
      rr.rubrica?.encabezados);
    check('cada nivel lleva su puntaje',
      rr.rubrica?.filas[0]?.[2]?.includes('(10 pts)'), rr.rubrica?.filas[0]?.[2]);
    check('el puntaje del segundo criterio no se mezcla con el primero',
      rr.rubrica?.filas[1]?.[2]?.includes('(40 pts)'), rr.rubrica?.filas[1]?.[2]);
    check('los incisos de la definicion no se pegan en un parrafo corrido',
      rr.rubrica?.filas[0]?.[1]?.includes('· a) Archivo comprimido'), rr.rubrica?.filas[0]?.[1]);
    check('el markdown de la rubrica lleva el contenido real',
      (rr.rubrica?.markdown || '').length > 300, (rr.rubrica?.markdown || '').length);

    console.log('');
    console.log('== La consigna corta convive con la rubrica larga ==');
    check('el intro sigue siendo solo la consigna',
      rr.introMarkdown.includes('Construya los programas') && !rr.introMarkdown.includes('scorevalue'),
      rr.introMarkdown.slice(0, 160));
    check('la rubrica NO se cuela en tablas[] de la consigna', rr.tablas.length === 0, rr.tablas.length);

    console.log('');
    console.log('############################################################');
    console.log('# Consigna visual y con formato (estilo ACT04)');
    console.log('############################################################');

    const rico = await browser.newPage();
    await rico.setContent(
      `<!doctype html><html><head><base href="https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1234"></head><body>${FIXTURE_RICO}</body></html>`,
    );
    const r = await rico.evaluate(extractActivityDetailsFromPage, 'Redes');
    const md = r.introMarkdown;

    console.log('');
    console.log('== Imagenes: antes se perdian enteras ==');
    check('recolecta las imagenes de la consigna', r.imagenes.length === 3, r.imagenes.map((i) => i.url));
    check(
      'descarta la decoracion de Moodle (icono 16x16 de /theme/)',
      !r.imagenes.some((image) => image.url.includes('/theme/')),
      r.imagenes.map((i) => i.url),
    );
    check('conserva el alt como descripcion', r.imagenes[0]?.alt === 'Red 1 - Sin enlace', r.imagenes[0]?.alt);
    check(
      'conserva ancho y alto declarados',
      r.imagenes[0]?.ancho === 420 && r.imagenes[0]?.alto === 180,
      [r.imagenes[0]?.ancho, r.imagenes[0]?.alto],
    );
    check(
      'guarda el original detras de una miniatura enlazada',
      r.imagenes.some((image) => image.original.includes('red2-full.png')),
      r.imagenes.map((i) => i.original),
    );
    check('marca que el pluginfile necesita sesion', r.imagenes[0]?.requiereSesion === true, r.imagenes[0]?.requiereSesion);
    check('el markdown incrusta la imagen', md.includes('![Red 1 - Sin enlace](' + PF + '/red1.png)'), md.slice(0, 300));

    console.log('');
    console.log('== Tabla pegada desde Word: cabecera en <td><strong> ==');
    const wordTable = r.tablas.find((t) => t.encabezados.includes('Red'));
    check(
      'reconoce la cabecera aunque no use <th>',
      JSON.stringify(wordTable?.encabezados) === JSON.stringify(['Red', 'Que falla?', 'Como se arregla?']),
      wordTable?.encabezados,
    );
    check(
      'no deja una fila de cabecera vacia en el markdown',
      Boolean(wordTable) && !wordTable.markdown.startsWith('|  |  |  |'),
      wordTable?.markdown.split('\n')[0],
    );
    check(
      'conserva la fila que el alumno debe completar',
      wordTable?.filas.length === 2 && wordTable.filas[1].join('') === '2',
      wordTable?.filas,
    );

    console.log('');
    console.log('== Celdas combinadas: rowspan/colspan ==');
    const spanTable = r.tablas.find((t) => t.titulo === 'Direccionamiento del laboratorio');
    check('lee el <caption> como titulo', Boolean(spanTable), r.tablas.map((t) => t.titulo));
    check(
      'funde las dos filas de cabecera arrastrando el nivel superior',
      JSON.stringify(spanTable?.encabezados) ===
        JSON.stringify(['Equipo', 'Configuracion · IP', 'Configuracion · Mascara']),
      spanTable?.encabezados,
    );
    check(
      'los datos quedan bajo su columna',
      JSON.stringify(spanTable?.filas) === JSON.stringify([['PC1', '192.168.1.10', '255.255.255.0']]),
      spanTable?.filas,
    );

    console.log('');
    console.log('== Texto agrupado y con formato ==');
    check('el <pre> conserva el salto de linea del comando', md.includes('```\nping 192.168.1.20\nipconfig /all\n```'), md);
    check('la cita se marca como cita', md.includes('> Si te traba mas de 15 minutos'), md);
    check(
      'la lista de definicion sobrevive',
      md.includes('**Enlace fisico**') && md.includes(': La luz del puerto encendida.'),
      md,
    );
    check('respeta el start de una lista ordenada', md.includes('3. Tercer paso'), md);
    check('la sublista queda anidada, no aplanada en el padre', md.includes('  - Sub-punto anidado'), md);
    check('los items de la lista quedan contiguos, no como parrafos', md.includes('3. Tercer paso\n'), md);
    check('el superindice no se pierde', md.includes('2^32'), md);
    check('el tachado se preserva', md.includes('~~Ignorar el paso 2.~~'), md);
    check('el separador se preserva', md.includes('\n---\n'), md);

    console.log('');
    console.log('== Adjuntos y embebidos que antes se caian ==');
    check(
      'el adjunto cuya ancla solo envuelve un icono no se pierde',
      r.archivos.some((file) => file.url.includes('ACT04.docx')),
      r.archivos,
    );
    check(
      'le pone el nombre del archivo al adjunto sin texto',
      r.archivos.find((file) => file.url.includes('ACT04.docx'))?.name === 'ACT04.docx',
      r.archivos.find((file) => file.url.includes('ACT04.docx'))?.name,
    );
    check(
      'detecta el video incrustado en un <iframe>',
      r.enlaces.some((link) => link.url.includes('youtube.com/embed/abc123')),
      r.enlaces,
    );
    check(
      'usa el title del iframe como texto',
      r.enlaces.find((link) => link.url.includes('youtube'))?.texto === 'Repaso de subneteo',
      r.enlaces.find((link) => link.url.includes('youtube'))?.texto,
    );
  } finally {
    await browser.close();
  }

  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('El test no pudo correr:', error?.message || error);
  process.exit(1);
});
