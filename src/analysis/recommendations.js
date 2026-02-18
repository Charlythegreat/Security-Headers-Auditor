/**
 * Recommendations engine — provides human-readable fix suggestions
 * based on the header key, its evaluation status, and current value.
 *
 * @module recommendations
 */

/**
 * Return a contextual recommendation string for a given header result.
 *
 * @param {string} key       Lower-case header key
 * @param {import('../types/types').HeaderStatus} status
 * @param {string|null} value  Current header value (null if missing)
 * @returns {string}
 */
export function getRecommendation(key, status, value) {
  if (status === 'present' && key in PRESENT_TIPS) {
    return PRESENT_TIPS[key];
  }

  if (status === 'missing' && key in MISSING_TIPS) {
    return MISSING_TIPS[key];
  }

  if (status === 'misconfigured' && key in MISCONFIG_TIPS) {
    return typeof MISCONFIG_TIPS[key] === 'function'
      ? MISCONFIG_TIPS[key](value)
      : MISCONFIG_TIPS[key];
  }

  // Fallback
  if (status === 'missing') return `Add the ${headerLabel(key)} header to improve security.`;
  if (status === 'misconfigured') return `Review the current ${headerLabel(key)} value and tighten the policy.`;
  return 'Header is correctly configured — no action needed.';
}

// ──────────────────────────────────────────────
// Tip banks
// ──────────────────────────────────────────────

/** @type {Record<string, string>} */
const PRESENT_TIPS = {
  'content-security-policy':
    'CSP is present. Periodically review the policy as your application evolves and new scripts are added.',
  'strict-transport-security':
    'HSTS is active. Consider submitting your domain to the HSTS preload list (https://hstspreload.org) for maximum protection.',
  'x-frame-options':
    'Clickjacking protection is active. For finer control, consider using the CSP frame-ancestors directive alongside this header.',
  'x-content-type-options':
    'MIME-sniffing protection is active. No further action needed.',
  'referrer-policy':
    'Referrer-Policy is set. Ensure it aligns with your privacy requirements.',
  'permissions-policy':
    'Permissions-Policy is configured. Review periodically to restrict any newly introduced browser features.',
  'cross-origin-embedder-policy':
    'COEP is set. Verify that all cross-origin resources include proper CORS headers or CORP.',
  'cross-origin-opener-policy':
    'COOP is set. This helps isolate your browsing context from cross-origin interference.',
  'cross-origin-resource-policy':
    'CORP is set. Resources are protected from unauthorized cross-origin reads.',
};

/** @type {Record<string, string>} */
const MISSING_TIPS = {
  'content-security-policy':
    "Add a Content-Security-Policy header. Start with a report-only policy to avoid breaking your site:\n\nContent-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; report-uri /csp-report\n\nOnce validated, switch to enforcing mode.",
  'strict-transport-security':
    'Add Strict-Transport-Security to force HTTPS connections:\n\nStrict-Transport-Security: max-age=63072000; includeSubDomains; preload\n\nMake sure your site works fully over HTTPS first.',
  'x-frame-options':
    'Add X-Frame-Options to prevent clickjacking:\n\nX-Frame-Options: DENY\n\nOr use SAMEORIGIN if your site uses iframes internally.',
  'x-content-type-options':
    'Add X-Content-Type-Options to prevent MIME-sniffing:\n\nX-Content-Type-Options: nosniff',
  'referrer-policy':
    'Add Referrer-Policy to control referrer information:\n\nReferrer-Policy: strict-origin-when-cross-origin\n\nThis sends only the origin for cross-origin requests.',
  'permissions-policy':
    'Add Permissions-Policy to restrict browser features:\n\nPermissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\nDisable features your application does not need.',
  'cross-origin-embedder-policy':
    'Add Cross-Origin-Embedder-Policy to enable cross-origin isolation:\n\nCross-Origin-Embedder-Policy: require-corp\n\n⚠ Ensure all subresources set appropriate CORS headers or CORP.',
  'cross-origin-opener-policy':
    'Add Cross-Origin-Opener-Policy to isolate your browsing context:\n\nCross-Origin-Opener-Policy: same-origin',
  'cross-origin-resource-policy':
    'Add Cross-Origin-Resource-Policy to control who can read your resources:\n\nCross-Origin-Resource-Policy: same-origin\n\nUse same-site or cross-origin if needed for CDN assets.',
};

/**
 * @type {Record<string, string | ((value: string|null) => string)>}
 */
const MISCONFIG_TIPS = {
  'content-security-policy': (/** @type {string|null} */ value) => {
    const tips = [];
    if (value && /unsafe-inline/.test(value)) {
      tips.push("Remove 'unsafe-inline' from script-src. Use nonces or hashes instead.");
    }
    if (value && /unsafe-eval/.test(value)) {
      tips.push("Remove 'unsafe-eval' — refactor code to avoid eval() and new Function().");
    }
    if (value && value.includes('*')) {
      tips.push("Avoid wildcard (*) sources — specify exact origins instead.");
    }
    return tips.length
      ? 'Issues found:\n• ' + tips.join('\n• ')
      : 'Review the CSP value and tighten the policy.';
  },
  'strict-transport-security': (/** @type {string|null} */ value) => {
    const tips = [];
    if (value && !/includeSubDomains/i.test(value)) {
      tips.push('Add includeSubDomains to cover all subdomains.');
    }
    if (value && !/preload/i.test(value)) {
      tips.push('Add the preload directive and submit to hstspreload.org.');
    }
    const match = value?.match(/max-age\s*=\s*(\d+)/i);
    if (match && parseInt(match[1], 10) < 31536000) {
      tips.push('Increase max-age to at least 31536000 (1 year).');
    }
    return tips.length
      ? 'Improve HSTS configuration:\n• ' + tips.join('\n• ')
      : 'Review the HSTS value for best practices.';
  },
  'x-frame-options':
    'Use DENY or SAMEORIGIN. The ALLOW-FROM directive is deprecated — use CSP frame-ancestors instead.',
  'x-content-type-options':
    'Set the value to exactly "nosniff" (no other values are valid for this header).',
  'referrer-policy':
    'Use "strict-origin-when-cross-origin" or "no-referrer" for stronger privacy. Avoid "unsafe-url".',
  'permissions-policy':
    'Restrict more browser features by setting them to () (empty allowlist). E.g., camera=(), microphone=().',
  'cross-origin-embedder-policy':
    'Set to "require-corp" for full cross-origin isolation. "unsafe-none" provides no protection.',
  'cross-origin-opener-policy':
    'Set to "same-origin" for full browsing context isolation.',
  'cross-origin-resource-policy':
    'Use "same-origin" or "same-site" to restrict who can read this resource. "cross-origin" is the most permissive.',
};

/**
 * Pretty-print a header key for display.
 * @param {string} key
 * @returns {string}
 */
function headerLabel(key) {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}
