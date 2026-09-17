import { sunPosition } from '../shared/solar.js';
import { RAINBOW_SUN_ALT_MIN_DEG, RAINBOW_SUN_ALT_MAX_DEG } from '../shared/rainbow.js';
import {
	listRainbowSubscriptions,
	markRainbowNotified,
	deleteRainbowSubscription,
} from '../shared/data/rainbow.js';
import { notifyAll } from './vapid.js';

/**
 * Minimum spacing between wake pushes per device. The browser may show a
 * "site updated in the background" notice for silent checks (we only display
 * a real notification when the sky cooperates), so wakes are kept sparse.
 */
const WAKE_MIN_INTERVAL_MS = 55 * 60 * 1000;

/**
 * Rainbow Hour wake cron — the server's only job in this app is knowing *when*
 * to knock; the device decides *whether* a rainbow is actually likely.
 *
 * For every subscription whose sun is currently inside the rainbow band
 * (low enough for rainbows, high enough to light them) and which has not been
 * woken in the last hour, send a silent-ish Web Push ({type:'rainbow-check'}).
 * The service worker then checks live weather from the device and shows a
 * notification only when rainbow conditions hold.
 *
 * Runs on the production Worker only — preview versions never get cron
 * triggers, so branches never push to real devices.
 * @param {import('../shared/types.js').Env} env
 */
export async function rainbowWakeCron(env) {
	const { DB, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT } = env;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		return;
	}

	const subs = await listRainbowSubscriptions(DB);
	const now = Date.now();
	const eligible = subs.filter((sub) => {
		const { altitudeDeg } = sunPosition(now, sub.latitude, sub.longitude);
		const sunInBand =
			altitudeDeg >= RAINBOW_SUN_ALT_MIN_DEG && altitudeDeg <= RAINBOW_SUN_ALT_MAX_DEG;
		const notRecentlyWoken =
			sub.last_notified_at === null || now - sub.last_notified_at >= WAKE_MIN_INTERVAL_MS;
		return sunInBand && notRecentlyWoken;
	});

	if (eligible.length === 0) {
		return;
	}

	const vapid = {
		vapidPublicKey: VAPID_PUBLIC_KEY,
		vapidPrivateKey: VAPID_PRIVATE_KEY,
		vapidContact: VAPID_CONTACT ?? 'mailto:claude_ai@jessehattabaugh.com',
	};
	const onGone = (/** @type {string} */ endpoint) => {
		return deleteRainbowSubscription(DB, endpoint);
	};

	// Same notifyAll (VAPID JWT + RFC 8291 encryption) the Messages app uses.
	await notifyAll(eligible, vapid, onGone, JSON.stringify({ type: 'rainbow-check' }));
	await Promise.all(eligible.map((sub) => {
		return markRainbowNotified(DB, sub.endpoint, now);
	}));
}
