import { test, expect } from '@playwright/test';
import { paths } from '../../shared/routes.js';

test('HEAD returns page headers without a body', async ({ request }) => {
	const response = await request.head(paths.messages);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('text/html');
	expect(response.headers()['content-security-policy']).toBeTruthy();
	expect(await response.body()).toHaveLength(0);
});

test('app root redirects retain query parameters', async ({ request }) => {
	const response = await request.get(`${paths.rainbow.slice(0, -1)}?lat=47&lon=-122`, { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	const destination = new URL(response.headers().location);
	expect(destination.pathname).toBe(paths.rainbow);
	expect(destination.search).toBe('?lat=47&lon=-122');
});

test('unsupported methods return the allowed methods without performing an action', async ({ request }) => {
	const response = await request.get(paths.logout, { maxRedirects: 0 });
	expect(response.status()).toBe(405);
	expect(response.headers().allow).toBe('POST');
	expect(response.headers()['content-type']).toContain('text/html');
});

test('cross-origin form submissions are rejected before a mutation', async ({ request }) => {
	const response = await request.post(paths.messages, {
		headers: { Origin: 'https://example.org', 'Sec-Fetch-Site': 'cross-site' },
		form: { message: 'This request must not reach persistence.' }, maxRedirects: 0,
	});
	expect(response.status()).toBe(403);
	expect(response.headers()['content-type']).toContain('text/html');
});
