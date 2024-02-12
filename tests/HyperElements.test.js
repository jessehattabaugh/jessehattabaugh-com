import { test, expect } from '@playwright/test';

test.describe('documentation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/HyperElements');
	});

	test('should display the page', async ({ page }) => {
		await expect(page.locator('h1 >> text=HyperElements'), 'displays the title').toBeVisible();
	});

	test.describe('with JavaScript enabled', () => {
		test.beforeEach(async ({ page }) => {
			await page.evaluate(() => {
				return Promise.all([
					customElements.whenDefined('hyper-link'),
					customElements.whenDefined('hyper-form'),
					customElements.whenDefined('hyper-status'),
					customElements.whenDefined('hyper-update'),
				]);
			});
		});

		test('Getting Started example', async ({ page }) => {
			await page.click('a >> text=Get Book 1');
			await expect(
				page.locator('span >> text=getting book...'),
				'displays loading message',
			).toBeVisible();
			await expect(
				page.locator('span >> text=got book!'),
				'displays success message',
			).toBeVisible();
			await expect(page.locator('h2 >> text=Book 1'), 'displays the book').toBeVisible();
		});

		test('HyperLink example', async ({ page }) => {
			await page.click('a >> text=delete book');
			await expect(
				page.locator('span >> text=deleting book...'),
				'displays loading message',
			).toBeVisible();
			await expect(
				page.locator('span >> text=book deleted!'),
				'displays success message',
			).toBeVisible();
		});

		test('HyperForm example', async ({ page }) => {
			await page.fill('#editBook [name="title"]', 'edited title');
			await page.click('[type="submit"] >> text=edit book');
			await expect(
				page.locator('span >> text=editing book...'),
				'displays loading message',
			).toBeVisible();
			await expect(
				page.locator('span >> text=book edited!'),
				'displays success message',
			).toBeVisible();
		});

		test('HyperStatus example', async ({ page }) => {
			await page.fill('#addBook [name="title"]', 'test book');
			await page.click('[type="submit"] >> text=add book');
			await expect(
				page.locator('[slot="loading"] >> text=adding book...'),
				'displays loading message',
			).toBeVisible();
			await expect(
				page.locator('[slot="success"] >> text=book added!'),
				'displays success message',
			).toBeVisible();
		});

		test('HyperUpdate example', async ({ page }) => {
			await page.click('a >> text=Next Page');
			await expect(
				page.locator('li >> text=The Handmaids Tale'),
				'displays new page of books',
			).toBeVisible();
			await page.click('a >> text=Previous Page');
			await expect(
				page.locator('li >> text=Old Man and the Sea'),
				'displays previous page of books',
			).toBeVisible();
		});
	});

	test.describe('with JavaScript disabled', async () => {
		test.use({ javaScriptEnabled: false });

		test('Getting Started example', async ({ page }) => {
			await page.click('a >> text=Get Book 1');
			await expect(page.locator('h2 >> text=Book 1'), 'displays the book').toBeVisible();
		});

		test('HyperLink example', async ({ page }) => {
			await page.click('a >> text=delete book');
			await expect(
				page.locator('span >> text=book deleted!'),
				'displays success message',
			).toBeVisible();
		});

		test('HyperForm example', async ({ page }) => {
			await page.fill('#editBook [name="title"]', 'edited title');
			await page.click('[type="submit"] >> text=edit book');
			await expect(
				page.locator('#viewBook h2 >> text=edited title'),
				'displays the edited book title',
			).toBeVisible();
		});

		test('HyperStatus example', async ({ page }) => {
			await page.fill('#addBook [name="title"]', 'test book');
			await page.click('[type="submit"] >> text=add book');
			await expect(
				page.locator('li >> text=test book'),
				'displays the added book',
			).toBeVisible();
		});

		test('HyperUpdate example', async ({ page }) => {
			await page.click('a >> text=Next Page');
			await expect(
				page.locator('li >> text=The Handmaids Tale'),
				'displays new page of books',
			).toBeVisible();
			await page.click('a >> text=Previous Page');
			await expect(
				page.locator('li >> text=Old Man and the Sea'),
				'displays previous page of books',
			).toBeVisible();
		});
	});
});
