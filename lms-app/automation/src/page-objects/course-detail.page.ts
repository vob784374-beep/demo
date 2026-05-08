import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class CourseDetailPage extends BasePage {
  readonly backButton: Locator;
  readonly courseTitle: Locator;
  readonly categoryBadge: Locator;
  readonly teacherName: Locator;
  readonly lessonCount: Locator;
  readonly description: Locator;
  readonly enrollButton: Locator;
  readonly continueButton: Locator;
  readonly loginToEnrollButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.locator('a[href="/courses"] button, a[href="/courses"]');
    this.courseTitle = page.locator('h1');
    this.categoryBadge = page.locator('[class*="badge"]');
    this.teacherName = page.locator('text=By');
    this.lessonCount = page.locator('text=lesson');
    this.description = page.locator('p:text-muted');
    this.enrollButton = page.locator('button:has-text("Enroll Now")');
    this.continueButton = page.locator('button:has-text("Continue Learning")');
    this.loginToEnrollButton = page.locator('button:has-text("Log in to enroll")');
  }

  async navigate(courseId: number): Promise<void> {
    await super.navigate(`/courses/${courseId}`);
  }

  async getCourseTitle(): Promise<string | null> {
    return this.courseTitle.textContent();
  }

  async getTeacherName(): Promise<string | null> {
    return this.teacherName.textContent();
  }

  async getLessonCount(): Promise<string | null> {
    return this.lessonCount.textContent();
  }

  async getDescription(): Promise<string | null> {
    return this.description.textContent();
  }

  async isEnrollButtonVisible(): Promise<boolean> {
    return this.enrollButton.isVisible();
  }

  async isContinueButtonVisible(): Promise<boolean> {
    return this.continueButton.isVisible();
  }

  async isLoginToEnrollVisible(): Promise<boolean> {
    return this.loginToEnrollButton.isVisible();
  }

  async clickEnroll(): Promise<void> {
    await this.enrollButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }
}