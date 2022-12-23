/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	return {
		body: `importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-sw.js',
);
const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate } = workbox.strategies;
registerRoute(() => true, new StaleWhileRevalidate());
console.debug('👋👷‍♂️ service worker loaded');`,
		headers: { 'content-type': 'text/javascript' },
	};
}
