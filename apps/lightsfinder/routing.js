import { distance } from './model.js';

/** @typedef {import('./data.js').LightPost} Post */
/** @typedef {{distance: number, duration: number, geometry: {coordinates: number[][]}, legs: Array<{steps: Array<{distance: number, name: string, maneuver: {type: string, modifier?: string}}>}>}} RoadRoute */
/** Public OSRM is replaceable with a self-hosted deployment via OSRM_URL.
 * No straight-line fallback may claim to be driving directions.
 * @param {string} base @param {string} service @param {Array<{lat: number, lon: number}>} points @param {string} query */
async function roads(base, service, points, query) {
	const url = new URL(`${service}/v1/driving/${points.map((p) => `${p.lon},${p.lat}`).join(';')}?${query}`, base.endsWith('/') ? base : `${base}/`);
	const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Lightsfinder/1.0 (holiday lights route planner)' } });
	if (!response.ok) { throw new Error('Road routing unavailable'); }
	const data = /** @type {{code: string, distances: Array<Array<number|null>>, durations: Array<Array<number|null>>, routes: RoadRoute[], waypoints: Array<{distance: number}>}} */ (await response.json());
	if (data.code !== 'Ok') { throw new Error('Road routing could not connect these locations'); }
	return data;
}
/** Greedy insertion under real road distance/time budgets; favors breadth or rating.
 * Matrix route costs are rechecked against the final turn-by-turn route.
 * @param {Post[]} posts @param {{lat: number, lon: number}} start
 * @param {{km: number, minutes: number, preference: string, base: string}} options */
export async function planCircuit(posts, start, options) {
	const unique = new Map();
	for (const p of [...posts].sort((a, b) => b.average - a.average)) { if (!unique.has(p.address_key)) { unique.set(p.address_key, p); } }
	const candidates = /** @type {Post[]} */ ([...unique.values()]).filter((p) => distance(start, p) * 2 <= options.km)
		.sort((a, b) => distance(start, a) - distance(start, b)).slice(0, 20);
	if (!candidates.length) { return null; }
	const all = [start, ...candidates];
	const matrix = await roads(options.base, 'table', all, 'annotations=distance,duration');
	/** @param {number[]} path */
	function cost(path) {
		let meters = 0, seconds = 0;
		for (let i = 1; i < path.length; i++) {
			const d = matrix.distances[path[i - 1]]?.[path[i]], t = matrix.durations[path[i - 1]]?.[path[i]];
			if (d === null || d === undefined || t === null || t === undefined) { return { meters: Infinity, seconds: Infinity }; }
			meters += d; seconds += t;
		}
		return { meters, seconds };
	}
	let path = [0, 0];
	while (path.length < 10) {
		let best = null, utility = -Infinity;
		const old = cost(path);
		for (let c = 1; c < all.length; c++) {
			if (path.includes(c)) { continue; }
			for (let i = 1; i < path.length; i++) {
				const next = [...path.slice(0, i), c, ...path.slice(i)], budget = cost(next);
				if (budget.meters > options.km * 1000 || budget.seconds > options.minutes * 60) { continue; }
				const merit = options.preference === 'best' ? (candidates[c - 1].average * candidates[c - 1].votes + 15) / (candidates[c - 1].votes + 5) : 1;
				const value = merit / Math.max(100, budget.meters - old.meters);
				if (value > utility) { utility = value; best = next; }
			}
		}
		if (!best) { break; } path = best;
	}
	if (path.length === 2) { return null; }
	// Snapping/restrictions can differ from a pairwise table. Trim until the actual circuit fits.
	while (path.length > 2) {
		const points = path.map((i) => all[i]);
		const response = await roads(options.base, 'route', points, 'steps=true&overview=simplified&geometries=geojson');
		const route = response.routes[0];
		if (!route || response.waypoints.some((p) => p.distance > 300)) { throw new Error('A location is too far from a drivable road'); }
		if (route.distance <= options.km * 1000 && route.duration <= options.minutes * 60) {
			const chosen = path.slice(1, -1).map((i) => candidates[i - 1]);
			const navigation = new URL('https://www.google.com/maps/dir/');
			navigation.search = new URLSearchParams({ api: '1', origin: `${start.lat},${start.lon}`, destination: `${start.lat},${start.lon}`, travelmode: 'driving', waypoints: chosen.map((p) => `${p.lat},${p.lon}`).join('|') }).toString();
			const steps = route.legs.flatMap((leg) => leg.steps.map((step) => `${step.maneuver.type.replaceAll('_', ' ')}${step.maneuver.modifier ? ` ${step.maneuver.modifier}` : ''}${step.name ? ` on ${step.name}` : ''} — ${Math.round(step.distance)} m`));
			return { posts: chosen, distance: route.distance, duration: route.duration, coordinates: route.geometry.coordinates, steps, navigation: navigation.href };
		}
		path.splice(-2, 1);
	}
	return null;
}
