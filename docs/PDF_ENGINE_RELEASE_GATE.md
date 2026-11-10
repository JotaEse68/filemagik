# FileMagik PDF Studio G1 — release gate (09 Nov 2026)

## Ownership and isolation

All remote FileMagik processing is in one independent Railway project:
`filemagik-pdf-engine` (`f4788ca8-39cf-4fd1-bbd2-a959c69b73f1`), environment production.
Services: `filemagik-pdf-api` (Python/FastAPI) and `gotenberg` (Gotenberg 9/LibreOffice).
`gotenberg` is PRIVATE, accessible to API via `http://gotenberg.railway.internal:3000`.
API public endpoint: `https://filemagik-pdf-api-production.up.railway.app`; all conversion POST requests require a server-held bearer secret.
Quota volume `filemagik-quota-ledger` is mounted at `/data` on the API service.
Source of truth is `JotaEse68/filemagik`. No unrelated project is used.

## Verified infrastructure checks

- Railway Gotenberg: online, healthcheck /health.
- Railway API: online, port 8000, healthcheck /readyz; /readyz probes Gotenberg private connectivity.
- Railway predeploy command `python /app/predeploy_smoke.py` checks live private /health, real DOCX->PDF and PDF optimization, plus authenticated FastAPI Office->PDF, PDF->DOCX/XLSX and unauthorized denial.
- Volume-bound API starts as unprivileged `engine` user using `gosu`. If /data is missing the process refuses to start.
- GitHub workflow `pdf-engine.yml`: Python tests, Docker build, real Gotenberg 9 integration.
- Full client checks: `Quality` and `UX and SEO browser audit`.

## Abuse and cost controls (required)

- Vercel proxy creates an HMAC-pseudonymous visitor ID; never sends raw IPs to Railway.
- Each professional job requires a valid 32+ character server-to-server bearer; anonymous requests against the Railway domain cannot execute conversions.
- Mandatory, persistent Railway SQLite quotas: 4/visitor/hour; 12/visitor/day; 300/day globally; 4000/month globally; maximum 2 simultaneous jobs. Defaults configurable using PDF_ENGINE_* env.
- SQLite serializes cross-worker reservations; hourly/daily/monthly budget survives deployment changes.
- Vercel proxy accepts up to 3 MiB per input; API direct upload hard limit 12 MiB; output maximum 22 MiB via Vercel. No intermediate document retention.
- Turnstile is optional **additional** anti-abuse verification when both public site key and server secret have been configured. When enabled, its token is validated server-side with hostname and action. All other quotas remain mandatory.
- Professional requests are unavailable until `FILEMAGIK_PDF_ENGINE_PUBLIC_ENABLED=true` on Vercel and all release criteria are passed.
- Secret values must remain in encrypted server environment variables only; never `NEXT_PUBLIC_` except the Turnstile site key.

## Functional coverage

- PDF->editable DOCX: text, geometric tables, page sizes and supported embedded images. Complex original objects and precise font positions are not guaranteed.
- PDF->editable XLSX: detected grids / borderless column anchors, numeric values remain actual numeric cells, text identifiers with leading zeros preserved.
- Scanned PDFs without searchable text: must run OCR before editable extraction; do not return an empty Office document and call it editable.
- Office->PDF and lossless optimization: Gotenberg 9 with LibreOffice.
- Guarded balanced/max lossy image recompression: preserves text and page count; refuses signed/form/attachment/link documents.
- Visual PDF editor: annotations, fillable fields, page and object controls; original selectable text can be replaced by verified region redaction plus editable new text; not arbitrary Acrobat-equivalent content-stream editing.
- Irreversible redaction: requires confirmation, server authorisation, and refuses unsupported rotated/cropped/signed PDF pages.
- Browser-local tools work independently when professional service is unavailable.

## Final publication requirements

- [ ] CI Quality, browser audit and PDF Engine quality all green on the **last** commit.
- [ ] Railway deployment of that exact commit SUCCESS, /readyz 200, authenticated predeploy smoke PASS.
- [ ] Cross-browser automated PDF editor native text replacement, redaction and restore/undo regression passing.
- [ ] 10+ complex PDF fixtures and real Office fixture checks validated in CI; report known unsupported formats honestly.
- [ ] Enable professional mode in production Vercel only as a completed block, not piecemeal; observe READY and endpoint responses.
- [ ] Check privacy and quota errors: 401 on missing bearer, 403 on invalid visitor identity, 413 on oversized payload, 422 on corrupt/unsupported documents, 429 on quota exceeded and 503 on missing quota volume or unavailable Gotenberg.
- [ ] Record final PR, merged main commit and deployment in master issue #34.

## Known engineering limitations

No Open Source converter guarantees pixel-perfect editable Word/Excel reconstruction from arbitrary PDFs. Complex embedded fonts, merged cells, multi-column newsletters, diagrams and scanned documents may require manual corrections. Do not advertise full native original-object editing; supported text replacement uses permanent redaction and a new overlay, not font-preserving in-place content stream mutation. Server processing is an opt-in choice. An image-only scanned document needs OCR first.

Railway is already provisioned; older notes claiming it is blocked by a free-tier quota are obsolete.
