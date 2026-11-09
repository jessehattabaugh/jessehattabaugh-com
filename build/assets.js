/** Parcel owns browser dependency resolution, bundling, and minification. */
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publicAssetPath } from './shared/public-assets.js';
import { componentCatalog } from './shared/components.js';
import { execFileSync } from 'node:child_process';

/** Stage source domains intact; only Parcel's reachable browser graph is emitted.
 * @param {string} root @param {string} stage
 */
export async function stageClient(root, stage) {
	await cp(join(root, 'client'), join(stage, 'client'), {
		recursive: true,
		filter: (source) => { return !/tsconfig(?:\.[^/]+)?\.json$/.test(source); },
	});
	await cp(join(root, 'shared'), join(stage, 'shared'), { recursive: true });
	// A separate Parcel project root keeps source inputs private while the
	// resolver and namer link the short public asset tree. It contains no environment files or runtime secrets.
	await writeFile(join(stage, 'package.json'), JSON.stringify({
		type: 'module', browserslist: 'last 2 Chrome versions, last 2 Firefox versions, last 2 Safari versions',
		targets: { default: { context: 'browser', outputFormat: 'esmodule' } },
	}));
	await writeFile(join(stage, 'package-lock.json'), '{"lockfileVersion":3}');
}

/** @param {string} root @param {string} stage @param {string} out */
export async function bundleClient(root, stage, out) {
	/** @type {string[]} */
	const entries = [];
	/** @param {string} directory */
	async function collect(directory) {
		await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
			const file = join(directory, entry.name);
			if (entry.isDirectory()) { await collect(file); }
			else if (!/\/components\/(?:disclosure-panel|rpg-actor)\/.*\.js$/.test(file) && !file.endsWith('/sw.js') && !file.endsWith('/social.png') && /\.(?:js|css|html|svg|png)$/.test(file)) { entries.push(file); }
			else if (/\.(?:json|webmanifest)$/.test(file) && file.includes('/client/')) {
				await writeFile(join(out, publicAssetPath(file.slice(stage.length + 1))), JSON.stringify(JSON.parse(await readFile(file, 'utf8'))));
			}
		}));
	}
	// Only runtime ownership folders are omitted; there is no legacy URL table.
	await Promise.all(['client', 'client/shared'].map((source) => {
		return cp(join(stage, source), out, {
			recursive: true,
			filter: (file) => { return (file !== join(stage, 'client', 'shared') || source === 'client/shared') && !/\.(?:js|css|html|svg)$/.test(file); },
		});
	}));
	await collect(join(stage, 'client'));
	// Only generated documents at the root, never server/shared source modules.
	await Promise.all((await readdir(stage, { withFileTypes: true })).map(async (entry) => {
		if (entry.name === 'client' || entry.name === 'shared') { return; }
		if (entry.isDirectory()) { await collect(join(stage, entry.name)); }
		else if (entry.name.endsWith('.html')) { entries.push(join(stage, entry.name)); }
	}));
	await mkdir(out, { recursive: true });
	execFileSync(join(root, 'node_modules', '.bin', 'parcel'), [
		'build', ...entries.sort(), '--config', join(root, '.parcelrc'), '--dist-dir', out, '--no-source-maps', '--no-content-hash', '--public-url', './',
	], { cwd: stage, stdio: 'inherit' });
	await Promise.all(componentCatalog.map(async ({ tag }) => {
		const directory = join(stage, 'client', 'shared', 'components', tag);
		const packagePath = join(directory, 'package.json');
		const metadata = JSON.parse(await readFile(packagePath, 'utf8'));
		metadata.exports = Object.fromEntries(Object.entries(metadata.exports).filter(([, source]) => { return String(source).endsWith('.js'); }).map(([key, source]) => {
			return [key, { source, import: `./compiled/${String(source).slice(2)}` }];
		}));
		metadata.targets = { import: { optimize: true } };
		await writeFile(packagePath, JSON.stringify(metadata));
		// Library targets preserve named exports; app bundles only run entry effects.
		execFileSync(join(root, 'node_modules', '.bin', 'parcel'), ['build', directory, '--no-source-maps'], { cwd: stage, stdio: 'inherit' });
		await cp(join(directory, 'compiled'), join(out, 'components', tag), { recursive: true });
	}));
	// Service workers have their own environment; they must never share the
	// browser's DOM bundle loader or depend on importScripts in module workers.
	const configPath = join(stage, 'package.json');
	const config = JSON.parse(await readFile(configPath, 'utf8'));
	config.targets.default.context = 'service-worker';
	await writeFile(configPath, JSON.stringify(config));
	execFileSync(join(root, 'node_modules', '.bin', 'parcel'), [
		'build', 'client/apps/*/sw.js', '--config', join(root, '.parcelrc'),
		'--dist-dir', out, '--no-source-maps', '--no-content-hash', '--public-url', './',
	], { cwd: stage, stdio: 'inherit' });
}
