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
| FM-02 PDF Studio y Gotenberg | ◇ IMPLEMENTADO | Matriz PDF/Office real, OCR, cifrado, formularios, fidelidad y descargas |
| FM-03 Límites y protección | ◇ IMPLEMENTADO | Códigos 401/403/413/422/429/503, límites de carga, cuota tras reinicios |
| FM-04 Administración y publicidad propia | ◇ IMPLEMENTADO | Login/recovery real, Blob, campañas/rotación/ubicaciones móvil y PC |
| FM-05 AdSense/recompensados | ☐ PENDIENTE | Postergado hasta completar toda la app; CMP, SSV y aprobación |
| FM-06 QA y cierre final | ☐ PENDIENTE | Responsive, legal/cookies, post-deploy, métricas y cierre |

## Hallazgos y bloqueos
- No existe `package-lock.json` en main: falta fijar dependencias transitorias para un QA reproducible.
- En Railway hay dos volúmenes staged innecesarios `filemagik-image-quota` y `filemagik-media-quota`: NO APLICAR; ya existe volumen activo `filemagik-quota-ledger` montado en `/data`.
- No afirmar que `READY` o `available:true` acrediten una conversión de archivo.
- La API pública de anuncios devuelve banners reales configurados; Google AdSense y SSV no certificados.

## Regla permanente
Antes de tocar un módulo modificar `docs/IMPACTO_CAMBIOS.md`, citar consumidores/rutas/servicios y pruebas. Probar con Node 22, Docker de Railway, Playwright UI real, descargar y abrir resultados. No fusionar con fallos críticos. Un único deploy agrupado tras QA, confirmar SHA de producción y smoke post-deploy, registrar fecha, commit, PR y evidencias; reabrir regresiones. Nunca marcar CERRADO sin ejecutar todas las pruebas.

**Siguiente bloque:** terminar FM-01, después FM-02. No tocar anuncios de pago.

## QA de la PR #61 (c919251)
- Quality, PDF Engine, Image Engine, Media Engine, Archive Engine y F1 security: SUCCESS.
- Playwright full: **159 passed / 2 failed**. Ambos fallos pertenecen a login con cookie Secure en loopback 127.0.0.1. Queda **abierto** hasta confirmar la causa con la prueba actualizada en localhost y el POST real. 
- No fusionar ni desplegar mientras esta regresión no esté corregida y se confirme un lockfile reproducible.
