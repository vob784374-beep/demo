# LMS App - Automation Test Suite

## Overview
This folder contains Playwright-based automation tests for the LMS application. Tests are designed for production-ready quality assurance with clear test cases and comprehensive coverage.

## Architecture

```
automation/
├── src/
│   ├── page-objects/     # Page Object Model
│   │   ├── base.page.ts
│   │   ├── login.page.ts
│   │   ├── student-dashboard.page.ts
│   │   └── index.ts
│   └── auth/
│       └── login.test.ts  # Login test cases
├── playwright.config.ts    # Playwright configuration
├── package.json
├── .env.test          # Test environment variables
└── README.md
```

## Test Cases Structure

### Login Feature (TC-001 to TC-005)

| Test ID | Description |
|--------|------------|
| TC-001 | Login with valid student credentials |
| TC-001-01 | Student can login with valid credentials |
| TC-001-02 | Student role is displayed correctly after login |
| TC-002 | Login with invalid credentials |
| TC-002-01 | Login fails with incorrect password |
| TC-002-02 | Login fails with non-existent email |
| TC-002-03 | Login fails with empty email |
| TC-002-04 | Login fails with empty password |
| TC-003 | Login with different roles |
| TC-003-01 | Teacher can login but redirected to teacher dashboard |
| TC-003-02 | Admin can login but redirected to admin dashboard |
| TC-004 | Login page validation |
| TC-004-01 | Login page loads correctly |
| TC-004-02 | Email field accepts input |
| TC-004-03 | Password field masks input |
| TC-005 | Session persistence |
| TC-005-01 | Student session persists after page reload |
| TC-005-02 | Logout clears session |

## Environment Configuration

Create `.env.test` file:

```env
APP_ENV=test
TEST_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
TEST_STUDENT_EMAIL=student@test.com
TEST_STUDENT_PASSWORD=Test1234!
TEST_TEACHER_EMAIL=teacher@test.com
TEST_TEACHER_PASSWORD=Test1234!
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=Test1234!
```

## Running Tests

### Install dependencies
```bash
cd automation
npm install
```

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test src/auth/login.test.ts
```

### Run with UI
```bash
npx playwright test --ui
```

### Run specific test case
```bash
npx playwright test --grep "TC-001-01"
```

### Generate report
```bash
npx playwright show-report
```

## App ID Configuration

The application base URL is configured per environment:

| Environment | URL |
|-------------|-----|
| development | http://localhost:3000 |
| staging | http://localhost:3000 |
| production | https://lms.example.com |

Override with `TEST_BASE_URL` environment variable.

## Test Data

Test credentials are loaded from environment variables in `.env.test`:

- **Student**: student@test.com / Test1234!
- **Teacher**: teacher@test.com / Test1234!
- **Admin**: admin@test.com / Test1234!

## CI/CD Integration

For CI pipelines:
```bash
CI=true npx playwright test --reporter=html,json
```

## Adding New Tests

1. Create page object in `src/page-objects/` if needed
2. Add test cases to appropriate test file in `src/`
3. Follow naming convention: `TC-XXX-YY: Description`
4. Include clear assertions and error messages