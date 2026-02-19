/**
 * Background service worker for the Security Headers Auditor extension.
 *
 * Responsibilities:
 *  1. Listen for audit requests from the DevTools panel.
 *  2. Use chrome.debugger to capture response headers for the inspected page.
 *  3. Capture sub-resource headers for network scanning.
 *  4. Run the scoring engine and return results.
 *  5. Scan all network requests (sub-resources) when requested.
 *
 * @module service-worker
 */

import { audit } from '../analysis/scoring.js';
import { normalizeHeaders } from '../utils/helpers.js';
import { SECURITY_HEADERS } from '../analysis/header-analyzer.js';
import { MSG, STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../utils/constants.js';

// ──────────────────────────────────────────────
// In-memory cache of latest headers per tab
// ──────────────────────────────────────────────

/** @type {Map<number, Record<string, string>>} */
const tabHeaders = new Map();

/** @type {Map<number, string>} */
const tabUrls = new Map();

/**
 * In-memory cache of sub-resource headers per tab.
 * Populated when network scanning is active.
 * @type {Map<number, import('../types/types').SubResourceResult[]>}
 */
const tabSubResources = new Map();

/** Set of tab IDs currently being network-scanned */
const networkScanActive = new Set();

// ──────────────────────────────────────────────
// Capture headers via webRequest API
// ──────────────────────────────────────────────

/** Security header keys we care about */
const SECURITY_HEADER_KEYS = SECURITY_HEADERS.map((h) => h.key);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'main_frame') {
      // Always capture main frame headers
      /** @type {Record<string, string>} */
      const headers = {};
      if (details.responseHeaders) {
        for (const h of details.responseHeaders) {
          if (h.name && h.value !== undefined) {
            headers[h.name.toLowerCase()] = h.value;
          }
        }
      }
      tabHeaders.set(details.tabId, headers);
      tabUrls.set(details.tabId, details.url);
      return;
    }

    // Sub-resource: only collect if network scanning is active for this tab
    if (!networkScanActive.has(details.tabId)) return;

    /** @type {Record<string, string>} */
    const resHeaders = {};
    if (details.responseHeaders) {
      for (const h of details.responseHeaders) {
        if (h.name && h.value !== undefined) {
          resHeaders[h.name.toLowerCase()] = h.value;
        }
      }
    }

    /** @type {import('../types/types').SubResourceResult} */
    const sub = {
      url: details.url,
      resourceType: details.type,
      statusCode: details.statusCode,
      headers: resHeaders,
      securityHeaders: SECURITY_HEADER_KEYS.map((/** @type {string} */ key) => ({
        key,
        value: resHeaders[key] ?? null,
        present: key in resHeaders,
      })),
    };

    const existing = tabSubResources.get(details.tabId) || [];
    existing.push(sub);
    tabSubResources.set(details.tabId, existing);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders'],
);

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHeaders.delete(tabId);
  tabUrls.delete(tabId);
  tabSubResources.delete(tabId);
  networkScanActive.delete(tabId);
});

// ──────────────────────────────────────────────
// Debugger-based header capture (fallback / on-demand)
// ──────────────────────────────────────────────

/**
 * Attach the debugger to a tab, navigate to trigger fresh headers, detach.
 * Returns the response headers for the main document.
 *
 * @param {number} tabId
 * @returns {Promise<{url: string, headers: Record<string,string>}>}
 */
async function captureViaDebugger(tabId) {
  const PROTOCOL_VERSION = '1.3';

  try {
    await chrome.debugger.attach({ tabId }, PROTOCOL_VERSION);
  } catch (e) {
    // May already be attached, ignore
    if (!(/** @type {Error} */ (e)).message?.includes('already')) throw e;
  }

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});

    /** @type {Record<string,string>} */
    let capturedHeaders = {};
    let capturedUrl = '';

    // Wrap listener in a promise that resolves on Network.responseReceived
    const headersPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for response headers (10 s).'));
      }, 10_000);

      /**
       * @param {chrome.debugger.Debuggee} source
       * @param {string} method
       * @param {any} params
       */
      function onEvent(source, method, params) {
        if (source.tabId !== tabId) return;
        if (method === 'Network.responseReceived') {
          const resp = params.response;
          if (params.type === 'Document') {
            capturedUrl = resp.url;
            capturedHeaders = normalizeHeaders(resp.headers);
            clearTimeout(timeout);
            chrome.debugger.onEvent.removeListener(onEvent);
            resolve(undefined);
          }
        }
      }

      chrome.debugger.onEvent.addListener(onEvent);
    });

    // Reload the page to trigger network events
    await chrome.debugger.sendCommand({ tabId }, 'Page.reload', { ignoreCache: true });
    await headersPromise;

    return { url: capturedUrl, headers: capturedHeaders };
  } finally {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Network.disable', {});
    } catch { /* best-effort */ }
    try {
      await chrome.debugger.detach({ tabId });
    } catch { /* best-effort */ }
  }
}

// ──────────────────────────────────────────────
// Message handler
// ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse(/** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.AUDIT_ERROR, error: err.message || String(err) })));

  // Return true to indicate async sendResponse
  return true;
});

/**
 * Route an incoming message.
 * @param {import('../types/types').AuditorMessage} msg
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleMessage(msg) {
  switch (msg.type) {
    case MSG.AUDIT_REQUEST:
      return handleAuditRequest(msg.tabId, msg.scanNetwork);

    case MSG.NETWORK_SCAN_REQUEST:
      return handleNetworkScanRequest(msg.tabId);

    case MSG.GET_HISTORY:
      return handleGetHistory();

    case MSG.CLEAR_HISTORY:
      return handleClearHistory();

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

/**
 * Return cached sub-resource scan results for a tab.
 * @param {number|undefined} tabId
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleNetworkScanRequest(tabId) {
  if (tabId === undefined) throw new Error('tabId is required.');
  const subResources = tabSubResources.get(tabId) || [];
  return /** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.NETWORK_SCAN_RESULT, subResources });
}

/**
 * Run a security header audit for the given tab.
 * @param {number|undefined} tabId
 * @param {boolean} [scanNetwork]
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleAuditRequest(tabId, scanNetwork) {
  if (tabId === undefined) throw new Error('tabId is required for an audit request.');

  let url = '';
  /** @type {Record<string, string>} */
  let headers = {};

  // 1. Try in-memory cache from webRequest
  if (tabHeaders.has(tabId)) {
    headers = tabHeaders.get(tabId) ?? {};
    url = tabUrls.get(tabId) ?? '';
  }

  // 2. Fallback: capture via debugger (reloads the page)
  if (!url || Object.keys(headers).length === 0) {
    try {
      const result = await captureViaDebugger(tabId);
      headers = result.headers;
      url = result.url;
    } catch (err) {
      // 3. Last resort — just get the tab URL
      try {
        const tab = await chrome.tabs.get(tabId);
        url = tab.url || '';
      } catch { /* ignore */ }

      if (!url) throw new Error('Unable to determine the tab URL.');

      // Return a report with no headers — everything will be "missing"
      const report = audit(url, /** @type {Record<string, string>} */ ({}));
      await saveHistory(report);
      return /** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.AUDIT_RESULT, report });
    }
  }

  const subResources = scanNetwork ? (tabSubResources.get(tabId) || []) : undefined;
  const report = audit(url, headers, subResources);
  await saveHistory(report);

  return /** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.AUDIT_RESULT, report });
}

// ──────────────────────────────────────────────
// History persistence
// ──────────────────────────────────────────────

/**
 * Save a trimmed history entry to storage.
 * @param {import('../types/types').AuditReport} report
 */
async function saveHistory(report) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    /** @type {import('../types/types').HistoryEntry[]} */
    const history = data[STORAGE_KEYS.HISTORY] || [];

    history.unshift({
      url: report.url,
      timestamp: report.timestamp,
      score: report.score,
      grade: report.grade,
      headerStatuses: report.headers.map((h) => ({
        key: h.key,
        name: h.name,
        status: h.status,
        pointsEarned: h.pointsEarned,
        maxPoints: h.maxPoints,
      })),
    });

    // Trim to max length
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.length = MAX_HISTORY_ENTRIES;
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  } catch (e) {
    console.warn('[SHA] Failed to save history:', e);
  }
}

/** @returns {Promise<import('../types/types').AuditorMessage>} */
async function handleGetHistory() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return /** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.HISTORY_RESULT, history: data[STORAGE_KEYS.HISTORY] || [] });
}

/** @returns {Promise<import('../types/types').AuditorMessage>} */
async function handleClearHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
  return /** @type {import('../types/types').AuditorMessage} */ ({ type: MSG.HISTORY_RESULT, history: [] });
}

// ──────────────────────────────────────────────
// Startup log
// ──────────────────────────────────────────────
console.log('[Security Headers Auditor] Service worker loaded.');
