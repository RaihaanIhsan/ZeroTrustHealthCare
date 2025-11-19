// backend/models/differentialPrivacy.js
// Privacy-Preserving Layer 2: Differential Privacy for Aggregated Data

/**
 * Differential Privacy Configuration
 * ε (epsilon) = Privacy budget (lower = more privacy, more noise)
 * Standard values: ε=0.1 (high privacy), ε=1.0 (moderate), ε=10 (low privacy)
 */
const EPSILON = parseFloat(process.env.PRIVACY_EPSILON) || 1.0;
const SENSITIVITY = 1; // For counting queries, sensitivity = 1

/**
 * Generate random sample from Laplace distribution
 * Laplace(μ, b) where μ=0, b=sensitivity/epsilon
 * @returns {number} - Laplace-distributed random number
 */
function laplace() {
  // Use inverse transform sampling
  // Laplace CDF^-1(u) = μ - b*sgn(u-0.5)*ln(1-2|u-0.5|)
  const u = Math.random();
  const scale = SENSITIVITY / EPSILON;
  
  if (u < 0.5) {
    return scale * Math.log(2 * u);
  } else {
    return -scale * Math.log(2 * (1 - u));
  }
}

/**
 * Add differential privacy noise to a numeric value
 * @param {number} trueValue - Real count/metric
 * @returns {number} - Noisy value (rounded to integer for counts)
 */
function addNoise(trueValue) {
  const startTime = Date.now();
  
  const noise = laplace();
  const noisyValue = trueValue + noise;
  
  // For counts, ensure non-negative and round
  const result = Math.max(0, Math.round(noisyValue));
  
  const duration = Date.now() - startTime;
  recordDPMetric(duration);
  
  return result;
}

/**
 * Apply differential privacy to metrics object
 * @param {Object} metrics - Original metrics
 * @returns {Object} - Metrics with noise added
 */
function privatizeMetrics(metrics) {
  const startTime = Date.now();
  
  const privatized = {
    ...metrics,
    accessAttempts: {
      ...metrics.accessAttempts,
      total: addNoise(metrics.accessAttempts.total),
      last24Hours: addNoise(metrics.accessAttempts.last24Hours),
      lastHour: addNoise(metrics.accessAttempts.lastHour),
      granted: addNoise(metrics.accessAttempts.granted),
      denied: addNoise(metrics.accessAttempts.denied)
    },
    authentication: {
      ...metrics.authentication,
      total: addNoise(metrics.authentication.total),
      last24Hours: addNoise(metrics.authentication.last24Hours),
      successful: addNoise(metrics.authentication.successful),
      failed: addNoise(metrics.authentication.failed)
    },
    sessions: {
      ...metrics.sessions,
      totalSessions: addNoise(metrics.sessions.totalSessions),
      activeSessions: addNoise(metrics.sessions.activeSessions),
      revokedSessions: addNoise(metrics.sessions.revokedSessions)
    },
    privacyApplied: true,
    privacyEpsilon: EPSILON,
    privacyNote: `Differential privacy with ε=${EPSILON} applied to protect individual privacy`
  };
  
  const duration = Date.now() - startTime;
  recordDPMetric(duration);
  
  return privatized;
}

/**
 * Apply differential privacy to patient count statistics
 * @param {Object} stats - Patient statistics
 * @returns {Object} - Privatized statistics
 */
function privatizePatientStats(stats) {
  return {
    ...stats,
    totalPatients: addNoise(stats.totalPatients || 0),
    byDepartment: Object.fromEntries(
      Object.entries(stats.byDepartment || {}).map(([dept, count]) => 
        [dept, addNoise(count)]
      )
    ),
    privacyApplied: true,
    privacyEpsilon: EPSILON
  };
}

/**
 * Apply differential privacy to appointment statistics
 * @param {Object} stats - Appointment statistics
 * @returns {Object} - Privatized statistics
 */
function privatizeAppointmentStats(stats) {
  return {
    ...stats,
    totalAppointments: addNoise(stats.totalAppointments || 0),
    todayAppointments: addNoise(stats.todayAppointments || 0),
    byType: Object.fromEntries(
      Object.entries(stats.byType || {}).map(([type, count]) => 
        [type, addNoise(count)]
      )
    ),
    privacyApplied: true,
    privacyEpsilon: EPSILON
  };
}

/**
 * Calculate privacy loss budget (cumulative epsilon)
 * In production, track this per-user and enforce limits
 */
let cumulativeEpsilon = 0;
const PRIVACY_BUDGET = 10.0; // Maximum allowed privacy loss

function trackPrivacyBudget(queriesExecuted = 1) {
  cumulativeEpsilon += (EPSILON * queriesExecuted);
  
  return {
    used: cumulativeEpsilon.toFixed(2),
    remaining: (PRIVACY_BUDGET - cumulativeEpsilon).toFixed(2),
    percentUsed: ((cumulativeEpsilon / PRIVACY_BUDGET) * 100).toFixed(1)
  };
}

function resetPrivacyBudget() {
  cumulativeEpsilon = 0;
}

function isPrivacyBudgetExceeded() {
  return cumulativeEpsilon >= PRIVACY_BUDGET;
}

// Metrics tracking
const dpMetrics = {
  count: 0,
  totalTime: 0
};

function recordDPMetric(duration) {
  dpMetrics.count++;
  dpMetrics.totalTime += duration;
}

function getDPMetrics() {
  return {
    noisyQueriesExecuted: dpMetrics.count,
    totalTime: dpMetrics.totalTime,
    avgTime: dpMetrics.count > 0 ? (dpMetrics.totalTime / dpMetrics.count).toFixed(2) : 0,
    epsilon: EPSILON,
    privacyBudget: trackPrivacyBudget(0) // Don't increment, just check
  };
}

module.exports = {
  addNoise,
  privatizeMetrics,
  privatizePatientStats,
  privatizeAppointmentStats,
  trackPrivacyBudget,
  resetPrivacyBudget,
  isPrivacyBudgetExceeded,
  getDPMetrics,
  EPSILON
};