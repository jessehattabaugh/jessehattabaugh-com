import { test, expect } from '@playwright/test';

// This is the public URL contract, not a list of every asset or authenticated action.
const pages = ['/', '/about', '/colophon/', '/apps/', '/components/',
	'/components/rpg-actor/', '/components/disclosure-panel/', '/components/retro-game/', '/components/retro-game/relay/', '/apps/messages/',
	'/apps/rainbow-hour/', '/apps/lightsfinder/', '/apps/crunch-time/'];

test('the root sitemap lists every canonical public document and robots advertises it', async ({ page, request }) => {
	await page.goto('/');
	const response = await request.get('/sitemap.xml');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('xml');
	const locations = await page.evaluate((xml) => {
		const document = new DOMParser().parseFromString(xml, 'application/xml');
		if (document.querySelector('parsererror')) { throw new Error('Invalid sitemap XML'); }
		if (document.documentElement.namespaceURI !== 'http://www.sitemaps.org/schemas/sitemap/0.9') { throw new Error('Missing sitemap namespace'); }
		return [...document.getElementsByTagName('loc')].map((element) => { return element.textContent; });
	}, await response.text());
	const urls = locations.map((location) => { return new URL(location); });
	expect(new Set(locations).size).toBe(locations.length);
	expect(urls.map((url) => { return url.pathname; }).sort()).toEqual([...pages].sort());
	for (const url of urls) {
		expect(url.protocol).toBe('https:');
		expect(url.hostname.endsWith('.workers.dev')).toBe(false);
		expect(url.search).toBe('');
		expect(url.hash).toBe('');
	}
	const robots = await request.get('/robots.txt');
	expect(robots.status()).toBe(200);
	expect(await robots.text()).toContain(`Sitemap: ${urls[0].origin}/sitemap.xml`);
});

for (const path of pages) {
	test(`sitemap destination ${path} renders directly`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response.status()).toBe(200);
		expect(response.request().redirectedFrom()).toBeNull();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});
}
