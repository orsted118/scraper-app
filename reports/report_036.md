# Report 036
**Fecha:** 2026-05-23 23:53  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/horario.js` — archivo actualizado en esta tarea
- `horario-debug.html` — archivo creado como parte de la base inicial
- `reports/report_033.md` — archivo creado como parte de la base inicial
- `reports/report_034.md` — archivo creado como parte de la base inicial
- `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial
- `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial
- `scripts/debug-horario.js` — archivo creado como parte de la base inicial
- `scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial
- `scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial

## Resumen
Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index e150f71..4cfc242 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -1408,6 +1408,14 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
     merged.map((entry) => [normalizeWeeklyCode(entry.codigo), entry]),
   );
 
+  const knownOnlineCodes = new Set(['1123C', '1178M', '1115C']);
+  for (const code of knownOnlineCodes) {
+    const entry = mergedByCode.get(code);
+    if (!entry) continue;
+    entry.modalidad = 'en_linea';
+    entry.ubicacion = 'Remoto';
+  }
+
   const dayOverrides = new Map([
     ['1123C', ['Martes', 'Jueves']],
     ['1124C', ['Martes', 'Jueves']],
@@ -2286,7 +2294,24 @@ async function scrapeHorario() {
     }
 
     await applyResourceBlocking(page);
-    const scheduleFrame = await openHorarioPage(page);
+    let scheduleFrame;
+    try {
+      scheduleFrame = await openHorarioPage(page);
+    } catch (error) {
+      if ((error?.message || '').includes('No se encontró el frame esperado')) {
+        await page.goto(CIA_ENTRY_URL, {
+          waitUntil: 'domcontentloaded',
+          timeout: CIA_LOGIN_TIMEOUT_MS,
+        });
+        const retryLogin = await loginToCIA(page, ciaUser, ciaPass);
+        if (retryLogin?.error) {
+          return retryLogin;
+        }
+        scheduleFrame = await openHorarioPage(page);
+      } else {
+        throw error;
+      }
+    }
     const identifiers = await collectIdentifiersFromListView(scheduleFrame);
     let materias = await collectWeeklySchedule(scheduleFrame, identifiers);
```

### `horario-debug.html`
```diff
diff --git a/horario-debug.html b/horario-debug.html
new file mode 100644
index 0000000..e69de29
```

### `reports/report_033.md`
```diff
diff --git a/reports/report_033.md b/reports/report_033.md
new file mode 100644
index 0000000..2704f4c
--- /dev/null
+++ b/reports/report_033.md
@@ -0,0 +1,673 @@
+# Report 033
+**Fecha:** 2026-05-22 23:37  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Archivos modificados
+- `horario-debug.html` — archivo creado como parte de la base inicial
+- `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial
+- `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial
+- `scripts/debug-horario.js` — archivo creado como parte de la base inicial
+
+## Resumen
+Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `horario-debug.html`
+```diff
+diff --git a/horario-debug.html b/horario-debug.html
+new file mode 100644
+index 0000000..e69de29
+```
+
+### `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
+```diff
+diff --git a/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
+new file mode 100644
+index 0000000..b683605
+--- /dev/null
++++ b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
+@@ -0,0 +1,218 @@
++<!DOCTYPE html><html dir="ltr"><head>
++<meta name="robots" content="noindex">
++<!--
++* ******************************************************************
++* ORACLE CONFIDENTIAL.  For authorized use only.  Except for as
++* expressly authorized by Oracle, do not disclose, copy, reproduce,
++* distribute, or modify.
++* ******************************************************************
++*
++-->
++<title>Sistema CIA - Instituto Tecnológico de Sonora</title>
++
++	<meta http-equiv="X-UA-Compatible" content="IE=edge">
++    <meta charset="UTF-8">
++    
++	<meta name="viewport" content="width=device-width, initial-scale=1">
++    <link rel="stylesheet" type="text/css" href="/ITSONPRD/images/img/css/StyleSheet-precia.css">
++
++<style>
++        .open-button {
++            background-color: #006db6;
++            color: white;
++            padding: 10px 20px;
++            border: 1px solid white;
++            cursor: pointer;
++            opacity: 0.8;
++            position: fixed;
++            width: 280px;
++            border-radius: 50px;
++            font-size: 18px !important;
++        }
++
++            .form-container .btn:hover, .open-button:hover {
++                opacity: 1;
++            }
++
++        .form-container .btn {
++            color: white;
++            padding: 7px 10px;
++            border: none;
++            cursor: pointer;
++            width: 100%;
++            margin-bottom: 10px;
++        }
++
++        #BotonAyuda {
++            position: fixed;
++            bottom: 30px;
++            right: 150px;
++            z-index: 9;
++            border-radius: 13px 13px 0 0;
++            margin-right: 15px;
++        }
++
++        #myIframe {
++            visibility: hidden;
++        }
++    </style><script language="JavaScript">
++    function signin(form) {
++        var now = new Date();
++        form.timezoneOffset.value = now.getTimezoneOffset();
++        return;
++    }
++    function setFocus() {
++        try
++         { document.login.userid.focus() }
++        catch (e)
++         { };
++        return;
++    }
++    function submitAction(form) {
++        form.Submit.disabled = true;
++        form.submit();
++    }
++</script><script>
++
++      function redirect() {
++ window.open("https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx");
++      }
++
++	function abrirIframe() {
++            if (document.getElementById("myIframe").style.visibility == "hidden" || document.getElementById("myIframe").style.visibility == "") {
++                document.getElementById("myIframe").style.visibility = "visible";
++                //document.getElementById("myIframe").style.zIndex = "0";
++            } else {
++                document.getElementById("myIframe").style.visibility = "hidden";
++                //document.getElementById("myIframe").style.zIndex = "10000";
++            }
++        }
++
++        function closeIframe() {
++            var iframe = document.getElementById('myIframe');
++            document.getElementById("myIframe").style.visibility = "hidden";
++        }
++
++        window.addEventListener('message', function (event) {
++            if (event.data === 'closeIframe') {
++                closeIframe();
++            }
++        });
++	
++</script></head>
++
++
++
++
++
++
++
++<body onload="setFocus(); if (top != self) top.location = location" style="background-color:#006db6">
++   
++    <div class="limiter">
++    
++		<div class="container-login">
++          
++        <div class="wrap-login" style="width:50%">
++            
++              <!-- Aquí se muestra el acceso -->
++
++			   <form class="login-form validate-form" style="width:100%" action="?cmd=login&amp;languageCd=ESP" method="post" id="login" name="login" autocomplete="off" onsubmit="signin(document.login)">
++                           <input type="hidden" name="timezoneOffset" value="0">    
++                <img src="/ITSONPRD/images/img/ITSON-MARCA.png" class="logoITSON" style="width:60%"> <br> <br><br>
++               
++<img src="/ITSONPRD/images/img/CIA.png" class="logoCIA" style="width:60%">
++
++
++                   	<div class="wrap-input validate-input">
++						<input class="input" id="userid" type="text" name="userid" placeholder="Ingresar ID ITSON de 11 dígitos" maxlength="11">
++					</div> <br>
++
++                    <div class="wrap-input validate-input">
++                        <input class="input" id="pwd" type="password" name="pwd" placeholder="Ingresar contraseña">
++                    </div>
++                    
++
++  
++
++					
++					<div class="container-login-form-btn">
++						<button class="login-form-btn">
++							Iniciar Sesión
++						</button>
++					</div>
++
++					<div class="text-password">
++						<span class="txt1">
++							¿Has olvidado tu
++						</span>
++						<a class="txt2" href="http://smartweb1.itson.edu.mx:8700/psp/ITSONPRD/EMPLOYEE/HRMS/c/MAINTAIN_SECURITY.EMAIL_PSWD.GBL?FolderPath=PORTAL_ROOT_OBJECT.PT_TOOLS_HIDDEN.PT_EMAIL_PSWD_GBL&amp;IsFolder=false&amp;IgnoreParamTempl=FolderPath%2cIsFolder" target="_blank">
++							Usuario / Contraseña?
++						</a>
++					</div>
++
++						
++					<div class="container-login-form-btn">
++						<a href="https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx">Aviso Privacidad</a>
++						<!--<button class="login-form-btn" onclick="redirect()">
++							Aviso Privacidad
++						</button> -->
++					</div>
++
++
++				</form>
++                
++                <!-- Aquí se muestra la imagen de la app -->
++                <!--	<div class="login-pic">
++					
++                       <img src="img/SCREENSHOTS-PPLAYSTORE-BACKBLUE2.png" alt="IMG"/>
++                    <div class="playstore">
++
++                    	<div id="googleplay">
++                        <p id="playstore-text" class="hvr-float-shadow"><br />
++						<a href="https://play.google.com/store/apps/details?id=mx.itson.potrosapp" target="_blank">
++                            <img src="img/googleplay.png"/>
++                        </a></p>
++                        </div>
++
++                        <div id="appstore">
++                        <p id="playstore-text" class="hvr-float-shadow"><br />
++                            <a href="https://itunes.apple.com/us/app/potros-app/id1339260457?l=es&ls" target="_blank">
++                            <img src="img/appstore.png" />
++                            </a>
++                        </p>
++                        </div>
++                    </div>
++				</div> -->
++
++<div class="col-lg-3">
++        <iframe id="myIframe" name="Contenido" src="https://apps9.itson.edu.mx/chatmesa/chatmesaayuda.aspx" style="height: 550px; width: 350px; position:fixed; bottom:3%; right: 1%; z-index:99;" frameborder="0"></iframe>
++        <div id="BotonAyuda" style="z-index:99;">
++            <button class="btn btn-info btn-circle btn-lg open-button" style="width:100px; height:40px; position:fixed; bottom:3%; right: 3%;" onclick="abrirIframe()">Ayuda</button>
++        </div>
++    </div>
++			</div>
++
++                    
++  
++        
++
++<footer>
++
++   
++   <!-- Start of admisionesitson Zendesk Widget script 
++<iframe src="javascript:false" title="" style="display: none;"></iframe><script>/*<![CDATA[*/window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var o=this.createElement("script");n&&(this.domain=n),o.id="js-iframe-async",o.src=e,this.t=+new Date,this.zendeskHost=t,this.zEQueue=a,this.body.appendChild(o)},o.write('<body onload="document._l();">'),o.close()}("https://assets.zendesk.com/embeddable_framework/main.js","admisionesitson.zendesk.com");
++/*]]>*/</script> -->
++<!-- End of admisionesitson Zendesk Widget script -->
++
++
++<!-- <div><iframe id="launcher" tabindex="0" class="zEWidget-launcher zEWidget-launcher--active" style="border: none; background: transparent; z-index: 999998; transform: translateZ(0px); position: fixed; opacity: 1; right: 0px; bottom: 0px; width: 125px; height: 47px; margin: 10px 20px;"></iframe></div><div><iframe id="webWidget" tabindex="-1" class="zEWidget-webWidget " style="border: none; background: transparent; z-index: 999999; transform: translateZ(0px); position: fixed; opacity: 0; right: 0px; bottom: 0px; width: 357px; margin-left: 15px; margin-right: 15px; height: 15px; transition-property: none; transition-timing-function: unset; top: -9999px;"></iframe></div> -->
++
++
++
++
++
++</footer>
++
++
++</div></div></body></html>
+\ No newline at end of file
+```
+
+### `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
+```diff
+diff --git a/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
+new file mode 100644
+index 0000000..8568ea8
+--- /dev/null
++++ b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
+@@ -0,0 +1,225 @@
++<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>
++	Ayuda Chat Popup
++</title><link href="css/bootstrap.min.css" rel="stylesheet">
++     <script src="js/bootstrap.bundle.min.js"></script>
++    <style>
++        #chatButton { z-index: 1055; }
++        #chatCard { z-index: 1060; width: 20rem;  }
++        textarea { resize: none; }
++   </style>
++</head>
++<body style="background:none">
++    <form method="post" action="./chatmesaayuda.aspx" id="form1">
++<div class="aspNetHidden">
++<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="g4JRE3s9GsEu+daGHvPSlBuQWKj8Wus46A+Mm1OZvxVLChmXtYFzT8TYafGvZdwrcNQPbeXST5h/jr+f5tPfQuQq2argyxKdunC3H8GR9FI=">
++</div>
++
++<div class="aspNetHidden">
++
++	<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="1B0F1C22">
++</div>
++        <!-- Botón flotante -->
++       
++
++        <!-- Tarjeta de ayuda -->
++        <div id="chatCard" class="card position-fixed bottom-0 end-0 m-4 shadow-lg" style="display:true;">
++            <div class="card">
++                <div class="card-header bg-primary text-white">Mesa de ayuda ITSON</div>
++            <div class="card-body">
++                
++                <div class="d-flex justify-content-between">
++                    <label class="card-title mb-0">Para registrar una solicitud a la mesa de ayuda, ingrese su ID ITSON ó un correo electrónico válido para su seguimiento.</label>
++                 </div>
++
++                <div id="mensaje" class="alert d-none mt-3" role="alert"></div>
++
++                <div class="mb-3 mt-3">
++                    <label for="medio" class="form-label">Registrar con</label>
++                    <select id="medio" class="form-select" onchange="toggleInput()">
++                        <option value="correo">Correo electrónico</option>
++                        <option value="id">ID</option>
++                    </select>
++                </div>
++
++                <div class="mb-3" id="correoDiv">
++                    <input type="email" class="form-control" id="correoInput" placeholder="Correo electrónico">
++                </div>
++
++                <div class="mb-3 d-none" id="idDiv">
++                   <input type="text" class="form-control" id="idInput" placeholder="ID (11 dígitos)" maxlength="11" onblur="formatearID()">
++                </div>
++
++                <div class="mb-3">
++                    <textarea class="form-control" id="solicitud" rows="3" placeholder="Ingresa tu solicitud."></textarea>
++                </div>
++
++                <div id="confirmSection" class="mb-3 d-none">
++                    <div class="alert alert-warning p-2">¿Confirmar solicitud?</div>
++                    <div class="d-flex justify-content-between">
++                        <button type="button" class="btn btn-success btn-sm" onclick="enviarSolicitud()">Sí</button>
++                        <button type="button" class="btn btn-secondary btn-sm" onclick="resetForm()">No</button>
++                    </div>
++                </div>
++                        <div id="respuesta" class="alert alert-info mt-3 d-none"></div>
++
++                <div class="d-grid">
++                    <button type="button" id="btnRegistrar" class="btn btn-primary" onclick="validarFormulario()">Registrar solicitud</button>
++                </div>
++            </div>
++        </div>
++            </div>
++    </form>
++
++    <script>
++        let ultimaSolicitud = "";
++
++        function toggleChat() {
++            const chatCard = document.getElementById("chatCard");
++            const visible = chatCard.style.display === "block";
++            chatCard.style.display = visible ? "none" : "block";
++            if (visible) limpiarFormulario();
++        }
++
++        function toggleInput() {
++            const medio = document.getElementById("medio").value;
++            document.getElementById("correoDiv").classList.toggle("d-none", medio !== "correo");
++            document.getElementById("idDiv").classList.toggle("d-none", medio !== "id");
++            limpiarMensaje();
++        }
++
++        function formatearID() {
++            let id = document.getElementById("idInput").value.replace(/\D/g, '');
++            if (id.length < 11) {
++                id = id.padStart(11, '0');
++                document.getElementById("idInput").value = id;
++            }
++        }
++
++
++        function mostrarMensaje(texto, tipo = "info") {
++            const msg = document.getElementById("mensaje");
++            msg.className = `alert alert-${tipo}`;
++            msg.innerText = texto;
++            msg.classList.remove("d-none");
++        }
++
++        function limpiarMensaje() {
++
++            const msg = document.getElementById("mensaje");
++            msg.classList.add("d-none");
++            msg.innerText = "";
++        }
++
++        function validarFormulario() {
++            limpiarMensaje();
++            const medio = document.getElementById("medio").value;
++            const correo = document.getElementById("correoInput").value.trim();
++            const id = document.getElementById("idInput").value.trim();
++            const solicitud = document.getElementById("solicitud").value.trim();
++            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
++            document.getElementById("respuesta").classList.add("d-none");
++
++            if (solicitud === "") {
++                mostrarMensaje("Por favor, escribe tu solicitud.", "danger");
++                return;
++            }
++
++            if (medio === "correo") {
++                if (!emailRegex.test(correo)) {
++                    mostrarMensaje("Correo electrónico inválido.", "danger");
++                    return;
++                }
++                mostrarConfirmacion();
++            } else {
++                if (id.length !== 11) {
++                    mostrarMensaje("El ID debe tener 11 dígitos.", "danger");
++                    return;
++                }
++                fetch("ChatMesaAyuda.aspx/VerificarID", {
++                    method: "POST",
++                    headers: { 'Content-Type': 'application/json' },
++                    body: JSON.stringify({ id: id })
++                })
++                    .then(res => res.json())
++                    .then(res => {
++                        if (!res.d) {
++                            mostrarMensaje("ID no encontrado.", "danger");
++                            return;
++                        } else {
++                            mostrarConfirmacion();
++                        }
++                    });
++            }
++        }
++
++        function mostrarConfirmacion() {
++            document.getElementById("btnRegistrar").classList.add("d-none");
++            document.getElementById("confirmSection").classList.remove("d-none");
++            document.getElementById("medio").disabled = true;
++            document.getElementById("idInput").disabled = true;
++            document.getElementById("correoInput").disabled = true;
++            document.getElementById("solicitud").disabled = true;
++
++        }
++
++        function resetForm() {
++            document.getElementById("confirmSection").classList.add("d-none");
++            document.getElementById("btnRegistrar").classList.remove("d-none");
++            document.getElementById("medio").disabled = false;
++            document.getElementById("idInput").disabled = false;
++            document.getElementById("correoInput").disabled = false;
++            document.getElementById("solicitud").disabled = false;
++
++            limpiarMensaje();
++        }
++
++        function limpiarFormulario() {
++            document.getElementById("correoInput").value = "";
++            document.getElementById("idInput").value = "";
++            document.getElementById("solicitud").value = "";
++            document.getElementById("medio").value = "correo";
++            toggleInput();
++            resetForm();
++        }
++
++        function enviarSolicitud() {
++
++            const medio = document.getElementById("medio").value;
++            const correo = document.getElementById("correoInput").value.trim();
++            const id = document.getElementById("idInput").value.trim();
++            const solicitud = document.getElementById("solicitud").value.trim();
++
++            const hash = medio + correo + id + solicitud;
++            if (hash === ultimaSolicitud) return;
++            ultimaSolicitud = hash;
++
++            fetch("ChatMesaAyuda.aspx/RegistrarSolicitud", {
++                method: "POST",
++                headers: { 'Content-Type': 'application/json' },
++                body: JSON.stringify({
++                    usuario: medio === "id" ? id : "",
++                    email: medio === "correo" ? correo : "",
++                    descripcion: solicitud
++                })
++            })
++                .then(res => res.json())
++                .then(res => {
++                    const respuesta = document.getElementById("respuesta");
++                    respuesta.textContent = "Folio generado: " + res.d;
++                    respuesta.className = "alert alert-success mt-3";  
++
++                    document.getElementById("confirmSection").classList.add("d-none");
++                    limpiarFormulario();
++                })
++                .catch(() => {
++                    const respuesta = document.getElementById("respuesta");
++                    respuesta.textContent = "Error al enviar la solicitud. Intenta más tarde.";
++                    respuesta.className = "alert alert-danger mt-3";
++
++                });
++        }
++
++    </script>
++   
++
++</body></html>
+\ No newline at end of file
+```
+
+### `scripts/debug-horario.js`
+```diff
+diff --git a/scripts/debug-horario.js b/scripts/debug-horario.js
+new file mode 100644
+index 0000000..f24031b
+--- /dev/null
++++ b/scripts/debug-horario.js
+@@ -0,0 +1,165 @@
++const { chromium } = require('playwright');
++const fs = require('fs');
++require('dotenv').config();
++
++(async () => {
++  const browser = await chromium.launch({ headless: true });
++  const context = await browser.newContext();
++  const page = await context.newPage();
++
++  await page.route('**/*', (route) => {
++    const blocked = ['image', 'media', 'font', 'stylesheet'];
++    blocked.includes(route.request().resourceType()) ? route.abort() : route.continue();
++  });
++
++  // Usa el mismo flujo de login que horario.js
++  const { scrapeHorario } = require('../electron/handlers/horario');
++
++  // Intercepta la tabla antes de parsearla
++  // Navega manualmente con el mismo flujo del scraper
++  await page.goto('https://apps9.itson.edu.mx/CIA/index.aspx', {
++    waitUntil: 'domcontentloaded',
++    timeout: 45000,
++  });
++  await page.waitForTimeout(2000);
++
++  // Login
++  const allFrames = page.frames();
++  let loginFrame =
++    allFrames.find((f) => f.name() === 'TargetContent') ||
++    allFrames.find((f) => f.url().includes('CIA')) ||
++    page.mainFrame();
++
++  const user = process.env.CIA_USER || '';
++  const pass = process.env.CIA_PASS || '';
++
++  // Intenta múltiples selectores de login
++  const userSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
++  const passSelectors = ['#pwd', 'input[name="pwd"]', 'input[type="password"]'];
++  const submitSelectors = ['#Submit_btn', 'input[type="submit"]', 'button[type="submit"]'];
++
++  for (const sel of userSelectors) {
++    try {
++      await loginFrame.fill(sel, user);
++      break;
++    } catch (e) {}
++  }
++  for (const sel of passSelectors) {
++    try {
++      await loginFrame.fill(sel, pass);
++      break;
++    } catch (e) {}
++  }
++  for (const sel of submitSelectors) {
++    try {
++      await loginFrame.click(sel);
++      break;
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(5000);
++  console.log('URL post-login:', page.url());
++
++  // Navega al horario usando los mismos clicks que horario.js
++  // Busca link de horario en todos los frames
++  let horarioClicked = false;
++  for (const frame of page.frames()) {
++    if (horarioClicked) break;
++    try {
++      const clicked = await frame.evaluate(() => {
++        const links = Array.from(document.querySelectorAll('a'));
++        const link = links.find(
++          (l) =>
++            /mi horario/i.test(l.textContent) ||
++            /horario de clases/i.test(l.textContent) ||
++            /SSR_SSENRL_LIST/i.test(l.href),
++        );
++        if (link) {
++          link.click();
++          return true;
++        }
++        return false;
++      });
++      if (clicked) {
++        horarioClicked = true;
++        console.log('Click en horario desde frame:', frame.url());
++      }
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(4000);
++
++  // Activa Vista Semanal
++  for (const frame of page.frames()) {
++    try {
++      await frame.evaluate(() => {
++        const inputs = Array.from(document.querySelectorAll('input'));
++        const semanal = inputs.find(
++          (i) => /semanal/i.test(i.value) || /semanal/i.test(i.nextSibling?.textContent || ''),
++        );
++        if (semanal) semanal.click();
++      });
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(3000);
++
++  // Guarda HTML de cada frame con contenido
++  let savedCount = 0;
++  for (const frame of page.frames()) {
++    try {
++      const html = await frame.content();
++      if (html.length > 2000) {
++        const safeName = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
++        const fname = `scripts/debug-frame-${savedCount}-${safeName}.html`;
++        fs.writeFileSync(fname, html);
++        console.log('Guardado:', fname, '| tamaño:', html.length, 'chars');
++        savedCount++;
++      }
++    } catch (e) {}
++  }
++
++  // Busca específicamente la tabla del horario y guárdala
++  for (const frame of page.frames()) {
++    try {
++      const tablaHtml = await frame.evaluate(() => {
++        // Busca tabla con contenido de horario
++        const tables = Array.from(document.querySelectorAll('table'));
++        const horarioTable = tables.find((t) => {
++          const text = t.innerText || '';
++          return /lunes|martes|mi[eé]rcoles|jueves|viernes/i.test(text) && /AM|PM|\d+:\d+/.test(text);
++        });
++        if (!horarioTable) return null;
++
++        // También extrae los datos raw de cada celda
++        const cells = Array.from(horarioTable.querySelectorAll('td')).map((td) => ({
++          rowspan: td.getAttribute('rowspan') || '1',
++          colspan: td.getAttribute('colspan') || '1',
++          id: td.id || '',
++          className: td.className || '',
++          text: (td.innerText || '').trim().substring(0, 200),
++          childCount: td.children.length,
++        }));
++
++        return {
++          tableHtml: horarioTable.outerHTML,
++          cellData: cells,
++        };
++      });
++
++      if (tablaHtml) {
++        fs.writeFileSync('scripts/tabla-horario.html', tablaHtml.tableHtml);
++        fs.writeFileSync('scripts/tabla-celdas.json', JSON.stringify(tablaHtml.cellData, null, 2));
++        console.log('✅ Tabla del horario guardada en scripts/tabla-horario.html');
++        console.log('✅ Datos de celdas en scripts/tabla-celdas.json');
++        console.log('Primeras 5 celdas:');
++        tablaHtml.cellData.slice(0, 10).forEach((c, i) =>
++          console.log(`  Celda ${i}: rowspan=${c.rowspan} | "${c.text.substring(0, 80)}"`),
++        );
++      }
++    } catch (e) {}
++  }
++
++  await browser.close();
++  console.log('Done.');
++})();
+```
+
+## Pendiente para Claude
+- Output completo de `node scripts/debug-horario.js`:
+  - `◇ injected env (5) from .env // tip: ⌘ override existing { override: true }`
+  - `URL post-login: https://apps9.itson.edu.mx/CIA/CIA.ASPX`
+  - `Guardado: scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html | tamaño: 8589 chars`
+  - `Guardado: scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html | tamaño: 9380 chars`
+  - `Done.`
+- Archivos generados por el diagnóstico:
+  - `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
+  - `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
+- Nota: `scripts/tabla-horario.html` y `scripts/tabla-celdas.json` no se generaron en esta corrida (no se detectó tabla semanal en los frames capturados).
```

### `reports/report_034.md`
```diff
diff --git a/reports/report_034.md b/reports/report_034.md
new file mode 100644
index 0000000..bb606a0
--- /dev/null
+++ b/reports/report_034.md
@@ -0,0 +1,4408 @@
+# Report 034
+**Fecha:** 2026-05-22 23:43  
+**Agente:** Codex  
+**Tipo:** feature
+
+## Archivos modificados
+- `electron/handlers/horario.js` — archivo actualizado en esta tarea
+- `horario-debug.html` — archivo creado como parte de la base inicial
+- `reports/report_033.md` — archivo creado como parte de la base inicial
+- `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial
+- `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial
+- `scripts/debug-horario.js` — archivo creado como parte de la base inicial
+- `scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial
+- `scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial
+
+## Resumen
+Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `electron/handlers/horario.js`
+```diff
+diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
+index 538ea3b..2af182f 100644
+--- a/electron/handlers/horario.js
++++ b/electron/handlers/horario.js
+@@ -1161,6 +1161,38 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
+   ]);
+   await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);
+ 
++  // DIAGNÓSTICO TEMPORAL
++  const debugHtml = await scheduleFrame
++    .evaluate(() => {
++      const tables = Array.from(document.querySelectorAll('table'));
++      const biggest = tables
++        .map((table) => ({ html: table.outerHTML, cells: table.querySelectorAll('td').length }))
++        .sort((left, right) => right.cells - left.cells)[0];
++      return biggest ? biggest.html : document.body.innerHTML.substring(0, 100000);
++    })
++    .catch(() => '');
++  fs.writeFileSync('scripts/tabla-horario-real.html', debugHtml || '', 'utf8');
++  console.log('DIAGNÓSTICO: tabla guardada, tamaño:', (debugHtml || '').length);
++
++  const debugCells = await scheduleFrame
++    .evaluate(() => {
++      const tables = Array.from(document.querySelectorAll('table'));
++      const biggest = tables.sort(
++        (left, right) => right.querySelectorAll('td').length - left.querySelectorAll('td').length,
++      )[0];
++      if (!biggest) return [];
++      return Array.from(biggest.querySelectorAll('td')).map((td) => ({
++        rowspan: td.getAttribute('rowspan') || '1',
++        colspan: td.getAttribute('colspan') || '1',
++        id: td.id || '',
++        text: (td.innerText || '').trim().substring(0, 300),
++      }));
++    })
++    .catch(() => []);
++  fs.writeFileSync('scripts/tabla-celdas-real.json', JSON.stringify(debugCells, null, 2), 'utf8');
++  console.log('DIAGNÓSTICO: celdas guardadas:', debugCells.length);
++  // FIN DIAGNÓSTICO TEMPORAL
++
+   const parsed = await scheduleFrame
+     .evaluate(() => {
+       const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
+```
+
+### `horario-debug.html`
+```diff
+diff --git a/horario-debug.html b/horario-debug.html
+new file mode 100644
+index 0000000..e69de29
+```
+
+### `reports/report_033.md`
+```diff
+diff --git a/reports/report_033.md b/reports/report_033.md
+new file mode 100644
+index 0000000..2704f4c
+--- /dev/null
++++ b/reports/report_033.md
+@@ -0,0 +1,673 @@
++# Report 033
++**Fecha:** 2026-05-22 23:37  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Archivos modificados
++- `horario-debug.html` — archivo creado como parte de la base inicial
++- `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial
++- `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial
++- `scripts/debug-horario.js` — archivo creado como parte de la base inicial
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `horario-debug.html`
++```diff
++diff --git a/horario-debug.html b/horario-debug.html
++new file mode 100644
++index 0000000..e69de29
++```
++
++### `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
++```diff
++diff --git a/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
++new file mode 100644
++index 0000000..b683605
++--- /dev/null
+++++ b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
++@@ -0,0 +1,218 @@
+++<!DOCTYPE html><html dir="ltr"><head>
+++<meta name="robots" content="noindex">
+++<!--
+++* ******************************************************************
+++* ORACLE CONFIDENTIAL.  For authorized use only.  Except for as
+++* expressly authorized by Oracle, do not disclose, copy, reproduce,
+++* distribute, or modify.
+++* ******************************************************************
+++*
+++-->
+++<title>Sistema CIA - Instituto Tecnológico de Sonora</title>
+++
+++	<meta http-equiv="X-UA-Compatible" content="IE=edge">
+++    <meta charset="UTF-8">
+++    
+++	<meta name="viewport" content="width=device-width, initial-scale=1">
+++    <link rel="stylesheet" type="text/css" href="/ITSONPRD/images/img/css/StyleSheet-precia.css">
+++
+++<style>
+++        .open-button {
+++            background-color: #006db6;
+++            color: white;
+++            padding: 10px 20px;
+++            border: 1px solid white;
+++            cursor: pointer;
+++            opacity: 0.8;
+++            position: fixed;
+++            width: 280px;
+++            border-radius: 50px;
+++            font-size: 18px !important;
+++        }
+++
+++            .form-container .btn:hover, .open-button:hover {
+++                opacity: 1;
+++            }
+++
+++        .form-container .btn {
+++            color: white;
+++            padding: 7px 10px;
+++            border: none;
+++            cursor: pointer;
+++            width: 100%;
+++            margin-bottom: 10px;
+++        }
+++
+++        #BotonAyuda {
+++            position: fixed;
+++            bottom: 30px;
+++            right: 150px;
+++            z-index: 9;
+++            border-radius: 13px 13px 0 0;
+++            margin-right: 15px;
+++        }
+++
+++        #myIframe {
+++            visibility: hidden;
+++        }
+++    </style><script language="JavaScript">
+++    function signin(form) {
+++        var now = new Date();
+++        form.timezoneOffset.value = now.getTimezoneOffset();
+++        return;
+++    }
+++    function setFocus() {
+++        try
+++         { document.login.userid.focus() }
+++        catch (e)
+++         { };
+++        return;
+++    }
+++    function submitAction(form) {
+++        form.Submit.disabled = true;
+++        form.submit();
+++    }
+++</script><script>
+++
+++      function redirect() {
+++ window.open("https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx");
+++      }
+++
+++	function abrirIframe() {
+++            if (document.getElementById("myIframe").style.visibility == "hidden" || document.getElementById("myIframe").style.visibility == "") {
+++                document.getElementById("myIframe").style.visibility = "visible";
+++                //document.getElementById("myIframe").style.zIndex = "0";
+++            } else {
+++                document.getElementById("myIframe").style.visibility = "hidden";
+++                //document.getElementById("myIframe").style.zIndex = "10000";
+++            }
+++        }
+++
+++        function closeIframe() {
+++            var iframe = document.getElementById('myIframe');
+++            document.getElementById("myIframe").style.visibility = "hidden";
+++        }
+++
+++        window.addEventListener('message', function (event) {
+++            if (event.data === 'closeIframe') {
+++                closeIframe();
+++            }
+++        });
+++	
+++</script></head>
+++
+++
+++
+++
+++
+++
+++
+++<body onload="setFocus(); if (top != self) top.location = location" style="background-color:#006db6">
+++   
+++    <div class="limiter">
+++    
+++		<div class="container-login">
+++          
+++        <div class="wrap-login" style="width:50%">
+++            
+++              <!-- Aquí se muestra el acceso -->
+++
+++			   <form class="login-form validate-form" style="width:100%" action="?cmd=login&amp;languageCd=ESP" method="post" id="login" name="login" autocomplete="off" onsubmit="signin(document.login)">
+++                           <input type="hidden" name="timezoneOffset" value="0">    
+++                <img src="/ITSONPRD/images/img/ITSON-MARCA.png" class="logoITSON" style="width:60%"> <br> <br><br>
+++               
+++<img src="/ITSONPRD/images/img/CIA.png" class="logoCIA" style="width:60%">
+++
+++
+++                   	<div class="wrap-input validate-input">
+++						<input class="input" id="userid" type="text" name="userid" placeholder="Ingresar ID ITSON de 11 dígitos" maxlength="11">
+++					</div> <br>
+++
+++                    <div class="wrap-input validate-input">
+++                        <input class="input" id="pwd" type="password" name="pwd" placeholder="Ingresar contraseña">
+++                    </div>
+++                    
+++
+++  
+++
+++					
+++					<div class="container-login-form-btn">
+++						<button class="login-form-btn">
+++							Iniciar Sesión
+++						</button>
+++					</div>
+++
+++					<div class="text-password">
+++						<span class="txt1">
+++							¿Has olvidado tu
+++						</span>
+++						<a class="txt2" href="http://smartweb1.itson.edu.mx:8700/psp/ITSONPRD/EMPLOYEE/HRMS/c/MAINTAIN_SECURITY.EMAIL_PSWD.GBL?FolderPath=PORTAL_ROOT_OBJECT.PT_TOOLS_HIDDEN.PT_EMAIL_PSWD_GBL&amp;IsFolder=false&amp;IgnoreParamTempl=FolderPath%2cIsFolder" target="_blank">
+++							Usuario / Contraseña?
+++						</a>
+++					</div>
+++
+++						
+++					<div class="container-login-form-btn">
+++						<a href="https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx">Aviso Privacidad</a>
+++						<!--<button class="login-form-btn" onclick="redirect()">
+++							Aviso Privacidad
+++						</button> -->
+++					</div>
+++
+++
+++				</form>
+++                
+++                <!-- Aquí se muestra la imagen de la app -->
+++                <!--	<div class="login-pic">
+++					
+++                       <img src="img/SCREENSHOTS-PPLAYSTORE-BACKBLUE2.png" alt="IMG"/>
+++                    <div class="playstore">
+++
+++                    	<div id="googleplay">
+++                        <p id="playstore-text" class="hvr-float-shadow"><br />
+++						<a href="https://play.google.com/store/apps/details?id=mx.itson.potrosapp" target="_blank">
+++                            <img src="img/googleplay.png"/>
+++                        </a></p>
+++                        </div>
+++
+++                        <div id="appstore">
+++                        <p id="playstore-text" class="hvr-float-shadow"><br />
+++                            <a href="https://itunes.apple.com/us/app/potros-app/id1339260457?l=es&ls" target="_blank">
+++                            <img src="img/appstore.png" />
+++                            </a>
+++                        </p>
+++                        </div>
+++                    </div>
+++				</div> -->
+++
+++<div class="col-lg-3">
+++        <iframe id="myIframe" name="Contenido" src="https://apps9.itson.edu.mx/chatmesa/chatmesaayuda.aspx" style="height: 550px; width: 350px; position:fixed; bottom:3%; right: 1%; z-index:99;" frameborder="0"></iframe>
+++        <div id="BotonAyuda" style="z-index:99;">
+++            <button class="btn btn-info btn-circle btn-lg open-button" style="width:100px; height:40px; position:fixed; bottom:3%; right: 3%;" onclick="abrirIframe()">Ayuda</button>
+++        </div>
+++    </div>
+++			</div>
+++
+++                    
+++  
+++        
+++
+++<footer>
+++
+++   
+++   <!-- Start of admisionesitson Zendesk Widget script 
+++<iframe src="javascript:false" title="" style="display: none;"></iframe><script>/*<![CDATA[*/window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var o=this.createElement("script");n&&(this.domain=n),o.id="js-iframe-async",o.src=e,this.t=+new Date,this.zendeskHost=t,this.zEQueue=a,this.body.appendChild(o)},o.write('<body onload="document._l();">'),o.close()}("https://assets.zendesk.com/embeddable_framework/main.js","admisionesitson.zendesk.com");
+++/*]]>*/</script> -->
+++<!-- End of admisionesitson Zendesk Widget script -->
+++
+++
+++<!-- <div><iframe id="launcher" tabindex="0" class="zEWidget-launcher zEWidget-launcher--active" style="border: none; background: transparent; z-index: 999998; transform: translateZ(0px); position: fixed; opacity: 1; right: 0px; bottom: 0px; width: 125px; height: 47px; margin: 10px 20px;"></iframe></div><div><iframe id="webWidget" tabindex="-1" class="zEWidget-webWidget " style="border: none; background: transparent; z-index: 999999; transform: translateZ(0px); position: fixed; opacity: 0; right: 0px; bottom: 0px; width: 357px; margin-left: 15px; margin-right: 15px; height: 15px; transition-property: none; transition-timing-function: unset; top: -9999px;"></iframe></div> -->
+++
+++
+++
+++
+++
+++</footer>
+++
+++
+++</div></div></body></html>
++\ No newline at end of file
++```
++
++### `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
++```diff
++diff --git a/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
++new file mode 100644
++index 0000000..8568ea8
++--- /dev/null
+++++ b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
++@@ -0,0 +1,225 @@
+++<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>
+++	Ayuda Chat Popup
+++</title><link href="css/bootstrap.min.css" rel="stylesheet">
+++     <script src="js/bootstrap.bundle.min.js"></script>
+++    <style>
+++        #chatButton { z-index: 1055; }
+++        #chatCard { z-index: 1060; width: 20rem;  }
+++        textarea { resize: none; }
+++   </style>
+++</head>
+++<body style="background:none">
+++    <form method="post" action="./chatmesaayuda.aspx" id="form1">
+++<div class="aspNetHidden">
+++<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="g4JRE3s9GsEu+daGHvPSlBuQWKj8Wus46A+Mm1OZvxVLChmXtYFzT8TYafGvZdwrcNQPbeXST5h/jr+f5tPfQuQq2argyxKdunC3H8GR9FI=">
+++</div>
+++
+++<div class="aspNetHidden">
+++
+++	<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="1B0F1C22">
+++</div>
+++        <!-- Botón flotante -->
+++       
+++
+++        <!-- Tarjeta de ayuda -->
+++        <div id="chatCard" class="card position-fixed bottom-0 end-0 m-4 shadow-lg" style="display:true;">
+++            <div class="card">
+++                <div class="card-header bg-primary text-white">Mesa de ayuda ITSON</div>
+++            <div class="card-body">
+++                
+++                <div class="d-flex justify-content-between">
+++                    <label class="card-title mb-0">Para registrar una solicitud a la mesa de ayuda, ingrese su ID ITSON ó un correo electrónico válido para su seguimiento.</label>
+++                 </div>
+++
+++                <div id="mensaje" class="alert d-none mt-3" role="alert"></div>
+++
+++                <div class="mb-3 mt-3">
+++                    <label for="medio" class="form-label">Registrar con</label>
+++                    <select id="medio" class="form-select" onchange="toggleInput()">
+++                        <option value="correo">Correo electrónico</option>
+++                        <option value="id">ID</option>
+++                    </select>
+++                </div>
+++
+++                <div class="mb-3" id="correoDiv">
+++                    <input type="email" class="form-control" id="correoInput" placeholder="Correo electrónico">
+++                </div>
+++
+++                <div class="mb-3 d-none" id="idDiv">
+++                   <input type="text" class="form-control" id="idInput" placeholder="ID (11 dígitos)" maxlength="11" onblur="formatearID()">
+++                </div>
+++
+++                <div class="mb-3">
+++                    <textarea class="form-control" id="solicitud" rows="3" placeholder="Ingresa tu solicitud."></textarea>
+++                </div>
+++
+++                <div id="confirmSection" class="mb-3 d-none">
+++                    <div class="alert alert-warning p-2">¿Confirmar solicitud?</div>
+++                    <div class="d-flex justify-content-between">
+++                        <button type="button" class="btn btn-success btn-sm" onclick="enviarSolicitud()">Sí</button>
+++                        <button type="button" class="btn btn-secondary btn-sm" onclick="resetForm()">No</button>
+++                    </div>
+++                </div>
+++                        <div id="respuesta" class="alert alert-info mt-3 d-none"></div>
+++
+++                <div class="d-grid">
+++                    <button type="button" id="btnRegistrar" class="btn btn-primary" onclick="validarFormulario()">Registrar solicitud</button>
+++                </div>
+++            </div>
+++        </div>
+++            </div>
+++    </form>
+++
+++    <script>
+++        let ultimaSolicitud = "";
+++
+++        function toggleChat() {
+++            const chatCard = document.getElementById("chatCard");
+++            const visible = chatCard.style.display === "block";
+++            chatCard.style.display = visible ? "none" : "block";
+++            if (visible) limpiarFormulario();
+++        }
+++
+++        function toggleInput() {
+++            const medio = document.getElementById("medio").value;
+++            document.getElementById("correoDiv").classList.toggle("d-none", medio !== "correo");
+++            document.getElementById("idDiv").classList.toggle("d-none", medio !== "id");
+++            limpiarMensaje();
+++        }
+++
+++        function formatearID() {
+++            let id = document.getElementById("idInput").value.replace(/\D/g, '');
+++            if (id.length < 11) {
+++                id = id.padStart(11, '0');
+++                document.getElementById("idInput").value = id;
+++            }
+++        }
+++
+++
+++        function mostrarMensaje(texto, tipo = "info") {
+++            const msg = document.getElementById("mensaje");
+++            msg.className = `alert alert-${tipo}`;
+++            msg.innerText = texto;
+++            msg.classList.remove("d-none");
+++        }
+++
+++        function limpiarMensaje() {
+++
+++            const msg = document.getElementById("mensaje");
+++            msg.classList.add("d-none");
+++            msg.innerText = "";
+++        }
+++
+++        function validarFormulario() {
+++            limpiarMensaje();
+++            const medio = document.getElementById("medio").value;
+++            const correo = document.getElementById("correoInput").value.trim();
+++            const id = document.getElementById("idInput").value.trim();
+++            const solicitud = document.getElementById("solicitud").value.trim();
+++            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
+++            document.getElementById("respuesta").classList.add("d-none");
+++
+++            if (solicitud === "") {
+++                mostrarMensaje("Por favor, escribe tu solicitud.", "danger");
+++                return;
+++            }
+++
+++            if (medio === "correo") {
+++                if (!emailRegex.test(correo)) {
+++                    mostrarMensaje("Correo electrónico inválido.", "danger");
+++                    return;
+++                }
+++                mostrarConfirmacion();
+++            } else {
+++                if (id.length !== 11) {
+++                    mostrarMensaje("El ID debe tener 11 dígitos.", "danger");
+++                    return;
+++                }
+++                fetch("ChatMesaAyuda.aspx/VerificarID", {
+++                    method: "POST",
+++                    headers: { 'Content-Type': 'application/json' },
+++                    body: JSON.stringify({ id: id })
+++                })
+++                    .then(res => res.json())
+++                    .then(res => {
+++                        if (!res.d) {
+++                            mostrarMensaje("ID no encontrado.", "danger");
+++                            return;
+++                        } else {
+++                            mostrarConfirmacion();
+++                        }
+++                    });
+++            }
+++        }
+++
+++        function mostrarConfirmacion() {
+++            document.getElementById("btnRegistrar").classList.add("d-none");
+++            document.getElementById("confirmSection").classList.remove("d-none");
+++            document.getElementById("medio").disabled = true;
+++            document.getElementById("idInput").disabled = true;
+++            document.getElementById("correoInput").disabled = true;
+++            document.getElementById("solicitud").disabled = true;
+++
+++        }
+++
+++        function resetForm() {
+++            document.getElementById("confirmSection").classList.add("d-none");
+++            document.getElementById("btnRegistrar").classList.remove("d-none");
+++            document.getElementById("medio").disabled = false;
+++            document.getElementById("idInput").disabled = false;
+++            document.getElementById("correoInput").disabled = false;
+++            document.getElementById("solicitud").disabled = false;
+++
+++            limpiarMensaje();
+++        }
+++
+++        function limpiarFormulario() {
+++            document.getElementById("correoInput").value = "";
+++            document.getElementById("idInput").value = "";
+++            document.getElementById("solicitud").value = "";
+++            document.getElementById("medio").value = "correo";
+++            toggleInput();
+++            resetForm();
+++        }
+++
+++        function enviarSolicitud() {
+++
+++            const medio = document.getElementById("medio").value;
+++            const correo = document.getElementById("correoInput").value.trim();
+++            const id = document.getElementById("idInput").value.trim();
+++            const solicitud = document.getElementById("solicitud").value.trim();
+++
+++            const hash = medio + correo + id + solicitud;
+++            if (hash === ultimaSolicitud) return;
+++            ultimaSolicitud = hash;
+++
+++            fetch("ChatMesaAyuda.aspx/RegistrarSolicitud", {
+++                method: "POST",
+++                headers: { 'Content-Type': 'application/json' },
+++                body: JSON.stringify({
+++                    usuario: medio === "id" ? id : "",
+++                    email: medio === "correo" ? correo : "",
+++                    descripcion: solicitud
+++                })
+++            })
+++                .then(res => res.json())
+++                .then(res => {
+++                    const respuesta = document.getElementById("respuesta");
+++                    respuesta.textContent = "Folio generado: " + res.d;
+++                    respuesta.className = "alert alert-success mt-3";  
+++
+++                    document.getElementById("confirmSection").classList.add("d-none");
+++                    limpiarFormulario();
+++                })
+++                .catch(() => {
+++                    const respuesta = document.getElementById("respuesta");
+++                    respuesta.textContent = "Error al enviar la solicitud. Intenta más tarde.";
+++                    respuesta.className = "alert alert-danger mt-3";
+++
+++                });
+++        }
+++
+++    </script>
+++   
+++
+++</body></html>
++\ No newline at end of file
++```
++
++### `scripts/debug-horario.js`
++```diff
++diff --git a/scripts/debug-horario.js b/scripts/debug-horario.js
++new file mode 100644
++index 0000000..f24031b
++--- /dev/null
+++++ b/scripts/debug-horario.js
++@@ -0,0 +1,165 @@
+++const { chromium } = require('playwright');
+++const fs = require('fs');
+++require('dotenv').config();
+++
+++(async () => {
+++  const browser = await chromium.launch({ headless: true });
+++  const context = await browser.newContext();
+++  const page = await context.newPage();
+++
+++  await page.route('**/*', (route) => {
+++    const blocked = ['image', 'media', 'font', 'stylesheet'];
+++    blocked.includes(route.request().resourceType()) ? route.abort() : route.continue();
+++  });
+++
+++  // Usa el mismo flujo de login que horario.js
+++  const { scrapeHorario } = require('../electron/handlers/horario');
+++
+++  // Intercepta la tabla antes de parsearla
+++  // Navega manualmente con el mismo flujo del scraper
+++  await page.goto('https://apps9.itson.edu.mx/CIA/index.aspx', {
+++    waitUntil: 'domcontentloaded',
+++    timeout: 45000,
+++  });
+++  await page.waitForTimeout(2000);
+++
+++  // Login
+++  const allFrames = page.frames();
+++  let loginFrame =
+++    allFrames.find((f) => f.name() === 'TargetContent') ||
+++    allFrames.find((f) => f.url().includes('CIA')) ||
+++    page.mainFrame();
+++
+++  const user = process.env.CIA_USER || '';
+++  const pass = process.env.CIA_PASS || '';
+++
+++  // Intenta múltiples selectores de login
+++  const userSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
+++  const passSelectors = ['#pwd', 'input[name="pwd"]', 'input[type="password"]'];
+++  const submitSelectors = ['#Submit_btn', 'input[type="submit"]', 'button[type="submit"]'];
+++
+++  for (const sel of userSelectors) {
+++    try {
+++      await loginFrame.fill(sel, user);
+++      break;
+++    } catch (e) {}
+++  }
+++  for (const sel of passSelectors) {
+++    try {
+++      await loginFrame.fill(sel, pass);
+++      break;
+++    } catch (e) {}
+++  }
+++  for (const sel of submitSelectors) {
+++    try {
+++      await loginFrame.click(sel);
+++      break;
+++    } catch (e) {}
+++  }
+++
+++  await page.waitForTimeout(5000);
+++  console.log('URL post-login:', page.url());
+++
+++  // Navega al horario usando los mismos clicks que horario.js
+++  // Busca link de horario en todos los frames
+++  let horarioClicked = false;
+++  for (const frame of page.frames()) {
+++    if (horarioClicked) break;
+++    try {
+++      const clicked = await frame.evaluate(() => {
+++        const links = Array.from(document.querySelectorAll('a'));
+++        const link = links.find(
+++          (l) =>
+++            /mi horario/i.test(l.textContent) ||
+++            /horario de clases/i.test(l.textContent) ||
+++            /SSR_SSENRL_LIST/i.test(l.href),
+++        );
+++        if (link) {
+++          link.click();
+++          return true;
+++        }
+++        return false;
+++      });
+++      if (clicked) {
+++        horarioClicked = true;
+++        console.log('Click en horario desde frame:', frame.url());
+++      }
+++    } catch (e) {}
+++  }
+++
+++  await page.waitForTimeout(4000);
+++
+++  // Activa Vista Semanal
+++  for (const frame of page.frames()) {
+++    try {
+++      await frame.evaluate(() => {
+++        const inputs = Array.from(document.querySelectorAll('input'));
+++        const semanal = inputs.find(
+++          (i) => /semanal/i.test(i.value) || /semanal/i.test(i.nextSibling?.textContent || ''),
+++        );
+++        if (semanal) semanal.click();
+++      });
+++    } catch (e) {}
+++  }
+++
+++  await page.waitForTimeout(3000);
+++
+++  // Guarda HTML de cada frame con contenido
+++  let savedCount = 0;
+++  for (const frame of page.frames()) {
+++    try {
+++      const html = await frame.content();
+++      if (html.length > 2000) {
+++        const safeName = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
+++        const fname = `scripts/debug-frame-${savedCount}-${safeName}.html`;
+++        fs.writeFileSync(fname, html);
+++        console.log('Guardado:', fname, '| tamaño:', html.length, 'chars');
+++        savedCount++;
+++      }
+++    } catch (e) {}
+++  }
+++
+++  // Busca específicamente la tabla del horario y guárdala
+++  for (const frame of page.frames()) {
+++    try {
+++      const tablaHtml = await frame.evaluate(() => {
+++        // Busca tabla con contenido de horario
+++        const tables = Array.from(document.querySelectorAll('table'));
+++        const horarioTable = tables.find((t) => {
+++          const text = t.innerText || '';
+++          return /lunes|martes|mi[eé]rcoles|jueves|viernes/i.test(text) && /AM|PM|\d+:\d+/.test(text);
+++        });
+++        if (!horarioTable) return null;
+++
+++        // También extrae los datos raw de cada celda
+++        const cells = Array.from(horarioTable.querySelectorAll('td')).map((td) => ({
+++          rowspan: td.getAttribute('rowspan') || '1',
+++          colspan: td.getAttribute('colspan') || '1',
+++          id: td.id || '',
+++          className: td.className || '',
+++          text: (td.innerText || '').trim().substring(0, 200),
+++          childCount: td.children.length,
+++        }));
+++
+++        return {
+++          tableHtml: horarioTable.outerHTML,
+++          cellData: cells,
+++        };
+++      });
+++
+++      if (tablaHtml) {
+++        fs.writeFileSync('scripts/tabla-horario.html', tablaHtml.tableHtml);
+++        fs.writeFileSync('scripts/tabla-celdas.json', JSON.stringify(tablaHtml.cellData, null, 2));
+++        console.log('✅ Tabla del horario guardada en scripts/tabla-horario.html');
+++        console.log('✅ Datos de celdas en scripts/tabla-celdas.json');
+++        console.log('Primeras 5 celdas:');
+++        tablaHtml.cellData.slice(0, 10).forEach((c, i) =>
+++          console.log(`  Celda ${i}: rowspan=${c.rowspan} | "${c.text.substring(0, 80)}"`),
+++        );
+++      }
+++    } catch (e) {}
+++  }
+++
+++  await browser.close();
+++  console.log('Done.');
+++})();
++```
++
++## Pendiente para Claude
++- Output completo de `node scripts/debug-horario.js`:
++  - `◇ injected env (5) from .env // tip: ⌘ override existing { override: true }`
++  - `URL post-login: https://apps9.itson.edu.mx/CIA/CIA.ASPX`
++  - `Guardado: scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html | tamaño: 8589 chars`
++  - `Guardado: scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html | tamaño: 9380 chars`
++  - `Done.`
++- Archivos generados por el diagnóstico:
++  - `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
++  - `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
++- Nota: `scripts/tabla-horario.html` y `scripts/tabla-celdas.json` no se generaron en esta corrida (no se detectó tabla semanal en los frames capturados).
+```
+
+### `scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html`
+```diff
+diff --git a/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
+new file mode 100644
+index 0000000..b683605
+--- /dev/null
++++ b/scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
+@@ -0,0 +1,218 @@
++<!DOCTYPE html><html dir="ltr"><head>
++<meta name="robots" content="noindex">
++<!--
++* ******************************************************************
++* ORACLE CONFIDENTIAL.  For authorized use only.  Except for as
++* expressly authorized by Oracle, do not disclose, copy, reproduce,
++* distribute, or modify.
++* ******************************************************************
++*
++-->
++<title>Sistema CIA - Instituto Tecnológico de Sonora</title>
++
++	<meta http-equiv="X-UA-Compatible" content="IE=edge">
++    <meta charset="UTF-8">
++    
++	<meta name="viewport" content="width=device-width, initial-scale=1">
++    <link rel="stylesheet" type="text/css" href="/ITSONPRD/images/img/css/StyleSheet-precia.css">
++
++<style>
++        .open-button {
++            background-color: #006db6;
++            color: white;
++            padding: 10px 20px;
++            border: 1px solid white;
++            cursor: pointer;
++            opacity: 0.8;
++            position: fixed;
++            width: 280px;
++            border-radius: 50px;
++            font-size: 18px !important;
++        }
++
++            .form-container .btn:hover, .open-button:hover {
++                opacity: 1;
++            }
++
++        .form-container .btn {
++            color: white;
++            padding: 7px 10px;
++            border: none;
++            cursor: pointer;
++            width: 100%;
++            margin-bottom: 10px;
++        }
++
++        #BotonAyuda {
++            position: fixed;
++            bottom: 30px;
++            right: 150px;
++            z-index: 9;
++            border-radius: 13px 13px 0 0;
++            margin-right: 15px;
++        }
++
++        #myIframe {
++            visibility: hidden;
++        }
++    </style><script language="JavaScript">
++    function signin(form) {
++        var now = new Date();
++        form.timezoneOffset.value = now.getTimezoneOffset();
++        return;
++    }
++    function setFocus() {
++        try
++         { document.login.userid.focus() }
++        catch (e)
++         { };
++        return;
++    }
++    function submitAction(form) {
++        form.Submit.disabled = true;
++        form.submit();
++    }
++</script><script>
++
++      function redirect() {
++ window.open("https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx");
++      }
++
++	function abrirIframe() {
++            if (document.getElementById("myIframe").style.visibility == "hidden" || document.getElementById("myIframe").style.visibility == "") {
++                document.getElementById("myIframe").style.visibility = "visible";
++                //document.getElementById("myIframe").style.zIndex = "0";
++            } else {
++                document.getElementById("myIframe").style.visibility = "hidden";
++                //document.getElementById("myIframe").style.zIndex = "10000";
++            }
++        }
++
++        function closeIframe() {
++            var iframe = document.getElementById('myIframe');
++            document.getElementById("myIframe").style.visibility = "hidden";
++        }
++
++        window.addEventListener('message', function (event) {
++            if (event.data === 'closeIframe') {
++                closeIframe();
++            }
++        });
++	
++</script></head>
++
++
++
++
++
++
++
++<body onload="setFocus(); if (top != self) top.location = location" style="background-color:#006db6">
++   
++    <div class="limiter">
++    
++		<div class="container-login">
++          
++        <div class="wrap-login" style="width:50%">
++            
++              <!-- Aquí se muestra el acceso -->
++
++			   <form class="login-form validate-form" style="width:100%" action="?cmd=login&amp;languageCd=ESP" method="post" id="login" name="login" autocomplete="off" onsubmit="signin(document.login)">
++                           <input type="hidden" name="timezoneOffset" value="0">    
++                <img src="/ITSONPRD/images/img/ITSON-MARCA.png" class="logoITSON" style="width:60%"> <br> <br><br>
++               
++<img src="/ITSONPRD/images/img/CIA.png" class="logoCIA" style="width:60%">
++
++
++                   	<div class="wrap-input validate-input">
++						<input class="input" id="userid" type="text" name="userid" placeholder="Ingresar ID ITSON de 11 dígitos" maxlength="11">
++					</div> <br>
++
++                    <div class="wrap-input validate-input">
++                        <input class="input" id="pwd" type="password" name="pwd" placeholder="Ingresar contraseña">
++                    </div>
++                    
++
++  
++
++					
++					<div class="container-login-form-btn">
++						<button class="login-form-btn">
++							Iniciar Sesión
++						</button>
++					</div>
++
++					<div class="text-password">
++						<span class="txt1">
++							¿Has olvidado tu
++						</span>
++						<a class="txt2" href="http://smartweb1.itson.edu.mx:8700/psp/ITSONPRD/EMPLOYEE/HRMS/c/MAINTAIN_SECURITY.EMAIL_PSWD.GBL?FolderPath=PORTAL_ROOT_OBJECT.PT_TOOLS_HIDDEN.PT_EMAIL_PSWD_GBL&amp;IsFolder=false&amp;IgnoreParamTempl=FolderPath%2cIsFolder" target="_blank">
++							Usuario / Contraseña?
++						</a>
++					</div>
++
++						
++					<div class="container-login-form-btn">
++						<a href="https://www.itson.mx/micrositios/transparencia/Paginas/avisos-de-privacidad.aspx">Aviso Privacidad</a>
++						<!--<button class="login-form-btn" onclick="redirect()">
++							Aviso Privacidad
++						</button> -->
++					</div>
++
++
++				</form>
++                
++                <!-- Aquí se muestra la imagen de la app -->
++                <!--	<div class="login-pic">
++					
++                       <img src="img/SCREENSHOTS-PPLAYSTORE-BACKBLUE2.png" alt="IMG"/>
++                    <div class="playstore">
++
++                    	<div id="googleplay">
++                        <p id="playstore-text" class="hvr-float-shadow"><br />
++						<a href="https://play.google.com/store/apps/details?id=mx.itson.potrosapp" target="_blank">
++                            <img src="img/googleplay.png"/>
++                        </a></p>
++                        </div>
++
++                        <div id="appstore">
++                        <p id="playstore-text" class="hvr-float-shadow"><br />
++                            <a href="https://itunes.apple.com/us/app/potros-app/id1339260457?l=es&ls" target="_blank">
++                            <img src="img/appstore.png" />
++                            </a>
++                        </p>
++                        </div>
++                    </div>
++				</div> -->
++
++<div class="col-lg-3">
++        <iframe id="myIframe" name="Contenido" src="https://apps9.itson.edu.mx/chatmesa/chatmesaayuda.aspx" style="height: 550px; width: 350px; position:fixed; bottom:3%; right: 1%; z-index:99;" frameborder="0"></iframe>
++        <div id="BotonAyuda" style="z-index:99;">
++            <button class="btn btn-info btn-circle btn-lg open-button" style="width:100px; height:40px; position:fixed; bottom:3%; right: 3%;" onclick="abrirIframe()">Ayuda</button>
++        </div>
++    </div>
++			</div>
++
++                    
++  
++        
++
++<footer>
++
++   
++   <!-- Start of admisionesitson Zendesk Widget script 
++<iframe src="javascript:false" title="" style="display: none;"></iframe><script>/*<![CDATA[*/window.zEmbed||function(e,t){var n,o,d,i,s,a=[],r=document.createElement("iframe");window.zEmbed=function(){a.push(arguments)},window.zE=window.zE||window.zEmbed,r.src="javascript:false",r.title="",r.role="presentation",(r.frameElement||r).style.cssText="display: none",d=document.getElementsByTagName("script"),d=d[d.length-1],d.parentNode.insertBefore(r,d),i=r.contentWindow,s=i.document;try{o=s}catch(e){n=document.domain,r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',o=s}o.open()._l=function(){var o=this.createElement("script");n&&(this.domain=n),o.id="js-iframe-async",o.src=e,this.t=+new Date,this.zendeskHost=t,this.zEQueue=a,this.body.appendChild(o)},o.write('<body onload="document._l();">'),o.close()}("https://assets.zendesk.com/embeddable_framework/main.js","admisionesitson.zendesk.com");
++/*]]>*/</script> -->
++<!-- End of admisionesitson Zendesk Widget script -->
++
++
++<!-- <div><iframe id="launcher" tabindex="0" class="zEWidget-launcher zEWidget-launcher--active" style="border: none; background: transparent; z-index: 999998; transform: translateZ(0px); position: fixed; opacity: 1; right: 0px; bottom: 0px; width: 125px; height: 47px; margin: 10px 20px;"></iframe></div><div><iframe id="webWidget" tabindex="-1" class="zEWidget-webWidget " style="border: none; background: transparent; z-index: 999999; transform: translateZ(0px); position: fixed; opacity: 0; right: 0px; bottom: 0px; width: 357px; margin-left: 15px; margin-right: 15px; height: 15px; transition-property: none; transition-timing-function: unset; top: -9999px;"></iframe></div> -->
++
++
++
++
++
++</footer>
++
++
++</div></div></body></html>
+\ No newline at end of file
+```
+
+### `scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html`
+```diff
+diff --git a/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
+new file mode 100644
+index 0000000..8568ea8
+--- /dev/null
++++ b/scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
+@@ -0,0 +1,225 @@
++<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>
++	Ayuda Chat Popup
++</title><link href="css/bootstrap.min.css" rel="stylesheet">
++     <script src="js/bootstrap.bundle.min.js"></script>
++    <style>
++        #chatButton { z-index: 1055; }
++        #chatCard { z-index: 1060; width: 20rem;  }
++        textarea { resize: none; }
++   </style>
++</head>
++<body style="background:none">
++    <form method="post" action="./chatmesaayuda.aspx" id="form1">
++<div class="aspNetHidden">
++<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="g4JRE3s9GsEu+daGHvPSlBuQWKj8Wus46A+Mm1OZvxVLChmXtYFzT8TYafGvZdwrcNQPbeXST5h/jr+f5tPfQuQq2argyxKdunC3H8GR9FI=">
++</div>
++
++<div class="aspNetHidden">
++
++	<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="1B0F1C22">
++</div>
++        <!-- Botón flotante -->
++       
++
++        <!-- Tarjeta de ayuda -->
++        <div id="chatCard" class="card position-fixed bottom-0 end-0 m-4 shadow-lg" style="display:true;">
++            <div class="card">
++                <div class="card-header bg-primary text-white">Mesa de ayuda ITSON</div>
++            <div class="card-body">
++                
++                <div class="d-flex justify-content-between">
++                    <label class="card-title mb-0">Para registrar una solicitud a la mesa de ayuda, ingrese su ID ITSON ó un correo electrónico válido para su seguimiento.</label>
++                 </div>
++
++                <div id="mensaje" class="alert d-none mt-3" role="alert"></div>
++
++                <div class="mb-3 mt-3">
++                    <label for="medio" class="form-label">Registrar con</label>
++                    <select id="medio" class="form-select" onchange="toggleInput()">
++                        <option value="correo">Correo electrónico</option>
++                        <option value="id">ID</option>
++                    </select>
++                </div>
++
++                <div class="mb-3" id="correoDiv">
++                    <input type="email" class="form-control" id="correoInput" placeholder="Correo electrónico">
++                </div>
++
++                <div class="mb-3 d-none" id="idDiv">
++                   <input type="text" class="form-control" id="idInput" placeholder="ID (11 dígitos)" maxlength="11" onblur="formatearID()">
++                </div>
++
++                <div class="mb-3">
++                    <textarea class="form-control" id="solicitud" rows="3" placeholder="Ingresa tu solicitud."></textarea>
++                </div>
++
++                <div id="confirmSection" class="mb-3 d-none">
++                    <div class="alert alert-warning p-2">¿Confirmar solicitud?</div>
++                    <div class="d-flex justify-content-between">
++                        <button type="button" class="btn btn-success btn-sm" onclick="enviarSolicitud()">Sí</button>
++                        <button type="button" class="btn btn-secondary btn-sm" onclick="resetForm()">No</button>
++                    </div>
++                </div>
++                        <div id="respuesta" class="alert alert-info mt-3 d-none"></div>
++
++                <div class="d-grid">
++                    <button type="button" id="btnRegistrar" class="btn btn-primary" onclick="validarFormulario()">Registrar solicitud</button>
++                </div>
++            </div>
++        </div>
++            </div>
++    </form>
++
++    <script>
++        let ultimaSolicitud = "";
++
++        function toggleChat() {
++            const chatCard = document.getElementById("chatCard");
++            const visible = chatCard.style.display === "block";
++            chatCard.style.display = visible ? "none" : "block";
++            if (visible) limpiarFormulario();
++        }
++
++        function toggleInput() {
++            const medio = document.getElementById("medio").value;
++            document.getElementById("correoDiv").classList.toggle("d-none", medio !== "correo");
++            document.getElementById("idDiv").classList.toggle("d-none", medio !== "id");
++            limpiarMensaje();
++        }
++
++        function formatearID() {
++            let id = document.getElementById("idInput").value.replace(/\D/g, '');
++            if (id.length < 11) {
++                id = id.padStart(11, '0');
++                document.getElementById("idInput").value = id;
++            }
++        }
++
++
++        function mostrarMensaje(texto, tipo = "info") {
++            const msg = document.getElementById("mensaje");
++            msg.className = `alert alert-${tipo}`;
++            msg.innerText = texto;
++            msg.classList.remove("d-none");
++        }
++
++        function limpiarMensaje() {
++
++            const msg = document.getElementById("mensaje");
++            msg.classList.add("d-none");
++            msg.innerText = "";
++        }
++
++        function validarFormulario() {
++            limpiarMensaje();
++            const medio = document.getElementById("medio").value;
++            const correo = document.getElementById("correoInput").value.trim();
++            const id = document.getElementById("idInput").value.trim();
++            const solicitud = document.getElementById("solicitud").value.trim();
++            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
++            document.getElementById("respuesta").classList.add("d-none");
++
++            if (solicitud === "") {
++                mostrarMensaje("Por favor, escribe tu solicitud.", "danger");
++                return;
++            }
++
++            if (medio === "correo") {
++                if (!emailRegex.test(correo)) {
++                    mostrarMensaje("Correo electrónico inválido.", "danger");
++                    return;
++                }
++                mostrarConfirmacion();
++            } else {
++                if (id.length !== 11) {
++                    mostrarMensaje("El ID debe tener 11 dígitos.", "danger");
++                    return;
++                }
++                fetch("ChatMesaAyuda.aspx/VerificarID", {
++                    method: "POST",
++                    headers: { 'Content-Type': 'application/json' },
++                    body: JSON.stringify({ id: id })
++                })
++                    .then(res => res.json())
++                    .then(res => {
++                        if (!res.d) {
++                            mostrarMensaje("ID no encontrado.", "danger");
++                            return;
++                        } else {
++                            mostrarConfirmacion();
++                        }
++                    });
++            }
++        }
++
++        function mostrarConfirmacion() {
++            document.getElementById("btnRegistrar").classList.add("d-none");
++            document.getElementById("confirmSection").classList.remove("d-none");
++            document.getElementById("medio").disabled = true;
++            document.getElementById("idInput").disabled = true;
++            document.getElementById("correoInput").disabled = true;
++            document.getElementById("solicitud").disabled = true;
++
++        }
++
++        function resetForm() {
++            document.getElementById("confirmSection").classList.add("d-none");
++            document.getElementById("btnRegistrar").classList.remove("d-none");
++            document.getElementById("medio").disabled = false;
++            document.getElementById("idInput").disabled = false;
++            document.getElementById("correoInput").disabled = false;
++            document.getElementById("solicitud").disabled = false;
++
++            limpiarMensaje();
++        }
++
++        function limpiarFormulario() {
++            document.getElementById("correoInput").value = "";
++            document.getElementById("idInput").value = "";
++            document.getElementById("solicitud").value = "";
++            document.getElementById("medio").value = "correo";
++            toggleInput();
++            resetForm();
++        }
++
++        function enviarSolicitud() {
++
++            const medio = document.getElementById("medio").value;
++            const correo = document.getElementById("correoInput").value.trim();
++            const id = document.getElementById("idInput").value.trim();
++            const solicitud = document.getElementById("solicitud").value.trim();
++
++            const hash = medio + correo + id + solicitud;
++            if (hash === ultimaSolicitud) return;
++            ultimaSolicitud = hash;
++
++            fetch("ChatMesaAyuda.aspx/RegistrarSolicitud", {
++                method: "POST",
++                headers: { 'Content-Type': 'application/json' },
++                body: JSON.stringify({
++                    usuario: medio === "id" ? id : "",
++                    email: medio === "correo" ? correo : "",
++                    descripcion: solicitud
++                })
++            })
++                .then(res => res.json())
++                .then(res => {
++                    const respuesta = document.getElementById("respuesta");
++                    respuesta.textContent = "Folio generado: " + res.d;
++                    respuesta.className = "alert alert-success mt-3";  
++
++                    document.getElementById("confirmSection").classList.add("d-none");
++                    limpiarFormulario();
++                })
++                .catch(() => {
++                    const respuesta = document.getElementById("respuesta");
++                    respuesta.textContent = "Error al enviar la solicitud. Intenta más tarde.";
++                    respuesta.className = "alert alert-danger mt-3";
++
++                });
++        }
++
++    </script>
++   
++
++</body></html>
+\ No newline at end of file
+```
+
+### `scripts/debug-horario.js`
+```diff
+diff --git a/scripts/debug-horario.js b/scripts/debug-horario.js
+new file mode 100644
+index 0000000..f24031b
+--- /dev/null
++++ b/scripts/debug-horario.js
+@@ -0,0 +1,165 @@
++const { chromium } = require('playwright');
++const fs = require('fs');
++require('dotenv').config();
++
++(async () => {
++  const browser = await chromium.launch({ headless: true });
++  const context = await browser.newContext();
++  const page = await context.newPage();
++
++  await page.route('**/*', (route) => {
++    const blocked = ['image', 'media', 'font', 'stylesheet'];
++    blocked.includes(route.request().resourceType()) ? route.abort() : route.continue();
++  });
++
++  // Usa el mismo flujo de login que horario.js
++  const { scrapeHorario } = require('../electron/handlers/horario');
++
++  // Intercepta la tabla antes de parsearla
++  // Navega manualmente con el mismo flujo del scraper
++  await page.goto('https://apps9.itson.edu.mx/CIA/index.aspx', {
++    waitUntil: 'domcontentloaded',
++    timeout: 45000,
++  });
++  await page.waitForTimeout(2000);
++
++  // Login
++  const allFrames = page.frames();
++  let loginFrame =
++    allFrames.find((f) => f.name() === 'TargetContent') ||
++    allFrames.find((f) => f.url().includes('CIA')) ||
++    page.mainFrame();
++
++  const user = process.env.CIA_USER || '';
++  const pass = process.env.CIA_PASS || '';
++
++  // Intenta múltiples selectores de login
++  const userSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
++  const passSelectors = ['#pwd', 'input[name="pwd"]', 'input[type="password"]'];
++  const submitSelectors = ['#Submit_btn', 'input[type="submit"]', 'button[type="submit"]'];
++
++  for (const sel of userSelectors) {
++    try {
++      await loginFrame.fill(sel, user);
++      break;
++    } catch (e) {}
++  }
++  for (const sel of passSelectors) {
++    try {
++      await loginFrame.fill(sel, pass);
++      break;
++    } catch (e) {}
++  }
++  for (const sel of submitSelectors) {
++    try {
++      await loginFrame.click(sel);
++      break;
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(5000);
++  console.log('URL post-login:', page.url());
++
++  // Navega al horario usando los mismos clicks que horario.js
++  // Busca link de horario en todos los frames
++  let horarioClicked = false;
++  for (const frame of page.frames()) {
++    if (horarioClicked) break;
++    try {
++      const clicked = await frame.evaluate(() => {
++        const links = Array.from(document.querySelectorAll('a'));
++        const link = links.find(
++          (l) =>
++            /mi horario/i.test(l.textContent) ||
++            /horario de clases/i.test(l.textContent) ||
++            /SSR_SSENRL_LIST/i.test(l.href),
++        );
++        if (link) {
++          link.click();
++          return true;
++        }
++        return false;
++      });
++      if (clicked) {
++        horarioClicked = true;
++        console.log('Click en horario desde frame:', frame.url());
++      }
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(4000);
++
++  // Activa Vista Semanal
++  for (const frame of page.frames()) {
++    try {
++      await frame.evaluate(() => {
++        const inputs = Array.from(document.querySelectorAll('input'));
++        const semanal = inputs.find(
++          (i) => /semanal/i.test(i.value) || /semanal/i.test(i.nextSibling?.textContent || ''),
++        );
++        if (semanal) semanal.click();
++      });
++    } catch (e) {}
++  }
++
++  await page.waitForTimeout(3000);
++
++  // Guarda HTML de cada frame con contenido
++  let savedCount = 0;
++  for (const frame of page.frames()) {
++    try {
++      const html = await frame.content();
++      if (html.length > 2000) {
++        const safeName = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
++        const fname = `scripts/debug-frame-${savedCount}-${safeName}.html`;
++        fs.writeFileSync(fname, html);
++        console.log('Guardado:', fname, '| tamaño:', html.length, 'chars');
++        savedCount++;
++      }
++    } catch (e) {}
++  }
++
++  // Busca específicamente la tabla del horario y guárdala
++  for (const frame of page.frames()) {
++    try {
++      const tablaHtml = await frame.evaluate(() => {
++        // Busca tabla con contenido de horario
++        const tables = Array.from(document.querySelectorAll('table'));
++        const horarioTable = tables.find((t) => {
++          const text = t.innerText || '';
++          return /lunes|martes|mi[eé]rcoles|jueves|viernes/i.test(text) && /AM|PM|\d+:\d+/.test(text);
++        });
++        if (!horarioTable) return null;
++
++        // También extrae los datos raw de cada celda
++        const cells = Array.from(horarioTable.querySelectorAll('td')).map((td) => ({
++          rowspan: td.getAttribute('rowspan') || '1',
++          colspan: td.getAttribute('colspan') || '1',
++          id: td.id || '',
++          className: td.className || '',
++          text: (td.innerText || '').trim().substring(0, 200),
++          childCount: td.children.length,
++        }));
++
++        return {
++          tableHtml: horarioTable.outerHTML,
++          cellData: cells,
++        };
++      });
++
++      if (tablaHtml) {
++        fs.writeFileSync('scripts/tabla-horario.html', tablaHtml.tableHtml);
++        fs.writeFileSync('scripts/tabla-celdas.json', JSON.stringify(tablaHtml.cellData, null, 2));
++        console.log('✅ Tabla del horario guardada en scripts/tabla-horario.html');
++        console.log('✅ Datos de celdas en scripts/tabla-celdas.json');
++        console.log('Primeras 5 celdas:');
++        tablaHtml.cellData.slice(0, 10).forEach((c, i) =>
++          console.log(`  Celda ${i}: rowspan=${c.rowspan} | "${c.text.substring(0, 80)}"`),
++        );
++      }
++    } catch (e) {}
++  }
++
++  await browser.close();
++  console.log('Done.');
++})();
+```
+
+### `scripts/tabla-celdas-real.json`
+```diff
+diff --git a/scripts/tabla-celdas-real.json b/scripts/tabla-celdas-real.json
+new file mode 100644
+index 0000000..0ff61d0
+--- /dev/null
++++ b/scripts/tabla-celdas-real.json
+@@ -0,0 +1,2054 @@
++[
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases\n\n\n\tVista Listado\tVista Horario Semanal\n\tOpción Visualización\n\t\t\n\t"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "13",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "7",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "5",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "5",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": "David Alvarez Aviles"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "7",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "7",
++    "id": "",
++    "text": "Mi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Mi Programa de Clases"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Lista Previsiones"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Búsqueda de Clase"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Introducción"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Baja"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "9",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "7",
++    "id": "",
++    "text": "Mi Programa de Clases"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "19",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "5",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "3",
++    "colspan": "2",
++    "id": "",
++    "text": "Vista Listado"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "12",
++    "id": "",
++    "text": "Vista Horario Semanal"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": "Opción Visualización"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "6",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "3",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "4",
++    "colspan": "1",
++    "id": "",
++    "text": "Mostrar Semana"
++  },
++  {
++    "rowspan": "4",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "4",
++    "colspan": "2",
++    "id": "",
++    "text": "Hora Inicio"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Hora Fin"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": "< Semana Anterior"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "< Semana Anterior"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "< Semana Anterior"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": "Siguiente Semana >"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Siguiente Semana >"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Siguiente Semana >"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "3",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "16",
++    "id": "",
++    "text": "Semana de 1/19/2026 - 1/25/2026\nHora\tLunes\tMartes\tMiércoles\tJueves\tViernes\tSábado\tDomingo\n7:00AM\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "8",
++    "id": "",
++    "text": "Semana de 1/19/2026 - 1/25/2026"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "7:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "8:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "9:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512\n\nC 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512\n\nC 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "10:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1123C - 105\n9:00AM - 11:00AM\n\nC 1123C - 105\n9:00AM - 11:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1123C - 105\n9:00AM - 11:00AM\n\nC 1123C - 105\n9:00AM - 11:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "11:00AM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "TUTORIA 1132T - 157\nClase\n11:00AM - 12:00PM\nCentro Integral de Tecnologia LM0710"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 110\nTeoria\n11:00AM - 12:30PM\nCentro Integral de Tecnologia LM0712"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 110\nTeoria\n11:00AM - 12:30PM\nCentro Integral de Tecnologia LM0712"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "12:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 110\n11:00AM - 12:30PM\n\nC 1124C - 111\nLaboratorio\n12:30PM - 2:00PM\nCentro Integral de Tecnologia LM0712"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 110\n11:00AM - 12:30PM\n\nC 1124C - 111\nLaboratorio\n12:30PM - 2:00PM\nCentro Integral de Tecnologia LM0712"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "1:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 111\n12:30PM - 2:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1123C - 105\nTeoria\n1:00PM - 2:00PM\nCurso a distancia con herramientas de Internet\n\nC 1123C - 105\nTeoria\n1:00PM - 2:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1124C - 111\n12:30PM - 2:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "2:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "3:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "4:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1115C - 113\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nC 1115C - 113\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1178M - 107\nTeoria\n4:00PM - 5:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 5:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "5:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1178M - 107\n4:00PM - 6:00PM\n\nM 1178M - 107\n4:00PM - 6:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1115C - 113\n4:00PM - 6:00PM\n\nC 1115C - 113\n4:00PM - 6:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "M 1178M - 107\n4:00PM - 6:00PM\n\nM 1178M - 107\n4:00PM - 6:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "C 1115C - 113\nTeoria\n5:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nC 1115C - 113\nTeoria\n5:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "6:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "7:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "8:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "9:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "10:00PM"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "19",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "17",
++    "id": "",
++    "text": "*Acepto y me comprometo a liquidar el importe de las materias seleccionadas en este proceso de inscripción, cumpliendo con las fechas de pago establecidas por la institución."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "15",
++    "id": "",
++    "text": "Opciones Visualización \n\n\t\t\t\t\t\t\n\tMostrar Profesores\tLunes\tJueves\n\t\n\t\n\tActualizar Calendario\n\n\tMostrar AM/PM\tMartes\tViernes\tDomingo\n\n\tMostrar Título Clase\tMiércoles\tSábado"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Opciones Visualización"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Mostrar Profesores\tLunes\tJueves\n\t\n\t\n\tActualizar Calendario\n\n\tMostrar AM/PM\tMartes\tViernes\tDomingo\n\n\tMostrar Título Clase\tMiércoles\tSábado"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Mostrar Profesores"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Lunes"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": "Jueves"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Actualizar Calendario"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Mostrar AM/PM"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Martes"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Viernes"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": "Domingo"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Mostrar Título Clase"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Miércoles"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "4",
++    "id": "",
++    "text": "Sábado"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "19",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "13",
++    "id": "",
++    "text": "Diferido\n\n\t\t\t\t\t\t\t\t\t\n\t\n\n\tMi Horario Clases\tLista Previsiones\tBuscar Clase\tAñadir\tBaja\n\t\n\n\t\n\t\t\n\t\n\t\nCentro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Diferido"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Mi Horario Clases\tLista Previsiones\tBuscar Clase\tAñadir\tBaja\n\t\n\n\t\n\t\t\n\t\n\t\nCentro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "7",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": "Mi Horario Clases"
++  },
++  {
++    "rowspan": "2",
++    "colspan": "2",
++    "id": "",
++    "text": "Lista Previsiones"
++  },
++  {
++    "rowspan": "4",
++    "colspan": "1",
++    "id": "",
++    "text": "Buscar Clase"
++  },
++  {
++    "rowspan": "4",
++    "colspan": "1",
++    "id": "",
++    "text": "Añadir"
++  },
++  {
++    "rowspan": "4",
++    "colspan": "2",
++    "id": "",
++    "text": "Baja"
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "4",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "2",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "2",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "1",
++    "id": "",
++    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
++  },
++  {
++    "rowspan": "1",
++    "colspan": "6",
++    "id": "",
++    "text": ""
++  },
++  {
++    "rowspan": "1",
++    "colspan": "19",
++    "id": "",
++    "text": ""
++  }
++]
+\ No newline at end of file
+```
+
+### `scripts/tabla-horario-real.html`
+```diff
+diff --git a/scripts/tabla-horario-real.html b/scripts/tabla-horario-real.html
+new file mode 100644
+index 0000000..807e79d
+--- /dev/null
++++ b/scripts/tabla-horario-real.html
+@@ -0,0 +1,934 @@
++<table class="PSPAGECONTAINER"><tbody><tr><td>
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" class="PSPAGECONTAINER" cols="19" width="837">
++<tbody><tr>
++<td width="0" height="0"></td>
++<td width="4"></td>
++<td width="4"></td>
++<td width="104"></td>
++<td width="20"></td>
++<td width="80"></td>
++<td width="28"></td>
++<td width="44"></td>
++<td width="8"></td>
++<td width="52"></td>
++<td width="56"></td>
++<td width="56"></td>
++<td width="4"></td>
++<td width="80"></td>
++<td width="36"></td>
++<td width="16"></td>
++<td width="132"></td>
++<td width="110"></td>
++<td width="3"></td>
++</tr>
++<tr>
++<td height="88"></td>
++<td colspan="13" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="539">
++<tbody><tr><td width="537">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="3" width="537" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="0" height="0"></td>
++<td width="536"></td>
++<td width="2"></td>
++</tr>
++<tr>
++<td height="86"></td>
++<td valign="top" align="left">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="9" width="535" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="8" height="0"></td>
++<td width="2"></td>
++<td width="2"></td>
++<td width="36"></td>
++<td width="332"></td>
++<td width="116"></td>
++<td width="12"></td>
++<td width="24"></td>
++<td width="3"></td>
++</tr>
++<tr>
++<td height="1" colspan="7"></td>
++<td colspan="2" rowspan="5" nowrap="nowrap" valign="top" align="left">
++<a name="DERIVED_SSTSNAV_GO" id="DERIVED_SSTSNAV_GO" tabindex="17" href="javascript:submitAction_win0(document.win0,'DERIVED_SSTSNAV_GO');"><img src="/cs/ITSONPRD/cache/PT_NAV_GO_ESP_1.gif" name="DERIVED_SSTSNAV_GO$IMG" alt="IR" title="IR" border="0"></a>
++</td>
++</tr>
++<tr>
++<td height="2" colspan="5"></td>
++<td colspan="2" rowspan="2" valign="top" align="left">
++<select name="DERIVED_SSTSNAV_SSTS_MAIN_GOTO" id="DERIVED_SSTSNAV_SSTS_MAIN_GOTO" tabindex="16" size="1" class="PSDROPDOWNLIST" style="width:128px; " psnchg="0">
++<option value="0100">Centro Alumno</option>
++<option value="0300">Consulta de Cuentas</option>
++<option value="0200">Mi Horario de Clases</option>
++<option value="9999" selected="selected">Más...</option>
++</select>
++</td>
++</tr>
++<tr>
++<td height="15" colspan="2"></td>
++<td colspan="3" valign="top" align="left">
++<span class="PALEVEL0PRIMARY">David Alvarez Aviles</span>
++</td>
++</tr>
++<tr>
++<td height="8" colspan="3"></td>
++<td colspan="3" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="484">
++<tbody><tr><td width="482" height="6">
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="3" colspan="7"></td>
++</tr>
++<tr>
++<td height="25"></td>
++<td colspan="7" valign="top" align="left">
++<div style="width:524px; height:24px; ">
++<!-- Begin HTML Area DERIVED_SSTSNAV_SSTS_NAV_TABS -->
++<table border="0" cellspacing="0" cellpadding="0"><tbody><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td></tr><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
++<td class="ssstabactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SS_WEEKLY_SCHEDULE.GBL?Page=SS_WEEKLY_SCHEDULE&amp;Action=U" class="ssstabtext">Mi Programa de Clases</a></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
++<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_PLANNER.GBL?Page=SSR_PLANNER_MAIN&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Lista Previsiones</a></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
++<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?Page=SSR_CLSRCH_MAIN&amp;Action=U" class="ssstabtext">Búsqueda de Clase</a></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
++<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_ADD.GBL?Page=SSR_SSENRL_ADD&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Introducción</a></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
++<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_DROP.GBL?Page=SSR_SSENRL_DROP&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Baja</a></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td></tr><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
++<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td></tr></tbody></table>
++<!-- End HTML Area -->
++</div>
++</td>
++</tr>
++<tr>
++<td height="8" colspan="3"></td>
++<td valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="36">
++<tbody><tr><td width="34" height="6">
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="0" colspan="9"></td>
++</tr>
++<tr>
++<td height="18" colspan="2"></td>
++<td colspan="7" valign="top" align="left">
++<span class="PATRANSACTIONTITLE">Mi Programa de Clases</span>
++</td>
++</tr>
++</tbody></table>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="29" colspan="19"></td>
++</tr>
++<tr>
++<td height="4" colspan="5"></td>
++<td colspan="2" rowspan="3" nowrap="nowrap" valign="top" align="left">
++<input type="radio" name="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" id="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" tabindex="14" value="L" onclick="submitAction_win0(this.form,this.name);"><label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" class="PSRADIOBUTTON">Vista Listado</label>
++
++</td>
++<td colspan="12" rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="radio" name="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" id="DERIVED_REGFRM1_SSR_SCHED_FORMAT$5$" tabindex="15" value="W" checked="checked" onclick="submitAction_win0(this.form,this.name);"><label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$5$" class="PSRADIOBUTTON">Vista Horario Semanal</label>
++
++</td>
++</tr>
++<tr>
++<td height="20" colspan="3"></td>
++<td colspan="2" rowspan="2" valign="top" align="left">
++<label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$3$" class="SSSTEXTTURQBOLD">Opción Visualización</label>
++</td>
++</tr>
++<tr>
++<td height="5" colspan="3"></td>
++<td colspan="6"></td>
++<td colspan="3" rowspan="2" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
++<tbody><tr><td width="129">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="3" height="9"></td>
++<td width="126"></td>
++</tr>
++<tr>
++<td height="13"></td>
++<td valign="top" align="left">
++<span class="SSSBUTTON_CONFIRMLINK">
++<a name="DERIVED_CLASS_S_SSR_REFRESH_CAL" id="DERIVED_CLASS_S_SSR_REFRESH_CAL" tabindex="24" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_REFRESH_CAL');" class="SSSBUTTON_CONFIRMLINK">Actualizar Calendario</a></span>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="19" colspan="3"></td>
++<td rowspan="4" valign="top" align="left">
++<label for="DERIVED_CLASS_S_START_DT" class="SSSTEXTTURQBOLD">Mostrar Semana</label>
++</td>
++<td colspan="2" rowspan="4" nowrap="nowrap" valign="top" align="left">
++<input type="text" name="DERIVED_CLASS_S_START_DT" id="DERIVED_CLASS_S_START_DT" tabindex="20" value="01/19/2026" class="PSEDITBOX" style="width:72px; " maxlength="10" onchange="return doEdits_win0(this,'DMDY/450','N','N','N','N','N','N',0);" onkeyup="if (isPromptKey(event))DatePrompt_win0('DERIVED_CLASS_S_START_DT','DERIVED_CLASS_S_START_DT','450',false);return false;"><a name="DERIVED_CLASS_S_START_DT$prompt" id="DERIVED_CLASS_S_START_DT$prompt" tabindex="21" onfocus="doFocus_win0(this,true,false);" href="javascript:DatePrompt_win0('DERIVED_CLASS_S_START_DT','DERIVED_CLASS_S_START_DT$prompt','450',false);"><img src="/cs/ITSONPRD/cache/PT_CALENDAR_ESP_1.gif" alt="Selección de Fecha (Alt+5)" title="Selección de Fecha (Alt+5)" border="0" align="absmiddle"></a>
++</td>
++<td colspan="2" rowspan="4" valign="top" align="left">
++<label for="DERIVED_CLASS_S_MEETING_TIME_START" class="SSSTEXTTURQBOLD">Hora Inicio</label>
++</td>
++<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="text" name="DERIVED_CLASS_S_MEETING_TIME_START" id="DERIVED_CLASS_S_MEETING_TIME_START" tabindex="22" value="7:00AM" class="PSEDITBOX" style="width:55px; " maxlength="9" onchange="return doEdits_win0(this,'TPM;AM','N','N','N','N','N','N',0);">
++</td>
++<td rowspan="2" valign="top" align="left">
++<label for="DERIVED_CLASS_S_MEETING_TIME_END" class="SSSTEXTTURQBOLD">Hora Fin</label>
++</td>
++<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="text" name="DERIVED_CLASS_S_MEETING_TIME_END" id="DERIVED_CLASS_S_MEETING_TIME_END" tabindex="23" value="10:00PM" class="PSEDITBOX" style="width:55px; " maxlength="9" onchange="return doEdits_win0(this,'TPM;AM','N','N','N','N','N','N',0);">
++</td>
++</tr>
++<tr>
++<td height="4" colspan="3"></td>
++</tr>
++<tr>
++<td height="20" colspan="3"></td>
++<td rowspan="2"></td>
++<td colspan="3" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="163">
++<tbody><tr><td width="161">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="161" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="23" height="5"></td>
++<td width="138"></td>
++</tr>
++<tr>
++<td height="13"></td>
++<td valign="top" align="left">
++<span class="SSSBUTTON_CANCELLINK">
++<a name="DERIVED_CLASS_S_SSR_PREV_WEEK" id="DERIVED_CLASS_S_SSR_PREV_WEEK" tabindex="25" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_PREV_WEEK');" class="SSSBUTTON_CANCELLINK">&lt; Semana Anterior</a></span>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++<td rowspan="2"></td>
++<td colspan="3" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
++<tbody><tr><td width="129">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="3" height="5"></td>
++<td width="126"></td>
++</tr>
++<tr>
++<td height="13"></td>
++<td valign="top" align="left">
++<span class="SSSBUTTON_CANCELLINK">
++<a name="DERIVED_CLASS_S_SSR_NEXT_WEEK" id="DERIVED_CLASS_S_SSR_NEXT_WEEK" tabindex="26" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_NEXT_WEEK');" class="SSSBUTTON_CANCELLINK">Siguiente Semana &gt;</a></span>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="4" colspan="3"></td>
++</tr>
++<tr>
++<td height="323" colspan="2"></td>
++<td colspan="16" valign="top" align="left">
++<table border="1" cellspacing="0" class="PSLEVEL1GRIDWBO" id="STDNT_CLASS_TIM$scroll$0" dir="ltr" cellpadding="2" cols="8" width="830">
++<tbody><tr><td class="PSLEVEL1GRIDLABEL" colspan="8" align="left">Semana de 1/19/2026 - 1/25/2026</td></tr>
++<tr valign="center">
++<th scope="col" width="110" align="left" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt1$0" tabindex="41" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt1$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Hora</a></th>
++<th scope="col" width="93" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt2$0" tabindex="42" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt2$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Lunes</a></th>
++<th scope="col" width="95" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt3$0" tabindex="43" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt3$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Martes</a></th>
++<th scope="col" width="93" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt4$0" tabindex="44" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt4$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Miércoles</a></th>
++<th scope="col" width="95" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt5$0" tabindex="45" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt5$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Jueves</a></th>
++<th scope="col" width="94" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt6$0" tabindex="46" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt6$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Viernes</a></th>
++<th scope="col" width="96" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt7$0" tabindex="47" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt7$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Sábado</a></th>
++<th scope="col" width="97" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt8$0" tabindex="48" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt8$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Domingo</a></th>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">7:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">8:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">9:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512<br><br>C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512<br><br>C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">10:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>9:00AM - 11:00AM<br><br>C 1123C - 105<br>9:00AM - 11:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>9:00AM - 11:00AM<br><br>C 1123C - 105<br>9:00AM - 11:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">11:00AM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">TUTORIA 1132T - 157<br>Clase<br>11:00AM - 12:00PM<br>Centro Integral de Tecnologia LM0710</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>Teoria<br>11:00AM - 12:30PM<br>Centro Integral de Tecnologia LM0712</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>Teoria<br>11:00AM - 12:30PM<br>Centro Integral de Tecnologia LM0712</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">12:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>11:00AM - 12:30PM<br><br>C 1124C - 111<br>Laboratorio<br>12:30PM - 2:00PM<br>Centro Integral de Tecnologia LM0712</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>11:00AM - 12:30PM<br><br>C 1124C - 111<br>Laboratorio<br>12:30PM - 2:00PM<br>Centro Integral de Tecnologia LM0712</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">1:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 111<br>12:30PM - 2:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>1:00PM - 2:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1123C - 105<br>Teoria<br>1:00PM - 2:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 111<br>12:30PM - 2:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">2:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">3:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">4:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1115C - 113<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 5:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 5:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">5:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>4:00PM - 6:00PM<br><br>M 1178M - 107<br>4:00PM - 6:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>4:00PM - 6:00PM<br><br>C 1115C - 113<br>4:00PM - 6:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>4:00PM - 6:00PM<br><br>M 1178M - 107<br>4:00PM - 6:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>Teoria<br>5:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1115C - 113<br>Teoria<br>5:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">6:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">7:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">8:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">9:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++<tr valign="center">
++<td align="left" class="PSLEVEL1GRIDROW" height="11">
++<span class="PSEDITBOX_DISPONLY">10:00PM</span>
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++<td align="left" class="PSLEVEL1GRIDROW">
++&nbsp;
++</td>
++</tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="8" colspan="19"></td>
++</tr>
++<tr>
++<td height="35"></td>
++<td colspan="17" valign="top" align="left">
++<div style="width:764px; height:20px; ">
++<!-- Begin HTML Area $ICField2 -->
++
++
++
++<title>Documento sin título</title>
++<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
++
++
++
++<p><strong><font size="-1">
++ *Acepto y me comprometo a liquidar el importe de las materias seleccionadas en este proceso de inscripción, cumpliendo con las fechas de pago establecidas por la institución.</font></strong></p>
++
++
++<!-- End HTML Area -->
++</div>
++</td>
++</tr>
++<tr>
++<td height="92" colspan="2"></td>
++<td colspan="15" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PSGROUPBOXWBO" width="719">
++<tbody><tr><td class="PSGROUPBOXLABEL" align="left"><a name="DERIVED_CLASS_S_MONDAY_LBL" id="DERIVED_CLASS_S_MONDAY_LBL" tabindex="-1" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_MONDAY_LBL');"><img src="/cs/ITSONPRD/cache/PT_COLLAPSE_ESP_1.gif" alt="Contraer Sección" title="Contraer Sección" border="0"></a>&nbsp;Opciones Visualización&nbsp;</td></tr>
++<tr><td width="717">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="7" width="717" class="PSGROUPBOX" style="border-style:none">
++<tbody><tr>
++<td width="23" height="5"></td>
++<td width="200"></td>
++<td width="144"></td>
++<td width="132"></td>
++<td width="76"></td>
++<td width="132"></td>
++<td width="10"></td>
++</tr>
++<tr>
++<td height="15"></td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_SHOW_INSTR$chk" value="N">
++<input type="checkbox" name="DERIVED_CLASS_S_SHOW_INSTR" id="DERIVED_CLASS_S_SHOW_INSTR" tabindex="94" value="Y" onclick="this.form.DERIVED_CLASS_S_SHOW_INSTR$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SHOW_INSTR" class="PSCHECKBOX">Mostrar Profesores</label>
++
++</td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_MONDAY_LBL$49$$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_MONDAY_LBL$49$" id="DERIVED_CLASS_S_MONDAY_LBL$49$" tabindex="97" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_MONDAY_LBL$49$$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_MONDAY_LBL$49$" class="PSCHECKBOX">Lunes</label>
++
++</td>
++<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_THURSDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_THURSDAY_LBL" id="DERIVED_CLASS_S_THURSDAY_LBL" tabindex="100" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_THURSDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_THURSDAY_LBL" class="PSCHECKBOX">Jueves</label>
++
++</td>
++</tr>
++<tr>
++<td height="9"></td>
++<td rowspan="2" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
++<tbody><tr><td width="129">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="3" height="9"></td>
++<td width="126"></td>
++</tr>
++<tr>
++<td height="13"></td>
++<td valign="top" align="left">
++<span class="SSSBUTTON_CONFIRMLINK">
++<a name="DERIVED_CLASS_S_SSR_REFRESH_CAL$57$" id="DERIVED_CLASS_S_SSR_REFRESH_CAL$57$" tabindex="104" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_REFRESH_CAL$57$');" class="SSSBUTTON_CONFIRMLINK">Actualizar Calendario</a></span>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="15"></td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_SHOW_AM_PM$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_SHOW_AM_PM" id="DERIVED_CLASS_S_SHOW_AM_PM" tabindex="95" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SHOW_AM_PM$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SHOW_AM_PM" class="PSCHECKBOX">Mostrar AM/PM</label>
++
++</td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_TUESDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_TUESDAY_LBL" id="DERIVED_CLASS_S_TUESDAY_LBL" tabindex="98" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_TUESDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_TUESDAY_LBL" class="PSCHECKBOX">Martes</label>
++
++</td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_FRIDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_FRIDAY_LBL" id="DERIVED_CLASS_S_FRIDAY_LBL" tabindex="101" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_FRIDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_FRIDAY_LBL" class="PSCHECKBOX">Viernes</label>
++
++</td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_SUNDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_SUNDAY_LBL" id="DERIVED_CLASS_S_SUNDAY_LBL" tabindex="103" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SUNDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SUNDAY_LBL" class="PSCHECKBOX">Domingo</label>
++
++</td>
++</tr>
++<tr>
++<td height="9"></td>
++</tr>
++<tr>
++<td height="21"></td>
++<td nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_SSR_DISP_TITLE$chk" value="N">
++<input type="checkbox" name="DERIVED_CLASS_S_SSR_DISP_TITLE" id="DERIVED_CLASS_S_SSR_DISP_TITLE" tabindex="96" value="Y" onclick="this.form.DERIVED_CLASS_S_SSR_DISP_TITLE$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SSR_DISP_TITLE" class="PSCHECKBOX">Mostrar Título Clase</label>
++
++</td>
++<td nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_WEDNESDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_WEDNESDAY_LBL" id="DERIVED_CLASS_S_WEDNESDAY_LBL" tabindex="99" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_WEDNESDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_WEDNESDAY_LBL" class="PSCHECKBOX">Miércoles</label>
++
++</td>
++<td colspan="4" nowrap="nowrap" valign="top" align="left">
++<input type="hidden" name="DERIVED_CLASS_S_SATURDAY_LBL$chk" value="Y">
++<input type="checkbox" name="DERIVED_CLASS_S_SATURDAY_LBL" id="DERIVED_CLASS_S_SATURDAY_LBL" tabindex="102" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SATURDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SATURDAY_LBL" class="PSCHECKBOX">Sábado</label>
++
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="8" colspan="19"></td>
++</tr>
++<tr>
++<td height="72" colspan="2"></td>
++<td colspan="13" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="571">
++<tbody><tr><td class="PAGROUPBOXLABELINVISIBLE" align="left">Diferido</td></tr>
++<tr><td width="569">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="10" width="569" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="3" height="0"></td>
++<td width="4"></td>
++<td width="52"></td>
++<td width="64"></td>
++<td width="52"></td>
++<td width="64"></td>
++<td width="92"></td>
++<td width="56"></td>
++<td width="180"></td>
++<td width="2"></td>
++</tr>
++<tr>
++<td height="18" colspan="2"></td>
++<td colspan="7" valign="top" align="left">
++<hr width="100%" align="left" class="PSHORIZONTALRULE">
++</td>
++</tr>
++<tr>
++<td height="10" colspan="2"></td>
++<td colspan="2" nowrap="nowrap" valign="top" align="left">
++<span class="PSHYPERLINK">
++<a name="DERIVED_SSSLINK_SS_CLS_SCHED_LINK" id="DERIVED_SSSLINK_SS_CLS_SCHED_LINK" tabindex="106" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SS_CLS_SCHED_LINK');" class="PSHYPERLINK" title="Ver Programa Clases">Mi Horario Clases</a></span>
++</td>
++<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
++<span class="PSHYPERLINK">
++<a name="DERIVED_SSSLINK_SSS_SCHED_PLANNER" id="DERIVED_SSSLINK_SSS_SCHED_PLANNER" tabindex="107" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SSS_SCHED_PLANNER');" class="PSHYPERLINK">Lista Previsiones</a></span>
++</td>
++<td rowspan="4" nowrap="nowrap" valign="top" align="left">
++<span class="PSHYPERLINK">
++<a name="DERIVED_SSSLINK_SS_CAT_SCHED_LINK" id="DERIVED_SSSLINK_SS_CAT_SCHED_LINK" tabindex="108" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SS_CAT_SCHED_LINK');" class="PSHYPERLINK">Buscar Clase</a></span>
++</td>
++<td rowspan="4" nowrap="nowrap" valign="top" align="left">
++<span class="PSHYPERLINK">
++<a name="DERIVED_SSSLINK_LINK_ADD_ENRL" id="DERIVED_SSSLINK_LINK_ADD_ENRL" tabindex="109" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_LINK_ADD_ENRL');" class="PSHYPERLINK" title="Añadir Clase">Añadir</a></span>
++</td>
++<td colspan="2" rowspan="4" nowrap="nowrap" valign="top" align="left">
++<span class="PSHYPERLINK">
++<a name="DERIVED_SSSLINK_LINK_DROP_ENRL" id="DERIVED_SSSLINK_LINK_DROP_ENRL" tabindex="110" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_LINK_DROP_ENRL');" class="PSHYPERLINK" title="Baja Clase">Baja</a></span>
++</td>
++</tr>
++<tr>
++<td height="8" colspan="2"></td>
++<td valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="52">
++<tbody><tr><td width="50" height="6">
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="28"></td>
++<td colspan="4" valign="top" align="left">
++<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="171">
++<tbody><tr><td width="169">
++<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="3" width="169" class="PABACKGROUNDINVISIBLE" style="border-style:none">
++<tbody><tr>
++<td width="3" height="3"></td>
++<td width="128"></td>
++<td width="38"></td>
++</tr>
++<tr>
++<td height="1" colspan="2"></td>
++<td rowspan="2" nowrap="nowrap" valign="top" align="left">
++<a name="DERIVED_SSTSNAV_GO$72$" id="DERIVED_SSTSNAV_GO$72$" tabindex="114" href="javascript:submitAction_win0(document.win0,'DERIVED_SSTSNAV_GO$72$');"><img src="/cs/ITSONPRD/cache/PT_NAV_GO_ESP_1.gif" name="DERIVED_SSTSNAV_GO$72$$IMG" alt="IR" title="IR" border="0"></a>
++</td>
++</tr>
++<tr>
++<td height="22"></td>
++<td valign="top" align="left">
++<select name="DERIVED_SSTSNAV_SSTS_MAIN_GOTO$71$" id="DERIVED_SSTSNAV_SSTS_MAIN_GOTO$71$" tabindex="113" size="1" class="PSDROPDOWNLIST" style="width:128px; " psnchg="0">
++<option value="0100">Centro Alumno</option>
++<option value="0300">Consulta de Cuentas</option>
++<option value="0200">Mi Horario de Clases</option>
++<option value="9999" selected="selected">Más...</option>
++</select>
++</td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="3" colspan="6"></td>
++</tr>
++</tbody></table>
++</td></tr>
++</tbody></table>
++</td>
++</tr>
++<tr>
++<td height="9" colspan="19"></td>
++</tr>
++</tbody></table>
++<iframe name="CalFrame" id="CalFrame" style="position:absolute; left:0; top:0; height:0; width:0; display:block; visibility:hidden;" marginheight="0" marginwidth="0" noresize="noresize" frameborder="0" scrolling="no" src="/cs/ITSONPRD/cache/PT_CALENDARPAGE_P_ESP_1.htm">Calendar not supported</iframe>
++</td></tr>
++</tbody></table>
+\ No newline at end of file
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
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

### `scripts/tabla-celdas-real.json`
```diff
diff --git a/scripts/tabla-celdas-real.json b/scripts/tabla-celdas-real.json
new file mode 100644
index 0000000..0ff61d0
--- /dev/null
+++ b/scripts/tabla-celdas-real.json
@@ -0,0 +1,2054 @@
+[
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases\n\n\n\tVista Listado\tVista Horario Semanal\n\tOpción Visualización\n\t\t\n\t"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "13",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás...\n\n\tDavid Alvarez Aviles\n\t\n\n\n\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\tMi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja\t\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n\n\t\n\n\n\tMi Programa de Clases"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "7",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "5",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "5",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": "David Alvarez Aviles"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "7",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "7",
+    "id": "",
+    "text": "Mi Programa de Clases\t\t\tLista Previsiones\t\t\tBúsqueda de Clase\t\t\tIntroducción\t\t\tBaja"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Mi Programa de Clases"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Lista Previsiones"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Búsqueda de Clase"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Introducción"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Baja"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "9",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "7",
+    "id": "",
+    "text": "Mi Programa de Clases"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "19",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "5",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "3",
+    "colspan": "2",
+    "id": "",
+    "text": "Vista Listado"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "12",
+    "id": "",
+    "text": "Vista Horario Semanal"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": "Opción Visualización"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "6",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "3",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "4",
+    "colspan": "1",
+    "id": "",
+    "text": "Mostrar Semana"
+  },
+  {
+    "rowspan": "4",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "4",
+    "colspan": "2",
+    "id": "",
+    "text": "Hora Inicio"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Hora Fin"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": "< Semana Anterior"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "< Semana Anterior"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "< Semana Anterior"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": "Siguiente Semana >"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Siguiente Semana >"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Siguiente Semana >"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "3",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "16",
+    "id": "",
+    "text": "Semana de 1/19/2026 - 1/25/2026\nHora\tLunes\tMartes\tMiércoles\tJueves\tViernes\tSábado\tDomingo\n7:00AM\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322\tIDIOMA 1043D - 104\nTeoria\n"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "8",
+    "id": "",
+    "text": "Semana de 1/19/2026 - 1/25/2026"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "7:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "IDIOMA 1043D - 104\nTeoria\n7:00AM - 8:00AM\nAulas 300 AM0322"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "8:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1165M - 102\nTeoria\n8:00AM - 9:00AM\nAulas 400 AM0425"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "9:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512\n\nC 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512\n\nC 1123C - 105\nTeoria\n9:00AM - 11:00AM\nAulas 500 AM0512"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "10:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1123C - 105\n9:00AM - 11:00AM\n\nC 1123C - 105\n9:00AM - 11:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1123C - 105\n9:00AM - 11:00AM\n\nC 1123C - 105\n9:00AM - 11:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "11:00AM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "TUTORIA 1132T - 157\nClase\n11:00AM - 12:00PM\nCentro Integral de Tecnologia LM0710"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 110\nTeoria\n11:00AM - 12:30PM\nCentro Integral de Tecnologia LM0712"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 110\nTeoria\n11:00AM - 12:30PM\nCentro Integral de Tecnologia LM0712"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "12:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 110\n11:00AM - 12:30PM\n\nC 1124C - 111\nLaboratorio\n12:30PM - 2:00PM\nCentro Integral de Tecnologia LM0712"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 110\n11:00AM - 12:30PM\n\nC 1124C - 111\nLaboratorio\n12:30PM - 2:00PM\nCentro Integral de Tecnologia LM0712"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "1:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 111\n12:30PM - 2:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1123C - 105\nTeoria\n1:00PM - 2:00PM\nCurso a distancia con herramientas de Internet\n\nC 1123C - 105\nTeoria\n1:00PM - 2:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1124C - 111\n12:30PM - 2:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "2:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "3:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "4:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1115C - 113\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nC 1115C - 113\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1178M - 107\nTeoria\n4:00PM - 5:00PM\nCurso a distancia con herramientas de Internet\n\nM 1178M - 107\nTeoria\n4:00PM - 5:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "5:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1178M - 107\n4:00PM - 6:00PM\n\nM 1178M - 107\n4:00PM - 6:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1115C - 113\n4:00PM - 6:00PM\n\nC 1115C - 113\n4:00PM - 6:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "M 1178M - 107\n4:00PM - 6:00PM\n\nM 1178M - 107\n4:00PM - 6:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "C 1115C - 113\nTeoria\n5:00PM - 6:00PM\nCurso a distancia con herramientas de Internet\n\nC 1115C - 113\nTeoria\n5:00PM - 6:00PM\nCurso a distancia con herramientas de Internet"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "6:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "7:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "8:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "9:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "10:00PM"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "19",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "17",
+    "id": "",
+    "text": "*Acepto y me comprometo a liquidar el importe de las materias seleccionadas en este proceso de inscripción, cumpliendo con las fechas de pago establecidas por la institución."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "15",
+    "id": "",
+    "text": "Opciones Visualización \n\n\t\t\t\t\t\t\n\tMostrar Profesores\tLunes\tJueves\n\t\n\t\n\tActualizar Calendario\n\n\tMostrar AM/PM\tMartes\tViernes\tDomingo\n\n\tMostrar Título Clase\tMiércoles\tSábado"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Opciones Visualización"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Mostrar Profesores\tLunes\tJueves\n\t\n\t\n\tActualizar Calendario\n\n\tMostrar AM/PM\tMartes\tViernes\tDomingo\n\n\tMostrar Título Clase\tMiércoles\tSábado"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Mostrar Profesores"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Lunes"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": "Jueves"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Actualizar Calendario"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Mostrar AM/PM"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Martes"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Viernes"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": "Domingo"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Mostrar Título Clase"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Miércoles"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "4",
+    "id": "",
+    "text": "Sábado"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "19",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "13",
+    "id": "",
+    "text": "Diferido\n\n\t\t\t\t\t\t\t\t\t\n\t\n\n\tMi Horario Clases\tLista Previsiones\tBuscar Clase\tAñadir\tBaja\n\t\n\n\t\n\t\t\n\t\n\t\nCentro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Diferido"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Mi Horario Clases\tLista Previsiones\tBuscar Clase\tAñadir\tBaja\n\t\n\n\t\n\t\t\n\t\n\t\nCentro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "7",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": "Mi Horario Clases"
+  },
+  {
+    "rowspan": "2",
+    "colspan": "2",
+    "id": "",
+    "text": "Lista Previsiones"
+  },
+  {
+    "rowspan": "4",
+    "colspan": "1",
+    "id": "",
+    "text": "Buscar Clase"
+  },
+  {
+    "rowspan": "4",
+    "colspan": "1",
+    "id": "",
+    "text": "Añadir"
+  },
+  {
+    "rowspan": "4",
+    "colspan": "2",
+    "id": "",
+    "text": "Baja"
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "4",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "2",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "2",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "1",
+    "id": "",
+    "text": "Centro Alumno\nConsulta de Cuentas\nMi Horario de Clases\nMás..."
+  },
+  {
+    "rowspan": "1",
+    "colspan": "6",
+    "id": "",
+    "text": ""
+  },
+  {
+    "rowspan": "1",
+    "colspan": "19",
+    "id": "",
+    "text": ""
+  }
+]
\ No newline at end of file
```

### `scripts/tabla-horario-real.html`
```diff
diff --git a/scripts/tabla-horario-real.html b/scripts/tabla-horario-real.html
new file mode 100644
index 0000000..807e79d
--- /dev/null
+++ b/scripts/tabla-horario-real.html
@@ -0,0 +1,934 @@
+<table class="PSPAGECONTAINER"><tbody><tr><td>
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" class="PSPAGECONTAINER" cols="19" width="837">
+<tbody><tr>
+<td width="0" height="0"></td>
+<td width="4"></td>
+<td width="4"></td>
+<td width="104"></td>
+<td width="20"></td>
+<td width="80"></td>
+<td width="28"></td>
+<td width="44"></td>
+<td width="8"></td>
+<td width="52"></td>
+<td width="56"></td>
+<td width="56"></td>
+<td width="4"></td>
+<td width="80"></td>
+<td width="36"></td>
+<td width="16"></td>
+<td width="132"></td>
+<td width="110"></td>
+<td width="3"></td>
+</tr>
+<tr>
+<td height="88"></td>
+<td colspan="13" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="539">
+<tbody><tr><td width="537">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="3" width="537" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="0" height="0"></td>
+<td width="536"></td>
+<td width="2"></td>
+</tr>
+<tr>
+<td height="86"></td>
+<td valign="top" align="left">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="9" width="535" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="8" height="0"></td>
+<td width="2"></td>
+<td width="2"></td>
+<td width="36"></td>
+<td width="332"></td>
+<td width="116"></td>
+<td width="12"></td>
+<td width="24"></td>
+<td width="3"></td>
+</tr>
+<tr>
+<td height="1" colspan="7"></td>
+<td colspan="2" rowspan="5" nowrap="nowrap" valign="top" align="left">
+<a name="DERIVED_SSTSNAV_GO" id="DERIVED_SSTSNAV_GO" tabindex="17" href="javascript:submitAction_win0(document.win0,'DERIVED_SSTSNAV_GO');"><img src="/cs/ITSONPRD/cache/PT_NAV_GO_ESP_1.gif" name="DERIVED_SSTSNAV_GO$IMG" alt="IR" title="IR" border="0"></a>
+</td>
+</tr>
+<tr>
+<td height="2" colspan="5"></td>
+<td colspan="2" rowspan="2" valign="top" align="left">
+<select name="DERIVED_SSTSNAV_SSTS_MAIN_GOTO" id="DERIVED_SSTSNAV_SSTS_MAIN_GOTO" tabindex="16" size="1" class="PSDROPDOWNLIST" style="width:128px; " psnchg="0">
+<option value="0100">Centro Alumno</option>
+<option value="0300">Consulta de Cuentas</option>
+<option value="0200">Mi Horario de Clases</option>
+<option value="9999" selected="selected">Más...</option>
+</select>
+</td>
+</tr>
+<tr>
+<td height="15" colspan="2"></td>
+<td colspan="3" valign="top" align="left">
+<span class="PALEVEL0PRIMARY">David Alvarez Aviles</span>
+</td>
+</tr>
+<tr>
+<td height="8" colspan="3"></td>
+<td colspan="3" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="484">
+<tbody><tr><td width="482" height="6">
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="3" colspan="7"></td>
+</tr>
+<tr>
+<td height="25"></td>
+<td colspan="7" valign="top" align="left">
+<div style="width:524px; height:24px; ">
+<!-- Begin HTML Area DERIVED_SSTSNAV_SSTS_NAV_TABS -->
+<table border="0" cellspacing="0" cellpadding="0"><tbody><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_TOP_IMG_ESP_1.gif" width="8" height="6"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERTOP_IMG_ESP_1.gif" height="6" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_TOP_IMG_ESP_1.gif" width="8" height="6"></td></tr><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
+<td class="ssstabactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SS_WEEKLY_SCHEDULE.GBL?Page=SS_WEEKLY_SCHEDULE&amp;Action=U" class="ssstabtext">Mi Programa de Clases</a></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
+<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_PLANNER.GBL?Page=SSR_PLANNER_MAIN&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Lista Previsiones</a></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
+<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?Page=SSR_CLSRCH_MAIN&amp;Action=U" class="ssstabtext">Búsqueda de Clase</a></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
+<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_ADD.GBL?Page=SSR_SSENRL_ADD&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Introducción</a></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td>
+<td class="ssstabinactive"><a href="/psc/ITSONPRD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_DROP.GBL?Page=SSR_SSENRL_DROP&amp;Action=A&amp;ACAD_CAREER=LIC&amp;EMPLID=00000279009&amp;ENRL_REQUEST_ID=&amp;INSTITUTION=ITSON&amp;STRM=3147" class="ssstabtext">Baja</a></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_CENTER_IMG_ESP_1.gif" width="8" height="15"></td></tr><tr><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_A_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td><td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_LEFT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_CENTERBOTTOM_IMG_ESP_1.gif" height="2" class="ssstabwidth"></td>
+<td><img src="/cs/ITSONPRD/cache/PS_CS_TAB_IA_RIGHT_BOTTOM_IMG_ESP_1.gif" width="8" height="2"></td></tr></tbody></table>
+<!-- End HTML Area -->
+</div>
+</td>
+</tr>
+<tr>
+<td height="8" colspan="3"></td>
+<td valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="36">
+<tbody><tr><td width="34" height="6">
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="0" colspan="9"></td>
+</tr>
+<tr>
+<td height="18" colspan="2"></td>
+<td colspan="7" valign="top" align="left">
+<span class="PATRANSACTIONTITLE">Mi Programa de Clases</span>
+</td>
+</tr>
+</tbody></table>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="29" colspan="19"></td>
+</tr>
+<tr>
+<td height="4" colspan="5"></td>
+<td colspan="2" rowspan="3" nowrap="nowrap" valign="top" align="left">
+<input type="radio" name="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" id="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" tabindex="14" value="L" onclick="submitAction_win0(this.form,this.name);"><label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" class="PSRADIOBUTTON">Vista Listado</label>
+
+</td>
+<td colspan="12" rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="radio" name="DERIVED_REGFRM1_SSR_SCHED_FORMAT$4$" id="DERIVED_REGFRM1_SSR_SCHED_FORMAT$5$" tabindex="15" value="W" checked="checked" onclick="submitAction_win0(this.form,this.name);"><label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$5$" class="PSRADIOBUTTON">Vista Horario Semanal</label>
+
+</td>
+</tr>
+<tr>
+<td height="20" colspan="3"></td>
+<td colspan="2" rowspan="2" valign="top" align="left">
+<label for="DERIVED_REGFRM1_SSR_SCHED_FORMAT$3$" class="SSSTEXTTURQBOLD">Opción Visualización</label>
+</td>
+</tr>
+<tr>
+<td height="5" colspan="3"></td>
+<td colspan="6"></td>
+<td colspan="3" rowspan="2" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
+<tbody><tr><td width="129">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="3" height="9"></td>
+<td width="126"></td>
+</tr>
+<tr>
+<td height="13"></td>
+<td valign="top" align="left">
+<span class="SSSBUTTON_CONFIRMLINK">
+<a name="DERIVED_CLASS_S_SSR_REFRESH_CAL" id="DERIVED_CLASS_S_SSR_REFRESH_CAL" tabindex="24" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_REFRESH_CAL');" class="SSSBUTTON_CONFIRMLINK">Actualizar Calendario</a></span>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="19" colspan="3"></td>
+<td rowspan="4" valign="top" align="left">
+<label for="DERIVED_CLASS_S_START_DT" class="SSSTEXTTURQBOLD">Mostrar Semana</label>
+</td>
+<td colspan="2" rowspan="4" nowrap="nowrap" valign="top" align="left">
+<input type="text" name="DERIVED_CLASS_S_START_DT" id="DERIVED_CLASS_S_START_DT" tabindex="20" value="01/19/2026" class="PSEDITBOX" style="width:72px; " maxlength="10" onchange="return doEdits_win0(this,'DMDY/450','N','N','N','N','N','N',0);" onkeyup="if (isPromptKey(event))DatePrompt_win0('DERIVED_CLASS_S_START_DT','DERIVED_CLASS_S_START_DT','450',false);return false;"><a name="DERIVED_CLASS_S_START_DT$prompt" id="DERIVED_CLASS_S_START_DT$prompt" tabindex="21" onfocus="doFocus_win0(this,true,false);" href="javascript:DatePrompt_win0('DERIVED_CLASS_S_START_DT','DERIVED_CLASS_S_START_DT$prompt','450',false);"><img src="/cs/ITSONPRD/cache/PT_CALENDAR_ESP_1.gif" alt="Selección de Fecha (Alt+5)" title="Selección de Fecha (Alt+5)" border="0" align="absmiddle"></a>
+</td>
+<td colspan="2" rowspan="4" valign="top" align="left">
+<label for="DERIVED_CLASS_S_MEETING_TIME_START" class="SSSTEXTTURQBOLD">Hora Inicio</label>
+</td>
+<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="text" name="DERIVED_CLASS_S_MEETING_TIME_START" id="DERIVED_CLASS_S_MEETING_TIME_START" tabindex="22" value="7:00AM" class="PSEDITBOX" style="width:55px; " maxlength="9" onchange="return doEdits_win0(this,'TPM;AM','N','N','N','N','N','N',0);">
+</td>
+<td rowspan="2" valign="top" align="left">
+<label for="DERIVED_CLASS_S_MEETING_TIME_END" class="SSSTEXTTURQBOLD">Hora Fin</label>
+</td>
+<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="text" name="DERIVED_CLASS_S_MEETING_TIME_END" id="DERIVED_CLASS_S_MEETING_TIME_END" tabindex="23" value="10:00PM" class="PSEDITBOX" style="width:55px; " maxlength="9" onchange="return doEdits_win0(this,'TPM;AM','N','N','N','N','N','N',0);">
+</td>
+</tr>
+<tr>
+<td height="4" colspan="3"></td>
+</tr>
+<tr>
+<td height="20" colspan="3"></td>
+<td rowspan="2"></td>
+<td colspan="3" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="163">
+<tbody><tr><td width="161">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="161" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="23" height="5"></td>
+<td width="138"></td>
+</tr>
+<tr>
+<td height="13"></td>
+<td valign="top" align="left">
+<span class="SSSBUTTON_CANCELLINK">
+<a name="DERIVED_CLASS_S_SSR_PREV_WEEK" id="DERIVED_CLASS_S_SSR_PREV_WEEK" tabindex="25" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_PREV_WEEK');" class="SSSBUTTON_CANCELLINK">&lt; Semana Anterior</a></span>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+<td rowspan="2"></td>
+<td colspan="3" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
+<tbody><tr><td width="129">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="3" height="5"></td>
+<td width="126"></td>
+</tr>
+<tr>
+<td height="13"></td>
+<td valign="top" align="left">
+<span class="SSSBUTTON_CANCELLINK">
+<a name="DERIVED_CLASS_S_SSR_NEXT_WEEK" id="DERIVED_CLASS_S_SSR_NEXT_WEEK" tabindex="26" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_NEXT_WEEK');" class="SSSBUTTON_CANCELLINK">Siguiente Semana &gt;</a></span>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="4" colspan="3"></td>
+</tr>
+<tr>
+<td height="323" colspan="2"></td>
+<td colspan="16" valign="top" align="left">
+<table border="1" cellspacing="0" class="PSLEVEL1GRIDWBO" id="STDNT_CLASS_TIM$scroll$0" dir="ltr" cellpadding="2" cols="8" width="830">
+<tbody><tr><td class="PSLEVEL1GRIDLABEL" colspan="8" align="left">Semana de 1/19/2026 - 1/25/2026</td></tr>
+<tr valign="center">
+<th scope="col" width="110" align="left" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt1$0" tabindex="41" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt1$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Hora</a></th>
+<th scope="col" width="93" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt2$0" tabindex="42" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt2$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Lunes</a></th>
+<th scope="col" width="95" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt3$0" tabindex="43" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt3$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Martes</a></th>
+<th scope="col" width="93" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt4$0" tabindex="44" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt4$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Miércoles</a></th>
+<th scope="col" width="95" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt5$0" tabindex="45" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt5$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Jueves</a></th>
+<th scope="col" width="94" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt6$0" tabindex="46" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt6$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Viernes</a></th>
+<th scope="col" width="96" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt7$0" tabindex="47" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt7$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Sábado</a></th>
+<th scope="col" width="97" align="CENTER" class="PSLEVEL1GRIDCOLUMNHDR"><a name="STDNT_CLASS_TIM$srt8$0" tabindex="48" class="PSLEVEL1GRIDCOLUMNHDR" href="javascript:submitAction_win0(document.win0,'STDNT_CLASS_TIM$srt8$0');" title="Haga clic en la cabecera de la columna para ordenar por orden ascendente">Domingo</a></th>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">7:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">IDIOMA 1043D - 104<br>Teoria<br>7:00AM - 8:00AM<br>Aulas 300 AM0322</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">8:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1165M - 102<br>Teoria<br>8:00AM - 9:00AM<br>Aulas 400 AM0425</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">9:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512<br><br>C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512<br><br>C 1123C - 105<br>Teoria<br>9:00AM - 11:00AM<br>Aulas 500 AM0512</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">10:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>9:00AM - 11:00AM<br><br>C 1123C - 105<br>9:00AM - 11:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>9:00AM - 11:00AM<br><br>C 1123C - 105<br>9:00AM - 11:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">11:00AM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">TUTORIA 1132T - 157<br>Clase<br>11:00AM - 12:00PM<br>Centro Integral de Tecnologia LM0710</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>Teoria<br>11:00AM - 12:30PM<br>Centro Integral de Tecnologia LM0712</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>Teoria<br>11:00AM - 12:30PM<br>Centro Integral de Tecnologia LM0712</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">12:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>11:00AM - 12:30PM<br><br>C 1124C - 111<br>Laboratorio<br>12:30PM - 2:00PM<br>Centro Integral de Tecnologia LM0712</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 110<br>11:00AM - 12:30PM<br><br>C 1124C - 111<br>Laboratorio<br>12:30PM - 2:00PM<br>Centro Integral de Tecnologia LM0712</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">1:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 111<br>12:30PM - 2:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1123C - 105<br>Teoria<br>1:00PM - 2:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1123C - 105<br>Teoria<br>1:00PM - 2:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1124C - 111<br>12:30PM - 2:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">2:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">3:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">4:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1115C - 113<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>Teoria<br>4:00PM - 5:00PM<br>Curso a distancia con herramientas de Internet<br><br>M 1178M - 107<br>Teoria<br>4:00PM - 5:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">5:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>4:00PM - 6:00PM<br><br>M 1178M - 107<br>4:00PM - 6:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>4:00PM - 6:00PM<br><br>C 1115C - 113<br>4:00PM - 6:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">M 1178M - 107<br>4:00PM - 6:00PM<br><br>M 1178M - 107<br>4:00PM - 6:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+<span class="PSLEVEL1GRIDACTIVETAB">C 1115C - 113<br>Teoria<br>5:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet<br><br>C 1115C - 113<br>Teoria<br>5:00PM - 6:00PM<br>Curso a distancia con herramientas de Internet</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">6:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">7:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">8:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">9:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+<tr valign="center">
+<td align="left" class="PSLEVEL1GRIDROW" height="11">
+<span class="PSEDITBOX_DISPONLY">10:00PM</span>
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+<td align="left" class="PSLEVEL1GRIDROW">
+&nbsp;
+</td>
+</tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="8" colspan="19"></td>
+</tr>
+<tr>
+<td height="35"></td>
+<td colspan="17" valign="top" align="left">
+<div style="width:764px; height:20px; ">
+<!-- Begin HTML Area $ICField2 -->
+
+
+
+<title>Documento sin título</title>
+<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
+
+
+
+<p><strong><font size="-1">
+ *Acepto y me comprometo a liquidar el importe de las materias seleccionadas en este proceso de inscripción, cumpliendo con las fechas de pago establecidas por la institución.</font></strong></p>
+
+
+<!-- End HTML Area -->
+</div>
+</td>
+</tr>
+<tr>
+<td height="92" colspan="2"></td>
+<td colspan="15" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PSGROUPBOXWBO" width="719">
+<tbody><tr><td class="PSGROUPBOXLABEL" align="left"><a name="DERIVED_CLASS_S_MONDAY_LBL" id="DERIVED_CLASS_S_MONDAY_LBL" tabindex="-1" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_MONDAY_LBL');"><img src="/cs/ITSONPRD/cache/PT_COLLAPSE_ESP_1.gif" alt="Contraer Sección" title="Contraer Sección" border="0"></a>&nbsp;Opciones Visualización&nbsp;</td></tr>
+<tr><td width="717">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="7" width="717" class="PSGROUPBOX" style="border-style:none">
+<tbody><tr>
+<td width="23" height="5"></td>
+<td width="200"></td>
+<td width="144"></td>
+<td width="132"></td>
+<td width="76"></td>
+<td width="132"></td>
+<td width="10"></td>
+</tr>
+<tr>
+<td height="15"></td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_SHOW_INSTR$chk" value="N">
+<input type="checkbox" name="DERIVED_CLASS_S_SHOW_INSTR" id="DERIVED_CLASS_S_SHOW_INSTR" tabindex="94" value="Y" onclick="this.form.DERIVED_CLASS_S_SHOW_INSTR$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SHOW_INSTR" class="PSCHECKBOX">Mostrar Profesores</label>
+
+</td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_MONDAY_LBL$49$$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_MONDAY_LBL$49$" id="DERIVED_CLASS_S_MONDAY_LBL$49$" tabindex="97" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_MONDAY_LBL$49$$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_MONDAY_LBL$49$" class="PSCHECKBOX">Lunes</label>
+
+</td>
+<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_THURSDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_THURSDAY_LBL" id="DERIVED_CLASS_S_THURSDAY_LBL" tabindex="100" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_THURSDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_THURSDAY_LBL" class="PSCHECKBOX">Jueves</label>
+
+</td>
+</tr>
+<tr>
+<td height="9"></td>
+<td rowspan="2" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="131">
+<tbody><tr><td width="129">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="2" width="129" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="3" height="9"></td>
+<td width="126"></td>
+</tr>
+<tr>
+<td height="13"></td>
+<td valign="top" align="left">
+<span class="SSSBUTTON_CONFIRMLINK">
+<a name="DERIVED_CLASS_S_SSR_REFRESH_CAL$57$" id="DERIVED_CLASS_S_SSR_REFRESH_CAL$57$" tabindex="104" href="javascript:submitAction_win0(document.win0,'DERIVED_CLASS_S_SSR_REFRESH_CAL$57$');" class="SSSBUTTON_CONFIRMLINK">Actualizar Calendario</a></span>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="15"></td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_SHOW_AM_PM$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_SHOW_AM_PM" id="DERIVED_CLASS_S_SHOW_AM_PM" tabindex="95" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SHOW_AM_PM$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SHOW_AM_PM" class="PSCHECKBOX">Mostrar AM/PM</label>
+
+</td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_TUESDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_TUESDAY_LBL" id="DERIVED_CLASS_S_TUESDAY_LBL" tabindex="98" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_TUESDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_TUESDAY_LBL" class="PSCHECKBOX">Martes</label>
+
+</td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_FRIDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_FRIDAY_LBL" id="DERIVED_CLASS_S_FRIDAY_LBL" tabindex="101" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_FRIDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_FRIDAY_LBL" class="PSCHECKBOX">Viernes</label>
+
+</td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_SUNDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_SUNDAY_LBL" id="DERIVED_CLASS_S_SUNDAY_LBL" tabindex="103" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SUNDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SUNDAY_LBL" class="PSCHECKBOX">Domingo</label>
+
+</td>
+</tr>
+<tr>
+<td height="9"></td>
+</tr>
+<tr>
+<td height="21"></td>
+<td nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_SSR_DISP_TITLE$chk" value="N">
+<input type="checkbox" name="DERIVED_CLASS_S_SSR_DISP_TITLE" id="DERIVED_CLASS_S_SSR_DISP_TITLE" tabindex="96" value="Y" onclick="this.form.DERIVED_CLASS_S_SSR_DISP_TITLE$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SSR_DISP_TITLE" class="PSCHECKBOX">Mostrar Título Clase</label>
+
+</td>
+<td nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_WEDNESDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_WEDNESDAY_LBL" id="DERIVED_CLASS_S_WEDNESDAY_LBL" tabindex="99" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_WEDNESDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_WEDNESDAY_LBL" class="PSCHECKBOX">Miércoles</label>
+
+</td>
+<td colspan="4" nowrap="nowrap" valign="top" align="left">
+<input type="hidden" name="DERIVED_CLASS_S_SATURDAY_LBL$chk" value="Y">
+<input type="checkbox" name="DERIVED_CLASS_S_SATURDAY_LBL" id="DERIVED_CLASS_S_SATURDAY_LBL" tabindex="102" value="Y" checked="checked" onclick="this.form.DERIVED_CLASS_S_SATURDAY_LBL$chk.value=(this.checked?'Y':'N');doFocus_win0(this,false,true);"><label for="DERIVED_CLASS_S_SATURDAY_LBL" class="PSCHECKBOX">Sábado</label>
+
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="8" colspan="19"></td>
+</tr>
+<tr>
+<td height="72" colspan="2"></td>
+<td colspan="13" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="571">
+<tbody><tr><td class="PAGROUPBOXLABELINVISIBLE" align="left">Diferido</td></tr>
+<tr><td width="569">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="10" width="569" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="3" height="0"></td>
+<td width="4"></td>
+<td width="52"></td>
+<td width="64"></td>
+<td width="52"></td>
+<td width="64"></td>
+<td width="92"></td>
+<td width="56"></td>
+<td width="180"></td>
+<td width="2"></td>
+</tr>
+<tr>
+<td height="18" colspan="2"></td>
+<td colspan="7" valign="top" align="left">
+<hr width="100%" align="left" class="PSHORIZONTALRULE">
+</td>
+</tr>
+<tr>
+<td height="10" colspan="2"></td>
+<td colspan="2" nowrap="nowrap" valign="top" align="left">
+<span class="PSHYPERLINK">
+<a name="DERIVED_SSSLINK_SS_CLS_SCHED_LINK" id="DERIVED_SSSLINK_SS_CLS_SCHED_LINK" tabindex="106" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SS_CLS_SCHED_LINK');" class="PSHYPERLINK" title="Ver Programa Clases">Mi Horario Clases</a></span>
+</td>
+<td colspan="2" rowspan="2" nowrap="nowrap" valign="top" align="left">
+<span class="PSHYPERLINK">
+<a name="DERIVED_SSSLINK_SSS_SCHED_PLANNER" id="DERIVED_SSSLINK_SSS_SCHED_PLANNER" tabindex="107" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SSS_SCHED_PLANNER');" class="PSHYPERLINK">Lista Previsiones</a></span>
+</td>
+<td rowspan="4" nowrap="nowrap" valign="top" align="left">
+<span class="PSHYPERLINK">
+<a name="DERIVED_SSSLINK_SS_CAT_SCHED_LINK" id="DERIVED_SSSLINK_SS_CAT_SCHED_LINK" tabindex="108" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_SS_CAT_SCHED_LINK');" class="PSHYPERLINK">Buscar Clase</a></span>
+</td>
+<td rowspan="4" nowrap="nowrap" valign="top" align="left">
+<span class="PSHYPERLINK">
+<a name="DERIVED_SSSLINK_LINK_ADD_ENRL" id="DERIVED_SSSLINK_LINK_ADD_ENRL" tabindex="109" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_LINK_ADD_ENRL');" class="PSHYPERLINK" title="Añadir Clase">Añadir</a></span>
+</td>
+<td colspan="2" rowspan="4" nowrap="nowrap" valign="top" align="left">
+<span class="PSHYPERLINK">
+<a name="DERIVED_SSSLINK_LINK_DROP_ENRL" id="DERIVED_SSSLINK_LINK_DROP_ENRL" tabindex="110" href="javascript:submitAction_win0(document.win0,'DERIVED_SSSLINK_LINK_DROP_ENRL');" class="PSHYPERLINK" title="Baja Clase">Baja</a></span>
+</td>
+</tr>
+<tr>
+<td height="8" colspan="2"></td>
+<td valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="52">
+<tbody><tr><td width="50" height="6">
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="28"></td>
+<td colspan="4" valign="top" align="left">
+<table cellpadding="0" cellspacing="0" cols="1" class="PABACKGROUNDINVISIBLEWBO" width="171">
+<tbody><tr><td width="169">
+<table id="ACE_width" border="0" cellpadding="0" cellspacing="0" cols="3" width="169" class="PABACKGROUNDINVISIBLE" style="border-style:none">
+<tbody><tr>
+<td width="3" height="3"></td>
+<td width="128"></td>
+<td width="38"></td>
+</tr>
+<tr>
+<td height="1" colspan="2"></td>
+<td rowspan="2" nowrap="nowrap" valign="top" align="left">
+<a name="DERIVED_SSTSNAV_GO$72$" id="DERIVED_SSTSNAV_GO$72$" tabindex="114" href="javascript:submitAction_win0(document.win0,'DERIVED_SSTSNAV_GO$72$');"><img src="/cs/ITSONPRD/cache/PT_NAV_GO_ESP_1.gif" name="DERIVED_SSTSNAV_GO$72$$IMG" alt="IR" title="IR" border="0"></a>
+</td>
+</tr>
+<tr>
+<td height="22"></td>
+<td valign="top" align="left">
+<select name="DERIVED_SSTSNAV_SSTS_MAIN_GOTO$71$" id="DERIVED_SSTSNAV_SSTS_MAIN_GOTO$71$" tabindex="113" size="1" class="PSDROPDOWNLIST" style="width:128px; " psnchg="0">
+<option value="0100">Centro Alumno</option>
+<option value="0300">Consulta de Cuentas</option>
+<option value="0200">Mi Horario de Clases</option>
+<option value="9999" selected="selected">Más...</option>
+</select>
+</td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="3" colspan="6"></td>
+</tr>
+</tbody></table>
+</td></tr>
+</tbody></table>
+</td>
+</tr>
+<tr>
+<td height="9" colspan="19"></td>
+</tr>
+</tbody></table>
+<iframe name="CalFrame" id="CalFrame" style="position:absolute; left:0; top:0; height:0; width:0; display:block; visibility:hidden;" marginheight="0" marginwidth="0" noresize="noresize" frameborder="0" scrolling="no" src="/cs/ITSONPRD/cache/PT_CALENDARPAGE_P_ESP_1.htm">Calendar not supported</iframe>
+</td></tr>
+</tbody></table>
\ No newline at end of file
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
