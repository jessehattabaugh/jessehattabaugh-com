/** Let Parcel link bundles at short public URLs without exposing source roots. */
import { Namer } from '@parcel/plugin';
import { extname, relative, sep } from 'node:path';
import { publicAssetPath } from './shared/public-assets.js';

export default new Namer({
	name({ bundle, options }) {
		const entry = bundle.getMainEntry();
		if (!entry || bundle.bundleBehavior === 'inline') { return null; }
		const source = relative(options.projectRoot, entry.filePath).split(sep).join('/');
		if (!source.startsWith('client/')) { return null; }
		const path = publicAssetPath(source);
		const extension = extname(path);
		const hash = bundle.isEntry || bundle.needsStableName ? '' : `-${bundle.hashReference}`;
		return `${path.slice(0, -extension.length)}${hash}.${bundle.type}`;
	},
});
