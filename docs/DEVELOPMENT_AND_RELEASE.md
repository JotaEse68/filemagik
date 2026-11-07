# FileMagik — development and release policy

## Product decisions
- Web only; no native desktop installers.
- Free for all visitors, advertising funded. No subscription or paid tier.
- Languages: EN, ES, PT, FR, each with indexable localized routes.
- Visual style: JOTA Signature + Glassmorphism landing; minimal, fast tool workspace.
- Files handled locally by the browser whenever feasible.
- No third-party advertising activation until CMP, approval and legal checks.

## Vercel deployment freeze (owner decision, 2026-11-07)
**Do not trigger production OR preview deployments until Jota explicitly authorizes a grouped release.**

- Work on `develop/file-tools-next` (or another development branch), not `main`.
- Do not merge or create a deployment-triggering PR without authorization.
- Vercel project is `filemagik` in JSantos Team; production remains inactive.
- Automatic deployments were suspended in the project. Verify project settings before any release.
- Git commits and unit tests are not deployment approvals.
- Run local lint, typecheck, tests, and build before grouping the final changes.
- A future release requires one controlled push/merge, one deployment, and smoke checks before opening indexing and AdSense.

## Code delivered in current development branch
- 13 converter types, including image-to-PDF and PDF rotation.
- Context-aware homepage upload and actions.
- Locale-preserving language switcher.
- Localized HTML language attributes and unique tool descriptions.
- Unit tests for routing/tool definitions, localized copy, and file detection.
- Input-size guards on conversion modules.

## Still pending
- Verified full dependency installation and production build.
- File-based end-to-end conversion tests in an actual browser.
- PDF/Office round-trip quality tests and malformed input handling.
- Superadmin with secured sign-in, access controls, audit log.
- Ad manager: owned banner slots, Google AdSense/CMP, placement and reporting.
- Privacy/cookies/legal content and compliance review.
- Real canonical domain, Search Console, analytics and final SEO audit.

## Evidence rule
No item should be marked done unless the related code exists and has been tested at the stated level. An unexecuted build is BLOCKED, not PASS.
