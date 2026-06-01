# Workflow Claude + Codex

Este archivo estandariza cómo operar tareas en DVPotro entre planeación (Claude) e implementación (Codex).

---

## Roles

- **Claude**
  - define arquitectura, alcance, riesgos y criterios de aceptación
  - redacta prompts de implementación/verificación
  - revisa reportes y decide siguiente iteración

- **Codex**
  - implementa cambios en código
  - ejecuta verificaciones reales (build, comandos de scraping, smoke tests)
  - documenta evidencia en `generate-report.js` + `reports/report_XXX.md`
  - realiza commits convencionales

---

## Flujo por tarea

1. Claude diseña tarea y prompt.
2. Codex implementa los cambios.
3. Codex verifica (build + validación funcional real del módulo tocado).
4. Codex actualiza `VERIFICATION` en `generate-report.js`.
5. Codex ejecuta `node generate-report.js`.
6. Codex hace commit.
7. Usuario comparte reporte/salida a Claude.
8. Claude audita y define siguiente paso.

---

## Verificación mínima obligatoria

Checklist por tarea:

- [ ] `npm run build` sin errores.
- [ ] Validación funcional del módulo afectado (si aplica, contra datos reales).
- [ ] `VERIFICATION` actualizado con comando y output reales.
- [ ] `node generate-report.js` ejecutado.
- [ ] Reporte nuevo en `reports/report_XXX.md`.

---

## Formato del reporte v2

`generate-report.js` produce:

1. Header del reporte (fecha/agente/tipo)
2. Contexto Git (rama, último commit, total archivos)
3. Archivos modificados
4. Estadísticas (`+` / `-` por archivo)
5. Resumen
6. Cambios de código (diff por archivo, truncado inteligente)
7. Verificación (build/tests/comando/output)
8. Pendiente para Claude

---

## Frases clave activas (operación)

- **“Claude, retomamos el módulo de calificaciones CIA — el bloqueo ya se quitó”**
  - reactivar validaciones reales de CIA y revisar parser/report manager.

- **“el CIA se desbloqueó”**
  - retomar scraping real de horario/calificaciones con clear cache y corrida fresh.

---

## Estado actual del proyecto (snapshot)

| Módulo | Estado | Comentario |
|---|---|---|
| Actividades (iVirtual) | ✅ | Clasificación y UI activas, caché estable |
| Horario (CIA + iVirtual links) | ⚠️ | Funcional, sensible a cambios en frames/HTML CIA |
| Calificaciones (CIA) | ⚠️ | Funcional por PDF, susceptible a variaciones CIA |
| Ajustes credenciales | ✅ | Persistencia dev/prod operativa |
| Reportes v2 | ✅ | Diff por archivo + estadísticas + verificación |

---

## Reglas de calidad y seguridad

1. No declarar “funciona” sin evidencia ejecutada.
2. No commitear secretos ni artefactos locales:
   - `.env`, `release/`, `.local-data/`, `src/design-backups/`
3. Preferir cambios atómicos y verificables.
4. Mantener mensajes de commit en conventional commits.
5. Si un scraper falla por timeout/red, reportar error amigable y limpiar caché.

