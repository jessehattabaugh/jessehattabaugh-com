import { mkdir, writeFile, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../shared/html.js';
import { home } from '../shared/templates/home.js';
import { about } from '../shared/templates/about.js';
import { colophon } from '../shared/templates/colophon.js';
import { thanks } from '../shared/templates/thanks.js';
import { apps } from '../shared/templates/apps.js';
import { notFound } from '../shared/templates/not-found.js';
import { error } from '../shared/templates/error.js';

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

	await mkdir(OUT, { recursive: true });

	// Static pages
	await writePage('/', render(home()));
	await writePage('/about', render(about()));
	await writePage('/colophon', render(colophon()));
	await writePage('/thanks', render(thanks()));
	await writePage('/apps', render(apps()));
	await writePage('/404', render(notFound()));
	await writePage('/500', render(error()));

	// Copy static assets (includes client/apps/messages/* PWA files)
	const clientDir = join(ROOT, 'client');
	await cp(clientDir, OUT, { recursive: true });

	console.log('Build complete →', OUT);
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
