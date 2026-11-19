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
