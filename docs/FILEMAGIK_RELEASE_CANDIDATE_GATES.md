# FileMagik — Puerta de lanzamiento G1–G5 (release candidate)

**Política:** Nunca desplegar por partes; PR #35 es rama de integración, `main` permanece protegido. Diferenciar CI verde de funcionalidad operativa pública.

## Infraestructura por producto

| Servicio | Directorio | Funciones | Estado |
|---|---|---|---|
| **API FileMagik existente** | `pdf-engine/` | PDF/Office + HEIC/GIF + FFmpeg + 7Z/RAR, quotas SQLite y reserva global | Railway existente; rutas nuevas **apagadas** por defecto |
| **Gotenberg existente** | servicio Railway actual | PDF/Office y redacción segura | Online |
| **Motores fuente + QA** | `image-engine/`, `media-engine/`, `archive-engine/` | Pruebas modulares independientes; **no** son nuevos servicios Railway | Código integrado en la API anterior |
| Frontend Next.js | `src/` | Herramientas locales y proxy con Turnstile al mismo host API | PR #35 sin publicar |

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
- [x] FFmpeg aislado en módulo integrado en la API Railway existente, bearer privado, whitelist, duración ≤120 s, entrada privada ≤12 MiB y web ≤3 MiB.
- [x] Convierte audio WAV/MP3, vídeo MP4, vídeo → GIF, y GIF animado → MP4.
- [x] Compilación Docker y tests de flujos reales incluidos en Actions.
- [ ] Almacén temporal y distribución de resultados sin buffering en el frontend Vercel (límites de respuesta Vercel).
- [ ] Persistencia de créditos/cuotas, cancelación de trabajo activo y reconciliación.
- [x] Rutas FFmpeg montadas en la API existente, con SQLite de capacidad global y cuotas por visitante.
- [ ] Certificación de consumo CPU/RAM **real** en Railway, recuperación tras reinicios y activación controlada.

## Gate G4 — motor de archivos
- [x] Libarchive montado como módulo en la API actual, con autenticación, 40 ficheros como máximo, límites de expansión y rechazo de enlaces especiales.
- [x] ZIP local y TAR local con validaciones.
- [x] 7Z real a ZIP probado; RAR corrupto rechazado.
- [ ] Corpus positivo RAR4/RAR5 válido y RAR cifrado rechazado.
- [x] Cuotas SQLite persistentes, límite global de una tarea intensiva y comprobación de memoria disponible antes de convertir.
- [ ] Ensayos reales de memoria, CPU y tiempo de extracción con corpus complejo en Railway.
- [ ] Proxy público protegido y streaming del ZIP de resultado, con autorización en Next.

## Gate G1 + G5 — publicación integral
- [x] PDF privado Railway, Gotenberg y verificación auth/redacción irreversible.
- [x] Pruebas de rutas Office DOCX/XLSX/PPTX/ODS/ODP y archivos de ejemplo reales.
- [ ] Turnstile final verificado + configuración estricta de hostname en dominio real.
- [ ] Comparativas de fidelidad compleja PDF/Office, OCR, firma/formularios y font parity.
- [ ] CI todos los workflows SUCCESS sobre el **mismo** head SHA, sin rutas saltadas.
- [ ] Verificación cross-device, Lighthouse, RGPD y consentimiento anuncios en producción.
- [x] Cuotas por visitante/globales y control de concurrencia compartido entre PDF, imágenes, vídeo y archivos en el mismo volumen Railway.
- [ ] Activación y pruebas de extremo a extremo con Turnstile real, errores, supervisión y recuperación.
- [ ] Merge a `main` sólo después de pasar todo; un release Vercel + health Railway, pruebas reales y rollback.

**Regla de seguridad:** No habilitar motores multimedia o de archivos públicamente sólo porque el contenedor arranque. Un API privado sin cuota persistente, streaming de resultados y límite CPU no cumple aún los criterios de lanzamiento.
