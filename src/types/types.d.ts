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

/** Definition of a security header to check */
interface SecurityHeaderDef {
  /** Canonical header name */
  name: string;
  /** Lower-cased key used for lookup */
  key: string;
  /** Severity / weight category */
  severity: Severity;
  /** Points deducted when header is missing */
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
}

/** Evaluated result for a single header */
interface HeaderResult {
  name: string;
  key: string;
  severity: Severity;
  status: HeaderStatus;
  statusIcon: StatusIcon;
  value: string | null;
  pointsDeducted: number;
  warnings: string[];
  errors: string[];
  recommendation: string;
  example: string;
  mdnUrl: string;
  owaspUrl: string;
  description: string;
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
  /** Individual header results */
  headers: HeaderResult[];
  /** Raw response headers as received */
  rawHeaders: Record<string, string>;
}

/** Stored history entry (lightweight) */
interface HistoryEntry {
  url: string;
  timestamp: string;
  score: number;
  grade: LetterGrade;
}

/** Message sent between service-worker and devtools panel */
interface AuditorMessage {
  type: 'AUDIT_REQUEST' | 'AUDIT_RESULT' | 'AUDIT_ERROR' | 'CLEAR_HISTORY' | 'GET_HISTORY' | 'HISTORY_RESULT';
  tabId?: number;
  report?: AuditReport;
  error?: string;
  history?: HistoryEntry[];
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
  SecurityHeaderDef,
  HeaderValidationResult,
  HeaderResult,
  AuditReport,
  HistoryEntry,
  AuditorMessage,
  RawHeaderEntry,
};
