# Cierre de UX y SEO — FileMagik

## Auditoría automatizada
El workflow `.github/workflows/ux-seo-audit.yml` ejecuta una versión compilada de Next.js en Chromium real, con proyectos de escritorio y móvil. Verifica:

- Dos ruedas circulares y navegación por teclado con salto a contenido.
- PDF de prueba de tres páginas → división en bloques → descarga ZIP real.
- CSV → JSON y PNG → WebP, con descarga.
- Cargador secundario con PDF y opciones compatibles.
- Selector de idioma sin pérdida de la herramienta.
- Lang, canonicals, hreflang recíproco, sitemap y robots para EN/ES/PT/FR.
- Ausencia de desbordamiento horizontal móvil.
- Axe: infracciones WCAG 2 / 2.1 A-AA de impacto grave o crítico en la portada, PDF Studio y un conversor.
- Lighthouse en laboratorio móvil, con métricas LCP, CLS y TBT y categorías rendimiento/accesibilidad/SEO.

Los resultados reales de cada ejecución, incluidos errores y capturas, se conservan temporalmente en los artifacts de la pull request. No sustituye auditoría manual de dispositivos físicos, uso real o campo CrUX.

## Implementación
- HTML semántico, `lang` correcto, foco y enlace para saltar al contenido.
- Resultados y progreso anunciados mediante ARIA, errores con `role=alert`.
- Botones PDF con nombre accesible y alternativa a arrastrar con flechas.
- Controles táctiles de al menos 44 px y respeto al movimiento reducido.
- Títulos SEO procedentes del texto específico de cada herramienta en su idioma, con metadescripciones únicas.
- Etiquetas OpenGraph y Twitter multilingües en portada, directorio, PDF Studio y herramientas.
- Sitemap completo con alternates de cuatro idiomas y URL canónica.
- Robots sin indexación de las rutas administrativas y API.
- Metadatos para verificación de Google y Bing mediante variables de entorno.

## Publicación y validación externa pendiente
**La aprobación e indexación de Google/Bing no se pueden certificar desde CI**. Requieren verificar la propiedad del dominio y acceso al servicio.

1. En [Google Search Console](https://search.google.com/search-console/) añadir propiedad de **prefijo de URL**: `https://filemagik.vercel.app/`.
2. Copiar el valor del atributo `content` de la meta de verificación de Google a `NEXT_PUBLIC_GSC_VERIFICATION` en Vercel (sin la etiqueta HTML entera).
3. Configurar `NEXT_PUBLIC_BING_VERIFICATION` desde [Bing Webmaster Tools](https://www.bing.com/webmasters/).
4. Desplegar **una única vez** después de configurar los tokens; comprobar el HTML generado en /es.
5. Verificar las propiedades, enviar `https://filemagik.vercel.app/sitemap.xml` a ambos servicios y comprobar indexación y cobertura.
6. Medir tráfico e impresiones reales y Web Vitals de campo a lo largo de varias semanas; Lighthouse local no puede sustituir mediciones reales.

Si se conecta un dominio propio, adaptar canónicos, las variables, propiedades de buscadores y redirecciones antes de promocionarlo.

## Reglas de cierre
- #9: puede considerarse cerrado a nivel de código y tests de navegadores cuando el CI completo de la PR esté verde, sin prometer test manual universal de iPhone/Safari.
- #10: técnica SEO puede considerarse cerrada cuando CI y Lighthouse pasen, pero la **activación de Search Console/Bing e indexación verificada** continúa siendo un bloqueo externo hasta que se complete.
- Mantener despliegues agrupados en Vercel.
