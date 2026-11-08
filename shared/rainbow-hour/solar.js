/**
 * Sun position and "rainbow window" math.
 *
 * Pure functions, no platform APIs — the same module runs in the Worker
 * (cron wake scheduling, server-rendered window times), the page dashboard,
 * and the service worker (push-time checks).
 *
 * Accuracy: low-precision NOAA solar equations (~1° / a few minutes). Rainbows
 * are not a transit-timing application; this is far more precise than needed.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Sun altitude and azimuth for a moment in time and a place on Earth.
 * Azimuth is measured clockwise from true North (0° = N, 90° = E, 180° = S).
 * @param {number} dateMs  Unix epoch milliseconds
 * @param {number} latitudeDeg
 * @param {number} longitudeDeg  east-positive
 * @returns {{ altitudeDeg: number, azimuthDeg: number }}
 */
export function sunPosition(dateMs, latitudeDeg, longitudeDeg) {
	const jd = dateMs / 86400000 + 2440587.5;
	const n = jd - 2451545.0; // days since J2000.0

	// Ecliptic coordinates of the sun (NOAA low-precision formulas)
	const meanLon = (280.46 + 0.9856474 * n) % 360;
	const meanAnom = ((357.528 + 0.9856003 * n) % 360) * RAD;
	const eclipticLon =
		(meanLon + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom)) * RAD;
	const obliquity = (23.439 - 0.0000004 * n) * RAD;

	// Equatorial coordinates
	const rightAsc = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLon), Math.cos(eclipticLon));
	const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLon));

	// Sidereal time → hour angle
	const gmstHours = (18.697374558 + 24.06570982441908 * n) % 24;
	const localSidereal = ((gmstHours * 15 + longitudeDeg) % 360) * RAD;
	const hourAngle = localSidereal - rightAsc;

	const lat = latitudeDeg * RAD;
	const sinAlt =
		Math.sin(lat) * Math.sin(declination) +
		Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
	const altitudeDeg = Math.asin(Math.min(1, Math.max(-1, sinAlt))) * DEG;

	const azimuthRad = Math.atan2(
		-Math.cos(declination) * Math.sin(hourAngle),
		Math.sin(declination) * Math.cos(lat) -
			Math.cos(declination) * Math.sin(lat) * Math.cos(hourAngle),
	);
	const azimuthDeg = (azimuthRad * DEG + 360) % 360;

	return { altitudeDeg, azimuthDeg };
}

/**
 * Which band edge (if either) lies strictly between two altitudes.
 * @param {number} altA
 * @param {number} altB
 * @param {number} minAlt
 * @param {number} maxAlt
 * @returns {number | null}
 */
function altBetween(altA, altB, minAlt, maxAlt) {
	const lo = Math.min(altA, altB);
	const hi = Math.max(altA, altB);
	if (lo < minAlt && hi > minAlt) {
		return minAlt;
	}
	if (lo < maxAlt && hi > maxAlt) {
		return maxAlt;
	}
	return null;
}

/**
 * Bisect between two adjacent samples to find where altitude crosses a band
 * edge, to ~1-minute precision. `enter` crossings cross the nearest band edge
 * from outside to inside; `exit` crossings the reverse.
 * @param {{ t: number, alt: number }} a
 * @param {{ t: number, alt: number }} b
 * @param {number} minAlt
 * @param {number} maxAlt
 * @param {number} latitudeDeg
 * @param {number} longitudeDeg
 * @param {'enter' | 'exit'} kind
 * @returns {number}  crossing time in ms
 */
function refineCrossing(a, b, minAlt, maxAlt, latitudeDeg, longitudeDeg, kind) {
	// Pick the band edge actually being crossed: the one whose value lies
	// strictly between the two sample altitudes.
	const edge = altBetween(a.alt, b.alt, minAlt, maxAlt);
	if (edge === null) {
		return b.t; // not a clean crossing (numerical noise) — keep the sample
	}

	let lo = a.t;
	let hi = b.t;
	for (let i = 0; i < 7; i++) { // 7 halvings of 10 min ≈ 47 s precision
		const mid = (lo + hi) / 2;
		const midAlt = sunPosition(mid, latitudeDeg, longitudeDeg).altitudeDeg;
		const midInside = midAlt > minAlt && midAlt < maxAlt;
		// Enter: keep the boundary inside [lo, hi] where lo is outside.
		// Exit: keep the boundary where lo is inside.
		if (kind === 'enter') {
			if (midInside) {
				hi = mid;
			} else {
				lo = mid;
			}
		} else {
			if (midInside) {
				lo = mid;
			} else {
				hi = mid;
			}
		}
	}
	return (lo + hi) / 2;
}

/**
 * The time ranges in a day when rainbows are physically possible: the sun is
 * above the horizon but below ~42° (the rainbow cone half-angle), so light can
 * reach falling rain opposite the sun. At low solar declinations / high
 * latitudes the midday sun never exceeds 42° and the two windows merge into one.
 *
 * The day is anchored on local solar midnight (approximated from longitude),
 * not a timezone — callers without a zone still get the correct window times
 * back as absolute UTC instants.
 *
 * @param {number} dateMs  any moment inside the day to inspect
 * @param {number} latitudeDeg
 * @param {number} longitudeDeg
 * @param {{ minAltitudeDeg?: number, maxAltitudeDeg?: number }} [opts]  override the rainbow band
 * @returns {Array<{ startMs: number, endMs: number }>}  in chronological order, possibly empty or merged
 */
export function rainbowWindows(dateMs, latitudeDeg, longitudeDeg, opts = {}) {
	const minAlt = opts.minAltitudeDeg ?? 0;
	const maxAlt = opts.maxAltitudeDeg ?? 42;

	// Local solar midnight ≈ UTC midnight shifted by longitude (15° per hour).
	const utcMidnight = Math.floor(dateMs / 86400000) * 86400000;
	const dayStart = utcMidnight - (longitudeDeg / 15) * 3600000;
	const dayEnd = dayStart + 86400000;

	const STEP_MS = 10 * 60 * 1000; // coarse 10-minute samples, refined below
	const samples = [];
	for (let t = dayStart; t <= dayEnd; t += STEP_MS) {
		samples.push({ t, alt: sunPosition(t, latitudeDeg, longitudeDeg).altitudeDeg });
	}

	/** @type {Array<{ startMs: number, endMs: number }>} */
	const windows = [];
	let open = null;
	for (let i = 0; i < samples.length; i++) {
		const { alt } = samples[i];
		const inBand = alt > minAlt && alt < maxAlt;
		if (inBand && open === null) {
			open =
				i === 0
					? dayStart
					: refineCrossing(samples[i - 1], samples[i], minAlt, maxAlt, latitudeDeg, longitudeDeg, 'enter');
		} else if (!inBand && open !== null) {
			const endMs = refineCrossing(samples[i - 1], samples[i], minAlt, maxAlt, latitudeDeg, longitudeDeg, 'exit');
			windows.push({ startMs: open, endMs });
			open = null;
		}
	}
	if (open !== null) {
		windows.push({ startMs: open, endMs: dayEnd });
	}
	return windows;
}
