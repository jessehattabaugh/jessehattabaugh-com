import { test, expect } from '@playwright/test';

test.describe('index', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('title', async ({ page }) => {
		await expect(page).toHaveTitle(/JesseHattabaugh.com/);
	});

	test('snapshot', async ({ page }) => {
		expect(await page.screenshot({ fullPage: true })).toMatchSnapshot();
	});

});
