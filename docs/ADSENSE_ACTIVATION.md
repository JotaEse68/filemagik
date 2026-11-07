# FileMagik: activación segura de Google AdSense

Código preparado, pero **sin activar anuncios mientras falten las condiciones**.

## Antes de activar
1. Obtener aprobación del sitio en Google AdSense y un ID de editor válido `ca-pub-XXXXXXXXXXXXXXXX`.
2. Configurar una CMP certificada por Google compatible con IAB TCF; para el EEE, Reino Unido y Suiza, consultar los requisitos actuales. No sustituir por un cuadro de consentimiento casero.
3. Revisar aviso legal, privacidad, política de cookies, tratamiento de datos y política de publicidad.
4. Configurar espacios publicitarios reales sin tapar la zona de carga ni la descarga en móviles.
5. Probar que el consentimiento no se infiere de la visita; no cargar el script antes de una señal TCF válida. La implementación de esta rama exige consentimiento positivo TCF.
6. Completar verificación y QA del dominio en producción.

## Variables del proyecto
- `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXX`
- `NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP=NNNNNNNNNN`
- `NEXT_PUBLIC_ADSENSE_ENABLED=false` (pasar a true solamente tras aprobación)
- `NEXT_PUBLIC_ADSENSE_SITE_APPROVED=false`
- `NEXT_PUBLIC_ADSENSE_CMP_VERIFIED=false`

La ruta `/ads.txt` podrá publicarse con el ID real una vez disponible; no inventar `pub` ni el identificador del vendedor.

## Superadmin
El panel de administración está protegido por Supabase Auth + RLS, y necesita una base independiente. Ver `docs/sql/filemagik-bootstrap.sql`. No reutilizar las bases de AlérgenIA, GrabaliA o eCoverStudio.

## Estado a 2026-11-07
No hay proyecto de Supabase llamado FileMagik en ninguna de las dos cuentas conectadas; no consta ID de editor ni CMP y no se han conectado las credenciales. No afirmar que el panel ni Google Ads están activos.

## Distribución de espacios FileMagik (nueva estructura)
- Portada, después de las dos ruedas: `NEXT_PUBLIC_ADSENSE_SLOT_HOME`.
- Páginas de conversión, debajo del resultado y fuera de la zona de controles: `NEXT_PUBLIC_ADSENSE_SLOT_INCONTENT`.
- Escritorio/otros diseños futuros: `NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP`.
- Móvil si se define una posición no intrusiva: `NEXT_PUBLIC_ADSENSE_SLOT_MOBILE`.
- En la publicación actual no se muestran cuadros vacíos ni publicidad ficticia: los espacios solo se renderizan con identificadores reales, aprobación, bandera de activación y CMP TCF configurada.
- No usar anuncios intersticiales ni tapar el botón de descarga. La inserción del script sigue condicionada a señal válida de consentimiento del CMP.

El superadmin está aplazado y no es requisito para conectar AdSense mediante variables de entorno. Estas variables no son credenciales secretas (ID de editor y de espacios), pero deben corresponder al sitio aprobado.
