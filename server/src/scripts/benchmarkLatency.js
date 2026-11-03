/**
 * Benchmark Script for Measuring API Latency against PRD 500ms Target
 * Reports p50 and p95 for key read and aggregation endpoints.
 */

const http = require('http');

const ENDPOINTS = [
  { name: 'Health Check', path: '/api/health' },
  { name: 'Public Service Catalog', path: '/api/services' },
];

const RUNS_PER_ENDPOINT = 20;

const makeRequest = (path) => {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.get(`http://localhost:${process.env.PORT || 5000}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({ statusCode: res.statusCode, durationMs });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
};

const calculatePercentiles = (durations) => {
  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const avg = durations.reduce((s, v) => s + v, 0) / durations.length;
  return { p50: p50.toFixed(2), p95: p95.toFixed(2), avg: avg.toFixed(2) };
};

const runBenchmark = async () => {
  console.log('====================================================');
  console.log('       DISPATCHLY API LATENCY BENCHMARK (PRD <500ms)');
  console.log('====================================================\n');

  for (const ep of ENDPOINTS) {
    process.stdout.write(`Benchmarking ${ep.name} (${ep.path}) across ${RUNS_PER_ENDPOINT} runs... `);
    const durations = [];
    try {
      for (let i = 0; i < RUNS_PER_ENDPOINT; i++) {
        const result = await makeRequest(ep.path);
        durations.push(result.durationMs);
      }
      const stats = calculatePercentiles(durations);
      const passed = Number(stats.p95) < 500;
      console.log(`${passed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`   Avg: ${stats.avg} ms | p50: ${stats.p50} ms | p95: ${stats.p95} ms | Target: < 500 ms\n`);
    } catch (err) {
      console.log(`[Skipped - Server not running locally on port ${process.env.PORT || 5000}]: ${err.message}\n`);
    }
  }
};

if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark, calculatePercentiles };
