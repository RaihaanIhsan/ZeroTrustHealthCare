// backend/models/performanceMeasurement.js
// Comprehensive performance measurement for all tiers

const performanceData = {
  baseline: { requests: [], avgTime: 0 },
  zeroTrust: { requests: [], avgTime: 0 },
  contextAware: { requests: [], avgTime: 0 },
  privacyPreserving: { requests: [], avgTime: 0 }
};

/**
 * Record request performance
 * @param {string} tier - baseline | zeroTrust | contextAware | privacyPreserving
 * @param {number} duration - Request duration in milliseconds
 * @param {Object} metadata - Additional metrics
 */
function recordPerformance(tier, duration, metadata = {}) {
  if (!performanceData[tier]) {
    console.error(`Unknown tier: ${tier}`);
    return;
  }

  performanceData[tier].requests.push({
    duration,
    timestamp: Date.now(),
    ...metadata
  });

  // Keep last 1000 requests per tier
  if (performanceData[tier].requests.length > 1000) {
    performanceData[tier].requests.shift();
  }

  // Recalculate average
  const requests = performanceData[tier].requests;
  const sum = requests.reduce((acc, r) => acc + r.duration, 0);
  performanceData[tier].avgTime = requests.length > 0 
    ? (sum / requests.length).toFixed(2) 
    : 0;
}

/**
 * Get performance comparison across all tiers
 */
function getPerformanceComparison() {
  const comparison = {};

  for (const [tier, data] of Object.entries(performanceData)) {
    const requests = data.requests;
    
    if (requests.length === 0) {
      comparison[tier] = {
        avgTime: 0,
        minTime: 0,
        maxTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        requestCount: 0
      };
      continue;
    }

    const durations = requests.map(r => r.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    comparison[tier] = {
      avgTime: (sum / durations.length).toFixed(2),
      minTime: Math.min(...durations).toFixed(2),
      maxTime: Math.max(...durations).toFixed(2),
      p50: percentile(durations, 50).toFixed(2),
      p95: percentile(durations, 95).toFixed(2),
      p99: percentile(durations, 99).toFixed(2),
      requestCount: requests.length,
      throughput: (requests.length / ((Date.now() - requests[0].timestamp) / 1000)).toFixed(2) + ' req/s'
    };
  }

  return comparison;
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get performance overhead analysis
 */
function getOverheadAnalysis() {
  const baseline = parseFloat(performanceData.baseline.avgTime) || 1;
  const zeroTrust = parseFloat(performanceData.zeroTrust.avgTime) || 0;
  const contextAware = parseFloat(performanceData.contextAware.avgTime) || 0;
  const privacyPreserving = parseFloat(performanceData.privacyPreserving.avgTime) || 0;

  return {
    baseline: {
      avgTime: baseline,
      overhead: '0%'
    },
    zeroTrust: {
      avgTime: zeroTrust,
      overhead: zeroTrust > 0 ? `+${(((zeroTrust - baseline) / baseline) * 100).toFixed(1)}%` : 'N/A',
      absoluteIncrease: `+${(zeroTrust - baseline).toFixed(2)}ms`
    },
    contextAware: {
      avgTime: contextAware,
      overhead: contextAware > 0 ? `${(((contextAware - baseline) / baseline) * 100).toFixed(1)}%` : 'N/A',
      absoluteIncrease: `${(contextAware - baseline).toFixed(2)}ms`,
      reductionFromZT: zeroTrust > 0 && contextAware > 0 
        ? `${(((contextAware - zeroTrust) / zeroTrust) * 100).toFixed(1)}%`
        : 'N/A'
    },
    privacyPreserving: {
      avgTime: privacyPreserving,
      overhead: privacyPreserving > 0 ? `+${(((privacyPreserving - baseline) / baseline) * 100).toFixed(1)}%` : 'N/A',
      absoluteIncrease: `+${(privacyPreserving - baseline).toFixed(2)}ms`,
      increaseFromContext: contextAware > 0 && privacyPreserving > 0
        ? `+${(((privacyPreserving - contextAware) / contextAware) * 100).toFixed(1)}%`
        : 'N/A'
    },
    expectedPattern: {
      baseline: 'Low (reference)',
      zeroTrust: 'High (crypto overhead)',
      contextAware: 'Medium (optimizations applied)',
      privacyPreserving: 'Highest (privacy crypto overhead)'
    }
  };
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  const comparison = getPerformanceComparison();
  const overhead = getOverheadAnalysis();

  return {
    timestamp: new Date().toISOString(),
    comparison,
    overheadAnalysis: overhead,
    summary: {
      totalRequests: Object.values(performanceData).reduce((sum, tier) => sum + tier.requests.length, 0),
      measurementPeriod: calculateMeasurementPeriod(),
      performanceTrend: determinePerformanceTrend()
    }
  };
}

function calculateMeasurementPeriod() {
  let earliest = Infinity;
  let latest = 0;

  for (const tier of Object.values(performanceData)) {
    if (tier.requests.length > 0) {
      const first = tier.requests[0].timestamp;
      const last = tier.requests[tier.requests.length - 1].timestamp;
      earliest = Math.min(earliest, first);
      latest = Math.max(latest, last);
    }
  }

  if (earliest === Infinity) return 'No data';

  const duration = (latest - earliest) / 1000;
  return `${duration.toFixed(1)} seconds`;
}

function determinePerformanceTrend() {
  const baseline = parseFloat(performanceData.baseline.avgTime);
  const zeroTrust = parseFloat(performanceData.zeroTrust.avgTime);
  const contextAware = parseFloat(performanceData.contextAware.avgTime);
  const privacyPreserving = parseFloat(performanceData.privacyPreserving.avgTime);

  const validData = [baseline, zeroTrust, contextAware, privacyPreserving].filter(v => v > 0);

  if (validData.length < 2) return 'Insufficient data';

  // Expected pattern: baseline < contextAware < zeroTrust < privacyPreserving
  if (baseline > 0 && zeroTrust > baseline && contextAware < zeroTrust && privacyPreserving > contextAware) {
    return '✓ Follows expected pattern: Baseline < Context < ZeroTrust < Privacy';
  }

  return '⚠ Performance pattern differs from expected';
}

/**
 * Reset all performance data
 */
function resetPerformanceData() {
  for (const tier in performanceData) {
    performanceData[tier].requests = [];
    performanceData[tier].avgTime = 0;
  }
}

/**
 * Export data for analysis (CSV format)
 */
function exportPerformanceData() {
  const rows = ['Tier,Duration,Timestamp,Metadata'];

  for (const [tier, data] of Object.entries(performanceData)) {
    for (const request of data.requests) {
      rows.push(`${tier},${request.duration},${request.timestamp},${JSON.stringify(request.metadata || {})}`);
    }
  }

  return rows.join('\n');
}

module.exports = {
  recordPerformance,
  getPerformanceComparison,
  getOverheadAnalysis,
  generatePerformanceReport,
  resetPerformanceData,
  exportPerformanceData
};