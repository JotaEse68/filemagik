# FileMagik · Inventario de servicios
Fecha: 2026-11-19. Solo nombres de variables, nunca secretos. Planes y costes: no verificados salvo indicación.

| Plataforma / URL del panel | Recurso | Función | Estado y entorno | Coste | Integraciones / variables |
| --- | --- | --- | --- | --- | --- |
| [GitHub](https://github.com/JotaEse68/filemagik) | JotaEse68/filemagik | Código, Actions, PR | main `c751546e9`, activo | No verificado | Vercel Git y Railway |
| [Vercel](https://vercel.com/jsantospro/filemagik) | `filemagik`, `prj_IfnbnYEJKF3r4feCwN3bZiRUkwEG` | Next.js, proxy PDF, admin | Producción READY con `c751546e9` | No verificado | `FILEMAGIK_PDF_ENGINE_URL`, `FILEMAGIK_PDF_ENGINE_SECRET`, `FILEMAGIK_TURNSTILE_SECRET`, `NEXT_PUBLIC_SITE_URL` |
| [Railway](https://railway.com/dashboard) | `filemagik-pdf-engine`, `f4788ca8-39cf-4fd1-bbd2-a959c69b73f1` | API y Gotenberg | Producción, 2 servicios online | No verificado | Source GitHub, `PDF_ENGINE_SECRET`, `GOTENBERG_URL` |
| [PDF API pública](https://filemagik-pdf-api-production.up.railway.app/readyz) | `filemagik-pdf-api` `8c538112-acc5-485d-b82d-79004af0b113` | PDF/Office, imagen/audio/vídeo/archivos, quotas | SUCCESS, `b5f5b3a9`, 1 réplica | No verificado | `FILEMAGIK_UNIFIED_WORKERS_ENABLED`, `FILEMAGIK_*_QUOTA_DB` |
| [Railway](https://railway.com/dashboard) | `gotenberg` `f76e7589-ca81-40fa-94be-b6fd15225c30` | LibreOffice PDF | Imagen `gotenberg/gotenberg:9`, privado, online | No verificado | `gotenberg.railway.internal:3000` |
| Railway volumen | `filemagik-quota-ledger` | SQLite cuotas | Montado `/data`, 450 MB | No verificado | PDF API |
| Railway staged | `filemagik-image-quota`, `filemagik-media-quota` | Volúmenes duplicados | Preparados pero NO aplicados | No activados | No desplegar; reutilizar `/data` |
| [Vercel Blob](https://vercel.com/dashboard/stores) | `filemagik/ads/settings/` | Campañas, anuncios, credenciales locales cifradas | Almacén conectado; configuración pública encontrada | No verificado | `BLOB_READ_WRITE_TOKEN` |
| [Cloudflare](https://dash.cloudflare.com/) | Turnstile PDF / workers | Prevención de abuso | Variables presentes; E2E real pendiente | No verificado | `NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY`, `FILEMAGIK_TURNSTILE_SECRET` |
| [Dominios Vercel](https://vercel.com/jsantospro/filemagik/settings/domains) | `www.filemagik.com`, `filemagik.com`, `filemagik.vercel.app` | SEO y acceso | Verificados; apex -> www 308 | No verificado | `NEXT_PUBLIC_SITE_URL` |
| [Google AdSense](https://www.google.com/adsense/) / [Ad Manager](https://admanager.google.com/) | Aprobación y SSV sin acreditar | Anuncios de pago, recompensados | Pendiente para fase final | No verificado | `NEXT_PUBLIC_ADSENSE_*`, `FILEMAGIK_REWARDED_*` |
| [Supabase](https://supabase.com/dashboard) | Sin proyecto FileMagik comprobado | Login OTP legado opcional | No configurado en Vercel; admin autónomo vía Blob | No aplica por ahora | `NEXT_PUBLIC_SUPABASE_URL` |
| [Search Console](https://search.google.com/search-console/) / [Bing](https://www.bing.com/webmasters/) | Propiedad por verificar | Indexación | Pendiente | No verificado | `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_BING_VERIFICATION` |
| [CDN de creativo](https://grabaliadl.b-cdn.net/) | Archivo de anuncio GrabaliA | Imagen usada en cinco ubicaciones | URL pública comprobada; titularidad y coste no revisados | No verificado | No modificar otra aplicación |

Actualizar tras cada bloque: dominio, proyecto, plan/coste real, variables por nombre, estado, conexiones, log y URL de administración. No crear servicios Railway nuevos.
