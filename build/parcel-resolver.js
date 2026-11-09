/** Resolve public asset URLs to source files while leaving Worker URLs at runtime. */
import { Resolver } from '@parcel/plugin';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { paths } from '../shared/routes.js';
import { componentCatalog } from './shared/components.js';

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
		if (path.endsWith('.js') && componentCatalog.some(({ tag }) => { return target.includes(`/components/${tag}/`); })) {
			return { isExternal: true };
		}
		if (dependency.specifierType !== 'url' || /^[\w-]+:/.test(path)) { return null; }
		// HTML resolves against the public tree; JS imports resolve against source.
		const publicPath = path.startsWith('/') ? path.slice(1) : relative(options.projectRoot, target);
		const filePath = [join(options.projectRoot, 'client', publicPath), join(options.projectRoot, 'client', 'shared', publicPath)]
			.find((candidate) => { return existsSync(candidate); });
		return filePath ? { filePath } : null;
	},
});
