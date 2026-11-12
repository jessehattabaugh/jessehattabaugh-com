import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sitemapPaths } from '../../shared/routes.js';
import { html, render } from '../../shared/html.js';

/** Public artwork dimensions used by source preparation.
 * @param {string[]} apps
 */
export function imageVariants(apps) {
	return [
		{ path: 'branding/avatar-96.png', size: 96, source: 'avatar' },
		...['branding', ...apps.map((app) => { return `apps/${app}`; })].flatMap((root) => {
			const source = root === 'branding' ? 'avatar' : root.slice(5);
			return [32, 180, 192, 512].map((size) => {
				return { path: `${root}/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`, size,
					source: root === 'branding' && size === 32 ? 'icon' : source };
			});
		}),
	];
}

/** @param {string} siteOrigin Canonical documents only; the build emits both files. */
export function sitemapFiles(siteOrigin) {
	const origin = new URL(siteOrigin);
	if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
		throw new Error('SITE_ORIGIN must be an HTTPS origin without a path, query or credentials.');
	}
	// No invented lastmod dates; Google ignores changefreq and priority.
	const xml = render(html`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map((path) => { return html`<url><loc>${new URL(path, origin).href}</loc></url>`; })}</urlset>`);
	const robots = `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', origin).href}\n`;
	return { xml, robots };
}

/** @param {string} root
 * @returns {{social: import('../../shared/data/atproto.js').Social, apps: string[], origin: string}} */
export function siteInputs(root) {
	// Build inputs remain private; only explicit outputs are published.
	return JSON.parse(readFileSync(join(root, 'dist', 'inputs', 'site.json'), 'utf8'));
}

