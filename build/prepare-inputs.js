/** Generate artwork and the public-data snapshot separately from authored assets. */
import { globSync, existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import sharp from 'sharp';
import { loadSocial } from '../shared/data/atproto.js';
import { workerVariables } from './shared/environment.js';
import { imageVariants } from './shared/public-assets.js';
import { avatarSource, portraitIcon, actorCard } from './branding.js';

/** @param {string} root */
export async function prepareInputs(root) {
	const out = join(root, 'dist', 'inputs');
	await rm(out, { recursive: true, force: true });
	await mkdir(out, { recursive: true });
	const variables = workerVariables();
	if (!variables.ATPROTO_HANDLE) { throw new Error('ATPROTO_HANDLE must be configured'); }
	const social = await loadSocial(variables.ATPROTO_HANDLE);
	const avatar = await avatarSource(social);
	const icon = await portraitIcon(avatar);
	const manifests = globSync('client/apps/*/manifest.webmanifest', { cwd: root });
	const apps = manifests.map((path) => { return basename(dirname(path)); });
	/** @type {Map<string, Buffer>} */
	const artwork = new Map([['avatar', avatar], ['icon', await sharp(Buffer.from(icon)).png().toBuffer()]]);
	await Promise.all(manifests.map(async (manifest, index) => {
		const folder = join(root, dirname(manifest));
		const [svg, metadata] = await Promise.all([readFile(join(folder, 'icon.svg')), readFile(join(root, manifest), 'utf8')]);
		const { background_color: background = '#fff' } = JSON.parse(metadata);
		artwork.set(apps[index], await sharp(svg).resize(512, 512).flatten({ background }).png().toBuffer());
	}));
	const cardPath = join(out, 'images', 'components', 'rpg-actor', 'social.png');
	await mkdir(dirname(cardPath), { recursive: true });
	await Promise.all([
		writeFile(join(out, 'site.json'), JSON.stringify({ social, apps, origin: variables.SITE_ORIGIN })),
		writeFile(join(out, 'icon.svg'), icon),
		actorCard(social).then((buffer) => { return writeFile(cardPath, buffer); }),
		...imageVariants(apps).map(async ({ path, source, size }) => {
			// Authored images already have their final bytes and take precedence.
			if (existsSync(join(root, 'client', path))) { return; }
			const file = join(out, 'images', path);
			await mkdir(dirname(file), { recursive: true });
			await sharp(artwork.get(source)).resize(size, size).png({ palette: true }).toFile(file);
		}),
	]);
}
