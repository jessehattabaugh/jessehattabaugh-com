/** Public assets omit runtime ownership directories; source imports stay intact.
 * @param {string} source Path relative to the staging root, using URL separators.
 */
export function publicAssetPath(source) {
	return source.replace(/^client\/(?:shared\/)?/, '');
}
