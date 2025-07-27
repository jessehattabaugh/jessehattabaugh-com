import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://jessehattabaugh.com';

test.describe('Home Page', () => {
	test('should load the home page successfully', async ({ page }) => {
		await page.goto(baseURL);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('Jesse Hattabaugh');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();

		// Check that CSS is loaded
		const nav = page.locator('nav');
		await expect(nav).toHaveCSS('background-color', 'rgb(44, 62, 80)');
	});

	test('should navigate to hello page', async ({ page }) => {
		await page.goto(baseURL);

		// Click on hello link
		await page.click('nav a[href="/hello"]');

		// Check that we're on the hello page
		await expect(page).toHaveURL(`${baseURL}/hello`);
		await expect(page.locator('h1')).toContainText('Hello Page');
	});
});
