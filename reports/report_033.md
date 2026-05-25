# Report 033
**Fecha:** 2026-05-22 23:37  
**Agente:** Codex  
**Tipo:** refactor

## Archivos modificados
- `horario-debug.html` — archivo creado como parte de la base inicial
- `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial
- `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial
- `scripts/debug-horario.js` — archivo creado como parte de la base inicial

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `horario-debug.html`
```diff
diff --git a/horario-debug.html b/horario-debug.html
new file mode 100644
index 0000000..e69de29
```

### `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
```diff
diff --git a/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
new file mode 100644
index 0000000..b683605
--- /dev/null
+++ b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
@@ -0,0 +1,218 @@
+<!DOCTYPE html><html dir="ltr"><head>
+<meta name="robots" content="noindex">
+<!--
+* ******************************************************************
+* ORACLE CONFIDENTIAL.  For authorized use only.  Except for as
+* expressly authorized by Oracle, do not disclose, copy, reproduce,
+* distribute, or modify.
+* ******************************************************************
+*
+-->
+<title>Sistema CIA - Instituto Tecnológico de Sonora</title>
+
+	<meta http-equiv="X-UA-Compatible" content="IE=edge">
+    <meta charset="UTF-8">
+    
+	<meta name="viewport" content="width=device-width, initial-scale=1">
+    <link rel="stylesheet" type="text/css" href="/ITSONPRD/images/img/css/StyleSheet-precia.css">
+
+<style>
+        .open-button {
+            background-color: #006db6;
+            color: white;
+            padding: 10px 20px;
+            border: 1px solid white;
+            cursor: pointer;
+            opacity: 0.8;
+            position: fixed;
+            width: 280px;
+            border-radius: 50px;
+            font-size: 18px !important;
+        }
+
+            .form-container .btn:hover, .open-button:hover {
+                opacity: 1;
+            }
+
+        .form-container .btn {
+            color: white;
+            padding: 7px 10px;
+            border: none;
+            cursor: pointer;
+            width: 100%;
+            margin-bottom: 10px;
+        }
+
+        #BotonAyuda {
+            position: fixed;
+            bottom: 30px;
+            right: 150px;
+            z-index: 9;
+            border-radius: 13px 13px 0 0;
+            margin-right: 15px;
+        }
+
+        #myIframe {
+            visibility: hidden;
+        }
+    </style><script language="JavaScript">
+    function signin(form) {
+        var now = new Date();
+        form.timezoneOffset.value = now.getTimezoneOffset();
+        return;
+    }
+    function setFocus() {
+        try
+         { document.login.userid.focus() }
+        catch (e)
+         { };
+        return;
+    }
+    function submitAction(form) {
+        form.Submit.disabled = true;
+        form.submit();
+    }
+</script><script>
+
+      function redirect() {
+ window.open("https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx");
+      }
+
+	function abrirIframe() {
+            if (document.getElementById("myIframe").style.visibility == "hidden" || document.getElementById("myIframe").style.visibility == "") {
+                document.getElementById("myIframe").style.visibility = "visible";
+                //document.getElementById("myIframe").style.zIndex = "0";
+            } else {
+                document.getElementById("myIframe").style.visibility = "hidden";
+                //document.getElementById("myIframe").style.zIndex = "10000";
+            }
+        }
+
+        function closeIframe() {
+            var iframe = document.getElementById('myIframe');
+            document.getElementById("myIframe").style.visibility = "hidden";
+        }
+
+        window.addEventListener('message', function (event) {
+            if (event.data === 'closeIframe') {
+                closeIframe();
+            }
+        });
+	
+</script></head>
+
+
+
+
+
+
+
+<body onload="setFocus(); if (top != self) top.location = location" style="background-color:#006db6">
+   
+    <div class="limiter">
+    
+		<div class="container-login">
+          
+        <div class="wrap-login" style="width:50%">
+            
+              <!-- Aquí se muestra el acceso -->
+
+			   <form class="login-form validate-form" style="width:100%" action="?cmd=login&amp;languageCd=ESP" method="post" id="login" name="login" autocomplete="off" onsubmit="signin(document.login)">
+                           <input type="hidden" name="timezoneOffset" value="0">    
+                <img src="/ITSONPRD/images/img/ITSON-MARCA.png" class="logoITSON" style="width:60%"> <br> <br><br>
+               
+<img src="/ITSONPRD/images/img/CIA.png" class="logoCIA" style="width:60%">
+
+
+                   	<div class="wrap-input validate-input">
+						<input class="input" id="userid" type="text" name="userid" placeholder="Ingresar ID ITSON de 11 dígitos" maxlength="11">
+					</div> <br>
+
+                    <div class="wrap-input validate-input">
+                        <input class="input" id="pwd" type="password" name="pwd" placeholder="Ingresar contraseña">
+                    </div>
+                    
+
+  
+
+					
+					<div class="container-login-form-btn">
+						<button class="login-form-btn">
+							Iniciar Sesión
+						</button>
+					</div>
+
+					<div class="text-password">
+						<span class="txt1">
+							¿Has olvidado tu
+						</span>
+						<a class="txt2" href="http://smartweb1.itson.edu.mx:8700/psp/ITSONPRD/EMPLOYEE/HRMS/c/MAINTAIN_SECURITY.EMAIL_PSWD.GBL?FolderPath=PORTAL_ROOT_OBJECT.PT_TOOLS_HIDDEN.PT_EMAIL_PSWD_GBL&amp;IsFolder=false&amp;IgnoreParamTempl=FolderPath%2cIsFolder" target="_blank">
+							Usuario / Contraseña?
+						</a>
+					</div>
+
+						
+					<div class="container-login-form-btn">
+						<a href="https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx">Aviso Privacidad</a>
+						<!--<button class="login-form-btn" onclick="redirect()">
+							Aviso Privacidad
+						</button> -->
+					</div>
+
+
+				</form>
+                
+                <!-- Aquí se muestra la imagen de la app -->
+                <!--	<div class="login-pic">
+					
+                       <img src="img/SCREENSHOTS-PPLAYSTORE-BACKBLUE2.png" alt="IMG"/>
+                    <div class="playstore">
+
+                    	<div id="googleplay">
+                        <p id="playstore-text" class="hvr-float-shadow"><br />
+						<a href="https://play.google.com/store/apps/details?id=mx.itson.potrosapp" target="_blank">
+                            <img src="img/googleplay.png"/>
+                        </a></p>
+                        </div>
+
+                        <div id="appstore">
+                        <p id="playstore-text" class="hvr-float-shadow"><br />
+                            <a href="https://itunes.apple.com/us/app/potros-app/id1339260457?l=es&ls" target="_blank">
+                            <img src="img/appstore.png" />
+                            </a>
+                        </p>
+                        </div>
+                    </div>
+				</div> -->
+
+<div class="col-lg-3">
+        <iframe id="myIframe" name="Contenido" src="https://apps9.itson.edu.mx/chatmesa/chatmesaayuda.aspx" style="height: 550px; width: 350px; position:fixed; bottom:3%; right: 1%; z-index:99;" frameborder="0"></iframe>
+        <div id="BotonAyuda" style="z-index:99;">
+            <button class="btn btn-info btn-circle btn-lg open-button" style="width:100px; height:40px; position:fixed; bottom:3%; right: 3%;" onclick="abrirIframe()">Ayuda</button>
+        </div>
+    </div>
+			</div>
+
+                    
+  
+        
+
+<footer>
+
+   
+   <!-- Start of admisionesitson Zendesk Widget script 
+<iframe src="javascript:false" title="" style="display: none;"></iframe><script>/*<![CDATA[*/window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var o=this.createElement("script");n&&(this.domain=n),o.id="js-iframe-async",o.src=e,this.t=+new Date,this.zendeskHost=t,this.zEQueue=a,this.body.appendChild(o)},o.write('<body onload="document._l();">'),o.close()}("https://assets.zendesk.com/embeddable_framework/main.js","admisionesitson.zendesk.com");
+/*]]>*/</script> -->
+<!-- End of admisionesitson Zendesk Widget script -->
+
+
+<!-- <div><iframe id="launcher" tabindex="0" class="zEWidget-launcher zEWidget-launcher--active" style="border: none; background: transparent; z-index: 999998; transform: translateZ(0px); position: fixed; opacity: 1; right: 0px; bottom: 0px; width: 125px; height: 47px; margin: 10px 20px;"></iframe></div><div><iframe id="webWidget" tabindex="-1" class="zEWidget-webWidget " style="border: none; background: transparent; z-index: 999999; transform: translateZ(0px); position: fixed; opacity: 0; right: 0px; bottom: 0px; width: 357px; margin-left: 15px; margin-right: 15px; height: 15px; transition-property: none; transition-timing-function: unset; top: -9999px;"></iframe></div> -->
+
+
+
+
+
+</footer>
+
+
+</div></div></body></html>
\ No newline at end of file
```

### `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
```diff
diff --git a/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
new file mode 100644
index 0000000..8568ea8
--- /dev/null
+++ b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
@@ -0,0 +1,225 @@
+<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>
+	Ayuda Chat Popup
+</title><link href="css/bootstrap.min.css" rel="stylesheet">
+     <script src="js/bootstrap.bundle.min.js"></script>
+    <style>
+        #chatButton { z-index: 1055; }
+        #chatCard { z-index: 1060; width: 20rem;  }
+        textarea { resize: none; }
+   </style>
+</head>
+<body style="background:none">
+    <form method="post" action="./chatmesaayuda.aspx" id="form1">
+<div class="aspNetHidden">
+<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="g4JRE3s9GsEu+daGHvPSlBuQWKj8Wus46A+Mm1OZvxVLChmXtYFzT8TYafGvZdwrcNQPbeXST5h/jr+f5tPfQuQq2argyxKdunC3H8GR9FI=">
+</div>
+
+<div class="aspNetHidden">
+
+	<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="1B0F1C22">
+</div>
+        <!-- Botón flotante -->
+       
+
+        <!-- Tarjeta de ayuda -->
+        <div id="chatCard" class="card position-fixed bottom-0 end-0 m-4 shadow-lg" style="display:true;">
+            <div class="card">
+                <div class="card-header bg-primary text-white">Mesa de ayuda ITSON</div>
+            <div class="card-body">
+                
+                <div class="d-flex justify-content-between">
+                    <label class="card-title mb-0">Para registrar una solicitud a la mesa de ayuda, ingrese su ID ITSON ó un correo electrónico válido para su seguimiento.</label>
+                 </div>
+
+                <div id="mensaje" class="alert d-none mt-3" role="alert"></div>
+
+                <div class="mb-3 mt-3">
+                    <label for="medio" class="form-label">Registrar con</label>
+                    <select id="medio" class="form-select" onchange="toggleInput()">
+                        <option value="correo">Correo electrónico</option>
+                        <option value="id">ID</option>
+                    </select>
+                </div>
+
+                <div class="mb-3" id="correoDiv">
+                    <input type="email" class="form-control" id="correoInput" placeholder="Correo electrónico">
+                </div>
+
+                <div class="mb-3 d-none" id="idDiv">
+                   <input type="text" class="form-control" id="idInput" placeholder="ID (11 dígitos)" maxlength="11" onblur="formatearID()">
+                </div>
+
+                <div class="mb-3">
+                    <textarea class="form-control" id="solicitud" rows="3" placeholder="Ingresa tu solicitud."></textarea>
+                </div>
+
+                <div id="confirmSection" class="mb-3 d-none">
+                    <div class="alert alert-warning p-2">¿Confirmar solicitud?</div>
+                    <div class="d-flex justify-content-between">
+                        <button type="button" class="btn btn-success btn-sm" onclick="enviarSolicitud()">Sí</button>
+                        <button type="button" class="btn btn-secondary btn-sm" onclick="resetForm()">No</button>
+                    </div>
+                </div>
+                        <div id="respuesta" class="alert alert-info mt-3 d-none"></div>
+
+                <div class="d-grid">
+                    <button type="button" id="btnRegistrar" class="btn btn-primary" onclick="validarFormulario()">Registrar solicitud</button>
+                </div>
+            </div>
+        </div>
+            </div>
+    </form>
+
+    <script>
+        let ultimaSolicitud = "";
+
+        function toggleChat() {
+            const chatCard = document.getElementById("chatCard");
+            const visible = chatCard.style.display === "block";
+            chatCard.style.display = visible ? "none" : "block";
+            if (visible) limpiarFormulario();
+        }
+
+        function toggleInput() {
+            const medio = document.getElementById("medio").value;
+            document.getElementById("correoDiv").classList.toggle("d-none", medio !== "correo");
+            document.getElementById("idDiv").classList.toggle("d-none", medio !== "id");
+            limpiarMensaje();
+        }
+
+        function formatearID() {
+            let id = document.getElementById("idInput").value.replace(/\D/g, '');
+            if (id.length < 11) {
+                id = id.padStart(11, '0');
+                document.getElementById("idInput").value = id;
+            }
+        }
+
+
+        function mostrarMensaje(texto, tipo = "info") {
+            const msg = document.getElementById("mensaje");
+            msg.className = `alert alert-${tipo}`;
+            msg.innerText = texto;
+            msg.classList.remove("d-none");
+        }
+
+        function limpiarMensaje() {
+
+            const msg = document.getElementById("mensaje");
+            msg.classList.add("d-none");
+            msg.innerText = "";
+        }
+
+        function validarFormulario() {
+            limpiarMensaje();
+            const medio = document.getElementById("medio").value;
+            const correo = document.getElementById("correoInput").value.trim();
+            const id = document.getElementById("idInput").value.trim();
+            const solicitud = document.getElementById("solicitud").value.trim();
+            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
+            document.getElementById("respuesta").classList.add("d-none");
+
+            if (solicitud === "") {
+                mostrarMensaje("Por favor, escribe tu solicitud.", "danger");
+                return;
+            }
+
+            if (medio === "correo") {
+                if (!emailRegex.test(correo)) {
+                    mostrarMensaje("Correo electrónico inválido.", "danger");
+                    return;
+                }
+                mostrarConfirmacion();
+            } else {
+                if (id.length !== 11) {
+                    mostrarMensaje("El ID debe tener 11 dígitos.", "danger");
+                    return;
+                }
+                fetch("ChatMesaAyuda.aspx/VerificarID", {
+                    method: "POST",
+                    headers: { 'Content-Type': 'application/json' },
+                    body: JSON.stringify({ id: id })
+                })
+                    .then(res => res.json())
+                    .then(res => {
+                        if (!res.d) {
+                            mostrarMensaje("ID no encontrado.", "danger");
+                            return;
+                        } else {
+                            mostrarConfirmacion();
+                        }
+                    });
+            }
+        }
+
+        function mostrarConfirmacion() {
+            document.getElementById("btnRegistrar").classList.add("d-none");
+            document.getElementById("confirmSection").classList.remove("d-none");
+            document.getElementById("medio").disabled = true;
+            document.getElementById("idInput").disabled = true;
+            document.getElementById("correoInput").disabled = true;
+            document.getElementById("solicitud").disabled = true;
+
+        }
+
+        function resetForm() {
+            document.getElementById("confirmSection").classList.add("d-none");
+            document.getElementById("btnRegistrar").classList.remove("d-none");
+            document.getElementById("medio").disabled = false;
+            document.getElementById("idInput").disabled = false;
+            document.getElementById("correoInput").disabled = false;
+            document.getElementById("solicitud").disabled = false;
+
+            limpiarMensaje();
+        }
+
+        function limpiarFormulario() {
+            document.getElementById("correoInput").value = "";
+            document.getElementById("idInput").value = "";
+            document.getElementById("solicitud").value = "";
+            document.getElementById("medio").value = "correo";
+            toggleInput();
+            resetForm();
+        }
+
+        function enviarSolicitud() {
+
+            const medio = document.getElementById("medio").value;
+            const correo = document.getElementById("correoInput").value.trim();
+            const id = document.getElementById("idInput").value.trim();
+            const solicitud = document.getElementById("solicitud").value.trim();
+
+            const hash = medio + correo + id + solicitud;
+            if (hash === ultimaSolicitud) return;
+            ultimaSolicitud = hash;
+
+            fetch("ChatMesaAyuda.aspx/RegistrarSolicitud", {
+                method: "POST",
+                headers: { 'Content-Type': 'application/json' },
+                body: JSON.stringify({
+                    usuario: medio === "id" ? id : "",
+                    email: medio === "correo" ? correo : "",
+                    descripcion: solicitud
+                })
+            })
+                .then(res => res.json())
+                .then(res => {
+                    const respuesta = document.getElementById("respuesta");
+                    respuesta.textContent = "Folio generado: " + res.d;
+                    respuesta.className = "alert alert-success mt-3";  
+
+                    document.getElementById("confirmSection").classList.add("d-none");
+                    limpiarFormulario();
+                })
+                .catch(() => {
+                    const respuesta = document.getElementById("respuesta");
+                    respuesta.textContent = "Error al enviar la solicitud. Intenta más tarde.";
+                    respuesta.className = "alert alert-danger mt-3";
+
+                });
+        }
+
+    </script>
+   
+
+</body></html>
\ No newline at end of file
```

### `scripts/debug-horario.js`
```diff
diff --git a/scripts/debug-horario.js b/scripts/debug-horario.js
new file mode 100644
index 0000000..f24031b
--- /dev/null
+++ b/scripts/debug-horario.js
@@ -0,0 +1,165 @@
+const { chromium } = require('playwright');
+const fs = require('fs');
+require('dotenv').config();
+
+(async () => {
+  const browser = await chromium.launch({ headless: true });
+  const context = await browser.newContext();
+  const page = await context.newPage();
+
+  await page.route('**/*', (route) => {
+    const blocked = ['image', 'media', 'font', 'stylesheet'];
+    blocked.includes(route.request().resourceType()) ? route.abort() : route.continue();
+  });
+
+  // Usa el mismo flujo de login que horario.js
+  const { scrapeHorario } = require('../electron/handlers/horario');
+
+  // Intercepta la tabla antes de parsearla
+  // Navega manualmente con el mismo flujo del scraper
+  await page.goto('https://apps9.itson.edu.mx/CIA/index.aspx', {
+    waitUntil: 'domcontentloaded',
+    timeout: 45000,
+  });
+  await page.waitForTimeout(2000);
+
+  // Login
+  const allFrames = page.frames();
+  let loginFrame =
+    allFrames.find((f) => f.name() === 'TargetContent') ||
+    allFrames.find((f) => f.url().includes('CIA')) ||
+    page.mainFrame();
+
+  const user = process.env.CIA_USER || '';
+  const pass = process.env.CIA_PASS || '';
+
+  // Intenta múltiples selectores de login
+  const userSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
+  const passSelectors = ['#pwd', 'input[name="pwd"]', 'input[type="password"]'];
+  const submitSelectors = ['#Submit_btn', 'input[type="submit"]', 'button[type="submit"]'];
+
+  for (const sel of userSelectors) {
+    try {
+      await loginFrame.fill(sel, user);
+      break;
+    } catch (e) {}
+  }
+  for (const sel of passSelectors) {
+    try {
+      await loginFrame.fill(sel, pass);
+      break;
+    } catch (e) {}
+  }
+  for (const sel of submitSelectors) {
+    try {
+      await loginFrame.click(sel);
+      break;
+    } catch (e) {}
+  }
+
+  await page.waitForTimeout(5000);
+  console.log('URL post-login:', page.url());
+
+  // Navega al horario usando los mismos clicks que horario.js
+  // Busca link de horario en todos los frames
+  let horarioClicked = false;
+  for (const frame of page.frames()) {
+    if (horarioClicked) break;
+    try {
+      const clicked = await frame.evaluate(() => {
+        const links = Array.from(document.querySelectorAll('a'));
+        const link = links.find(
+          (l) =>
+            /mi horario/i.test(l.textContent) ||
+            /horario de clases/i.test(l.textContent) ||
+            /SSR_SSENRL_LIST/i.test(l.href),
+        );
+        if (link) {
+          link.click();
+          return true;
+        }
+        return false;
+      });
+      if (clicked) {
+        horarioClicked = true;
+        console.log('Click en horario desde frame:', frame.url());
+      }
+    } catch (e) {}
+  }
+
+  await page.waitForTimeout(4000);
+
+  // Activa Vista Semanal
+  for (const frame of page.frames()) {
+    try {
+      await frame.evaluate(() => {
+        const inputs = Array.from(document.querySelectorAll('input'));
+        const semanal = inputs.find(
+          (i) => /semanal/i.test(i.value) || /semanal/i.test(i.nextSibling?.textContent || ''),
+        );
+        if (semanal) semanal.click();
+      });
+    } catch (e) {}
+  }
+
+  await page.waitForTimeout(3000);
+
+  // Guarda HTML de cada frame con contenido
+  let savedCount = 0;
+  for (const frame of page.frames()) {
+    try {
+      const html = await frame.content();
+      if (html.length > 2000) {
+        const safeName = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
+        const fname = `scripts/debug-frame-${savedCount}-${safeName}.html`;
+        fs.writeFileSync(fname, html);
+        console.log('Guardado:', fname, '| tamaño:', html.length, 'chars');
+        savedCount++;
+      }
+    } catch (e) {}
+  }
+
+  // Busca específicamente la tabla del horario y guárdala
+  for (const frame of page.frames()) {
+    try {
+      const tablaHtml = await frame.evaluate(() => {
+        // Busca tabla con contenido de horario
+        const tables = Array.from(document.querySelectorAll('table'));
+        const horarioTable = tables.find((t) => {
+          const text = t.innerText || '';
+          return /lunes|martes|mi[eé]rcoles|jueves|viernes/i.test(text) && /AM|PM|\d+:\d+/.test(text);
+        });
+        if (!horarioTable) return null;
+
+        // También extrae los datos raw de cada celda
+        const cells = Array.from(horarioTable.querySelectorAll('td')).map((td) => ({
+          rowspan: td.getAttribute('rowspan') || '1',
+          colspan: td.getAttribute('colspan') || '1',
+          id: td.id || '',
+          className: td.className || '',
+          text: (td.innerText || '').trim().substring(0, 200),
+          childCount: td.children.length,
+        }));
+
+        return {
+          tableHtml: horarioTable.outerHTML,
+          cellData: cells,
+        };
+      });
+
+      if (tablaHtml) {
+        fs.writeFileSync('scripts/tabla-horario.html', tablaHtml.tableHtml);
+        fs.writeFileSync('scripts/tabla-celdas.json', JSON.stringify(tablaHtml.cellData, null, 2));
+        console.log('✅ Tabla del horario guardada en scripts/tabla-horario.html');
+        console.log('✅ Datos de celdas en scripts/tabla-celdas.json');
+        console.log('Primeras 5 celdas:');
+        tablaHtml.cellData.slice(0, 10).forEach((c, i) =>
+          console.log(`  Celda ${i}: rowspan=${c.rowspan} | "${c.text.substring(0, 80)}"`),
+        );
+      }
+    } catch (e) {}
+  }
+
+  await browser.close();
+  console.log('Done.');
+})();
```

## Pendiente para Claude
- Output completo de `node scripts/debug-horario.js`:
  - `◇ injected env (5) from .env // tip: ⌘ override existing { override: true }`
  - `URL post-login: https://apps9.itson.edu.mx/CIA/CIA.ASPX`
  - `Guardado: scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html | tamaño: 8589 chars`
  - `Guardado: scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html | tamaño: 9380 chars`
  - `Done.`
- Archivos generados por el diagnóstico:
  - `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
  - `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
- Nota: `scripts/tabla-horario.html` y `scripts/tabla-celdas.json` no se generaron en esta corrida (no se detectó tabla semanal en los frames capturados).
