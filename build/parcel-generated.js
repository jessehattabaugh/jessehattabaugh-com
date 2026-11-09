/** Feed generated content back through Parcel's native HTML/XML pipelines. */
import { Transformer } from '@parcel/plugin';
import { extname } from 'node:path';
import { generatedContent } from './shared/public-assets.js';

export default new Transformer({
	transform({ asset, options }) {
		const path = asset.getCode();
		const content = generatedContent(path, options.projectRoot);
		asset.type = extname(path).slice(1);
		if (typeof content === 'string') { asset.setCode(content); }
		else { asset.setBuffer(content); }
	},
});
