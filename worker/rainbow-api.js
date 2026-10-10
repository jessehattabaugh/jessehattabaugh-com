import { render } from '../shared/html.js';
import { rainbowHourPage, rainbowHourFragment } from '../shared/templates/rainbow-hour.js';
import { rainbowWindows, sunPosition } from '../shared/solar.js';
import { evaluateRainbowConditions } from '../shared/rainbow.js';
import { fetchRainbowWeather } from '../shared/weather.js';
import { saveRainbowSubscription, deleteRainbowSubscription, hasRainbowSubscription } from '../shared/data/rainbow.js';
import { paths } from '../shared/routes.js';
import { readForm } from './request.js';
import { getSessionUser } from './session.js';
import { getUserById } from '../shared/data/messages.js';

/** @param {Request} request @param {import('../shared/templates/rainbow-hour.js').RainbowData} data @param {number} [status] */
function page(request, data, status = 200) {
	return new Response(render(request.headers.get('X-Fragment') === 'true' ? rainbowHourFragment(data) : rainbowHourPage(data)), {
		status, headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment' },
	});
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
export async function handleRainbowApi(request, env) {
	const url = new URL(request.url);
	const session = await getSessionUser(request, env.SESSION_SECRET);
	const user = session ? await getUserById(env.DB, session) : null;
	const vapidPublicKey = env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : undefined;
	if (url.pathname === paths.rainbow) {
		const lat = url.searchParams.get('lat');
		const lon = url.searchParams.get('lon');
		const values = { lat: lat ?? '', lon: lon ?? '' };
		if (lat === null && lon === null) { return page(request, { user, vapidPublicKey }); }
		const latitude = Number(lat), longitude = Number(lon);
		if (!lat?.trim() || !lon?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
			return page(request, { user, values, vapidPublicKey, error: 'Enter latitude within ±90 and longitude within ±180.' }, 422);
		}
		const windows = rainbowWindows(Date.now(), latitude, longitude);
		if (url.searchParams.get('sky') === '1') {
			try {
				const weather = await fetchRainbowWeather(latitude, longitude);
				const sun = sunPosition(Date.now(), latitude, longitude);
				const verdict = evaluateRainbowConditions({ sunAltitudeDeg: sun.altitudeDeg, sunAzimuthDeg: sun.azimuthDeg }, weather);
				return page(request, { user, values, windows, verdict, vapidPublicKey });
			} catch (error) {
				console.error('Weather check failed', error);
				return page(request, { user, values, windows, vapidPublicKey, error: 'Weather is unavailable. Your rainbow windows are still shown; try the sky check again later.' }, 503);
			}
		}
		return page(request, { user, values, windows, vapidPublicKey });
	}
	if (url.pathname === paths.rainbowPush) {
		const form = await readForm(request);
		const endpoint = String(form.get('endpoint') ?? '');
		if (!endpoint.startsWith('https://')) { return page(request, { user, error: 'A valid push subscription is required.' }, 422); }
		if (form.get('operation') === 'status') {
			return Response.json({ enabled: await hasRainbowSubscription(env.DB, endpoint) });
		}
		if (form.get('operation') === 'unsubscribe') {
			await deleteRainbowSubscription(env.DB, endpoint);
		} else {
			const latitude = Number(form.get('latitude'));
			const longitude = Number(form.get('longitude'));
			const timezone = String(form.get('timezone') ?? '');
			const p256dh = String(form.get('p256dh') ?? '');
			const auth = String(form.get('auth') ?? '');
			if (!form.get('latitude') || !form.get('longitude') || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !timezone || timezone.length > 100 || !p256dh || !auth) {
				return page(request, { user, error: 'Valid coordinates, timezone, and subscription keys are required.' }, 422);
			}
			await saveRainbowSubscription(env.DB, { id: crypto.randomUUID(), endpoint, p256dh, auth, latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100, timezone });
		}
		return new Response(null, { status: 303, headers: { Location: paths.rainbow } });
	}
	return null;
}
