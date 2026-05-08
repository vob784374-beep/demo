import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_STUDENT_PASSWORD = 'Test1234!';

test.describe('UI Change Detection', () => {
  let page: Page;
  let context: BrowserContext;
  let screenshotCount = 0;

  const takeSnapshot = async (name: string) => {
    screenshotCount++;
    const currentDir = 'test-results/current';
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }
    const filename = `${String(screenshotCount).padStart(3, '0')}_${name}.png`.replace(/[^a-z0-9_.]/gi, '_');
    await page.screenshot({ path: `${currentDir}/${filename}`, fullPage: true });
    console.log(`📸 ${filename}`);
    return filename;
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Detect ALL UI Changes', async () => {
    const changes: {page: string, element: string, type: string, details: string}[] = [];
    const changesFile = 'test-results/ui-changes.json';

    console.log('\n🔍 UI CHANGE DETECTION');

    // CHECK 1: Login Page Elements
    console.log('\n🔍 Login Page');
    await page.goto('http://localhost:3000/system/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await takeSnapshot('login_page');
    
    const loginInputs = await page.locator('input').count();
    const loginButtons = await page.locator('button').count();
    console.log(`   Elements: ${loginInputs} inputs, ${loginButtons} buttons`);
    
    if (loginInputs !== 3) {
      changes.push({ page: 'login', element: 'inputs', type: 'COUNT', details: `Expected 3, found ${loginInputs}` });
    }

    // CHECK 2: Login Validation
    console.log('\n🔍 Login Validation');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    await takeSnapshot('login_validation');
    const validationErrors = await page.locator('[class*="error"]').count();
    console.log(`   Errors: ${validationErrors}`);

    // CHECK 3: Login Flow
    console.log('\n🔍 Login');
    await page.goto('http://localhost:3000/system/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input[type="email"]').fill(TEST_STUDENT_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_STUDENT_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await takeSnapshot('after_login');
    
    const skipBtn = page.locator('button:has-text("Skip")');
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }
    await page.waitForTimeout(1000);
    await takeSnapshot('login_redirected');
    
    const afterUrl = page.url();
    console.log(`   Redirect: ${afterUrl}`);

    // CHECK 4: Dashboard
    console.log('\n🔍 Student Dashboard');
    await page.goto('http://localhost:3000/student/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await takeSnapshot('student_dashboard');
    
    const dashHeadings = await page.locator('h1, h2, h3').count();
    const dashCards = await page.locator('[class*="card"]').count();
    console.log(`   Elements: ${dashHeadings} headings, ${dashCards} cards`);

    // CHECK 5: Courses
    console.log('\n🔍 Student Courses');
    await page.goto('http://localhost:3000/student/courses');
    await page.waitForLoadState('domcontentloaded');
    await takeSnapshot('student_courses');
    
    const filters = await page.locator('button').count();
    const courses = await page.locator('[class*="border"]').count();
    console.log(`   Filters: ${filters}, Courses: ${courses}`);

    // CHECK 6: Public Home
    console.log('\n🔍 Public Home');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await takeSnapshot('public_home');
    
    const hero = await page.locator('h1').count();
    console.log(`   Hero: ${hero}`);

    // CHECK 7: Responsive
    console.log('\n🔍 Responsive');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await takeSnapshot('mobile_375px');
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await takeSnapshot('desktop_1280px');

    // REPORT
    console.log('\n📊 CHANGE REPORT');
    if (changes.length === 0) {
      console.log('🎉 NO CHANGES');
    } else {
      console.log(`⚠️  ${changes.length} changes:`);
      changes.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.page} > ${c.element}: ${c.details}`);
      });
      fs.writeFileSync(changesFile, JSON.stringify({ timestamp: new Date().toISOString(), changes }, null, 2));
    }
    console.log('');
  });
});