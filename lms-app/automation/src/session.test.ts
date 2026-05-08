import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_STUDENT_PASSWORD = 'Test1234!';

test.describe('E2E Flow - Single Browser Session', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Complete Student User Flow', async () => {
    const skipBtn = page.locator('button:has-text("Skip")');
    const signInBtn = page.locator('button:has-text("Sign In")');

    // ========== 1. HOME PAGE ==========
    console.log('🔄 1. Testing Home Page...');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible();
    console.log('✅ Home Page loaded');

    // ========== 2. LOGIN PAGE ==========
    console.log('🔄 2. Testing Login Page...');
    await page.goto('http://localhost:3000/system/auth/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    console.log('✅ Login page elements visible');

    // ========== 3. STUDENT LOGIN ==========
    console.log('🔄 3. Student Login...');
    await emailInput.fill(TEST_STUDENT_EMAIL);
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(1500);
    
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }
    
    // Wait for redirect after login
    await page.waitForTimeout(2000);
    console.log('✅ Student logged in');

    // ========== 4. VERIFY LOGIN SUCCESS ==========
    console.log('🔄 4. Verify Login Success...');
    // Go to a protected page that requires auth
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // Check if still on login page (login failed)
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('auth/login');
    
    if (isLoginPage) {
      // Login might have failed, check for error
      const hasError = await page.locator('[class*="error"], [role="alert"]').count();
      throw new Error(`Login failed! Still on login page. Errors found: ${hasError}`);
    }
    
    // Verify "Sign In" button is NOT visible anymore (logged in)
    const signInVisible = await signInBtn.isVisible().catch(() => false);
    if (signInVisible) {
      throw new Error('Login FAILED - Sign In button still visible after login!');
    }
    console.log('✅ Login verified - Sign In button hidden');

    // ========== 5. STUDENT DASHBOARD ==========
    console.log('🔄 5. Student Dashboard...');
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Student dashboard loaded');

    // ========== 6. STUDENT COURSES ==========
    console.log('🔄 6. Student Courses...');
    await page.goto('http://localhost:3000/student/courses');
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Student courses page loaded');

    // ========== 7. PUBLIC COURSE CATALOG ==========
    console.log('🔄 7. Course Catalog...');
    await page.goto('http://localhost:3000/courses');
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Course catalog loaded');

    console.log('🎉 ALL STUDENT TESTS COMPLETED IN SINGLE BROWSER SESSION!');
  });
});
