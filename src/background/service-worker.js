/**
 * Background service worker for the Security Headers Auditor extension.
 *
 * Responsibilities:
 *  1. Listen for audit requests from the DevTools panel.
 *  2. Use chrome.webRequest + chrome.debugger to capture response headers.
 *  3. Capture ALL network requests (main document + sub-resources).
 *  4. Run the scoring engine and return results.
 *  5. Maintain rich scan history in chrome.storage.local.
 *
 * @module service-worker
 */

import { audit } from '../analysis/scoring.js';
import { SECURITY_HEADERS } from '../analysis/header-analyzer.js';
import { normalizeHeaders } from '../utils/helpers.js';
import { MSG, STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../utils/constants.js';

// ──────────────────────────────────────────────
// In-memory cache of latest headers per tab
// ──────────────────────────────────────────────

/** Main-frame headers per tab @type {Map<number, Record<string, string>>} */
const tabHeaders = new Map();

/** Main-frame URL per tab @type {Map<number, string>} */
const tabUrls = new Map();

/**
 * Sub-resource headers per tab.
 * Each tab maps to an array of { url, resourceType, statusCode, headers }.
 * @type {Map<number, import('../types/types').SubResourceResult[]>}
 */
const tabSubResources = new Map();

// ──────────────────────────────────────────────
// Security header keys we track for sub-resources
// ──────────────────────────────────────────────
const TRACKED_KEYS = SECURITY_HEADERS.map((h) => h.key);

// ──────────────────────────────────────────────
// Capture headers via webRequest API (all requests)
// ──────────────────────────────────────────────

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const headers = {};
    if (details.responseHeaders) {
      for (const h of details.responseHeaders) {
        if (h.name && h.value !== undefined) {
          headers[h.name.toLowerCase()] = h.value;
        }
      }
    }

    if (details.type === 'main_frame') {
      // Main document — store as primary headers
      tabHeaders.set(details.tabId, headers);
      tabUrls.set(details.tabId, details.url);
      // Reset sub-resources on new navigation
      tabSubResources.set(details.tabId, []);
    } else {
      // Sub-resource — collect it
      if (!tabSubResources.has(details.tabId)) {
        tabSubResources.set(details.tabId, []);
      }

      /** @type {import('../types/types').SubResourceResult} */
      const subResult = {
        url: details.url,
        resourceType: details.type,
        statusCode: details.statusCode,
        headers,
        securityHeaders: TRACKED_KEYS.map((key) => ({
          key,
          value: headers[key] ?? null,
          present: key in headers,
        })),
      };

      tabSubResources.get(details.tabId).push(subResult);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders'],
);

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHeaders.delete(tabId);
  tabUrls.delete(tabId);
  tabSubResources.delete(tabId);
});

// ──────────────────────────────────────────────
// Debugger-based header capture (fallback / on-demand)
// Captures both main document and all sub-resources.
// ──────────────────────────────────────────────

/**
 * Attach the debugger to a tab, reload to trigger fresh headers, detach.
 * Returns main document headers + collected sub-resource headers.
 *
 * @param {number} tabId
 * @param {boolean} [captureSubResources=false]
 * @returns {Promise<{url: string, headers: Record<string,string>, subResources: import('../types/types').SubResourceResult[]}>}
 */
async function captureViaDebugger(tabId, captureSubResources = false) {
  const PROTOCOL_VERSION = '1.3';

  try {
    await chrome.debugger.attach({ tabId }, PROTOCOL_VERSION);
  } catch (e) {
    if (!e.message?.includes('already')) throw e;
  }

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});

    /** @type {Record<string,string>} */
    let capturedHeaders = {};
    let capturedUrl = '';
    /** @type {import('../types/types').SubResourceResult[]} */
    const subResources = [];
    let mainDocReceived = false;

    const headersPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Resolve with whatever we have so far
        resolve(undefined);
      }, captureSubResources ? 15_000 : 10_000);

      // For sub-resource mode, resolve after a delay once the main doc is received
      let settleTimer = null;

      function onEvent(source, method, params) {
        if (source.tabId !== tabId) return;
        if (method === 'Network.responseReceived') {
          const resp = params.response;
          const resHeaders = normalizeHeaders(resp.headers);

          if (params.type === 'Document' && !mainDocReceived) {
            capturedUrl = resp.url;
            capturedHeaders = resHeaders;
            mainDocReceived = true;

            if (!captureSubResources) {
              clearTimeout(timeout);
              chrome.debugger.onEvent.removeListener(onEvent);
              resolve(undefined);
              return;
            }

            // Give sub-resources 3 s to trickle in after main doc
            settleTimer = setTimeout(() => {
              clearTimeout(timeout);
              chrome.debugger.onEvent.removeListener(onEvent);
              resolve(undefined);
            }, 3_000);
          } else if (captureSubResources && params.type !== 'Document') {
            subResources.push({
              url: resp.url,
              resourceType: params.type,
              statusCode: resp.status,
              headers: resHeaders,
              securityHeaders: TRACKED_KEYS.map((key) => ({
                key,
                value: resHeaders[key] ?? null,
                present: key in resHeaders,
              })),
            });

            // Reset settle timer on each new resource
            if (settleTimer) {
              clearTimeout(settleTimer);
              settleTimer = setTimeout(() => {
                clearTimeout(timeout);
                chrome.debugger.onEvent.removeListener(onEvent);
                resolve(undefined);
              }, 2_000);
            }
          }
        }
      }

      chrome.debugger.onEvent.addListener(onEvent);
    });

    await chrome.debugger.sendCommand({ tabId }, 'Page.reload', { ignoreCache: true });
    await headersPromise;

    return { url: capturedUrl, headers: capturedHeaders, subResources };
  } finally {
    try { await chrome.debugger.sendCommand({ tabId }, 'Network.disable', {}); } catch { /* best-effort */ }
    try { await chrome.debugger.detach({ tabId }); } catch { /* best-effort */ }
  }
}

// ──────────────────────────────────────────────
// Message handler
// ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ type: MSG.AUDIT_ERROR, error: err.message || String(err) }));
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
      return handleAuditRequest(msg.tabId, msg.scanNetwork || false);

    case MSG.GET_HISTORY:
      return handleGetHistory();

    case MSG.CLEAR_HISTORY:
      return handleClearHistory();

    case MSG.NETWORK_SCAN_REQUEST:
      return handleNetworkScanRequest(msg.tabId);

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

/**
 * Run a security header audit for the given tab.
 * @param {number|undefined} tabId
 * @param {boolean} scanNetwork  If true, include sub-resource analysis
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleAuditRequest(tabId, scanNetwork) {
  if (tabId === undefined) throw new Error('tabId is required for an audit request.');

  let url = '';
  let headers = {};
  /** @type {import('../types/types').SubResourceResult[]} */
  let subResources = [];

  // 1. Try in-memory cache from webRequest
  if (tabHeaders.has(tabId)) {
    headers = tabHeaders.get(tabId) ?? {};
    url = tabUrls.get(tabId) ?? '';
    if (scanNetwork) {
      subResources = tabSubResources.get(tabId) ?? [];
    }
  }

  // 2. Fallback: capture via debugger (reloads the page)
  if (!url || Object.keys(headers).length === 0) {
    try {
      const result = await captureViaDebugger(tabId, scanNetwork);
      headers = result.headers;
      url = result.url;
      subResources = result.subResources;
    } catch (err) {
      // 3. Last resort — just get the tab URL
      try {
        const tab = await chrome.tabs.get(tabId);
        url = tab.url || '';
      } catch { /* ignore */ }

      if (!url) throw new Error('Unable to determine the tab URL.');

      const report = audit(url, {}, scanNetwork ? [] : undefined);
      await saveHistory(report);
      return { type: MSG.AUDIT_RESULT, report };
    }
  }

  const report = audit(url, headers, scanNetwork ? subResources : undefined);
  await saveHistory(report);

  return { type: MSG.AUDIT_RESULT, report };
}

/**
 * On-demand sub-resource scan for the current tab (uses debugger).
 * @param {number|undefined} tabId
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleNetworkScanRequest(tabId) {
  if (tabId === undefined) throw new Error('tabId is required.');

  // If we already have sub-resources cached, return them
  if (tabSubResources.has(tabId) && tabSubResources.get(tabId).length > 0) {
    return { type: MSG.NETWORK_SCAN_RESULT, subResources: tabSubResources.get(tabId) };
  }

  // Otherwise, use debugger to capture
  try {
    const result = await captureViaDebugger(tabId, true);
    return { type: MSG.NETWORK_SCAN_RESULT, subResources: result.subResources };
  } catch (err) {
    throw new Error(`Network scan failed: ${err.message}`);
  }
}

// ──────────────────────────────────────────────
// History persistence (richer entries with per-header snapshots)
// ──────────────────────────────────────────────

/**
 * Save a history entry (with per-header snapshots) to storage.
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
  return { type: MSG.HISTORY_RESULT, history: data[STORAGE_KEYS.HISTORY] || [] };
}

/** @returns {Promise<import('../types/types').AuditorMessage>} */
async function handleClearHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
  return { type: MSG.HISTORY_RESULT, history: [] };
}

// ──────────────────────────────────────────────
// Startup log
// ──────────────────────────────────────────────
console.log('[Security Headers Auditor] Service worker loaded — v1.1.0 (enhanced scoring + network scan).');
