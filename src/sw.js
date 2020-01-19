importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js',
);

// precache all the static files w/ workbox-cli injectManifest
workbox.precaching.precacheAndRoute([]);

// handle POSTS to the share form with backgroundSync
workbox.routing.registerRoute(
	/share.html/,
	new workbox.strategies.NetworkOnly({
		plugins: [
			new workbox.backgroundSync.Plugin('shareQueue', {
				maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
			}),
		],
	}),
	'POST',
);
