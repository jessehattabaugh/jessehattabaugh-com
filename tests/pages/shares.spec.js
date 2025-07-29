import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Shares Page GET', () => {
	test('should load the shares listing page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for main heading
		await expect(page.locator('h2')).toContainText('Shared Content');

		// Check for description
		await expect(page.locator('p')).toContainText('Interesting things shared by the community');
	});

	test('should display share cards with content', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check for share cards (using mock data)
		await expect(page.locator('.share-card')).toHaveCount(2);

		// Check first share card content
		const firstCard = page.locator('.share-card').first();
		await expect(firstCard.locator('.share-title')).toContainText('Amazing JavaScript Framework');
		await expect(firstCard.locator('.share-text')).toContainText('incredible new framework');
		await expect(firstCard.locator('.share-author')).toContainText('Shared by us***@example.com');

		// Check second share card content
		const secondCard = page.locator('.share-card').nth(1);
		await expect(secondCard.locator('.share-title')).toContainText('Interesting Article on AI');
		await expect(secondCard.locator('.share-text')).toContainText('artificial intelligence');
		await expect(secondCard.locator('.share-author')).toContainText('Shared by an***@example.com');
	});

	test('should show external links with proper attributes', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check that external links have proper attributes
		const externalLinks = page.locator('.share-link a');
		await expect(externalLinks).toHaveCount(2);

		// Check first external link
		const firstLink = externalLinks.first();
		await expect(firstLink).toHaveAttribute('target', '_blank');
		await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
		await expect(firstLink).toContainText('Visit Link');

		// Check second external link
		const secondLink = externalLinks.nth(1);
		await expect(secondLink).toHaveAttribute('target', '_blank');
		await expect(secondLink).toHaveAttribute('rel', 'noopener noreferrer');
		await expect(secondLink).toContainText('Visit Link');
	});

	test('should display formatted publication dates', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check that dates are displayed
		const dates = page.locator('.share-date');
		await expect(dates).toHaveCount(2);

		// Dates should be formatted as locale strings
		const firstDate = await dates.first().textContent();
		const secondDate = await dates.nth(1).textContent();

		// Should look like date format (e.g., "1/15/2024" or "15/1/2024")
		expect(firstDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
		expect(secondDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
	});

	test('should have call-to-action for sharing', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check for share CTA section
		await expect(page.locator('.share-cta')).toBeVisible();
		
		// Check for share button
		const shareButton = page.locator('a[href="/share"]').last();
		await expect(shareButton).toBeVisible();
		await expect(shareButton).toContainText('Share Something');
	});

	test('should navigate to share submission page', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Click on the share something button
		await page.click('.share-button');

		// Check that we're on the share page
		await expect(page).toHaveURL(`${baseURL}/share`);
		await expect(page.locator('h2')).toContainText('Share Something');
	});

	test('should have responsive design', async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 400, height: 800 });
		await page.goto(`${baseURL}/shares`);

		// Check that content is still visible and accessible
		await expect(page.locator('h2')).toBeVisible();
		await expect(page.locator('.share-card')).toHaveCount(2);
		await expect(page.locator('.share-button')).toBeVisible();

		// Check that cards stack properly on mobile
		const cards = page.locator('.share-card');
		const firstCardBox = await cards.first().boundingBox();
		const secondCardBox = await cards.nth(1).boundingBox();

		// Second card should be below the first (y position higher)
		expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
	});

	test('should navigate from home to shares page', async ({ page }) => {
		await page.goto(baseURL);

		// Click on shares link in navigation
		await page.click('nav a[href="/shares"]');

		// Check that we're on the shares page
		await expect(page).toHaveURL(`${baseURL}/shares`);
		await expect(page.locator('h2')).toContainText('Shared Content');
	});

	test('should show email masking for privacy', async ({ page }) => {
		await page.goto(`${baseURL}/shares`);

		// Check that email addresses are properly masked
		const authorElements = page.locator('.share-author');
		
		for (let index = 0; index < await authorElements.count(); index++) {
			const authorText = await authorElements.nth(index).textContent();
			// Should contain masked email pattern like "us***@example.com"
			expect(authorText).toMatch(/Shared by \w{2}\*{3}@\w+\.\w+/);
		}
	});
});