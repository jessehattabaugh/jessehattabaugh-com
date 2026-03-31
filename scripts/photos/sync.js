import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const FILE_EMOJI = '📸';
const MAX_PHOTOS_PER_ALBUM = 5000;
const BREAKPOINT_WIDTHS = [480, 768, 1280, 1920];

const CONFIG_PATH = new URL('../../config/photos.albums.json', import.meta.url);
const DATA_ROOT = new URL('../../static/data/photos/', import.meta.url);
const ALBUM_DATA_DIRECTORY = new URL('albums/', DATA_ROOT);
const ORIGINALS_ROOT = new URL('../../static/photos/originals/', import.meta.url);
const DERIVATIVES_ROOT = new URL('../../static/photos/derivatives/', import.meta.url);

/**
 * @typedef {Object} ConfigAlbum
 * @property {string} slug
 * @property {string} title
 * @property {string} url
 */

/**
 * @typedef {Object} SyncOptions
 * @property {boolean} dryRun
 */

/**
 * @param {string} message
 * @returns {void}
 */
function info(message) {
	console.info(`${FILE_EMOJI}🧭 ${message}`);
}

/**
 * @param {string} message
 * @returns {void}
 */
function debug(message) {
	console.debug(`${FILE_EMOJI}🔎 ${message}`);
}

/**
 * @param {string} message
 * @returns {void}
 */
function warn(message) {
	console.warn(`${FILE_EMOJI}⚠️ ${message}`);
}

/**
 * @returns {Promise<ConfigAlbum[]>}
 */
async function loadAlbumsConfig() {
	const raw = await readFile(CONFIG_PATH, 'utf8');
	const config = JSON.parse(raw);
	return config.albums || [];
}

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {string[]}
 */
function extractMatches(text, pattern) {
	const values = new Set();
	for (const match of text.matchAll(pattern)) {
		values.add(match[1]);
	}
	return [...values];
}

/**
 * @param {string} sourceUrl
 * @returns {Promise<{resolvedUrl: string, html: string}>}
 */
async function fetchAlbumHtml(sourceUrl) {
	const response = await fetch(sourceUrl, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Album fetch failed for ${sourceUrl} with HTTP ${response.status}`);
	}

	const html = await response.text();
	return { resolvedUrl: response.url, html };
}

/**
 * @param {string} resolvedAlbumUrl
 * @param {string} html
 * @returns {string[]}
 */
function extractPhotoPageUrls(resolvedAlbumUrl, html) {
	const escapedAbsolutePhotoUrlPattern = new RegExp(
		String.raw`(https:\\/\\/photos\.google\.com\\/share\\/[A-Za-z0-9_-]+\\/photo\\/[A-Za-z0-9_-]+\?key=[A-Za-z0-9_-]+)`,
		'g',
	);
	const escapedAbsoluteUrls = extractMatches(html, escapedAbsolutePhotoUrlPattern).map(
		(value) => {
			return value.replaceAll(String.raw`\/`, '/');
		},
	);
	const hrefs = extractMatches(html, /href="([^"]+\/photo\/[^"]+)"/g);
	const origin = new URL(resolvedAlbumUrl).origin;
	const hrefUrls = hrefs.map((href) => {
		const normalizedHref = href.replaceAll('&amp;', '&');
		if (normalizedHref.startsWith('http')) {
			return normalizedHref;
		}
		if (normalizedHref.startsWith('share/')) {
			return new URL(`/${normalizedHref}`, origin).toString();
		}
		return new URL(normalizedHref, resolvedAlbumUrl).toString();
	});

	const normalizedUrls = [...escapedAbsoluteUrls, ...hrefUrls].map((url) => {
		return url.replace('/share/share/', '/share/');
	});
	const uniqueUrls = [...new Set(normalizedUrls)];
	return uniqueUrls.slice(0, MAX_PHOTOS_PER_ALBUM);
}

/**
 * @param {string} photoPageUrl
 * @returns {Promise<{imageUrl: string, title: string}>}
 */
async function fetchPhotoMetadata(photoPageUrl) {
	const response = await fetch(photoPageUrl, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Photo page fetch failed for ${photoPageUrl} with HTTP ${response.status}`);
	}

	const html = await response.text();
	const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
	const ogImageMatch = html.match(/property="og:image" content="([^"]+)"/i);
	const inlineImageMatch = html.match(
		/<img[^>]+src="(https:\/\/lh3\.googleusercontent\.com[^"]+)"/i,
	);
	const candidate = ogImageMatch?.[1] || inlineImageMatch?.[1];
	if (!candidate) {
		throw new Error(`No downloadable image URL found in ${photoPageUrl}`);
	}

	return { imageUrl: candidate, title: titleMatch?.[1] || 'Google Photos image' };
}

/**
 * @param {string} imageUrl
 * @returns {string}
 */
function highestQualityGoogleImageUrl(imageUrl) {
	const base = imageUrl.split('=')[0];
	return `${base}=w4096`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugify(value) {
	let slug = value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
	while (slug.startsWith('-')) {
		slug = slug.slice(1);
	}
	while (slug.endsWith('-')) {
		slug = slug.slice(0, -1);
	}
	return slug.slice(0, 80);
}

/**
 * @param {string} input
 * @returns {string}
 */
function hash(input) {
	return createHash('sha256').update(input).digest('hex');
}

/**
 * @param {string} imageUrl
 * @returns {Promise<Buffer>}
 */
async function downloadImage(imageUrl) {
	const response = await fetch(imageUrl, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Image download failed for ${imageUrl} with HTTP ${response.status}`);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.length === 0) {
		throw new Error(`Image download returned 0 bytes for ${imageUrl}`);
	}
	return buffer;
}

/**
 * @param {URL} directory
 * @returns {Promise<void>}
 */
async function ensureDirectory(directory) {
	await mkdir(directory, { recursive: true });
}

/**
 * @param {string} albumSlug
 * @param {string} assetBaseName
 * @param {Buffer} source
 * @param {SyncOptions} options
 * @returns {Promise<{width:number,height:number,fallback:string,sources:{type:string,srcset:string}[],original:string}>}
 */
async function writeDerivatives(albumSlug, assetBaseName, source, options) {
	const albumOriginalDirectory = new URL(`${albumSlug}/`, ORIGINALS_ROOT);
	const albumDerivativeDirectory = new URL(`${albumSlug}/`, DERIVATIVES_ROOT);
	await ensureDirectory(albumOriginalDirectory);
	await ensureDirectory(albumDerivativeDirectory);

	const originalFileName = `${assetBaseName}.jpg`;
	const originalFilePath = new URL(originalFileName, albumOriginalDirectory);
	if (!options.dryRun) {
		await writeFile(originalFilePath, source);
	}

	const metadata = await sharp(source).metadata();
	const width = metadata.width || 0;
	const height = metadata.height || 0;
	const availableBreakpoints = BREAKPOINT_WIDTHS.filter((breakpoint) => breakpoint <= width);
	if (availableBreakpoints.length === 0 && width > 0) {
		availableBreakpoints.push(width);
	}

	const avifParts = [];
	const webpParts = [];
	const jpegParts = [];

	for (const targetWidth of availableBreakpoints) {
		const avifFileName = `${assetBaseName}-${targetWidth}.avif`;
		const webpFileName = `${assetBaseName}-${targetWidth}.webp`;
		const jpegFileName = `${assetBaseName}-${targetWidth}.jpg`;

		if (!options.dryRun) {
			await sharp(source)
				.resize({ width: targetWidth, withoutEnlargement: true })
				.avif({ quality: 52 })
				.toFile(new URL(avifFileName, albumDerivativeDirectory));
			await sharp(source)
				.resize({ width: targetWidth, withoutEnlargement: true })
				.webp({ quality: 76 })
				.toFile(new URL(webpFileName, albumDerivativeDirectory));
			await sharp(source)
				.resize({ width: targetWidth, withoutEnlargement: true })
				.jpeg({ quality: 82, mozjpeg: true })
				.toFile(new URL(jpegFileName, albumDerivativeDirectory));
		}

		avifParts.push(`/static/photos/derivatives/${albumSlug}/${avifFileName} ${targetWidth}w`);
		webpParts.push(`/static/photos/derivatives/${albumSlug}/${webpFileName} ${targetWidth}w`);
		jpegParts.push(`/static/photos/derivatives/${albumSlug}/${jpegFileName} ${targetWidth}w`);
	}

	const fallback =
		jpegParts.at(-1)?.split(' ')[0] ||
		`/static/photos/originals/${albumSlug}/${originalFileName}`;
	return {
		width,
		height,
		fallback,
		original: `/static/photos/originals/${albumSlug}/${originalFileName}`,
		sources: [
			{ type: 'image/avif', srcset: avifParts.join(', ') },
			{ type: 'image/webp', srcset: webpParts.join(', ') },
			{ type: 'image/jpeg', srcset: jpegParts.join(', ') },
		],
	};
}

/**
 * @param {ConfigAlbum} album
 * @param {SyncOptions} options
 * @returns {Promise<{slug:string,title:string,sourceUrl:string,photoCount:number,cover:string}>}
 */
async function syncAlbum(album, options) {
	info(`Syncing album ${album.slug}`);
	const { resolvedUrl, html } = await fetchAlbumHtml(album.url);
	const photoPageUrls = extractPhotoPageUrls(resolvedUrl, html);
	if (photoPageUrls.length === 0) {
		warn(`No photo links discovered for album ${album.slug}`);
	}

	const albumPhotos = [];
	for (const [index, photoPageUrl] of photoPageUrls.entries()) {
		try {
			debug(`Fetching photo metadata ${index + 1}/${photoPageUrls.length} for ${album.slug}`);
			const metadata = await fetchPhotoMetadata(photoPageUrl);
			const imageUrl = highestQualityGoogleImageUrl(metadata.imageUrl);
			const binary = await downloadImage(imageUrl);
			const assetBaseName = `${String(index + 1).padStart(4, '0')}-${hash(photoPageUrl).slice(0, 12)}-${slugify(path.basename(photoPageUrl) || 'image')}`;
			const derivatives = await writeDerivatives(album.slug, assetBaseName, binary, options);
			albumPhotos.push({
				id: hash(photoPageUrl),
				title: metadata.title,
				alt: metadata.title,
				width: derivatives.width,
				height: derivatives.height,
				fallback: derivatives.fallback,
				sources: derivatives.sources,
				original: derivatives.original,
				googlePhotoPageUrl: photoPageUrl,
			});
		} catch (error) {
			warn(`Skipping photo page due to error: ${photoPageUrl} (${error.message})`);
		}
	}

	const albumManifest = {
		slug: album.slug,
		title: album.title,
		sourceUrl: album.url,
		generatedAt: new Date().toISOString(),
		photos: albumPhotos,
	};

	await ensureDirectory(ALBUM_DATA_DIRECTORY);
	if (!options.dryRun) {
		await writeFile(
			new URL(`${album.slug}.json`, ALBUM_DATA_DIRECTORY),
			`${JSON.stringify(albumManifest, undefined, '\t')}\n`,
		);
	}

	return {
		slug: album.slug,
		title: album.title,
		sourceUrl: album.url,
		photoCount: albumPhotos.length,
		cover: albumPhotos[0]?.fallback || '/static/photos/placeholders/empty-album.svg',
	};
}

/**
 * @returns {Promise<void>}
 */
async function run() {
	const options = { dryRun: process.argv.includes('--dry-run') };

	const albums = await loadAlbumsConfig();
	if (albums.length === 0) {
		warn('No albums configured in config/photos.albums.json');
		return;
	}

	const summaries = [];
	for (const album of albums) {
		summaries.push(await syncAlbum(album, options));
	}

	const albumsManifest = { generatedAt: new Date().toISOString(), albums: summaries };

	if (!options.dryRun) {
		await writeFile(
			new URL('albums.json', DATA_ROOT),
			`${JSON.stringify(albumsManifest, undefined, '\t')}\n`,
		);
	}

	info(
		`Completed photos sync for ${summaries.length} albums${options.dryRun ? ' (dry run)' : ''}.`,
	);
}

try {
	await run();
} catch (error) {
	console.error(`${FILE_EMOJI}💥 Photos sync failed:`, error);
	process.exitCode = 1;
}
