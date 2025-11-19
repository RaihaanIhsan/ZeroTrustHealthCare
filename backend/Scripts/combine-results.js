// combine-results.js
const fs = require('fs');
const path = require('path');

const tiers = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving'];
const tierLabels = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving'];

console.log('📊 Combining benchmark results...\n');

// Read all summary files
const summaries = [];
for (const tier of tiers) {
  const file = path.join(__dirname, `../benchmark_${tier}_summary.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    summaries.push(data);
    console.log(`✅ Loaded: ${tier}`);
  } else {
    console.log(`❌ Missing: ${tier}`);
  }
}

if (summaries.length !== 4) {
  console.error('\n❌ Not all benchmarks completed. Run missing tiers.');
  process.exit(1);
}

// Create combined CSV
const csvRows = ['Tier,Average,Median,P95,P99,Min,Max,StdDev'];
for (let i = 0; i < summaries.length; i++) {
  const stats = summaries[i].stats;
  csvRows.push(
    `${tiers[i]},${stats.mean},${stats.median},${stats.p95},${stats.p99},${stats.min},${stats.max},${stats.stdDev}`
  );
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(__dirname, `../benchmark_results_${timestamp}.csv`);
fs.writeFileSync(outputFile, csvRows.join('\n'));

console.log(`\n💾 Combined results saved to: ${outputFile}`);

// Print summary table
console.log('\n' + '='.repeat(80));
console.log('📈 PERFORMANCE COMPARISON');
console.log('='.repeat(80));
console.log('\n┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬───────────┐');
console.log('│ Tier                │ Avg (ms) │ Med (ms) │ P95 (ms) │ P99 (ms) │ Overhead  │');
console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼───────────┤');

const baseline = summaries[0].stats.mean;
for (let i = 0; i < summaries.length; i++) {
  const stats = summaries[i].stats;
  const overhead = i === 0 ? 'Baseline' : `+${((stats.mean - baseline) / baseline * 100).toFixed(1)}%`;
  
  console.log(
    `│ ${tierLabels[i].padEnd(19)} │ ` +
    `${stats.mean.toFixed(2).padStart(8)} │ ` +
    `${stats.median.toFixed(2).padStart(8)} │ ` +
    `${stats.p95.toFixed(2).padStart(8)} │ ` +
    `${stats.p99.toFixed(2).padStart(8)} │ ` +
    `${overhead.padStart(9)} │`
  );
}

console.log('└─────────────────────┴──────────┴──────────┴──────────┴──────────┴───────────┘');

console.log('\n✅ Ready for visualization!');
console.log(`Run: python scripts/visualize.py ${outputFile}`);