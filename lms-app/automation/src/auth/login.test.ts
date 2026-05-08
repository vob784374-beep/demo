import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { StudentDashboardPage } from '../page-objects/student-dashboard.page';

const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'student@test.com';
const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'Test1234!';
const TEST_TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@test.com';
const TEST_TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || 'Test1234!';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Test1234!';

test.describe('Login Feature', () => {
  
  test.beforeEach(async ({ page }: { page: Page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test.describe('TC-001: Login with valid student credentials', () => {
    
    test('TC-001-01: Student can login with valid credentials', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
      await dashboardPage.waitForLoad();
      
      // Verify redirect to student dashboard
      await expect(page).toHaveURL(/student\/dashboard/);
      
      // Verify welcome message or user name is displayed
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
    });

    test('TC-001-02: Student role is displayed correctly after login', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
      await dashboardPage.waitForLoad();
      
      const role = await dashboardPage.getUserRole();
      expect(role?.toLowerCase()).toBe('student');
    });
  });

  test.describe('TC-002: Login with invalid credentials', () => {
    
    test('TC-002-01: Login fails with incorrect password', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, 'WrongPassword123!');
      
      // Should show error message
      const error = await loginPage.getGeneralError();
      expect(error).not.toBeNull();
    });

    test('TC-002-02: Login fails with non-existent email', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login('nonexistent@test.com', TEST_STUDENT_PASSWORD);
      
      // Should show error message
      const error = await loginPage.getGeneralError();
      expect(error).not.toBeNull();
    });

    test('TC-002-03: Login fails with empty email', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login('', TEST_STUDENT_PASSWORD);
      
      // Button should be disabled or show error
      const isDisabled = await loginPage.isLoginButtonDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('TC-002-04: Login fails with empty password', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, '');
      
      // Button should be disabled or show error
      const isDisabled = await loginPage.isLoginButtonDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('TC-003: Login with different roles', () => {
    
    test('TC-003-01: Teacher can login but redirected to teacher dashboard', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login(TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD);
      await page.waitForURL(/teacher\/courses|teacher\/dashboard/);
      
      // Should be redirected to teacher area
      const url = page.url();
      expect(url).toMatch(/teacher/);
    });

    test('TC-003-02: Admin can login but redirected to admin dashboard', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
      await page.waitForURL(/admin\/dashboard/);
      
      // Should be redirected to admin area
      const url = page.url();
      expect(url).toMatch(/admin/);
    });
  });

  test.describe('TC-004: Login page validation', () => {
    
    test('TC-004-01: Login page loads correctly', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      // Verify page loads
      await expect(page).toHaveURL(/system\/auth\/login/);
      
      // Verify form elements exist
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('TC-004-02: Email field accepts input', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.emailInput.fill('test@example.com');
      const value = await loginPage.emailInput.inputValue();
      expect(value).toBe('test@example.com');
    });

    test('TC-004-03: Password field masks input', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.passwordInput.fill('secret123');
      const type = await loginPage.passwordInput.getAttribute('type');
      expect(type).toBe('password');
    });
  });

  test.describe('TC-005: Session persistence', () => {
    
    test('TC-005-01: Student session persists after page reload', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
      await dashboardPage.waitForLoad();
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      const isLoggedIn = await dashboardPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
    });

    test('TC-005-02: Logout clears session', async ({ page }: { page: Page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);
      
      await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
      await dashboardPage.waitForLoad();
      
      // Logout
      await dashboardPage.logout();
      
      // Should redirect to login
      await expect(page).toHaveURL(/system\/auth\/login/);
    });
  });
});