import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Hello Page - GET', () => {
	test('should load the hello page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/hello`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Hello Page/);

		// Check for main heading
		await expect(page.locator('h1')).toContainText('Hello Page');

		// Check for greeting section
		await expect(page.locator('h2')).toContainText('Hello there! 👋');
		await expect(page.locator('.greeting p')).toContainText(
			'Thanks for stopping by my hello page!'
		);

		// Check for contact form section
		await expect(page.locator('h3')).toContainText('Send me a message');
		await expect(page.getByLabelText('Your Name:')).toBeVisible();
		await expect(page.getByLabelText('Your Email:')).toBeVisible();
		await expect(page.getByLabelText('Message:')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();

		// Check for social links section
		await expect(page.locator('h3')).toContainText('Connect with me');
		await expect(page.locator('.social-links p')).toContainText('Find me on various platforms');
		await expect(page.locator('.social-link')).toContainText('GitHub');
		await expect(page.locator('.social-link')).toContainText('LinkedIn');
		await expect(page.locator('.social-link')).toContainText('Twitter');

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

test.describe('Hello Page - POST', () => {
	test('should submit form and show thank you message', async ({ page }) => {
		await page.goto(`${baseURL}/hello`);

		// Fill out the form
		await test.step('Fill out contact form', async () => {
			await page.getByLabelText('Your Name:').fill('Test User');
			await page.getByLabelText('Your Email:').fill('test@example.com');
			await page.getByLabelText('Message:').fill('This is a test message');
		});

		// Submit the form
		await test.step('Submit form', async () => {
			await page.getByRole('button', { name: 'Send Message' }).click();
		});

		// Check thank you page content
		await test.step('Verify thank you page', async () => {
			await expect(page).toHaveTitle(/Message Sent/);
			await expect(page.locator('h2')).toContainText('Message Received! 🎉');
			await expect(page.locator('.thank-you p')).toContainText('Thank you for reaching out');

			// Check message details display
			await expect(page.locator('h3')).toContainText('What you sent:');
			await expect(page.locator('.message-preview')).toContainText('Name: Test User');
			await expect(page.locator('.message-preview')).toContainText('Email: test@example.com');
			await expect(page.locator('blockquote')).toContainText('This is a test message');

			// Check next steps section
			await expect(page.locator('h3')).toContainText("What's next?");
			await expect(page.locator('.next-steps p')).toContainText("I'll review your message");
			await expect(page.locator('.cta-button')).toContainText('Send Another Message');
			await expect(page.locator('.cta-button.secondary')).toContainText('Back to Home');
		});
	});
});
