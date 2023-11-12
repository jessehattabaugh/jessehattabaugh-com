import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test.describe('index', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/share');
	});

	test('title', async ({ page }) => {
		await expect(page).toHaveTitle(/JesseHattabaugh.com\/share/);
	});

	test('snapshot', async ({ page }) => {
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('form submits', async ({ page }) => {
		await page.getByLabel('title').click();
		await page.getByLabel('title').fill('foo');
		await page.getByLabel('text').click();
		await page.getByLabel('text').fill('bar');
		await page.getByLabel('url').click();
		await page.getByLabel('url').fill('http://baz.com');
		await page.getByLabel('image').click();
		await page.getByLabel('image').setInputFiles('public/jesse192.png');
		await page.getByRole('button', { name: 'share' }).click();
		expect(await page.screenshot()).toMatchSnapshot();
	});
});
