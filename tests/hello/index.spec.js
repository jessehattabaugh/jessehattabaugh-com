import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://jessehattabaugh.com';

test.describe('Hello Page', () => {
	test('should load the hello page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/hello`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Hello Page/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('Hello Page');

		// Check for welcome message
		await expect(page.locator('main p')).toContainText('Welcome to the Hello page!');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
	});

	test('should navigate back to home page', async ({ page }) => {
		await page.goto(`${baseURL}/hello`);

		// Click on home link
		await page.click('nav a[href="/"]');

		// Check that we're on the home page
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.locator('h1')).toContainText('Jesse Hattabaugh');
	});
});
