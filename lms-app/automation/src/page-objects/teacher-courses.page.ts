import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TeacherCoursesPage extends BasePage {
  readonly pageTitle: Locator;
  readonly description: Locator;
  readonly createCourseButton: Locator;
  readonly courseCards: Locator;
  readonly emptyState: Locator;
  readonly firstCourseCard: Locator;
  readonly editButton: Locator;
  readonly lessonsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.description = page.locator('p:text-muted').first();
    this.createCourseButton = page.locator('button:has-text("Create New Course")');
    this.courseCards = page.locator('[class*="grid"] > div');
    this.emptyState = page.locator("text=You don't have any courses yet");
    this.firstCourseCard = this.courseCards.first();
    this.editButton = page.locator('button:has-text("Edit")').first();
    this.lessonsButton = page.locator('button:has-text("Lessons")').first();
  }

  async navigate(): Promise<void> {
    await super.navigate('/teacher/courses');
  }

  async getPageTitle(): Promise<string | null> {
    return this.pageTitle.textContent();
  }

  async getCourseCount(): Promise<number> {
    return this.courseCards.count();
  }

  async isCreateButtonVisible(): Promise<boolean> {
    return this.createCourseButton.isVisible();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  async clickCreateCourse(): Promise<void> {
    await this.createCourseButton.click();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  async clickLessons(): Promise<void> {
    await this.lessonsButton.click();
  }
}