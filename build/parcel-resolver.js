/** Resolve public asset URLs to source files while leaving Worker URLs at runtime. */
import { Resolver } from '@parcel/plugin';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { paths } from '../shared/routes.js';
import { generatedPaths, imageInput, publicAssetPath } from './shared/public-assets.js';
import { componentEntries } from './component-catalog.js';

export default new Resolver({
	resolve({ specifier, dependency, options }) {
		const [path] = specifier.split('?');
		// The fallback document is served at arbitrary missing URLs, so its shared
		// assets must remain root-relative rather than follow the requested directory.
		if (dependency.specifierType === 'url' && dependency.resolveFrom?.endsWith('/404.html')) {
			return { isExcluded: true };
		}
		if (dependency.specifierType === 'url' && [paths.atBlob, paths.atAvatar].includes(path)) {
			return { isExcluded: true };
		}
		const target = path.startsWith('/') ? path : resolve(dirname(dependency.resolveFrom ?? ''), path);
		// These library targets keep native named exports and one module identity.
		if (path.endsWith('.js') && componentEntries.some((component) => { return target.includes(component.path); })) {
			return { isExternal: true };
		}
		if (dependency.specifierType !== 'url' || /^[\w-]+:/.test(path)) { return null; }
		// Prepared image sources are real inputs; let Parcel's native resolver read them.
		if (target.startsWith(join(options.projectRoot, 'dist', 'inputs'))) { return null; }
		// HTML resolves against the public tree; JS imports resolve against source.
		const publicPath = path.startsWith('/') ? path.slice(1) : publicAssetPath(relative(options.projectRoot, target));
		if (generatedPaths(options.projectRoot).includes(publicPath)) {
			// Image dependencies are registered once against their prepared PNG
			// inputs; rendered documents keep the short canonical output names.
			if (imageInput(publicPath)) { return { isExternal: true }; }
			return {
				filePath: join(options.projectRoot, 'build', 'generated', publicPath), code: publicPath, pipeline: 'generated',
			};
		}
		const filePath = [join(options.projectRoot, 'client', publicPath), join(options.projectRoot, 'client', 'shared', publicPath)]
			.find((candidate) => { return existsSync(candidate); });
		if (!filePath) { return null; }
		const metadata = /\/components\/[^/]+\/(?:[^/]+\.json|README\.md|LICENSE)$/.test(filePath);
		return { filePath, ...(metadata ? { pipeline: 'raw' } : {}) };
	},
});
