self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open('v1').then((cache) => {
			console.info('opened cache');
			return cache.addAll(['/']);
		}),
	);
	console.info('service worker installed');
});

self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches.match(event.request).then((response) => {
			if (response) {
				console.info('file found in cache');
				return response;
			}
			return fetch(event.request);
		}),
	);
});

console.info('service worker initialized');
