import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Home Page', () => {
	test('should load the home page successfully', async ({ page }) => {
		await page.goto(baseURL);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('Jesse Hattabaugh');

		// Check for hero content
		await expect(page.locator('h2')).toContainText('Welcome to my personal website!');
		await expect(page.locator('.hero p')).toContainText(
			'software developer passionate about creating amazing web experiences'
		);

		// Check for "What I Do" section
		await expect(page.locator('h3')).toContainText('What I Do');
		await expect(page.locator('.intro li')).toContainText('Full-stack web development');
		await expect(page.locator('.intro li')).toContainText(
			'Cloud architecture and serverless applications'
		);
		await expect(page.locator('.intro li')).toContainText(
			'Modern JavaScript and web technologies'
		);

		// Check for "Recent Projects" section
		await expect(page.locator('h3')).toContainText('Recent Projects');
		await expect(page.locator('.recent-work p')).toContainText(
			'Check out some of my latest work and experiments'
		);
		await expect(page.locator('.cta-button')).toContainText('Learn More About Me');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
		await expect(page.locator('nav a[href="/about"]')).toBeVisible();
		await expect(page.locator('nav a[href="/resume"]')).toBeVisible();

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
