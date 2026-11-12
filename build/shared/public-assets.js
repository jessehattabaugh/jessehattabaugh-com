/** Public asset paths, dimensions and generated contents shared by the build and Parcel.
 * Content helpers never write or copy public output; Parcel owns emission. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { staticRoutes, sitemapPaths } from '../../shared/routes.js';
import { html, render } from '../../shared/html.js';
import { staticPages } from '../pages.js';
import { componentCatalog, kitCatalog } from '../component-catalog.js';

/** @param {string} path */
export function imageInput(path) {
	return path.endsWith('.png') ? path : null;
}

/** Public assets omit runtime ownership directories; source imports stay intact.
 * @param {string} source Path relative to the project root, using URL separators.
 */
export function publicAssetPath(source) {
	return source.replace(/^dist\/inputs\/images\//, '').replace(/^build\/generated\//, '').replace(/^client\/(?:shared\/)?/, '');
}

/** Public artwork dimensions shared by source preparation and Parcel's asset graph.
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

/** @param {string} siteOrigin Canonical documents only; Parcel emits both files from these contents. */
function sitemapFiles(siteOrigin) {
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
	// Parcel tracks plugin filesystem reads, including these private Node inputs.
	return JSON.parse(readFileSync(join(root, 'dist', 'inputs', 'site.json'), 'utf8'));
}

/** @param {string} root Public generated outputs are dependencies, not staging files. */
export function generatedPaths(root) {
	return [
		...staticRoutes.filter(({ name }) => { return name !== 'home'; }).map(({ path }) => { return `${path.replace(/^\//, '').replace(/\/$/, '')}/index.html`; }),
		'404.html', 'atproto/snapshot.json', 'components/catalog.json', 'sitemap.xml', 'robots.txt',
		'components/rpg-actor/social.png', 'branding/icon.svg',
		...imageVariants(siteInputs(root).apps).map(({ path }) => { return path; }),
	];
}

/** @param {string} path @param {string} root @returns {string | Uint8Array} */
export function generatedContent(path, root) {
	const { social, origin } = siteInputs(root);
	const route = staticRoutes.find((route) => { return `${route.path.replace(/^\//, '').replace(/\/$/, '')}/index.html` === path; });
	if (route) { return render(staticPages[route.name](social, new URLSearchParams(''))); }
	if (path === '404.html') { return render(staticPages.notFound()); }
	if (path === 'atproto/snapshot.json') { return JSON.stringify(social); }
	if (path === 'components/catalog.json') { return JSON.stringify({ components: componentCatalog, kits: kitCatalog }); }
	if (path === 'sitemap.xml') { return sitemapFiles(origin).xml; }
	if (path === 'robots.txt') { return sitemapFiles(origin).robots; }
	const input = join(root, 'dist', 'inputs');
	if (path === 'branding/icon.svg') { return readFileSync(join(input, 'icon.svg'), 'utf8'); }

	throw new Error(`Unknown generated public asset: ${path}`);
}
