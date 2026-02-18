# 🛡️ Security Headers Auditor

> A Microsoft Edge DevTools extension that audits HTTP security headers and provides a security score, detailed breakdown, and actionable fix recommendations — all inside Edge DevTools.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Edge Extension](https://img.shields.io/badge/Platform-Microsoft%20Edge-0078d4)

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
- [Submitting to Edge Add-ons Store](#submitting-to-edge-add-ons-store)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Real-time analysis** of HTTP response headers for the current page
- **Weighted scoring system** (0–100) with letter grades (A+ to F)
- **9 security headers** checked with severity levels (Critical / High / Medium / Low)
- **Visual gauge** displaying the overall security score
- **Expandable breakdown** for each header with:
  - Current value or "missing" indicator
  - Validation warnings and errors
  - Contextual fix recommendations
  - Example configurations
  - Links to MDN and OWASP documentation
- **Export reports** as JSON or PDF
- **Scan history** tracking with comparison across pages
- **Dark mode** support matching Edge DevTools styling
- **Tooltips** explaining each header's purpose
- **Color-coded status** indicators (✓ green, ⚠ yellow, ✗ red)

---

## Security Headers Checked

| Header | Severity | Missing Penalty |
|--------|----------|-----------------|
| Content-Security-Policy (CSP) | 🔴 Critical | −25 |
| Strict-Transport-Security (HSTS) | 🔴 Critical | −20 |
| X-Frame-Options | 🟠 High | −10 |
| X-Content-Type-Options | 🟠 High | −10 |
| Referrer-Policy | 🟡 Medium | −5 |
| Permissions-Policy | 🟡 Medium | −5 |
| Cross-Origin-Embedder-Policy (COEP) | 🟢 Low | −5 |
| Cross-Origin-Opener-Policy (COOP) | 🟢 Low | −5 |
| Cross-Origin-Resource-Policy (CORP) | 🟢 Low | −5 |

---

## Scoring System

The extension starts at **100 points** and deducts points for missing or misconfigured headers.

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

Misconfigured headers receive a partial penalty (50–100% of the missing penalty depending on severity of the misconfiguration).

---

## Screenshots

> After loading the extension, open Edge DevTools (F12) → **Security Headers** tab.

The panel shows:
1. A **score gauge** with the numeric score and letter grade
2. A **header-by-header breakdown** with expand/collapse details
3. **Raw response headers** in a collapsible section
4. **History** sidebar for comparing multiple scans

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
├── manifest.json              # Extension manifest (Manifest V3)
├── package.json               # Node.js project config & scripts
├── tsconfig.json              # TypeScript configuration
├── LICENSE                    # MIT License
├── CHANGELOG.md               # Version history
├── README.md                  # This file
├── .gitignore
│
├── assets/
│   ├── icons/
│   │   ├── icon.svg           # Source SVG icon
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
│   └── panel.js               # Panel UI controller
│
└── scripts/
    ├── generate-icons.js      # Generate PNG icons from code
    ├── build.js               # Build to dist/
    └── package.js             # Package dist/ as .zip
```

---

## How It Works

1. **Header Capture:** The background service worker uses the `chrome.webRequest.onHeadersReceived` API to capture HTTP response headers for main-frame navigations. As a fallback, it can use the `chrome.debugger` API to attach to a tab and reload the page to capture headers via the Chrome DevTools Protocol.

2. **Analysis:** When the user clicks **Scan Page**, the DevTools panel sends an `AUDIT_REQUEST` message to the service worker. The worker retrieves cached headers (or captures fresh ones) and passes them to the scoring engine.

3. **Scoring:** Each of the 9 security headers is checked:
   - **Missing** → full penalty applied
   - **Present but misconfigured** → partial penalty (based on validation)
   - **Present and valid** → no penalty
   The final score (0–100) maps to a letter grade.

4. **Rendering:** The panel receives the `AuditReport` and renders:
   - An animated SVG score gauge
   - Expandable header cards with status, warnings, recommendations, and documentation links
   - Raw headers in a collapsible section

5. **History:** Each scan is saved to `chrome.storage.local`. Users can view history, compare multiple scans, and export reports.

---

## Submitting to Edge Add-ons Store

### 1. Prepare the Package

```bash
npm run build
npm run package
```

This creates `security-headers-auditor-v1.0.0.zip` in the project root.

### 2. Create a Developer Account

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Sign in with a Microsoft account.
3. Register as an Edge Add-ons developer (one-time $19 fee for individual accounts).

### 3. Submit the Extension

1. In Partner Center, click **Create new extension**.
2. Upload the `.zip` file.
3. Fill in the required metadata:
   - **Name:** Security Headers Auditor
   - **Description:** Audit HTTP security headers of any webpage. Get a security score, detailed breakdown, and actionable recommendations inside Edge DevTools.
   - **Category:** Developer Tools
   - **Privacy policy:** The extension does not collect or transmit any user data. All analysis happens locally in the browser.
4. Upload store listing screenshots.
5. Submit for certification review (typically 1–3 business days).

### 4. After Approval

- The extension will appear in the [Edge Add-ons store](https://microsoftedge.microsoft.com/addons/).
- Update by uploading a new `.zip` with an incremented version in `manifest.json`.

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