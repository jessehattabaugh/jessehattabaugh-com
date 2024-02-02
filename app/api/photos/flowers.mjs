/** load photos of flowers from Google Photos
 * @type {import('@enhance/types').EnhanceApiFn} */
 export async function get(req) {
	const response = fetch('https://photoslibrary.googleapis.com/v1/sharedAlbums');
	const json = await response.json();
	return {json};
 };