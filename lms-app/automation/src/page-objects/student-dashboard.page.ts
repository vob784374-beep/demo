import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class StudentDashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly coursesLink: Locator;
  readonly logoutButton: Locator;
  readonly userName: Locator;
  readonly userRole: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('h1:has-text("Welcome")');
    this.coursesLink = page.locator('a[href*="/student/courses"]');
    this.logoutButton = page.locator('button:has-text("Logout")');
    this.userName = page.locator('[class*="font-semibold"]').first();
    this.userRole = page.locator('[class*="text-xs"]');
  }

  async navigate(): Promise<void> {
    await super.navigate('/student/dashboard');
  }

  async getWelcomeText(): Promise<string | null> {
    try {
      return await this.welcomeMessage.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const welcome = await this.getWelcomeText();
    return welcome !== null;
  }

  async getUserName(): Promise<string | null> {
    try {
      return await this.userName.textContent();
    } catch {
      return null;
    }
  }

  async getUserRole(): Promise<string | null> {
    try {
      return await this.userRole.textContent();
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async navigateToCourses(): Promise<void> {
    await this.coursesLink.click();
  }

  async isCourseCardVisible(index: number = 0): Promise<boolean> {
    const card = this.page.locator('[class*="grid"] > div').nth(index);
    try {
      return await card.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  async getCourseCount(): Promise<number> {
    const cards = this.page.locator('[class*="grid"] > div');
    return await cards.count();
  }
}