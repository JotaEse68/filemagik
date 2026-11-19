# FM-06 · Plan de certificación final y publicación agrupada

**Proyecto:** FileMagik · **Fecha:** 19/11/2026 · **PR de integración:** [#61](https://github.com/JotaEse68/filemagik/pull/61) · **main/prod inicial:** `c751546e98787e4ddfb5112e81bb33092598d1cd`.

## Decisión y límites de esta preparación

- **FM-01 a FM-04:** cambios de producto implementados y QA de desarrollo verde sobre el HEAD `899d18b1e5fa1c08af16db505954d91df30c8319` (Quality, F1, PDF Engine, Playwright).
- **FM-06:** preparar un único release. No marcar cerrado por compilar, recibir HTTP 200, tener un despliegue READY, ni obtener `available:true`.
- **FM-05:** AdSense/CMP/SSV, sin activar en este release; publicidad propia sí. No probar recompensas con créditos ficticios.
- **Infraestructura:** dos servicios Railway existentes y volumen `/data`, sin crear proyectos, servicios o volúmenes adicionales. **No aplicar** el patch Railway actualmente staged, que incluye dos volúmenes duplicados.
- **Política de alcance:** no introducir nuevos formatos o arquitectura; priorizar P0/P1 de funcionamiento, seguridad, pérdidas de datos, descargas y bloqueo móvil. No tocar otras aplicaciones.

## Puerta A · Antes de tocar main

| Comprobación | Evidencia / acción | Puerta |
| --- | --- | --- |
| Repo y base | PR #61 mergeable, sin otros cambios nuevos en main; rama y SHA de PR exactos | Exigir |
| Cadena de pruebas | Quality (npm ci, lint, tipos, tests, impacto), browser Playwright PC/móvil, PDF Docker real y F1 SUCCESS **sobre el mismo HEAD**; workflows de imagen/media/archivo históricos solo si cambiaron esas rutas | Exigir |
| Casos de PDF | DOCX/XLSX, Office→PDF, redacción irreversible, OCR, formularios, archivo corrupto, 413/429/503; conservar muestras reales en suites | Exigir |
| Admin | Login real en CI con credenciales sintéticas; acceso anónimo 401, cambio/recuperación y CRUD simulados | Exigir |
| Publicidad | URL-only, rotación, slots habilitados/deshabilitados, dos laterales PC, horizontal y móvil, sin clics forzados; Google apagado | Exigir |
| Privacidad/legal | Revisar páginas legales, cookies/CMP según modo de anuncios, enlaces seguros, URLs canónicas, accesibilidad y dispositivos | Exigir |
| Motor Railway | Confirmar origen, rama y patrón de despliegue, volumen único, predeploy smoke y estrategia segura para cambiar del commit `b5f5b3a9` al release sin aceptar staged patch | **BLOQUEA HASTA RESOLVER** |
| Vercel | Confirmar que publicar un único merge no dispara previews ni deploys duplicados; dominio principal y rollback disponibles | Exigir |
| Prueba humana | Preparar navegador con Turnstile en `www.filemagik.com`. No simular ni saltar CAPTCHA. Verificación humana de conversiones reales en ventana post-release | Verificar en producción |

**No fusionar** con fallos P0/P1 conocidos, desfase de motor no gestionado o un patch Railway no deseado que pudiera aplicarse. No suponer que hay branch protection: no se dispone de permiso para certificarla.

## Puerta B · Publicación única, después de A

1. Congelar nuevos commits. Registrar SHA de HEAD y checks SUCCESS en la PR.
2. Confirmar que el release puede actualizar el **motor Railway que cambió FM-03** mediante su fuente GitHub sin aplicar dos volúmenes staged; si no es posible, mantener PR sin merge hasta resolver.
3. Fusionar **una sola vez** (squash) PR #61 a `main`. Registrar commit de merge.
4. **Una** publicación Vercel de `main`; confirmar que READY corresponde al commit de merge, no al anterior. Confirmar despliegue/health `/readyz` de la versión Railway que incluye las protecciones de FM-03. Nunca declarar sincronía de SHAs sin comprobar los dos.
5. Ejecutar el smoke read-only:

   ```bash
   node scripts/fm06-production-smoke.mjs https://www.filemagik.com https://filemagik-pdf-api-production.up.railway.app
   ```

   Verifica rutas públicas, API de campañas sin credenciales, contrato PDF/Turnstile, esquema y destinos HTTPS de banners, anuncios recompensados apagados, motor worker y Railway `/readyz`. **No valida conversiones reales**.

6. En sesión humana real, con muestras pequeñas: PDF→DOCX editable, PDF→XLSX, Office→PDF, OCR, redacción original y descarga legible; lote multimedia si su flag está certificado. Confirmar firmas, errores y cuotas sin agotar presupuesto real.
7. En superadmin autenticado: GET campaña, guardar cambio **inocuo** con revisión optimista, recargar, comprobar que persiste, restaurar la configuración inicial si es necesario. Comprobar rotación PC/móvil en páginas, sin banners vacíos ni dobles sticky Google. No subir o modificar creatividades del usuario sin autorización.
8. Comprobar consumo CPU/RAM Railway con muestras controladas, cuotas 429, recuperación ante reinicios y 503 al faltar almacenamiento **solo en entorno aislado de test**, no retirar /data del servicio real. Revisar logs sin datos de archivos ni secretos.
9. Guardar evidencias (SHA, PR, despliegues, QA, resultado de cada prueba) en `ESTADO_CIERRE.md` y en issue #34. Únicamente los puntos verificados se marcan CERRADO.

## Puerta C · Reversión y seguridad

- Si falla Vercel o hay regresión P0/P1, **restaurar inmediatamente la última versión READY de Vercel** y documentar incidente; no provocar otra publicación de código sin análisis.
- Si falla el motor Railway tras la actualización, **rollback del servicio PDF API a su último despliegue SUCCESS** (preservando volumen `/data` y Gotenberg), con diagnóstico previo y sin aceptar staged patch.
- Los cambios de estructura de cuotas SQLite son aditivos/no destructivos en esta PR; no borrar datos de cuota.
- AdSense y rewarded deben seguir deshabilitados hasta aprobación, consentimiento, SSV y auditoría específica FM-05.

## Bloqueos y alcance verificable a 19/11/2026

1. Railway `filemagik-pdf-api` continúa ejecutando `b5f5b3a92472d507b226b08e6a7dc28a28853619`, anterior a FM-03; los tests Docker del nuevo código **no significan que esté desplegado**.
2. El entorno Railway conserva un patch de infraestructura STAGED (4 cambios). No usar `accept_deploy` sin revisar y eliminar volúmenes duplicados.
3. Falta prueba humana de Turnstile→Railway→archivos descargados, tráfico controlado y guardado Blob sobre la versión agrupada (se puede hacer **después** de publicar con rollback preparado).
4. Vercel producción `c751546e9`, PR #61 draft. No hay autorización para dar por cerrado FM-05.
5. Comprobar la configuración de publicación automática de Vercel y el source-watch de Railway antes del merge; no asumir que merge = despliegue.

**Resultado de la preparación:** puerta A parcialmente verificada, publicación detenida de forma intencional para evitar cambios irreversibles o costes imprevistos. No crear trabajos de GitHub Actions duplicados.
