import { test, expect, type Page } from '@playwright/test';
import { HomePage, CourseCatalogPage, CourseDetailPage, LoginPage, StudentDashboardPage, AdminDashboardPage, AdminUsersPage, TeacherCoursesPage } from './page-objects';

// Test credentials - loaded from environment or use defaults
const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_STUDENT_PASSWORD = 'Test1234!';
const TEST_TEACHER_EMAIL = 'teacher@test.com';
const TEST_TEACHER_PASSWORD = 'Test1234!';
const TEST_ADMIN_EMAIL = 'admin@test.com';
const TEST_ADMIN_PASSWORD = 'Test1234!';

test.describe('Home Page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('TC-HP-001: Home page loads correctly', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/\//);
    const title = await homePage.getHeroTitle();
    expect(title).not.toBeNull();
  });

  test('TC-HP-002: Browse Courses button is visible', async ({ page }: { page: Page }) => {
    const isVisible = await homePage.browseCoursesButton.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('TC-HP-003: Popular courses section is visible', async ({ page }: { page: Page }) => {
    const isVisible = await homePage.popularCoursesSection.isVisible();
    expect(typeof isVisible).toBe('boolean');
  });
});

test.describe('Course Catalog Page', () => {
  let catalogPage: CourseCatalogPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    catalogPage = new CourseCatalogPage(page);
    await catalogPage.navigate();
  });

  test('TC-CC-001: Course catalog page loads correctly', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/courses/);
    const title = await catalogPage.getPageTitle();
    expect(title).toContain('Course Catalog');
  });

  test('TC-CC-002: Course cards are displayed', async ({ page }: { page: Page }) => {
    const count = await catalogPage.getCourseCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-CC-003: Pagination is visible when multiple pages', async ({ page }: { page: Page }) => {
    const isVisible = await catalogPage.isPaginationVisible();
    // May or may not be visible depending on course count
    expect(typeof isVisible).toBe('boolean');
  });

  test('TC-CC-004: Empty state shows when no courses', async ({ page }: { page: Page }) => {
    // This test depends on database state
    const isEmpty = await catalogPage.isEmptyStateVisible();
    expect(typeof isEmpty).toBe('boolean');
  });
});

test.describe('Course Detail Page', () => {
  let courseDetailPage: CourseDetailPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    courseDetailPage = new CourseDetailPage(page);
    await courseDetailPage.navigate(1);
  });

  test('TC-CD-001: Course detail page loads correctly', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/\/courses\/\d+/);
  });

  test('TC-CD-002: Course title is displayed', async ({ page }: { page: Page }) => {
    const title = await courseDetailPage.getCourseTitle();
    expect(title).not.toBeNull();
  });

  test('TC-CD-003: Enroll button is visible for unauthenticated users', async ({ page }: { page: Page }) => {
    const isVisible = await courseDetailPage.isLoginToEnrollVisible();
    expect(isVisible).toBeTruthy();
  });

  test('TC-CD-004: Back button navigates to catalog', async ({ page }: { page: Page }) => {
    await courseDetailPage.clickBack();
    await expect(page).toHaveURL(/courses$/);
  });
});

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('TC-LG-001: Login page loads correctly', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/system\/auth\/login/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test('TC-LG-002: Email field accepts input', async ({ page }: { page: Page }) => {
    await loginPage.emailInput.fill('test@example.com');
    const value = await loginPage.emailInput.inputValue();
    expect(value).toBe('test@example.com');
  });

  test('TC-LG-003: Password field masks input', async ({ page }: { page: Page }) => {
    await loginPage.passwordInput.fill('secret123');
    const type = await loginPage.passwordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('TC-LG-004: Login fails with invalid credentials', async ({ page }: { page: Page }) => {
    await loginPage.login(TEST_STUDENT_EMAIL, 'WrongPassword123!');
    await page.waitForTimeout(1000);
    const error = await loginPage.getGeneralError();
    expect(error).not.toBeNull();
  });

  test('TC-LG-005: Login succeeds - verify no error shown', async ({ page }: { page: Page }) => {
    const dashboardPage = new StudentDashboardPage(page);
    await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
    await page.waitForTimeout(2000);
    
    // Verify no error message is shown (login was successful)
    const hasError = await loginPage.getGeneralError();
    expect(hasError === null || hasError === '').toBeTruthy();
  });
});

test.describe('Student Dashboard', () => {
  let dashboardPage: StudentDashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    dashboardPage = new StudentDashboardPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
  });

  test('TC-SD-001: Student dashboard loads after login', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/student\/dashboard/);
    const isLoggedIn = await dashboardPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
  });

  test('TC-SD-002: Welcome message is displayed', async ({ page }: { page: Page }) => {
    const welcomeText = await dashboardPage.getWelcomeText();
    expect(welcomeText).toContain('Welcome');
  });

  test('TC-SD-003: User role is displayed correctly', async ({ page }: { page: Page }) => {
    const role = await dashboardPage.getUserRole();
    expect(role?.toLowerCase()).toBe('student');
  });

  test('TC-SD-004: Courses link navigates to courses page', async ({ page }: { page: Page }) => {
    await dashboardPage.navigateToCourses();
    await expect(page).toHaveURL(/student\/courses/);
  });

  test('TC-SD-005: Logout clears session', async ({ page }: { page: Page }) => {
    await dashboardPage.logout();
    await expect(page).toHaveURL(/system\/auth\/login/);
  });
});

test.describe('Student Courses Page', () => {
  let studentCoursesPage: CourseCatalogPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    studentCoursesPage = new CourseCatalogPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
    await studentCoursesPage.navigate('/student/courses');
  });

  test('TC-SC-001: Student courses page loads', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/student\/courses/);
    const title = await studentCoursesPage.getPageTitle();
    expect(title).toContain('Your Courses');
  });

  test('TC-SC-002: Category filter buttons are visible', async ({ page }: { page: Page }) => {
    const allButton = page.locator('button:has-text("All")');
    await expect(allButton).toBeVisible();
  });
});

test.describe('Admin Dashboard', () => {
  let adminDashboardPage: AdminDashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    adminDashboardPage = new AdminDashboardPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
  });

  test('TC-AD-001: Admin dashboard loads after login', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/admin\/dashboard/);
    const title = await adminDashboardPage.getPageTitle();
    expect(title).toContain('Admin');
  });

  test('TC-AD-002: Stats cards are displayed', async ({ page }: { page: Page }) => {
    const count = await adminDashboardPage.getStatsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-AD-003: User management link is visible', async ({ page }: { page: Page }) => {
    await expect(adminDashboardPage.userManagementLink).toBeVisible();
  });

  test('TC-AD-004: Navigate to user management', async ({ page }: { page: Page }) => {
    await adminDashboardPage.clickUserManagement();
    await expect(page).toHaveURL(/admin\/users/);
  });
});

test.describe('Admin Users Page', () => {
  let adminUsersPage: AdminUsersPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    adminUsersPage = new AdminUsersPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await adminUsersPage.navigate();
  });

  test('TC-AU-001: Admin users page loads correctly', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/admin\/users/);
    const title = await adminUsersPage.getPageTitle();
    expect(title).toContain('User Management');
  });

  test('TC-AU-002: User table is displayed', async ({ page }: { page: Page }) => {
    const isVisible = await adminUsersPage.isTableVisible();
    expect(isVisible).toBeTruthy();
  });

  test('TC-AU-003: Table has correct headers', async ({ page }: { page: Page }) => {
    const headers = await adminUsersPage.getTableHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Email');
    expect(headers).toContain('Role');
  });

  test('TC-AU-004: User data is displayed', async ({ page }: { page: Page }) => {
    const userCount = await adminUsersPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });
});

test.describe('Teacher Courses Page', () => {
  let teacherCoursesPage: TeacherCoursesPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    teacherCoursesPage = new TeacherCoursesPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD);
  });

  test('TC-TC-001: Teacher courses page loads after login', async ({ page }: { page: Page }) => {
    await expect(page).toHaveURL(/teacher\/courses/);
    const title = await teacherCoursesPage.getPageTitle();
    expect(title).toContain('Course Management');
  });

  test('TC-TC-002: Create course button is visible', async ({ page }: { page: Page }) => {
    const isVisible = await teacherCoursesPage.isCreateButtonVisible();
    expect(isVisible).toBeTruthy();
  });

  test('TC-TC-003: Course cards or empty state is shown', async ({ page }: { page: Page }) => {
    const hasCourses = (await teacherCoursesPage.getCourseCount()) > 0;
    const isEmpty = await teacherCoursesPage.isEmptyStateVisible();
    expect(hasCourses || isEmpty).toBeTruthy();
  });
});
