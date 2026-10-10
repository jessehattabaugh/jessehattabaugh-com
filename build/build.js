import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../shared/html.js';
import { staticRoutes } from '../shared/routes.js';
import { staticPages } from '../shared/pages.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'dist', 'client');

/**
 * @param {string} path  URL path, e.g. "/" or "/about"
 * @param {string} html  Full HTML string
 */
async function writePage(path, html) {
	const dir = path === '/' ? OUT : join(OUT, ...path.split('/').filter(Boolean));
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, 'index.html'), html, 'utf8');
	console.log(`  wrote ${path}`);
}

async function build() {
	console.log('Building static site...');

	// Start clean — files deleted from client/ or the page list must not
	// linger as stale artifacts from a previous build in the same working tree.
	await rm(OUT, { recursive: true, force: true });
	await mkdir(OUT, { recursive: true });

	// Static pages
	await Promise.all(staticRoutes.map((route) => {
		return writePage(route.path, render(staticPages[route.name]()));
	}));
	await writeFile(join(OUT, '404.html'), render(staticPages.notFound()), 'utf8');

	// Copy static assets (includes client/apps/* PWA files)
	const clientDir = join(ROOT, 'client');
	await cp(clientDir, OUT, { recursive: true });

	// Client-side runtime modules imported by the Rainbow Hour app
	// (page dashboard + module service worker) from /shared/*.js — one source
	// of truth shared with the Worker, copied into the served asset tree.
	const sharedOut = join(OUT, 'shared');
	await mkdir(sharedOut, { recursive: true });
	await cp(join(ROOT, 'shared', 'solar.js'), join(sharedOut, 'solar.js'));
	await cp(join(ROOT, 'shared', 'rainbow.js'), join(sharedOut, 'rainbow.js'));
	await cp(join(ROOT, 'shared', 'weather.js'), join(sharedOut, 'weather.js'));

	console.log('Build complete →', OUT);
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
