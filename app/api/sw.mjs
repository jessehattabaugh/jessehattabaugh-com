/** This file must be served from the root of the site in order to cache files in the root.
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	return {
		body: `importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-sw.js',
);
const { registerRoute } = workbox.routing;
const { CacheFirst } = workbox.strategies;
registerRoute(() => true, new CacheFirst());
console.debug('👋👷‍♂️ service worker loaded');`,
		headers: { 'content-type': 'text/javascript' },
	};
}
