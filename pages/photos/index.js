import { readFile } from 'node:fs/promises';
import { html, raw } from '../../lib/html.js';

const FILE_EMOJI = '📸';
const DATA_DIRECTORY = new URL('../../static/data/photos/', import.meta.url);

/**
 * @typedef {Object} ResponsiveSource
 * @property {string} type
 * @property {string} srcset
 */

/**
 * @typedef {Object} PhotoAsset
 * @property {string} id
 * @property {string} title
 * @property {number} width
 * @property {number} height
 * @property {string} alt
 * @property {string} fallback
 * @property {ResponsiveSource[]} sources
 * @property {string} original
 */

/**
 * @typedef {Object} AlbumSummary
 * @property {string} slug
 * @property {string} title
 * @property {string} sourceUrl
 * @property {number} photoCount
 * @property {string} cover
 */

/**
 * @typedef {Object} AlbumsManifest
 * @property {string} generatedAt
 * @property {AlbumSummary[]} albums
 */

/**
 * @typedef {Object} AlbumManifest
 * @property {string} slug
 * @property {string} title
 * @property {string} sourceUrl
 * @property {PhotoAsset[]} photos
 */

/**
 * @param {string} fileName
 * @returns {Promise<any>}
 */
async function readJsonFile(fileName) {
	const filePath = new URL(fileName, DATA_DIRECTORY);
	const content = await readFile(filePath, 'utf8');
	return JSON.parse(content);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAttribute(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

/**
 * @param {PhotoAsset} photo
 * @returns {string}
 */
function pictureMarkup(photo) {
	const sources = photo.sources
		.map((source) => {
			return `<source type="${escapeAttribute(source.type)}" srcset="${escapeAttribute(source.srcset)}" sizes="(max-width: 768px) 100vw, 50vw">`;
		})
		.join('');

	return `<picture>
		${sources}
		<img src="${escapeAttribute(photo.fallback)}" alt="${escapeAttribute(photo.alt || photo.title || 'Photo')}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">
	</picture>`;
}

/**
 * @param {AlbumSummary[]} albums
 * @returns {string}
 */
function albumCardsMarkup(albums) {
	if (albums.length === 0) {
		return '<p>No synced albums yet. Run <code>npm run photos:sync</code> to ingest Google Photos albums.</p>';
	}

	return albums
		.map((album) => {
			return `<article class="photo-album-card">
				<a href="/photos/${escapeAttribute(album.slug)}" class="photo-album-link">
					<img src="${escapeAttribute(album.cover)}" alt="Cover photo for ${escapeAttribute(album.title)}" loading="lazy" decoding="async" width="640" height="480">
					<h2>${escapeAttribute(album.title)}</h2>
					<p>${album.photoCount} photos</p>
				</a>
			</article>`;
		})
		.join('');
}

/**
 * @param {PhotoAsset[]} photos
 * @returns {string}
 */
function photoGridMarkup(photos) {
	if (photos.length === 0) {
		return '<p>This album has no photos in the local backup yet.</p>';
	}

	return photos
		.map((photo) => {
			return `<article class="photo-card">
				${pictureMarkup(photo)}
				<footer>
					<p>${escapeAttribute(photo.title || 'Untitled photo')}</p>
					<a href="${escapeAttribute(photo.original)}" target="_blank" rel="noreferrer">Original</a>
				</footer>
			</article>`;
		})
		.join('');
}

/**
 * @param {string} pathname
 * @returns {string | undefined}
 */
function getAlbumSlug(pathname) {
	if (!pathname.startsWith('/photos/')) {
		return;
	}

	const slug = pathname.slice('/photos/'.length);
	if (!slug || slug.includes('/')) {
		return;
	}

	return slug;
}

/**
 * @param {string} slug
 * @returns {Promise<AlbumManifest | undefined>}
 */
async function loadAlbum(slug) {
	try {
		return await readJsonFile(`albums/${slug}.json`);
	} catch (error) {
		console.warn(`${FILE_EMOJI}⚠️ Unable to load album manifest for slug=${slug}:`, error);
		return;
	}
}

/**
 * @returns {Promise<string>}
 */
async function renderPhotosIndex() {
	/** @type {AlbumsManifest} */
	const albumsManifest = await readJsonFile('albums.json');

	return html`<section class="photos-page">
		<h1>Photo Albums</h1>
		<p>
			These albums are synchronized daily from public Google Photos shares and hosted on this
			domain with responsive derivatives.
		</p>
		<div class="photo-album-grid">${raw(albumCardsMarkup(albumsManifest.albums || []))}</div>
	</section>`;
}

/**
 * @param {string} slug
 * @returns {Promise<string | {statusCode:number, body:string}>}
 */
async function renderAlbumPage(slug) {
	const album = await loadAlbum(slug);
	if (!album) {
		return {
			statusCode: 404,
			body: html`<section class="photos-page">
				<h1>Album Not Found</h1>
				<p>The photo album <strong>${slug}</strong> is not currently available.</p>
				<p><a href="/photos" class="cta-button">Back to albums</a></p>
			</section>`,
		};
	}

	return html`<section class="photos-page photos-album-page">
		<h1>${album.title}</h1>
		<p>
			Source album:
			<a href="${album.sourceUrl}" target="_blank" rel="noreferrer">Google Photos</a>
		</p>
		<p><a href="/photos" class="cta-button">All albums</a></p>
		<div class="photo-grid">${raw(photoGridMarkup(album.photos || []))}</div>
	</section>`;
}

/**
 * @param {{path:string}} event
 * @returns {Promise<string | {statusCode:number, body:string}>}
 */
export async function get(event) {
	const slug = getAlbumSlug(event.path);
	if (!slug) {
		return renderPhotosIndex();
	}

	return renderAlbumPage(slug);
}
