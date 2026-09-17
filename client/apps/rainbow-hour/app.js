/**
 * <rainbow-hour-app> — Live dashboard for the Rainbow Hour PWA.
 *
 * The SSR content inside the element (explainer + coordinate form) is the
 * complete no-JS product and is never removed; this element only prepends a
 * dashboard that adds, when the platform allows:
 *   - geolocation capture (rounded to ~1 km),
 *   - a live sun-position readout from shared/solar.js,
 *   - a "check the sky now" verdict from shared/rainbow.js + device weather,
 *   - Web Push alert subscription (same VAPID/notify modules as Messages).
 * Every capability degrades to the static content below it.
 */
import { api } from './api.js';
import { fetchRainbowWeather } from './weather.js';
import { saveLocation, clearLocation } from './storage.js';
import { sunPosition } from '../../../shared/solar.js';
import {
	evaluateRainbowConditions,
	RAINBOW_SUN_ALT_MIN_DEG,
	RAINBOW_SUN_ALT_MAX_DEG,
} from '../../../shared/rainbow.js';

const COORDS_STORAGE_KEY = 'rh-coords';
const SUN_REFRESH_MS = 60 * 1000;

const dashboardTemplate = document.createElement('template');
dashboardTemplate.innerHTML = `
	<section class="rh-dash" aria-labelledby="rh-dash-title">
		<h2 id="rh-dash-title">Live sky report</h2>
		<p class="rh-location" role="status">Set your location to check the live sky.</p>
		<p class="rh-sun" role="status" aria-label="Sun position"></p>
		<div class="rh-actions">
			<button type="button" class="btn btn--outline rh-locate">📍 Use my location</button>
			<button type="button" class="btn rh-check" disabled>🌦️ Check the sky now</button>
			<button
				type="button"
				class="btn btn--ghost rh-alerts"
				aria-label="Enable rainbow alerts"
				aria-pressed="false"
				title="Enable rainbow alerts"
			>🔕</button>
		</div>
		<p class="rh-verdict" role="status" aria-label="Sky check result" hidden></p>
		<ul class="rh-factors" aria-label="Rainbow factors" hidden></ul>
	</section>
`;

class RainbowHourApp extends HTMLElement {
	/** @type {{ latitude: number, longitude: number, timezone: string } | null} */
	#coords = null;
	/** @type {ReturnType<typeof setInterval> | null} */
	#sunTimer = null;
	/** @type {HTMLParagraphElement | null} */
	#locationEl = null;
	/** @type {HTMLParagraphElement | null} */
	#sunEl = null;
	/** @type {HTMLButtonElement | null} */
	#checkBtn = null;
	/** @type {HTMLButtonElement | null} */
	#alertsBtn = null;
	/** @type {HTMLParagraphElement | null} */
	#verdictEl = null;
	/** @type {HTMLUListElement | null} */
	#factorsEl = null;

	async connectedCallback() {
		this.#buildDashboard();
		this.#registerSW();
		this.#restoreCoords();
		this.#watchManualCoords();
		this.#reflectAlertsState().catch(() => {
			return undefined;
		});
		this.#sunTimer = setInterval(() => {
			this.#updateSunReadout();
		}, SUN_REFRESH_MS);
	}

	disconnectedCallback() {
		if (this.#sunTimer) {
			clearInterval(this.#sunTimer);
		}
	}

	// ── Dashboard construction ──────────────────────────────────────────────────

	#buildDashboard() {
		this.prepend(dashboardTemplate.content.cloneNode(true));
		this.#locationEl = this.querySelector('.rh-location');
		this.#sunEl = this.querySelector('.rh-sun');
		this.#verdictEl = this.querySelector('.rh-verdict');
		this.#factorsEl = this.querySelector('.rh-factors');

		this.querySelector('.rh-locate')?.addEventListener('click', () => {
			this.#locate().catch(() => {
				return undefined;
			});
		});

		this.#checkBtn = this.querySelector('.rh-check');
		this.#checkBtn?.addEventListener('click', () => {
			this.#checkSky().catch(() => {
				return undefined;
			});
		});

		this.#alertsBtn = this.querySelector('.rh-alerts');
		this.#alertsBtn?.addEventListener('click', () => {
			if (this.#alertsBtn?.getAttribute('aria-pressed') === 'true') {
				this.#teardownAlerts().catch(() => {
					return undefined;
				});
			} else {
				this.#setupAlerts().catch(() => {
					return undefined;
				});
			}
		});
	}

	// ── Service worker ──────────────────────────────────────────────────────────

	#registerSW() {
		if (!('serviceWorker' in navigator)) {
			return;
		}
		navigator.serviceWorker
			.register('/apps/rainbow-hour/sw.js', { scope: '/apps/rainbow-hour/', type: 'module' })
			.catch((e) => {
				console.warn('SW registration failed', e);
			});
	}

	// ── Location ────────────────────────────────────────────────────────────────

	#restoreCoords() {
		try {
			const raw = localStorage.getItem(COORDS_STORAGE_KEY);
			if (raw) {
				this.#setCoords(JSON.parse(raw));
			}
		} catch {
			// Corrupted cache — ignore, the user can re-locate.
		}
	}

	/**
	 * Manual fallback: coordinates typed into the SSR form drive the check
	 * button too, so geolocation permission is optional.
	 */
	#watchManualCoords() {
		const form = this.querySelector('form[action="/apps/rainbow-hour/"]');
		form?.addEventListener('input', () => {
			if (this.#coords) {
				return;
			}
			const lat = Number(/** @type {HTMLInputElement} */ (form.querySelector('#lat'))?.value);
			const lon = Number(/** @type {HTMLInputElement} */ (form.querySelector('#lon'))?.value);
			if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
				this.#setCoords({
					latitude: lat,
					longitude: lon,
					timezone: this.#timezone(),
				});
			}
		});
	}

	/** @returns {string} */
	#timezone() {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		} catch {
			return 'UTC';
		}
	}

	async #locate() {
		if (!('geolocation' in navigator)) {
			this.#sayLocation('Geolocation is not available — enter coordinates below instead.');
			return;
		}
		this.#sayLocation('Finding you…');
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				// ~1 km precision is all the solar math needs; don't keep more.
				this.#setCoords({
					latitude: Math.round(pos.coords.latitude * 100) / 100,
					longitude: Math.round(pos.coords.longitude * 100) / 100,
					timezone: this.#timezone(),
				});
			},
			() => {
				this.#sayLocation('Location unavailable — enter coordinates below instead.');
			},
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
		);
	}

	/** @param {{ latitude: number, longitude: number, timezone: string }} coords */
	#setCoords(coords) {
		this.#coords = coords;
		try {
			localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coords));
		} catch {
			// Storage full/blocked — in-memory coords still work for this visit.
		}
		// The service worker needs the location when a wake push arrives.
		saveLocation(coords).catch(() => {
			return undefined;
		});
		this.#sayLocation(`📍 ${coords.latitude}°, ${coords.longitude}° (${coords.timezone})`);
		if (this.#checkBtn) {
			this.#checkBtn.disabled = false;
		}
		this.#updateSunReadout();
	}

	/** @param {string} text */
	#sayLocation(text) {
		if (this.#locationEl) {
			this.#locationEl.textContent = text;
		}
	}

	// ── Sun readout ─────────────────────────────────────────────────────────────

	#updateSunReadout() {
		if (!this.#sunEl) {
			return;
		}
		if (!this.#coords) {
			this.#sunEl.textContent = '';
			return;
		}
		const { altitudeDeg } = sunPosition(Date.now(), this.#coords.latitude, this.#coords.longitude);
		const rounded = Math.round(altitudeDeg);
		let text;
		if (altitudeDeg > RAINBOW_SUN_ALT_MAX_DEG) {
			text = `☀️ Sun ${rounded}° high — above the rainbow band.`;
		} else if (altitudeDeg >= RAINBOW_SUN_ALT_MIN_DEG) {
			text = `🌅 Sun ${rounded}° low — the rainbow window is open.`;
		} else if (altitudeDeg >= 0) {
			text = `🌅 Sun ${rounded}° — right at the horizon.`;
		} else {
			text = `🌙 Sun ${Math.abs(rounded)}° below the horizon.`;
		}
		this.#sunEl.textContent = text;
	}

	// ── Sky check (same evaluation the service worker runs on a wake push) ─────

	async #checkSky() {
		if (!this.#coords || !this.#verdictEl || !this.#factorsEl) {
			return;
		}
		this.#verdictEl.hidden = false;
		this.#verdictEl.textContent = 'Checking the sky…';
		this.#factorsEl.hidden = true;
		if (this.#checkBtn) {
			this.#checkBtn.disabled = true;
		}

		try {
			const weather = await fetchRainbowWeather(this.#coords.latitude, this.#coords.longitude);
			const sun = sunPosition(Date.now(), this.#coords.latitude, this.#coords.longitude);
			const result = evaluateRainbowConditions(
				{ sunAltitudeDeg: sun.altitudeDeg, sunAzimuthDeg: sun.azimuthDeg },
				weather,
			);

			this.#verdictEl.textContent = result.likely
				? `🌈 Rainbow likely — look ${result.direction}!`
				: 'No rainbow likely right now.';

			this.#factorsEl.replaceChildren(
				...result.factors.map((f) => {
					const li = document.createElement('li');
					li.dataset.pass = String(f.pass);
					li.textContent = `${f.pass ? '✓' : '✗'} ${f.label}`;
					return li;
				}),
			);
			this.#factorsEl.hidden = false;
		} catch {
			this.#verdictEl.textContent = 'Weather check failed — try again in a moment.';
		} finally {
			if (this.#checkBtn) {
				this.#checkBtn.disabled = false;
			}
		}
	}

	// ── Alerts (same push modules as the Messages app) ──────────────────────────

	async #reflectAlertsState() {
		if (
			!('PushManager' in window) ||
			!('serviceWorker' in navigator) ||
			!('Notification' in window) ||
			Notification.permission !== 'granted'
		) {
			return;
		}
		const reg = await navigator.serviceWorker.ready;
		const existing = await reg.pushManager.getSubscription();
		if (existing) {
			this.#markAlertsEnabled();
		}
	}

	async #setupAlerts() {
		if (!this.#coords) {
			this.#sayLocation('Set your location first — alerts need to know where the sun is.');
			return;
		}
		if (
			!('PushManager' in window) ||
			!('serviceWorker' in navigator) ||
			!('Notification' in window)
		) {
			this.#sayLocation('Alerts need a browser with Web Push support.');
			return;
		}

		let permission;
		try {
			permission = await Notification.requestPermission();
		} catch {
			return;
		}
		if (permission !== 'granted') {
			this.#sayLocation('Alerts stay off until notification permission is granted.');
			return;
		}

		const { vapidPublicKey } = await api.getConfig();
		if (!vapidPublicKey) {
			this.#sayLocation('Alerts are not configured on the server yet.');
			return;
		}

		const reg = await navigator.serviceWorker.ready;
		let subscription = await reg.pushManager.getSubscription();
		if (!subscription) {
			subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: this.#urlBase64ToUint8Array(vapidPublicKey),
			});
		}

		const { endpoint, keys } = /** @type {any} */ (subscription.toJSON());
		await api.subscribeAlerts({
			endpoint,
			keys,
			latitude: this.#coords.latitude,
			longitude: this.#coords.longitude,
			timezone: this.#coords.timezone,
		});
		await saveLocation(this.#coords);
		this.#markAlertsEnabled();
	}

	async #teardownAlerts() {
		if (!('serviceWorker' in navigator)) {
			return;
		}
		try {
			const reg = await navigator.serviceWorker.ready;
			const existing = await reg.pushManager.getSubscription();
			if (existing) {
				await existing.unsubscribe();
				await api.unsubscribeAlerts(existing.endpoint);
			}
			await clearLocation();
		} catch {
			// Ignore teardown failures — the server drops dead endpoints (410).
		}
		this.#markAlertsDisabled();
	}

	#markAlertsEnabled() {
		if (!this.#alertsBtn) {
			return;
		}
		this.#alertsBtn.setAttribute('aria-pressed', 'true');
		this.#alertsBtn.setAttribute('aria-label', 'Rainbow alerts enabled');
		this.#alertsBtn.title = 'Rainbow alerts enabled';
		this.#alertsBtn.textContent = '🔔';
	}

	#markAlertsDisabled() {
		if (!this.#alertsBtn) {
			return;
		}
		this.#alertsBtn.setAttribute('aria-pressed', 'false');
		this.#alertsBtn.setAttribute('aria-label', 'Enable rainbow alerts');
		this.#alertsBtn.title = 'Enable rainbow alerts';
		this.#alertsBtn.textContent = '🔕';
	}

	/**
	 * Convert VAPID public key (base64url uncompressed P-256) to Uint8Array for PushManager.
	 * @param {string} b64url
	 */
	#urlBase64ToUint8Array(b64url) {
		const padded =
			b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}
}

customElements.define('rainbow-hour-app', RainbowHourApp);
