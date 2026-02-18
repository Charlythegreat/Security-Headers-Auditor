/**
 * Background service worker for the Security Headers Auditor extension.
 *
 * Responsibilities:
 *  1. Listen for audit requests from the DevTools panel.
 *  2. Use chrome.debugger to capture response headers for the inspected page.
 *  3. Run the scoring engine and return results.
 *  4. Maintain scan history in chrome.storage.local.
 *
 * @module service-worker
 */

import { audit } from '../analysis/scoring.js';
import { normalizeHeaders } from '../utils/helpers.js';
import { MSG, STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../utils/constants.js';

// ──────────────────────────────────────────────
// In-memory cache of latest headers per tab
// ──────────────────────────────────────────────

/** @type {Map<number, Record<string, string>>} */
const tabHeaders = new Map();

/** @type {Map<number, string>} */
const tabUrls = new Map();

// ──────────────────────────────────────────────
// Capture headers via webRequest API
// ──────────────────────────────────────────────

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Only care about main_frame (top-level navigation) responses
    if (details.type !== 'main_frame') return;

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
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders'],
);

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHeaders.delete(tabId);
  tabUrls.delete(tabId);
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
    if (!e.message?.includes('already')) throw e;
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
       * @param {{ tabId: number }} source
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
    .catch((err) => sendResponse({ type: MSG.AUDIT_ERROR, error: err.message || String(err) }));

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
      return handleAuditRequest(msg.tabId);

    case MSG.GET_HISTORY:
      return handleGetHistory();

    case MSG.CLEAR_HISTORY:
      return handleClearHistory();

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

/**
 * Run a security header audit for the given tab.
 * @param {number|undefined} tabId
 * @returns {Promise<import('../types/types').AuditorMessage>}
 */
async function handleAuditRequest(tabId) {
  if (tabId === undefined) throw new Error('tabId is required for an audit request.');

  let url = '';
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
      const report = audit(url, {});
      await saveHistory(report);
      return { type: MSG.AUDIT_RESULT, report };
    }
  }

  const report = audit(url, headers);
  await saveHistory(report);

  return { type: MSG.AUDIT_RESULT, report };
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
console.log('[Security Headers Auditor] Service worker loaded.');
