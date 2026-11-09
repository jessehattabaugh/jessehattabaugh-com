/** Generate public identity assets at build time; the Worker serves static files. */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

/** @param {import('../shared/data/atproto.js').Social} social */
export async function avatarSource(social) {
	try {
		const url = social.profile?.avatar;
		if (!url?.startsWith('https://cdn.bsky.app/')) { throw new Error('No public avatar'); }
		const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
		if (!response.ok || !response.body) { throw new Error('Avatar unavailable'); }
		const chunks = []; let length = 0;
		for await (const chunk of response.body) {
			length += chunk.byteLength;
			if (length > 4_000_000) { throw new Error('Avatar exceeds image budget'); }
			chunks.push(chunk);
		}
		return await sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000 }).rotate().resize(512, 512, { fit: 'cover' }).png({ palette: true }).toBuffer();
	} catch (error) {
		console.warn('Avatar refresh unavailable; using bundled portrait.', error);
		return readFile(new URL('../client/branding/avatar.png', import.meta.url));
	}
}

/** The site's circular favicon embeds pixels so SVG image loading is self-contained.
 * Node prepares PNG sizes; Parcel optimizes and emits the public images.
 * @param {Uint8Array} avatar
 */
export async function portraitIcon(avatar) {
	const thumbnail = await sharp(avatar).resize(128, 128).png({ palette: true, colours: 128 }).toBuffer();
	const artwork = await readFile(new URL('./artwork/portrait.svg', import.meta.url), 'utf8');
	return artwork.replace('{{portrait}}', thumbnail.toString('base64'));
}

/** Build a share card from the owner's public artwork, not a generated substitute.
 * @param {import('../shared/data/atproto.js').Social} social */
export async function actorCard(social) {
	const background = await readFile(new URL('./artwork/rpg-actor-card.svg', import.meta.url));
	/** @type {import('sharp').OverlayOptions[]} */
	const overlays = [];
	const sprite = social.actor?.sprite;
	if (sprite && social.pds && social.did) {
		try {
			const cid = sprite.emotes.happy?.emoteSheet || sprite.cid;
			const response = await fetch(`${social.pds}/xrpc/com.atproto.sync.getBlob?${new URLSearchParams({ did: social.did, cid })}`, { signal: AbortSignal.timeout(8000) });
			if (!response.ok) { throw new Error('Sprite unavailable'); }
			const bytes = Buffer.from(await response.arrayBuffer());
			const metadata = await sharp(bytes).metadata();
			const columns = cid === sprite.cid ? sprite.columns : 3, rows = cid === sprite.cid ? sprite.rows : 4;
			const width = Math.floor((metadata.width ?? 144) / columns), height = Math.floor((metadata.height ?? 192) / rows);
			const portrait = await sharp(bytes).extract({ left: Math.min(1, columns - 1) * width, top: 0, width, height }).resize(288, 288, { fit: 'contain', kernel: 'nearest' }).png().toBuffer();
			overlays.push({ input: portrait, left: 800, top: 190 });
		} catch (error) { console.error('Actor share-card portrait unavailable; keeping text card', error); }
	}
	return sharp(background).composite(overlays).png().toBuffer();
}
