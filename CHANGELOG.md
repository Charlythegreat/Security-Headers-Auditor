# Changelog

All notable changes to the Security Headers Auditor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
