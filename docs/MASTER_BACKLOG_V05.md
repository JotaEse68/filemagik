# FileMagik · Plan maestro v0.5 (2026-11-07)

**Reglas:** Web gratis EN/ES/PT/FR, ruedas convergentes como entrada principal, navegadores Windows y móvil, desarrollo en rama sin despliegues de Vercel. No confundir código creado con función verificada. Solo se anuncia una conversión después de superar fixture real y control de memoria. Las dependencias de formato que requieren software de servidor o servicios externos se implementarán con motor compatible y límites, sin prometer precisión total.

## Decisión cerrada
- [x] Sustituir nombres técnicos por acciones claras y traducidas: dividir, unir, convertir, extraer, etc. Mantener la calidad de traducción en nuevos formatos.

## 1. P0 · UX accesible, PDF visual y flujo de conversión
- [ ] Revisar recorrido rueda → herramienta → carga → opciones → progreso → descarga
- [ ] Pulir selección de rangos de PDF, miniaturas y reordenación mediante arrastre con alternativa teclado
- [ ] Verificar detección y validación del cargador secundario
- [ ] Auditar foco, teclado, ARIA, tamaños táctiles, responsive y estados de error
- [ ] Librerías dinámicas, Core Web Vitals, cancelación y memoria
- [ ] Conservar nombres de acciones claros (ya decidido como completado)

## 2. P1 · SEO internacional y crecimiento orgánico
- [ ] Dominio canónico definitivo, redirecciones y variables Vercel
- [ ] Google Search Console y Bing Webmaster Tools, sitemap, indexación y cobertura
- [ ] Hreflang y alternates correctos ES/EN/PT/FR incluyendo páginas nuevas
- [ ] Contenido único conciso de intención de búsqueda y tutoriales por herramienta sin relleno visual
- [ ] Schema.org y social sharing, OG, metadatos
- [ ] Core Web Vitals, analítica de uso anónima y performance por dispositivo

## 3. P1 · PDF Studio avanzado con fidelidad y garantías
- [ ] PDF→Word con tablas/imágenes/formato conservado
- [ ] Word/Excel/PowerPoint→PDF fiel y pruebas de correspondencia visual
- [ ] PDF→Excel con tablas y celdas validadas
- [ ] OCR de PDF escaneados a PDF realmente buscable
- [ ] Compresión PDF sin rasterizar ni perder enlaces/texto
- [ ] Proteger y desbloquear PDFs propios o autorizados con contraseña
- [ ] Eliminar marcas de agua externas que sean objetos independientes y con autorización
- [ ] Firma digital criptográfica con certificados y validación (separada de firma visible)
- [ ] Miniaturas reordenables mediante arrastre, teclado y pantallas táctiles
- [ ] Editor: recortar, anotar, objetos, formularios y operaciones visuales

## 4. P1 · Imágenes, capturas y limpieza
- [ ] Entrada/salida BMP, TIFF, HEIC/HEIF, AVIF y GIF con compatibilidad y degradaciones transparentes
- [ ] Recortar, rotar, comprimir y retirar EXIF
- [ ] Image Cleanup: pincel, lazo, selección precisa, zoom, antes/después y deshacer
- [ ] Reconstrucción avanzada/inpainting local o proveedor IA con coste y privacidad documentados
- [ ] Exportar edición PNG/JPG/WebP respetando transparencia donde sea posible
- [ ] Procesar lotes con progreso, límites de memoria y ZIP

## 5. P2 · Expansión de formatos y automatizaciones
- [ ] Audio MP3/WAV/FLAC/OGG/M4A con cortes y extracción
- [ ] Vídeo MP4/MOV/WebM/GIF, compresión, corte, fotogramas y límites móviles
- [ ] PPTX/ODP a PDF/imágenes
- [ ] RTF/ODS/TXT/Markdown y formatos Office adicionales
- [ ] EPUB y ebooks con soporte legal y calidad
- [ ] Subtítulos SRT/VTT/ASS, ajuste temporal
- [ ] 7Z/TAR/GZ y lectura de RAR autorizada con límites anti-zip-bomb
- [ ] Deduplicación, clasificación por extensión y eliminación metadatos para Windows
- [ ] Auditoría de ExcelAnalyzer y demás integraciones; no conectar sin API/fuente confiable
- [ ] Procesamiento por lotes, recetas, pasos repetibles y persistencia opcional local

## Prioridad de ejecución
1. Primero: UX completa, rutas y pruebas de archivos actuales. Incluir drag-and-drop PDF accesible.
2. Después: retoque de imágenes de bajo riesgo técnico y SEO base técnico.
3. PDF fidelidad: decidir motores validados y costes antes de ofrecer Office, tablas, certificados o cifrado.
4. Formatos pesados: audio, vídeo, presentaciones y ebooks por módulos aislados.

## Pruebas de aceptación transversales
- Carga/descarga real en Chrome/Edge, Firefox, Android y Safari; errores claros, cancelación donde sea viable.
- Fixtures públicos/licenciados propios: archivos correctos, vacíos, dañados, cifrados, múltiples páginas y lotes.
- No se sube el contenido a ningún servidor sin explicación y autorización específica cuando una operación deje de ser local.
- PDF: verificar estructura de páginas, enlaces y texto; métricas visuales contra referencia para Office.
- Audiovisuales: validar metadatos, códecs, calidad, duración y memoria, no limitarse al cambio de extensión.
- Datos: conservar codificación, delimitadores, columnas y encabezados.
- Indexación: cada herramienta que aparezca en sitemap debe funcionar y tener título/descripción/hreflang únicos.
- AdSense, legales y CMP quedan como bloque de lanzamiento separado; superadmin aplazado por decisión de Jota.

## Estado histórico
La compilación de la versión v0.4 y sus 40 tests automáticos fueron correctos, pero **no sustituyen QA end-to-end** de todas las herramientas. La documentación antigua v0.2/v0.3 y estados de ramas sin desplegar son históricos; este documento define el backlog actualizado.
