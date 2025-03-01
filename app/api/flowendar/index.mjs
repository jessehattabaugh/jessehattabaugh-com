/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function get(request) {
	console.debug('🌸 /flowendar GET request');
	try {
		/** @todo get all the photos from Google Photos */
		const photos = [
			{ href: 'https://placekitten.com/200/300', date: '2025-03-01' },
			{ href: 'https://placekitten.com/200/300', date: '2024-03-02' },
		];
		return { json: { photos } };
	} catch (error) {
		console.error('🛟 error loading photos', error);
		return { json: { error } };
	}
}
