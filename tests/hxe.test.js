import { test, expect } from '@playwright/test';

test.describe('with JavaScript', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/hxe/test');
	});

	test('should display success message after form submission', async ({ page }) => {
		await page.route('**/hxe/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'makes a DELETE request').toBe('DELETE');
			route.continue();
		});
		await page.click('#fetch1 button[type="submit"]');
		await expect(
			page.locator('#status1 >> text=Success!'),
			'displays default success message',
		).toBeVisible();
	});

	test('should display error message after form submission', async ({ page }) => {
		await page.route('**/hxe/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'requests a GET').toBe('GET');
			const url = new URL(request.url());
			const params = url.searchParams;
			expect(params.get('mock'), 'query param contains form data').toBe('error');
			route.continue();
		});
		await page.fill('#fetch2 input[name="mock"]', 'error');
		await page.click('#fetch2 input[type="submit"]');
		await expect(
			page.locator('#status2 >> text=testError'),
			'displays the custom error',
		).toBeVisible();
	});

	test('should display success after clicking link', async ({ page }) => {
		await page.route('**/hxe/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'requests a PUT').toBe('PUT');
			route.continue();
		});
		await page.click('#fetch3');
		await expect(page.locator('#status3 >> text=Success!'), 'displays Success!').toBeVisible();
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test.beforeEach(async ({ page }) => {
		await page.goto('/hxe/test');
	});

	test('should make a POST with a DELETE param', async ({ page }) => {
		await page.route('**/hxe/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a POST').toBe('POST');
			const data = await request.postDataJSON();
			expect(data, 'has a method property of DELETE').toHaveProperty('method', 'DELETE');
			route.continue();
		});
		await page.click('#fetch1 button[type="submit"]');
	});

	test('should make a GET with form data in query params', async ({ page }) => {
		await page.route('**/hxe/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a GET').toBe('GET');
			const url = new URL(request.url());
			const params = url.searchParams;
			expect(params.get('mock'), 'query param contains form data').toBe('error');
			route.continue();
		});
		await page.fill('#fetch2 input[name="mock"]', 'error');
		await page.click('#fetch2 input[type="submit"]');
	});

	test('should make a GET with method PUT in query params', async ({ page }) => {
		await page.route('**/hxe/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a GET').toBe('GET');
			const url = new URL(request.url());
			const params = url.searchParams;
			expect(params.get('method'), 'querystring contains method=PUT').toBe('PUT');
			route.continue();
		});
		await page.click('#fetch3');
	});
});
