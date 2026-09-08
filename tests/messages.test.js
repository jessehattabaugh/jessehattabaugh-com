import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// ── /apps index page ──────────────────────────────────────────────────────────

test('/apps — renders app gallery with Messages card', async ({ page }) => {
	await page.goto('/apps');
	await expect(page.getByRole('heading', { name: 'Apps', level: 1 })).toBeVisible();
	const link = page.getByRole('link', { name: /messages/i });
	await expect(link).toBeVisible();
	await expect(link).toHaveAttribute('href', /\/apps\/messages\//);
});

// ── /apps/messages app shell ──────────────────────────────────────────────────

test('/apps/messages — serves PWA shell with manifest link', async ({ page }) => {
	await page.goto('/apps/messages/');
	// Manifest meta tag
	const manifest = page.locator('link[rel="manifest"]');
	await expect(manifest).toHaveAttribute('href', '/apps/messages/manifest.json');
});

test('/apps/messages — manifest.json is valid', async ({ page }) => {
	const res = await page.request.get('/apps/messages/manifest.json');
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.name).toContain('Messages');
	expect(json.start_url).toContain('/apps/messages/');
	expect(json.display).toBe('standalone');
	expect(json.share_target).toBeTruthy();
	expect(json.icons.length).toBeGreaterThan(0);
});

test('/apps/messages — icon.svg is reachable', async ({ page }) => {
	const res = await page.request.get('/apps/messages/icon.svg');
	expect(res.ok()).toBe(true);
	expect(res.headers()['content-type']).toMatch(/svg/);
});

test('/apps/messages — service worker script is reachable', async ({ page }) => {
	const res = await page.request.get('/apps/messages/sw.js');
	expect(res.ok()).toBe(true);
});

// ── Auth screen renders when not logged in ────────────────────────────────────

test('/apps/messages — shows auth screen when unauthenticated', async ({ page }, testInfo) => {
	// Ensure no session cookie
	await page.context().clearCookies();
	await page.goto('/apps/messages/');

	if (testInfo.project.use.javaScriptEnabled === false) {
		// No-JS baseline: <noscript> contact form should render
		await expect(page.getByRole('heading', { name: 'Send Jesse a message', level: 1 })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
		return;
	}

	// JS-enabled: app initialises and switches to auth view
	await expect(page.locator('auth-screen')).toBeVisible({ timeout: 5000 });
	await expect(page.locator('#auth-name')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Register with Passkey' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign in with Passkey' })).toBeVisible();
});

// ── No-JS guest message flow ────────────────────────────────────────────────

test('/apps/messages/ — no-JS guest can submit the fallback form and see a confirmation', async ({
	page,
}, testInfo) => {
	test.skip(
		testInfo.project.use.javaScriptEnabled !== false,
		'No-JS fallback form is replaced by the JS app once JavaScript is enabled',
	);
	await page.context().clearCookies();
	await page.goto('/apps/messages/');
	await page.getByLabel('Name').fill('No JS Guest');
	await page.getByLabel('Email').fill(`nojs-${randomUUID()}@example.com`);
	await page.getByLabel('Message').fill(`UI test message ${randomUUID()}`);
	await page.getByRole('button', { name: 'Send' }).click();
	await expect(page.getByText('Message sent')).toBeVisible();
});

test('/apps/messages/ — guest can send a message without JavaScript (HTTP fallback)', async ({
	page,
}) => {
	await page.context().clearCookies();
	const res = await page.request.post('/apps/messages/', {
		form: {
			name: 'No JS Guest',
			email: 'test@example.com',
			message: `No-JS test message ${randomUUID()}`,
		},
		maxRedirects: 0,
	});
	expect(res.status()).toBe(303);
	expect(res.headers().location).toMatch(/\/apps\/messages\/\?sent=1$/);
	expect(res.headers()['set-cookie']).toMatch(/msgsession=/);
});

test('/apps/messages/ — no-JS form rejects missing fields with a 422 and preserves input', async ({
	page,
}) => {
	await page.context().clearCookies();
	const res = await page.request.post('/apps/messages/', {
		form: { name: 'Validation Test', email: 'validation@example.com', message: '' },
	});
	expect(res.status()).toBe(422);
	const body = await res.text();
	expect(body).toContain('Validation Test');
});

test('/apps/messages/api/auth/register/begin — reuses the guest identity from a prior no-JS message', async ({
	page,
}) => {
	await page.context().clearCookies();
	const sendRes = await page.request.post('/apps/messages/', {
		form: {
			name: 'Merge Test Guest',
			email: `merge-${randomUUID()}@example.com`,
			message: `pre-auth message ${randomUUID()}`,
		},
		maxRedirects: 0,
	});
	const setCookie = sendRes.headers()['set-cookie'] ?? '';
	const sessionValue = setCookie.match(/msgsession=([^;]+)/)?.[1] ?? '';
	const payload = sessionValue.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
	const { userId: guestUserId } = JSON.parse(Buffer.from(payload, 'base64').toString());
	expect(guestUserId).toBeTruthy();

	// page.request shares the browser context's cookie jar, so the guest
	// session cookie set above is sent automatically on this next request.
	const beginRes = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: 'Merge Test Guest', email: `merge-${randomUUID()}@example.com` },
	});
	const { userId } = await beginRes.json();
	expect(userId).toBe(guestUserId);
});

// ── API endpoints ─────────────────────────────────────────────────────────────

test('/apps/messages/api/auth/me — returns null user when not authenticated', async ({ page }) => {
	await page.context().clearCookies();
	const res = await page.request.get('/apps/messages/api/auth/me');
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.user).toBeNull();
});

test('/apps/messages/api/config — returns config with vapidPublicKey field', async ({ page }) => {
	const res = await page.request.get('/apps/messages/api/config');
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(Object.prototype.hasOwnProperty.call(json, 'vapidPublicKey')).toBe(true);
});

test('/apps/messages/api/messages — 401 when not authenticated', async ({ page }) => {
	await page.context().clearCookies();
	const res = await page.request.get('/apps/messages/api/messages');
	expect(res.status()).toBe(401);
});

test('/apps/messages/api/auth/register/begin — rejects empty displayName', async ({ page }) => {
	const res = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: '', email: 'test@example.com' },
	});
	expect(res.status()).toBe(400);
});

test('/apps/messages/api/auth/register/begin — requires email verification for a new email', async ({
	page,
}) => {
	const res = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: 'Test User', email: `test-${randomUUID()}@example.com` },
	});
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.userId).toBeTruthy();
	expect(json.needsVerification).toBe(true);
	// No challenge is issued until the email owner confirms the verification link.
	expect(json.challengeId).toBeNull();
	expect(json.challenge).toBeUndefined();
});

test('/apps/messages/api/auth/register/begin — unauthenticated caller cannot claim an existing user\'s email', async ({
	page,
}) => {
	await page.context().clearCookies();
	const email = `claim-${randomUUID()}@example.com`;

	// First caller registers a fresh email; the user row exists but is unverified.
	const first = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: 'Original Owner', email },
	});
	const firstJson = await first.json();
	expect(firstJson.userId).toBeTruthy();
	expect(firstJson.needsVerification).toBe(true);

	// A different, unauthenticated caller supplying the same email must get a
	// fresh verification requirement — never a registration challenge — so they
	// can't attach their own passkey to the victim's account. The account is also
	// never forked into a second row.
	const second = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: 'Would-be Attacker', email },
	});
	const secondJson = await second.json();
	expect(secondJson.needsVerification).toBe(true);
	expect(secondJson.challengeId).toBeNull();
	expect(secondJson.userId).toBe(firstJson.userId);
});

test('/apps/messages/api/auth/login/begin — returns challenge', async ({ page }) => {
	const res = await page.request.post('/apps/messages/api/auth/login/begin', { data: {} });
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.challengeId).toBeTruthy();
	expect(json.options).toBeTruthy();
});

// ── Happy-path: register a test user and send a message (JS + WebAuthn) ──────

test('/apps/messages — registered user can send and see their own message', async ({
	page,
	context,
}, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Requires JavaScript');

	// Clear any prior session and register a fresh passkey-backed test user via a
	// CDP virtual authenticator (real WebAuthn ceremony, no browser UI prompts).
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

	const displayName = `E2E Test User ${randomUUID().slice(0, 8)}`;
	await page.goto('/apps/messages/');
	await page.locator('#auth-name').fill(displayName);
	await page.getByRole('button', { name: 'Register with Passkey' }).click();

	// After registration the auth screen is replaced by the chat view.
	await expect(page.locator('chat-view')).toBeVisible({ timeout: 10000 });
	await expect(page.getByRole('heading', { name: 'Jesse', level: 1 })).toBeVisible();

	// Send a message and confirm it renders back in the thread.
	const message = `UI happy-path message ${randomUUID()}`;
	await page.getByRole('textbox', { name: 'Message' }).fill(message);
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.locator('message-bubble')).toContainText(message);
});

test('/apps/messages — owner can open the conversations sidebar', async ({
	page,
	context,
}, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Requires JavaScript');
	const ownerSetupToken = process.env.OWNER_SETUP_TOKEN;
	test.skip(!ownerSetupToken, 'OWNER_SETUP_TOKEN is required for owner tests');

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

	await page.goto('/apps/messages/');
	await page.locator('#auth-name').fill('Jesse');
	await page.locator('#auth-email').fill(`owner-${randomUUID()}@example.com`);
	await page.locator('#auth-token').fill(ownerSetupToken);
	await page.getByRole('button', { name: 'Register with Passkey' }).click();

	await expect(page.locator('chat-view')).toBeVisible({ timeout: 10000 });
	const sidebarToggle = page.getByRole('button', { name: 'Open conversations sidebar' });
	await expect(sidebarToggle).toBeVisible();
	await sidebarToggle.click();
	await expect(page.getByRole('navigation', { name: 'Conversations' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Select conversation/i })).toBeVisible();

	if (testInfo.project.name.includes('Mobile')) {
		// On mobile the conversations menu opens as a modal dialog via showModal().
		await expect(page.getByRole('dialog', { name: 'Conversations' })).toBeVisible();
		await page.getByRole('button', { name: 'Close conversations' }).click();
		await expect(page.getByRole('navigation', { name: 'Conversations' })).not.toBeVisible();
	}
});

// ── /contact redirect ─────────────────────────────────────────────────────────

test('/contact — redirects to /apps/messages/', async ({ page }) => {
	const res = await page.request.get('/contact', { maxRedirects: 0 });
	expect(res.status()).toBe(301);
	expect(res.headers().location).toMatch(/\/apps\/messages\//);
});

// ── Share target ──────────────────────────────────────────────────────────────

test('/apps/messages/api/messages — share target POST redirects unauthenticated user', async ({
	page,
}) => {
	const res = await page.request.post('/apps/messages/api/messages', {
		multipart: { title: 'Test', text: 'Hello' },
		maxRedirects: 0,
	});
	// Unauthenticated share target posts redirect to login
	expect([301, 302, 303]).toContain(res.status());
});

// ── Main nav has updated link ─────────────────────────────────────────────────

test('main site nav — has "Send me a message" link', async ({ page }) => {
	await page.goto('/');
	const nav = page.getByRole('navigation', { name: 'Main navigation' });
	await expect(nav.getByRole('link', { name: 'Send me a message' })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Contact' })).not.toBeVisible();
});
