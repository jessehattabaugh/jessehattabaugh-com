import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('About Page', () => {
	test('should load the about page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/about`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('About This Website');

		// Check for bio section
		await expect(page.locator('h2')).toContainText('Built by Jesse Hattabaugh');
		await expect(page.locator('.bio p')).toContainText(
			'passionate software developer with years of experience'
		);
		await expect(page.locator('.bio p')).toContainText(
			'frontend technologies like React and Vue to backend systems'
		);

		// Check for technical architecture section
		await expect(page.locator('h3')).toContainText('Technical Architecture');
		await expect(page.locator('h4')).toContainText('Frontend');
		await expect(page.locator('h4')).toContainText('Backend');
		await expect(page.locator('h4')).toContainText('Cloud & DevOps');

		// Check for specific technologies
		await expect(page.locator('.skill-category li')).toContainText('JavaScript/TypeScript');
		await expect(page.locator('.skill-category li')).toContainText('Node.js, Python');
		await expect(page.locator('.skill-category li')).toContainText('AWS, Azure');

		// Check for website features section
		await expect(page.locator('h3')).toContainText('Website Features');
		await expect(page.locator('.features li')).toContainText('Serverless Architecture');
		await expect(page.locator('.features li')).toContainText('Global CDN');
		await expect(page.locator('.features li')).toContainText('Security First');

		// Check for contact section
		await expect(page.locator('h3')).toContainText('Get In Touch');
		await expect(page.locator('.contact p')).toContainText('Interested in working together');
		await expect(page.locator('.cta-button')).toContainText('Say Hello');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
		await expect(page.locator('nav a[href="/about"]')).toBeVisible();
		await expect(page.locator('nav a[href="/resume"]')).toBeVisible();
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
