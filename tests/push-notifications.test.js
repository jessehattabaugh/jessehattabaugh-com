import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// ── Push notification & bell toggle E2E tests ────────────────────────────────
//
// These exercise the two fixes for the "push notifications not received" bug:
//   1. The notification bell must toggle OFF and back ON (a second click used to
//      leave the 🔕 "red slash" state stuck on).
//   2. Enabling notifications registers a push subscription with the server
//      (endpoint + client keys) so a real, non-empty push can be delivered; and
//      disabling it removes that subscription.

/**
 * Register a fresh passkey-backed user via a CDP virtual authenticator and wait
 * for the chat view to render. Mirrors the setup in messages.test.js.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Page} page
 */
async function registerPasskeyUser(context, page) {
	await context.clearCookies();
	const cdp = await context.newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
		},
	});

	const displayName = `Push Test User ${randomUUID().slice(0, 8)}`;
	await page.goto('/apps/messages/');
	await page.locator('#auth-name').fill(displayName);
	await page.getByRole('button', { name: 'Register with Passkey' }).click();
	await expect(page.locator('chat-view')).toBeVisible({ timeout: 10000 });
	await expect(page.getByRole('heading', { name: 'Jesse', level: 1 })).toBeVisible();
}

/**
 * Stub the browser's PushManager with a deterministic subscription lifecycle so
 * the test isolates our subscribe/unsubscribe logic from the external push
 * service (FCM) and service-worker activation timing.
 * @param {import('@playwright/test').Page} page
 * @param {string} endpoint  unique push endpoint, state-independent per test
 */
async function mockPushManager(page, endpoint) {
	await page.addInitScript(
		({ endpoint }) => {
			let currentSubscription = null;

			const fakeSubscription = {
				endpoint,
				expirationTime: null,
				toJSON() {
					return {
						endpoint: this.endpoint,
						expirationTime: this.expirationTime,
						keys: {
							p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
							auth: 'BTBZMqHH6r4Tts7J_aSIgg',
						},
					};
				},
				unsubscribe() {
					currentSubscription = null;
					return Promise.resolve(true);
				},
			};

			const fakePushManager = {
				getSubscription() {
					return Promise.resolve(currentSubscription);
				},
				subscribe() {
					currentSubscription = fakeSubscription;
					return Promise.resolve(fakeSubscription);
				},
			};

			const fakeRegistration = { pushManager: fakePushManager };

			// Resolve `serviceWorker.ready` immediately with our mock registration.
			Object.defineProperty(navigator.serviceWorker, 'ready', {
				configurable: true,
				get() {
					return Promise.resolve(fakeRegistration);
				},
			});
		},
		{ endpoint },
	);
}

test('notification bell toggles on/off and registers a push subscription', async ({
	page,
	context,
}, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Requires JavaScript');

	const endpoint = `https://push.example.test/${randomUUID()}`;
	await mockPushManager(page, endpoint);
	await registerPasskeyUser(context, page);

	// Before permission is granted the bell is off.
	const bellOff = page.getByRole('button', { name: 'Enable notifications' });
	await expect(bellOff).toBeVisible();
	await expect(bellOff).toHaveAttribute('aria-pressed', 'false');

	// Grant notification permission, then switch notifications ON.
	await context.grantPermissions(['notifications'], { origin: new URL(page.url()).origin });
	const subscribeRequest = page.waitForRequest((req) => {
		return req.method() === 'POST' && req.url().includes('/api/push/subscribe');
	});
	await bellOff.click();

	// The bell now reflects the enabled state (accent, no "red slash" stuck).
	const bellOn = page.getByRole('button', { name: 'Notifications enabled' });
	await expect(bellOn).toHaveAttribute('aria-pressed', 'true');

	// The subscription reached the server with a usable shape.
	const subReq = await subscribeRequest;
	const subBody = /** @type {any} */ (subReq.postDataJSON());
	expect(subBody.endpoint).toBe(endpoint);
	expect(subBody.keys.p256dh).toBeTruthy();
	expect(subBody.keys.auth).toBeTruthy();

	// Toggle OFF — regression: a second click must clear the enabled state.
	const unsubscribeRequest = page.waitForRequest((req) => {
		return req.method() === 'DELETE' && req.url().includes('/api/push/subscribe');
	});
	await bellOn.click();
	await expect(page.getByRole('button', { name: 'Enable notifications' })).toHaveAttribute(
		'aria-pressed',
		'false',
	);

	// And the server-side subscription was removed.
	const unsubReq = await unsubscribeRequest;
	const unsubBody = /** @type {any} */ (unsubReq.postDataJSON());
	expect(unsubBody.endpoint).toBe(endpoint);
});
