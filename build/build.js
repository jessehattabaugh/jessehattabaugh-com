import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../shared/html.js';
import { staticRoutes } from '../shared/routes.js';
import { staticPages } from './pages.js';
import { componentCatalog } from './shared/components.js';
import { loadSocial } from '../shared/data/atproto.js';
import { workerVariables } from './shared/environment.js';
import { buildActorCard } from './rpg-actor-card.js';
import { buildBranding } from './branding.js';
import { copyClientAssets } from './assets.js';

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
	const handle = workerVariables().ATPROTO_HANDLE;
	if (!handle) { throw new Error('ATPROTO_HANDLE must be configured'); }
	const social = await loadSocial(handle);
	await mkdir(join(OUT, 'atproto'), { recursive: true });
	await writeFile(join(OUT, 'atproto', 'snapshot.json'), JSON.stringify(social), 'utf8');

	// Static pages
	await Promise.all(staticRoutes.map((route) => {
		return writePage(route.path, render(staticPages[route.name](social)));
	}));
	await writeFile(join(OUT, '404.html'), render(staticPages.notFound()), 'utf8');

	await copyClientAssets(ROOT, OUT);
	// Let consumers and agents discover modules without scraping documentation.
	await writeFile(join(OUT, 'components', 'catalog.json'), JSON.stringify({ components: componentCatalog }, null, '\t'), 'utf8');
	await buildBranding(OUT, social);
	await buildActorCard(OUT, social);

	console.log('Build complete →', OUT);
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
