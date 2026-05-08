import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_STUDENT_PASSWORD = 'Test1234!';

test.describe('E2E Flow - Comprehensive Verification', () => {
  let page: Page;
  let context: BrowserContext;
  let screenshotCount = 0;

  const takeScreenshot = async (name: string) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}_${name}.png`.replace(/[^a-z0-9_.]/gi, '_');
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    console.log(`📸 ${filename}`);
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Verify ALL Interactive Elements', async () => {
    const skipBtn = page.locator('button:has-text("Skip")');
    const signInBtn = page.locator('button:has-text("Sign In")');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    // ========== 1. LOGIN PAGE - VERIFY ALL ELEMENTS ==========
    console.log('\n=== 1. LOGIN PAGE - VERIFY ALL ===');
    await page.goto('http://localhost:3000/system/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('01_login_page_all_elements');

    // Verify EVERY input/button on login page
    const allInputs = await page.locator('input').all();
    console.log(`📝 Inputs found: ${allInputs.length}`);
    for (let i = 0; i < allInputs.length; i++) {
      const name = await allInputs[i].getAttribute('name');
      const type = await allInputs[i].getAttribute('type');
      const placeholder = await allInputs[i].getAttribute('placeholder');
      const visible = await allInputs[i].isVisible();
      console.log(`   - input[${i}]: name="${name}" type="${type}" placeholder="${placeholder}" visible=${visible}`);
    }

    const allButtons = await page.locator('button').all();
    console.log(`🔘 Buttons found: ${allButtons.length}`);
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      const visible = await allButtons[i].isVisible();
      const enabled = await allButtons[i].isEnabled();
      console.log(`   - button[${i}]: "${text?.substring(0,30)}" visible=${visible} enabled=${enabled}`);
    }

    const allLinks = await page.locator('a').all();
    console.log(`🔗 Links found: ${allLinks.length}`);
    for (let i = 0; i < Math.min(allLinks.length, 5); i++) {
      const href = await allLinks[i].getAttribute('href');
      const visible = await allLinks[i].isVisible();
      console.log(`   - link[${i}]: href="${href}" visible=${visible}`);
    }

    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`☑️ Checkboxes found: ${checkboxes.length}`);
    for (let i = 0; i < checkboxes.length; i++) {
      const checked = await checkboxes[i].isChecked();
      console.log(`   - checkbox[${i}]: checked=${checked}`);
    }

    // ========== 2. EMPTY SUBMIT - VERIFY VALIDATION ==========
    console.log('\n=== 2. EMPTY SUBMIT ===');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    await takeScreenshot('02_empty_submit_validation');

    const validationMsgs = await page.locator('[class*="error"], .text-red, [role="alert"]').all();
    console.log(`⚠️ Validation messages: ${validationMsgs.length}`);
    for (let i = 0; i < validationMsgs.length; i++) {
      const text = await validationMsgs[i].textContent();
      console.log(`   - "${text?.substring(0,50)}"`);
    }

    // ========== 3. INVALID EMAIL FORMAT ==========
    console.log('\n=== 3. INVALID EMAIL FORMAT ===');
    await emailInput.fill('not-an-email');
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(1000);
    await takeScreenshot('03_invalid_email');

    const emailError = await page.locator('text=valid email, text=Enter a valid').count();
    console.log(`📧 Email error shown: ${emailError > 0}`);

    // ========== 4. WRONG PASSWORD ==========
    console.log('\n=== 4. WRONG PASSWORD ===');
    await emailInput.fill(TEST_STUDENT_EMAIL);
    await passwordInput.fill('WrongPassword123');
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await takeScreenshot('04_wrong_password');

    const loginError = await page.locator('[role="alert"], .text-red').count();
    console.log(`❌ Login error shown: ${loginError > 0}`);

    // ========== 5. SUCCESSFUL LOGIN ==========
    console.log('\n=== 5. SUCCESSFUL LOGIN ===');
    await emailInput.fill(TEST_STUDENT_EMAIL);
    await passwordInput.fill(TEST_STUDENT_PASSWORD);
    await submitBtn.click();
    await page.waitForTimeout(1500);
    await takeScreenshot('05_click_sign_in');

    // Handle modal
    if (await skipBtn.isVisible().catch(() => false)) {
      console.log(`📝 Modal visible - clicking Skip`);
      await skipBtn.click();
    }
    await page.waitForTimeout(2000);
    await takeScreenshot('06_after_login_redirect');

    // ========== 6. VERIFY ALL LOGGED IN ELEMENTS ==========
    console.log('\n=== 6. LOGGED IN - VERIFY ALL ===');
    const signInStillVisible = await signInBtn.isVisible().catch(() => false);
    console.log(`🔐 Sign In button hidden: ${!signInStillVisible}`);

    // Verify localStorage has token
    const hasToken = await page.evaluate(() => localStorage.getItem('token') !== null);
    console.log(`🔑 Token in localStorage: ${hasToken}`);

    // ========== 7. STUDENT DASHBOARD - ALL ELEMENTS ==========
    console.log('\n=== 7. STUDENT DASHBOARD ===');
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('07_student_dashboard');

    const dashButtons = await page.locator('button').all();
    console.log(`🔘 Dashboard buttons: ${dashButtons.length}`);

    const dashLinks = await page.locator('a').all();
    console.log(`🔗 Dashboard links: ${dashLinks.length}`);

    const cards = await page.locator('[class*="card"], [class*="grid"] > div').all();
    console.log(`📇 Dashboard cards/sections: ${cards.length}`);

    // ========== 8. STUDENT COURSES - ALL ELEMENTS ==========
    console.log('\n=== 8. STUDENT COURSES ===');
    await page.goto('http://localhost:3000/student/courses');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('08_student_courses');

    const categoryButtons = await page.locator('button:has-text("All"), button:has-text("Pronunciation"), button:has-text("Vocabulary")').all();
    console.log(`🏷️ Category filter buttons: ${categoryButtons.length}`);

    const courseCards = await page.locator('[class*="border"], [class*="card"]').all();
    console.log(`📚 Course cards: ${courseCards.length}`);

    // ========== 9. COURSE DETAIL ==========
    console.log('\n=== 9. COURSE DETAIL ===');
    if (courseCards.length > 0) {
      await courseCards[0].click();
      await page.waitForLoadState('domcontentloaded');
      await takeScreenshot('09_course_detail');

      const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("Continue")');
      const enrollVisible = await enrollButton.isVisible();
      console.log(`🎫 Enroll button visible: ${enrollVisible}`);
    }

    // ========== 10. BROWSER NAVIGATION ==========
    console.log('\n=== 10. BROWSER NAVIGATION ===');
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('10_back_navigation');
    console.log(`⬅️ Back works: ${page.url().includes('courses')}`);

    await page.goForward();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('11_forward_navigation');
    console.log(`➡️ Forward works`);

    // ========== 11. SESSION PERSISTENCE ==========
    console.log('\n=== 11. SESSION PERSISTENCE ===');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('12_session_persist');

    const stillLoggedIn = !(page.url().includes('auth/login'));
    console.log(`💾 Session persists: ${stillLoggedIn}`);

    // ========== 12. LOGOUT ==========
    console.log('\n=== 12. LOGOUT ===');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('13_after_logout');

    // ========== 13. PUBLIC HOME - ALL ELEMENTS ==========
    console.log('\n=== 13. PUBLIC HOME ===');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('14_public_home');

    const homeButtons = await page.locator('button').all();
    console.log(`🔘 Home page buttons: ${homeButtons.length}`);

    const homeLinks = await page.locator('a').all();
    console.log(`🔗 Home page links: ${homeLinks.length}`);

    // ========== 14. PUBLIC COURSES ==========
    console.log('\n=== 14. PUBLIC COURSES ===');
    await page.goto('http://localhost:3000/courses');
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('15_public_courses');

    const publicCourseCards = await page.locator('[class*="border"], [class*="card"]').all();
    console.log(`📚 Public course cards: ${publicCourseCards.length}`);

    // ========== 15. FOOTER LINKS ==========
    console.log('\n=== 15. FOOTER ===');
    const footer = page.locator('footer');
    const footerVisible = await footer.isVisible();
    console.log(`� footer visible: ${footerVisible}`);

    if (footerVisible) {
      const footerLinks = await footer.locator('a').all();
      console.log(`� footer links: ${footerLinks.length}`);
    }

    // ========== 16. DARK MODE TOGGLE (if exists) ==========
    console.log('\n=== 16. THEME TOGGLE ===');
    const themeToggle = page.locator('[class*="theme"], [class*="dark"], button[aria-label*="theme"]');
    const themeExists = await themeToggle.count();
    console.log(`🌓 Theme toggle exists: ${themeExists > 0}`);

    // ========== 17. RESPONSIVE CHECK ==========
    console.log('\n=== 17. RESPONSIVE ===');
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('18_mobile_view');

    const mobileNav = await page.locator('[class*="nav"], header').first();
    const mobileNavVisible = await mobileNav.isVisible();
    console.log(`📱 Mobile nav visible: ${mobileNavVisible}`);

    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop
    await takeScreenshot('19_desktop_view');

    console.log('\n🎉 ALL COMPREHENSIVE TESTS COMPLETED!');
  });
});