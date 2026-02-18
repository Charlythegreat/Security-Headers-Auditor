/**
 * Security Headers Auditor — Type Definitions
 */

/** Severity levels for security headers */
type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Evaluation status for a single header */
type HeaderStatus = 'present' | 'missing' | 'misconfigured';

/** Letter grades */
type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';

/** Display status icons */
type StatusIcon = '✓' | '✗' | '⚠';

/** Supported locale codes */
type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'pt' | 'ko';

/** Definition of a security header to check */
interface SecurityHeaderDef {
  /** Canonical header name */
  name: string;
  /** Lower-cased key used for lookup */
  key: string;
  /** Severity / weight category */
  severity: Severity;
  /** Maximum points this header is worth when fully configured */
  maxPoints: number;
  /** Points deducted when header is missing (equals maxPoints) */
  missingPenalty: number;
  /** Points deducted when header is present but misconfigured */
  misconfiguredPenalty: number;
  /** Short human-readable description */
  description: string;
  /** Link to MDN documentation */
  mdnUrl: string;
  /** Link to OWASP documentation */
  owaspUrl: string;
  /** Example of a good header value */
  example: string;
  /** Function to validate the header value; returns warnings/errors */
  validate: (value: string) => HeaderValidationResult;
}

/** Result of validating a single header value */
interface HeaderValidationResult {
  /** Whether the value is acceptable */
  valid: boolean;
  /** Warnings (non-blocking issues) */
  warnings: string[];
  /** Errors (blocking / misconfigured) */
  errors: string[];
  /** Partial score earned (0.0 – 1.0, where 1.0 = fully valid). Optional — defaults to 1.0 if valid, 0.0 if not */
  partialScore?: number;
}

/** Evaluated result for a single header */
interface HeaderResult {
  name: string;
  key: string;
  severity: Severity;
  status: HeaderStatus;
  statusIcon: StatusIcon;
  value: string | null;
  /** Maximum points available for this header */
  maxPoints: number;
  /** Points actually earned (0 to maxPoints) */
  pointsEarned: number;
  /** Points deducted (maxPoints - pointsEarned) */
  pointsDeducted: number;
  warnings: string[];
  errors: string[];
  recommendation: string;
  example: string;
  mdnUrl: string;
  owaspUrl: string;
  description: string;
}

/** Individual sub-resource scan result */
interface SubResourceResult {
  /** Full URL of the sub-resource */
  url: string;
  /** Resource type (script, stylesheet, image, xhr, fetch, etc.) */
  resourceType: string;
  /** HTTP status code */
  statusCode: number;
  /** Response headers (lower-cased keys) */
  headers: Record<string, string>;
  /** Which security headers are present */
  securityHeaders: { key: string; value: string | null; present: boolean }[];
}

/** Overall audit report */
interface AuditReport {
  /** URL that was audited */
  url: string;
  /** Timestamp of the audit (ISO string) */
  timestamp: string;
  /** Numeric score 0–100 */
  score: number;
  /** Letter grade */
  grade: LetterGrade;
  /** Per-category score breakdown */
  categoryScores: CategoryScore[];
  /** Individual header results */
  headers: HeaderResult[];
  /** Raw response headers as received */
  rawHeaders: Record<string, string>;
  /** Sub-resource scan results (if network scan was enabled) */
  subResources?: SubResourceResult[];
}

/** Category score breakdown for display */
interface CategoryScore {
  category: Severity;
  label: string;
  earned: number;
  max: number;
  percentage: number;
}

/** Stored history entry — richer than before for comparison */
interface HistoryEntry {
  url: string;
  timestamp: string;
  score: number;
  grade: LetterGrade;
  /** Per-header status snapshot for comparison */
  headerStatuses?: { key: string; name: string; status: HeaderStatus; pointsEarned: number; maxPoints: number }[];
}

/** Message sent between service-worker and devtools panel */
interface AuditorMessage {
  type: 'AUDIT_REQUEST' | 'AUDIT_RESULT' | 'AUDIT_ERROR' | 'CLEAR_HISTORY' | 'GET_HISTORY' | 'HISTORY_RESULT' | 'NETWORK_SCAN_REQUEST' | 'NETWORK_SCAN_RESULT';
  tabId?: number;
  report?: AuditReport;
  error?: string;
  history?: HistoryEntry[];
  subResources?: SubResourceResult[];
  scanNetwork?: boolean;
}

/** Raw header map returned by chrome.debugger */
interface RawHeaderEntry {
  name: string;
  value: string;
}

export {
  Severity,
  HeaderStatus,
  LetterGrade,
  StatusIcon,
  LocaleCode,
  SecurityHeaderDef,
  HeaderValidationResult,
  HeaderResult,
  SubResourceResult,
  AuditReport,
  CategoryScore,
  HistoryEntry,
  AuditorMessage,
  RawHeaderEntry,
};
