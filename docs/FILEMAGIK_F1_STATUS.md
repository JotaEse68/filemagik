# FileMagik — F1 Integración y estabilidad (10 noviembre 2026)

## Objetivo del bloque
Cerrar fallos de navegador, conectar motores privados a frontend y preparar Railway con seguridad y cuotas; no publicar a `main`/Vercel hasta cumplir todos los gates.

## Implementado en PR #35
- **F1.1 Navegador:** los cuatro fallos de `image-batch-g5.spec.ts` procedían de un PNG de prueba que Chromium no podía decodificar. El test ahora genera un PNG genuino desde canvas y valida descarga ZIP y cancelación, desktop y mobile. Cierre condicionado a CI verde en el mismo head.
- **F1.2 Railway:** dos servicios nuevos `filemagik-image-engine` y `filemagik-media-engine` creados como *staged*, con fuente GitHub de la rama, cada uno con volumen SQLite de 128 MB y variables de cuota preparadas. No se ha ejecutado `accept_deploy`. **Importante:** Railway no deja establecer `rootDirectory` ni `dockerfilePath` hasta materializar una instancia, por lo que todavía no son desplegables sin esa configuración.
- **F1.2 bloqueo externo:** la creación de `filemagik-archive-engine` devolvió `Free plan resource provision limit exceeded`. No se creó ni desplegó. Exige liberar capacidad o ampliar plan; no se modifican los 2 servicios existentes (PDF API y Gotenberg).
- **F1.3 Cuotas:** los 3 motores Python exigen HMAC de visitante validado, cuentan por hora/día/mes en SQLite persistente, limitan simultaneidad y cierran en 503 si falta el volumen. Tests de límites 403, 429, 503 y persistencia añadidos a cada servicio.
- **F1.4 Web:** `/api/worker-engine` enruta los 3 motores sólo con `FILEMAGIK_WORKER_ENGINES_PUBLIC_ENABLED=true`, URL HTTPS y secretos fuertes; requiere Cloudflare Turnstile con action `filemagik_worker`, mismo origen, tipos/tamaños aprobados y validación de resultados. Estado y rutas de herramientas en el frontend; no hay fallback engañoso. El proxy público está **apagado por defecto**.
- **F1.5 E2E:** los tests de motores comprueban operaciones reales con archivos audiovisuales/HEIC/GIF/7Z/RAR. Playwright verifica bloqueo fail-closed y ruta de formulario/challenge/descarga simulada. **No se ha demostrado todavía conversión desde Vercel a los nuevos servicios Railway**, porque no están desplegados.

## Límites reales que deben conocerse
- El proxy de Next.js acepta **hasta 3 MiB** y devuelve como máximo **12 MiB** para evitar buffers excesivos y restricciones de Vercel. Los motores pueden procesar archivos de mayor tamaño de forma privada, pero no se deben anunciar esos máximos a usuarios web hasta implantar almacenamiento temporal y descargas en streaming.
- No hay distribución de resultados grandes ni cola persistente/cancelación remota. La cancelación actual es del lote **local** de imágenes y del request web cuando el navegador aborta.
- TURNSTILE SECRET/SITE KEY y secretos de los tres motores no se han creado ni activado en producción; nunca deben escribirse en Git.
- No se han aceptado los cambios staged en Railway ni alterado `main`/Vercel.

## Puerta obligatoria antes del merge/despliegue
1. Los seis workflows (Quality, browser, PDF, Image, Media, Archive) en SUCCESS sobre el mismo head.
2. Capacidad Railway para 3 motores o consolidación equivalente, fuente por directorio + Dockerfile correctos, volúmenes y secretos; healthchecks sanos y límites CPU/RAM verificados.
3. Configurar dominio HTTPS fiable entre Vercel y Railway, Turnstile definitivo; probar rechazos 401/403/413/415/422/429/503 y expiración de cuota.
4. Test E2E real y autenticado por cada motor con archivo válido desde la app web, descarga verificable, uso de créditos/contadores, reinicio y limpieza.
5. Resolver grandes archivos: upload directo autorizado, jobs persistentes, storage temporal con TTL, descarga/cancelación y reconciliación.
6. Validación final G1 PDF de fidelidad + G5 UX/SEO/RGPD/consentimiento; sólo entonces RC → main → Vercel.

**Regla:** un workflow verde prueba una funcionalidad aislada; no implica F1 integral cerrado o motores públicos listos.
