/**
 * Constants used throughout the Security Headers Auditor extension.
 * @module constants
 */

/** Maximum score a page can receive */
export const MAX_SCORE = 100;

/** Grade thresholds — score >= threshold yields the grade */
export const GRADE_THRESHOLDS = [
  { min: 97, grade: 'A+' },
  { min: 93, grade: 'A' },
  { min: 90, grade: 'A-' },
  { min: 87, grade: 'B+' },
  { min: 83, grade: 'B' },
  { min: 80, grade: 'B-' },
  { min: 77, grade: 'C+' },
  { min: 73, grade: 'C' },
  { min: 70, grade: 'C-' },
  { min: 67, grade: 'D+' },
  { min: 63, grade: 'D' },
  { min: 60, grade: 'D-' },
  { min: 0, grade: 'F' },
];

/** Color associated with each grade band */
export const GRADE_COLORS = {
  'A+': '#00c853',
  A: '#00c853',
  'A-': '#69f0ae',
  'B+': '#b2ff59',
  B: '#c6ff00',
  'B-': '#eeff41',
  'C+': '#ffff00',
  C: '#ffd740',
  'C-': '#ffab40',
  'D+': '#ff6e40',
  D: '#ff3d00',
  'D-': '#dd2c00',
  F: '#b71c1c',
};

/** Status icon for each header evaluation state */
export const STATUS_ICONS = {
  present: '✓',
  missing: '✗',
  misconfigured: '⚠',
};

/** Color for each status */
export const STATUS_COLORS = {
  present: '#4caf50',
  missing: '#f44336',
  misconfigured: '#ff9800',
};

/** Severity labels for display */
export const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Severity badge colors */
export const SEVERITY_COLORS = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c',
};

/** Storage keys */
export const STORAGE_KEYS = {
  HISTORY: 'sha_history',
  SETTINGS: 'sha_settings',
};

/** Maximum number of history entries to keep */
export const MAX_HISTORY_ENTRIES = 100;

/** Message types exchanged between background and panel */
export const MSG = {
  AUDIT_REQUEST: 'AUDIT_REQUEST',
  AUDIT_RESULT: 'AUDIT_RESULT',
  AUDIT_ERROR: 'AUDIT_ERROR',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  GET_HISTORY: 'GET_HISTORY',
  HISTORY_RESULT: 'HISTORY_RESULT',
};
