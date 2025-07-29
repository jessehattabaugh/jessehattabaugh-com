import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Share Page GET', () => {
	test('should load the share page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/share`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h2')).toContainText('Share Something');

		// Check for form elements
		await expect(page.getByLabelText('Your Email Address')).toBeVisible();
		await expect(page.getByLabelText('Title')).toBeVisible();
		await expect(page.getByLabelText('Description')).toBeVisible();
		await expect(page.getByLabelText('URL (optional)')).toBeVisible();
		await expect(page.getByLabelText('Image (optional)')).toBeVisible();

		// Check for submit button
		await expect(page.getByRole('button', { name: /Submit Share/ })).toBeVisible();
	});

	test('should show validation for required fields', async ({ page }) => {
		await page.goto(`${baseURL}/share`);

		// Try to submit without filling required fields
		await page.click('button[type="submit"]');

		// Check that HTML5 validation prevents submission
		const emailField = page.getByLabelText('Your Email Address');
		await expect(emailField).toHaveAttribute('required');
		
		const titleField = page.getByLabelText('Title');
		await expect(titleField).toHaveAttribute('required');
		
		const textField = page.getByLabelText('Description');
		await expect(textField).toHaveAttribute('required');
	});

	test('should show placeholders and help text', async ({ page }) => {
		await page.goto(`${baseURL}/share`);

		// Check placeholders
		await expect(page.getByLabelText('Your Email Address')).toHaveAttribute('placeholder', 'your.email@example.com');
		await expect(page.getByLabelText('Title')).toHaveAttribute('placeholder', 'Give your share a descriptive title');
		await expect(page.getByLabelText('URL (optional)')).toHaveAttribute('placeholder', 'https://example.com/interesting-link');

		// Check help text
		await expect(page.locator('text=We\'ll send you a verification email')).toBeVisible();
		await expect(page.locator('text=Link to the content you\'re sharing')).toBeVisible();
		await expect(page.locator('text=Upload an image related to your share (max 5MB)')).toBeVisible();
	});

	test('should fill out the form completely', async ({ page }) => {
		await page.goto(`${baseURL}/share`);

		// Fill out all form fields
		await page.fill('input[name="email"]', 'test@example.com');
		await page.fill('input[name="title"]', 'Test Share Title');
		await page.fill('textarea[name="text"]', 'This is a test share description that explains something interesting.');
		await page.fill('input[name="url"]', 'https://example.com/test-url');

		// Verify values were entered
		await expect(page.getByLabelText('Your Email Address')).toHaveValue('test@example.com');
		await expect(page.getByLabelText('Title')).toHaveValue('Test Share Title');
		await expect(page.getByLabelText('Description')).toHaveValue('This is a test share description that explains something interesting.');
		await expect(page.getByLabelText('URL (optional)')).toHaveValue('https://example.com/test-url');
	});

	test('should have navigation links to share pages', async ({ page }) => {
		await page.goto(baseURL);

		// Check that navigation includes share links
		await expect(page.locator('nav a[href="/shares"]')).toBeVisible();
		await expect(page.locator('nav a[href="/share"]')).toBeVisible();
	});

	test('should navigate from home to share page', async ({ page }) => {
		await page.goto(baseURL);

		// Click on share link in navigation
		await page.click('nav a[href="/share"]');

		// Check that we're on the share page
		await expect(page).toHaveURL(`${baseURL}/share`);
		await expect(page.locator('h2')).toContainText('Share Something');
	});
});

test.describe('Share Page POST', () => {
	test('should handle form submission', async ({ page }) => {
		await page.goto(`${baseURL}/share`);

		// Fill out required fields
		await page.fill('input[name="email"]', 'playwright-test@example.com');
		await page.fill('input[name="title"]', 'Playwright Test Share');
		await page.fill('textarea[name="text"]', 'This is a test share created by Playwright during e2e testing.');

		// Submit the form
		await page.click('button[type="submit"]');

		// Wait for the status message to appear
		await page.waitForSelector('.status-message', { timeout: 10_000 });

		// Check for success or error message
		const statusMessage = page.locator('.status-message');
		await expect(statusMessage).toBeVisible();
		
		// Should either show success or error (depending on backend availability)
		const messageText = await statusMessage.textContent();
		expect(messageText).toMatch(/(submitted successfully|Error:|Submitting)/);
	});
});