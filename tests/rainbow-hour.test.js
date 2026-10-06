import { test, expect } from '@playwright/test';

// No weather fixtures or intercepted requests: use the deployed Worker and live
// Open-Meteo. Both a verdict and the documented service-unavailable page are
// legitimate outcomes; windows and submitted coordinates remain available.
test('manual coordinates render rainbow windows with or without JavaScript', async ({ page }) => {
	await page.goto('/apps/rainbow-hour/');
	await page.getByLabel('Latitude', { exact: true }).fill('40.7128');
	await page.getByLabel('Longitude', { exact: true }).fill('-74.006');
	await page.getByRole('button', { name: 'Show rainbow windows', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Rainbow windows' })).toBeVisible();
	await expect(page.getByLabel('Latitude', { exact: true })).toHaveValue('40.7128');
	await page.reload();
	await expect(page.getByRole('region', { name: 'Rainbow windows' })).toBeVisible();
});

test('the current sky check works through the same native coordinate form', async ({ page }) => {
	await page.goto('/apps/rainbow-hour/');
	await page.getByLabel('Latitude', { exact: true }).fill('40.7128');
	await page.getByLabel('Longitude', { exact: true }).fill('-74.006');
	await page.getByRole('button', { name: 'Check the sky now', exact: true }).click();
	const report = page.getByRole('region', { name: 'Sky check result' });
	const unavailable = page.getByRole('alert').filter({ hasText: 'Weather is unavailable' });
	await expect(report.or(unavailable)).toBeVisible({ timeout: 20000 });
	await expect(page.getByRole('region', { name: 'Rainbow windows' })).toBeVisible();
	await expect(page.getByLabel('Longitude', { exact: true })).toHaveValue('-74.006');
});

test('invalid coordinates keep submitted values and explain the error', async ({ page }) => {
	const response = await page.goto('/apps/rainbow-hour/?lat=100&lon=-74.006');
	expect(response.status()).toBe(422);
	await expect(page.getByRole('alert')).toContainText('latitude within ±90');
	await expect(page.getByLabel('Latitude', { exact: true })).toHaveValue('100');
	await expect(page.getByLabel('Longitude', { exact: true })).toHaveValue('-74.006');
});

test('zero latitude and longitude are valid coordinates', async ({ page }) => {
	await page.goto('/apps/rainbow-hour/');
	await page.getByLabel('Latitude', { exact: true }).fill('0');
	await page.getByLabel('Longitude', { exact: true }).fill('0');
	await page.getByRole('button', { name: 'Show rainbow windows', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Rainbow windows' })).toBeVisible();
});

test('geolocation denial leaves the coordinate form available', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Geolocation is a browser JavaScript API; manual coordinates are covered in all projects.');
	await context.clearPermissions();
	await page.goto('/apps/rainbow-hour/');
	await page.getByRole('button', { name: 'Use my location', exact: true }).click();
	await expect(page.getByRole('status', { name: 'Location' })).toContainText('enter coordinates', { timeout: 15000 });
	await expect(page.getByLabel('Latitude', { exact: true })).toBeEditable();
});

test('enhanced requests fall back to native navigation when the network returns', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Exercises fetch fallback; native forms are covered in all projects.');
	await page.goto('/apps/rainbow-hour/');
	await page.getByLabel('Latitude', { exact: true }).fill('0');
	await page.getByLabel('Longitude', { exact: true }).fill('0');
	await context.setOffline(true);
	const navigation = page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame() });
	try {
		await page.getByRole('button', { name: 'Check the sky now', exact: true }).click();
		await navigation;
	} finally { await context.setOffline(false); }
	await page.reload();
	await expect(page.getByRole('region', { name: 'Sky check result' }).or(page.getByRole('alert').filter({ hasText: 'Weather is unavailable' }))).toBeVisible({ timeout: 20000 });
});
