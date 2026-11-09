# PDF Studio advanced — release gate

The Railway project is blocked until the workspace can provision more services. Do NOT attempt to reuse or delete GrabaliA's existing services.

## Implementation
- Existing browser editor, OCR, PDF operations and form tools remain local and operational.
- `pdf-engine/`: authenticated PDF-to-DOCX/XLSX editable converters, Gotenberg 9 for Word/Excel/PowerPoint-to-PDF and lossless optimization, pypdf/Pillow guarded image recompression.
- `/api/pdf-engine` is a server-only Vercel proxy with request limits, Turnstile verification and no persistent storage. If the env flag is off or secrets missing, the browser keeps current local processing.
- The professional branch is purposefully fail-closed. Uploads should never be silently sent to a server without the user choosing professional mode.

## Must-pass before public launch
1. Railway plan allows a separate private project and services; deploy Gotenberg and API worker.
2. Confirm Gotenberg 9 readiness via GET /health on its private network from API worker.
3. Verify `GET /healthz` on API worker and authorized, unauthorized, invalid type/size, encrypted, signed and oversized inputs.
4. Configure Vercel server-only vars `FILEMAGIK_PDF_ENGINE_URL`, `FILEMAGIK_PDF_ENGINE_SECRET`, `FILEMAGIK_TURNSTILE_SECRET`; public `NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY`; set `FILEMAGIK_PDF_ENGINE_PUBLIC_ENABLED=true` only after all checks.
5. Turnstile domain allowlist must contain `filemagik.vercel.app` or final custom domain. A successful challenge token must have action `filemagik_pdf` and matching hostname.
6. Test 3 MiB limit on Vercel route and 12 MiB limit on direct Railway endpoint. Larger files require a future secure direct-upload flow, not unbounded serverless forwarding.
7. Compare 10+ source DOCX/XLSX/PPTX and PDFs from different origins with screenshots, extraction, page counts and manual review.
8. Verify cost ceilings and anti-abuse behavior before switching professional mode on for everyone. A captcha alone is NOT a per-user quota. Enable cloud processing only with adequate cost controls.
9. Verify the original local PDF converters work when the professional service is offline or disabled.

## Integrity and limitations
- PDF does not encode tables or reading order as semantic Office objects. Editable reconstruction is best effort. The visual Word mode intentionally uses page images.
- Editing native PDF content streams (original objects, original fonts, vector layers) is not complete: current editor manipulates overlay objects and creates actual AcroForm fields. No claim of full Acrobat-equivalent editing.
- `pdf-to-xlsx` returns editable cells but without merged-cell and chart fidelity guarantees.
- `office-to-pdf` benefits from LibreOffice rendering; installed fonts may affect layout.
- Recompressing a signed PDF invalidates signatures and must be refused. Lossy mode may drop metadata or attachments and needs explicit warnings.
- No files are retained by the worker on successful request completion; Railway/Vercel runtime may emit standard request metadata logs.

## Decisions blocked by Railway quota
The Railway connector reports: "Free plan resource provision limit exceeded. Please upgrade to provision more resources!". No new project/service has been created. Nothing was changed in GrabaliA.
