/** Let Parcel link bundles at short public URLs without exposing source roots. */
import { Namer } from '@parcel/plugin';
import { extname, join, relative, sep } from 'node:path';
import { publicAssetPath } from './shared/public-assets.js';

export default new Namer({
	name({ bundle, options }) {
		const entry = bundle.getMainEntry();
		if (!entry || bundle.bundleBehavior === 'inline') { return null; }
		const source = relative(options.projectRoot, entry.filePath).split(sep).join('/');
		if (source === 'build/site.json') { return 'index.html'; }
		if (!source.startsWith('client/') && !source.startsWith('build/generated/') && !source.startsWith('dist/inputs/images/')) { return null; }
		const path = publicAssetPath(source);
		if (!extname(path)) { return path; }
		const extension = extname(path);
		const hash = source.startsWith('build/generated/') || source.startsWith('dist/inputs/images/') || bundle.isEntry || bundle.needsStableName ? '' : `-${bundle.hashReference}`;
		const name = `${path.slice(0, -extension.length)}${hash}.${bundle.type}`;
		return relative(bundle.target.distDir, join(options.projectRoot, 'dist', 'client', name)).split(sep).join('/');
	},
});
