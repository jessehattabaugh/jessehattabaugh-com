import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('About Page', () => {
	test('should load the about page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/about`);

		// Check that the page loads
		await expect(page).toHaveTitle(/About Jesse/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('About Jesse');

		// Check for about content
		await expect(page.locator('main p')).toContainText('learn more about Jesse Hattabaugh');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
		await expect(page.locator('nav a[href="/about"]')).toBeVisible();
	});

	test('should navigate to other pages from about page', async ({ page }) => {
		await page.goto(`${baseURL}/about`);

		// Test navigation to home
		await page.click('nav a[href="/"]');
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.locator('h1')).toContainText('Jesse Hattabaugh');

		// Go back to about
		await page.goto(`${baseURL}/about`);

		// Test navigation to hello
		await page.click('nav a[href="/hello"]');
		await expect(page).toHaveURL(`${baseURL}/hello`);
		await expect(page.locator('h1')).toContainText('Hello Page');
	});
});
