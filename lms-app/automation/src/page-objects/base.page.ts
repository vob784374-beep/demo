import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  }

  async navigate(path: string): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  protected async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  protected async isEnabled(selector: string): Promise<boolean> {
    return this.page.locator(selector).isEnabled();
  }
}