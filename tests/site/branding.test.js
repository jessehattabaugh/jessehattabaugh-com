import { test, expect } from '@playwright/test';
import { paths } from '../../shared/routes.js';

for (const [path, root] of [
	[paths.home, '/branding'],
	[paths.login, '/branding'],
	[paths.messages, '/apps/messages'],
	[paths.rainbow, '/apps/rainbow-hour'],
	[paths.lightsfinder, '/apps/lightsfinder'],
	[paths.crunch, '/apps/crunch-time'],
]) {
	test(`${path} uses its own favicon and install icons with the shared site portrait`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('img', { name: 'Bluesky avatar', exact: true })).toBeVisible();
		// Head metadata has no semantic/ARIA selector. Read the native link controls
		// and decode their actual images in the deployed browser, without mocks.
		const links = await page.evaluate(() => {
			return Array.from(document.head.getElementsByTagName('link')).map((link) => {
				return { rel: link.rel, href: link.href, path: new URL(link.href).pathname };
			});
		});
		const icons = links.filter((link) => { return link.rel === 'icon' || link.rel === 'apple-touch-icon'; });
		expect(icons.map((link) => { return link.path; })).toEqual([`${root}/icon-32.png`, `${root}/icon.svg`, `${root}/apple-touch-icon.png`]);
		/** @param {string} src */
		const dimensions = (src) => {
			return page.evaluate(async (url) => {
				const image = new Image(); image.src = url; await image.decode();
				return [image.naturalWidth, image.naturalHeight];
			}, src);
		};
		expect(await dimensions(icons[0].href)).toEqual([32, 32]);
		expect((await dimensions(icons[1].href))[0]).toBeGreaterThan(0);
		expect(await dimensions(icons[2].href)).toEqual([180, 180]);
		const manifestLink = links.find((link) => { return link.rel === 'manifest'; });
		expect(manifestLink).toBeTruthy();
		const response = await page.request.get(manifestLink.href);
		expect(response.ok()).toBe(true);
		const manifest = await response.json();
		await Promise.all([192, 512].map(async (size) => {
			const icon = manifest.icons.find((item) => { return item.sizes === `${size}x${size}`; });
			expect(icon).toBeTruthy();
			const url = new URL(icon.src, manifestLink.href);
			expect(url.pathname).toBe(`${root}/icon-${size}.png`);
			expect(await dimensions(url.href)).toEqual([size, size]);
		}));
	});
}
