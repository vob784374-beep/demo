import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AdminDashboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly totalCourses: Locator;
  readonly totalStudents: Locator;
  readonly totalTeachers: Locator;
  readonly totalEnrollments: Locator;
  readonly managementSection: Locator;
  readonly userManagementLink: Locator;
  readonly courseManagementLink: Locator;
  readonly reportsLink: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.welcomeMessage = page.locator('text=LMS System Management');
    this.statsCards = page.locator('[class*="grid"] > div');
    this.totalCourses = page.locator('text=Courses').first();
    this.totalStudents = page.locator('text=Students').first();
    this.totalTeachers = page.locator('text=Teachers').first();
    this.totalEnrollments = page.locator('text=Enrollments').first();
    this.managementSection = page.locator('text=Management');
    this.userManagementLink = page.locator('a[href*="/admin/users"]');
    this.courseManagementLink = page.locator('a[href*="/admin/courses"]');
    this.reportsLink = page.locator('a[href*="/admin/reports"]');
  }

  async navigate(): Promise<void> {
    await super.navigate('/admin/dashboard');
  }

  async getPageTitle(): Promise<string | null> {
    return this.pageTitle.textContent();
  }

  async getStatsCount(): Promise<number> {
    return this.statsCards.count();
  }

  async clickUserManagement(): Promise<void> {
    await this.userManagementLink.click();
  }

  async clickCourseManagement(): Promise<void> {
    await this.courseManagementLink.click();
  }
}