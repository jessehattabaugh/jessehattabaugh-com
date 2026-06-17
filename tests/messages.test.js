import { test, expect } from '@playwright/test';

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

test('/apps/messages — shows auth screen when unauthenticated', async ({ page }) => {
	// Ensure no session cookie
	await page.context().clearCookies();
	await page.goto('/apps/messages/');

	// The JS app initialises and switches to auth view
	await expect(page.locator('auth-screen')).toBeVisible({ timeout: 5000 });
	await expect(page.locator('#auth-name')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Register with Passkey' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign in with Passkey' })).toBeVisible();
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
		data: { displayName: '' },
	});
	expect(res.status()).toBe(400);
});

test('/apps/messages/api/auth/register/begin — returns challenge for valid name', async ({
	page,
}) => {
	const res = await page.request.post('/apps/messages/api/auth/register/begin', {
		data: { displayName: 'Test User' },
	});
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.challengeId).toBeTruthy();
	expect(json.challenge).toBeTruthy();
	expect(json.options).toBeTruthy();
	expect(json.options.rp).toBeTruthy();
});

test('/apps/messages/api/auth/login/begin — returns challenge', async ({ page }) => {
	const res = await page.request.post('/apps/messages/api/auth/login/begin', { data: {} });
	expect(res.ok()).toBe(true);
	const json = await res.json();
	expect(json.challengeId).toBeTruthy();
	expect(json.options).toBeTruthy();
});

// ── /contact redirect ─────────────────────────────────────────────────────────

test('/contact — redirects to /apps/messages/', async ({ page }) => {
	const res = await page.request.get('/contact', { maxRedirects: 0 });
	expect(res.status()).toBe(301);
	expect(res.headers().location).toMatch(/\/apps\/messages\//);
});

// ── Share target ──────────────────────────────────────────────────────────────

test('/apps/messages/share — POST redirects to app', async ({ page }) => {
	const res = await page.request.post('/apps/messages/share', {
		multipart: { title: 'Test', text: 'Hello' },
	});
	// Server redirects to the app (SW would handle it for installed apps)
	expect([301, 302, 303]).toContain(res.status());
});

// ── Main nav has updated link ─────────────────────────────────────────────────

test('main site nav — has "Send me a message" link', async ({ page }) => {
	await page.goto('/');
	const nav = page.getByRole('navigation', { name: 'Main navigation' });
	await expect(nav.getByRole('link', { name: 'Send me a message' })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Contact' })).not.toBeVisible();
});
