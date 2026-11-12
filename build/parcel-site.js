/** Render the shared templates inside Parcel and attach every public artifact. */
import { Transformer } from '@parcel/plugin';
import { render } from '../shared/html.js';
import { staticPages } from './pages.js';
import { componentEntries } from './component-catalog.js';
import { generatedPaths, imageInput, siteInputs } from './shared/public-assets.js';

export default new Transformer({
	transform({ asset, options }) {
		const { page } = JSON.parse(asset.getCode());
		if (!(page in staticPages)) { throw new Error(`Unknown site entry page: ${page}`); }
		asset.type = 'html';
		asset.setCode(render(staticPages[page](siteInputs(options.projectRoot).social)));
		for (const path of generatedPaths(options.projectRoot)) {
			const input = imageInput(path);
			const source = input ? `../dist/inputs/images/${input}` : `/${path}`;
			asset.addURLDependency(source, { isEntry: true, needsStableName: true, priority: 'lazy' });
		}
		for (const { path, manifest, package: packagePath } of componentEntries) {
			const artifacts = [manifest, `${path}README.md`, `${path}LICENSE`];
			if (packagePath) { artifacts.push(packagePath); }
			for (const artifact of artifacts) {
				asset.addURLDependency(artifact, { pipeline: 'raw', isEntry: true, needsStableName: true, priority: 'lazy' });
			}
		}
	},
});
