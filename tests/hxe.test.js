import { test, expect } from '@playwright/test';

test.describe('HXFetch and HXFetchStatus components', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/hxe/test');
	});

	test('should display success message after form submission', async ({ page }) => {
		await page.click('#test1 button[type="submit"]');
		await expect(page.locator('hx-status >> text=Success!')).toBeVisible();
	});

	test('should display error message after form submission', async ({ page }) => {
		await page.fill('#test2 input[name="testInput"]', 'error');
		await page.click('#test2 input[type="submit"]');
		await expect(page.locator('hx-status >> text=testError')).toBeVisible();
	});

	test('should display success after clicking link', async ({ page }) => {
		await page.click('#test3');
		await expect(page.locator('hx-status >> text=Success!')).toBeVisible();
	});
});
