import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AdminUsersPage extends BasePage {
  readonly pageTitle: Locator;
  readonly description: Locator;
  readonly userTable: Locator;
  readonly tableHeaders: Locator;
  readonly userRows: Locator;
  readonly nameColumn: Locator;
  readonly emailColumn: Locator;
  readonly roleColumn: Locator;
  readonly statusColumn: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.description = page.locator('p:text-muted').first();
    this.userTable = page.locator('table');
    this.tableHeaders = page.locator('th');
    this.userRows = page.locator('tbody tr');
    this.nameColumn = page.locator('th:text("Name")');
    this.emailColumn = page.locator('th:text("Email")');
    this.roleColumn = page.locator('th:text("Role")');
    this.statusColumn = page.locator('th:text("Status")');
  }

  async navigate(): Promise<void> {
    await super.navigate('/admin/users');
  }

  async getPageTitle(): Promise<string | null> {
    return this.pageTitle.textContent();
  }

  async getUserCount(): Promise<number> {
    return this.userRows.count();
  }

  async getTableHeaders(): Promise<string[]> {
    const count = await this.tableHeaders.count();
    const headers: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.tableHeaders.nth(i).textContent();
      if (text) headers.push(text);
    }
    return headers;
  }

  async isTableVisible(): Promise<boolean> {
    return this.userTable.isVisible();
  }
}