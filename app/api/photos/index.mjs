/** load all shared albums from Google Photos
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	// fetch an access token from Google
	const authResponse = await fetch('https://www.googleapis.com/oauth2/v4/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			// eslint-disable-next-line camelcase
			client_id: process.env.GOOGLE_CLIENT_ID,
			// eslint-disable-next-line camelcase
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
		}),
	});
	const authJson = await authResponse.json();
	console.log('📡auth response', { authJson });
	const { access_token: accessToken } = authJson;

	// fetch the shared albums from Google Photos
	const response = await fetch('https://photoslibrary.googleapis.com/v1/sharedAlbums', {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const json = await response.json();
	console.log('📡', json);
	return { json };
}
