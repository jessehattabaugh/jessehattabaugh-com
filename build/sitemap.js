/** Google Search sitemaps contain canonical public documents, not asset mounts. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { html, render } from '../shared/html.js';
import { sitemapPaths } from '../shared/routes.js';
import { workerVariables } from './shared/environment.js';

/** @param {string} out */
export async function writeSitemap(out) {
	const origin = new URL(workerVariables().SITE_ORIGIN);
	if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
		throw new Error('SITE_ORIGIN must be an HTTPS origin without a path, query or credentials.');
	}
	// No invented lastmod dates; Google ignores changefreq and priority.
	await writeFile(join(out, 'sitemap.xml'), render(html`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map((path) => { return html`<url><loc>${new URL(path, origin).href}</loc></url>`; })}</urlset>`));
	await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', origin).href}\n`);
}
