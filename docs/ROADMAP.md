# FileMagik — Roadmap actualizado (7 de noviembre de 2026)

## Reglas de entrega
- Todos los cambios se acumulan en `develop/file-tools-next`.
- No hacer merge a `main`, publicar en Vercel, ni activar anuncios sin autorización expresa de Jota.
- Implementado en código ≠ probado ni lanzado. Estado final requiere evidencias de QA.

## Implementado en código; pendientes pruebas reales
- [x] Portal web responsive con diseño JOTA Signature + Glassmorphism.
- [x] Rutas SEO independientes EN, ES, PT y FR; canonical, hreflang, sitemap y JSON-LD.
- [x] Detección contextual de formatos al arrastrar archivos.
- [x] JPG/PNG/WebP conversiones, JPG/PNG a PDF y orden de archivos.
- [x] CSV↔JSON y CSV↔XLSX.
- [x] PDF: unir, dividir en páginas, dividir en bloques de N, extraer páginas, borrar páginas, reordenar, rotar y marca de agua textual.
- [x] Vistas previas PDF y botones accesibles para reordenar hasta 40 páginas.
- [x] PDF a PNG ZIP; PDF a DOCX de texto; DOCX a PDF básico de texto.
- [x] OCR a TXT de imágenes y PDF escaneados (límite de 15 páginas).
- [x] Compresión PDF rasterizada con pérdida explícita de texto y enlaces.
- [x] Firma visual en PDF (NO firma electrónica certificada).
- [x] Image Cleanup: selección rectangular, undo, retoque local sencillo, export PNG.
- [x] Estructura inicial de superadmin con email OTP, permisos en servidor y SQL RLS.
- [x] API y panel para anuncios propios; ubicaciones escritorio/móvil desactivadas por defecto.
- [x] Tests unitarios añadidos de rangos, catálogo, políticas de anuncios y detección.

## Bloqueantes antes de publicar
- [ ] Instalar dependencias, generar y versionar lockfile reproducible; lint + typecheck + build + tests completos. **No verificados.**
- [ ] QA con archivos reales, grandes, vacíos, cifrados y malformados en Chrome/Firefox/Safari y móvil.
- [ ] Validar PDF.js/Tesseract/ExcelJS en Next.js 15 y corregir problemas de bundling, tipado, workers y memoria.
- [ ] Auditar accesibilidad, rendimiento, Core Web Vitals y carga diferida de motores.
- [ ] Crear Supabase exclusivo de FileMagik si el propietario lo aprueba; ejecutar SQL y verificar RLS/OTP/admin.
- [ ] Probar guardado de banners, origin check, auditoría y anuncios solo con configuración válida.
- [ ] Crear textos legales definitivos, cookies, privacidad, procesos de datos y política de anuncios.
- [ ] Establecer dominio canónico real, Search Console y pruebas SEO por idioma.
- [ ] Desbloquear Vercel solo para un despliegue agrupado y aprobado.

## Funciones avanzadas todavía sin motor fiable
- [ ] PDF a Word con conservación de tablas, imágenes, encabezados y maquetación.
- [ ] Word/Excel/PowerPoint a PDF con fidelidad equivalente a Office.
- [ ] PDF a Excel con extracción de tablas validada.
- [ ] PDF OCR realmente buscable (el OCR actual descarga TXT).
- [ ] Firma digital criptográfica con certificados (distinta de firma visible).
- [ ] Proteger/desproteger PDF con contraseña de forma autorizada.
- [ ] Compresión PDF sin perder texto/hipervínculos.
- [ ] Retirada limpia de marcas de agua externas de PDF (solo contenidos autorizados).
- [ ] Image Cleanup avanzado: pincel, lazo, máscaras e inpainting IA/local con fondos complejos.
- [ ] Arrastrar miniaturas PDF para reordenar (actualmente se usan flechas).
- [ ] Editor visual de PDF más amplio: anotaciones, objetos, recorte y creación de formularios.
- [ ] Batch procesado + recetas; integrar ExcelAnalyzer tras auditar su fuente/API.
- [ ] Superadmin ampliado: usuarios, métricas agregadas, incidencias y mantenimientos.
- [ ] AdSense + CMP/TCF + Google Ad Manager y anuncios recompensados, tras aprobación.
- [ ] Estadísticas de publicidad propia con garantías de privacidad y política de retención.

## Estrategia de avance
1. Cerrar errores de compilación y pruebas.
2. Completar experiencia de conversión y PDF Studio.
3. Activar superadmin en base independiente y gestionar anuncios propios.
4. Documentación legal y SEO editorial por idioma.
5. Un solo release validado después de autorización.
