import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly browseCoursesButton: Locator;
  readonly popularCoursesSection: Locator;
  readonly viewAllButton: Locator;
  readonly courseCards: Locator;
  readonly featuresSection: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    super(page);
    this.heroTitle = page.locator('h1').first();
    this.heroDescription = page.locator('p').first();
    this.browseCoursesButton = page.locator('a[href="/student/courses"] button, a[href="/student/courses"]').first();
    this.popularCoursesSection = page.locator('text=Popular courses');
    this.viewAllButton = page.locator('text=View all').first();
    this.courseCards = page.locator('[class*="grid"] > div[class*="border"]');
    this.featuresSection = page.locator('section').nth(2);
    this.footer = page.locator('footer');
  }

  async navigate(): Promise<void> {
    await super.navigate('/');
  }

  async getHeroTitle(): Promise<string | null> {
    return this.heroTitle.textContent();
  }

  async clickBrowseCourses(): Promise<void> {
    await this.browseCoursesButton.click();
  }

  async clickViewAllCourses(): Promise<void> {
    await this.viewAllButton.click();
  }

  async getCourseCardCount(): Promise<number> {
    return this.courseCards.count();
  }

  async isFeatureVisible(index: number): Promise<boolean> {
    const features = this.page.locator('[class*="grid"] [class*="text-center"]');
    return features.nth(index).isVisible();
  }

  async getFooterText(): Promise<string | null> {
    return this.footer.textContent();
  }
}