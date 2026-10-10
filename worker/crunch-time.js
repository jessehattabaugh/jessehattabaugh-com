import { render } from '../shared/html.js';
import { paths } from '../shared/routes.js';
import { crunchTime, crunchFragment } from '../shared/templates/crunch-time.js';
import { crunchHistory, saveCrunchWorkout, feedCrunchPet } from '../shared/data/crunch-time.js';
import { createSession, verifySession, getSessionUser } from './session.js';
import { getUserById } from '../shared/data/messages.js';
import { readForm, RequestBodyError } from './request.js';

const COOKIE = '__Host-crunch';
/** @param {Request} request @param {import('../shared/types.js').Env} env */
export async function handleCrunchTime(request, env) {
	const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-crunch=([^;]+)/)?.[1];
	const existing = cookie ? await verifySession(env.SESSION_SECRET, cookie) : null;
	const owner = existing ?? crypto.randomUUID();
	const signed = await createSession(env.SESSION_SECRET, owner);
	const headers = { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment', 'Set-Cookie': `${COOKIE}=${signed}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` };
	const userId = await getSessionUser(request, env.SESSION_SECRET);
	const user = userId ? await getUserById(env.DB, userId) : null;
	const data = { ...await crunchHistory(env.DB, owner), user, workoutId: crypto.randomUUID(), mealId: crypto.randomUUID(), values: { reps: '', style: 'standard' }, error: '', notice: '' };
	const url = new URL(request.url);
	if (url.searchParams.has('saved')) { data.notice = 'Workout saved. Every situp earns one snack point!'; }
	if (url.searchParams.has('fed')) { data.notice = 'Yum! Mochi enjoyed a snack. Thank you!'; }
	if (request.method === 'POST') {
		// Bound form bodies even if a client omits or lies about Content-Length.
		if (!request.body) { throw new RequestBodyError(400); }
		const reader = request.body.getReader();
		const chunks = []; let size = 0;
		/* eslint-disable no-await-in-loop */
		while (true) {
			const { done, value } = await reader.read(); if (done) { break; }
			size += value.byteLength;
			if (size > 8192) { await reader.cancel(); throw new RequestBodyError(413); }
			chunks.push(value);
		}
		/* eslint-enable no-await-in-loop */
		const bytes = new Uint8Array(size); let offset = 0;
		for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
		const form = await readForm(new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }));
		const action = String(form.get('action') ?? '');
		const id = String(form.get('id') ?? '');
		data.values = { reps: String(form.get('reps') ?? ''), style: String(form.get('style') ?? '') };
		if (action === 'workout') { data.workoutId = id; } else { data.mealId = id; }
		if (!existing) { data.error = 'Enable cookies, reload this page, and try again. Your count is below.'; }
		else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { data.error = 'This form has expired. Reload the page and try again.'; data.workoutId = crypto.randomUUID(); data.mealId = crypto.randomUUID(); }
		else if (action === 'workout') {
			const reps = Number(data.values.reps);
			if (!/^\d+$/.test(data.values.reps) || !Number.isInteger(reps) || reps < 1 || reps > 1000 || !['standard', 'twist'].includes(data.values.style)) {
				data.error = 'Enter a whole number of situps from 1 to 1000 and choose a workout style.';
			} else {
				await saveCrunchWorkout(env.DB, owner, id, reps, data.values.style);
				return new Response(null, { status: 303, headers: { ...headers, Location: `${paths.crunch}?saved=${id}` } });
			}
		} else if (action === 'feed') {
			if (await feedCrunchPet(env.DB, owner, id)) { return new Response(null, { status: 303, headers: { ...headers, Location: `${paths.crunch}?fed=1` } }); }
			data.error = 'Mochi needs 10 snack points for a meal. Save a workout first.';
		} else { data.error = 'Choose a workout or a snack from the forms below.'; }
	}
	return new Response(render(request.headers.get('X-Fragment') === 'true' ? crunchFragment(data) : crunchTime(data)), { status: data.error ? 422 : 200, headers });
}
