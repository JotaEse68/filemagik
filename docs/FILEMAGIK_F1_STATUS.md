# FileMagik — F1 integración de motores en Railway existente
Última actualización: 10 noviembre de 2026

## Arquitectura única — sin nuevos servicios de ejecución
- **Proyecto existente:** `filemagik-pdf-engine` (`f4788ca8-39cf-4fd1-bbd2-a959c69b73f1`).
- **Servicio 1 (ya existente):** `filemagik-pdf-api` FastAPI + PDF + HEIC/GIF + FFmpeg + libarchive.
- **Servicio 2 (ya existente):** `gotenberg` privado para Office/PDF.
- **Ningún nuevo proyecto Railway ni servicio adicional es necesario.**
- Los motores individuales `image-engine/`, `media-engine/`, `archive-engine/` se mantienen como módulos y suites de regresión independientes; los mismos conversores se han integrado en `pdf-engine/*_worker.py`, sin instancias Railway separadas.
- Los dos servicios adicionales que se habían preparado únicamente como *staged* se retiraron de la propuesta. Hay dos volúmenes **no aprovisionados** aún en la propuesta de Railway; no deben aplicarse, porque se reutiliza el volumen `/data` existente.

## Seguridad y capacidad
- `FILEMAGIK_UNIFIED_WORKERS_ENABLED` **apagado por defecto**. La API rechaza las rutas nuevas con HTTP 503 sin tocar los PDF existentes.
- Todas las rutas de imagen/media/archivos comparten el secreto privado `PDF_ENGINE_SECRET`; el proxy de Next utiliza `FILEMAGIK_PDF_ENGINE_SECRET` para el mismo host `FILEMAGIK_PDF_ENGINE_URL`.
- Los motores exigen visitante HMAC, cuotas persistentes horarias/diarias/mensuales (SQLite independientes en el mismo volumen `/data`); errores 403/429/503 de fail-closed y limpieza de recursos temporales.
- **Capacidad compartida:** SQLite `/data/filemagik-worker-capacity.sqlite3` bloquea simultaneidad y limita a 1 conversión intensiva total, en cualquier worker Uvicorn y **también PDF** mientras esté habilitado el motor unificado.
- Control previo de memoria usando cgroups v2: no iniciar tareas nuevas cuando el margen sea inferior a 384 MiB.
- Media: FFmpeg en proceso hijo, `-threads 1`, timeout 65s, input máx. 12 MiB, salida 12 MiB, duración máx. 120s, vídeo fuente máx. 2,1 Mpx y GIF de vídeo máx. 20s.
- Imagen: archivos hasta 12 MiB, HEIC máx. 12 Mpx, GIF ≤60 frames y ≤30 Mpx acumulados; salida ≤12 MiB.
- 7Z/RAR: entrada ≤12 MiB, hasta 40 entradas regulares, ≤24 MiB descomprimidos y ZIP ≤12 MiB; rechaza enlaces y rutas maliciosas.
- Next.js: formulario público ≤3 MiB, salida ≤12 MiB, Turnstile específico `filemagik_worker`, comprobación de origen/hostname y formatos. `FILEMAGIK_WORKER_ENGINES_PUBLIC_ENABLED` apagado por defecto.

## Capacidad medida antes de activar
Lectura de métricas Railway de las últimas 24 h / hora:
- API PDF actual: **límite 2 vCPU y ~1 GB RAM**.
- Máximo de memoria observado 24 h: ~**361 MB**; medición posterior actual ~**154 MB** y CPU actual ~**0,003 vCPU**.
- Estas métricas son **del servicio actual**, no un ensayo de carga con todos los nuevos motores activados. CI prueba operaciones y picos de memoria moderados; falta prueba de estrés controlada sobre Railway antes de levantar flag.

## Pruebas y publicación
- `pdf-engine/tests/test_integrated_workers.py` prueba HEIF real→PNG, GIF animado→WebP, WAV→MP3 mediante FFmpeg y 7Z real→ZIP, autenticación, cuotas, operación deshabilitada, concurrencia, memoria y límites de vídeo.
- `.github/workflows/pdf-engine.yml` instala dependencias de HEIF/FFmpeg/libarchive/p7zip en runner, ejecuta pytest y construye el Docker integrado; además mantiene smoke Office/Gotenberg.
- Los seis CI deben quedar en SUCCESS para el **mismo SHA** antes de aceptar integración.
- El seguimiento automático Railway del directorio `pdf-engine/**` se suspendió temporalmente mediante `watchPatterns` durante las pruebas, evitando nuevos builds automáticos; verificar el ajuste antes de reanudar releases.
- **No fusionar a main ni publicar en Vercel; no activar ninguno de los dos flags de los motores hasta completarse E2E real del proxy web→Railway y pruebas de carga.**
- El usuario no necesita crear ni pagar un tercer servicio: la arquitectura consolidada consume los dos servicios originales.

## Pendientes
1. CI integrado y Docker verde sobre último commit.
2. Prueba controlada de consumo CPU/RAM con archivos complejos en la API existente y verificación de límites tras reinicio.
3. Turnstile en dominio final y prueba web→API existente→descargas reales. Requiere una ventana de activación controlada.
4. Extender archivos grandes por almacenamiento temporal, colas y descargas sin buffering cuando proceda; la web hoy está limitada a 3 MiB.
5. G1/G5 de fidelidad PDF/Office, RGPD, accesibilidad móvil y release/rollback.

**Resultado de F1:** código de integración terminado en rama; el lanzamiento público continúa bloqueado hasta validar despliegue único y consumo real.
