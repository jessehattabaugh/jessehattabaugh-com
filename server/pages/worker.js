import { rpgActor, rpgActorFragment } from '../../shared/templates/pages/rpg-actor.js';
import { loadSocial, emptySocial } from '../../shared/data/atproto.js';
import { paths } from '../../shared/routes.js';
import { render } from '../../shared/html.js';
import { home, homeFragment } from '../../shared/templates/pages/home.js';
import { about, aboutFragment } from '../../shared/templates/pages/about.js';
import { giving, givingFragment } from '../../shared/templates/pages/giving.js';
/** @import { Social } from '../../shared/data/atproto.js' */

/** @param {import('../../shared/html.js').Raw} page */
function pageResponse(page) {
	return new Response(render(page), { headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment', 'Cache-Control': 'public, max-age=60' } });
}

/** @param {Request} request @param {import('../shared/types.js').Env} env @param {ExecutionContext} ctx */
async function socialData(request, env, ctx) {
	const handle = env.ATPROTO_HANDLE?.trim();
	if (!handle) { throw new Error('ATPROTO_HANDLE must be configured'); }
	// A version-specific namespace keeps cached records out of other previews and
	// avoids reusing an old snapshot when a new build is uploaded to the same alias.
	const snapshot = await env.ASSETS.fetch(new URL('/atproto/snapshot.json', request.url));
	/** @type {Social} */
	const saved = snapshot.ok ? await snapshot.json() : emptySocial(handle);
	const key = new Request(new URL(`/atproto/cache/${encodeURIComponent(handle)}/${encodeURIComponent(saved.updatedAt)}`, request.url));
	const cache = caches.default;
	const cached = await cache.match(key);
	if (cached) { return /** @type {Promise<Social>} */ (cached.json()); }
	const fresh = await loadSocial(handle);
	const sameIdentity = saved.did === fresh.did || (!fresh.did && saved.handle === handle);
	for (const field of /** @type {const} */ (['profile', 'posts', 'actor', 'gifts'])) {
		if (fresh[field] === null && sameIdentity && saved[field] !== null) {
			// Each source can fail independently; retain the build's known data.
			Object.assign(fresh, { [field]: saved[field] }); fresh.stale = true;
		}
	}
	if (!fresh.did && sameIdentity) { fresh.did = saved.did; fresh.pds = saved.pds; fresh.profileUrl = saved.profileUrl; }
	if (!fresh.pds && sameIdentity) { fresh.pds = saved.pds; }
	if (fresh.stale) { fresh.updatedAt = saved.updatedAt; }
	ctx.waitUntil(cache.put(key, new Response(JSON.stringify(fresh), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${fresh.stale ? 60 : 300}` } })).catch((error) => {return console.error('AT Protocol cache write failed', error)}));
	return fresh;
}

/** @param {Social} data */
function allowedIds(data) {
	const spriteIds = new Set([data.actor?.sprite?.cid,
		...Object.values(data.actor?.sprite?.emotes ?? {}).flatMap((variant) => { return [variant.emoteSheet, variant.talkSheet]; }),
	]);
	const allowed = new Set([
		...spriteIds,
		...(data.gifts ?? []).flatMap((gift) => {return gift.images.map((item) => {return item.cid})}),
		...(data.posts ?? []).flatMap((post) => {return post.images.map((item) => {return item.cid})}),
	]);
	return { spriteIds, allowed };
}

/** Only owner-repository CIDs and the validated Bluesky avatar can be fetched.
 * @param {Request} request @param {Social} data @param {ExecutionContext} ctx */
async function image(request, data, ctx) {
	const url = new URL(request.url);
	const id = url.searchParams.get('cid') ?? '';
	const avatar = url.pathname === paths.atAvatar;
	const { spriteIds, allowed } = allowedIds(data);
	if ((!avatar && (!/^b[a-z2-7]{20,120}$/.test(id) || !allowed.has(id) || !data.pds)) || (avatar && !data.profile?.avatar)) {
		return new Response(null, { status: 404 });
	}
	// Keep the sprite's exact pixel sheet; use the public Bluesky image CDN's
	// thumbnails for photos and the small navigation avatar.
	let source = `https://cdn.bsky.app/img/feed_thumbnail/plain/${data.did}/${id}@jpeg`;
	if (avatar) {
		source = (data.profile?.avatar ?? '').replace('/img/avatar/plain/', '/img/avatar_thumbnail/plain/');
	} else if (spriteIds.has(id)) {
		source = `${data.pds}/xrpc/com.atproto.sync.getBlob?${new URLSearchParams({ did: data.did, cid: id })}`;
	}
	const key = new Request(new URL(`/atproto/image-cache/${encodeURIComponent(source)}`, request.url));
	const cached = await caches.default.match(key); if (cached) { return cached; }
	try {
		const upstream = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
		const type = upstream.headers.get('Content-Type')?.split(';')[0] ?? '';
		if (!upstream.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type) || Number(upstream.headers.get('Content-Length')) > 4_000_000) { return new Response(null, { status: 502 }); }
		const response = new Response(upstream.body, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
		ctx.waitUntil(caches.default.put(key, response.clone()).catch((error) => {return console.error('AT Protocol image cache failed', error)}));
		return response;
	} catch (error) { console.error('AT Protocol image unavailable', error); return new Response(null, { status: 503, headers: { 'Retry-After': '60' } }); }
}

/** @param {Request} request @param {import('../shared/types.js').Env} env @param {ExecutionContext} ctx */
export async function handleAtproto(request, env, ctx) {
	const url = new URL(request.url);
	if (url.pathname === paths.bluesky) {
		return new Response(null, { status: 302, headers: { Location: `https://bsky.app/profile/${encodeURIComponent(env.ATPROTO_HANDLE ?? '')}` } });
	}
	const fragment = request.headers.get('X-Fragment') === 'true';
	// Use the build snapshot for the home sprite without adding upstream latency.
	if (url.pathname === paths.home) {
		const snapshot = await env.ASSETS.fetch(new URL('/atproto/snapshot.json', request.url));
		const saved = snapshot.ok ? /** @type {Social} */ (await snapshot.json()) : undefined;
		return pageResponse(fragment ? homeFragment(saved) : home(saved));
	}
	if (url.pathname === paths.atAvatar || url.pathname === paths.atBlob) {
		const snapshot = await env.ASSETS.fetch(new URL('/atproto/snapshot.json', request.url));
		const saved = snapshot.ok ? /** @type {Social} */ (await snapshot.json()) : undefined;
		const id = url.searchParams.get('cid') ?? '';
		if (saved && ((url.pathname === paths.atAvatar && saved.profile?.avatar) || (saved.pds && allowedIds(saved).allowed.has(id)))) {
			return image(request, saved, ctx);
		}
		return image(request, await socialData(request, env, ctx), ctx);
	}
	const data = await socialData(request, env, ctx);
	if (url.pathname === paths.rpgActor) { return pageResponse(fragment ? rpgActorFragment(data, url.searchParams) : rpgActor(data, url.searchParams, url.origin)); }
	let template;
	if (url.pathname === paths.about) {
		template = fragment ? aboutFragment : about;
	} else {
		template = fragment ? givingFragment : giving;
	}
	return pageResponse(template(data));
}
