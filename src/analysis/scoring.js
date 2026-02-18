/**
 * Scoring engine — evaluates normalised headers against security header
 * definitions and produces a full AuditReport.
 *
 * @module scoring
 */

import { SECURITY_HEADERS } from './header-analyzer.js';
import { getRecommendation } from './recommendations.js';
import { normalizeHeaders, clampScore, timestamp } from '../utils/helpers.js';
import {
  MAX_SCORE,
  GRADE_THRESHOLDS,
  STATUS_ICONS,
} from '../utils/constants.js';

/**
 * Compute the letter grade for a numeric score.
 * @param {number} score  0–100
 * @returns {import('../types/types').LetterGrade}
 */
export function computeGrade(score) {
  const clamped = clampScore(score);
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (clamped >= min) return /** @type {import('../types/types').LetterGrade} */ (grade);
  }
  return 'F';
}

/**
 * Run a full audit on the provided raw headers for a given URL.
 *
 * @param {string} url  The page URL
 * @param {Record<string,string> | Array<{name:string,value:string}>} rawHeaders
 * @returns {import('../types/types').AuditReport}
 */
export function audit(url, rawHeaders) {
  const headers = normalizeHeaders(rawHeaders);
  let score = MAX_SCORE;

  /** @type {import('../types/types').HeaderResult[]} */
  const results = [];

  for (const def of SECURITY_HEADERS) {
    const value = headers[def.key] ?? null;

    /** @type {import('../types/types').HeaderStatus} */
    let status;
    let pointsDeducted = 0;
    /** @type {string[]} */
    let warnings = [];
    /** @type {string[]} */
    let errors = [];

    if (value === null) {
      // Header missing
      status = 'missing';
      pointsDeducted = def.missingPenalty;
    } else {
      // Header present — run validation
      const validation = def.validate(value);
      warnings = validation.warnings;
      errors = validation.errors;

      if (!validation.valid) {
        status = 'misconfigured';
        pointsDeducted = def.misconfiguredPenalty;
      } else if (validation.warnings.length > 0) {
        status = 'misconfigured';
        pointsDeducted = Math.round(def.misconfiguredPenalty * 0.5);
      } else {
        status = 'present';
        pointsDeducted = 0;
      }
    }

    score -= pointsDeducted;

    results.push({
      name: def.name,
      key: def.key,
      severity: def.severity,
      status,
      statusIcon: STATUS_ICONS[status],
      value,
      pointsDeducted,
      warnings,
      errors,
      recommendation: getRecommendation(def.key, status, value),
      example: def.example,
      mdnUrl: def.mdnUrl,
      owaspUrl: def.owaspUrl,
      description: def.description,
    });
  }

  const finalScore = clampScore(score);

  return {
    url,
    timestamp: timestamp(),
    score: finalScore,
    grade: computeGrade(finalScore),
    headers: results,
    rawHeaders: headers,
  };
}
