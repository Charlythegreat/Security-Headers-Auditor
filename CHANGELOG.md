# Changelog

All notable changes to the Security Headers Auditor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-18

### Added
- **Points-earned scoring model** — each header earns 0 to max points instead of penalty-only deductions
- **Category score breakdown** with visual progress bars (Critical, High, Medium, Low)
- **Network scanning** — toggle to scan all sub-resource requests (scripts, stylesheets, XHR, etc.) for security headers
- **Enhanced comparison view** — per-header status diff with improvement/regression highlighting
- **Localization** — UI available in 8 languages (EN, ES, FR, DE, JA, ZH, PT, KO) with language selector
- **Chrome i18n** — `_locales/` directory with manifest internationalization for store listing
- **Granular CSP partial scoring** — sub-deductions for unsafe-inline, unsafe-eval, wildcard, missing directives
- **Proportional HSTS scoring** — max-age penalty scales proportionally (1 year+ = full points)
- **Per-header history snapshots** — history entries now store per-header status/points for richer comparison
- **Anti-aliased icons** — improved icon generation with 3×3 super-sampling

### Changed
- Scoring engine rewritten to use points-earned model (CSP=30, HSTS=20, XFO=10, XCTO=10, RP=8, PP=7, COEP/COOP/CORP=5 each)
- Service worker now captures headers for all request types (not just main_frame)
- Header items now show "earned / max" points instead of penalty-only display
- History entries include `headerStatuses` array for comparison
- PDF export now includes category breakdown table
- README expanded with comprehensive Edge Add-ons store submission guide, privacy policy, and localization docs
- Manifest version bumped to 1.1.0
- Manifest name/description now use `__MSG_*__` i18n placeholders

## [1.0.0] - 2026-02-18

### Added
- Initial release of Security Headers Auditor
- Analyze HTTP response headers for the current page
- Check 9 critical security headers:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - Cross-Origin-Embedder-Policy (COEP)
  - Cross-Origin-Opener-Policy (COOP)
  - Cross-Origin-Resource-Policy (CORP)
- Weighted scoring system (A+ to F letter grades)
- DevTools panel integration with Edge DevTools
- Header-by-header breakdown with status indicators
- Visual security score gauge
- Expandable sections with header values and recommendations
- Color-coded status (green/yellow/red)
- Export reports as JSON or PDF
- Dark mode support matching Edge DevTools styling
- History tracking of scanned pages
- Compare headers across multiple pages
- Example header configurations for each security header
- Links to MDN and OWASP documentation
- Comprehensive tooltips explaining each header
