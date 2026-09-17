/**
 * Rainbow Hour service worker (module type — imports the same shared solar and
 * rainbow modules the page and Worker use).
 *
 * The server only ever sends a "rainbow-check" wake push when the subscriber's
 * sun is inside the rainbow band. Everything after that happens on the device:
 * this worker reads the subscriber's coarse location from IndexedDB, fetches
 * live weather from Open-Meteo, and shows a notification ONLY when the rainbow
 * heuristic passes. Silent otherwise.
 */

/** @type {any} */
const sw = self;

const APP_URL = '/apps/rainbow-hour/';
const ICON_URL = '/apps/rainbow-hour/icon.svg';

import { sunPosition } from '../../../shared/solar.js';
import { evaluateRainbowConditions } from '../../../shared/rainbow.js';
import { fetchRainbowWeather } from './weather.js';
import { loadLocation } from './storage.js';

// ── Install / activate: take over promptly, nothing to precache ───────────────

sw.addEventListener('install', () => {
	sw.skipWaiting();
});

sw.addEventListener('activate', /** @param {any} event */ (event) => {
	event.waitUntil(sw.clients.claim());
});

// ── Push: wake up, check the local sky, notify only on a likely rainbow ───────

/**
 * The device-side decision: is a rainbow actually likely right now, here?
 * Runs the exact same evaluation the page's "check the sky now" button uses.
 */
async function handleWakeCheck() {
	const location = await loadLocation().catch(() => {
		return null;
	});
	if (!location) {
		// Subscribed before location was stored — nothing to check. A benign
		// notice keeps the push user-visible; opening the app repairs state.
		await sw.registration.showNotification('Rainbow Hour', {
			body: 'Tap to set your location for rainbow alerts.',
			icon: ICON_URL,
			badge: ICON_URL,
			data: { url: APP_URL },
		});
		return;
	}

	let verdict;
	try {
		const weather = await fetchRainbowWeather(location.latitude, location.longitude);
		const sun = sunPosition(Date.now(), location.latitude, location.longitude);
		verdict = evaluateRainbowConditions(
			{ sunAltitudeDeg: sun.altitudeDeg, sunAzimuthDeg: sun.azimuthDeg },
			weather,
		);
	} catch {
		// Weather unreachable — stay silent rather than guess.
		return;
	}

	if (!verdict.likely) {
		// No rainbow likely: silent. (Chrome may show a generic "site updated
		// in the background" notice; the wake cadence keeps these rare.)
		return;
	}

	await sw.registration.showNotification('🌈 Rainbow hour!', {
		body: `Rain is clearing under a low sun — look ${verdict.direction} for a rainbow.`,
		icon: ICON_URL,
		badge: ICON_URL,
		vibrate: [200, 100, 200],
		tag: 'rainbow-hour', // collapse repeats within the same window
		data: { url: APP_URL },
		actions: [{ action: 'open', title: 'Look!' }],
	});
}

/** @param {string | undefined} rawPayload */
async function handlePush(rawPayload) {
	/** @type {{ type?: string } | null} */
	let payload = null;
	if (rawPayload) {
		try {
			payload = JSON.parse(rawPayload);
		} catch {
			// Malformed payload — falls through to the generic notification.
		}
	}

	if (payload?.type === 'rainbow-check') {
		await handleWakeCheck();
		return;
	}

	// Unknown/missing payload — still show something benign (userVisibleOnly).
	await sw.registration.showNotification('Rainbow Hour', {
		body: 'Tap to check the sky for rainbow conditions.',
		icon: ICON_URL,
		badge: ICON_URL,
		data: { url: APP_URL },
	});
}

sw.addEventListener(
	'push',
	/** @param {any} event */ (event) => {
		event.waitUntil(handlePush(event.data?.text()));
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
						if (client.url.includes(APP_URL)) {
							return client.focus();
						}
					}
					return sw.clients.openWindow(APP_URL);
				}),
		);
	},
);

// ── Message from page ─────────────────────────────────────────────────────────

sw.addEventListener(
	'message',
	/** @param {any} event */ (event) => {
		if (event.data?.type === 'SKIP_WAITING') {
			sw.skipWaiting();
		}
	},
);
