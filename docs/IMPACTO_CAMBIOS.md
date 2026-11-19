# FileMagik · Análisis obligatorio de impacto
Fecha 2026-11-19 · Base `main@c751546e98787e4ddfb5112e81bb33092598d1cd`.

| Módulo | Archivos/rutas consumidores | Dependencias de servicio | Tests obligatorios |
| --- | --- | --- | --- |
| `src/app/api/pdf-engine/route.ts` | `src/components/converter.tsx`, `professional-pdf-option.tsx`, `pdf-visual-editor.tsx`; PDF Studio y OCR | Railway PDF API `/v1/jobs`, Gotenberg, SQLite cuotas | `e2e/pdf-g1.spec.ts`, PDF real, descargable, `pdf-engine/tests` |
| `pdf-engine/app.py` / `document.py` | PDF/Word/Excel/OCR/redactar/proteger | Docker Python 3.12, Gotenberg 9, volumen `/data` | Python pytest en Docker y humo Office con Gotenberg real |
| `src/app/api/worker-engine/route.ts`, `src/lib/worker-conversion.ts` | `converter.tsx`, páginas de imagen, audio, vídeo, 7Z/RAR, lotes | Misma API Railway, FFmpeg, HEIF/libarchive, cuotas | E2E worker, Python tests, memoria/límites |
| `src/lib/advertising/*`, `src/app/api/advertising/route.ts` | `src/components/advertising/ad-slot.tsx`, home, fichas, superadmin | Vercel Blob, futura CMP | E2E rotación por ubicación, responsive y anuncios seguros |
| `src/lib/admin/*`, `src/app/api/admin/*` | Inicio, recuperación, campañas, seguridad, logout | Cookies firmadas y Blob; Supabase opcional | Playwright login real con contraseña CI sintética, sin secretos reales |
| `.github/workflows/*`, `package.json` | Build Next, Playwright, Docker | GitHub Actions, Vercel | Lint, typecheck, tests, build, Playwright desktop/móvil |

### Riesgos controlados antes de modificar
- El frontend Vercel y backend Railway tienen SHAs distintos, sin certificación cruzada.
- `package-lock.json` ausente: npm install no es reproducible hasta fijarlo.
- GET `available:true` y `READY` no sustituyen POST, archivo descargado válido y prueba de credenciales.
- No modificar Railway staged ni anuncios de pago. Aislar rollback por proveedor.

### Política de cambios
Cada PR con cambios de lógica debe actualizar esta matriz con rutas, componentes y servicio afectado, enumerar la prueba automatizada añadida, documentar rollback y solo entonces proponer el merge. Bloquear publicación si falla un test crítico.

## FM-02 — editor PDF y motor profesional (19/11/2026)
- Incidencia verificada: el editor consultaba `GET /api/pdf-engine` sin el parámetro `operation`, por lo que la API respondía `available:false`. La operación correcta es `redact-pdf`.
- Archivos consumidores: `src/components/pdf-visual-editor.tsx`, `src/app/api/pdf-engine/route.ts`, `src/lib/pdf-engine-limits.ts`, y `e2e/pdf-g1.spec.ts`.
- Servicios dependientes: la API Railway `/v1/jobs?operation=redact-pdf`, Gotenberg privado y cuotas persistentes. No se han modificado estos servicios.
- Riesgo: el editor local admite archivos hasta 60 MB, pero el proxy profesional acepta 3 MiB; bloquear solo acciones remotas por tamaño, preservar edición local y mostrar aviso claro.
- Tests: Playwright comprueba petición GET con operación, editor real en Chrome desktop/móvil, límites y pruebas existentes para 429, undo, redo y export. Docker PDF Engine sigue cubriendo el procesamiento real de Office/Redactar.
- Rollback: revertir el commit en la rama. No publicar Railway ni habilitar anuncios de pago.
