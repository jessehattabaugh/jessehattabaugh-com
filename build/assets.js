/** Publish only browser assets. Source ownership and public URLs are independent. */
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** @param {string} root @param {string} out */
export async function copyClientAssets(root, out) {
	// Explicit mounts preserve bookmarks, vendored component URLs, manifests,
	// offline caches, and service-worker scopes when source directories move.
	const mounts = [
		['client/apps', 'apps'],
		['client/branding', 'branding'],
		['client/icon.svg', 'icon.svg'],
		['client/manifest.webmanifest', 'manifest.webmanifest'],
		['client/shared/components', 'components'],
		['client/shared/enhance', 'enhance'],
		['client/shared/styles', 'styles'],
		['client/shared/rainbow-hour', 'apps/rainbow-hour'],
		// The only root shared modules shipped to browsers. Rendering stays private.
		['shared/rainbow-hour', 'apps/rainbow-hour'],
	];
	/** @type {Map<string, string>} Source filename → emitted filename. */
	const assets = new Map();
	/** @param {string} source @param {string} destination */
	async function collect(source, destination) {
		const entries = await readdir(source, { withFileTypes: true });
		await Promise.all(entries.map(async (entry) => {
			if (/^tsconfig(?:\.[^/]+)?\.json$/.test(entry.name)) { return; }
			const from = join(source, entry.name), to = join(destination, entry.name);
			if (entry.isDirectory()) { await collect(from, to); }
			else { assets.set(from, to); }
		}));
	}
	await Promise.all(mounts.map(async ([source, destination]) => {
		const from = resolve(root, source), to = resolve(out, destination);
		if ((await stat(from)).isFile()) { assets.set(from, to); }
		else { await collect(from, to); }
	}));
	await Promise.all([...assets].map(async ([source, destination]) => {
		await mkdir(dirname(destination), { recursive: true });
		if (!source.endsWith('.js')) { await cp(source, destination); return; }
		// Modules remain native ES modules. Rebase only relative imports/exports;
		// URL strings and new URL('./sw.js', import.meta.url) keep their public meaning.
		const script = (await readFile(source, 'utf8')).replace(/\b(from\s*|import\s*(?:\(\s*)?)(['"])(\.[^'"\n]+)\2/g, (match, prefix, quote, specifier) => {
			const target = assets.get(resolve(dirname(source), specifier));
			if (!target) { throw new Error(`Unpublished browser import in ${relative(root, source)}: ${specifier}`); }
			let url = relative(dirname(destination), target).split(sep).join('/');
			if (!url.startsWith('.')) { url = `./${url}`; }
			return `${prefix}${quote}${url}${quote}`;
		});
		await writeFile(destination, script, 'utf8');
	}));
}
