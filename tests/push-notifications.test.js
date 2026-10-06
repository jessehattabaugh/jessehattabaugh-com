import { test, expect, signIn } from './helpers/messages.js';
import { previewDatabase } from './helpers/database.js';
import { deleteRainbowSubscription } from '../shared/data/rainbow.js';

// Real PushManager and real push service. No forged subscriptions or API mocks.
// Browsers expose these capabilities only with JavaScript; all core messaging
// and sky-check flows are tested with JavaScript disabled in the other suites.
test('message notifications can be enabled, disabled, and enabled again', async ({ page, context, identities }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Web Push is a browser JavaScript API.');
	test.setTimeout(90000);
	await context.grantPermissions(['notifications']);
	await signIn(page, identities.create());
	const enable = page.getByRole('button', { name: 'Enable message notifications', exact: true });
	await expect(enable).toBeVisible();
	const disable = page.getByRole('button', { name: 'Disable notifications', exact: true });
	try {
		await enable.click();
		await expect(disable).toBeVisible({ timeout: 30000 });
		// The same browser endpoint must not masquerade as enabled for a new
		// account. Explicit enable transfers it; reloading confirms server state.
		await page.getByRole('button', { name: 'Sign out', exact: true }).click();
		await signIn(page, identities.create());
		await expect(enable).toBeEnabled();
		await enable.click();
		await expect(disable).toBeVisible({ timeout: 30000 });
		await page.reload();
		await expect(disable).toBeEnabled();
		await disable.click();
		await expect(enable).toBeVisible();
		await enable.click();
		await expect(disable).toBeVisible({ timeout: 30000 });
		await disable.click();
		await expect(enable).toBeVisible();
	} finally {
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.getRegistration();
			const subscription = await registration?.pushManager.getSubscription();
			if (subscription) { await subscription.unsubscribe(); }
		});
	}
});

test('rainbow alerts require a location and unsubscribe cleanly', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Web Push is a browser JavaScript API.');
	test.setTimeout(90000);
	await context.grantPermissions(['notifications']);
	await page.goto('/apps/rainbow-hour/');
	const enable = page.getByRole('button', { name: 'Enable rainbow alerts', exact: true });
	await expect(enable).toBeVisible();
	await enable.click();
	await expect(page.getByRole('status', { name: 'Browser features' })).toContainText('Enter valid coordinates');
	await page.getByLabel('Latitude', { exact: true }).fill('40.7128');
	await page.getByLabel('Longitude', { exact: true }).fill('-74.006');
	try {
		await enable.click();
		const disable = page.getByRole('button', { name: 'Disable notifications', exact: true });
		await expect(disable).toBeVisible({ timeout: 30000 });
		await disable.click();
		await expect(enable).toBeVisible();
	} finally {
		// Real browser subscription cleanup even if an assertion above failed.
		const endpoint = await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.getRegistration();
			const subscription = await registration?.pushManager.getSubscription();
			if (subscription) { await subscription.unsubscribe(); }
			return subscription?.endpoint;
		});
		if (endpoint) { await deleteRainbowSubscription(await previewDatabase(), endpoint); }
	}
});
