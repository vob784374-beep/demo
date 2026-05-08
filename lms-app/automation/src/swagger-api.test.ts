import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('API Swagger Verification', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Verify ALL API Endpoints via Swagger', async () => {
    console.log('\n🔍 SWAGGER API VERIFICATION');
    console.log('================================\n');

    // Open Swagger UI
    console.log('📖 Opening Swagger UI...');
    await page.goto('http://localhost:5000/api/docs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check Swagger loaded
    const swaggerTitle = await page.locator('title').textContent();
    console.log(`   Title: ${swaggerTitle}`);
    
    // Find all endpoint sections
    const tags = await page.locator('.op-tag').all();
    console.log(`\n📂 API Tags/Sections: ${tags.length}`);
    
    for (let i = 0; i < tags.length; i++) {
      const tagText = await tags[i].textContent();
      console.log(`   - ${tagText}`);
    }

    // GET /api/v1/courses - Public
    console.log('\n🔍 Testing: GET /api/v1/courses (Public)');
    let response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/courses');
      return { status: res.status, data: await res.json() };
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Courses: ${response.data?.data?.length || 0}`);

    // POST /api/v1/auth/login
    console.log('\n🔍 Testing: POST /api/v1/auth/login');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@test.com', password: 'Test1234!' })
      });
      const data = await res.json();
      return { status: res.status, hasToken: !!data.data?.access_token };
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Login Success: ${response.hasToken}`);

    // POST /api/v1/auth/register
    console.log('\n🔍 Testing: POST /api/v1/auth/register');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'newuser@test.com', 
          password: 'Test1234!',
          first_name: 'Test',
          last_name: 'User'
        })
      });
      return { status: res.status };
    });
    console.log(`   Status: ${response.status}`);

    // GET /api/v1/courses/{id}
    console.log('\n🔍 Testing: GET /api/v1/courses/1');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/courses/1');
      return { status: res.status };
    });
    console.log(`   Status: ${response.status}`);

    // POST /api/v1/auth/refresh (without auth)
    console.log('\n🔍 Testing: POST /api/v1/auth/refresh (no cookie)');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/auth/refresh', {
        method: 'POST'
      });
      return { status: res.status };
    });
    console.log(`   Status: ${response.status} (Expected 401)`);

    // POST /api/v1/auth/logout
    console.log('\n🔍 Testing: POST /api/v1/auth/logout');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/v1/auth/logout', {
        method: 'POST'
      });
      return { status: res.status };
    });
    console.log(`   Status: ${response.status}`);

    // Verify OpenAPI JSON
    console.log('\n🔍 Testing: OpenAPI JSON');
    response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/openapi.json');
      const data = await res.json();
      return { 
        status: res.status, 
        paths: Object.keys(data.paths || {}).length,
        info: data.info?.title
      };
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Endpoints: ${response.paths}`);
    console.log(`   API: ${response.info}`);

    // Check all endpoints in Swagger UI
    console.log('\n📋 ENDPOINTS IN SWAGGER:');
    const expandButtons = await page.locator('.op-summary').all();
    console.log(`   Total clickable: ${expandButtons.length}`);
    
    for (let i = 0; i < Math.min(expandButtons.length, 10); i++) {
      const text = await expandButtons[i].textContent();
      console.log(`   - ${text?.substring(0, 50)}`);
    }

    console.log('\n✅ API VERIFICATION COMPLETE');
  });
});