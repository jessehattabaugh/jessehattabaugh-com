/** Holiday dates are UTC; movable/local festivals can use Other with a label. */
export const holidays = [
	{ id: 'halloween', name: 'Halloween', icon: '🎃', month: 10, day: 31, theme: 'halloween' },
	{ id: 'christmas', name: 'Christmas', icon: '🎄', month: 12, day: 25, theme: 'christmas' },
	{ id: 'new-year', name: 'New Year', icon: '✨', month: 1, day: 1, theme: 'new-year' },
	{ id: 'valentine', name: 'Valentine’s Day', icon: '💗', month: 2, day: 14, theme: 'valentine' },
	{ id: 'pride', name: 'Pride', icon: '🌈', month: 6, day: 30, theme: 'pride' },
	{ id: 'other', name: 'Other holiday / festival', icon: '🏮', month: 0, day: 0, theme: 'other' },
];

/** @param {Date} [now] */
export function upcomingHoliday(now = new Date()) {
	const today = now.toISOString().slice(0, 10);
	return holidays.filter((h) => { return h.month; }).map((h) => {
		let date = new Date(Date.UTC(now.getUTCFullYear(), h.month - 1, h.day));
		if (date.toISOString().slice(0, 10) < today) { date = new Date(Date.UTC(now.getUTCFullYear() + 1, h.month - 1, h.day)); }
		return { ...h, date };
	}).sort((a, b) => { return a.date.getTime() - b.date.getTime(); })[0];
}

/** @param {number} lat @param {number} lon @param {number} zoom */
export function project(lat, lon, zoom) {
	const size = 256 * 2 ** zoom;
	const sine = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
	return { x: (lon + 180) / 360 * size, y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size };
}

/** Great-circle kilometers, for candidate selection only; never driving distance.
 * @param {{lat: number, lon: number}} a @param {{lat: number, lon: number}} b */
export function distance(a, b) {
	const rad = Math.PI / 180;
	const d = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
	return 12742 * Math.asin(Math.min(1, Math.sqrt(d)));
}

/** @param {string} value */
export const normalize = (value) => { return value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' '); };

/** Named festivals get their own map and awards, rather than one mixed Other bucket.
 * @param {string} id @param {string} [custom] */
export function holidayKey(id, custom = '') {
	if (id === 'other' && custom.trim()) { return `custom:${normalize(custom)}`; }
	return id;
}
/** @param {string} id */
export function validHoliday(id) {
	return holidays.some((h) => { return h.id === id; }) || (id.startsWith('custom:') && id.length > 7 && id.length <= 107);
}
