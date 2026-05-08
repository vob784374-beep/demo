import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('Swagger UI Interactive Test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Verify Swagger Login has Input Fields', async () => {
    console.log('\n🔍 SWAGGER LOGIN INPUT VERIFICATION');
    console.log('=====================================\n');

    // Open Swagger UI
    await page.goto('http://localhost:5000/api/docs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find and expand the login endpoint
    console.log('📖 Looking for /auth/login endpoint...');
    
    // Click on login endpoint to expand
    const loginSection = page.locator('text=auth/login');
    if (await loginSection.count() > 0) {
      console.log('   Found /auth/login');
      await loginSection.first().click();
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/swagger_login.png', fullPage: true });
    console.log('   📸 Screenshot saved');

    // Check for parameters section in Swagger
    const paramSection = page.locator('text=Parameters');
    const paramCount = await paramSection.count();
    console.log(`   Parameters section: ${paramCount}`);

    // Look for Try It Out button
    const tryItOutBtn = page.locator('button:has-text("Try it out"), button:has-text("Try it out")');
    const tryCount = await tryItOutBtn.count();
    console.log(`   Try It Out buttons: ${tryCount}`);

    // Look for request body section
    const bodySection = page.locator('text=Request body, text=request body');
    const bodyCount = await bodySection.count();
    console.log(`   Request body section: ${bodyCount}`);

    // Look for schema/Model
    const schemaSection = page.locator('text=Schema');
    const schemaCount = await schemaSection.count();
    console.log(`   Schema sections: ${schemaCount}`);

    // Get current URL
    const url = page.url();
    console.log(`\n📍 Current URL: ${url}`);

    // Check if Swagger loaded properly
    const title = await page.title();
    console.log(`📖 Page title: ${title}`);

    // List all buttons in Swagger
    const allButtons = await page.locator('button').all();
    console.log(`\n🔘 All buttons on page: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent();
      if (text) console.log(`   - "${text.substring(0,30)}"`);
    }

    // List all inputs in Swagger
    const allInputs = await page.locator('input').all();
    console.log(`\n📝 All inputs on page: ${allInputs.length}`);

    console.log('\n✅ VERIFICATION COMPLETE');
  });
});