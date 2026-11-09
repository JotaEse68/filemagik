# FileMagik PDF Engine

Dedicated Railway worker for layout-aware PDF -> editable DOCX/XLSX, professional Office -> PDF, and native PDF optimization. This service is NOT a public unlimited conversion API.

Service: Python/FastAPI; Gotenberg 9 required for Office rendering and lossless optimization. Image quality reduction is processed with Ghostscript with explicit preservation checks.

## Security
Every POST requires Authorization: Bearer <PDF_ENGINE_SECRET>. Set the same secret only in the Vercel server environment, never NEXT_PUBLIC_*. Railway deployment should not be exposed unless using a secured public domain, and all uploads are processed in memory or within short-lived temporary files deleted on completion.

## Railway environment
- PDF_ENGINE_SECRET: strong random 32+ character value
- GOTENBERG_URL: http://gotenberg.railway.internal:3000 (set to the actual private service DNS)
- MAX_UPLOAD_MIB: 12 (max consumed by Railway; current Vercel proxy accepts 3 MiB)
- PORT: assigned by Railway

## API
GET /healthz
POST /v1/jobs?operation=pdf-to-docx|pdf-to-xlsx|office-to-pdf|optimize-pdf&quality=lossless|balanced|maximum
multipart field: file; bearer token required.
Response: application/pdf, .docx, or .xlsx bytes.
Invalid encrypted/signed files are rejected for destructive operations. Editables are best-effort, not identical to Office originals.

## Deployment
Create Railway project FileMagik PDF Engine with services:
1. `gotenberg`, Docker image `gotenberg/gotenberg:9`, private network only; expose port 3000 internally.
2. `filemagik-pdf-engine`, GitHub repo `JotaEse68/filemagik`, root directory `/pdf-engine`, Dockerfile `Dockerfile`. Public domain only if Vercel must call it; do not expose Gotenberg.
3. Set Vercel server-only `FILEMAGIK_PDF_ENGINE_URL` and `FILEMAGIK_PDF_ENGINE_SECRET`. If absent, FileMagik uses its existing local converters.

## Operational safeguards
- 3 MiB input/output through Vercel proxy; avoid client->Railway direct exposure without authentication, rate limits and origin validation.
- Requests have server timeouts and no persistent document store.
- Conversion errors are surfaced (do not silently downgrade a selected professional conversion).
- Server no-AI/no-analytics; docs are not retained.
