/**
 * Utility / helper functions.
 * @module helpers
 */

/**
 * Normalise raw header arrays / objects into a simple { lowercaseKey: value } map.
 * Handles both the { name, value }[] shape from chrome.debugger and
 * the Record<string, string> shape from webRequest.
 *
 * @param {Array<{name:string, value:string}> | Record<string,string>} raw
 * @returns {Record<string,string>}
 */
export function normalizeHeaders(raw) {
  /** @type {Record<string,string>} */
  const map = {};

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      map[entry.name.toLowerCase()] = entry.value;
    }
  } else if (raw && typeof raw === 'object') {
    for (const [key, val] of Object.entries(raw)) {
      map[key.toLowerCase()] = val;
    }
  }

  return map;
}

/**
 * Deep-clone a simple JSON-safe object.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a short ISO-like timestamp.
 * @returns {string}
 */
export function timestamp() {
  return new Date().toISOString();
}

/**
 * Truncate a string to maxLen, appending "…" if truncated.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 120) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Safely parse a max-age value from an HSTS or similar header.
 * @param {string} headerValue
 * @returns {number|null} seconds, or null if not found
 */
export function parseMaxAge(headerValue) {
  const match = headerValue.match(/max-age\s*=\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check whether a CSP directive list contains a given directive.
 * @param {string} csp  Full CSP header value
 * @param {string} directive  e.g. "default-src"
 * @returns {boolean}
 */
export function cspHasDirective(csp, directive) {
  return csp
    .split(';')
    .map((d) => d.trim().split(/\s+/)[0])
    .includes(directive);
}

/**
 * Format a score number for display (clamp 0–100).
 * @param {number} score
 * @returns {number}
 */
export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
