/** Render registered pages; publish browser modules and assets exactly as authored. */
import * as fs from 'node:fs/promises';
import { globSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { Hono } from 'hono';
import { toSSG } from 'hono/ssg';
import { prepareInputs } from './prepare-inputs.js';
import { ROOT } from './shared/preview.js';
import { siteInputs, sitemapFiles } from './shared/public-assets.js';
import { staticRoutes } from '../shared/routes.js';
import { render } from '../shared/html.js';
import { componentCatalog, kitCatalog } from './component-catalog.js';

const out = join(ROOT, 'dist', 'client');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
await prepareInputs(ROOT);
const { social, origin } = siteInputs(ROOT);

/** Fail on output collisions rather than silently overwriting an authored file.
 * @param {string} path @param {string | Uint8Array} content */
async function publish(path, content) {
	const target = join(out, path);
	await fs.mkdir(dirname(target), { recursive: true });
	await fs.writeFile(target, content, { flag: 'wx' });
}

// Client paths ARE public paths. No dependency discovery, rewriting, bundling,
// transpilation or minification: imports and URLs are resolved by the browser.
await Promise.all(globSync('client/**/*', { cwd: ROOT, exclude: ['**/AGENTS.md', '**/tsconfig*.json'] }).map(async (path) => {
	const source = join(ROOT, path);
	if (!(await fs.stat(source)).isFile()) { return; }
	await publish(relative('client', path), await fs.readFile(source));
}));
// These pure Rainbow Hour modules are shared with the server. Publish only this
// explicitly public feature, never the root shared directory (templates/data).
await Promise.all(globSync('shared/rainbow-hour/*.js', { cwd: ROOT }).map(async (path) => {
	await publish(path, await fs.readFile(join(ROOT, path)));
}));
// Self-host only the upstream ES modules the browser renderer imports.
await Promise.all([
	'core.min.js', 'languages/xml.min.js', 'languages/css.min.js',
	'languages/javascript.min.js', 'languages/bash.min.js',
].map(async (path) => {
	await publish(`vendor/highlightjs/${path}`, await fs.readFile(join(ROOT, 'node_modules/@highlightjs/cdn-assets/es', path)));
}));
await publish('vendor/highlightjs/LICENSE', await fs.readFile(join(ROOT, 'node_modules/@highlightjs/cdn-assets/LICENSE')));
await publish('shared/code-highlight.js', await fs.readFile(join(ROOT, 'shared/code-highlight.js')));
await Promise.all(globSync('dist/inputs/images/**/*', { cwd: ROOT }).map(async (path) => {
	const source = join(ROOT, path);
	if ((await fs.stat(source)).isFile()) { await publish(relative('dist/inputs/images', path), await fs.readFile(source)); }
}));

const site = new Hono();
const seen = new Set();
await Promise.all(staticRoutes.map(async (route) => {
	if (seen.has(route.path)) { throw new Error(`Duplicate static route: ${route.path}`); }
	seen.add(route.path);
	const [module, name] = /** @type {[string, string]} */ (route.template);
	const template = (await import(new URL(`../${module}`, import.meta.url).href))[name];
	if (typeof template !== 'function') { throw new Error(`Missing template ${module}#${name}`); }
	site.get(route.path, (context) => {
		return context.html(render(template(social, new URLSearchParams(), origin, route)));
	});
}));
const generated = await toSSG(site, fs, { dir: out });
if (!generated.success) { throw generated.error ?? new Error('Static rendering failed'); }
// The asset binding requests this filename when a route is missing.
await publish('404.html', await fs.readFile(join(out, '404/index.html')));
const sitemap = sitemapFiles(origin);
await Promise.all([
	publish('atproto/snapshot.json', JSON.stringify(social)),
	publish('components/catalog.json', JSON.stringify({ components: componentCatalog, kits: kitCatalog })),
	publish('sitemap.xml', sitemap.xml), publish('robots.txt', sitemap.robots),
	publish('branding/icon.svg', await fs.readFile(join(ROOT, 'dist/inputs/icon.svg'))),
]);
console.log(`Published ${generated.files.length} pages and native browser assets to ${basename(out)}.`);
