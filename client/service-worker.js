const CACHE_NAME = 'site-v1';
const PRECACHE_URLS = [
	'/',
	'/about',
	'/colophon',
	'/thanks',
	'/styles/main.css',
	'/enhance/index.js',
	'/manifest.webmanifest',
	'/favicon.svg',
	'/icons/apple-touch-icon.png',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
];

const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(PRECACHE_URLS);
			})
			.then(() => {
				return worker.skipWaiting();
			}),
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => {
				return Promise.all(
					keys
						.filter((key) => {
							return key !== CACHE_NAME;
						})
						.map((key) => {
							return caches.delete(key);
						}),
				);
			})
			.then(() => {
				return worker.clients.claim();
			}),
	);
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
	const cache = await caches.open(CACHE_NAME);

	try {
		const response = await fetch(request);
		cache.put(request, response.clone());
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) {
			return cached;
		}

		return (await cache.match('/')) ?? Response.error();
	}
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	const network = fetch(request)
		.then((response) => {
			if (response.ok) {
				cache.put(request, response.clone());
			}

			return response;
		})
		.catch(() => {
			return cached ?? Response.error();
		});

	return cached ?? network;
}

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const url = new URL(event.request.url);
	if (url.origin !== worker.location.origin) {
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(networkFirst(event.request));
		return;
	}

	event.respondWith(staleWhileRevalidate(event.request));
});
