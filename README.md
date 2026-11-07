# FileMagik

Free, browser-first conversion and document tools, designed in the JOTA Signature + Glassmorphism system. Public UI available in English, Spanish, Portuguese and French.

## Current development branch
`feature/radial-studio-admin` — **not deployed**. Vercel automatic deployments are suspended by project policy. Do not merge or trigger deployments until explicit owner approval.

## Modules implemented in source
- **PDF Studio:** join, split to one page per file, split into groups of N pages, extract/remove selected pages, reorder with thumbnail previews, rotate and add text watermarks.
- **PDF formats:** JPG/PNG to PDF, PDF pages to PNG ZIP, extract PDF text to simple DOCX, convert DOCX text to basic PDF, rasterize for a potentially smaller PDF, and add clearly labeled visual signatures.
- **Images:** JPG/PNG/WebP conversion and Image Cleanup (local rectangular retouching for small marks over simple backgrounds).
- **SEO catalog:** 33 tools with localized descriptions across four languages.\n- **OCR:** text extraction from screenshots and scanned PDF in English, Spanish, Portuguese and French.
- **Data:** CSV ↔ XLSX, CSV ↔ JSON.
- **Interface:** context-aware dropzone, file order controls, responsive layout, localized help for every tool.
- **SEO:** 33 tool routes × 4 languages, metadata, hreflang, canonical, sitemap and SoftwareApplication JSON-LD.
- **Superadmin foundation:** Supabase email login, RLS bootstrap SQL, admin-gated ad configuration API, audit table.
- **Owned ads:** optional desktop/mobile placements, disabled without valid saved settings. Google/AdSense intentionally NOT enabled.

### Fidelity & limitations
PDF-to-DOCX extracts text only; complex layout, tables, images and scanned text are not reconstructed. DOCX-to-PDF is basic text output and not a high-fidelity Office renderer. Image Cleanup interpolates small selected regions; it is not advanced generative inpainting. OCR language models may need downloading; uploaded file content is processed in the browser.

## Local development
```bash
npm install
npm run dev
npm run check
```
Configure `NEXT_PUBLIC_SITE_URL` for the final canonical domain. To enable superadmin, provision a **separate** FileMagik Supabase project, review `docs/sql/filemagik-bootstrap.sql`, configure the two publishable Supabase variables from `.env.example`, and explicitly grant the first authorized admin. Never reuse another product's database without an explicit migration plan.

## Release gates
Do **not** claim production readiness before browser conversion tests with actual files, lint/typecheck/build, robust error handling, privacy/cookie/legal review, mobile QA, domain configuration, admin authorization tests, and owner approval. Google advertising requires a compliant CMP and verified policy approval before activation.

## Ownership
© Quintessence Consulting Group. Development: [Desarrollo By Jota!](https://jsantos.pro/).
## FileMagik v0.3 / UX radial
- Dos ruedas interactivas tipo acción/contexto: seis categorías, seis acciones rápidas por categoría; interacción adaptada a móvil.
- PDF Studio en `/{locale}/pdf-studio` con división individual, por bloques y por intervalos claramente diferenciadas.
- Herramientas adicionales para usuarios Windows: ZIP, explorador de ZIP con descargas individuales, renombrado de lotes, redimensionado, inspección y SHA-256.
- Superadmin ampliado: publicidad propia, estado de AdSense y auditoría; requiere **Supabase independiente** antes de utilizarlo.
- Google AdSense está **preparado pero desactivado**: falta editor aprobado, CMP certificada y espacios reales. Ver `docs/ADSENSE_ACTIVATION.md`.
- QA de la rama comprobado con `npm run check`; validación con archivos reales pendiente.
