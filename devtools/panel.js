/**
 * DevTools Panel — main UI controller.
 *
 * Communicates with the background service-worker via chrome.runtime.sendMessage
 * and renders audit results into the panel DOM.
 *
 * @module panel
 */

import {
  GRADE_COLORS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  MSG,
} from '../src/utils/constants.js';

// ──────────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────────

const $ = (/** @type {string} */ sel) => document.querySelector(sel);
const $$ = (/** @type {string} */ sel) => document.querySelectorAll(sel);

const dom = {
  btnScan: /** @type {HTMLButtonElement} */ ($('#btn-scan')),
  btnRetry: /** @type {HTMLButtonElement} */ ($('#btn-retry')),
  btnHistory: /** @type {HTMLButtonElement} */ ($('#btn-history')),
  btnCloseHistory: /** @type {HTMLButtonElement} */ ($('#btn-close-history')),
  btnClearHistory: /** @type {HTMLButtonElement} */ ($('#btn-clear-history')),
  btnCompare: /** @type {HTMLButtonElement} */ ($('#btn-compare')),
  btnCloseCompare: /** @type {HTMLButtonElement} */ ($('#btn-close-compare')),
  btnExportJson: /** @type {HTMLButtonElement} */ ($('#btn-export-json')),
  btnExportPdf: /** @type {HTMLButtonElement} */ ($('#btn-export-pdf')),
  btnTheme: /** @type {HTMLButtonElement} */ ($('#btn-theme')),
  exportDropdown: /** @type {HTMLElement} */ ($('#export-dropdown')),

  emptyState: /** @type {HTMLElement} */ ($('#empty-state')),
  loading: /** @type {HTMLElement} */ ($('#loading')),
  errorState: /** @type {HTMLElement} */ ($('#error-state')),
  errorMessage: /** @type {HTMLElement} */ ($('#error-message')),
  report: /** @type {HTMLElement} */ ($('#report')),

  gaugeFill: /** @type {SVGCircleElement} */ ($('#gauge-fill')),
  scoreValue: /** @type {HTMLElement} */ ($('#score-value')),
  gradeBadge: /** @type {HTMLElement} */ ($('#grade-badge')),
  scoreUrl: /** @type {HTMLElement} */ ($('#score-url')),
  scoreTime: /** @type {HTMLElement} */ ($('#score-time')),

  headerList: /** @type {HTMLElement} */ ($('#header-list')),
  rawHeadersPre: /** @type {HTMLElement} */ ($('#raw-headers-pre')),

  historyPanel: /** @type {HTMLElement} */ ($('#history-panel')),
  historyList: /** @type {HTMLElement} */ ($('#history-list')),

  comparePanel: /** @type {HTMLElement} */ ($('#compare-panel')),
  compareContent: /** @type {HTMLElement} */ ($('#compare-content')),
};

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────

/** @type {import('../src/types/types').AuditReport | null} */
let currentReport = null;

/** @type {import('../src/types/types').AuditReport[]} */
let reportCache = [];

// ──────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────

function initTheme() {
  // Detect Edge DevTools theme if possible, else default to dark
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// ──────────────────────────────────────────────
// View switching
// ──────────────────────────────────────────────

function showView(/** @type {'empty'|'loading'|'error'|'report'} */ view) {
  dom.emptyState.classList.toggle('hidden', view !== 'empty');
  dom.loading.classList.toggle('hidden', view !== 'loading');
  dom.errorState.classList.toggle('hidden', view !== 'error');
  dom.report.classList.toggle('hidden', view !== 'report');
}

// ──────────────────────────────────────────────
// Scanning
// ──────────────────────────────────────────────

async function runScan() {
  showView('loading');

  try {
    const tabId = chrome.devtools.inspectedWindow.tabId;

    /** @type {import('../src/types/types').AuditorMessage} */
    const response = await chrome.runtime.sendMessage({
      type: MSG.AUDIT_REQUEST,
      tabId,
    });

    if (response.type === MSG.AUDIT_ERROR) {
      throw new Error(response.error || 'Unknown error from background.');
    }

    if (response.type === MSG.AUDIT_RESULT && response.report) {
      currentReport = response.report;
      reportCache.push(response.report);
      renderReport(response.report);
      showView('report');
    } else {
      throw new Error('Unexpected response from background.');
    }
  } catch (err) {
    dom.errorMessage.textContent = err.message || String(err);
    showView('error');
  }
}

// ──────────────────────────────────────────────
// Render report
// ──────────────────────────────────────────────

/**
 * @param {import('../src/types/types').AuditReport} report
 */
function renderReport(report) {
  // ── Score gauge ──
  const circumference = 2 * Math.PI * 54; // r=54
  const offset = circumference * (1 - report.score / 100);
  const gradeColor = GRADE_COLORS[report.grade] || '#757575';

  dom.gaugeFill.style.strokeDashoffset = String(offset);
  dom.gaugeFill.style.stroke = gradeColor;
  dom.scoreValue.textContent = String(report.score);
  dom.scoreValue.style.color = gradeColor;

  dom.gradeBadge.textContent = report.grade;
  dom.gradeBadge.style.background = gradeColor;

  dom.scoreUrl.textContent = report.url;
  dom.scoreTime.textContent = new Date(report.timestamp).toLocaleString();

  // ── Header list ──
  dom.headerList.innerHTML = '';
  for (const hdr of report.headers) {
    dom.headerList.appendChild(createHeaderItem(hdr));
  }

  // ── Raw headers ──
  dom.rawHeadersPre.textContent = Object.entries(report.rawHeaders)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n') || '(no headers captured)';
}

/**
 * Build a single expandable header item element.
 * @param {import('../src/types/types').HeaderResult} hdr
 * @returns {HTMLElement}
 */
function createHeaderItem(hdr) {
  const item = document.createElement('div');
  item.className = 'header-item';

  const statusColor = STATUS_COLORS[hdr.status];
  const severityColor = SEVERITY_COLORS[hdr.severity];
  const severityLabel = SEVERITY_LABELS[hdr.severity];

  // Summary row
  const summary = document.createElement('div');
  summary.className = 'header-item-summary';
  summary.setAttribute('data-tooltip', hdr.description);
  summary.innerHTML = `
    <span class="header-status-icon" style="color:${statusColor}">${hdr.statusIcon}</span>
    <span class="header-name">${esc(hdr.name)}</span>
    <span class="severity-badge" style="background:${severityColor}">${severityLabel}</span>
    <span class="penalty-badge ${hdr.pointsDeducted === 0 ? 'none' : ''}">
      ${hdr.pointsDeducted === 0 ? '+0' : '−' + hdr.pointsDeducted}
    </span>
    <span class="expand-arrow">▶</span>
  `;

  summary.addEventListener('click', () => item.classList.toggle('open'));

  // Details
  const details = document.createElement('div');
  details.className = 'header-item-details';

  let detailsHtml = '';

  // Current value
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">Current Value</div>
      <div class="detail-value">${hdr.value !== null ? esc(hdr.value) : '<em>Not set</em>'}</div>
    </div>
  `;

  // Warnings
  if (hdr.warnings.length) {
    detailsHtml += `
      <div class="detail-section">
        <div class="detail-label">Warnings</div>
        <ul class="warnings-list">${hdr.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      </div>
    `;
  }

  // Errors
  if (hdr.errors.length) {
    detailsHtml += `
      <div class="detail-section">
        <div class="detail-label">Errors</div>
        <ul class="errors-list">${hdr.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>
    `;
  }

  // Recommendation
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">Recommendation</div>
      <div class="detail-recommendation">${esc(hdr.recommendation)}</div>
    </div>
  `;

  // Example
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">Example Configuration</div>
      <div class="detail-value">${esc(hdr.name)}: ${esc(hdr.example)}</div>
    </div>
  `;

  // Links
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">Documentation</div>
      <div class="detail-links">
        <a href="${esc(hdr.mdnUrl)}" target="_blank" rel="noopener">MDN Docs ↗</a>
        <a href="${esc(hdr.owaspUrl)}" target="_blank" rel="noopener">OWASP ↗</a>
      </div>
    </div>
  `;

  details.innerHTML = detailsHtml;

  item.appendChild(summary);
  item.appendChild(details);
  return item;
}

// ──────────────────────────────────────────────
// History
// ──────────────────────────────────────────────

async function openHistory() {
  dom.historyPanel.classList.remove('hidden');
  dom.comparePanel.classList.add('hidden');

  try {
    /** @type {import('../src/types/types').AuditorMessage} */
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_HISTORY });
    renderHistory(res.history || []);
  } catch {
    dom.historyList.innerHTML = '<p style="padding:12px;color:var(--text-muted)">Unable to load history.</p>';
  }
}

/**
 * @param {import('../src/types/types').HistoryEntry[]} entries
 */
function renderHistory(entries) {
  if (!entries.length) {
    dom.historyList.innerHTML = '<p style="padding:12px;color:var(--text-muted)">No scan history yet.</p>';
    return;
  }

  dom.historyList.innerHTML = entries
    .map(
      (e, i) => `
    <div class="history-entry" data-index="${i}">
      <input type="checkbox" class="history-check" data-index="${i}" />
      <span class="history-grade" style="color:${GRADE_COLORS[e.grade] || '#757575'}">${esc(e.grade)}</span>
      <div class="history-info">
        <div class="history-url" title="${esc(e.url)}">${esc(e.url)}</div>
        <div class="history-time">${new Date(e.timestamp).toLocaleString()}</div>
      </div>
      <span class="history-score">${e.score}</span>
    </div>
  `,
    )
    .join('');
}

async function clearHistory() {
  await chrome.runtime.sendMessage({ type: MSG.CLEAR_HISTORY });
  renderHistory([]);
}

// ──────────────────────────────────────────────
// Compare
// ──────────────────────────────────────────────

function openCompare() {
  const checked = /** @type {NodeListOf<HTMLInputElement>} */ (
    dom.historyList.querySelectorAll('.history-check:checked')
  );

  if (checked.length < 2) {
    alert('Select at least 2 history entries to compare.');
    return;
  }

  // We only have lightweight history entries stored, so build a comparison table from them
  dom.comparePanel.classList.remove('hidden');

  /** @type {import('../src/types/types').HistoryEntry[]} */
  const selected = [];
  checked.forEach((cb) => {
    const entry = dom.historyList.querySelectorAll('.history-entry')[Number(cb.dataset.index)];
    if (entry) {
      selected.push({
        url: entry.querySelector('.history-url')?.textContent ?? '',
        grade: entry.querySelector('.history-grade')?.textContent?.trim() ?? '',
        score: Number(entry.querySelector('.history-score')?.textContent ?? 0),
        timestamp: entry.querySelector('.history-time')?.textContent ?? '',
      });
    }
  });

  let html = `<table class="compare-table">
    <thead>
      <tr>
        <th>Property</th>
        ${selected.map((s) => `<th title="${esc(s.url)}">${esc(truncateUrl(s.url, 30))}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      <tr><td>Score</td>${selected.map((s) => `<td>${s.score}</td>`).join('')}</tr>
      <tr><td>Grade</td>${selected.map((s) => `<td style="color:${GRADE_COLORS[s.grade] || '#757575'};font-weight:700">${esc(String(s.grade))}</td>`).join('')}</tr>
      <tr><td>Scanned</td>${selected.map((s) => `<td>${esc(String(s.timestamp))}</td>`).join('')}</tr>
    </tbody>
  </table>`;

  dom.compareContent.innerHTML = html;
}

// ──────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────

function exportJson() {
  if (!currentReport) return;
  const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `security-headers-${hostname(currentReport.url)}-${dateSlug()}.json`);
}

function exportPdf() {
  if (!currentReport) return;

  // Build a printable HTML document and use the browser print dialog
  const r = currentReport;
  const headerRows = r.headers
    .map(
      (h) => `
    <tr>
      <td>${h.statusIcon}</td>
      <td><strong>${esc(h.name)}</strong></td>
      <td>${esc(h.value ?? '(missing)')}</td>
      <td>${esc(h.severity)}</td>
      <td>${h.pointsDeducted === 0 ? '0' : '−' + h.pointsDeducted}</td>
    </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Security Headers Report</title>
<style>
  body{font-family:sans-serif;padding:24px;color:#222}
  h1{font-size:20px}h2{font-size:16px;margin-top:20px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:13px}
  th{background:#f0f0f0}
  .grade{font-size:36px;font-weight:800}
</style></head><body>
  <h1>🛡️ Security Headers Audit Report</h1>
  <p><strong>URL:</strong> ${esc(r.url)}</p>
  <p><strong>Date:</strong> ${new Date(r.timestamp).toLocaleString()}</p>
  <p><strong>Score:</strong> ${r.score} / 100 &nbsp; <span class="grade">${esc(r.grade)}</span></p>
  <h2>Header Breakdown</h2>
  <table>
    <thead><tr><th></th><th>Header</th><th>Value</th><th>Severity</th><th>Penalty</th></tr></thead>
    <tbody>${headerRows}</tbody>
  </table>
  <h2>Recommendations</h2>
  <ul>${r.headers.filter((h) => h.status !== 'present').map((h) => `<li><strong>${esc(h.name)}:</strong> ${esc(h.recommendation)}</li>`).join('')}</ul>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Escape HTML */
function esc(/** @type {string} */ str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

/** Download a Blob as a file */
function downloadBlob(/** @type {Blob} */ blob, /** @type {string} */ filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Extract hostname from URL */
function hostname(/** @type {string} */ url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/** YYYY-MM-DD slug */
function dateSlug() {
  return new Date().toISOString().slice(0, 10);
}

/** Truncate a URL for display */
function truncateUrl(/** @type {string} */ url, /** @type {number} */ max = 40) {
  return url.length > max ? url.slice(0, max - 1) + '…' : url;
}

// ──────────────────────────────────────────────
// Event wiring
// ──────────────────────────────────────────────

function init() {
  initTheme();

  dom.btnScan.addEventListener('click', runScan);
  dom.btnRetry.addEventListener('click', runScan);
  dom.btnTheme.addEventListener('click', toggleTheme);

  // History
  dom.btnHistory.addEventListener('click', openHistory);
  dom.btnCloseHistory.addEventListener('click', () => dom.historyPanel.classList.add('hidden'));
  dom.btnClearHistory.addEventListener('click', clearHistory);

  // Compare
  dom.btnCompare.addEventListener('click', openCompare);
  dom.btnCloseCompare.addEventListener('click', () => dom.comparePanel.classList.add('hidden'));

  // Export dropdown toggle
  dom.exportDropdown.querySelector('.btn').addEventListener('click', (e) => {
    e.stopPropagation();
    dom.exportDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dom.exportDropdown.classList.remove('open'));
  dom.btnExportJson.addEventListener('click', exportJson);
  dom.btnExportPdf.addEventListener('click', exportPdf);

  showView('empty');
}

init();
