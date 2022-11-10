import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

registerRoute(() => {
	return true;
}, new StaleWhileRevalidate());

console.debug('👋👷‍♂️ service worker loaded');
