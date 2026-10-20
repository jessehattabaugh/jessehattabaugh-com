/** Generate public identity assets at build time; the Worker serves static files. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/** @param {import('../shared/data/atproto.js').Social} social */
async function avatarSource(social) {
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

/** @param {string} out @param {import('../shared/data/atproto.js').Social} social */
export async function buildBranding(out, social) {
	const avatar = await avatarSource(social);
	const directory = join(out, 'branding');
	await mkdir(directory, { recursive: true });
	const thumbnail = await sharp(avatar).resize(128, 128).png({ palette: true, colours: 128 }).toBuffer();
	// The SVG embeds decoded PNG pixels, with no remote references or user markup.
	const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><clipPath id="portrait"><circle cx="64" cy="64" r="64"/></clipPath></defs><image width="128" height="128" href="data:image/png;base64,${thumbnail.toString('base64')}" clip-path="url(#portrait)"/></svg>`;
	await Promise.all([
		writeFile(join(directory, 'icon.svg'), icon),
		// Retain the familiar root URL for existing bookmarks and favicon caches.
		writeFile(join(out, 'icon.svg'), icon),
		sharp(avatar).resize(96, 96).png({ palette: true, colours: 128 }).toFile(join(directory, 'avatar-96.png')),
		sharp(Buffer.from(icon)).resize(32, 32).png().toFile(join(directory, 'icon-32.png')),
		sharp(avatar).resize(180, 180).png({ palette: true }).toFile(join(directory, 'apple-touch-icon.png')),
		sharp(avatar).resize(192, 192).png({ palette: true }).toFile(join(directory, 'icon-192.png')),
		sharp(avatar).resize(512, 512).png({ palette: true }).toFile(join(directory, 'icon-512.png')),
	]);
	// Each app keeps its own artwork, favicon, and installed identity. Rasterize
	// its existing SVG for platforms that require PNG home-screen/touch icons.
	await Promise.all(['messages', 'rainbow-hour', 'lightsfinder', 'crunch-time'].map(async (app) => {
		const folder = join(out, 'apps', app);
		const [svg, manifest] = await Promise.all([
			readFile(join(folder, 'icon.svg')),
			readFile(join(folder, 'manifest.json'), 'utf8').catch(() => readFile(join(folder, 'manifest.webmanifest'), 'utf8')),
		]);
		const { background_color: background = '#fff' } = JSON.parse(manifest);
		await Promise.all([32, 180, 192, 512].map((size) => {
			const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
			return sharp(svg).resize(size, size).flatten({ background }).png({ palette: true }).toFile(join(folder, name));
		}));
	}));
}
