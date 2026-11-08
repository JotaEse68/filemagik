# FileMagik · monetización recompensada para operaciones costosas

## Decisión de producto
- Web gratuita financiada por anuncios propios, campañas directas y Google; no APK ni aplicación instalable.
- Para vídeo o IA con coste marginal: **pago confirmado O recompensa publicitaria validada** antes de iniciar trabajo remoto.
- Nunca se exige hacer clic en un anuncio corriente ni se conceden créditos por un evento enviado por el navegador.
- Las operaciones locales actuales de PDF, imágenes, datos, subtítulos y audio conservan su acceso gratuito. No convertirlas artificialmente en operaciones pagadas.
- No se exige una fase de analítica comercial ni de experimentación de anuncios. Sí se exige QA de seguridad y funcionalidad antes del lanzamiento.

## Implementación existente
- `src/lib/advertising/blob-settings.ts`: guarda política de acceso patrocinado en el mismo Blob que el inventario publicitario; migración de datos antiguos mediante valores por defecto.
- Superadmin > Anuncios recompensados: unidad de Ad Manager, operación vídeo, exportación IA, crédito y URL HTTPS de pago alternativo.
- `GET /api/rewarded/status`: solo devuelve disponible si hay configuración y se han certificado un backend de operaciones costosas y la verificación SSV. Nunca simula disponibilidad.
- `POST /api/rewarded/claim`: rechaza cualquier intento de autoasignar créditos por el cliente hasta tener verificación criptográfica y ledger transaccional.

## Dependencias reales antes de activar (no inventar ni sustituir)
1. Crear unidad **rewarded web** en **Google Ad Manager**, configurada para la web y con consentimiento válido. El identificador debe seguir `/NETWORK_ID/AD_UNIT`.
2. Configurar un endpoint de **server-side verification (SSV) web** conforme a los parámetros, autenticación y formato que entregue la red de Ad Manager; no reutilizar ciegamente el verificador de AdMob móvil.
3. Registrar recompensas en un ledger transaccional con identificador único, expiración, bloqueo de doble gasto y deduplicación de callbacks. Vercel Blob con archivos JSON de revisión no garantiza consumo atómico; no usar como ledger de créditos.
4. Integrar endpoints reales de procesamiento remoto de vídeo e IA y un flujo de pago. Deben comprobar permisos servidor antes de ejecutar o facturar el proveedor.
5. Solo entonces activar `FILEMAGIK_REWARDED_SSV_VERIFIED` y `FILEMAGIK_REWARDED_BACKEND_READY` en producción.
6. Si no hay recompensa disponible, ofrecer método de pago **real y disponible**; no atribuir acceso ni procesar operaciones costosas en modo ilimitado.

## APIs / documentación de Google
- https://support.google.com/admanager/answer/9116812 (anuncios recompensados web + SSV)
- https://developers.google.com/publisher-tag/samples/display-rewarded-ad (API de GPT)
- https://support.google.com/adsense/answer/12726063 (Offerwall para acceso a contenido, no para autorizar créditos arbitrarios)

## QA de lanzamiento
- Sin credenciales, el endpoint de estado devuelve `available:false`.
- Un cliente anónimo no puede crear créditos mediante `POST /api/rewarded/claim`.
- Sin anuncio servido o sin SSV validada nunca se activa el servidor de IA.
- Una confirmación repetida no otorga un segundo crédito.
- Pago rechazado o no confirmado no inicia procesamiento.
