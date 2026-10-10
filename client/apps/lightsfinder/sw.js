/** Offline shell only: never cache private pages, mutations, photos, or map tiles. */
export {};
/** @type {any} */
const service = /** @type {any} */ (self);
const CACHE = 'lightsfinder-shell-v2';
const OFFLINE = new URL('./offline.html', service.registration.scope).href;
service.addEventListener('install', /** @param {any} event */ (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => {return cache.addAll([OFFLINE, new URL('./icon.svg', service.registration.scope).href])}).then(() => {return service.skipWaiting()}));
});
service.addEventListener('activate', /** @param {any} event */ (event) => {
	event.waitUntil(caches.keys().then((keys) => {return Promise.all(keys.filter((key) => {return key.startsWith('lightsfinder-shell-') && key !== CACHE}).map((key) => {return caches.delete(key)}))}).then(() => {return service.clients.claim()}));
});
service.addEventListener('fetch', /** @param {any} event */ (event) => {
	if (event.request.method !== 'GET' || event.request.mode !== 'navigate') { return; }
	event.respondWith(fetch(event.request).catch(async () => {
		const cached = await caches.match(OFFLINE);
		// Assets can canonicalize .html to an extensionless URL. Rebuilding the
		// response prevents a cached redirected response from failing navigation.
		return cached ? new Response(cached.body, { status: 200, headers: cached.headers }) : Response.error();
	}));
});
