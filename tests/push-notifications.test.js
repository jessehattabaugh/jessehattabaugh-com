import { randomUUID } from 'node:crypto';
import { test, expect, signIn } from './helpers/messages.js';
import { previewDatabase } from './helpers/database.js';
import { deleteRainbowSubscription } from '../shared/data/rainbow.js';

// Real PushManager and real push service. No forged subscriptions or API mocks.
// Browsers expose these capabilities only with JavaScript; all core messaging
// and sky-check flows are tested with JavaScript disabled in the other suites.
test('a long Unicode reply delivers a notification preview and preserves the full message', async ({ page, context, browser, identities }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Web Push is a browser JavaScript API.');
	test.setTimeout(120000);
	const visitor = identities.create();
	const owner = await identities.owner();
	const marker = `Long reply ${randomUUID()}`;
	const message = `${marker} ${'🌈'.repeat(4900)}`;
	await context.grantPermissions(['notifications']);
	await signIn(page, visitor);
	const ownerContext = await browser.newContext({ ...testInfo.project.use });
	try {
		await page.getByRole('button', { name: 'Enable message notifications', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Disable notifications', exact: true })).toBeVisible({ timeout: 30000 });
		const ownerPage = await ownerContext.newPage();
		await signIn(ownerPage, owner);
		await ownerPage.getByRole('navigation', { name: 'Conversations', exact: true }).getByRole('link', { name: visitor.name, exact: true }).click();
		await ownerPage.getByLabel('Message', { exact: true }).fill(message);
		await ownerPage.getByRole('button', { name: 'Send', exact: true }).click();
		// Read the real browser's visible notifications, not a synthetic push event
		// or intercepted API response. Oversized ciphertext never reaches this UI.
		await expect.poll(() => { return page.evaluate(async (prefix) => {
			const registration = await navigator.serviceWorker.getRegistration();
			const notifications = await registration?.getNotifications() ?? [];
			return notifications.some((notification) => { return notification.title === 'Messages' && notification.body.includes(prefix); });
		}, marker);}, { timeout: 30000 }).toBe(true);
		await page.getByRole('link', { name: 'Refresh messages', exact: true }).click();
		await expect(page.getByRole('list', { name: 'Messages', exact: true }).getByText(message, { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Disable notifications', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Enable message notifications', exact: true })).toBeVisible();
	} finally {
		await ownerContext.close();
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.getRegistration();
			for (const notification of await registration?.getNotifications() ?? []) { notification.close(); }
			await (await registration?.pushManager.getSubscription())?.unsubscribe();
		});
	}
});

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
