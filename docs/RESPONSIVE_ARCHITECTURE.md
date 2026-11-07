# FileMagik · Arquitectura de navegación y responsive (v0.2)

## Plataforma
Aplicación web única para ordenador, tablet y móvil. No crear un instalador de escritorio ni aplicaciones nativas por separado. La web conserva herramientas, URLs, SEO, privacidad y traducciones en todos los dispositivos.

## Estructura de navegación
- `/{locale}` — portada con selector inteligente por tipo de archivo, búsqueda y herramientas.
- `/{locale}/tools` — directorio completo con filtros y buscador.
- `/{locale}/tools?category=pdf|images|office|data|ocr` — enlaces directos a categorías; el filtro se inicializa desde la URL.
- `/{locale}/{slug}` — cada herramienta con ruta indexable e instrucciones de formato.
- `/admin` — superadmin restringido a usuarios autorizados; distinto del directorio público.

## Categorías
1. **PDF Studio:** unión, división, extracción, ordenación, rotación, firmas visibles, marcas, compresión y PDF a PNG.
2. **Imágenes:** JPG, PNG, WebP, composición de imágenes a PDF.
3. **Documentos & Office:** texto DOCX, DOCX a PDF básico y PDF a Word de texto.
4. **Excel & datos:** XLSX ↔ CSV y CSV ↔ JSON.
5. **OCR y limpieza:** texto de capturas y escaneados, retoque local de pequeñas superposiciones.

Las categorías no duplican páginas de conversión; filtran un catálogo único definido en `src/config/site.ts` y `src/config/tool-navigation.ts`. Todas las herramientas conservan sus URLs SEO individuales.

## Comportamiento por dispositivo

| Área | Ordenador >= 1021px | Tablet 721–1020px | Móvil <= 720px |
| --- | --- | --- | --- |
| Navegación | Links en cabecera y selector de idioma | Menú desplegable | Menú desplegable con categorías |
| Portada | Hero + zona de archivos en dos columnas | Ajuste fluido | Hero y zona de archivos apilados |
| Directorio | 3 tarjetas por fila | 2 tarjetas por fila | 2 tarjetas; 1 si ancho < 400px |
| Categorías | Filtros en varias filas | Chips adaptables | Chips con desplazamiento horizontal |
| Convertidor | Panel principal y enlaces auxiliares | Una columna | Controles en ancho completo |
| PDF | Miniaturas con desplazamiento horizontal | Igual | Miniaturas táctiles y botones grandes |
| Imagen Cleanup | Canvas adaptable | Canvas adaptable | Canvas táctil con controles en 2 columnas |
| Publicidad | Columna lateral si se activa | Bloque móvil si se activa | Dock inferior solo si hay banners activos |

## Diseño visual
- Landing: JOTA Signature + Glassmorphism, gradientes, profundidad, microinteracciones.
- Áreas de trabajo: Minimal + IA Packs Product, prioridad a la tarea y descarga.
- Navegación de teclado, estados de foco visibles, `aria-expanded` y `aria-pressed`.
- Respeta `prefers-reduced-motion`.
- Los anuncios nunca deben tapar el área activa; actualmente desactivados hasta configuración.

## Arquitectura de carpetas

```text
src/
  app/
    [locale]/
      page.tsx               # Landing
      tools/page.tsx         # Directorio y filtros
      [slug]/page.tsx        # Landing SEO + conversor
    admin/                   # Panel independiente protegido
    api/                     # Configuración y publicidad
  components/
    mobile-navigation.tsx
    header.tsx
    language-switcher.tsx
    tool-explorer.tsx
    smart-dropzone.tsx
    converter.tsx
    pdf-preview.tsx
    image-cleanup.tsx
    advertising/
    admin/
  config/
    site.ts                  # Registro de herramientas
    tool-navigation.ts       # Categorías y filtros
  lib/
    i18n.ts
    tool-content.ts
    convert.ts
    pdf-operations.ts
    pdf-render.ts
    image-heal.ts
    excel.ts
    ocr.ts
    advertising/
    supabase/
tests/
docs/
```

## Criterios antes de lanzar
- Verificar breakpoints reales: 320, 375, 390, 768, 1024, 1280, 1440px.
- Revisar Chrome, Edge, Firefox y Safari iOS/Android donde sea posible.
- Probar menús y archivos en móvil: carga desde cámara/archivos, rotación, descargables, memoria.
- Confirmar build, tipos, lint y pruebas de conversores; no se han ejecutado en este entorno.
- SEO de herramientas y cuatro idiomas, sin redirecciones que pierdan las rutas.
- Comprobar ads accesibles y sin solapamiento si algún día se activan.
- **No hacer merge a main ni desplegar en Vercel sin autorización expresa.**
