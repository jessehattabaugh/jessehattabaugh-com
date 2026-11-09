/** Public JSON metadata is data, not a JavaScript import. */
import { Transformer } from '@parcel/plugin';

export default new Transformer({
	transform({ asset }) {
		asset.setCode(JSON.stringify(JSON.parse(asset.getCode())));
	},
});
