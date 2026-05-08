# LMS Automation Test Workflow

## Quick Start

```bash
cd automation

# Run all tests (headed mode)
npm run automation:run

# Run specific test file
npm run test src/scenarios.test.ts --headed

# Run CI mode (no browser)
npm run automation:ci
```

## Automated Fix Loop

```bash
# Run tests with auto-retry and analysis
node scripts/auto-fix.js
```

This will:
1. Run tests
2. If failed → Analyze failures
3. Suggest fixes
4. Retry up to 3 times
5. Generate report

## Manual Workflow

### Step 1: Clean and Run Tests
```bash
npm run test:clean          # Clean previous results
npm run test:headed       # Run with browser visible
```

### Step 2: Analyze Results
```bash
npm run report:analyze     # Analyze test results
```

### Step 3: View Report
```bash
npm run test:report      # Open HTML report
# or view screenshots in test-results/
```

## Test Files

| File | Description | Run Command |
|------|------------|------------|
| `src/session.test.ts` | Single session E2E | `npx playwright test src/session.test.ts --headed` |
| `src/scenarios.test.ts` | All scenarios | `npx playwright test src/scenarios.test.ts --headed` |
| `src/all-screens.test.ts` | Individual tests | `npx playwright test src/all-screens.test.ts --headed` |

## Report Output

After running tests, reports are saved to:

```
test-results/
├── *.png              # Screenshots for each step
├── summary.json        # Test summary
└── playwright-report/
    └── report.html  # HTML report
```

## Troubleshooting

### Tests fail consistently

1. **Check if services are running:**
   ```bash
   docker compose ps
   ```

2. **Restart services:**
   ```bash
   docker compose restart
   ```

3. **Check backend logs:**
   ```bash
   docker compose logs backend
   ```

4. **Re-run tests:**
   ```bash
   npm run automation:run
   ```

### Network errors

1. Check backend is running on port 5000
2. Check frontend is running on port 3000
3. Verify database is accessible

## CI/CD Integration

For CI pipelines:

```bash
CI=true npm run automation:ci
```

This will:
- Run tests without browser
- Generate HTML + JSON reports
- Exit with proper status code

## Test Coverage

### Current Test Scenarios

1. ✅ Empty credentials validation
2. ✅ Invalid email format handling
3. ✅ Wrong password rejection
4. ✅ Non-existent user rejection
5. ✅ Successful login
6. ✅ Session persistence
7. ✅ Protected pages access
8. ✅ Browser navigation (back/forward)
9. ✅ Logout functionality
10. ✅ Public pages without login
11. ✅ Login verification
12. ✅ Screenshot capture on all steps