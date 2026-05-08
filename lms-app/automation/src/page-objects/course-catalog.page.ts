import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class CourseCatalogPage extends BasePage {
  readonly pageTitle: Locator;
  readonly courseList: Locator;
  readonly courseCards: Locator;
  readonly pagination: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly pageInfo: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.courseList = page.locator('[class*="grid"]');
    this.courseCards = page.locator('[class*="grid"] > div');
    this.pagination = page.locator('nav[aria-label="Pagination"]');
    this.previousButton = page.locator('text=Previous');
    this.nextButton = page.locator('text=Next');
    this.pageInfo = page.locator('nav[aria-label="Pagination"] span');
    this.emptyState = page.locator('text=No courses available');
  }

  async navigate(pageNum?: number): Promise<void> {
    const path = pageNum ? `/courses?page=${pageNum}` : '/courses';
    await super.navigate(path);
  }

  async getPageTitle(): Promise<string | null> {
    return this.pageTitle.textContent();
  }

  async getCourseCount(): Promise<number> {
    return this.courseCards.count();
  }

  async isPaginationVisible(): Promise<boolean> {
    return this.pagination.isVisible();
  }

  async clickNextPage(): Promise<void> {
    await this.nextButton.click();
  }

  async clickPreviousPage(): Promise<void> {
    await this.previousButton.click();
  }

  async getPageInfo(): Promise<string | null> {
    return this.pageInfo.textContent();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  async clickCourseCard(index: number): Promise<void> {
    await this.courseCards.nth(index).click();
  }
}