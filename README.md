# 🛡️ Security Headers Auditor

> A Microsoft Edge DevTools extension that audits HTTP security headers and provides a security score, detailed breakdown, and actionable fix recommendations — all inside Edge DevTools.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Edge Extension](https://img.shields.io/badge/Platform-Microsoft%20Edge-0078d4)
![Languages](https://img.shields.io/badge/Languages-8-orange)

---

## Table of Contents

- [Features](#features)
- [Security Headers Checked](#security-headers-checked)
- [Scoring System](#scoring-system)
- [Screenshots](#screenshots)
- [Installation](#installation)
  - [Load as Unpacked Extension (Development)](#load-as-unpacked-extension-development)
  - [Install from Edge Add-ons Store](#install-from-edge-add-ons-store)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Localization](#localization)
- [Submitting to Edge Add-ons Store](#submitting-to-edge-add-ons-store)
- [Privacy Policy](#privacy-policy)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Real-time analysis** of HTTP response headers for the current page
- **Points-earned scoring system** (0–100) with letter grades (A+ to F)
- **9 security headers** checked with severity levels (Critical / High / Medium / Low)
- **Category breakdown** with visual progress bars (Critical, High, Medium, Low)
- **Network scanning** — optionally scan all sub-resource requests (scripts, stylesheets, images, XHR, etc.)
- **Visual gauge** displaying the overall security score
- **Expandable breakdown** for each header with:
  - Points earned / max points display
  - Current value or "missing" indicator
  - Validation warnings and errors
  - Contextual fix recommendations
  - Example configurations
  - Links to MDN and OWASP documentation
- **Export reports** as JSON or PDF
- **Scan history** tracking with per-header status snapshots
- **Enhanced comparison view** with:
  - Score/grade comparison across scans
  - Header-by-header diff highlighting improvements (green) and regressions (red)
- **Localization** — UI available in 8 languages: English, Spanish, French, German, Japanese, Chinese, Portuguese, Korean
- **Dark mode** support matching Edge DevTools styling
- **Tooltips** explaining each header's purpose
- **Color-coded status** indicators (✓ green, ⚠ yellow, ✗ red)

---

## Security Headers Checked

| Header | Severity | Max Points |
|--------|----------|-----------|
| Content-Security-Policy (CSP) | 🔴 Critical | 30 pts |
| Strict-Transport-Security (HSTS) | 🔴 Critical | 20 pts |
| X-Frame-Options | 🟠 High | 10 pts |
| X-Content-Type-Options | 🟠 High | 10 pts |
| Referrer-Policy | 🟡 Medium | 8 pts |
| Permissions-Policy | 🟡 Medium | 7 pts |
| Cross-Origin-Embedder-Policy (COEP) | 🟢 Low | 5 pts |
| Cross-Origin-Opener-Policy (COOP) | 🟢 Low | 5 pts |
| Cross-Origin-Resource-Policy (CORP) | 🟢 Low | 5 pts |
| **Total** | | **100 pts** |

---

## Scoring System

The extension uses a **points-earned model** where each header has a maximum point value. Points are earned based on header presence and configuration quality.

### Point Allocation

- **Critical Security (50 pts):** CSP (30) + HSTS (20)
- **High Importance (20 pts):** X-Frame-Options (10) + X-Content-Type-Options (10)
- **Medium Importance (15 pts):** Referrer-Policy (8) + Permissions-Policy (7)
- **Additional Hardening (15 pts):** COEP (5) + COOP (5) + CORP (5)

### Partial Scoring

Headers that are present but not optimally configured earn partial points:

- **CSP:** Granular sub-scoring — deductions for `unsafe-inline` (−25%), `unsafe-eval` (−20%), wildcard sources (−30%), missing `default-src` (−15%), missing `object-src` (−5%), missing `base-uri` (−5%)
- **HSTS:** Proportional `max-age` scoring — 1 year+ earns full points; shorter durations earn proportionally less

### Grade Scale

| Grade | Score Range |
|-------|-------------|
| A+    | 97 – 100    |
| A     | 93 – 96     |
| A−    | 90 – 92     |
| B+    | 87 – 89     |
| B     | 83 – 86     |
| B−    | 80 – 82     |
| C+    | 77 – 79     |
| C     | 73 – 76     |
| C−    | 70 – 72     |
| D+    | 67 – 69     |
| D     | 63 – 66     |
| D−    | 60 – 62     |
| F     | 0 – 59      |

---

## Screenshots

> After loading the extension, open Edge DevTools (F12) → **Security Headers** tab.

The panel shows:
1. A **score gauge** with the numeric score and letter grade
2. A **category breakdown** with progress bars per severity level
3. A **header-by-header breakdown** with expand/collapse details showing earned/max points
4. **Network sub-resource results** table (when Network Scan is enabled)
5. **Raw response headers** in a collapsible section
6. **History** sidebar with per-header comparison view
7. **Language selector** for switching UI language

---

## Installation

### Load as Unpacked Extension (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Charlythegreat/Security-Headers-Auditor.git
   cd Security-Headers-Auditor
   ```

2. **Generate icons** (if not already present):
   ```bash
   node scripts/generate-icons.js
   ```

3. **Open Edge** and navigate to:
   ```
   edge://extensions/
   ```

4. **Enable Developer mode** (toggle in the bottom-left or top-right corner).

5. **Click "Load unpacked"** and select the `Security-Headers-Auditor` project root folder.

6. **Open DevTools** (F12) on any webpage — you'll see a new **"Security Headers"** panel tab.

7. **Click "Scan Page"** to audit the current page's security headers.

### Install from Edge Add-ons Store

> Coming soon — see [Submitting to Edge Add-ons Store](#submitting-to-edge-add-ons-store) below.

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 18.0.0
- **Microsoft Edge** (Chromium-based, version ≥ 110)

### Setup

```bash
# Clone
git clone https://github.com/Charlythegreat/Security-Headers-Auditor.git
cd Security-Headers-Auditor

# Install dev dependencies (optional — for linting/formatting/typecheck)
npm install

# Generate icon assets
node scripts/generate-icons.js

# Lint
npm run lint

# Format
npm run format

# Type-check (requires TypeScript)
npm run typecheck

# Build to dist/
npm run build

# Package as .zip for store submission
npm run package
```

### Live Development

1. Load the extension as unpacked (see above).
2. Make changes to the source files.
3. Click the **reload** button on `edge://extensions/` to pick up changes.
4. Re-open DevTools or switch to the Security Headers tab to see updates.

> **Tip:** Changes to `manifest.json` or the service worker always require a full reload of the extension.

---

## Project Structure

```
Security-Headers-Auditor/
├── manifest.json              # Extension manifest (Manifest V3, i18n)
├── package.json               # Node.js project config & scripts
├── tsconfig.json              # TypeScript configuration
├── LICENSE                    # MIT License
├── CHANGELOG.md               # Version history
├── README.md                  # This file
├── .gitignore
│
├── _locales/                  # Chrome i18n locale files
│   ├── en/messages.json       # English (default)
│   ├── es/messages.json       # Spanish
│   ├── fr/messages.json       # French
│   ├── de/messages.json       # German
│   ├── ja/messages.json       # Japanese
│   ├── zh/messages.json       # Chinese
│   ├── pt/messages.json       # Portuguese
│   └── ko/messages.json       # Korean
│
├── assets/
│   ├── icons/
│   │   ├── icon16.png         # 16×16 toolbar icon
│   │   ├── icon32.png         # 32×32 icon
│   │   ├── icon48.png         # 48×48 icon
│   │   └── icon128.png        # 128×128 store icon
│   └── styles/
│       └── panel.css          # DevTools panel stylesheet
│
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   ├── analysis/
│   │   ├── header-analyzer.js # Header definitions & validation
│   │   ├── scoring.js         # Scoring engine & audit runner
│   │   └── recommendations.js # Fix recommendation logic
│   ├── utils/
│   │   ├── constants.js       # Shared constants
│   │   └── helpers.js         # Utility functions
│   └── types/
│       └── types.d.ts         # TypeScript type definitions
│
├── devtools/
│   ├── devtools.html          # DevTools entry (registers panel)
│   ├── devtools.js            # Panel registration script
│   ├── panel.html             # Panel UI markup
│   └── panel.js               # Panel UI controller (with i18n)
│
└── scripts/
    ├── generate-icons.js      # Generate anti-aliased PNG icons
    ├── build.js               # Build to dist/
    └── package.js             # Package dist/ as .zip
```

---

## How It Works

1. **Header Capture:** The background service worker uses the `chrome.webRequest.onHeadersReceived` API to capture HTTP response headers for all requests — main-frame navigations and sub-resources. As a fallback, it can use the `chrome.debugger` API to attach to a tab and reload the page to capture headers via the Chrome DevTools Protocol.

2. **Analysis:** When the user clicks **Scan Page**, the DevTools panel sends an `AUDIT_REQUEST` message to the service worker. If the **Network Scan** checkbox is checked, sub-resource headers are also included. The worker retrieves cached headers (or captures fresh ones) and passes them to the scoring engine.

3. **Scoring:** Each of the 9 security headers is evaluated:
   - **Missing** → 0 points earned
   - **Present but misconfigured** → partial points (based on validation severity and partialScore)
   - **Present and valid** → full points earned
   Results are grouped into category breakdowns (Critical, High, Medium, Low) with progress percentages.
   The final score (0–100) maps to a letter grade.

4. **Rendering:** The panel receives the `AuditReport` and renders:
   - An animated SVG score gauge
   - Category progress bars
   - Expandable header cards with status, points earned/max, warnings, recommendations, and documentation links
   - Sub-resource header results table (if network scanning is enabled)
   - Raw headers in a collapsible section

5. **History & Comparison:** Each scan is saved to `chrome.storage.local` with per-header status snapshots. Users can compare multiple scans to see which headers improved or regressed over time with color-coded diffs.

---

## Localization

The extension UI supports 8 languages:

| Code | Language |
|------|----------|
| en | English (default) |
| es | Spanish |
| fr | French |
| de | German |
| ja | Japanese |
| zh | Chinese (Simplified) |
| pt | Portuguese |
| ko | Korean |

**How it works:**
- The manifest uses `__MSG_appName__` and `__MSG_appDescription__` for Chrome i18n integration (displayed in `edge://extensions/` and the Edge Add-ons store)
- The panel UI uses an inline `data-i18n` attribute system with a language selector dropdown
- Switch languages via the language dropdown in the toolbar

**Adding a new language:**
1. Create `_locales/<code>/messages.json` with `appName` and `appDescription`
2. Add a locale object in `devtools/panel.js` under the `LOCALES` constant
3. Add an `<option>` in the language `<select>` in `devtools/panel.html`

---

## Submitting to Edge Add-ons Store

### Step 1: Prepare the Package

```bash
npm run build
npm run package
```

This creates `security-headers-auditor-v1.1.0.zip` in the project root.

### Step 2: Create a Developer Account

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Sign in with a Microsoft account.
3. Register as an Edge Add-ons developer (one-time $19 USD fee for individual accounts; free for enterprise accounts).

### Step 3: Prepare Store Assets

**Required screenshots** (1280×800 or 640×400 recommended):

1. **Main view** — Show the full panel after scanning a page with a visible score gauge and grade
2. **Header breakdown** — Show expanded header details with validation warnings
3. **Category breakdown** — Show the category progress bars
4. **Comparison view** — Show the history comparison with improvements highlighted
5. **Network scan** — Show the sub-resource headers table

**Tips for screenshots:**
- Use a real website (e.g., `example.com` or your own site) to show realistic results
- Capture both light and dark theme versions
- Ensure text is readable at 640×400 resolution

### Step 4: Submit the Extension

1. In Partner Center, click **Create new extension**.
2. Upload the `.zip` file.
3. Fill in the required metadata:

| Field | Value |
|-------|-------|
| **Name** | Security Headers Auditor |
| **Short description** | Audit HTTP security headers with scoring, recommendations, and comparison tools |
| **Category** | Developer Tools |
| **Language** | 8 languages (en, es, fr, de, ja, zh, pt, ko) |
| **Age rating** | All ages |
| **Permissions justification** | `debugger` — fallback header capture when webRequest cache is empty; `webRequest` — capture response headers; `tabs` — get tab URL; `storage` — persist scan history; `activeTab` — access current tab |

4. Upload store listing screenshots (see above).
5. Add the privacy policy statement (see [Privacy Policy](#privacy-policy)).
6. Submit for certification review.

### Step 5: Certification Review

Microsoft's review typically takes **1–3 business days**. Common reasons for rejection:

- Missing or unclear permission justifications
- Screenshots showing non-functional UI
- Missing privacy policy
- Manifest errors or unused permissions

### Step 6: After Approval

- The extension will appear in the [Edge Add-ons store](https://microsoftedge.microsoft.com/addons/).
- Update by uploading a new `.zip` with an incremented version in `manifest.json`.
- Users with the extension installed will auto-update within 24–48 hours.

---

## Privacy Policy

**Security Headers Auditor** respects user privacy:

- **No data collection:** The extension does not collect, store, or transmit any personal data or browsing information to external servers.
- **Local processing only:** All header analysis, scoring, and recommendations are computed entirely within the browser.
- **Local storage only:** Scan history is stored in `chrome.storage.local` on the user's device and is never transmitted externally.
- **No analytics:** The extension does not include any analytics, tracking, or telemetry.
- **No network requests:** The extension makes no outbound network requests of its own. All its operations use browser APIs to inspect already-loaded page data.
- **Minimal permissions:** The extension requests only the permissions strictly necessary for its functionality (see permission justifications in the submission guide above).

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test in Edge.
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request.

Please follow existing code style and include JSDoc comments for new functions.

---

## License

This project is licensed under the [MIT License](LICENSE).