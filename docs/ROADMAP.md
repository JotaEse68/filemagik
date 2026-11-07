# FileMagik delivery roadmap
Status: initial code published; no production deployment or verified build yet.

## P0: launch blockers
- [ ] Confirm CI green and fix TypeScript/lint/build errors
- [ ] Test nine local converters with real files and negative cases
- [ ] Test 4 locales, mobile accessibility and page-specific SEO
- [ ] Choose and configure production domain; replace placeholder canonical URL
- [ ] Add privacy notice, legal notice, cookies/preferences appropriate to processing and ads
- [ ] Set up production preview and smoke tests

## P1: administration and monetization
- [ ] Implement secure role-based superadmin and admin audit
- [ ] Implement ad slots/configuration, own banners, performance metrics and protections
- [ ] Implement compliant CMP and AdSense only after approval
- [ ] Instrument events without collecting file contents
- [ ] Validate ad UX on mobile without covering actions

## P2: expansion
- [ ] PDF conversions with fidelity checks; OCR on scanned files
- [ ] ExcelAnalyzer integration or migration after assessing its API/source
- [ ] Batch processing, recipes, ZIP export, jobs and cancellation
- [ ] SEO editorial guides per language and format with unique localized explanations
- [ ] Core Web Vitals optimization and search indexing monitoring

## Accepted product decisions
- Web only, no desktop versions
- Free with advertising; no paid tier planned
- English, Spanish, Portuguese, French
- JOTA Signature + Glassmorphism public pages, minimal tool workspace
- Browser-side processing where technically practical
- No Google ads until user approval, consent implementation, and policy review
