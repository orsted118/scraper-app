# ScraperApp — Workflow de trabajo (Codex + Claude)

## Roles

- **Claude**: prompting, revisión funcional y decisiones de arquitectura.
- **Codex**: implementación de código, validación técnica y reportes.

---

## Flujo estándar por tarea

1. Recibir instrucción (usuario/Claude).
2. Identificar archivos impactados.
3. Implementar cambios mínimos necesarios.
4. Validar técnicamente:
   - `npm run build`
   - pruebas de ejecución relevantes cuando aplique.
5. Generar reporte obligatorio:
   - `node generate-report.js`
6. Entregar evidencia (output real, errores y estado final).
7. Commit **solo si se solicita** en la tarea.

---

## Reglas operativas

- No hardcodear credenciales.
- Variables sensibles solo en `.env`.
- Mantener consistencia visual con tema ITSON.
- No borrar reportes previos en `reports/`.
- Si una funcionalidad depende de scraping, reportar siempre evidencia real de ejecución.

---

## Convención de commits

Usar Conventional Commits:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `refactor: ...`
- `docs: ...`

Si la tarea lo pide, ejecutar:
1. `node generate-report.js`
2. `git add .`
3. `git commit -m "..."`

---

## Definition of Done (DoD)

Una tarea se considera terminada cuando:

- compila (`npm run build`),
- cumple la solicitud funcional,
- deja evidencia ejecutable del resultado,
- y tiene reporte generado en `reports/`.

