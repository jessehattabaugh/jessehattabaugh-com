import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('404 Page', () => {
	test('should show 404 page for non-existent routes', async ({ page }) => {
		await page.goto(`${baseURL}/non-existent-page`);

		// Check that the page loads with 404 status
		await expect(page).toHaveTitle(/404 - Page Not Found/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('404 - Page Not Found');

		// Check for error message section
		await expect(page.locator('h2')).toContainText('Oops! Page Not Found 🔍');
		await expect(page.locator('.error-message p')).toContainText(
			'Sorry, the page you are looking for could not be found'
		);
		await expect(page.locator('.error-message p')).toContainText(
			'It might have been moved, deleted, or you may have mistyped the URL'
		);

		// Check for suggestions section
		await expect(page.locator('h3')).toContainText('What can you do?');
		await expect(page.locator('.suggestions li')).toContainText('Check the URL for typos');
		await expect(page.locator('.suggestions a[href="/"]')).toContainText('home page');
		await expect(page.locator('.suggestions li')).toContainText(
			'Browse the available pages using the navigation above'
		);

		// Check for popular pages section
		await expect(page.locator('h3')).toContainText('Popular Pages');
		await expect(page.locator('.page-link[href="/"]')).toContainText('Home');
		await expect(page.locator('.page-link[href="/about"]')).toContainText('About');
		await expect(page.locator('.page-link[href="/hello"]')).toContainText('Hello');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
		await expect(page.locator('nav a[href="/about"]')).toBeVisible();
	});

	test('should navigate to home page from 404', async ({ page }) => {
		await page.goto(`${baseURL}/non-existent-page`);

		// Click on home link in error content
		await page.click('.suggestions a[href="/"]');

		// Check that we're on the home page
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.locator('h1')).toContainText('Jesse Hattabaugh');
	});

	test('should navigate to popular pages from 404', async ({ page }) => {
		await page.goto(`${baseURL}/non-existent-page`);

		// Test navigation to about page
		await page.click('.page-link[href="/about"]');
		await expect(page).toHaveURL(`${baseURL}/about`);
		await expect(page.locator('h1')).toContainText('About Jesse');

		// Go back to 404 and test hello page
		await page.goto(`${baseURL}/non-existent-page`);
		await page.click('.page-link[href="/hello"]');
		await expect(page).toHaveURL(`${baseURL}/hello`);
		await expect(page.locator('h1')).toContainText('Hello Page');
	});
});
