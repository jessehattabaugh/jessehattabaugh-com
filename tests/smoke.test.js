import { test, expect } from '@playwright/test';
import { lighthouseAudit } from './helpers/lighthouse.js';
import { staticRoutes, paths } from '../shared/routes.js';

const headings = { home: 'Jesse Hattabaugh', about: 'About', colophon: 'Colophon', apps: 'Apps' };
const pages = [
	...staticRoutes.filter((route) => { return route.name in headings; }).map((route) => {
		return { path: route.path, heading: headings[route.name] };
	}),
	{ path: paths.login, heading: 'Sign in' },
	{ path: paths.messages, heading: 'Messages' },
	{ path: paths.rainbow, heading: 'Rainbow Hour' },
	{ path: paths.crunch, heading: 'Crunch Time' },
];

for (const { path, heading } of pages) {
	test(`${path} renders its heading and navigation`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('heading', { name: heading, level: 1, exact: true })).toBeVisible();
		if ((path.startsWith('/apps/') && path !== paths.apps) || path === paths.login) {
			const account = page.getByRole('navigation', { name: 'Site account', exact: true });
			await expect(account.getByRole('link', { name: 'Jesse Hattabaugh home', exact: true })).toBeVisible();
			await expect(account.getByText('Signed out', { exact: true })).toBeVisible();
			await expect(account.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toHaveCount(0);
			await account.getByRole('link', { name: 'Jesse Hattabaugh home', exact: true }).click();
			await expect(page.getByRole('heading', { level: 1, name: 'Jesse Hattabaugh', exact: true })).toBeVisible();
			return;
		}
		const nav = page.getByRole('navigation', { name: 'Main navigation' });
		await Promise.all(['About', 'Apps', 'Send me a message', 'Colophon'].map((name) => {
			return expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
		}));
	});
	test(`${path} scores at least 90 in every Lighthouse category`, async ({ baseURL }, testInfo) => {
		test.skip(testInfo.project.name !== 'Desktop Chrome', 'Lighthouse runs on Desktop Chrome.');
		test.setTimeout(90000);
		const categories = await lighthouseAudit(new URL(path, baseURL).href);
		for (const name of ['performance', 'accessibility', 'best-practices', 'seo']) {
			expect(categories[name]?.score ?? 0, name).toBeGreaterThanOrEqual(0.9);
		}
	});
}

test('unknown URLs show the site’s 404 page', async ({ page }) => {
	const response = await page.goto(`/missing-${crypto.randomUUID()}`);
	expect(response.status()).toBe(404);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Page not found');
});

test('old contact bookmarks lead to Messages', async ({ page }) => {
	await page.goto(paths.contact);
	await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible();
});

test('apps gallery links open the apps', async ({ page }) => {
	await page.goto(paths.apps);
	await page.getByRole('link', { name: /Rainbow Hour Know when rainbows/ }).click();
	await expect(page.getByRole('heading', { name: 'Rainbow Hour', exact: true })).toBeVisible();
});
