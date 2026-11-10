# FileMagik — Puerta de lanzamiento G1–G5 (release candidate)

**Política:** Nunca desplegar por partes; PR #35 es rama de integración, `main` permanece protegido. Diferenciar CI verde de funcionalidad operativa pública.

## Infraestructura por producto

| Servicio | Directorio | Funciones | Estado |
|---|---|---|---|
| Image codec service | `image-engine/` | HEIC/HEIF → PNG y GIF animado → WebP animado con Pillow/libheif | Docker y CI desarrollados; NO desplegado |
| PDF + Gotenberg | `pdf-engine/` | PDF/Office, redacción, cuota SQLite | Railway desplegado; acceso público desactivado |
| Multimedia FFmpeg | `media-engine/` | MP3/WAV, MP4, GIF, extracción audio | Docker y CI desarrollados; NO desplegado |
| Archivos 7Z/RAR | `archive-engine/` | 7Z/RAR → ZIP, límites de descompresión | Docker y CI desarrollados; NO desplegado |
| Frontend Next.js | `src/` | Herramientas locales, previews, descargas | cambios de PR #35 sin publicar |

## Gate G2 — imágenes y lotes
- [x] AVIF estático (Chromium compatible); HEIC con códec nativo si está disponible.
- [x] TIFF sin compresión, PackBits y multipágina → PNG ZIP con límites.
- [x] GIF → primer fotograma; GIF → todos los fotogramas y metadatos de duración en ZIP (requiere ImageDecoder nativo).
- [x] Lotes imágenes → WebP ZIP con progreso, cancelación cooperativa y prohibición de descarga ficticia.
- [x] HEIC/HEIF → PNG y GIF animado → WebP animado mediante motor privado Pillow/libheif, con tests de muestras auténticas y conservación de frames/duración. Aún no expuesto a web.
- [ ] Conectar flujo fallback HEIC en cliente sin exponer credenciales ni habilitar API pública hasta cuota y streaming.
- [ ] Validación exhaustiva de disposal/loop/transparencia y compatibilidad WebP móvil con corpus de GIF complejos.
- [ ] Pruebas adicionales de memoria en móviles de gama media y lotes 100% completos.

## Gate G3 — servidor FFmpeg
- [x] Backend separado con bearer privado, whitelist de operaciones, duración ≤120 s y entrada ≤25 MB.
- [x] Convierte audio WAV/MP3, vídeo MP4, vídeo → GIF, y GIF animado → MP4.
- [x] Compilación Docker y tests de flujos reales incluidos en Actions.
- [ ] Almacén temporal y distribución de resultados sin buffering en el frontend Vercel (límites de respuesta Vercel).
- [ ] Persistencia de créditos/cuotas, cancelación de trabajo activo y reconciliación.
- [ ] Montaje seguro de servicio y pruebas de carga/CPU, recuperación tras reinicios.

## Gate G4 — motor de archivos
- [x] Motor separado libarchive con autentificación, límite de archivo, límite de 100 ficheros, límite descomprimido y rechazo de entradas especiales.
- [x] ZIP local y TAR local con validaciones.
- [x] 7Z real a ZIP probado; RAR corrupto rechazado.
- [ ] Corpus positivo RAR4/RAR5 válido y RAR cifrado rechazado.
- [ ] CPU/wall-time/ratio exhaustivo, cancelación y cuotas persistentes de proceso.
- [ ] Proxy público protegido y streaming del ZIP de resultado, con autorización en Next.

## Gate G1 + G5 — publicación integral
- [x] PDF privado Railway, Gotenberg y verificación auth/redacción irreversible.
- [x] Pruebas de rutas Office DOCX/XLSX/PPTX/ODS/ODP y archivos de ejemplo reales.
- [ ] Turnstile final verificado + configuración estricta de hostname en dominio real.
- [ ] Comparativas de fidelidad compleja PDF/Office, OCR, firma/formularios y font parity.
- [ ] CI todos los workflows SUCCESS sobre el **mismo** head SHA, sin rutas saltadas.
- [ ] Verificación cross-device, Lighthouse, RGPD y consentimiento anuncios en producción.
- [ ] Sistema de crédito/cuotas para motores multimedia y archivos, sin presupuestos abiertos.
- [ ] Merge a `main` sólo después de pasar todo; un release Vercel + health Railway, pruebas reales y rollback.

**Regla de seguridad:** No habilitar motores multimedia o de archivos públicamente sólo porque el contenedor arranque. Un API privado sin cuota persistente, streaming de resultados y límite CPU no cumple aún los criterios de lanzamiento.
