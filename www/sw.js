importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-sw.js');
const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate } = workbox.strategies;
registerRoute(() => {
	return true;
}, new StaleWhileRevalidate());
console.debug('👋👷‍♂️ service worker loaded');
