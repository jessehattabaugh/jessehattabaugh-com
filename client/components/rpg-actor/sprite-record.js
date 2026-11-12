/** @param {string} origin @param {string} method @param {Record<string, string>} params */
function xrpc(origin, method, params) {
	const url = new URL(`/xrpc/${method}`, origin);
	url.search = new URLSearchParams(params).toString();
	return url;
}

/** Read a public RPG Actor sprite directly from its owner's AT Protocol repository.
 * @param {string} handle @param {AbortSignal} signal */
export async function loadSprite(handle, signal) {
	const name = handle.trim().replace(/^@/, '').toLowerCase();
	if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) || name.length > 253) {
		throw new Error('Invalid Bluesky handle');
	}
	const options = /** @type {const} */ ({ signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
	const identity = await fetch(xrpc('https://public.api.bsky.app', 'com.atproto.identity.resolveHandle', { handle: name }), options);
	if (!identity.ok) { throw new Error('Bluesky handle unavailable'); }
	const { did } = await identity.json();
	const plc = typeof did === 'string' && /^did:plc:[a-z2-7]{24}$/.test(did);
	const web = typeof did === 'string' && /^did:web:(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(did);
	if (!plc && !web) { throw new Error('Unsupported actor identity'); }

	const didDocument = await fetch(plc ? `https://plc.directory/${did}` : `https://${did.slice(8)}/.well-known/did.json`, options);
	if (!didDocument.ok) { throw new Error('Actor identity unavailable'); }
	const { id, service } = await didDocument.json();
	if (id !== did || !Array.isArray(service)) { throw new Error('Invalid actor identity'); }
	const entry = service.find((item) => {return item?.id === '#atproto_pds' || item?.id === `${did}#atproto_pds`});
	const pds = new URL(entry?.serviceEndpoint);
	if (entry?.type !== 'AtprotoPersonalDataServer' || pds.protocol !== 'https:' || pds.username || pds.password || pds.port ||
		pds.pathname !== '/' || pds.search || pds.hash) { throw new Error('Invalid actor data server'); }

	const response = await fetch(xrpc(pds.origin, 'com.atproto.repo.getRecord', { repo: did, collection: 'actor.rpg.sprite', rkey: 'self' }), options);
	if (response.status === 404 || (response.status === 400 && (await response.json()).error === 'RecordNotFound')) { return null; }
	if (!response.ok) { throw new Error('Actor record unavailable'); }
	const { value } = await response.json();
	if (value?.available === false) { return null; }
	/** @param {unknown} blob */
	const sheet = (blob) => {
		const cid = /** @type {{ref?: {$link?: unknown}} | null} */ (blob)?.ref?.$link;
		return typeof cid === 'string' && /^b[a-z2-7]{20,120}$/.test(cid)
			? xrpc(pds.origin, 'com.atproto.sync.getBlob', { did, cid }).href : '';
	};
	const src = sheet(value?.spriteSheet);
	if (!src) { throw new Error('Invalid actor sprite'); }
	/** @param {unknown} count @param {number} fallback */
	const grid = (count, fallback) => {return typeof count === 'number' && Number.isInteger(count) && count >= 1 && count <= 16 ? count : fallback};
	return {
		src, columns: grid(value.columns, 3), rows: grid(value.rows, 4),
		emotes: Object.fromEntries(Object.entries(value.emotes ?? {}).flatMap(([name, variant]) => {
			const blobs = /** @type {{emoteSheet?: unknown, talkSheet?: unknown}} */ (variant ?? {});
			const emoteSheet = sheet(blobs.emoteSheet), talkSheet = sheet(blobs.talkSheet);
			return emoteSheet || talkSheet ? [[name, { emoteSheet, talkSheet }]] : [];
		})),
	};
}
