import { render } from '../shared/html.js';
import { rainbowHourPage } from '../shared/templates/rainbow-hour.js';
import { rainbowWindows } from '../shared/solar.js';
import {
	saveRainbowSubscription,
	deleteRainbowSubscription,
} from '../shared/data/rainbow.js';
import { SECURITY_HEADERS } from './security-headers.js';

const JSON_CT = { 'Content-Type': 'application/json' };

/** @param {unknown} data @param {number} [status] */
function json(data, status = 200) {
	return new Response(JSON.stringify(data), { status, headers: JSON_CT });
}

/** @param {string} msg @param {number} [status] */
function err(msg, status = 400) {
	return json({ error: msg }, status);
}

const HTML_HEADERS = { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS };

/**
 * Parse a coordinate query parameter. Returns undefined when absent, NaN when
 * present but not a finite number.
 * @param {string | null} raw
 * @returns {number | undefined}
 */
function parseCoord(raw) {
	if (raw === null || raw.trim() === '') {
		return undefined;
	}
	return Number(raw);
}

/**
 * Render the Rainbow Hour page — the no-JS baseline plus the JS mount point.
 * A GET form supplies ?lat=&lon=; valid coordinates get today's rainbow
 * windows server-rendered into the page, invalid ones a 422 re-render.
 * @param {Request} request
 * @returns {Response}
 */
function renderRainbowPage(request) {
	const url = new URL(request.url);
	const latRaw = url.searchParams.get('lat');
	const lonRaw = url.searchParams.get('lon');
	const values = { lat: latRaw ?? '', lon: lonRaw ?? '' };

	if (latRaw === null && lonRaw === null) {
		return new Response(render(rainbowHourPage()), { status: 200, headers: HTML_HEADERS });
	}

	const lat = parseCoord(latRaw);
	const lon = parseCoord(lonRaw);
	if (lat === undefined || lon === undefined) {
		return new Response(
			render(rainbowHourPage({ error: 'Both latitude and longitude are required.', values })),
			{ status: 422, headers: HTML_HEADERS },
		);
	}
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return new Response(
			render(rainbowHourPage({ error: 'Latitude and longitude must be numbers.', values })),
			{ status: 422, headers: HTML_HEADERS },
		);
	}
	if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
		return new Response(
			render(
				rainbowHourPage({
					error: 'Latitude must be within ±90 and longitude within ±180.',
					values,
				}),
			),
			{ status: 422, headers: HTML_HEADERS },
		);
	}

	const windows = rainbowWindows(Date.now(), lat, lon);
	return new Response(render(rainbowHourPage({ values, windows })), {
		status: 200,
		headers: HTML_HEADERS,
	});
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response | null>}  null = route not matched here
 */
export async function handleRainbowApi(request, env) {
	const url = new URL(request.url);
	const path = url.pathname;
	const { method } = request;
	const { DB, VAPID_PUBLIC_KEY } = env;

	// ── Page: SSR shell (no-JS baseline + JS app mount point) ───────────────────

	if (method === 'GET' && path === '/apps/rainbow-hour/') {
		return renderRainbowPage(request);
	}

	// ── Config: VAPID public key for PushManager.subscribe ─────────────────────

	if (method === 'GET' && path === '/apps/rainbow-hour/api/config') {
		return json({ vapidPublicKey: VAPID_PUBLIC_KEY ?? null });
	}

	// ── Alerts: subscribe / unsubscribe (anonymous, keyed by push endpoint) ────

	if (method === 'POST' && path === '/apps/rainbow-hour/api/subscribe') {
		const body = /** @type {any} */ (await request.json());
		const { endpoint, keys } = body ?? {};
		const latitude = Number(body?.latitude);
		const longitude = Number(body?.longitude);
		const timezone = String(body?.timezone ?? '');

		if (!endpoint || !/^https:\/\//.test(String(endpoint))) {
			return err('A valid https push endpoint is required');
		}
		if (!keys?.p256dh || !keys?.auth) {
			return err('Missing subscription keys');
		}
		if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
			return err('Latitude must be a number within ±90');
		}
		if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
			return err('Longitude must be a number within ±180');
		}
		if (!timezone || timezone.length > 100) {
			return err('Timezone is required');
		}

		// Round to ~1 km — solar math needs no more, so no precise location is kept.
		await saveRainbowSubscription(DB, {
			id: crypto.randomUUID(),
			endpoint: String(endpoint),
			p256dh: String(keys.p256dh),
			auth: String(keys.auth),
			latitude: Math.round(latitude * 100) / 100,
			longitude: Math.round(longitude * 100) / 100,
			timezone,
		});
		return json({ ok: true });
	}

	if (method === 'DELETE' && path === '/apps/rainbow-hour/api/subscribe') {
		const body = /** @type {any} */ (await request.json());
		if (!body?.endpoint) {
			return err('endpoint required');
		}
		await deleteRainbowSubscription(DB, String(body.endpoint));
		return json({ ok: true });
	}

	return null;
}
