const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = 'test-results';
const REPORT_FILE = 'playwright-report/report.json';

function analyzeTestResults() {
  console.log('\n📊 =======================================');
  console.log('   TEST RESULT ANALYSIS');
  console.log('=======================================\n');

  // Read test-results summary
  const lastRunFile = path.join(TEST_RESULTS_DIR, '.last-run.json');
  let results = {
    suites: [],
    stats: { passed: 0, failed: 0, skipped: 0 }
  };

  if (fs.existsSync(lastRunFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lastRunFile, 'utf-8'));
      results = {
        suites: data.suites || [],
        stats: data.stats || { passed: 0, failed: 0, skipped: 0 }
      };
    } catch (e) {
      console.log('⚠️  Could not parse test results');
    }
  }

  // Print summary table
  console.log('┌─────────────────┬────────┬──────────┐');
  console.log('│ Metric          │ Count  │ Status   │');
  console.log('├─────────────────┼────────┼──────────┤');
  console.log(`│ ✅ Passed       │ ${results.stats.passed}     │ PASS     │`);
  console.log(`│ ❌ Failed      │ ${results.stats.failed}     │ ${results.stats.failed > 0 ? 'FAIL' : 'PASS'}     │`);
  console.log(`│ ⏭️  Skipped    │ ${results.stats.skipped}     │ SKIP    │`);
  console.log('└─────────────────┴────────┴──────────┘\n');

  // Analyze failures
  if (results.stats.failed > 0) {
    console.log('❌ FAILED TESTS:');
    console.log('─────────────────────────────────────\n');

    const failures = [];
    results.suites.forEach(suite => {
      suite.specs?.forEach(spec => {
        spec.tests?.forEach(test => {
          if (test.results?.[0]?.errors?.length > 0) {
            failures.push({
              name: test.name,
              error: test.results[0].errors[0].message,
              location: test.results[0].errors[0].location
            });
          }
        });
      });
    });

    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     Error: ${f.error.substring(0, 100)}...`);
      console.log('');
    });

    // Generate fix suggestions
    console.log('🔧 SUGGESTED FIXES:');
    console.log('─────────────────────────────────────\n');

    failures.forEach((f, i) => {
      const fix = suggestFix(f);
      console.log(`  ${i + 1}. ${fix.title}`);
      console.log(`     ${fix.action}`);
      console.log('');
    });
  } else {
    console.log('🎉 ALL TESTS PASSED!\n');
  }

  // Generate report
  generateReport(results);

  return results.stats.failed === 0;
}

function suggestFix(failure) {
  const error = (failure.error || '').toLowerCase();
  const testName = (failure.name || '').toLowerCase();

  // Network errors
  if (error.includes('network') || error.includes('fetch')) {
    return {
      title: 'Network/Connection Issue',
      action: 'Check if backend server is running on port 5000'
    };
  }

  // Timeout errors
  if (error.includes('timeout')) {
    return {
      title: 'Timeout Issue',
      action: 'Increase timeout in playwright.config.ts or check server response time'
    };
  }

  // Login failures
  if (testName.includes('login') && error.includes('failed')) {
    return {
      title: 'Login Test Failed',
      action: 'Check credentials in .env.test or verify auth API endpoint'
    };
  }

  // Element not found
  if (error.includes('not visible') || error.includes('not found')) {
    return {
      title: 'Element Not Found',
      action: 'Update selector in page object or check if element is rendered'
    };
  }

  // Default
  return {
    title: 'Unknown Error',
    action: 'Review test screenshot in test-results/ for visual context'
  };
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: results.stats,
    status: results.stats.failed === 0 ? 'PASSED' : 'FAILED'
  };

  fs.writeFileSync(
    'test-results/summary.json',
    JSON.stringify(report, null, 2)
  );

  console.log('📄 Report saved to: test-results/summary.json\n');
}

// Run analysis
const passed = analyzeTestResults();
process.exit(passed ? 0 : 1);