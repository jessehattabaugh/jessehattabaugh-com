import { html, render } from '../../shared/html.js';
import { paths } from '../../shared/routes.js';
import { sessionUser } from '../../worker/session.js';
import { readForm, RequestBodyError } from '../../worker/request.js';
import { listLights, getLight, draftPhoto, savePhoto, getPhoto, publishLight, rateLight, reportLight, moderateLight, moderationQueue, awardStandings } from './data.js';
import { lightsfinder, lightsfinderFragment, lightsHref } from './templates.js';
import { upcomingHoliday, distance, normalize, holidayKey, validHoliday } from './model.js';
import { cleanPhoto } from './photos.js';
import { planCircuit } from './routing.js';

/** @param {Request} request @param {import('./templates.js').LightsData} data @param {number} [status] */
function page(request, data, status = 200) {
	return new Response(render(request.headers.get('X-Fragment') === 'true' ? lightsfinderFragment(data) : lightsfinder(data)), { status, headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment' } });
}
/** @param {string} href */
const redirect = (href) => {return new Response(null, { status: 303, headers: { Location: href } })};
/** @param {URLSearchParams | Record<string,string>} source @param {string} name @param {number} fallback */
function numeric(source, name, fallback) {
	const raw = source instanceof URLSearchParams ? source.get(name) : source[name];
	return raw === null || raw === undefined || raw === '' ? fallback : Number(raw);
}
/** Read a bounded body even when Content-Length is missing/untruthful. @param {Request} request */
async function boundedForm(request) {
	if (!request.body) { throw new RequestBodyError(400); }
	const reader = request.body.getReader(), chunks = []; let size = 0;
	while (true) {
		// Stream chunks must be read in order and checked before reading more.
		// eslint-disable-next-line no-await-in-loop
		const { value, done } = await reader.read(); if (done) { break; }
		size += value.byteLength;
		if (size > 850000) {
			// Stop the stream immediately when its cumulative size exceeds the limit.
			// eslint-disable-next-line no-await-in-loop
			await reader.cancel();
			throw new RequestBodyError(413);
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size); let offset = 0;
	for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
	return readForm(new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }));
}
/** @param {string} value */
function validDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
/** @param {Request} request @param {import('../../shared/types.js').Env} env */
export async function handleLightsfinder(request, env) {
	const url = new URL(request.url), q = url.searchParams, today = new Date().toISOString().slice(0, 10);
	const upcoming = upcomingHoliday();
	const account = await sessionUser(request, env);
	const user = account?.email_verified ? account : null;
	if (q.has('photo') && request.method === 'GET') {
		const photo = await getPhoto(env.DB, q.get('photo') ?? '', user?.id ?? null, !!user?.is_owner);
		return photo ? new Response(photo.image instanceof ArrayBuffer ? photo.image : new Uint8Array(photo.image), { headers: { 'Content-Type': photo.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'no-store' } }) : new Response(render(html`<p>Photo not found.</p>`), { status: 404, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
	}
	/** @type {import('./templates.js').Filters} */
	const filters = {
		holiday: holidayKey(q.get('holiday') ?? upcoming.id, q.get('customHoliday') ?? ''), season: numeric(q, 'season', upcoming.date.getUTCFullYear()),
		lat: numeric(q, 'lat', 47.6062), lon: numeric(q, 'lon', -122.3321), radius: numeric(q, 'radius', 10), history: q.get('history') === '1',
		zoom: numeric(q, 'zoom', 12), view: q.get('view') ?? 'explore',
		scope: /** @type {'county'|'state'|'country'} */ (['state', 'country'].includes(q.get('scope') ?? '') ? q.get('scope') : 'county'), region: normalize(q.get('region') ?? ''), countryRegion: normalize(q.get('countryRegion') ?? ''), stateRegion: normalize(q.get('stateRegion') ?? ''),
	};
	/** @type {import('./templates.js').LightsData} */
	const data = { filters, posts: [], user, today };
	if (!validHoliday(filters.holiday) || !Number.isInteger(filters.season) || filters.season < 2000 || filters.season > new Date().getUTCFullYear() + 1 || !Number.isFinite(filters.lat) || Math.abs(filters.lat) > 85 || !Number.isFinite(filters.lon) || Math.abs(filters.lon) > 180 || !Number.isFinite(filters.radius) || filters.radius < 1 || filters.radius > 100 || !Number.isInteger(filters.zoom) || filters.zoom < 3 || filters.zoom > 16 || [filters.region, filters.countryRegion, filters.stateRegion].some((v) => {return v.length > 100}) || !['explore', 'route', 'awards', 'share', 'moderation'].includes(filters.view)) {
		data.error = 'Choose a valid holiday, season, location, and radius (1–100 km).';
		// Keep raw input visible while ensuring invalid numbers cannot render broken map URLs.
		data.values = Object.fromEntries(q);
		Object.assign(filters, { holiday: upcoming.id, season: upcoming.date.getUTCFullYear(), lat: 47.6062, lon: -122.3321, radius: 10, zoom: 12, view: 'explore' });
		return page(request, data, 422);
	}
	if (request.method === 'POST') {
		if (!user) { return new Response(null, { status: 302, headers: { Location: `${paths.login}?returnTo=lightsfinder` } }); }
		let form;
		try { form = await boundedForm(request); }
		catch (error) {
			if (!(error instanceof RequestBodyError)) { throw error; }
			return page(request, { ...data, filters: { ...filters, view: 'share' }, error: 'The upload was too large or unreadable. Choose a supported photo up to 750 KB.' }, error.status);
		}
		const v = Object.fromEntries([...form].filter(([,value]) => {return typeof value === 'string'}).map(([key,value]) => {return [key, String(value)]}));
		data.values = v;
		if (v.action === 'publish') {
			// Filters belong only to this request; no other task mutates them.
			// eslint-disable-next-line require-atomic-updates
			filters.view = 'share';
			v.holiday = holidayKey(v.holiday ?? '', v.customHoliday ?? '');
			const file = form.get('photo');
			if (file && typeof file !== 'string' && file.size) {
				const photo = cleanPhoto(await file.arrayBuffer());
				if (!photo) { data.error = 'Choose a genuine JPEG, PNG, or WebP photo up to 750 KB.'; return page(request, data, 422); }
				const id = await savePhoto(env.DB, user.id, photo.mime, photo.image);
				if (!id) { data.error = 'Daily photo limit reached. Try again tomorrow.'; return page(request, data, 429); }
				// Preserve the saved draft in this request's validation response.
				// eslint-disable-next-line require-atomic-updates
				v.photoId = id;
			}
			const photo = v.photoId ? await draftPhoto(env.DB, v.photoId, user.id) : null;
			const lat = Number(v.lat), lon = Number(v.lon), season = Number(v.season);
			const required = ['title', 'address', 'county', 'state', 'country'];
			const invalid = required.some((key) => {return !v[key]?.trim() || v[key].trim().length > (key === 'address' ? 200 : 100)}) || (v.description?.length ?? 0) > 1000 || !v.lat?.trim() || !v.lon?.trim() || !Number.isFinite(lat) || Math.abs(lat) > 85 || !Number.isFinite(lon) || Math.abs(lon) > 180 || !Number.isInteger(season) || season < 2000 || season > new Date().getUTCFullYear() || (!validHoliday(v.holiday) || v.holiday === 'other') || !validDate(v.observed) || !validDate(v.ends) || v.observed > today || Number(v.observed.slice(0,4)) !== season || v.ends < v.observed || Date.parse(v.ends) - Date.parse(v.observed) > 366 * 86400000 || v.consent !== 'yes';
			if (invalid || !photo) {
				data.error = 'Complete every required field and consent. Use valid coordinates, dates in the selected season, and an end date within one year of the sighting. A photo is required.';
				return page(request, data, 422);
			}
			const id = crypto.randomUUID();
			const post = { id, 'user_id': user.id, 'photo_id': v.photoId, title: v.title.trim(), description: v.description?.trim() ?? '', address: v.address.trim(),
				'address_key': [v.address, v.county, v.state, v.country].map(normalize).join('|'), county: normalize(v.county), state: normalize(v.state), country: normalize(v.country), lat, lon, holiday: v.holiday, season, observed: v.observed, ends: v.ends };
			if (!await publishLight(env.DB, post)) { data.error = 'Daily limit reached, or this photo has already been published. You can share up to 10 sightings a day.'; return page(request, data, 409); }
			Object.assign(filters, { holiday: post.holiday, season, lat, lon, view: 'explore' });
			return redirect(lightsHref(filters, { post: id, notice: 'published' }));
		}
		const post = v.id ? await getLight(env.DB, v.id) : null;
		if (!post || (post.status === 'hidden' && !user.is_owner)) { data.error = 'That sighting is no longer available.'; return page(request, data, 404); }
		if (v.action === 'rate') {
			const score = Number(v.score);
			if (!Number.isInteger(score) || score < 1 || score > 5) { data.error = 'Choose a rating from 1 to 5.'; data.selected = post; return page(request, data, 422); }
			const result = await rateLight(env.DB, post.id, user.id, score);
			if (!result.meta.changes) { data.error = 'You can rate other people’s current displays. This sighting cannot be rated.'; data.selected = post; return page(request, data, 409); }
			return redirect(lightsHref(filters, { post: post.id, notice: 'rated' }));
		}
		if (v.action === 'report') {
			if (v.reason !== 'spam' && v.reason !== 'gone') { data.error = 'Choose a report reason.'; return page(request, data, 422); }
			await reportLight(env.DB, post.id, user.id, v.reason);
			return redirect(lightsHref(filters, { post: post.id, notice: 'reported' }));
		}
		if (v.action === 'moderate') {
			if (!user.is_owner) { data.error = 'Only the site owner can moderate reports.'; return page(request, data, 403); }
			if (!['active', 'gone', 'hidden'].includes(v.status)) { data.error = 'Choose a moderation decision.'; return page(request, data, 422); }
			await moderateLight(env.DB, post.id, /** @type {'active'|'gone'|'hidden'} */ (v.status));
			return redirect(lightsHref(filters, { view: 'moderation', notice: 'resolved' }));
		}
		data.error = 'Choose a supported action.'; return page(request, data, 400);
	}
	const notices = { published: 'Your sighting is on the map. Thanks for sharing the glow!', rated: 'Your rating is saved. Rating again updates your vote.', reported: 'Report received. Three distinct reports quarantine a post; the owner reviews reports. Your own taken-down report takes effect immediately.', resolved: 'Report resolved.' };
	data.notice = notices[/** @type {keyof typeof notices} */ (q.get('notice') ?? '')];
	if (filters.view === 'moderation') {
		if (!user) { return new Response(null, { status: 302, headers: { Location: `${paths.login}?returnTo=lightsfinder` } }); }
		if (!user.is_owner) { data.error = 'Only the site owner can review reports.'; return page(request, data, 403); }
		data.queue = await moderationQueue(env.DB);
	} else if (filters.view === 'awards') {
		if (filters.region) {
			if (filters.scope !== 'country' && (!filters.countryRegion || (filters.scope === 'county' && !filters.stateRegion))) { data.error = 'For state awards, enter its country. For county awards, enter its state and country.'; return page(request, data, 422); }
			data.standings = await awardStandings(env.DB, filters.holiday, filters.season, filters.scope, filters.region, filters.countryRegion, filters.stateRegion);
		}
	} else {
		const results = await listLights(env.DB, filters);
		data.truncated = results.length > 500;
		const currentAddresses = new Set(results.filter((p) => {return p.season === filters.season}).map((p) => {return p.address_key}));
		const historicalAddresses = new Set();
		data.posts = results.slice(0, 500).filter((p) => {
			if (distance(filters, p) > filters.radius) { return false; }
			if (p.season === filters.season && filters.season < new Date(today).getUTCFullYear()) { return true; }
			if (p.season === filters.season) { return p.status === 'active' && p.ends >= today && p.observed <= today; }
			if (currentAddresses.has(p.address_key) || historicalAddresses.has(p.address_key)) { return false; }
			historicalAddresses.add(p.address_key); return true;
		});
		if (q.has('post')) {
			data.selected = await getLight(env.DB, q.get('post') ?? '');
			if (!data.selected || (data.selected.status === 'hidden' && !user?.is_owner)) { data.error = 'That sighting is no longer available.'; return page(request, data, 404); }
			if (!data.posts.some((p) => {return p.id === data.selected?.id})) { data.posts.unshift(data.selected); }
		}
		if (filters.view === 'route' && q.get('plan') === '1') {
			const km = numeric(q, 'km', 20), minutes = numeric(q, 'minutes', 45), preference = q.get('preference') ?? 'most';
			data.values = Object.fromEntries(q);
			if (!Number.isFinite(km) || km < 1 || km > 100 || !Number.isFinite(minutes) || minutes < 5 || minutes > 240 || !['most','best'].includes(preference)) { data.error = 'Choose 1–100 km and 5–240 minutes for your drive.'; return page(request, data, 422); }
			// Expand candidates to the circuit budget, rather than restricting to the default viewport radius.
			const candidates = (await listLights(env.DB, { ...filters, history: false, radius: km / 2 })).filter((p) => {return p.status === 'active' && p.ends >= today && p.observed <= today});
			try {
				const circuit = await planCircuit(candidates, filters, { km, minutes, preference, base: env.OSRM_URL ?? 'https://router.project-osrm.org/' }) ?? undefined;
				return page(request, { ...data, circuit, posts: circuit?.posts ?? data.posts, routeMessage: circuit ? undefined : 'No current lights fit this driving budget. Try a larger distance, more time, or a different starting point.' });
			} catch (error) {
				console.error('Lightsfinder road routing failed', error);
				return page(request, { ...data, error: 'Driving directions are temporarily unavailable or these locations cannot be reached by road. Your settings are saved; try again later.' }, 503);
			}
		}
	}
	return page(request, data);
}
