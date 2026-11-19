# FileMagik · Registro de cierre
Actualización: 2026-11-19. Web: https://www.filemagik.com. Repositorio: https://github.com/JotaEse68/filemagik.
Objetivo: aplicación gratuita con anuncios propios; anuncios de pago al final.

## Versiones verificadas
- `main` y producción Vercel: `c751546e98787e4ddfb5112e81bb33092598d1cd`; deployment `dpl_2FD2n59WNPDLoZEg5ipUAHbctjsw` READY. No equivale a conversión real certificada.
- Railway API PDF: commit `b5f5b3a92472d507b226b08e6a7dc28a28853619`, deploy `9b64a709-d290-4369-b7c3-57cd2e017930` SUCCESS. Gotenberg online. Compatibilidad entre esos commits no certificada.
- Quality en main SUCCESS: https://github.com/JotaEse68/filemagik/actions/runs/43076410060
- PR #18 antigua cerrada sin fusionar el 19/11/2026 por arquitectura Supabase obsoleta frente al panel Blob: https://github.com/JotaEse68/filemagik/pull/18
- Vercel tenía motores profesionales habilitados, pero faltan conversiones de extremo a extremo certificadas.
- Publicidad propia: cinco ubicaciones públicas, una sola creatividad GrabaliA reutilizada, no rotación real; rewarded no disponible.

## Matriz
| Bloque | Estado | Condición de cierre |
| --- | --- | --- |
| FM-01 Impacto y fiabilidad del release | ◐ EN DESARROLLO | Mapa, CI, dependencias fijas, Playwright, política no-merge e inspección del SHA publicados |
| FM-02 PDF Studio y Gotenberg | ◐ EN DESARROLLO | Corregir disponibilidad y límite remoto en editor; validar fidelidad PDF/Office, OCR, formularios y descargas |
| FM-03 Límites y protección | ◇ IMPLEMENTADO | Códigos 401/403/413/422/429/503, límites de carga, cuota tras reinicios |
| FM-04 Administración y publicidad propia | ◇ IMPLEMENTADO | Login/recovery real, Blob, campañas/rotación/ubicaciones móvil y PC |
| FM-05 AdSense/recompensados | ☐ PENDIENTE | Postergado hasta completar toda la app; CMP, SSV y aprobación |
| FM-06 QA y cierre final | ☐ PENDIENTE | Responsive, legal/cookies, post-deploy, métricas y cierre |

## Hallazgos y bloqueos
- `package-lock.json` v3 ya está versionado en la rama FM-01, generado en GitHub Actions con Node 22. El cierre exige que `npm ci`, lint, tipos, tests, build y Playwright estén verdes sobre el mismo HEAD y que el lock alcance main solo al fusionar la PR.
- En Railway hay dos volúmenes staged innecesarios `filemagik-image-quota` y `filemagik-media-quota`: NO APLICAR; ya existe volumen activo `filemagik-quota-ledger` montado en `/data`.
- No afirmar que `READY` o `available:true` acrediten una conversión de archivo.
- La API pública de anuncios devuelve banners reales configurados; Google AdSense y SSV no certificados.

## Regla permanente
Antes de tocar un módulo modificar `docs/IMPACTO_CAMBIOS.md`, citar consumidores/rutas/servicios y pruebas. Probar con Node 22, Docker de Railway, Playwright UI real, descargar y abrir resultados. No fusionar con fallos críticos. Un único deploy agrupado tras QA, confirmar SHA de producción y smoke post-deploy, registrar fecha, commit, PR y evidencias; reabrir regresiones. Nunca marcar CERRADO sin ejecutar todas las pruebas.

**Siguiente bloque:** terminar FM-01, después FM-02. No tocar anuncios de pago.

## QA FM-01 (actualizado 2026-11-19)
- Sobre `0f2f5f5a2`: siete workflows SUCCESS, incluidos Quality, Playwright completo con tests de login real en localhost y motores PDF, imagen, media, archivos y seguridad F1. Las dos fallas iniciales del fixture de Playwright quedaron resueltas.
- Sobre `a79823890`: Quality y Playwright SUCCESS; job de bloqueo de dependencias generado y ejecutado correctamente; lockfile incorporado en `64a10916f`.
- Ahora Quality y Browser usan `npm ci` con lockfile y caché npm; workflow temporal de creación de lockfile retirado. **No marcar FM-01 cerrado** hasta nueva CI del HEAD final y comprobación que no se publicó a Vercel.
- No mezclar el cierre de ingeniería de CI con certificación de Railway / producción: estos siguen dentro de FM-02 a FM-06.

## FM-02 — Corrección de editor (19/11/2026)
- GET de capacidad profesional en editor corregido para pedir `operation=redact-pdf` (antes consultaba ruta sin operación y quedaba bloqueado).
- Límite de PDF remoto compartido con proxy: 3 MiB. Archivo local mayor conserva anotaciones; redacción/sustitución remota bloqueadas con explicación.
- Tests Playwright añadidos y mocks existentes actualizados al contrato con query string.
- **No cerrado** hasta CI verde en el HEAD final y certificación POST con Turnstile/Gotenberg y descarga real después de la publicación agrupada.

- Conversores profesionales: validación previa de archivos >3 MiB, aviso en el formulario y ausencia de llamadas remotas innecesarias, con prueba `e2e/pdf-g1.spec.ts`.
