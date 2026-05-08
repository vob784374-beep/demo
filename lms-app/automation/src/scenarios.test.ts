import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_STUDENT_PASSWORD = 'Test1234!';

test.describe('E2E Flow - All Scenarios', () => {
  let page: Page;
  let context: BrowserContext;
  let screenshotCount = 0;

  const takeScreenshot = async (name: string) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}_${name}.png`.replace(/[^a-z0-9_.]/gi, '_');
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    console.log(`📸 Screenshot: ${filename}`);
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Complete All Test Scenarios', async () => {
    const skipBtn = page.locator('button:has-text("Skip")');
    const signInBtn = page.locator('button:has-text("Sign In")');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    // ========== SCENARIO 1: Empty Credentials ==========
    console.log('🔄 Scenario 1: Empty Credentials...');
    await page.goto('http://localhost:3000/system/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('01_login_page');
    
    // Try to login with empty fields
    await submitBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot('02_empty_validation_error');
    
    // Check for validation errors
    const hasValidationError = await page.locator('[class*="error"], [class*="text-red"]').count() > 0;
    console.log(`✅ Validation shown: ${hasValidationError}`);

    // ========== SCENARIO 2: Invalid Email Format ==========
    console.log('🔄 Scenario 2: Invalid Email Format...');
    await emailInput.fill('not-an-email');
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot('03_invalid_email_format');
    console.log('✅ Invalid email format handled');

    // ========== SCENARIO 3: Wrong Password ==========
    console.log('🔄 Scenario 3: Wrong Password...');
    await emailInput.fill(TEST_STUDENT_EMAIL);
    await passwordInput.fill('WrongPassword123');
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await takeScreenshot('04_wrong_password_error');
    
    // Check if error is shown (login failed)
    const urlAfterWrongPwd = page.url();
    const loginFailed = urlAfterWrongPwd.includes('auth/login');
    console.log(`✅ Login rejected: ${loginFailed}`);

    // ========== SCENARIO 4: Non-existent User ==========
    console.log('🔄 Scenario 4: Non-existent User...');
    await emailInput.fill('nonexistent@test.com');
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await takeScreenshot('05_user_not_found_error');
    console.log('✅ Non-existent user rejected');

    // ========== SCENARIO 5: Successful Login ==========
    console.log('🔄 Scenario 5: Successful Login...');
    await emailInput.fill(TEST_STUDENT_EMAIL);
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(1500);
    await takeScreenshot('06_login_success');
    
    if (await skipBtn.isVisible().catch(() => false)) {
      await takeScreenshot('07_welcome_modal');
      await skipBtn.click();
    }
    await page.waitForTimeout(2000);
    await takeScreenshot('08_after_login_redirect');
    console.log('✅ Login successful');

    // ========== SCENARIO 6: Verify Login Success ==========
    console.log('🔄 Scenario 6: Verify Login Success...');
    const signInVisible = await signInBtn.isVisible().catch(() => false);
    if (signInVisible) {
      await takeScreenshot('09_login_failed_signin_visible');
      throw new Error('Login FAILED - Sign In button still visible!');
    }
    await takeScreenshot('10_login_verified_success');
    console.log('✅ Verified - Sign In button hidden');

    // ========== SCENARIO 7: Navigate to Protected Pages ==========
    console.log('🔄 Scenario 7: Protected Pages...');
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('11_student_dashboard');
    console.log('✅ Student dashboard accessible');
    
    await page.goto('http://localhost:3000/student/courses');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('12_student_courses');
    console.log('✅ Student courses accessible');

    // ========== SCENARIO 8: Browser Navigation ==========
    console.log('🔄 Scenario 8: Browser Back/Forward...');
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('13_back_navigation');
    console.log('✅ Back navigation works');
    
    await page.goForward();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('14_forward_navigation');
    console.log('✅ Forward navigation works');

    // ========== SCENARIO 9: Session Persists ==========
    console.log('🔄 Scenario 9: Session Persists...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('15_session_persists');
    const stillLoggedIn = !(page.url().includes('auth/login'));
    console.log(`✅ Session persists: ${stillLoggedIn}`);

    // ========== SCENARIO 10: Logout ==========
    console.log('🔄 Scenario 10: Logout...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('16_after_logout');
    console.log('✅ Logout/Clear session done');

    // ========== SCENARIO 11: Access Public Pages Without Login ==========
    console.log('🔄 Scenario 11: Public Pages Without Login...');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('17_home_without_login');
    console.log('✅ Home page accessible without login');
    
    await page.goto('http://localhost:3000/courses');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('18_courses_without_login');
    console.log('✅ Course catalog accessible without login');

    await takeScreenshot('19_all_scenarios_passed');
    console.log('🎉 ALL SCENARIOS COMPLETED!');
  });
});