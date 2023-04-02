/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	console.log('🌋', req.body);
	const { text, title, url } = req.body;
	if (text || title || url) {
		// send the share somewhere
		return { location: '/thanks' };
	} else {
		return {
			session: { error: 'you have to share something' },
			location: '/share',
		};
	}
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	const { text, title, url } = req.query;
	const { error, ...session } = req.session;
	return { json: { text, title, url, error }, session };
}
