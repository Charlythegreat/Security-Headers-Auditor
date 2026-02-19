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
// Localisation
// ──────────────────────────────────────────────

/** @type {Record<string, Record<string, string>>} */
const LOCALES = {
  en: {
    appTitle: 'Security Headers Auditor',
    scanPage: 'Scan Page',
    history: 'History',
    export: 'Export',
    exportJson: 'Export as JSON',
    exportPdf: 'Export as PDF',
    networkScan: 'Network Scan',
    noResults: 'No Scan Results Yet',
    noResultsHint: 'Click',
    noResultsHint2: 'to audit the security headers of the current page.',
    analyzing: 'Analysing headers…',
    scanFailed: 'Scan Failed',
    retry: 'Retry',
    categoryBreakdown: 'Category Breakdown',
    headerBreakdown: 'Header Breakdown',
    networkResults: 'Network Sub-Resource Headers',
    rawHeaders: 'Raw Response Headers',
    scanHistory: 'Scan History',
    compare: 'Compare',
    clear: 'Clear',
    compareScans: 'Compare Scans',
    currentValue: 'Current Value',
    notSet: 'Not set',
    warnings: 'Warnings',
    errors: 'Errors',
    recommendation: 'Recommendation',
    exampleConfig: 'Example Configuration',
    documentation: 'Documentation',
    overviewTitle: 'Score Overview',
    headerDiff: 'Header-by-Header Comparison',
    selectTwo: 'Select at least 2 history entries to compare.',
    noHistory: 'No scan history yet.',
    historyLoadError: 'Unable to load history.',
    subResCount: 'sub-resources scanned',
  },
  es: {
    appTitle: 'Auditor de Cabeceras de Seguridad',
    scanPage: 'Escanear',
    history: 'Historial',
    export: 'Exportar',
    exportJson: 'Exportar como JSON',
    exportPdf: 'Exportar como PDF',
    networkScan: 'Escaneo de red',
    noResults: 'Sin resultados',
    noResultsHint: 'Haga clic en',
    noResultsHint2: 'para auditar las cabeceras de seguridad.',
    analyzing: 'Analizando cabeceras…',
    scanFailed: 'Escaneo fallido',
    retry: 'Reintentar',
    categoryBreakdown: 'Desglose por categoría',
    headerBreakdown: 'Desglose de cabeceras',
    networkResults: 'Cabeceras de sub-recursos',
    rawHeaders: 'Cabeceras sin procesar',
    scanHistory: 'Historial de escaneo',
    compare: 'Comparar',
    clear: 'Borrar',
    compareScans: 'Comparar escaneos',
    currentValue: 'Valor actual',
    notSet: 'No configurado',
    warnings: 'Advertencias',
    errors: 'Errores',
    recommendation: 'Recomendación',
    exampleConfig: 'Configuración de ejemplo',
    documentation: 'Documentación',
    overviewTitle: 'Resumen de puntuación',
    headerDiff: 'Comparación cabecera por cabecera',
    selectTwo: 'Seleccione al menos 2 entradas del historial.',
    noHistory: 'Aún no hay historial.',
    historyLoadError: 'No se pudo cargar el historial.',
    subResCount: 'sub-recursos escaneados',
  },
  fr: {
    appTitle: 'Auditeur d\'en-têtes de sécurité',
    scanPage: 'Scanner',
    history: 'Historique',
    export: 'Exporter',
    exportJson: 'Exporter en JSON',
    exportPdf: 'Exporter en PDF',
    networkScan: 'Scan réseau',
    noResults: 'Aucun résultat',
    noResultsHint: 'Cliquez sur',
    noResultsHint2: 'pour auditer les en-têtes de sécurité.',
    analyzing: 'Analyse en cours…',
    scanFailed: 'Échec du scan',
    retry: 'Réessayer',
    categoryBreakdown: 'Répartition par catégorie',
    headerBreakdown: 'Détail des en-têtes',
    networkResults: 'En-têtes des sous-ressources',
    rawHeaders: 'En-têtes bruts',
    scanHistory: 'Historique des scans',
    compare: 'Comparer',
    clear: 'Effacer',
    compareScans: 'Comparer les scans',
    currentValue: 'Valeur actuelle',
    notSet: 'Non défini',
    warnings: 'Avertissements',
    errors: 'Erreurs',
    recommendation: 'Recommandation',
    exampleConfig: 'Exemple de configuration',
    documentation: 'Documentation',
    overviewTitle: 'Aperçu du score',
    headerDiff: 'Comparaison en-tête par en-tête',
    selectTwo: 'Sélectionnez au moins 2 entrées.',
    noHistory: 'Aucun historique.',
    historyLoadError: 'Impossible de charger l\'historique.',
    subResCount: 'sous-ressources analysées',
  },
  de: {
    appTitle: 'Sicherheits-Header-Auditor',
    scanPage: 'Scannen',
    history: 'Verlauf',
    export: 'Exportieren',
    exportJson: 'Als JSON exportieren',
    exportPdf: 'Als PDF exportieren',
    networkScan: 'Netzwerk-Scan',
    noResults: 'Keine Ergebnisse',
    noResultsHint: 'Klicken Sie auf',
    noResultsHint2: 'um die Sicherheits-Header zu prüfen.',
    analyzing: 'Header werden analysiert…',
    scanFailed: 'Scan fehlgeschlagen',
    retry: 'Wiederholen',
    categoryBreakdown: 'Kategorieübersicht',
    headerBreakdown: 'Header-Aufschlüsselung',
    networkResults: 'Sub-Ressourcen-Header',
    rawHeaders: 'Rohe Antwort-Header',
    scanHistory: 'Scan-Verlauf',
    compare: 'Vergleichen',
    clear: 'Löschen',
    compareScans: 'Scans vergleichen',
    currentValue: 'Aktueller Wert',
    notSet: 'Nicht gesetzt',
    warnings: 'Warnungen',
    errors: 'Fehler',
    recommendation: 'Empfehlung',
    exampleConfig: 'Beispielkonfiguration',
    documentation: 'Dokumentation',
    overviewTitle: 'Punkteübersicht',
    headerDiff: 'Header-Vergleich',
    selectTwo: 'Wählen Sie mindestens 2 Einträge.',
    noHistory: 'Kein Verlauf vorhanden.',
    historyLoadError: 'Verlauf konnte nicht geladen werden.',
    subResCount: 'Sub-Ressourcen gescannt',
  },
  ja: {
    appTitle: 'セキュリティヘッダー監査',
    scanPage: 'スキャン',
    history: '履歴',
    export: 'エクスポート',
    exportJson: 'JSONでエクスポート',
    exportPdf: 'PDFでエクスポート',
    networkScan: 'ネットワークスキャン',
    noResults: 'スキャン結果なし',
    noResultsHint: 'クリック',
    noResultsHint2: 'してセキュリティヘッダーを監査します。',
    analyzing: 'ヘッダーを分析中…',
    scanFailed: 'スキャン失敗',
    retry: '再試行',
    categoryBreakdown: 'カテゴリ別内訳',
    headerBreakdown: 'ヘッダー内訳',
    networkResults: 'サブリソースヘッダー',
    rawHeaders: '生のレスポンスヘッダー',
    scanHistory: 'スキャン履歴',
    compare: '比較',
    clear: 'クリア',
    compareScans: 'スキャンを比較',
    currentValue: '現在の値',
    notSet: '未設定',
    warnings: '警告',
    errors: 'エラー',
    recommendation: '推奨事項',
    exampleConfig: '設定例',
    documentation: 'ドキュメント',
    overviewTitle: 'スコア概要',
    headerDiff: 'ヘッダー別比較',
    selectTwo: '2つ以上の履歴を選択してください。',
    noHistory: '履歴がありません。',
    historyLoadError: '履歴を読み込めません。',
    subResCount: 'サブリソーススキャン済み',
  },
  zh: {
    appTitle: '安全标头审计器',
    scanPage: '扫描',
    history: '历史',
    export: '导出',
    exportJson: '导出为JSON',
    exportPdf: '导出为PDF',
    networkScan: '网络扫描',
    noResults: '暂无扫描结果',
    noResultsHint: '点击',
    noResultsHint2: '以审计安全标头。',
    analyzing: '正在分析标头…',
    scanFailed: '扫描失败',
    retry: '重试',
    categoryBreakdown: '分类概览',
    headerBreakdown: '标头明细',
    networkResults: '子资源标头',
    rawHeaders: '原始响应标头',
    scanHistory: '扫描历史',
    compare: '比较',
    clear: '清除',
    compareScans: '比较扫描',
    currentValue: '当前值',
    notSet: '未设置',
    warnings: '警告',
    errors: '错误',
    recommendation: '建议',
    exampleConfig: '配置示例',
    documentation: '文档',
    overviewTitle: '评分概览',
    headerDiff: '逐标头比较',
    selectTwo: '请选择至少2条历史记录。',
    noHistory: '暂无历史记录。',
    historyLoadError: '无法加载历史记录。',
    subResCount: '子资源已扫描',
  },
  pt: {
    appTitle: 'Auditor de Cabeçalhos de Segurança',
    scanPage: 'Escanear',
    history: 'Histórico',
    export: 'Exportar',
    exportJson: 'Exportar como JSON',
    exportPdf: 'Exportar como PDF',
    networkScan: 'Varredura de rede',
    noResults: 'Sem resultados',
    noResultsHint: 'Clique em',
    noResultsHint2: 'para auditar os cabeçalhos de segurança.',
    analyzing: 'Analisando cabeçalhos…',
    scanFailed: 'Falha na varredura',
    retry: 'Tentar novamente',
    categoryBreakdown: 'Detalhamento por categoria',
    headerBreakdown: 'Detalhamento de cabeçalhos',
    networkResults: 'Cabeçalhos de sub-recursos',
    rawHeaders: 'Cabeçalhos brutos',
    scanHistory: 'Histórico de varreduras',
    compare: 'Comparar',
    clear: 'Limpar',
    compareScans: 'Comparar varreduras',
    currentValue: 'Valor atual',
    notSet: 'Não definido',
    warnings: 'Avisos',
    errors: 'Erros',
    recommendation: 'Recomendação',
    exampleConfig: 'Exemplo de configuração',
    documentation: 'Documentação',
    overviewTitle: 'Visão geral da pontuação',
    headerDiff: 'Comparação cabeçalho por cabeçalho',
    selectTwo: 'Selecione pelo menos 2 entradas.',
    noHistory: 'Nenhum histórico ainda.',
    historyLoadError: 'Não foi possível carregar o histórico.',
    subResCount: 'sub-recursos verificados',
  },
  ko: {
    appTitle: '보안 헤더 감사기',
    scanPage: '스캔',
    history: '기록',
    export: '내보내기',
    exportJson: 'JSON으로 내보내기',
    exportPdf: 'PDF로 내보내기',
    networkScan: '네트워크 스캔',
    noResults: '스캔 결과 없음',
    noResultsHint: '클릭',
    noResultsHint2: '하여 보안 헤더를 감사합니다.',
    analyzing: '헤더 분석 중…',
    scanFailed: '스캔 실패',
    retry: '재시도',
    categoryBreakdown: '카테고리 분석',
    headerBreakdown: '헤더 분석',
    networkResults: '하위 리소스 헤더',
    rawHeaders: '원시 응답 헤더',
    scanHistory: '스캔 기록',
    compare: '비교',
    clear: '삭제',
    compareScans: '스캔 비교',
    currentValue: '현재 값',
    notSet: '미설정',
    warnings: '경고',
    errors: '오류',
    recommendation: '권장사항',
    exampleConfig: '설정 예시',
    documentation: '문서',
    overviewTitle: '점수 개요',
    headerDiff: '헤더별 비교',
    selectTwo: '2개 이상의 기록을 선택하세요.',
    noHistory: '기록이 없습니다.',
    historyLoadError: '기록을 불러올 수 없습니다.',
    subResCount: '하위 리소스 스캔됨',
  },
};

/** @type {string} */
let currentLocale = 'en';

/**
 * Get a localized string by key.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  return LOCALES[currentLocale]?.[key] || LOCALES.en[key] || key;
}

/**
 * Update all [data-i18n] elements in the DOM.
 */
function applyLocale() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

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
  chkNetworkScan: /** @type {HTMLInputElement} */ ($('#chk-network-scan')),
  langSelect: /** @type {HTMLSelectElement} */ ($('#lang-select')),

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

  categoryScores: /** @type {HTMLElement} */ ($('#category-scores')),
  headerList: /** @type {HTMLElement} */ ($('#header-list')),
  networkResultsSection: /** @type {HTMLElement} */ ($('#network-results-section')),
  networkResults: /** @type {HTMLElement} */ ($('#network-results')),
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

/** @type {import('../src/types/types').HistoryEntry[]} */
let historyCache = [];

// ──────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────

function initTheme() {
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
    const scanNetwork = dom.chkNetworkScan.checked;

    /** @type {import('../src/types/types').AuditorMessage} */
    const response = await chrome.runtime.sendMessage({
      type: MSG.AUDIT_REQUEST,
      tabId,
      scanNetwork,
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
    dom.errorMessage.textContent = /** @type {Error} */ (err).message || String(err);
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

  // ── Category score bars ──
  renderCategoryScores(report.categoryScores || []);

  // ── Header list ──
  dom.headerList.innerHTML = '';
  for (const hdr of report.headers) {
    dom.headerList.appendChild(createHeaderItem(hdr));
  }

  // ── Network sub-resource results ──
  if (report.subResources && report.subResources.length > 0) {
    renderNetworkResults(report.subResources);
    dom.networkResultsSection.classList.remove('hidden');
  } else {
    dom.networkResultsSection.classList.add('hidden');
  }

  // ── Raw headers ──
  dom.rawHeadersPre.textContent = Object.entries(report.rawHeaders)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n') || '(no headers captured)';
}

/**
 * Render category score progress bars.
 * @param {import('../src/types/types').CategoryScore[]} categories
 */
function renderCategoryScores(categories) {
  if (!categories.length) {
    dom.categoryScores.innerHTML = '';
    return;
  }

  dom.categoryScores.innerHTML = categories
    .map((cat) => `
      <div class="category-row">
        <div class="category-label-row">
          <span class="category-label">${esc(cat.label)}</span>
          <span class="category-points">${cat.earned} / ${cat.max} pts</span>
        </div>
        <div class="category-bar-bg">
          <div class="category-bar-fill cat-${cat.category}" 
               style="width:${cat.percentage}%" 
               data-pct="${cat.percentage}"></div>
        </div>
      </div>
    `)
    .join('');
}

/**
 * Render network sub-resource scan results table.
 * @param {import('../src/types/types').SubResourceResult[]} subResources
 */
function renderNetworkResults(subResources) {
  const secHeaders = [
    'content-security-policy', 'strict-transport-security', 'x-frame-options',
    'x-content-type-options', 'referrer-policy', 'permissions-policy',
    'cross-origin-embedder-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy',
  ];
  const shortNames = ['CSP', 'HSTS', 'XFO', 'XCTO', 'RP', 'PP', 'COEP', 'COOP', 'CORP'];

  let html = `<div class="network-summary">${subResources.length} ${t('subResCount')}</div>`;
  html += `<table class="network-results-table">
    <thead><tr>
      <th>URL</th><th>Type</th>
      ${shortNames.map((n) => `<th title="${secHeaders[shortNames.indexOf(n)]}">${n}</th>`).join('')}
    </tr></thead><tbody>`;

  for (const res of subResources.slice(0, 200)) {
    html += `<tr>
      <td class="url-cell" title="${esc(res.url)}">${esc(truncateUrl(res.url, 40))}</td>
      <td>${esc(res.resourceType)}</td>`;
    for (const key of secHeaders) {
      const sh = res.securityHeaders.find((h) => h.key === key);
      const present = sh?.present ?? false;
      html += `<td class="${present ? 'hdr-present' : 'hdr-missing'}">${present ? '✓' : '✗'}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  dom.networkResults.innerHTML = html;
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

  // Points badge class
  let pointsClass = 'partial';
  if (hdr.pointsEarned === hdr.maxPoints) pointsClass = 'full';
  else if (hdr.pointsEarned === 0) pointsClass = 'zero';

  // Summary row
  const summary = document.createElement('div');
  summary.className = 'header-item-summary';
  summary.setAttribute('data-tooltip', hdr.description);
  summary.innerHTML = `
    <span class="header-status-icon" style="color:${statusColor}">${hdr.statusIcon}</span>
    <span class="header-name">${esc(hdr.name)}</span>
    <span class="severity-badge" style="background:${severityColor}">${severityLabel}</span>
    <span class="points-badge ${pointsClass}">
      ${hdr.pointsEarned} / ${hdr.maxPoints}
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
      <div class="detail-label">${t('currentValue')}</div>
      <div class="detail-value">${hdr.value !== null ? esc(hdr.value) : '<em>' + t('notSet') + '</em>'}</div>
    </div>
  `;

  // Warnings
  if (hdr.warnings.length) {
    detailsHtml += `
      <div class="detail-section">
        <div class="detail-label">${t('warnings')}</div>
        <ul class="warnings-list">${hdr.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      </div>
    `;
  }

  // Errors
  if (hdr.errors.length) {
    detailsHtml += `
      <div class="detail-section">
        <div class="detail-label">${t('errors')}</div>
        <ul class="errors-list">${hdr.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>
    `;
  }

  // Recommendation
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">${t('recommendation')}</div>
      <div class="detail-recommendation">${esc(hdr.recommendation)}</div>
    </div>
  `;

  // Example
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">${t('exampleConfig')}</div>
      <div class="detail-value">${esc(hdr.name)}: ${esc(hdr.example)}</div>
    </div>
  `;

  // Links
  detailsHtml += `
    <div class="detail-section">
      <div class="detail-label">${t('documentation')}</div>
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
    historyCache = res.history || [];
    renderHistory(historyCache);
  } catch {
    dom.historyList.innerHTML = `<p style="padding:12px;color:var(--text-muted)">${t('historyLoadError')}</p>`;
  }
}

/**
 * @param {import('../src/types/types').HistoryEntry[]} entries
 */
function renderHistory(entries) {
  if (!entries.length) {
    dom.historyList.innerHTML = `<p style="padding:12px;color:var(--text-muted)">${t('noHistory')}</p>`;
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
  historyCache = [];
  renderHistory([]);
}

// ──────────────────────────────────────────────
// Compare — Enhanced with per-header diff
// ──────────────────────────────────────────────

function openCompare() {
  const checked = /** @type {NodeListOf<HTMLInputElement>} */ (
    dom.historyList.querySelectorAll('.history-check:checked')
  );

  if (checked.length < 2) {
    alert(t('selectTwo'));
    return;
  }

  dom.comparePanel.classList.remove('hidden');

  /** @type {import('../src/types/types').HistoryEntry[]} */
  const selected = [];
  checked.forEach((cb) => {
    const idx = Number(cb.dataset.index);
    if (historyCache[idx]) {
      selected.push(historyCache[idx]);
    }
  });

  let html = '';

  // ── Score overview table ──
  html += `<div class="compare-section-title">${t('overviewTitle')}</div>`;
  html += `<table class="compare-table">
    <thead>
      <tr>
        <th>Property</th>
        ${selected.map((s) => `<th title="${esc(s.url)}">${esc(truncateUrl(s.url, 25))}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      <tr><td>Score</td>${selected.map((s, i) => {
        let cls = '';
        if (i > 0) {
          cls = s.score > selected[i - 1].score ? 'improved' : s.score < selected[i - 1].score ? 'regressed' : 'unchanged';
        }
        const diff = i > 0 ? s.score - selected[i - 1].score : 0;
        const diffStr = i > 0 ? (diff > 0 ? `<span class="compare-diff-icon">▲${diff}</span>` : diff < 0 ? `<span class="compare-diff-icon">▼${Math.abs(diff)}</span>` : '') : '';
        return `<td class="${cls}">${s.score} ${diffStr}</td>`;
      }).join('')}</tr>
      <tr><td>Grade</td>${selected.map((s) => `<td style="color:${GRADE_COLORS[s.grade] || '#757575'};font-weight:700">${esc(String(s.grade))}</td>`).join('')}</tr>
      <tr><td>Scanned</td>${selected.map((s) => `<td>${new Date(s.timestamp).toLocaleString()}</td>`).join('')}</tr>
    </tbody>
  </table>`;

  // ── Per-header comparison table ──
  const allHaveStatuses = selected.every((s) => s.headerStatuses && s.headerStatuses.length > 0);
  if (allHaveStatuses) {
    html += `<div class="compare-section-title">${t('headerDiff')}</div>`;
    html += `<table class="compare-table">
      <thead>
        <tr>
          <th>Header</th>
          ${selected.map((s) => `<th title="${esc(s.url)}">${esc(truncateUrl(s.url, 25))}</th>`).join('')}
        </tr>
      </thead>
      <tbody>`;

    // Collect all header keys across all entries
    const allKeys = [...new Set(selected.flatMap((s) => (s.headerStatuses || []).map((h) => h.key)))];
    for (const key of allKeys) {
      const headerName = (selected[0].headerStatuses || []).find((h) => h.key === key)?.name || key;
      html += `<tr><td>${esc(headerName)}</td>`;
      for (let i = 0; i < selected.length; i++) {
        const entry = (selected[i].headerStatuses || []).find((h) => h.key === key);
        const prev = i > 0 ? (selected[i - 1].headerStatuses || []).find((h) => h.key === key) : null;

        if (!entry) {
          html += '<td class="unchanged">—</td>';
          continue;
        }

        let cls = '';
        if (prev) {
          if (entry.pointsEarned > prev.pointsEarned) cls = 'improved';
          else if (entry.pointsEarned < prev.pointsEarned) cls = 'regressed';
          else cls = 'unchanged';
        }

        const statusSymbol = entry.status === 'present' ? '✓' : entry.status === 'missing' ? '✗' : '⚠';
        html += `<td class="${cls}">${statusSymbol} ${entry.pointsEarned}/${entry.maxPoints}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
  }

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

  const r = currentReport;
  const headerRows = r.headers
    .map(
      (h) => `
    <tr>
      <td>${h.statusIcon}</td>
      <td><strong>${esc(h.name)}</strong></td>
      <td>${esc(h.value ?? '(missing)')}</td>
      <td>${esc(h.severity)}</td>
      <td>${h.pointsEarned} / ${h.maxPoints}</td>
    </tr>`,
    )
    .join('');

  const categoryRows = (r.categoryScores || [])
    .map(
      (c) => `<tr><td>${esc(c.label)}</td><td>${c.earned} / ${c.max}</td><td>${c.percentage}%</td></tr>`,
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
  <h2>Category Breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th>Points</th><th>Percentage</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>
  <h2>Header Breakdown</h2>
  <table>
    <thead><tr><th></th><th>Header</th><th>Value</th><th>Severity</th><th>Points</th></tr></thead>
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
  dom.exportDropdown.querySelector('.btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.exportDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dom.exportDropdown.classList.remove('open'));
  dom.btnExportJson.addEventListener('click', exportJson);
  dom.btnExportPdf.addEventListener('click', exportPdf);

  // Language selector
  dom.langSelect.addEventListener('change', () => {
    currentLocale = dom.langSelect.value;
    applyLocale();
  });

  showView('empty');
}

init();
