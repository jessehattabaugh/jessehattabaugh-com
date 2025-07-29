import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Contact Page - GET', () => {
	test('should load the contact page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/contact`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h2')).toContainText('Get In Touch');

		// Check for intro text
		await expect(page.locator('.contact-page p')).toContainText(
			"I'd love to hear from you!"
		);

		// Check for contact form section
		await expect(page.locator('h3')).toContainText('Send me a message');
		await expect(page.getByLabelText('Name:')).toBeVisible();
		await expect(page.getByLabelText('Email:')).toBeVisible();
		await expect(page.getByLabelText('Message:')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();

		// Check for contact information section
		await expect(page.locator('h3')).toContainText('Other Ways to Connect');
		await expect(page.locator('.contact-method')).toContainText('Email');
		await expect(page.locator('.contact-method')).toContainText('LinkedIn');
		await expect(page.locator('.contact-method')).toContainText('GitHub');
		await expect(page.locator('.contact-method')).toContainText('Twitter');

		// Check for navigation
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/contact"]')).toBeVisible();
	});

	test('should navigate back to home page', async ({ page }) => {
		await page.goto(`${baseURL}/contact`);

		// Click on home link
		await page.click('nav a[href="/"]');

		// Check that we're on the home page
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.locator('h2')).toContainText('Welcome to my personal website!');
	});
});

test.describe('Contact Page - POST', () => {
	test('should submit form and show thank you message', async ({ page }) => {
		await page.goto(`${baseURL}/contact`);

		// Fill out the form
		await test.step('Fill out contact form', async () => {
			await page.getByLabelText('Name:').fill('Test User');
			await page.getByLabelText('Email:').fill('test@example.com');
			await page.getByLabelText('Message:').fill('This is a test message');
		});

		// Submit the form
		await test.step('Submit form', async () => {
			await page.getByRole('button', { name: 'Send Message' }).click();
		});

		// Check thank you page content
		await test.step('Verify thank you page', async () => {
			await expect(page.locator('h2')).toContainText('Message Sent!');
			await expect(page.locator('.contact-success p')).toContainText('Thank you for reaching out');

			// Check message details display
			await expect(page.locator('h3')).toContainText('Your Message:');
			await expect(page.locator('.submitted-data')).toContainText('Name: Test User');
			await expect(page.locator('.submitted-data')).toContainText('Email: test@example.com');
			await expect(page.locator('.submitted-data')).toContainText('This is a test message');

			// Check next steps section
			await expect(page.locator('.next-steps')).toContainText('Send Another Message');
			await expect(page.locator('.next-steps')).toContainText('Return to Home');
		});
	});
});
