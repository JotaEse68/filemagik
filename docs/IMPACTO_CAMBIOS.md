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

- **Límite profesional transversal:** `src/components/converter.tsx` y `src/components/professional-pdf-option.tsx` comparten la constante de 3 MiB para rechazar archivos e imágenes de sustitución sobredimensionados **antes** del POST remoto. Conversión local disponible cuando la herramienta lo admite. Prueba Playwright de formulario y de ausencia de solicitud a Railway.

## FM-03 — cuotas, memoria y respuesta limitada (19/11/2026)
- **Alcance:** `pdf-engine/quota.py` y los tres `*_quota.py` integrados; `worker_capacity.py` valida parámetros de memoria antes de consultar cgroup. Falta de DB, DB corrupta o configuración malformada debe responder 503, jamás saltarse cuotas.
- **Frontend/proxy:** `src/app/api/pdf-engine/route.ts`, `src/app/api/worker-engine/route.ts`, proxy heredado `src/app/api/engine/[engine]/route.ts`. `src/lib/limited-upstream-response.ts` limita el stream recibido antes de agregarlo en memoria, incluso sin Content-Length, y lo cancela si excede el máximo. El endpoint heredado permanece deshabilitado por defecto; no se activan servicios nuevos.
- **Servicios:** mismo Railway PDF API/worker unificado y Gotenberg, volumen persistente `/data`; nada de volúmenes adicionales. Los límites 3 MiB de entrada se mantienen; salida 22 MiB PDF, 12 MiB worker, 4 MiB proxy heredado.
- **Pruebas:** `pdf-engine/tests/test_quota.py` valida rechazo de cuotas globales y por motor, almacenamiento corrupto, configuración errónea y recuperación de reservas huérfanas (PDF 120s, capacidad 180s). `tests/upstream-limits.test.mjs` valida stream válido, tamaño declarado excesivo, stream real demasiado grande, vacío/interrumpido. Ejecutar Docker Python, smoke Gotenberg, Quality, Playwright desktop y móvil.
- **Rollback:** revertir commit FM-03 en PR #61. No tocar flags, secrets, servicios, volúmenes ni datos públicos; simular reinicio de base SQLite en CI, no reiniciar Railway producción en mitad de pruebas.
- **Pendientes:** certificar límites/reinicios con tráfico controlado en Railway y autenticación/Turnstile real tras release agrupada; medir carga RAM y CPU. Quotas de cada motor son independientes, no confundir con presupuesto monetario conjunto de todos los motores.

## FM-04 — Publicidad propia y superadmin (19/11/2026)
- **Incidencias:** el autollenado provisional ignoraba el switch explícito de algunas ubicaciones desactivadas; campañas solo con URL HTTPS no podían activarse; posiciones Smart Drop y junto a conversor existían en el panel pero no estaban montadas; «resultado» aparecía sin conversión.
- **Lógica:** `src/lib/advertising/blob-settings.ts` conserva compatibilidad con campañas con imagen y URL opcional, habilita URL sin imagen, respeta switches individuales. No cambia el esquema Blob ni la rotación existente.
- **Panel:** `src/components/admin/standalone-dashboard.tsx` muestra previsualización de enlaces sin imagen, estados correctos y su asignación a ubicaciones, con CSS aislado. Sigue exigiendo sesión firmada local.
- **Renderizado:** `src/components/advertising/ad-slot.tsx` muestra tarjetas HTTPS accesibles y rel patrocinado; páginas `src/app/[locale]/page.tsx`, `src/app/[locale]/[slug]/page.tsx`, `src/components/converter.tsx` conectan posiciones y resultado real; `src/app/globals.css` adapta lateral a ancho y oculta lateral extra en móvil.
- **Disponibilidad:** `src/app/api/advertising/route.ts` falla a anuncios desactivados cuando un Blob configurado no responde. El modo standalone sin token mantiene el fallback del entorno. No tocar AdSense, CMP ni recompensados en este bloque.
- **Pruebas:** `tests/advertising-campaigns.test.mjs` (URL-only, HTTPS, desactivados), `e2e/fm04-ads-release.spec.ts` (OCR, rotación, nuevos espacios, móvil, no mostrar resultado antes de convertir), suite QA completa de administración y banners. Rollback: revertir este commit en la rama, sin cambios de proveedores ni datos en producción.

- **Acceso propietario:** `src/app/api/admin/local-login/route.ts` exige JSON y tamaño máximo 2 KiB antes de verificar la contraseña. `e2e/fm04-ads-release.spec.ts` autentica al propietario con contraseña CI sintética y comprueba UI de campaña URL-only, PUT de configuración simulado y cierre de sesión. Persistencia Vercel Blob real queda pendiente del release.
