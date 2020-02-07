import createRouter from 'https://cdn.pika.dev/router5/^7.0.2';
import browserPlugin from 'https://cdn.pika.dev/router5-plugin-browser/^7.0.2';

export const router = createRouter([
	{ name: 'home', path: '/' },
	{ name: 'resume', path: '/resume.html' },
	{ name: 'share', path: '/share.html' },
	{ name: 'success', path: '/success.html' },
]);
router.usePlugin(browserPlugin());
router.start();
console.debug('router started');