/**
 * Header definitions and analysis logic.
 * Each entry describes a security header, its weight, validation rules,
 * and documentation links.
 *
 * @module header-analyzer
 */

import { parseMaxAge, cspHasDirective } from '../utils/helpers.js';

// ──────────────────────────────────────────────
// Validation helpers (return { valid, warnings, errors })
// ──────────────────────────────────────────────

/** @typedef {import('../types/types').HeaderValidationResult} VR */

/** @returns {VR} */
function ok() {
  return { valid: true, warnings: [], errors: [] };
}

/** @param {string} msg @returns {VR} */
function warn(msg) {
  return { valid: true, warnings: [msg], errors: [] };
}

/** @param {string} msg @returns {VR} */
function err(msg) {
  return { valid: false, warnings: [], errors: [msg] };
}

/** Merge multiple results */
function merge(/** @type {VR[]} */ ...results) {
  /** @type {VR} */
  const out = { valid: true, warnings: [], errors: [] };
  for (const r of results) {
    if (!r.valid) out.valid = false;
    out.warnings.push(...r.warnings);
    out.errors.push(...r.errors);
  }
  return out;
}

// ──────────────────────────────────────────────
// Security header definitions
// ──────────────────────────────────────────────

/** @type {import('../types/types').SecurityHeaderDef[]} */
export const SECURITY_HEADERS = [
  // ── Content-Security-Policy ───────────────
  {
    name: 'Content-Security-Policy',
    key: 'content-security-policy',
    severity: 'critical',
    maxPoints: 30,
    missingPenalty: 30,
    misconfiguredPenalty: 20,
    description:
      'Controls which resources the browser is allowed to load for the page, mitigating XSS and data injection attacks.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy',
    owaspUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html',
    example: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
    validate(value) {
      const results = [];
      let partialScore = 1.0;

      if (/unsafe-inline/.test(value) && /script-src/.test(value)) {
        results.push(warn("'unsafe-inline' in script-src weakens CSP significantly."));
        partialScore -= 0.25;
      }
      if (/unsafe-eval/.test(value)) {
        results.push(warn("'unsafe-eval' allows eval() and similar — avoid if possible."));
        partialScore -= 0.20;
      }
      if (!cspHasDirective(value, 'default-src')) {
        results.push(warn("Missing 'default-src' directive — other directives may not fall back safely."));
        partialScore -= 0.15;
      }
      if (value.includes('*') && !value.includes('*.')) {
        results.push(err("Wildcard '*' source allows loading resources from any origin."));
        partialScore -= 0.30;
      }
      if (!cspHasDirective(value, 'script-src') && !cspHasDirective(value, 'default-src')) {
        results.push(warn("Neither 'script-src' nor 'default-src' is defined — scripts are unrestricted."));
        partialScore -= 0.20;
      }
      if (!cspHasDirective(value, 'object-src')) {
        results.push(warn("Missing 'object-src' — consider adding object-src 'none' to block plugins."));
        partialScore -= 0.05;
      }
      if (!cspHasDirective(value, 'base-uri')) {
        results.push(warn("Missing 'base-uri' — consider adding base-uri 'self' to prevent base tag injection."));
        partialScore -= 0.05;
      }

      partialScore = Math.max(0, partialScore);
      const merged = results.length ? merge(...results) : ok();
      merged.partialScore = partialScore;
      return merged;
    },
  },

  // ── Strict-Transport-Security ─────────────
  {
    name: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    severity: 'critical',
    maxPoints: 20,
    missingPenalty: 20,
    misconfiguredPenalty: 12,
    description:
      'Instructs the browser to only access the site over HTTPS, protecting against protocol downgrade attacks and cookie hijacking.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
    owaspUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html',
    example: 'max-age=63072000; includeSubDomains; preload',
    validate(value) {
      const results = [];
      let partialScore = 1.0;
      const maxAge = parseMaxAge(value);

      if (maxAge === null) {
        const r = err('Missing or unparseable max-age directive.');
        r.partialScore = 0.1;
        return r;
      }
      if (maxAge < 31536000) {
        results.push(warn(`max-age is ${maxAge}s — recommended minimum is 31536000 (1 year).`));
        // Scale based on how far off: 0s = bad, 31536000 = fine
        partialScore -= 0.30 * (1 - Math.min(maxAge / 31536000, 1));
      }
      if (!/includeSubDomains/i.test(value)) {
        results.push(warn('Consider adding includeSubDomains for broader protection.'));
        partialScore -= 0.15;
      }
      if (!/preload/i.test(value)) {
        results.push(warn('Consider adding the preload flag and submitting to the HSTS preload list.'));
        partialScore -= 0.10;
      }

      partialScore = Math.max(0, partialScore);
      const merged = results.length ? merge(...results) : ok();
      merged.partialScore = partialScore;
      return merged;
    },
  },

  // ── X-Frame-Options ───────────────────────
  {
    name: 'X-Frame-Options',
    key: 'x-frame-options',
    severity: 'high',
    maxPoints: 10,
    missingPenalty: 10,
    misconfiguredPenalty: 6,
    description:
      'Prevents the page from being embedded in iframes on other sites, mitigating clickjacking attacks.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
    owaspUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
    example: 'DENY',
    validate(value) {
      const upper = value.toUpperCase().trim();
      if (upper === 'DENY' || upper === 'SAMEORIGIN') return ok();
      if (upper.startsWith('ALLOW-FROM')) {
        return warn('ALLOW-FROM is deprecated and not supported in modern browsers. Use CSP frame-ancestors instead.');
      }
      return err(`Unrecognized value "${value}". Expected DENY or SAMEORIGIN.`);
    },
  },

  // ── X-Content-Type-Options ────────────────
  {
    name: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    severity: 'high',
    maxPoints: 10,
    missingPenalty: 10,
    misconfiguredPenalty: 6,
    description:
      'Prevents the browser from MIME-sniffing a response away from the declared content-type, reducing drive-by download attacks.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#x-content-type-options',
    example: 'nosniff',
    validate(value) {
      return value.trim().toLowerCase() === 'nosniff'
        ? ok()
        : err(`Expected "nosniff" but got "${value.trim()}".`);
    },
  },

  // ── Referrer-Policy ───────────────────────
  {
    name: 'Referrer-Policy',
    key: 'referrer-policy',
    severity: 'medium',
    maxPoints: 8,
    missingPenalty: 8,
    misconfiguredPenalty: 4,
    description:
      'Controls how much referrer information is sent with requests, helping protect user privacy.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#referrer-policy',
    example: 'strict-origin-when-cross-origin',
    validate(value) {
      const allowed = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url',
      ];
      const val = value.trim().toLowerCase();
      if (!allowed.includes(val)) {
        return err(`Unknown Referrer-Policy value "${value}".`);
      }
      if (val === 'unsafe-url') {
        return warn('"unsafe-url" sends the full URL as referrer — this may leak sensitive paths.');
      }
      if (val === 'no-referrer-when-downgrade') {
        return warn('"no-referrer-when-downgrade" is the browser default and offers minimal protection.');
      }
      return ok();
    },
  },

  // ── Permissions-Policy ────────────────────
  {
    name: 'Permissions-Policy',
    key: 'permissions-policy',
    severity: 'medium',
    maxPoints: 7,
    missingPenalty: 7,
    misconfiguredPenalty: 4,
    description:
      'Controls which browser features and APIs can be used in the page (camera, microphone, geolocation, etc.).',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#permissions-policy',
    example: 'camera=(), microphone=(), geolocation=(), payment=()',
    validate(value) {
      if (!value.trim()) return err('Permissions-Policy header is empty.');
      // Basic check: at least one feature is restricted
      if (/=\(\)/.test(value)) return ok(); // at least one feature disabled
      return warn('Consider restricting unused browser features (e.g., camera=(), microphone=()).');
    },
  },

  // ── Cross-Origin-Embedder-Policy ──────────
  {
    name: 'Cross-Origin-Embedder-Policy',
    key: 'cross-origin-embedder-policy',
    severity: 'low',
    maxPoints: 5,
    missingPenalty: 5,
    misconfiguredPenalty: 3,
    description:
      'Prevents a page from loading cross-origin resources that have not explicitly granted permission, enabling cross-origin isolation.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#cross-origin-embedder-policy',
    example: 'require-corp',
    validate(value) {
      const val = value.trim().toLowerCase();
      const allowed = ['unsafe-none', 'require-corp', 'credentialless'];
      if (!allowed.includes(val)) return err(`Unknown COEP value "${value}".`);
      if (val === 'unsafe-none') return warn('"unsafe-none" does not enable cross-origin isolation.');
      return ok();
    },
  },

  // ── Cross-Origin-Opener-Policy ────────────
  {
    name: 'Cross-Origin-Opener-Policy',
    key: 'cross-origin-opener-policy',
    severity: 'low',
    maxPoints: 5,
    missingPenalty: 5,
    misconfiguredPenalty: 3,
    description:
      'Isolates the browsing context group, preventing other origins from accessing the window object. Works with COEP for cross-origin isolation.',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#cross-origin-opener-policy',
    example: 'same-origin',
    validate(value) {
      const val = value.trim().toLowerCase();
      const allowed = ['unsafe-none', 'same-origin-allow-popups', 'same-origin'];
      if (!allowed.includes(val)) return err(`Unknown COOP value "${value}".`);
      if (val === 'unsafe-none') return warn('"unsafe-none" provides no isolation.');
      return ok();
    },
  },

  // ── Cross-Origin-Resource-Policy ──────────
  {
    name: 'Cross-Origin-Resource-Policy',
    key: 'cross-origin-resource-policy',
    severity: 'low',
    maxPoints: 5,
    missingPenalty: 5,
    misconfiguredPenalty: 3,
    description:
      'Indicates whether the resource can be shared cross-origin, protecting against speculative side-channel attacks (e.g., Spectre).',
    mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy',
    owaspUrl: 'https://owasp.org/www-project-secure-headers/#cross-origin-resource-policy',
    example: 'same-origin',
    validate(value) {
      const val = value.trim().toLowerCase();
      const allowed = ['same-site', 'same-origin', 'cross-origin'];
      if (!allowed.includes(val)) return err(`Unknown CORP value "${value}".`);
      if (val === 'cross-origin') return warn('"cross-origin" allows any site to embed this resource.');
      return ok();
    },
  },
];

/**
 * Look up a header definition by its lowercase key.
 * @param {string} key
 * @returns {import('../types/types').SecurityHeaderDef | undefined}
 */
export function getHeaderDef(key) {
  return SECURITY_HEADERS.find((h) => h.key === key);
}
