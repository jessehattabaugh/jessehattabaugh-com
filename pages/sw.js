/**
 * Service Worker page handler
 * Serves the PWA service worker from the root path
 * @param {Object} event - Lambda event object
 * @returns {Object} Response object with service worker JavaScript
 */
export async function get() {
	const serviceWorkerContent = `/**
 * Service Worker for PWA functionality
 * Provides basic caching for offline capability
 */

const CACHE_NAME = 'jesse-hattabaugh-v1';
const STATIC_CACHE_URLS = [
	'/',
	'/about',
	'/hello',
	'/static/styles/all.css',
	'/static/icons/icon-192x192.png',
	'/static/icons/icon-512x512.png'
];

// Install event - cache static resources
globalThis.addEventListener('install', (event) => {
	console.info('🔧⚙️ Service worker installing');
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.info('🔧💾 Caching static resources');
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.then(() => {
				console.info('🔧✅ Service worker installed successfully');
				return globalThis.skipWaiting();
			})
			.catch((error) => {
				console.error('🔧❌ Service worker install failed:', error);
				throw error;
			})
	);
});

// Activate event - clean up old caches
globalThis.addEventListener('activate', (event) => {
	console.info('🔧🔄 Service worker activating');
	event.waitUntil(
		caches.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_NAME)
						.map((cacheName) => {
							console.info('🔧🗑️ Deleting old cache:', cacheName);
							return caches.delete(cacheName);
						})
				);
			})
			.then(() => {
				console.info('🔧✅ Service worker activated successfully');
				return globalThis.clients.claim();
			})
			.catch((error) => {
				console.error('🔧❌ Service worker activation failed:', error);
				throw error;
			})
	);
});

// Fetch event - serve from cache, fallback to network
globalThis.addEventListener('fetch', (event) => {
	// Only handle GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	event.respondWith(
		caches.match(event.request)
			.then((cachedResponse) => {
				if (cachedResponse) {
					console.debug('🔧💾 Serving from cache:', event.request.url);
					return cachedResponse;
				}

				console.debug('🔧🌐 Fetching from network:', event.request.url);
				return fetch(event.request)
					.then((response) => {
						// Don't cache non-successful responses
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}

						// Clone the response since it can only be consumed once
						const responseToCache = response.clone();

						// Cache the response for future use
						return caches.open(CACHE_NAME)
							.then((cache) => {
								return cache.put(event.request, responseToCache);
							})
							.then(() => response);
					})
					.catch((error) => {
						console.error('🔧❌ Fetch failed:', error);
						// Return a fallback response for navigation requests
						if (event.request.mode === 'navigate') {
							return caches.match('/');
						}
						throw error;
					});
			})
	);
});`;

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/javascript',
			'Cache-Control': 'public, max-age=3600'
		},
		body: serviceWorkerContent
	};
}