const { execSync } = require('child_process');
const fs = require('fs');

const MAX_RETRIES = 3;
const TEST_FILE = process.argv[2] || 'src/scenarios.test.ts';

console.log('\n🤖 =======================================');
console.log('   AUTOMATED TEST & FIX LOOP');
console.log('=======================================\n');

let attempt = 0;
let passed = false;
let lastError = '';

async function runTests() {
  attempt++;
  console.log(`\n📝 Attempt ${attempt}/${MAX_RETRIES}`);
  console.log('─────────────────────────────────────\n');

  try {
    // Run tests with headed mode and capture output
    execSync(`npx playwright test ${TEST_FILE} --headed --reporter=list`, {
      stdio: 'inherit',
      timeout: 180000
    });

    passed = true;
    console.log('\n✅ ALL TESTS PASSED!\n');
    return true;

  } catch (error) {
    lastError = error.message;
    console.log(`\n❌ Tests failed: ${lastError.substring(0, 200)}...\n`);

    // Analyze failures
    console.log('🔍 Analyzing failures...\n');
    try {
      execSync('node scripts/analyze-report.js', { stdio: 'inherit' });
    } catch (e) {
      // Ignore analyze errors
    }

    return false;
  }
}

async function main() {
  console.log(`Test file: ${TEST_FILE}`);
  console.log(`Max retries: ${MAX_RETRIES}\n`);

  // Run tests in loop until passed or max retries
  while (!passed && attempt < MAX_RETRIES) {
    await runTests();

    if (!passed && attempt < MAX_RETRIES) {
      console.log(`\n⚠️  Retrying... (${attempt}/${MAX_RETRIES})\n`);

      // Small delay before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Final result
  console.log('═══════════════════════════════════════');
  if (passed) {
    console.log('✅ FINAL RESULT: ALL TESTS PASSED');
    console.log('═══════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('❌ FINAL RESULT: TESTS FAILED AFTER RETRIES');
    console.log('═══════════════════════════════════════\n');
    console.log('📋 Troubleshooting steps:');
    console.log('  1. Check screenshots in test-results/');
    console.log('  2. Review test-results/summary.json');
    console.log('  3. Fix issues manually');
    console.log('  4. Run: npm run automation:run\n');
    process.exit(1);
  }
}

main();