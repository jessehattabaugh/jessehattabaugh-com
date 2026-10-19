/** Public AT Protocol reads, shared by the static build and Worker. No login or SDK. */
import { paths } from '../routes.js';

/** @param {unknown} value @returns {Record<string, unknown>} */
export function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : {}; }
/** @param {unknown} value */
const text = (value) => {return typeof value === 'string' ? value : ''};
/** @param {unknown} value @returns {unknown[]} */
const array = (value) => {return Array.isArray(value) ? value : []};
/** @param {unknown} value */
const number = (value) => {return typeof value === 'number' && Number.isFinite(value) ? value : 0};
/** @param {unknown} value */
export function httpsUrl(value) {
	try { const url = new URL(text(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
/** @param {unknown} value */
function cid(value) { const result = text(value); return /^b[a-z2-7]{20,120}$/.test(result) ? result : ''; }
/** @param {unknown} blob */
function blobCid(blob) { return cid(object(object(blob).ref).$link); }
/** @param {string} value */
export const blobPath = (value) => {return `${paths.atBlob}?cid=${encodeURIComponent(value)}`};
/** @param {string} url @returns {Promise<Record<string, unknown>>} */
async function json(url) {
	const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'manual', headers: { Accept: 'application/json' } });
	if (!response.ok) { throw new Error(`AT Protocol request failed (${response.status})`); }
	// Bound upstream bodies as well as request duration.
	const reader = response.body?.getReader();
	if (!reader) { throw new Error('Empty AT Protocol response'); }
	const chunks = []; let length = 0;
	try {
		while (true) {
			const { done, value } = await reader.read(); if (done) { break; }
			length += value.byteLength; if (length > 2_000_000) { throw new Error('AT Protocol response too large'); }
			chunks.push(value);
		}
	} finally { await reader.cancel(); }
	const bytes = new Uint8Array(length); let offset = 0;
	for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
	return object(JSON.parse(new TextDecoder().decode(bytes)));
}
/** @param {string} base @param {string} method @param {Record<string,string>} params */
function xrpc(base, method, params) { return `${base}/xrpc/${method}?${new URLSearchParams(params)}`; }

/** @param {string} handle */
export function emptySocial(handle) {
	return {
		handle, profileUrl: `https://bsky.app/profile/${encodeURIComponent(handle)}`, did: '', pds: '', updatedAt: '', stale: false,
		/** @type {{ displayName: string, description: string, avatar: string, followers: number, following: number, posts: number } | null} */
		profile: null,
		/** @type {Array<{ text: string, createdAt: string, url: string, images: Array<{ cid: string, alt: string }>, facets: unknown[], external: { url: string, title: string } }> | null} */
		posts: null,
		/** @type {{ sprite: { cid: string, columns: number, rows: number } | null, systems: Array<{ name: string, stats: Array<{ label: string, value: string }> }> } | null} */
		actor: null,
		/** @type {Array<{ title: string, description: string, status: string, location: string, url: string, createdAt: string, images: Array<{ cid: string, alt: string }> }> | null} */
		gifts: null,
	};
}
/** @typedef {ReturnType<typeof emptySocial>} Social */

/** @param {Record<string, unknown>} post @param {string} did */
function postData(post, did) {
	const record = object(post.record); const uri = text(post.uri);
	if (object(post.author).did !== did || record.reply || array(post.labels).length || !uri.startsWith(`at://${did}/app.bsky.feed.post/`)) { return []; }
	const embed = object(post.embed); const media = object(embed.media);
	const images = array(embed.images ?? media.images).slice(0, 4).flatMap((image) => {
		const item = object(image); const source = httpsUrl(item.fullsize); const id = cid(source.split('/').at(-1)?.split('@')[0]);
		return id ? [{ cid: id, alt: text(item.alt) }] : [];
	});
	const external = object(embed.external ?? media.external);
	const createdAt = text(record.createdAt);
	if (!Number.isFinite(Date.parse(createdAt))) { return []; }
	return [{ text: text(record.text), createdAt, url: `https://bsky.app/profile/${encodeURIComponent(did)}/post/${encodeURIComponent(uri.split('/').at(-1) ?? '')}`, images, facets: array(record.facets), external: { url: httpsUrl(external.uri), title: text(external.title) } }];
}

/** @param {string} handle @returns {Promise<Social>} */
export async function loadSocial(handle) {
	const data = emptySocial(handle);
	try {
		const profile = await json(xrpc('https://public.api.bsky.app', 'app.bsky.actor.getProfile', { actor: handle }));
		data.did = text(profile.did);
		if (!/^did:plc:[a-z2-7]{24}$/.test(data.did)) { throw new Error('Unsupported AT Protocol identity'); }
		data.handle = text(profile.handle) || handle;
		data.profileUrl = `https://bsky.app/profile/${encodeURIComponent(data.handle)}`;
		const avatar = httpsUrl(profile.avatar);
		data.profile = { displayName: text(profile.displayName), description: text(profile.description), avatar: avatar.startsWith('https://cdn.bsky.app/') ? avatar : '', followers: number(profile.followersCount), following: number(profile.followsCount), posts: number(profile.postsCount) };
		data.updatedAt = new Date().toISOString();
	} catch (error) { console.error('Bluesky profile unavailable', error); return data; }
	await Promise.all([
		(async () => {
			try {
				// Reposts are deliberately excluded: this section is Jesse's own posts.
				/** @type {NonNullable<Social['posts']>} */
				const posts = []; let cursor = '';
				for (let page = 0; page < 3 && posts.length < 5; page++) {
					const feed = await json(xrpc('https://public.api.bsky.app', 'app.bsky.feed.getAuthorFeed', { actor: data.did, filter: 'posts_no_replies', limit: '50', includePins: 'false', ...(cursor ? { cursor } : {}) }));
					posts.push(...array(feed.feed).flatMap((item) => {return postData(object(object(item).post), data.did)}));
					cursor = text(feed.cursor); if (!cursor) { break; }
				}
				data.posts = posts.filter((post, index) => {return posts.findIndex((other) => {return other.url === post.url}) === index}).slice(0, 5);
			} catch (error) { console.error('Bluesky posts unavailable', error); }
		})(),
		(async () => {
			try {
				const document = await json(`https://plc.directory/${encodeURIComponent(data.did)}`);
				const service = array(document.service).map(object).find((item) => {return item.id === '#atproto_pds'});
				const pds = httpsUrl(service?.serviceEndpoint);
				// This site only reads the owner's public Bluesky-hosted PDS. Fail closed
				// if it moves; never turn DID discovery into an arbitrary fetch proxy.
				if (!/^https:\/\/[a-z0-9.-]+\.host\.bsky\.network\/$/.test(pds)) { throw new Error('Unsupported public PDS host'); }
				data.pds = pds.replace(/\/$/, '');
				/** @param {string} collection */
				async function records(collection) {
					const result = []; let cursor = '';
					for (let page = 0; page < 10; page++) {
						const response = await json(xrpc(data.pds, 'com.atproto.repo.listRecords', { repo: data.did, collection, limit: '100', ...(cursor ? { cursor } : {}) }));
						if (!Array.isArray(response.records)) { throw new Error('Invalid record collection'); }
						result.push(...response.records.map(object));
						const next = text(response.cursor); if (!next || next === cursor) { return result; } cursor = next;
					}
					throw new Error('Record collection exceeded page budget');
				}
				await Promise.all([
					(async () => {
						try {
							const [sprites, stats] = await Promise.all([records('actor.rpg.sprite'), records('actor.rpg.stats')]);
							const sprite = object(sprites.find((item) => {return text(item.uri).endsWith('/self')})?.value);
							const spriteId = blobCid(sprite.spriteSheet);
							const columns = number(sprite.columns), rows = number(sprite.rows);
							const systems = [];
							const legacy = object(stats.find((item) => {return text(item.uri).endsWith('/self')})?.value);
							for (const [key, name] of [['dnd', 'Dungeons & Dragons'], ['dcc', 'Dungeon Crawl Classics']]) {
								const sheet = object(stats.find((item) => {return text(item.uri).endsWith(`/${key}`)})?.value);
								const system = object(sheet.data ?? legacy[key]); if (!Object.keys(system).length) { continue; }
								const identity = object(system.identity), hp = object(system.hp), combat = object(system.combat);
								const values = [{ label: 'Class', value: text(identity.class) }, { label: 'Level', value: String(number(identity.level)) }, { label: 'HP', value: `${number(hp.current)} / ${number(hp.max)}` }, { label: 'Armor class', value: String(number(combat.ac)) }];
								for (const [ability, value] of Object.entries(object(system.abilities))) { if (typeof value === 'number' && !ability.endsWith('Mod') && !ability.endsWith('Base')) { values.push({ label: ability.toUpperCase(), value: String(value) }); } }
								systems.push({ name, stats: values });
							}
							data.actor = { sprite: sprite.available !== false && spriteId && columns > 0 && columns <= 16 && rows > 0 && rows <= 16 ? { cid: spriteId, columns, rows } : null, systems };
						} catch (error) { console.error('RPG Actor unavailable', error); }
					})(),
					(async () => {
						try {
							const listings = await records('community.gifthood.listing');
							data.gifts = listings.flatMap((item) => {
								const value = object(item.value);
								if (value.intent !== 'offer' || !['available', 'pending'].includes(text(value.status))) { return []; }
								const alts = array(value.imageAlts);
								return [{ title: text(value.title), description: text(value.description), status: text(value.status), location: text(value.locationName), createdAt: text(value.createdAt), url: `https://gifthood.community/listing/${encodeURIComponent(data.did)}/${encodeURIComponent(text(item.uri).split('/').at(-1) ?? '')}`, images: array(value.images).slice(0, 4).flatMap((image, index) => { const id = blobCid(image); return id ? [{ cid: id, alt: text(alts[index]) || text(value.title) }] : []; }) }];
							}).sort((a, b) => {return b.createdAt.localeCompare(a.createdAt)});
						} catch (error) { console.error('GiftHood unavailable', error); }
					})(),
				]);
			} catch (error) { console.error('AT Protocol repository unavailable', error); }
		})(),
	]);
	return data;
}
