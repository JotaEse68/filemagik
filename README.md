# FileMagik

Free, browser-first file conversion platform. Four languages (English, Spanish, Portuguese, French), SEO-oriented tool pages, and JOTA Signature + Glassmorphism design.

This repo contains the initial implementation of the MVP. Conversion is intended to run in the user's browser, not to upload files to a backend.

## Stack
Next.js 15, React 19, TypeScript, pdf-lib, mammoth, JSZip.

## Start
```bash
npm install
npm run dev
npm run check
```

## SEO
Localized /en, /es, /pt, /fr, per-tool canonical URLs, hreflang, sitemap, robots and SoftwareApplication structured data. Set NEXT_PUBLIC_SITE_URL before public release.

## Advertising
App remains free with advertising. Ads and management console are planned but not enabled in this starter. Do not activate Google ads without consent management, proper legal pages and approval.

## Next milestones
- Superadmin and ads control
- Conversion QA for PDF, DOCX, images and tabular formats
- Richer tools, OCR and batching
- Compliance, performance and SEO audits

Copyright Quintessence Consulting Group. Developed by Desarrollo By Jota!