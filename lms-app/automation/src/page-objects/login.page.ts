import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly emailField: Locator;
  readonly passwordField: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"], input[type="email"]');
    this.passwordInput = page.locator('input[name="password"], input[type="password"]');
    this.submitButton = page.locator('button[type="submit"], button:has-text("Sign in")');
    this.errorMessage = page.locator('[role="alert"], [class*="error"], .text-red');
    this.emailField = page.locator('.field-wrap').first();
    this.passwordField = page.locator('.field-wrap').nth(1);
  }

  async navigate(): Promise<void> {
    await super.navigate('/system/auth/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginWithEnter(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordInput.press('Enter');
  }

  async isEmailValid(): Promise<boolean> {
    const email = await this.emailInput.inputValue();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getEmailError(): Promise<string | null> {
    const errorLocator = this.page.locator('[class*="error"], text:has("email")').first();
    try {
      return await errorLocator.textContent({ timeout: 1000 });
    } catch {
      return null;
    }
  }

  async getPasswordError(): Promise<string | null> {
    const errorLocator = this.page.locator('[class*="error"], text:has("password")').first();
    try {
      return await errorLocator.textContent({ timeout: 1000 });
    } catch {
      return null;
    }
  }

  async getGeneralError(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent({ timeout: 2000 });
    } catch {
      return null;
    }
  }

  async isLoginButtonDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  async clearFields(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }
}