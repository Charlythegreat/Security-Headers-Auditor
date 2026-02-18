/**
 * Scoring engine — evaluates normalised headers against security header
 * definitions and produces a full AuditReport with category breakdowns.
 *
 * Point allocation (total = 100):
 *   Content-Security-Policy      30 pts  (Critical)
 *   Strict-Transport-Security    20 pts  (Critical)
 *   X-Frame-Options              10 pts  (High)
 *   X-Content-Type-Options       10 pts  (High)
 *   Referrer-Policy               8 pts  (Medium)
 *   Permissions-Policy            7 pts  (Medium)
 *   Cross-Origin-Embedder-Policy  5 pts  (Low)
 *   Cross-Origin-Opener-Policy    5 pts  (Low)
 *   Cross-Origin-Resource-Policy  5 pts  (Low)
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
  CATEGORY_LABELS,
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
 * Build category score summaries from individual header results.
 * @param {import('../types/types').HeaderResult[]} results
 * @returns {import('../types/types').CategoryScore[]}
 */
function buildCategoryScores(results) {
  /** @type {Record<string, {earned: number, max: number}>} */
  const buckets = {};

  for (const r of results) {
    if (!buckets[r.severity]) {
      buckets[r.severity] = { earned: 0, max: 0 };
    }
    buckets[r.severity].earned += r.pointsEarned;
    buckets[r.severity].max += r.maxPoints;
  }

  const order = ['critical', 'high', 'medium', 'low'];

  return order
    .filter((cat) => buckets[cat])
    .map((cat) => ({
      category: /** @type {import('../types/types').Severity} */ (cat),
      label: CATEGORY_LABELS[cat] || cat,
      earned: buckets[cat].earned,
      max: buckets[cat].max,
      percentage: buckets[cat].max > 0 ? Math.round((buckets[cat].earned / buckets[cat].max) * 100) : 100,
    }));
}

/**
 * Run a full audit on the provided raw headers for a given URL.
 *
 * @param {string} url  The page URL
 * @param {Record<string,string> | Array<{name:string,value:string}>} rawHeaders
 * @param {import('../types/types').SubResourceResult[]} [subResources]  Optional sub-resource results
 * @returns {import('../types/types').AuditReport}
 */
export function audit(url, rawHeaders, subResources) {
  const headers = normalizeHeaders(rawHeaders);
  let totalEarned = 0;

  /** @type {import('../types/types').HeaderResult[]} */
  const results = [];

  for (const def of SECURITY_HEADERS) {
    const value = headers[def.key] ?? null;

    /** @type {import('../types/types').HeaderStatus} */
    let status;
    let pointsEarned = 0;
    /** @type {string[]} */
    let warnings = [];
    /** @type {string[]} */
    let errors = [];

    if (value === null) {
      // Header missing — 0 points
      status = 'missing';
      pointsEarned = 0;
    } else {
      // Header present — run validation
      const validation = def.validate(value);
      warnings = validation.warnings;
      errors = validation.errors;

      if (!validation.valid) {
        // Hard misconfiguration
        status = 'misconfigured';
        const ps = typeof validation.partialScore === 'number' ? validation.partialScore : 0.2;
        pointsEarned = Math.round(def.maxPoints * Math.max(0, ps));
      } else if (validation.warnings.length > 0) {
        // Soft misconfiguration — use partialScore if provided, else 70%
        status = 'misconfigured';
        const ps = typeof validation.partialScore === 'number' ? validation.partialScore : 0.7;
        pointsEarned = Math.round(def.maxPoints * Math.max(0, ps));
      } else {
        // Fully valid
        status = 'present';
        pointsEarned = def.maxPoints;
      }
    }

    totalEarned += pointsEarned;

    results.push({
      name: def.name,
      key: def.key,
      severity: def.severity,
      status,
      statusIcon: STATUS_ICONS[status],
      value,
      maxPoints: def.maxPoints,
      pointsEarned,
      pointsDeducted: def.maxPoints - pointsEarned,
      warnings,
      errors,
      recommendation: getRecommendation(def.key, status, value),
      example: def.example,
      mdnUrl: def.mdnUrl,
      owaspUrl: def.owaspUrl,
      description: def.description,
    });
  }

  const finalScore = clampScore(totalEarned);
  const categoryScores = buildCategoryScores(results);

  return {
    url,
    timestamp: timestamp(),
    score: finalScore,
    grade: computeGrade(finalScore),
    categoryScores,
    headers: results,
    rawHeaders: headers,
    subResources: subResources || undefined,
  };
}
