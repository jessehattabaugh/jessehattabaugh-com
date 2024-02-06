import { test, expect } from '@playwright/test';

test.describe('with JavaScript', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/HyperElements/test');
	});

	test('should display success message after form submission', async ({ page }) => {
		await page.route('**/HyperElements/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'makes a DELETE request').toBe('DELETE');
			route.continue();
		});
		await page.click('#form1 button[type="submit"]');
		await expect(
			page.locator('#status1 >> text=Success!'),
			'displays default success message',
		).toBeVisible();
	});

	test('should display error message after form submission', async ({ page }) => {
		await page.route('**/HyperElements/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'requests a GET').toBe('GET');
			const { searchParams } = new URL(request.url());
			expect(searchParams.get('mock'), 'query param contains form data').toBe('error');
			route.continue();
		});
		await page.fill('#form2 input[name="mock"]', 'error');
		await page.click('#form2 input[type="submit"]');
		await expect(
			page.locator('#status2 >> text=testError'),
			'displays the custom error',
		).toBeVisible();
	});

	test('should display success after clicking link', async ({ page }) => {
		await page.route('**/HyperElements/test*', (route) => {
			const request = route.request();
			expect(request.method(), 'requests a PUT').toBe('PUT');
			route.continue();
		});
		await page.click('#link1');
		await expect(page.locator('#status3 >> text=Success!'), 'displays Success!').toBeVisible();
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test.beforeEach(async ({ page }) => {
		await page.goto('/HyperElements/test');
	});

	test('should make a POST with a DELETE param', async ({ page }) => {
		await page.route('**/HyperElements/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a POST').toBe('POST');
			const data = await request.postDataJSON();
			expect(data, 'has a method property of DELETE').toHaveProperty('method', 'DELETE');
			route.continue();
		});
		await page.click('#form1 button[type="submit"]');
	});

	test('should make a GET with form data in query params', async ({ page }) => {
		await page.route('**/HyperElements/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a GET').toBe('GET');
			const { searchParams } = new URL(request.url());
			expect(searchParams.get('mock'), 'query param contains form data').toBe('error');
			route.continue();
		});
		await page.fill('#form2 input[name="mock"]', 'error');
		await page.click('#form2 input[type="submit"]');
	});

	test('should make a GET with method PUT in query params', async ({ page }) => {
		await page.route('**/HyperElements/test*', async (route) => {
			const request = route.request();
			expect(request.method(), 'makes a GET').toBe('GET');
			const { searchParams } = new URL(request.url());
			expect(searchParams.get('method'), 'querystring contains method=PUT').toBe('PUT');
			route.continue();
		});
		await page.click('#link1');
	});
});
