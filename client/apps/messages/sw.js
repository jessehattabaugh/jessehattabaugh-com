/** @type {any} */
const sw = self;
const APP_URL = sw.registration.scope;
const ICON_URL = new URL('icon.svg', APP_URL).pathname;

const CACHE = 'messages-v2';
const PRECACHE = ['/apps/messages/icon.svg', '/styles/base.css', '/styles/main.css', '/apps/messages/styles.css'];

// ── Install: pre-cache app shell ──────────────────────────────────────────────

sw.addEventListener(
	'install',
	/** @param {any} event */ (event) => {
		event.waitUntil(
			caches
				.open(CACHE)
				.then((c) => {
					return c.addAll(PRECACHE);
				})
				.then(() => {
					return sw.skipWaiting();
				}),
		);
	},
);

// ── Activate: claim clients ───────────────────────────────────────────────────

sw.addEventListener(
	'activate',
	/** @param {any} event */ (event) => {
		event.waitUntil(
			caches
				.keys()
				.then((keys) => {
					return Promise.all(
						keys
							.filter((k) => {
								return k.startsWith('messages-') && k !== CACHE;
							})
							.map((k) => {
								return caches.delete(k);
							}),
					);
				})
				.then(() => {
					return sw.clients.claim();
				}),
		);
	},
);

// ── Fetch: network-first for API, cache-first for assets ─────────────────────

sw.addEventListener(
	'fetch',
	/** @param {any} event */ (event) => {
		const url = new URL(event.request.url);

		// Documents, fragments and mutations always reach the server. Only the
		// explicitly precached static files below can be served from a cache.
		if (event.request.method !== 'GET' || event.request.mode === 'navigate' || event.request.headers.get('X-Fragment')) {
			event.respondWith(fetch(event.request));
			return;
		}

		// App shell and static assets: cache-first, fall back to network
		if (
			url.origin === sw.location.origin &&
			PRECACHE.includes(url.pathname)
		) {
			event.respondWith(
				caches.match(event.request).then((cached) => {
					return cached ?? fetch(event.request);
				}),
			);
		}
	},
);

// ── Push: show notification ───────────────────────────────────────────────────

sw.addEventListener(
	'push',
	/** @param {any} event */ (event) => {
		event.waitUntil(
			(async () => {
				const title = 'Messages';
				let body = 'You have a new message';
				let destination = APP_URL;

				// Read the encrypted payload the server delivered (RFC 8291). The
				// browser decrypts it before firing 'push', so event.data holds our
				// JSON. No follow-up fetch is needed — and iOS drops empty payloads.
				try {
					const raw = event.data?.text();
					if (raw) {
						const data = JSON.parse(raw);
						if (data?.senderName && data?.content) {
							body = `${data.senderName}: ${data.content.slice(0, 100)}`;
						}
						if (data?.url) {
							const target = new URL(data.url, APP_URL);
							if (target.origin === sw.location.origin && target.href.startsWith(APP_URL)) { destination = target.href; }
						}
					}
				} catch {
					// Fall back to generic message if the payload is missing/malformed.
				}

				await sw.registration.showNotification(title, {
					body,
					icon: ICON_URL,
					badge: ICON_URL,
					vibrate: [200, 100, 200],
					data: { url: destination },
					actions: [{ action: 'open', title: 'Open' }],
				});

				// Let any open clients refresh immediately (the app listens for this message).
				const clientList = await sw.clients.matchAll({
					type: 'window',
					includeUncontrolled: true,
				});
				for (const client of clientList) {
					client.postMessage({ type: 'PUSH_RECEIVED' });
				}
			})(),
		);
	},
);

// ── Notification click: focus or open the app ────────────────────────────────

sw.addEventListener(
	'notificationclick',
	/** @param {any} event */ (event) => {
		event.notification.close();
		const target = new URL(event.notification.data?.url ?? APP_URL, APP_URL);
		const destination = target.origin === sw.location.origin && target.href.startsWith(APP_URL) ? target.href : APP_URL;
		event.waitUntil(
			sw.clients
				.matchAll({ type: 'window', includeUncontrolled: true })
				.then(async (/** @type {any[]} */ clientList) => {
					const client = clientList.find((item) => { return item.url.startsWith(APP_URL); });
					if (client) {
						await client.navigate(destination);
						return client.focus();
					}
					return sw.clients.openWindow(destination);
				}),
		);
	},
);

// ── Message from app: trigger refresh ────────────────────────────────────────

sw.addEventListener(
	'message',
	/** @param {any} event */ (event) => {
		if (event.data?.type === 'SKIP_WAITING') {
			sw.skipWaiting();
		}
	},
);
