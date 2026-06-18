/** @type {any} */
const sw = self;

const CACHE = 'messages-v1';
const PRECACHE = [
	'/apps/messages/',
	'/apps/messages/icon.svg',
	'/styles/base.css',
	'/apps/messages/styles.css',
];

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
								return k !== CACHE;
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

		// API calls: always network, never cache
		if (url.pathname.startsWith('/apps/messages/api/')) {
			event.respondWith(fetch(event.request));
			return;
		}

		// App shell and static assets: cache-first, fall back to network
		if (
			url.origin === sw.location.origin &&
			(url.pathname.startsWith('/apps/messages/') || PRECACHE.includes(url.pathname))
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

				// Fetch the actual message content using the session cookie (same origin)
				try {
					const res = await fetch('/apps/messages/api/messages/latest', {
						credentials: 'include',
					});
					if (res.ok) {
						const { senderName, content } = await res.json();
						if (senderName && content) {
							body = `${senderName}: ${content.slice(0, 100)}`;
						}
					}
				} catch {
					// Use generic message on fetch failure
				}

				await sw.registration.showNotification(title, {
					body,
					icon: '/apps/messages/icon.svg',
					badge: '/apps/messages/icon.svg',
					vibrate: [200, 100, 200],
					data: { url: '/apps/messages/' },
					actions: [{ action: 'open', title: 'Open' }],
				});
			})(),
		);
	},
);

// ── Notification click: focus or open the app ────────────────────────────────

sw.addEventListener(
	'notificationclick',
	/** @param {any} event */ (event) => {
		event.notification.close();
		event.waitUntil(
			sw.clients
				.matchAll({ type: 'window', includeUncontrolled: true })
				.then((/** @type {any[]} */ clientList) => {
					for (const client of clientList) {
						if (client.url.includes('/apps/messages/')) {
							return client.focus();
						}
					}
					return sw.clients.openWindow('/apps/messages/');
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
