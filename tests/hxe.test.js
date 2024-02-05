import { test, expect } from '@playwright/test';

test.describe('HXFetch and HXFetchStatus components', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/hxe/test');
	});

	test('should display success message after form submission', async ({ page }) => {
		await page.click('#testFetchGet button[type="submit"]');
		await expect(page.locator('hx-status >> text=Success!')).toBeVisible();
	});

	test('should display error message after form submission', async ({ page }) => {
		await page.fill('#testFetchDelete input[name="testInput"]', 'error');
		await page.click('#testFetchDelete input[type="submit"]');
		await expect(page.locator('hx-status >> text=testError')).toBeVisible();
	});
});
