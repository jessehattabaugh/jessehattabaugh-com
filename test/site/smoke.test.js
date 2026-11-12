import { test, expect } from '@playwright/test';
import { lighthouseAudit } from '../shared/lighthouse.js';
import { routeCatalog, paths } from '../../shared/routes.js';

const pages = routeCatalog.filter((route) => { return route.heading; });

for (const { path, heading } of pages) {
	test(`${path} renders its heading and navigation`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('heading', { name: heading, level: 1, exact: true })).toBeVisible();
		const footer = page.getByRole('contentinfo');
		await expect(footer.getByRole('status', { name: 'Site page views' })).toBeVisible();
		const portrait = page.getByRole('img', { name: 'Bluesky avatar', exact: true });
		await expect(portrait).toBeVisible();
		await expect.poll(() => { return portrait.evaluate((img) => { return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0; }); }).toBe(true);
		if ((path.startsWith('/apps/') && path !== paths.apps)) {
			const account = page.getByRole('navigation', { name: 'Site account', exact: true });
			await expect(account.getByRole('link', { name: 'Jesse Hattabaugh home', exact: true })).toBeVisible();
			await expect(account.getByText('Signed out', { exact: true })).toBeVisible();
			await expect(account.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toHaveCount(0);
			await account.getByRole('link', { name: 'Jesse Hattabaugh home', exact: true }).click();
			await expect(page.getByRole('heading', { level: 1, name: 'Useful tools and web experiments', exact: true })).toBeVisible();
			return;
		}
		const nav = page.getByRole('navigation', { name: 'Main navigation' });
		await Promise.all(['About', 'Apps', 'Games', 'Contact', 'Components'].map((name) => {
			return expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
		}));
		await expect(nav.getByRole('listitem').getByRole('link')).toHaveText(['About', 'Apps', 'Games', 'Contact', 'Components']);
		if (path === paths.home) {
			const main = page.getByRole('main');
			await expect(main.getByRole('link', { name: 'Explore the apps', exact: true })).toBeVisible();
			await expect(main.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', paths.messages);
			await expect(main.getByRole('complementary', { name: 'Bluesky profile' })).toHaveCount(0);
			await expect(main.getByRole('region', { name: 'Latest from Bluesky' })).toHaveCount(0);
		}
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
	const response = await page.goto(`/missing-${crypto.randomUUID()}/nested/page`);
	expect(response.status()).toBe(404);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Page not found');
	await expect.poll(() => { return page.getByRole('img', { name: 'Bluesky avatar', exact: true }).evaluate((image) => { return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0; }); }).toBe(true);
});

for (const path of ['/server/index.js', '/shared/data/atproto.js', '/build/assets.js', '/client/tsconfig.service-workers.json', '/client/package.json', '/apps/package.json', '/build/site.json', '/build/artwork/portrait.svg', '/dist/inputs/site.json', '/client/styles/main.css', '/client/enhance/index.js', '/client/components/disclosure-panel/index.js']) {
	test(`private source URL ${path} shows the standard 404 page`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1, name: 'Page not found', exact: true })).toBeVisible();
	});
}

for (const path of ['/giving', '/giving/', '/apps/messages/verify', '/apps/messages/logout', '/apps/messages/profile', '/client/shared/styles/main.css', '/client/shared/enhance/index.js', '/client/shared/components/disclosure-panel/index.js', '/client/icon.svg']) {
	test(`retired URL ${path} returns 404`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
	});
}

test('contact redirects permanently to Jessages', async ({ page, request }) => {
	const redirect = await request.get(paths.contact, { maxRedirects: 0 });
	expect(redirect.status()).toBe(301);
	expect(redirect.headers().location).toBe(paths.messages);
	await page.goto(paths.contact);
	await expect(page).toHaveURL(new URL(paths.messages, page.url()).href);
	await expect(page.getByRole('heading', { name: 'Jessages', level: 1, exact: true })).toBeVisible();
});

test('apps gallery links open the apps', async ({ page }) => {
	await page.goto(paths.apps);
	await page.getByRole('link', { name: /Rainbow Hour Know when rainbows/ }).click();
	await expect(page.getByRole('heading', { name: 'Rainbow Hour', exact: true })).toBeVisible();
});

test('Jessages explains email verification and offers sign-in beneath the form', async ({ page }) => {
	await page.goto(paths.messages);
	await expect(page.getByText('Messages to Jesse', { exact: true })).toBeVisible();
	await expect(page.getByText('Install this app to be notified of replies', { exact: true })).toBeVisible();
	const form = page.getByRole('form', { name: 'Send message', exact: true });
	const link = page.getByRole('link', { name: 'Sign in to your conversation', exact: true });
	expect((await link.boundingBox()).y).toBeGreaterThan((await form.boundingBox()).y);
	await link.click();
	await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
	await expect(page.getByRole('contentinfo')).toBeVisible();
});
