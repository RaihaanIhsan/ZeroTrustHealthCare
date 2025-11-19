// backend/scripts/benchmark.js
// Automated performance benchmarking for all 4 tiers

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const REQUESTS_PER_TIER = 100;

// Test credentials
const credentials = {
  admin: { username: 'admin', password: 'admin123' },
  doctor: { username: 'doctor1', password: 'doctor123' },
  nurse: { username: 'nurse1', password: 'nurse123' }
};

// Benchmark configuration for each tier
const tiers = {
  baseline: {
    name: 'Baseline',
    description: 'Basic authentication only',
    env: {
      ENABLE_FIELD_ENCRYPTION: 'false',
      ENABLE_DIFFERENTIAL_PRIVACY: 'false',
      ENABLE_HOMOMORPHIC_ENCRYPTION: 'false',
      ENABLE_TRUST_SCORE: 'false'
    }
  },
  zeroTrust: {
    name: 'Zero Trust',
    description: 'JWT + Session + Continuous verification',
    env: {
      ENABLE_FIELD_ENCRYPTION: 'false',
      ENABLE_DIFFERENTIAL_PRIVACY: 'false',
      ENABLE_HOMOMORPHIC_ENCRYPTION: 'false',
      ENABLE_TRUST_SCORE: 'false'
    }
  },
  contextAware: {
    name: 'Context-Aware',
    description: 'Zero Trust + Trust scoring + Caching',
    env: {
      ENABLE_FIELD_ENCRYPTION: 'false',
      ENABLE_DIFFERENTIAL_PRIVACY: 'false',
      ENABLE_HOMOMORPHIC_ENCRYPTION: 'false',
      ENABLE_TRUST_SCORE: 'true'
    }
  },
  privacyPreserving: {
    name: 'Privacy-Preserving',
    description: 'Context-Aware + Encryption + DP + HE',
    env: {
      ENABLE_FIELD_ENCRYPTION: 'true',
      ENABLE_DIFFERENTIAL_PRIVACY: 'true',
      ENABLE_HOMOMORPHIC_ENCRYPTION: 'true',
      ENABLE_TRUST_SCORE: 'true'
    }
  }
};

// Results storage
const results = {
  baseline: [],
  zeroTrust: [],
  contextAware: [],
  privacyPreserving: []
};

/**
 * Login and get token
 */
async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.message);
    throw error;
  }
}

/**
 * Measure single request latency
 */
async function measureRequest(endpoint, token, method = 'GET', data = null) {
  const start = process.hrtime.bigint();
  
  try {
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    
    let response;
    if (method === 'GET') {
      response = await axios.get(`${BASE_URL}${endpoint}`, config);
    } else if (method === 'POST') {
      response = await axios.post(`${BASE_URL}${endpoint}`, data, config);
    }
    
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // Convert to ms
    
    return {
      success: true,
      duration: durationMs,
      statusCode: response.status
    };
  } catch (error) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    
    return {
      success: false,
      duration: durationMs,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500
    };
  }
}

/**
 * Run benchmark for a single tier
 */
async function benchmarkTier(tierName, tierConfig, token) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Benchmarking: ${tierConfig.name}`);
  console.log(`Description: ${tierConfig.description}`);
  console.log(`${'='.repeat(60)}`);
  
  const tierResults = [];
  
  // Test endpoints
  const endpoints = [
    { path: '/api/patients', method: 'GET', weight: 0.4 },
    { path: '/api/patients/1', method: 'GET', weight: 0.3 },
    { path: '/api/appointments', method: 'GET', weight: 0.2 },
    { path: '/api/metrics/trust-score', method: 'GET', weight: 0.1 }
  ];
  
  // Warmup (5 requests)
  console.log('Warming up...');
  for (let i = 0; i < 5; i++) {
    await measureRequest('/api/patients', token);
  }
  
  console.log(`Running ${REQUESTS_PER_TIER} requests...`);
  const progressInterval = Math.floor(REQUESTS_PER_TIER / 10);
  
  for (let i = 0; i < REQUESTS_PER_TIER; i++) {
    // Select endpoint based on weights
    const rand = Math.random();
    let cumulative = 0;
    let selectedEndpoint = endpoints[0];
    
    for (const ep of endpoints) {
      cumulative += ep.weight;
      if (rand <= cumulative) {
        selectedEndpoint = ep;
        break;
      }
    }
    
    const result = await measureRequest(
      selectedEndpoint.path,
      token,
      selectedEndpoint.method
    );
    
    tierResults.push({
      endpoint: selectedEndpoint.path,
      ...result,
      timestamp: Date.now()
    });
    
    // Progress indicator
    if ((i + 1) % progressInterval === 0) {
      console.log(`  Progress: ${i + 1}/${REQUESTS_PER_TIER} requests completed`);
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Calculate statistics
  const durations = tierResults.filter(r => r.success).map(r => r.duration);
  const stats = calculateStats(durations);
  
  console.log(`\n✅ Completed ${tierConfig.name}`);
  console.log(`   Average: ${stats.mean.toFixed(2)}ms`);
  console.log(`   Median:  ${stats.median.toFixed(2)}ms`);
  console.log(`   P95:     ${stats.p95.toFixed(2)}ms`);
  console.log(`   P99:     ${stats.p99.toFixed(2)}ms`);
  console.log(`   Min:     ${stats.min.toFixed(2)}ms`);
  console.log(`   Max:     ${stats.max.toFixed(2)}ms`);
  console.log(`   Success: ${tierResults.filter(r => r.success).length}/${REQUESTS_PER_TIER}`);
  
  return {
    tier: tierName,
    config: tierConfig,
    results: tierResults,
    stats
  };
}

/**
 * Calculate statistics
 */
function calculateStats(durations) {
  if (durations.length === 0) {
    return { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
  }
  
  const sorted = durations.slice().sort((a, b) => a - b);
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const mean = sum / durations.length;
  
  // Standard deviation
  const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    stdDev
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))];
}

/**
 * Generate comparison report
 */
function generateReport(allResults) {
  const baseline = allResults.find(r => r.tier === 'baseline');
  const baselineAvg = baseline?.stats.mean || 1;
  
  console.log('\n' + '='.repeat(80));
  console.log('📈 PERFORMANCE COMPARISON REPORT');
  console.log('='.repeat(80));
  
  console.log('\n┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬───────────┐');
  console.log('│ Tier                │ Avg (ms) │ Med (ms) │ P95 (ms) │ P99 (ms) │ Overhead  │');
  console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼───────────┤');
  
  for (const result of allResults) {
    const stats = result.stats;
    const overhead = ((stats.mean - baselineAvg) / baselineAvg * 100).toFixed(1);
    const overheadStr = result.tier === 'baseline' ? 'Baseline' : `+${overhead}%`;
    
    console.log(
      `│ ${result.config.name.padEnd(19)} │ ` +
      `${stats.mean.toFixed(2).padStart(8)} │ ` +
      `${stats.median.toFixed(2).padStart(8)} │ ` +
      `${stats.p95.toFixed(2).padStart(8)} │ ` +
      `${stats.p99.toFixed(2).padStart(8)} │ ` +
      `${overheadStr.padStart(9)} │`
    );
  }
  
  console.log('└─────────────────────┴──────────┴──────────┴──────────┴──────────┴───────────┘');
  
  // Expected pattern verification
  console.log('\n🔍 Pattern Verification:');
  const pattern = verifyPattern(allResults);
  console.log(pattern.message);
  
  // Detailed overhead analysis
  console.log('\n📊 Overhead Breakdown:');
  if (allResults.length >= 4) {
    const zt = allResults.find(r => r.tier === 'zeroTrust');
    const ca = allResults.find(r => r.tier === 'contextAware');
    const pp = allResults.find(r => r.tier === 'privacyPreserving');
    
    console.log(`  Baseline → Zero Trust:       +${((zt.stats.mean - baselineAvg) / baselineAvg * 100).toFixed(1)}% (+${(zt.stats.mean - baselineAvg).toFixed(2)}ms)`);
    console.log(`  Zero Trust → Context-Aware:  ${((ca.stats.mean - zt.stats.mean) / zt.stats.mean * 100).toFixed(1)}% (${(ca.stats.mean - zt.stats.mean).toFixed(2)}ms)`);
    console.log(`  Context-Aware → Privacy:     +${((pp.stats.mean - ca.stats.mean) / ca.stats.mean * 100).toFixed(1)}% (+${(pp.stats.mean - ca.stats.mean).toFixed(2)}ms)`);
    console.log(`  Total (Baseline → Privacy):  +${((pp.stats.mean - baselineAvg) / baselineAvg * 100).toFixed(1)}% (+${(pp.stats.mean - baselineAvg).toFixed(2)}ms)`);
  }
}

/**
 * Verify expected pattern
 */
function verifyPattern(allResults) {
  const baseline = allResults.find(r => r.tier === 'baseline')?.stats.mean || 0;
  const zeroTrust = allResults.find(r => r.tier === 'zeroTrust')?.stats.mean || 0;
  const contextAware = allResults.find(r => r.tier === 'contextAware')?.stats.mean || 0;
  const privacy = allResults.find(r => r.tier === 'privacyPreserving')?.stats.mean || 0;
  
  const expected = baseline < contextAware && contextAware < zeroTrust && zeroTrust < privacy;
  const alternative = baseline < zeroTrust && zeroTrust > contextAware && contextAware < privacy;
  
  if (expected) {
    return {
      valid: true,
      message: '✅ Pattern matches: Baseline < Context-Aware < Zero Trust < Privacy'
    };
  } else if (alternative) {
    return {
      valid: true,
      message: '✅ Alternative pattern (with optimization): Baseline < (ZT > Context) < Privacy'
    };
  } else {
    return {
      valid: false,
      message: '⚠️  Pattern differs from expected. This is acceptable if documented.'
    };
  }
}

/**
 * Export results to CSV
 */
function exportToCSV(allResults) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `../benchmark_results_${timestamp}.csv`);
  
  // Summary CSV
  const summaryRows = ['Tier,Average,Median,P95,P99,Min,Max,StdDev,Requests'];
  for (const result of allResults) {
    const stats = result.stats;
    summaryRows.push(
      `${result.tier},${stats.mean},${stats.median},${stats.p95},${stats.p99},${stats.min},${stats.max},${stats.stdDev},${result.results.length}`
    );
  }
  fs.writeFileSync(filename, summaryRows.join('\n'));
  console.log(`\n💾 Summary exported to: ${filename}`);
  
  // Detailed CSV
  const detailedFilename = path.join(__dirname, `../benchmark_detailed_${timestamp}.csv`);
  const detailedRows = ['Tier,Endpoint,Duration,Success,StatusCode,Timestamp'];
  for (const result of allResults) {
    for (const req of result.results) {
      detailedRows.push(
        `${result.tier},${req.endpoint},${req.duration},${req.success},${req.statusCode},${req.timestamp}`
      );
    }
  }
  fs.writeFileSync(detailedFilename, detailedRows.join('\n'));
  console.log(`💾 Detailed data exported to: ${detailedFilename}`);
  
  return { summaryFile: filename, detailedFile: detailedFilename };
}

/**
 * Main benchmark execution
 */
async function runBenchmark() {
  console.log('🚀 Starting Healthcare Zero Trust Performance Benchmark');
  console.log(`Requests per tier: ${REQUESTS_PER_TIER}`);
  console.log(`Total requests: ${REQUESTS_PER_TIER * 4}`);
  
  try {
    // Login once (reuse token for all tiers)
    console.log('\n🔐 Authenticating...');
    const token = await login(credentials.doctor.username, credentials.doctor.password);
    console.log('✅ Authentication successful');
    
    const allResults = [];
    
    // Run benchmarks for each tier
    for (const [tierName, tierConfig] of Object.entries(tiers)) {
      // Note: In a real implementation, you'd need to restart the server
      // with different environment variables for each tier.
      // For this script, we assume manual configuration or use of feature flags.
      
      const result = await benchmarkTier(tierName, tierConfig, token);
      allResults.push(result);
      results[tierName] = result.results;
      
      // Cool down between tiers
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Generate report
    generateReport(allResults);
    
    // Export to CSV
    const files = exportToCSV(allResults);
    
    console.log('\n✅ Benchmark completed successfully!');
    console.log('\n📁 Next steps:');
    console.log('  1. Import CSV files into Excel/Python for visualization');
    console.log('  2. Create bar charts comparing average latency');
    console.log('  3. Create line graphs showing latency distribution');
    console.log('  4. Document findings in your report');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark, measureRequest };