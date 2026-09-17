/**
 * Device-side weather lookup for Rainbow Hour.
 *
 * Uses Open-Meteo (free, keyless, CORS-enabled) so the check runs on the
 * device — in the page for the manual "check now" button and in the service
 * worker when a wake push arrives. The server never sees weather data.
 *
 * "Now" is anchored on the API's own current.time rather than the device
 * clock, so a skewed clock (or a faked one in tests) can't misalign the
 * recent-rain window.
 */

/** @typedef {import('../../../shared/rainbow.js').RainbowWeather} RainbowWeather */

/** How far back (seconds) rain still counts as "drops in the air". */
const RECENT_WINDOW_SEC = 3 * 3600;

/**
 * Fetch current + recent weather and normalize it to the inputs
 * evaluateRainbowConditions() expects.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<RainbowWeather>}
 */
export async function fetchRainbowWeather(latitude, longitude) {
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(latitude));
	url.searchParams.set('longitude', String(longitude));
	url.searchParams.set('current', 'weather_code,precipitation,cloud_cover');
	url.searchParams.set('hourly', 'precipitation');
	url.searchParams.set('past_hours', '3');
	url.searchParams.set('forecast_hours', '1');
	url.searchParams.set('timezone', 'auto');
	url.searchParams.set('timeformat', 'unixtime');

	const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
	if (!res.ok) {
		throw new Error(`Weather service error (${res.status})`);
	}
	const data = /** @type {any} */ (await res.json());

	const nowSec = Number(data.current?.time) || Math.floor(Date.now() / 1000);
	const times = /** @type {number[]} */ (data.hourly?.time ?? []);
	const precip = /** @type {number[]} */ (data.hourly?.precipitation ?? []);

	let recentRainMm = 0;
	for (let i = 0; i < times.length; i++) {
		const t = times[i];
		if (t > nowSec - RECENT_WINDOW_SEC && t <= nowSec + RECENT_WINDOW_SEC) {
			recentRainMm += precip[i] ?? 0;
		}
	}

	return {
		recentRainMm,
		currentRainMm: Number(data.current?.precipitation ?? 0),
		cloudCoverPct: Number(data.current?.cloud_cover ?? 100),
		weatherCode: Number(data.current?.weather_code ?? 3),
	};
}
