// benchmark-single-tier.js - Run benchmark for a single tier
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const REQUESTS_PER_TIER = 100;

const credentials = {
  doctor: { username: 'doctor1', password: 'doctor123' }
};

async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed:`, error.message);
    throw error;
  }
}

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
    const durationMs = Number(end - start) / 1_000_000;
    
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

function calculateStats(durations) {
  if (durations.length === 0) {
    return { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
  }
  
  const sorted = durations.slice().sort((a, b) => a - b);
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const mean = sum / durations.length;
  
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

async function runBenchmark(tierName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Benchmarking: ${tierName}`);
  console.log(`${'='.repeat(60)}`);
  
  // Login
  console.log('🔐 Authenticating...');
  const token = await login(credentials.doctor.username, credentials.doctor.password);
  console.log('✅ Authentication successful\n');
  
  const tierResults = [];
  
  const endpoints = [
    { path: '/api/patients', method: 'GET', weight: 0.4 },
    { path: '/api/patients/1', method: 'GET', weight: 0.3 },
    { path: '/api/appointments', method: 'GET', weight: 0.2 },
    { path: '/api/metrics/trust-score', method: 'GET', weight: 0.1 }
  ];
  
  // Warmup
  console.log('Warming up (5 requests)...');
  for (let i = 0; i < 5; i++) {
    await measureRequest('/api/patients', token);
  }
  
  console.log(`Running ${REQUESTS_PER_TIER} requests...`);
  const progressInterval = Math.floor(REQUESTS_PER_TIER / 10);
  
  for (let i = 0; i < REQUESTS_PER_TIER; i++) {
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
    
    if ((i + 1) % progressInterval === 0) {
      console.log(`  Progress: ${i + 1}/${REQUESTS_PER_TIER} requests completed`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Calculate statistics
  const successfulRequests = tierResults.filter(r => r.success);
  const durations = successfulRequests.map(r => r.duration);
  const stats = calculateStats(durations);
  
  console.log(`\n✅ Completed ${tierName}`);
  console.log(`   Average: ${stats.mean.toFixed(2)}ms`);
  console.log(`   Median:  ${stats.median.toFixed(2)}ms`);
  console.log(`   P95:     ${stats.p95.toFixed(2)}ms`);
  console.log(`   P99:     ${stats.p99.toFixed(2)}ms`);
  console.log(`   Min:     ${stats.min.toFixed(2)}ms`);
  console.log(`   Max:     ${stats.max.toFixed(2)}ms`);
  console.log(`   Success: ${successfulRequests.length}/${REQUESTS_PER_TIER}`);
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `../benchmark_${tierName}_${timestamp}.csv`);
  
  const rows = ['Endpoint,Duration,Success,StatusCode,Timestamp'];
  for (const req of tierResults) {
    rows.push(`${req.endpoint},${req.duration},${req.success},${req.statusCode},${req.timestamp}`);
  }
  fs.writeFileSync(filename, rows.join('\n'));
  
  // Save summary
  const summaryFile = path.join(__dirname, `../benchmark_${tierName}_summary.json`);
  fs.writeFileSync(summaryFile, JSON.stringify({
    tier: tierName,
    stats,
    successRate: (successfulRequests.length / REQUESTS_PER_TIER * 100).toFixed(1) + '%',
    timestamp
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${filename}`);
  console.log(`💾 Summary saved to: ${summaryFile}`);
  
  return { tierName, stats, results: tierResults };
}

// Main
(async () => {
  const tierName = process.argv[2];
  
  if (!tierName) {
    console.log('Usage: node benchmark-single-tier.js <tier_name>');
    console.log('Available tiers: baseline, zeroTrust, contextAware, privacyPreserving');
    process.exit(1);
  }
  
  try {
    await runBenchmark(tierName);
    console.log('\n✅ Benchmark completed successfully!');
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
})();