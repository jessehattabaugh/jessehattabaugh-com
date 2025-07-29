import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('About Page', () => {
	test('should load the about page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/about`);

		// Check that the page loads
		await expect(page).toHaveTitle(/About Jesse/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('About Jesse');

		// Check for bio section
		await expect(page.locator('h2')).toContainText('About Jesse Hattabaugh');
		await expect(page.locator('.bio p')).toContainText(
			'passionate software developer with years of experience'
		);
		await expect(page.locator('.bio p')).toContainText(
			'frontend technologies like React and Vue to backend systems'
		);

		// Check for technical skills section
		await expect(page.locator('h3')).toContainText('Technical Skills');
		await expect(page.locator('h4')).toContainText('Frontend');
		await expect(page.locator('h4')).toContainText('Backend');
		await expect(page.locator('h4')).toContainText('Cloud & DevOps');

		// Check for specific skills
		await expect(page.locator('.skill-category li')).toContainText('JavaScript/TypeScript');
		await expect(page.locator('.skill-category li')).toContainText('Node.js, Python');
		await expect(page.locator('.skill-category li')).toContainText('AWS, Azure');

		// Check for contact section
		await expect(page.locator('h3')).toContainText('Get In Touch');
		await expect(page.locator('.contact p')).toContainText('Interested in working together');
		await expect(page.locator('.cta-button')).toContainText('Say Hello');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/contact"]')).toBeVisible();
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

		// Test navigation to contact
		await page.click('nav a[href="/contact"]');
		await expect(page).toHaveURL(`${baseURL}/contact`);
		await expect(page.locator('h2')).toContainText('Get In Touch');
	});
});
