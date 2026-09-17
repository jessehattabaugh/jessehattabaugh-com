/**
 * Rainbow formation heuristic.
 *
 * A rainbow needs three things at once:
 *   1. Airborne water drops — rain falling now or very recently, opposite the sun.
 *   2. Sunlight reaching those drops — broken clouds / clearing skies, not heavy
 *      gray overcast and not deep night.
 *   3. A low sun — the rainbow circle is centered on the anti-solar point at
 *      42° from the sun; the sun must be above the horizon but below ~42° for
 *      the arc to clear the ground.
 *
 * Pure functions over inputs the caller supplies (sun position from
 * shared/solar.js, weather from the device's own Open-Meteo fetch) so the same
 * decision runs in the page and in the service worker. Thresholds are
 * deliberately coarse — this is a "look up!" nudge, not a forecast product.
 */

/** Sun altitude band in which rainbows can appear. Shared by client checks and the wake cron. */
export const RAINBOW_SUN_ALT_MIN_DEG = 2;
export const RAINBOW_SUN_ALT_MAX_DEG = 42;

/** Rain (mm) within the last 3 hours that counts as "drops in the air". */
export const RECENT_RAIN_MM = 0.2;

/** Ongoing precipitation (mm/h) light enough for sun to break through. */
export const MAX_CURRENT_RAIN_MM = 0.5;

/** Cloud cover (%) at which the sky is broken enough for direct sunlight. */
export const MAX_CLOUD_COVER_PCT = 75;

/** WMO weather codes that imply intermittent sun (rain showers). @type {Set<number>} */
const SHOWER_CODES = new Set([80, 81, 82]);

const OCTANTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/**
 * Compass direction to look for a rainbow: opposite the sun. Morning rainbows
 * hang in the west (sun in the east) and vice versa.
 * @param {number} sunAzimuthDeg  clockwise from true North
 * @returns {string}  octant name, e.g. "west"
 */
export function antiSolarDirection(sunAzimuthDeg) {
	const antiSolar = (sunAzimuthDeg + 180) % 360;
	const index = Math.round(antiSolar / 45) % 8;
	return OCTANTS[index] ?? 'up';
}

/** @typedef {{ recentRainMm: number, currentRainMm: number, cloudCoverPct: number, weatherCode: number }} RainbowWeather */

/** @typedef {{ label: string, pass: boolean }} Factor */

/**
 * Evaluate whether conditions favor a rainbow right now.
 * @param {{ sunAltitudeDeg: number, sunAzimuthDeg: number }} sun
 * @param {RainbowWeather} weather
 * @returns {{ likely: boolean, direction: string, factors: Array<Factor> }}
 */
export function evaluateRainbowConditions(sun, weather) {
	const wet = weather.recentRainMm >= RECENT_RAIN_MM || weather.currentRainMm > 0;
	const sunLow =
		sun.sunAltitudeDeg >= RAINBOW_SUN_ALT_MIN_DEG &&
		sun.sunAltitudeDeg <= RAINBOW_SUN_ALT_MAX_DEG;
	const bright =
		(weather.cloudCoverPct <= MAX_CLOUD_COVER_PCT || SHOWER_CODES.has(weather.weatherCode)) &&
		weather.currentRainMm <= MAX_CURRENT_RAIN_MM;

	const factors = [
		{ label: 'Rain in the air', pass: wet },
		{ label: 'Sun low on the horizon', pass: sunLow },
		{ label: 'Bright spells', pass: bright },
	];

	return {
		likely: wet && sunLow && bright,
		direction: antiSolarDirection(sun.sunAzimuthDeg),
		factors,
	};
}
