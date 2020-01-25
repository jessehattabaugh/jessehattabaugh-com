importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js',
);

workbox.precaching.cleanupOutdatedCaches();

// html pages should serve potentially stale cached content first but check the network for updates each time
workbox.routing.registerRoute(
	new RegExp('/*.html'),
	new workbox.strategies.StaleWhileRevalidate({
		cacheName: 'start_url',
	}),
);

// handle POSTS to the share form with backgroundSync
workbox.routing.registerRoute(
	/success.html/,
	new workbox.strategies.NetworkOnly({
		plugins: [
			new workbox.backgroundSync.Plugin('shareQueue', {
				maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
			}),
		],
	}),
	'POST',
);

// precache all the static files w/ workbox-cli injectManifest
workbox.precaching.precacheAndRoute([]);
