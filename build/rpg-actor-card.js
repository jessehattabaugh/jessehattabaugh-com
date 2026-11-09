import sharp from 'sharp';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

/** Build a share card from the owner's public artwork, not a generated substitute.
 * @param {string} out @param {import('../shared/data/atproto.js').Social} social */
export async function buildActorCard(out, social) {
	const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
		<rect width="1200" height="630" fill="#151222"/>
		<rect x="48" y="48" width="1104" height="534" rx="24" fill="#242035" stroke="#65557f"/>
		<g font-family="sans-serif" fill="#f6f2ff">
			<text x="100" y="164" font-size="24" fill="#c5b3ee">A WEB COMPONENT FOR THE OPEN WEB</text>
			<text x="100" y="270" font-size="82" font-weight="bold">&lt;rpg-actor&gt;</text>
			<text x="100" y="342" font-size="34">A little character.</text>
			<text x="100" y="392" font-size="34">A whole range of emotions.</text>
			<text x="100" y="508" font-size="22" fill="#c5b3ee">HTML attributes · Zero dependencies · MIT</text>
		</g>
	</svg>`);
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
	const directory = join(out, 'shared/components/rpg-actor');
	await mkdir(directory, { recursive: true });
	await sharp(background).composite(overlays).png().toFile(join(directory, 'social.png'));
}
