# FileMagik — Hoja de ruta de formatos Windows

La referencia a Tangerine/Mandarina es **la experiencia de selección contextual y ruedas**, no una afirmación de disponer de sus 275 conversiones. El número comercial real debe salir del catálogo implementado y probado.

## Implementado en código en la nueva rama
- PDF: dividir páginas, dividir cada N, unir, extraer, eliminar, reordenar, rotar, texto de marca, comprimir mediante rasterización.
- Imágenes: JPG, PNG, WebP, redimensionar, limpiar pequeñas superposiciones.
- Documentos: texto DOCX, exportaciones básicas PDF/DOCX.
- Hojas de cálculo: XLSX/CSV/JSON.
- OCR imágenes y PDF escaneados.
- Windows: crear ZIP, navegar ZIP y descargar archivos individuales, renombrar lotes, ver tamaño/tipo/checksum SHA-256.

## Siguiente ampliación por prioridad
1. **Imágenes Windows:** BMP, TIFF, HEIC/HEIF, AVIF, GIF y compresión sin pérdida; remover metadatos EXIF; recortar, rotar y anotaciones.
2. **PDF fiable:** PDF a Word con formato, PDF a Excel/tablas, Word/PowerPoint/Excel a PDF fiel, documentos cifrados y PDF OCR buscable.
3. **Audio:** MP3, WAV, FLAC, OGG, M4A, extracción de audio, corte, normalización (motor WASM con QA de memoria).
4. **Vídeo:** MP4, WebM, MOV, GIF animado, recortar, extraer fotogramas, redimensionar, comprimir (aislamiento y límites para móvil).
5. **Office:** PPTX, DOCX, XLSX, ODP, ODS, RTF, TXT, Markdown y preservación de tablas.
6. **Ebooks:** EPUB, MOBI/AZW (solo donde legal/técnicamente viable), HTML y PDF.
7. **Subtítulos:** SRT, VTT, ASS, desplazamiento de tiempos, extracción desde archivos autorizados.
8. **Archivos:** ZIP, 7Z, TAR, GZ, RAR de lectura autorizada con herramientas auditadas, cifrado donde corresponda.
9. **Acciones de archivos útiles en Windows:** renombrado, información, checksums, deduplicación local, limpieza de metadatos, organización por extensiones.

## Criterios
No anunciar conversiones no implementadas. Cada motor debe pasar QA y comprobar consumo de memoria en móvil. Evitar subidas de archivos privados si no son necesarias.

## Publicación
Cambios en `feature/radial-studio-admin` inicialmente. Un único deploy después de GitHub CI verde y autorización para la actualización agrupada.
