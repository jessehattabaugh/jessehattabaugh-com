/** Cache only public assets and a fixed offline page, never device history. */
export {};
/** @type {any} */
const service = /** @type {any} */ (self);
const CACHE = 'crunch-time-public-v1';
const offline = new URL('./offline.html', service.registration.scope).href;
const assets = [offline, '/styles/app.css', '/styles/base.css', '/apps/crunch-time/style.css', '/apps/crunch-time/mochi.svg'];
service.addEventListener('install', /** @param {any} event */ (event) => { event.waitUntil(caches.open(CACHE).then((cache) => { return cache.addAll(assets); }).then(() => { return service.skipWaiting(); })); });
service.addEventListener('activate', /** @param {any} event */ (event) => { event.waitUntil(caches.keys().then((keys) => { return Promise.all(keys.filter((key) => { return key.startsWith('crunch-time-public-') && key !== CACHE; }).map((key) => { return caches.delete(key); })); }).then(() => { return service.clients.claim(); })); });
service.addEventListener('fetch', /** @param {any} event */ (event) => {
	if (event.request.method !== 'GET') { return; }
	const url = new URL(event.request.url);
	if (url.origin !== service.location.origin) { return; }
	if (event.request.mode === 'navigate' && url.pathname.startsWith('/apps/crunch-time/')) {
		event.respondWith(fetch(event.request).catch(async () => { const cached = await caches.match(offline); return cached ? new Response(cached.body, { headers: cached.headers }) : Response.error(); }));
	} else if (assets.some((asset) => { return new URL(asset, service.location.origin).href === url.href; })) {
		event.respondWith(caches.match(event.request).then((cached) => { return cached ?? fetch(event.request); }));
	}
});
