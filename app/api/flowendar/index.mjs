/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function get(request) {
	console.debug('🌸 /flowendar GET request');
	try {
		const albumId = 'YOUR_ALBUM_ID'; // Replace with your public album ID
		const response = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems:search`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.GOOGLE_PHOTOS_API_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ albumId })
		});
		const data = await response.json();
		const photos = data.mediaItems.map(item => ({
			href: item.baseUrl,
			date: item.mediaMetadata.creationTime
		}));

		return { json: { photos } };
	} catch (error) {
		console.error('🛟 error loading photos', error);
		return { json: { error } };
	}
}
